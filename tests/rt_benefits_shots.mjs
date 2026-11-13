// RT Employee Benefits headless smoke + shots (Oct 23 2026, coder). LOCAL ONLY: writes shots/rt_benefits_v1/ (+ report.json, contact sheet by tools step).
// PC 1920x1080 (mouse + keyboard) and phone 844x390 (touch). New game -> starter -> one real catch (engine battle, Pack -> crystal)
// -> phone -> RT Employee Benefits -> buy a rank -> reload -> rank persisted; axe-core (incl. contrast) + in-viewport checks; no console errors.
// Dev shortcuts (named in the report): the starter is given with the same calls as intro.chooseStarter (no opening dialogue),
// crystals are added to the bag if the new game has none, and Ron 1 is marked beaten (scene.setFlag) so there is a point to spend.
// Usage: node tests/rt_benefits_shots.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots/rt_benefits_v1');
const AXE = path.join(ROOT, 'tools/free_tools/node_modules/axe-core/axe.min.js');
fs.mkdirSync(OUT, { recursive: true });
const PORT = await new Promise((res) => { const sv = net.createServer(); sv.listen(0, '127.0.0.1', () => { const p = sv.address().port; sv.close(() => res(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const base = `http://127.0.0.1:${PORT}/index.html`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
const VIEWS = [
  { plat: 'pc', ctx: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }, q: 'platform=pc', touch: false },
  { plat: 'phone', ctx: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, q: 'platform=mobile&touch=1', touch: true },
];
const report = { checks: [], errors: [], shots: [] };
const check = (plat, what, ok, info = '') => { report.checks.push({ plat, what, ok: !!ok, info }); console.log(ok ? 'PASS' : 'FAIL', plat, what, info ? String(info).slice(0, 300) : ''); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BLOCKED = /\bPP\b|shiny|super effective|Pok[eé] ?dex|Pok[eé] ?Ball|Gotcha|\bnurse|\bweed|\broutes?\b|\bthrow/i;
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
try {
  for (const v of VIEWS) {
    const ctx = await browser.newContext(v.ctx);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => report.errors.push(`${v.plat}: ${e}`));
    page.on('response', (r) => { if (r.status() >= 400) report.errors.push(`${v.plat} http ${r.status()}: ${r.url().replace(base.replace('/index.html', ''), '')}`); });
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) report.errors.push(`${v.plat} console: ${m.text()}`); });
    let n = 0;
    const S = (fn, a) => page.evaluate(fn, a);
    const shot = async (label) => { const f = `${String(++n).padStart(2, '0')}_${v.plat}_${label}.png`; await page.screenshot({ path: path.join(OUT, f) }); report.shots.push(f); };
    const tap = async (sel) => { const el = page.locator(sel).first(); await el.waitFor({ state: 'visible', timeout: 15000 }); if (v.touch) await el.tap(); else await el.click(); await wait(350); };
    const key = async (k) => { await page.keyboard.down(k); await wait(80); await page.keyboard.up(k); await wait(300); };
    const boot = async (extra = '') => {
      await page.goto(`${base}?audio=0&online=0&hour=12&weather=clear&skipintro=1&${v.q}${extra}`);
      await page.waitForFunction(() => window.kilumen?.ui && window.kilumen.scene?.tileset && window.kilumen.scene.systems?.rtBenefits?.data && window.kilumen.ui.scr_rt_benefits, null, { timeout: 30000 });
      await wait(1200);
    };
    const inView = (sels) => S((sels) => sels.flatMap((sel) => [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return { sel, ok: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && r.width > 0, r: [r.left, r.top, r.right, r.bottom].map(Math.round) }; })), sels);
    const layout = async (what, sels) => { const all = await inView(sels); check(v.plat, `${what}: ${sels.join(', ')} inside the viewport`, all.length && all.every((x) => x.ok), JSON.stringify(all.filter((x) => !x.ok).slice(0, 3))); };
    const axe = async (what, sel) => {
      if (!(await S(() => !!window.axe))) await page.addScriptTag({ path: AXE });
      const run = await S(async (sel) => (await window.axe.run(sel)).violations.map((x) => ({ id: x.id, s: `${x.id}(${x.impact}) x${x.nodes.length}: ${x.nodes[0]?.target.join(' ')}` })), sel);
      const vv = run.filter((x) => x.id !== 'aria-dialog-name').map((x) => x.s); // aria-dialog-name: pre-existing on the shared .ui-root (contacts_shots.mjs)
      check(v.plat, `${what}: axe-core (incl. color-contrast) on ${sel}`, vv.length === 0, vv.join(' | '));
    };
    const co = () => S(() => { const r = window.kilumen.scene.systems.rtBenefits; return { ...JSON.parse(JSON.stringify(r.company)), progress: r.progress() }; });

    // 1) new game (fresh browser profile + ?reset=1)
    await boot('&reset=1');
    const c0 = await co();
    check(v.plat, 'new game: company XP 0, ID 1, 0 points, 6-digit employee ID', c0.xp === 0 && c0.idLevel === 1 && c0.pointsFree === 0 && /^\d{6}$/.test(c0.employeeId), JSON.stringify(c0));
    await shot('new_game');

    // 2) starter (same calls as intro.chooseStarter)
    await S(() => { const s = window.kilumen.scene, sys = s.systems; sys.party.chooseStarter('cindrip', { origin: { map: s.map.name, how: 'starter', day: 0 } }); sys.kilindex?.markCaught?.('cindrip', { zone: s.map.name }); s.setFlag('got_starter'); });
    await wait(600);
    const c1 = await co();
    check(v.plat, 'starter: +40 promotion (got_starter) +10 Kilindex log', c1.xp === 50, JSON.stringify({ xp: c1.xp, claims: c1.xpClaims }));

    // 3) one real catch: engine battle, Pack -> crystal
    await S(() => { const b = window.kilumen.scene.systems.bag; const has = Object.entries(b.items || b.toEngine?.() || {}).some(([k, n]) => /crystal/.test(k) && n > 0); if (!has) b.add('dominance_crystal', 3); });
    await S(() => window.kilumen.ui.open('battle', { foe: 'rillop', foeLevel: 2, forceChance: true }));
    const cmds = async () => { for (let k = 0; k < 120; k++) { const s = await S(() => { const c = document.querySelector('#b-cmds'), m = document.querySelector('#b-msg'); return { cmds: c && !c.hidden ? [...c.querySelectorAll('.b-cmd')].map((e) => e.textContent) : null, more: !!m?.querySelector('.more') }; }); if (s.cmds?.length) return s.cmds; if (s.more) await tap('#b-msg'); await wait(150); } return null; };
    const k0 = await cmds();
    const lockMid = await S(() => window.kilumen.scene.saveLockReason());
    check(v.plat, 'battle: save locked mid battle', !!lockMid, lockMid);
    await tap('#b-cmds .b-cmd[data-i="1"]'); // Pack
    const k1 = await cmds(); const ci = k1?.findIndex((t) => /Crystal/.test(t)) ?? -1;
    if (ci >= 0) await tap(`#b-cmds .b-cmd[data-i="${ci}"]`);
    await page.waitForFunction(() => /with you now/.test(document.querySelector('#b-msg')?.textContent || ''), null, { timeout: 20000 }).catch(() => {});
    await shot('catch');
    const midXp = await co();
    for (let i = 0; i < 20 && (await S(() => window.kilumen.ui.active)); i++) { await tap('#b-msg').catch(() => {}); await wait(300); }
    for (let i = 0; i < 30 && (await S(() => { const s = window.kilumen.scene; return s.busy || s.dialog?.active; })); i++) { if (v.touch) await page.tap('.dlg-box').catch(() => {}); else await page.keyboard.press('Enter'); await wait(300); }
    await wait(800);
    const c2 = await co();
    check(v.plat, 'catch: first catch +30, Kilindex log +10 (90 XP)', c2.xp === 90 && c2.xpClaims.first_catch === 1, JSON.stringify({ cmds: k0, pack: k1, mid: midXp.xp, xp: c2.xp, claims: c2.xpClaims }));

    // 4) Ron 1 beaten (flag) -> 130 XP -> ID 2, 1 point
    await S(() => window.kilumen.scene.setFlag('beat_rival_ron_1')); await wait(300);
    const c3 = await co();
    check(v.plat, 'level up: 130 XP -> ID 2 with 1 point', c3.xp === 130 && c3.idLevel === 2 && c3.pointsFree === 1, JSON.stringify({ xp: c3.xp, id: c3.idLevel, pts: c3.pointsFree }));

    // 5) phone -> RT Employee Benefits tile (real tap / click)
    await S(() => window.kilumen.ui.open('phone')); await wait(700);
    const tiles = await S(() => [...document.querySelectorAll('.ui-root [data-i]')].map((e) => e.textContent.trim()));
    check(v.plat, 'phone: RT Employee Benefits tile is last, existing order kept', /RT Employee Benefits/.test(tiles.at(-1) || '') && /Team/.test(tiles[0] || ''), JSON.stringify(tiles));
    await shot('phone_menu');
    await layout('phone menu', ['.ui-root [data-i]']);
    const ti = tiles.length - 1;
    await tap(`.ui-root [data-i="${ti}"]`); // first tap selects + opens (phone tiles open on tap)
    if (!(await S(() => window.kilumen.ui.top?.scr === 'rt_benefits'))) await tap(`.ui-root [data-i="${ti}"]`);
    await wait(900);
    check(v.plat, 'tab opens', await S(() => window.kilumen.ui.top?.scr === 'rt_benefits'));
    const head = await S(() => ({ eid: document.querySelector('[data-rtb="eid"]')?.textContent, lv: document.querySelector('[data-rtb="lv"]')?.textContent, pts: document.querySelector('[data-rtb="pts"]')?.textContent,
      title: document.querySelector('.ui-root .ui-title')?.textContent?.trim(), nodes: [...document.querySelectorAll('.rtb-node')].map((e) => `${e.dataset.node}:${e.dataset.state}`), text: document.querySelector('.ui-root').innerText }));
    check(v.plat, 'header: bare 6-digit employee ID = save, ID 2, 1 point; title "RT Employee Benefits"', head.eid === c3.employeeId && /^\d{6}$/.test(head.eid) && head.lv === 'ID 2' && head.pts === '1 pt' && /RT Employee Benefits/.test(head.title), JSON.stringify({ ...head, text: undefined }));
    check(v.plat, 'tree: store_discount + rt_payout available, region 2 nodes locked', head.nodes.join(',') === 'copay_coverage:locked,store_discount:available,rt_payout:available,crystal_grade:locked,unit_training:locked', head.nodes.join(','));
    check(v.plat, 'tab text: no blocked words', !BLOCKED.test(head.text), head.text.match(BLOCKED)?.[0] || '');
    await shot('tab');
    await layout('tab', ['#rtbinfo', '.rtb-id', '.ui-hint', '.rtb-node[data-node="copay_coverage"]', '.rtb-node[data-node="store_discount"]']);
    // every node is reachable: the tree panel scrolls (phone) and selection scrolls into view (ui.js _select)
    const reach = await S(() => [...document.querySelectorAll('.rtb-node')].map((e) => { e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return { n: e.dataset.node, ok: r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1 }; }));
    check(v.plat, 'tab: every node can be scrolled into the viewport', reach.every((x) => x.ok), JSON.stringify(reach.filter((x) => !x.ok)));
    if (v.touch) { await shot('tab_scrolled'); }
    await S(() => { document.querySelector('.rtb-main').scrollTop = 0; });
    const hits = await S(() => [...document.querySelectorAll('.rtb-node')].map((e) => Math.round(e.getBoundingClientRect().height)));
    check(v.plat, 'node hit targets >= 44px tall', hits.every((h) => h >= 44), JSON.stringify(hits));
    await axe('tab', '.ui-root');

    // 6) buy store_discount rank I
    if (v.touch) {
      await tap('.rtb-node[data-node="store_discount"]'); // tap = details only
      check(v.plat, 'tap a node: details + Buy button, no confirm yet', await S(() => !!document.querySelector('#rtbinfo .rtb-buy') && !window.kilumen.ui.modal));
      await shot('detail');
      await tap('#rtbinfo .rtb-buy');
    } else {
      await key('ArrowRight'); // keyboard: spatial move to Supply & Pay
      const sel = await S(() => document.querySelector('.rtb-node.sel')?.dataset.node);
      check(v.plat, 'keyboard: arrow moves to store_discount, details show', sel === 'store_discount' && (await S(() => /Discount|Store/i.test(document.querySelector('#rtbinfo')?.textContent || ''))), sel);
      await shot('detail');
      await key('Enter');
    }
    await wait(500);
    check(v.plat, 'confirm box shows', await S(() => !!window.kilumen.ui.modal && !!document.querySelector('.ui-modal [data-m="0"]')));
    await shot('confirm');
    await axe('confirm', '.ui-modal');
    await tap('.ui-modal [data-m="0"]');
    await wait(700);
    await S(() => window.kilumen.save.flush?.());
    await wait(400);
    const c4 = await co();
    check(v.plat, 'bought: store_discount rank 1, 0 points left', c4.board.store_discount === 1 && c4.pointsFree === 0, JSON.stringify({ board: c4.board, pts: c4.pointsFree }));
    await shot('bought');
    const after = await S(() => [...document.querySelectorAll('.rtb-node')].map((e) => `${e.dataset.node}:${e.dataset.state}`).join(','));
    check(v.plat, 'tree after buy: store_discount owned', /store_discount:owned/.test(after), after);
    await axe('tab after buy', '.ui-root');

    // 7) reload (no reset) -> persisted
    await S(() => window.kilumen.ui.closeAll()); await wait(300);
    await boot('');
    const c5 = await co();
    check(v.plat, 'reload: rank, XP, ID and employee ID persisted', c5.board.store_discount === 1 && c5.xp === 130 && c5.idLevel === 2 && c5.pointsFree === 0 && c5.employeeId === c3.employeeId, JSON.stringify({ board: c5.board, xp: c5.xp, id: c5.idLevel, pts: c5.pointsFree, eid: c5.employeeId }));
    await S(() => { const ui = window.kilumen.ui; if (ui.active) ui.closeAll(); ui.open('phone'); }); await wait(600);
    await S(() => window.kilumen.ui.open('rt_benefits')); await wait(900);
    const st = await S(() => document.querySelector('.rtb-node[data-node="store_discount"]')?.dataset.state);
    check(v.plat, 'reload: tab shows store_discount owned', st === 'owned', st);
    await shot('reloaded');
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
// pre-existing, not this feature: src/ui/fx_art.js probes optional capture-pose art per roster character and logs the missing ones itself
const KNOWN = /http 404: \/art\/characters\/pixel\/capture_poses\/.*\/hold_points\.json$/;
report.known = report.errors.filter((e) => KNOWN.test(e)); report.errors = report.errors.filter((e) => !KNOWN.test(e));
check('all', `no console errors / page errors (known optional-art 404s ignored: ${report.known.length})`, report.errors.length === 0, report.errors.slice(0, 5).join(' | '));
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const fails = report.checks.filter((c) => !c.ok);
console.log('checks', report.checks.length, 'fails', fails.length, 'errors', report.errors.length);
process.exitCode = fails.length ? 1 : 0;
