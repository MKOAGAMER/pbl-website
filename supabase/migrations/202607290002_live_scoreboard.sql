-- Publish score and status changes so public live scoreboards update in-place.
begin;

do $migration$
begin
  alter publication supabase_realtime add table public.games;
exception when duplicate_object then null;
end
$migration$;

commit;
