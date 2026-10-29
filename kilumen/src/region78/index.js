// Regions 7-8 (Lanternport, Cindervale) runtime wiring, dev/regions-5-8, Oct 29 2026. Plan: design/REGIONS_78_PLAN.md.
// Maps, halls, Masters (Delphine Orrin coin 7, Brannock Fell coin 8), wild tables and road trainers already come from
// World Design's maps + data/masters.json + data/encounters_wired.json. This module adds only what those don't cover:
// - Ron page hand-off at Lanternport (story_beats.md R6 §8 / G3: "the page he'll share at Lanternport"; the flies line moves
//   here; story_beats.md §L rev 2). Talk only, no battle. Checked on every Lanternport entry, plays once, gated on the
//   Tidewater coin; may fire before or after the Lanternport hall, so the bin line reads the live coin count (6 or 7 bags).
//   Sets ron_page_shared + read_log_lanternport, gives the key item Field Reading Sheet (item_field_reading_sheet).
//   Ron order: Ron 5 Tidewater (optional) -> this hand-off -> Cindervale -> Ron 6 Aurelith -> Ron 7 Stadium roof (final).
//   The old optional Lanternport Ron 5 catch-up is removed.
// - Lanternport access: R78.lanternportGate (single config flag). Gary 3:51 PM CT: OPEN before the Tidewater coin (null).
// - Promotions ID 18 / 20 (promoted_id18 / promoted_id20) unlock the R7 / R8 key card nodes (data/rt_benefits.json).
// - ID cap flags id_cap_r7 / id_cap_r8 for RITA when company XP sits at the region cap.
// Text: system_story_r78.* (Text Bot owns text/*.py; keys listed in data/textbot_requests_r78.md). Placeholders below.

export const R78 = {
  pageMap: 'lanternport', pageFlag: 'ron_page_shared', pageItemFlag: 'has_log_page', pageReadFlag: 'read_log_lanternport',
  pageItem: 'field_reading_sheet', pageItemKeyFlag: 'item_field_reading_sheet',
  lanternportGate: null, // flag needed to walk into Lanternport (e.g. 'beat_master_tidewater'); null = open (Gary 3:51 PM CT)
  masters: { 7: 'beat_master_lanternport', 8: 'beat_master_cindervale' },
  opens: { 7: 'beat_master_tidewater', 8: 'beat_master_lanternport' },
  caps: { 7: 18, 8: 20 },
  flags: ['ron_page_shared', 'has_log_page', 'read_log_lanternport', 'item_field_reading_sheet', 'promoted_id18', 'promoted_id20', 'rt_keycard_r7', 'rt_keycard_r8', 'id_cap_r7', 'id_cap_r8'],
};

// §L text: Text Bot keys ron.lanternport.* + lore.lanternport.page (DRAFT, Oct 29 3:56 PM CT); placeholders removed.
export const COIN_FLAGS = ['fernwick', 'saltmere', 'revival', 'frostspire', 'mirefen', 'tidewater', 'lanternport', 'cindervale'].map((z) => `beat_master_${z}`);
export const coinCount = (flags) => COIN_FLAGS.filter((f) => flags.has(f)).length;
/** Pure: the §L bin line key for the coin count when the scene fires (6 or 7; 8+ never happens before Cindervale, clamp). */
export const binsKey = (coins) => `ron.lanternport.bins${coins >= 7 ? 7 : 6}_flies`;
/** Pure: the §L scene key order for this coin count. */
export const pageScript = (coins) => ['ron.lanternport.greet', binsKey(coins), 'ron.lanternport.page_offer', 'lore.lanternport.page',
  'ron.lanternport.page_why', 'ron.lanternport.page_give', 'ron.lanternport.leave', 'ron.lanternport.ron6_plant'];
/** Pure: is a walk into `to` blocked by R78.lanternportGate? */
export const lanternportBlocked = (to, flags, gate = R78.lanternportGate) => to === R78.pageMap && !!gate && !flags.has(gate);

/** Pure: should the Lanternport page hand-off fire? flags: Set-like {has}. */
export const pageDue = (flags, mapName) => mapName === R78.pageMap && flags.has(R78.opens[7]) && !flags.has(R78.pageFlag);
/** Pure: ID cap flag for regions 7 / 8. */
export function idCapFlag78(idLevel, caps = R78.caps) {
  for (const [r, cap] of Object.entries(caps)) if (idLevel === cap) return `id_cap_r${r}`;
  return null;
}
/** Pure: promotion flags earned now. */
export function promotions78(flags, lvl) {
  const out = [];
  if (flags.has(R78.masters[7]) && (lvl ?? 0) >= 18) out.push('promoted_id18');
  if (flags.has(R78.masters[8]) && (lvl ?? 0) >= 20) out.push('promoted_id20');
  return out;
}

const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);

export function attachRegion78(scene, { systems } = {}) {
  const sys = () => systems || scene.systems;
  const flags = scene.flags, has = (f) => flags.has(f);
  const set = (f) => { if (!flags.has(f)) (scene.setFlag ? scene.setFlag(f, true) : flags.add(f)); };
  const vars = () => scene.textVars?.() || {};
  const fill = (s) => String(s).replace(/\{(\w+)\}/g, (m, k) => (vars()[k] ?? m));
  const look = (k) => { const v = getPath(scene.lines, k); const p = Array.isArray(v) ? v : v?.pages; return p?.length ? p : null; };
  const pages = (k) => (look(k) || []).map(fill);
  const say = (k, sp) => (pages(k).length && scene.say ? scene.say(pages(k), sp) : Promise.resolve());

  async function pageHandoff() {
    set(R78.pageFlag); // first: a reload mid-scene never repeats it
    for (const k of pageScript(coinCount({ has }))) await say(k, k.startsWith('lore.') ? undefined : { name: 'Ron' });
    if (!sys()?.bag?.has?.(R78.pageItem)) sys()?.bag?.add?.(R78.pageItem, 1);
    set(R78.pageItemKeyFlag); set(R78.pageReadFlag); set(R78.pageItemFlag);
  }

  function tick() {
    // never during battle / cutscene: scene.busy covers dialog + scripts, ui battle sets scene.paused
    if (!scene.busy && !scene.paused && !scene.fade && !scene._r78Page && pageDue({ has }, scene.map?.name)) {
      scene._r78Page = true;
      scene.script?.(async () => { try { await pageHandoff(); } finally { scene._r78Page = false; } });
    }
    const lvl = sys()?.rtBenefits?.idLevel?.() ?? sys()?.rtBenefits?.company?.idLevel;
    const cap = Number.isFinite(lvl) ? idCapFlag78(lvl) : null;
    if (cap) set(cap);
    for (const f of promotions78({ has }, lvl)) set(f);
  }

  const cv = typeof window !== 'undefined' ? window.kilumen?.companyVoice : scene.companyVoice;
  if (cv && (cv.maxRegion ?? 0) < 8) cv.maxRegion = 8;
  const iv = typeof setInterval !== 'undefined' && typeof window !== 'undefined' ? setInterval(() => { try { tick(); } catch (e) { console.error('region78 tick:', e); } }, 1000) : null;
  const api = { tick, pageHandoff, edgeBlocked: (exit) => lanternportBlocked(exit?.to, { has }), stop: () => iv && clearInterval(iv) };
  scene.region78 = api;
  return api;
}
