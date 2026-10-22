// Passive-bot simulator: node tools/sim_rates.mjs [n=60] -> popups/yr, median lifespan. Used for balance (stage 3 and 9).
import * as E from '../src/engine.js'; import { D } from '../src/data.js';
globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
await E.loadData(); const N = +process.argv[2] || 60; let pops = 0, years = 0; const ages = [], cats = {};
for (let seed = 1; seed <= N; seed++) {
  const s = E.newGame({ seed }); let guard = 0;
  while (s.alive && s.age < 130 && guard++ < 4000) {
    if (s.pending.length) { const p = s.pending[0]; pops++; if (p.kind === 'event') cats[E.Ev.eventById(p.id).cat] = (cats[E.Ev.eventById(p.id).cat] || 0) + 1; let r = E.resolveCard(s, 0); for (let c = 1; r && !r.ok && c < 4; c++) r = E.resolveCard(s, c); if (!r || !r.ok) s.pending.shift(); continue; }
    E.takeTurn(s); years++;
  }
  ages.push(s.alive ? 130 : Math.floor(s.ending.age));
}
ages.sort((a, b) => a - b); console.log(JSON.stringify({ popupsPerYear: +(pops / years).toFixed(3), medianLife: ages[ages.length >> 1], p10: ages[Math.floor(N * 0.1)], p90: ages[Math.floor(N * 0.9)], cats }));
