-- A final that was awarded without a played game. The stored score follows
-- FIBA's 20-0 forfeit convention; player box-score rows are intentionally not created.
alter table public.games
  add column if not exists result_type text not null default 'played'
    check (result_type in ('played', 'forfeit')),
  add column if not exists forfeit_team_id uuid references public.teams(id) on delete set null;

alter table public.tournament_matches
  add column if not exists result_type text not null default 'played'
    check (result_type in ('played', 'forfeit')),
  add column if not exists forfeit_team_id uuid references public.teams(id) on delete set null;

alter table public.games drop constraint if exists games_forfeit_team_check;
alter table public.games add constraint games_forfeit_team_check check (
  (result_type = 'played' and forfeit_team_id is null)
  or (result_type = 'forfeit' and forfeit_team_id in (home_team_id, away_team_id))
);

alter table public.tournament_matches drop constraint if exists tournament_matches_forfeit_team_check;
alter table public.tournament_matches add constraint tournament_matches_forfeit_team_check check (
  (result_type = 'played' and forfeit_team_id is null)
  or (result_type = 'forfeit' and forfeit_team_id in (home_team_id, away_team_id))
);

create index if not exists games_forfeit_team_idx on public.games(forfeit_team_id) where forfeit_team_id is not null;
create index if not exists tournament_matches_forfeit_team_idx on public.tournament_matches(forfeit_team_id) where forfeit_team_id is not null;
