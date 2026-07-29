-- PBAL operational workflows: trade review and AI-assisted stat imports.
-- Apply after 202607290002_live_scoreboard.sql.

begin;

alter table public.trades add column if not exists reviewed_by uuid
  references public.users(id) on delete set null;
alter table public.trades add column if not exists reviewed_at timestamptz;
alter table public.trades add column if not exists review_note text;

create index if not exists trades_creator_status_idx
  on public.trades (created_by, status, created_at desc);

do $migration$
begin
  create type public.stat_import_status as enum (
    'processing',
    'review_required',
    'confirmed',
    'failed'
  );
exception when duplicate_object then null;
end
$migration$;

create table if not exists public.stat_imports (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  storage_bucket text not null default 'stat-screenshots',
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  model text,
  status public.stat_import_status not null default 'processing',
  extracted_rows jsonb,
  reviewed_rows jsonb,
  warnings jsonb not null default '[]'::jsonb,
  error_message text,
  created_by uuid references public.users(id) on delete set null,
  reviewed_by uuid references public.users(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stat_imports_bucket_check check (storage_bucket = 'stat-screenshots'),
  constraint stat_imports_file_size_check check (file_size_bytes between 1 and 10485760),
  constraint stat_imports_mime_check check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
  ),
  constraint stat_imports_rows_check check (
    (extracted_rows is null or jsonb_typeof(extracted_rows) = 'array')
    and (reviewed_rows is null or jsonb_typeof(reviewed_rows) = 'array')
    and jsonb_typeof(warnings) = 'array'
  )
);

create index if not exists stat_imports_game_created_idx
  on public.stat_imports (game_id, created_at desc);
create index if not exists stat_imports_status_created_idx
  on public.stat_imports (status, created_at desc);

create table if not exists public.discord_notification_log (
  event_key text primary key,
  event_type text not null,
  record_id uuid,
  status text not null default 'processing',
  attempts integer not null default 1,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_notification_log_key_check check (char_length(event_key) between 8 and 300),
  constraint discord_notification_log_status_check check (status in ('processing', 'sent', 'failed')),
  constraint discord_notification_log_attempts_check check (attempts > 0)
);

create index if not exists discord_notification_log_status_idx
  on public.discord_notification_log (status, updated_at desc);

drop trigger if exists set_stat_imports_updated_at on public.stat_imports;
create trigger set_stat_imports_updated_at
  before update on public.stat_imports
  for each row execute function public.set_updated_at();

drop trigger if exists set_discord_notification_log_updated_at on public.discord_notification_log;
create trigger set_discord_notification_log_updated_at
  before update on public.discord_notification_log
  for each row execute function public.set_updated_at();

alter table public.stat_imports enable row level security;
alter table public.discord_notification_log enable row level security;

-- Screenshots are evidence for league staff and must never be public.
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'stat-screenshots',
  'stat-screenshots',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- The application uses its server-only service role for uploads and signed URLs.
-- No anon/authenticated storage policy is intentionally created for this bucket.

create or replace function public.approve_trade_request(
  p_trade_id uuid,
  p_reviewer_id uuid
)
returns public.trades
language plpgsql
security definer
set search_path = ''
as $function$
declare
  trade_row public.trades%rowtype;
  active_season_id uuid;
  roster_row public.rosters%rowtype;
begin
  if not exists (
    select 1 from public.users
    where id = p_reviewer_id
      and role in ('staff', 'admin')
      and admin_permission in ('staff', 'super_admin')
  ) then
    raise exception 'Reviewer is not authorized to approve trades';
  end if;

  select * into trade_row
  from public.trades
  where id = p_trade_id
  for update;

  if not found then
    raise exception 'Trade request not found';
  end if;
  if trade_row.status <> 'pending' then
    raise exception 'Trade request has already been reviewed';
  end if;

  select id into active_season_id
  from public.seasons
  where status = 'active'
  order by starts_on desc
  limit 1;

  if active_season_id is null then
    raise exception 'No active season is available for this trade';
  end if;

  select * into roster_row
  from public.rosters
  where season_id = active_season_id
    and player_id = trade_row.player_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Player is not on an active-season roster';
  end if;
  if roster_row.team_id is distinct from trade_row.from_team_id then
    raise exception 'Player roster changed after this request was submitted';
  end if;
  if roster_row.team_id = trade_row.to_team_id then
    raise exception 'Player is already on the destination team';
  end if;

  update public.rosters
  set team_id = trade_row.to_team_id,
      updated_at = now()
  where id = roster_row.id;

  update public.players
  set team_id = trade_row.to_team_id,
      updated_at = now()
  where id = trade_row.player_id;

  update public.trades
  set status = 'approved',
      trade_date = current_date,
      reviewed_by = p_reviewer_id,
      reviewed_at = now()
  where id = p_trade_id
  returning * into trade_row;

  return trade_row;
end;
$function$;

create or replace function public.confirm_stat_import(
  p_import_id uuid,
  p_reviewer_id uuid,
  p_rows jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  import_row public.stat_imports%rowtype;
  game_row public.games%rowtype;
  saved_count integer;
begin
  if not exists (
    select 1 from public.users
    where id = p_reviewer_id
      and role in ('staff', 'admin')
      and admin_permission in ('staff', 'super_admin')
  ) then
    raise exception 'Reviewer is not authorized to confirm stats';
  end if;

  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'At least one stat row is required';
  end if;

  select * into import_row
  from public.stat_imports
  where id = p_import_id
  for update;

  if not found then
    raise exception 'Stat import not found';
  end if;
  if import_row.status <> 'review_required' then
    raise exception 'Stat import is not awaiting review';
  end if;

  select * into game_row
  from public.games
  where id = import_row.game_id
  for update;

  if lower(game_row.status::text) <> 'final' then
    raise exception 'Stats can only be confirmed for a final game';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_rows) as row_data(
      player_id uuid,
      team_id uuid,
      pts integer,
      fgm integer,
      fga integer,
      three_pm integer,
      three_pa integer,
      ftm integer,
      fta integer,
      ast integer,
      stl integer,
      bk integer,
      orb integer,
      drb integer,
      tov integer,
      fls integer,
      plus_minus integer,
      ping integer
    )
    where row_data.team_id not in (game_row.home_team_id, game_row.away_team_id)
      or not exists (
        select 1 from public.rosters
        where season_id = game_row.season_id
          and player_id = row_data.player_id
          and team_id = row_data.team_id
      )
  ) then
    raise exception 'Every player must belong to one of the teams in this game';
  end if;

  insert into public.player_game_stats (
    game_id,
    player_id,
    team_id,
    did_play,
    points,
    rebounds,
    offensive_rebounds,
    defensive_rebounds,
    assists,
    steals,
    blocks,
    turnovers,
    personal_fouls,
    field_goals_made,
    field_goals_attempted,
    three_pointers_made,
    three_pointers_attempted,
    free_throws_made,
    free_throws_attempted,
    plus_minus,
    ping_ms
  )
  select
    import_row.game_id,
    row_data.player_id,
    row_data.team_id,
    true,
    row_data.pts,
    row_data.orb + row_data.drb,
    row_data.orb,
    row_data.drb,
    row_data.ast,
    row_data.stl,
    row_data.bk,
    row_data.tov,
    row_data.fls,
    row_data.fgm,
    row_data.fga,
    row_data.three_pm,
    row_data.three_pa,
    row_data.ftm,
    row_data.fta,
    row_data.plus_minus,
    row_data.ping
  from jsonb_to_recordset(p_rows) as row_data(
    player_id uuid,
    team_id uuid,
    pts integer,
    fgm integer,
    fga integer,
    three_pm integer,
    three_pa integer,
    ftm integer,
    fta integer,
    ast integer,
    stl integer,
    bk integer,
    orb integer,
    drb integer,
    tov integer,
    fls integer,
    plus_minus integer,
    ping integer
  )
  on conflict (game_id, player_id) do update set
    team_id = excluded.team_id,
    did_play = true,
    points = excluded.points,
    rebounds = excluded.rebounds,
    offensive_rebounds = excluded.offensive_rebounds,
    defensive_rebounds = excluded.defensive_rebounds,
    assists = excluded.assists,
    steals = excluded.steals,
    blocks = excluded.blocks,
    turnovers = excluded.turnovers,
    personal_fouls = excluded.personal_fouls,
    field_goals_made = excluded.field_goals_made,
    field_goals_attempted = excluded.field_goals_attempted,
    three_pointers_made = excluded.three_pointers_made,
    three_pointers_attempted = excluded.three_pointers_attempted,
    free_throws_made = excluded.free_throws_made,
    free_throws_attempted = excluded.free_throws_attempted,
    plus_minus = excluded.plus_minus,
    ping_ms = excluded.ping_ms,
    updated_at = now();

  get diagnostics saved_count = row_count;

  update public.stat_imports
  set status = 'confirmed',
      reviewed_rows = p_rows,
      reviewed_by = p_reviewer_id,
      confirmed_at = now(),
      error_message = null
  where id = p_import_id;

  return saved_count;
end;
$function$;

create or replace function public.claim_discord_notification(
  p_event_key text,
  p_event_type text,
  p_record_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  claimed_key text;
begin
  insert into public.discord_notification_log (
    event_key, event_type, record_id, status
  ) values (
    p_event_key, p_event_type, p_record_id, 'processing'
  )
  on conflict (event_key) do update set
    status = 'processing',
    attempts = public.discord_notification_log.attempts + 1,
    last_error = null
  where public.discord_notification_log.status = 'failed'
     or (
       public.discord_notification_log.status = 'processing'
       and public.discord_notification_log.updated_at < now() - interval '5 minutes'
     )
  returning event_key into claimed_key;

  return claimed_key is not null;
end;
$function$;

revoke all on table public.stat_imports from public, anon, authenticated;
revoke all on table public.discord_notification_log from public, anon, authenticated;
revoke all on function public.approve_trade_request(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.confirm_stat_import(uuid, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.claim_discord_notification(text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.approve_trade_request(uuid, uuid) to service_role;
grant execute on function public.confirm_stat_import(uuid, uuid, jsonb) to service_role;
grant execute on function public.claim_discord_notification(text, text, uuid) to service_role;

commit;
