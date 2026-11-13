// Kilumen: property tests for saves (libs pass, Oct 22, 2026). fast-check (MIT, devDependency) generates random saves.
//   - any v2 save survives save -> load unchanged (apart from savedAt)
//   - normalise is idempotent
//   - any real v1 save (written by the old v1 module, tests/fixtures/save_v1.mjs) loads as v2 with nothing lost
//   - the IndexedDB backend (save_backend.js) picks the newer copy, migrates localStorage once and falls back
// Run: node --test tests/save_props.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { SaveStore, normalise, migrate, SAVE_VERSION, SAVE_KEY, V2_BLOCKS } from '../src/overworld/save.js';
import * as V1 from './fixtures/save_v1.mjs';
import { openSaveStorage, MIGRATED_KEY } from '../src/overworld/save_backend.js';

const RUNS = { numRuns: 300 };
const memStore = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

// ---- arbitraries (made-up ids only; no real game data) ----
const id = fc.stringMatching(/^[a-z][a-z0-9_]{0,11}$/);
const nat = fc.nat({ max: 1e6 });
const clock = fc.record({ day: fc.integer({ min: 0, max: 5000 }), min: fc.integer({ min: -3000, max: 3000 }) });
const pos = fc.option(fc.record({ map: id, x: fc.integer({ min: 0, max: 200 }), y: fc.integer({ min: 0, max: 200 }), facing: fc.constantFrom('up', 'down', 'left', 'right') }), { nil: null });
const door = fc.option(fc.record({ map: id, x: fc.integer({ min: 0, max: 200 }), y: fc.integer({ min: 0, max: 200 }) }), { nil: null });
const common = {
  flags: fc.array(id, { maxLength: 30 }),
  counters: fc.dictionary(id, fc.oneof(nat, fc.double({ noNaN: true, min: -50, max: 50 }))),
  seen: fc.dictionary(fc.stringMatching(/^[a-z_]{1,8}#[a-z_]{1,8}$/), fc.constant(true)),
  seenDay: fc.dictionary(fc.stringMatching(/^[a-z_]{1,8}#[a-z_]{1,8}$/), fc.integer({ min: 0, max: 999 })),
  clock, pos, lastDoor: door,
};
const v1Member = fc.record({ species: id, nickname: fc.option(fc.string({ maxLength: 12 }), { nil: null }), warmth: fc.oneof(fc.integer({ min: -20, max: 140 }), fc.double({ noNaN: true })), rt: fc.option(id, { nil: null }) });
const v1State = fc.record({ ...common, party: fc.array(v1Member, { maxLength: 6 }) });
const v2Member = fc.record({
  species: id, nickname: fc.option(fc.string({ maxLength: 12 }), { nil: null }), warmth: fc.integer({ min: 0, max: 100 }), rt: fc.option(id, { nil: null }),
  level: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }), xp: nat, held: fc.option(id, { nil: null }), locked: fc.boolean(), variant: fc.option(id, { nil: null }),
}, { requiredKeys: ['species'] });
const v2Raw = fc.record({
  ...common,
  v: fc.constant(2), saveId: fc.stringMatching(/^k[a-z0-9]{4,14}$/), savedAt: nat,
  party: fc.array(v2Member, { maxLength: 6 }),
  coins: fc.oneof(nat, fc.double({ noNaN: true, min: -10, max: 10 })),
  bag: fc.dictionary(id, fc.integer({ min: -3, max: 999 })),
  archive: fc.record({ boxes: fc.array(fc.array(fc.option(id, { nil: null }), { maxLength: 5 }), { maxLength: 3 }) }),
  kilindex: fc.record({ seen: fc.dictionary(id, fc.constant(1)), caught: fc.dictionary(id, fc.integer({ min: 1, max: 9 })) }, { requiredKeys: [] }),
  tasks: fc.record({ boardWeek: nat, done: nat, side: fc.array(id, { maxLength: 4 }) }, { requiredKeys: [] }),
  company: fc.record({ idLevel: fc.integer({ min: 1, max: 30 }), pointsFree: nat, board: fc.dictionary(id, fc.integer({ min: 0, max: 5 })) }, { requiredKeys: [] }),
}, { requiredKeys: ['v', 'flags'] });

const withoutSavedAt = ({ savedAt, ...rest }) => rest;

test('normalise is idempotent on any v2 save', () => {
  fc.assert(fc.property(v2Raw, (raw) => {
    const a = normalise(JSON.parse(JSON.stringify(raw)));
    assert.equal(a.v, SAVE_VERSION);
    assert.deepEqual(normalise(JSON.parse(JSON.stringify(a))), a);
  }), RUNS);
});

test('any v2 save survives save -> load (only savedAt changes)', () => {
  fc.assert(fc.property(v2Raw, (raw) => {
    const st = memStore(), store = new SaveStore(st);
    const n = normalise(JSON.parse(JSON.stringify(raw)));
    assert.equal(store.save(n), true, store.lastError);
    const back = new SaveStore(st).load();
    assert.ok(back.savedAt > 0);
    assert.deepEqual(withoutSavedAt(back), withoutSavedAt(n));
    // a second save keeps the first as the backup, and the backup loads too
    assert.equal(store.save(n), true);
    st.m.set(SAVE_KEY, '{broken');
    const fromBak = new SaveStore(st);
    assert.deepEqual(withoutSavedAt(fromBak.load()), withoutSavedAt(n));
    assert.equal(fromBak.loadedFrom, SAVE_KEY + '.bak');
  }), RUNS);
});

test('any real v1 save loads as v2 with nothing lost (and main + .bak agree on the saveId)', () => {
  fc.assert(fc.property(v1State, (state) => {
    const st = memStore();
    const old = new V1.SaveStore(st, SAVE_KEY);
    assert.equal(old.save(state), true, old.lastError);
    assert.equal(old.save(state), true); // so there is a .bak too
    const v1 = old.load();
    const raw = JSON.parse(st.getItem(SAVE_KEY));
    assert.equal(raw.v, 1);

    const store = new SaveStore(st);
    const s = store.load();
    assert.equal(s.v, 2);
    for (const k of ['flags', 'counters', 'seen', 'seenDay', 'clock', 'pos', 'lastDoor', 'savedAt']) assert.deepEqual(s[k], v1[k], k);
    assert.equal(s.party.length, v1.party.length);
    s.party.forEach((c, i) => {
      for (const k of ['species', 'nickname', 'warmth', 'rt']) assert.deepEqual(c[k], v1.party[i][k], `party[${i}].${k}`);
      assert.equal(c.uid, `${s.saveId}-p${i}`);
      assert.equal(s.kilindex.seen[c.species], 1);
    });
    assert.equal(new Set(s.party.map((c) => c.uid)).size, s.party.length, 'uids unique');
    assert.match(s.saveId, /^k[0-9a-z]+$/);
    for (const k of V2_BLOCKS) assert.ok(k in s, k);
    // deterministic: loading again (or from the backup, which holds the same v1 state) gives the same id
    assert.equal(new SaveStore(st).load().saveId, s.saveId);
    st.m.set(SAVE_KEY, 'nope');
    const bak = new SaveStore(st).load();
    assert.equal(bak.v, 2);
  }), RUNS);
});

test('after a v1 load, the overworld (which does not know the v2 blocks) saves without losing them', () => {
  fc.assert(fc.property(v1State, fc.array(id, { maxLength: 4 }), (state, more) => {
    const st = memStore();
    new V1.SaveStore(st, SAVE_KEY).save(state);
    const store = new SaveStore(st);
    const s = store.load();
    // what the overworld passes to save(): only the v1-era fields
    const owState = { flags: [...s.flags, ...more], counters: s.counters, seen: s.seen, seenDay: s.seenDay, clock: s.clock, party: s.party, pos: s.pos, lastDoor: s.lastDoor };
    assert.equal(store.save(owState), true, store.lastError);
    const again = new SaveStore(st).load();
    for (const k of V2_BLOCKS) assert.deepEqual(again[k], s[k], k);
    assert.deepEqual(again.flags, [...new Set([...s.flags, ...more])]);
  }), RUNS);
});

test('a party member added in play gets a uid that sticks', () => {
  const st = memStore(), store = new SaveStore(st);
  const party = [{ species: 'mossling', warmth: 10 }];
  store.save({ flags: [], party });
  assert.match(party[0].uid, /^k/);
  assert.equal(new SaveStore(st).load().party[0].uid, party[0].uid);
});

test('migrate rejects missing, future and non-integer versions', () => {
  for (const v of [undefined, 0, 3, 1.5, '1', null]) assert.throws(() => migrate({ v, flags: [] }));
  assert.equal(migrate({ v: 1, flags: [] }).v, 2);
});

// ---- IndexedDB backend with a fake idb-keyval ----
function fakeIdb(init = {}, { hang = false, fail = false } = {}) {
  const m = new Map(Object.entries(init));
  return {
    m,
    getMany: (ks) => (hang ? new Promise(() => {}) : fail ? Promise.reject(new Error('denied')) : Promise.resolve(ks.map((k) => m.get(k)))),
    setMany: async (es) => { for (const [k, v] of es) m.set(k, v); },
    set: async (k, v) => { m.set(k, v); },
    del: async (k) => { m.delete(k); },
    get: async (k) => m.get(k),
  };
}
const keys = [SAVE_KEY, SAVE_KEY + '.bak'];
const saveJson = (t) => JSON.stringify({ v: 2, flags: [], savedAt: t });

test('backend: for each key the newer copy wins; localStorage copies only once into IndexedDB', async () => {
  await fc.assert(fc.asyncProperty(
    fc.option(fc.integer({ min: 1, max: 1e6 }), { nil: null }), fc.option(fc.integer({ min: 1, max: 1e6 }), { nil: null }), fc.boolean(),
    async (tIdb, tLs, marked) => {
      const idb = fakeIdb({ ...(tIdb ? { [SAVE_KEY]: saveJson(tIdb) } : {}), ...(marked ? { [MIGRATED_KEY]: 'x' } : {}) });
      const ls = memStore(); if (tLs) ls.setItem(SAVE_KEY, saveJson(tLs));
      const s = await openSaveStorage({ idb, local: ls, keys });
      assert.equal(s.backend, 'indexeddb');
      const lsWins = !!tLs && (!tIdb || tLs > tIdb); // a tie keeps the IndexedDB copy
      const want = lsWins ? tLs : tIdb;
      assert.equal(s.getItem(SAVE_KEY), want ? saveJson(want) : null);
      if (want) assert.equal(idb.m.get(SAVE_KEY), saveJson(want), 'IndexedDB holds the winner');
      assert.ok(idb.m.has(MIGRATED_KEY));
      assert.equal(s.migrated, !marked && lsWins);
    }), { numRuns: 200 });
});

test('backend: writes go to memory, the localStorage mirror and (after flush) IndexedDB, and SaveStore works on top', async () => {
  const idb = fakeIdb(), ls = memStore();
  const s = await openSaveStorage({ idb, local: ls, keys });
  const store = new SaveStore(s);
  assert.equal(store.save({ flags: ['met_mira'] }), true);
  assert.deepEqual(store.load().flags, ['met_mira']);
  assert.equal(ls.getItem(SAVE_KEY), s.getItem(SAVE_KEY));
  await s.flush();
  assert.equal(idb.m.get(SAVE_KEY), s.getItem(SAVE_KEY));
  store.clear(); await s.flush();
  assert.equal(idb.m.has(SAVE_KEY), false); assert.equal(ls.getItem(SAVE_KEY), null);
});

test('backend: IndexedDB that fails or never answers falls back to localStorage', async () => {
  const ls = memStore(); ls.setItem(SAVE_KEY, saveJson(5));
  const a = await openSaveStorage({ idb: fakeIdb({}, { fail: true }), local: ls, keys });
  assert.equal(a.backend, 'localStorage'); assert.match(a.lastError, /denied/); assert.equal(a.getItem(SAVE_KEY), saveJson(5));
  const b = await openSaveStorage({ idb: fakeIdb({}, { hang: true }), local: ls, keys, timeoutMs: 30 });
  assert.equal(b.backend, 'localStorage'); assert.match(b.lastError, /no answer/);
  assert.equal(await openSaveStorage({ idb: null, local: null, keys }), null);
});
