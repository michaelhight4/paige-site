// Fruit feeds UI shots (PC 1920x1080 + phone 2340x1080 landscape). Usage: node tests/feeds_shots.mjs  (needs playwright)
// OUT defaults to /workspace/kilumen/shots/feeds_v2. Runs with ?feeds=1&feedskit=1 (the flag is off by default).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || '/workspace/kilumen/shots/feeds_v2'; fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const DEV = [{ plat: 'pc', w: 1920, h: 1080, dpr: 1, touch: false }, { plat: 'phone', w: 780, h: 360, dpr: 3, touch: true }];
const browser = await chromium.launch(); const report = [];
try {
  for (const d of DEV) {
    const vdir = path.join(OUT, '.video_' + d.plat); fs.rmSync(vdir, { recursive: true, force: true });
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: d.touch, isMobile: d.touch, recordVideo: { dir: vdir, size: { width: d.w > 1000 ? 1280 : d.w * 2, height: d.w > 1000 ? 720 : d.h * 2 } } });
    const t0 = Date.now();
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} globalThis.KILUMEN_FEEDS = true; globalThis.KILUMEN_FEEDS_KIT = true; });
    await page.goto(base);
    await page.waitForFunction(() => window.kilumen?.ui, null, { timeout: 30000 });
    for (let i = 0; i < 40; i++) { const busy = await page.evaluate(() => { const s = window.kilumen.scene; return !!(s.dialog?.active || s.busy || s.fade || window.kilumen.ui?.active); }); if (!busy && i > 3) break; await page.keyboard.press(i % 2 ? 'f' : 'Enter'); await page.waitForTimeout(500); }
    await page.waitForFunction(() => window.kilumen?.feeds && window.kilumen.ui, null, { timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.evaluate(() => { const s = window.kilumen.scene; s.party = [{ uid: 'shot-a', species: 'rillop', level: 12, hp: 30 }, { uid: 'shot-b', species: 'tumbloam', level: 9, hp: 25 }, ...(s.party || [])].slice(0, 6); });
    const shot = async (name) => { const f = path.join(OUT, `${d.plat}_${name}.png`); await page.screenshot({ path: f }); report.push(f); };
    const kit = ['dashfig', 'rumblemelon', 'mossplum', 'embergourd', 'saltlime'];
    const liked = await page.evaluate((k) => k.find((id) => window.kilumen.feeds.reactionOf(0, id) === 'like') || 'sunheart_fig', kit);
    report.push(`${d.plat} liked fruit: ${liked}`);
    await page.evaluate(() => window.kilumen.feeds.open('feed')); await page.waitForTimeout(700); await shot('0_idle');
    await page.evaluate((id) => window.kilumen.feeds.select(0, id), liked); await page.hover(`.fx-fruit[data-fruit="${liked}"]`).catch(() => {}); await page.waitForTimeout(220); await shot('1_preview');
    // --- the clip: one liked feed, then a refused misfit
    const c0 = (Date.now() - t0) / 1000 - 0.3;
    await page.evaluate((id) => { window.__feed = window.kilumen.feeds.feedFor(0, id); }, liked);
    await page.waitForTimeout(560); await shot('2_fruit_arc');
    await page.waitForTimeout(520); await shot('3_chew_crumbs');
    await page.waitForTimeout(900); await shot('4_happy_hop');
    await page.waitForFunction(() => !window.kilumen.feeds.busy()); await page.waitForTimeout(260); await shot('5_bars_pop');
    await page.waitForTimeout(900);
    await page.evaluate(() => { window.kilumen.feeds.select(1, 'glidepod'); }); await page.waitForTimeout(500);
    await page.evaluate(() => { window.__feed = window.kilumen.feeds.feedFor(1, 'glidepod'); }); await page.waitForTimeout(700); await shot('6_misfit_refused');
    await page.waitForFunction(() => !window.kilumen.feeds.busy()); await page.waitForTimeout(500); await shot('7_misfit_after');
    const c1 = (Date.now() - t0) / 1000;
    // --- cap fanfare: put shot-a one feed from the cap on the liked fruit's main part
    await page.evaluate((id) => { const k = window.kilumen.feeds, st = k.state(); const part = { dashfig: 'legs', rumblemelon: 'grip', mossplum: 'mind', embergourd: 'grip', saltlime: 'fins', sunheart_fig: 'legs' }[id] || 'legs'; Object.assign(st.build['shot-a'] ||= {}, { [part]: 59.5 }); st.full['shot-a'] = 0; k.select(0, id); }, liked);
    await page.evaluate((id) => { window.__feed = window.kilumen.feeds.feedFor(0, id); }, liked);
    await page.waitForFunction(() => !window.kilumen.feeds.busy()); await page.waitForTimeout(1100); await shot('8_cap_fanfare');
    await page.evaluate(() => { const st = window.kilumen.feeds.state(); st.full['shot-b'] = 95; window.kilumen.feeds.select(1, 'mossplum'); }); await page.waitForTimeout(300); await shot('9_too_full');
    await page.evaluate(() => { const k = window.kilumen.feeds; k.close(); k.open('grow'); document.querySelector('[data-plant^="0:"]')?.click(); document.querySelector('[data-plant^="1:"]')?.click(); }); await page.waitForTimeout(300); await shot('10_grow');
    const vid = page.video(); await ctx.close(); const vp = await vid.path();
    const clip = path.join(OUT, `${d.plat}_feed_clip.webm`), gif = path.join(OUT, `${d.plat}_feed_clip.gif`);
    const { execFileSync } = await import('node:child_process');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(c0), '-to', String(c1), '-i', vp, '-c:v', 'libvpx-vp9', '-b:v', '1.5M', clip]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', clip, '-vf', `fps=15,scale=${d.w > 1000 ? 720 : 640}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer`, gif]);
    fs.rmSync(vdir, { recursive: true, force: true }); report.push(clip, gif);
    report.push(`${d.plat} errors: ${JSON.stringify(errors)}`);
  }
} finally { await browser.close(); server.kill(); }
console.log(report.join('\n'));
