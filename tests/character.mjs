// Character layer system tests. node tests/character.mjs
import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as E from '../src/engine.js'; import { D } from '../src/data.js'; import * as C from '../src/character.js'; import * as P from '../src/people.js'; import * as L from '../src/legacy.js'; import * as B from '../src/slice_bridge.js'; import * as H from '../src/slice/index.js';
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
await E.loadData(); const ok = (m) => console.log('  ok -', m);
const root = new URL('../assets/art/characters/', import.meta.url); const get = (p) => fs.readFileSync(new URL(p, root), 'utf8');
console.log('Stage 8: characters');
const CL = D.charLayers; let files = 0;
for (const slot of Object.keys(CL.layers)) for (const l of CL.layers[slot]) { let all = '';
  for (const a of CL.ages) for (const b of (l.perBuild ? CL.builds : ['all'])) { const svg = get(l.file.replace('{age}', a.id).replace('{build}', b)); files++; all += svg; assert.match(svg, /viewBox="0 0 128 128"/); if (a.max >= l.minAge) assert.ok(/<rect /.test(svg), `${slot}/${l.id}/${a.id} empty`); }
  for (const k of l.slots) assert.ok(all.includes(`data-slot="${k}"`) && all.includes(l.defaults[k]), `${slot}/${l.id} slot ${k}`); }
ok(files + ' layer files exist, 128x128, every slot carries its default (slot-svg-v1)');
assert.ok(CL.skins.length >= 6 && CL.ages.length === 5 && CL.builds.length === 3); ok('5 age groups x 3 builds x ' + CL.skins.length + ' skin tones');
const s = E.newGame({ seed: 4, name: 'Pix' }); const rs0 = s.rs; const ch = C.ensure(s); assert.equal(s.rs, rs0); assert.ok(C.saveSize(ch) < 900); ok('character = parts + colors (' + C.saveSize(ch) + ' bytes); engine RNG untouched');
for (const age of [0, 5, 16, 40, 80]) { const svg = C.compose(ch, age, get); assert.ok(svg.startsWith('<svg') && svg.includes('data-layer="body:base"') && svg.includes('--slot-skin:' + ch.skin) && svg.includes('data-layer="eyes:eyes"')); } ok('compose renders every age group with recolored layers');
{ const c2 = JSON.parse(JSON.stringify(ch)); c2.parts.facial = { id: 'beard', c: { hair: '#222222' } }; assert.ok(!C.compose(c2, 8, get).includes('facial:beard') && C.compose(c2, 30, get).includes('facial:beard')); const a1 = C.compose(c2, 30, get), a2 = C.compose({ ...c2, skin: CL.skins.find((x) => x !== c2.skin) }, 30, get); assert.notEqual(a1, a2); ok('age gates layers (no beard on a child); recolor changes the picture'); }
// wardrobe: buying clothes unlocks layers
s.age = 30; s.cash = 5e6; B.slice(s); assert.ok(!C.equip(s, 'top', 'blazer').ok && /Buy/.test(C.equip(s, 'top', 'blazer').msg)); assert.ok(C.equip(s, 'top', 'tank').ok); 
const shop = H.listShops(B.sliceData()).find((x) => x.category === 'clothing'); assert.ok(shop, 'clothing shop'); const lst = B.call(s, (d, sl) => H.listListings(d, sl, shop.id)); const blazer = lst.find((l) => l.tpl === 'blazer') || lst.find((l) => CL.clothingMap[l.tpl] && !CL.free.includes(CL.clothingMap[l.tpl])); assert.ok(blazer, 'a premium clothing listing');
const r = B.call(s, (d, sl) => H.buyAsset(d, sl, shop.id, blazer.uid, { financing: 'cash' })); assert.ok(r.ok, r.msg); const lid = CL.clothingMap[blazer.tpl];
assert.ok(C.unlockedIds(s).has(lid)); assert.ok(C.equip(s, C.EDIT_SLOTS.find((sl) => CL.layers[sl].some((l) => l.id === lid)), lid).ok); assert.ok(C.ownedColors(s, lid).vseed != null); ok('buying ' + blazer.name + ' unlocks layer ' + lid + ' (colors come from the owned item)');
assert.ok(!C.equip(s, 'hat', 'cowboy_hat').ok && C.equip(s, 'hat', 'beanie').ok && C.equip(s, 'hat', null).ok); s.age = 2; assert.ok(!C.equip(s, 'facial', 'beard').ok); ok('locked layers and age limits are refused; free layers and removal work');
// inheritance of looks
{ const w = E.newGame({ seed: 9, name: 'Parent' }); w.age = 40; const par = C.ensure(w); const sp = P.newPerson(w, 'spouse', { age: 38 }); sp.look = C.newChar('spouse-x'); w.people = [sp]; const kids = []; for (let i = 0; i < 6; i++) { const k = P.newPerson(w, 'child', { age: 5 + i }); k.otherParent = sp.id; w.people.push(k); kids.push(C.lookOf(w, k)); }
  for (const k of kids) { assert.ok([par.parts.hair.c.hair, sp.look.parts.hair.c.hair].includes(k.parts.hair.c.hair), 'hair color from a parent'); assert.ok([par.eye, sp.look.eye].includes(k.eye), 'eye color from a parent'); } assert.deepEqual(C.lookOf(w, w.people[1]), kids[0]); ok('kids inherit hair and eye color from a parent (stable once generated)'); }
// heir continues with their own look
{ const w = E.newGame({ seed: 10, name: 'Elder' }); w.age = 60; w.cash = 1e6; w.people = []; const kid = P.newPerson(w, 'child', { age: 30 }); w.people.push(kid); const look = JSON.parse(JSON.stringify(C.lookOf(w, kid))); L.die(w, 'disease', 'test'); assert.ok(L.continueAs(w, kid.id)); assert.deepEqual(w.char.parts.hair, look.parts.hair); assert.equal(w.char.eye, look.eye); assert.equal(w.char.skin, look.skin); ok('heir takes over their own look when you continue'); }
console.log('CHARACTER TESTS PASSED');
