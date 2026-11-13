// Online play stage 1 end-to-end (Oct 22, 2026). LOCAL ONLY: no network service, no Supabase.
// Part A: two Chromium tabs in one context talk over the real BroadcastChannel (same as two tabs on a PC).
// Part B: PC (Chromium, desktop 1280x720) + phone (WebKit, iPhone 14 landscape). BroadcastChannel can't cross
//   browser contexts or engines, so a test-only bridge replaces it in both pages (addInitScript) and relays
//   messages through Node (exposeBinding -> page.evaluate). The game code is unchanged; only the pipe is.
//   Phone input is touch: page.touchscreen.tap for buttons (real WebKit touch), pointer events (pointerType
//   touch) for d-pad holds (Playwright WebKit has no touch down/up API; same as tests/touch_e2e.mjs).
// Checks: see each other, movement shows up interpolated, quick-chat both ways, mute hides bubbles, block
//   hides the player and persists, typed chat is off by default and filtered when on, receiver re-filters,
//   mobile buttons >= 44 px, no console errors. Videos of part B -> OUT/_video_*/ (used for the side-by-side clip).
// Usage: PORT=<http.server port> [OUT=dir] node tests/online_e2e.mjs
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.OUT || 'shots/online_e2e');
fs.mkdirSync(OUT, { recursive: true });
const BASE = `http://127.0.0.1:${process.env.PORT}/index.html?save=0&timescale=0&hour=12&clouds=0&life=0&online=1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (id, ok, info = '') => { results.push({ id, ok: !!ok, info }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${id} ${info}`); };
const S = (page) => page.evaluate(() => window.kilumen.online?.state() || null);
const waitFor = async (page, fn, arg, ms = 8000) => { try { await page.waitForFunction(fn, arg, { timeout: ms }); return true; } catch { return false; } };
const joined = (page) => waitFor(page, () => window.kilumen?.online?.state().status === 'joined', null, 20000);
const seesPeer = (page, id) => waitFor(page, (id) => window.kilumen.online.state().peers.some((p) => p.id === id && p.onScreen), id);
const errorsOf = (page) => { const e = []; page.on('pageerror', (x) => e.push(String(x))); page.on('console', (m) => { if (m.type() === 'error') e.push(m.text()); }); return e; };
const peerOf = (st, id) => st.peers.find((p) => p.id === id);

// ---- Part A: real BroadcastChannel, two tabs ----------------------------------------------------
async function partA() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const a = await ctx.newPage(), b = await ctx.newPage();
  const ea = errorsOf(a), eb = errorsOf(b);
  const url = `${BASE}&map=route1&x=4&y=30`;
  await a.goto(url); await b.goto(url);
  check('A.joined', (await joined(a)) && (await joined(b)));
  const [sa, sb] = [await S(a), await S(b)];
  check('A.same_channel', sa.channel === sb.channel, sa.channel);
  check('A.local_transport', sa.kind === 'local' && sb.kind === 'local');
  check('A.see_each_other', (await seesPeer(a, sb.id)) && (await seesPeer(b, sa.id)));
  check('A.names_tagged', await a.evaluate((n) => [...document.querySelectorAll('.ol-tag-name')].some((e) => e.textContent === n), sb.name), sb.name);
  // a walks up the path (down leads off the map to Brookhollow); b sees it move, and sees in-between (interpolated) positions, not just tile jumps
  const y0 = peerOf(await S(b), sa.id).pos.py;
  await a.bringToFront(); await a.keyboard.down('ArrowUp');
  const seen = new Set();
  for (let i = 0; i < 14; i++) { await sleep(50); const p = peerOf(await S(b), sa.id); if (p?.pos) seen.add(p.pos.py); }
  await a.keyboard.up('ArrowUp');
  const settled = (page) => page.waitForFunction(() => { const p = window.kilumen.scene.player.pixel(); return p.py % 64 === 0 && p.px % 64 === 0; });
  await settled(a);
  const ay = await a.evaluate(() => window.kilumen.scene.player.pixel().py);
  const ok = await waitFor(b, ([id, y]) => Math.abs((window.kilumen.online.state().peers.find((p) => p.id === id)?.pos.py ?? -1) - y) < 1, [sa.id, ay]);
  check('A.movement_seen', ay <= y0 - 128 && ok, `a py ${y0} -> ${ay}`);
  check('A.interpolated', [...seen].some((y) => y % 64 !== 0), `${seen.size} distinct y values, e.g. ${[...seen].slice(0, 6).join(',')}`);
  // quick chat by keyboard: T then 1 ("Hi!")
  await a.keyboard.press('KeyT'); await a.keyboard.press('Digit1');
  check('A.quickchat_received', await waitFor(b, (id) => window.kilumen.online.state().peers.find((p) => p.id === id)?.bubble === 'Hi!', sa.id));
  await b.bringToFront(); // DOM tags update on the next drawn frame; background tabs may skip frames
  check('A.bubble_on_screen', await waitFor(b, () => [...document.querySelectorAll('.ol-bubble')].some((e) => !e.hidden && e.textContent === 'Hi!'), null, 3000));
  await a.bringToFront();
  check('A.typed_chat_hidden_by_default', await a.evaluate(() => document.querySelector('.ol-typed').hidden && !window.kilumen.online.state().freeText));
  // cooldown: spam is dropped
  const sent0 = (await S(a)).counters.sent;
  await a.evaluate(() => { for (let i = 0; i < 5; i++) window.kilumen.online.sendPhrase('wow'); });
  check('A.cooldown', (await S(a)).counters.sent - sent0 <= 1, `${(await S(a)).counters.sent - sent0} sent of 5`);
  // block via Players panel (keyboard P, click Block) hides the ghost and persists across reload
  await b.bringToFront(); await b.keyboard.press('KeyP');
  await b.click(`.ol-row[data-peer="${sa.id}"] [data-act=block]`);
  await sleep(300);
  const bb = await S(b);
  check('A.block_hides', peerOf(bb, sa.id)?.hidden === true && !peerOf(bb, sa.id).onScreen && !(await b.evaluate((n) => [...document.querySelectorAll('.ol-tag-name')].some((e) => e.textContent === n), sa.name)));
  check('A.block_label_count', /0 nearby/.test(await b.textContent('.ol-label')), await b.textContent('.ol-label'));
  await b.reload(); await joined(b); await sleep(1200);
  const br = await S(b);
  check('A.block_persists', peerOf(br, sa.id)?.blocked === true && peerOf(br, sa.id).hidden === true);
  await b.evaluate((id) => window.kilumen.online.unblock(id), sa.id);
  check('A.unblock_shows', await seesPeer(b, sa.id));
  check('A.no_console_errors', !ea.length && !eb.length, [...ea, ...eb].join(' | ').slice(0, 300));
  await b.screenshot({ path: path.join(OUT, 'A_two_tabs.png') });
  await browser.close();
}

// ---- Part B: PC Chromium + iPhone 14 landscape WebKit through a Node bridge ---------------------------
const SHIM = () => {
  const Native = window.BroadcastChannel; const reg = new Set();
  class Bridged extends EventTarget {
    constructor(name) { super(); this.name = String(name); this.onmessage = null; reg.add(this); }
    postMessage(d) { window.__olBridgeSend(this.name, JSON.stringify(d)); }
    close() { reg.delete(this); }
  }
  window.__olBridgeDeliver = (name, json) => {
    for (const c of reg) if (c.name === name) { const ev = new MessageEvent('message', { data: JSON.parse(json) }); c.onmessage?.(ev); c.dispatchEvent(ev); }
  };
  window.BroadcastChannel = function (name) { return String(name).startsWith('kilumen-online:') ? new Bridged(name) : new Native(name); };
};

async function partB() {
  const cb = await chromium.launch(), wb = await webkit.launch();
  const dev = devices['iPhone 14 landscape'];
  const pcCtx = await cb.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: path.join(OUT, '_video_pc'), size: { width: 1280, height: 720 } } });
  const phCtx = await wb.newContext({ ...dev, recordVideo: { dir: path.join(OUT, '_video_phone'), size: dev.viewport } });
  const pc = await pcCtx.newPage(), ph = await phCtx.newPage();
  const epc = errorsOf(pc), eph = errorsOf(ph);
  const relay = (to) => async (_src, name, json) => { try { await to.evaluate(([n, j]) => window.__olBridgeDeliver?.(n, j), [name, json]); } catch { /* page navigating */ } };
  await pc.addInitScript(SHIM); await ph.addInitScript(SHIM);
  await pc.exposeBinding('__olBridgeSend', relay(ph)); await ph.exposeBinding('__olBridgeSend', relay(pc));
  await Promise.all([pc.goto(`${BASE}&map=route1&x=4&y=30`), ph.goto(`${BASE}&map=route1&x=5&y=30`)]);
  check('B.joined', (await joined(pc)) && (await joined(ph)));
  const [spc, sph] = [await S(pc), await S(ph)];
  check('B.profiles', spc && sph && (await pc.evaluate(() => window.kilumen.online.profile)) === 'pc' && (await ph.evaluate(() => window.kilumen.online.profile)) === 'mobile');
  check('B.see_each_other', (await seesPeer(pc, sph.id)) && (await seesPeer(ph, spc.id)), `${spc.channel} / ${sph.channel}`);
  await sleep(800);
  await pc.screenshot({ path: path.join(OUT, 'B_pc_01_see.png') }); await ph.screenshot({ path: path.join(OUT, 'B_phone_01_see.png') });

  // mobile buttons are thumb-sized
  const sizes = await ph.evaluate(() => [...document.querySelectorAll('.ol-bar .ol-btn')].map((b) => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); }));
  check('B.mobile_bar_buttons_44px', sizes.length === 2 && sizes.every((s) => s >= 44), sizes.map(Math.round).join(','));
  const center = (page, sel) => page.$eval(sel, (el) => { const b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
  const tap = async (sel) => { const [x, y] = await center(ph, sel); await ph.touchscreen.tap(x, y); };
  const hold = async (dir, ms) => {
    const [x, y] = await center(ph, `#touchpad [data-dir=${dir}]`);
    const ev = (type) => ph.evaluate(([type, x, y]) => { const t = window.__hold ||= document.elementFromPoint(x, y); if (type !== 'pointerdown' && type !== 'pointermove') window.__hold = null;
      t.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true, buttons: type === 'pointerup' ? 0 : 1 })); }, [type, x, y]);
    await ev('pointerdown'); await sleep(ms); await ev('pointerup');
  };

  // phone walks up the path with the d-pad; PC sees it
  const y0 = peerOf(await S(pc), sph.id).pos.py;
  await hold('up', 900);
  await ph.waitForFunction(() => { const p = window.kilumen.scene.player.pixel(); return p.py % 64 === 0 && p.px % 64 === 0; });
  const phY = await ph.evaluate(() => window.kilumen.scene.player.pixel().py);
  const movedOk = await waitFor(pc, ([id, y]) => Math.abs((window.kilumen.online.state().peers.find((p) => p.id === id)?.pos.py ?? -1) - y) < 1, [sph.id, phY]);
  check('B.phone_move_seen_on_pc', phY < y0 && movedOk, `phone py ${y0} -> ${phY}`);
  // PC walks up the path with the keyboard; phone sees it
  const py0 = peerOf(await S(ph), spc.id).pos.py;
  await pc.keyboard.down('ArrowUp'); await sleep(700); await pc.keyboard.up('ArrowUp');
  await pc.waitForFunction(() => { const p = window.kilumen.scene.player.pixel(); return p.py % 64 === 0 && p.px % 64 === 0; });
  const pcY = await pc.evaluate(() => window.kilumen.scene.player.pixel().py);
  check('B.pc_move_seen_on_phone', pcY < py0 && await waitFor(ph, ([id, y]) => Math.abs((window.kilumen.online.state().peers.find((p) => p.id === id)?.pos.py ?? -1) - y) < 1, [spc.id, pcY]), `pc py ${py0} -> ${pcY}`);

  // phone quick-chat by touch: Chat -> "Thanks!"
  await tap('[data-ol=chat]');
  const phr = await ph.evaluate(() => [...document.querySelectorAll('.ol-phrase')].map((b) => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); }));
  check('B.mobile_phrase_buttons_44px', phr.length >= 9 && phr.every((s) => s >= 44), `${phr.length} buttons, min ${Math.round(Math.min(...phr))}`);
  check('B.phrases_fit_landscape', await ph.evaluate(() => { const r = document.querySelector('.ol-chat').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1; }));
  await ph.screenshot({ path: path.join(OUT, 'B_phone_02_chat_panel.png') });
  await tap('[data-phrase=thanks]');
  check('B.phone_quickchat_on_pc', await waitFor(pc, (id) => window.kilumen.online.state().peers.find((p) => p.id === id)?.bubble === 'Thanks!', sph.id));
  check('B.panel_closed_after_send', await ph.evaluate(() => document.querySelector('.ol-chat').hidden));
  // PC quick-chat by mouse: Chat -> "Nice to meet you!"-style phrase (first one)
  await pc.click('[data-ol=chat]'); await pc.click('[data-phrase=hi]');
  check('B.pc_quickchat_on_phone', await waitFor(ph, (id) => window.kilumen.online.state().peers.find((p) => p.id === id)?.bubble === 'Hi!', spc.id));
  await sleep(400);
  await pc.screenshot({ path: path.join(OUT, 'B_pc_02_bubbles.png') }); await ph.screenshot({ path: path.join(OUT, 'B_phone_03_bubbles.png') });

  // PC mutes the phone player: phone bubbles no longer show on PC; unmute restores
  await pc.click('[data-ol=players]'); await pc.click(`.ol-row[data-peer="${sph.id}"] [data-act=mute]`); await pc.keyboard.press('Escape');
  await sleep(2100); // past the mobile chat cooldown
  await tap('[data-ol=chat]'); await tap('[data-phrase=wow]');
  await sleep(700);
  const muted = peerOf(await S(pc), sph.id);
  check('B.mute_hides_bubble', muted.muted && !muted.hidden && muted.bubble === null && muted.onScreen);
  await pc.evaluate((id) => window.kilumen.online.unmute(id), sph.id);

  // typed chat: off by default -> nothing shows; turn it on (both), filtered text arrives, bad text never leaves
  const ft = await ph.evaluate(() => window.kilumen.online.state().freeText);
  check('B.typed_off_by_default_phone', ft === false && await ph.evaluate(() => document.querySelector('.ol-typed').hidden));
  await pc.evaluate(() => window.kilumen.online.setFreeText(true)); await ph.evaluate(() => window.kilumen.online.setFreeText(true));
  await sleep(2100);
  await pc.click('[data-ol=chat]'); await pc.fill('.ol-input', 'want to explore the cave'); await pc.press('.ol-input', 'Enter');
  check('B.typed_text_arrives', await waitFor(ph, (id) => window.kilumen.online.state().peers.find((p) => p.id === id)?.bubble === 'want to explore the cave', spc.id));
  await sleep(1600);
  const sentBefore = (await S(pc)).counters.sent;
  const bad = await pc.evaluate(() => window.kilumen.online.sendText('add me on snap'));
  check('B.personal_info_blocked_sender', bad.ok === false && bad.reason === 'personal_info' && (await S(pc)).counters.sent === sentBefore);
  // a modified client sending raw text: receiver filters it again
  const drop0 = (await S(ph)).counters.dropped;
  await pc.evaluate(([from, ch]) => { const c = new BroadcastChannel(`kilumen-online:${ch}`); c.postMessage({ k: 'msg', from, type: 'say', payload: { text: 'you b1tch' } }); c.close(); }, [spc.id, spc.channel]);
  await sleep(600);
  check('B.receiver_refilters', peerOf(await S(ph), spc.id).bubble !== 'you b1tch' && (await S(ph)).counters.dropped === drop0 + 1, 'raw message arrived and was dropped');
  // turn typed chat off on the phone -> typed messages are not shown there any more
  await ph.evaluate(() => window.kilumen.online.setFreeText(false));
  await sleep(1600);
  await pc.evaluate(() => window.kilumen.online.sendText('see you around'));
  await sleep(600);
  check('B.typed_off_hides_typed', peerOf(await S(ph), spc.id).bubble !== 'see you around');

  // phone blocks the PC player by touch: Players -> Block
  await tap('[data-ol=players]');
  const rowBtns = await ph.evaluate(() => [...document.querySelectorAll('.ol-row .ol-btn')].map((b) => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); }));
  check('B.mobile_row_buttons_44px', rowBtns.length >= 3 && rowBtns.every((s) => s >= 44), rowBtns.map(Math.round).join(','));
  await ph.screenshot({ path: path.join(OUT, 'B_phone_04_players_panel.png') });
  await tap(`.ol-row[data-peer="${spc.id}"] [data-act=block]`);
  await sleep(500);
  const blk = peerOf(await S(ph), spc.id);
  check('B.phone_block_hides_pc', blk.blocked && blk.hidden && !blk.onScreen);
  await tap('.ol-players .ol-close');
  check('B.touch_controls_still_work', await (async () => { const y = await ph.evaluate(() => window.kilumen.scene.player.y); await hold('down', 500); await sleep(400); return (await ph.evaluate(() => window.kilumen.scene.player.y)) > y; })());
  await sleep(600);
  await pc.screenshot({ path: path.join(OUT, 'B_pc_03_end.png') }); await ph.screenshot({ path: path.join(OUT, 'B_phone_05_blocked.png') });
  check('B.no_console_errors', !epc.length && !eph.length, [...epc, ...eph].join(' | ').slice(0, 300));
  const vpc = await pc.video().path(), vph = await ph.video().path();
  await pcCtx.close(); await phCtx.close(); await cb.close(); await wb.close();
  fs.writeFileSync(path.join(OUT, 'videos.json'), JSON.stringify({ pc: vpc, phone: vph }, null, 2));
}

try { await partA(); await partB(); } catch (e) { check('crashed', false, e.stack); }
const fails = results.filter((r) => !r.ok);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
console.log(`\nonline e2e: ${results.length - fails.length}/${results.length} passed`);
process.exit(fails.length ? 1 : 0);
