// Held items, build step 1 (design/HELD_ITEMS.md P1, Oct 29 2026): held item -> engine set (player, trainers, Masters, Ron),
// Charms x1.15 on the matching element only, Team Link Band +25% bench share, used-up items leave creature.held,
// Oath lock, earned-only items never priced in shops, no blocked player words.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { KilumenBattle, toSet } from '../src/battle/battle.js';
import { HELD_BATTLE_ITEMS, heldToEngine } from '../src/battle/data/held_items.js';
import { authoredTeam, TRAINER_HELD } from '../src/battle/data/trainer_teams.js';
import { ITEMS } from '../src/systems/items.js';
import { applyBattleTeam } from '../src/systems/creature.js';

const SEED = [1, 2, 3, 4];
const mk = (species, level, extra = {}) => ({ species, level, ...extra });
const firstHit = (b) => { b.choose('move 1'); const l = b.drain().map((x) => x.join('|')); const i = l.findIndex((x) => x.startsWith('move|p1a')); const d = l.slice(i).find((x) => x.startsWith('-damage|p2a')); assert.ok(d, l.join('\n')); return +d.split('|')[2].split('/')[0]; };

test('held item passes into the engine set: player, unknown ids and field-only items', () => {
  assert.equal(toSet(mk('rillop', 10, { held: 'droplet_charm' })).item, 'dropletcharm');
  assert.equal(toSet(mk('rillop', 10, { heldItem: 'iron_brace' })).item, 'ironbrace');
  assert.equal(toSet(mk('rillop', 10, { held: 'gold_coin' })).item, '');      // field only (shop.js)
  assert.equal(toSet(mk('rillop', 10, { held: 'team_link_band' })).item, ''); // XP share is battle.js linkShare
  assert.equal(toSet(mk('rillop', 10, { held: 'no_such_item' })).item, '');
  assert.equal(toSet(mk('rillop', 10)).item, '');
  const b = new KilumenBattle({ party: [mk('rillop', 20, { held: 'droplet_charm' })], foes: [mk('cindrip', 20, { held: 'moss_wrap' })], seed: SEED });
  assert.equal(b.p1.creature[0].item, 'dropletcharm');
  assert.equal(b.p2.creature[0].item, 'mosswrap');
});

test('Masters and Ron hold items (authored teams -> engine)', () => {
  for (const key of Object.keys(TRAINER_HELD)) {
    const [map, id] = key.split('.');
    const team = authoredTeam({ map, id }, [{ species: 'rillop' }]);
    assert.ok(team?.length, key);
    assert.ok(team.filter((f) => f.held).length >= 1, key); // P2-P5: per-fight picks (src/battle/data/trainer_held.js)
    for (const f of team) if (f.held) assert.ok(HELD_BATTLE_ITEMS[f.held], key + ' ' + f.held);
    const b = new KilumenBattle({ party: [mk('rillop', 30)], foes: team, seed: SEED });
    team.forEach((f, i) => assert.equal(b.p2.creature[i].item, f.held ? heldToEngine(f.held) : '', key));
  }
  assert.ok(Object.keys(TRAINER_HELD).some((k) => /ron/.test(k)) && Object.keys(TRAINER_HELD).some((k) => /master/.test(k)));
});

test('Charm: x1.15 damage on the matching element, nothing on others', () => {
  // same seed, chance rolls forced: the only difference is the held item. HP left on a level 100 foe -> HP lost
  const hit = (held) => firstHit(new KilumenBattle({ party: [mk('rillop', 100, held ? { held } : {})], foes: [mk('cindrip', 100)], wild: true, seed: SEED, forceChance: true }));
  const plain = hit(null), charm = hit('droplet_charm'), other = hit('ember_charm');
  const b0 = new KilumenBattle({ party: [mk('rillop', 100)], foes: [mk('cindrip', 100)], wild: true, seed: SEED }); const max = b0.p2.creature[0].maxhp;
  const lost = (hp) => max - hp, r = lost(charm) / lost(plain);
  assert.ok(lost(plain) >= 60 && charm > 0, 'enough damage for a clean ratio: ' + lost(plain));
  assert.ok(r > 1.12 && r < 1.18, 'ratio ' + r);
  assert.equal(other, plain);
  assert.equal(HELD_BATTLE_ITEMS.droplet_charm.kElement, 'water');
  assert.equal(Object.values(HELD_BATTLE_ITEMS).filter((h) => h.kHeldKind === 'charm').length, 24);
});

test('Team Link Band (live v0.2.57): with the 25% team share on, a benched holder gets 50%, other benched creatures 25%', () => {
  // engine: award R per faint; benched holder floor(R * min(1, share + 0.25)), other benched floor(R * share); battle.js linkShare() is off
  const party = [mk('rillop', 40, { uid: 'a' }), mk('cindrip', 5, { uid: 'b', held: 'team_link_band' }), mk('nibbin', 5, { uid: 'c' })];
  const b = new KilumenBattle({ party, foes: [mk('cindrip', 20)], seed: SEED, forceChance: true, xpShare: 0.25 });
  for (let i = 0; i < 20 && !b.ended; i++) b.choose('move 1');
  const res = b.result();
  assert.equal(res.outcome, 'win');
  const award = +b.battle.log.find((l) => l.startsWith('|-kxp|p1a: Rillop')).split('|')[3]; // one fighter, so award = full R
  const share = (name) => b.battle.log.find((l) => l.startsWith('|-kxpshare|') && l.includes(name))?.split('|');
  const band = share('Cindrip'), other = share('Nibbin');
  assert.ok(band && other, 'both benched creatures got a share');
  assert.equal(+band[3], Math.floor(award * 0.5)); assert.equal(band[5], 'band');
  assert.equal(+other[3], Math.floor(award * 0.25)); assert.notEqual(other[5], 'band');
  assert.deepEqual(res.linkXp, []); // legacy half-XP path only when the share is off
});

test('a used-up held item leaves creature.held after the battle; a lasting one stays', () => {
  const party = [mk('cindrip', 20, { uid: 'p', held: 'remedy_pouch' }), mk('rillop', 20, { uid: 'q', held: 'moss_wrap' })];
  const b = new KilumenBattle({ party, foes: [mk('rillop', 22)], seed: SEED, forceChance: true });
  for (let i = 0; i < 6 && !b.ended && b.p1.creature[0].item; i++) b.choose('move 1');
  assert.equal(b.p1.creature[0].item, '');
  const res = b.result();
  assert.equal(res.team[0].heldUsed, 'remedy_pouch'); assert.equal(res.team[0].held, null);
  assert.equal(res.team[1].heldUsed, undefined); assert.equal(res.team[1].held, 'moss_wrap');
  const save = party.map((c) => ({ ...c }));
  applyBattleTeam(save, res.team);
  assert.equal(save[0].held, null); assert.equal(save[1].held, 'moss_wrap');
});

test('Oath Band locks the holder into its first skill', () => {
  const b = new KilumenBattle({ party: [mk('rillop', 30, { held: 'oath_band' })], foes: [mk('cindrip', 60)], seed: SEED, forceChance: false });
  b.choose('move 1');
  const moves = b.request().moves;
  assert.ok(moves.length > 1);
  assert.equal(moves[0].disabled, false);
  assert.ok(moves.slice(1).every((m) => m.disabled), JSON.stringify(moves));
});

test('earned-only items: never priced, key (no sell); shop items keep a draft price', () => {
  const shops = JSON.parse(fs.readFileSync(new URL('../src/systems/data/shops.json', import.meta.url)));
  const priced = new Set([...Object.keys(shops.basePrices || {}), ...Object.values(shops.regions || {}).flatMap((r) => [...Object.keys(r.prices || {}), ...(r.stock || []).map((s) => s.id || s)])]);
  for (const [id, h] of Object.entries(HELD_BATTLE_ITEMS)) {
    assert.equal(ITEMS[id].held, true, id);
    if (h.kEarned) { assert.equal(h.kPrice, null, id); assert.equal(ITEMS[id].key, true, id); assert.equal(priced.has(id), false, id); }
  }
  for (const id of ['last_stand_ribbon', 'grit_buckle', 'oath_band', 'oath_lens', 'oath_spurs', 'sap_vial']) assert.equal(HELD_BATTLE_ITEMS[id].kEarned, true, id);
  assert.equal(HELD_BATTLE_ITEMS.quick_tassel.kPrice, 3000); assert.ok(!HELD_BATTLE_ITEMS.quick_tassel.kEarned);
});

test('held item names and new battle lines use no blocked words', () => {
  const bad = /\bPP\b|shiny|super effective|pok[eé]dex|pok[eé] ?ball|gotcha|nurse|weed|tonic|berry|beer|wine|ale\b|smok|cigar|drug/i;
  for (const h of Object.values(HELD_BATTLE_ITEMS)) assert.doesNotMatch(h.name, bad, h.name);
  const ui = fs.readFileSync(new URL('../src/battle/ui_sd.js', import.meta.url), 'utf8');
  for (const k of ['held_activate', 'held_used']) { const line = ui.split('\n').find((l) => l.includes(`'${k}'`)); assert.ok(line, k); assert.doesNotMatch(line.replace(/\/\*.*?\*\//g, ''), /shiny|super effective|gotcha|nurse/i); }
});
