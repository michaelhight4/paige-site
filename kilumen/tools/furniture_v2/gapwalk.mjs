// Gap-walk test: walk the player down a one-square gap between furniture; screenshot + log the tile reached.
import { chromium } from '/workspace/kilumen/node_modules/playwright/index.mjs';
const [out, map, x, y, seq = 'D,D,D', label = 'gapwalk'] = process.argv.slice(2);
const b = await chromium.launch(); const res = {};
for (const [tag, port] of [['before', 8761], ['after', 8762]]) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage();
  await ctx.addInitScript(() => { localStorage.setItem('kilumen_alpha_notice_seen.v1', '1'); });
  await p.goto(`http://localhost:${port}/?save=0&timescale=0&hour=12&title=0&ix2=1`); await p.waitForTimeout(2500);
  for (let k = 0; k < 12; k++) { await p.keyboard.press('Enter'); await p.waitForTimeout(500); }
  await p.evaluate(async ([map, x, y]) => { await window.kilumen.ready; window.kilumen.scene.startWarp({ map, x: +x, y: +y, facing: 'down' }, 'dev'); }, [map, x, y]);
  await p.waitForTimeout(3000);
  const K = { U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' }; const path = [];
  for (const c of seq.split(',')) { const key = K[c]; await p.keyboard.down(key); await p.waitForTimeout(330); await p.keyboard.up(key); await p.waitForTimeout(250); path.push(await p.evaluate(() => { const pl = window.kilumen.scene.player; return pl.x + ',' + pl.y; })); }
  await p.waitForTimeout(600);
  res[tag] = path.join(' -> ');
  await p.screenshot({ path: `${out}/${label}_${tag}_pc.png` }); await ctx.close();
}
console.log(JSON.stringify(res)); await b.close();
