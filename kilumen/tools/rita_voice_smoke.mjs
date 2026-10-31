// RITA voice browser smoke (Oct 31 2026): PC 1280x800 + phone 844x390. Serves nothing itself: pass BASE (e.g. http://localhost:8791/kilumen/).
// Checks: every manifest clip fetches 200 and decodes; strips for regions 1-9 + an RT Benefits card actually speak;
// mute / master 0 / RITA toggle off stay silent; no console errors. Optional RECORD=1 taps the master bus to a webm.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:8791/kilumen/';
const OUT = process.env.OUT || '/workspace/shots/rita_voice_full';
const SHOW = [
  ['board_node', { node: 'Daily Bonus', rank: 2 }, 'RT Benefits card'],
  ['area_new', { key: 'thornwood', area: 'Thornwood' }, 'r2'],
  ['master_beaten', { key: 'revival', master: 'Revival' }, 'r3'],
  ['quest_done', { key: 'mq_frostspire', quest: 'Frostspire' }, 'r4'],
  ['master_beaten', { key: 'mirefen', master: 'Mirefen' }, 'r5'],
  ['area_new', { key: 'tidewater_coast', area: 'Tidewater Coast' }, 'r6'],
  ['master_beaten', { key: 'lanternport', master: 'Lanternport' }, 'r7'],
  ['quest_done', { key: 'mq_cindervale', quest: 'Cindervale' }, 'r8'],
  ['id_level_up', { level: 17 }, 'level 17'],
  ['first_evolution', { creature: 'Snowmuff', new: 'Tundrarch' }, 'evolution'],
  ['quest_done', { key: 'mq_aurelith_arena', quest: 'Aurelith Arena' }, 'end-game'],
];
export async function run(dev) {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: dev.vp, isMobile: dev.mobile, hasTouch: dev.mobile, recordVideo: process.env.RECORD ? { dir: OUT + '/vid', size: dev.vp } : undefined });
  const tCtx = Date.now(); const page = await ctx.newPage(); const errors = []; const res0 = { tCtx };
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + '?skipintro=1&save=0&map=fernwick&flags=got_starter' + (dev.mobile ? '&touch=1' : ''), { waitUntil: 'load' });
  await page.waitForFunction(() => window.kilumen?.ritaVoice && window.kilumen?.audio, null, { timeout: 30000 });
  // title: alpha notice 'Got it' + 'Press Enter or Start' -> new game in Fernwick, then wait until nothing blocks the strip
  for (let i = 0; i < 30; i++) { const b = await page.evaluate(() => window.kilumen.companyVoice.blockedReason()); if (!b && i > 3) break; await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
  res0.ready = await page.evaluate(() => ({ blocked: window.kilumen.companyVoice.blockedReason(), unlocked: window.kilumen.audio.unlocked }));
  if (process.env.RECORD) await page.screenshot({ path: `${OUT}/${dev.name}_start.png` });
  const t0 = Date.now(); void res0;
  if (process.env.RECORD) await page.evaluate(() => { const H = window.Howler; const d = H.ctx.createMediaStreamDestination(); H.masterGain.connect(d); const r = new MediaRecorder(d.stream); const ch = []; r.ondataavailable = (e) => ch.push(e.data); r.start(); window.__rec = { r, ch }; });
  const res = { dev: dev.name, shows: [], silent: {}, start: res0.ready };
  // 1) every clip loads (200) and decodes
  res.clips = await page.evaluate(async () => {
    const rv = window.kilumen.ritaVoice; const m = await rv.loadManifest(); await rv.loadParts();
    const ctx = window.Howler.ctx; const fmt = rv.fmt || 'ogg'; const bad = []; const stems = Object.keys(rv.manifest.clips);
    for (let i = 0; i < stems.length; i += 24) await Promise.all(stems.slice(i, i + 24).map(async (s) => {
      const r = await fetch(rv.base + s + '.' + fmt); if (r.status !== 200) return bad.push(s + ' ' + r.status);
      try { const b = await ctx.decodeAudioData(await r.arrayBuffer()); if (!(b.duration > 0.05)) bad.push(s + ' short'); } catch (e) { bad.push(s + ' decode'); }
    }));
    return { n: stems.length, fmt, bad };
  });
  // 2) strips speak
  const show = (name, c) => page.evaluate(async ([name, c]) => {
    const cv = window.kilumen.companyVoice, rv = window.kilumen.ritaVoice;
    for (let i = 0; i < 50 && cv.blockedReason(); i++) await new Promise((ok) => setTimeout(ok, 100));
    cv.hide('test'); rv.last = null;
    cv.show({ name, ctx: c, priority: 1, at: cv.now() });
    const cur = cv.current, text = cur?.pages?.[0], key = cur?.voice?.key, pages = cur?.pages;
    for (let i = 0; i < 80 && !rv.last; i++) await new Promise((ok) => setTimeout(ok, 100));
    return { text, pages, key, last: rv.last, blocked: cv.blockedReason(), hideWhy: cv.lastHideWhy };
  }, [name, c]);
  const list = process.env.SAMPLE ? SHOW.filter((s) => ['RT Benefits card', 'r2', 'r5', 'r7', 'end-game'].includes(s[2])) : SHOW;
  for (const [name, c, tag] of list) {
    const r = await show(name, c); res.shows.push({ tag, name, ...r, t: (Date.now() - t0) / 1000 });
    if (r.last?.ms) await page.waitForTimeout(r.last.ms + 500);
    if (process.env.SAMPLE) { await page.waitForFunction(() => !window.kilumen.companyVoice.current, null, { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(400); }
    if (tag === 'RT Benefits card' || tag === 'r5') await page.screenshot({ path: `${OUT}/${dev.name}_${tag.replace(/\W+/g, '_')}.png` });
  }
  if (process.env.SAMPLE) res.silent = {};
  // 3) settings
  if (!process.env.SAMPLE) {
  const a = (f) => page.evaluate(f);
  await a(() => { window.kilumen.audio.settings.muted = true; }); res.silent.muted = (await show('id_level_up', { level: 9 })).last;
  await a(() => { window.kilumen.audio.settings.muted = false; window.__m = window.kilumen.audio.settings.master; window.kilumen.audio.settings.master = 0; });
  res.silent.master0 = (await show('id_level_up', { level: 9 })).last;
  await a(() => { window.kilumen.audio.settings.master = window.__m; window.kilumen.ritaVoice.setOn(false); }); res.silent.toggleOff = (await show('id_level_up', { level: 9 })).last;
  await a(() => window.kilumen.ritaVoice.setOn(true)); res.silent.restored = (await show('id_level_up', { level: 9 })).last;
  }
  await page.waitForTimeout(1500);
  if (process.env.RECORD) { const b64 = await page.evaluate(() => new Promise((ok) => { const { r, ch } = window.__rec; r.onstop = async () => { const b = new Blob(ch); const u = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); ok(btoa(s)); }; r.stop(); })); fs.writeFileSync(`${OUT}/${dev.name}_audio.webm`, Buffer.from(b64, 'base64')); res.audioStartMs = t0; }
  res.errors = errors; res.audioOffsetS = (t0 - res0.tCtx) / 1000;
  const v = page.video(); await ctx.close(); if (v) res.video = await v.path(); await browser.close();
  return res;
}
const DEVS = [{ name: 'pc', vp: { width: 1280, height: 800 }, mobile: false }, { name: 'phone', vp: { width: 844, height: 390 }, mobile: true }];
const only = process.env.DEV;
const all = [];
for (const d of DEVS.filter((d) => !only || d.name === only)) all.push(await run(d));
fs.writeFileSync(`${OUT}/smoke_${only || 'all'}.json`, JSON.stringify(all, null, 1));
for (const r of all) {
  console.log(r.dev, 'start', JSON.stringify(r.start), 'clips', r.clips.n, r.clips.fmt, 'bad', r.clips.bad.length, r.clips.bad.slice(0, 5));
  for (const s of r.shows) console.log(' ', s.tag, s.key, s.last?.spoke, s.last?.why || s.last?.ms + 'ms', s.last ? '' : ('blocked=' + s.blocked + ' hide=' + s.hideWhy), '|', (s.pages || []).join(' / '));
  console.log('  silent:', JSON.stringify(Object.fromEntries(Object.entries(r.silent).map(([k, v]) => [k, v?.spoke ? 'SPOKE' : (v?.why || 'no result')]))));
  console.log('  console errors:', r.errors.length, r.errors.slice(0, 5));
}
