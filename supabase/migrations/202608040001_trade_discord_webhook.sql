-- Send an approved trade to the application webhook directly from Supabase.
-- The secret is deliberately stored in the database configuration row, not in Git.
-- Run the configuration INSERT shown in the deployment notes after applying this migration.

begin;

create extension if not exists pg_net;

create table if not exists public.pbal_discord_webhook_config (
  id boolean primary key default true check (id),
  endpoint_url text not null default 'https://pbal-website.vercel.app/api/integrations/supabase',
  webhook_secret text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint pbal_discord_webhook_config_url_check check (endpoint_url ~* '^https://[^[:space:]]+$'),
  constraint pbal_discord_webhook_config_secret_check check (char_length(webhook_secret) >= 16)
);

alter table public.pbal_discord_webhook_config enable row level security;
revoke all on table public.pbal_discord_webhook_config from public, anon, authenticated;
grant all on table public.pbal_discord_webhook_config to service_role;

create or replace function public.notify_trade_discord_webhook()
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
  if new.status::text <> 'approved'
     or (tg_op = 'UPDATE' and old.status::text = 'approved') then
    return new;
  end if;

  select * into config_row
  from public.pbal_discord_webhook_config
  where id = true and enabled;

  if not found then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    old_record := to_jsonb(old);
  end if;

  payload := jsonb_build_object(
    'type', tg_op,
    'table', 'trades',
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

drop trigger if exists notify_trade_discord_webhook on public.trades;
create trigger notify_trade_discord_webhook
  after insert or update of status on public.trades
  for each row execute function public.notify_trade_discord_webhook();

revoke all on function public.notify_trade_discord_webhook() from public, anon, authenticated;
grant execute on function public.notify_trade_discord_webhook() to service_role;

commit;
