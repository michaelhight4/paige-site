// Mobile full-screen pass (Oct 23, 2026; Gary: "make sure the mobile version uses the whole screen").
// Screenshots overworld / interior / battle (sd engine) / menu / dialogue on the phone landscape panels (mobile profile,
// isMobile + hasTouch) and the PC reference sizes, and measures letterbox: black rows/columns at the screen edges, the canvas
// rect vs the viewport and the battle root rect. Usage: TAG=before|after node tests/mobile_fullscreen_shots.mjs
// -> shots/mobile_fullscreen/<tag>/*.png + report.json
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAG = process.env.TAG || 'after';
const OUT = path.join(ROOT, 'shots/mobile_fullscreen', TAG);
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }

// device px panels -> CSS px at a phone dpr
const VIEWS = [
  { tag: '2340x1080', w: 780, h: 360, dpr: 3, mobile: true },
  { tag: '2400x1080', w: 800, h: 360, dpr: 3, mobile: true },
  { tag: '2532x1170', w: 844, h: 390, dpr: 3, mobile: true, inset: { left: 47, right: 47, bottom: 21 } }, // iPhone landscape notch + home bar
  { tag: '1600x720', w: 800, h: 360, dpr: 2, mobile: true },
  { tag: '844x390css', w: 844, h: 390, dpr: 2, mobile: true },
  { tag: 'pc1920x1080', w: 1920, h: 1080, dpr: 1, mobile: false },
  { tag: 'pc1280x720', w: 1280, h: 720, dpr: 1, mobile: false },
];
const ONLY = (process.env.VIEWS || '').split(',').filter(Boolean);
const COMMON = 'save=0&timescale=0&hour=12&clouds=0&life=0&audio=0&title=0';
const SCENES = [
  { id: 'overworld', q: 'map=brookhollow&x=5&y=8&facing=down' },
  { id: 'interior', q: 'map=heal_brookhollow&x=7&y=8&facing=up' },
  { id: 'battle', q: 'uidemo=1&ui=battle', wait: '.ui-battle' },
  { id: 'menu', q: 'map=brookhollow&x=5&y=8&ui=phone&uidemo=1', wait: '.ui-apps' },
  { id: 'dialogue', q: 'map=brookhollow&x=5&y=8', say: true },
];

function edgeBlack(file) { // count fully-black (<=8) columns/rows from each edge
  const p = PNG.sync.read(fs.readFileSync(file)), { width: W, height: H, data: d } = p;
  const blackPx = (x, y) => { const i = (y * W + x) * 4; return d[i] <= 8 && d[i + 1] <= 8 && d[i + 2] <= 8; };
  const col = (x) => { for (let y = 0; y < H; y += 3) if (!blackPx(x, y)) return false; return true; };
  const row = (y) => { for (let x = 0; x < W; x += 3) if (!blackPx(x, y)) return false; return true; };
  let l = 0; while (l < W && col(l)) l++; let r = 0; while (r < W && col(W - 1 - r)) r++;
  let t = 0; while (t < H && row(t)) t++; let b = 0; while (b < H && row(H - 1 - b)) b++;
  return { left: l, right: r, top: t, bottom: b };
}

const browser = await chromium.launch();
const report = [];
try {
  for (const v of VIEWS) {
    if (ONLY.length && !ONLY.includes(v.tag)) continue;
    for (const s of SCENES) for (let attempt = 1; attempt <= 3; attempt++) try { // retry: other agents regenerate art while we run
      const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr, hasTouch: v.mobile, isMobile: v.mobile });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`${base}?${COMMON}&${s.q}`);
      await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 20000 });
      await page.evaluate(() => window.kilumen.ready);
      // Chromium has no env(safe-area-inset-*) emulation: put the iPhone insets straight into the profile's --safe-* vars
      if (v.inset) await page.evaluate((ins) => { for (const k of ['left', 'right', 'bottom']) document.body.style.setProperty('--safe-' + k, ins[k] + 'px'); }, v.inset);
      if (s.wait) await page.waitForSelector(s.wait, { timeout: 15000 }).catch(() => errors.push('wait ' + s.wait));
      if (s.say) await page.evaluate(() => void window.kilumen.scene.dialog.say(['The path ahead is closed. Mira says the bridge washed out in the storm.'], { name: 'Mira' }));
      await page.waitForTimeout(s.id === 'battle' ? 1800 : 700);
      const m = await page.evaluate(() => {
        const rr = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; };
        const c = document.getElementById('world');
        return { platform: window.kilumen.platform.id, inner: [innerWidth, innerHeight], canvasCss: rr(c), canvasPx: [c.width, c.height],
          zoom: window.kilumen.scene.zoom, battle: rr(document.querySelector('.ui-battle')), canvasBlack: probe(c) };
        function probe(cv) { // pure-black (<=8) columns from each edge of the CANVAS (DOM HUD/touch excluded), rows 10%..90%
          const g = cv.getContext('2d'), W = cv.width, H = cv.height, d = g.getImageData(0, 0, W, H).data;
          const blk = (x, y) => { const i = (y * W + x) * 4; return d[i] <= 8 && d[i + 1] <= 8 && d[i + 2] <= 8; };
          const col = (x) => { for (let y = Math.floor(H * 0.1); y < H * 0.9; y += 4) if (!blk(x, y)) return false; return true; };
          const row = (y) => { for (let x = Math.floor(W * 0.1); x < W * 0.9; x += 4) if (!blk(x, y)) return false; return true; };
          let l = 0; while (l < W && col(l)) l++; let r = 0; while (r < W && col(W - 1 - r)) r++;
          let t = 0; while (t < H && row(t)) t++; let b = 0; while (b < H && row(H - 1 - b)) b++;
          return { left: l, right: r, top: t, bottom: b };
        }
      });
      const file = path.join(OUT, `${v.tag}_${s.id}.png`);
      await page.screenshot({ path: file });
      const black = edgeBlack(file);
      report.push({ view: v.tag, scene: s.id, ...m, black, errors });
      console.log(`${v.tag} ${s.id}: ${m.platform} z=${m.zoom} canvas=${JSON.stringify(m.canvasCss)} px=${m.canvasPx} battle=${JSON.stringify(m.battle)} canvasBlack=${JSON.stringify(m.canvasBlack)} screenBlack=${JSON.stringify(black)} err=${errors.length}`);
      await ctx.close();
      break;
    } catch (e) { console.log(`${v.tag} ${s.id}: attempt ${attempt} failed: ${String(e.message).split('\n')[0]}`); if (attempt === 3) report.push({ view: v.tag, scene: s.id, failed: String(e.message) }); }
  }
} finally { await browser.close(); server.kill(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
