#!/usr/bin/env node
// Lighthouse audits of the local Kilumen build (dev tool only; nothing here ships).
// Lighthouse 12.x, Apache-2.0 (LICENSE read in tools/free_tools/node_modules/lighthouse/LICENSE, Oct 22, 2026).
// Installed in tools/free_tools/ (its own package.json) so the game's package.json is not touched.
//
// Usage (from /workspace/kilumen):
//   (cd tools/free_tools && npm ci)        # once
//   node tools/lighthouse_check.mjs        # serves the repo on its own free port, runs every preset
//   PORT=8977 PRESETS=mobile_landscape,desktop URL_PATH='/index.html?save=0' node tools/lighthouse_check.mjs
//   BASE=http://127.0.0.1:9000/kilumen/ node tools/lighthouse_check.mjs   # audit an already-running server (e.g. the alpha build)
// Output: shots/lighthouse/<preset>.report.{html,json} + shots/lighthouse/summary.json (scores + top opportunities).
// Presets:
//   mobile_portrait   Lighthouse default mobile: Moto G Power emulation, 412x823, DPR 1.75, simulated slow 4G + 4x CPU.
//                     Kilumen is landscape-only, so this run shows the "turn sideways" screen (kept as a reference).
//   mobile_landscape  Same device + throttling, but 823x412 landscape (the real Kilumen phone layout).
//   desktop           Lighthouse desktop preset: 1350x940, DPR 1, simulated 10 Mbps / 40 ms, no CPU slowdown.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS = path.join(ROOT, 'tools/free_tools');
const req = createRequire(path.join(TOOLS, 'package.json'));
let lighthouse, chromeLauncher, desktopConfig;
try {
  lighthouse = (await import(req.resolve('lighthouse'))).default;
  chromeLauncher = await import(req.resolve('chrome-launcher'));
  desktopConfig = (await import(path.join(TOOLS, 'node_modules/lighthouse/core/config/desktop-config.js'))).default;
} catch (e) {
  console.error('Lighthouse is not installed. Run: (cd tools/free_tools && npm ci)\n', e.message); process.exit(2);
}

const OUT = path.resolve(ROOT, process.env.OUT || 'shots/lighthouse');
fs.mkdirSync(OUT, { recursive: true });
const PRESETS = (process.env.PRESETS || 'mobile_landscape,mobile_portrait,desktop').split(',');
const URL_PATH = process.env.URL_PATH || '/index.html';

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  try { return req('playwright').chromium.executablePath(); } catch {}
  try { return createRequire(path.join(ROOT, 'package.json'))('playwright').chromium.executablePath(); } catch {}
  return undefined; // chrome-launcher will search the system
}
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

let server = null, base = process.env.BASE;
if (!base) {
  const port = Number(process.env.PORT) || await freePort();
  if ([8080, 8093].includes(port)) { console.error('Ports 8080/8093 belong to other workers; pick another.'); process.exit(2); }
  server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) { try { await fetch(base + '/index.html'); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
}
const url = base.replace(/\/$/, '') + URL_PATH;

const MOTO = { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false };
function configFor(name) {
  if (name === 'desktop') return { config: desktopConfig, flags: {} };
  if (name === 'mobile_portrait') return { config: undefined, flags: { formFactor: 'mobile', screenEmulation: MOTO } };
  if (name === 'mobile_landscape') return { config: undefined, flags: { formFactor: 'mobile', screenEmulation: { ...MOTO, width: 823, height: 412 } } };
  throw new Error('unknown preset ' + name);
}

const launch = () => chromeLauncher.launch({ chromePath: chromePath(), chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--autoplay-policy=user-gesture-required'] });
const summary = { url, when: new Date().toString(), lighthouse: req('lighthouse/package.json').version, runs: {} };
try {
  for (const name of PRESETS) {
    const { config, flags } = configFor(name);
    const chrome = await launch(); // fresh profile per preset, so one run's IndexedDB/cache can't skew the next
    const r = await lighthouse(url, { port: chrome.port, output: ['html', 'json'], logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'], ...flags }, config);
    const [html, json] = r.report;
    fs.writeFileSync(path.join(OUT, `${name}.report.html`), html);
    fs.writeFileSync(path.join(OUT, `${name}.report.json`), json);
    const lhr = r.lhr, sc = (k) => lhr.categories[k] ? Math.round(lhr.categories[k].score * 100) : null;
    const audits = lhr.audits;
    const opp = Object.values(audits).filter((a) => a.details?.type === 'opportunity' && (a.details.overallSavingsMs > 0 || a.details.overallSavingsBytes > 0))
      .sort((a, b) => (b.details.overallSavingsMs || 0) - (a.details.overallSavingsMs || 0) || (b.details.overallSavingsBytes || 0) - (a.details.overallSavingsBytes || 0))
      .map((a) => ({ id: a.id, title: a.title, savingsMs: a.details.overallSavingsMs || 0, savingsKiB: Math.round((a.details.overallSavingsBytes || 0) / 1024), top: (a.details.items || []).slice(0, 5).map((i) => ({ url: i.url, wastedKiB: i.wastedBytes ? Math.round(i.wastedBytes / 1024) : undefined, totalKiB: i.totalBytes ? Math.round(i.totalBytes / 1024) : undefined })) }));
    const failed = (cat) => (lhr.categories[cat]?.auditRefs || []).filter((ref) => ref.weight > 0 && audits[ref.id].score !== null && audits[ref.id].score < 0.9).map((ref) => ({ id: ref.id, title: audits[ref.id].title, score: audits[ref.id].score, display: audits[ref.id].displayValue }));
    summary.runs[name] = {
      scores: { performance: sc('performance'), accessibility: sc('accessibility'), bestPractices: sc('best-practices'), seo: sc('seo') },
      metrics: Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index', 'interactive'].map((k) => [k, audits[k]?.displayValue])),
      totalByteWeightKiB: Math.round((audits['total-byte-weight']?.numericValue || 0) / 1024),
      requests: audits['network-requests']?.details?.items?.length,
      opportunities: opp,
      failedAccessibility: failed('accessibility'), failedBestPractices: failed('best-practices'),
      runWarnings: lhr.runWarnings,
    };
    const s = summary.runs[name].scores;
    await chrome.kill();
    console.log(`${name.padEnd(17)} perf ${s.performance}  a11y ${s.accessibility}  best ${s.bestPractices}  seo ${s.seo}  weight ${summary.runs[name].totalByteWeightKiB} KiB  -> ${path.relative(ROOT, path.join(OUT, name + '.report.html'))}`);
  }
} finally {
  if (server) server.kill();
}
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
console.log('summary ->', path.relative(ROOT, path.join(OUT, 'summary.json')));
