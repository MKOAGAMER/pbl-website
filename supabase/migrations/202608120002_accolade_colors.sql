-- Staff-selectable presentation color for medal and achievement badges.

begin;

alter table public.accolades
  add column if not exists medal_color text not null default '#f59e0b';

alter table public.accolades
  drop constraint if exists accolades_medal_color_check;
alter table public.accolades
  add constraint accolades_medal_color_check
  check (medal_color ~ '^#[0-9A-Fa-f]{6}$');

commit;
