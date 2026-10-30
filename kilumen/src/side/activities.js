// Side activities for thin towns (Coder, Oct 30 2026). Pure data + logic, no DOM (Node-tested in tests/side_activities.test.mjs).
// Spots live in the map JSON: interact_spots {kind:'side', side:<activity id>, step}. Text keys: side.<activity>.<key>
// (Text Bot owns text: data/textbot_requests_side_activities.md; ./text_fallback.js holds the placeholders until then).
// Pattern credit: the "collect N then turn in" and "quiz board" loops follow the small town errands in the Pokémon
// Gen 1-5 towns (structure only; no names, text or assets). Rewards go through addMeritPoints (./merit.js).
export const ACTIVITIES = {
  fern_letters: { map: 'fernwick', kind: 'collect', town: 'Fernwick', items: ['side_letters_1', 'side_letters_2', 'side_letters_3'], turnIn: 'side_letters_box', reward: 3 },
  frost_lamps: { map: 'frostspire', kind: 'collect', town: 'Frostspire', items: ['side_frost_lamp_1', 'side_frost_lamp_2', 'side_frost_lamp_3', 'side_frost_lamp_4'], turnIn: null, reward: 3 },
  salt_tide_quiz: { map: 'saltmere', kind: 'quiz', town: 'Saltmere', reward: 4,
    questions: [{ q: 'q1', choices: ['c1a', 'c1b', 'c1c'], answer: 1 }, { q: 'q2', choices: ['c2a', 'c2b', 'c2c'], answer: 0 }, { q: 'q3', choices: ['c3a', 'c3b', 'c3c'], answer: 2 }] },
  cinder_ore_weigh: { map: 'cindervale', kind: 'guess', town: 'Cindervale', reward: 4, rounds: 3, need: 2, weights: [3, 5, 8] },
};
export const doneFlag = (id) => `side_${id}_done`;
export const gotFlag = (id, spot) => `side_${id}_${spot}`;
export const progress = (id, flags) => { const a = ACTIVITIES[id]; return a?.items ? a.items.filter((s) => flags.has(gotFlag(id, s))).length : 0; };

/** One collect-type interaction. Returns {say: [text keys], set: [flags], reward: n}. */
export function collectStep(id, spotId, flags) {
  const a = ACTIVITIES[id], out = { say: [], set: [], reward: 0 };
  if (!a || a.kind !== 'collect') return out;
  if (flags.has(doneFlag(id))) { out.say.push(`side.${id}.done_again`); return out; }
  const has = new Set([...flags].filter((f) => f.startsWith(`side_${id}_`)));
  if (a.items.includes(spotId)) {
    if (has.has(gotFlag(id, spotId))) { out.say.push(`side.${id}.already`); return out; }
    out.set.push(gotFlag(id, spotId)); has.add(gotFlag(id, spotId));
    const n = a.items.filter((s) => has.has(gotFlag(id, s))).length;
    out.say.push(n === 1 ? `side.${id}.first` : `side.${id}.found`);
    if (n === a.items.length && !a.turnIn) { out.say.push(`side.${id}.complete`); out.set.push(doneFlag(id)); out.reward = a.reward; }
    else if (n === a.items.length) out.say.push(`side.${id}.all_found`);
    return out;
  }
  if (spotId === a.turnIn) {
    const n = a.items.filter((s) => has.has(gotFlag(id, s))).length;
    if (n < a.items.length) { out.say.push(n ? `side.${id}.turn_in_short` : `side.${id}.intro`); return out; }
    out.say.push(`side.${id}.complete`); out.set.push(doneFlag(id)); out.reward = a.reward;
  }
  return out;
}

/** Quiz: answers[] = chosen indexes. Returns {right, total, pass}. */
export function scoreQuiz(id, answers) {
  const qs = ACTIVITIES[id].questions; let right = 0;
  qs.forEach((q, i) => { if (answers[i] === q.answer) right++; });
  return { right, total: qs.length, pass: right === qs.length };
}

/** Ore weigh: the cart's weight for round r (deterministic from seed, so tests and replays agree). */
export function oreWeight(seed, r) {
  const w = ACTIVITIES.cinder_ore_weigh.weights;
  let x = (Math.imul((seed | 0) + 1, 2654435761) ^ Math.imul(r + 7, 40503)) >>> 0;
  x ^= x >>> 13; x = Math.imul(x, 1274126177) >>> 0;
  return w[x % w.length];
}
