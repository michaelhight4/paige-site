// Save validation with Valibot (src/overworld/save_schema.js) wired into SaveStore. Free tools pass, Oct 23, 2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { SaveStore, SAVE_KEY, freshSave } from '../src/overworld/save.js';
import { checkSave, isLoadableSave } from '../src/overworld/save_schema.js';
import * as V1 from './fixtures/save_v1.mjs';

const memStore = (init = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const BAK = SAVE_KEY + '.bak', BAD = SAVE_KEY + '.bad';
const good = (flags = ['got_starter']) => JSON.stringify({ ...freshSave(), flags, savedAt: 1 });

test('save check: a fresh v2 save and a real v1 save pass with no warnings', () => {
  assert.deepEqual(checkSave(freshSave()), { ok: true, issues: [], warnings: [] });
  const st = memStore(); new V1.SaveStore(st, SAVE_KEY).save({ ...V1.freshSave(), flags: ['a'], party: [{ species: 'rillop', warmth: 40 }] });
  const r = checkSave(st.getItem(SAVE_KEY));
  assert.equal(r.ok, true); assert.deepEqual(r.warnings, []);
});

test('save check: structural corruption is rejected', () => {
  for (const bad of ['{"v":2,"flags":[', 'null', '[]', '"x"', '{"flags":[]}', '{"v":"2","flags":[]}', '{"v":0,"flags":[]}', '{"v":2.5,"flags":[]}',
    '{"v":2,"flags":"got_starter"}', '{"v":2,"flags":[1,2]}', JSON.stringify({ v: 2, flags: ['x'.repeat(201)] }),
    JSON.stringify({ v: 2, flags: Array.from({ length: 5001 }, (_, i) => 'f' + i) })]) {
    assert.equal(checkSave(bad).ok, false, bad.slice(0, 60));
  }
  assert.equal(checkSave('x'.repeat(2_000_001)).ok, false);
});

test('save check: wrong-typed blocks are warnings (normalise repairs them), not rejections', () => {
  const s = { ...freshSave(), party: 'oops', clock: { day: 'x' }, coins: 'lots', bag: { tonic: 'two' } };
  const r = checkSave(s);
  assert.equal(r.ok, true);
  assert.ok(r.warnings.length >= 3, r.warnings.join('; '));
  const st = memStore({ [SAVE_KEY]: JSON.stringify(s) });
  const store = new SaveStore(st);
  const loaded = store.load();
  assert.ok(loaded, 'still loads');
  assert.deepEqual(loaded.party, []); assert.equal(loaded.coins, 0);
  assert.ok(store.lastWarnings.some((w) => w.includes('party')));
});

test('save load: a bad main save falls back to the backup and is kept as .bad', () => {
  const st = memStore({ [SAVE_KEY]: '{"v":2,"flags":"broken"}', [BAK]: good(['from_backup']) });
  const store = new SaveStore(st);
  const s = store.load();
  assert.deepEqual(s.flags, ['from_backup']);
  assert.equal(store.loadedFrom, BAK);
  assert.match(store.lastError, /save check/);
  assert.equal(st.getItem(BAD), '{"v":2,"flags":"broken"}');
});

test('save load: main and backup both bad -> null (new game), nothing thrown', () => {
  const st = memStore({ [SAVE_KEY]: '{"v":2', [BAK]: '{"v":99,"flags":[]}' });
  const store = new SaveStore(st);
  assert.equal(store.load(), null);
  assert.equal(st.getItem(BAD), '{"v":2');
});

test('save write: a bad main save never replaces a good backup', () => {
  const st = memStore({ [SAVE_KEY]: '{"v":2,"flags":[3]}', [BAK]: good(['keep_me']) });
  const store = new SaveStore(st);
  store.load();
  assert.equal(store.save({ ...freshSave(), flags: ['new'] }), true);
  assert.deepEqual(JSON.parse(st.getItem(BAK)).flags, ['keep_me']);
  assert.deepEqual(JSON.parse(st.getItem(SAVE_KEY)).flags, ['new']);
  // the next save backs up the (now good) main as usual
  store.save({ ...freshSave(), flags: ['newer'] });
  assert.deepEqual(JSON.parse(st.getItem(BAK)).flags, ['new']);
  assert.equal(isLoadableSave(st.getItem(BAK)), true);
});

test('save load: random junk never throws and never yields a save with non-string flags (property)', () => {
  fc.assert(fc.property(fc.oneof(fc.string(), fc.json(), fc.jsonValue().map((j) => JSON.stringify({ v: 2, flags: [], ...(typeof j === 'object' && j && !Array.isArray(j) ? j : { junk: j }) }))), (raw) => {
    const store = new SaveStore(memStore({ [SAVE_KEY]: raw }));
    const s = store.load();
    if (s) assert.ok(Array.isArray(s.flags) && s.flags.every((f) => typeof f === 'string'));
  }), { numRuns: 300 });
});
