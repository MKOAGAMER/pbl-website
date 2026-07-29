-- PBAL foundation: Roblox identity, runtime configuration, media and trades.
-- Apply after 202607280001_initial_league_schema.sql.

begin;

do $migration$
begin
  create type public.pbal_user_role as enum ('guest', 'player', 'staff', 'admin');
exception when duplicate_object then null;
end
$migration$;

do $migration$
begin
  create type public.pbal_admin_permission as enum ('editor', 'staff', 'super_admin');
exception when duplicate_object then null;
end
$migration$;

do $migration$
begin
  create type public.trade_status as enum ('pending', 'approved', 'rejected', 'cancelled');
exception when duplicate_object then null;
end
$migration$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  roblox_id bigint not null unique,
  username text not null,
  avatar_url text,
  role public.pbal_user_role not null default 'guest',
  group_member boolean not null default false,
  admin_permission public.pbal_admin_permission,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_roblox_id_check check (roblox_id > 0),
  constraint users_username_check check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  constraint users_avatar_url_check check (
    avatar_url is null or avatar_url ~* '^https?://[^[:space:]]+$'
  ),
  constraint users_admin_permission_check check (
    (role in ('staff', 'admin') and admin_permission is not null)
    or (role in ('guest', 'player') and admin_permission is null)
  )
);

create index if not exists users_role_idx on public.users (role, admin_permission);
create unique index if not exists users_username_key on public.users (lower(username));

create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint auth_sessions_token_hash_check check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint auth_sessions_expiry_check check (expires_at > created_at)
);

create index if not exists auth_sessions_user_idx
  on public.auth_sessions (user_id, expires_at desc)
  where revoked_at is null;

create table if not exists public.site_config (
  id text primary key default 'main',
  theme jsonb not null default jsonb_build_object(
    'mode', 'dark',
    'primary', '#ff6b22',
    'secondary', '#5277ff',
    'background', '#0b0f16',
    'surface', '#111722',
    'foreground', '#f6f2e9'
  ),
  staff jsonb not null default '[]'::jsonb,
  links jsonb not null default '[]'::jsonb,
  addons jsonb not null default '{}'::jsonb,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_config_singleton_check check (id = 'main'),
  constraint site_config_theme_object_check check (jsonb_typeof(theme) = 'object'),
  constraint site_config_staff_array_check check (jsonb_typeof(staff) = 'array'),
  constraint site_config_links_array_check check (jsonb_typeof(links) = 'array'),
  constraint site_config_addons_object_check check (jsonb_typeof(addons) = 'object')
);

insert into public.site_config (id) values ('main') on conflict (id) do nothing;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'cloudinary',
  provider_public_id text not null unique,
  url text not null,
  secure_url text not null,
  original_filename text,
  format text,
  bytes bigint,
  width integer,
  height integer,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint media_assets_provider_check check (provider in ('cloudinary', 'vercel_blob')),
  constraint media_assets_urls_check check (
    url ~* '^https?://[^[:space:]]+$' and secure_url ~* '^https://[^[:space:]]+$'
  ),
  constraint media_assets_dimensions_check check (
    (bytes is null or bytes >= 0)
    and (width is null or width > 0)
    and (height is null or height > 0)
  )
);

create index if not exists media_assets_created_idx on public.media_assets (created_at desc);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete restrict,
  from_team_id uuid references public.teams(id) on delete restrict,
  to_team_id uuid not null references public.teams(id) on delete restrict,
  trade_date date not null default current_date,
  status public.trade_status not null default 'pending',
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trades_different_teams_check check (
    from_team_id is null or from_team_id <> to_team_id
  )
);

create index if not exists trades_player_date_idx
  on public.trades (player_id, trade_date desc);
create index if not exists trades_status_idx
  on public.trades (status, trade_date desc);

-- Complete the requested PBAL stat line. Percentages and total rebounds are
-- derived in the read-only `stats` view so they cannot drift from raw totals.
alter table public.player_game_stats add column if not exists ping_ms smallint;

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.player_game_stats'::regclass
      and conname = 'player_game_stats_ping_check'
  ) then
    alter table public.player_game_stats
      add constraint player_game_stats_ping_check
      check (ping_ms is null or ping_ms between 0 and 30000);
  end if;
end
$migration$;

create or replace view public.stats
with (security_invoker = true)
as
select
  pgs.id,
  pgs.game_id,
  pgs.player_id as player,
  pgs.team_id,
  pgs.points as pts,
  pgs.field_goals_made as fgm,
  pgs.field_goals_attempted as fga,
  round(100.0 * pgs.field_goals_made / nullif(pgs.field_goals_attempted, 0), 1) as fg_pct,
  pgs.three_pointers_made as three_pm,
  pgs.three_pointers_attempted as three_pa,
  round(100.0 * pgs.three_pointers_made / nullif(pgs.three_pointers_attempted, 0), 1) as three_p_pct,
  pgs.free_throws_made as ftm,
  pgs.free_throws_attempted as fta,
  round(100.0 * pgs.free_throws_made / nullif(pgs.free_throws_attempted, 0), 1) as ft_pct,
  pgs.assists as ast,
  pgs.steals as stl,
  pgs.blocks as bk,
  pgs.offensive_rebounds as orb,
  pgs.defensive_rebounds as drb,
  pgs.offensive_rebounds + pgs.defensive_rebounds as reb,
  pgs.turnovers as tov,
  pgs.personal_fouls as fls,
  pgs.plus_minus,
  pgs.ping_ms as ping,
  pgs.created_at,
  pgs.updated_at
from public.player_game_stats as pgs;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create or replace function public.protect_last_pbal_super_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.admin_permission = 'super_admin'
    and (
      tg_op = 'DELETE'
      or new.admin_permission is distinct from 'super_admin'
      or new.role not in ('staff', 'admin')
    )
    and (select count(*) from public.users where admin_permission = 'super_admin') <= 1
  then
    raise exception 'PBAL must keep at least one super admin';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists protect_last_pbal_super_admin on public.users;
create trigger protect_last_pbal_super_admin
  before update or delete on public.users
  for each row execute function public.protect_last_pbal_super_admin();

drop trigger if exists set_site_config_updated_at on public.site_config;
create trigger set_site_config_updated_at
  before update on public.site_config
  for each row execute function public.set_updated_at();

drop trigger if exists set_trades_updated_at on public.trades;
create trigger set_trades_updated_at
  before update on public.trades
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.auth_sessions enable row level security;
alter table public.site_config enable row level security;
alter table public.media_assets enable row level security;
alter table public.trades enable row level security;

-- Authentication and mutations use the server-only service role. The public
-- client can only read runtime presentation config and public trade history.
drop policy if exists site_config_public_read on public.site_config;
create policy site_config_public_read on public.site_config
  for select to anon, authenticated using (true);

drop policy if exists trades_public_read on public.trades;
create policy trades_public_read on public.trades
  for select to anon, authenticated using (status = 'approved');

grant select on public.site_config, public.stats to anon, authenticated;
grant select on public.trades to anon, authenticated;

-- Supabase Realtime ignores duplicate publication entries with duplicate_object.
do $migration$
begin
  alter publication supabase_realtime add table public.site_config;
exception when duplicate_object then null;
end
$migration$;

commit;
