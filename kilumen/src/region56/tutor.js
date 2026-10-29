// Old Gus (Tidewater lighthouse keeper) skill tutor: teaches Brine Lash to Lurelamp, Pearlisk and Driftknot lines.
// GD package design/regions56_gd/moves_swamp_sea.json. Placed on tidewater_coast (36,32, npc tidewater_coast_lighthouse_keeper);
// region56/index.js registers oldGusHook() in scene.talkHooks (overworld.js talk()).
// Text keys (Text Bot, placeholder only): data/textbot_requests_r56_moves.md (system_story_r56.old_gus_*).
import { R56_TUTOR } from '../battle/data/learnsets_r56.js';
import { applyLearn } from '../overnight/learnsets.js';
import { buildSkills } from '../battle/data/skills.js';

export const TUTOR_NPC = 'tr_tidewater_coast_lighthouse_keeper';
export const TUTOR_KEYS = { offer: 'system_story_r56.old_gus_offer', none: 'system_story_r56.old_gus_none', taught: 'system_story_r56.old_gus_taught', known: 'system_story_r56.old_gus_known' };

/** Skills Old Gus can teach creature c (species id) that it does not already know. */
export function tutorSkillsFor(c) {
  return Object.entries(R56_TUTOR).filter(([sk, list]) => list.includes(c?.species) && !(c.skills || []).includes(sk)).map(([sk]) => sk);
}

/** Pure: teach `skill` to c (slot = index to replace when full). -> applyLearn result, or {result:'cannot'} */
export function tutorTeach(c, skill, slot = null) {
  if (!(R56_TUTOR[skill] || []).includes(c?.species)) return { result: 'cannot' };
  return applyLearn(c, skill, slot);
}

/** Ron 6 arena (tidewater_coast event_spots.ron_battle_r6): stand points for a staged fight, or null. Not hooked to a cutscene yet. */
export function ronArena(mapJson) {
  const s = (mapJson?.event_spots || []).find?.((e) => e.id === 'ron_battle_r6') || mapJson?.event_spots?.ron_battle_r6;
  return s ? { area: s.area, ron: s.ron, player: s.player } : null;
}

const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
let SK = null; const skillName = (id) => { try { SK ||= buildSkills(); } catch { SK = {}; } return SK[id]?.name || id; };

/** Pure: who Old Gus talks about. -> {state:'offer'|'known'|'none', creature, skill} */
export function tutorPick(party) {
  for (const c of party || []) { const sk = tutorSkillsFor(c); if (sk.length) return { state: 'offer', creature: c, skill: sk[0] }; }
  for (const c of party || []) for (const [sk, list] of Object.entries(R56_TUTOR)) if (list.includes(c?.species)) return { state: 'known', creature: c, skill: sk };
  return { state: 'none', creature: null, skill: null };
}

/** Talk script: offer (Teach it / Not today) -> taught | known | none. scene needs say/ask/lines. */
export async function runOldGus(scene, { party, speaker, textVars } = {}) {
  const pick = tutorPick(party || scene.systems?.party?.list || scene.party || []);
  const name = (c) => c?.nickname || c?.name || c?.species || '';
  const vars = { ...(textVars || scene.textVars?.() || {}), creature: name(pick.creature), skill: pick.skill ? skillName(pick.skill) : '' };
  const fill = (x) => String(x).replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  const entry = (k) => getPath(scene.lines, TUTOR_KEYS[k]);
  const pages = (k) => { const e = entry(k); return (e?.pages || (Array.isArray(e) ? e : [])).map(fill); };
  const say = (k) => (pages(k).length ? scene.say(pages(k), speaker) : Promise.resolve());
  if (pick.state !== 'offer') { await say(pick.state); return { result: pick.state }; }
  const choices = entry('offer')?.choices || ['Teach it', 'Not today'];
  const c = await scene.ask(pages('offer'), choices, speaker);
  if (c !== 0) return { result: 'declined' };
  let slot = null;
  if ((pick.creature.skills || []).length >= 4) { // full: pick the skill to forget (last choice keeps them all)
    const opts = [...pick.creature.skills.map(skillName), choices[1] || 'Not today'];
    const i = await scene.ask([], opts, speaker);
    if (i < 0 || i > 3) return { result: 'declined' };
    slot = i;
  }
  const r = tutorTeach(pick.creature, pick.skill, slot);
  if (r.result === 'learned' || r.result === 'swapped') await say('taught');
  else if (r.result === 'known') await say('known');
  return r;
}

/** overworld.js talkHooks entry for Old Gus. */
export const oldGusHook = (scene) => ({
  match: (mapName, def) => mapName === 'tidewater_coast' && (def?.gd_id === TUTOR_NPC || def?.id === 'tidewater_coast_lighthouse_keeper'),
  run: ({ speaker }) => runOldGus(scene, { speaker }),
});
