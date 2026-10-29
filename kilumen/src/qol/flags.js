// QoL batch B (Oct 29, 2026; Gary approved items 4/5/6/7 at 10:49 AM CT; design/QOL_MODS_SHORTLIST.md). Kill switches.
// URL override (not saved): ?qol=-xpShare (turn one off), ?qol=dmgPreview (turn one on), ?qol=none / ?qol=all.
export const QOL_B_DEFAULTS = Object.freeze({
  xpShare: true,      // #4 Team XP share: benched creatures that can still battle get XP_SHARE of each award
  matchup: true,      // #7 Strong / Weak arrows on the battle skill list (vs the foe out now)
  dmgPreview: false,  // #7 optional damage-range preview on the skill list (off by default: the game stays hard)
  skillRecall: true,  // #5 Team menu > Skills > Recall: relearn a skill from the learnset up to the current level
  teachReuse: true,   // #6 Training Reels are not used up when they teach a skill
});
export const XP_SHARE = 0.25; // Gary 11:02 AM CT Oct 29: benched creatures that haven't fainted get 25%

export function qolFlags(query = globalThis.location ? new URLSearchParams(globalThis.location.search) : null) {
  const f = { ...QOL_B_DEFAULTS };
  const raw = query?.get?.('qol') || '';
  for (const t of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (t === 'all' || t === 'none' || t === '0') for (const k of Object.keys(f)) f[k] = t === 'all'; // '0' = all off, shared with the batch A switch (src/qol/qol.js)
    else if (t[0] === '-' && t.slice(1) in f) f[t.slice(1)] = false;
    else if (t in f) f[t] = true;
  }
  return f;
}
