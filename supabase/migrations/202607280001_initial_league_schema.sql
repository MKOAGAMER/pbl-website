-- PBL portal: initial production schema
--
-- This migration intentionally extends the four minimal tables that existed in
-- the hosted project (teams, players, games and player_game_stats). It does not
-- drop them or their legacy columns. The hosted tables were confirmed empty and
-- to use UUID identifiers before this migration was prepared.

begin;

create extension if not exists pgcrypto with schema extensions;

do $migration$
begin
  create type public.app_role as enum (
    'member', 'team_manager', 'statistician', 'editor', 'admin', 'super_admin'
  );
exception
  when duplicate_object then null;
end
$migration$;

do $migration$
begin
  create type public.season_status as enum ('planned', 'active', 'completed', 'archived');
exception
  when duplicate_object then null;
end
$migration$;

do $migration$
begin
  create type public.roster_status as enum ('active', 'inactive', 'injured', 'suspended');
exception
  when duplicate_object then null;
end
$migration$;

do $migration$
begin
  create type public.game_status as enum ('scheduled', 'live', 'final', 'postponed', 'cancelled');
exception
  when duplicate_object then null;
end
$migration$;

do $migration$
begin
  create type public.news_status as enum ('draft', 'published', 'archived');
exception
  when duplicate_object then null;
end
$migration$;

do $migration$
begin
  create type public.basketball_position as enum ('PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL');
exception
  when duplicate_object then null;
end
$migration$;

do $migration$
begin
  create type public.link_kind as enum ('social', 'stream', 'sponsor', 'document', 'contact', 'other');
exception
  when duplicate_object then null;
end
$migration$;

-- ---------------------------------------------------------------------------
-- Core league entities
-- ---------------------------------------------------------------------------

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  abbreviation text not null,
  city text,
  description text,
  logo_url text,
  primary_color text not null default '#111827',
  secondary_color text not null default '#ffffff',
  website_url text,
  home_venue text,
  is_active boolean not null default true,
  wins integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibility for the pre-existing minimal teams table.
alter table public.teams add column if not exists slug text;
alter table public.teams add column if not exists abbreviation text;
alter table public.teams add column if not exists city text;
alter table public.teams add column if not exists description text;
alter table public.teams add column if not exists primary_color text default '#111827';
alter table public.teams add column if not exists secondary_color text default '#ffffff';
alter table public.teams add column if not exists website_url text;
alter table public.teams add column if not exists home_venue text;
alter table public.teams add column if not exists is_active boolean default true;
alter table public.teams add column if not exists wins integer default 0;
alter table public.teams add column if not exists losses integer default 0;
alter table public.teams add column if not exists updated_at timestamptz default now();

alter table public.teams alter column id set default gen_random_uuid();
alter table public.teams alter column created_at set default now();
alter table public.teams alter column updated_at set default now();
alter table public.teams alter column primary_color set default '#111827';
alter table public.teams alter column secondary_color set default '#ffffff';
alter table public.teams alter column is_active set default true;
alter table public.teams alter column wins set default 0;
alter table public.teams alter column losses set default 0;

update public.teams
set
  name = coalesce(nullif(btrim(name), ''), 'Team ' || left(id::text, 8)),
  slug = coalesce(nullif(btrim(slug), ''), 'team-' || replace(left(id::text, 8), '-', '')),
  abbreviation = coalesce(nullif(btrim(abbreviation), ''), upper(left(replace(id::text, '-', ''), 3))),
  primary_color = coalesce(nullif(btrim(primary_color), ''), '#111827'),
  secondary_color = coalesce(nullif(btrim(secondary_color), ''), '#ffffff'),
  is_active = coalesce(is_active, true),
  wins = coalesce(wins, 0),
  losses = coalesce(losses, 0),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where
  name is null or btrim(name) = ''
  or slug is null or btrim(slug) = ''
  or abbreviation is null or btrim(abbreviation) = ''
  or primary_color is null or btrim(primary_color) = ''
  or secondary_color is null or btrim(secondary_color) = ''
  or is_active is null or wins is null or losses is null
  or created_at is null or updated_at is null;

alter table public.teams alter column name set not null;
alter table public.teams alter column slug set not null;
alter table public.teams alter column abbreviation set not null;
alter table public.teams alter column primary_color set not null;
alter table public.teams alter column secondary_color set not null;
alter table public.teams alter column is_active set not null;
alter table public.teams alter column wins set not null;
alter table public.teams alter column losses set not null;
alter table public.teams alter column created_at set not null;
alter table public.teams alter column updated_at set not null;
alter table public.teams alter column logo_url drop not null;

create unique index if not exists teams_slug_key on public.teams (slug);
create unique index if not exists teams_abbreviation_key on public.teams (abbreviation);
create index if not exists teams_active_idx on public.teams (is_active, name);

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.teams'::regclass and conname = 'teams_slug_format_check'
  ) then
    alter table public.teams
      add constraint teams_slug_format_check
      check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.teams'::regclass and conname = 'teams_abbreviation_check'
  ) then
    alter table public.teams
      add constraint teams_abbreviation_check
      check (abbreviation ~ '^[A-Z0-9]{2,6}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.teams'::regclass and conname = 'teams_colors_check'
  ) then
    alter table public.teams
      add constraint teams_colors_check
      check (
        primary_color ~ '^#[0-9A-Fa-f]{6}$'
        and secondary_color ~ '^#[0-9A-Fa-f]{6}$'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.teams'::regclass and conname = 'teams_legacy_record_check'
  ) then
    alter table public.teams
      add constraint teams_legacy_record_check check (wins >= 0 and losses >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.teams'::regclass and conname = 'teams_public_urls_check'
  ) then
    alter table public.teams
      add constraint teams_public_urls_check check (
        (logo_url is null or logo_url ~* '^https?://[^[:space:]]+$')
        and (website_url is null or website_url ~* '^https?://[^[:space:]]+$')
      );
  end if;
end
$migration$;

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  league_name text not null default 'PBL',
  starts_on date not null,
  ends_on date not null,
  status public.season_status not null default 'planned',
  is_public boolean not null default false,
  champion_team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_dates_check check (ends_on >= starts_on),
  constraint seasons_slug_format_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index if not exists seasons_public_status_idx
  on public.seasons (is_public, status, starts_on desc);

-- An earlier partial deployment may have allowed multiple active rows. Keep the
-- newest season deterministically and reduce every older duplicate to completed
-- before installing the concurrency-safe unique invariant.
with ranked_active_seasons as (
  select
    id,
    row_number() over (
      order by starts_on desc, created_at desc, id desc
    ) as active_rank
  from public.seasons
  where status = 'active'
)
update public.seasons as s
set status = 'completed'
from ranked_active_seasons as ranked
where s.id = ranked.id and ranked.active_rank > 1;

create unique index if not exists seasons_one_active_key
  on public.seasons (status) where status = 'active';

create table if not exists public.season_teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  conference text,
  division text,
  seed integer,
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint season_teams_season_team_key unique (season_id, team_id),
  constraint season_teams_seed_check check (seed is null or seed > 0)
);

create index if not exists season_teams_team_idx on public.season_teams (team_id, season_id);

-- Profiles mirror auth.users without copying private email addresses.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  bio text,
  role public.app_role not null default 'member',
  managed_team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_check check (char_length(btrim(display_name)) between 1 and 80),
  constraint profiles_managed_team_role_check check (
    (role = 'team_manager' and managed_team_id is not null)
    or (role <> 'team_manager' and managed_team_id is null)
  )
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_managed_team_idx on public.profiles (managed_team_id);

-- Bring profiles created by an earlier partial migration to the least-privilege
-- state before adding the invariant. A manager without a team has no usable
-- management scope, so it is safely demoted and can be reassigned by an admin.
update public.profiles
set managed_team_id = null
where role <> 'team_manager' and managed_team_id is not null;

update public.profiles
set role = 'member'
where role = 'team_manager' and managed_team_id is null;

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_managed_team_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_managed_team_role_check check (
        (role = 'team_manager' and managed_team_id is not null)
        or (role <> 'team_manager' and managed_team_id is null)
      );
  end if;
end
$migration$;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  -- Retained for compatibility with the original minimal schema.
  name text not null,
  first_name text not null,
  last_name text not null,
  slug text not null,
  roblox_username text,
  roblox_user_id bigint,
  -- Kept as constrained text for compatibility with the hosted minimal table.
  -- Season-specific roster.position uses the basketball_position enum.
  position text not null,
  team_id uuid references public.teams(id) on delete set null,
  birth_date date,
  height_cm smallint,
  weight_kg numeric(5,2),
  nationality text,
  hometown text,
  college text,
  avatar_url text,
  bio text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibility for the pre-existing minimal players table. The legacy team_id
-- remains a convenient current-team pointer; rosters are authoritative by season.
alter table public.players add column if not exists name text;
alter table public.players add column if not exists first_name text;
alter table public.players add column if not exists last_name text;
alter table public.players add column if not exists slug text;
alter table public.players add column if not exists roblox_username text;
alter table public.players add column if not exists roblox_user_id bigint;
alter table public.players add column if not exists birth_date date;
alter table public.players add column if not exists height_cm smallint;
alter table public.players add column if not exists weight_kg numeric(5,2);
alter table public.players add column if not exists nationality text;
alter table public.players add column if not exists hometown text;
alter table public.players add column if not exists college text;
alter table public.players add column if not exists avatar_url text;
alter table public.players add column if not exists bio text;
alter table public.players add column if not exists is_active boolean default true;
alter table public.players add column if not exists updated_at timestamptz default now();

alter table public.players alter column id set default gen_random_uuid();
alter table public.players alter column created_at set default now();
alter table public.players alter column updated_at set default now();
alter table public.players alter column is_active set default true;

update public.players
set
  first_name = coalesce(
    nullif(btrim(first_name), ''),
    nullif(split_part(btrim(name), ' ', 1), ''),
    'Player'
  ),
  last_name = coalesce(
    nullif(btrim(last_name), ''),
    nullif(btrim(regexp_replace(btrim(name), '^[^[:space:]]+[[:space:]]*', '')), ''),
    left(id::text, 8)
  ),
  slug = coalesce(nullif(btrim(slug), ''), 'player-' || replace(left(id::text, 8), '-', '')),
  position = case
    when position is null or btrim(position::text) = '' then 'UTIL'
    else position
  end,
  is_active = coalesce(is_active, true),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where
  first_name is null or btrim(first_name) = ''
  or last_name is null or btrim(last_name) = ''
  or slug is null or btrim(slug) = ''
  or position is null or btrim(position::text) = ''
  or is_active is null or created_at is null or updated_at is null;

update public.players
set name = btrim(first_name || ' ' || last_name)
where name is null or btrim(name) = '';

alter table public.players alter column name set not null;
alter table public.players alter column first_name set not null;
alter table public.players alter column last_name set not null;
alter table public.players alter column slug set not null;
alter table public.players alter column position set not null;
alter table public.players alter column is_active set not null;
alter table public.players alter column created_at set not null;
alter table public.players alter column updated_at set not null;
alter table public.players alter column team_id drop not null;

create unique index if not exists players_slug_key on public.players (slug);
create unique index if not exists players_roblox_username_key
  on public.players (lower(roblox_username)) where roblox_username is not null;
create unique index if not exists players_roblox_user_id_key
  on public.players (roblox_user_id) where roblox_user_id is not null;
create index if not exists players_team_idx on public.players (team_id);
create index if not exists players_active_name_idx on public.players (is_active, last_name, first_name);

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.players'::regclass and conname = 'players_team_id_fkey'
  ) then
    alter table public.players
      add constraint players_team_id_fkey foreign key (team_id)
      references public.teams(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.players'::regclass and conname = 'players_slug_format_check'
  ) then
    alter table public.players
      add constraint players_slug_format_check
      check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.players'::regclass and conname = 'players_position_check'
  ) then
    alter table public.players
      add constraint players_position_check
      check (position::text in ('PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.players'::regclass and conname = 'players_measurements_check'
  ) then
    alter table public.players
      add constraint players_measurements_check
      check (
        (height_cm is null or height_cm between 120 and 260)
        and (weight_kg is null or weight_kg between 35 and 250)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.players'::regclass and conname = 'players_roblox_identity_check'
  ) then
    alter table public.players
      add constraint players_roblox_identity_check
      check (
        (roblox_username is null or roblox_username ~ '^[A-Za-z0-9_]{3,20}$')
        and (roblox_user_id is null or roblox_user_id > 0)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.players'::regclass and conname = 'players_avatar_url_check'
  ) then
    alter table public.players
      add constraint players_avatar_url_check check (
        avatar_url is null or avatar_url ~* '^https?://[^[:space:]]+$'
      );
  end if;
end
$migration$;

create table if not exists public.rosters (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  jersey_number smallint not null,
  position public.basketball_position,
  status public.roster_status not null default 'active',
  is_captain boolean not null default false,
  joined_on date,
  left_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rosters_season_player_key unique (season_id, player_id),
  constraint rosters_jersey_number_check check (jersey_number between 0 and 99),
  constraint rosters_dates_check check (left_on is null or joined_on is null or left_on >= joined_on)
);

create unique index if not exists rosters_active_jersey_key
  on public.rosters (season_id, team_id, jersey_number)
  where status = 'active';
create index if not exists rosters_team_season_idx on public.rosters (team_id, season_id);
create index if not exists rosters_player_idx on public.rosters (player_id);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  game_number integer,
  round_number integer,
  scheduled_at timestamptz not null,
  venue text,
  status public.game_status not null default 'scheduled',
  home_team_id uuid not null references public.teams(id) on delete restrict,
  away_team_id uuid not null references public.teams(id) on delete restrict,
  home_score integer,
  away_score integer,
  home_period_scores smallint[],
  away_period_scores smallint[],
  broadcast_name text,
  stream_url text,
  highlights_url text,
  notes text,
  finalized_at timestamptz,
  finalized_by uuid references auth.users(id) on delete set null,
  revision integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibility for the pre-existing minimal games table. Its status column is
-- text, so all policies/views compare status::text and work on both installations.
alter table public.games add column if not exists season_id uuid;
alter table public.games add column if not exists game_number integer;
alter table public.games add column if not exists round_number integer;
alter table public.games add column if not exists scheduled_at timestamptz;
alter table public.games add column if not exists venue text;
alter table public.games add column if not exists home_team_id uuid;
alter table public.games add column if not exists away_team_id uuid;
alter table public.games add column if not exists home_score integer;
alter table public.games add column if not exists away_score integer;
alter table public.games add column if not exists home_period_scores smallint[];
alter table public.games add column if not exists away_period_scores smallint[];
alter table public.games add column if not exists broadcast_name text;
alter table public.games add column if not exists stream_url text;
alter table public.games add column if not exists highlights_url text;
alter table public.games add column if not exists notes text;
alter table public.games add column if not exists finalized_at timestamptz;
alter table public.games add column if not exists finalized_by uuid;
alter table public.games add column if not exists revision integer default 0;
alter table public.games add column if not exists updated_at timestamptz default now();

alter table public.games alter column id set default gen_random_uuid();
do $migration$
begin
  if (
    select a.atttypid <> 'public.game_status'::regtype
    from pg_attribute as a
    where a.attrelid = 'public.games'::regclass
      and a.attname = 'status'
      and not a.attisdropped
  ) then
    if exists (
      select 1 from public.games
      where lower(status::text) not in (
        'scheduled', 'upcoming', 'live', 'final', 'postponed', 'cancelled', 'canceled'
      )
    ) then
      raise exception 'games.status contains values that cannot be migrated to game_status';
    end if;

    alter table public.games alter column status drop default;
    alter table public.games alter column status type public.game_status
      using (
        case lower(status::text)
          when 'upcoming' then 'scheduled'
          when 'canceled' then 'cancelled'
          else lower(status::text)
        end
      )::public.game_status;
  end if;
end
$migration$;
alter table public.games alter column status set default 'scheduled';
alter table public.games alter column created_at set default now();
alter table public.games alter column updated_at set default now();
alter table public.games alter column revision set default 0;

-- The hosted compatibility tables are empty. Keeping these columns required now
-- prevents partial games from entering the production API later.
alter table public.games alter column season_id set not null;
alter table public.games alter column scheduled_at set not null;
alter table public.games alter column status set not null;
alter table public.games alter column home_team_id set not null;
alter table public.games alter column away_team_id set not null;
alter table public.games alter column revision set not null;
alter table public.games alter column created_at set not null;
alter table public.games alter column updated_at set not null;

create unique index if not exists games_season_number_key
  on public.games (season_id, game_number) where game_number is not null;
create index if not exists games_schedule_idx on public.games (season_id, scheduled_at);
create index if not exists games_status_schedule_idx on public.games (status, scheduled_at);
create index if not exists games_home_team_idx on public.games (home_team_id, scheduled_at);
create index if not exists games_away_team_idx on public.games (away_team_id, scheduled_at);

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.games'::regclass and conname = 'games_season_id_fkey'
  ) then
    alter table public.games
      add constraint games_season_id_fkey foreign key (season_id)
      references public.seasons(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.games'::regclass and conname = 'games_home_team_id_fkey'
  ) then
    alter table public.games
      add constraint games_home_team_id_fkey foreign key (home_team_id)
      references public.teams(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.games'::regclass and conname = 'games_away_team_id_fkey'
  ) then
    alter table public.games
      add constraint games_away_team_id_fkey foreign key (away_team_id)
      references public.teams(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.games'::regclass and conname = 'games_finalized_by_fkey'
  ) then
    alter table public.games
      add constraint games_finalized_by_fkey foreign key (finalized_by)
      references auth.users(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.games'::regclass and conname = 'games_teams_check'
  ) then
    alter table public.games
      add constraint games_teams_check check (home_team_id <> away_team_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.games'::regclass and conname = 'games_status_check'
  ) then
    alter table public.games
      add constraint games_status_check
      check (lower(status::text) in ('scheduled', 'live', 'final', 'postponed', 'cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.games'::regclass and conname = 'games_scores_check'
  ) then
    alter table public.games
      add constraint games_scores_check check (
        (home_score is null or home_score >= 0)
        and (away_score is null or away_score >= 0)
        and (
          lower(status::text) <> 'final'
          or (home_score is not null and away_score is not null and home_score <> away_score)
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.games'::regclass and conname = 'games_public_urls_check'
  ) then
    alter table public.games
      add constraint games_public_urls_check check (
        (stream_url is null or stream_url ~* '^https?://[^[:space:]]+$')
        and (highlights_url is null or highlights_url ~* '^https?://[^[:space:]]+$')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.games'::regclass and conname = 'games_revision_check'
  ) then
    alter table public.games
      add constraint games_revision_check check (revision >= 0);
  end if;
end
$migration$;

create table if not exists public.player_game_stats (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  is_starter boolean not null default false,
  did_play boolean not null default true,
  minutes numeric(5,2) not null default 0,
  points smallint not null default 0,
  rebounds smallint not null default 0,
  offensive_rebounds smallint not null default 0,
  defensive_rebounds smallint not null default 0,
  assists smallint not null default 0,
  steals smallint not null default 0,
  blocks smallint not null default 0,
  turnovers smallint not null default 0,
  personal_fouls smallint not null default 0,
  field_goals_made smallint not null default 0,
  field_goals_attempted smallint not null default 0,
  three_pointers_made smallint not null default 0,
  three_pointers_attempted smallint not null default 0,
  free_throws_made smallint not null default 0,
  free_throws_attempted smallint not null default 0,
  plus_minus smallint,
  dnp_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_game_stats_game_player_key unique (game_id, player_id)
);

-- Compatibility for the pre-existing minimal player_game_stats table.
alter table public.player_game_stats add column if not exists team_id uuid;
alter table public.player_game_stats add column if not exists is_starter boolean default false;
alter table public.player_game_stats add column if not exists did_play boolean default true;
alter table public.player_game_stats add column if not exists minutes numeric(5,2) default 0;
alter table public.player_game_stats add column if not exists offensive_rebounds smallint default 0;
alter table public.player_game_stats add column if not exists defensive_rebounds smallint default 0;
alter table public.player_game_stats add column if not exists turnovers smallint default 0;
alter table public.player_game_stats add column if not exists personal_fouls smallint default 0;
alter table public.player_game_stats add column if not exists field_goals_made smallint default 0;
alter table public.player_game_stats add column if not exists field_goals_attempted smallint default 0;
alter table public.player_game_stats add column if not exists three_pointers_made smallint default 0;
alter table public.player_game_stats add column if not exists three_pointers_attempted smallint default 0;
alter table public.player_game_stats add column if not exists free_throws_made smallint default 0;
alter table public.player_game_stats add column if not exists free_throws_attempted smallint default 0;
alter table public.player_game_stats add column if not exists plus_minus smallint;
alter table public.player_game_stats add column if not exists dnp_reason text;
alter table public.player_game_stats add column if not exists created_at timestamptz default now();
alter table public.player_game_stats add column if not exists updated_at timestamptz default now();

alter table public.player_game_stats alter column id set default gen_random_uuid();
alter table public.player_game_stats alter column is_starter set default false;
alter table public.player_game_stats alter column did_play set default true;
alter table public.player_game_stats alter column minutes set default 0;
alter table public.player_game_stats alter column points set default 0;
alter table public.player_game_stats alter column rebounds set default 0;
alter table public.player_game_stats alter column offensive_rebounds set default 0;
alter table public.player_game_stats alter column defensive_rebounds set default 0;
alter table public.player_game_stats alter column assists set default 0;
alter table public.player_game_stats alter column steals set default 0;
alter table public.player_game_stats alter column blocks set default 0;
alter table public.player_game_stats alter column turnovers set default 0;
alter table public.player_game_stats alter column personal_fouls set default 0;
alter table public.player_game_stats alter column field_goals_made set default 0;
alter table public.player_game_stats alter column field_goals_attempted set default 0;
alter table public.player_game_stats alter column three_pointers_made set default 0;
alter table public.player_game_stats alter column three_pointers_attempted set default 0;
alter table public.player_game_stats alter column free_throws_made set default 0;
alter table public.player_game_stats alter column free_throws_attempted set default 0;
alter table public.player_game_stats alter column created_at set default now();
alter table public.player_game_stats alter column updated_at set default now();

alter table public.player_game_stats alter column game_id set not null;
alter table public.player_game_stats alter column player_id set not null;
alter table public.player_game_stats alter column team_id set not null;
alter table public.player_game_stats alter column is_starter set not null;
alter table public.player_game_stats alter column did_play set not null;
alter table public.player_game_stats alter column minutes set not null;
alter table public.player_game_stats alter column points set not null;
alter table public.player_game_stats alter column rebounds set not null;
alter table public.player_game_stats alter column offensive_rebounds set not null;
alter table public.player_game_stats alter column defensive_rebounds set not null;
alter table public.player_game_stats alter column assists set not null;
alter table public.player_game_stats alter column steals set not null;
alter table public.player_game_stats alter column blocks set not null;
alter table public.player_game_stats alter column turnovers set not null;
alter table public.player_game_stats alter column personal_fouls set not null;
alter table public.player_game_stats alter column field_goals_made set not null;
alter table public.player_game_stats alter column field_goals_attempted set not null;
alter table public.player_game_stats alter column three_pointers_made set not null;
alter table public.player_game_stats alter column three_pointers_attempted set not null;
alter table public.player_game_stats alter column free_throws_made set not null;
alter table public.player_game_stats alter column free_throws_attempted set not null;
alter table public.player_game_stats alter column created_at set not null;
alter table public.player_game_stats alter column updated_at set not null;

create unique index if not exists player_game_stats_game_player_key
  on public.player_game_stats (game_id, player_id);
create index if not exists player_game_stats_player_idx
  on public.player_game_stats (player_id, game_id);
create index if not exists player_game_stats_team_idx
  on public.player_game_stats (team_id, game_id);

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.player_game_stats'::regclass
      and conname = 'player_game_stats_game_id_fkey'
  ) then
    alter table public.player_game_stats
      add constraint player_game_stats_game_id_fkey foreign key (game_id)
      references public.games(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.player_game_stats'::regclass
      and conname = 'player_game_stats_player_id_fkey'
  ) then
    alter table public.player_game_stats
      add constraint player_game_stats_player_id_fkey foreign key (player_id)
      references public.players(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.player_game_stats'::regclass
      and conname = 'player_game_stats_team_id_fkey'
  ) then
    alter table public.player_game_stats
      add constraint player_game_stats_team_id_fkey foreign key (team_id)
      references public.teams(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.player_game_stats'::regclass
      and conname = 'player_game_stats_nonnegative_check'
  ) then
    alter table public.player_game_stats add constraint player_game_stats_nonnegative_check check (
      minutes between 0 and 100
      and points >= 0 and rebounds >= 0
      and offensive_rebounds >= 0 and defensive_rebounds >= 0
      and assists >= 0 and steals >= 0 and blocks >= 0
      and turnovers >= 0 and personal_fouls >= 0
      and field_goals_made >= 0 and field_goals_attempted >= 0
      and three_pointers_made >= 0 and three_pointers_attempted >= 0
      and free_throws_made >= 0 and free_throws_attempted >= 0
    );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.player_game_stats'::regclass
      and conname = 'player_game_stats_shooting_check'
  ) then
    alter table public.player_game_stats add constraint player_game_stats_shooting_check check (
      field_goals_made <= field_goals_attempted
      and three_pointers_made <= three_pointers_attempted
      and three_pointers_made <= field_goals_made
      and three_pointers_attempted <= field_goals_attempted
      and free_throws_made <= free_throws_attempted
      and rebounds = offensive_rebounds + defensive_rebounds
    );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.player_game_stats'::regclass
      and conname = 'player_game_stats_points_formula_check'
  ) then
    alter table public.player_game_stats
      add constraint player_game_stats_points_formula_check check (
        points = (field_goals_made - three_pointers_made) * 2
          + three_pointers_made * 3
          + free_throws_made
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.player_game_stats'::regclass
      and conname = 'player_game_stats_dnp_zero_check'
  ) then
    alter table public.player_game_stats
      add constraint player_game_stats_dnp_zero_check check (
        did_play or (
          minutes = 0 and points = 0 and rebounds = 0
          and offensive_rebounds = 0 and defensive_rebounds = 0
          and assists = 0 and steals = 0 and blocks = 0 and turnovers = 0
          and personal_fouls = 0
          and field_goals_made = 0 and field_goals_attempted = 0
          and three_pointers_made = 0 and three_pointers_attempted = 0
          and free_throws_made = 0 and free_throws_attempted = 0
          and coalesce(plus_minus, 0) = 0
        )
      );
  end if;
end
$migration$;

-- Fail early with a useful message if one of the four hosted compatibility
-- tables has an unexpected identifier type. All missing non-key columns above
-- are added explicitly with ADD COLUMN IF NOT EXISTS.
do $migration$
declare
  incompatible_columns text;
begin
  select string_agg(required.table_name || '.' || required.column_name, ', ')
  into incompatible_columns
  from (
    values
      ('teams', 'id'),
      ('players', 'id'), ('players', 'team_id'),
      ('games', 'id'),
      ('player_game_stats', 'id'),
      ('player_game_stats', 'game_id'),
      ('player_game_stats', 'player_id')
  ) as required(table_name, column_name)
  left join information_schema.columns as c
    on c.table_schema = 'public'
   and c.table_name = required.table_name
   and c.column_name = required.column_name
  where c.column_name is null or c.udt_name <> 'uuid';

  if incompatible_columns is not null then
    raise exception 'Compatibility check failed; expected UUID columns: %',
      incompatible_columns;
  end if;
end
$migration$;

-- ---------------------------------------------------------------------------
-- Editorial content and supporting data
-- ---------------------------------------------------------------------------

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null,
  category text not null default 'League',
  tags text[] not null default '{}',
  cover_image_url text,
  author_id uuid references public.profiles(id) on delete set null,
  status public.news_status not null default 'draft',
  is_featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_posts_slug_format_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint news_posts_publish_time_check check (
    status <> 'published' or published_at is not null
  ),
  constraint news_posts_cover_url_check check (
    cover_image_url is null or cover_image_url ~* '^https?://[^[:space:]]+$'
  )
);

create index if not exists news_posts_public_idx
  on public.news_posts (status, published_at desc);
create index if not exists news_posts_featured_idx
  on public.news_posts (is_featured, published_at desc)
  where status = 'published';

create table if not exists public.accolades (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  title text not null,
  category text not null,
  description text,
  awarded_on date,
  sort_order integer not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accolades_recipient_check check (player_id is not null or team_id is not null)
);

create index if not exists accolades_season_idx
  on public.accolades (season_id, sort_order, awarded_on desc);
create index if not exists accolades_player_idx on public.accolades (player_id);
create index if not exists accolades_team_idx on public.accolades (team_id);

create table if not exists public.league_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  kind public.link_kind not null default 'other',
  description text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  opens_in_new_tab boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint league_links_url_check check (url ~* '^https?://')
);

create index if not exists league_links_active_order_idx
  on public.league_links (is_active, sort_order, label);

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  role text not null,
  department text,
  roblox_username text,
  avatar_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_members_display_name_check
    check (char_length(btrim(display_name)) between 1 and 80),
  constraint staff_members_role_check
    check (char_length(btrim(role)) between 1 and 80),
  constraint staff_members_roblox_username_check
    check (
      roblox_username is null
      or roblox_username ~ '^[A-Za-z0-9_]{3,20}$'
    ),
  constraint staff_members_avatar_url_check
    check (
      avatar_url is null or avatar_url ~* '^https?://[^[:space:]]+$'
    )
);

create index if not exists staff_members_public_order_idx
  on public.staff_members (is_active, sort_order, display_name);
create unique index if not exists staff_members_roblox_username_key
  on public.staff_members (lower(roblox_username)) where roblox_username is not null;

create table if not exists public.game_audit_log (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete set null,
  stat_id uuid,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now(),
  constraint game_audit_log_event_check check (
    event_type in (
      'game_insert', 'game_update', 'game_delete',
      'stat_insert', 'stat_update', 'stat_delete'
    )
  )
);

create index if not exists game_audit_log_game_time_idx
  on public.game_audit_log (game_id, created_at desc);
create index if not exists game_audit_log_actor_time_idx
  on public.game_audit_log (actor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Shared functions and data-integrity triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  );
$function$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$function$;

create or replace function public.is_league_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('statistician', 'editor', 'admin', 'super_admin')
  );
$function$;

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role in ('editor', 'admin', 'super_admin')
  );
$function$;

create or replace function public.can_manage_scores()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('statistician', 'editor', 'admin', 'super_admin')
  );
$function$;

create or replace function public.can_manage_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        role in ('editor', 'admin', 'super_admin')
        or (role = 'team_manager' and managed_team_id = target_team_id)
      )
  );
$function$;

create or replace function public.can_view_managed_season(target_season_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles as p
    join public.season_teams as st on st.team_id = p.managed_team_id
    where p.id = auth.uid()
      and p.role = 'team_manager'
      and st.season_id = target_season_id
      and st.is_active
  );
$function$;

create or replace function public.enforce_single_active_season()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if new.status = 'active' then
    update public.seasons
    set status = 'completed'
    where status = 'active' and id <> new.id;

    new.is_public := true;
  end if;

  return new;
end;
$function$;

create or replace function public.lock_season_activation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  -- Statement-level locking happens before UPDATE obtains target row locks,
  -- avoiding lock-order deadlocks between competing activation requests.
  perform pg_advisory_xact_lock(721946220260730);
  return null;
end;
$function$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Member'
      ),
      80
    ),
    nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), '')
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  return new;
end;
$function$;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'DELETE' then
    if old.role = 'super_admin' then
      perform pg_advisory_xact_lock(721946220260729);
      if not exists (
        select 1 from public.profiles
        where role = 'super_admin' and id <> old.id
      ) then
        raise exception 'Cannot delete the last super administrator'
          using errcode = '23514';
      end if;
    end if;
    return old;
  end if;

  if old.role = 'super_admin' and new.role <> 'super_admin' then
    -- Serialize concurrent demotions so two requests cannot both pass the count.
    perform pg_advisory_xact_lock(721946220260729);
    if not exists (
      select 1 from public.profiles
      where role = 'super_admin' and id <> old.id
    ) then
      raise exception 'Cannot demote the last super administrator'
        using errcode = '23514';
    end if;
  end if;

  -- SQL editor/service operations have no auth.uid(); ordinary users do.
  if auth.uid() is not null then
    if (new.role is distinct from old.role
        or new.managed_team_id is distinct from old.managed_team_id
        or new.created_at is distinct from old.created_at)
       and not public.is_admin()
    then
      raise exception 'Only an administrator may change protected profile fields'
        using errcode = '42501';
    end if;

    if new.role is distinct from old.role
       and (new.role = 'super_admin' or old.role = 'super_admin')
       and not public.is_super_admin()
    then
      raise exception 'Only a super administrator may grant or revoke super_admin'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$function$;

create or replace function public.protect_game_structure()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  -- These fields are maintained only by set_game_finalization_metadata(). The
  -- protection trigger runs first, so legitimate trigger-generated changes pass.
  if auth.uid() is not null and (
    new.finalized_at is distinct from old.finalized_at
    or new.finalized_by is distinct from old.finalized_by
    or new.revision is distinct from old.revision
  ) then
    raise exception 'Finalization metadata is system-maintained'
      using errcode = '42501';
  end if;

  if auth.uid() is not null
     and old.status <> 'final'
     and new.status = 'final'
     and coalesce(current_setting('pbl.finalize_game', true), '') <> 'on'
  then
    raise exception 'Use finalize_game() to finalize a game'
      using errcode = '42501';
  end if;

  -- A finalized result is immutable through direct table updates, including for
  -- editors. Reopening first ensures every corrected result passes through
  -- finalize_game() and its player-stat reconciliation again.
  if auth.uid() is not null
     and old.status = 'final'
     and new.status = 'final'
     and (
       new.season_id is distinct from old.season_id
       or new.home_team_id is distinct from old.home_team_id
       or new.away_team_id is distinct from old.away_team_id
       or new.home_score is distinct from old.home_score
       or new.away_score is distinct from old.away_score
       or new.home_period_scores is distinct from old.home_period_scores
       or new.away_period_scores is distinct from old.away_period_scores
     )
  then
    raise exception 'Reopen the final game to live before changing its result'
      using errcode = '42501';
  end if;

  -- SQL editor/service operations and editors may change scheduling metadata.
  if auth.uid() is null or public.is_editor() then
    return new;
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'scheduled' and new.status = 'live')
    or (old.status = 'live' and new.status = 'final')
  ) then
    raise exception 'A statistician may only transition scheduled to live or live to final'
      using errcode = '42501';
  end if;

  -- Statisticians may update live state, scores, period scores and notes only.
  if public.can_manage_scores() and (
    new.id is distinct from old.id
    or new.created_at is distinct from old.created_at
    or new.season_id is distinct from old.season_id
    or new.game_number is distinct from old.game_number
    or new.round_number is distinct from old.round_number
    or new.scheduled_at is distinct from old.scheduled_at
    or new.venue is distinct from old.venue
    or new.home_team_id is distinct from old.home_team_id
    or new.away_team_id is distinct from old.away_team_id
    or new.broadcast_name is distinct from old.broadcast_name
    or new.stream_url is distinct from old.stream_url
    or new.highlights_url is distinct from old.highlights_url
  ) then
    raise exception 'A statistician may update game status and scoring fields only'
      using errcode = '42501';
  end if;

  if old.status = 'final' and new.status <> 'final' then
    raise exception 'Only an editor may reopen a final game'
      using errcode = '42501';
  end if;

  if old.status = 'final' and (
    new.home_score is distinct from old.home_score
    or new.away_score is distinct from old.away_score
    or new.home_period_scores is distinct from old.home_period_scores
    or new.away_period_scores is distinct from old.away_period_scores
  ) then
    raise exception 'Only an editor may correct a final score'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

create or replace function public.protect_team_manager_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or public.is_editor() then
    return new;
  end if;

  if public.can_manage_team(old.id) and (
    new.id is distinct from old.id
    or new.name is distinct from old.name
    or new.slug is distinct from old.slug
    or new.abbreviation is distinct from old.abbreviation
    or new.website_url is distinct from old.website_url
    or new.home_venue is distinct from old.home_venue
    or new.is_active is distinct from old.is_active
    or new.wins is distinct from old.wins
    or new.losses is distinct from old.losses
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'A team manager may update branding fields only'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

create or replace function public.validate_game_score_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  home_period_total bigint;
  away_period_total bigint;
begin
  if (new.home_period_scores is null) <> (new.away_period_scores is null) then
    raise exception 'Both period score arrays must be provided together'
      using errcode = '23514';
  end if;

  if new.home_period_scores is not null then
    if cardinality(new.home_period_scores) <> cardinality(new.away_period_scores)
       or cardinality(new.home_period_scores) < 4
       or cardinality(new.home_period_scores) > 10
       or exists (select 1 from unnest(new.home_period_scores) as score where score < 0)
       or exists (select 1 from unnest(new.away_period_scores) as score where score < 0)
    then
      raise exception 'Period scores must contain 4 to 10 paired nonnegative values'
        using errcode = '23514';
    end if;

    select coalesce(sum(score), 0) into home_period_total
    from unnest(new.home_period_scores) as score;
    select coalesce(sum(score), 0) into away_period_total
    from unnest(new.away_period_scores) as score;

    if new.home_score is null or new.away_score is null
       or home_period_total <> new.home_score
       or away_period_total <> new.away_score
    then
      raise exception 'Period totals must match the game score'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$function$;

create or replace function public.set_game_finalization_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and new.status = 'final' then
      raise exception 'Create the game first, then use finalize_game()'
        using errcode = '42501';
    end if;
    new.revision := 0;
    if new.status = 'final' then
      new.finalized_at := now();
      new.finalized_by := auth.uid();
    else
      new.finalized_at := null;
      new.finalized_by := null;
    end if;
    return new;
  end if;

  if new.status is distinct from old.status
     or new.home_score is distinct from old.home_score
     or new.away_score is distinct from old.away_score
     or new.home_period_scores is distinct from old.home_period_scores
     or new.away_period_scores is distinct from old.away_period_scores
  then
    new.revision := old.revision + 1;
  end if;

  if new.status = 'final' and old.status <> 'final' then
    new.finalized_at := now();
    new.finalized_by := auth.uid();
  elsif new.status <> 'final' and old.status = 'final' then
    new.finalized_at := null;
    new.finalized_by := null;
  end if;

  return new;
end;
$function$;

create or replace function public.audit_game_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.game_audit_log (
    game_id, actor_id, event_type, old_data, new_data
  ) values (
    case when tg_op = 'DELETE' then null else new.id end,
    auth.uid(),
    'game_' || lower(tg_op),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

create or replace function public.audit_player_game_stat_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.game_audit_log (
    game_id, stat_id, actor_id, event_type, old_data, new_data
  ) values (
    case when tg_op = 'DELETE' then null else new.game_id end,
    case when tg_op = 'DELETE' then old.id else new.id end,
    auth.uid(),
    'stat_' || lower(tg_op),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

create or replace function public.set_news_published_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.status::text = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$function$;

create or replace function public.validate_player_game_stat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  game_season_id uuid;
  game_home_team_id uuid;
  game_away_team_id uuid;
  game_current_status text;
  target_game_id uuid;
begin
  if tg_op = 'UPDATE'
     and auth.uid() is not null
     and (
       new.id is distinct from old.id
       or new.game_id is distinct from old.game_id
       or new.player_id is distinct from old.player_id
       or new.created_at is distinct from old.created_at
     )
  then
    raise exception 'Stat identity fields are immutable; delete and recreate while live'
      using errcode = '42501';
  end if;

  target_game_id := case when tg_op = 'DELETE' then old.game_id else new.game_id end;

  select g.season_id, g.home_team_id, g.away_team_id, lower(g.status::text)
  into game_season_id, game_home_team_id, game_away_team_id, game_current_status
  from public.games as g
  where g.id = target_game_id
  for update;

  if not found then
    raise exception 'Game % does not exist', target_game_id using errcode = '23503';
  end if;

  if game_current_status not in ('live', 'final') then
    raise exception 'Player stats may be written only while a game is live'
      using errcode = '23514';
  end if;

  if game_current_status = 'final'
     and auth.uid() is not null
  then
    raise exception 'Reopen the final game to live before correcting player stats'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.team_id not in (game_home_team_id, game_away_team_id) then
    raise exception 'Stat team must be one of the two teams in the game'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.rosters as r
    where r.season_id = game_season_id
      and r.team_id = new.team_id
      and r.player_id = new.player_id
      and r.status::text <> 'inactive'
  ) then
    raise exception 'Player is not on this team roster for the game season'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

create or replace function public.validate_roster_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not exists (
    select 1
    from public.season_teams as st
    where st.season_id = new.season_id
      and st.team_id = new.team_id
      and st.is_active
  ) then
    raise exception 'Roster team is not active in this season'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

create or replace function public.validate_game_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not exists (
    select 1
    from public.season_teams as st
    where st.season_id = new.season_id
      and st.team_id = new.home_team_id
      and st.is_active
  ) or not exists (
    select 1
    from public.season_teams as st
    where st.season_id = new.season_id
      and st.team_id = new.away_team_id
      and st.is_active
  ) then
    raise exception 'Both game teams must be active in the game season'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

-- Transactional admin workflows. SECURITY INVOKER keeps table grants and RLS in
-- force; explicit role checks provide a clear failure before the first write.
create or replace function public.create_team_with_season(
  p_name text,
  p_slug text,
  p_abbreviation text,
  p_season_id uuid,
  p_conference text default null,
  p_city text default null,
  p_description text default null,
  p_primary_color text default '#111827',
  p_secondary_color text default '#ffffff'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  new_team_id uuid;
begin
  if not public.is_editor() then
    raise exception 'Editor role required' using errcode = '42501';
  end if;

  insert into public.teams (
    name, slug, abbreviation, city, description,
    primary_color, secondary_color, is_active
  ) values (
    btrim(p_name), lower(btrim(p_slug)), upper(btrim(p_abbreviation)),
    nullif(btrim(p_city), ''), nullif(btrim(p_description), ''),
    p_primary_color, p_secondary_color, true
  )
  returning id into new_team_id;

  insert into public.season_teams (
    season_id, team_id, conference, is_active
  ) values (
    p_season_id, new_team_id, nullif(btrim(p_conference), ''), true
  );

  return new_team_id;
end;
$function$;

create or replace function public.create_player_with_roster(
  p_first_name text,
  p_last_name text,
  p_slug text,
  p_position public.basketball_position,
  p_team_id uuid,
  p_season_id uuid,
  p_jersey_number smallint,
  p_roblox_username text default null,
  p_avatar_url text default null,
  p_bio text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  new_player_id uuid;
begin
  if not public.is_editor() then
    raise exception 'Editor role required' using errcode = '42501';
  end if;

  insert into public.players (
    name, first_name, last_name, slug, position, team_id,
    roblox_username, avatar_url, bio, is_active
  ) values (
    btrim(p_first_name) || ' ' || btrim(p_last_name),
    btrim(p_first_name), btrim(p_last_name), lower(btrim(p_slug)),
    p_position::text, p_team_id, nullif(btrim(p_roblox_username), ''),
    nullif(btrim(p_avatar_url), ''), nullif(btrim(p_bio), ''), true
  )
  returning id into new_player_id;

  insert into public.rosters (
    season_id, team_id, player_id, jersey_number, position, status
  ) values (
    p_season_id, p_team_id, new_player_id, p_jersey_number,
    p_position, 'active'
  );

  return new_player_id;
end;
$function$;

create or replace function public.finalize_game(
  p_game_id uuid,
  p_home_score integer,
  p_away_score integer,
  p_home_period_scores smallint[] default null,
  p_away_period_scores smallint[] default null,
  p_require_stat_totals boolean default true
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  locked_status public.game_status;
  locked_home_team_id uuid;
  locked_away_team_id uuid;
  updated_game_id uuid;
  home_period_total bigint;
  away_period_total bigint;
  home_stat_total bigint;
  away_stat_total bigint;
begin
  if not public.can_manage_scores() then
    raise exception 'Statistician role required' using errcode = '42501';
  end if;

  if not p_require_stat_totals and not public.is_editor() then
    raise exception 'Only an editor may waive player-stat reconciliation'
      using errcode = '42501';
  end if;

  if p_home_score < 0 or p_away_score < 0 or p_home_score = p_away_score then
    raise exception 'A final basketball score must be nonnegative and not tied'
      using errcode = '23514';
  end if;

  select g.status, g.home_team_id, g.away_team_id
  into locked_status, locked_home_team_id, locked_away_team_id
  from public.games as g
  where g.id = p_game_id
  for update;

  if not found then
    raise exception 'Game not found or not accessible' using errcode = 'P0002';
  end if;

  if locked_status in ('cancelled', 'postponed') then
    raise exception 'Cancelled or postponed games must be rescheduled before finalization'
      using errcode = '23514';
  end if;

  if (p_home_period_scores is null) <> (p_away_period_scores is null) then
    raise exception 'Both period score arrays must be provided together'
      using errcode = '23514';
  end if;

  if p_home_period_scores is not null then
    if cardinality(p_home_period_scores) < 4
       or cardinality(p_home_period_scores) > 10
       or exists (select 1 from unnest(p_home_period_scores) as score where score < 0)
       or exists (select 1 from unnest(p_away_period_scores) as score where score < 0)
    then
      raise exception 'Period scores must contain 4 to 10 nonnegative values'
        using errcode = '23514';
    end if;

    select coalesce(sum(score), 0) into home_period_total
    from unnest(p_home_period_scores) as score;
    select coalesce(sum(score), 0) into away_period_total
    from unnest(p_away_period_scores) as score;

    if home_period_total <> p_home_score or away_period_total <> p_away_score then
      raise exception 'Period score totals do not match the final score'
        using errcode = '23514';
    end if;
  end if;

  if p_require_stat_totals then
    select
      coalesce(sum(pgs.points) filter (where pgs.team_id = locked_home_team_id), 0),
      coalesce(sum(pgs.points) filter (where pgs.team_id = locked_away_team_id), 0)
    into home_stat_total, away_stat_total
    from public.player_game_stats as pgs
    where pgs.game_id = p_game_id and pgs.did_play;

    if home_stat_total <> p_home_score or away_stat_total <> p_away_score then
      raise exception 'Player point totals do not match the final game score'
        using errcode = '23514';
    end if;
  end if;

  perform set_config('pbl.finalize_game', 'on', true);

  update public.games
  set
    home_score = p_home_score,
    away_score = p_away_score,
    home_period_scores = p_home_period_scores,
    away_period_scores = p_away_period_scores,
    status = 'final'
  where id = p_game_id
  returning id into updated_game_id;

  if not found then
    raise exception 'Game update rejected by row-level security' using errcode = '42501';
  end if;

  return updated_game_id;
end;
$function$;

-- Backfill profiles for users who signed up before this migration. Auth metadata
-- is used only for public display fields; role always keeps its safe default.
insert into public.profiles (id, display_name, avatar_url, created_at, updated_at)
select
  u.id,
  left(
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'Member'
    ),
    80
  ),
  nullif(btrim(u.raw_user_meta_data ->> 'avatar_url'), ''),
  coalesce(u.created_at, now()),
  now()
from auth.users as u
on conflict (id) do nothing;

-- Use a project-specific trigger name so an unrelated auth hook is never replaced.
drop trigger if exists on_auth_user_created_pbl_profile on auth.users;
create trigger on_auth_user_created_pbl_profile
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists enforce_single_active_season on public.seasons;
create trigger enforce_single_active_season
  before insert or update of status on public.seasons
  for each row execute function public.enforce_single_active_season();

drop trigger if exists lock_season_activation on public.seasons;
create trigger lock_season_activation
  before insert or update of status on public.seasons
  for each statement execute function public.lock_season_activation();

drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges
  before update or delete on public.profiles
  for each row execute function public.protect_profile_privileges();

drop trigger if exists protect_team_manager_update on public.teams;
create trigger protect_team_manager_update
  before update on public.teams
  for each row execute function public.protect_team_manager_update();

drop trigger if exists set_news_published_at on public.news_posts;
create trigger set_news_published_at
  before insert or update of status, published_at on public.news_posts
  for each row execute function public.set_news_published_at();

drop trigger if exists validate_player_game_stat on public.player_game_stats;
create trigger validate_player_game_stat
  before insert or update or delete on public.player_game_stats
  for each row execute function public.validate_player_game_stat();

drop trigger if exists protect_game_structure on public.games;
create trigger protect_game_structure
  before update on public.games
  for each row execute function public.protect_game_structure();

drop trigger if exists set_game_finalization_metadata on public.games;
create trigger set_game_finalization_metadata
  before insert or update on public.games
  for each row execute function public.set_game_finalization_metadata();

drop trigger if exists validate_roster_membership on public.rosters;
create trigger validate_roster_membership
  before insert or update of season_id, team_id on public.rosters
  for each row execute function public.validate_roster_membership();

drop trigger if exists validate_game_membership on public.games;
create trigger validate_game_membership
  before insert or update of season_id, home_team_id, away_team_id on public.games
  for each row execute function public.validate_game_membership();

drop trigger if exists validate_game_score_state on public.games;
create trigger validate_game_score_state
  before insert or update on public.games
  for each row execute function public.validate_game_score_state();

drop trigger if exists audit_game_change on public.games;
create trigger audit_game_change
  after insert or update or delete on public.games
  for each row execute function public.audit_game_change();

drop trigger if exists audit_player_game_stat_change on public.player_game_stats;
create trigger audit_player_game_stat_change
  after insert or update or delete on public.player_game_stats
  for each row execute function public.audit_player_game_stat_change();

do $migration$
declare
  table_name text;
begin
  foreach table_name in array array[
    'teams', 'seasons', 'season_teams', 'profiles', 'players', 'rosters',
    'games', 'player_game_stats', 'news_posts', 'accolades', 'league_links',
    'staff_members'
  ]
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      'set_' || table_name || '_updated_at',
      table_name
    );
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      'set_' || table_name || '_updated_at',
      table_name
    );
  end loop;
end
$migration$;

-- ---------------------------------------------------------------------------
-- Public, RLS-aware read models
-- ---------------------------------------------------------------------------

create or replace view public.standings
with (security_invoker = true)
as
with final_games as (
  select
    g.id,
    g.season_id,
    g.home_team_id,
    g.away_team_id,
    g.home_score,
    g.away_score
  from public.games as g
  where lower(g.status::text) = 'final'
),
team_results as (
  select
    f.season_id,
    f.home_team_id as team_id,
    f.home_score as points_for,
    f.away_score as points_against,
    (f.home_score > f.away_score)::integer as win,
    (f.home_score < f.away_score)::integer as loss
  from final_games as f
  union all
  select
    f.season_id,
    f.away_team_id as team_id,
    f.away_score as points_for,
    f.home_score as points_against,
    (f.away_score > f.home_score)::integer as win,
    (f.away_score < f.home_score)::integer as loss
  from final_games as f
),
totals as (
  select
    st.season_id,
    st.team_id,
    count(tr.team_id)::integer as games_played,
    coalesce(sum(tr.win), 0)::integer as wins,
    coalesce(sum(tr.loss), 0)::integer as losses,
    coalesce(sum(tr.points_for), 0)::integer as points_for,
    coalesce(sum(tr.points_against), 0)::integer as points_against
  from public.season_teams as st
  left join team_results as tr
    on tr.season_id = st.season_id and tr.team_id = st.team_id
  where st.is_active
  group by st.season_id, st.team_id
),
ranked as (
  select
    totals.*,
    case
      when games_played = 0 then 0::numeric
      else round(wins::numeric / games_played, 4)
    end as win_percentage,
    points_for - points_against as point_differential
  from totals
)
select
  ranked.season_id,
  ranked.team_id,
  t.name as team_name,
  t.slug as team_slug,
  t.abbreviation,
  t.logo_url,
  st.conference,
  st.division,
  ranked.games_played,
  ranked.wins,
  ranked.losses,
  ranked.win_percentage,
  ranked.points_for,
  ranked.points_against,
  ranked.point_differential,
  dense_rank() over (
    partition by ranked.season_id
    order by
      ranked.win_percentage desc,
      ranked.point_differential desc,
      ranked.points_for desc,
      t.name asc
  )::integer as rank
from ranked
join public.teams as t on t.id = ranked.team_id
join public.season_teams as st
  on st.season_id = ranked.season_id and st.team_id = ranked.team_id;

create or replace view public.player_season_stats
with (security_invoker = true)
as
select
  g.season_id,
  pgs.player_id,
  p.first_name,
  p.last_name,
  p.slug as player_slug,
  p.roblox_username,
  p.avatar_url,
  p.position,
  pgs.team_id,
  t.name as team_name,
  t.abbreviation as team_abbreviation,
  t.logo_url as team_logo_url,
  count(*) filter (where pgs.did_play)::integer as games_played,
  round(avg(pgs.minutes) filter (where pgs.did_play), 2) as minutes_per_game,
  sum(pgs.points)::integer as total_points,
  round(avg(pgs.points) filter (where pgs.did_play), 2) as points_per_game,
  sum(pgs.rebounds)::integer as total_rebounds,
  round(avg(pgs.rebounds) filter (where pgs.did_play), 2) as rebounds_per_game,
  sum(pgs.assists)::integer as total_assists,
  round(avg(pgs.assists) filter (where pgs.did_play), 2) as assists_per_game,
  round(avg(pgs.steals) filter (where pgs.did_play), 2) as steals_per_game,
  round(avg(pgs.blocks) filter (where pgs.did_play), 2) as blocks_per_game,
  round(avg(pgs.turnovers) filter (where pgs.did_play), 2) as turnovers_per_game,
  round(sum(pgs.field_goals_made)::numeric / nullif(sum(pgs.field_goals_attempted), 0), 4) as field_goal_percentage,
  round(sum(pgs.three_pointers_made)::numeric / nullif(sum(pgs.three_pointers_attempted), 0), 4) as three_point_percentage,
  round(sum(pgs.free_throws_made)::numeric / nullif(sum(pgs.free_throws_attempted), 0), 4) as free_throw_percentage,
  sum(pgs.plus_minus)::integer as plus_minus
from public.player_game_stats as pgs
join public.games as g on g.id = pgs.game_id
join public.players as p on p.id = pgs.player_id
join public.teams as t on t.id = pgs.team_id
where lower(g.status::text) = 'final'
group by
  g.season_id,
  pgs.player_id,
  p.first_name,
  p.last_name,
  p.slug,
  p.roblox_username,
  p.avatar_url,
  p.position,
  pgs.team_id,
  t.name,
  t.abbreviation,
  t.logo_url;

create or replace view public.stat_leaders
with (security_invoker = true)
as
select
  stats.season_id,
  stats.stat_key,
  stats.stat_label,
  stats.player_id,
  stats.first_name,
  stats.last_name,
  stats.player_slug,
  stats.roblox_username,
  stats.avatar_url,
  stats.team_id,
  stats.team_name,
  stats.team_abbreviation,
  stats.team_logo_url,
  stats.games_played,
  stats.value,
  dense_rank() over (
    partition by stats.season_id, stats.stat_key
    order by stats.value desc, stats.games_played desc, stats.last_name, stats.first_name
  )::integer as rank
from (
  select
    pss.season_id,
    metric.stat_key,
    metric.stat_label,
    pss.player_id,
    pss.first_name,
    pss.last_name,
    pss.player_slug,
    pss.roblox_username,
    pss.avatar_url,
    pss.team_id,
    pss.team_name,
    pss.team_abbreviation,
    pss.team_logo_url,
    pss.games_played,
    metric.value
  from public.player_season_stats as pss
  cross join lateral (
    values
      ('points_per_game', 'Points per game', pss.points_per_game::numeric),
      ('rebounds_per_game', 'Rebounds per game', pss.rebounds_per_game::numeric),
      ('assists_per_game', 'Assists per game', pss.assists_per_game::numeric),
      ('steals_per_game', 'Steals per game', pss.steals_per_game::numeric),
      ('blocks_per_game', 'Blocks per game', pss.blocks_per_game::numeric),
      ('field_goal_percentage', 'Field goal percentage', pss.field_goal_percentage::numeric),
      ('three_point_percentage', 'Three-point percentage', pss.three_point_percentage::numeric),
      ('free_throw_percentage', 'Free-throw percentage', pss.free_throw_percentage::numeric)
  ) as metric(stat_key, stat_label, value)
  where pss.games_played > 0 and metric.value is not null
) as stats;

create or replace view public.public_players
with (security_invoker = true)
as
select
  id, first_name, last_name, slug, roblox_username, position, team_id,
  avatar_url, bio, is_active
from public.players
where is_active;

create or replace view public.public_games
with (security_invoker = true)
as
select
  id, season_id, game_number, round_number, scheduled_at, venue, status,
  home_team_id, away_team_id, home_score, away_score,
  home_period_scores, away_period_scores, broadcast_name, stream_url,
  highlights_url, notes
from public.games;

create or replace view public.public_news_posts
with (security_invoker = true)
as
select
  id, title, slug, excerpt, content, category, tags, cover_image_url,
  status, is_featured, published_at, created_at
from public.news_posts
where status = 'published' and published_at <= now();

create or replace view public.public_player_game_stats
with (security_invoker = true)
as
select
  id, game_id, player_id, team_id, did_play, minutes, points, rebounds,
  assists, steals, blocks, turnovers,
  field_goals_made, field_goals_attempted,
  three_pointers_made, three_pointers_attempted,
  free_throws_made, free_throws_attempted
from public.player_game_stats;

-- One request can hydrate the public home page. SECURITY INVOKER is explicit so
-- the caller's RLS policies remain in force; this function never bypasses RLS.
create or replace function public.get_public_site_data(p_season_id uuid default null)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  with selected_season as (
    select s.*
    from public.seasons as s
    where s.is_public
      and (p_season_id is null or s.id = p_season_id)
    order by
      case when s.status = 'active' then 0 else 1 end,
      s.starts_on desc
    limit 1
  )
  select jsonb_build_object(
    'season', coalesce(
      (
        select jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'slug', s.slug,
          'leagueName', s.league_name,
          'startsOn', s.starts_on,
          'endsOn', s.ends_on,
          'status', s.status,
          'championTeamId', s.champion_team_id
        )
        from selected_season as s
      ),
      'null'::jsonb
    ),
    'teams', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', t.id,
            'name', t.name,
            'slug', t.slug,
            'abbreviation', t.abbreviation,
            'city', t.city,
            'logoUrl', t.logo_url,
            'primaryColor', t.primary_color,
            'secondaryColor', t.secondary_color,
            'conference', st.conference,
            'division', st.division
          ) order by t.name
        )
        from selected_season as s
        join public.season_teams as st on st.season_id = s.id and st.is_active
        join public.teams as t on t.id = st.team_id and t.is_active
      ),
      '[]'::jsonb
    ),
    'players', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'firstName', p.first_name,
            'lastName', p.last_name,
            'slug', p.slug,
            'robloxUsername', p.roblox_username,
            'position', coalesce(r.position::text, p.position::text),
            'teamId', r.team_id,
            'jerseyNumber', r.jersey_number,
            'avatarUrl', p.avatar_url,
            'isCaptain', r.is_captain
          ) order by p.last_name, p.first_name
        )
        from selected_season as s
        join public.rosters as r on r.season_id = s.id and r.status::text = 'active'
        join public.players as p on p.id = r.player_id and p.is_active
      ),
      '[]'::jsonb
    ),
    'games', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', g.id,
            'gameNumber', g.game_number,
            'roundNumber', g.round_number,
            'scheduledAt', g.scheduled_at,
            'venue', g.venue,
            'status', lower(g.status::text),
            'homeTeamId', g.home_team_id,
            'awayTeamId', g.away_team_id,
            'homeScore', g.home_score,
            'awayScore', g.away_score,
            'streamUrl', g.stream_url,
            'highlightsUrl', g.highlights_url,
            'notes', g.notes
          ) order by g.scheduled_at
        )
        from selected_season as s
        join public.games as g on g.season_id = s.id
      ),
      '[]'::jsonb
    ),
    'news', coalesce(
      (
        select jsonb_agg(to_jsonb(post) order by post.published_at desc)
        from (
          select
            n.id,
            n.title,
            n.slug,
            n.excerpt,
            n.category,
            n.tags,
            n.cover_image_url,
            n.is_featured,
            n.published_at
          from public.news_posts as n
          where n.status = 'published' and n.published_at <= now()
          order by n.published_at desc
          limit 12
        ) as post
      ),
      '[]'::jsonb
    ),
    'links', coalesce(
      (
        select jsonb_agg(to_jsonb(link_item) order by link_item.sort_order, link_item.label)
        from (
          select id, label, url, kind, description, icon, sort_order, opens_in_new_tab
          from public.league_links
          where is_active
        ) as link_item
      ),
      '[]'::jsonb
    ),
    'staff', coalesce(
      (
        select jsonb_agg(to_jsonb(staff_item) order by staff_item.sort_order, staff_item.display_name)
        from (
          select
            id, display_name, role, department, roblox_username,
            avatar_url, sort_order
          from public.staff_members
          where is_active
        ) as staff_item
      ),
      '[]'::jsonb
    ),
    'accolades', coalesce(
      (
        select jsonb_agg(to_jsonb(award) order by award.sort_order, award.awarded_on desc)
        from (
          select a.id, a.player_id, a.team_id, a.title, a.category, a.description,
                 a.awarded_on, a.sort_order
          from selected_season as s
          join public.accolades as a on a.season_id = s.id and a.is_public
        ) as award
      ),
      '[]'::jsonb
    ),
    'standings', coalesce(
      (
        select jsonb_agg(to_jsonb(table_row) order by table_row.rank, table_row.team_name)
        from (
          select standings.*
          from selected_season as s
          join public.standings on standings.season_id = s.id
        ) as table_row
      ),
      '[]'::jsonb
    ),
    'statLeaders', coalesce(
      (
        select jsonb_agg(to_jsonb(leader) order by leader.stat_key, leader.rank)
        from (
          select stat_leaders.*
          from selected_season as s
          join public.stat_leaders on stat_leaders.season_id = s.id
          where stat_leaders.rank <= 5
        ) as leader
      ),
      '[]'::jsonb
    )
  );
$function$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.teams enable row level security;
alter table public.seasons enable row level security;
alter table public.season_teams enable row level security;
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.rosters enable row level security;
alter table public.games enable row level security;
alter table public.player_game_stats enable row level security;
alter table public.news_posts enable row level security;
alter table public.accolades enable row level security;
alter table public.league_links enable row level security;
alter table public.staff_members enable row level security;
alter table public.game_audit_log enable row level security;
alter table public.game_audit_log force row level security;

-- These tables are owned by this application. Remove every pre-existing policy,
-- including permissive legacy policies whose names are unknown, before creating
-- the canonical policy set below. PostgreSQL combines permissive policies with OR.
do $migration$
declare
  target_table text;
  legacy_policy record;
begin
  foreach target_table in array array[
    'teams', 'seasons', 'season_teams', 'profiles', 'players', 'rosters',
    'games', 'player_game_stats', 'news_posts', 'accolades', 'league_links',
    'staff_members', 'game_audit_log'
  ]
  loop
    for legacy_policy in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = target_table
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        legacy_policy.policyname,
        target_table
      );
    end loop;
  end loop;
end
$migration$;

-- Teams
drop policy if exists teams_public_read on public.teams;
create policy teams_public_read on public.teams
  for select to anon, authenticated using (is_active);

drop policy if exists teams_staff_read on public.teams;
create policy teams_staff_read on public.teams
  for select to authenticated using (public.is_league_staff() or public.can_manage_team(id));

drop policy if exists teams_staff_insert on public.teams;
create policy teams_staff_insert on public.teams
  for insert to authenticated with check (public.is_editor());

drop policy if exists teams_staff_update on public.teams;
create policy teams_staff_update on public.teams
  for update to authenticated
  using (public.can_manage_team(id))
  with check (public.can_manage_team(id));

drop policy if exists teams_staff_delete on public.teams;
create policy teams_staff_delete on public.teams
  for delete to authenticated using (public.is_editor());

-- Seasons and season membership
drop policy if exists seasons_public_read on public.seasons;
create policy seasons_public_read on public.seasons
  for select to anon, authenticated using (is_public);

drop policy if exists seasons_staff_read on public.seasons;
create policy seasons_staff_read on public.seasons
  for select to authenticated using (public.is_league_staff());

drop policy if exists seasons_manager_read on public.seasons;
create policy seasons_manager_read on public.seasons
  for select to authenticated using (public.can_view_managed_season(id));

drop policy if exists seasons_staff_write on public.seasons;
create policy seasons_staff_write on public.seasons
  for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

drop policy if exists season_teams_public_read on public.season_teams;
create policy season_teams_public_read on public.season_teams
  for select to anon, authenticated using (
    is_active and exists (
      select 1 from public.seasons s where s.id = season_id and s.is_public
    )
  );

drop policy if exists season_teams_staff_read on public.season_teams;
create policy season_teams_staff_read on public.season_teams
  for select to authenticated using (public.is_league_staff());

drop policy if exists season_teams_staff_write on public.season_teams;
create policy season_teams_staff_write on public.season_teams
  for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

-- Profiles are private except to their owner and league staff.
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists profiles_staff_read on public.profiles;
create policy profiles_staff_read on public.profiles
  for select to authenticated using (public.is_admin());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Players and rosters
drop policy if exists players_public_read on public.players;
create policy players_public_read on public.players
  for select to anon, authenticated using (is_active);

drop policy if exists players_staff_read on public.players;
create policy players_staff_read on public.players
  for select to authenticated using (public.is_league_staff());

drop policy if exists players_staff_write on public.players;
create policy players_staff_write on public.players
  for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

drop policy if exists rosters_public_read on public.rosters;
create policy rosters_public_read on public.rosters
  for select to anon, authenticated using (
    status = 'active'
    and exists (select 1 from public.seasons s where s.id = season_id and s.is_public)
    and exists (select 1 from public.teams t where t.id = team_id and t.is_active)
    and exists (select 1 from public.players p where p.id = player_id and p.is_active)
  );

drop policy if exists rosters_staff_read on public.rosters;
create policy rosters_staff_read on public.rosters
  for select to authenticated using (public.is_league_staff() or public.can_manage_team(team_id));

drop policy if exists rosters_manager_insert on public.rosters;
create policy rosters_manager_insert on public.rosters
  for insert to authenticated with check (public.can_manage_team(team_id));

drop policy if exists rosters_manager_update on public.rosters;
create policy rosters_manager_update on public.rosters
  for update to authenticated
  using (public.can_manage_team(team_id))
  with check (public.can_manage_team(team_id));

drop policy if exists rosters_manager_delete on public.rosters;
create policy rosters_manager_delete on public.rosters
  for delete to authenticated using (public.can_manage_team(team_id));

-- Games and box scores
drop policy if exists games_public_read on public.games;
create policy games_public_read on public.games
  for select to anon, authenticated using (
    exists (select 1 from public.seasons s where s.id = season_id and s.is_public)
  );

drop policy if exists games_staff_read on public.games;
create policy games_staff_read on public.games
  for select to authenticated using (public.is_league_staff());

drop policy if exists games_staff_write on public.games;
drop policy if exists games_editor_insert on public.games;
create policy games_editor_insert on public.games
  for insert to authenticated with check (public.is_editor());

drop policy if exists games_score_update on public.games;
create policy games_score_update on public.games
  for update to authenticated
  using (public.can_manage_scores()) with check (public.can_manage_scores());

drop policy if exists games_editor_delete on public.games;
create policy games_editor_delete on public.games
  for delete to authenticated using (public.is_editor());

drop policy if exists stats_public_read on public.player_game_stats;
create policy stats_public_read on public.player_game_stats
  for select to anon, authenticated using (
    exists (
      select 1
      from public.games g
      join public.seasons s on s.id = g.season_id
      where g.id = game_id
        and s.is_public
        and lower(g.status::text) in ('live', 'final')
    )
  );

drop policy if exists stats_staff_read on public.player_game_stats;
create policy stats_staff_read on public.player_game_stats
  for select to authenticated using (public.is_league_staff());

drop policy if exists stats_staff_write on public.player_game_stats;
create policy stats_staff_write on public.player_game_stats
  for all to authenticated
  using (public.can_manage_scores()) with check (public.can_manage_scores());

-- Editorial tables
drop policy if exists news_public_read on public.news_posts;
create policy news_public_read on public.news_posts
  for select to anon, authenticated using (
    status = 'published' and published_at <= now()
  );

drop policy if exists news_staff_read on public.news_posts;
create policy news_staff_read on public.news_posts
  for select to authenticated using (public.is_league_staff());

drop policy if exists news_staff_write on public.news_posts;
create policy news_staff_write on public.news_posts
  for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

drop policy if exists accolades_public_read on public.accolades;
create policy accolades_public_read on public.accolades
  for select to anon, authenticated using (
    is_public and exists (
      select 1 from public.seasons s where s.id = season_id and s.is_public
    )
  );

drop policy if exists accolades_staff_read on public.accolades;
create policy accolades_staff_read on public.accolades
  for select to authenticated using (public.is_league_staff());

drop policy if exists accolades_staff_write on public.accolades;
create policy accolades_staff_write on public.accolades
  for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

drop policy if exists league_links_public_read on public.league_links;
create policy league_links_public_read on public.league_links
  for select to anon, authenticated using (is_active);

drop policy if exists league_links_staff_read on public.league_links;
create policy league_links_staff_read on public.league_links
  for select to authenticated using (public.is_league_staff());

drop policy if exists league_links_staff_write on public.league_links;
create policy league_links_staff_write on public.league_links
  for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

-- Public staff directory. It is independent from private auth profiles.
drop policy if exists staff_members_public_read on public.staff_members;
create policy staff_members_public_read on public.staff_members
  for select to anon, authenticated using (is_active);

drop policy if exists staff_members_admin_read on public.staff_members;
create policy staff_members_admin_read on public.staff_members
  for select to authenticated using (public.is_admin());

drop policy if exists staff_members_admin_write on public.staff_members;
create policy staff_members_admin_write on public.staff_members
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Audit rows are append-only through SECURITY DEFINER triggers. Only admins may
-- read them; no client role receives INSERT, UPDATE or DELETE privileges.
drop policy if exists game_audit_admin_read on public.game_audit_log;
create policy game_audit_admin_read on public.game_audit_log
  for select to authenticated using (public.is_admin());

drop policy if exists game_audit_trigger_insert on public.game_audit_log;
create policy game_audit_trigger_insert on public.game_audit_log
  for insert to postgres, supabase_admin with check (true);

-- Remove direct grants to unexpected custom roles on app-owned relations. Owner,
-- Supabase service roles and the two API roles are handled separately below.
do $migration$
declare
  stale_grant record;
begin
  for stale_grant in
    select distinct tp.table_name, tp.grantee
    from information_schema.table_privileges as tp
    join pg_class as c on c.relname = tp.table_name
    join pg_namespace as n on n.oid = c.relnamespace and n.nspname = tp.table_schema
    join pg_roles as owner_role on owner_role.oid = c.relowner
    where tp.table_schema = 'public'
      and tp.table_name = any (array[
        'teams', 'seasons', 'season_teams', 'profiles', 'players', 'rosters',
        'games', 'player_game_stats', 'news_posts', 'accolades', 'league_links',
        'staff_members', 'game_audit_log', 'standings', 'player_season_stats',
        'stat_leaders', 'public_players', 'public_games', 'public_news_posts',
        'public_player_game_stats'
      ])
      and tp.grantee not in (
        'PUBLIC', 'anon', 'authenticated', 'service_role', 'supabase_admin'
      )
      and tp.grantee <> owner_role.rolname
  loop
    execute format(
      'revoke all privileges on table public.%I from %I',
      stale_grant.table_name,
      stale_grant.grantee
    );
  end loop;
end
$migration$;

do $migration$
declare
  stale_column_grant record;
  grantee_sql text;
begin
  for stale_column_grant in
    select distinct cp.table_name, cp.column_name, cp.privilege_type, cp.grantee
    from information_schema.column_privileges as cp
    join pg_class as c on c.relname = cp.table_name
    join pg_namespace as n on n.oid = c.relnamespace and n.nspname = cp.table_schema
    join pg_roles as owner_role on owner_role.oid = c.relowner
    where cp.table_schema = 'public'
      and cp.table_name = any (array[
        'teams', 'seasons', 'season_teams', 'profiles', 'players', 'rosters',
        'games', 'player_game_stats', 'news_posts', 'accolades', 'league_links',
        'staff_members', 'game_audit_log', 'standings', 'player_season_stats',
        'stat_leaders', 'public_players', 'public_games', 'public_news_posts',
        'public_player_game_stats'
      ])
      and cp.grantee not in ('service_role', 'supabase_admin')
      and cp.grantee <> owner_role.rolname
  loop
    grantee_sql := case
      when stale_column_grant.grantee = 'PUBLIC' then 'PUBLIC'
      else quote_ident(stale_column_grant.grantee)
    end;
    execute format(
      'revoke %s (%I) on table public.%I from %s',
      stale_column_grant.privilege_type,
      stale_column_grant.column_name,
      stale_column_grant.table_name,
      grantee_sql
    );
  end loop;
end
$migration$;

-- Explicit API grants. RLS remains the row boundary; column grants prevent
-- private/internal fields from being requested through PostgREST at all.
revoke all on table
  public.teams,
  public.seasons,
  public.season_teams,
  public.profiles,
  public.players,
  public.rosters,
  public.games,
  public.player_game_stats,
  public.news_posts,
  public.accolades,
  public.league_links,
  public.staff_members,
  public.game_audit_log
from public, anon, authenticated;

revoke all on table
  public.standings,
  public.player_season_stats,
  public.stat_leaders,
  public.public_players,
  public.public_games,
  public.public_news_posts,
  public.public_player_game_stats
from public, anon, authenticated;

grant select on table
  public.teams,
  public.seasons,
  public.season_teams,
  public.accolades,
  public.league_links,
  public.staff_members
to anon, authenticated;

grant select (
  id, season_id, team_id, player_id, jersey_number, position, status, is_captain
) on public.rosters to anon, authenticated;

grant select (
  id, first_name, last_name, slug, roblox_username, position, team_id,
  avatar_url, bio, is_active
) on public.players to anon, authenticated;

grant select (
  id, season_id, game_number, round_number, scheduled_at, venue, status,
  home_team_id, away_team_id, home_score, away_score,
  home_period_scores, away_period_scores, broadcast_name, stream_url,
  highlights_url, notes
) on public.games to anon, authenticated;

grant select (
  id, title, slug, excerpt, content, category, tags, cover_image_url,
  status, is_featured, published_at, created_at
) on public.news_posts to anon, authenticated;

grant select (
  id, game_id, player_id, team_id, is_starter, did_play, minutes, points,
  rebounds, offensive_rebounds, defensive_rebounds, assists, steals, blocks,
  turnovers, personal_fouls, field_goals_made, field_goals_attempted,
  three_pointers_made, three_pointers_attempted,
  free_throws_made, free_throws_attempted, plus_minus
) on public.player_game_stats to anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select on table public.game_audit_log to authenticated;

grant insert, update, delete on table
  public.teams,
  public.seasons,
  public.season_teams,
  public.players,
  public.rosters,
  public.games,
  public.player_game_stats,
  public.news_posts,
  public.accolades,
  public.league_links,
  public.staff_members
to authenticated;

grant select on table
  public.standings,
  public.player_season_stats,
  public.stat_leaders,
  public.public_players,
  public.public_games,
  public.public_news_posts,
  public.public_player_game_stats
to anon, authenticated;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.is_super_admin() from public, anon, authenticated;
revoke all on function public.is_league_staff() from public, anon, authenticated;
revoke all on function public.is_editor() from public, anon, authenticated;
revoke all on function public.can_manage_scores() from public, anon, authenticated;
revoke all on function public.can_manage_team(uuid) from public, anon, authenticated;
revoke all on function public.can_view_managed_season(uuid) from public, anon, authenticated;
revoke all on function public.enforce_single_active_season() from public, anon, authenticated;
revoke all on function public.lock_season_activation() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_profile_privileges() from public, anon, authenticated;
revoke all on function public.protect_game_structure() from public, anon, authenticated;
revoke all on function public.protect_team_manager_update() from public, anon, authenticated;
revoke all on function public.validate_game_score_state() from public, anon, authenticated;
revoke all on function public.set_game_finalization_metadata() from public, anon, authenticated;
revoke all on function public.audit_game_change() from public, anon, authenticated;
revoke all on function public.audit_player_game_stat_change() from public, anon, authenticated;
revoke all on function public.set_news_published_at() from public, anon, authenticated;
revoke all on function public.validate_player_game_stat() from public, anon, authenticated;
revoke all on function public.validate_roster_membership() from public, anon, authenticated;
revoke all on function public.validate_game_membership() from public, anon, authenticated;
revoke all on function public.create_team_with_season(text, text, text, uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.create_player_with_roster(text, text, text, public.basketball_position, uuid, uuid, smallint, text, text, text) from public, anon, authenticated;
revoke all on function public.finalize_game(uuid, integer, integer, smallint[], smallint[], boolean) from public, anon, authenticated;
revoke all on function public.get_public_site_data(uuid) from public, anon, authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_league_staff() to authenticated;
grant execute on function public.is_editor() to authenticated;
grant execute on function public.can_manage_scores() to authenticated;
grant execute on function public.can_manage_team(uuid) to authenticated;
grant execute on function public.can_view_managed_season(uuid) to authenticated;
grant execute on function public.create_team_with_season(text, text, text, uuid, text, text, text, text, text) to authenticated;
grant execute on function public.create_player_with_roster(text, text, text, public.basketball_position, uuid, uuid, smallint, text, text, text) to authenticated;
grant execute on function public.finalize_game(uuid, integer, integer, smallint[], smallint[], boolean) to authenticated;
grant execute on function public.get_public_site_data(uuid) to anon, authenticated;

comment on column public.players.team_id is
  'Compatibility/current-team pointer. public.rosters is authoritative for season membership.';
comment on view public.standings is
  'Public season standings computed only from final games; legacy teams.wins/losses are not used.';
comment on view public.player_season_stats is
  'Public season totals and per-game averages computed only from final games.';
comment on function public.get_public_site_data(uuid) is
  'RLS-aware public homepage payload. Pass a public season id or NULL for the active/latest public season.';

commit;
