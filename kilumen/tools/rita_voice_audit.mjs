// RITA voice audit (Oct 31 2026; Gary 1:47 AM CT: "rita's voice needs to be finished and tested").
// Lists every string CompanyVoice can display (system_company_voice keys within cfg.maxRegion, the code-default
// Trainer 1 intro, every slot value the game can put in them: area signs, masters, Ron, quest titles, evolutions,
// Kilindex counts, ID levels, RT Benefits nodes/ranks, crystal resupply count) and checks each page has a voice plan
// in the built manifest (core + region parts), exactly as src/systems/rita_voice.js resolves it.
// Usage: node tools/rita_voice_audit.mjs [--json out.json] [--names]   (--names = slot values needing a clip, for the scope)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { CompanyVoice, FALLBACK, TRAINER1_INTRO, TRAINER1_LINE } from '../src/systems/company_voice.js';
import { planFor } from '../src/systems/rita_voice.js';
import { areaName, signable } from '../src/overworld/area_sign.js';
import { buildCreatures } from '../src/battle/data/creatures.js';
import { evoTable } from '../src/systems/evolution.js';

const R = (p) => new URL('../' + p, import.meta.url);
const J = (p) => JSON.parse(readFileSync(R(p)));
const cap = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const norm = (s) => String(s).replace(/\s+/g, ' ').trim().toLowerCase();

export function loadManifest() {
  const m = J('assets/audio/rita/manifest.json');
  for (const f of Object.values(m.parts || {})) {
    const p = J('assets/audio/rita/' + f);
    Object.assign(m.lines, p.lines); Object.assign(m.clips, p.clips); Object.assign(m.numbers ||= {}, p.numbers);
    for (const [sl, d] of Object.entries(p.names || {})) Object.assign((m.names ||= {})[sl] ||= {}, d);
  }
  return m;
}

/** Every value each slot can take in a normal game (all regions). */
export function slotValues() {
  const lines = J('text/overworld_lines.json'), cfg = J('data/company_voice.json'), rt = J('data/rt_benefits.json');
  const text = (k) => { const v = k.split('.').reduce((o, x) => (o == null ? o : o[x]), lines); return typeof v === 'string' ? v : null; };
  const areas = new Map(); // map -> title
  for (const f of readdirSync(R('art/world/overworld/maps'))) {
    if (!f.endsWith('.json')) continue;
    const name = f.slice(0, -5); let json; try { json = J('art/world/overworld/maps/' + f); } catch { continue; }
    const map = { name, json, title: json.title };
    if (!signable(map)) continue;
    const t = areaName(map, text).title; if (t) areas.set(name, t);
  }
  const masters = J('data/masters.json').halls.map((h) => h.flag.replace(/^beat_master_/, ''));
  for (const f of Object.values(rt.regionFlags || {})) if (typeof f === 'string' && f.startsWith('beat_master_')) masters.push(f.slice(12));
  const quests = J('data/quests.json'); const qs = (quests.quests || quests);
  const ev = cfg.events, qIds = Object.values(ev.quest_done.keys_by_region || {}).flat();
  const qTitle = Object.fromEntries(qs.map((q) => [q.id, q.title || cap(q.id)]));
  const evo = evoTable(buildCreatures()); const evos = Object.entries(evo).map(([from, e]) => [cap(from), cap(e.to)]);
  const maxLv = Math.max(...Object.values(rt.regions).map((r) => r.maxIdLevel || 0));
  const nodes = rt.nodes.map((n) => [n.id, n.ranks?.length || 1]);
  return { areas, masters: [...new Set(masters)], quests: qIds.map((id) => [id, qTitle[id] || cap(id)]), evos,
    counts: ev.kilindex_milestone.counts, newCounts: [ev.kilindex_new.min_count, ev.kilindex_new.max_count], levels: Array.from({ length: maxLv - 1 }, (_, i) => i + 2), nodes, resupply: [5] };
}

/** -> {rows: [{event, ctx, key, page, text, ok, why}], ...} for every displayable page (all variants). */
export function audit({ maxRegion } = {}) {
  const lines = J('text/overworld_lines.json'), cfg = J('data/company_voice.json'), M = loadManifest(), V = slotValues();
  const L = lines.system_company_voice, mr = maxRegion ?? cfg.maxRegion;
  const scene = { flags: new Set(), seen: {}, log: [], lines, textVars: () => ({}) };
  const cv = new CompanyVoice(scene, { ...cfg, maxRegion: mr }, { storage: null, now: () => 0, rng: () => 0 });
  const allVariants = (name, ctx) => { // every variant key pages() could pick for this event+ctx
    const out = new Map();
    for (let i = 0; i < 12; i++) { cv.rng = () => (i % 12) / 12; scene.seen = {}; const pg = cv.pages(name, ctx); const p = cv.lastPick; out.set(p.key ?? '(fallback)', { pick: p, shown: pg }); }
    // deterministic sweep: force every variant through the seen 'last' rule
    for (let n = 1; n <= 12; n++) { scene.seen = {}; cv.rng = () => 0.999; const pg = cv.pages(name, ctx); out.set(cv.lastPick.key ?? '(fallback)', { pick: cv.lastPick, shown: pg }); }
    return out;
  };
  // exhaustive variant list: walk the keys directly as pickVariant would (base + _N within maxRegion)
  const variantsOf = (base, exclude = []) => Object.keys(L).filter((k) => (k === base || (k.startsWith(base + '_') && /^\d+$/.test(k.slice(base.length + 1)) && Number(k.slice(base.length + 1)) >= 2 && !exclude.includes(Number(k.slice(base.length + 1)))))
    && CompanyVoice.lineRegion(L[k]) <= mr && (L[k]?.pages || L[k])?.length);
  const ctxs = [];
  const E = cfg.events;
  for (const name of Object.keys(E)) {
    const ev = E[name];
    if (name === 'rita_install') continue;
    if (name === 'area_new') for (const [map, area] of V.areas) ctxs.push([name, { key: map, area }]);
    else if (name === 'master_beaten') for (const m of V.masters) ctxs.push([name, { key: m, master: cap(m) }]);
    else if (name === 'rival_beaten') for (let n = 1; n <= 8; n++) ctxs.push([name, { key: String(n), trainer: 'Ron' }]);
    else if (name === 'quest_done') for (const [id, quest] of V.quests) ctxs.push([name, { key: id, quest }]);
    else if (name === 'first_evolution') for (const [c, n] of V.evos) ctxs.push([name, { creature: c, new: n }]);
    else if (name === 'kilindex_milestone') for (const c of cv.milestoneCounts()) ctxs.push([name, { key: c, count: c }]);
    else if (name === 'kilindex_new') for (let c = V.newCounts[0]; c <= V.newCounts[1]; c++) ctxs.push([name, { key: c, count: c }]);
    else if (name === 'id_level_up') for (const lv of V.levels) ctxs.push([name, { key: lv, level: lv }]);
    else if (name === 'board_node') for (const [id, n] of V.nodes) for (let r = 1; r <= n; r++) ctxs.push([name, { key: `${id}#${r}`, node: cap(id), rank: r }]);
    else if (name === 'crystal_resupply') for (const c of V.resupply) ctxs.push([name, { count: c }]);
    else if (ev.on_flag) { if ((ev.region ?? 0) <= mr) ctxs.push([name, { key: ev.on_flag_key?.[ev.on_flag] }]); }
    else ctxs.push([name, {}]);
  }
  const rows = [];
  const check = (event, ctx, key, raw, vars, idLabel) => {
    raw.slice(0, cfg.timing.max_pages).forEach((src, page) => {
      const pick = { key, raw: raw.slice(0, cfg.timing.max_pages), vars };
      const plan = key ? planFor(M, { voice: pick, page }) : null;
      const shown = String(src).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
      let why = null;
      if (!key) why = 'fallback text (no line key)';
      else if (!M.lines[key]) why = 'line not in manifest';
      else if (M.lines[key].pages[page]?.src !== src) why = 'manifest src differs from text (stale)';
      else if (!plan) why = 'slot value has no clip: ' + JSON.stringify(Object.fromEntries(Object.entries(vars).filter(([k]) => src.includes('{' + k + '}') && k !== 'employee_id')));
      rows.push({ event, key, page, src, shown, idLabel, ok: !!plan, why, stems: plan?.stems || [] });
    });
  };
  for (const [name, ctx] of ctxs) {
    const ev = E[name], base = ev.line || name, keys = [];
    if (ev.per_count_lines && ctx.count != null) keys.push(`${base}_${ctx.count}`);
    if (ev.specific && ctx.key != null && ctx.key !== '') keys.push(`${base}_${typeof ev.specific === 'string' ? ev.specific : ''}${ctx.key}`);
    keys.push(base);
    let found = null;
    for (const k of keys) { const vs = variantsOf(k, k === base && ev.per_count_lines ? ev.counts : []); if (vs.length) { found = vs; break; } }
    for (const idLabel of ['Trainer 1', '001893']) {
      const vars = { employee_id: idLabel, ...ctx };
      if (!found) check(name, ctx, null, FALLBACK[base] || ['{employee_id}: noted.'], vars, idLabel);
      else for (const k of found) check(name, ctx, k, L[k].pages || L[k], vars, idLabel);
    }
  }
  // Trainer 1 intro (code default, played before RITA's very first strip, 6-digit number)
  check('rita_trainer1', {}, TRAINER1_LINE, L[TRAINER1_LINE]?.pages || TRAINER1_INTRO, { employee_id: '001893' }, '001893');
  return { rows, manifest: M, values: V, maxRegion: mr };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = audit(); const rows = a.rows;
  const uniq = new Map(); for (const r of rows) uniq.set(r.key + '|' + r.page + '|' + r.shown, r);
  const bad = [...uniq.values()].filter((r) => !r.ok);
  const keys = new Set(rows.filter((r) => r.key).map((r) => r.key));
  console.log(`maxRegion ${a.maxRegion}: ${keys.size} line keys, ${uniq.size} distinct displayable pages (2 id forms), ${bad.length} without voice`);
  const by = {}; for (const r of bad) (by[r.why.split(':')[0]] ||= []).push(r);
  for (const [w, rs] of Object.entries(by)) { console.log(`\n## ${w}: ${rs.length}`); for (const r of rs.slice(0, 400)) console.log(`  ${r.key} p${r.page}: ${r.shown.replace(/\n/g, ' ')}  ${r.why.includes(':') ? r.why.split(': ')[1] : ''}`); }
  const i = process.argv.indexOf('--json'); if (i > 0) writeFileSync(process.argv[i + 1], JSON.stringify({ maxRegion: a.maxRegion, rows }, null, 1));
  if (process.argv.includes('--names')) {
    const need = {}; for (const r of bad) { if (!r.why.startsWith('slot')) continue; const o = JSON.parse(r.why.slice(r.why.indexOf('{'))); for (const [k, v] of Object.entries(o)) (need[k] ||= new Set()).add(String(v)); }
    console.log('\nNEED', JSON.stringify(Object.fromEntries(Object.entries(need).map(([k, s]) => [k, [...s].sort()]))));
  }
  process.exitCode = bad.length ? 1 : 0;
}
