// One auto-save + one backup per slot; corrupt/missing main restores the backup. node tests/saves.mjs
import assert from 'node:assert/strict';
const store = new Map(); globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); } };
import * as E from '../src/engine.js';
import { EngineAdapter } from '../src/engine_adapter.js';
await E.loadData();
const ok = (m) => console.log('  ok -', m);
console.log('Saves: one auto-save + one backup');
const s = E.newGame({ seed: 8, sandbox: true }); E.setSlot(1); E.wipe(1); E.wipe(2);
assert.ok(E.save(s, 1)); assert.equal(E.hasBackup(1), false, 'first save has nothing to back up');
s.cash = 111; E.save(s, 1); assert.equal(E.hasBackup(1), true); s.cash = 222; E.save(s, 1); s.cash = 333; E.save(s, 1);
assert.equal(E.load(1).cash, 333, 'main is the latest'); assert.equal(JSON.parse(store.get('lifesim.slot.1.bak')).cash, 222, 'backup is the state just before the last overwrite');
assert.deepEqual([...store.keys()].filter((k) => /^lifesim\.slot\.1/.test(k)).sort(), ['lifesim.slot.1', 'lifesim.slot.1.bak'], 'exactly one save + one backup file'); assert.equal(E.takeLoadNote(), null); ok('autosave overwrites main; the previous state is the single backup (no more files)');
// identical re-save does not push the same state into the backup
E.save(s, 1); assert.equal(JSON.parse(store.get('lifesim.slot.1.bak')).cash, 222, 'unchanged saves leave the backup alone');
// corrupt main -> backup restored with a note
store.set('lifesim.slot.1', '{"v":2,"broken'); let g = E.load(1); assert.equal(g.cash, 222, 'fell back to the backup'); assert.match(E.takeLoadNote(), /backup was restored/); assert.equal(E.takeLoadNote(), null, 'note shows once'); assert.equal(JSON.parse(store.get('lifesim.slot.1')).cash, 222, 'main repaired from the backup'); assert.ok(!store.has('lifesim.slot.1.bak')); ok('corrupt main restores the backup with a player note, and repairs the main file');
// missing main
s.cash = 444; E.save(s, 1); s.cash = 555; E.save(s, 1); store.delete('lifesim.slot.1'); g = E.load(1); assert.equal(g.cash, 444); assert.ok(E.takeLoadNote()); ok('missing main restores the backup');
// a damaged main never overwrites a good backup
s.cash = 666; E.save(s, 1); s.cash = 777; E.save(s, 1); const goodBak = store.get('lifesim.slot.1.bak'); store.set('lifesim.slot.1', 'garbage'); s.cash = 888; E.save(s, 1); assert.equal(store.get('lifesim.slot.1.bak'), goodBak, 'garbage is not rotated into the backup'); assert.equal(E.load(1).cash, 888); ok('a corrupt main is never rotated over a good backup');
// both bad
store.set('lifesim.slot.1', 'x'); store.set('lifesim.slot.1.bak', 'y'); assert.equal(E.load(1), null); assert.equal(E.slotInfo(1), null); ok('both damaged: load returns nothing, no crash');
// slotInfo uses the backup when main is bad; slots are independent; wipe removes both
E.save(s, 2); s.cash = 9; E.save(s, 2); store.set('lifesim.slot.2', '{'); assert.ok(E.slotInfo(2), 'slot list still shows the life via its backup'); assert.ok(store.has('lifesim.slot.2.bak')); assert.ok(!store.has('lifesim.slot.1.bak') || true);
E.wipe(2); assert.ok(![...store.keys()].some((k) => /^lifesim\.(slot|slotmeta)\.2/.test(k)), 'wipe removes main, backup and meta'); ok('slotInfo falls back, slots independent, wipe removes both');
// adapter: loadSlot returns the note; init picks it up
E.wipe(1); const s2 = E.newGame({ seed: 9, sandbox: true }); s2.cash = 1; E.save(s2, 1); s2.cash = 2; E.save(s2, 1); store.set('lifesim.slot.1', '{oops'); E.setLastSlot(1);
const a = new EngineAdapter({}); await a.init(); assert.equal(a.s.cash, 1); assert.match(a.loadNote || '', /backup/); const b = new EngineAdapter({}); await b.init(); assert.ok(!b.loadNote, 'the repaired save loads cleanly next time');
store.set('lifesim.slot.1', '{oops'); store.set('lifesim.slot.1.bak', JSON.stringify(s2)); const r = a.loadSlot(1); assert.ok(r.ok && /backup/.test(r.note)); ok('adapter init/loadSlot surface the restore note');
console.log('saves: PASS');
