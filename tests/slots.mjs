// Save slots, legacy migration, start flow and character creation (headless). node tests/slots.mjs
import assert from 'node:assert/strict';
const store = new Map(); globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); } };
import * as E from '../src/engine.js';
import * as Char from '../src/character.js';
import { EngineAdapter } from '../src/engine_adapter.js';
const ok = (m) => console.log('  ok -', m);
console.log('Save slots + creation');
await E.loadData();
// --- migration of the old single save into slot 1
const old = E.newGame({ seed: 11, name: 'Olga' }); old.age = 33;
store.set('lifesim.save.v2', JSON.stringify(old));
let a = new EngineAdapter({ startFlow: true }); await a.init();
assert.equal(a.getStartState().mode, 'play'); assert.equal(a.s.name.split(' ')[0], 'Olga'); assert.equal(a.slot, 1);
assert.ok(!store.has('lifesim.save.v2'), 'legacy key removed'); assert.ok(store.has('lifesim.slot.1')); assert.equal(E.lastSlot(), 1);
ok('existing single save migrates into slot 1 and auto-loads');
// --- slot 2 is independent
const r = a.startLife(2, { first: 'Zed', last: 'Quill', gender: 'm', country: 'jp', seed: 5, look: { skin: '#8d5524', eye: '#2f8f5b', build: 'broad', hair: 'mohawk', hairColor: '#c0392b', facial: 'beard' } });
assert.ok(r.ok); a.save();
let sl = a.getSlots(); assert.equal(sl.length, 2); assert.ok(!sl[0].empty && !sl[1].empty); assert.equal(sl[1].name, 'Zed Quill'); assert.equal(sl[0].name.split(' ')[0], 'Olga');
assert.equal(E.lastSlot(), 2); assert.equal(sl[1].last, true);
ok('2 slots hold different lives; last played remembered');
// --- relaunch loads the last slot (2)
a = new EngineAdapter({ startFlow: true }); await a.init(); assert.equal(a.s.first, 'Zed'); assert.equal(a.slot, 2);
const c = a.s.char; assert.equal(c.build, 'broad'); assert.equal(c.skin, '#8d5524'); assert.equal(c.eye, '#2f8f5b'); assert.equal(c.parts.hair.id, 'mohawk'); assert.equal(c.parts.hair.c.hair, '#c0392b'); assert.equal(c.parts.facial.id, 'beard'); assert.equal(a.s.country, 'jp'); assert.equal(a.s.gender, 'm');
ok('creation choices persist (name, country, gender, build, skin, hair, eyes, facial)');
// --- switching slot and saving does not touch the other
assert.ok(a.loadSlot(1).ok); a.s.cash = 12345; a.save(); assert.equal(E.lastSlot(), 1);
assert.equal(JSON.parse(store.get('lifesim.slot.2')).first, 'Zed'); assert.equal(JSON.parse(store.get('lifesim.slot.1')).cash, 12345);
ok('switching slots keeps lives separate');
// --- overwrite
a.startLife(1, { first: 'New', last: 'Person' }); a.save(); assert.equal(JSON.parse(store.get('lifesim.slot.1')).first, 'New'); assert.equal(JSON.parse(store.get('lifesim.slot.2')).first, 'Zed');
ok('new life overwrites only the chosen slot');
// --- no save => create mode; fresh/nosave keep working
store.clear(); a = new EngineAdapter({ startFlow: true }); await a.init(); assert.equal(a.s, null); assert.equal(a.getStartState().mode, 'create');
ok('no save shows character creation');
a = new EngineAdapter({ startFlow: true, noSave: true }); await a.init(); assert.equal(a.getStartState().mode, 'create'); a.startLife(1, { first: 'T' }); a.save(); assert.ok(!store.has('lifesim.slot.1'), 'nosave writes nothing');
a = new EngineAdapter({ fresh: true, seed: 3 }); await a.init(); assert.ok(a.s && a.getStartState().mode === 'play');
ok('?fresh and ?nosave still work');
// only slot 2 saved and no last pointer => lifeline
store.clear(); const o2 = E.newGame({ seed: 4 }); E.save(o2, 2); store.delete('lifesim.lastSlot'); store.delete('lifesim.slot.1');
a = new EngineAdapter({ startFlow: true }); await a.init(); assert.equal(a.s, null); assert.equal(a.getStartState().mode, 'lifeline');
ok('saves without a last-played slot open the Lifeline screen');
// --- character creator unit checks
const L = (await import('../src/data.js')).D.charLayers;
const ch = Char.createChar('k', { skin: L.skins[1], eye: L.eyeColors[2], build: 'slim', hair: 'afro', hairColor: L.hairColors[3], facial: 'goatee' });
assert.equal(ch.parts.hair.id, 'afro'); assert.equal(ch.parts.facial.id, 'goatee'); assert.equal(ch.build, 'slim');
const bad = Char.createChar('k', { skin: 'nope', build: 'huge', hair: 'zzz', facial: 'zzz' }); assert.ok(L.skins.includes(bad.skin) && L.builds.includes(bad.build) && bad.parts.facial == null);
const pv = a.getPreviewLook({ hair: 'bun', facial: 'beard' }); assert.ok(pv.layers.some((l) => l.slot === 'hair' && l.id === 'bun') && pv.layers.some((l) => l.slot === 'facial'));
const o = a.getCreatorOptions(); assert.ok(o.countries.length >= 10 && o.hairs.length >= 10 && o.facials.length >= 5 && o.skins.length >= 6);
ok('createChar validates input; preview + options');
console.log('SLOTS PASS');
