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

// ---- Tasks screen model (phone > Tasks > Board tasks), dev/rt-respec v2 --------------------------------------------
const cap = (s) => String(s).split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
/** PLACEHOLDER titles / rules (final text: data/textbot_requests_rt_respec.md, keys system_tasks.board_tasks.*). */
export const BOARD_TASK_TEXT = {
  head: 'Board tasks', tree_bonus: 'Tree bonus +{n}', tree_bonus_done: 'Tree bonus earned', bonuses: 'Tree bonuses {done}/{total}',
  bonuses_rule: 'Finish every task in a tree for +1 benefit point, once per tree.', points: '+{n} pt', progress: '{done}/{total}',
  trees: { oly_towns: 'Town Champions', oly_golds: 'Signature Golds', oly_grand: 'Grand Olympics' },
  rules: { oly_towns: 'Win each town Olympics.', oly_golds: 'Win gold in each town\'s signature event.', oly_grand: 'Win in Aurelith, and sweep every event.' },
  task: (t) => t.id.startsWith('oly_town_') ? `${cap(t.venue)}` : t.id.startsWith('oly_gold_') ? `${cap(t.event)} (${cap(t.venue)})`
    : t.id === 'oly_aurelith' ? 'Aurelith Champion' : t.id === 'oly_sweep' ? 'Clean Sweep' : 'Grand Sweep',
};
/** -> {trees:[{id, tasks:[{id, title, points, done, paid}], done, total, maxed, bonusPaid}], bonusDone, bonusTotal, msBonus:{ms_<id>: paid}} */
export function boardTaskModel({ flags, sstate, mb, claims = {} } = {}) {
  const c = { flags, sstate }, paid = (k) => !!claims[`pts:${k}`];
  const trees = EVENT_TREES.map((id) => {
    const tasks = EVENT_TASKS.filter((t) => t.tree === id).map((t) => ({ id: t.id, title: BOARD_TASK_TEXT.task(t), points: t.points, done: t.done(c), paid: paid(`ev:${t.id}`) }));
    const done = tasks.filter((t) => t.done).length;
    return { id, tasks, done, total: tasks.length, maxed: done === tasks.length, bonusPaid: paid(`tree:${id}`) };
  });
  const all = treeStates({ flags, sstate, mb }), msBonus = {};
  for (const t of all) if (t.id.startsWith('ms_')) msBonus[t.id] = paid(`tree:${t.id}`);
  return { trees, bonusDone: all.filter((t) => paid(`tree:${t.id}`)).length, bonusTotal: all.length, msBonus };
}
