// rtb capture tab (Oct 29 2026, Gary: "a proper capture tab/button in real-time wild fights"). Pure helpers + text keys;
// index.js opens / closes the tab, view.js draws it. The roll itself is unchanged: sim.castCrystal -> captureChance / captureRoll
// (src/battle/capture.js), so odds shown here are the exact numbers the roll uses.
// PLACEHOLDER player-facing text (Text Bot owns the lines; keys rtb_capture.* are stable). {n} {name} {key} fill in.
export const CT = {
  button: 'Capture', button_none: 'No crystals', title: 'Capture', foe: '{name}',
  hint_pc: '1-{n} or click to launch · G close', hint_touch: 'Tap a crystal to launch',
  slowed: 'Time slowed', none: 'No crystals left.', count: '×{n}',
  odds_slim: 'Slim', odds_low: 'Low', odds_fair: 'Fair', odds_good: 'Good', odds_great: 'Great',
  f_full: 'Full HP: weaken it first', f_hurt: 'Hurt', f_weak: 'Badly hurt', f_drowsy: 'Drowsy', f_scorched: 'Scorched', f_rare: 'Rare kind',
  launch: 'Crystal!', missed: 'Missed', caught: 'Caught!', caught_sub: '{name} joins you.',
  broke: '{name} broke free!', broke_sub: 'And it is angry.',
  react: ['Hmph!', 'Grr!', 'Nope!', 'Not today!', '!!'],
};
export const ct = (s, v = {}) => String(s ?? '').replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');

/** odds 0..1 -> band key (rtb_capture.odds_*); thresholds PLACEHOLDER */
export function oddsBand(p) { return p < 0.06 ? 'slim' : p < 0.18 ? 'low' : p < 0.35 ? 'fair' : p < 0.6 ? 'good' : 'great'; }
export const BAND_COLOR = { slim: '#ff6b6b', low: '#ffa94d', fair: '#ffd34d', good: '#8be37a', great: '#5bf0c8' };

/** what makes this foe easier / harder right now -> [{k, good}] (good = helps the capture) */
export function factorsOf(foe, rarity = 0.5) {
  const out = [], fr = foe.mhp ? foe.c.hp / foe.mhp : 1;
  if (fr >= 0.95) out.push({ k: 'f_full', good: false }); else if (fr < 0.25) out.push({ k: 'f_weak', good: true }); else if (fr < 0.7) out.push({ k: 'f_hurt', good: true });
  if (foe.drowsy > 0) out.push({ k: 'f_drowsy', good: true });
  if (foe.scorch > 0) out.push({ k: 'f_scorched', good: true });
  if (rarity < 0.3) out.push({ k: 'f_rare', good: false });
  return out;
}
// Slow-down while the tab is open (PLACEHOLDER, see design note in index.js): the fight keeps running at 40 %,
// a hit on your creature snaps the tab shut, and it closes by itself after 4 s of real time.
export const CAP_TAB = { slow: 0.4, maxOpen: 4, recover: 0.35 };
