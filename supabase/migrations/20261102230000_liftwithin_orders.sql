-- Lift Within: hold paid orders 48h before sending to Printful.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.liftwithin_orders (
  id bigint generated always as identity primary key,
  stripe_session_id text not null unique,
  payment_intent text,
  items jsonb not null,
  recipient jsonb not null,
  retail_costs jsonb,
  amount_total integer,
  currency text,
  paid_at timestamptz not null default now(),
  send_after timestamptz not null default now() + interval '48 hours',
  status text not null default 'pending' check (status in ('pending','sending','sent','canceled','failed')),
  printful_order_id bigint,
  attempts integer not null default 0,
  error text,
  test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists liftwithin_orders_due on public.liftwithin_orders (send_after) where status = 'pending';
alter table public.liftwithin_orders enable row level security;
revoke all on public.liftwithin_orders from anon, authenticated;
-- no policies: only service_role (edge functions) can read/write.

-- Hourly sender. Secret lives in Vault (name liftwithin_cron_secret).
select cron.unschedule('liftwithin-send-orders') where exists (select 1 from cron.job where jobname = 'liftwithin-send-orders');
select cron.schedule('liftwithin-send-orders', '7 * * * *', $$
  select net.http_post(
    url := 'https://kjdubkeowcyuoazvpoyt.supabase.co/functions/v1/liftwithin-send-orders',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name = 'liftwithin_cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 60000)
$$);
