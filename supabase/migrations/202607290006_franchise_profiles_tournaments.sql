-- Franchise permissions, editable player profiles, multi-position players,
-- Supabase-backed media and public tournaments.
-- Apply after 202607290005_staff_control.sql.

alter type public.pbal_user_role add value if not exists 'franchise_owner';

begin;

alter table public.users
  add column if not exists franchise_team_id uuid
  references public.teams(id) on delete set null;

alter table public.users drop constraint if exists users_admin_permission_check;
alter table public.users add constraint users_admin_permission_check check (
  (role::text in ('staff', 'admin') and admin_permission is not null)
  or (role::text in ('guest', 'player', 'franchise_owner') and admin_permission is null)
);

alter table public.users drop constraint if exists users_franchise_team_check;
alter table public.users add constraint users_franchise_team_check check (
  (role::text = 'franchise_owner' and franchise_team_id is not null)
  or (role::text <> 'franchise_owner' and franchise_team_id is null)
);
create index if not exists users_franchise_team_idx
  on public.users (franchise_team_id);

alter table public.trades add column if not exists request_kind text not null default 'transfer';
alter table public.trades drop constraint if exists trades_request_kind_check;
alter table public.trades add constraint trades_request_kind_check
  check (request_kind in ('acquire', 'release', 'transfer'));

alter table public.players
  add column if not exists positions text[] not null default array['UTIL']::text[];
update public.players
set positions = array[position::text]
where positions is null
   or cardinality(positions) = 0
   or (
     positions = array['UTIL']::text[]
     and position::text <> 'UTIL'
   );
alter table public.players drop constraint if exists players_positions_check;
alter table public.players add constraint players_positions_check check (
  cardinality(positions) between 1 and 3
  and positions <@ array['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL']::text[]
);

alter table public.media_assets drop constraint if exists media_assets_provider_check;
alter table public.media_assets add constraint media_assets_provider_check
  check (provider in ('cloudinary', 'vercel_blob', 'supabase'));

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete set null,
  name text not null,
  slug text not null unique,
  format text not null default 'single_elimination',
  status text not null default 'draft',
  description text,
  logo_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  venue text,
  is_public boolean not null default false,
  champion_team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournaments_name_check check (char_length(btrim(name)) between 2 and 120),
  constraint tournaments_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint tournaments_format_check check (format in ('single_elimination', 'double_elimination', 'round_robin', 'group_stage')),
  constraint tournaments_status_check check (status in ('draft', 'registration', 'active', 'completed', 'cancelled')),
  constraint tournaments_dates_check check (ends_at is null or starts_at is null or ends_at >= starts_at),
  constraint tournaments_logo_check check (logo_url is null or logo_url ~* '^https?://[^[:space:]]+$')
);

create table if not exists public.tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  seed integer,
  group_name text,
  status text not null default 'registered',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_teams_unique unique (tournament_id, team_id),
  constraint tournament_teams_seed_check check (seed is null or seed > 0),
  constraint tournament_teams_status_check check (status in ('registered', 'active', 'eliminated', 'withdrawn'))
);

create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round_label text not null default 'Round 1',
  match_number integer,
  scheduled_at timestamptz,
  venue text,
  status text not null default 'scheduled',
  home_team_id uuid references public.teams(id) on delete set null,
  away_team_id uuid references public.teams(id) on delete set null,
  home_score integer,
  away_score integer,
  winner_team_id uuid references public.teams(id) on delete set null,
  stream_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_matches_number_check check (match_number is null or match_number > 0),
  constraint tournament_matches_teams_check check (home_team_id is null or away_team_id is null or home_team_id <> away_team_id),
  constraint tournament_matches_status_check check (status in ('scheduled', 'live', 'final', 'postponed', 'cancelled')),
  constraint tournament_matches_scores_check check ((home_score is null or home_score >= 0) and (away_score is null or away_score >= 0)),
  constraint tournament_matches_winner_check check (winner_team_id is null or winner_team_id = home_team_id or winner_team_id = away_team_id),
  constraint tournament_matches_stream_check check (stream_url is null or stream_url ~* '^https?://[^[:space:]]+$')
);

create index if not exists tournaments_public_status_idx on public.tournaments (is_public, status, starts_at);
create index if not exists tournament_teams_tournament_seed_idx on public.tournament_teams (tournament_id, seed);
create index if not exists tournament_matches_tournament_round_idx on public.tournament_matches (tournament_id, match_number, scheduled_at);

drop trigger if exists set_tournaments_updated_at on public.tournaments;
create trigger set_tournaments_updated_at before update on public.tournaments
  for each row execute function public.set_updated_at();
drop trigger if exists set_tournament_teams_updated_at on public.tournament_teams;
create trigger set_tournament_teams_updated_at before update on public.tournament_teams
  for each row execute function public.set_updated_at();
drop trigger if exists set_tournament_matches_updated_at on public.tournament_matches;
create trigger set_tournament_matches_updated_at before update on public.tournament_matches
  for each row execute function public.set_updated_at();

alter table public.tournaments enable row level security;
alter table public.tournament_teams enable row level security;
alter table public.tournament_matches enable row level security;

drop policy if exists tournaments_public_read on public.tournaments;
create policy tournaments_public_read on public.tournaments
  for select to anon, authenticated using (is_public);
drop policy if exists tournament_teams_public_read on public.tournament_teams;
create policy tournament_teams_public_read on public.tournament_teams
  for select to anon, authenticated using (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.is_public)
  );
drop policy if exists tournament_matches_public_read on public.tournament_matches;
create policy tournament_matches_public_read on public.tournament_matches
  for select to anon, authenticated using (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.is_public)
  );

grant select on public.tournaments, public.tournament_teams, public.tournament_matches to anon, authenticated;
grant all on public.tournaments, public.tournament_teams, public.tournament_matches to service_role;

commit;
