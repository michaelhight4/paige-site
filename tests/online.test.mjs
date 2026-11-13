// Online play stage 1 unit tests (Oct 22, 2026): chat filter, send throttle, snapshot interpolation,
// block/mute list, shard ranking, public-key guard, quick-chat ids, name safety, local transport
// (Node's BroadcastChannel stands in for the browser's), per-platform profile independence.
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkText, normalise } from '../src/online/filter.js';
import { Throttle, Interp, SafetyList, Cooldown, rankIn, sameSnap } from '../src/online/net.js';
import { checkPublicKey, resolveOnline } from '../src/online/config.js';
import { PHRASES, isPhrase, phraseText } from '../src/online/phrases.js';
import { nameFor, safeName } from '../src/online/names.js';
import { ONLINE_PROFILES, onlineProfile } from '../src/online/profiles.js';
import { LocalTransport, sanitiseMeta } from '../src/online/local_transport.js';
import { ghostCol } from '../src/online/ghosts.js';

const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

test('filter: clean text passes, trimmed and normalised', () => {
  assert.deepEqual(checkText('  hello   friend  '), { ok: true, text: 'hello friend', reason: null });
  assert.equal(normalise('hi\u200b\u0007 there'), 'hi there');
  for (const s of ['Nice catch!', 'Want to explore the cave?', 'Scunthorpe', 'assassin', 'Good game', 'I like grass types']) assert.equal(checkText(s).ok, true, s);
});
test('filter: profanity blocked incl. leetspeak and spacing tricks', () => {
  for (const s of ['you are a bitch', 'b1tch', 'f u c k', 'f.u.c.k', 'what the fuck', 'sh1t', 'asshole']) {
    const r = checkText(s); assert.equal(r.ok, false, s); assert.equal(r.reason, 'profanity', s); assert.equal(r.text, '');
  }
});
test('filter: personal info, links, contact apps, substances blocked', () => {
  const cases = { 'call me 555 123 4567': 'personal_info', 'my address is elm street': 'personal_info', 'how old are you': 'personal_info', 'add me on discord': 'personal_info',
    'mail me at kid@example': 'personal_info', 'go to www.example': 'link', 'check example.com': 'link', 'see https://x': 'link', 'example dot com': 'link', 'want a beer': 'substance', 'lets smoke': 'substance' };
  for (const [s, why] of Object.entries(cases)) assert.equal(checkText(s).reason, why, s);
});
test('filter: empty and too long', () => {
  assert.equal(checkText('   ').reason, 'empty');
  assert.equal(checkText('a'.repeat(61)).reason, 'too_long');
  assert.equal(checkText('a'.repeat(48), { maxLen: 48 }).ok, true);
});

test('throttle: leading send, trailing latest value, nothing extra', () => {
  const t = new Throttle(125);
  assert.equal(t.push('a', 0), 'a');
  assert.equal(t.push('b', 50), null);
  assert.equal(t.push('c', 100), null);
  assert.equal(t.poll(120), null);
  assert.equal(t.poll(125), 'c');          // trailing edge carries the latest
  assert.equal(t.poll(400), null);         // nothing pending
  assert.equal(t.push('d', 260), 'd');
  let sent = 0; for (let ms = 0; ms <= 1000; ms += 16) if (t.push(ms, 1000 + ms) != null) sent++;
  assert.ok(sent <= 9, `8 Hz cap, got ${sent}`);
});
test('sameSnap skips unchanged snapshots', () => {
  const a = { map: 'm', px: 1, py: 2, f: 'up', a: 'walk', l: 0 };
  assert.equal(sameSnap(a, { ...a }), true); assert.equal(sameSnap(a, { ...a, px: 2 }), false); assert.equal(sameSnap(a, null), false);
});
test('interp: blends between snapshots with a delay, holds after the last', () => {
  const ip = new Interp({ delayMs: 100, teleportPx: 192 });
  ip.push({ t: 1000, map: 'm', px: 0, py: 0, f: 'right', a: 'walk' }, 5000);   // offset 4000
  ip.push({ t: 1100, map: 'm', px: 64, py: 0, f: 'right', a: 'walk' }, 5100);
  assert.equal(ip.sample(5100).px, 0);           // render time 1000
  const mid = ip.sample(5150); assert.equal(mid.px, 32); assert.equal(mid.moving, true);
  const end = ip.sample(5300); assert.equal(end.px, 64); assert.equal(end.moving, false);
});
test('interp: clock offset uses the fastest sample (jitter does not push it later)', () => {
  const ip = new Interp({ delayMs: 0 });
  ip.push({ t: 0, map: 'm', px: 0, py: 0 }, 1000);
  ip.push({ t: 100, map: 'm', px: 10, py: 0 }, 1180); // arrived 80 ms late
  assert.equal(ip.offset, 1000);
  assert.equal(ip.sample(1050).px, 5);
});
test('interp: teleport snaps, map change snaps, out-of-order inserted, duplicates ignored', () => {
  const ip = new Interp({ delayMs: 0, teleportPx: 192 });
  ip.push({ t: 0, map: 'a', px: 0, py: 0 }, 0);
  ip.push({ t: 200, map: 'a', px: 640, py: 0 }, 200);
  assert.equal(ip.sample(100).px, 640);
  const ip2 = new Interp({ delayMs: 0 });
  ip2.push({ t: 0, map: 'a', px: 0, py: 0 }, 0); ip2.push({ t: 100, map: 'b', px: 64, py: 0 }, 100);
  assert.equal(ip2.sample(50).map, 'b');
  const ip3 = new Interp({ delayMs: 0 });
  ip3.push({ t: 0, map: 'a', px: 0, py: 0 }, 0); ip3.push({ t: 200, map: 'a', px: 128, py: 0 }, 200); ip3.push({ t: 100, map: 'a', px: 64, py: 0 }, 300); ip3.push({ t: 100, map: 'a', px: 99, py: 0 }, 301);
  assert.deepEqual(ip3.buf.map((s) => s.t), [0, 100, 200]);
  assert.equal(ip3.sample(150).px, 96);
  assert.equal(new Interp().sample(0), null);
});
test('interp: buffer is bounded', () => {
  const ip = new Interp({ max: 8 });
  for (let i = 0; i < 100; i++) ip.push({ t: i * 10, map: 'a', px: i, py: 0 }, i * 10);
  assert.ok(ip.buf.length <= 8);
});
test('ghost animation frames follow movement.js rules', () => {
  assert.equal(ghostCol('walk', false, 100), 0);
  assert.equal(ghostCol('walk', true, 0), 1); assert.equal(ghostCol('walk', true, 32), 2); assert.equal(ghostCol('walk', true, 128), 1);
  assert.equal(ghostCol('bike', false, 0), 0); assert.equal(ghostCol('run', true, 64), 3);
});

test('block list: persists, hides player and chat; mute is session-only and chat-only', () => {
  const st = memStore();
  const s = new SafetyList(st);
  s.mute('a'); s.block('b');
  assert.equal(s.hides('a'), false); assert.equal(s.silences('a'), true);
  assert.equal(s.hides('b'), true); assert.equal(s.silences('b'), true);
  const s2 = new SafetyList(st);   // reload
  assert.equal(s2.isBlocked('b'), true); assert.equal(s2.isMuted('a'), false);
  s2.unblock('b'); assert.equal(new SafetyList(st).isBlocked('b'), false);
  st.setItem('kilumen.online.blocked.v1', '{oops'); assert.equal(new SafetyList(st).blocked.size, 0); // corrupt -> empty, no throw
  const s3 = new SafetyList(null); s3.block('x'); assert.equal(s3.hides('x'), true); // no storage still works
});
test('chat cooldown', () => {
  const c = new Cooldown(1500);
  assert.equal(c.take(0), true); assert.equal(c.take(1000), false); assert.equal(c.take(1500), true);
});
test('shard rank: earlier joiners first, id breaks ties', () => {
  const peers = [{ id: 'b', joinedAt: 5 }, { id: 'c', joinedAt: 1 }, { id: 'a', joinedAt: 5 }];
  assert.equal(rankIn(peers, { id: 'z', joinedAt: 9 }), 3);
  assert.equal(rankIn(peers, { id: 'aa', joinedAt: 5 }), 2);
  assert.equal(rankIn(peers, { id: 'x', joinedAt: 0 }), 0);
});

test('key guard: publishable/anon ok, secret/service_role refused', () => {
  const jwt = (role) => `x.${Buffer.from(JSON.stringify({ role, iss: 'supabase' })).toString('base64url')}.sig`;
  assert.equal(checkPublicKey(jwt('anon')).ok, true);
  assert.equal(checkPublicKey('sb_publishable_abc').ok, true);
  assert.equal(checkPublicKey(jwt('service_role')).ok, false);
  assert.equal(checkPublicKey('sb_secret_abc').ok, false);
  assert.equal(checkPublicKey('').ok, false);
  const P = (s) => new URLSearchParams(s);
  assert.equal(resolveOnline(P(''), {}).kind, 'local');
  assert.equal(resolveOnline(P('transport=supabase'), {}).kind, 'off'); // not configured -> off, never a silent connect
  assert.equal(resolveOnline(P('transport=supabase'), { KILUMEN_ONLINE_CONFIG: { supabaseUrl: 'https://x.supabase.co', supabaseKey: jwt('service_role') } }).kind, 'off');
  assert.equal(resolveOnline(P('transport=supabase'), { KILUMEN_ONLINE_CONFIG: { supabaseUrl: 'https://x.supabase.co', supabaseKey: 'sb_publishable_k' } }).kind, 'supabase');
});
test('no key or project URL is committed in src/online/config.js', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../src/online/config.js', import.meta.url), 'utf8');
  assert.match(src, /supabaseUrl: ''/); assert.match(src, /supabaseKey: ''/);
  assert.doesNotMatch(src, /eyJ[A-Za-z0-9_-]{10,}/); assert.doesNotMatch(src, /sb_(secret|publishable)_[A-Za-z0-9]/); assert.doesNotMatch(src, /kjdubkeowcyuoazvpoyt/);
});

test('quick-chat: ids unique, text short and safe, unknown ids rejected', () => {
  const ids = new Set(PHRASES.map((p) => p.id));
  assert.equal(ids.size, PHRASES.length);
  for (const p of PHRASES) { assert.ok(p.text.length <= 24, p.text); assert.equal(checkText(p.text).ok, true, p.text); }
  assert.equal(isPhrase('hi'), true); assert.equal(isPhrase('<script>'), false); assert.equal(phraseText('nope'), null);
});
test('names: built from word lists, stable per id, receivers reject anything else', () => {
  assert.equal(nameFor('p_1'), nameFor('p_1'));
  assert.notEqual(nameFor('p_1', 0), nameFor('p_1', 1));
  assert.equal(safeName(nameFor('abc')), nameFor('abc'));
  assert.equal(safeName('Bad Word 12'), 'Player'); assert.equal(safeName({}), 'Player');
  assert.equal(checkText(nameFor('q')).ok, true);
});
test('meta from other tabs is sanitised', () => {
  assert.deepEqual(sanitiseMeta({ name: 'x'.repeat(99), map: 'route1', joinedAt: 5, platform: 'evil', freeText: 'yes', extra: 1 }), { name: 'x'.repeat(40), map: 'route1', joinedAt: 5, platform: 'pc', freeText: false });
  assert.deepEqual(sanitiseMeta(null), {});
});
test('profiles: pc and mobile independent, mobile buttons >= 44 px, typed chat off by default', () => {
  const { pc, mobile } = ONLINE_PROFILES;
  assert.notEqual(pc, mobile); assert.ok(Object.isFrozen(pc) && Object.isFrozen(mobile));
  assert.deepEqual(Object.keys(pc).sort(), Object.keys(mobile).sort());
  assert.ok(mobile.minButtonPx >= 44);
  assert.equal(pc.freeTextDefault, false); assert.equal(mobile.freeTextDefault, false);
  assert.equal(onlineProfile('nope'), pc);
});

// ---- local transport with real BroadcastChannel (Node has one) ---------------------------------------
const prof = { ...ONLINE_PROFILES.pc, joinGraceMs: 40, heartbeatMs: 30, peerTimeoutMs: 120, capPerChannel: 2, maxShards: 3 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
test('local transport: peers see each other, messages flow, block drops at transport, cap shards', async () => {
  const zone = `t${Date.now()}`;
  const A = new LocalTransport({ id: 'A', profile: prof }), B = new LocalTransport({ id: 'B', profile: prof }), C = new LocalTransport({ id: 'C', profile: prof });
  const got = { A: [], B: [] };
  A.on('msg', (m) => got.A.push(m)); B.on('msg', (m) => got.B.push(m));
  try {
    assert.equal(await A.joinZone(zone, { name: 'a', map: 'm' }), `${zone}#1`);
    await wait(5);
    assert.equal(await B.joinZone(zone, { name: 'b', map: 'm' }), `${zone}#1`);
    await wait(20);
    assert.deepEqual(A.peers().map((p) => p.id), ['B']); assert.deepEqual(B.peers().map((p) => p.id), ['A']);
    A.send('qc', { p: 'hi' }); await wait(20);
    assert.equal(got.B.length, 1); assert.equal(got.B[0].from, 'A'); assert.deepEqual(got.B[0].payload, { p: 'hi' });
    B.dropFrom = (id) => id === 'A'; A.send('qc', { p: 'wow' }); await wait(20);
    assert.equal(got.B.length, 1, 'blocked player message dropped');
    // cap 2: C ranks third and moves on to shard 2
    await wait(5);
    assert.equal(await C.joinZone(zone, { name: 'c', map: 'm' }), `${zone}#2`);
    await wait(20);
    assert.ok(!A.peers().some((p) => p.id === 'C') && !B.peers().some((p) => p.id === 'C'), 'C not in shard 1');
    // leave: bye removes the peer
    const left = []; A.on('leave', (e) => left.push(e.id));
    await B.leave(); await wait(20);
    assert.deepEqual(left, ['B']); assert.equal(A.peers().length, 0);
  } finally { await A.leave(); await B.leave(); await C.leave(); }
});
test('local transport: a silent tab times out', async () => {
  const zone = `to${Date.now()}`;
  const A = new LocalTransport({ id: 'A', profile: prof });
  const ghost = new BroadcastChannel(`kilumen-online:${zone}#1`);
  try {
    const j = A.joinZone(zone, { name: 'a' }); await wait(5);
    ghost.postMessage({ k: 'hello', from: 'G', meta: { name: 'g' } }); await j;
    assert.equal(A.peers().length, 1);
    await wait(250); // > peerTimeoutMs with heartbeats running
    assert.equal(A.peers().length, 0);
    ghost.postMessage({ k: 'msg', from: 'Z', type: 'qc', payload: { p: 'hi' } }); // unknown sender ignored
  } finally { ghost.close(); await A.leave(); }
});
