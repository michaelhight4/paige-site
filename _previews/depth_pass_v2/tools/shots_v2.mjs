// Depth pass v2 previews (Oct 22, 2026): each scene loads with ?depth=1, screenshot, press J (the real toggle key),
// screenshot again (depth off). PC 1920x1080 dpr1, mobile landscape 932x430 dpr3 touch (+ 2340x1080-class phone =
// 851x393 dpr2.75 for the Fernwick hall guide check). Strength options: ?depthstrength=light|medium|strong.
// Usage: PORT=<http.server port> node _previews/depth_pass_v2/tools/shots_v2.mjs  -> _previews/depth_pass_v2/raw/*.png + report.json
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(OUT, 'raw'); fs.mkdirSync(RAW, { recursive: true });
const base = `http://127.0.0.1:${process.env.PORT}/index.html`;
const DEVICES = {
  pc: { w: 1920, h: 1080, dpr: 1, touch: false },
  mobile: { w: 932, h: 430, dpr: 3, touch: true },
  phone2340: { w: 851, h: 393, dpr: 2.75, touch: true }, // 2340x1080 physical
  phone844: { w: 844, h: 390, dpr: 3, touch: true },
  phone740: { w: 740, h: 360, dpr: 3, touch: true },
};
const SCENES = [
  { tag: 'heal_brookhollow', map: 'heal_brookhollow', x: 6, y: 6, facing: 'up' },
  { tag: 'lab_crystals', map: 'lab_brookhollow', x: 7, y: 7, facing: 'up' },
  { tag: 'home_sofas', map: 'home_brookhollow_b', x: 6, y: 6, facing: 'up' },
  { tag: 'route1_trees', map: 'route1', x: 19, y: 6, facing: 'down' },
  { tag: 'firefly_day', map: 'club_int', x: 7, y: 12, facing: 'up', hour: 12 },
  { tag: 'firefly_night', map: 'club_int', x: 7, y: 12, facing: 'up', hour: 22 },
  { tag: 'firefly_night_litgreens', map: 'club_int', x: 7, y: 12, facing: 'up', hour: 22, extra: '&litgreens=1', noToggle: true },
  { tag: 'fernwick_club_front_night', map: 'fernwick', x: 26, y: 5, facing: 'up', hour: 22 },
  { tag: 'fernwick_hall', map: 'fernwick_hall_int', x: 7, y: 16, facing: 'up' },
];
const STRENGTH = ['heal_brookhollow', 'home_sofas', 'route1_trees', 'firefly_night'];
const jobs = [];
for (const dev of ['pc', 'mobile']) for (const s of SCENES) jobs.push({ dev, s, kind: 'toggle' });
for (const dev of ['pc']) for (const t of STRENGTH) for (const st of ['light', 'medium', 'strong']) jobs.push({ dev, s: SCENES.find((x) => x.tag === t), kind: 'strength', st });
for (const dev of ['mobile', 'phone2340', 'phone844', 'phone740']) jobs.push({ dev, s: SCENES.find((x) => x.tag === 'fernwick_hall'), kind: 'guide' });
if (process.env.ONLY) jobs.splice(0, jobs.length, ...jobs.filter((j) => j.s.tag.includes(process.env.ONLY)));

const browser = await chromium.launch();
const report = [];
const shot = (page, f) => page.screenshot({ path: path.join(RAW, f) });
try {
  for (const j of jobs) {
    const d = DEVICES[j.dev], s = j.s;
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: d.touch, isMobile: d.touch });
    const page = await ctx.newPage(), errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    const st = j.kind === 'strength' ? `&depthstrength=${j.st}` : '';
    await page.goto(`${base}?save=0&timescale=0&hour=${s.hour ?? 12}&map=${s.map}&x=${s.x}&y=${s.y}&facing=${s.facing}&depth=1${st}${s.extra || ''}`);
    await page.evaluate(() => window.kilumen.ready);
    await page.waitForTimeout(900);
    const info = await page.evaluate(() => {
      const sc = window.kilumen.scene, st = window.kilumen.state(), v = sc.view();
      return { map: st.map, grade: st.grade, litGreens: st.litGreens, phase: st.phase, depth: st.depth, npcs: sc.npcs.list.map((n) => ({ id: n.id, x: n.x, y: n.y, facing: n.facing ?? n.mover?.facing })) };
    });
    const rec = { dev: j.dev, kind: j.kind, tag: s.tag, strength: j.st, ...info, errors, files: [] };
    if (j.kind === 'toggle') {
      const f1 = `${s.tag}_${j.dev}_depth1.png`; await shot(page, f1); rec.files.push(f1);
      if (!s.noToggle) {
        await page.keyboard.press('KeyJ'); await page.waitForTimeout(250);
        rec.afterJ = await page.evaluate(() => window.kilumen.state().depth.enabled);
        const f0 = `${s.tag}_${j.dev}_depth0.png`; await shot(page, f0); rec.files.push(f0);
      }
    } else if (j.kind === 'strength') {
      const f = `${s.tag}_${j.dev}_${j.st}.png`; await shot(page, f); rec.files.push(f);
    } else { // guide check: the guide's on-screen box vs every visible button (touch pad, DBG/SEL, UI menu buttons)
      rec.guide = await page.evaluate(() => {
        const sc = window.kilumen.scene, v = sc.view(), n = sc.npcs.byId('guide');
        if (!n) return { missing: true };
        const cv = sc.canvas.getBoundingClientRect(), k = cv.width / sc.canvas.width, z = v.zoom;
        const pos = n.mover?.pixel ? n.mover.pixel() : { px: n.x * 64, py: n.y * 64 };
        const box = { left: cv.left + (pos.px + 16 - v.cam.x) * z * k, right: cv.left + (pos.px + 48 - v.cam.x) * z * k,
          top: cv.top + (pos.py + 64 - 92 - v.cam.y) * z * k, bottom: cv.top + (pos.py + 64 - v.cam.y) * z * k };
        const btns = [...document.querySelectorAll('button')].filter((b) => { const r = b.getBoundingClientRect(), cs = getComputedStyle(b); return r.width && r.height && cs.visibility !== 'hidden' && cs.display !== 'none' && !b.closest('[hidden]'); })
          .map((b) => { const r = b.getBoundingClientRect(); return { label: b.dataset.btn || b.getAttribute('aria-label') || b.textContent.trim().slice(0, 20), left: r.left, right: r.right, top: r.top, bottom: r.bottom }; });
        const hit = btns.filter((r) => !(r.right <= box.left || r.left >= box.right || r.bottom <= box.top || r.top >= box.bottom));
        return { x: n.x, y: n.y, facing: n.facing ?? n.mover?.facing, home: n.home, behaviour: n.behaviour, box, onScreen: box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight, overlaps: hit.map((h) => h.label), buttons: btns.length, zoom: z };
      });
      const f = `fernwick_hall_guide_${j.dev}.png`; await shot(page, f); rec.files.push(f);
    }
    report.push(rec);
    console.log(j.dev, j.kind, s.tag, j.st || '', JSON.stringify({ grade: info.grade, lit: info.litGreens, depth: info.depth?.enabled, obj: info.depth?.objects, walls: info.depth?.walls, alpha: info.depth?.alpha, guide: rec.guide }), errors.length ? errors : '');
    await ctx.close();
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(OUT, process.env.REPORT || 'report.json'), JSON.stringify(report, null, 2));
