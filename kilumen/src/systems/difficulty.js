// Difficulty modes (Gary 2:53 AM CT Oct 29 2026: "easy is 50% easier hard is 50% harder"). Pure, no DOM.
// Normal = the game exactly as it was. Easy / Hard move two dials by 50%:
//   - foe damage x0.5 / x1.5 (engine getDamage hook on side p2, src/battle/battle.js opts.foeDamageMult)
//   - foe level: half of the level gap above your lead is removed (Easy) or added (Hard, at least +1, at most +5)
// and pay: Easy x0.6 money / prizes, Hard x1.15. Missing in a save -> 'normal'.
export const DIFFICULTIES = {
  easy: { id: 'easy', label: 'Easy', damage: 0.5, money: 0.6, healAt: 0.25, healsPer: 1, blurb: 'Foes hit half as hard and sit closer to your level. Pays less.' },
  normal: { id: 'normal', label: 'Normal', damage: 1, money: 1, healAt: 0.25, healsPer: 1, blurb: 'The game as it is meant to be played.' },
  hard: { id: 'hard', label: 'Hard', damage: 1.5, money: 1.15, healAt: 0.33, healsPer: 2, blurb: 'Foes hit 50% harder and train above you. Pays a little more.' },
};
export const DIFF_ORDER = ['easy', 'normal', 'hard'];
export const PENDING_KEY = 'kilumen_alpha_newgame_difficulty';
export const diffOf = (id) => DIFFICULTIES[id] || DIFFICULTIES.normal;
export const getDifficulty = (state) => (state && DIFFICULTIES[state.difficulty] ? state.difficulty : 'normal');
export function setDifficulty(state, id) { if (state && DIFFICULTIES[id]) state.difficulty = id; return getDifficulty(state); }

/** foe level after the mode: lead = your lead's level */
export const ENEMY_MAX_LEVEL = 68; // Gary Oct 30 2026: no enemy above 68 (player max 70); mirrors KILUMEN_RULES.enemyMaxLevel
export function scaleLevel(level, lead, mode) {
  if (mode === 'normal' || !DIFFICULTIES[mode]) return Math.min(ENEMY_MAX_LEVEL, level);
  const gap = Math.max(0, level - (lead || level));
  if (mode === 'easy') return Math.min(ENEMY_MAX_LEVEL, Math.max(2, level - Math.round(gap * 0.5)));
  return Math.min(ENEMY_MAX_LEVEL, level + Math.min(5, Math.max(1, Math.ceil(gap * 0.5))));
}
export const scaleFoes = (foes, lead, mode) => foes.map((f) => ({ ...f, level: scaleLevel(f.level, lead, mode) }));

// Task E (Gary 2:58 AM CT Oct 29): Masters after the first carry healing items, never more than 5.
// Engine ids: tonicsmall = Small Remedy (20 HP), tonicLarge = Big Remedy (60 HP). Player text never says the id.
export const MAX_FOE_ITEMS = 5;
/** -> engine bag {tonicsmall, toniclarge} for Master n under the mode (Easy: about half, minors kept; Hard: +1 Big Remedy) */
export function masterItems(n, mode = 'normal') {
  if (!n || n <= 1) return {};
  let small, large;
  if (n === 2) [small, large] = [3, 0]; else if (n === 3) [small, large] = [2, 1]; else if (n === 4) [small, large] = [2, 2]; else [small, large] = [2, 3];
  if (mode === 'easy') { const keep = Math.max(1, Math.floor((small + large) / 2)); large = Math.min(large, Math.max(0, keep - small)); small = Math.min(small, keep); }
  if (mode === 'hard') large += 1;
  while (small + large > MAX_FOE_ITEMS) small > 0 ? small-- : large--;
  const out = {}; if (small) out.tonicsmall = small; if (large) out.toniclarge = large; return out;
}
