// v0.2.57 (Gary 11:37 AM CT Oct 29 2026): Team Link Band holder on the bench gets a flat 50% of each award (25% share + 25%),
// others 25%, never split; fighters unchanged; the old half-XP linkShare only runs when the share is off.
import assert from 'node:assert/strict';
import test from 'node:test';
import { KilumenBattle } from '../src/battle/battle.js';
const party = (band) => [{ species: 'nibbin', level: 30 }, { species: 'cindrip', level: 5, held: band ? 'team_link_band' : null },
  { species: 'blubbet', level: 5 }, { species: 'rillop', level: 5, hp: 0, held: 'team_link_band' }];
const run = (band, xpShare = 0.25, foes = [{ species: 'rillop', level: 3 }, { species: 'cindrip', level: 3 }]) => {
  const kb = new KilumenBattle({ party: party(band), foes, wild: false, seed: [1, 2, 3, 4], xpShare });
  for (let n = 0; n < 60 && !kb.ended; n++) kb.choose('move 1');
  return kb;
};
const lines = (kb, cmd) => kb.battle.log.filter((l) => l.startsWith(`|${cmd}|`)).map((l) => l.split('|'));
test('band holder: flat 50% of each full award, plain bench 25%, fainted holder none', () => {
  const kb = run(true), fights = lines(kb, '-kxp'), share = lines(kb, '-kxpshare');
  assert.ok(fights.length >= 2, 'two KOs');
  for (const f of fights) {
    const R = +f[3];
    const after = kb.battle.log.indexOf(kb.battle.log.find((l) => l.startsWith('|-kxp|') && l.split('|')[3] === f[3]));
    assert.ok(after >= 0 && R > 0);
  }
  const band = share.filter((l) => /Cindrip/.test(l[2])), plain = share.filter((l) => /Blubbet/.test(l[2]));
  assert.equal(band.length, fights.length); assert.equal(plain.length, fights.length);
  fights.forEach((f, i) => { assert.equal(+band[i][3], Math.floor(+f[3] * 0.5)); assert.equal(band[i][5], 'band'); assert.equal(+plain[i][3], Math.floor(+f[3] * 0.25)); assert.equal(plain[i][5] || '', ''); });
  assert.ok(!share.some((l) => /Rillop/.test(l[2])), 'fainted holder gets none');
  assert.deepEqual(kb.result().linkXp, [], 'no double pay from the old half-XP rule');
});
test('the band never changes the fighters split', () => {
  const a = lines(run(true), '-kxp').map((l) => +l[3]), b = lines(run(false), '-kxp').map((l) => +l[3]);
  assert.deepEqual(a, b);
});
test('share not split: adding benched creatures does not lower anyone', () => {
  const kb = new KilumenBattle({ party: [{ species: 'nibbin', level: 30 }, { species: 'blubbet', level: 5 }], foes: [{ species: 'rillop', level: 3 }], wild: false, seed: [1, 2, 3, 4], xpShare: 0.25 });
  for (let n = 0; n < 30 && !kb.ended; n++) kb.choose('move 1');
  const big = run(true), one = +lines(kb, '-kxpshare')[0][3], many = +lines(big, '-kxpshare').find((l) => /Blubbet/.test(l[2]))[3];
  assert.equal(one, many);
});
test('share off (?qol=-xpShare): old Team Link Band half-XP rule still applies', () => {
  const kb = run(true, 0);
  assert.ok(!kb.battle.log.some((l) => l.startsWith('|-kxpshare|')));
  assert.ok(kb.result().linkXp.some((e) => e.i === 1 && e.xp > 0));
});
