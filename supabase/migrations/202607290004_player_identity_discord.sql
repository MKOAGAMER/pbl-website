-- Player-first identity and Discord account linking.
-- Apply after 202607290003_trading_ai_stats.sql.

begin;

alter table public.users alter column role set default 'player';

-- Everyone who has authenticated with Roblox is a league player. Staff and
-- admin remain elevated roles managed by the league office.
update public.users
set role = 'player', admin_permission = null
where role = 'guest';

alter table public.users add column if not exists discord_id bigint;
alter table public.users add column if not exists discord_username text;
alter table public.users add column if not exists discord_avatar_url text;
alter table public.users add column if not exists discord_connected_at timestamptz;

create unique index if not exists users_discord_id_key
  on public.users (discord_id) where discord_id is not null;

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.users'::regclass
      and conname = 'users_discord_identity_check'
  ) then
    alter table public.users
      add constraint users_discord_identity_check check (
        (discord_id is null or discord_id > 0)
        and (discord_username is null or char_length(discord_username) between 2 and 80)
        and (discord_avatar_url is null or discord_avatar_url ~* '^https://[^[:space:]]+$')
      );
  end if;
end
$migration$;

alter table public.players add column if not exists user_id uuid
  references public.users(id) on delete set null;

create unique index if not exists players_user_id_key
  on public.players (user_id) where user_id is not null;

-- Link any players that already share a Roblox identity with an authenticated
-- PBAL account. New logins are linked by the application callback.
update public.players as player
set user_id = league_user.id
from public.users as league_user
where player.roblox_user_id = league_user.roblox_id
  and player.user_id is null;

commit;
