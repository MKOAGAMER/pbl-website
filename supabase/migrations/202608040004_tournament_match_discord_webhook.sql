-- Send public tournament match finals to the application webhook.

begin;

create or replace function public.notify_tournament_match_discord_webhook()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  config_row public.pbal_discord_webhook_config%rowtype;
  old_record jsonb := null;
  payload jsonb;
begin
  if new.status::text <> 'final'
     or (tg_op = 'UPDATE' and old.status::text = 'final') then
    return new;
  end if;

  select * into config_row
  from public.pbal_discord_webhook_config
  where id = true and enabled;
  if not found then return new; end if;

  if tg_op = 'UPDATE' then old_record := to_jsonb(old); end if;
  payload := jsonb_build_object(
    'type', tg_op,
    'table', 'tournament_matches',
    'schema', 'public',
    'record', to_jsonb(new),
    'old_record', old_record
  );

  perform net.http_post(
    url := config_row.endpoint_url,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-pbal-webhook-secret', config_row.webhook_secret
    ),
    body := payload
  );
  return new;
end;
$function$;

drop trigger if exists notify_tournament_match_discord_webhook on public.tournament_matches;
create trigger notify_tournament_match_discord_webhook
  after insert or update of status on public.tournament_matches
  for each row execute function public.notify_tournament_match_discord_webhook();

revoke all on function public.notify_tournament_match_discord_webhook() from public, anon, authenticated;
grant execute on function public.notify_tournament_match_discord_webhook() to service_role;

commit;
