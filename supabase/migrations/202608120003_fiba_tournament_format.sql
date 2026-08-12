-- FIBA two-stage tournament metadata and automatic bracket advancement.

begin;

alter table public.tournaments drop constraint if exists tournaments_format_check;
alter table public.tournaments add constraint tournaments_format_check
  check (format in ('single_elimination', 'double_elimination', 'round_robin', 'group_stage', 'fiba'));

alter table public.tournament_matches add column if not exists stage text;
alter table public.tournament_matches add column if not exists group_name text;
alter table public.tournament_matches add column if not exists bracket_round text;
alter table public.tournament_matches add column if not exists bracket_position integer;
alter table public.tournament_matches add column if not exists next_match_id uuid references public.tournament_matches(id) on delete set null;
alter table public.tournament_matches add column if not exists next_match_side text;

alter table public.tournament_matches drop constraint if exists tournament_matches_stage_check;
alter table public.tournament_matches add constraint tournament_matches_stage_check
  check (stage is null or stage in ('group', 'knockout'));
alter table public.tournament_matches drop constraint if exists tournament_matches_bracket_round_check;
alter table public.tournament_matches add constraint tournament_matches_bracket_round_check
  check (bracket_round is null or bracket_round in ('quarter_final', 'semi_final', 'final'));
alter table public.tournament_matches drop constraint if exists tournament_matches_bracket_position_check;
alter table public.tournament_matches add constraint tournament_matches_bracket_position_check
  check (bracket_position is null or bracket_position > 0);
alter table public.tournament_matches drop constraint if exists tournament_matches_next_side_check;
alter table public.tournament_matches add constraint tournament_matches_next_side_check
  check (next_match_side is null or next_match_side in ('home', 'away'));

create index if not exists tournament_matches_stage_idx
  on public.tournament_matches (tournament_id, stage, group_name, bracket_round, bracket_position);

commit;
