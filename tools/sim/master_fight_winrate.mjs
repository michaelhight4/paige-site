// Single-fight win rate vs Master 2 / Master 3 per difficulty (Oct 29 2026). Same "sensible" player as playcheck_master2
// (best-damage move, Small Remedy x3 under 30% HP), full HP start, the game's difficulty pipeline (scaleFoes on the lead
// level, masterItems(n), foeDamageMult). Arrival teams are ASSUMPTIONS (see PROFILES). Run: node tools/sim/master_fight_winrate.mjs [seeds=200]
import { KilumenBattle } from '../../src/battle/battle.js';
import { authoredTeam } from '../../src/battle/data/trainer_teams.js';
import { DRAFT_CHART } from '../../src/battle/data/elements.js';
import { KILUMEN_RULES as R } from '../../src/battle/data/rules.js';
import { scaleFoes, masterItems, diffOf } from '../../src/systems/difficulty.js';
const N = Number(process.argv[2] || 200);
const eff = (type, defTypes) => defTypes.reduce((m, d) => { const row = DRAFT_CHART[type.toLowerCase()] || {}; return m * (row.strong?.includes(d) ? R.strong ?? 1.5 : row.weak?.includes(d) ? R.weak ?? 0.6 : 1); }, 1);
function best(kb) {
  const req = kb.request(), me = kb.p1.active[0], foe = kb.p2.active[0], myT = me.getTypes().map((t) => t.toLowerCase()), foeT = foe.getTypes().map((t) => t.toLowerCase());
  let pick = 0, score = -1;
  req.moves.forEach((m, i) => { if (m.disabled) return; const mv = kb.battle.dex.moves.get(m.id); let s = mv.basePower * eff(mv.type, foeT) * (myT.includes(mv.type.toLowerCase()) ? 1.3 : 1) * ((mv.accuracy === true ? 100 : mv.accuracy) / 100); if (mv.heal && me.hp / me.maxhp < 0.35) s = 999; if (s > score) { score = s; pick = i; } });
  return `move ${pick + 1}`;
}
const PROFILES = {
  2: { who: { map: 'saltmere_hall_int', id: 'saltmere_hall_int_master' }, teams: {
    'sim arrival (playcheck_master2 medians)': (st) => [[st, 24], ['foalgust', 16], ['cloverkin', 10]],
    'on-level (lead L19)': (st) => [[st, 19], ['foalgust', 16], ['cloverkin', 14]] } },
  3: { who: { map: 'revival_hall_int', id: 'revival_hall_int_master' }, teams: {
    'over-level (lead L28)': (st) => [[st, 28], ['foalgust', 22], ['cloverkin', 18], ['gnawford', 16]],
    'on-level (lead L25)': (st) => [[st, 25], ['foalgust', 22], ['cloverkin', 21], ['gnawford', 20]] } },
};
const STARTERS = ['brookhorn', 'emberlunx', 'gnawford'];
let seedN = 1;
for (const [n, P] of Object.entries(PROFILES)) for (const [pname, mk] of Object.entries(P.teams)) {
  const row = [];
  for (const dm of ['easy', 'normal', 'hard']) {
    let w = 0, tot = 0, heals = 0;
    for (const st of STARTERS) for (let s = 0; s < N; s++) {
      const party = mk(st).filter(([sp], i) => i === 0 || sp !== st).map(([species, level], i) => ({ species, level, uid: 'u' + i }));
      const foes = scaleFoes(authoredTeam(P.who, party), Math.max(...party.map((c) => c.level)), dm);
      const kb = new KilumenBattle({ party, foes, wild: false, bag: { tonic_small: 3 }, seed: [seedN++, 7, 11, s], foeItems: masterItems(+n, dm), foeDamageMult: diffOf(dm).damage, foeHealAt: diffOf(dm).healAt, foeHealsPer: diffOf(dm).healsPer });
      for (let i = 0; i < 300 && !kb.battle.ended; i++) {
        const q = kb.request();
        if (q.state === 'switch') { let bi = -1, bh = -1; q.team.forEach((c, k) => { if (k > 0 && !c.fainted && c.hp > bh) { bh = c.hp; bi = k; } }); kb.choose(`switch ${bi + 1}`); continue; }
        const me = kb.p1.active[0];
        if ((q.bag?.tonic_small || 0) > 0 && me.hp / me.maxhp < 0.3 && me.maxhp - me.hp >= 20 && kb.choose('item tonic_small') === true) continue;
        kb.choose(best(kb));
      }
      tot++; if (kb.result().outcome === 'win') w++; heals += kb.battle.log.filter((l) => l.startsWith('|-kitem|p2a')).length;
    }
    row.push(`${dm} ${(100 * w / tot).toFixed(0)}% (foe heals/fight ${(heals / tot).toFixed(1)})`);
  }
  console.log(`Master ${n} | ${pname.padEnd(40)} | ${row.join(' | ')}`);
}
