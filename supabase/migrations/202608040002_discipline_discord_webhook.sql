-- Send public player discipline actions and public revocations to the app webhook.

begin;

create or replace function public.notify_discipline_discord_webhook()
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
  if not new.is_public
     or (tg_op = 'UPDATE' and old.is_public = true and (new.revoked_at is null or old.revoked_at is not null))
  then
    return new;
  end if;

  select * into config_row
  from public.pbal_discord_webhook_config
  where id = true and enabled;
  if not found then return new; end if;

  if tg_op = 'UPDATE' then old_record := to_jsonb(old); end if;
  payload := jsonb_build_object(
    'type', tg_op,
    'table', 'player_disciplinary_actions',
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

drop trigger if exists notify_discipline_discord_webhook on public.player_disciplinary_actions;
create trigger notify_discipline_discord_webhook
  after insert or update of is_public, revoked_at, public_note, reason on public.player_disciplinary_actions
  for each row execute function public.notify_discipline_discord_webhook();

revoke all on function public.notify_discipline_discord_webhook() from public, anon, authenticated;
grant execute on function public.notify_discipline_discord_webhook() to service_role;

commit;
