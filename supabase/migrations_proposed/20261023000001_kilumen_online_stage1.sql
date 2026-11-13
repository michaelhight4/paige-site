-- Kilumen online play, STAGE 1: see other players in your zone + quick-chat phrases.
-- PROPOSED, NOT APPLIED (Oct 22, 2026). Review with Gary before applying to kjdubkeowcyuoazvpoyt.
-- Tested locally in PGlite with a Supabase shim: supabase/migrations_proposed/tests/online_sql.test.mjs
--
-- What it does
--   * public.kilumen_online_players: one row per player who has opened online play (anonymous sign-in is
--     fine for stage 1). Holds only a name roll (names are built from word lists client-side, so there is
--     no free-text name to moderate) and a ban flag. RLS: you can see and edit only your own row; you can
--     never edit banned_until.
--   * Realtime Authorization on realtime.messages: authenticated users who are not banned may receive and
--     send Broadcast + Presence ONLY on topics shaped like 'kilumen:zone:<id>#<1-8>' or
--     'kilumen:map:<id>#<1-8>'. Clients must join with { config: { private: true } } (src/online/supabase_transport.js).
-- Dashboard steps that are NOT SQL (do them by hand when applying):
--   * Realtime settings: turn OFF "Allow public access" so only private channels work.
--   * Auth: enable anonymous sign-ins (free on every plan) and keep JWT expiry short (Realtime caches
--     the RLS decision per connection until the JWT refreshes; a ban takes effect at the next refresh).
--   * CHECK FIRST: realtime.messages policies are OR'ed. If any other game in this project already has a broad
--     policy (e.g. USING (true) for authenticated), kilumen topics are open through it too. Narrow that one first.
-- Do NOT run "alter table realtime.messages enable row level security" (already on; it fails with 42501).

create schema if not exists kilumen_private;
revoke all on schema kilumen_private from public;
grant usage on schema kilumen_private to authenticated;   -- functions inside are still revoked individually

create table public.kilumen_online_players (
  user_id      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name_roll    smallint not null default 0 check (name_roll between 0 and 999),
  banned_until timestamptz,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
comment on table public.kilumen_online_players is 'Kilumen online: one row per online player. Name = word lists + roll (client side). banned_until set only by admins.';
alter table public.kilumen_online_players enable row level security;
revoke all on table public.kilumen_online_players from anon, authenticated;
grant select on table public.kilumen_online_players to authenticated;
grant insert (user_id, name_roll) on table public.kilumen_online_players to authenticated;
grant update (name_roll, last_seen_at) on table public.kilumen_online_players to authenticated;

create policy kilumen_players_select_own on public.kilumen_online_players
  for select to authenticated using (user_id = (select auth.uid()));
create policy kilumen_players_insert_own on public.kilumen_online_players
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy kilumen_players_update_own on public.kilumen_online_players
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Topic shape for zone channels. Shards #1..#8 (src/online/profiles.js maxShards).
create function kilumen_private.is_zone_topic(t text) returns boolean
  language sql immutable set search_path = '' as
$$ select coalesce(t ~ '^kilumen:(zone|map):[a-z0-9_]{1,48}#[1-8]$', false) $$;

-- May the current user use online play right now? (row exists, not banned)
create function kilumen_private.online_ok() returns boolean
  language sql stable security definer set search_path = '' as
$$ select exists (select 1 from public.kilumen_online_players p
                  where p.user_id = auth.uid() and (p.banned_until is null or p.banned_until < now())) $$;

revoke all on function kilumen_private.is_zone_topic(text), kilumen_private.online_ok() from public, anon;
grant execute on function kilumen_private.is_zone_topic(text), kilumen_private.online_ok() to authenticated;

-- Realtime Authorization (https://supabase.com/docs/guides/realtime/authorization)
create policy kilumen_zone_receive on realtime.messages
  for select to authenticated
  using (realtime.messages.extension in ('broadcast', 'presence')
         and kilumen_private.is_zone_topic((select realtime.topic()))
         and (select kilumen_private.online_ok()));
create policy kilumen_zone_send on realtime.messages
  for insert to authenticated
  with check (realtime.messages.extension in ('broadcast', 'presence')
              and kilumen_private.is_zone_topic((select realtime.topic()))
              and (select kilumen_private.online_ok()));
