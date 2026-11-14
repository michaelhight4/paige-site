// Heir continuation remaps the dead parent's household relative to the heir.
// Also repairs already-saved lives where the parent-spouse was kept as the heir's.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { loadPack } from '../src/pack.js';
import * as E from '../src/bw_engine.js';

const pack = await loadPack(async (f) => JSON.parse(fs.readFileSync(new URL('../data_fantasy/' + f, import.meta.url))));
E.setPack(pack);

function add(s, rel, opts = {}) {
  const p = {
    id: opts.id || ('p' + (s.pid = (s.pid || 0) + 1)),
    first: opts.first || rel,
    sex: opts.sex || 'f',
    rel,
    age: opts.age ?? 30,
    race: s.race || 'human',
    bar: 70,
    alive: opts.alive !== false,
  };
  if (opts.inParty) p.inParty = true;
  s.people.push(p);
  return p;
}

function rels(s) {
  return Object.fromEntries((s.people || []).map((p) => [p.id, { rel: p.rel, alive: p.alive !== false, first: p.first }]));
}

function fixtureParent() {
  const s = E.begin(E.rollFate(4242), {});
  s.age = 42;
  s.sex = 'f';
  s.first = 'Elowen';
  s.last = 'Ashdown';
  s.gold = 400;
  s.people = [];
  s.pid = 0;
  const mother = add(s, 'mother', { id: 'gp-m', first: 'Orla', sex: 'f', age: 68 });
  const father = add(s, 'father', { id: 'gp-f', first: 'Bram', sex: 'm', age: 71 });
  const uncle = add(s, 'sibling', { id: 'sib-u', first: 'Cael', sex: 'm', age: 45 });
  const aunt = add(s, 'sibling', { id: 'sib-a', first: 'Brynn', sex: 'f', age: 39 });
  const spouse = add(s, 'spouse', { id: 'sp', first: 'Dorin', sex: 'm', age: 44 });
  const heir = add(s, 'child', { id: 'heir', first: 'Isla', sex: 'f', age: 20 });
  const brother = add(s, 'child', { id: 'bro', first: 'Fen', sex: 'm', age: 17 });
  const friend = add(s, 'friend', { id: 'fr', first: 'Nessa', sex: 'f', age: 41, inParty: true });
  const rival = add(s, 'rival', { id: 'rv', first: 'Merek', sex: 'm', age: 43 });
  const crush = add(s, 'crush', { id: 'cr', first: 'Pell', sex: 'f', age: 40 });
  return { s, mother, father, uncle, aunt, spouse, heir, brother, friend, rival, crush };
}

// --- fresh continue ---
const { s, spouse, heir, brother, mother, father, uncle, aunt, friend, rival, crush } = fixtureParent();
E.die(s, 'old_age');
const meta = {};
const n = E.continueAsHeir(meta, s, heir.id, 9001);

assert.equal(n.flags.is_heir, 1);
assert.equal(n.flags.heirRelMap, E.HEIR_REL_MAP);
assert.equal(n.first, 'Isla');
assert.equal(n.age, 20);
assert.equal(n.linkKind, 'heir');

const r = rels(n);
assert.equal(r.sp?.rel, 'father', 'dead parent spouse must become father, not the heir\'s spouse');
assert.notEqual(r.sp?.rel, 'spouse');
assert.notEqual(r.sp?.rel, 'partner');
assert.equal(r.bro?.rel, 'sibling', 'heir\'s siblings stay siblings');
assert.equal(r['gp-m']?.rel, 'grandmother', 'dead parent\'s mother becomes grandmother');
assert.equal(r['gp-f']?.rel, 'grandfather');
assert.equal(r['sib-u']?.rel, 'uncle', 'dead parent\'s siblings become aunts/uncles');
assert.equal(r['sib-a']?.rel, 'aunt');
assert.equal(r.fr?.rel, 'family friend', 'friends carry over as family friends at most');
assert.equal(r.fr?.alive, true);
assert.ok(!n.people.find((p) => p.id === 'fr')?.inParty, 'family friends should not stay in the travel party');
assert.equal(r.rv, undefined, 'rivals must not carry over');
assert.equal(r.cr, undefined, 'crushes must not carry over');
assert.ok(!n.people.some((p) => p.id === 'heir'), 'heir is now the player, not in people');

const dead = n.people.find((p) => p.alive === false && p.first === 'Elowen');
assert.ok(dead, 'dead parent is kept as a deceased parent');
assert.equal(dead.rel, 'mother');
assert.equal(dead.alive, false);

const inheritedIds = new Set(['sp', 'bro', 'gp-m', 'gp-f', 'sib-u', 'sib-a', 'fr', dead.id]);
assert.equal(E.partnerOf(n)?.id === 'sp' ? 'inherited-spouse' : (E.partnerOf(n) && inheritedIds.has(E.partnerOf(n).id) ? 'bad' : 'ok-or-new'), 'ok-or-new');
assert.ok(!E.living(n, 'spouse').some((p) => inheritedIds.has(p.id)));
assert.ok(!E.living(n, 'partner').some((p) => inheritedIds.has(p.id)));

// Unmarried partner of the dead parent also becomes a parent, by sex
const { s: s2, heir: h2 } = fixtureParent();
s2.people.find((p) => p.id === 'sp').rel = 'partner';
s2.people.find((p) => p.id === 'sp').sex = 'f';
s2.people.find((p) => p.id === 'sp').first = 'Cerys';
E.die(s2, 'illness');
const n2 = E.continueAsHeir({}, s2, h2.id, 9002);
assert.equal(n2.people.find((p) => p.id === 'sp').rel, 'mother');

// Heir starts single (no inherited romance) — partnerOf may only be a newly drawn event person, never the parent
assert.notEqual(E.partnerOf(n)?.id, 'sp');
assert.notEqual(E.partnerOf(n2)?.id, 'sp');

// --- load repair: heir married to their parent ---
const bad = E.begin(E.rollFate(77), {});
bad.age = 22;
bad.flags = { is_heir: 1 };
bad.priorName = 'Elowen Ashdown';
bad.people = [];
bad.pid = 0;
add(bad, 'spouse', { id: 'sp', first: 'Dorin', sex: 'm', age: 46 });
add(bad, 'mother', { id: 'gp-m', first: 'Orla', sex: 'f', age: 70 });
add(bad, 'father', { id: 'gp-f', first: 'Bram', sex: 'm', age: 73 });
add(bad, 'sibling', { id: 'own-sib', first: 'Fen', sex: 'm', age: 19 });
const badMeta = { cemetery: [{ name: 'Elowen Ashdown', age: 44, path: 'heir' }] };
E.repairInheritedHeirRels(bad, badMeta);
assert.equal(bad.people.find((p) => p.id === 'sp').rel, 'father', 'repair must un-marry the inherited parent');
assert.equal(bad.people.find((p) => p.id === 'gp-m').rel, 'grandmother');
assert.equal(bad.people.find((p) => p.id === 'gp-f').rel, 'grandfather');
assert.equal(bad.people.find((p) => p.id === 'own-sib').rel, 'sibling', 'true siblings must stay siblings');
assert.equal(bad.flags.heirRelMap, E.HEIR_REL_MAP);
assert.equal(E.partnerOf(bad), undefined);

// repair is idempotent and must not steal a same-age spouse the heir married themselves
const ok = E.begin(E.rollFate(88), {});
ok.age = 24;
ok.flags = { is_heir: 1, heirRelMap: E.HEIR_REL_MAP };
ok.people = [];
add(ok, 'spouse', { id: 'mine', first: 'Junia', sex: 'f', age: 23 });
add(ok, 'father', { id: 'dad', first: 'Dorin', sex: 'm', age: 48 });
E.repairInheritedHeirRels(ok, {});
assert.equal(ok.people.find((p) => p.id === 'mine').rel, 'spouse', 'heir\'s own spouse must be kept');
assert.equal(ok.people.find((p) => p.id === 'dad').rel, 'father');

// old always-mother remap: male "mother" of parent age, plus real grandparents still labeled parents
const sexfix = E.begin(E.rollFate(99), {});
sexfix.age = 21;
sexfix.flags = { is_heir: 1 };
sexfix.priorName = 'Rowan Thorne';
sexfix.people = [];
add(sexfix, 'mother', { id: 'was-spouse', first: 'Hale', sex: 'm', age: 47 });
add(sexfix, 'mother', { id: 'gm', first: 'Aila', sex: 'f', age: 72 });
E.repairInheritedHeirRels(sexfix, { cemetery: [{ name: 'Rowan Thorne', age: 49, path: 'heir' }] });
assert.equal(sexfix.people.find((p) => p.id === 'was-spouse').rel, 'father');
assert.equal(sexfix.people.find((p) => p.id === 'gm').rel, 'grandmother');

console.log('PASS heir relationship remap: spouse/partner→parent, parents→grandparents, siblings of parent→aunt/uncle, siblings stay, friends→family friend, rivals/crushes drop, deceased parent kept; load repair un-marries inherited parent and leaves the heir\'s own spouse alone');
