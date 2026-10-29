// Habitat filter for the encounter JSONs (Gary, Oct 29 2026): surf tables = water types only, cave tables = cave dwellers
// only. Same rule as the runtime (src/battle/encounters.js habitatOk). Usage: node tools/encounters/habitat_filter.mjs [--check]
// Writes data/encounters_wired.json + art/world/overworld/encounters/encounters.json; exits 1 on --check if anything would
// be removed, or if any surf/cave table would be left empty.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { habitatOk, isSurf, isCave } = await import(path.join(root, 'src/battle/encounters.js'));
const { speciesById } = await import(path.join(root, 'src/ui/data.js'));
export const FILES = ['data/encounters_wired.json', 'art/world/overworld/encounters/encounters.json'];
const check = process.argv.includes('--check');
let bad = 0;
for (const rel of FILES) {
  const f = path.join(root, rel), txt = fs.readFileSync(f, 'utf8'), d = JSON.parse(txt);
  const ind = (txt.match(/\n( +)"/) || [, ' '])[1].length;
  for (const [zid, z] of Object.entries(d.zones || {})) {
    if (!isSurf(z.method) && !isCave(z.method)) continue;
    const keep = (z.slots || []).filter((s) => habitatOk(z.method, s.species, (id) => speciesById(id).el, (id) => speciesById(id).found));
    const gone = (z.slots || []).filter((s) => !keep.includes(s));
    if (!keep.length) { console.log(`EMPTY ${rel} ${zid}`); bad++; continue; }
    if (gone.length) { console.log(`${rel} ${zid} (${z.method}): -${gone.map((s) => s.species).join(', -')}`); bad++; if (!check) z.slots = keep; }
  }
  if (!check) fs.writeFileSync(f, JSON.stringify(d, null, ind) + (txt.endsWith('\n') ? '\n' : ''));
}
if (check && bad) process.exit(1);
console.log(check ? 'habitat check: ok' : 'habitat filter: written');
