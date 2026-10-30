// gd bug 4 (Party Select listed only part of the team): the pick screens (town events, sports venue) list the WHOLE party.
// Out-cold members are shown greyed and can't be picked; the picked creature (sel) and, for team events, every member who
// is on the crew are marked. Pure helper so it can be unit-tested without a DOM.
export const canPlay = (c) => !!(c && c.species && c.hp !== 0);

/** party -> [{ c, i, out, sel, crew }] for every creature in the party (index = party slot). */
export function pickRows(party, { sel = null, crew = [] } = {}) {
  return (party || []).map((c, i) => ({ c, i, out: !canPlay(c), sel: !!c && c === sel, crew: !!c && crew.includes(c) })).filter((r) => r.c && r.c.species);
}
