// Ink proof check (Oct 22, 2026, four-tools pass): maps.brookhollow.villager_garden must show IDENTICALLY with the ink
// adapter on (?ink=1, story text/ink/villager_garden.ink.json) and off (default, text/overworld_lines.json).
// 4 states (beat_master_fernwick off/on x lead creature none/one): compares every dialogue-box page (DOM .dlg-text,
// speaker name), the scene.log 'line' id and 'say' text, and that ?ink=1 really served the spot from ink.
// Usage: PORT=<http.server port> node tests/ink_dialogue_e2e.mjs   (exit 1 on any difference or page error)
import { chromium } from 'playwright';

const base = `http://127.0.0.1:${process.env.PORT || 8080}/index.html`;
const STATES = [
  { tag: 'no flag, no lead', flags: '', lead: false },
  { tag: 'no flag, lead', flags: '', lead: true },
  { tag: 'flag, no lead', flags: 'beat_master_fernwick', lead: false },
  { tag: 'flag, lead', flags: 'beat_master_fernwick', lead: true },
];

async function run(browser, st, ink) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const url = `${base}?save=0&timescale=0&hour=12&map=brookhollow&x=17&y=13&clouds=0&life=0&audio=0${st.flags ? '&flags=' + st.flags : ''}${ink ? '&ink=1' : ''}`;
  await page.goto(url);
  await page.waitForFunction(() => window.kilumen?.scene?.tileset, null, { timeout: 20000 });
  await page.evaluate(() => window.kilumen.ready);
  if (ink) await page.waitForFunction(() => window.kilumen.scene.ink, null, { timeout: 10000 });
  const setup = await page.evaluate((lead) => {
    const s = window.kilumen.scene;
    s.party = lead ? [{ species: Object.keys(s.warmth?.creatures || { sproutle: 1 })[0], nickname: 'Pip', warmth: 50 }] : [];
    const n = s.npcs.list.find((x) => (x.def?.id || x.id) === 'villager_garden');
    if (!n) return { error: 'villager_garden not on map' };
    s.log.length = 0;
    s.talk(n, n.def);
    return { ok: true, inkSpots: s.ink?.spots || null, entryInk: s._entryFor('brookhollow', n.def)?.ink || null };
  }, st.lead);
  const pages = [];
  for (let i = 0; i < 6; i++) {
    const open = await page.waitForFunction(() => !!window.kilumen.scene.dialog?.cur, null, { timeout: 3000 }).then(() => true, () => false);
    if (!open) break;
    pages.push(await page.evaluate(() => ({ name: document.querySelector('.dlg-name')?.hidden ? '' : document.querySelector('.dlg-name')?.textContent, text: document.querySelector('.dlg-text')?.textContent })));
    await page.keyboard.press('Space'); await page.waitForTimeout(120);
  }
  const log = await page.evaluate(() => window.kilumen.scene.log.filter((e) => e.type === 'line' || e.type === 'say').map(({ type, id, key, text, speaker }) => ({ type, id, key, text, speaker })));
  await page.close();
  return { setup, pages, log, errors };
}

const browser = await chromium.launch();
let bad = 0;
try {
  for (const st of STATES) {
    const off = await run(browser, st, false), on = await run(browser, st, true);
    const same = JSON.stringify([off.pages, off.log]) === JSON.stringify([on.pages, on.log]);
    const served = on.setup.entryInk === 'maps.brookhollow.villager_garden' && !off.setup.entryInk;
    const ok = same && served && off.pages.length > 0 && !off.errors.length && !on.errors.length && !off.setup.error;
    if (!ok) bad++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${st.tag}: line=${off.log.find((e) => e.type === 'line')?.id} pages=${off.pages.length} identical=${same} inkServed=${served}`);
    for (const p of on.pages) console.log(`   ink  | ${p.name ? p.name + ': ' : ''}${p.text}`);
    if (!same) for (const p of off.pages) console.log(`   json | ${p.name ? p.name + ': ' : ''}${p.text}`);
    for (const e of [...off.errors, ...on.errors]) console.log(`   error: ${e}`);
    if (off.setup.error) console.log('   ' + off.setup.error);
  }
} finally { await browser.close(); }
console.log(bad ? `${bad} state(s) differ` : 'ink proof: all states identical');
process.exit(bad ? 1 : 0);
