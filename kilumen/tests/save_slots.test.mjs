// Save slots (Oct 31 2026): 3 slots, exactly one cloud slot (swappable), old save migrates to slot 1, device slots never upload.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SAVE_KEY } from '../src/overworld/save.js';
import * as S from '../src/overworld/save_slots.js';
import { bootCloudSave } from '../src/net/cloud_save.js';
const mem = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
const save = (x = {}) => JSON.stringify({ saveId: 'a', savedAt: 1, pos: { map: 'gullhaven_town' }, seen: { 'open2:name': 'Ari' }, systems: { playMs: 3723000, progression: { masters: { a: 1, b: 1 } } }, ...x });

test('slot keys: slot 1 keeps the old key, others distinct', () => {
  assert.equal(S.slotKey(1), SAVE_KEY); assert.notEqual(S.slotKey(2), S.slotKey(3)); assert.ok(S.slotKey(2).startsWith(SAVE_KEY));
  assert.equal(S.allSlotKeys().length, 6); assert.ok(S.allSlotKeys().includes(SAVE_KEY + '.bak'));
});
test('migration: old save becomes slot 1 untouched, copy kept, idempotent', () => {
  const st = mem({ [SAVE_KEY]: save(), [SAVE_KEY + '.bak']: save({ savedAt: 0 }) });
  const r = S.migrateToSlots(st); assert.equal(r.migrated, true); assert.deepEqual([r.meta.active, r.meta.cloud], [1, 1]);
  assert.equal(st.getItem(SAVE_KEY), save()); assert.equal(st.getItem(S.PRESLOTS_BAK), save()); assert.equal(st.getItem(SAVE_KEY + '.bak'), save({ savedAt: 0 }));
  st.setItem(SAVE_KEY, save({ savedAt: 9 })); const r2 = S.migrateToSlots(st); assert.equal(r2.migrated, false); assert.equal(st.getItem(S.PRESLOTS_BAK), save());
});
test('fresh install: no save, defaults', () => {
  const st = mem(); const r = S.migrateToSlots(st); assert.equal(r.migrated, false); assert.equal(st.getItem(S.PRESLOTS_BAK), null);
  const ch = S.titleChoices(S.listSlots(st, r.meta), r.meta); assert.deepEqual(ch, { continue: false, load: false });
});
test('slot cards: name, play time, badges, place; .bak fallback; empty', () => {
  const st = mem({ [SAVE_KEY]: save(), [S.slotKey(2) + '.bak']: save({ seen: { 'open2:name': 'Bo' } }) });
  const meta = S.readMeta(st); const [a, b, c] = S.listSlots(st, meta);
  assert.equal(a.name, 'Ari'); assert.equal(S.fmtPlayTime(a.playMs), '1:02'); assert.equal(a.badges, 2); assert.equal(a.place, 'Gullhaven Town'); assert.equal(a.cloud, true);
  assert.equal(b.used, true); assert.equal(b.name, 'Bo'); assert.equal(b.cloud, false); assert.equal(c.used, false);
  assert.equal(S.fmtPlayTime(null), '');
});
test('title choices: continue = active slot used; load = any used', () => {
  const st = mem({ [S.slotKey(3)]: save() }); S.writeMeta(st, { active: 1, cloud: 1 });
  assert.deepEqual(S.titleChoices(S.listSlots(st, S.readMeta(st)), S.readMeta(st)), { continue: false, load: true });
  S.planLoad(st, 3); assert.deepEqual(S.titleChoices(S.listSlots(st, S.readMeta(st)), S.readMeta(st)), { continue: true, load: true });
});
test('bad meta falls back to slot 1', () => {
  const st = mem({ [S.META_KEY]: '{"active":7,"cloud":"x"}' }); assert.deepEqual(S.readMeta(st), { v: 1, active: 1, cloud: 1, swapPending: null });
  const st2 = mem({ [S.META_KEY]: 'nope' }); assert.equal(S.readMeta(st2).active, 1);
});
test('upload gate: only the cloud slot key uploads', () => {
  const m = { active: 2, cloud: 1 };
  assert.equal(S.mayUpload(m, S.slotKey(1)), true); assert.equal(S.mayUpload(m, S.slotKey(2)), false); assert.equal(S.mayUpload(m, S.slotKey(3)), false);
  const p = S.bootPlan(S.writeMeta(mem(), m)); assert.equal(p.activeKey, S.slotKey(2)); assert.equal(p.cloudKey, S.slotKey(1)); assert.equal(p.activeIsCloud, false);
});
test('cloud swap: exactly one cloud slot, previous becomes device, labels follow', () => {
  const st = mem({ [SAVE_KEY]: save(), [S.slotKey(2)]: save({ saveId: 'b' }) }); S.migrateToSlots(st);
  const m = S.planCloudSwap(st, 2, true); assert.equal(m.cloud, 2); assert.equal(m.swapPending, 2);
  const cards = S.listSlots(st, S.readMeta(st)); assert.deepEqual(cards.map((c) => c.cloud), [false, true, false]);
  assert.equal(S.mayUpload(S.readMeta(st), S.slotKey(1)), false); assert.equal(S.mayUpload(S.readMeta(st), S.slotKey(2)), true);
  assert.equal(st.getItem(SAVE_KEY), save()); // old cloud slot keeps its data as a device save
  assert.equal(S.bootPlan(S.readMeta(st)).preferLocal, true);
  S.clearSwapPending(st); assert.equal(S.readMeta(st).swapPending, null); assert.equal(S.bootPlan(S.readMeta(st)).preferLocal, false);
});
test('cloud swap: refused for empty slot, same slot, bad slot', () => {
  const st = mem(); S.migrateToSlots(st);
  assert.equal(S.planCloudSwap(st, 3, false).cloud, 1); assert.equal(S.planCloudSwap(st, 1, true).swapPending, null); assert.equal(S.planCloudSwap(st, 9, true).cloud, 1);
});
test('new game / load set the active slot only', () => {
  const st = mem(); S.migrateToSlots(st); S.planNewGame(st, 3); assert.deepEqual([S.readMeta(st).active, S.readMeta(st).cloud], [3, 1]);
});
const cloudOpts = (local, cloud, extra = {}) => ({ storage: mem({ k: JSON.stringify(local) }), key: 'k', isLoadable: () => true, device: 'pc', session: async () => ({ token: 't' }),
  api: { meta: async () => cloud && { saveId: cloud.saveId, savedAt: cloud.savedAt }, data: async () => cloud, put: async () => ({}) }, ls: mem(), late: () => false,
  ask: async () => { throw new Error('should not ask'); }, ...extra });
test('boot after swap: different playthrough keeps the new cloud slot (no ask)', async () => {
  const o = cloudOpts({ saveId: 'b', savedAt: 1 }, { saveId: 'a', savedAt: 5 }, { preferLocal: true }); const r = await bootCloudSave(o);
  assert.equal(r.action, 'keep_local'); assert.equal(JSON.parse(o.storage.getItem('k')).saveId, 'b');
});
test('boot without swap: conflict still asks', async () => {
  let asked = 0; const o = cloudOpts({ saveId: 'b', savedAt: 1 }, { saveId: 'a', savedAt: 5 }, { ask: async () => { asked++; return 'device'; } });
  await bootCloudSave(o); assert.equal(asked, 1);
});
test('main.js wiring: cloud check and uploads use the cloud slot key, gate re-checked per save', () => {
  const src = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(src, /key:\s*slotPlan\.cloudKey/); assert.match(src, /mayUpload\(readMeta\(slotLs\), store\.key\)/); assert.match(src, /new SaveStore\(saveStorage, slotPlan\.activeKey\)/);
});
test('text JSON has the save slot strings', () => {
  const j = JSON.parse(fs.readFileSync(new URL('../text/overworld_lines.json', import.meta.url), 'utf8')).system_save_slots;
  for (const k of ['pick_new', 'pick_load', 'cloud', 'device', 'overwrite_q', 'make_cloud', 'swap_q', 'swap_done']) assert.ok(j[k], k);
  assert.deepEqual(Object.keys(j.title), ['continue', 'new_game', 'load_game']);
});
test('play time: carried over loads, gaps capped at 90 s', async () => {
  const { SaveStore, SAVE_VERSION } = await import('../src/overworld/save.js');
  const st = mem({ k: JSON.stringify({ v: SAVE_VERSION, flags: [], saveId: 'x', systems: { playMs: 3723000 } }) });
  const s = new SaveStore(st, 'k'); s.load(); assert.equal(s._playBase, 3723000);
  s._tick = Date.now() - 600000; s.save({ flags: [], party: [], systems: { a: 1 } });
  const ms = JSON.parse(st.getItem('k')).systems.playMs; assert.ok(ms >= 3723000 + 90000 && ms < 3723000 + 91000, String(ms));
  assert.equal(JSON.parse(st.getItem('k')).systems.a, 1);
});
