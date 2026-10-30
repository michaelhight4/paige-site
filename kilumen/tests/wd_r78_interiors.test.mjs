// dev/regions-5-8 (Oct 29 2026): WD wd/regions78 2d514221 merge checks (marts, heal branches, rail stations, signs, tv/couch).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { RAIL, stationFor, isStation } from '../src/rail/index.js';
import { Systems } from '../src/systems/index.js';
const J = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const MAP = (n) => J(`art/world/overworld/maps/${n}.json`);

test('unique marts: clerk talk opens the shop only in maps marked mart', async () => {
  for (const [kind, want] of [['mart', true], [undefined, false]]) {
    let opened = 0;
    const self = { scene: { map: { json: { interior_kind: kind } }, say: async () => {} }, heal: {}, openShop: async () => { opened++; } };
    const r = await Systems.prototype.onTalk.call(self, { mapName: 'shop_lanternport', def: { id: 'shop_lanternport_clerk', variant_of: 'clerk' }, entry: { pages: ['Hi'] } });
    assert.equal(r, want); assert.equal(opened, want ? 1 : 0);
  }
  for (const n of ['shop_lanternport', 'shop_cindervale']) {
    const m = MAP(n); assert.equal(m.interior_kind, 'mart');
    assert.ok([...(m.npcs || []), ...(m.text_pending?.npcs || [])].some((d) => d.id === `${n}_clerk` && d.variant_of === 'clerk'));
  }
  const src = fs.readFileSync(new URL('../src/overworld/overworld.js', import.meta.url), 'utf8');
  assert.ok(src.includes('(!d.variant_of || !ids.has(d.variant_of))'), 'own-mart clerks are placed once they have lines');
});

test('heal branches: every returnDoor is the town door into that branch', () => {
  const B = J('src/systems/data/shops.json').branches;
  for (const [id, b] of Object.entries(B)) {
    const town = MAP(b.returnDoor.map), h = MAP(id);
    assert.ok(town.warps.some((w) => w.to === id && w.x === b.returnDoor.x && w.y === b.returnDoor.y), id);
    assert.equal(h.layers.collision[b.stand.y][b.stand.x], 0, id + ' stand');
  }
});

test('rail: per-town station interiors, shared station_int by default', () => {
  assert.equal(stationFor('lanternport').map, 'station_int');
  const R = { ...RAIL, interiors: { lanternport: { map: 'station_lanternport' } } };
  assert.equal(stationFor('lanternport', R).map, 'station_lanternport'); assert.equal(stationFor('cindervale', R).map, 'station_int');
  assert.ok(isStation('station_lanternport', R) && isStation('station_int', R) && !isStation('lanternport', R));
});

test('mouth signs: renamed ids point at Text Bot keys that exist', () => {
  const L = J('text/overworld_lines.json').maps;
  for (const [t, id, key] of [['lanternport', 'lanternport_grotto_sign', 'lanternport_grotto_sign'], ['cindervale', 'cindervale_caldera_sign', 'cindervale_caldera_sign']]) {
    const s = MAP(t).signs.find((x) => x.id === id);
    assert.equal(s.text_ref, `overworld_lines.json maps.${t}.${key}`); assert.ok(L[t][key].pages.length);
  }
});

test('tv/couch check: 0 problems; requests list covers every hidden r78 NPC', () => {
  execFileSync('python3', ['tools/furniture/tv_couch_check.py'], { cwd: new URL('..', import.meta.url) });
  const md = fs.readFileSync(new URL('../data/textbot_requests_r78_interiors.md', import.meta.url), 'utf8');
  for (const id of ['heal_lanternport_carer', 'heal_cindervale_carer', 'shop_lanternport_clerk', 'shop_cindervale_clerk', 'route_fernwick_lanternport_trainer_5']) assert.ok(md.includes('`' + id + '`'), id);
  assert.equal((md.match(/\| townsfolk \|/g) || []).length, 8);
});
