// Loads the fantasy world pack (data_fantasy/). Browser: fetch; Node tests: pass a reader.
const FILES = {
  skills: 'skills.json',
  styles: 'styles.json',
  occ: 'slice/occupations.json',
  terms: 'slice/terms.json',
  events: 'events.json',
  regions: 'regions.json',
  races: 'races.json',
  traits: 'traits.json',
  // Lifeline systems reskinned for Boundwake (see docs/PACK_RESKIN.md)
  ailments: 'ailments.json',
  law: 'law.json',
  passions: 'passions.json',
  passionEvents: 'passion_events.json',
  workshops: 'workshops.json',
  notices: 'notices.json',
  court: 'court.json',
  mentors: 'mentors.json',
  patronage: 'patronage.json',
  worldActivities: 'world_activities.json',
  worldLegacy: 'world_legacy.json',
};
const OPTIONAL = { eventsExpansion: 'events_expansion.json', gear: 'gear.json' };
export async function loadPack(read = async (f) => (await fetch(new URL('../data_fantasy/' + f, import.meta.url))).json()) {
  const out = {};
  await Promise.all(Object.entries(FILES).map(async ([k, f]) => { out[k] = await read(f); }));
  // Optional teammate files (empty-safe): Story Bot events_expansion.json, Game Dev gear.json
  for (const [k, f] of Object.entries(OPTIONAL)) { try { out[k] = await read(f); } catch { out[k] = null; } }
  const ex = out.eventsExpansion; const exList = Array.isArray(ex) ? ex : Array.isArray(ex?.events) ? ex.events : [];
  if (exList.length && Array.isArray(out.events)) {
    const have = new Set(out.events.map((e) => e.id));
    out.events = out.events.concat(exList.filter((e) => e && e.id && Array.isArray(e.ages) && Array.isArray(e.choices) && !have.has(e.id)));
  }
  // Passion events join the main event pool (gated by if.passion)
  if (Array.isArray(out.passionEvents) && Array.isArray(out.events)) {
    out.events = out.events.concat(out.passionEvents);
  }
  return out;
}
