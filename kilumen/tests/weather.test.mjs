// Weather v1 tests: node --test tests/weather.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { areaType, rollWeather, weatherFor, blockOf, encWeight, extraSlots, encRate, fishMods, normaliseWeather, wxMatch, particleCap, CHANCES, MODS, KINDS } from '../src/weather/logic.js';
import { pickSlot, slotOk, EncounterRoller } from '../src/battle/encounters.js';
import { biteChance, planCast, effectiveWeight, expectedPer100 } from '../src/fishing/logic.js';
import { normalise, freshSave } from '../src/overworld/save.js';

const seq = (a) => { let i = 0; return () => a[i++ % a.length]; };
const elOf = (id) => ({ rillop: ['water'], gloamtick: ['dark', 'ghost'], burlbeetle: ['bug'], puddlenip: ['water', 'rain'], mirewump: ['water', 'swamp'] }[id] || []);

test('area types and weather sets', () => {
  assert.equal(areaType('frostspire_pass'), 'snowy'); assert.equal(areaType('mirefen_bog'), 'swamp'); assert.equal(areaType('route1_storm'), 'temperate');
  for (const [a, rows] of Object.entries(CHANCES)) for (const r of Object.values(rows)) assert.ok(Math.abs(Object.values(r).reduce((x, y) => x + y, 0) - 1) < 1e-9, a);
  const snowKinds = new Set(), tempKinds = new Set();
  for (let b = 0; b < 4000; b++) { snowKinds.add(rollWeather(3, 'snowy', b)); tempKinds.add(rollWeather(3, 'temperate', b)); }
  assert.deepEqual([...snowKinds].sort(), ['blizzard', 'ice_fog', 'snow_light']); // never rain in snow areas
  assert.ok(!tempKinds.has('blizzard') && tempKinds.has('fog') && tempKinds.has('storm'));
});
test('weather changes over game time, deterministic per seed, indoor clear, storm variant', () => {
  assert.equal(blockOf({ day: 1, min: 0 }), 0); assert.equal(blockOf({ day: 2, min: 180 }), 9);
  const ks = new Set(); for (let d = 1; d < 30; d++) for (let m = 0; m < 1440; m += 180) ks.add(weatherFor({ seed: 11 }, 'route1', { day: d, min: m }));
  assert.ok(ks.size >= 4);
  assert.equal(weatherFor({ seed: 11 }, 'route1', { day: 4, min: 600 }), weatherFor({ seed: 11 }, 'route1', { day: 4, min: 620 }));
  assert.equal(weatherFor({ seed: 11 }, 'house_1f', { day: 1, min: 0 }, false), 'clear');
  assert.equal(weatherFor({ seed: 11 }, 'route1_storm', { day: 1, min: 0 }), 'storm');
  assert.equal(weatherFor({ seed: 11, override: { snowy: 'blizzard' } }, 'frostspire', { day: 1, min: 0 }), 'blizzard');
});
test('dawn makes fog more likely', () => {
  let dawn = 0, day = 0; for (let d = 0; d < 3000; d++) { if (rollWeather(5, 'temperate', d * 8 + 1) === 'fog') dawn++; if (rollWeather(5, 'temperate', d * 8 + 4) === 'fog') day++; }
  assert.ok(dawn > day * 2, `${dawn} vs ${day}`);
});
test('encounter weights: rain boosts water, fog boosts ghost, slot data field, groups', () => {
  assert.equal(encWeight({ species: 'rillop', weight: 10 }, 'rain_heavy', elOf), 18);
  assert.equal(encWeight({ species: 'gloamtick', weight: 10 }, 'fog', elOf), 16);
  assert.equal(encWeight({ species: 'burlbeetle', weight: 10 }, 'storm', elOf), 10);
  assert.equal(encWeight({ species: 'burlbeetle', weight: 10, weather: { rain: 3 } }, 'rain_light', elOf), 30);
  assert.equal(encWeight({ species: 'burlbeetle', weight: 10, weather: { rain: 3 } }, 'clear', elOf), 10);
  assert.ok(wxMatch(['rain'], 'storm') && wxMatch(['fog'], 'ice_fog') && !wxMatch(['rain'], 'blizzard'));
  assert.ok(!slotOk({ weather: ['rain'] }, { weather: 'clear' }) && slotOk({ weather: ['rain'] }, { weather: 'rain_light' }) && slotOk({ weather: { rain: 2 } }, { weather: 'clear' }));
  assert.equal(encRate('fog'), 1.15); assert.equal(encRate('clear'), 1);
});
test('weather-only species join grass tables only, in their weather', () => {
  const zone = { method: 'grass', slots: [{ species: 'burlbeetle', weight: 30, level: [2, 4] }, { species: 'rillop', weight: 10, level: [3, 6] }] };
  assert.deepEqual(extraSlots(zone, 'clear', 'temperate'), []);
  const ex = extraSlots(zone, 'rain_heavy', 'temperate'); assert.deepEqual(ex.map((s) => s.species), ['puddlenip']); assert.deepEqual(ex[0].level, [2, 6]);
  assert.ok(extraSlots(zone, 'rain_heavy', 'swamp').some((s) => s.species === 'pondkin'));
  assert.deepEqual(extraSlots({ ...zone, method: 'water (Tideglide)' }, 'storm', 'temperate'), []);
  assert.deepEqual(extraSlots(zone, 'blizzard', 'snowy').map((s) => s.species), ['snowcairn', 'rimewick']);
  assert.deepEqual(extraSlots(zone, 'storm', 'temperate', (id) => id !== 'drizzlebill').map((s) => s.species), ['puddlenip']);
  // roller picks: with wxOn the rain-only species can appear; without it never
  const seen = new Set(), off = new Set();
  for (let i = 0; i < 400; i++) { seen.add(pickSlot(zone, { weather: 'storm', wxOn: true, elOf, area: 'temperate' }, Math.random)?.species); off.add(pickSlot(zone, { weather: 'storm' }, Math.random)?.species); }
  assert.ok(seen.has('puddlenip')); assert.ok(!off.has('puddlenip'));
  // rate: fog raises the step chance (still capped)
  const ro = new EncounterRoller({ zones: { z: { method: 'grass', rate: 0.1, maps: ['m'], slots: zone.slots } } }, { graceSteps: 0, rng: seq([0.105, 0.0]) });
  assert.equal(ro.step('m', [], 1, 1, 1, { weather: 'clear' }), null);
  const ro2 = new EncounterRoller({ zones: { z: { method: 'grass', rate: 0.1, maps: ['m'], slots: zone.slots } } }, { graceSteps: 0, rng: seq([0.105, 0.0, 0.5]) });
  assert.ok(ro2.step('m', [], 1, 1, 1, { weather: 'fog', wxOn: true, elOf }));
});
test('fishing: rain raises bite + rare, fog = rarer but slower, clear unchanged', () => {
  const tables = { rods: { basic: { bite: 0.6 } }, bite_clamp: [0.05, 0.95], species_el: { a: ['water'], b: ['water'] }, maps: { m: { basic: { from: 'x', slots: [{ species: 'a', weight: 90, level: 3 }, { species: 'b', weight: 10, level: 5, rarity: 'rare' }] } } } };
  const rod = { id: 'basic', tier: 1 };
  assert.equal(biteChance(tables, rod, null, fishMods('clear')), 0.6);
  assert.ok(biteChance(tables, rod, null, fishMods('rain_heavy')) > 0.6);
  assert.ok(biteChance(tables, rod, null, fishMods('fog')) < 0.6);
  assert.equal(biteChance(tables, rod, null, { bite: 5 }), 0.95);
  const rare = (wx) => expectedPer100(tables, 'm', rod, null, wx).rare;
  assert.ok(rare(fishMods('storm')) > rare(fishMods('rain_light')) && rare(fishMods('rain_light')) > rare(null));
  assert.ok(rare(fishMods('fog')) / expectedPer100(tables, 'm', rod, null, fishMods('fog')).bites > rare(fishMods('rain_heavy')) / expectedPer100(tables, 'm', rod, null, fishMods('rain_heavy')).bites);
  assert.equal(effectiveWeight({ weight: 10, rarity: 'rare' }, null, null, fishMods('rain_heavy')), 16);
  const r = seq([0.5, 0.1, 0.0, 0.0]); const p0 = planCast(tables, 'm', rod, seq([0.5, 0.1, 0.0, 0.0])), pf = planCast(tables, 'm', rod, r, null, null, fishMods('fog'));
  assert.ok(pf.waitMs > p0.waitMs);
  for (const k of KINDS) assert.ok(MODS[k], k);
});
test('save: weather block normalised, survives the save normaliser', () => {
  const w = normaliseWeather({ seed: 42, override: { snowy: 'blizzard', temperate: 'blizzard', bogus: 'x' } });
  assert.deepEqual(w, { seed: 42, override: { snowy: 'blizzard' } });
  assert.ok(normaliseWeather(null).seed > 0); assert.ok(normaliseWeather({ seed: 'junk' }).seed > 0);
  const s = normalise({ ...freshSave(), systems: { weather: w } });
  assert.deepEqual(s.systems.weather, w);
  assert.deepEqual(JSON.parse(JSON.stringify(s)).systems.weather, w);
});
test('particle caps: phone halves, reduced motion none', () => {
  assert.equal(particleCap('storm', true, false), 130); assert.equal(particleCap('storm', false, true), 0); assert.ok(particleCap('rain_heavy', false, false) <= 280);
});
