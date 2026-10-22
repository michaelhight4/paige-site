// Convert /workspace/lifesim_text (Text Bot schema, see its README) into lifesim's event schema at data/text/.
//   node tools/import_text.mjs [srcDir=/workspace/lifesim_text] [--complete]
// Without --complete the manifest says "complete": false and the loader (src/textpack.js) ignores the pack.
// Unsupported conditions (broke, unemployed, has_pet, has_home, driver, retired, has_record, age_stage, stat:x<N ...) are dropped and listed.
import fs from 'node:fs'; import path from 'node:path';
const src = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) || '/workspace/lifesim_text', complete = process.argv.includes('--complete');
const out = new URL('../data/text/', import.meta.url).pathname; fs.mkdirSync(out, { recursive: true });
const files = fs.readdirSync(path.join(src, 'events')).filter((f) => f.endsWith('.json')).sort();
const raw = files.flatMap((f) => JSON.parse(fs.readFileSync(path.join(src, 'events', f), 'utf8')));
const FL = { employed: { job: 1 }, has_partner: { partner: 1 }, single: { single: 1 }, has_child: { kids: 1 }, has_sibling: { sibling: 1 }, parent_alive: { parent: 'any' }, in_prison: { prison: 1 }, in_school: { school: 'any' }, in_college: { school: 'college' }, wealthy: { minCash: 100000 }, has_car: { anyCar: 1 } };
const dropped = new Set(), targets = new Set(raw.flatMap((e) => e.follow_ups || []));
const cond = (list) => { const o = {}; for (const c of list || []) { const m = /^(!?)flag:(\w+)$/.exec(c), st = /^stat:(\w+)>=(\d+)$/.exec(c); if (m && !m[1] && FL[m[2]]) Object.assign(o, FL[m[2]]); else if (st && st[1] === 'looks') o.minLooks = +st[2]; else if (st && st[1] === 'fame') o.minFame = +st[2]; else dropped.add(c); } return o; };
const fx = (d = {}) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k === 'happiness' ? 'happy' : k, v]));
const stage = (e) => (e.age_max <= 5 ? 'childhood' : e.age_max <= 17 ? 'school' : e.age_min >= 60 ? 'late' : e.age_min >= 30 ? 'adult' : 'young_adult');
const events = raw.map((e) => ({ id: e.id, cat: stage(e), ages: [e.age_min, e.age_max], w: 1, title: e.title, prompt: e.prompt, once: !!e.once_per_life, ...(targets.has(e.id) ? { chainOnly: true } : {}), ...(Object.keys(cond(e.conditions)).length ? { if: cond(e.conditions) } : {}),
  choices: e.options.map((o) => ({ label: o.tagline, journal: [o.outcome], ...(Object.keys(o.deltas || {}).length ? { fx: fx(o.deltas) } : {}), ...(o.follow_up ? { chain: { id: o.follow_up, in: [0, 1] } } : {}) })) }));
fs.writeFileSync(out + 'events.json', JSON.stringify(events, null, 1));
fs.writeFileSync(out + 'manifest.json', JSON.stringify({ version: 1, complete, source: src, files: { events: 'events.json' } }, null, 1));
console.log(`${events.length} events -> data/text/ (complete=${complete}); dropped conditions: ${[...dropped].join(', ') || 'none'}`);
