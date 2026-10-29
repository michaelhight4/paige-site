// heal_aurelith (Aurelith's own Revival Tech branch, Coder Oct 29 2026): PLACEHOLDER lines until Text Bot writes
// text/overworld_lines.json maps.heal_aurelith (request: data/textbot_requests_heal_aurelith.md). Coder does not edit
// Text Bot files, so these are merged in at load ONLY when maps.heal_aurelith is missing; once Text Bot adds it, theirs wins.
// suggestion_box / newsletter / company_terminal reuse the shared branch entries (same company kit in every branch).
const one = (pages) => ({ pages, lines: [{ id: 'default', flags: [], pages }] });
export const HEAL_AURELITH_LINES_PH = {
  area_name: 'Revival Tech, Aurelith',
  heal_aurelith_carer: {
    ...one(['Welcome to Revival Tech, Aurelith branch. Our flagship.', 'Want me to rest your team?']),
    after_heal: ['All rested. Flagship polish, at no extra charge.', 'Do come again.'],
    declined: ['Of course. We will be here.'],
  },
  heal_aurelith_technician: one(['The capital machines run hot. Watch the flames.', "They don't burn. They just like to show off."]),
  heal_aurelith_storage_user: one(['Biggest branch in the country, and still a queue for the terminal.']),
  heal_aurelith_visitor: one(['I came in from the station just to watch the machine.', 'Nobody believes me about the fire.']),
};
const SHARED = ['suggestion_box', 'newsletter', 'company_terminal'];
/** lines: parsed overworld_lines.json. Adds maps.heal_aurelith when Text Bot has not written it yet. */
export function withHealAurelithPh(lines) {
  if (!lines?.maps || lines.maps.heal_aurelith) return lines;
  const base = lines.maps.heal_saltmere || lines.maps.heal_brookhollow || {}, m = { ...HEAL_AURELITH_LINES_PH };
  for (const k of SHARED) if (base[k]) m[k] = k === 'company_terminal' ? { ...base[k], x: 12, y: 4, stand: [11, 4] } : base[k];
  lines.maps.heal_aurelith = m;
  return lines;
}
