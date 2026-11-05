// Loads the fantasy world pack (data_fantasy/). Browser: fetch; Node tests: pass a reader.
const FILES = { skills: 'skills.json', styles: 'styles.json', occ: 'slice/occupations.json', terms: 'slice/terms.json', events: 'events.json', regions: 'regions.json', races: 'races.json', traits: 'traits.json' };
export async function loadPack(read = async (f) => (await fetch(new URL('../data_fantasy/' + f, import.meta.url))).json()) {
  const out = {}; await Promise.all(Object.entries(FILES).map(async ([k, f]) => { out[k] = await read(f); })); return out;
}
