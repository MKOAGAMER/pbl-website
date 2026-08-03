-- Player discipline, blacklist enforcement and Discord bot audit support.
-- Apply after 202608030001_self_profile_tournament_stat_entry.sql.

begin;

create table if not exists public.player_disciplinary_actions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  action_type text not null,
  reason text not null,
  public_note text,
  evidence_url text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_public boolean not null default false,
  issued_by uuid references public.users(id) on delete set null,
  source text not null default 'web',
  external_request_id text,
  revoked_at timestamptz,
  revoked_by uuid references public.users(id) on delete set null,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_disciplinary_actions_type_check check (
    action_type in ('warning', 'match_suspension', 'trade_ban', 'account_ban', 'blacklist')
  ),
  constraint player_disciplinary_actions_reason_check check (
    char_length(btrim(reason)) between 3 and 2000
  ),
  constraint player_disciplinary_actions_public_note_check check (
    public_note is null or char_length(public_note) <= 1000
  ),
  constraint player_disciplinary_actions_public_visibility_check check (
    not is_public or coalesce(char_length(btrim(public_note)), 0) between 3 and 1000
  ),
  constraint player_disciplinary_actions_evidence_check check (
    evidence_url is null or evidence_url ~* '^https?://[^[:space:]]+$'
  ),
  constraint player_disciplinary_actions_dates_check check (
    ends_at is null or ends_at > starts_at
  ),
  constraint player_disciplinary_actions_source_check check (
    source in ('web', 'discord_bot', 'bot_api', 'system')
  ),
  constraint player_disciplinary_actions_revoke_check check (
    (revoked_at is null and revoked_by is null and revocation_reason is null)
    or (revoked_at is not null and revocation_reason is not null)
  )
);

create index if not exists player_disciplinary_actions_player_active_idx
  on public.player_disciplinary_actions (player_id, action_type, starts_at desc)
  where revoked_at is null;
create index if not exists player_disciplinary_actions_public_idx
  on public.player_disciplinary_actions (is_public, created_at desc)
  where is_public;
create unique index if not exists player_disciplinary_actions_external_request_key
  on public.player_disciplinary_actions (source, external_request_id)
  where external_request_id is not null;

drop trigger if exists set_player_disciplinary_actions_updated_at
  on public.player_disciplinary_actions;
create trigger set_player_disciplinary_actions_updated_at
  before update on public.player_disciplinary_actions
  for each row execute function public.set_updated_at();

alter table public.player_disciplinary_actions enable row level security;
revoke all on table public.player_disciplinary_actions from public, anon, authenticated;
grant all on table public.player_disciplinary_actions to service_role;

create or replace view public.public_player_disciplinary_actions
with (security_barrier = true)
as
select
  action.id,
  action.player_id,
  player.name as player_name,
  player.slug as player_slug,
  player.roblox_username,
  player.avatar_url,
  action.action_type,
  action.public_note,
  action.starts_at,
  action.ends_at,
  action.revoked_at,
  (
    action.revoked_at is null
    and action.starts_at <= now()
    and (action.ends_at is null or action.ends_at > now())
  ) as is_active,
  action.created_at
from public.player_disciplinary_actions as action
join public.players as player on player.id = action.player_id
where action.is_public;

revoke all on table public.public_player_disciplinary_actions from public;
grant select on table public.public_player_disciplinary_actions to anon, authenticated;

create or replace function public.player_has_active_discipline(
  p_player_id uuid,
  p_action_types text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.player_disciplinary_actions as action
    where action.player_id = p_player_id
      and action.action_type = any(p_action_types)
      and action.revoked_at is null
      and action.starts_at <= now()
      and (action.ends_at is null or action.ends_at > now())
  );
$function$;

create or replace function public.enforce_trade_discipline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.status::text in ('pending', 'approved')
     and public.player_has_active_discipline(
       new.player_id,
       array['trade_ban', 'blacklist']::text[]
     )
  then
    raise exception 'Player is currently blocked from trade activity'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

drop trigger if exists enforce_trade_discipline on public.trades;
create trigger enforce_trade_discipline
  before insert or update of player_id, status on public.trades
  for each row execute function public.enforce_trade_discipline();

create or replace function public.enforce_roster_blacklist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.status::text = 'active'
     and public.player_has_active_discipline(
       new.player_id,
       array['blacklist']::text[]
     )
  then
    raise exception 'Blacklisted player cannot be assigned to an active roster'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

drop trigger if exists enforce_roster_blacklist on public.rosters;
create trigger enforce_roster_blacklist
  before insert or update of player_id, team_id, status on public.rosters
  for each row execute function public.enforce_roster_blacklist();

create or replace function public.enforce_match_discipline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if public.player_has_active_discipline(
    new.player_id,
    array['match_suspension', 'blacklist']::text[]
  )
  then
    raise exception 'Player is currently suspended from match participation'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

drop trigger if exists enforce_match_discipline on public.player_game_stats;
create trigger enforce_match_discipline
  before insert or update on public.player_game_stats
  for each row execute function public.enforce_match_discipline();

-- Tournament stat imports keep their rows in JSON instead of
-- player_game_stats. Validate the JSON before the import is confirmed; raising
-- here rolls the tournament score update back in the same transaction.
create or replace function public.enforce_tournament_match_discipline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.status::text = 'confirmed'
     and new.tournament_match_id is not null
     and new.reviewed_rows is not null
     and exists (
       select 1
       from jsonb_to_recordset(new.reviewed_rows) as row_data(player_id uuid)
       where public.player_has_active_discipline(
         row_data.player_id,
         array['match_suspension', 'blacklist']::text[]
       )
     )
  then
    raise exception 'A tournament stat row belongs to a suspended player'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

drop trigger if exists enforce_tournament_match_discipline on public.stat_imports;
create trigger enforce_tournament_match_discipline
  before update of status, reviewed_rows on public.stat_imports
  for each row execute function public.enforce_tournament_match_discipline();

create or replace function public.apply_discipline_side_effects()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.action_type in ('trade_ban', 'blacklist')
     and new.revoked_at is null
     and new.starts_at <= now()
     and (new.ends_at is null or new.ends_at > now())
  then
    update public.trades
    set status = 'cancelled',
        review_note = coalesce(review_note, 'Cancelled automatically by an active disciplinary action')
    where player_id = new.player_id
      and status::text = 'pending';
  end if;
  return new;
end;
$function$;

drop trigger if exists apply_discipline_side_effects
  on public.player_disciplinary_actions;
create trigger apply_discipline_side_effects
  after insert on public.player_disciplinary_actions
  for each row execute function public.apply_discipline_side_effects();

alter table public.trades
  add column if not exists source text not null default 'web';
alter table public.trades
  add column if not exists external_request_id text;
alter table public.trades drop constraint if exists trades_source_check;
alter table public.trades add constraint trades_source_check
  check (source in ('web', 'discord_bot', 'bot_api', 'system'));
create unique index if not exists trades_external_request_key
  on public.trades (source, external_request_id)
  where external_request_id is not null;

create table if not exists public.league_operation_log (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_request_id text,
  actor_user_id uuid references public.users(id) on delete set null,
  actor_discord_id bigint,
  operation text not null,
  resource_type text not null,
  resource_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint league_operation_log_source_check check (
    source in ('web', 'discord_bot', 'bot_api', 'system')
  ),
  constraint league_operation_log_actor_discord_check check (
    actor_discord_id is null or actor_discord_id > 0
  ),
  constraint league_operation_log_operation_check check (
    char_length(operation) between 3 and 100
  ),
  constraint league_operation_log_resource_type_check check (
    char_length(resource_type) between 2 and 80
  ),
  constraint league_operation_log_payload_check check (
    jsonb_typeof(payload) = 'object'
  )
);

create index if not exists league_operation_log_resource_idx
  on public.league_operation_log (resource_type, resource_id, created_at desc);
create index if not exists league_operation_log_actor_idx
  on public.league_operation_log (actor_user_id, created_at desc);
create unique index if not exists league_operation_log_external_request_key
  on public.league_operation_log (source, external_request_id, operation)
  where external_request_id is not null;

alter table public.league_operation_log enable row level security;
revoke all on table public.league_operation_log from public, anon, authenticated;
grant all on table public.league_operation_log to service_role;

revoke all on function public.player_has_active_discipline(uuid, text[])
  from public, anon, authenticated;
revoke all on function public.enforce_trade_discipline()
  from public, anon, authenticated;
revoke all on function public.enforce_roster_blacklist()
  from public, anon, authenticated;
revoke all on function public.enforce_match_discipline()
  from public, anon, authenticated;
revoke all on function public.enforce_tournament_match_discipline()
  from public, anon, authenticated;
revoke all on function public.apply_discipline_side_effects()
  from public, anon, authenticated;
grant execute on function public.player_has_active_discipline(uuid, text[])
  to service_role;

commit;
