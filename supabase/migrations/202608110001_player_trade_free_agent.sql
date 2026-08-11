-- Player self-service transfer requests and team-to-Free-Agent releases.
-- The application still requires Staff approval before any roster mutation.

begin;

alter table public.trades alter column to_team_id drop not null;
alter table public.trades drop constraint if exists trades_has_team_check;
alter table public.trades add constraint trades_has_team_check check (
  from_team_id is not null or to_team_id is not null
);

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
  player_position text;
  next_jersey smallint;
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

  -- A null destination is an explicit release to Free Agent.
  if trade_row.to_team_id is null then
    if trade_row.request_kind <> 'release' or trade_row.from_team_id is null then
      raise exception 'A Free Agent destination must be a release request';
    end if;
    if not found then
      raise exception 'Player is not on an active-season roster';
    end if;
    if roster_row.team_id is distinct from trade_row.from_team_id then
      raise exception 'Player roster changed after this request was submitted';
    end if;

    update public.rosters
    set status = 'inactive',
        left_on = current_date,
        updated_at = now()
    where id = roster_row.id;

    update public.players
    set team_id = null,
        updated_at = now()
    where id = trade_row.player_id;
  else
    if not exists (
      select 1 from public.season_teams
      where season_id = active_season_id
        and team_id = trade_row.to_team_id
        and is_active
    ) then
      raise exception 'Destination team is not active in the current season';
    end if;

    -- A player with no team can only be acquired into a team.
    if trade_row.from_team_id is null then
      if trade_row.request_kind <> 'acquire' then
        raise exception 'A Free Agent request must be an acquire request';
      end if;
      if found then
        raise exception 'Free Agent joined a roster after this request was submitted';
      end if;
      if exists (
        select 1 from public.players
        where id = trade_row.player_id and team_id is not null
      ) then
        raise exception 'Player team changed after this request was submitted';
      end if;

      select position into player_position
      from public.players
      where id = trade_row.player_id;

      select available.number::smallint into next_jersey
      from generate_series(0, 99) as available(number)
      where not exists (
        select 1 from public.rosters
        where season_id = active_season_id
          and team_id = trade_row.to_team_id
          and jersey_number = available.number
          and status = 'active'
      )
      order by available.number
      limit 1;

      if next_jersey is null then
        raise exception 'Destination team has no available jersey number';
      end if;

      insert into public.rosters (
        season_id, team_id, player_id, jersey_number, position,
        status, joined_on, left_on
      ) values (
        active_season_id,
        trade_row.to_team_id,
        trade_row.player_id,
        next_jersey,
        case
          when player_position in ('PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL')
            then player_position::public.basketball_position
          else 'UTIL'::public.basketball_position
        end,
        'active', current_date, null
      )
      on conflict (season_id, player_id) do update set
        team_id = excluded.team_id,
        jersey_number = excluded.jersey_number,
        position = excluded.position,
        status = 'active',
        joined_on = current_date,
        left_on = null,
        updated_at = now();
    else
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
    end if;

    update public.players
    set team_id = trade_row.to_team_id,
        updated_at = now()
    where id = trade_row.player_id;
  end if;

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

revoke all on function public.approve_trade_request(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.approve_trade_request(uuid, uuid) to service_role;

commit;
