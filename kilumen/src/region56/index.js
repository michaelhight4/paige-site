// Regions 5-6 (Mirefen, Tidewater) runtime wiring, dev/r56-wiring, Oct 29 2026. Ships with BOTH regions (never alone).
// Spec: design/regions56/story_beats.md (Text Bot keys: system_story_r56.gNN_*, system_company_voice, system_research).
// - Ron 5 (Tidewater sea wall) is OPTIONAL: Battle / Not now. Win, loss or decline all give Ron's Umbrella, set
//   met_ron_tidewater and open sq_ron_umbrella ("Inside Out"). The ID 16 promotion never needs the fight.
//   Rematch (g21_ron_rematch) and the after-fight line (g21_ron_town) are valid until beat_master_tidewater. If the
//   player beats the Tidewater Master without ever fighting Ron 5: ron5_missed + g21_ron_missed_parting (harbour slip).
// - Promotions ID 14 / 16 set promoted_id14 / promoted_id16 (Benefits key-card nodes need them).
// - ID cap flags id_cap_r5 / id_cap_r6 for RITA when company XP sits at the region cap.
// Maps tidewater_coast / mirefen are built (World Design); attached by default since dev/regions-5-8.
// Warmth gates (story_beats.md) are NOT wired: the builder has no Warmth condition yet (see WARMTH_GATES).
import { oldGusHook } from './tutor.js?v=v0.2.97-alpha';
import { LOW_TIDE, boatLeaveDue, syncLowTide } from '../progression/low_tide.js?v=v0.2.97-alpha';

export const R56 = {
  ronMap: 'tidewater_coast', slipMap: 'tidewater_coast',
  ronIds: ['tidewater_coast_ron_5', 'tidewater_coast_ron_5_slip'],
  master: 'beat_master_tidewater',
  flags: ['ron5_declined', 'met_ron_tidewater', 'sq_rested_done', 'promoted_id14', 'promoted_id16', 'rt_keycard_r5', 'rt_keycard_r6', 'found_station_r5', 'ron5_missed'],
  umbrellaItem: 'rons_umbrella', umbrellaQuest: 'sq_ron_umbrella',
};

/** Notes only (Gary / Game dev): Warmth gates in story_beats.md that need a builder Warmth condition. */
export const WARMTH_GATES = [
  { at: 'R5 leaving', min: 50, what: 'notebook nudge' },
  { at: 'Hatch', min: 30, what: 'creature follows' },
  { at: 'Exit glint', min: 70, what: 'glint line (g11_warm_glint)' },
  { at: 'Wenna', min: 60, what: 'extra line (g14_wenna_warmth)' },
  { at: 'Islet stone', min: 50, what: 'stone scene' },
  { at: 'Where It Rested', min: null, what: 'warm ending (g16_rested_warm)' },
  { at: 'Jory', min: 60, what: 'extra line (g25_jory_warmth)' },
  { at: 'sq_ug_lifeguard', min: 50, what: 'quest unlock' },
];

/** Pure: what Ron 5 does on this talk. flags: Set-like {has}. defeated: the trainer is marked beaten (win or loss). */
export function ron5State(flags, defeated = false) {
  const fought = defeated || flags.has('ron5_fought');
  if (flags.has(R56.master)) return fought ? 'gone' : 'parting';
  if (fought) return 'town';
  if (flags.has('ron5_declined')) return 'rematch';
  return 'first';
}
/** Pure: should the missed parting fire now? */
// Wellspire fixes (Oct 30 2026): gated like the Lanternport page (region78 pageDue): only between the Tidewater coin (coin six)
// and the next one, so a cold warp / dev Flags preset past that point never plays 'Coin six' later in the game.
export const ron5Missed = (flags) => flags.has(R56.master) && !flags.has('ron5_fought') && !flags.has('ron5_missed')
  && !flags.has('all_badges') && !LATER_COINS.some((f) => flags.has(f));
const LATER_COINS = ['beat_master_lanternport', 'beat_master_cindervale'];
/** Pure: ID cap flag for a region when the company level sits at its cap and the next region is still locked. */
export function idCapFlag(idLevel, caps = { 5: 14, 6: 16 }) {
  for (const [r, cap] of Object.entries(caps)) if (idLevel === cap) return `id_cap_r${r}`;
  return null;
}

const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);

export function attachRegion56(scene, { systems } = {}) {
  const sys = () => systems || scene.systems;
  const flags = scene.flags, has = (f) => flags.has(f);
  const set = (f) => { if (!flags.has(f)) (scene.setFlag ? scene.setFlag(f, true) : flags.add(f)); };
  const vars = () => scene.textVars?.() || {};
  const fill = (s) => String(s).replace(/\{(\w+)\}/g, (m, k) => (vars()[k] ?? m));
  const T = (k) => getPath(scene.lines, `system_story_r56.${k}`);
  const pages = (k) => (T(k)?.pages || []).map(fill);
  const say = (k, sp) => (pages(k).length ? scene.say(pages(k), sp) : Promise.resolve());

  async function umbrella(sp, pocketKey) {
    await say('g21_ron_umbrella', sp);
    if (!has('has_rons_umbrella')) { sys()?.bag?.add?.(R56.umbrellaItem, 1); set('has_rons_umbrella'); }
    set('met_ron_tidewater'); set(`${R56.umbrellaQuest}_start`);
    if (pocketKey) await say(pocketKey, sp);
  }

  // Before the trainer battle (overworld.js trainerHooks): Battle / Not now, rematch, after-fight, parting.
  async function onTrainer({ mapName, def, speaker: sp, defeated }) {
    if (mapName !== R56.ronMap || !R56.ronIds.includes(def?.id)) return false;
    const st = ron5State({ has }, defeated);
    if (st === 'parting') { await parting(sp); return true; }
    if (st === 'gone' || st === 'town') { await say('g21_ron_town', sp); return true; }
    if (st === 'rematch') {
      await say('g21_ron_rematch', sp);
      const c = await scene.ask(pages('g21_ron_choice').slice(-1), T('g21_ron_choice')?.choices || ['Battle', 'Not now'], sp);
      if (c !== 0) return true;
      set('ron5_fought'); return false; // falls through to the normal battle (story.js RON_OPTIONAL)
    }
    for (const k of ['g21_ron_wall_1', 'g21_ron_wall_2', 'g21_ron_bin_line', 'g21_ron_honest']) await say(k, sp);
    const c = await scene.ask(pages('g21_ron_choice'), T('g21_ron_choice')?.choices || ['Battle', 'Not now'], sp);
    if (c === 0) { set('ron5_fought'); return false; }
    await say('g21_ron_decline_1', sp); await say('g21_ron_decline_2', sp);
    set('ron5_declined');
    await umbrella(sp, 'g21_ron_pocket_decline');
    return true;
  }
  async function parting(sp) {
    set('ron5_missed');
    await say('g21_ron_missed_parting', sp || { name: 'Ron' });
    if (!has('has_rons_umbrella')) await umbrella(sp, null);
  }

  // Win / loss lines + pocket lines after the battle: story.js sets ron5_fought + met_ron_tidewater + has_rons_umbrella.
  const prevFlag = scene.setFlag?.bind(scene);
  if (prevFlag && !scene._r56Flag) {
    scene._r56Flag = true;
    scene.setFlag = (f, v) => {
      const r = prevFlag(f, v);
      if (f === 'has_rons_umbrella' && !sys()?.bag?.has?.(R56.umbrellaItem)) { sys()?.bag?.add?.(R56.umbrellaItem, 1); flags.add(`${R56.umbrellaQuest}_start`); }
      return r;
    };
  }

  function tick() {
    if (scene._wxBattles) for (const w of scene._wxBattles) { if (!w.el.isConnected) { w.destroy(); scene._wxBattles.delete(w); } else w.pause((typeof document !== 'undefined' && document.hidden) || !!scene.paused); } // weather lite: 1 s, never per frame
    if (ron5Missed({ has }) && scene.map?.name === R56.slipMap && !scene.busy && !scene._r56Parting) {
      scene._r56Parting = true;
      scene.script?.(async () => { try { await parting({ name: 'Ron' }); } finally { scene._r56Parting = false; } });
    }
    // G6: Ron's boat leaves from the cove after the forced low tide (once; after the lab, or on a cove return without it).
    syncLowTide(scene);
    if (!scene.busy && !scene._r56Boat && boatLeaveDue({ has }, scene.map?.name, scene.player)) {
      scene._r56Boat = true; set(LOW_TIDE.done);
      const pg = (getPath(scene.lines, `system_story_r56.${LOW_TIDE.key}`)?.pages || []).map(fill);
      scene.script?.(async () => { try { if (pg.length) await scene.say(pg, { name: 'Ron' }); } finally { scene._r56Boat = false; } });
    }
    const lvl = sys()?.rtBenefits?.idLevel?.() ?? sys()?.rtBenefits?.company?.idLevel;
    const cap = Number.isFinite(lvl) ? idCapFlag(lvl) : null;
    if (cap) set(cap);
    if (has('beat_master_mirefen') && (lvl ?? 0) >= 14) set('promoted_id14');
    if (has(R56.master) && (lvl ?? 0) >= 16) set('promoted_id16');
  }

  (scene.trainerHooks ||= []).push(onTrainer);
  (scene.talkHooks ||= []).push(oldGusHook(scene)); // Old Gus tutor (tutor.js)
  const cv = typeof window !== 'undefined' ? window.kilumen?.companyVoice : scene.companyVoice;
  if (cv && (cv.maxRegion ?? 0) < 6) cv.maxRegion = 6; // region56 is on by default (dev/regions-5-8); ?r56=0 turns it off
  const iv = typeof setInterval !== 'undefined' && typeof window !== 'undefined' ? setInterval(() => { try { tick(); } catch (e) { console.error('region56 tick:', e); } }, 1000) : null;
  const api = { onTrainer, parting, tick, stop: () => iv && clearInterval(iv) };
  scene.region56 = api;
  return api;
}
