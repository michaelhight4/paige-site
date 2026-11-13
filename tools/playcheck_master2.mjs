// Headless play-check, Master 1 -> Master 2 (Saltmere), LIVE dev data (coder, Oct 23 2026; Gary 2:11 PM CT "start on
// region 2"). Modelled on tools/playcheck_master1.mjs: same engine (KilumenBattle), same "sensible" player, same rules
// (xpDivisor 7 / xpTrainerMult 1.5 unless XP_DIV / XP_TM), teams from src/battle/data/trainer_teams.js (authoredTeam),
// wilds from data/encounters_wired.json (the promoted region 2 rows) with trail scaling (data/trail_axes.json -> t along
// the trail, src/battle/level_scale.js scaledLevel), level-up evolution (src/systems/evolution.js) after won fights.
// Thornwood (ROUTE=all) is visited after the East Road by default (THORNWOOD_AT=start: straight after Master 1).
// Start = the Master 1 arrival measured by playcheck_master1 (starter L14 / L13 tumbloam, cloverkin catch, + START_LV /
// SECOND_LV env). Journey: East Road (wild fights spread along the trail + its 6 trainers) -> [Thornwood, ROUTE=all] ->
// Aurelith -> Salt Road (wild + 6 trainers; a second region 2 catch joins on the East Road) -> Saltmere Ron 2 -> [grind, GRIND_TO] -> hall
// h1-h3 -> Master 2. Full heal before each trainer (clinics in Aurelith / Saltmere); a lost fight = blackout, 4 wild fights
// near the end of the last trail, retry (max TRIES, Master 2 included: the hall can be re-entered).
// Run: node tools/playcheck_master2.mjs [wildPerTrail=10] [seeds=20]
//   env: ROUTE=required|all  GRIND_TO=L (grind the starter to L on the Salt Road before the hall)  TONICS=3  TRIES=3
//        THORNWOOD_AT=after_east|start  GRIND_STYLE=lead|team  STARTERS=nibbin,cindrip,rillop
//        CATCH=1|0 (a region 2 catch joins)  XP_DIV / XP_TM  START_LV / SECOND_LV
import fs from 'node:fs';
import { KilumenBattle, xpForLevel } from '../src/battle/battle.js';
import { authoredTeam } from '../src/battle/data/trainer_teams.js';
import { DRAFT_CHART } from '../src/battle/data/elements.js';
import { KILUMEN_RULES as R } from '../src/battle/data/rules.js';
import { speciesById } from '../src/ui/data.js';
import { nextEvolution } from '../src/systems/evolution.js';
import { scaledLevel } from '../src/battle/level_scale.js';
import { scaleFoes, masterItems, diffOf } from '../src/systems/difficulty.js'; // Oct 29 2026: DIFF=easy|normal|hard (as ui_sd.js)
const DIFF = process.env.DIFF || 'normal';

const WILD = Number(process.argv[2] || 10), SEEDS = Number(process.argv[3] || 20);
const ZONES = JSON.parse(fs.readFileSync(new URL('../data/encounters_wired.json', import.meta.url))).zones;
const ART = new Set(JSON.parse(fs.readFileSync(new URL('../data/encounters_wired.json', import.meta.url))).species_with_art || []);
const table = (zid) => { const z = ZONES[zid]; return { z, slots: z.slots.filter((x) => !x.weather && (!x.time || x.time.includes('day')) && (!ART.size || ART.has(x.species)) && speciesById(x.species)) }; };
const T = { route_east: table('route_east_grass'), salt: table('route_aurelith_saltmere_grass'), thornwood: table('thornwood_grass') };
let rng = 1; const rnd = (n) => { rng = (rng * 1103515245 + 12345) % 2147483648; return rng % n; };
const rand01 = () => rnd(1000000) / 1000000;
// thornwood has no trail axis (not a route*): uniform roll, as in the game
const wildFoe = (tb, t = null) => { const tw = tb.slots.reduce((a, x) => a + x.weight, 0); let r = rnd(tw), sl = tb.slots[0];
  for (const x of tb.slots) { if ((r -= x.weight) < 0) { sl = x; break; } }
  const [lo, hi] = Array.isArray(sl.level) ? sl.level : [sl.level, sl.level];
  return { species: sl.species, level: t == null ? lo + rnd(hi - lo + 1) : scaledLevel(lo, hi, t, rand01, tb.z.cap?.level) }; };
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
const RULES = process.env.XP_DIV || process.env.XP_TM ? { ...R, xpDivisor: Number(process.env.XP_DIV || R.xpDivisor), xpTrainerMult: Number(process.env.XP_TM || R.xpTrainerMult) } : undefined;
const TONICS = Number(process.env.TONICS ?? 3), TRIES = Number(process.env.TRIES || 3), ROUTE = process.env.ROUTE || 'all';
const GRIND_TO = Number(process.env.GRIND_TO || 0), GRIND_MAX = 800, THORNWOOD_AT = process.env.THORNWOOD_AT || 'after_east', GRIND_STYLE = process.env.GRIND_STYLE || 'lead', CATCH = process.env.CATCH !== '0';
// Master 1 arrival (playcheck_master1, 20 seeds, Oct 23 2026): starter median L13 (tumbloam) / L14, cloverkin median 10 / 6 / 7;
// +1 starter level for the Master 1 win itself.
const START = { nibbin: [14, 10], /* measured as the earth starter (tumbloam) before the Nibbin swap */ cindrip: [15, 7], rillop: [15, 8] };
const OPTIONAL = ['route_east_trainer_6', 'route_aurelith_saltmere_trainer_6', 'trainer_tw_bug', 'trainer_tw_b', 'thornwood_c_gardener', 'thornwood_d_kid', 'thornwood_e_researcher'];
const evolved = [];
const els = (sp) => speciesById(sp).el.map((e) => e.toLowerCase());
const matchup = (me, foe) => Math.max(...els(me).map((e) => eff(e, els(foe)))) - Math.max(...els(foe).map((e) => eff(e, els(me))));
function fight(party, foes, { trainer, who } = {}) {
  const bag = trainer && TONICS ? { tonic_small: TONICS } : {};
  const isMaster = /hall_int_master/.test(who || ''), lead = Math.max(...party.map((c) => c.level || 1));
  foes = scaleFoes(foes, lead, DIFF);
  const kb = new KilumenBattle({ party, foes, wild: !trainer, bag, rules: RULES, foeItems: trainer && isMaster ? masterItems(2, DIFF) : {}, foeDamageMult: diffOf(DIFF).damage, foeHealAt: diffOf(DIFF).healAt, foeHealsPer: diffOf(DIFF).healsPer, seed: [rnd(9999), rnd(9999), rnd(9999), rnd(9999)], foeName: who || 'Wild' });
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
  if (r.outcome === 'win') for (const c of r.team) { const was = party.find((p) => p.uid === c.uid) || party.find((p) => p.species === c.species); const e = c.hp > 0 && was && c.level > was.level && nextEvolution(c); if (e) { evolved.push(`${c.species}->${e.to} L${c.level}`); c.species = e.to; } }
  return { outcome: r.outcome, turns: r.turns, team: r.team.map((c, i) => ({ uid: party[i]?.uid, species: c.species, level: c.level, xp: c.xp, hp: c.hp })) };
}
// team results come back in party order; keep uids (starter line can evolve, so species is not an id)
const merge = (party, order, res) => { const byUid = Object.fromEntries(res.team.map((c, i) => [order[i].uid, { ...c, uid: order[i].uid }])); return party.map((c) => byUid[c.uid] || c); };
const heal = (p) => p.map((c) => ({ uid: c.uid, species: c.species, level: c.level, xp: c.xp }));
const lv = (p) => p.map((c) => `${c.species} L${c.level}`).join(', ');

function run(starter) {
  const [sL, cL] = START[starter];
  let party = [{ uid: 's', species: starter, level: Number(process.env.START_LV || sL), xp: xpForLevel(Number(process.env.START_LV || sL)) },
    { uid: 'c', species: 'cloverkin', level: Number(process.env.SECOND_LV || cL), xp: xpForLevel(Number(process.env.SECOND_LV || cL)) }];
  const log = []; let wildLoss = 0, lastTable = T.route_east, wilds = 0;
  const wildRun = (tb, n, t0, t1) => {
    for (let i = 0; i < n; i++) {
      const t = tb === T.thornwood ? null : t0 + (t1 - t0) * (i / Math.max(1, n - 1));
      // the starter leads 2 of 3 fights, the others take turns leading the 3rd (a normal player trains the team a bit)
      const k = i % 3 === 2 ? 1 + ((i / 3 | 0) % (party.length - 1)) : 0;
      const order = [party[k], ...party.filter((_, j) => j !== k)];
      const r = fight(order, [wildFoe(tb, t)]); wilds++;
      if (r.outcome !== 'win') wildLoss++;
      party = heal(merge(party, order, r));
    }
    lastTable = tb;
  };
  const trainer = (map, id) => {
    if (ROUTE === 'required' && OPTIONAL.includes(id)) return;
    party = heal(party);
    const foes = authoredTeam({ map, id }, party.map((c) => ({ ...c, origin: c.uid === 's' ? { how: 'starter' } : {} })));
    if (!foes) { log.push({ id, missing: true }); return; }
    const lead = party.slice().sort((a, b) => matchup(b.species, foes[0].species) - matchup(a.species, foes[0].species))[0];
    const order = lead.level >= foes[0].level - 2 ? [lead, ...party.filter((c) => c !== lead)] : party.slice().sort((a, b) => b.level - a.level);
    const before = lv(order);
    let r = fight(order, foes, { trainer: true, who: id }), tries = 1, ord = order; const first = r.outcome === 'win';
    while (r.outcome !== 'win' && tries < TRIES) {
      party = heal(merge(party, ord, r));
      for (let k = 0; k < 4; k++) { const o = party.slice(); const w = fight(o, [wildFoe(lastTable, lastTable === T.thornwood ? null : 1)]); wilds++; party = heal(merge(party, o, w)); }
      ord = party.slice().sort((a, b) => b.level - a.level);
      r = fight(heal(ord), foes, { trainer: true, who: id }); tries++;
    }
    log.push({ id, foes: foes.map((f) => `${f.species} L${f.level}`).join(', '), before, outcome: r.outcome, first, turns: r.turns, tries });
    party = heal(merge(party, ord, r));
  };
  const thornwood = () => { if (ROUTE !== 'all') return; const keep = lastTable; wildRun(T.thornwood, Math.round(WILD / 2), 0, 1); for (const id of ['trainer_tw_bug', 'thornwood_c_gardener', 'thornwood_d_kid', 'trainer_tw_b', 'thornwood_e_researcher']) trainer('thornwood', id); lastTable = keep; };
  if (THORNWOOD_AT === 'start') thornwood();
  // East Road: wild fights in 3 stretches between the trainers
  const W1 = Math.ceil(WILD / 3);
  wildRun(T.route_east, W1, 0, 0.33);
  if (CATCH) { const c = wildFoe(T.route_east, 0.2); if (c.species !== 'cloverkin') party.push({ uid: 'k', species: c.species, level: c.level, xp: xpForLevel(c.level) }); }
  trainer('route_east', 'route_east_trainer_1'); trainer('route_east', 'route_east_trainer_2');
  wildRun(T.route_east, W1, 0.33, 0.66);
  trainer('route_east', 'route_east_trainer_3'); trainer('route_east', 'route_east_trainer_4');
  wildRun(T.route_east, WILD - 2 * W1, 0.66, 1);
  trainer('route_east', 'route_east_trainer_5'); trainer('route_east', 'route_east_trainer_6');
  if (THORNWOOD_AT !== 'start') thornwood(); // back west through Fernwick after the East Road (the sim default)
  wildRun(T.salt, W1, 0, 0.33);
  trainer('route_aurelith_saltmere', 'route_aurelith_saltmere_trainer_1'); trainer('route_aurelith_saltmere', 'route_aurelith_saltmere_trainer_2');
  wildRun(T.salt, W1, 0.33, 0.66);
  trainer('route_aurelith_saltmere', 'route_aurelith_saltmere_trainer_3'); trainer('route_aurelith_saltmere', 'route_aurelith_saltmere_trainer_4');
  wildRun(T.salt, WILD - 2 * W1, 0.66, 1);
  trainer('route_aurelith_saltmere', 'route_aurelith_saltmere_trainer_5'); trainer('route_aurelith_saltmere', 'route_aurelith_saltmere_trainer_6');
  trainer('saltmere', 'saltmere_ron_2');
  const noGrind = party.find((c) => c.uid === 's').level; let grind = 0;
  // GRIND_STYLE=lead (default): the starter leads until it is GRIND_TO. team: the lowest-level member leads each fight until
  // every member is at least GRIND_TO - 4 and the starter GRIND_TO (a player levelling the whole team).
  const grindDone = () => GRIND_STYLE === 'team' ? party.every((c) => c.level >= (c.uid === 's' ? GRIND_TO : GRIND_TO - 4)) : party.find((c) => c.uid === 's').level >= GRIND_TO;
  if (GRIND_TO) while (!grindDone() && grind < GRIND_MAX) {
    const k = GRIND_STYLE === 'team' ? party.indexOf(party.slice().sort((x, y) => x.level - y.level)[0]) : 0;
    const o = [party[k], ...party.filter((_, j) => j !== k)];
    const weak = GRIND_STYLE === 'team' && o[0].uid !== 's' && o[0].level < 16; // a weak member trains on the East Road start
    const w = fight(o, [weak ? wildFoe(T.route_east, 0) : wildFoe(T.salt, 1)]); grind++; wilds++; party = heal(merge(party, o, w));
  }
  trainer('saltmere_hall_int', 'saltmere_hall_int_h1'); trainer('saltmere_hall_int', 'saltmere_hall_int_h2'); trainer('saltmere_hall_int', 'saltmere_hall_int_h3');
  const arrival = party.map((c) => c.level);
  trainer('saltmere_hall_int', 'saltmere_hall_int_master');
  return { starter, wildLoss, wilds, log, end: lv(party), arrival, grind, noGrind };
}
console.log(`playcheck_master2 (LIVE data) DIFF ${DIFF}: wild/trail ${WILD}, seeds ${SEEDS}, ROUTE ${ROUTE}, TRIES ${TRIES}, TONICS ${TONICS}, CATCH ${CATCH}, GRIND_TO ${GRIND_TO || '-'} ${GRIND_STYLE}`);
const sum = {}, arr = {}, grd = {}, wl = {};
for (const st of (process.env.STARTERS || 'nibbin,cindrip,rillop').split(',')) for (let s = 1; s <= SEEDS; s++) {
  rng = s * 7919; const r = run(st);
  for (const e of r.log) { if (e.missing) { console.log('MISSING TEAM', e.id); continue; } const k = `${st} ${e.id}`; sum[k] ||= { wins: 0, first: 0, n: 0, turns: 0, tries: 0, before: e.before, foes: e.foes }; const v = sum[k]; v.n++; v.turns += e.turns; v.tries += e.tries; if (e.outcome === 'win') v.wins++; if (e.first) v.first++; }
  (arr[st] ||= []).push(r.arrival); (grd[st] ||= []).push([r.noGrind, r.grind]); (wl[st] ||= []).push([r.wilds, r.wildLoss]);
}
for (const [k, v] of Object.entries(sum)) console.log(k.padEnd(48), `win ${v.wins}/${v.n}`, `firstTry ${v.first}/${v.n}`, `avgTries ${(v.tries / v.n).toFixed(2)}`, `avgTurns ${(v.turns / v.n).toFixed(1)}`, `| seed1: ${v.before} | foes: ${v.foes}`);
const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
for (const [st, a] of Object.entries(arr)) console.log(`ARRIVAL at Master 2 ${st}: starter median L${med(a.map((x) => x[0]))} (L${Math.min(...a.map((x) => x[0]))}-${Math.max(...a.map((x) => x[0]))}), team medians ${[0, 1, 2].map((i) => a[0][i] != null ? 'L' + med(a.map((x) => x[i] ?? 0)) : '').filter(Boolean).join(' / ')}`);
for (const [st, g] of Object.entries(grd)) { const n = g.map((x) => x[1]); console.log(`GRIND ${st} (to L${GRIND_TO || '-'}): no-grind starter median L${med(g.map((x) => x[0]))}; extra wild fights median ${med(n)} (range ${Math.min(...n)}-${Math.max(...n)}), ~${Math.round(med(n) * 0.5)} min at 30 s/fight`); }
for (const [st, w] of Object.entries(wl)) console.log(`WILD ${st}: fights median ${med(w.map((x) => x[0]))}, wild losses median ${med(w.map((x) => x[1]))}`);
const ev = {}; for (const e of evolved) { const k = e.replace(/ L\d+$/, ''); ev[k] = (ev[k] || 0) + 1; }
console.log(`EVOLUTIONS (all seeds): ${Object.entries(ev).map(([k, n]) => `${k} x${n}`).join(', ') || 'none'}`);
