-- Kilumen online play, STAGE 2: filtered typed chat (opt-in), block, report + admin review.
-- PROPOSED, NOT APPLIED (Oct 22, 2026). Needs stage 1 and paige-shared 20261022000007_paige_admin.sql
-- (paige_private.is_admin / paige_private.need).
--
-- Safety model
--   * Quick-chat (phrase ids) keeps using the zone topic from stage 1.
--   * Typed chat NEVER goes client -> client. Clients call public.kilumen_send_chat(); the server checks the
--     sender (signed-in, not anonymous, not banned, typed chat allowed + enabled, rate limit), filters the
--     text, logs it (30 days, for reports) and broadcasts it with realtime.send() on 'kilumen:chat:...'.
--     Clients can only RECEIVE on chat topics (no insert policy), so a modded client can't skip the filter,
--     and the sender id in the message is auth.uid(), so it can't be spoofed.
--   * Receivers still re-filter (src/online/filter.js) and only show typed chat if they turned it on too.
--   * Blocks are stored server-side so they follow the account across devices; a broadcast can't be filtered
--     per receiver, so the client hides blocked players (as in the prototype) and the server refuses
--     battle invites between blocked pairs (stage 3).
--   * Reports auto-block, are rate limited, keep the last few messages as evidence, and go to admin review.

alter table public.kilumen_online_players
  add column free_text_allowed boolean not null default false,  -- set by the account / age-gate flow or an admin, never by the client
  add column free_text_enabled boolean not null default false,  -- the player's own setting (off by default)
  add column chat_last_at      timestamptz;
grant update (free_text_enabled) on table public.kilumen_online_players to authenticated;

-- ---- blocks ----------------------------------------------------------------------------------
create table public.kilumen_online_blocks (
  blocker    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table public.kilumen_online_blocks enable row level security;
revoke all on table public.kilumen_online_blocks from anon, authenticated;
grant select, delete on table public.kilumen_online_blocks to authenticated;
grant insert (blocker, blocked) on table public.kilumen_online_blocks to authenticated;
create policy kilumen_blocks_select_own on public.kilumen_online_blocks for select to authenticated using (blocker = (select auth.uid()));
create policy kilumen_blocks_insert_own on public.kilumen_online_blocks for insert to authenticated with check (blocker = (select auth.uid()));
create policy kilumen_blocks_delete_own on public.kilumen_online_blocks for delete to authenticated using (blocker = (select auth.uid()));

-- ---- reports -----------------------------------------------------------------------------------
create table public.kilumen_online_reports (
  id          bigint generated always as identity primary key,
  reporter    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reported    uuid not null references auth.users (id) on delete cascade,
  reason      text not null check (reason in ('mean', 'inappropriate', 'personal_info', 'cheating', 'spam', 'other')),
  evidence    jsonb not null default '[]' check (jsonb_typeof(evidence) = 'array' and octet_length(evidence::text) <= 4000),
  zone        text check (char_length(zone) <= 64),
  status      text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  created_at  timestamptz not null default now(),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  action      text check (action in ('none', 'warn', 'ban_24h', 'ban_7d', 'ban_permanent')),
  note        text check (char_length(note) <= 1000),
  check (reporter <> reported)
);
create index kilumen_reports_open on public.kilumen_online_reports (status, created_at) where status in ('open', 'reviewing');
alter table public.kilumen_online_reports enable row level security;
revoke all on table public.kilumen_online_reports from anon, authenticated;
grant select on table public.kilumen_online_reports to authenticated;
grant insert (reporter, reported, reason, evidence, zone) on table public.kilumen_online_reports to authenticated;
create policy kilumen_reports_insert_own on public.kilumen_online_reports for insert to authenticated
  with check (reporter = (select auth.uid()) and status = 'open');
create policy kilumen_reports_select_own_or_admin on public.kilumen_online_reports for select to authenticated
  using (reporter = (select auth.uid()) or (select paige_private.is_admin('mod')));

-- rate limit (10 reports / hour) + auto-block the reported player
create function kilumen_private.on_report() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.kilumen_online_reports r where r.reporter = new.reporter and r.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'too many reports, try again later' using errcode = 'P0001';
  end if;
  insert into public.kilumen_online_blocks (blocker, blocked) values (new.reporter, new.reported) on conflict do nothing;
  return new;
end $$;
create trigger kilumen_report_guard before insert on public.kilumen_online_reports for each row execute function kilumen_private.on_report();

-- admin review (mods+). Every call re-checks the role.
create function public.kilumen_review_report(p_id bigint, p_status text, p_action text default 'none', p_note text default null)
returns public.kilumen_online_reports language plpgsql security definer set search_path = '' as $$
declare me uuid := paige_private.need('mod'); r public.kilumen_online_reports;
begin
  if p_status not in ('reviewing', 'actioned', 'dismissed') then raise exception 'bad status'; end if;
  update public.kilumen_online_reports set status = p_status, action = p_action, note = p_note, reviewed_by = me, reviewed_at = now()
    where id = p_id returning * into r;
  if r.id is null then raise exception 'no such report'; end if;
  if p_action like 'ban_%' then
    update public.kilumen_online_players set banned_until = case p_action when 'ban_24h' then now() + interval '24 hours'
      when 'ban_7d' then now() + interval '7 days' else 'infinity'::timestamptz end where user_id = r.reported;
  end if;
  return r;
end $$;
revoke all on function public.kilumen_review_report(bigint, text, text, text) from public, anon;
grant execute on function public.kilumen_review_report(bigint, text, text, text) to authenticated;

-- ---- typed chat (server-filtered) ------------------------------------------------------------
create table public.kilumen_online_chat (
  id         bigint generated always as identity primary key,
  sender     uuid not null references auth.users (id) on delete cascade,
  topic      text not null,
  body       text not null check (char_length(body) between 1 and 60),
  created_at timestamptz not null default now()
);
create index kilumen_chat_sender on public.kilumen_online_chat (sender, created_at);
alter table public.kilumen_online_chat enable row level security;
revoke all on table public.kilumen_online_chat from anon, authenticated;
grant select on table public.kilumen_online_chat to authenticated;
create policy kilumen_chat_admin_read on public.kilumen_online_chat for select to authenticated using ((select paige_private.is_admin('mod')));

-- Word list kept server-side (extend from the obscenity dataset; never shipped to clients).
create table kilumen_private.chat_denylist (pattern text primary key);
insert into kilumen_private.chat_denylist (pattern) values
  ('f+u+c+k'), ('sh+i+t'), ('b+i+t+c+h'), ('a+s+s+h+o+l+e'), ('c+u+n+t'), ('d+i+c+k'), ('p+u+s+s+y'), ('n+i+g+g'), ('f+a+g'), ('s+l+u+t'), ('w+h+o+r+e'), ('r+a+p+e');

create function kilumen_private.chat_reject_reason(p_body text) returns text language plpgsql stable security definer set search_path = '' as $$
declare t text := lower(p_body); squashed text;
begin
  if t is null or btrim(t) = '' then return 'empty'; end if;
  if char_length(t) > 60 then return 'too_long'; end if;
  if (select count(*) from regexp_matches(t, '\d', 'g')) >= 5 then return 'personal_info'; end if;
  if t ~ '(https?://|www\.|\.(com|net|org|gg|io|co|me|tv|ly|xyz)\M|\mdot\s*(com|net|org)\M)' then return 'link'; end if;
  if t ~ '(@|\m(discord|insta(gram)?|snap(chat)?|tiktok|whatsapp|telegram|kik|roblox\s*user|my\s*(address|phone|number|school)|how\s*old\s*are\s*you|send\s*(a\s*)?(pic|photo)|add\s*me|real\s*name|password)\M)' then return 'personal_info'; end if;
  if t ~ '\m(beer|wine|vodka|whiske?y|alcohol|booze|drunk|cig(arette)?s?|smok(e|ing)|vape|vaping|weed|drugs?|cocaine|pills)\M' then return 'substance'; end if;
  if t ~ '(\mkys\M|kill\s*(yo)?u?r?\s*self|\mgo\s+die\M)' then return 'mean'; end if;
  -- words are checked from their start (so 'Scunthorpe' and 'class' pass); runs of single letters
  -- ('f u c k', 'f.u.c.k') are joined first so spacing tricks don't work.
  t := translate(t, '0134578@$!', 'oieastbasi');
  select coalesce(string_agg(w, '' order by n), '') into squashed
    from regexp_split_to_table(t, '[^a-z]+') with ordinality as x(w, n) where char_length(w) = 1;
  if exists (select 1 from kilumen_private.chat_denylist d
             where squashed ~ d.pattern
                or exists (select 1 from regexp_split_to_table(t, '[^a-z]+') w where w ~ ('^' || d.pattern)))
    then return 'profanity'; end if;
  return null;
end $$;

create function public.kilumen_send_chat(p_topic text, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p public.kilumen_online_players; body text; why text; chat_topic text;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'account_needed'); end if;
  select * into p from public.kilumen_online_players where user_id = uid for update;
  if p.user_id is null or (p.banned_until is not null and p.banned_until > now()) then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  if not p.free_text_allowed or not p.free_text_enabled then return jsonb_build_object('ok', false, 'reason', 'off'); end if;
  if p.chat_last_at is not null and p.chat_last_at > now() - interval '1500 milliseconds' then return jsonb_build_object('ok', false, 'reason', 'cooldown'); end if;
  if not kilumen_private.is_zone_topic(p_topic) then raise exception 'bad topic'; end if;
  body := btrim(regexp_replace(regexp_replace(coalesce(p_body, ''), '[\u0001-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]', '', 'g'), '\s+', ' ', 'g'));
  why := kilumen_private.chat_reject_reason(body);
  if why is not null then return jsonb_build_object('ok', false, 'reason', why); end if;
  update public.kilumen_online_players set chat_last_at = now() where user_id = uid;
  insert into public.kilumen_online_chat (sender, topic, body) values (uid, p_topic, body);
  chat_topic := 'kilumen:chat:' || substr(p_topic, 9);   -- kilumen:zone:x#1 -> kilumen:chat:zone:x#1
  perform realtime.send(jsonb_build_object('from', uid, 'd', jsonb_build_object('text', body)), 'say', chat_topic, true);
  return jsonb_build_object('ok', true, 'text', body);
end $$;
revoke all on function public.kilumen_send_chat(text, text), kilumen_private.chat_reject_reason(text) from public, anon;
grant execute on function public.kilumen_send_chat(text, text) to authenticated;

-- Receive-only chat topics: SELECT policy, deliberately NO insert policy.
create function kilumen_private.is_chat_topic(t text) returns boolean language sql immutable set search_path = '' as
$$ select coalesce(t ~ '^kilumen:chat:(zone|map):[a-z0-9_]{1,48}#[1-8]$', false) $$;
revoke all on function kilumen_private.is_chat_topic(text) from public, anon;
grant execute on function kilumen_private.is_chat_topic(text) to authenticated;
create policy kilumen_chat_receive on realtime.messages for select to authenticated
  using (realtime.messages.extension = 'broadcast'
         and kilumen_private.is_chat_topic((select realtime.topic()))
         and (select kilumen_private.online_ok()));

-- 30-day retention for the chat log (schedule with pg_cron, free: select cron.schedule('kilumen-chat-purge', '17 4 * * *', 'select kilumen_private.purge_chat()');)
create function kilumen_private.purge_chat() returns integer language sql security definer set search_path = '' as
$$ with d as (delete from public.kilumen_online_chat where created_at < now() - interval '30 days' returning 1) select count(*)::int from d $$;
revoke all on function kilumen_private.purge_chat() from public, anon, authenticated;
