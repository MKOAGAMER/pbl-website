-- Expand Staff Control data ownership and migrate legacy runtime lists.
-- Apply after 202607290004_player_identity_discord.sql.

begin;

-- Existing OAuth users already have the authoritative Roblox image. Copy it to
-- public player profiles that were created before avatar synchronization.
update public.players as player
set avatar_url = league_user.avatar_url,
    updated_at = now()
from public.users as league_user
where player.user_id = league_user.id
  and player.avatar_url is null
  and league_user.avatar_url is not null;

-- Staff and links used to be stored as JSON in site_config. Move them into the
-- relational tables now managed by /admin/content, but only on an empty table so
-- the migration is safe to run repeatedly.
insert into public.staff_members (
  display_name, role, department, roblox_username, avatar_url, sort_order, is_active
)
select
  left(btrim(item ->> 'name'), 80),
  left(coalesce(nullif(btrim(item ->> 'title'), ''), 'League Staff'), 80),
  'League Office',
  case when item ->> 'robloxUsername' ~ '^[A-Za-z0-9_]{3,20}$' then item ->> 'robloxUsername' end,
  case when item ->> 'avatarUrl' ~* '^https?://[^[:space:]]+$' then item ->> 'avatarUrl' end,
  (ordinality - 1)::integer,
  true
from public.site_config as config
cross join lateral jsonb_array_elements(config.staff) with ordinality as legacy(item, ordinality)
where config.id = 'main'
  and btrim(coalesce(item ->> 'name', '')) <> ''
  and not exists (select 1 from public.staff_members);

insert into public.league_links (
  label, url, kind, description, sort_order, is_active, opens_in_new_tab
)
select
  left(btrim(item ->> 'label'), 80),
  item ->> 'url',
  'other'::public.link_kind,
  null,
  (ordinality - 1)::integer,
  true,
  true
from public.site_config as config
cross join lateral jsonb_array_elements(config.links) with ordinality as legacy(item, ordinality)
where config.id = 'main'
  and btrim(coalesce(item ->> 'label', '')) <> ''
  and item ->> 'url' ~* '^https?://'
  and not exists (select 1 from public.league_links);

commit;
