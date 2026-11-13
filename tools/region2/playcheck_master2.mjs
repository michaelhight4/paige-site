// Headless play-check, Master 1 done -> Master 2 (Saltmere), on the STAGED region-2 data. Oct 23 2026, coder (region-2 groundwork).
// Same method as tools/playcheck_master1.mjs (real KilumenBattle engine, "sensible" player: best expected damage, heals when low,
// switches to healthiest; full heal before each trainer, retry up to 3x with 3 extra wild fights after a loss).
// Start: starter L10-11 + cloverkin L7-9 (the Master-1 play-check end state). Journey: East Road (catch 1 + wild battles + 6 trainers)
// -> Aurelith -> Salt Road (wild + 6 trainers) -> Ron 2 -> hall helpers h1-h3 -> Master 2. Day phase for wild rolls.
// Reads data/region2/encounters_region2.json + trainer_teams_region2.json (staged, not live).
// Run: node tools/region2/playcheck_master2.mjs [wildPerRoute=10] [seeds=20] [--evolve] [--skip-optional] [--catch=random|grainling|none]
//   --second=<species>: replace the Route 1 catch (default cloverkin), e.g. peeplark for a party with no grass creature.
//   --evolve: apply game evoLevels between battles (the game has NO evolution flow yet, so the default run does not evolve).
import { readFileSync } from 'node:fs';
import { KilumenBattle, xpForLevel } from '../../src/battle/battle.js';
import { DRAFT_CHART } from '../../src/battle/data/elements.js';
import { KILUMEN_RULES as R } from '../../src/battle/data/rules.js';
import { buildCreatures } from '../../src/battle/data/creatures.js';

const args = process.argv.slice(2), flag = (f) => args.includes(f), opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const nums = args.filter((a) => /^\d+$/.test(a)).map(Number);
const WILD = nums[0] ?? 10, SEEDS = nums[1] ?? 20, EVOLVE = flag('--evolve'), SKIP_OPT = flag('--skip-optional'), CATCH = opt('catch', 'grainling'), SECOND = opt('second', 'cloverkin');
const root = new URL('../../', import.meta.url);
const ENC = JSON.parse(readFileSync(new URL('data/region2/encounters_region2.json', root))).zones;
const TT = JSON.parse(readFileSync(new URL('data/region2/trainer_teams_region2.json', root)));
const C = buildCreatures(); const idOf = Object.fromEntries(Object.entries(C).map(([id, c]) => [c.name, id]));

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
const evolve = (c) => { if (!EVOLVE) return c; for (;;) { const nx = (C[c.species]?.evos || []).map((n) => idOf[n]).find((id) => C[id]?.evoLevel && c.level >= C[id].evoLevel); if (!nx) return c; c = { ...c, species: nx }; } };
const heal = (p) => p.map((c) => evolve({ species: c.species, level: c.level, xp: c.xp, ...(c.starter ? { starter: true } : {}) }));
const lv = (p) => p.map((c) => `${c.species} L${c.level}`).join(', ');
function roll(zone) { // day phase, weight-picked, level uniform
  const slots = ENC[zone].slots.filter((s) => !s.time || s.time.includes('day'));
  let t = rnd(slots.reduce((a, s) => a + s.weight, 0));
  const s = slots.find((x) => (t -= x.weight) < 0);
  return { species: s.species, level: s.level[0] + rnd(s.level[1] - s.level[0] + 1) };
}
function teamFor(key, starter) {
  const t = TT.teams[key];
  return (Array.isArray(t) ? t : t.byStarter[starter]).map((m) => ({ ...m }));
}
function wilds(party, zone, n) {
  let losses = 0;
  for (let i = 0; i < n; i++) {
    const order = [...party].sort((a, b) => a.level - b.level); // lowest-level leads so everyone trains
    const r = fight(order, [roll(zone)]);
    if (r.outcome !== 'win') losses++;
    const back = Object.fromEntries(order.map((c, k) => [k, c.starter]));
    party = heal(r.team.map((c, k) => ({ ...c, starter: back[k] })));
  }
  return { party, losses };
}

function run(starter) {
  let party = [{ species: starter, level: 10 + rnd(2), xp: 0, starter: true }, { species: SECOND, level: 7 + rnd(3), xp: 0 }];
  party.forEach((c) => { c.xp = xpForLevel(c.level); });
  const log = []; let wildLosses = 0;
  const trainerStep = (key) => {
    if (SKIP_OPT && TT.info[key]?.optional) return;
    party = heal(party).sort((a, b) => (a.starter ? -1 : b.starter ? 1 : 0));
    const foes = teamFor(key, starter), before = lv(party);
    let r = fight(party, foes, { trainer: true, who: key }), tries = 1;
    const firstTry = r.outcome === 'win';
    while (r.outcome !== 'win' && tries < 3 && !key.includes('ron_2')) {
      const w = wilds(heal(party), key.startsWith('route_east') ? 'route_east_grass' : 'route_aurelith_saltmere_grass', 3); party = w.party;
      r = fight(heal(party), foes, { trainer: true, who: key }); tries++;
    }
    log.push({ key, foes: foes.map((f) => `${f.species} L${f.level}`).join(', '), before, outcome: r.outcome, firstTry, turns: r.turns, tries });
    if (r.team.length === party.length) party = heal(r.team.map((c, k) => ({ ...c, starter: party[k].starter })));
  };
  // East Road: catch first (sensible: grainling, grass vs the water hall), then wild battles + trainers interleaved
  if (CATCH !== 'none') {
    let c = roll('route_east_grass'); if (CATCH !== 'random') c = { species: CATCH, level: 12 + rnd(2) };
    const r = fight(party, [c]); party = heal(r.team.map((x, k) => ({ ...x, starter: party[k].starter })));
    party.push({ species: c.species, level: c.level, xp: xpForLevel(c.level) });
  }
  const re = ['route_east.route_east_trainer_1', 'route_east.route_east_trainer_2', 'route_east.route_east_trainer_3', 'route_east.route_east_trainer_4', 'route_east.route_east_trainer_5', 'route_east.route_east_trainer_6'];
  const sa = re.map((k, i) => `route_aurelith_saltmere.route_aurelith_saltmere_trainer_${i + 1}`);
  let w = wilds(party, 'route_east_grass', Math.ceil(WILD / 2)); party = w.party; wildLosses += w.losses;
  re.slice(0, 3).forEach(trainerStep);
  w = wilds(party, 'route_east_reeds', 2); party = w.party; wildLosses += w.losses;
  w = wilds(party, 'route_east_grass', Math.floor(WILD / 2)); party = w.party; wildLosses += w.losses;
  re.slice(3).forEach(trainerStep);
  w = wilds(party, 'route_aurelith_saltmere_grass', Math.ceil(WILD / 2)); party = w.party; wildLosses += w.losses;
  sa.slice(0, 3).forEach(trainerStep);
  w = wilds(party, 'route_aurelith_saltmere_grass', Math.floor(WILD / 2)); party = w.party; wildLosses += w.losses;
  sa.slice(3).forEach(trainerStep);
  ['saltmere.saltmere_ron_2', 'saltmere_hall_int.saltmere_hall_int_h1', 'saltmere_hall_int.saltmere_hall_int_h2', 'saltmere_hall_int.saltmere_hall_int_h3', 'saltmere_hall_int.saltmere_hall_int_master'].forEach(trainerStep);
  return { starter, wildLosses, log, end: lv(party) };
}

const sum = {}; const ends = {};
for (const st of ['nibbin', 'cindrip', 'rillop']) for (let s = 1; s <= SEEDS; s++) {
  rng = s * 7919 + 17; const r = run(st);
  (ends[st] ||= []).push(r.end);
  for (const e of r.log) { const k = `${st} ${e.key.split('.')[1]}`; sum[k] ||= { wins: 0, first: 0, n: 0, turns: 0, tries: 0, before: e.before, foes: e.foes }; const v = sum[k]; v.n++; v.turns += e.turns; v.tries += e.tries; if (e.outcome === 'win') v.wins++; if (e.firstTry) v.first++; }
}
console.log(`playcheck_master2: wild/route ${WILD}, seeds ${SEEDS}, evolve ${EVOLVE}, skip optional ${SKIP_OPT}, catch ${CATCH}, second ${SECOND}`);
for (const [k, v] of Object.entries(sum)) console.log(k.padEnd(42), `win ${v.wins}/${v.n}`, `firstTry ${v.first}/${v.n}`, `avgTries ${(v.tries / v.n).toFixed(2)}`, `avgTurns ${(v.turns / v.n).toFixed(1)}`, `| seed1: ${v.before} | foes: ${v.foes}`);
for (const [st, e] of Object.entries(ends)) console.log('end', st, '| seed1:', e[0]);
