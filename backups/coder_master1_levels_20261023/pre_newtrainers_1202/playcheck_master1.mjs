// Headless play-check, new game -> Master of Fernwick (Oct 23 2026, coder). Drives the real engine (KilumenBattle) with
// the authored teams in src/battle/data/trainer_teams.js. The player is "sensible": each turn it picks the usable skill
// with the best expected damage (power x element chart x affinity x accuracy), heals with its heal skill when low, and
// switches to the healthiest creature when one faints. Journey: starter L5 -> test-run catches (2 wild, Route 1 L2-5)
// -> Route 1 grass (WILD battles) + 3 trainers -> Ron 1 -> hall helpers -> Master. Full heal before each trainer
// (heal counters in Brookhollow / Fernwick); between wild battles every 4th fight.
// Run: node tools/playcheck_master1.mjs [wildBattles=14] [seeds=20]  (env: TONICS=3 Small Remedies in trainer fights,
// CATCH_EVERY=2 the catch leads every 2nd wild fight, WILD_MAX, XP_DIV / XP_TM to try other XP rules). Oct 23 2026 noon:
// wilds come from the wired Trail 1 table (L2-4); the trail level scaling keeps levels inside that range, so a uniform roll
// is used; level-up evolution (src/systems/evolution.js) is applied after won fights.
import fs from 'node:fs';
import { KilumenBattle, xpForLevel } from '../src/battle/battle.js';
import { authoredTeam } from '../src/battle/data/trainer_teams.js';
import { DRAFT_CHART } from '../src/battle/data/elements.js';
import { KILUMEN_RULES as R } from '../src/battle/data/rules.js';
import { speciesById } from '../src/ui/data.js';
import { nextEvolution } from '../src/systems/evolution.js';
import { scaledLevel } from '../src/battle/level_scale.js';

const WILD = Number(process.argv[2] || 14), SEEDS = Number(process.argv[3] || 20);
// Trail 1 wild table as wired today (data/encounters_wired.json sunmeadow_grass: L2-4, first-stage only, Gary 11:42 cap),
// daytime, no storm. Levels follow the trail scaling (src/battle/level_scale.js scaledLevel): t = progress north (0 at
// Brookhollow, 1 at the Fernwick end). WILD_MAX (optional) widens the slot top to model a raised late-trail range.
const WZ = JSON.parse(fs.readFileSync(new URL('../data/encounters_wired.json', import.meta.url))).zones.sunmeadow_grass;
const WILD_TABLE = WZ.slots.filter((x) => !x.weather && (!x.time || x.time.includes('day')));
const WILD_MAX = Number(process.env.WILD_MAX || 0); // 0 = the table as wired
const rand01 = () => rnd(1000000) / 1000000;
const wildFoe = (t = rand01()) => { const tw = WILD_TABLE.reduce((a, x) => a + x.weight, 0); let r = rnd(tw), sl = WILD_TABLE[0];
  for (const x of WILD_TABLE) { if ((r -= x.weight) < 0) { sl = x; break; } }
  const [lo, hi0] = sl.level, hi = WILD_MAX ? Math.max(hi0, WILD_MAX) : hi0;
  return { species: sl.species, level: scaledLevel(lo, hi, t, rand01, WILD_MAX ? null : WZ.cap?.level) }; };
// Gary 12:01 PM CT: "the point of the game is to grind in the grass and log more kilumen". GRIND_TO=L: after the hall
// helpers, the player goes back to the Fernwick end of Trail 1 (t=1) and grinds until the starter is L. GRIND_STYLE:
// 'starter' = the starter leads every fight; 'team' = a second catch joins (team of 3) and the lowest-level creature leads.
const GRIND_TO = Number(process.env.GRIND_TO || 0), GRIND_STYLE = process.env.GRIND_STYLE || 'starter', GRIND_MAX = 600;
const ROUTE1 = ['tumbloam', 'sailquill', 'burlbeetle', 'gloamtick', 'nibbin', 'dewmite', 'cloverkin', 'peeplark'];
const CATCH = { tumbloam: 'cloverkin', cindrip: 'cloverkin', rillop: 'cloverkin' }; // a sensible first catch per starter (grass)
const evolved = [];
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
// XP_DIV / XP_TM env: try other XP rules without editing rules.js. TONICS env: Small Remedies carried into hall fights.
const RULES = process.env.XP_DIV || process.env.XP_TM ? { ...R, xpDivisor: Number(process.env.XP_DIV || R.xpDivisor), xpTrainerMult: Number(process.env.XP_TM || R.xpTrainerMult) } : undefined;
const TONICS = Number(process.env.TONICS ?? 3);
const CATCH_EVERY = Number(process.env.CATCH_EVERY || 2); // the catch leads every Nth wild fight
// matchup score of my creature vs a foe species: my best element vs it, minus its best element vs me
const els = (sp) => speciesById(sp).el.map((e) => e.toLowerCase());
const matchup = (me, foe) => Math.max(...els(me).map((e) => eff(e, els(foe)))) - Math.max(...els(foe).map((e) => eff(e, els(me))));
function fight(party, foes, { trainer, who } = {}) {
  const bag = trainer && TONICS ? { tonic_small: TONICS } : {};
  const kb = new KilumenBattle({ party, foes, wild: !trainer, bag, rules: RULES, seed: [rnd(9999), rnd(9999), rnd(9999), rnd(9999)], foeName: who || 'Wild' });
  for (let i = 0; i < 300 && !kb.battle.ended; i++) {
    const st = kb.request().state;
    if (st === 'switch') {
      const team = kb.request().team; let bi = -1, bh = -1;
      team.forEach((c, n) => { if (n > 0 && !c.fainted && c.hp > bh) { bh = c.hp; bi = n; } });
      kb.choose(`switch ${bi + 1}`);
    } else {
      const q = kb.request(), me = kb.p1.active[0];
      if ((q.bag?.tonic_small || 0) > 0 && me.hp / me.maxhp < 0.3 && me.maxhp - me.hp >= 20 && kb.choose('item tonic_small') === true) continue;
      kb.choose(best(kb));
    }
  }
  const r = kb.result();
  // level-up evolution (src/systems/evolution.js, current data: 16 / 32): a won fight evolves a creature that levelled to it
  if (r.outcome === 'win') for (const c of r.team) { const was = party.find((p) => p.species === c.species); const e = c.hp > 0 && was && c.level > was.level && nextEvolution(c); if (e) { c.species = e.to; evolved.push(`${was.species}->${e.to} L${c.level}`); } }
  return { outcome: r.outcome, turns: r.turns, solo: kb.p1.creature.filter((c) => c.previouslySwitchedIn > 0 || c.isActive).length <= 1, team: r.team.map((c) => ({ species: c.species, level: c.level, xp: c.xp, hp: c.hp })) };
}
const heal = (p) => p.map((c) => ({ species: c.species, level: c.level, xp: c.xp }));
const lv = (p) => p.map((c) => `${c.species} L${c.level}`).join(', ');

function run(starter) {
  // A NORMAL player (Gary 11:49: "no heavy grinding"): starter L5; test run = 2 wild fights then 1 catch (L2-4 first-stage);
  // Trail 1 = WILD wild fights on the way north (starter leads 2 of 3, the catch leads every 3rd so it trains a bit);
  // full heal before each trainer; a lost trainer fight = blackout, 3 more wild fights, retry (max 3 tries).
  let party = [{ species: starter, level: 5, xp: xpForLevel(5) }];
  const log = [];
  for (let i = 0; i < 2; i++) { const r = fight(party, [wildFoe(0)]); party = heal(r.team); }
  const caught = wildFoe(0); party.push({ species: CATCH[starter], level: caught.level, xp: xpForLevel(caught.level) });
  let wl = 0;
  for (let i = 0; i < WILD; i++) {
    const order = i % CATCH_EVERY === CATCH_EVERY - 1 ? [party[1], party[0]] : party;
    const r = fight(order, [wildFoe(i / Math.max(1, WILD - 1))]);
    if (r.outcome !== 'win') wl++;
    const byS = Object.fromEntries(r.team.map((c) => [c.species, c])); party = heal(party.map((c) => byS[c.species] || c));
  }
  const steps = [['route1', 'trainer_r1_a'], ['route1', 'trainer_r1_b'], ['route1', 'trainer_r1_c'], ['fernwick', 'ron_rival_1'],
    ['fernwick_hall_int', 'helper_1'], ['fernwick_hall_int', 'helper_2'], ['fernwick_hall_int', 'master_fernwick']];
  let arrival = null, grind = 0, noGrind = null;
  for (const [map, id] of steps) {
    party = heal(party).sort((a, b) => (a.species === starter ? -1 : 1));
    if (id === 'master_fernwick') {
      noGrind = party[0].level;
      if (GRIND_TO && party[0].level < GRIND_TO) {
        if (GRIND_STYLE === 'team' && party.length < 3) { const c = wildFoe(1); const sp = c.species === CATCH[starter] || c.species === starter ? 'puffwhirl' : c.species; party.push({ species: sp, level: c.level, xp: xpForLevel(c.level) }); }
        while (party[0].level < GRIND_TO && grind < GRIND_MAX) {
          const order = GRIND_STYLE === 'team' ? party.slice().sort((a, b) => a.level - b.level) : party;
          const w = fight(order, [wildFoe(1)]); grind++;
          const byS = Object.fromEntries(w.team.map((c) => [c.species, c])); party = heal(party.map((c) => byS[c.species] || c));
        }
      }
    }
    if (id === 'master_fernwick') arrival = party.map((c) => c.level);
    const foes = authoredTeam({ map, id }, party.map((c) => ({ ...c, origin: c.species === starter ? { how: 'starter' } : {} })));
    // lead with the better matchup against the foe's first creature when it is not badly under-levelled
    const lead = party.slice().sort((a, b) => matchup(b.species, foes[0].species) - matchup(a.species, foes[0].species))[0];
    if (lead.level >= foes[0].level - 2) party = [lead, ...party.filter((c) => c !== lead)];
    const before = lv(party);
    let r = fight(party, foes, { trainer: true, who: id }), tries = 1;
    while (r.outcome !== 'win' && tries < 3 && id !== 'ron_rival_1' && id !== 'master_fernwick') {
      for (let k = 0; k < 3; k++) { const w = fight(heal(party), [wildFoe()]); party = heal(w.team); }
      r = fight(heal(party), foes, { trainer: true, who: id }); tries++;
    }
    log.push({ id, foes: foes.map((f) => `${f.species} L${f.level}`).join(', '), before, outcome: r.outcome, turns: r.turns, tries,
      faintedMine: r.team.filter((c) => c.hp === 0).length, solo: r.outcome === 'win' && r.solo });
    if (r.team.length === party.length) party = heal(r.team);
  }
  return { starter, wildLosses: wl, log, end: lv(party), arrival, grind, noGrind };
}
const sum = {}, arr = {}, grd = {};
for (const st of ['tumbloam', 'cindrip', 'rillop']) for (let s = 1; s <= SEEDS; s++) {
  rng = s * 7919; const r = run(st);
  for (const e of r.log) { const k = `${st} ${e.id}`; sum[k] ||= { wins: 0, n: 0, turns: 0, tries: 0, before: e.before, foes: e.foes }; sum[k].n++; sum[k].turns += e.turns; sum[k].tries += e.tries; if (e.outcome === 'win') sum[k].wins++; if (e.solo) sum[k].solo = (sum[k].solo || 0) + 1; }
  if (s === 1) console.log(JSON.stringify(r, null, 0));
  (arr[st] ||= []).push(r.arrival); (grd[st] ||= []).push([r.noGrind, r.grind]);
}
for (const [k, v] of Object.entries(sum)) console.log(k.padEnd(30), `win ${v.wins}/${v.n}`, `avgTurns ${(v.turns / v.n).toFixed(1)}`, `avgTries ${(v.tries / v.n).toFixed(2)}`, `soloWins ${v.solo || 0}`, `| seed1 team: ${v.before} | foes: ${v.foes}`);
for (const [st, a] of Object.entries(arr)) { const s0 = a.map((x) => x[0]).sort((x, y) => x - y), s1 = a.map((x) => x[1]).sort((x, y) => x - y);
  console.log(`ARRIVAL ${st}: starter L${s0[0]}-${s0[s0.length - 1]} (median ${s0[s0.length >> 1]}), catch L${s1[0]}-${s1[s1.length - 1]} (median ${s1[s1.length >> 1]})`); }
console.log(`EVOLUTIONS before Master 1: ${evolved.length ? [...new Set(evolved)].join(', ') : 'none (all region 1 lines evolve at 16; arrival tops out at 13)'}`);
const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
for (const [st, g] of Object.entries(grd)) { const n = g.map((x) => x[1]);
  console.log(`GRIND ${st} (${GRIND_STYLE}, to L${GRIND_TO || '-'}): no-grind arrival median L${med(g.map((x) => x[0]))}; extra wild fights median ${med(n)} (range ${Math.min(...n)}-${Math.max(...n)}), ~${Math.round(med(n) * 0.5)} min at 30 s/fight`); }
