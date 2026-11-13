// Region 2 smoke + shots (coder, Oct 23 2026). LOCAL ONLY. Writes shots/region2_v1/*.png + report.json. Usage: node tools/region2/region2_shots.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), OUT = path.join(ROOT, 'shots/region2_v1');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const VIEWS = [
  { plat: 'pc', ctx: { viewport: { width: 1366, height: 768 } }, q: 'platform=pc' },
  { plat: 'phone', ctx: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, q: 'platform=mobile&touch=1' },
];
const report = { errors: [], shots: [], checks: [] };
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
try {
  for (const v of VIEWS) {
    const ctx = await browser.newContext(v.ctx), page = await ctx.newPage();
    page.on('pageerror', (e) => report.errors.push(`${v.plat}: ${e.message}`));
    const S = (f, a) => page.evaluate(f, a);
    const shot = async (label) => { const f = `${v.plat}_${label}.png`; await page.screenshot({ path: path.join(OUT, f) }); report.shots.push(f); };
    const boot = async (extra) => {
      await page.goto(`${base}?audio=0&online=0&hour=12&weather=clear&skipintro=1&reset=1&flags=got_starter,beat_master_fernwick,has_survey_parcel,has_bike&${v.q}${extra}`);
      await page.waitForFunction(() => window.kilumen?.ui && window.kilumen.scene?.tileset && window.kilumen.scene.systems?.rtBenefits?.data, null, { timeout: 30000 });
      await S(() => { const s = window.kilumen.scene, sys = s.systems; if (!sys.party.members?.length && !sys.party.list?.length) sys.party.chooseStarter('rillop', { origin: { map: s.map.name, how: 'starter', day: 0 }, level: 24 }); });
      await wait(1500);
    };
    await boot('&map=saltmere&x=24&y=29&facing=up'); await shot('1_saltmere');
    report.checks.push({ plat: v.plat, what: 'saltmere map', ok: await S(() => window.kilumen.scene.map.name === 'saltmere') });
    await boot('&map=saltmere_hall_int'); await shot('2_hall');
    report.checks.push({ plat: v.plat, what: 'hall map', ok: await S(() => window.kilumen.scene.map.name === 'saltmere_hall_int') });
    report.checks.push({ plat: v.plat, what: 'RT region 2 (cap 6)', ok: await S(() => window.kilumen.scene.systems.rtBenefits.region === 2 && window.kilumen.scene.systems.rtBenefits.cap() >= 6) });
    const m = await S(() => window.kilumen.scene.progression?.openMaster?.('saltmere')); await wait(2500); await shot('3_master2_battle');
    report.checks.push({ plat: v.plat, what: 'Master 2 battle opens', ok: !!m });
    await S(() => { window.kilumen.ui.closeAll(); const r = window.kilumen.scene.systems.rtBenefits; r.company.idLevel = 5; r.company.pointsFree = 3; window.kilumen.ui.scr_rt_benefits ? window.kilumen.ui.open('rt_benefits') : null; });
    await wait(1200); await shot('4_rt_perks');
    await ctx.close();
  }
} catch (e) { report.errors.push('script: ' + e.message); }
await browser.close(); server.kill();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
