// Progression data build (overnight Masters / halls / quests pass, Oct 23, 2026). Run: node tools/build_progression_data.mjs
// Reads the DRAFT design data and writes:
//   data/masters.json  <- design/overnight_gd/halls/*.json (Game dev DRAFT; all 8 Masters + hall trainers)
//   data/quests.json   <- design/overnight_quests/quests_draft.json (Story Bot, 50 quests, SCHEMA.md)
// Nothing here is signed off by Gary. Gift item ids, prize money and coin names are PROPOSALS (marked placeholder).
// Battle stand-ins: the battle engine only knows the species in src/ui/data.js SPECIES; any team species it does not know
// is fought as a PLACEHOLDER stand-in of the same element (DEX_450 types), at the drafted level. Re-run when SPECIES grows.
import { readFileSync, writeFileSync } from 'node:fs';
import { SPECIES } from '../src/ui/data.js';

const ROOT = new URL('../', import.meta.url);
const rd = (p) => JSON.parse(readFileSync(new URL(p, ROOT)));
export const HALL_ORDER = ['fernwick', 'saltmere', 'revival_heights', 'frostspire', 'mirefen', 'tidewater_coast', 'lanternport', 'cindervale'];
// Parent / Story Bot rulings (Oct 23, 00:31 CT): Lanternport Master display name is Story Bot's Delphine Orrin (never Vane);
// Lanternport hall trainers get neutral ids, display names TODO (the drafted names clashed with the missing field team).
// Names/ids are read as-is from Game dev's halls/*.json (Lanternport: Delphine Orrin; TBD_NAME_1..4 trainers fixed upstream).
// The live Fernwick hall map uses these npc ids (art/world/overworld/maps/fernwick_hall_int.json).
const LIVE_IDS = { fernwick: { master: 'master_fernwick', trainers: ['helper_1', 'helper_2'] } };

const dex = Object.fromEntries(rd('design/DEX_450.json').creatures.map((c) => [c.id, c]));
const engine = SPECIES.map((s) => ({ id: s.id, el: s.el, stage: s.line ? SPECIES.filter((x) => x.line === s.line).indexOf(s) : 0 }));
const engineIds = new Set(engine.map((s) => s.id));

/** Engine species to fight for a drafted species: itself if known, else the best element match (stage by level). */
export function standIn(species, level, fallbackEl = []) {
  if (engineIds.has(species)) return species;
  const types = dex[species]?.types || fallbackEl;
  const want = level >= 32 ? 2 : level >= 16 ? 1 : 0;
  let best = null, bs = -1;
  for (const e of engine) {
    const s = e.el.filter((t) => types.includes(t)).length * 10 - Math.abs(e.stage - want);
    if (s > bs) { bs = s; best = e.id; }
  }
  return best;
}
const elOf = (m) => (m.element || '').replace(/\(.*\)/, '').split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean);
const team = (t, el) => t.map((c) => ({ species: c.species, level: c.level, battle_species: standIn(c.species, c.level, el), stand_in: !engineIds.has(c.species) }));

function buildMasters() {
  const out = { _meta: { status: 'DRAFT (Game dev overnight_gd, not signed off by Gary)', built: new Date().toISOString(), source: 'design/overnight_gd/halls/*.json',
    placeholders: 'gift item ids, money, coin names and Master names are proposals; battle_species are PLACEHOLDER stand-ins for species the battle engine does not have yet' }, halls: [] };
  for (const zone of HALL_ORDER) {
    const h = rd(`design/overnight_gd/halls/${zone}.json`), m = h.master, el = elOf(m);
    const live = LIVE_IDS[zone];
    out.halls.push({
      zone, coin_number: h.coin_number, flag: h.flag, hall_map: String(h.hall_map || '').split(' ')[0], map_built: /\(built\)/.test(h.hall_map || ''),
      master: { id: live?.master || m.id, name_placeholder: m.name_suggestion, element: el, class: 'master', base: m.base, prize_placeholder: m.prize,
        team: team(m.team, el), ace_level: h.ace_level },
      trainers: h.hall_trainers.map((t, i) => ({ id: live?.trainers?.[i] || t.id, gd_id: t.id,
        name_placeholder: t.name_suggestion, class: t.class, base: t.base, prize_placeholder: t.prize, team: team(t.team, []) })),
      reward: { coin_name_placeholder: h.reward.coin, money_placeholder: h.reward.money, gift_item_placeholder: h.reward.gift_item || null, opens: h.reward.opens || null },
      puzzle: { name: h.puzzle.name_suggestion || 'Fernwick plates and crystals', runtime: zone === 'fernwick' ? 'art/world/overworld/puzzles/fernwick_hall_int.runtime.json' : `data/hall_puzzles/${zone}.json` },
    });
  }
  return out;
}

const LINE_CONTEXTS = new Set(['start', 'in_progress', 'turn_in', 'step', 'after']);
function buildQuests() {
  const d = rd('design/overnight_quests/quests_draft.json');
  const quests = d.quests.map((q) => {
    const g = q.giver || {}, kind = /^(prop|sign):/.test(g.npc || '') || g.npc === 'system' || !g.npc ? 'auto' : 'npc';
    const type = q.type || (q.id.startsWith('sq_') ? 'side' : 'main');
    return {
      id: q.id, title: q.title, type, zone: q.zone, order: q.order, map_status: q.map_status,
      giver: { npc: g.npc || null, map: g.map || null },
      // main quests start themselves once the prerequisites are met; side quests from an NPC start when you talk to them
      start: type === 'main' || kind === 'auto' ? 'auto' : 'npc',
      // side quests with an NPC giver are handed back to that NPC: the LAST step is the turn-in step
      turn_in: type === 'side' && kind === 'npc' ? 'npc' : 'auto',
      prerequisites: q.prerequisites || [],
      steps: q.steps.map((s) => ({ id: s.id, desc: s.desc, map: s.map || null, at: s.at || null, flag: s.sets_flag || null, condition: s.condition || null, optional: /^optional\b/i.test(s.desc || '') })),
      reward: { items_placeholder: q.reward?.items || [], money_placeholder: q.reward?.money || 0, flags: q.reward?.flags || [] },
      lines: (q.lines || []).filter((l) => LINE_CONTEXTS.has(l.context)).map((l) => ({ npc: l.npc, context: l.context, step: l.step || null, text: l.text })),
      new_ids: q.new_ids || [], status: 'DRAFT',
    };
  }).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return { _meta: { status: 'DRAFT (Story Bot overnight_quests, not signed off by Gary)', built: new Date().toISOString(), source: 'design/overnight_quests/quests_draft.json', schema: 'design/overnight_quests/SCHEMA.md',
    placeholders: 'reward item ids and money are proposals; quest text is Story Bot draft text', counts: { main: quests.filter((q) => q.type === 'main').length, side: quests.filter((q) => q.type === 'side').length } }, quests };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = buildMasters(), q = buildQuests();
  writeFileSync(new URL('data/masters.json', ROOT), JSON.stringify(m, null, 1) + '\n');
  writeFileSync(new URL('data/quests.json', ROOT), JSON.stringify(q, null, 1) + '\n');
  console.log(`masters: ${m.halls.length} halls, ${m.halls.reduce((a, h) => a + h.trainers.length, 0)} hall trainers; quests: ${q.quests.length}`, q._meta.counts);
  for (const h of m.halls) console.log(h.zone, h.master.name_placeholder, h.master.team.map((t) => `${t.species}${t.stand_in ? '->' + t.battle_species : ''} ${t.level}`).join(', '));
}
