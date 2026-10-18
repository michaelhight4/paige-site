// Data hub: static JS data (data/world.js) + JSON content files. A fantasy-isekai reskin = swap these files (same ids/shape).
import * as W from '../data/world.js';
export const D = { ...W, social: null, politics: null, coaching: null, prodco: null, franchise: null, hardware: null, studio: null, life: null, diseases: [], crimes: null, ribbons: [], palettes: null, sTerms: null, sOcc: null, sAssets: null, artMap: null, artManifest: null, premium: null, skillsData: null, passionsData: null, passionEvents: [], scholarData: null, voice: null, worldActs: null, worldLegacy: null, adsCfg: null, adChoices: null, online: null };
const FILES = { social: 'social.json', politics: 'politics.json', coaching: 'coaching.json', prodco: 'prodco.json', franchise: 'franchise.json', hardware: 'hardware.json', studio: 'studio_data.json', life: 'life.json', events: 'events.json', diseases: 'diseases.json', crimes: 'crimes.json', ribbons: 'ribbons.json', palettes: 'palettes.json', skillsData: 'skills.json', passionsData: 'passions.json', passionEvents: 'passion_events.json', scholarData: 'scholarships.json', sTerms: 'slice/terms.json', sOcc: 'slice/occupations.json', sAssets: 'slice/assets.json', artMap: 'art_map.json', artManifest: 'art_manifest.json', premium: 'premium.json', voice: 'voice.json', businesses: 'businesses.json', charLayers: 'character_layers.json', worldActs: 'world_activities.json', worldLegacy: 'world_legacy.json', adsCfg: 'ads.json', adChoices: 'ad_choices.json', online: 'online.json' };
export async function loadData() {
  const read = async (f) => {
    if (typeof window === 'undefined') { const fs = await import('node:fs'); return JSON.parse(fs.readFileSync(new URL('../data/' + f, import.meta.url), 'utf8')); }
    return (await fetch(new URL('../data/' + f, import.meta.url))).json();
  };
  const all = await Promise.all(Object.entries(FILES).map(async ([k, f]) => [k, await read(f)]));
  for (const [k, v] of all) D[k] = v;
  (await import('./bizplus.js')).mergeData(D.businesses);
  if (D.passionEvents && D.passionEvents.length) { const ids = new Set(D.events.map((e) => e.id)); for (const e of D.passionEvents) if (!ids.has(e.id)) D.events.push(e); }
  return D;
}
