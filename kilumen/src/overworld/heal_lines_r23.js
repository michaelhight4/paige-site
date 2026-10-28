// Own Revival Tech branch lines for Saltmere and Revival Heights (v0.2.30, coder; Text Bot may replace them with
// maps.heal_saltmere.* / maps.heal_revival.* keys in overworld_lines.json, which win). Shape = a lines.maps NPC entry.
const carer = (welcome, rest, field, after, declined) => ({
  pages: [welcome, rest], after_heal: after, declined,
  lines: [
    { id: 'carer_field', flags: ['flg_promoted'], pages: field },
    { id: 'default', flags: [], pages: [welcome, rest] },
  ],
});
const one = (pages, night) => ({ pages, lines: [...(night ? [{ id: 'night', flags: [], when: { phase: 'night' }, pages: night }] : []), { id: 'default', flags: [], pages }] });

export const HEAL_LINES = {
  heal_saltmere: {
    carer: carer('Revival Tech, Saltmere branch. Mind the wet floor, the tide got in again.', 'Staff rest is free. Want me to rest your team?',
      ['Field team, all the way out on the coast? Sit down before the wind takes you.', 'Want me to rest your team?'],
      ['All rested. Energy topped right up.', 'Shake the sand out of their fur before the next fight.'],
      ['Fair enough. The kettle stays on if you change your mind.']),
    technician: one(['Salt air fogs every crystal by noon. So I polish them all again by one.', 'It is not a glamorous system. It works.'],
      ['Night shift. Just me, the polisher and the foghorn.', 'They are slightly out of tune with each other. I have filed a report.']),
    storage_user: one(['I named my whole storage box after boats.', 'Two of them sank in a battle. Figuratively. They are fine.']),
  },
  heal_revival: {
    carer: carer('Revival Tech, Revival Heights branch. Our first ever, they say.', 'Staff rest is free. Want me to rest your team?',
      ['Field team? You made the climb, then. Sit and catch your breath.', 'Want me to rest your team?'],
      ['All rested. Energy back to full, up here and everywhere.', 'The air is thin, so pace them on the climb down.'],
      ['Alright. The branch is open all hours, like the first one was.']),
    technician: one(['The founders polished crystals on this very bench. Allegedly.', 'I polish them on it now. It wobbles.'],
      ['Late shift. You can hear the airships hum from the roof.', 'I count them. Seven tonight.']),
    storage_user: one(['My storage box is sorted by how much each one likes heights.', 'It turns out most of them do not. I live on a hill.']),
  },
};

/** Put the own lines over the borrowed Brookhollow ones; ids are <map>_carer etc. */
export function applyHealLines(name, out) {
  const own = HEAL_LINES[name];
  if (own) for (const [k, v] of Object.entries(own)) out[`${name}_${k}`] = structuredClone(v);
  return out;
}
