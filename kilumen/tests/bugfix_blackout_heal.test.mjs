// Bug fix Oct 30 2026: a blackout respawns at the last-visited Heal Centre (then the nearest, then Brookhollow).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadShopsData } from '../src/systems/shop.js?v=v0.2.108-alpha';
import { Heal, nearestBranch, visitPoint, branchByMap } from '../src/systems/heal.js';

const layout = JSON.parse(fs.readFileSync(new URL('../art/world/overworld/world_layout.json', import.meta.url), 'utf8'));
const zoneOf = (sc) => () => { const zs = layout.zones.filter((z) => z.maps.includes(sc.map?.name)); return zs.length <= 1 ? zs[0]?.id || null : (zs.find((z) => z.maps.includes(sc.lastDoor?.map)) || zs[0]).id; };
const mk = (map, lastDoor = null) => { const sc = { map: { name: map }, lastDoor, layout }; sc.zone = zoneOf(sc); return { scene: sc, state: { lastHeal: null } }; };

test('blackout: no heal yet -> branch in the current town, else nearest on the world map, else Brookhollow', async () => {
  await loadShopsData();
  assert.equal(new Heal(mk('cindervale')).lastHeal().map, 'heal_cindervale');
  assert.equal(nearestBranch('mirefen', layout).id, 'heal_revival'); // closest branch to Mirefen
  assert.equal(nearestBranch(null, layout).id, 'heal_brookhollow');
  assert.equal(new Heal({ scene: null, state: {} }).lastHeal().map, 'heal_brookhollow');
});
test('blackout: entering a heal centre records it; the shared interior keeps the town you came from', async () => {
  await loadShopsData();
  const s = mk('heal_brookhollow', { map: 'mirefen', x: 15, y: 21 });
  const h = new Heal(s);
  assert.ok(h.onEnterMap({ name: 'heal_brookhollow' }));
  const p = h.lastHeal();
  assert.equal(p.map, 'heal_brookhollow'); assert.equal(p.zone, 'mirefen'); assert.deepEqual(p.returnDoor, { map: 'mirefen', x: 15, y: 21 });
  assert.equal(h.onEnterMap({ name: 'mirefen' }), false); assert.equal(h.lastHeal().zone, 'mirefen');
  const own = visitPoint(branchByMap('heal_fernwick'), { map: { name: 'heal_fernwick' }, lastDoor: { map: 'fernwick', x: 17, y: 13 } });
  assert.equal(own.zone, 'fernwick'); assert.equal(own.returnDoor.map, 'fernwick');
});

// Playtest fix Oct 30 2026 (timed log bug 1): early losses respawned at heal_cairnfold (Wellspire is nearest on the map).
test('blackout: never respawns at an unreached branch (route1 loss with no heal yet -> Brookhollow, not Cairnfold)', async () => {
  await loadShopsData();
  const s = mk('route1'); s.scene.flags = new Set();
  assert.equal(new Heal(s).lastHeal().map, 'heal_brookhollow');
  // an old save that stored Cairnfold from that bug falls back too
  s.state.lastHeal = { branch: 'heal_cairnfold', map: 'heal_cairnfold', x: 6, y: 5, zone: 'wellspire', returnDoor: { map: 'r9_cairnfold', x: 15, y: 25 } };
  assert.equal(new Heal(s).lastHeal().map, 'heal_brookhollow');
  // walking into Revival Heights marks its branch reached: a hall loss there comes back to Revival
  const h = new Heal(s); s.state.lastHeal = null; h.onEnterMap({ name: 'revival_heights' });
  s.scene.map = { name: 'route_revival_saltmere' };
  assert.equal(new Heal(s).lastHeal().map, 'heal_brookhollow'); // no zone, no map pos: default
  s.scene.map = { name: 'revival_hall_int' };
  assert.equal(new Heal(s).lastHeal().map, 'heal_revival');
  // a real visit to Cairnfold's branch is kept
  s.state.reachedBranches.push('heal_cairnfold'); s.state.lastHeal = { branch: 'heal_cairnfold', map: 'heal_cairnfold', x: 6, y: 5, zone: 'wellspire', returnDoor: { map: 'r9_cairnfold', x: 15, y: 25 } };
  assert.equal(new Heal(s).lastHeal().map, 'heal_cairnfold');
});
