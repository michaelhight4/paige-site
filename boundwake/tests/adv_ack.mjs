// Adventure and event outcomes must name concrete deltas and ask the UI to wait for Continue.
import fs from 'fs';
import { loadPack } from '../src/pack.js';
import * as E from '../src/bw_engine.js';

const pack = await loadPack(async (f) => JSON.parse(fs.readFileSync(new URL('../data_fantasy/' + f, import.meta.url))));
E.setPack(pack);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
function has(lines, re) {
  return lines.some((l) => re.test(l));
}

const s0 = E.begin(E.rollFate(2), {});
s0.age = 20;
s0.gold = 80;
const before = E.captureLedger(s0);
s0.gold += 15;
s0.stats.fame += 4;
s0.stats.health -= 12;
s0.injuries.push({ id: 'cut_arm', heal: s0.age + 3 });
s0.relics.push('relic_drowned_charm');
E.useSkill(s0, 'swordsmanship', 3);
const bond = s0.people[0];
bond.bar += 6;
bond.inParty = true;
const lines = E.ledgerDeltas(before, E.captureLedger(s0));
assert(has(lines, /Gold \+15/), 'gold delta missing: ' + lines.join(' | '));
assert(has(lines, /Renown \+4/), 'renown delta missing: ' + lines.join(' | '));
assert(has(lines, /Health -12/), 'health delta missing: ' + lines.join(' | '));
assert(has(lines, /Injury: Cut Arm/), 'injury delta missing: ' + lines.join(' | '));
assert(has(lines, /Item: Drowned Charm/), 'item delta missing: ' + lines.join(' | '));
assert(has(lines, /Swordsmanship \+/), 'skill delta missing: ' + lines.join(' | '));
assert(has(lines, /Bond: .+ closeness \+6/), 'bond delta missing: ' + lines.join(' | '));
assert(has(lines, /Party: .+ joined/), 'party delta missing: ' + lines.join(' | '));

const life = E.begin(E.rollFate(4), {});
life.age = 22;
life.gold = 100;
life.budget = { act: 4, social: 3, adv: 5 };
E.queue(life, 'combat_bandit_ambush');
const bad = E.resolve(life, 99);
assert(bad.ok === false && !bad.ack, 'bad choice should not ask for ack');
assert(life.pending[0] === 'combat_bandit_ambush', 'failed choice consumed the event');
const pay = E.resolve(life, 1);
assert(pay.ack === true, 'choice outcome must request acknowledgment');
assert(pay.title === 'Road Tax', 'outcome keeps the event title');
assert(has(pay.deltas, /Gold -20/), 'pay choice should show the gold cost: ' + pay.deltas.join(' | '));
assert(!life.pending.length, 'resolved event left the queue');

let sawEvent = false;
for (let n = 0; n < 40 && !sawEvent; n++) {
  const hero = E.begin(E.rollFate(20 + n), {});
  hero.age = 24;
  hero.budget = { act: 4, social: 3, adv: 5 };
  hero.skills.swordsmanship = 12;
  hero.skills.tracking = 8;
  const r = E.adventure(hero);
  assert(r.ok, 'adventure failed: ' + r.msg);
  if (!hero.pending.length) continue;
  sawEvent = true;
  assert(!r.ack, 'the encounter itself is the choice sheet, not the outcome');
  assert(hero.flags.advOutcomeId === hero.pending[0], 'set-out did not mark its event');
  const card = E.pendingCard(hero);
  const i = card.choices.findIndex((c) => !c.locked);
  assert(i >= 0, 'no open choice');
  const out = E.resolve(hero, i);
  assert(out.ack === true, 'adventure event outcome must request acknowledgment');
  assert(Array.isArray(out.deltas), 'adventure event missing deltas');
  assert(has(out.deltas, /Gold|Health|Renown|Injury|Swordsmanship|Spellcraft|Endurance|Tracking|Bond|Item|Party|Spirit|Strain|Mana/),
    'adventure event deltas are not concrete: ' + out.deltas.join(' | '));
  assert(!hero.flags.advOutcomeId, 'adventure mark leaked after resolve');
}
assert(sawEvent, 'never saw an adventure event');

const quiet = E.begin(E.rollFate(7), {});
quiet.age = 24;
quiet.budget = { act: 4, social: 3, adv: 5 };
for (const e of pack.events) {
  if (['combat', 'exploration', 'dungeon'].includes(e.cat)) quiet.evLast[e.id] = quiet.age;
}
const wander = E.adventure(quiet);
assert(wander.ack === true, 'quiet road must wait for acknowledgment');
assert(wander.msg && wander.title, 'quiet road missing outcome copy');
assert(has(wander.deltas, /Gold|Tracking|Endurance/), 'quiet road deltas are not concrete: ' + (wander.deltas || []).join(' | '));
assert(!quiet.flags.advOutcomeId, 'quiet road should not leave an event mark');
const lists = E.begin(E.rollFate(9), {});
lists.age = 12;
lists.skills.swordsmanship = 20;
lists.skillUsed = { swordsmanship: 1 };
lists.trainCount = { swordsmanship: 1 };
lists.budget = { act: 4, social: 3, adv: 5 };
const meetBefore = E.captureLedger(lists);
const meet = E.enterTournament(lists, 'meet_sword');
assert(meet.ok, 'tournament entry failed: ' + meet.msg);
const meetDelta = E.ledgerDeltas(meetBefore, E.captureLedger(lists));
assert(has(meetDelta, /Gold|Renown|Swordsmanship/), 'tournament ledger is not concrete: ' + meetDelta.join(' | '));
console.log('ADV ACK PASS', { sawEvent, wander: wander.title, deltas: wander.deltas, meet: meetDelta });
