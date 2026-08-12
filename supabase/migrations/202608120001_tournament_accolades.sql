-- Allow medals and achievements to belong to either a league season or a
-- tournament. Existing season accolades remain valid.

begin;

alter table public.accolades
  add column if not exists tournament_id uuid
  references public.tournaments(id) on delete cascade;

alter table public.accolades
  alter column season_id drop not null;

alter table public.accolades
  drop constraint if exists accolades_competition_check;
alter table public.accolades
  add constraint accolades_competition_check check (
    (season_id is not null and tournament_id is null)
    or (season_id is null and tournament_id is not null)
  );

create index if not exists accolades_tournament_idx
  on public.accolades (tournament_id, sort_order, awarded_on desc);

drop policy if exists accolades_public_read on public.accolades;
create policy accolades_public_read on public.accolades
  for select to anon, authenticated using (
    is_public and (
      (
        season_id is not null
        and exists (
          select 1 from public.seasons s
          where s.id = season_id and s.is_public
        )
      )
      or (
        tournament_id is not null
        and exists (
          select 1 from public.tournaments t
          where t.id = tournament_id and t.is_public
        )
      )
    )
  );

commit;
