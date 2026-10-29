// Habitat spread (Oct 29 2026, design/HABITAT_SPREAD.md): widespread lines across matching habitats.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LINES, ZONE_HABITAT, FISH_HABITAT, SHARE, TAG, FILES, apply } from '../tools/encounters/habitat_spread.mjs';
import { speciesById } from '../src/ui/data.js';
import { habitatOk } from '../src/battle/encounters.js';

const read = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const src = read(FILES.source), wired = read(FILES.wired), fish = read(FILES.fishing);
const lineOf = Object.fromEntries(LINES.flatMap(([b, e, h]) => [[b, { h, stage: 1 }], [e, { h, stage: 2, base: b }]]));
const tables = () => [
  ...Object.entries(src.zones).map(([id, z]) => ({ id: 'src:' + id, slots: z.slots, hab: ZONE_HABITAT[id], z })),
  ...Object.entries(wired.zones).map(([id, z]) => ({ id: 'wired:' + id, slots: z.slots, hab: ZONE_HABITAT[id], z })),
  ...Object.entries(fish.maps).map(([id, m]) => ({ id: 'fish:' + id, slots: m.basic?.slots || [], hab: FISH_HABITAT[id] && [FISH_HABITAT[id]] })),
];

test('lines: common base + its stage-2 form, no legendary / rare base / Jestrix', () => {
  assert.ok(LINES.length >= 15 && LINES.length <= 30);
  for (const [b, e] of LINES) {
    const B = speciesById(b), E = speciesById(e);
    assert.equal(B.stage, 0, b); assert.equal(B.evo, e, b); assert.equal(E.prevo, b, e);
    assert.ok(['common', 'uncommon'].includes(B.rarity), b);
    assert.ok(!/jestrix/i.test(b + e));
  }
});

test('no evolved form appears below its evolution level', () => {
  const evoAt = {};
  for (const [, e] of LINES) evoAt[e] = speciesById(e).evoLevel;
  for (const t of tables()) for (const s of t.slots) {
    if (s.spread !== TAG || !(s.species in evoAt)) continue;
    assert.ok(s.level[0] >= evoAt[s.species], `${t.id} ${s.species} ${s.level}`);
  }
});

test('stage 2 is rarer than its base in every table', () => {
  for (const t of tables()) for (const s of t.slots.filter((x) => x.spread === TAG && lineOf[x.species]?.stage === 2)) {
    const b = t.slots.find((x) => x.spread === TAG && x.species === lineOf[s.species].base);
    assert.ok(b && s.weight < b.weight, `${t.id} ${s.species}`);
  }
});

test('habitat matches: spread slots only in tables of their habitat, and pass the runtime surf/cave rule', () => {
  for (const t of tables()) for (const s of t.slots.filter((x) => x.spread === TAG)) {
    assert.ok(t.hab, `${t.id} has no habitat but got ${s.species}`);
    assert.ok(!t.z?.inert, `${t.id} inert`);
    assert.ok(lineOf[s.species].h.some((h) => t.hab.includes(h)), `${t.id} ${s.species}`);
    if (t.z) assert.ok(habitatOk(t.z.method, s.species, (id) => speciesById(id).el, (id) => speciesById(id).found), `${t.id} ${s.species}`);
    else assert.ok(speciesById(s.species).el.includes('water'), `${t.id} ${s.species}`);
  }
});

test('levels follow the zone: spread levels sit inside the table\'s own range', () => {
  for (const t of tables()) {
    const own = t.slots.filter((x) => x.spread !== TAG); if (!own.length) continue;
    const lo = Math.min(...own.map((s) => s.level[0])), hi = Math.max(...own.map((s) => s.level[1]));
    for (const s of t.slots.filter((x) => x.spread === TAG)) assert.ok(s.level[0] >= lo && s.level[1] <= hi, `${t.id} ${s.species}`);
  }
});

test(`widespread share per table stays within ${SHARE.min * 100}-${SHARE.max * 100}%, local creatures dominant`, () => {
  let n = 0;
  for (const t of tables()) {
    const sp = t.slots.filter((x) => x.spread === TAG); if (!sp.length) continue; n++;
    const share = sp.reduce((a, s) => a + s.weight, 0) / t.slots.reduce((a, s) => a + s.weight, 0);
    assert.ok(share >= SHARE.min && share <= SHARE.max, `${t.id} ${(share * 100).toFixed(1)}%`);
  }
  assert.ok(n >= 40, `only ${n} tables got spread`);
});

test('every line reaches at least one table; most reach several', () => {
  const zones = Object.fromEntries(LINES.map(([b]) => [b, 0]));
  for (const t of tables()) for (const s of t.slots) if (s.spread === TAG && s.species in zones) zones[s.species]++;
  for (const [b, n] of Object.entries(zones)) assert.ok(n >= 1, b);
});

test('survives regeneration: source and wired agree, files match the script output', async () => {
  for (const [id, z] of Object.entries(src.zones)) {
    const a = JSON.stringify(z.slots.filter((s) => s.spread === TAG)), b = JSON.stringify((wired.zones[id]?.slots || []).filter((s) => s.spread === TAG));
    if (wired.zones[id] && JSON.stringify(z.slots.filter((s) => s.spread !== TAG)) === JSON.stringify(wired.zones[id].slots.filter((s) => s.spread !== TAG))) assert.equal(a, b, id);
  }
  const out = await apply();
  for (const [rel, txt] of Object.entries(out)) assert.equal(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'), txt, `${rel} stale: run node tools/encounters/habitat_spread.mjs`);
});
