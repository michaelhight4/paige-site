// QoL #7 Matchup Hint (Oct 29, 2026). Flags: qol `matchup` (arrows) and `dmgPreview` (range), src/qol/flags.js.
// Effectiveness comes from the engine itself (creature.runEffectiveness / runImmunity), so arrows always match the
// real chart (src/battle/data/elements.js) and the effectiveness cap. The damage preview has the same shape as
// @smogon/calc (MIT; github.com/smogon/damage-calc): calculate(attacker, defender, move) -> { range: [min, max], ... }.
// Only that interface idea is used, no calc code: the numbers come from the Kilumen engine's own getDamage() run on a
// cloned random stream (no Clean Strike, lowest and highest roll), so the live battle's random sequence never moves.
// Player-facing words: 'Strong' / 'Weak' / 'No effect' only (blocked-word list in the shortlist).

/** -> { mod: -2..2 | null, immune, label, arrow } for an engine move id against one foe creature. null mod = status skill */
export function matchupOf(kb, moveId, foe) {
  if (!foe || foe.fainted) return null;
  const b = kb.battle, move = b.dex.getActiveMove(moveId);
  if (move.category === 'Status') return { mod: null, immune: false, arrow: '', label: '' };
  if (!foe.runImmunity(move, false)) return { mod: null, immune: true, arrow: '✕', label: 'No effect' };
  const mod = foe.runEffectiveness(move);
  return { mod, immune: false, arrow: mod > 1 ? '▲▲' : mod > 0 ? '▲' : mod < -1 ? '▼▼' : mod < 0 ? '▼' : '–', label: mod > 1 ? 'Very strong' : mod > 0 ? 'Strong' : mod < -1 ? 'Very weak' : mod < 0 ? 'Weak' : 'Even' };
}

/** @smogon/calc-shaped: { range: [min, max], pct: [minPct, maxPct], koIn } or null (status / no effect). Never touches the live PRNG. */
export function calculate(kb, attacker, defender, moveId) {
  if (!attacker || !defender || defender.fainted) return null;
  const b = kb.battle, saved = b.prng, rnd = b.randomizer;
  const run = (roll) => {
    const move = b.dex.getActiveMove(moveId); move.willCrit = false;
    b.randomizer = roll; b.prng = saved.clone();
    try { return b.actions.getDamage(attacker, defender, move, true); } finally { b.prng = saved; b.randomizer = rnd; }
  };
  let lo, hi;
  try { lo = run((d) => b.trunc(b.trunc(d * 85) / 100)); hi = run((d) => d); } catch { return null; }
  if (typeof lo !== 'number' || typeof hi !== 'number' || hi <= 0) return null;
  const max = defender.maxhp || 1, left = defender.hp || 0;
  return { range: [lo, hi], pct: [Math.round((lo / max) * 100), Math.round((hi / max) * 100)], koIn: lo >= left ? 1 : hi >= left ? 'maybe' : 0 };
}

/** Short skill-list tag, e.g. "▲ Strong" or "▲ Strong · 24–31%". '' when both flags are off or nothing applies. */
export function skillTag(kb, moveId, flags, slot = 0) {
  if (!flags.matchup && !flags.dmgPreview) return '';
  const me = kb.p1.active[slot], foes = (kb.p2.active || []).filter((f) => f && !f.fainted);
  if (!me || !foes.length) return '';
  const parts = foes.map((foe) => {
    const m = matchupOf(kb, moveId, foe); if (!m || (!m.arrow && !flags.dmgPreview)) return '';
    let t = flags.matchup && m.arrow ? (foes.length > 1 ? m.arrow : `${m.arrow} ${m.label}`) : '';
    if (flags.dmgPreview && !m.immune && m.mod != null) { const c = calculate(kb, me, foe, moveId); if (c) t += `${t ? ' ' : ''}${c.pct[0]}–${c.pct[1]}%`; }
    return t;
  }).filter(Boolean);
  return parts.join(' | ');
}
