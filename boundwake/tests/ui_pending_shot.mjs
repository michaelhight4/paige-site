import { createRequire } from 'module';
import { mkdirSync, writeFileSync } from 'fs';
const require = createRequire(import.meta.url);
const pp = require(process.env.PPT || './node_modules/puppeteer-core');
const URL0 = process.env.BW_URL || 'http://localhost:8090/';
const OUT = 'tests/shots/ui_pending';
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/README.md`, `# Pending UI proof (Nov 5, 2026 CT)
Tabs wrap (all 8), everyday jobs, bond sheets (no gold), viewport-filling PC layout.
`);
const b = await pp.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu'] });
const pg = await b.newPage();
const shot = async (n) => { await new Promise((r) => setTimeout(r, 400)); await pg.screenshot({ path: `${OUT}/${n}.png` }); console.log('shot', n); };
const click = (sel) => pg.evaluate((q) => { const x = document.querySelector(q); if (x && !x.disabled) { x.click(); return true; } return false; }, sel);

await pg.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await pg.goto(URL0 + '?fresh&skipintro&nosave&seed=7&race=human&tod=day', { waitUntil: 'networkidle0' });
await click('#go');
const desk = await pg.evaluate(() => {
  const tabs = [...document.querySelectorAll('.tabs button')].map((b) => b.dataset.tab);
  const layout = document.querySelector('.play-layout');
  const cs = getComputedStyle(layout);
  const stage = getComputedStyle(document.getElementById('stage'));
  const mainH = document.querySelector('.play-main')?.getBoundingClientRect().height;
  const hubH = document.querySelector('.play-hub')?.getBoundingClientRect().height;
  return {
    tabs, tabCount: tabs.length,
    display: cs.display, cols: cs.gridTemplateColumns,
    stageW: stage.width, stageMax: stage.maxWidth,
    layoutMinH: cs.minHeight, mainH, hubH, viewH: innerHeight,
  };
});
console.log('desktop', desk);
await shot('01_desktop_fill_1920');

// Age to 6+ for ordinary jobs
for (let i = 0; i < 7; i++) await click('[data-a="age"]');
await click('[data-tab="work"]');
const work = await pg.evaluate(() => ({
  everyday: !!document.body.innerText.match(/Everyday work|Yard Hand|Picker|Inn Helper|Farmhand|Stable/),
  openings: [...document.querySelectorAll('[data-a="job"]')].length,
  unlocked: [...document.querySelectorAll('[data-a="job"]:not([disabled])')].map((b) => b.closest('.row')?.innerText?.split('\\n')[0]?.slice(0, 40)),
}));
console.log('work', work);
await shot('02_work_ordinary');

await click('[data-tab="bonds"]');
const bonds = await pg.evaluate(() => {
  const cards = [...document.querySelectorAll('.bond-card')];
  return {
    n: cards.length,
    sample: cards[0]?.innerText?.slice(0, 220),
    hasGold: /\\bgold\\b/i.test(document.querySelector('.play-body')?.innerText || ''),
    hasHealth: /Health/i.test(cards[0]?.innerText || ''),
    hasJob: /Yard Hand|Farmhand|Village lessons|Child|Inn|Cook|Picker|Counter|lessons/i.test(cards[0]?.innerText || ''),
  };
});
console.log('bonds', bonds);
await shot('03_bonds_stats');

await click('[data-tab="life"]');
const tabsVis = await pg.evaluate(() => {
  const btns = [...document.querySelectorAll('.tabs button')];
  return btns.map((b) => {
    const r = b.getBoundingClientRect();
    return { tab: b.dataset.tab, w: r.width, visible: r.width > 8 && r.bottom < innerHeight && r.top >= 0 };
  });
});
console.log('tabsVis', tabsVis);
await shot('04_tabs_all_visible');

// info still works
await pg.evaluate(() => document.querySelector('.play-side [data-info]')?.click());
await shot('05_info_panel');
await pg.evaluate(() => document.querySelector('[data-info-close]')?.click());

await b.close();
console.log('PENDING SHOTS DONE');
