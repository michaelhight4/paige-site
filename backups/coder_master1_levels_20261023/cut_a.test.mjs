// Cut A (Oct 23, 2026, coder): first-catch safety net, one-time WIP notice, authored trainer teams up to Master 1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { catchNet, NET_COUNT, NET_ITEM } from '../src/systems/catch_net.js';
import { attachWipNotice, WIP_FLAG, WIP_TEXT, TRIGGER } from '../src/systems/wip_notice.js';
import { authoredTeam, TRAINER_TEAMS } from '../src/battle/data/trainer_teams.js';

const bag = (n = 0) => ({ c: { [NET_ITEM]: n }, count(id) { return this.c[id] || 0; }, add(id, k) { this.c[id] = (this.c[id] || 0) + k; } });

test('catch net: empty crystal pocket during the test run -> spare crystals, every encounter is a retry', () => {
  const s = { flags: new Set(['test_run_started']), systems: { bag: bag(0) } };
  assert.equal(catchNet(s), NET_COUNT); assert.equal(s.systems.bag.count(NET_ITEM), NET_COUNT);
  assert.equal(catchNet(s), 0, 'no top-up while crystals remain');
  s.systems.bag.c[NET_ITEM] = 0; assert.equal(catchNet(s), NET_COUNT, 'runs out again -> topped up again');
});

test('catch net: no effect before or after the test run', () => {
  assert.equal(catchNet({ flags: new Set(), systems: { bag: bag(0) } }), 0);
  assert.equal(catchNet({ flags: new Set(['test_run_started', 'test_run_done']), systems: { bag: bag(0) } }), 0);
  assert.equal(catchNet({ flags: new Set(['test_run_started']) }), 0, 'no bag -> no crash');
});

function fakeScene(flags = []) {
  const s = { flags: new Set(flags), busy: false, asked: [], lines: null,
    setFlag(f) { this.flags.add(f); },
    async ask(pages, choices) { this.asked.push({ pages, choices }); return 0; },
    async script(fn) { if (this.busy) return; this.busy = true; try { await fn(); } finally { this.busy = false; } } };
  return attachWipNotice(s);
}

test('WIP notice: shown once with OK after the script that beats Master 2; never again', async () => {
  const s = fakeScene();
  await s.script(async () => {}); assert.equal(s.asked.length, 0, 'not before the Master');
  await s.script(async () => { s.setFlag(TRIGGER); });
  assert.equal(s.asked.length, 1); assert.deepEqual(s.asked[0].pages, WIP_TEXT); assert.deepEqual(s.asked[0].choices, ['OK']);
  assert.ok(s.flags.has(WIP_FLAG)); assert.equal(s.busy, false, 'no hard block: input comes back');
  await s.script(async () => {}); assert.equal(s.asked.length, 1, 'shown once');
});

test('WIP notice: old save past Master 2 sees it once; Text Bot line wins over the fallback', async () => {
  const s = fakeScene([TRIGGER]); s.lines = { system: { wip_after_master2: ['A.', 'B.'] } };
  await s.script(async () => {}); assert.deepEqual(s.asked[0].pages, ['A.', 'B.']);
  const done = fakeScene([TRIGGER, WIP_FLAG]); await done.script(async () => {}); assert.equal(done.asked.length, 0);
});

test('WIP notice: trigger is the Master 2 win flag; beating Master 1 alone shows nothing', async () => {
  assert.equal(TRIGGER, 'beat_master_saltmere');
  const s = fakeScene([]);
  await s.script(async () => { s.setFlag('beat_master_fernwick'); });
  assert.equal(s.asked.length, 0, 'no pop-up after Master 1'); assert.ok(!s.flags.has(WIP_FLAG));
  await s.script(async () => { s.setFlag('beat_master_saltmere'); });
  assert.equal(s.asked.length, 1, 'pop-up after Master 2'); assert.ok(s.flags.has(WIP_FLAG));
});

test('authored teams: every trainer up to Master 1 has a team; Ron follows the starter; unknown -> null', () => {
  for (const k of ['route1.trainer_r1_a', 'route1.trainer_r1_b', 'route1.trainer_r1_c', 'fernwick_hall_int.helper_1', 'fernwick_hall_int.helper_2', 'fernwick_hall_int.master_fernwick'])
    assert.ok(TRAINER_TEAMS[k], k);
  const m = authoredTeam({ map: 'fernwick_hall_int', id: 'master_fernwick' }, []);
  assert.ok(m.length >= 2 && m.every((f) => f.species && f.level <= 12));
  const ron = authoredTeam({ map: 'fernwick', id: 'ron_rival_1' }, [{ species: 'cindrip', origin: { how: 'starter' } }]);
  assert.ok(ron.some((f) => f.species === 'rillop'), 'Ron picks the starter strong against yours');
  assert.equal(authoredTeam({ map: 'nowhere', id: 'x' }, []), null);
});

// ---- padded maps: old saves (Gary, Oct 23 2026, 10:25 AM CT) -------------------------------------------------------
import { readFileSync, readdirSync } from 'node:fs';
import { GameMap } from '../src/overworld/map.js';
import { normalise, freshSave, POS_FRAME, PAD_SINCE } from '../src/overworld/save.js';
import { migratePos, migrateDoor } from '../src/overworld/pad_migrate.js';
const MAPDIR = new URL('../art/world/overworld/maps/', import.meta.url);
const mapJson = (n) => JSON.parse(readFileSync(new URL(n + '.json', MAPDIR)));

test('old saves: no frame + saved before the padding -> unpadded; new saves are padded', () => {
  const base = { ...freshSave(), pos: { map: 'brookhollow', x: 6, y: 20, facing: 'down' } };
  delete base.frame;
  assert.equal(normalise({ ...base, savedAt: PAD_SINCE - 1 }).frame, 'unpadded');
  assert.equal(normalise({ ...base, savedAt: 0 }).frame, 'unpadded');
  assert.equal(normalise({ ...base, savedAt: PAD_SINCE + 1 }).frame, POS_FRAME);
  assert.equal(normalise({ ...base, frame: POS_FRAME, savedAt: 0 }).frame, POS_FRAME);
  assert.equal(normalise(freshSave()).frame, POS_FRAME);
});

test('old saves: every walkable unpadded tile on a padded map loads on a walkable padded tile, same place', () => {
  let n = 0;
  for (const f of readdirSync(MAPDIR).filter((f) => f.endsWith('.json'))) {
    const j = JSON.parse(readFileSync(new URL(f, MAPDIR))); if (!j.padding) continue;
    const m = new GameMap(j), [ow, oh] = j.padding.old_size;
    for (let y = 0; y < oh; y += 3) for (let x = 0; x < ow; x += 3) {
      const p = migratePos(m, { map: j.name, x, y, facing: 'down' });
      assert.ok(m.isWalkable(p.x, p.y), `${j.name} ${x},${y} -> ${p.x},${p.y}`);
      if (m.isWalkable(x + j.padding.dx, y + j.padding.dy) && !m.warpAt(x + j.padding.dx, y + j.padding.dy) && !m.npcAt(x + j.padding.dx, y + j.padding.dy))
        assert.deepEqual([p.x, p.y], [x + j.padding.dx, y + j.padding.dy]);
      n++;
    }
  }
  assert.ok(n > 500, 'checked ' + n);
  const bh = mapJson('brookhollow');
  assert.deepEqual(migrateDoor(bh, { map: 'brookhollow', x: 16, y: 27 }), { map: 'brookhollow', x: 28, y: 34 }, 'lab door ($return)');
  assert.ok(bh.warps.some((w) => w.x === 28 && w.y === 34 && w.to === 'lab_brookhollow'));
});

test('padded maps: every door warp into an outdoor map lands next to its door, entered_from doors exist', () => {
  const all = Object.fromEntries(readdirSync(MAPDIR).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), JSON.parse(readFileSync(new URL(f, MAPDIR)))]));
  for (const [n, m] of Object.entries(all)) {
    for (const w of m.warps || []) {
      const B = all[w.to]; if (!B?.padding || !Number.isInteger(w.tx)) continue;
      const doors = (B.warps || []).filter((d) => d.to === n);
      if (n === 'greystone_entrance' || !doors.length) continue; // side tunnel lands two tiles in (by design)
      assert.ok(doors.some((d) => Math.abs(d.x - w.tx) + Math.abs(d.y - w.ty) <= 1), `${n} -> ${w.to} (${w.tx},${w.ty})`);
    }
    for (const e of m.entered_from || []) if (all[e.map]?.padding) assert.ok(all[e.map].warps.some((d) => d.x === e.door[0] && d.y === e.door[1]), `${n} entered_from ${e.map}`);
  }
});

test('padded frame: blackout return doors and the dev start sit on the padded maps', async () => {
  const fs = await import('node:fs');
  const { GameMap } = await import('../src/overworld/map.js');
  const rd = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
  const shops = rd('../src/systems/data/shops.json'), ts = rd('../art/world/overworld/tileset.json');
  for (const [id, b] of Object.entries(shops.branches)) {
    if (!b.returnDoor) continue;
    const j = rd(`../art/world/overworld/maps/${b.returnDoor.map}.json`);
    assert.ok((j.warps || []).some((w) => w.to === id && w.x === b.returnDoor.x && w.y === b.returnDoor.y), `${id} returnDoor is the town's door into it`);
  }
  const { CONFIG: config } = await import('../src/config.js');
  const m = new GameMap(rd(`../art/world/overworld/maps/${config.start.map}.json`), ts);
  assert.ok(m.isWalkable(config.start.x, config.start.y), 'config.start walkable');
});
