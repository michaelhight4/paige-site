// First-catch safety net (Cut A, Oct 23, 2026, coder; Gary: "the first catch can never soft-lock").
// During the lab test run (test_run_started, not test_run_done) a wild battle never opens with an empty Crystal pocket:
// if the player has 0 Dominance Crystals (and 0 Prime Crystals) they get NET_COUNT spare ones first. Failed catches or
// running away are always allowed, so every next grass encounter is a guaranteed retry. Outside the test run: no effect.
import { CRYSTAL_GRADES } from './data/crystal_grades.js?v=v0.2.100-alpha';
export const NET_ITEM = 'dominance_crystal';
export const NET_COUNT = 3;
export const NET_TEXT = ['You find a few spare Dominance Crystals at the bottom of your Pack.'];

const hasFlag = (flags, f) => !!(flags && (typeof flags.has === 'function' ? flags.has(f) : Array.isArray(flags) && flags.includes(f)));

/** Returns the number of crystals added (0 when the net is not needed). */
export function catchNet(scene) {
  const bag = scene?.systems?.bag;
  if (!bag || typeof bag.count !== 'function' || typeof bag.add !== 'function') return 0;
  if (!hasFlag(scene.flags, 'test_run_started') || hasFlag(scene.flags, 'test_run_done')) return 0;
  if (bag.count(NET_ITEM) > 0 || CRYSTAL_GRADES.grades.some((g) => bag.count(g.item) > 0)) return 0; // any crystal grade (Oct 23, 2026)
  bag.add(NET_ITEM, NET_COUNT);
  return NET_COUNT;
}
