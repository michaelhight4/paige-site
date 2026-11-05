import { createRequire } from 'module';
import { mkdirSync, writeFileSync } from 'fs';
const require = createRequire(import.meta.url);
const pp = require(process.env.PPT || './node_modules/puppeteer-core');
const URL0 = process.env.BW_URL || 'http://localhost:8090/';
const OUT = 'tests/shots/ui_backdrop_forest';
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/README.md`, `# Boundwake forest + icons + info + PC layout (Nov 5, 2026 CT)
- Hearthfold woodland (no cottage). Colored ico-*. Info panel on affinity/trait taps.
- Mobile = stacked column. PC ≥1024 = hub | main | side; Age under hub.
Motion not visible in stills (clouds/mist, orb, birds, grove, motes).
`);
const b = await pp.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu'] });
const pg = await b.newPage();
const shot = async (n) => { await new Promise((r) => setTimeout(r, 450)); await pg.screenshot({ path: `${OUT}/${n}.png` }); console.log('shot', n); };
const click = (sel) => pg.evaluate((q) => { const x = document.querySelector(q); if (x && !x.disabled) { x.click(); return true; } return false; }, sel);
const dismiss = async () => { while (await pg.$('.sheet')) { await click('.sheet button:not([disabled])'); await new Promise((r) => setTimeout(r, 70)); } };

// --- mobile ---
await pg.setViewport({ width: 400, height: 860, deviceScaleFactor: 2 });
await pg.goto(URL0 + '?fresh&skipintro&nosave&seed=7&race=human&tod=day', { waitUntil: 'networkidle0' });
const boot = await pg.evaluate(() => ({
  cottage: /bw-cottage/.test(document.querySelector('.bw-amb-art.on svg')?.innerHTML || ''),
  oak: /bw-oak/.test(document.querySelector('.bw-amb-art.on svg')?.innerHTML || ''),
  chips: document.querySelectorAll('[data-info]').length,
}));
console.log('boot', boot);
await shot('01_fate_day');

const info = await pg.evaluate(() => {
  const chip = document.querySelector('[data-info="light"],[data-info="fire"],[data-info="water"],[data-info="wind"],[data-info="earth"],[data-info="shadow"]');
  chip?.click();
  return { ok: !!document.querySelector('.info-pop'), key: chip?.dataset.info, title: document.querySelector('.info-card .card-hd')?.textContent?.replace(/\s+/g,' ').trim() };
});
console.log('info', info);
await shot('02_info_affinity');
await pg.evaluate(() => document.querySelector('[data-info-close]')?.click());

await click('#go');
await shot('03_life_hearthfold_mobile');
await click('[data-tab="bel"]');
await shot('04_belongings');

await click('[data-tab="life"]');
let got = false;
for (let i = 0; i < 90; i++) {
  if (await pg.$('.sheet')) { if (!got) { await shot('05_event_flares'); got = true; } await dismiss(); continue; }
  await click('[data-a="age"]');
}

await pg.goto(URL0 + '?fresh&skipintro&nosave&seed=7&race=human&tod=night', { waitUntil: 'networkidle0' });
await click('#go');
await shot('06_life_night_mobile');

// --- desktop expansive ---
await pg.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
await pg.goto(URL0 + '?fresh&skipintro&nosave&seed=7&race=human&tod=day', { waitUntil: 'networkidle0' });
await click('#go');
const desk = await pg.evaluate(() => {
  const side = document.querySelector('.play-side');
  const layout = document.querySelector('.play-layout');
  const cs = layout ? getComputedStyle(layout) : null;
  const dock = document.querySelector('.play-hub .dock');
  return {
    display: cs?.display,
    cols: cs?.gridTemplateColumns,
    sideVisible: side ? getComputedStyle(side).display : null,
    dockPos: dock ? getComputedStyle(dock).position : null,
    stageMax: getComputedStyle(document.getElementById('stage')).maxWidth,
  };
});
console.log('desktop', desk);
await shot('07_life_hearthfold_desktop');

// desktop info
await pg.evaluate(() => document.querySelector('.play-side [data-info]')?.click());
await shot('08_desktop_info_panel');
await pg.evaluate(() => document.querySelector('[data-info-close]')?.click());

await b.close();
console.log('ALL SHOTS DONE');
