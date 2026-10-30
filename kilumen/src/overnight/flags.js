// Overnight systems (Oct 23, 2026): feature switches. Anything half-done defaults OFF so a new game never breaks.
// URL override: ?ov=field,regionmap (turn on), ?ov=-sight (turn off), ?ov=all. Not saved.
export const OVERNIGHT_DEFAULTS = Object.freeze({
  links: true,       // generic map registry + TO COME links open once their target map is registered (data only)
  stagedMaps: false, // ALPHA build: pinned off // also register World Design's staged maps (src/overnight/staged_maps.json) -- dev preview only
  sight: true,       // F17 trainer line of sight + G11 'spotted' intro (route1 sight data)
  kilindex: true,    // C15/M1 seen/registered logging (save kilindex block) + Kilindex screen counts
  starterLines: true,// G12: read system_party.starter_* lines when Text Bot adds them (marked placeholder until then)
  field: true, // Oct 30 2026: on by default (each skill still needs its own has_* unlock flag);      // F1/F2/F3 field obstacles (Brushbreak unlock flag TBD by Gary; Tideglide has no ride art yet)
  regionmap: false,  // F6 region map + Skylift fast travel (has_skylift unobtainable until Frostspire exists)
  learnsets: false,  // B21 learnsets + learn prompt (PLACEHOLDER generator: no Story Bot learnset data yet)
});

export function overnightFlags(query) {
  const f = { ...OVERNIGHT_DEFAULTS };
  const raw = ''; // ALPHA build: ?ov= ignored
  for (const t of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (t === 'all') for (const k of Object.keys(f)) f[k] = true;
    else if (t[0] === '-' && t.slice(1) in f) f[t.slice(1)] = false;
    else if (t in f) f[t] = true;
  }
  return f;
}
