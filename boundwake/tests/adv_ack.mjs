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
  return (lines || []).some((l) => re.test(typeof l === 'string' ? l : String(l?.text || '')));
}

const s0 = E.begin(E.rollFate(2), {});
s0.age = 20;
s0.gold = 80;
s0.team = { renown: 4 };
s0.guild = { renown: 2 };
const before = E.outcomeSnap(s0);
s0.gold += 15;
s0.stats.fame += 4;
s0.stats.health -= 12;
s0.injuries.push({ id: 'cut_arm', heal: s0.age + 3 });
s0.relics.push('relic_drowned_charm');
s0.team.renown = 9;
s0.guild.renown = 6;
E.useSkill(s0, 'swordsmanship', 3);
const lines = E.outcomeDeltas(before, E.outcomeSnap(s0));
assert(has(lines, /\+15 gold/), 'gold delta missing: ' + JSON.stringify(lines));
assert(has(lines, /\+4 renown/), 'renown delta missing: ' + JSON.stringify(lines));
assert(has(lines, /-12 health/), 'health delta missing: ' + JSON.stringify(lines));
assert(has(lines, /Injury/), 'injury delta missing: ' + JSON.stringify(lines));
assert(has(lines, /Loot|relic/i), 'item delta missing: ' + JSON.stringify(lines));
assert(has(lines, /swordsmanship/i), 'skill delta missing: ' + JSON.stringify(lines));
assert(has(lines, /\+5 team renown/), 'team renown missing: ' + JSON.stringify(lines));
assert(has(lines, /\+4 hall renown/), 'hall renown missing: ' + JSON.stringify(lines));
assert(lines.every((l) => l && typeof l.text === 'string' && typeof l.good === 'boolean'), 'deltas must stay {text, good}');

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
assert(pay.chance == null && pay.roll == null, 'a sure choice still reports chance and roll');
assert(has(pay.deltas, /-20 gold/), 'pay choice should show the gold cost: ' + JSON.stringify(pay.deltas));
assert(!life.pending.length, 'resolved event left the queue');

let sawEvent = false;
for (let n = 0; n < 40 && !sawEvent; n++) {
  const hero = E.begin(E.rollFate(20 + n), {});
  hero.age = 24;
  hero.budget = { act: 0, social: 3, adv: 5 };
  hero.skills.swordsmanship = 12;
  hero.skills.tracking = 8;
  const actBefore = hero.budget.act;
  const r = E.adventure(hero);
  assert(r.ok, 'adventure failed: ' + r.msg);
  assert(hero.budget.act === actBefore, 'Set out spent an Action');
  if (!hero.pending.length) continue;
  sawEvent = true;
  assert(!r.ack, 'the encounter itself is the choice sheet, not the outcome');
  const card = E.pendingCard(hero);
  const i = card.choices.findIndex((c) => !c.locked);
  assert(i >= 0, 'no open choice');
  const out = E.resolve(hero, i);
  assert(out.ack === true, 'adventure event outcome must request acknowledgment');
  assert('chance' in out && 'roll' in out, 'Succeeded/Failed card still needs chance and roll');
  assert(Array.isArray(out.deltas), 'adventure event missing deltas');
  assert(out.deltas.every((d) => d && typeof d.text === 'string'), 'deltas left the {text, good} shape');
}
assert(sawEvent, 'never saw an adventure event');

const quiet = E.begin(E.rollFate(7), {});
quiet.age = 24;
quiet.budget = { act: 0, social: 3, adv: 5 };
for (const e of pack.events) {
  if (['combat', 'exploration', 'dungeon'].includes(e.cat)) quiet.evLast[e.id] = quiet.age;
}
const wander = E.adventure(quiet);
assert(quiet.budget.act === 0, 'quiet road spent an Action');
assert(wander.ack === true, 'quiet road must wait for acknowledgment');
assert(wander.msg && wander.title, 'quiet road missing outcome copy');
assert(has(wander.deltas, /gold|tracking|endurance/i), 'quiet road deltas are not concrete: ' + JSON.stringify(wander.deltas));
assert(!quiet.pending.length, 'quiet road queued an event');

const lists = E.begin(E.rollFate(9), {});
lists.age = 12;
lists.skills.swordsmanship = 20;
lists.skillUsed = { swordsmanship: 1 };
lists.trainCount = { swordsmanship: 1 };
lists.budget = { act: 4, social: 3, adv: 5 };
const meetBefore = E.outcomeSnap(lists);
const meet = E.enterTournament(lists, 'meet_sword');
assert(meet.ok, 'tournament entry failed: ' + meet.msg);
const meetDelta = E.outcomeDeltas(meetBefore, E.outcomeSnap(lists));
assert(has(meetDelta, /gold|renown|swordsmanship/i), 'tournament ledger is not concrete: ' + JSON.stringify(meetDelta));

const ui = fs.readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
assert(ui.includes('data-a="ackout"'), 'Continue button missing');
assert(ui.includes("r?.ack"), 'quiet road must open the outcome dialog');
assert(ui.includes('OUTING'), 'tournament and team results must use the outcome dialog');
assert(!/outcomeAck[\s\S]{0,200}setTimeout\(\(\) => \{[^}]*outcomeAck = null/.test(ui), 'outcome must not clear itself on a timer');

console.log('ADV ACK PASS', { sawEvent, wander: wander.title, deltas: wander.deltas, meet: meetDelta.map((d) => d.text) });
