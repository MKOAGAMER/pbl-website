-- Send published news and finalized games to the same application webhook.
-- This removes the need to create separate Supabase Dashboard webhooks.

begin;

create or replace function public.notify_content_discord_webhook()
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
  if tg_op = 'UPDATE' then old_record := to_jsonb(old); end if;

  if tg_table_name = 'news_posts' then
    if new.status::text <> 'published'
       or (tg_op = 'UPDATE' and old.status::text = 'published') then
      return new;
    end if;
  elsif tg_table_name = 'games' then
    if new.status::text <> 'final'
       or (tg_op = 'UPDATE' and old.status::text = 'final') then
      return new;
    end if;
  else
    return new;
  end if;

  select * into config_row
  from public.pbal_discord_webhook_config
  where id = true and enabled;
  if not found then return new; end if;

  payload := jsonb_build_object(
    'type', tg_op,
    'table', tg_table_name,
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

drop trigger if exists notify_news_discord_webhook on public.news_posts;
create trigger notify_news_discord_webhook
  after insert or update of status on public.news_posts
  for each row execute function public.notify_content_discord_webhook();

drop trigger if exists notify_games_discord_webhook on public.games;
create trigger notify_games_discord_webhook
  after insert or update of status on public.games
  for each row execute function public.notify_content_discord_webhook();

revoke all on function public.notify_content_discord_webhook() from public, anon, authenticated;
grant execute on function public.notify_content_discord_webhook() to service_role;

commit;
