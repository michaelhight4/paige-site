// DRAFT audio e2e (wave 2, Oct 22, 2026). Local only. Chromium (PC 1920x1080) + WebKit (iPhone 14 landscape):
//  - nothing loads before the first gesture; after it the SFX sprite decodes and plays (ZzFX stays as fallback);
//  - the town map plays the DRAFT town loop, &ui=battle switches to the DRAFT battle loop (both battle shells use .ui-battle);
//  - every loop decodes in the engine at the expected length (OGG and M4A), and the M4A has no AAC priming gap
//    (leading silence < 5 ms), so web-audio looping is gapless on iPhone Safari too.
// Usage: PORT=8731 node tests/audio_draft_e2e.mjs
import { chromium, webkit, devices } from 'playwright';
const PORT = process.env.PORT || 8731, HOST = `http://127.0.0.1:${PORT}`;
const BASE = `${HOST}/index.html?save=0&timescale=0&hour=12&clouds=0&life=0&uidemo=1&map=brookhollow`;
const EXPECT = { town: 28.8, route: 29.09, battle: 25.26 };
let fails = 0; const ok = (e, n, p, i = '') => { console.log(`${p ? 'PASS' : 'FAIL'} ${e} ${n}${i ? ' - ' + i : ''}`); if (!p) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// webkit14_noogg: canPlayType says no to Ogg (iPhone Safari before 18.4), so howler must pick the .m4a fallback.
for (const [eng, type, ctxOpt] of [['pc1080', chromium, { viewport: { width: 1920, height: 1080 } }], ['webkit14', webkit, devices['iPhone 14 landscape']], ['webkit14_noogg', webkit, devices['iPhone 14 landscape']]]) {
  const b = await type.launch({ args: type === chromium ? ['--autoplay-policy=user-gesture-required'] : [] });
  const ctx = await b.newContext(ctxOpt);
  if (eng.endsWith('noogg')) await ctx.addInitScript(() => { const o = HTMLMediaElement.prototype.canPlayType; HTMLMediaElement.prototype.canPlayType = function (t) { return /ogg/.test(t) ? '' : o.call(this, t); }; });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const audioReq = []; page.on('request', (r) => { { const u = r.url().replace(HOST, ''); if (/^\/audio\//.test(u)) audioReq.push(u); } });
  await page.goto(BASE); await page.waitForFunction(() => window.kilumen?.scene?.audio, null, { timeout: 30000 });
  await sleep(800);
  ok(eng, 'no audio file fetched before the first gesture', audioReq.length === 0, audioReq.join(','));
  if (eng.startsWith('webkit')) await page.touchscreen.tap(200, 200); else await page.mouse.click(400, 400);
  await page.keyboard.down('Escape'); await sleep(80); await page.keyboard.up('Escape'); // gesture (keydown also unlocks)
  await page.waitForFunction(() => window.kilumen.scene.audio.state().sfxSprite !== 'loading', null, { timeout: 15000 }).catch(() => {});
  await sleep(1500);
  let s = await page.evaluate(() => window.kilumen.scene.audio.state());
  ok(eng, 'unlocked, sfx sprite loaded', s.unlocked && s.sfxSprite === 'loaded', JSON.stringify({ u: s.unlocked, sprite: s.sfxSprite, ctx: s.ctx, rate: s.sampleRate, failed: s.failed }));
  ok(eng, 'town map plays DRAFT town loop', s.track === 'brookhollow.day' && s.musicLoop === 'town', `${s.track} -> ${s.musicLoop}`);
  const src = await page.evaluate(() => window.Howler._howls.filter((h) => /kil_(draft|sfx_draft)/.test(h._src)).map((h) => ({ src: h._src.replace(location.origin, ''), state: h.state(), playing: h.playing(), web: h._webAudio })));
  ok(eng, 'loop + sprite loaded via web audio (gapless), codec picked', src.length >= 2 && src.every((h) => h.state === 'loaded' && h.web && (eng.endsWith('noogg') ? /\.m4a$/ : /\.ogg$/).test(h.src)), JSON.stringify(src));
  ok(eng, 'sfx() plays from the sprite', await page.evaluate(() => window.kilumen.scene.audio.sfx('select')));
  // decode every file in this engine
  const dec = await page.evaluate(async (names) => {
    const ac = new (window.AudioContext || window.webkitAudioContext)(); const out = {};
    for (const n of names) for (const ext of ['ogg', 'm4a']) {
      try {
        const buf = await ac.decodeAudioData(await (await fetch(`audio/music/kil_draft_${n}.${ext}`)).arrayBuffer());
        const d = buf.getChannelData(0); let lead = 0; while (lead < d.length && Math.abs(d[lead]) < 1e-4) lead++;
        out[`${n}.${ext}`] = { sec: +(buf.length / buf.sampleRate).toFixed(3), leadMs: +((lead / buf.sampleRate) * 1000).toFixed(1) };
      } catch (e) { out[`${n}.${ext}`] = { err: String(e) }; }
    }
    return out;
  }, Object.keys(EXPECT));
  for (const [k, v] of Object.entries(dec)) {
    const exp = EXPECT[k.split('.')[0]];
    if (v.err) { ok(eng, `decode ${k}`, k.endsWith('.ogg') && eng === 'webkit14', `${v.err}${k.endsWith('.ogg') ? ' (ogg unsupported here; m4a fallback covers it)' : ''}`); continue; }
    ok(eng, `decode ${k}: length within 25 ms, no priming gap`, Math.abs(v.sec - exp) < 0.025 && v.leadMs < 5, JSON.stringify(v));
  }
  await page.goto(BASE + '&ui=battle'); await page.waitForFunction(() => window.kilumen?.scene?.audio, null, { timeout: 30000 });
  await sleep(600); await page.mouse.click(10, 10).catch(() => {}); await page.keyboard.down('Shift'); await sleep(80); await page.keyboard.up('Shift');
  await page.waitForFunction(() => window.kilumen.scene.audio.state().track === 'battle', null, { timeout: 8000 }).catch(() => {});
  s = await page.evaluate(() => ({ ...window.kilumen.scene.audio.state(), battleUi: !!document.querySelector('.ui-battle') }));
  ok(eng, '&ui=battle plays DRAFT battle loop', s.battleUi && s.track === 'battle' && s.musicLoop === 'battle', `${s.track} ui=${s.battleUi}`);
  ok(eng, 'no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
}
console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exitCode = fails ? 1 : 0;
