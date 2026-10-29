// dev/regions-5-8 (Oct 29 2026): WD r78 caves (wd/regions78 f3ff6197), SIGNAL crate beat, no chimney smoke, quest HUD spot.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { zoneAt, biomeFor } from '../src/battle/encounters.js';
import { attachRegion78, signalKey, SIGNAL_FLAG, SIGNAL_SPOT } from '../src/region78/index.js';
import { CHIMNEY_SMOKE } from '../src/overworld/living.js';
const J = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const MAP = (n) => J(`art/world/overworld/maps/${n}.json`);
const CAVES = { lanternport_grotto: ['lanternport', 'lanternport_grotto_cave', [39, 13]], cindervale_caldera: ['cindervale', 'cindervale_caldera_cave', [38, 13]] };

for (const [cave, [town, table, [dx, dy]]] of Object.entries(CAVES)) test(`${cave}: linked to ${town}, table ${table} resolves`, () => {
  const m = MAP(cave), t = MAP(town), enc = J('data/encounters_wired.json'), art = new Set(enc.species_with_art);
  assert.ok(t.warps.some((w) => w.to === cave && w.x === dx && w.y === dy), 'town door');
  assert.ok(m.warps.every((w) => w.to === town));
  const r = m.encounter_zones.find((z) => z.table === table);
  const hit = zoneAt(enc, cave, m.encounter_zones, r.x0, r.y0, 0);
  assert.equal(hit?.id, table);
  assert.ok(hit.zone.slots.length && hit.zone.slots.every((s) => art.has(s.species)));
  assert.equal(biomeFor(hit.zone.method, cave, table), 'cave');
});

test('cave text: WD spot ids listed for Text Bot; town signs wired', () => {
  const md = fs.readFileSync(new URL('../data/textbot_cave_spots_r78.md', import.meta.url), 'utf8');
  const L = J('text/overworld_lines.json').maps;
  for (const c of Object.keys(CAVES)) {
    const m = MAP(c);
    for (const o of [...m.npcs, ...m.signs, ...m.interact_spots]) assert.ok(md.includes('`' + o.id + '`'), o.id);
  }
  assert.ok(L.lanternport.lanternport_lanternport_grotto_sign.pages.length);
  assert.ok(L.cindervale.cindervale_cindervale_caldera_sign.pages.length);
});

test('SIGNAL crate: first look sets the flag, later looks use the again key', async () => {
  assert.ok(MAP('lanternport_grotto').interact_spots.some((s) => s.id === SIGNAL_SPOT));
  const flags = new Set(), said = [];
  const scene = { flags, lines: {}, map: { name: 'lanternport_grotto' }, setFlag: (f) => flags.add(f), say: async (p) => said.push(p.join(' ')) };
  const api = attachRegion78(scene, {});
  assert.equal(await api.runSpot({ id: 'lanternport_grotto_nets' }), false);
  assert.equal(signalKey(flags), 'system_story_r78.signal_crate_first');
  assert.equal(await api.runSpot({ id: SIGNAL_SPOT }), true);
  assert.ok(flags.has(SIGNAL_FLAG)); assert.equal(signalKey(flags), 'system_story_r78.signal_crate_again');
  await api.runSpot({ id: SIGNAL_SPOT }); api.stop();
  assert.ok(said[0].includes('signal_crate_first') && said[1].includes('signal_crate_again'));
});

test('no-smoke rule: chimney puffs off', () => { assert.equal(CHIMNEY_SMOKE, false); });

test('quest HUD: not in the top-left corner on PC or phone', () => {
  const s = fs.readFileSync(new URL('../src/progression/index.js', import.meta.url), 'utf8');
  const pos = /const pos = mobile \? '([^']+)'\s*: '([^']+)'/.exec(s);
  for (const p of [pos[1], pos[2]]) { assert.ok(p.includes('left:50%') && p.includes('translateX(-50%)')); assert.ok(!/left:1[06]px/.test(p)); }
});
