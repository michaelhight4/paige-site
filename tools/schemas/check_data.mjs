// Kilumen data-table checks (Ajv 8, MIT; dev-only). Added Oct 23, 2026 (free tools pass).
// Validates the JSON tables against tools/schemas/*.schema.json, plus a few cross-checks JSON Schema can't express
// (level ranges lo <= hi, unique ids, species that have art). Used by tests/data_schemas.test.mjs (npm test).
// CLI: node tools/schemas/check_data.mjs [--strict]   (prints every problem; exit 1 only with --strict)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, '..', '..');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** Files to check. `core: true` = shipped/built data that must stay clean (npm test fails); drafts are warn-only. */
export function dataTargets(root = ROOT) {
  const gd = join(root, 'design/overnight_gd');
  const list = [
    { file: 'data/quests.json', schema: 'kilumen:quests', core: true },
    { file: 'data/masters.json', schema: 'kilumen:masters', core: true },
    { file: 'art/world/overworld/encounters/encounters.json', schema: 'kilumen:encounters', core: true },
  ];
  if (existsSync(gd)) for (const f of readdirSync(gd).sort()) {
    if (/^encounters_.*\.json$/.test(f)) list.push({ file: `design/overnight_gd/${f}`, schema: 'kilumen:encounters', core: false });
    if (/^trainers_.*\.json$/.test(f)) list.push({ file: `design/overnight_gd/${f}`, schema: 'kilumen:trainers', core: false });
  }
  return list.filter((t) => existsSync(join(root, t.file)));
}

export function makeAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, allowUnionTypes: true });
  for (const f of readdirSync(HERE).filter((n) => n.endsWith('.schema.json')).sort()) ajv.addSchema(readJson(join(HERE, f)));
  return ajv;
}

function semantic(target, data, artSpecies) {
  const out = [];
  const range = (where, r) => { if (Array.isArray(r) && r[0] > r[1]) out.push(`${where}: level range [${r}] has lo > hi`); };
  const zones = (z) => (Array.isArray(z) ? z.map((v, i) => [v.id ?? i, v]) : Object.entries(z || {}));
  if (target.schema === 'kilumen:encounters') {
    for (const [zid, zone] of zones(data.zones)) (zone.slots || []).forEach((s, i) => {
      range(`zones.${zid}.slots[${i}]`, s.level);
      if (target.core && artSpecies && !artSpecies.has(s.species)) out.push(`zones.${zid}.slots[${i}]: species "${s.species}" is not in species_with_art`);
    });
  }
  if (target.schema === 'kilumen:quests') {
    const ids = new Set(), stepIds = new Set();
    for (const q of data.quests || []) {
      if (ids.has(q.id)) out.push(`quest id "${q.id}" is duplicated`); ids.add(q.id);
      for (const s of q.steps || []) { if (stepIds.has(s.id)) out.push(`step id "${s.id}" is duplicated`); stepIds.add(s.id); }
    }
  }
  if (target.schema === 'kilumen:masters') {
    const coins = new Set();
    for (const h of data.halls || []) {
      if (coins.has(h.coin_number)) out.push(`halls: coin_number ${h.coin_number} is duplicated`); coins.add(h.coin_number);
      for (const m of [h.master?.team, ...(h.trainers || []).map((t) => t.team)].flat().filter(Boolean)) {
        if (artSpecies && m.battle_species && !artSpecies.has(m.battle_species)) out.push(`halls.${h.zone}: battle_species "${m.battle_species}" has no art`);
      }
    }
  }
  if (target.schema === 'kilumen:trainers') {
    const ids = new Set();
    for (const t of data.trainers || []) { if (ids.has(t.id)) out.push(`trainer id "${t.id}" is duplicated`); ids.add(t.id); }
  }
  return out;
}

/** Run every check. Returns [{file, core, problems: string[]}]. */
export function checkAll(root = ROOT) {
  const ajv = makeAjv();
  const encPath = join(root, 'art/world/overworld/encounters/encounters.json');
  const artSpecies = existsSync(encPath) ? new Set(readJson(encPath).species_with_art || []) : null;
  // creature sync (Oct 23, 2026): species wired by tools/sync_creatures.mjs (finished sprite sets) also count as having art
  const syncPath = join(root, 'data/creatures_synced.json');
  if (artSpecies && existsSync(syncPath)) for (const s of readJson(syncPath).species || []) artSpecies.add(s.id);
  return dataTargets(root).map((t) => {
    let data;
    try { data = readJson(join(root, t.file)); } catch (e) { return { ...t, problems: [`JSON parse: ${e.message}`] }; }
    const validate = ajv.getSchema(t.schema);
    const problems = validate(data) ? [] : validate.errors.filter((e) => e.keyword !== 'if').map((e) => `${e.instancePath || '/'} ${e.message}${e.params?.allowedValues ? ` (${e.params.allowedValues.join('|')})` : ''}`);
    return { ...t, problems: [...problems, ...semantic(t, data, artSpecies)] };
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const strict = process.argv.includes('--strict');
  const res = checkAll();
  let n = 0;
  for (const r of res) {
    n += r.problems.length;
    console.log(`${r.problems.length ? 'WARN' : 'ok  '} ${r.core ? '[core] ' : '[draft]'} ${r.file}${r.problems.length ? ` (${r.problems.length})` : ''}`);
    for (const p of r.problems) console.log(`       ${p}`);
  }
  console.log(`${res.length} files, ${n} problems (${relative(process.cwd(), HERE) || '.'}/*.schema.json)`);
  if (strict && n) process.exit(1);
}
