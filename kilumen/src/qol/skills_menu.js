// QoL #5 Skill Recall (B23 "Skill Memory", free, from the Team menu) and #6 reusable Training Reels (B22 teach items).
// Flags: qol `skillRecall`, `teachReuse` (src/qol/flags.js). Learnsets: src/overnight/learnsets.js (PLACEHOLDER generator
// until real data lands). Only runs from the phone Team / Pack menus (overworld, menu open), never in a battle, talk or
// cutscene; it only marks the save dirty (the normal autosave rules decide when to write).
// Text: every player line below is a /* PH */ fallback; keys requested from Text Bot in data/textbot_requests_qol_b.md.
import { learnsetFor, applyLearn } from '../overnight/learnsets.js?v=v0.2.58-alpha';
import { PLACEHOLDER_SKILLS } from '../ui/data.js?v=v0.2.58-alpha';
import { toID } from '../battle/data/skills.js?v=v0.2.58-alpha';
import { speciesInfo, defaultSkills, displayName } from '../systems/creature.js?v=v0.2.58-alpha';
import { qolFlags } from './flags.js?v=v0.2.58-alpha';

const SK = {}; for (const [name, el] of Object.values(PLACEHOLDER_SKILLS).flat()) SK[toID(name)] ||= { name, el };
export const skillName = (id) => SK[id]?.name || (id ? id[0].toUpperCase() + id.slice(1) : '?');

/** Training Reels (B22, PLACEHOLDER ids + skills; Gary / World Design to place them in RT Supply or pickups). */
export const TEACH_ITEMS = { reel_pounce: { skill: 'pounce' }, reel_gustdart: { skill: 'gustdart' }, reel_halflash: { skill: 'haloflash' } };

const setOf = (c) => learnsetFor(c.species, speciesInfo(c.species)?.el || ['normal'], defaultSkills(c.species));
/** Skills the creature could have learned by now (learnset level <= its level) but does not know. */
export function recallable(c) {
  const known = new Set(c.skills || []);
  return [...new Set(setOf(c).filter((e) => e.level <= (c.level || 1) && !known.has(e.skill)).map((e) => e.skill))];
}
/** A reel skill fits when its element is one of the creature's, it is a normal skill, or it is in the learnset. */
export function canTeach(c, skill) {
  if ((c.skills || []).includes(skill)) return 'known';
  const el = SK[skill]?.el, els = speciesInfo(c.species)?.el || ['normal'];
  return el === 'normal' || els.includes(el) || setOf(c).some((e) => e.skill === skill) ? 'ok' : 'unfit';
}
/** Pure: use a reel on c. -> {result, old?}. The reel stays unless flags.teachReuse is off. */
export function teach(bag, id, c, slot, flags = qolFlags()) {
  const t = TEACH_ITEMS[id]; if (!t || !bag.has(id)) return { result: 'none' };
  const fit = canTeach(c, t.skill); if (fit !== 'ok') return { result: fit };
  const r = applyLearn(c, t.skill, slot);
  if ((r.result === 'learned' || r.result === 'swapped') && !flags.teachReuse) bag.remove(id, 1);
  return r;
}

/** Ask for a slot then learn. -> applyLearn result */
async function learnWithSlot(ui, c, skill, doLearn) {
  if ((c.skills || []).length < 4) return doLearn(null);
  const k = await ui.ask('team', [`${displayName(c)} knows four skills. Replace which one with ${skillName(skill)}?`] /* PH */, [...c.skills.map(skillName), 'Keep all four' /* PH */], { pat: 'dots' });
  return k >= 0 && k < 4 ? doLearn(k) : { result: 'kept' };
}
const say = (ui, c, skill, r) => ui.note(r.result === 'learned' ? `${displayName(c)} learned ${skillName(skill)}.` : r.result === 'swapped' ? `${displayName(c)} forgot ${skillName(r.old)} and learned ${skillName(skill)}.`
  : r.result === 'known' ? `${displayName(c)} already knows it.` : r.result === 'unfit' ? `${displayName(c)} can't learn that one.` : 'Nothing changed.', 2200) /* PH */;

/** Install on the systems UI. Adds ui.qolTeamOpts(c) (extra Team menu rows) and ui.qolTeach(id) (Pack use). */
export function installQolSkills(ui, sys, flags = qolFlags(ui.q || undefined)) {
  const party = () => sys.party?.list || sys.scene?.party || [];
  const dirty = () => { if (sys.scene) sys.scene._dirty = true; };
  ui.qolTeamOpts = (c) => {
    const out = [];
    if (flags.skillRecall && recallable(c).length) out.push(['Recall skill' /* PH */, async () => {
      const list = recallable(c);
      const j = await ui.ask('team', [`Which skill should ${displayName(c)} remember?`] /* PH */, [...list.map(skillName), 'Back'], { pat: 'dots' });
      if (j < 0 || j >= list.length) return; // ask() gives -1 when closed
      const r = await learnWithSlot(ui, c, list[j], (slot) => applyLearn(c, list[j], slot));
      if (r.result !== 'kept') dirty(); say(ui, c, list[j], r);
    }]);
    const reels = Object.keys(TEACH_ITEMS).filter((id) => sys.bag?.has(id));
    if (reels.length) out.push(['Teach from Reel' /* PH */, async () => {
      const j = await ui.ask('team', ['Use which Reel?'] /* PH */, [...reels.map((id) => sys.bag.nameOf(id)), 'Back'], { pat: 'dots' });
      if (j >= 0 && j < reels.length) await teachFlow(reels[j], c);
    }]);
    return out;
  };
  const teachFlow = async (id, c) => {
    const skill = TEACH_ITEMS[id].skill, fit = canTeach(c, skill);
    if (fit !== 'ok') return say(ui, c, skill, { result: fit });
    const r = await learnWithSlot(ui, c, skill, (slot) => teach(sys.bag, id, c, slot, flags));
    if (r.result !== 'kept') dirty(); say(ui, c, skill, r);
  };
  ui.qolTeach = async (id) => {
    if (!TEACH_ITEMS[id]) return false;
    const list = party(); if (!list.length) return true;
    const k = await ui.ask('pack', [`${sys.bag.nameOf(id)}: teach who?`] /* PH */, [...list.map((c) => `${displayName(c)} · ${canTeach(c, TEACH_ITEMS[id].skill) === 'ok' ? 'Can learn' : canTeach(c, TEACH_ITEMS[id].skill) === 'known' ? 'Knows it' : "Can't learn"}`), 'Back'], { pat: 'dots' });
    if (k >= 0 && k < list.length) await teachFlow(id, list[k]); // ask() gives -1 when closed
    return true;
  };
}
