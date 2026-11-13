// Area name sign (Gary, Oct 23 2026 10:33 AM CT): outdoor towns/routes (+ named caves) after the fade-in, ~2 s hold,
// no re-show on an edge bounce within ~5 s or when stepping out of a building into the same town.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AreaSignTracker, areaName, signable, REENTRY_MS, HOLD_MS } from '../src/overworld/area_sign.js';
import { Overworld } from '../src/overworld/overworld.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAPS = path.join(ROOT, 'art/world/overworld/maps');
const load = (n) => { const json = JSON.parse(fs.readFileSync(path.join(MAPS, n + '.json'), 'utf8')); return { name: n, json, title: json.title || n }; };
const BLOCKED = /\b(PP|shiny|super effective|Pok[eé]dex|Pok[eé] ?Ball|nurse|weed)\b/i;

test('area sign: outdoor maps sign, interiors never, caves only with a display name', () => {
  for (const n of ['brookhollow', 'route1', 'fernwick', 'thornwood', 'greystone_entrance']) assert.ok(signable(load(n)), n);
  for (const n of ['house_1f', 'house_2f', 'lab_brookhollow', 'office_int', 'heal_fernwick', 'club_int', 'home_brookhollow_a']) {
    if (fs.existsSync(path.join(MAPS, n + '.json'))) assert.equal(signable(load(n)), false, n);
  }
  assert.equal(signable({ name: 'greystone_b2', json: { name: 'greystone_b2' } }), false, 'unnamed cave');
});

test('area sign: names come from the map title without dev markers; every region-1 name is clean', () => {
  assert.equal(areaName(load('brookhollow')).title, 'Brookhollow');
  assert.equal(areaName(load('route1')).title, 'Route 1 - Sunmeadow Fields');
  assert.equal(areaName({ name: 'aurelith', json: { title: 'DRAFT - Aurelith (rail city)' } }).title, 'Aurelith');
  assert.equal(areaName(load('fernwick'), (k) => (k === 'maps.fernwick.area_name' ? 'Fernwick Town' : null)).title, 'Fernwick Town', 'a text line wins');
  for (const f of fs.readdirSync(MAPS).filter((f) => f.endsWith('.json'))) {
    const m = load(f.slice(0, -5)); if (!signable(m)) continue;
    const t = areaName(m).title; assert.ok(t, `${m.name} has a name`);
    assert.doesNotMatch(t, /DRAFT|TODO|_/, m.name); assert.doesNotMatch(t, BLOCKED, m.name); assert.ok(t.length <= 32, `${m.name} fits: ${t}`);
  }
});

test('area sign: new map shows, edge bounce within 5 s does not, after 5 s it does; leaving a building does not', () => {
  const tr = new AreaSignTracker(), bh = load('brookhollow'), r1 = load('route1'), home = load('home_brookhollow_a');
  assert.equal(tr.enter(bh, 0), 'Brookhollow');
  assert.equal(tr.enter(home, 1000), null, 'interior');
  assert.equal(tr.enter(bh, 9000), null, 'back out of the house into the same town');
  assert.equal(tr.enter(r1, 10000), 'Route 1 - Sunmeadow Fields');
  assert.equal(tr.enter(bh, 12000), null, 'bounce back within 5 s');
  assert.equal(tr.enter(r1, 13000), null, 'and forth again');
  assert.equal(tr.enter(bh, 13000 + REENTRY_MS + 1), 'Brookhollow', 'after 5 s it shows again');
  assert.equal(HOLD_MS, 2000);
});

test('area sign: overworld queues it at map entry and shows it only once the fade-in has ended', () => {
  const s = Object.create(Overworld.prototype);
  Object.assign(s, { tick: 0, log: [], player: { locked: true }, text: () => null });
  const seen = []; s.onAreaSign = (a) => seen.push(a);
  s.map = load('route1'); s.fade = { phase: 'in', t: 0 };
  s._areaSignEnter();
  for (let i = 0; i < 3; i++) { s._stepFade(); s.tick++; }
  assert.equal(seen.length, 0, 'not during the fade');
  for (let i = 0; i < 400 && seen.length === 0; i++) { s._stepFade(); s.tick++; }
  assert.equal(s.fade, null); assert.equal(seen.length, 1); assert.equal(seen[0].title, 'Route 1 - Sunmeadow Fields'); assert.equal(seen[0].holdMs, 2000);
  for (let i = 0; i < 10; i++) s._stepFade();
  assert.equal(seen.length, 1, 'once');
});

test('area sign: per-profile sizing vars exist (pc + phone landscape)', () => {
  for (const p of ['pc', 'mobile']) {
    const v = JSON.parse(fs.readFileSync(path.join(ROOT, `src/platform/${p}.json`), 'utf8')).ui.vars;
    assert.ok(v['banner-max'] && v['banner-font'], p);
  }
  assert.match(fs.readFileSync(path.join(ROOT, 'src/ui/ui.js'), 'utf8'), /_fitBanner\(\)/, 'kept clear of the top-right pills');
});
