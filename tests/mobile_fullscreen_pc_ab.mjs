// PC-unchanged proof for the mobile full screen pass (Oct 23, 2026). Serves BASE (a /tmp copy of this tree with the
// mobile pass stripped: env BASE, default /tmp/kl_base_mfs) and this tree side by side, loads each pc scene in both
// with identical timing, and compares (a) the canvas backing store bytes (sha1) and (b) full-page screenshots
// (pixelmatch threshold 0). Usage: node tests/mobile_fullscreen_pc_ab.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs'; import pixelmatch from 'pixelmatch';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || '/tmp/kl_base_mfs';
const OUT = path.join(ROOT, 'shots/mobile_fullscreen', process.env.OUTSUB || 'pc_ab'); fs.mkdirSync(OUT, { recursive: true });
const srv = (dir, port) => spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: dir, stdio: 'ignore' });
const S = [srv(BASE, 8761), srv(ROOT, 8762)];
const urls = { before: 'http://127.0.0.1:8761/index.html', after: 'http://127.0.0.1:8762/index.html' };
for (const u of Object.values(urls)) for (let i = 0; i < 50; i++) { try { if ((await fetch(u)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const COMMON = 'save=0&timescale=0&hour=12&clouds=0&life=0&audio=0&title=0';
const SCENES = [
  { id: 'overworld', q: 'map=brookhollow&x=5&y=8&facing=down' },
  { id: 'interior', q: 'map=heal_brookhollow&x=7&y=8&facing=up' },
  { id: 'battle', q: 'uidemo=1&ui=battle', wait: '.ui-battle' },
  { id: 'menu', q: 'map=brookhollow&x=5&y=8&ui=phone&uidemo=1', wait: '.ui-apps' },
  { id: 'dialogue', q: 'map=brookhollow&x=5&y=8', say: true },
];
const VIEWS = [{ tag: 'pc1920x1080', w: 1920, h: 1080 }, { tag: 'pc1280x720', w: 1280, h: 720 }];
const browser = await chromium.launch();
const out = [];
async function shot(side, v, s) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    try {
      await page.goto(`${urls[side]}?${COMMON}&${s.q}`);
      await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 20000 });
      await page.evaluate(() => window.kilumen.ready);
      if (s.wait) await page.waitForSelector(s.wait, { timeout: 15000 }).catch(() => {});
      if (s.say) await page.evaluate(() => void window.kilumen.scene.dialog.say(['The path ahead is closed. Mira says the bridge washed out in the storm.'], { name: 'Mira' }));
      await page.waitForTimeout(4000); // let banners / text reveal / menu intro settle
      await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}' });
      await page.waitForTimeout(200);
      const m = await page.evaluate(() => { const c = document.getElementById('world'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        return { px: [c.width, c.height], zoom: window.kilumen.scene.zoom, platform: window.kilumen.platform.id, hashSrc: (() => { let h = 2166136261 >>> 0; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619) >>> 0; } return h; })() }; });
      const file = path.join(OUT, `${side}_${v.tag}_${s.id}.png`);
      await page.screenshot({ path: file });
      await ctx.close();
      return { ...m, file };
    } catch (e) { await ctx.close(); if (attempt === 3) throw e; }
  }
}
try {
  for (const v of VIEWS) for (const s of SCENES) {
    const a = await shot('before', v, s), b = await shot('after', v, s);
    const A = PNG.sync.read(fs.readFileSync(a.file)), B = PNG.sync.read(fs.readFileSync(b.file));
    const diff = new PNG({ width: A.width, height: A.height });
    const n = pixelmatch(A.data, B.data, diff.data, A.width, A.height, { threshold: 0 });
    if (n) fs.writeFileSync(path.join(OUT, `diff_${v.tag}_${s.id}.png`), PNG.sync.write(diff));
    const r = { view: v.tag, scene: s.id, platform: [a.platform, b.platform], canvasPx: [a.px, b.px], zoom: [a.zoom, b.zoom], canvasHash: [a.hashSrc, b.hashSrc], canvasIdentical: a.hashSrc === b.hashSrc, screenshotDiffPx: n };
    out.push(r); console.log(JSON.stringify(r));
  }
} finally { await browser.close(); S.forEach((p) => p.kill()); }
fs.writeFileSync(path.join(OUT, 'pc_ab_report.json'), JSON.stringify(out, null, 2));
