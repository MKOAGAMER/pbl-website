-- Shared Control Lab scores. The browser may read the board, but writes are
-- accepted only by the authenticated server route using the service role.

begin;

create table if not exists public.control_lab_leaderboard (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  scheme_id text not null,
  category text not null,
  mode text not null,
  score integer not null,
  accuracy numeric(5, 2) not null default 0,
  best_streak integer not null default 0,
  average_response_ms integer not null default 0,
  correct integer not null default 0,
  wrong integer not null default 0,
  played_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint control_lab_scheme_check check (scheme_id in ('keyboard_pc', 'controller_dpad', 'controller_rightstick')),
  constraint control_lab_mode_check check (mode in ('practice', 'timeAttack')),
  constraint control_lab_category_check check (char_length(category) between 1 and 120),
  constraint control_lab_score_check check (score between 0 and 1000000000),
  constraint control_lab_accuracy_check check (accuracy between 0 and 100),
  constraint control_lab_stats_check check (
    best_streak between 0 and 100000
    and average_response_ms between 0 and 3600000
    and correct between 0 and 100000
    and wrong between 0 and 100000
  ),
  constraint control_lab_user_board_key unique (user_id, scheme_id, category, mode)
);

create index if not exists control_lab_leaderboard_rank_idx
  on public.control_lab_leaderboard (scheme_id, category, mode, score desc, accuracy desc, best_streak desc);

drop trigger if exists set_control_lab_leaderboard_updated_at on public.control_lab_leaderboard;
create trigger set_control_lab_leaderboard_updated_at
  before update on public.control_lab_leaderboard
  for each row execute function public.set_updated_at();

alter table public.control_lab_leaderboard enable row level security;

drop policy if exists control_lab_leaderboard_public_read on public.control_lab_leaderboard;
create policy control_lab_leaderboard_public_read on public.control_lab_leaderboard
  for select to anon, authenticated using (true);

grant select on public.control_lab_leaderboard to anon, authenticated;

commit;
