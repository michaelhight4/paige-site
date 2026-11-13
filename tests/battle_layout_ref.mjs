// Battle layout reference shots + zone geometry (Oct 22, 2026, layout pass). For each profile x screen (?battle=sd and the
// old default battle) x hour, waits for the command menu, screenshots, and records the boxes of the info cards, the creature
// sprites (image box + opaque box), the platforms/pads and the panel, and where each creature's feet are on its platform.
// Usage: PORT=<port> TAG=before|after [PROFILES=..] [SCREENS=sd,default] [HOURS=12] node tests/battle_layout_ref.mjs
//   -> shots/battle_engine/layout_ref/<TAG>_<prof>_<screen>_h<hour>.png + layout_<TAG>.json
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/battle_engine/layout_ref'); fs.mkdirSync(OUT, { recursive: true });
const TAG = process.env.TAG || 'after';
const PROFILES = {
  desktop: { type: chromium, ctx: { viewport: { width: 1920, height: 1080 } }, touch: false },
  pixel7: { type: chromium, ctx: { ...devices['Pixel 7 landscape'] }, touch: true },
  iphone14: { type: webkit, ctx: { ...devices['iPhone 14 landscape'] }, touch: true },
  iphone15: { type: webkit, ctx: { ...devices['iPhone 15 landscape'] }, touch: true },
  phone3x: { type: webkit, ctx: { ...devices['iPhone 14 landscape'], viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 } }, touch: true },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// page-side geometry probe (shared with tests/battle_touch_e2e.mjs by copy; keep the two in step)
export const PROBE = () => {
  const sd = !!document.querySelector('.ui-battle[data-engine="sd"]');
  const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return r.width && r.height ? { x: r.left, y: r.top, r: r.right, b: r.bottom } : null; };
  const opaque = (img) => { // opaque bounds of the sprite, in screen px
    const r = box(img); if (!r || !img.naturalWidth) return null;
    const c = document.createElement('canvas'), w = img.naturalWidth, h = img.naturalHeight; c.width = w; c.height = h;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null; const sx = (r.r - r.x) / w, sy = (r.b - r.y) / h;
    return { x: r.x + x0 * sx, y: r.y + y0 * sy, r: r.x + (x1 + 1) * sx, b: r.y + (y1 + 1) * sy };
  };
  const q = (s) => document.querySelector(s);
  const el = sd ? { foeCard: q('#plate-p2'), allyCard: q('#plate-p1'), foeMon: q('#p2-mon'), allyMon: q('#p1-mon'), foePlat: q('#p2-plat'), allyPlat: q('#p1-plat') }
    : { foeCard: q('.b-plate.foe'), allyCard: q('.b-plate.ally'), foeMon: q('#foe-mon'), allyMon: q('#ally-mon'), foePlat: q('.b-foe .b-pad'), allyPlat: q('.b-ally .b-pad') };
  // the platform's standing point: the sd art is centred on the feet line at 39% of its height (ui.css translate -50%,-39%);
  // the old .b-pad ellipse's centre is its middle
  const standY = (p, r) => r && (r.y + (r.b - r.y) * (sd ? 0.39 : 0.5));
  const o = { sd, vw: innerWidth, vh: innerHeight, panel: box(q('.b-bottom')), party: box(q('#p1-party')), foeParty: box(q('#p2-party')) };
  for (const [k, e] of Object.entries(el)) o[k] = box(e);
  o.foeOpq = opaque(el.foeMon); o.allyOpq = opaque(el.allyMon);
  const ov = (a, b) => !!a && !!b && a.x < b.r - 1 && b.x < a.r - 1 && a.y < b.b - 1 && b.y < a.b - 1;
  const hits = [];
  const cards = { 'foe card': o.foeCard, 'ally card': o.allyCard, ...(o.party ? { 'party readout': o.party } : {}), ...(o.foeParty ? { 'foe party readout': o.foeParty } : {}) };
  const things = { 'foe sprite': o.foeMon, 'ally sprite': o.allyMon, 'foe platform': o.foePlat, 'ally platform': o.allyPlat };
  for (const [cn, cr] of Object.entries(cards)) for (const [tn, tr] of Object.entries(things)) if (ov(cr, tr)) hits.push(`${cn}/${tn}`);
  if (ov(o.foeCard, o.allyCard)) hits.push('foe card/ally card');
  for (const [cn, cr] of Object.entries(cards)) if (cr && o.panel && cr.b > o.panel.y + 1) hits.push(`${cn}/panel`);
  o.hits = hits;
  // the party readouts live inside their own card
  const inside = (a, b) => !!a && !!b && a.x >= b.x - 1 && a.r <= b.r + 1 && a.y >= b.y - 1 && a.b <= b.b + 1;
  o.partyInside = (!o.party || inside(o.party, o.allyCard)) && (!o.foeParty || inside(o.foeParty, o.foeCard));
  // feet: lowest opaque row vs the platform's standing line, and the sprite's opaque centre vs the platform centre
  o.feet = {};
  for (const s of ['foe', 'ally']) {
    const p = o[`${s}Plat`], m = o[`${s}Opq`]; if (!p || !m) { o.feet[s] = { ok: false, why: 'missing' }; continue; }
    const pw = p.r - p.x, ph = p.b - p.y, dy = m.b - standY(null, p), dx = (m.x + m.r) / 2 - (p.x + p.r) / 2;
    o.feet[s] = { dy: Math.round(dy), dx: Math.round(dx), ph: Math.round(ph), pw: Math.round(pw), ok: Math.abs(dy) <= Math.max(6, ph * 0.25) && Math.abs(dx) <= pw * 0.2 };
  }
  // zone order (Pokemon structure): foe card top-left of the foe, ally card right of the ally, above the panel
  // foe card in the top-left zone (left of the foe, above the ally card); ally card in the bottom-right zone (right of the ally
  // platform's centre, at or above the panel, below the foe card); foe sprite top-right of the ally sprite
  const cx = (r) => (r.x + r.r) / 2;
  o.zones = !!(o.foeCard && o.allyCard && o.foeMon && o.allyMon && o.panel) && {
    foeCardTopLeft: o.foeCard.r <= Math.min(o.foeMon.x, o.foePlat?.x ?? Infinity) + 1 && o.foeCard.b <= o.allyCard.y + 1,
    allyCardBottomRight: cx(o.allyCard) > cx(o.allyPlat || o.allyMon) && o.allyCard.x >= (o.allyPlat ? o.allyPlat.r : o.allyMon.r) - 1 && o.allyCard.b <= o.panel.y + 1,
    foeTopRight: cx(o.foeMon) > cx(o.allyMon) && o.foeMon.b < o.allyMon.b,
  };
  return o;
};
async function shoot(prof, screen, hour, out) {
  const P = PROFILES[prof]; const browser = await P.type.launch(); const ctx = await browser.newContext(P.ctx); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${process.env.PORT}/index.html?save=0&uidemo=1&ui=battle&hour=${hour}&clouds=0&life=0&bseed=1,2,3,4${screen === 'sd' ? '&battle=sd' : ''}`);
  await page.waitForSelector('.ui-battle', { timeout: 20000 });
  const t0 = Date.now();
  while (Date.now() - t0 < 25000) {
    const s = await page.evaluate(() => { const c = document.querySelector('#b-cmds'); return { cmds: !!c && !c.hidden && getComputedStyle(c).display !== 'none' && c.querySelectorAll('.b-cmd').length > 0, more: !!document.querySelector('#b-msg .more') }; });
    if (s.cmds) break;
    if (s.more) { const e = page.locator('#b-msg').first(); if (P.touch) await e.tap().catch(() => {}); else await e.click().catch(() => {}); }
    await sleep(150);
  }
  await sleep(900);
  const geo = await page.evaluate(PROBE);
  const f = path.join(OUT, `${TAG}_${prof}_${screen}_h${hour}.png`); await page.screenshot({ path: f });
  out.push({ prof, screen, hour, shot: path.relative(ROOT, f), errs, ...geo });
  console.log(`${TAG} ${prof} ${screen} h${hour}: hits=[${geo.hits.join(', ')}] feet=${JSON.stringify(geo.feet)} zones=${JSON.stringify(geo.zones)}`);
  await browser.close();
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const out = [];
  for (const prof of (process.env.PROFILES || 'desktop,iphone14,iphone15,pixel7,phone3x').split(','))
    for (const screen of (process.env.SCREENS || 'sd,default').split(','))
      for (const hour of (process.env.HOURS || '12').split(',')) await shoot(prof, screen, +hour, out);
  fs.writeFileSync(path.join(OUT, `layout_${TAG}.json`), JSON.stringify(out, null, 1));
}
