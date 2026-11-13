// Centre camera (Oct 23, 2026; Gary: "the mc is always centered in the screen" so the phone D-pad/A/B never cover the player).
// Corner shots of Brookhollow, Route 1 and Greystone B1 on pc + phone panels, plus night/clouds/rain/interior extras.
// TAG=before patches camera.alwaysCentre=false into the fetched profile (old clamped camera); TAG=after uses the profiles as-is.
// If art/world/overworld/qa/centre_camera/OFFSETS.json exists (World Design's padded maps), corners are the ORIGINAL map
// corners shifted by that map's offset. Writes shots/centre_camera/<tag>/*.png + report.json.
// Usage: TAG=before|after node tests/centre_camera_shots.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAG = process.env.TAG || 'after';
const SET = process.env.SET || ''; // SET=v2: Gary's 10:09 AM CT blank-edge version (small interior, big town, map corner)
const OUT = path.join(ROOT, 'shots/centre_camera', SET ? `${SET}_${TAG}` : TAG);
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }

const VIEWS = [
  { tag: 'pc1920x1080', w: 1920, h: 1080, dpr: 1, mobile: false },
  { tag: 'pc2560x1440', w: 2560, h: 1440, dpr: 1, mobile: false },
  { tag: 'ph844x390@3', w: 844, h: 390, dpr: 3, mobile: true },
  { tag: 'ph932x430@3', w: 932, h: 430, dpr: 3, mobile: true },
  { tag: 'ph780x360@3', w: 780, h: 360, dpr: 3, mobile: true },
];
const ONLY = (process.env.VIEWS || '').split(',').filter(Boolean);
const OFFS_FILE = path.join(ROOT, 'art/world/overworld/qa/centre_camera/OFFSETS.json');
const OFFS = fs.existsSync(OFFS_FILE) ? JSON.parse(fs.readFileSync(OFFS_FILE, 'utf8')) : null;
function offsetOf(map) { // tolerant reader: {maps:{name:{dx,dy}|{offset:[x,y]}|...}} or {name:...}
  const m = OFFS?.maps?.[map] ?? OFFS?.[map];
  if (m == null) return [0, 0];
  if (Array.isArray(m)) return m;
  if (Array.isArray(m.offset)) return m.offset;
  if (typeof m === 'number') return [m, m];
  return [m.dx ?? m.x ?? m.pad ?? 0, m.dy ?? m.y ?? m.pad ?? 0];
}
const ORIG = { brookhollow: [34, 32], route1: [44, 34], greystone_b1: [30, 24] }; // pre-pad sizes (corner tiles = the original map corners)
const COMMON = 'save=0&timescale=0&hour=12&clouds=0&life=0&audio=0&title=0';
const SCENES = [];
for (const [map, [w, h]] of Object.entries(ORIG)) {
  const [ox, oy] = offsetOf(map);
  for (const [cid, x, y] of [['tl', 0, 0], ['tr', w - 1, 0], ['bl', 0, h - 1], ['br', w - 1, h - 1]])
    SCENES.push({ id: `${map}_${cid}`, map, q: `${COMMON}&map=${map}&x=${x + ox}&y=${y + oy}&facing=down` });
}
const [bx, by] = offsetOf('brookhollow'), [rx, ry] = offsetOf('route1');
SCENES.push(
  { id: 'x_night_clouds_brookhollow_tl', extra: true, q: `save=0&timescale=0&hour=22&clouds=1&life=1&audio=0&title=0&map=brookhollow&x=${bx}&y=${by}&facing=down` },
  { id: 'x_rain_route1_br', extra: true, q: `save=0&timescale=0&hour=15&clouds=1&life=1&weather=rain&audio=0&title=0&map=route1&x=${43 + rx}&y=${33 + ry}&facing=down` },
  { id: 'x_interior_home_a', extra: true, q: `${COMMON}&map=home_brookhollow_a&x=1&y=3&facing=down` },
  { id: 'x_interior_heal', extra: true, q: `${COMMON}&map=heal_brookhollow&x=7&y=8&facing=up` },
);

if (SET === 'v2') {
  SCENES.length = 0;
  SCENES.push({ id: 'interior_home_a', q: `${COMMON}&map=home_brookhollow_a&x=1&y=3&facing=down` },
    { id: 'town_brookhollow', q: `${COMMON}&map=brookhollow&x=29&y=23&facing=down` },
    { id: 'corner_brookhollow_tl', q: `${COMMON}&map=brookhollow&x=0&y=0&facing=down` });
  VIEWS.splice(0, VIEWS.length, VIEWS[0], VIEWS[2]);
}
const browser = await chromium.launch();
const report = [];
try {
  for (const v of VIEWS) {
    if (ONLY.length && !ONLY.includes(v.tag)) continue;
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr, hasTouch: v.mobile, isMobile: v.mobile });
    if (TAG === 'before') await ctx.route('**/src/platform/*.json', async (route) => {
      const r = await route.fetch(), j = await r.json(); j.camera = { ...j.camera, alwaysCentre: false };
      await route.fulfill({ response: r, body: JSON.stringify(j), contentType: 'application/json' });
    });
    for (const s of SCENES) {
      if (s.extra && !SET && v.tag !== 'pc1920x1080' && v.tag !== 'ph932x430@3') continue;
      for (let attempt = 1; attempt <= 3; attempt++) try {
        const page = await ctx.newPage(), errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await page.goto(`${base}?${s.q}`);
        await page.waitForFunction(() => window.kilumen?.scene?.tileset && window.kilumen.scene._cam, null, { timeout: 20000 });
        await page.evaluate(() => window.kilumen.ready);
        await page.waitForTimeout(s.extra ? 1200 : 600);
        const m = await page.evaluate(() => {
          const sc = window.kilumen.scene, c = document.getElementById('world'), z = sc.zoom, cam = sc._cam, { px, py } = sc.player.pixel();
          const cr = c.getBoundingClientRect(), k = cr.width / c.width;
          const pcx = (px + 32 - cam.x) * z, pcy = (py + 32 - cam.y) * z; // player tile centre, canvas device px
          const body = { x: cr.left + (px - cam.x) * z * k, y: cr.top + (py + 64 - 96 - cam.y) * z * k, w: 64 * z * k, h: 96 * z * k }; // 64x96 sprite box, CSS px
          const tp = document.getElementById('touchpad'), shown = tp && !tp.hidden && getComputedStyle(tp).display !== 'none';
          const ctrls = shown ? [...tp.querySelectorAll('.dpad button, [data-btn=a], [data-btn=b]')].map((b) => { const r = b.getBoundingClientRect(); return { id: b.dataset.dir || b.dataset.btn, x: r.left, y: r.top, w: r.width, h: r.height }; }).filter((r) => r.w > 0) : [];
          const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          const g = c.getContext('2d'), W = c.width, H = c.height, d = g.getImageData(0, 0, W, H).data;
          let black = 0, n = 0; // share of pure-black (<=4) cells on a coarse grid (void/black off-map shows up here)
          for (let y = 2; y < H; y += 8) for (let x = 2; x < W; x += 8) { const i = (y * W + x) * 4; n++; if (d[i] <= 4 && d[i + 1] <= 4 && d[i + 2] <= 4) black++; }
          return { map: sc.map.name, mapWH: [sc.map.width, sc.map.height], tile: [sc.player.x ?? Math.round(px / 64), sc.player.y ?? Math.round(py / 64)], zoom: z, canvas: [W, H], cam: { x: cam.x, y: cam.y },
            centreErrPx: [pcx - W / 2, pcy - H / 2], blackShare: +(black / n).toFixed(4),
            overlaps: ctrls.filter((r) => hit(body, r)).map((r) => r.id), controls: ctrls.length };
        });
        const file = `${v.tag}_${s.id}.png`;
        await page.screenshot({ path: path.join(OUT, file) });
        report.push({ view: v.tag, scene: s.id, file, ...m, errors });
        console.log(v.tag, s.id, JSON.stringify({ c: m.centreErrPx, ov: m.overlaps, blk: m.blackShare, cam: m.cam }));
        await page.close();
        break;
      } catch (e) { if (attempt === 3) report.push({ view: v.tag, scene: s.id, error: String(e) }); }
    }
    await ctx.close();
  }
} finally {
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  await browser.close(); server.kill();
}
