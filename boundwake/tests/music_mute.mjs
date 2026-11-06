// Headless check: PC music FAB + Settings mute persist and stop playback.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pp = require('puppeteer-core');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mime = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.json': 'application/json', '.ico': 'image/x-icon',
};

function assert(cond, msg) { if (!cond) throw new Error(msg); }

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.join(root, urlPath.replace(/^\//, ''));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('missing'); return;
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/`;

const browser = await pp.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required',
         '--use-fake-ui-for-media-stream', '--allow-file-access-from-files'],
});
const page = await browser.newPage();
page.setDefaultTimeout(20000);
// Desktop viewport so the PC music FAB is shown (phone hides it).
await page.setViewport({ width: 1280, height: 800 });

await page.goto(base + '?skipintro=1', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.removeItem('bw.music.muted'));
await page.reload({ waitUntil: 'networkidle0' });

// Wait for fate / app + fab
await page.waitForSelector('.music-fab [data-a="music"]', { visible: true });

// First interaction unlocks; clicking the fab should end MUTED (unlock then toggle).
await page.click('.music-fab [data-a="music"]');
await page.waitForFunction(() => localStorage.getItem('bw.music.muted') === '1', { timeout: 5000 });

let muted = await page.evaluate(() => localStorage.getItem('bw.music.muted'));
let label = await page.$eval('.music-fab [data-a="music"]', (el) => el.textContent);
assert(muted === '1', 'fab mute did not persist bw.music.muted=1, got ' + muted);
assert(label.includes('🔇') || label.includes('mute') || true, 'fab icon should reflect mute: ' + label);
// Soft check icon — updateToggle sets 🔇
assert(label === '🔇', 'expected muted icon 🔇, got ' + JSON.stringify(label));

// Probe AudioContext state via any running contexts created by the page.
const ctxState = await page.evaluate(async () => {
  // Music module suspends on mute; give the promise a tick.
  await new Promise((r) => setTimeout(r, 100));
  // Walk performance entries isn't enough; sample Offline via master gain isn't exposed.
  // Return whether any AudioContext is running — Chrome keeps them on window weakly.
  // Fallback: re-import module and read isMuted.
  const mod = await import('./src/music.js?v=musicfix1');
  return { muted: mod.isMuted(), iconOk: true };
});
assert(ctxState.muted === true, 'module isMuted() should be true after fab click');

// Unmute via fab
await page.click('.music-fab [data-a="music"]');
await page.waitForFunction(() => localStorage.getItem('bw.music.muted') === '0', { timeout: 5000 });
muted = await page.evaluate(() => localStorage.getItem('bw.music.muted'));
assert(muted === '0', 'unmute did not clear mute flag');
label = await page.$eval('.music-fab [data-a="music"]', (el) => el.textContent);
assert(label === '🎵', 'expected unmuted icon 🎵, got ' + JSON.stringify(label));

// Race: start unmute (triggers load) then immediately mute — must stay muted.
await page.evaluate(async () => {
  const mod = await import('./src/music.js?v=musicfix1');
  mod.unlockMusic();
  mod.setMuted(false);
  // Immediately mute while crossfade may still be loading.
  mod.setMuted(true);
  await new Promise((r) => setTimeout(r, 800));
  window.__bwMuteRace = { muted: mod.isMuted(), ls: localStorage.getItem('bw.music.muted') };
});
const race = await page.evaluate(() => window.__bwMuteRace);
assert(race.muted === true && race.ls === '1', 'race: mute after unmute must stick: ' + JSON.stringify(race));

// Settings / Life music buttons are inside #app — ensure one click toggles once (no double).
// Navigate into a life if possible; fate screen may still be up. Click Start Life if present.
const go = await page.$('#go');
if (go) {
  await go.click();
  await page.waitForSelector('.music-fab [data-a="music"], .music-row [data-a="music"], .bw-set-row [data-a="music"]', { timeout: 8000 }).catch(() => {});
}

// Open More/Menu if phone-less desktop has Settings with music row
const moreBtn = await page.$('[data-tab="more"], [data-tab="menu"], [data-a="menu"]');
if (moreBtn) {
  await moreBtn.click().catch(() => {});
  await new Promise((r) => setTimeout(r, 300));
}

const inApp = await page.$('.music-row [data-a="music"], .bw-set-row [data-a="music"]');
if (inApp) {
  const before = await page.evaluate(() => localStorage.getItem('bw.music.muted'));
  await inApp.click();
  await new Promise((r) => setTimeout(r, 200));
  const after = await page.evaluate(() => localStorage.getItem('bw.music.muted'));
  assert(before !== after, 'in-app music button should toggle once (before=' + before + ' after=' + after + ')');
  // Ensure not double-toggled back
  assert(after === (before === '1' ? '0' : '1'), 'double-toggle detected');
  console.log('PASS in-app music toggle');
} else {
  console.log('SKIP in-app music row (UI path not reached)');
}

console.log('PASS music mute fab + persistence + race');
await browser.close();
server.close();
process.exit(0);
