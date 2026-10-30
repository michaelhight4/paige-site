// Wellspire (region 9) + the finale (Coder, Oct 29 2026; design/regions56/story_beats.md §F). attachRegion9(scene) adds:
//  - the courier after Ending 1 (Head Office letter, team postcard, RITA, Mum, Ron + thermos) -> r9_unlocked, skylift_upper_open
//  - travel spots (old riverbed <-> Brookhollow / Cairnfold, Skylift Upper <-> Frostspire, switchbacks -> icefall, spire door)
//  - talk for every region9 NPC (clerks: one line; trainers: battle, teams in ./teams.js)
//  - gates: spire floors open after that floor's keeper / staff; Station M door after Greave; Signal Lab after Holt + the plug;
//    enclosure after the Chief; past maps have no edge exits back
//  - the time slip, release, Ondravel's 3 phases (loss: heal, back to the top landing), riverbend dawn, present release,
//    credits 2 ('ending2'), then the Lantern Rest epilogue. field_team_home is set ONLY here, after fin_present_release.
// Text: root keys of text/overworld_lines.json (Text Bot, data/textbot_requests_wellspire.md), else DRAFT ./text_fallback.js.
import { FB } from './text_fallback.js?v=v0.2.95-alpha';
import { POINTS } from './points.gen.js?v=v0.2.95-alpha';
import { Npc } from '../overworld/npcs.js?v=v0.2.95-alpha';

const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
export const R9 = {
  ending1: ['ending1_done', 'finale_done'], courierMaps: ['brookhollow', 'house_1f'],
  courierFlags: ['courier_delivered', 'got_team_postcard', 'read_ho_letter', 'got_nan_thermos', 'r9_unlocked', 'skylift_upper_open'],
  topLanding: { map: 'fin_past_lab1_f4', x: 21, y: 1, facing: 'down' },
  phases: ['fin_ondravel_p1', 'fin_ondravel_p2', 'fin_ondravel_p3'],
  liftDoor: { map: 'r9_cairnfold', x: 26, y: 32 },
};
const def = (k) => `defeated:${k}`;
/** Up-warps that stay shut: "from>to" -> test(flags, seen). Down / back warps are never gated. */
export const WARP_GATES = {
  'fin_lab1_now_f1>fin_lab1_now_f2': (f, s) => !!s[def('fin_lab1_now_f1.r9_spire_keeper_1')],
  'fin_lab1_now_f2>fin_lab1_now_f3': (f, s) => !!s[def('fin_lab1_now_f2.r9_spire_keeper_2')],
  'fin_lab1_now_f3>fin_lab1_now': (f, s) => !!s[def('fin_lab1_now_f3.r9_spire_keeper_3')],
  'fin_past_station_m>fin_past_signal_lab': (f) => f.has('fin_past_m_done'),
  'fin_past_signal_lab>fin_past_lab1_f1': (f) => f.has('fin_past_t_done'),
  'fin_past_lab1_f1>fin_past_lab1_f2': (f) => f.has('fin_spire_floor_1'),
  'fin_past_lab1_f2>fin_past_lab1_f3': (f) => f.has('fin_spire_floor_2'),
  'fin_past_lab1_f3>fin_past_lab1_f4': (f) => f.has('fin_spire_floor_3'),
  'fin_past_lab1_f4>fin_past_enclosure': (f) => f.has('fin_spire_floor_4'),
};
export const warpBlockedFor = (from, to, flags, seen = {}) => { const g = WARP_GATES[`${from}>${to}`]; return !!g && !g(flags, seen); };
export const courierDue = (flags, mapName) => R9.courierMaps.includes(mapName) && R9.ending1.some((f) => flags.has(f)) && !flags.has('courier_delivered');
export const isPast = (m) => /^fin_past_/.test(m || '');

/** NPC id -> {say, intro, lose, after, flag, needs?, wait?} (keys into text). */
export const TALK = {
  r9_skylift_operator: { say: 'r9.skylift_operator' },
  r9_cf_herder_1: { say: 'r9.cairnfold_herder_1' }, r9_cf_herder_2: { say: 'r9.cairnfold_herder_2' }, r9_cf_elder: { say: 'r9.cairnfold_elder' },
  r9_cf_kid: { say: 'r9.cairnfold_kid' }, r9_cf_weaver: { say: 'r9.cairnfold_weaver' }, r9_cf_walker: { say: 'r9.cairnfold_walker' },
  r9_cf_lodge_fan: { say: 'r9.cairnfold_lodge_fan' }, r9_cf_watcher: { say: 'r9.cairnfold_watcher' }, r9_cf_baker: { say: 'r9.cairnfold_baker' },
  r9_lodge_clerk: { say: 'r9.lodge_clerk' },
  r9_sw_survey_1: { intro: 'r9.survey_crew_1', after: 'r9.trainer_after' }, r9_sw_survey_2: { intro: 'r9.survey_crew_2', after: 'r9.trainer_after' },
  r9_sw_survey_3: { intro: 'r9.survey_crew_3', after: 'r9.trainer_after' },
  fin_teo: { say: 'summit.camp.teo', flag: 'found_team_summit' }, fin_marta: { say: 'summit.camp.marta', flag: 'found_team_summit' },
  fin_pell: { say: 'summit.camp.pell', flag: 'found_team_summit' }, fin_imke: { say: 'summit.camp.imke', flag: 'found_team_summit' },
  fin_ep_teo: { say: 'fin.epilogue.teo_readings' }, fin_ep_marta: { say: 'fin.epilogue.marta_bench' }, fin_ep_pell: { say: 'fin.epilogue.pell' }, fin_ep_imke: { say: 'fin.epilogue.imke' },
  r9_spire_keeper_1: { intro: 'r9.spire_keeper_after', after: 'r9.spire_keeper_after' }, r9_spire_keeper_2: { intro: 'r9.spire_keeper_after', after: 'r9.spire_keeper_after' },
  r9_spire_keeper_3: { intro: 'r9.spire_keeper_after', after: 'r9.spire_keeper_after' },
  fin_m_handler_1: { intro: 'fin.m.handler_1', after: 'fin.m.handler_after' }, fin_m_handler_2: { intro: 'fin.m.handler_2', after: 'fin.m.handler_after' },
  fin_m_handler_3: { intro: 'fin.m.handler_3', after: 'fin.m.handler_after' },
  fin_m_greave: { intro: 'fin.m.boss_greave_intro', lose: 'fin.m.boss_greave_lose', after: 'fin.m.boss_greave_after', flag: 'fin_past_m_done', name: 'Dr. Greave' },
  fin_t_tech_1: { intro: 'fin.t.tech_1', after: 'fin.t.tech_after' }, fin_t_tech_2: { intro: 'fin.t.tech_2', after: 'fin.t.tech_after' }, fin_t_tech_3: { intro: 'fin.t.tech_3', after: 'fin.t.tech_after' },
  fin_t_holt: { intro: 'fin.t.boss_holt_intro', lose: 'fin.t.boss_holt_lose', after: 'fin.t.boss_holt_after', flag: 'fin_holt_beaten', needs: 'fin_coralie_door', wait: 'fin.t.boss_holt_wait', name: 'Dr. Holt' },
  fin_lab1_staff_1: { intro: 'fin.lab1.staff_1', after: 'fin.lab1.staff_after', flag: 'fin_spire_floor_1' },
  fin_lab1_staff_2: { intro: 'fin.lab1.staff_2', after: 'fin.lab1.staff_after', flag: 'fin_spire_floor_2' },
  fin_lab1_staff_3: { intro: 'fin.lab1.staff_3', after: 'fin.lab1.staff_after', flag: 'fin_spire_floor_3' },
  fin_lab1_staff_4: { intro: 'fin.lab1.staff_4', after: 'fin.lab1.staff_after', flag: 'fin_lab1_staff4_beaten' },
  fin_lab1_chief: { intro: 'fin.lab1.chief_intro', lose: 'fin.lab1.chief_lose', after: 'fin.lab1.chief_after', flag: 'fin_spire_floor_4', needs: 'fin_lab1_staff4_beaten', wait: 'fin.lab1.chief_wait', name: 'The Chief' },
};
const TRAINER_DEFAULT = { intro: null, after: 'r9.trainer_after' };

export function attachRegion9(scene, { systems } = {}) {
  const sys = () => systems || scene.systems;
  const flags = scene.flags, has = (f) => flags.has(f);
  const set = (f) => { if (!flags.has(f)) (scene.setFlag ? scene.setFlag(f, true) : flags.add(f)); };
  const text = (k) => { const v = getPath(scene.lines, k); const p = Array.isArray(v) ? v : v?.pages; return p?.length ? p : (FB[k] || []); };
  const say = (k, sp) => { const p = text(k); return p.length && scene.say ? scene.say(p, sp) : Promise.resolve(); };
  const ask = async (k, q) => (await scene.ask?.([...text(k), ...(q ? text(q) : [])], ['Yes', 'No'])) === 0;
  const narr = { name: null, portrait: null, battle: null };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const warp = async (spawn, kind = 'door') => { if (!scene.startWarp) return; scene.startWarp(spawn, kind); for (let i = 0; scene.fade && i < 400; i++) await wait(25); };
  const pt = (k) => POINTS[k] || null;
  const to = (map, k) => { const p = pt(k) || POINTS[map]?.[k]; return p && { map, x: p.x, y: p.y, facing: p.facing === 'up' ? 'down' : p.facing || 'down' }; };
  const heal = () => { sys()?.party?.healAll?.(); scene.healedAt = scene.ms; };
  const partyEmpty = () => !(sys()?.party?.list || scene.party || []).length;

  /** One battle: true win, false loss. The past never blacks out: a loss heals and you try again. */
  async function fight(map, id, sp) {
    if (partyEmpty()) { await scene.say?.(["I don't have a creature to battle with."], narr); return false; }
    const won = scene.hooks?.onBattle ? (await scene.hooks.onBattle({ map, id })) !== false : true;
    scene.log?.push?.({ tick: scene.tick, type: 'battle', npc: id, won });
    if (won) { scene.seen[def(`${map}.${id}`)] = true; await sys()?.onTrainerWin?.({ map, def: { id, kind: 'trainer' }, speaker: sp }); return true; }
    if (isPast(map)) { heal(); await say('fin.retry_heal', narr); return false; }
    const out = await sys()?.onTrainerLoss?.({ map, def: { id } }); if (!out) await sys()?.onPartyFainted?.();
    return false;
  }

  async function talk({ mapName, def: d, speaker }) {
    const t = TALK[d.id] || (d.kind === 'trainer' ? TRAINER_DEFAULT : { say: 'r9.trainer_after' });
    const sp = t.name ? { ...speaker, name: t.name } : speaker;
    if (d.id === 'fin_t_coralie') return coralieTalk(sp);
    if (t.say) { await say(t.say, sp); if (t.flag) { const first = !has(t.flag); set(t.flag); if (first && /^fin_(teo|marta|pell|imke)$/.test(d.id)) heal(); } return; }
    if (scene.seen[def(`${mapName}.${d.id}`)]) return say(t.after, sp);
    if (t.needs && !has(t.needs) && !scene.devMasterKey) return say(t.wait, sp);
    if (t.intro) await say(t.intro, sp);
    if (!(await fight(mapName, d.id, sp))) return;
    if (t.lose) await say(t.lose, sp);
    if (t.flag) set(t.flag);
    if (d.id === 'fin_m_greave') await say('fin.m.boss_greave_after', narr);
    if (d.id === 'fin_t_holt') await say('fin.t.boss_holt_after', narr);
    if (d.id === 'fin_lab1_chief') await say('fin.lab1.window_lights', narr);
  }

  async function coralieTalk(sp) {
    if (has('fin_holt_beaten')) return plug(sp);
    if (has('fin_coralie_door')) return say('fin.t.coralie_wait', sp);
    await say('fin.t.coralie_door', sp);
    await say('fin.t.coralie_name', sp);
    await say('fin.t.coralie_name_cut', sp); // either way she cuts you off: she must not know it
    set('fin_coralie_door');
  }
  async function plug(sp) {
    if (has('fin_past_t_done')) return say('fin.t.plug_done', narr);
    if (!has('fin_holt_beaten')) return say('fin.t.plug_wait', narr);
    await say('fin.t.coralie_plug', sp || { name: 'Coralie' });
    set('fin_past_t_done');
    await say('fin.t.light_pull', narr);
  }

  async function courier() {
    const release = scene.lockSave?.('wellspire_courier') || (() => {});
    try {
      set('courier_delivered'); // first: a reload mid-scene never repeats the knock
      await say('courier.knock', narr);
      let pm = null;
      try { // the postman stands next to you while he talks
        const p = scene.player, m = scene.map;
        const c = [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy })).find((q) => m?.isWalkable?.(q.x, q.y) && !m?.npcAt?.(q.x, q.y));
        if (c && scene.npcs?.list) {
          pm = new Npc({ id: 'r9_postman', kind: 'object', x: c.x, y: c.y, facing: 'down', story: true }, m.name, scene.spriteMap?.['coast_road.postman'] || scene.spriteMap?.['brookhollow.postman'] || null, false);
          pm.behaviour = 'static'; pm.faceToward?.(p.x, p.y); scene.npcs.list.push(pm); m.occupy?.(pm.x, pm.y, pm); scene.story?.loadImgs?.(pm);
        }
      } catch { pm = null; }
      await say('courier.dry_every_one', { name: 'Postman' });
      if (pm) { const i = scene.npcs.list.indexOf(pm); if (i >= 0) scene.npcs.list.splice(i, 1); scene.map?.vacate?.(pm.x, pm.y, pm); }
      await say('letter.ho_assignment', narr); set('read_ho_letter');
      await say('letter.team_postcard', narr); set('got_team_postcard');
      await say('rita.letter_qr', { name: 'RITA' });
      await say('mum.letter_react', { name: 'Mum' });
      await say('ron.letter_react', { name: 'Ron' });
      await say('ron.thermos', { name: 'Ron' }); set('got_nan_thermos');
      set('r9_unlocked'); set('skylift_upper_open');
      await say('r9.unlocked', narr);
      scene.log?.push?.({ tick: scene.tick, type: 'wellspire', step: 'courier' });
    } finally { release(); }
  }

  /** Ondravel: release, then 3 phases. Any loss: heal, back to the top landing (fin_released stays: the dome is open). */
  async function guardian() {
    if (!has('fin_released')) { await say('fin.dome_touch', narr); set('fin_released'); }
    await say('fin.released', narr);
    for (let i = 0; i < R9.phases.length; i++) {
      await say(`fin.battle.phase_${i + 1}`, narr);
      const won = scene.hooks?.onBattle ? (await scene.hooks.onBattle({ map: 'fin_past_enclosure', id: R9.phases[i] })) !== false : true;
      scene.log?.push?.({ tick: scene.tick, type: 'battle', npc: R9.phases[i], won });
      if (!won) { heal(); await say('fin.battle.lost', narr); await warp(R9.topLanding); return false; }
      heal(); // between phases: the light keeps you standing
    }
    set('fin_guardian_beaten');
    await say('fin.battle.won', narr);
    await finale();
    return true;
  }

  async function finale() {
    const release = scene.lockSave?.('wellspire_finale') || (() => {});
    try {
      await warp(to('fin_past_riverbend', '_arrive_riverbend'), 'ending');
      await say('fin.riverbend_dawn', narr);
      await warp(to('fin_lab1_now', '_arrive_dome'), 'ending');
      await say('fin.present_release', narr);
      set('fin_present_release'); set('spring_running');
      await say('summit.team_morning', narr);
      const record = { ...(scene.gameCleared || {}) };
      try { await (await import('../ui/credits.js?v=v0.2.95-alpha')).runCredits(scene, record, { variant: 'ending2' }); } catch (e) { console.error('credits 2:', e); }
      set('field_team_home'); // Ending 2 only: never earlier
      await warp({ map: 'lantern_rest', ...(POINTS.lantern_rest?.fin_bench_swap ? { x: POINTS.lantern_rest.fin_bench_swap.x, y: POINTS.lantern_rest.fin_bench_swap.y + 1 } : { x: 20, y: 10 }), facing: 'up' }, 'ending');
      await say('fin.epilogue.team_arrive', narr);
      await say('fin.epilogue.keeper_bench', { name: 'Keeper' });
      await say('fin.epilogue.marta_bench', { name: 'Marta' });
      await say('fin.epilogue.teo_readings', { name: 'Teo' });
      set('ending2_done');
      await say('fin.epilogue.postgame', narr);
      scene.log?.push?.({ tick: scene.tick, type: 'ending', step: 'ending2' });
    } finally { release(); }
  }

  const SPOTS = {
    r9_riverbed_entry: async () => { if (await ask('r9.riverbed_entry', 'r9.riverbed_entry_ask')) await warp(to('r9_old_riverbed', '_arrive_riverbed')); },
    r9_riverbed_up: async () => { await say('r9.riverbed_up', narr); await warp(to('r9_cairnfold', 'r9_cairnfold_down')); },
    r9_cairnfold_down: async () => { await say('r9.cairnfold_down', narr); await warp(to('r9_old_riverbed', 'r9_riverbed_up')); },
    r9_name_sign: () => say('r9.name_sign', narr), r9_riverbed_marks: () => say('r9.riverbed_marks', narr),
    r9_cairnfold_sign: () => say('r9.cairnfold_sign', narr), r9_kid_drawing: () => say('r9.kid_drawing', narr),
    r9_lodge_legend: () => say('r9.lodge_legend', narr), r9_skylift_notice: () => say('r9.skylift_notice', narr),
    r9_skylift_entry: async () => {
      if (!(await ask('r9.skylift_entry', 'r9.skylift_entry_ask'))) return;
      scene.lastDoor = { ...R9.liftDoor }; // the upper station's door leads out into Cairnfold
      await warp({ map: 'r9_skylift_upper', x: 9, y: 11, facing: 'up' });
    },
    r9_skylift_down: async () => { if (await ask('r9.skylift_down')) await warp(to('frostspire_lift_int', 'r9_skylift_entry')); },
    r9_switchbacks_up: async () => { await say('r9.switchbacks_up', narr); await warp(to('r9_icefall', '_arrive_icefall')); },
    r9_icefall_signal: () => say('r9.icefall_signal', narr),
    fin_camp_fire: async () => { heal(); await say('summit.camp_fire', narr); },
    fin_spire_door: async () => {
      if (!has('found_team_summit')) return say('summit.spire_door_wait', narr);
      await say('summit.spire_door', narr); await warp(to('fin_lab1_now_f1', '_arrive_spire'));
    },
    r9_spire_f1_nursery: () => say('r9.spire_f1_nursery', narr), r9_spire_f2_chair: () => say('r9.spire_f2_chair', narr),
    r9_spire_f3_growth: () => say('r9.spire_f3_growth', narr),
    fin_dome: async () => {
      if (has('fin_guardian_beaten')) return say('fin.epilogue.bench', narr);
      await say('fin.guardian_plea_1', narr); await say('fin.guardian_plea_2', narr); await say('fin.guardian_plea_3', narr);
      if (!(await ask('fin.guardian_plea_ask'))) return;
      set('fin_timeslip');
      await say('fin.timeslip', narr);
      await warp(to('fin_past_station_m', '_arrive_past_m'), 'ending');
      await say('fin.past_arrive', narr);
    },
    fin_reader: () => say('fin.reader_reject', narr),
    fin_sluice: () => say(has('fin_past_m_done') ? 'fin.m.sluice' : 'fin.m.sluice_shut', narr),
    fin_t_tide_door: () => say(has('fin_coralie_door') ? 'fin.t.tide_door' : 'fin.t.tide_door_shut', narr),
    fin_test8_plug: () => plug(null),
    fin_lab1_window: () => say(has('fin_spire_floor_4') ? 'fin.lab1.window_lights' : 'r9.spire_f3_growth', narr),
    fin_past_dome: () => (has('fin_guardian_beaten') ? say('fin.battle.won', narr) : guardian()),
    fin_bench_swap: () => say(has('ending2_done') ? 'fin.epilogue.bench' : 'r9.trainer_after', narr),
  };

  async function runSpot(sp) { const f = SPOTS[sp?.id]; if (!f) return false; await f(sp); return true; }

  function warpBlocked(fromMap, w) {
    if (w && 'via' in w && !w.via) return []; // a dead-end passage (riverbend): stays shut
    const dest = w?.via?.map || w?.to;
    if (!dest || !warpBlockedFor(fromMap, dest, flags, scene.seen || {})) return null;
    const k = /^fin_lab1_now/.test(fromMap) ? 'r9.floor_locked' : fromMap === 'fin_past_lab1_f4' ? 'fin.lab1.chief_wait'
      : fromMap === 'fin_past_station_m' ? 'fin.m.sluice_shut' : fromMap === 'fin_past_signal_lab' ? 'fin.t.plug_wait' : 'fin.lab1.staff_after';
    return text(k);
  }
  const edgeBlocked = (fromMap) => isPast(fromMap); // the past has no road home: only the light brings you back

  function tick() {
    if (scene.busy || scene.paused || scene.fade || scene._r9Courier) return;
    if (courierDue(flags, scene.map?.name)) { scene._r9Courier = true; scene.script(courier).finally(() => { scene._r9Courier = false; }); }
  }

  scene.talkHooks = scene.talkHooks || [];
  scene.talkHooks.push({ match: (m, d) => !!d?.region9, run: (ctx) => talk(ctx) });
  const iv = typeof setInterval !== 'undefined' && typeof window !== 'undefined' ? setInterval(() => { try { tick(); } catch (e) { console.error('region9 tick:', e); } }, 1000) : null;
  const api = { runSpot, warpBlocked, edgeBlocked, tick, courier, guardian, finale, text, SPOTS, stop: () => iv && clearInterval(iv) };
  scene.region9 = api;
  return api;
}
