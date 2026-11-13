// Options volume sliders e2e (Oct 22, 2026, after Gary's "seems a little loud"). Local only.
//  - defaults come from the platform profile (pc.json / mobile.json "audio"), i.e. the lowered Oct 22 levels;
//  - Options shows the Kenney UI slider on Volume / Music volume / Effects volume and its fill tracks the value;
//  - Right / Left on a volume row nudges it, and the change applies LIVE (playing music Howl volume, SFX sprite volume);
//  - tapping a volume row (touch) cycles it, on the mobile profile in WebKit (iPhone 14 landscape);
//  - each platform saves to its own key (kilumen.audio.pc / kilumen.audio.mobile): changing one leaves the other on
//    its defaults, and a reload restores the saved value for that platform only.
// Usage: PORT=8731 node tests/audio_volume_e2e.mjs
import { chromium, webkit, devices } from 'playwright';
import { readFileSync } from 'node:fs';
const PORT = process.env.PORT || 8731, HOST = `http://127.0.0.1:${PORT}`;
const URL_ = (p) => `${HOST}/index.html?save=0&timescale=0&hour=12&clouds=0&life=0&uidemo=1&map=brookhollow&platform=${p}`;
const PROF = Object.fromEntries(['pc', 'mobile'].map((p) => [p, JSON.parse(readFileSync(new URL(`../src/platform/${p}.json`, import.meta.url))).audio]));
let fails = 0; const ok = (e, n, p, i = '') => { console.log(`${p ? 'PASS' : 'FAIL'} ${e} ${n}${i ? ' - ' + i : ''}`); if (!p) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const near = (a, b) => Math.abs(a - b) < 0.011;

async function boot(page, plat, touch) {
  await page.goto(URL_(plat)); await page.waitForFunction(() => window.kilumen?.scene?.audio && window.kilumen?.ui, null, { timeout: 30000 });
  await sleep(500);
  if (touch) await page.touchscreen.tap(200, 200); else await page.mouse.click(400, 400);
  await page.keyboard.down('Shift'); await sleep(60); await page.keyboard.up('Shift');
  await page.waitForFunction(() => { const s = window.kilumen.scene.audio.state(); return s.unlocked && s.sfxSprite !== 'loading' && window.Howler._howls.some((h) => /kil_draft_/.test(h._src) && h.playing()); }, null, { timeout: 15000 }).catch(() => {});
  await sleep(1800); // music fade-in (crossfadeMs) done
}
const live = (page) => page.evaluate(() => {
  const a = window.kilumen.scene.audio, hs = window.Howler._howls;
  const mus = hs.find((h) => /kil_draft_(town|route|battle)/.test(h._src) && h.playing());
  const spr = hs.find((h) => /kil_sfx_draft/.test(h._src));
  const sl = {}; for (const li of document.querySelectorAll('[data-scr="options"] .ui-row')) { const v = li.querySelector('.kui-slider'); if (v) sl[li.textContent.replace(/\d+%/, '').trim()] = parseFloat(v.style.getPropertyValue('--v')) / 100; }
  return { settings: { ...a.settings }, platformId: a.platformId, music: mus ? +mus.volume().toFixed(3) : null, sprite: spr ? +spr.volume().toFixed(3) : null, master: +window.Howler.volume().toFixed(3), sliders: sl,
    saved: { pc: localStorage.getItem('kilumen.audio.pc'), mobile: localStorage.getItem('kilumen.audio.mobile') } };
});
const openOptionsRow = (page, label) => page.evaluate((label) => {
  const ui = window.kilumen.ui; ui.closeAll?.(); ui.open('options');
  const rows = [...document.querySelectorAll('[data-scr="options"] .ui-row')]; const i = rows.findIndex((r) => r.textContent.includes(label));
  ui._select(i, true); return i;
}, label);
const press = async (page, key) => { await page.keyboard.down(key); await sleep(90); await page.keyboard.up(key); await sleep(150); };

// ---- PC (Chromium 1920x1080) then mobile profile in the SAME browser storage: profiles must stay independent ----
{
  const b = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await boot(page, 'pc', false);
  let s = await live(page);
  ok('pc', 'defaults = lowered pc.json levels', s.platformId === 'pc' && near(s.settings.music, PROF.pc.music) && near(s.settings.sfx, PROF.pc.sfx) && near(s.settings.master, PROF.pc.master), JSON.stringify(s.settings));
  ok('pc', 'music Howl plays at the default, sprite at the sfx default, master on Howler', near(s.music, PROF.pc.music) && near(s.sprite, PROF.pc.sfx) && near(s.master, PROF.pc.master), JSON.stringify({ music: s.music, sprite: s.sprite, master: s.master }));
  const mi = await openOptionsRow(page, 'Music volume'); s = await live(page);
  ok('pc', 'Options has Kenney sliders for Volume / Music volume / Effects volume at the current values', mi >= 0 && near(s.sliders['Music volume'], PROF.pc.music) && near(s.sliders['Effects volume'], PROF.pc.sfx) && near(s.sliders.Volume, PROF.pc.master), JSON.stringify(s.sliders));
  await press(page, 'ArrowRight'); s = await live(page);
  ok('pc', 'Right on Music volume: +10%, applied live to the playing loop, slider moves', near(s.settings.music, PROF.pc.music + 0.1) && near(s.music, s.settings.music) && near(s.sliders['Music volume'], s.settings.music), JSON.stringify({ set: s.settings.music, howl: s.music, slider: s.sliders['Music volume'] }));
  await press(page, 'ArrowLeft'); await press(page, 'ArrowLeft'); s = await live(page);
  const pcMusic = s.settings.music;
  ok('pc', 'Left twice: -20%, live', near(pcMusic, PROF.pc.music - 0.1) && near(s.music, pcMusic), JSON.stringify({ set: pcMusic, howl: s.music }));
  await openOptionsRow(page, 'Effects volume'); await press(page, 'ArrowLeft'); s = await live(page);
  const pcSfx = s.settings.sfx;
  ok('pc', 'Left on Effects volume: lower, applied live to the SFX sprite', pcSfx < PROF.pc.sfx && near(s.sprite, pcSfx) && near(s.sliders['Effects volume'], pcSfx), JSON.stringify({ set: pcSfx, sprite: s.sprite }));
  const savedPc = JSON.parse(s.saved.pc || 'null');
  ok('pc', 'saved under kilumen.audio.pc only', savedPc && near(savedPc.music, pcMusic) && near(savedPc.sfx, pcSfx) && s.saved.mobile === null, JSON.stringify(s.saved));
  // mobile profile in the same storage: its own defaults, untouched by the pc change
  await boot(page, 'mobile', false); s = await live(page);
  ok('mobile', 'mobile profile ignores the pc save: lowered mobile.json defaults', s.platformId === 'mobile' && near(s.settings.music, PROF.mobile.music) && near(s.settings.sfx, PROF.mobile.sfx) && near(s.music, PROF.mobile.music), JSON.stringify({ ...s.settings, howl: s.music }));
  await openOptionsRow(page, 'Music volume'); await press(page, 'ArrowRight'); s = await live(page);
  const mobMusic = s.settings.music;
  ok('mobile', 'mobile music nudge is live and saved under kilumen.audio.mobile; pc save unchanged', near(mobMusic, PROF.mobile.music + 0.1) && near(s.music, mobMusic) && near(JSON.parse(s.saved.mobile).music, mobMusic) && near(JSON.parse(s.saved.pc).music, pcMusic), JSON.stringify(s.saved));
  await boot(page, 'pc', false); s = await live(page);
  ok('pc', 'reload: pc restores its own saved music / sfx and plays at them', near(s.settings.music, pcMusic) && near(s.settings.sfx, pcSfx) && near(s.music, pcMusic) && near(s.sprite, pcSfx), JSON.stringify({ ...s.settings, howl: s.music, sprite: s.sprite }));
  await boot(page, 'mobile', false); s = await live(page);
  ok('mobile', 'reload: mobile restores its own saved music', near(s.settings.music, mobMusic) && near(s.settings.sfx, PROF.mobile.sfx), JSON.stringify(s.settings));
  ok('pc+mobile', 'no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
}
// ---- mobile profile on WebKit iPhone 14 landscape: touch a volume row to change it ----
{
  const b = await webkit.launch(); const ctx = await b.newContext(devices['iPhone 14 landscape']); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await boot(page, 'mobile', true);
  let s = await live(page);
  ok('webkit14', 'defaults = lowered mobile.json levels, live on the loop', near(s.settings.music, PROF.mobile.music) && near(s.music, PROF.mobile.music) && near(s.settings.sfx, PROF.mobile.sfx), JSON.stringify({ ...s.settings, howl: s.music }));
  await openOptionsRow(page, 'Effects volume');
  const box = await page.evaluate(() => { const r = [...document.querySelectorAll('[data-scr="options"] .ui-row')].find((li) => li.textContent.includes('Effects volume')); r.scrollIntoView({ block: 'center' }); const b = r.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  await page.touchscreen.tap(box.x, box.y); await sleep(300); s = await live(page);
  ok('webkit14', 'tap on Effects volume cycles it (+20%), live on the sprite, saved under kilumen.audio.mobile', near(s.settings.sfx, PROF.mobile.sfx + 0.2) && near(s.sprite, s.settings.sfx) && near(JSON.parse(s.saved.mobile || '{}').sfx, s.settings.sfx) && s.saved.pc === null, JSON.stringify({ sfx: s.settings.sfx, sprite: s.sprite, saved: s.saved }));
  ok('webkit14', 'no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
}
console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exitCode = fails ? 1 : 0;
