// QoL batch B (Oct 29, 2026): #4 Team XP share, #7 matchup hint / damage preview, #5 Skill Recall, #6 Training Reels.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KilumenBattle } from '../src/battle/battle.js';
import { qolFlags, QOL_B_DEFAULTS, XP_SHARE } from '../src/qol/flags.js';
import { matchupOf, calculate, skillTag } from '../src/qol/matchup.js';
import { recallable, canTeach, teach, TEACH_ITEMS } from '../src/qol/skills_menu.js';
import { ITEMS } from '../src/systems/items.js';

const q = (s) => new URLSearchParams(s);
const KO = (xpShare) => {
  const kb = new KilumenBattle({ party: [{ species: 'nibbin', level: 30 }, { species: 'cindrip', level: 5 }, { species: 'rillop', level: 5, hp: 0 }], foes: [{ species: 'rillop', level: 3 }], wild: true, seed: [1, 2, 3, 4], xpShare, forceChance: true });
  for (let n = 0; n < 30 && !kb.ended; n++) kb.choose('move 1');
  return kb;
};

test('flags: every feature has a kill switch, URL overrides', () => {
  for (const k of ['xpShare', 'matchup', 'dmgPreview', 'skillRecall', 'teachReuse']) assert.ok(k in QOL_B_DEFAULTS);
  assert.equal(qolFlags(q('qol=-xpShare')).xpShare, false);
  assert.equal(qolFlags(q('qol=dmgPreview')).dmgPreview, true);
  assert.ok(Object.values(qolFlags(q('qol=none'))).every((v) => !v));
  assert.equal(XP_SHARE, 0.5);
});

test('#4 benched creatures get 50% of the XP; fainted and off = nothing', () => {
  const on = KO(XP_SHARE), off = KO(0);
  const gain = (kb, i) => kb.result().team[i].xp;
  const lead = on.battle.log.filter((l) => l.startsWith('|-kxp|')).map((l) => +l.split('|')[3]).reduce((a, b) => a + b, 0);
  const share = on.battle.log.filter((l) => l.startsWith('|-kxpshare|'));
  assert.ok(lead > 0 && share.length >= 1);
  assert.equal(+share[0].split('|')[3], Math.floor(lead * 0.5));
  assert.ok(!share.some((l) => /Rillop/.test(l)), 'fainted member gets none');
  assert.ok(gain(on, 1) > (gain(off, 1) ?? 0));
  assert.ok(!off.battle.log.some((l) => l.startsWith('|-kxpshare|')));
});

test('#7 arrows match the engine; preview never moves the live random stream', () => {
  const kb = new KilumenBattle({ party: [{ species: 'nibbin', level: 10 }], foes: [{ species: 'rillop', level: 9 }], wild: true, seed: [5, 6, 7, 8] });
  const foe = kb.p2.active[0], seed = JSON.stringify(kb.battle.prng.rng.getSeed());
  const m = matchupOf(kb, 'shellroll', foe);
  assert.equal(m.label, 'Strong'); // earth > water (draft chart)
  const c = calculate(kb, kb.p1.active[0], foe, 'shellroll');
  assert.ok(c.range[0] > 0 && c.range[0] <= c.range[1]);
  assert.equal(JSON.stringify(kb.battle.prng.rng.getSeed()), seed);
  assert.equal(skillTag(kb, 'shellroll', { matchup: false, dmgPreview: false }), '');
  assert.match(skillTag(kb, 'shellroll', { matchup: true, dmgPreview: false }), /^▲ Strong$/);
});

test('#5 recall lists learnset skills up to the level, not known ones', () => {
  const c = { species: 'nibbin', level: 20, skills: ['shellroll'] };
  const r = recallable(c);
  assert.ok(r.length > 0 && !r.includes('shellroll'));
  assert.ok(recallable({ ...c, level: 1 }).length <= r.length);
});

test('#6 reels: reusable with teachReuse, used up with it off, unfit refused', () => {
  const bag = { n: { reel_pounce: 1 }, has(id) { return this.n[id] > 0; }, remove(id, k) { this.n[id] -= k; } };
  const c = { species: 'nibbin', level: 5, skills: ['shellroll'] };
  assert.equal(teach(bag, 'reel_pounce', c, null, { teachReuse: true }).result, 'learned');
  assert.equal(bag.n.reel_pounce, 1);
  const d = { species: 'nibbin', level: 5, skills: ['shellroll'] };
  teach(bag, 'reel_pounce', d, null, { teachReuse: false });
  assert.equal(bag.n.reel_pounce, 0);
  const unfit = ['haloflash', 'dusktbite', 'duskbite', 'threadweave', 'ripplefshot', 'rippleshot', 'sparksneeze', 'gustdart'].filter((s) => canTeach({ species: 'nibbin', skills: [] }, s) === 'unfit');
  assert.ok(unfit.length > 0, 'some element skills are refused');
  for (const id of Object.keys(TEACH_ITEMS)) assert.ok(ITEMS[id], id);
});

test('blocked player words are not in the QoL files', () => {
  const src = ['flags', 'matchup', 'skills_menu'].map((f) => readFileSync(new URL(`../src/qol/${f}.js`, import.meta.url), 'utf8')).join('\n');
  const strings = (src.match(/'[^'\n]*'|`[^`\n]*`/g) || []).join(' ');
  for (const w of [/\bPP\b/, /shiny/i, /super effective/i, /Pok[eé]/i, /Gotcha/i, /\bnurse\b/i, /\bweed\b/i, /\broutes?\b/i, /\bthrow/i]) assert.ok(!w.test(strings), String(w));
});
