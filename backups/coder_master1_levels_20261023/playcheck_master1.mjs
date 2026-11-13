// Headless play-check, new game -> Master of Fernwick (Oct 23 2026, coder). Drives the real engine (KilumenBattle) with
// the authored teams in src/battle/data/trainer_teams.js. The player is "sensible": each turn it picks the usable skill
// with the best expected damage (power x element chart x affinity x accuracy), heals with its heal skill when low, and
// switches to the healthiest creature when one faints. Journey: starter L5 -> test-run catches (2 wild, Route 1 L2-5)
// -> Route 1 grass (WILD battles) + 3 trainers -> Ron 1 -> hall helpers -> Master. Full heal before each trainer
// (heal counters in Brookhollow / Fernwick); between wild battles every 4th fight.
// Run: node tools/playcheck_master1.mjs [wildBattles=10] [seeds=20]
import { KilumenBattle, xpForLevel } from '../src/battle/battle.js';
import { authoredTeam } from '../src/battle/data/trainer_teams.js';
import { DRAFT_CHART } from '../src/battle/data/elements.js';
import { KILUMEN_RULES as R } from '../src/battle/data/rules.js';

const WILD = Number(process.argv[2] || 10), SEEDS = Number(process.argv[3] || 20);
const ROUTE1 = ['tumbloam', 'sailquill', 'burlbeetle', 'gloamtick', 'nibbin', 'dewmite', 'cloverkin', 'peeplark'];
const CATCH = { tumbloam: 'cloverkin', cindrip: 'cloverkin', rillop: 'cloverkin' }; // a sensible first catch per starter (grass)
let rng = 1; const rnd = (n) => { rng = (rng * 1103515245 + 12345) % 2147483648; return rng % n; };
const eff = (type, defTypes) => defTypes.reduce((m, d) => {
  const row = DRAFT_CHART[type.toLowerCase()] || {};
  return m * (row.strong?.includes(d) ? R.strong ?? 1.5 : row.weak?.includes(d) ? R.weak ?? 0.6 : 1);
}, 1);
function best(kb) {
  const req = kb.request(), me = kb.p1.active[0], foe = kb.p2.active[0];
  const myT = me.getTypes().map((t) => t.toLowerCase()), foeT = foe.getTypes().map((t) => t.toLowerCase());
  let pick = null, score = -1;
  req.moves.forEach((m, i) => {
    if (m.disabled) return;
    const mv = kb.battle.dex.moves.get(m.id);
    let s = mv.basePower * eff(mv.type, foeT) * (myT.includes(mv.type.toLowerCase()) ? 1.3 : 1) * ((mv.accuracy === true ? 100 : mv.accuracy) / 100);
    if (mv.heal && me.hp / me.maxhp < 0.35) s = 999;
    if (s > score) { score = s; pick = i; }
  });
  return `move ${(pick ?? 0) + 1}`;
}
function fight(party, foes, { trainer, who } = {}) {
  const kb = new KilumenBattle({ party, foes, wild: !trainer, bag: {}, seed: [rnd(9999), rnd(9999), rnd(9999), rnd(9999)], foeName: who || 'Wild' });
  for (let i = 0; i < 300 && !kb.battle.ended; i++) {
    const st = kb.request().state;
    if (st === 'switch') {
      const team = kb.request().team; let bi = -1, bh = -1;
      team.forEach((c, n) => { if (n > 0 && !c.fainted && c.hp > bh) { bh = c.hp; bi = n; } });
      kb.choose(`switch ${bi + 1}`);
    } else kb.choose(best(kb));
  }
  const r = kb.result();
  return { outcome: r.outcome, turns: r.turns, team: r.team.map((c) => ({ species: c.species, level: c.level, xp: c.xp, hp: c.hp })) };
}
const heal = (p) => p.map((c) => ({ species: c.species, level: c.level, xp: c.xp }));
const lv = (p) => p.map((c) => `${c.species} L${c.level}`).join(', ');

function run(starter) {
  let party = [{ species: starter, level: 5, xp: xpForLevel(5) }];
  const log = [];
  // test run: 2 catches (the starter wears them down; the catch itself is the crystal roll, not simulated here)
  for (let i = 0; i < 2; i++) { const r = fight(party, [{ species: ROUTE1[rnd(ROUTE1.length)], level: 2 + rnd(4) }]); party = heal(r.team); }
  party.push({ species: CATCH[starter], level: 4, xp: xpForLevel(4) });
  let wl = 0;
  for (let i = 0; i < WILD; i++) {
    // the sensible player leads with whoever is lowest level, so the catch trains too
    const order = [...party].sort((a, b) => a.level - b.level);
    const r = fight(order, [{ species: ROUTE1[rnd(ROUTE1.length)], level: 2 + rnd(5) }]);
    if (r.outcome !== 'win') wl++;
    party = r.team.map((c) => ({ ...c, hp: c.hp > 0 ? c.hp : undefined }));
    if (i % 4 === 3 || r.team.some((c) => c.hp === 0)) party = heal(party); else party = heal(party);
  }
  const steps = [['route1', 'trainer_r1_a'], ['route1', 'trainer_r1_b'], ['route1', 'trainer_r1_c'], ['fernwick', 'ron_rival_1'],
    ['fernwick_hall_int', 'helper_1'], ['fernwick_hall_int', 'helper_2'], ['fernwick_hall_int', 'master_fernwick']];
  for (const [map, id] of steps) {
    party = heal(party).sort((a, b) => (a.species === starter ? -1 : 1));
    const foes = authoredTeam({ map, id }, party.map((c) => ({ ...c, origin: c.species === starter ? { how: 'starter' } : {} })));
    const before = lv(party);
    let r = fight(party, foes, { trainer: true, who: id }), tries = 1;
    while (r.outcome !== 'win' && tries < 3 && id !== 'ron_rival_1') { // a loss: heal, train 3 more wild fights, retry
      for (let k = 0; k < 3; k++) { const w = fight(heal(party), [{ species: ROUTE1[rnd(ROUTE1.length)], level: 4 + rnd(3) }]); party = heal(w.team); }
      r = fight(heal(party), foes, { trainer: true, who: id }); tries++;
    }
    log.push({ id, foes: foes.map((f) => `${f.species} L${f.level}`).join(', '), before, outcome: r.outcome, turns: r.turns, tries });
    if (r.team.length === party.length) party = heal(r.team);
  }
  return { starter, wildLosses: wl, log, end: lv(party) };
}

const sum = {};
for (const st of ['tumbloam', 'cindrip', 'rillop']) for (let s = 1; s <= SEEDS; s++) {
  rng = s * 7919; const r = run(st);
  for (const e of r.log) { const k = `${st} ${e.id}`; sum[k] ||= { wins: 0, n: 0, turns: 0, tries: 0, before: e.before, foes: e.foes }; sum[k].n++; sum[k].turns += e.turns; sum[k].tries += e.tries; if (e.outcome === 'win') sum[k].wins++; }
  if (s === 1) console.log(JSON.stringify(r, null, 0));
}
for (const [k, v] of Object.entries(sum)) console.log(k.padEnd(30), `win ${v.wins}/${v.n}`, `avgTurns ${(v.turns / v.n).toFixed(1)}`, `avgTries ${(v.tries / v.n).toFixed(2)}`, `| seed1 team: ${v.before} | foes: ${v.foes}`);
