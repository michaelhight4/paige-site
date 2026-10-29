// Old Gus (Tidewater lighthouse keeper) skill tutor: teaches Brine Lash to Lurelamp, Pearlisk and Driftknot lines.
// GD package design/regions56_gd/moves_swamp_sea.json. Dormant: the NPC (TUTOR_NPC) is not placed on tidewater_coast yet.
// Text keys (Text Bot, placeholder only): data/textbot_requests_r56_moves.md (system_story_r56.old_gus_*).
import { R56_TUTOR } from '../battle/data/learnsets_r56.js';
import { applyLearn } from '../overnight/learnsets.js';

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
