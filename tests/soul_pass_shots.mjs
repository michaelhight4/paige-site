// Soul pass v1: headless checks + screenshots (dialogue spots, bin stages, time of day, windows, Warmth tint,
// NPC sprites, portraits, footprints, tile seams, all maps + every warp).  node tests/soul_pass_shots.mjs
// Writes shots/soul_pass_v1/*.png and prints PASS/FAIL lines. LOCAL ONLY (unapproved art).
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/soul_pass_v1');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }

const results = []; let failures = 0;
const check = (ok, msg) => { results.push((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const layout = readJson('art/world/overworld/world_layout.json');
const mapJson = (n) => readJson(`art/world/overworld/maps/${n}.json`);
const LEAD = 'lead=rillop&nick=Bubbles&warmth=60';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });

async function open(q) {
  await page.goto(`${base}?save=0&timescale=0&${q}`);
  await page.waitForFunction(() => window.kilumen && window.kilumen.scene);
  await page.evaluate(() => window.kilumen.ready);
  await sleep(250);
}
const st = () => page.evaluate(() => window.kilumen.state());
async function idle() { await page.waitForFunction(() => { const s = window.kilumen.state(); return s.state === 'idle' && !s.fading && !s.busy; }, null, { timeout: 8000 }); }
async function waitDialog() { await page.waitForFunction(() => !!window.kilumen.state().dialog, null, { timeout: 4000 }); await sleep(120); return (await st()).dialog; }
async function closeDialog(key = 'KeyZ') {
  for (let i = 0; i < 30; i++) { const s = await st(); if (!s.dialog && !s.busy) return true; await page.keyboard.down(key); await sleep(50); await page.keyboard.up(key); await sleep(60); }
  return false;
}
const shot = (name, clip) => page.screenshot({ path: path.join(OUT, name + '.png'), ...(clip ? { clip } : {}) });
/** Screen rect of a tile (native coords -> canvas px via camera + zoom). */
const tileRect = (x, y, w = 1, h = 1, pad = 0) => page.evaluate(([x, y, w, h, pad]) => {
  const s = window.kilumen.scene, z = s.zoom, st = s.state(), T = 64 * z;
  const left = (x * 64 - st.cam.x) * z - pad * T, top = (y * 64 - st.cam.y) * z - pad * T;
  return { x: Math.max(0, left), y: Math.max(0, top), width: (w + 2 * pad) * T, height: (h + 2 * pad) * T };
}, [x, y, w, h, pad]);

try {
  // 1. The 14 Text Bot interact spots (windows are separate): stand on the spot's stand cell, face it, press A.
  const lines = readJson('text/overworld_lines.json');
  const spots = [];
  for (const n of layout.maps_built) for (const sp of mapJson(n).interact_spots || []) if (lines.maps[n]?.[sp.id]) spots.push({ map: n, ...sp });
  const plain = spots.filter((s) => !/^window_\d+$/.test(s.id));
  check(plain.length === 14, `14 Text Bot spots with lines in maps (found ${plain.length})`);
  for (const sp of plain) {
    const [sx, sy] = sp.stand;
    if (sp.kind === 'trigger') {
      await open(`map=${sp.map}&x=${sx}&y=${sy}&facing=${sp.face}&phase=dusk&${LEAD}`);
      const d = await page.waitForFunction(() => window.kilumen.state().dialog, null, { timeout: 14000 }).then(() => st().then((s) => s.dialog)).catch(() => null);
      await sleep(150);
      check(!!d, `trigger ${sp.map}.${sp.id} fires (dusk, still 10 s, facing ${sp.face}, water lead): "${d?.text?.slice(0, 60)}"`);
      await shot(`spot_${sp.map}_${sp.id}`);
      await closeDialog();
      continue;
    }
    await open(`map=${sp.map}&x=${sx}&y=${sy}&facing=${sp.face}&flags=beat_master_fernwick&${LEAD}`);
    await page.keyboard.press('KeyZ');
    const d = await waitDialog().catch(() => null);
    check(!!d && d.text.length > 0 && !/\{\w+\}/.test(d.text), `spot ${sp.map}.${sp.id}: "${d?.text?.slice(0, 70)}"`);
    await shot(`spot_${sp.map}_${sp.id}`);
    if (sp.id === 'pc') { // the house_2f PC opens the company inbox
      await page.keyboard.press('KeyZ'); await sleep(200);
      await shot('spot_house_2f_pc_inbox');
    }
    check(await closeDialog(sp.id === 'bed' || sp.id === 'pc' ? 'KeyX' : 'KeyZ'), `spot ${sp.map}.${sp.id} closes`);
  }

  // 2. Windows: all 9 window_N spots, at night; the window tile follows the OUTDOOR phase.
  const wins = spots.filter((s) => /^window_\d+$/.test(s.id));
  check(wins.length === 9, `9 window spots (found ${wins.length})`);
  for (const w of wins) {
    await open(`map=${w.map}&x=${w.stand[0]}&y=${w.stand[1]}&facing=${w.face}&phase=night`);
    const tid = await page.evaluate(([x, y]) => window.kilumen.scene.view().swap?.get?.(window.kilumen.scene.map.tile('decoration', x, y)) ?? null, [w.x, w.y]);
    await page.keyboard.press('KeyZ');
    const d = await waitDialog().catch(() => null);
    check(!!d, `window ${w.map}.${w.id} at night: "${d?.text?.slice(0, 50)}" (tile swapped: ${tid != null})`);
    if (w.map === 'house_1f' && w.id === 'window_1') { await shot('window_night_dialogue'); }
    await closeDialog();
    if (w.map === 'house_1f' && w.id === 'window_1') {
      await shot('window_night_tile_zoom', await tileRect(w.x, w.y, 1, 1, 1));
      await open(`map=${w.map}&x=${w.stand[0]}&y=${w.stand[1]}&facing=${w.face}&phase=day`);
      await shot('window_day_tile_zoom', await tileRect(w.x, w.y, 1, 1, 1));
    }
  }

  // 3. Ron's bin: stages 0, 6 (flies), 8, empty (finale_done).
  const B = mapJson('brookhollow').bin_stages;
  const coins = ['beat_master_fernwick', 'beat_master_saltmere', 'beat_master_revival', 'beat_master_frostspire', 'beat_master_mirefen', 'beat_master_tidewater', 'beat_master_lanternport', 'beat_master_eighth'];
  for (const [tag, flags, want] of [['0', '', 0], ['6', coins.slice(0, 6).join(','), 6], ['8', 'all_badges,' + coins.join(','), 8], ['empty', 'finale_done,all_badges', 'empty']]) {
    await open(`map=brookhollow&x=${B.x - 1}&y=${B.y}&facing=right&flags=${flags}`);
    const s = await st();
    const ov = await page.evaluate(() => window.kilumen.scene.overlays.length);
    check(String(s.binStage) === String(want) && (ov > 0) === (want === 6 || want === 8), `bin stage ${tag}: tile stage ${s.binStage}, flies overlay ${ov > 0}`);
    await page.keyboard.press('KeyZ');
    const d = await waitDialog().catch(() => null);
    check(!!d, `bin stage ${tag} line: "${d?.text?.slice(0, 60)}"`);
    await shot(`bin_stage_${tag}_dialogue`);
    await closeDialog();
    await sleep(200);
    await shot(`bin_stage_${tag}`, await tileRect(B.x, B.y - 1, 1, 2, 1));
  }

  // 4. Time of day: day / dawn / dusk / night outdoors; indoors stays day.
  for (const ph of ['day', 'dawn', 'dusk', 'night']) {
    await open(`map=brookhollow&x=12&y=12&facing=down&phase=${ph}&${LEAD}`);
    const s = await st();
    check(s.phase === ph && s.grade === ph, `brookhollow at ${ph}: grade ${s.grade}`);
    await shot(`tod_${ph}`);
  }
  await open(`map=house_1f&x=5&y=6&facing=up&phase=night`);
  check((await st()).grade === 'day', 'indoors at night keeps the day grade');

  // 5. Warmth: rillop follower at stage 0 vs 3 (mask-only palette swap).
  const px = {};
  for (const w of [0, 100]) {
    await open(`map=brookhollow&x=12&y=12&facing=up&phase=day&lead=rillop&warmth=${w}`);
    await page.keyboard.down('ArrowUp'); await sleep(300); await page.keyboard.up('ArrowUp'); await idle(); await sleep(200);
    const s = await st();
    check(s.follower?.loaded && s.lead.stage === (w ? 3 : 0), `follower rillop warmth ${w} -> stage ${s.lead.stage}`);
    const r = await tileRect(s.follower.x, s.follower.y, 1, 1, 0);
    await shot(`warmth_rillop_stage${w ? 3 : 0}`, { x: r.x - r.width / 2, y: r.y - r.height / 2, width: r.width * 2, height: r.height * 2 });
    px[w] = fs.readFileSync(path.join(OUT, `warmth_rillop_stage${w ? 3 : 0}.png`)).toString('base64');
  }
  check(px[0] !== px[100], 'Warmth stage 3 differs from stage 0');

  // 6. NPCs: villagers wander (walk frames), trainers look around; sprites drawn.
  await open('map=brookhollow&x=12&y=12&facing=down');
  const n0 = (await st()).npcs;
  check(n0.length > 0 && n0.every((n) => n.drawn), `brookhollow NPC sprites drawn (${n0.map((n) => n.sprite).join(', ')})`);
  let walkShot = false;
  for (let i = 0; i < 300 && !walkShot; i++) { const s = await st(); if (s.npcs.some((n) => n.moving)) { await shot('npcs_villagers_walking'); walkShot = true; } await sleep(30); }
  await sleep(3000);
  const n1 = (await st()).npcs;
  check(walkShot && n1.some((n, i) => n.x !== n0[i].x || n.y !== n0[i].y), 'villagers walk (moved and caught mid-step)');
  await open('map=route1&x=12&y=24&facing=up');
  const t0 = (await st()).npcs;
  await sleep(6000);
  const t1 = (await st()).npcs;
  check(t0.every((n) => n.drawn), `route1 trainer sprites drawn (${t0.map((n) => n.sprite).join(', ')})`);
  check(t1.some((n, i) => n.facing !== t0[i].facing), 'route1 trainers look around');
  await shot('npcs_trainers_route1');
  for (const m of ['fernwick', 'thornwood', 'office_int']) { await open(`map=${m}&x=${mapJson(m).warps?.[0]?.x ?? 5}&y=${(mapJson(m).warps?.[0]?.y ?? 5) - 1}&facing=down`); await sleep(1500); await shot(`npcs_${m}`); }

  // 7. Portraits in dialogue (Ron, house_1f) and a trainer challenge with the battle sprite.
  async function talkTo(map, id, extra = '') {
    await open(`map=${map}&x=1&y=1&facing=down${extra}`);
    const ok = await page.evaluate((id) => {
      const s = window.kilumen.scene, n = s.npcs.list.find((n) => n.id === id); if (!n) return false;
      const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, O = { up: 'down', down: 'up', left: 'right', right: 'left' };
      n.mover.locked = true;
      for (const [d, [dx, dy]] of Object.entries(D)) { const x = n.x + dx, y = n.y + dy; if (s.map.passable(x, y)) { s.player.place(x, y, O[d]); return true; } }
      return false;
    }, id);
    if (!ok) return null;
    await sleep(100); await page.keyboard.press('KeyZ');
    return waitDialog().catch(() => null);
  }
  let d = await talkTo('house_1f', 'ron');
  check(!!d?.portrait && !!d?.name, `portrait in dialogue: ${d?.name}: "${d?.text?.slice(0, 50)}"`);
  await shot('portrait_dialogue_ron');
  await closeDialog();
  d = await talkTo('route1', 'trainer_r1_a');
  check(!!d?.battle || !!d?.portrait, `trainer challenge shows the battle sprite/portrait: "${d?.text?.slice(0, 50)}"`);
  await shot('trainer_challenge_r1_a');
  await closeDialog();

  // 8. Footprints on sand (route1).
  await open('map=route1&x=4&y=33&facing=up');
  const cell = await page.evaluate(() => {
    const s = window.kilumen.scene, m = s.map;
    for (let y = 1; y < m.height - 1; y++) for (let x = 1; x < m.width - 4; x++) {
      let ok = true; for (let k = 0; k < 4; k++) if (!m.passable(x + k, y) || !s._footprintType(x + k, y)) ok = false;
      if (ok) return { x, y };
    }
    return null;
  });
  if (cell) {
    await open(`map=route1&x=${cell.x}&y=${cell.y}&facing=right`);
    await page.keyboard.down('ArrowRight'); await sleep(800); await page.keyboard.up('ArrowRight'); await idle();
    const s = await st();
    check(s.decals > 0, `footprints left on route1 sand (${s.decals} prints from ${cell.x},${cell.y})`);
    await shot('footprints_route1', await tileRect(cell.x - 1, cell.y - 1, 6, 3, 0));
  } else check(false, 'route1 has a 4-cell print-taking path');

  // 9. Tile seams: zoom x3, day and night, every 3x3 block flat; crop of a tile junction.
  for (const ph of ['day', 'night']) {
    await open(`map=brookhollow&x=12&y=12&facing=down&zoom=3&phase=${ph}`);
    const b = await page.evaluate(() => {
      const c = document.getElementById('world'), z = window.kilumen.scene.zoom, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let bad = 0, blocks = 0;
      for (let by = 0; by + z <= c.height; by += z) for (let bx = 0; bx + z <= c.width; bx += z) {
        const i0 = (by * c.width + bx) * 4; blocks++;
        outer: for (let y = 0; y < z; y++) for (let x = 0; x < z; x++) { const i = ((by + y) * c.width + bx + x) * 4; if (d[i] !== d[i0] || d[i + 1] !== d[i0 + 1] || d[i + 2] !== d[i0 + 2]) { bad++; break outer; } }
      }
      return { bad, blocks, z };
    });
    check(b.z === 3 && b.bad === 0, `seams/crisp x3 ${ph}: ${b.blocks} blocks, ${b.bad} not flat`);
    await shot(`seam_crop_x3_${ph}`, await tileRect(12, 13, 3, 2, 0));
  }

  // 10. All maps in world_layout load; every warp / edge exit lands on a walkable cell of the right map.
  const incoming = {};
  for (const n of layout.maps_built) for (const w of mapJson(n).warps || []) if (w.to !== '$return' && w.to !== 'TO COME') (incoming[w.to] ||= { map: n, x: w.x, y: w.y });
  const zoneMaps = new Set((layout.zones || []).flatMap((z) => z.maps || []));
  check(layout.maps_built.length >= 18, `world_layout maps_built: all maps load (${layout.maps_built.length})`);
  for (const n of layout.maps_built) {
    const mj = mapJson(n);
    const start = (mj.warps?.[0]) || { x: 1, y: 1 };
    await open(`map=${n}&x=${start.x}&y=${start.y}&facing=down`);
    let s = await st();
    check(s.map === n, `map ${n} loads (${mj.width}x${mj.height})${zoneMaps.has(n) ? '' : ' [not in any zone]'}`);
    await shot(`map_${n}`);
    const targets = [...(mj.warps || []).map((w) => ({ kind: 'door', w })), ...(mj.exits || []).filter((e) => e.to !== 'TO COME' && layout.maps_built.includes(e.to)).map((e) => ({ kind: 'edge', w: e }))];
    for (const t of targets) {
      await open(`map=${n}&x=${start.x}&y=${start.y}&facing=down`);
      const back = t.w.to === '$return' ? incoming[n] : null;
      const res = await page.evaluate(([t, back]) => {
        const s = window.kilumen.scene, m = s.map, api = s.worldApi();
        if (back) s.lastDoor = back;
        if (t.kind === 'door') { s.player.place(t.w.x, t.w.y, 'down'); api.onArrive(t.w.x, t.w.y); return { want: t.w.to === '$return' ? back?.map : t.w.to }; }
        const e = t.w, a = e.start;
        const xy = e.edge === 'north' ? [a, 0] : e.edge === 'south' ? [a, m.height - 1] : e.edge === 'west' ? [0, a] : [m.width - 1, a];
        s.player.place(xy[0], xy[1], 'down'); api.onEdge(m.exitFor(xy[0], xy[1], { north: 'up', south: 'down', west: 'left', east: 'right' }[e.edge]) || e, xy[0], xy[1]); return { want: e.to };
      }, [t, back]);
      await page.waitForFunction(() => { const s = window.kilumen.state(); return s.warpCount >= 1 && !s.fading; }, null, { timeout: 6000 }).catch(() => {});
      s = await st();
      const ok = await page.evaluate(() => { const s = window.kilumen.scene; return s.map.isWalkable(s.player.x, s.player.y); });
      const label = `${t.kind} ${n} ${t.w.x ?? t.w.edge},${t.w.y ?? t.w.start} -> ${t.w.to}${back ? ' (' + back.map + ')' : ''}`;
      if (!res.want) { results.push(`DATA ${label}: no door in any map leads to ${n}, so $return has nowhere to go (falls back to the dev start ${s.map} ${s.x},${s.y})`); continue; }
      check(s.map === res.want && ok, `${label}: landed ${s.map} ${s.x},${s.y}${ok ? '' : ' (not walkable)'}`);
    }
  }
  check(errors.length === 0, `no console/page errors ${errors.slice(0, 8).join(' | ')}`);
} finally {
  await browser.close();
  server.kill();
}
// Upscale the small crops (nearest) so they read at a glance.
try {
  execFileSync('python3', ['-c', `
import glob,os
from PIL import Image
for p in glob.glob(os.path.join(${JSON.stringify(OUT)}, '*.png')):
    n=os.path.basename(p)
    if n.startswith(('bin_stage_','window_','warmth_','seam_','footprints_')) and 'dialogue' not in n:
        im=Image.open(p)
        if im.width < 900: im.resize((im.width*2, im.height*2), Image.NEAREST).save(p)
`]);
} catch (e) { results.push('NOTE crop upscale skipped: ' + e.message.split('\n')[0]); }
console.log(results.join('\n'));
console.log(failures ? `\n${failures} FAILED` : '\nall soul pass checks passed');
process.exit(failures ? 1 : 0);
