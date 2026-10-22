// Passions: a full meter (100) masters, frees the slot and unlocks +2 slots (no mastery cap); popup card; old capped saves migrate.
import * as E from '../src/engine.js'; import assert from 'node:assert/strict';
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
await E.loadData(); const Pa = E.Passions;
const mk = () => { const s = E.newGame({ seed: 3 }); s.age = 30; s.school = null; s.acted = {}; s.pending = []; return s; };
let s = mk(); const base = Pa.status(s).baseSlots; const sl = (x) => Pa.status(x).baseSlots + 2 * Pa.status(x).mastered.length; Pa.pick(s, 'music'); let g = 0; while (!Pa.isMastered(s, 'music') && g++ < 60) { s.acted = {}; Pa.practice(s, 'music'); }
assert.ok(Pa.isMastered(s, 'music'), 'meter reaches 100 and masters'); assert.equal(Pa.status(s).active.length, 0); assert.equal(Pa.status(s).slots, sl(s), '+2 slots per mastery'); assert.ok(Pa.status(s).mastered.length >= 1);
assert.equal(s.pending[0].kind, 'passion_mastered'); const c = E.pendingCard(s); assert.match(c.text, /2 new passion slots/); const r = E.resolveCard(s, 0); assert.ok(r.openPicker);
// many masteries: no cap, slots keep growing
const ids = Pa.status(s).available.map((x) => x.id); for (const id of ids.slice(0, 5)) { Pa.pick(s, id); g = 0; while (!Pa.isMastered(s, id) && g++ < 80) { s.acted = {}; Pa.practice(s, id); } s.pending = []; }
assert.ok(Pa.status(s).mastered.length >= 6, 'past the old cap of 4'); assert.equal(Pa.status(s).slots, sl(s));
for (const id of Pa.status(s).available.map((x) => x.id).slice(0, Math.min(Pa.status(s).slots, Pa.status(s).available.length))) assert.ok(Pa.pick(s, id).ok, 'extra slots usable');
// old save: 4 masteries + a capped meter -> becomes a mastery, slots granted
s = mk(); const all = Pa.status(s).available.map((x) => x.id); for (const id of all.slice(0, 4)) Pa.ensure(s).mastered.push({ id, age: 20, title: 't' }); s.passions.active.push({ id: all[4], meter: 100, capped: true, since: 20 });
const st = Pa.status(s); assert.ok(st.mastered.length >= 5 && st.mastered.some((m) => m.id === all[4])); assert.equal(st.slots, sl(s)); assert.ok(!st.active.some((a) => a.id === all[4]));
console.log('passions_full: PASS');
