// Runs the PROPOSED Kilumen online migrations (stages 1-3) in PGlite with a small Supabase shim
// (auth.uid/jwt, roles, realtime.messages + realtime.topic() + realtime.send, paige_private admin stubs).
// Nothing here touches a real Supabase project.
// Run: node --test supabase/migrations_proposed/tests/   (needs @electric-sql/pglite; found via PGLITE_FROM or ../riftward/app; skips if missing)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const FROM = process.env.PGLITE_FROM || new URL("../../../../riftward/app/", import.meta.url).pathname;
let PGlite = null, pgcrypto = null;
try {
  const req = createRequire(FROM + "package.json");
  ({ PGlite } = await import(pathToFileURL(req.resolve("@electric-sql/pglite")).href));
  ({ pgcrypto } = await import(pathToFileURL(req.resolve("@electric-sql/pglite/contrib/pgcrypto")).href));
} catch { /* skip below */ }
const skip = PGlite ? false : `PGlite not found under ${FROM}`;

const SHIM = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key, is_anonymous boolean not null default false);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.jwt(), auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
create schema extensions; create extension pgcrypto schema extensions; grant usage on schema extensions to anon, authenticated, service_role;
-- realtime shim (the real table already exists with RLS on)
create schema realtime; grant usage on schema realtime to authenticated, anon, service_role;
create table realtime.messages (id bigserial primary key, topic text not null, extension text not null, event text, payload jsonb, private boolean default true, inserted_at timestamptz default now());
alter table realtime.messages enable row level security;
grant select, insert on realtime.messages to authenticated, anon; grant usage on sequence realtime.messages_id_seq to authenticated, anon;
create function realtime.topic() returns text language sql stable as $$ select nullif(current_setting('realtime.topic', true), '') $$;
grant execute on function realtime.topic() to authenticated, anon;
create function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void language sql security definer as
  $$ insert into realtime.messages (topic, extension, event, payload, private) values (topic, 'broadcast', event, payload, private) $$;
-- paige_private admin stubs (real ones: paige-shared 20261022000007_paige_admin.sql)
create schema paige_private; grant usage on schema paige_private to authenticated;
create table paige_private.admins (user_id uuid primary key, role text not null);
create function paige_private.is_admin(min_role text default 'mod') returns boolean language sql stable security definer as
  $$ select exists (select 1 from paige_private.admins a where a.user_id = auth.uid()) $$;
create function paige_private.need(min_role text default 'mod') returns uuid language plpgsql stable security definer as
  $$ begin if not paige_private.is_admin(min_role) then raise exception 'admins only' using errcode = '42501'; end if; return auth.uid(); end $$;
grant execute on function paige_private.is_admin(text), paige_private.need(text) to authenticated;`;

const A = "00000000-0000-0000-0000-00000000000a", B = "00000000-0000-0000-0000-00000000000b";
const C = "00000000-0000-0000-0000-00000000000c", MOD = "00000000-0000-0000-0000-0000000000dd";

async function setup(stages = 3) {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SHIM);
  const dir = new URL("../", import.meta.url);
  const files = readdirSync(dir).filter((f) => /^\d+_kilumen_online_stage\d\.sql$/.test(f)).sort().slice(0, stages);
  files.push("20261029000001_kilumen_cloud_saves.sql"); // cloud saves stand alone (one save per account)
  for (const f of files) await db.exec(readFileSync(new URL(f, dir), "utf8"));
  await db.exec(`insert into auth.users (id) values ('${A}'), ('${B}'), ('${C}'), ('${MOD}'); insert into paige_private.admins values ('${MOD}', 'mod');`);
  return db;
}
const as = async (db, uid, sql, p, { anon = false, topic = "" } = {}) => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);
    select set_config('request.jwt.claims', '{"sub":"${uid}","is_anonymous":${anon}}', false); select set_config('realtime.topic', '${topic}', false);`);
  try { return await db.query(sql, p); }
  finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claims', '', false); select set_config('realtime.topic', '', false);`); }
};
// What Realtime does on join: insert a test message on the topic, read it back, roll back.
const canJoin = async (db, uid, topic, ext = "broadcast") => {
  try {
    const r = await as(db, uid, `with i as (insert into realtime.messages (topic, extension, event) values ($1, $2, 'probe') returning id) select count(*)::int n from i`, [topic, ext], { topic });
    return r.rows[0].n === 1;
  } catch (e) { if (/row-level security/.test(e.message)) return false; throw e; }
};
const canRead = async (db, uid, topic) => (await as(db, uid, `select count(*)::int n from realtime.messages where topic = $1`, [topic], { topic })).rows[0].n;
const join = (db, uid, anon = true) => as(db, uid, `insert into kilumen_online_players (user_id) values (auth.uid()) on conflict do nothing`, [], { anon });

test("every kilumen table has RLS on", { skip }, async () => {
  const db = await setup();
  const r = await db.query(`select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'kilumen%'`);
  assert.ok(r.rows.length >= 7, "expected at least 7 tables");
  for (const row of r.rows) assert.equal(row.relrowsecurity, true, `${row.relname} must have RLS on`);
});

test("stage 1: zone channels need a player row, right topic shape, not banned", { skip }, async () => {
  const db = await setup(1);
  const T = "kilumen:zone:sunmeadow_fields#1";
  assert.equal(await canJoin(db, A, T), false, "no player row yet");
  await join(db, A);
  assert.equal(await canJoin(db, A, T), true);
  assert.equal(await canJoin(db, A, T, "presence"), true);
  assert.equal(await canJoin(db, A, "kilumen:map:route1#8"), true);
  for (const bad of ["kilumen:zone:sunmeadow_fields#9", "kilumen:zone:sunmeadow_fields", "other_game:lobby", "kilumen:chat:zone:sunmeadow_fields#1", "kilumen:zone:SUN#1", "kilumen:zone:x#1;drop"])
    assert.equal(await canJoin(db, A, bad), false, bad);
  assert.equal(await canJoin(db, A, T, "postgres_changes"), false);
  assert.ok(await canRead(db, A, T) >= 1);
  assert.equal(await canRead(db, B, T), 0, "no row -> cannot read");
  // can't ban yourself away / unban yourself, can't edit others
  await assert.rejects(as(db, A, `update kilumen_online_players set banned_until = null where user_id = auth.uid()`), /permission denied/);
  await join(db, B);
  const upd = await as(db, A, `update kilumen_online_players set name_roll = 5 where user_id = $1`, [B]);
  assert.equal(upd.affectedRows, 0);
  assert.equal((await as(db, A, `select count(*)::int n from kilumen_online_players`)).rows[0].n, 1, "only own row visible");
  await assert.rejects(as(db, A, `insert into kilumen_online_players (user_id) values ($1)`, [C]), /row-level security/);
  // banned -> locked out
  await db.query(`update kilumen_online_players set banned_until = now() + interval '1 day' where user_id = $1`, [B]);
  assert.equal(await canJoin(db, B, T), false);
  assert.equal(await canRead(db, B, T), 0);
});

test("stage 2: typed chat is server-filtered, opt-in, not for anonymous, rate limited, receive-only topic", { skip }, async () => {
  const db = await setup(2);
  const T = "kilumen:zone:sunmeadow_fields#1", CT = "kilumen:chat:zone:sunmeadow_fields#1";
  await join(db, A, false); await join(db, B, false);
  const say = (u, text, anon = false) => as(db, u, `select kilumen_send_chat($1, $2) r`, [T, text], { anon }).then((r) => r.rows[0].r);
  assert.equal((await say(A, "hi", true)).reason, "account_needed");
  assert.equal((await say(A, "hi")).reason, "off");
  await as(db, A, `update kilumen_online_players set free_text_enabled = true where user_id = auth.uid()`);
  assert.equal((await say(A, "hi")).reason, "off", "needs free_text_allowed from the age gate too");
  await assert.rejects(as(db, A, `update kilumen_online_players set free_text_allowed = true where user_id = auth.uid()`), /permission denied/);
  await db.query(`update kilumen_online_players set free_text_allowed = true where user_id = $1`, [A]);
  const ok = await say(A, "  nice   catch!  ");
  assert.equal(ok.ok, true); assert.equal(ok.text, "nice catch!");
  assert.equal((await say(A, "again")).reason, "cooldown");
  const rejects = { "f u c k": "profanity", "sh1t": "profanity", "call me 555 1234": "personal_info", "add me on discord": "personal_info",
    "go to www.example.com": "link", "lets get beer": "substance", ["x".repeat(61)]: "too_long", "   ": "empty", "my address is": "personal_info", "kys": "mean", "go kill yourself": "mean", "you are a d1ckhead": "profanity" };
  for (const [text, why] of Object.entries(rejects)) {
    await db.query(`update kilumen_online_players set chat_last_at = null`);
    assert.equal((await say(A, text)).reason, why, text);
  }
  await db.query(`update kilumen_online_players set chat_last_at = null`);
  assert.equal((await say(A, "Scunthorpe is a town")).ok, true, "no Scunthorpe problem");
  for (const fine of ["glass class", "i a m ok"]) { await db.query(`update kilumen_online_players set chat_last_at = null`); assert.equal((await say(A, fine)).ok, true, fine); }
  const sent = await db.query(`select topic, payload from realtime.messages where event = 'say'`);
  assert.equal(sent.rows.length, 4); assert.equal(sent.rows[0].topic, CT); assert.equal(sent.rows[0].payload.from, A, "sender id comes from auth.uid()");
  assert.equal(await canJoin(db, A, CT), false, "clients can't broadcast on chat topics");
  assert.equal(await canRead(db, B, CT), 4, "but can receive");
  assert.equal((await as(db, A, `select count(*)::int n from kilumen_online_chat`)).rows[0].n, 0, "chat log is admin-only");
  assert.equal((await as(db, MOD, `select count(*)::int n from kilumen_online_chat`)).rows[0].n, 4);
  await db.query(`update kilumen_online_players set chat_last_at = null`);
  await assert.rejects(as(db, A, `select kilumen_send_chat('other_game:lobby', 'hi')`), /bad topic/);
});

test("stage 2: block + report (auto-block, rate limit, admin review bans)", { skip }, async () => {
  const db = await setup(2);
  for (const u of [A, B, C]) await join(db, u);
  await as(db, A, `insert into kilumen_online_blocks (blocked) values ($1)`, [C]);
  assert.equal((await as(db, B, `select count(*)::int n from kilumen_online_blocks`)).rows[0].n, 0, "blocks are private");
  await assert.rejects(as(db, B, `insert into kilumen_online_blocks (blocker, blocked) values ($1, $2)`, [A, B]), /row-level security/);
  const rep = await as(db, A, `insert into kilumen_online_reports (reported, reason, evidence, zone) values ($1, 'mean', '[{"t":"qc","p":"gg"}]', 'sunmeadow_fields') returning id`, [B]);
  const id = rep.rows[0].id;
  assert.equal((await as(db, A, `select count(*)::int n from kilumen_online_blocks where blocked = $1`, [B])).rows[0].n, 1, "report auto-blocks");
  await assert.rejects(as(db, A, `insert into kilumen_online_reports (reporter, reported, reason) values ($1, $2, 'mean')`, [C, B]), /row-level security/, "can't report as someone else");
  await assert.rejects(as(db, A, `insert into kilumen_online_reports (reported, reason, status) values ($1, 'mean', 'dismissed')`, [B]), /permission denied/);
  await assert.rejects(as(db, A, `insert into kilumen_online_reports (reported, reason) values ($1, 'bad words')`, [B]), /check constraint/);
  await assert.rejects(as(db, A, `insert into kilumen_online_reports (reported, reason, evidence) values ($1, 'mean', $2)`, [B, JSON.stringify(["x".repeat(5000)])]), /check constraint/);
  assert.equal((await as(db, B, `select count(*)::int n from kilumen_online_reports`)).rows[0].n, 0, "reported player can't see reports");
  for (let i = 0; i < 10; i++) await as(db, C, `insert into kilumen_online_reports (reported, reason) values ($1, 'spam')`, [B]);
  await assert.rejects(as(db, C, `insert into kilumen_online_reports (reported, reason) values ($1, 'spam')`, [B]), /too many reports/);
  await assert.rejects(as(db, A, `select kilumen_review_report($1, 'actioned', 'ban_7d')`, [id]), /admins only/);
  await as(db, MOD, `select kilumen_review_report($1, 'actioned', 'ban_7d', 'repeated mean phrases')`, [id]);
  const b = (await db.query(`select banned_until > now() + interval '6 days' ok from kilumen_online_players where user_id = $1`, [B])).rows[0];
  assert.equal(b.ok, true);
  assert.equal(await canJoin(db, B, "kilumen:zone:sunmeadow_fields#1"), false, "banned player is out");
  assert.equal((await as(db, A, `select status from kilumen_online_reports where id = $1`, [id])).rows[0].status, "actioned", "reporter sees outcome");
});

test("stage 3: battles - blocks refuse invites, server seed, no peeking at choices, replay verification", { skip }, async () => {
  const db = await setup(3);
  for (const u of [A, B, C]) await join(db, u);
  const team = JSON.stringify([{ s: "emberkit", l: 10 }]);
  await as(db, C, `insert into kilumen_online_blocks (blocked) values ($1)`, [A]);
  await assert.rejects(as(db, A, `select kilumen_battle_invite($1, $2)`, [C, team]), /player not available/, "blocked (by the other side) refuses");
  await assert.rejects(as(db, A, `select kilumen_battle_invite($1, $2)`, [A, team]), /yourself/);
  await assert.rejects(as(db, A, `insert into kilumen_battles (p1, p2, team1) values ($1, $2, $3)`, [A, B, team]), /permission denied/);
  const id = (await as(db, A, `select kilumen_battle_invite($1, $2) id`, [B, team])).rows[0].id;
  assert.equal((await as(db, A, `select seed from kilumen_battles where id = $1`, [id])).rows[0].seed, null, "no seed before accept");
  assert.equal((await as(db, C, `select count(*)::int n from kilumen_battles`)).rows[0].n, 0, "outsiders can't see battles");
  await assert.rejects(as(db, A, `select kilumen_battle_accept($1, $2)`, [id, team]), /no such invite/, "challenger can't accept own invite");
  await as(db, B, `select kilumen_battle_accept($1, $2)`, [id, team]);
  const seed = (await as(db, B, `select seed from kilumen_battles where id = $1`, [id])).rows[0].seed;
  assert.match(seed, /^[0-9a-f]{32}$/);
  const BT = `kilumen:battle:${id}`;
  assert.equal(await canRead(db, A, BT), 1, "start event");
  assert.equal(await canRead(db, C, BT), 0);
  assert.equal(await canJoin(db, A, BT), false, "battle topic is receive-only");
  await assert.rejects(as(db, A, `select kilumen_battle_choice($1, 1, 'move 1')`, [id]), /wrong turn/);
  await assert.rejects(as(db, A, `select kilumen_battle_choice($1, 0, 'move 9; drop table')`, [id]), /check constraint/);
  assert.equal((await as(db, A, `select kilumen_battle_choice($1, 0, 'move 1') r`, [id])).rows[0].r, false);
  assert.equal((await as(db, B, `select count(*)::int n from kilumen_battle_choices where side = 1`)).rows[0].n, 0, "B can't peek at A's choice yet");
  assert.equal((await as(db, B, `select kilumen_battle_choice($1, 0, 'switch 2') r`, [id])).rows[0].r, true);
  assert.equal((await as(db, B, `select count(*)::int n from kilumen_battle_choices`)).rows[0].n, 2, "revealed after both chose");
  const turn = await db.query(`select payload from realtime.messages where topic = $1 and event = 'turn'`, [BT]);
  assert.deepEqual(turn.rows[0].payload.choices, { 1: "move 1", 2: "switch 2" });
  await assert.rejects(as(db, A, `select kilumen_battle_choice($1, 0, 'move 2')`, [id]), /wrong turn/);
  // A lies about the result; replay says side 2 won -> void + cheating report on A
  await as(db, A, `select kilumen_battle_claim($1, 1::smallint)`, [id]);
  await as(db, B, `select kilumen_battle_claim($1, 2::smallint)`, [id]);
  await assert.rejects(as(db, A, `select kilumen_private.finish_battle($1, 1::smallint, true)`, [id]), /permission denied/);
  await db.query(`select kilumen_private.finish_battle($1, 2::smallint, true)`, [id]);
  assert.equal((await as(db, A, `select status from kilumen_battles where id = $1`, [id])).rows[0].status, "void");
  const reps = (await db.query(`select reporter, reported, reason from kilumen_online_reports where reason = 'cheating'`)).rows;
  assert.deepEqual(reps, [{ reporter: B, reported: A, reason: "cheating" }]);
});

const sv = (id, at, extra = {}) => JSON.stringify({ saveId: id, savedAt: at, v: 2, party: [], ...extra });
const put = async (db, uid, data, o = {}) => (await as(db, uid, `select public.kilumen_save_put($1::jsonb, 'pc') r`, [data], o)).rows[0].r;
test("cloud saves: one row per account, own-row only, older refused, 256 KB cap, anon refused", { skip }, async () => {
  const db = await setup(3);
  const now = Date.now();
  assert.deepEqual(await put(db, A, sv("kA", now - 5000)), { ok: true, saved_at: now - 5000 });
  assert.equal((await put(db, A, sv("kA", now - 1000))).ok, true, "newer save replaces");
  const older = await put(db, A, sv("kA2", now - 3000));
  assert.equal(older.ok, false); assert.equal(older.reason, "older"); assert.equal(Number(older.cloud_saved_at), now - 1000);
  assert.equal((await put(db, A, sv("kA", now - 1000))).reason, "older", "same savedAt is not newer");
  assert.equal((await as(db, A, `select count(*)::int n, max(save_id) s from kilumen_saves`)).rows[0].n, 1, "one row per account");
  assert.equal((await as(db, A, `select save_id from kilumen_saves`)).rows[0].save_id, "kA");
  // other users see nothing and can't write A's row (no direct grants; the function only writes auth.uid()'s row)
  assert.equal((await as(db, B, `select count(*)::int n from kilumen_saves`)).rows[0].n, 0);
  await assert.rejects(as(db, B, `insert into kilumen_saves (user_id, save_id, saved_at, save_version, data) values ($1, 'x', 1, 2, '{}')`, [A]), /permission denied/);
  await assert.rejects(as(db, B, `update kilumen_saves set data = '{}' where user_id = $1`, [A]), /permission denied/);
  await assert.rejects(as(db, A, `delete from kilumen_saves`), /permission denied/);
  assert.equal((await put(db, B, sv("kB", now))).ok, true);
  assert.equal((await as(db, A, `select save_id from kilumen_saves`)).rows[0].save_id, "kA", "B's write did not touch A");
  // size cap, bad data, future clock
  assert.equal((await put(db, C, sv("kC", now, { big: "x".repeat(270000) }))).reason, "too_big");
  assert.equal((await put(db, C, sv("kC", now, { big: "x".repeat(200000) }))).ok, true, "200 KB fits");
  assert.equal((await put(db, A, JSON.stringify({ savedAt: now + 1 }))).reason, "bad_save");
  assert.equal((await put(db, A, sv("kA", now + 3600e3))).reason, "future");
  // is_anonymous accounts: refused to write and read nothing
  assert.equal((await put(db, B, sv("kB", now + 1), { anon: true })).reason, "account_needed");
  assert.equal((await as(db, B, `select count(*)::int n from kilumen_saves`, [], { anon: true })).rows[0].n, 0);
  // the anon role: no table access, no function
  await db.exec(`set role anon`);
  try {
    await assert.rejects(db.query(`select * from public.kilumen_saves`), /permission denied/);
    await assert.rejects(db.query(`select public.kilumen_save_put('{}'::jsonb)`), /permission denied/);
  } finally { await db.exec(`reset role`); }
});
