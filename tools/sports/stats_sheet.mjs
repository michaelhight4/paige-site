// Renders shots/sports_v1/stats_sheet.png: 6 species' athletic ranges + 4 seeded rolls each.
import { chromium } from 'playwright';
import { ATHLETICS } from '../../src/sports/data/athletics.gen.js';
import { STATS } from '../../src/sports/rules.js';
import { athleticStats } from '../../src/sports/athletics.js';
const all = Object.keys(ATHLETICS); const shapes = {}; for (const s of all) shapes[ATHLETICS[s].shape] ??= s;
const pick = ['nibbin', 'peeplark', ...Object.values(shapes)].filter((v, i, a) => a.indexOf(v) === i && ATHLETICS[v]).slice(0, 6);
let html = `<style>body{font:13px monospace;background:#14161c;color:#e6e6e6;margin:16px}h1{font-size:18px}table{border-collapse:collapse;margin:0 0 14px}td,th{border:1px solid #333;padding:3px 7px}th{background:#252a35}.r{color:#9ad}</style><h1>Kilumen athletics: species ranges + seeded rolls</h1>`;
for (const sp of pick) {
  const A = ATHLETICS[sp];
  html += `<b>${sp}</b> <span class=r>(shape ${A.shape}${A.types ? ', ' + A.types.join('/') : ''})</span><table><tr><th></th>${STATS.map((s) => `<th>${s}</th>`).join('')}<th>traits</th></tr>`;
  html += `<tr class=r><td>range</td>${STATS.map((s) => `<td>${A.ranges[s][0]}-${A.ranges[s][1]}</td>`).join('')}<td></td></tr>`;
  for (let i = 1; i <= 4; i++) { const c = { species: sp, uid: `c-demo-${sp}-${i}` }; const v = athleticStats(c); html += `<tr><td>roll ${c.uid}</td>${STATS.map((s) => `<td>${v[s]}</td>`).join('')}<td>${c.ath.traits.join(', ')}</td></tr>`; }
  html += '</table>';
}
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 400 } });
await p.setContent(html); await p.screenshot({ path: 'shots/sports_v1/stats_sheet.png', fullPage: true }); await b.close(); console.log(pick.join(','));
