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
export async function loadPack(read = async (f) => (await fetch(new URL('../data_fantasy/' + f, import.meta.url))).json()) {
  const out = {};
  await Promise.all(Object.entries(FILES).map(async ([k, f]) => { out[k] = await read(f); }));
  // Passion events join the main event pool (gated by if.passion)
  if (Array.isArray(out.passionEvents) && Array.isArray(out.events)) {
    out.events = out.events.concat(out.passionEvents);
  }
  return out;
}
