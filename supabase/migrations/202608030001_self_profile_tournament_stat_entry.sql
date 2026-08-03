-- Player-managed profile details and AI-assisted tournament score imports.
-- Apply after 202607290006_franchise_profiles_tournaments.sql.

begin;

alter table public.players
  add column if not exists jersey_number smallint not null default 0;

alter table public.players drop constraint if exists players_jersey_number_check;
alter table public.players add constraint players_jersey_number_check
  check (jersey_number between 0 and 99);

-- Use the active-season roster number as the initial public preference when one
-- already exists. Free agents retain the safe default until they edit About Me.
update public.players as player
set jersey_number = roster.jersey_number
from public.rosters as roster
join public.seasons as season on season.id = roster.season_id
where roster.player_id = player.id
  and roster.status = 'active'
  and season.status = 'active';

create or replace function public.update_player_self_profile(
  p_player_id uuid,
  p_bio text,
  p_positions text[],
  p_jersey_number smallint
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_player_id is null or not exists (
    select 1 from public.players where id = p_player_id
  ) then
    raise exception 'Player profile not found';
  end if;

  if char_length(coalesce(p_bio, '')) > 1500 then
    raise exception 'About must not exceed 1,500 characters';
  end if;

  if p_positions is null
     or cardinality(p_positions) not between 1 and 3
     or p_positions <@ array['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL']::text[] is not true
     or cardinality(p_positions) <> cardinality(array(select distinct unnest(p_positions))) then
    raise exception 'Choose between one and three unique playing positions';
  end if;

  if p_jersey_number not between 0 and 99 then
    raise exception 'Jersey number must be between 0 and 99';
  end if;

  -- Keep the current competitive roster aligned with the public preference.
  -- The active-roster unique index rejects a number already used by a teammate.
  update public.rosters as roster
  set jersey_number = p_jersey_number,
      position = (p_positions[1])::public.basketball_position,
      updated_at = now()
  where roster.player_id = p_player_id
    and roster.status = 'active'
    and exists (
      select 1
      from public.seasons as season
      where season.id = roster.season_id
        and season.status = 'active'
    );

  update public.players
  set bio = nullif(btrim(coalesce(p_bio, '')), ''),
      position = (p_positions[1])::public.basketball_position,
      positions = p_positions,
      jersey_number = p_jersey_number,
      updated_at = now()
  where id = p_player_id;
end;
$function$;

alter table public.stat_imports alter column game_id drop not null;
alter table public.stat_imports
  add column if not exists tournament_match_id uuid
    references public.tournament_matches(id) on delete cascade;

alter table public.stat_imports drop constraint if exists stat_imports_target_check;
alter table public.stat_imports add constraint stat_imports_target_check
  check (num_nonnulls(game_id, tournament_match_id) = 1);

create index if not exists stat_imports_tournament_match_created_idx
  on public.stat_imports (tournament_match_id, created_at desc)
  where tournament_match_id is not null;

create or replace function public.confirm_tournament_stat_import(
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
  match_row public.tournament_matches%rowtype;
  home_total integer;
  away_total integer;
  saved_count integer;
begin
  if not exists (
    select 1
    from public.users
    where id = p_reviewer_id
      and role in ('staff', 'admin')
      and admin_permission in ('staff', 'super_admin')
  ) then
    raise exception 'Reviewer is not authorized to confirm tournament scores';
  end if;

  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'At least one stat row is required';
  end if;

  select * into import_row
  from public.stat_imports
  where id = p_import_id
  for update;

  if not found or import_row.tournament_match_id is null then
    raise exception 'Tournament stat import not found';
  end if;
  if import_row.status <> 'review_required' then
    raise exception 'Stat import is not awaiting review';
  end if;

  select * into match_row
  from public.tournament_matches
  where id = import_row.tournament_match_id
  for update;

  if not found or match_row.home_team_id is null or match_row.away_team_id is null then
    raise exception 'Tournament match must have both teams';
  end if;
  if match_row.status in ('postponed', 'cancelled') then
    raise exception 'Postponed or cancelled tournament matches cannot be scored';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_rows) as row_data(
      player_id uuid,
      team_id uuid,
      pts integer
    )
    where row_data.team_id not in (match_row.home_team_id, match_row.away_team_id)
      or not exists (select 1 from public.players where id = row_data.player_id)
  ) then
    raise exception 'Every player must be assigned to one of the tournament teams';
  end if;

  select
    coalesce(sum(row_data.pts) filter (where row_data.team_id = match_row.home_team_id), 0),
    coalesce(sum(row_data.pts) filter (where row_data.team_id = match_row.away_team_id), 0),
    count(*)
  into home_total, away_total, saved_count
  from jsonb_to_recordset(p_rows) as row_data(
    player_id uuid,
    team_id uuid,
    pts integer
  );

  if not exists (
    select 1 from jsonb_to_recordset(p_rows) as row_data(team_id uuid)
    where row_data.team_id = match_row.home_team_id
  ) or not exists (
    select 1 from jsonb_to_recordset(p_rows) as row_data(team_id uuid)
    where row_data.team_id = match_row.away_team_id
  ) then
    raise exception 'Both tournament teams need at least one stat row';
  end if;

  if home_total = away_total then
    raise exception 'A final tournament score cannot be tied';
  end if;

  update public.tournament_matches
  set home_score = home_total,
      away_score = away_total,
      winner_team_id = case
        when home_total > away_total then home_team_id
        else away_team_id
      end,
      status = 'final',
      updated_at = now()
  where id = match_row.id;

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

grant select (jersey_number) on public.players to anon, authenticated;

revoke all on function public.update_player_self_profile(uuid, text, text[], smallint)
  from public, anon, authenticated;
revoke all on function public.confirm_tournament_stat_import(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.update_player_self_profile(uuid, text, text[], smallint)
  to service_role;
grant execute on function public.confirm_tournament_stat_import(uuid, uuid, jsonb)
  to service_role;

commit;
