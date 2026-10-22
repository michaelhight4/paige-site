// Stage 3: quiet years. Plain years must not pop up; majors dominate. node tests/events_rate.mjs
import * as E from '../src/engine.js'; import assert from 'node:assert/strict';
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
await E.loadData(); let pops = 0, years = 0, quietYears = 0, major = 0, minor = 0;
for (let seed = 1; seed <= 30; seed++) {
  const s = E.newGame({ seed: seed * 7 }); let g = 0;
  while (s.alive && s.age < 70 && g++ < 3000) {
    if (s.pending.length) { const p = s.pending[0]; if (p.kind === 'bankruptcy') { E.resolveCard(s, 0); if (s.pending.length) E.resolveCard(s, 1); if (s.pending.length) E.resolveCard(s, 2); continue; } if (p.kind === 'event') { E.Ev.majorEv(E.Ev.eventById(p.id)) ? major++ : minor++; } pops++; let r = E.resolveCard(s, 0); for (let c = 1; r && !r.ok && c < 4; c++) r = E.resolveCard(s, c); if (!r || !r.ok) s.pending.shift(); continue; }
    const before = pops; E.takeTurn(s); years++; if (!s.pending.length || s.pending[0].kind === 'bankruptcy') quietYears++;
  }
}
const rate = pops / years; console.log({ rate: +rate.toFixed(3), quiet: +(quietYears / years).toFixed(2), major, minor });
assert.ok(rate < 0.6, 'popups/yr < 0.6 (was ~1.1)'); assert.ok(quietYears / years > 0.55, 'most years are quiet'); assert.ok(major > minor, 'major events dominate');
console.log('events_rate: PASS');
