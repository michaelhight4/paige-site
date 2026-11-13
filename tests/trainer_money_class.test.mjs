// Money bug fix (Oct 29, 2026, Gary 2:48 AM CT: "fix money bug"): Master and Ron ids written as
// <map>_master / <map>_ron_N used to fall through to trainerMoney.default (40 x L).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
const src = fs.readFileSync(new URL('../src/systems/index.js', import.meta.url), 'utf8');
const body = src.match(/trainerClassOf\(def = \{\}\) \{([\s\S]*?)\n  \}/)[1];
const trainerClassOf = new Function('def = {}', body);
const shops = JSON.parse(fs.readFileSync(new URL('../src/systems/data/shops.json', import.meta.url), 'utf8'));
const pay = (id, L) => (shops.trainerMoney.classes[trainerClassOf({ id })] ?? shops.trainerMoney.default) * L;
test('hall masters are class master (120 x L)', () => {
  for (const id of ['master_fernwick', 'saltmere_hall_int_master', 'revival_hall_int_master', 'frostspire_hall_int_master']) assert.equal(trainerClassOf({ id }), 'master', id);
  assert.equal(pay('saltmere_hall_int_master', 18), 120 * 18);
});
test('rivals are class ron (60 x L)', () => {
  for (const id of ['ron_rival_1', 'saltmere_ron_2', 'revival_heights_ron_3', 'x_ron_4']) assert.equal(trainerClassOf({ id }), 'ron', id);
  assert.equal(pay('revival_heights_ron_3', 23), 60 * 23);
});
test('ordinary trainers stay default; explicit class wins', () => {
  for (const id of ['trainer_r1_d', 'route_east_trainer_1', 'saltmere_hall_int_h1', 'mastery_kid', 'baron_x']) assert.equal(trainerClassOf({ id }), null, id);
  assert.equal(trainerClassOf({ id: 'saltmere_ron_2', class: 'kid' }), 'kid');
});
