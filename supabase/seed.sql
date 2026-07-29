-- PBAL intentionally starts empty.
--
-- Do not insert fictional teams, players, scores, standings or statistics here.
-- Players are created by Roblox OAuth as Free Agents. Staff creates seasons,
-- teams, rosters and games through /admin/league, then confirms real game stats.

begin;

-- Runtime configuration is already created by the foundation migration. This
-- statement simply keeps local reset workflows repeatable without sample data.
insert into public.site_config (id)
values ('main')
on conflict (id) do nothing;

commit;
