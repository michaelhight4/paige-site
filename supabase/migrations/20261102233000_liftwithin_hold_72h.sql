-- Hold paid orders 72h before sending to Printful.
alter table public.liftwithin_orders alter column send_after set default now() + interval '72 hours';
update public.liftwithin_orders set send_after = paid_at + interval '72 hours', updated_at = now() where status = 'pending';
