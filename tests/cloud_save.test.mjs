// Cloud saves (src/net/cloud_save.js): boot decision, one-time choice, throttled uploads, save-lock wait, backups.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, uploader, bootCloudSave, summarise, THROTTLE_MS } from '../src/net/cloud_save.js';
import { SaveStore, freshSave } from '../src/overworld/save.js';
import { isLoadableSave } from '../src/overworld/save_schema.js';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
const KEY = 'kilumen.save.v1';
const realSave = (id, at, extra = {}) => { const st = mem(); const s = new SaveStore(st, KEY); s.save({ ...freshSave(), saveId: id, ...extra }); const o = JSON.parse(st.getItem(KEY)); o.savedAt = at; return o; };
const fakeApi = (row) => { const calls = []; return { calls, row: () => row,
  meta: async () => (row ? { saveId: row.saveId, savedAt: row.savedAt } : null), data: async () => { calls.push('data'); return row; },
  put: async (json) => { calls.push('put'); const o = JSON.parse(json); if (row && o.savedAt <= row.savedAt) return { ok: false, reason: 'older' }; row = o; return { ok: true }; } }; };
const sess = async () => ({ token: 't', uid: 'u1', anonymous: false });

test('decide: same playthrough -> newest wins; different playthroughs -> ask once; memo replays the pick', () => {
  assert.equal(decide(null, null), 'none');
  assert.equal(decide({ saveId: 'a', savedAt: 5 }, null), 'upload');
  assert.equal(decide(null, { saveId: 'a', savedAt: 5 }), 'download');
  assert.equal(decide({ saveId: 'a', savedAt: 5 }, { saveId: 'a', savedAt: 9 }), 'download');
  assert.equal(decide({ saveId: 'a', savedAt: 9 }, { saveId: 'a', savedAt: 5 }), 'upload');
  assert.equal(decide({ saveId: 'a', savedAt: 5 }, { saveId: 'a', savedAt: 5 }), 'same');
  assert.equal(decide({ saveId: 'a', savedAt: 5 }, { saveId: 'b', savedAt: 1 }), 'ask');
  assert.equal(decide({ saveId: 'a', savedAt: 5 }, { saveId: 'b', savedAt: 1 }, { local: 'a', cloud: 'b', pick: 'cloud' }), 'take_cloud');
  assert.equal(decide({ saveId: 'a', savedAt: 5 }, { saveId: 'c', savedAt: 1 }, { local: 'a', cloud: 'b', pick: 'cloud' }), 'ask');
});

test('uploader: first save goes at once, later ones at most every 30 s, waits for the save lock, flushes on hide', async () => {
  let t = 1000, lock = false; const timers = []; const sent = [];
  const up = uploader({ api: { put: async (j, d, o) => { sent.push([j, d, !!o?.keepalive]); return { ok: true }; } }, device: 'pc',
    locked: () => lock, now: () => t, setTimer: (f, ms) => { timers.push([f, ms]); return timers.length; }, clearTimer: () => { timers.length = 0; } });
  up.saved('{"n":1}'); await 0; assert.equal(sent.length, 1);
  up.saved('{"n":2}'); up.saved('{"n":3}'); await 0; assert.equal(sent.length, 1, 'throttled'); assert.equal(timers.at(-1)[1], THROTTLE_MS);
  t += THROTTLE_MS; lock = true; timers.pop()[0](); await 0; assert.equal(sent.length, 1, 'not while a battle / talk / cutscene holds the lock');
  lock = false; timers.pop()[0](); await 0; assert.deepEqual(sent[1], ['{"n":3}', 'pc', false], 'only the newest pending save is sent');
  up.saved('{"n":4}'); up.hidden(); await 0; assert.deepEqual(sent[2], ['{"n":4}', 'pc', true], 'page hidden: one keepalive upload');
});

test('uploader stops when the server says the cloud save is newer', async () => {
  const up = uploader({ api: { put: async () => ({ ok: false, reason: 'older' }) }, device: 'pc', setTimer: () => 1 });
  up.saved('{}'); await new Promise((r) => setImmediate(r)); assert.equal(up.stopped, true);
});

test('boot: guests and anonymous sessions are untouched', async () => {
  const st = mem(); st.setItem(KEY, JSON.stringify(realSave('a', 5)));
  assert.equal((await bootCloudSave({ storage: st, key: KEY, isLoadable: isLoadableSave, session: async () => null, ls: mem() })).action, 'guest');
  assert.equal((await bootCloudSave({ storage: st, key: KEY, isLoadable: isLoadableSave, session: async () => ({ token: 't', uid: 'x', anonymous: true }), ls: mem() })).action, 'guest');
});

test('boot: newer cloud save of the same playthrough is downloaded, local kept as backup; only meta read when not newer', async () => {
  const st = mem(); const local = realSave('k1', 1000); st.setItem(KEY, JSON.stringify(local));
  const api = fakeApi(realSave('k1', 2000, { coins: 77 }));
  const r = await bootCloudSave({ storage: st, key: KEY, isLoadable: isLoadableSave, session: sess, api, ls: mem(), device: 'mobile' });
  assert.equal(r.action, 'download'); assert.equal(JSON.parse(st.getItem(KEY)).coins, 77);
  assert.equal(JSON.parse(st.getItem(KEY + '.device')).savedAt, 1000); assert.equal(JSON.parse(st.getItem(KEY + '.bak')).savedAt, 1000);
  const api2 = fakeApi(realSave('k1', 500));
  const r2 = await bootCloudSave({ storage: st, key: KEY, isLoadable: isLoadableSave, session: sess, api: api2, ls: mem() });
  assert.equal(r2.action, 'upload'); assert.ok(!api2.calls.includes('data'), 'no download when the cloud is older');
});

test('boot: different saves -> one choice; "Cloud" loads it, the pick is remembered; "This device" overwrites the cloud', async () => {
  const ls = mem(); let asked = 0;
  const st = mem(); st.setItem(KEY, JSON.stringify(realSave('phone', 9000, { coins: 5 })));
  const api = fakeApi(realSave('pc', 8000, { coins: 900 }));
  const o = { storage: st, key: KEY, isLoadable: isLoadableSave, session: sess, api, ls, device: 'mobile', ask: async () => { asked++; return 'cloud'; } };
  assert.equal((await bootCloudSave(o)).action, 'take_cloud'); assert.equal(asked, 1);
  assert.equal(JSON.parse(st.getItem(KEY)).coins, 900); assert.equal(JSON.parse(st.getItem(KEY + '.device')).coins, 5);
  assert.equal((await bootCloudSave(o)).action, 'same', 'never asked again'); assert.equal(asked, 1);
  // PC side: picks This device though the cloud is newer
  const st2 = mem(); st2.setItem(KEY, JSON.stringify(realSave('pcB', 100, { coins: 1 })));
  const api2 = fakeApi(realSave('phoneB', 5000)); let n = 0;
  const r = await bootCloudSave({ ...o, storage: st2, api: api2, ls: mem(), ask: async () => { n++; return 'device'; } });
  assert.equal(r.action, 'keep_local'); await new Promise((res) => setImmediate(res));
  assert.equal(api2.row().saveId, 'pcB', 'cloud now holds this device\'s save'); assert.ok(JSON.parse(st2.getItem(KEY)).savedAt > 5000);
});

test('boot: a broken cloud save is never loaded', async () => {
  const st = mem(); const api = fakeApi({ saveId: 'x', savedAt: 9, flags: 'nope' });
  const r = await bootCloudSave({ storage: st, key: KEY, isLoadable: isLoadableSave, session: sess, api, ls: mem() });
  assert.equal(r.action, 'none'); assert.equal(st.getItem(KEY), null);
});

test('SaveStore.onSaved fires only after a successful local save', () => {
  const st = mem(); const s = new SaveStore(st, KEY); const got = []; s.onSaved = (j) => got.push(j);
  assert.equal(s.save(freshSave()), true); assert.equal(got.length, 1); assert.equal(got[0], st.getItem(KEY));
  const bad = new SaveStore({ getItem: () => null, setItem: () => { throw new Error('full'); }, removeItem() {} }, KEY); bad.onSaved = (j) => got.push(j);
  assert.equal(bad.save(freshSave()), false); assert.equal(got.length, 1);
});

test('summarise: card facts', () => {
  const s = summarise(realSave('a', 5, { coins: 12, pos: { map: 'brookhollow', x: 1, y: 1, facing: 'down' } }));
  assert.equal(s.place, 'Brookhollow'); assert.equal(s.coins, 12);
});
