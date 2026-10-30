// Day / night encounters + night wild levels + Tideglide water tables (Coder, Oct 30 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { TAG, FILES, liveZone } from '../tools/encounters/tod_spread.mjs';
import { pickSlot, slotOk, nightLevel, todOf, speciesTimes, surfZoneFor, EncounterRoller } from '../src/battle/encounters.js';

const read = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const wired = read(FILES.wired), src = read(FILES.source);
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test('every live table has 2-3 night-only and 1-2 day-only species at the table range', () => {
  for (const data of [wired, src]) for (const [id, z] of Object.entries(data.zones)) {
    if (!liveZone(z)) continue;
    const tod = z.slots.filter((s) => s.spread === TAG);
    const n = tod.filter((s) => s.tod === 'night'), d = tod.filter((s) => s.tod === 'day');
    assert.ok(n.length >= 2 && n.length <= 3, `${id} night ${n.length}`);
    assert.ok(d.length >= 1 && d.length <= 2, `${id} day ${d.length}`);
    for (const s of n) assert.deepEqual(s.time, ['night'], id);
    for (const s of d) assert.ok(!s.time.includes('night'), id);
    const own = z.slots.filter((s) => s.spread !== TAG).map((s) => [].concat(s.level));
    const lo = Math.min(...own.map((l) => l[0])), hi = Math.max(...own.map((l) => l[l.length - 1]));
    for (const s of tod) assert.ok(s.level[0] >= lo && s.level[1] <= hi, `${id} ${s.species}`);
  }
});

test('night-only species never roll by day, day-only never at night', () => {
  for (const z of Object.values(wired.zones).filter(liveZone)) {
    for (let i = 0; i < 40; i++) {
      const r = i / 40;
      for (const phase of ['dawn', 'day', 'dusk']) { const h = pickSlot(z, { phase }, () => r); if (h) assert.notEqual(h.slot.tod, 'night'); }
      const h = pickSlot(z, { phase: 'night' }, () => r); if (h) assert.notEqual(h.slot.tod, 'day');
    }
  }
  assert.equal(slotOk({ time: ['night'] }, { phase: 'day' }), false);
});

test('tod_spread --check is fresh', () => {
  execFileSync('node', [new URL('../tools/encounters/tod_spread.mjs', import.meta.url).pathname, '--check']);
});

test('night wild levels: +2 or +3, capped at 68, nothing by day', () => {
  assert.equal(nightLevel(10, 'day', () => 0.9), 10);
  assert.equal(nightLevel(10, 'dusk', () => 0.9), 10);
  const got = new Set([0, 0.3, 0.6, 0.99].map((r) => nightLevel(10, 'night', () => r)));
  assert.deepEqual([...got].sort(), [12, 13]);
  assert.equal(nightLevel(67, 'night', () => 0.9), 68);
  assert.equal(nightLevel(68, 'night', () => 0.1), 68);
  const zone = { slots: [{ species: 'x', weight: 1, level: [20, 20] }] };
  for (let i = 0; i < 20; i++) { const lv = pickSlot(zone, { phase: 'night' }).level; assert.ok(lv === 22 || lv === 23, String(lv)); }
  assert.equal(pickSlot(zone, { phase: 'day' }).level, 20);
});

test('time bands + index times', () => {
  assert.equal(todOf('dawn'), 'morning'); assert.equal(todOf('dusk'), 'day'); assert.equal(todOf('night'), 'night');
  const t = speciesTimes(wired);
  const nightOnly = Object.entries(t).filter(([, v]) => v === 'night');
  assert.ok(nightOnly.length > 0);
});

test('Tideglide: surf tables roll on water', () => {
  const z = surfZoneFor(wired, 'saltmere');
  assert.ok(z && /^water/.test(z.zone.method));
  const ro = new EncounterRoller(wired, { rate: 1 }); ro.grace = 0; ro.rng = seq(0, 0.5);
  const hit = ro.stepWater('saltmere', 1, 1, { phase: 'day' });
  assert.ok(hit && hit.table === z.id);
});
