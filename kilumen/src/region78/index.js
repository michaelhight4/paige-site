// Regions 7-8 (Lanternport, Cindervale) runtime wiring, dev/regions-5-8, Oct 29 2026. Plan: design/REGIONS_78_PLAN.md.
// Maps, halls, Masters (Delphine Orrin coin 7, Brannock Fell coin 8), wild tables and road trainers already come from
// World Design's maps + data/masters.json + data/encounters_wired.json. This module adds only what those don't cover:
// - Ron page hand-off at Lanternport (story_beats.md R6 §8 / G3: "the page he'll share at Lanternport"; the flies line moves
//   here). Fires once on entering Lanternport after beat_master_tidewater. Sets ron_page_shared (+ has_log_page).
//   Ron 6 (the rival battle) stays the final Ron at Aurelith (ron_whereabouts punch list); lanternport_ron_5 stays the
//   optional Ron 5 catch-up for players who declined / missed him at Tidewater (src/battle/story.js).
// - Promotions ID 18 / 20 (promoted_id18 / promoted_id20) unlock the R7 / R8 key card nodes (data/rt_benefits.json).
// - ID cap flags id_cap_r7 / id_cap_r8 for RITA when company XP sits at the region cap.
// Text: system_story_r78.* (Text Bot owns text/*.py; keys listed in data/textbot_requests_r78.md). Placeholders below.

export const R78 = {
  pageMap: 'lanternport', pageFlag: 'ron_page_shared', pageItemFlag: 'has_log_page',
  masters: { 7: 'beat_master_lanternport', 8: 'beat_master_cindervale' },
  opens: { 7: 'beat_master_tidewater', 8: 'beat_master_lanternport' },
  caps: { 7: 18, 8: 20 },
  flags: ['ron_page_shared', 'has_log_page', 'promoted_id18', 'promoted_id20', 'rt_keycard_r7', 'rt_keycard_r8', 'id_cap_r7', 'id_cap_r8'],
};

export const PLACEHOLDER = {
  r7_ron_page_handoff: ['[PLACEHOLDER r7_ron_page_handoff] Ron pats his coat pocket. "Okay. It\'s not raining. Here."', '[PLACEHOLDER] He hands over a folded log page.'],
  r7_ron_flies: ['[PLACEHOLDER r7_ron_flies] "The flies have names now."'],
};

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
  const pages = (k) => { const v = getPath(scene.lines, `system_story_r78.${k}`); const p = Array.isArray(v) ? v : v?.pages; return (p?.length ? p : PLACEHOLDER[k] || []).map(fill); };
  const say = (k, sp) => (pages(k).length && scene.say ? scene.say(pages(k), sp) : Promise.resolve());

  async function pageHandoff() {
    set(R78.pageFlag); // first: a reload mid-scene never repeats it
    await say('r7_ron_page_handoff', { name: 'Ron' });
    await say('r7_ron_flies', { name: 'Ron' });
    set(R78.pageItemFlag);
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
  const api = { tick, pageHandoff, stop: () => iv && clearInterval(iv) };
  scene.region78 = api;
  return api;
}
