// Living world (cloud shadows + ambient life): pure-logic checks. Run: node --test tests/living.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { isIndoorOrCave, cloudAlphaFor, cloudLevel, periodicFbm, cloudLevels, WEATHER, CLOUD_ALPHA_DAY } from '../src/overworld/living.js';

test('indoor rule covers every interior/cave prefix, not outdoor maps', () => {
  for (const m of ['heal_brookhollow', 'home_brookhollow_a', 'lab_brookhollow', 'house_1f', 'shop_int', 'greystone_b1', 'rt_branch_backroom', 'station_int', 'fernwick_hall_int'])
    assert.equal(isIndoorOrCave(m), true, m);
  for (const m of ['brookhollow', 'route1', 'route1_storm', 'fernwick', 'lantern_rest', 'thornwood', 'mirefen_bog'])
    assert.equal(isIndoorOrCave(m), false, m);
});

test('cloud alpha: full by day, lighter dawn/dusk, none at night, in 1/8 steps', () => {
  const at = (h) => cloudAlphaFor(h * 60);
  assert.equal(at(12), CLOUD_ALPHA_DAY);
  assert.ok(at(6.5) > 0 && at(6.5) < CLOUD_ALPHA_DAY);
  assert.ok(at(18) > 0 && at(18) < CLOUD_ALPHA_DAY);
  assert.equal(at(22), 0); assert.equal(at(2), 0);
  const seen = new Set(); for (let m = 0; m < 1440; m += 0.5) seen.add(cloudAlphaFor(m));
  assert.ok(seen.size <= 9, `alpha levels ${[...seen]}`);
  for (let m = 0; m < 1440; m++) assert.ok(cloudLevel(m) >= 0 && cloudLevel(m) <= 1);
});

test('cloud mask: deterministic, wraps seamlessly, coverage follows weather', () => {
  const W = 128, a = periodicFbm(W, W, 42), b = periodicFbm(W, W, 42);
  assert.deepEqual(a, b);
  let edge = 0, inner = 0; // wrap: the jump across the seam is no bigger than a normal neighbour step
  for (let y = 0; y < W; y++) { edge = Math.max(edge, Math.abs(a[y * W] - a[y * W + W - 1])); inner = Math.max(inner, Math.abs(a[y * W + 1] - a[y * W])); }
  assert.ok(edge < inner * 3 + 0.05, `seam ${edge} vs ${inner}`);
  const cov = (c) => cloudLevels(a, c).filter((l) => l > 0).length / a.length;
  assert.equal(cov(WEATHER.clear.coverage), 0);
  assert.ok(Math.abs(cov(WEATHER.fair.coverage) - WEATHER.fair.coverage) < 0.05);
  assert.ok(cov(WEATHER.overcast.coverage) > cov(WEATHER.fair.coverage));
});
