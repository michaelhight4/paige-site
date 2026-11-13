// Kilumen battle engine (?battle=sd): forked MIT simulator in vendor/battle-sim, data in src/battle/data.
// Covers element matchups, priority, status, switching, full wild/trainer KOs, catch, retreat, items,
// Energy overuse, Warmth, levelling, party cap, determinism, and a no-upstream-names scan of the bundle.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { KilumenBattle, xpForLevel } from '../src/battle/battle.js';
import { KILUMEN_RULES } from '../src/battle/data/rules.js';

const SEED = [1, 2, 3, 4];
const mk = (species, level, extra = {}) => ({ species, level, ...extra });
const lines = (b) => b.drain().filter((l) => l[0] !== 'debug').map((l) => l.join('|'));
const has = (log, re) => log.some((l) => re.test(l));
function play(b, choice = 'move 1', max = 60) {
  const log = [];
  for (let i = 0; i < max && !b.ended; i++) {
    const st = b.request().state;
    const r = b.choose(st === 'switch' ? `switch ${b.request().team.findIndex((c, n) => n > 0 && !c.fainted) + 1}` : choice);
    assert.equal(r, true, JSON.stringify(r));
    log.push(...lines(b));
  }
  return log;
}

test('element matchups: strong, weak, neutral and (custom chart) immune', () => {
  // rillop (water) Ripple Shot vs cindrip (fire): strong
  let b = new KilumenBattle({ party: [mk('rillop', 20)], foes: [mk('cindrip', 20)], wild: true, seed: SEED, forceChance: true });
  b.choose('move 1');
  let log = lines(b);
  assert.ok(has(log, /^move\|p1a: \w+\|Ripple Shot/), log.join('\n'));
  assert.ok(has(log, /^-weakspot\|p2a/));
  // cindrip Spark Sneeze vs rillop: weak
  b = new KilumenBattle({ party: [mk('cindrip', 20)], foes: [mk('rillop', 20)], wild: true, seed: SEED, forceChance: true });
  b.choose('move 1'); log = lines(b);
  assert.ok(has(log, /^-resisted\|p2a/), log.join('\n'));
  // tumbloam Horn Nudge (normal) vs rillop: neutral, no effectiveness line for it
  b = new KilumenBattle({ party: [mk('tumbloam', 20, { skills: ['hornnudge'] })], foes: [mk('rillop', 20)], wild: true, seed: SEED, forceChance: true });
  b.choose('move 1'); log = lines(b);
  const after = log.slice(log.findIndex((l) => l.startsWith('move|p1a')));
  assert.ok(!/^-(weakspot|resisted)\|p2a/.test(after[1]), after.join('\n'));
  // a test chart where normal cannot touch earth
  b = new KilumenBattle({ party: [mk('rillop', 20, { skills: ['whiskertickle'] })], foes: [mk('tumbloam', 20)], wild: true, seed: SEED, chart: { normal: { none: ['earth'] } } });
  b.choose('move 1'); log = lines(b);
  assert.ok(has(log, /^-immune\|p2a/), log.join('\n'));
  new KilumenBattle({ party: [mk('rillop', 5)], foes: [mk('cindrip', 5)], wild: true, seed: SEED }); // restore default chart
});

test('priority: Swoop (+1) beats a faster foe, Coal Charge (-1) goes after a slower one', () => {
  let b = new KilumenBattle({ party: [mk('sailquill', 10, { skills: ['swoop'] })], foes: [mk('rillop', 60)], wild: true, seed: SEED });
  b.choose('move 1');
  let moves = lines(b).filter((l) => l.startsWith('move|'));
  assert.match(moves[0], /^move\|p1a/);
  b = new KilumenBattle({ party: [mk('cindrip', 60, { skills: ['coalcharge'] })], foes: [mk('tumbloam', 5)], wild: true, seed: SEED });
  b.choose('move 1');
  moves = lines(b).filter((l) => l.startsWith('move|'));
  assert.match(moves[0], /^move\|p2a/);
  assert.match(moves[1], /^move\|p1a/);
});

test('status: Huff inflicts Drowsy (skips turns, then wakes), Scorched chips each turn', () => {
  const b = new KilumenBattle({ party: [mk('rillop', 30, { skills: ['huff', 'whiskertickle'] })], foes: [mk('tumbloam', 30)], wild: true, seed: SEED, forceChance: true });
  b.choose('move 1');
  let log = lines(b);
  assert.ok(has(log, /^-status\|p2a: \w+\|drowsy/), log.join('\n'));
  const all = [...log];
  for (let i = 0; i < 5 && !b.ended; i++) { b.choose('move 2'); all.push(...lines(b)); }
  assert.ok(has(all, /^cant\|p2a: \w+\|drowsy/));
  assert.ok(has(all, /^-curestatus\|p2a/), 'Drowsy wears off within 4 turns');
  // Scorched carried in from the overworld
  const s = new KilumenBattle({ party: [mk('rillop', 30, { status: 'scorched', skills: ['whiskertickle'] })], foes: [mk('tumbloam', 30, { skills: ['burrowdown'] })], wild: true, seed: SEED });
  s.choose('move 1');
  log = lines(s);
  assert.ok(has(log, /^-damage\|p1a: \w+\|[^|]+\|\[from\] scorched/i), log.join('\n'));
});

test('switching: the switch happens before the foe acts and the foe hits the newcomer', () => {
  const b = new KilumenBattle({ party: [mk('rillop', 10), mk('cindrip', 10)], foes: [mk('tumbloam', 10)], wild: true, seed: SEED, forceChance: true });
  b.choose('switch 2');
  const log = lines(b);
  const sw = log.findIndex((l) => /^switch\|p1a: \w+\|Cindrip/.test(l));
  const mv = log.findIndex((l) => l.startsWith('move|p2a'));
  assert.ok(sw >= 0 && mv > sw, log.join('\n'));
  assert.match(log[mv], /\|p1a: Cindrip/);
  // party order is preserved in the result even though the engine reorders on switch
  const r = b.result();
  assert.deepEqual(r.team.map((c) => c.species), ['rillop', 'cindrip']);
  assert.ok(r.team[1].hp < r.team[1].maxhp && r.team[0].hp === r.team[0].maxhp);
});

test('full wild battle to KO: win, XP, state written back', () => {
  const b = new KilumenBattle({ party: [mk('rillop', 25, { xp: xpForLevel(25) })], foes: [mk('tumbloam', 4)], wild: true, seed: SEED });
  const log = play(b);
  assert.ok(b.ended);
  assert.ok(has(log, /^faint\|p2a/));
  const xp = log.find((l) => l.startsWith('-kxp|p1a'));
  assert.ok(xp, log.join('\n'));
  const r = b.result();
  assert.equal(r.outcome, 'win');
  assert.ok(r.team[0].xp > xpForLevel(25));
  assert.equal(r.team[0].energy.length, 4);
  assert.ok(r.team[0].energy[0] < 15, 'energy spent');
});

test('full trainer battle to KO: foe forced switch, trainer XP x rules.xpTrainerMult, no retreat / no crystal', () => {
  const b = new KilumenBattle({ party: [mk('cindrip', 30)], foes: [mk('tumbloam', 5), mk('burlbeetle', 5)], wild: false, bag: { dominance_crystal: 3 }, seed: SEED });
  assert.match(b.choose('retreat').error, /retreat|trainer|wild/i);
  assert.match(b.choose('crystal dominance_crystal').error, /crystal|trainer|wild/i);
  const log = play(b);
  assert.equal(log.filter((l) => /^faint\|p2a/.test(l)).length, 2, log.join('\n'));
  assert.ok(has(log, /^switch\|p2a: \w+\|Burlbeetle/));
  const r = b.result();
  assert.equal(r.outcome, 'win');
  assert.equal(r.bag.dominance_crystal, 3);
  // same foe as wild gives less XP than as a trainer creature
  const w = new KilumenBattle({ party: [mk('cindrip', 30)], foes: [mk('tumbloam', 5)], wild: true, seed: SEED });
  const wl = play(w);
  const gained = (l) => Number(l.find((x) => x.startsWith('-kxp|p1a')).split('|')[2]);
  assert.ok(Math.abs(gained(log) - gained(wl) * KILUMEN_RULES.xpTrainerMult) <= 1, `${gained(log)} vs ${gained(wl)}`);
});

test('crystal catch (forced) uses one crystal and returns the caught creature', () => {
  const b = new KilumenBattle({ party: [mk('rillop', 10)], foes: [mk('mirewump', 6)], wild: true, bag: { dominance_crystal: 2, tonic_small: 1 }, seed: SEED, forceChance: true });
  assert.equal(b.choose('crystal dominance_crystal'), true);
  const log = lines(b);
  assert.ok(has(log, /^-kcrystal\|p2a: \w+\|dominancecrystal\|4\|caught/), log.join('\n'));
  assert.ok(has(log, /^kend\|caught/));
  const r = b.result();
  assert.equal(r.outcome, 'caught');
  assert.deepEqual(r.bag, { dominance_crystal: 1, tonic_small: 1 });
  assert.equal(r.caught.species, 'mirewump');
  assert.equal(r.caught.level, 6);
  assert.match(b.choose === undefined ? '' : String(new KilumenBattle({ party: [mk('rillop', 5)], foes: [mk('cindrip', 5)], wild: true, bag: {}, seed: SEED }).choose('crystal dominance_crystal').error), /item|crystal/i);
});

test('retreat from a wild battle: faster creature always slips away', () => {
  const b = new KilumenBattle({ party: [mk('rillop', 40)], foes: [mk('tumbloam', 3)], wild: true, seed: SEED });
  assert.equal(b.choose('retreat'), true);
  const log = lines(b);
  assert.ok(has(log, /^-kretreat\|p1a: \w+\|success/), log.join('\n'));
  assert.equal(b.result().outcome, 'retreat');
});

test('items: a remedy heals and is used up; energy remedy refills', () => {
  const b = new KilumenBattle({ party: [mk('rillop', 20, { hp: 5, energy: [0, 12, 9, 6] })], foes: [mk('tumbloam', 3, { skills: ['burrowdown'] })], wild: true, bag: { tonic_small: 1, energy_tonic: 1 }, seed: SEED });
  assert.equal(b.choose('item tonic_small'), true);
  let log = lines(b);
  assert.ok(has(log, /^-kitem\|p1a: \w+\|tonicsmall/), log.join('\n'));
  assert.ok(has(log, /^-heal\|p1a: \w+\|25\//), log.join('\n'));
  assert.equal(b.choose('item energy_tonic'), true);
  lines(b);
  const r = b.result();
  assert.deepEqual(r.bag, { tonic_small: 0, energy_tonic: 0 });
  assert.ok(r.team[0].energy[0] > 0);
  assert.match(String(b.choose('item tonic_small').error), /item|left|none|have/i);
});

test('Energy overuse: a skill at 0 Energy still works, with a self-hit', () => {
  const b = new KilumenBattle({ party: [mk('rillop', 20, { energy: [0, 12, 9, 6] })], foes: [mk('tumbloam', 20, { skills: ['burrowdown'] })], wild: true, seed: SEED, forceChance: true });
  assert.ok(!b.request().moves[0].disabled);
  b.choose('move 1');
  const log = lines(b);
  assert.ok(has(log, /^-overuse\|p1a/), log.join('\n'));
  assert.ok(has(log, /^-damage\|p1a: \w+\|\d+\/\d+\|\[from\] overuse/));
});

test('Warmth: a bonded creature endures one KO hit per battle', () => {
  const b = new KilumenBattle({ party: [mk('cindrip', 5, { warmth: 250 })], foes: [mk('rillop', 50)], wild: true, seed: SEED, forceChance: true });
  b.choose('move 1');
  const log = lines(b);
  assert.ok(has(log, /^-activate\|p1a: \w+\|warmth\|\[endure\]/), log.join('\n'));
  assert.equal(b.result().team[0].hp, 1);
});

test('levelling: crossing the XP curve levels up and recomputes stats', () => {
  const b = new KilumenBattle({ party: [mk('rillop', 10, { xp: xpForLevel(11) - 1 })], foes: [mk('tumbloam', 8)], wild: true, seed: SEED });
  const log = play(b);
  const lv = log.find((l) => l.startsWith('-klevelup|p1a'));
  assert.ok(lv, log.join('\n'));
  assert.equal(b.result().team[0].level, Number(lv.split('|')[2]));
  assert.ok(b.result().team[0].level >= 11);
});

test('party cap: more than 6 creatures is refused', () => {
  const party = Array.from({ length: 7 }, () => mk('rillop', 5));
  assert.throws(() => new KilumenBattle({ party, foes: [mk('cindrip', 5)], wild: true, seed: SEED }), /6|party|team/i);
});

test('determinism: same seed and inputs give the same log (server-runnable for PvP)', () => {
  const run = () => {
    const b = new KilumenBattle({ party: [mk('rillop', 12), mk('cindrip', 12)], foes: [mk('tumbloam', 12), mk('burlbeetle', 11)], wild: false, seed: [9, 9, 9, 9] });
    return play(b).join('\n') + JSON.stringify(b.result().team);
  };
  assert.equal(run(), run());
});

test('shipped engine bundle contains no upstream creature/skill/item/ability names', () => {
  const { salt, hashes } = JSON.parse(fs.readFileSync(new URL('./fixtures/battle_deny_hashes.json', import.meta.url)));
  const deny = new Set(hashes);
  // generic English words that also happen to be upstream ids; the engine keeps them as internal effect ids
  const allow = new Set(('acid bide feint nightmare struggle substitute confusion frustration gravity ingrain powder protect ' +
    'pursuit rest return sandstorm toxic wish berry immunity noability transform endure roost charge round plus minus ' +
    'filter fling illusion embargo taunt trick bounce dive static normalize stall ' +
    'normal water fire grass light dark ghost bug dragon rock flying').split(' '));
  const src = fs.readFileSync(new URL('../src/battle/engine.js', import.meta.url), 'utf8');
  const h = (s) => crypto.createHash('sha256').update(salt + s).digest('hex').slice(0, 16);
  const found = new Set();
  const cand = new Set();
  for (const m of src.matchAll(/(["'`])((?:\\.|(?!\1).){4,40}?)\1/g)) cand.add(m[2].toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const t of src.match(/[A-Za-z][A-Za-z0-9]{3,}/g)) cand.add(t.toLowerCase());
  for (const c of cand) if (c.length >= 4 && !allow.has(c) && deny.has(h(c))) found.add(c);
  assert.deepEqual([...found], [], 'upstream names in bundle: ' + [...found].join(' '));
});
