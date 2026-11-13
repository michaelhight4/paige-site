// Calibration: a sharp bot (with reaction lag) per town event. Gold should be reachable but not free.
import { EVENTS, scoreOf, gradeOf } from '../../src/sports/town_events.js';
const dt = 1 / 30, lag = Number(process.argv[2] || 0.25);
const bots = {
  garden_hop: (s, ev) => s.stepT > lag && Math.abs(s.bob - 0.5) < 0.1 ? (s.pair.stone || s.pair.safeLeft ? { left: true } : { right: true }) : {},
  tide_run: (s, ev) => { if (s.stun > 0) return {}; const nr = s.row - 1; const probe = { ...s, row: nr, waves: s.waves.map((w) => ({ ...w, x: w.x + w.dir * w.speed * (lag + 0.1) })) }; return nr < 0 || !ev.hit(probe) ? { up: true } : {}; },
  signal_relay: (s, ev) => { if (s.phase !== 'input' || (s._w = (s._w || 0) + dt) < lag) return {}; s._w = 0; return { [ev.keys[s.seq[s.pos]]]: true }; },
  ice_slide: (s) => { const g = s.objs.filter((o) => !o.done && o.gate && o.y > 0.2).sort((a, b) => b.y - a.y)[0]; const want = g ? g.x : 0.5, ahead = s.x + s.vx * 0.6; return { hold: { left: ahead > want + 0.03, right: ahead < want - 0.03 } }; },
  lantern_catch: (s) => { const it = s.items.filter((i) => !i.soot && i.y > lag * s.fall).sort((a, b) => b.y - a.y)[0]; const want = it ? it.x : 0.5; return { hold: { left: s.x > want + 0.02, right: s.x < want - 0.02 }, tap: it && Math.abs(it.y - 0.9) < 0.03 }; },
  forge_push: (s) => ({ tap: s.marker != null && Math.abs(s.marker - s.zc) < s.zone * (0.25 + lag) && (s._c = (s._c || 0) + 1) % 3 === 0 }),
};
for (const ev of EVENTS) {
  const res = [];
  for (let k = 0; k < 20; k++) { const s = ev.create('cal' + k, { agility: 55, focus: 55, speed: 55, power: 55, stamina: 55 }, 3); let i = 0; while (!s.done && i < 4000) { ev.step(s, dt, bots[ev.id](s, ev)); i++; } res.push(scoreOf(ev, s)); }
  res.sort((a, b) => a - b); const med = res[10];
  console.log(ev.id.padEnd(14), 'median', med, 'range', res[0], '-', res[19], 'bars', ev.bars.join('/'), '->', gradeOf(ev, { score: med, dist: med }));
}
