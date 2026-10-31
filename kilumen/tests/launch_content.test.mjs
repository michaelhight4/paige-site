// launch-content (Oct 31 2026): 35 new R6-R8 Kilu wired, 5 uncatchables obtainable, R7 cap, Kilindex 308, 8-town Olympics.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SPECIES } from '../src/ui/data.js';
import { VENUES, TOWN_VENUES, SIGNATURE, doorOpen, wonFlag } from '../src/sports/olympics.js';
const SP = Array.isArray(SPECIES) ? SPECIES : Object.values(SPECIES);
const wired = JSON.parse(fs.readFileSync(new URL('../data/encounters_wired.json', import.meta.url)));
const zones = wired.zones || wired;
const slots = Object.entries(zones).flatMap(([z, v]) => (v.slots || v.table || (Array.isArray(v) ? v : [])).map((s) => ({ z, ...s })));
const NEW = SP.filter((s) => s.newR678);
test('Kilindex has 308 species, 35 new R6-R8 Kilu', () => { assert.equal(SP.length, 308); assert.equal(NEW.length, 35); });
test('every new Kilu has sprites and is found wild or by evolving', () => {
  const wild = new Set(slots.map((s) => s.species || s.id));
  for (const s of NEW) {
    assert.ok(fs.existsSync(new URL(`../art/characters/pixel/creatures/${s.id}/base/meta.json`, import.meta.url)), s.id);
    const pre = SP.find((x) => x.id === s.prevo);
    assert.ok(wild.has(s.id) || (pre && wild.has(pre.id)) || (pre && SP.some((x) => x.id === pre.prevo && wild.has(x.id))), `${s.id} unobtainable`);
  }
});
test('the five old uncatchables are in wild tables', () => {
  const wild = new Set(slots.map((s) => s.species || s.id));
  for (const id of ['cinderwyrm', 'clinkerback', 'emberseraph', 'hearthkit', 'lanternkeep']) assert.ok(wild.has(id), id);
});
test('Lanternport (R7) wild levels stay at 60 or below', () => {
  for (const s of slots.filter((x) => /lanternport/.test(x.z))) assert.ok(s.level[1] <= 60, `${s.z} ${s.species}`);
});
test('Olympics: 8 tournament towns, one distinct signature each, 3 events, door after the hall', () => {
  assert.equal(TOWN_VENUES.length, 8);
  assert.equal(new Set(Object.values(SIGNATURE)).size, 8);
  for (const v of [...TOWN_VENUES, 'aurelith']) assert.equal(VENUES[v].length, 3);
  assert.ok(!doorOpen('mirefen', new Set()) && doorOpen('mirefen', new Set(['beat_master_mirefen'])));
  assert.ok(doorOpen('tidewater', new Set(['beat_master_tidewater'])));
  assert.ok(doorOpen('aurelith', new Set(TOWN_VENUES.map(wonFlag))));
  for (const [map, id] of [['mirefen', 'mirefen_oly_host'], ['tidewater_coast', 'tidewater_oly_host']]) {
    const m = JSON.parse(fs.readFileSync(new URL(`../art/world/overworld/maps/${map}.json`, import.meta.url)));
    const n = m.npcs.find((x) => x.id === id); assert.ok(n, id); assert.equal(m.layers.collision[n.y][n.x], 0);
  }
});
