-- Kilumen online play, STAGE 3: casual battles between players + battles (cloud saves now in 20261029000001).
-- PROPOSED, NOT APPLIED (Oct 22, 2026). Needs stages 1 + 2.
--
-- Battle model: deterministic seed + replay verification (no always-on game server needed).
--   1. Challenger calls kilumen_battle_invite(opponent, team). Refused if either side blocked the other,
--      either is banned/unknown, or the challenger already has 3 open invites.
--   2. Opponent calls kilumen_battle_accept(id, team). Teams are now locked and the SERVER makes the seed
--      (pgcrypto), so nobody can pick a lucky seed or see it before teams are fixed.
--   3. Each turn both clients call kilumen_battle_choice(id, turn, choice). A player can't read the other
--      side's choice for a turn until both have chosen (RLS below), so there's no peeking.
--      When both choices are in, the server broadcasts them on 'kilumen:battle:<id>' (receive-only).
--      Both clients run the same deterministic engine (seed + teams + choices) and show the same result.
--   4. Clients call kilumen_battle_claim(id, winner_side). An Edge Function (kilumen-battle-verify, service role,
--      server-side only) replays the log with the same engine. If the claims disagree or the replay doesn't
--      match, the battle is void and a 'cheating' report is filed for admins.
--   Casual battles give NO rewards (no items, no exp), so there's little reason to cheat in stage 3.
--   Teams are validated by the edge function against the player's cloud save + game data (legal species,
--   level cap, moves) before the result counts.

-- ---- cloud saves: moved to 20261029000001_kilumen_cloud_saves.sql (ONE save per account, Gary Oct 29 2026;
--      the old pc/mobile split is gone). The battle team check reads public.kilumen_saves (one row per user).
-- ---- battles ---------------------------------------------------------------------------------
create table public.kilumen_battles (
  id          uuid primary key default gen_random_uuid(),
  p1          uuid not null references auth.users (id) on delete cascade,
  p2          uuid not null references auth.users (id) on delete cascade,
  status      text not null default 'invited' check (status in ('invited', 'declined', 'expired', 'active', 'finished', 'void')),
  format      text not null default 'casual' check (format in ('casual')),
  team1       jsonb not null check (jsonb_typeof(team1) = 'array' and jsonb_array_length(team1) between 1 and 6 and octet_length(team1::text) <= 8192),
  team2       jsonb check (team2 is null or (jsonb_typeof(team2) = 'array' and jsonb_array_length(team2) between 1 and 6 and octet_length(team2::text) <= 8192)),
  seed        text,
  claim1      smallint check (claim1 in (1, 2)),
  claim2      smallint check (claim2 in (1, 2)),
  winner_side smallint check (winner_side in (1, 2)),
  verified    boolean not null default false,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz,
  check (p1 <> p2)
);
create index kilumen_battles_p1 on public.kilumen_battles (p1, status);
create index kilumen_battles_p2 on public.kilumen_battles (p2, status);
alter table public.kilumen_battles enable row level security;
revoke all on table public.kilumen_battles from anon, authenticated;
grant select on table public.kilumen_battles to authenticated;  -- all writes go through the RPCs below
create policy kilumen_battles_select_players on public.kilumen_battles for select to authenticated
  using ((select auth.uid()) in (p1, p2) or (select paige_private.is_admin('mod')));

create table public.kilumen_battle_choices (
  battle_id  uuid not null references public.kilumen_battles (id) on delete cascade,
  turn       integer not null check (turn between 0 and 500),
  side       smallint not null check (side in (1, 2)),
  choice     text not null check (choice ~ '^(move [1-4]|switch [1-6]|team [1-6]{1,6}|forfeit)$'),
  created_at timestamptz not null default now(),
  primary key (battle_id, turn, side)
);
alter table public.kilumen_battle_choices enable row level security;
revoke all on table public.kilumen_battle_choices from anon, authenticated;
grant select on table public.kilumen_battle_choices to authenticated;

create function kilumen_private.my_side(p_battle uuid) returns smallint language sql stable security definer set search_path = '' as
$$ select case when b.p1 = auth.uid() then 1::smallint when b.p2 = auth.uid() then 2::smallint end from public.kilumen_battles b where b.id = p_battle $$;
revoke all on function kilumen_private.my_side(uuid) from public, anon;
grant execute on function kilumen_private.my_side(uuid) to authenticated;

create function kilumen_private.i_chose(p_battle uuid, p_turn integer) returns boolean language sql stable security definer set search_path = '' as
$$ select exists (select 1 from public.kilumen_battle_choices c where c.battle_id = p_battle and c.turn = p_turn and c.side = kilumen_private.my_side(p_battle)) $$;
revoke all on function kilumen_private.i_chose(uuid, integer) from public, anon;
grant execute on function kilumen_private.i_chose(uuid, integer) to authenticated;

-- You see your own choices, and the other side's only once you have chosen for that turn too.
-- (helpers are SECURITY DEFINER so the policy doesn't recurse into itself)
create policy kilumen_choices_select on public.kilumen_battle_choices for select to authenticated using (
  kilumen_private.my_side(battle_id) is not null
  and (side = kilumen_private.my_side(battle_id) or kilumen_private.i_chose(battle_id, turn)));

create function kilumen_private.blocked_either(a uuid, b uuid) returns boolean language sql stable security definer set search_path = '' as
$$ select exists (select 1 from public.kilumen_online_blocks k where (k.blocker = a and k.blocked = b) or (k.blocker = b and k.blocked = a)) $$;
revoke all on function kilumen_private.blocked_either(uuid, uuid) from public, anon, authenticated;

create function public.kilumen_battle_invite(p_opponent uuid, p_team jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); bid uuid;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if not kilumen_private.online_ok() then raise exception 'online play not allowed'; end if;
  if p_opponent = uid then raise exception 'cannot battle yourself'; end if;
  if not exists (select 1 from public.kilumen_online_players p where p.user_id = p_opponent and (p.banned_until is null or p.banned_until < now()))
    then raise exception 'player not available'; end if;
  if kilumen_private.blocked_either(uid, p_opponent) then raise exception 'player not available'; end if;  -- same message: don't reveal blocks
  update public.kilumen_battles set status = 'expired' where p1 = uid and status = 'invited' and created_at < now() - interval '2 minutes';
  if (select count(*) from public.kilumen_battles b where b.p1 = uid and b.status = 'invited') >= 3 then raise exception 'too many open invites'; end if;
  insert into public.kilumen_battles (p1, p2, team1) values (uid, p_opponent, p_team) returning id into bid;
  return bid;
end $$;

create function public.kilumen_battle_accept(p_id uuid, p_team jsonb) returns public.kilumen_battles
language plpgsql security definer set search_path = '' as $$
declare b public.kilumen_battles;
begin
  select * into b from public.kilumen_battles where id = p_id for update;
  if b.id is null or b.p2 is distinct from auth.uid() then raise exception 'no such invite'; end if;
  if b.status <> 'invited' or b.created_at < now() - interval '2 minutes' then raise exception 'invite expired'; end if;
  if kilumen_private.blocked_either(b.p1, b.p2) then raise exception 'no such invite'; end if;
  update public.kilumen_battles set team2 = p_team, status = 'active', started_at = now(),
         seed = encode(extensions.gen_random_bytes(16), 'hex')
   where id = p_id returning * into b;
  perform realtime.send(jsonb_build_object('battle', b.id), 'start', 'kilumen:battle:' || b.id::text, true);
  return b;
end $$;

create function public.kilumen_battle_decline(p_id uuid) returns void language sql security definer set search_path = '' as
$$ update public.kilumen_battles set status = 'declined' where id = p_id and p2 = auth.uid() and status = 'invited' $$;

create function public.kilumen_battle_choice(p_id uuid, p_turn integer, p_choice text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare b public.kilumen_battles; s smallint; last_turn integer; both_in boolean;
begin
  select * into b from public.kilumen_battles where id = p_id for update;
  s := case when b.p1 = auth.uid() then 1 when b.p2 = auth.uid() then 2 end;
  if b.id is null or s is null then raise exception 'not your battle'; end if;
  if b.status <> 'active' then raise exception 'battle is not active'; end if;
  select coalesce(max(turn), -1) into last_turn from public.kilumen_battle_choices c
    where c.battle_id = p_id and (select count(*) from public.kilumen_battle_choices c2 where c2.battle_id = p_id and c2.turn = c.turn) = 2;
  if p_turn <> last_turn + 1 then raise exception 'wrong turn'; end if;
  insert into public.kilumen_battle_choices (battle_id, turn, side, choice) values (p_id, p_turn, s, p_choice);
  select count(*) = 2 into both_in from public.kilumen_battle_choices where battle_id = p_id and turn = p_turn;
  if both_in then
    perform realtime.send(jsonb_build_object('turn', p_turn, 'choices',
      (select jsonb_object_agg(side::text, choice) from public.kilumen_battle_choices where battle_id = p_id and turn = p_turn)),
      'turn', 'kilumen:battle:' || p_id::text, true);
  end if;
  return both_in;
end $$;

create function public.kilumen_battle_claim(p_id uuid, p_winner smallint) returns void
language plpgsql security definer set search_path = '' as $$
declare b public.kilumen_battles;
begin
  select * into b from public.kilumen_battles where id = p_id for update;
  if b.id is null or auth.uid() not in (b.p1, b.p2) then raise exception 'not your battle'; end if;
  if b.status <> 'active' then raise exception 'battle is not active'; end if;
  if p_winner not in (1, 2) then raise exception 'bad winner'; end if;
  if auth.uid() = b.p1 then update public.kilumen_battles set claim1 = p_winner where id = p_id;
  else update public.kilumen_battles set claim2 = p_winner where id = p_id; end if;
  -- the edge function picks up rows with both claims (or one claim + 60s) and calls kilumen_private.finish_battle
end $$;

-- Called ONLY by the kilumen-battle-verify edge function (service role). Not executable by clients.
create function kilumen_private.finish_battle(p_id uuid, p_winner smallint, p_replay_ok boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare b public.kilumen_battles;
begin
  select * into b from public.kilumen_battles where id = p_id for update;
  if b.status <> 'active' then return; end if;
  if p_replay_ok and (b.claim1 is null or b.claim1 = p_winner) and (b.claim2 is null or b.claim2 = p_winner) then
    update public.kilumen_battles set status = 'finished', winner_side = p_winner, verified = true, finished_at = now() where id = p_id;
  else
    update public.kilumen_battles set status = 'void', finished_at = now() where id = p_id;
    -- file a cheating report against whoever's claim disagrees with the replay (both if unclear)
    if b.claim1 is distinct from p_winner then
      insert into public.kilumen_online_reports (reporter, reported, reason, evidence) values (b.p2, b.p1, 'cheating', jsonb_build_array(jsonb_build_object('battle', p_id)));
    end if;
    if b.claim2 is distinct from p_winner then
      insert into public.kilumen_online_reports (reporter, reported, reason, evidence) values (b.p1, b.p2, 'cheating', jsonb_build_array(jsonb_build_object('battle', p_id)));
    end if;
  end if;
  perform realtime.send(jsonb_build_object('status', (select status from public.kilumen_battles where id = p_id)), 'end', 'kilumen:battle:' || p_id::text, true);
end $$;

revoke all on function public.kilumen_battle_invite(uuid, jsonb), public.kilumen_battle_accept(uuid, jsonb), public.kilumen_battle_decline(uuid),
  public.kilumen_battle_choice(uuid, integer, text), public.kilumen_battle_claim(uuid, smallint) from public, anon;
grant execute on function public.kilumen_battle_invite(uuid, jsonb), public.kilumen_battle_accept(uuid, jsonb), public.kilumen_battle_decline(uuid),
  public.kilumen_battle_choice(uuid, integer, text), public.kilumen_battle_claim(uuid, smallint) to authenticated;
revoke all on function kilumen_private.finish_battle(uuid, smallint, boolean) from public, anon, authenticated;
grant execute on function kilumen_private.finish_battle(uuid, smallint, boolean) to service_role;

-- Battle topics are receive-only for the two players (the server sends 'start', 'turn', 'end').
create function kilumen_private.in_battle_topic(t text) returns boolean language sql stable security definer set search_path = '' as $$
  select case when coalesce(t ~ '^kilumen:battle:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', false)
    then exists (select 1 from public.kilumen_battles b where b.id = substr(t, 16)::uuid and auth.uid() in (b.p1, b.p2))
    else false end
$$;
revoke all on function kilumen_private.in_battle_topic(text) from public, anon;
grant execute on function kilumen_private.in_battle_topic(text) to authenticated;
create policy kilumen_battle_receive on realtime.messages for select to authenticated
  using (realtime.messages.extension = 'broadcast' and (select kilumen_private.in_battle_topic(realtime.topic())));
