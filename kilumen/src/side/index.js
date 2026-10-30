// Side activities (Coder, Oct 30 2026; DRAFT for Gary). attachSide(scene) -> {runSpot(sp), close()}.
// Hooked from Overworld.runSpot (spots with kind 'side'); see ./activities.js for the four activities.
import { ACTIVITIES, collectStep, scoreQuiz, oreWeight, doneFlag } from './activities.js?v=v0.2.93-alpha';
import { addMeritPoints } from './merit.js?v=v0.2.93-alpha';
import { FB } from './text_fallback.js?v=v0.2.93-alpha';

const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
export function sideText(lines, key) {
  const e = getPath(lines, key);
  return (Array.isArray(e) ? e : e?.pages) || FB[key] || [key];
}

export function attachSide(scene) {
  const T = (k) => sideText(scene.lines, k);
  const one = (k) => T(k).join(' ');
  const reward = async (id, n) => {
    if (!n) return;
    addMeritPoints(scene, n, `side:${id}`);
    await scene.say(T('side.merit').map((p) => p.replace('{n}', n)));
  };
  async function runSpot(sp) {
    if (sp?.kind !== 'side') return false;
    const id = sp.side, a = ACTIVITIES[id];
    if (!a) return false;
    if (a.kind === 'collect') {
      const r = collectStep(id, sp.id, scene.flags);
      for (const k of r.say) await scene.say(T(k));
      for (const f of r.set) scene.setFlag(f);
      await reward(id, r.reward);
      return true;
    }
    const done = scene.flags.has(doneFlag(id));
    if ((await scene.ask(T(`side.${id}.intro`), [one('side.choice_yes'), one('side.choice_no')])) !== 0) { await scene.say(T(`side.${id}.declined`)); return true; }
    let pass;
    if (a.kind === 'quiz') {
      const ans = [];
      for (const q of a.questions) ans.push(await scene.ask(T(`side.${id}.${q.q}`), q.choices.map((c) => one(`side.${id}.${c}`))));
      pass = scoreQuiz(id, ans).pass;
    } else {
      const seed = (scene.clock?.day || 0) * 31 + (scene.counters?.[`side_${id}_plays`] || 0);
      scene.bump?.(`side_${id}_plays`);
      let right = 0;
      for (let r = 0; r < a.rounds; r++) {
        const w = oreWeight(seed, r), k = await scene.ask(T(`side.${id}.ask`), a.weights.map((x) => `${x} kg`));
        if (a.weights[k] === w) { right++; await scene.say(T(`side.${id}.right`)); } else await scene.say(T(`side.${id}.wrong`));
      }
      pass = right >= a.need;
    }
    if (!pass) { await scene.say(T(`side.${id}.fail`)); return true; }
    if (done) { await scene.say(T(`side.${id}.done_again`) || T(`side.${id}.pass`)); return true; }
    await scene.say(T(`side.${id}.pass`)); scene.setFlag(doneFlag(id)); await reward(id, a.reward);
    return true;
  }
  return { runSpot, close() {}, activities: ACTIVITIES };
}
