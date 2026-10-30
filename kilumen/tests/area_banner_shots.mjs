// Area banner shot (Gary Oct 30 2026 "no route banner"): resume a save on Trail 1 and capture the banner once the
// Continue menu closes. Usage: node tests/area_banner_shots.mjs  (needs playwright). OUT defaults to shots/area_banner.
import { chromium } from 'playwright'; import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), PORT = 8811 + Math.floor(Math.random() * 100);
const OUT = process.env.OUT || path.join(ROOT, 'shots/area_banner'); fs.mkdirSync(OUT, { recursive: true });
const sv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await page.addInitScript(() => { try { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); } catch {} });
const ev = (f, a) => page.evaluate(f, a).catch(() => null);
const boot = async () => { await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  for (let i = 0; i < 80; i++) { const r = await ev(() => { const k = window.kilumen; return k?.ui && k.scene?.map ? { a: !!k.ui.active || !!k.scene.dialog?.active || !!k.scene.fade } : null; }); if (r && !r.a && i > 8) return; if (i > 6) await page.keyboard.press(i % 2 ? 'f' : 'Enter'); await page.waitForTimeout(300); } };
try {
  await boot();
  await ev(() => window.kilumen.scene.startWarp({ map: 'route1', x: 28, y: 38 }, 'dev')); await page.waitForTimeout(4000);
  await boot(); // resume: the sign fires behind the Continue menu and must show once it closes
  let seen = false;
  for (let q = 0; q < 60 && !seen; q++) { await page.waitForTimeout(100); seen = !!(await ev(() => { const u = window.kilumen.ui; return u.banner.classList.contains('show') && !u.active && u.banner.getBoundingClientRect().left >= 10; })); }
  await page.waitForTimeout(250); const f = path.join(OUT, 'resume_route1_banner.png'); await page.screenshot({ path: f });
  console.log(JSON.stringify({ seen, shot: f, title: await ev(() => window.kilumen.ui.banner.dataset.title) }));
} finally { await b.close(); sv.kill(); }
