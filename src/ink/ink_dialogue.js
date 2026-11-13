// Kilumen ink dialogue adapter (Oct 22, 2026, four-tools pass). OFF by default: main.js loads it only with ?ink=1.
// For each spot in INK_SPOTS the compiled ink story (text/ink/<name>.ink.json, built by tools/ink/compile.mjs)
// supplies the pages; everything else still comes from text/overworld_lines.json. Nothing in overworld.js changes:
// scene._entryFor is wrapped so the spot's entry carries ONE line, already chosen by ink, and the normal
// pick -> fill -> say path shows it (same log entries, same placeholders, same dialogue box).
// Ink conventions (quality/toolkit/INK_PIPELINE.md): one output line = one page; "# line:<id>" names the mirrored
// overworld_lines id; placeholders are written \{lead\} in ink; EXTERNAL flag(name) / has_lead() are bound here.
import { Story } from '../vendor/inkjs/ink.mjs';

/** spot key (maps.<map>.<id>) -> compiled story, relative to this file. Add a row per converted conversation. */
export const INK_SPOTS = {
  'maps.brookhollow.villager_garden': '../../text/ink/villager_garden.ink.json',
};

/** Run a story from the top: { id, pages } (id from the first "line:<id>" tag, else 'ink'). Pure apart from the story. */
export function runInk(story) {
  story.ResetState();
  const pages = [];
  let id = null;
  while (story.canContinue) {
    const text = story.Continue().replace(/\n$/, '');
    for (const t of story.currentTags || []) { const m = /^line:\s*([\w-]+)$/.exec(t.trim()); if (m && !id) id = m[1]; }
    if (text.trim()) pages.push(text);
  }
  if (story.currentChoices.length) console.warn('ink: choices are not wired yet (say-only adapter); stopped at the first choice');
  return { id: id || 'ink', pages };
}

/** Build a Story with the game's EXTERNAL functions bound to the live scene. */
export function makeStory(json, scene) {
  const story = new Story(json);
  story.BindExternalFunction('flag', (name) => !!scene.flags?.has(String(name)), true);
  story.BindExternalFunction('has_lead', () => !!scene.party?.[0], true);
  return story;
}

/** Load every INK_SPOTS story, then wrap scene._entryFor. Returns the list of spot keys now served by ink. */
export async function installInk(scene, { spots = INK_SPOTS, load } = {}) {
  load ||= async (rel) => { const r = await fetch(new URL(rel, import.meta.url)); if (!r.ok) throw new Error(`${rel}: ${r.status}`); return r.text(); };
  const stories = {};
  for (const [key, rel] of Object.entries(spots)) {
    try { stories[key] = makeStory(await load(rel), scene); } catch (e) { console.error(`ink: ${key} not loaded (JSON lines used):`, e); }
  }
  const orig = scene._entryFor.bind(scene);
  scene._entryFor = (mapName, def) => {
    const e = orig(mapName, def);
    const key = `maps.${mapName}.${def?.id}`, story = stories[key];
    if (!e || !story) return e;
    try {
      const { id, pages } = runInk(story);
      if (!pages.length) return e;
      const base = (e.lines || []).find((l) => l.id === id) || {};
      return { ...e, ink: key, lines: [{ ...base, id, flags: [], when: undefined, pages }] };
    } catch (err) { console.error(`ink: ${key} failed, JSON lines used:`, err); return e; }
  };
  scene.ink = { spots: Object.keys(stories) };
  scene.log?.push({ tick: scene.tick, type: 'ink', spots: scene.ink.spots });
  return scene.ink.spots;
}
