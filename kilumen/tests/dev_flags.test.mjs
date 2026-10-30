import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FLAG_PRESETS, setBadges, setFlagByName, applyPreset } from '../src/dev/flags.js';
import { coinCount } from '../src/overworld/lines.js';
const scene = () => { const s = { flags: new Set(), calls: [] }; s.setFlag = (f, on = true) => { s.calls.push(f); on ? s.flags.add(f) : s.flags.delete(f); }; return s; };

test('dev flags: badges 0-8 by hall order, clamped', () => {
  const s = scene();
  setBadges(s, 3); assert.equal(coinCount(s.flags), 3); assert.ok(s.flags.has('beat_master_revival') && !s.flags.has('beat_master_frostspire'));
  setBadges(s, 99); assert.equal(coinCount(s.flags), 8);
  setBadges(s, 1); assert.deepEqual([...s.flags].filter((f) => f.startsWith('beat_master_')), ['beat_master_fernwick']);
});
test('dev flags: set / clear by name via scene.setFlag; bad names refused', () => {
  const s = scene();
  assert.ok(setFlagByName(s, ' fin_released ').ok); assert.ok(s.flags.has('fin_released'));
  assert.ok(setFlagByName(s, 'fin_released', false).ok); assert.ok(!s.flags.has('fin_released'));
  assert.equal(setFlagByName(s, 'bad name!').ok, false); assert.equal(setFlagByName(s, '').ok, false);
});
test('dev flags: presets all_badges, tower_healed', () => {
  const s = scene();
  assert.ok(applyPreset(s, 'all_badges').ok); assert.equal(coinCount(s.flags), 8);
  assert.ok(applyPreset(s, 'tower_healed').ok); assert.ok(s.flags.has('tower_healed'));
  assert.ok(applyPreset(s, 'no_badges').ok); assert.equal(coinCount(s.flags), 0);
  assert.equal(applyPreset(s, 'nope').ok, false); assert.ok(FLAG_PRESETS.all_badges && FLAG_PRESETS.tower_healed);
});
test('dev flags: tab lives only in the gated console (no player import)', () => {
  const src = fs.readFileSync(new URL('../src/dev/console.js', import.meta.url), 'utf8');
  assert.match(src, /\['flags', 'Flags'\]/);
  for (const f of ['src/ui/ui.js', 'src/alpha.js', 'src/overworld/overworld.js']) assert.doesNotMatch(fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'), /dev\/flags/, f);
  assert.match(fs.readFileSync(new URL('../src/dev/devgate.js', import.meta.url), 'utf8'), /admin/);
});
