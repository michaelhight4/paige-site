// RT Benefits board point TASKS from events + the Olympics, and +1 "tree maxed" bonuses (Gary, Oct 31 2026 ~1:39 PM CT,
// dev/rt-respec). Pure + idempotent: syncBoardTasks() reads saved state (story flags, sports state, milestone claims) and pays
// through rt.grantPoints(n, key), which records every key in company.xpClaims as `pts:<key>` and never pays a key twice.
// So it is safe on every tick and on load (old saves that already finished something get it once, on load).
// Economy: Milestones pay 1 point at Gold and 1 at Platinum; these pay 1 each (2 for the Aurelith Olympics), PLACEHOLDER
// values for Game dev to tune here. Text: system_tasks.board_tasks.* (Text Bot request data/textbot_requests_rt_respec.md).
import { TOWN_VENUES, SIGNATURE, wonFlag } from '../sports/olympics.js?v=v0.2.107-alpha';

const has = (flags, f) => !!flags && (typeof flags.has === 'function' ? flags.has(f) : Array.isArray(flags) ? flags.includes(f) : !!flags[f]);
const oly = (sstate, v) => sstate?.oly?.[v] || {};

/** Event / Olympics tasks: {id, tree, points, done(ctx)}. ctx = {flags, sstate}. */
export const EVENT_TASKS = [
  ...TOWN_VENUES.map((v) => ({ id: `oly_town_${v}`, tree: 'oly_towns', points: 1, venue: v, done: (c) => has(c.flags, wonFlag(v)) || (oly(c.sstate, v).wins || 0) > 0 })),
  ...TOWN_VENUES.map((v) => ({ id: `oly_gold_${v}`, tree: 'oly_golds', points: 1, venue: v, event: SIGNATURE[v], done: (c) => (oly(c.sstate, v).golds?.[SIGNATURE[v]] || 0) > 0 })),
  { id: 'oly_aurelith', tree: 'oly_grand', points: 2, done: (c) => has(c.flags, wonFlag('aurelith')) || (oly(c.sstate, 'aurelith').wins || 0) > 0 },
  { id: 'oly_sweep', tree: 'oly_grand', points: 1, done: (c) => Object.entries(c.sstate?.oly || {}).some(([v, o]) => v !== 'aurelith' && (o?.sweeps || 0) > 0) },
  { id: 'oly_sweep_aurelith', tree: 'oly_grand', points: 1, done: (c) => (oly(c.sstate, 'aurelith').sweeps || 0) > 0 },
];
export const EVENT_TREES = [...new Set(EVENT_TASKS.map((t) => t.tree))];
export const TREE_BONUS = 1;

/** Milestone cards (Tasks > Milestones) as trees: maxed = every tier claimed. */
export const milestoneTrees = (mb) => (mb?.table || []).map((m) => ({ id: `ms_${m.id}`, maxed: (mb.state?.claimed?.[m.id] || 0) >= m.tiers.length }));
/** All trees with their maxed state. */
export function treeStates({ flags, sstate, mb } = {}) {
  const c = { flags, sstate };
  return [...milestoneTrees(mb), ...EVENT_TREES.map((tree) => ({ id: tree, maxed: EVENT_TASKS.filter((t) => t.tree === tree).every((t) => t.done(c)) }))];
}

/** Pay every finished event task and every maxed tree once. -> points added now */
export function syncBoardTasks(rt, { flags, sstate, mb } = {}) {
  if (typeof rt?.grantPoints !== 'function') return 0;
  const c = { flags, sstate }; let got = 0;
  for (const t of EVENT_TASKS) if (t.done(c)) got += rt.grantPoints(t.points, `ev:${t.id}`);
  for (const t of treeStates({ flags, sstate, mb })) if (t.maxed) got += rt.grantPoints(TREE_BONUS, `tree:${t.id}`);
  return got;
}
