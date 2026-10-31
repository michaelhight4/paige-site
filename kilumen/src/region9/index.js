// Wellspire (region 9) + the finale (Coder, Oct 29 2026; design/regions56/story_beats.md §F). attachRegion9(scene) adds:
//  - the courier after Ending 1 (Head Office letter, team postcard, RITA, Mum, Ron + thermos) -> r9_unlocked, skylift_upper_open
//  - travel spots (old riverbed <-> Brookhollow / Cairnfold, Skylift Upper <-> Frostspire, switchbacks -> icefall, spire door)
//  - talk for every region9 NPC (clerks: one line; trainers: battle, teams in ./teams.js)
//  - gates: spire floors open after that floor's keeper / staff; Station M door after Greave; Signal Lab after Holt + the plug;
//    enclosure after the Chief; past maps have no edge exits back
//  - the time slip, release, Ondravel's 3 phases (loss: heal, back to the top landing), riverbend dawn, present release,
//    credits 2 ('ending2'), the flashback, home, then the RT report that fades (REPORT). field_team_home is set ONLY in reportAtWork, after fin_reported_rt.
// Text: root keys of text/overworld_lines.json (Text Bot, data/textbot_requests_wellspire.md), else DRAFT ./text_fallback.js.
import { FB as FB1 } from './text_fallback.js?v=v0.2.106-alpha';
import { FB2 } from './text_fallback_v2.js?v=v0.2.106-alpha';
import { LAB_TEXT, LAB_NAMES } from './text_flashback_lab.gen.js?v=v0.2.106-alpha';
import { makeSummitFx } from './summit_fx.js?v=v0.2.106-alpha';
const FB = { ...FB1, ...FB2, ...LAB_TEXT }; // Text Bot DRAFT lab lines win over Coder placeholders
import { POINTS } from './points.gen.js?v=v0.2.106-alpha';
import { Npc } from '../overworld/npcs.js?v=v0.2.106-alpha';
import { TB } from './textbot.js?v=v0.2.106-alpha';
const fallbackText = (k) => TB[k] || FB[k] || []; // Text Bot lines win over FB (FB = v1 + v2 + lab)

const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
// Wellspire v2 open questions (Story Bot §W Q-W10/11/13, pending Gary). Flip to true to turn each one on.
// Gary 11:05 PM CT: the collapse is not shown (it is found by absence); present-day Coralie stands at the Tidewater cove.
// Flashback: runs inside the Ending 2 finale (or via FLASHBACK.flag); it loads into the flashback map tiles, then a loading screen returns you home.
// Q-W14 (Gary 11:09 PM CT): wake up at home, go to work at RT, the four are there, the memory fades (REPORT).
export const WELLSPIRE_OPTS = { collapseShown: false, dreamVariant: true, coraliePresent: true };
export const FLASHBACK = {
  flag: 'wellspire_flashback_due', done: 'wellspire_flashback_done',
  to: { map: 'fin_past_wlab_01_entry', x: 5, y: 11, facing: 'up' }, // WD lab (Oct 30): was fin_past_lab1_f1 (11,9)
  home: { map: 'house_2f', x: 8, y: 4, facing: 'down' }, // the player's bed upstairs
  after: null, // Q-W14: e.g. async (ctx) => ctx.say('fin.flashback.after', ctx.narr)
};
export const REPORT = { // story_beats.md F5-2b..6
  walked: 'fin_walked_to_work', walk: 'brookhollow',
  work: { map: 'heal_brookhollow', desks: [[4, 3], [5, 3], [7, 3], [8, 3]] }, // the four at their RT office desks (behind the counter) // Revival Tech Brookhollow branch (the RT office)
  four: [['fin_ep_teo', 'Teo'], ['fin_ep_marta', 'Marta'], ['fin_ep_pell', 'Pell'], ['fin_ep_imke', 'Imke']],
};
export const CORALIE_COVE = { map: 'tidewater_coast', x: 44, y: 33, r: 4, flag: 'ending2_done', done: 'fin_coralie_epilogue' };
export const R9 = {
  ending1: ['ending1_done', 'finale_done'], courierMaps: ['brookhollow', 'house_1f'],
  courierFlags: ['courier_delivered', 'got_team_postcard', 'read_ho_letter', 'got_nan_thermos', 'r9_unlocked', 'skylift_upper_open'],
  topLanding: { map: 'fin_past_wlab_09_observation', x: 11, y: 3, facing: 'down' }, // WD lab: in front of room 10's door (was fin_past_lab1_f4 21,1)
  guardianMap: 'fin_past_wlab_10_ondravel', // Ondravel's phase teams key here (was fin_past_enclosure)
  phases: ['fin_ondravel_p1', 'fin_ondravel_p2', 'fin_ondravel_p3'],
  liftDoor: { map: 'r9_cairnfold', x: 26, y: 32 },
};
const def = (k) => `defeated:${k}`;
/** WD flashback lab (fin_past_wlab_01..10): each forward door opens once that room's trainers are beaten (sight lines don't fire
 *  without a Text Bot battle_lost entry, so the gate is the real lock). */
export const WLAB_MAPS = ['fin_past_wlab_01_entry', 'fin_past_wlab_02_medical', 'fin_past_wlab_03_control', 'fin_past_wlab_04_tanks', 'fin_past_wlab_05_amber',
  'fin_past_wlab_06_growth', 'fin_past_wlab_07_vats', 'fin_past_wlab_08_core', 'fin_past_wlab_09_observation', 'fin_past_wlab_10_ondravel'];
export const WLAB_TRAINERS = [['fin_wlab_tech_1'], ['fin_wlab_tech_2'], ['fin_wlab_tech_3', 'fin_wlab_tech_4'], ['fin_wlab_tech_5', 'fin_wlab_tech_6'],
  ['fin_wlab_tech_7', 'fin_wlab_tech_8'], ['fin_wlab_tech_9', 'fin_wlab_tech_10'], ['fin_wlab_tech_11', 'fin_wlab_tech_12'], ['fin_wlab_tech_13', 'fin_wlab_tech_14'],
  ['fin_wlab_tech_15', 'fin_wlab_chief'], []];
const WLAB_GATES = Object.fromEntries(WLAB_MAPS.slice(0, -1).map((m, i) => [`${m}>${WLAB_MAPS[i + 1]}`, (f, s) => WLAB_TRAINERS[i].every((id) => !!s[def(`${m}.${id}`)])]));
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
  ...WLAB_GATES,
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
  r9_lodge_clerk: { say: 'r9.lodge_clerk', shop: true }, // playtest Oct 30 2026: the lodge receptionist sells (Wellspire stock)
  // r9 trainers: own intro/after come from FIELD_IDS below (r9.ft.<id>.*); the Oct 30 Text Bot r9.*_intro/_after lines stay in overworld_lines as spares.
  r9_sw_survey_1: { intro: 'r9.survey_crew_1', after: 'r9.trainer_after' }, r9_sw_survey_2: { intro: 'r9.survey_crew_2', after: 'r9.trainer_after' },
  r9_sw_survey_3: { intro: 'r9.survey_crew_3', after: 'r9.trainer_after' },
  fin_teo: { say: 'summit.camp.teo', flag: 'found_team_summit' }, fin_marta: { say: 'summit.camp.marta', flag: 'found_team_summit' },
  fin_pell: { say: 'summit.camp.pell', flag: 'found_team_summit' }, fin_imke: { say: 'summit.camp.imke', flag: 'found_team_summit' },
  // camp life (Oct 30): other RT field teams resting at the summit camp, always there (DRAFT text summit.camp.ft_*)
  fin_camp_bryn: { say: 'summit.camp.ft_bryn' }, fin_camp_otto: { say: 'summit.camp.ft_otto' }, fin_camp_sunniva: { say: 'summit.camp.ft_sunniva' }, fin_camp_lorcan: { say: 'summit.camp.ft_lorcan' },
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
/** Wellspire v3 lab gauntlet (build_lab_v3.py): techs, vat-hall hazmat crews, the control room and its lead. Lines: fin.enc.<id>.intro / .after. */
export const LAB_IDS = ['fin_enc_tech_1', 'fin_enc_tech_2', 'fin_enc_hazmat_1', 'fin_enc_hazmat_2', 'fin_enc_hazmat_3', 'fin_enc_tech_3', 'fin_enc_tech_4',
  'fin_enc_ctrl_1', 'fin_enc_ctrl_2', 'fin_enc_lead', 'fin_enc_tech_5', 'fin_enc_entry_1', 'fin_enc_entry_2'];
for (const id of LAB_IDS) TALK[id] = { intro: `fin.enc.${id}.intro`, after: `fin.enc.${id}.after`, name: LAB_NAMES[id] };
for (const id of WLAB_TRAINERS.flat()) TALK[id] = { intro: `fin.wlab.${id}.intro`, after: `fin.wlab.${id}.after`, name: LAB_NAMES[id] || 'Lab Tech' };
TALK.fin_wlab_chief.flag = 'fin_enc_lead_beaten'; // the observer chief unlocks Ondravel's tank, as fin_enc_lead did
Object.assign(TALK.fin_enc_lead, { flag: 'fin_enc_lead_beaten', name: LAB_NAMES.fin_enc_lead || 'Lead Tech' });
/** Wellspire v2: every present-day trainer is another RT field research team (names / classes on the map npcs,
 *  tools/wellspire/field_teams.py). Lines: r9.ft.<id>.intro / .after. */
export const FIELD_IDS = ['r9_rb_hiker', 'r9_rb_dowser', 'r9_rb_guide', 'r9_skylift_rider', 'r9_sw_mountaineer_1', 'r9_sw_climber_1',
  'r9_sw_survey_1', 'r9_sw_survey_2', 'r9_sw_survey_3', 'r9_sw_climber_2', 'r9_ic_climber_1', 'r9_ic_climber_2', 'r9_ic_diver', 'r9_ic_keeper',
  'r9_cw_field_1', 'r9_cw_field_2', 'r9_cw_field_3', 'r9_ec_field_1', 'r9_ec_field_2', 'r9_cl_field_1', 'r9_cl_field_2', 'r9_cl_field_3',
  'r9_hc_field_1', 'r9_hc_field_2', 'r9_hc_field_3'];
for (const id of FIELD_IDS) TALK[id] = { intro: `r9.ft.${id}.intro`, after: `r9.ft.${id}.after` };
// Icefall (map fill, Coder Oct 30 2026): names + intros for the cave's six trainers; lines are DRAFT in ./text_fallback.js.
for (const [k, v] of Object.entries({
  r9_ic_climber_1: { intro: 'r9.ic.climber_1', after: 'r9.ic.climber_1_after', name: 'Climber Brenna' },
  r9_ic_climber_2: { intro: 'r9.ic.climber_2', after: 'r9.ic.climber_2_after', name: 'Climber Odd' },
  r9_ic_diver: { intro: 'r9.ic.diver', after: 'r9.ic.diver_after', name: 'Ice Diver Sela' },
  r9_ic_keeper: { intro: 'r9.ic.keeper', after: 'r9.ic.keeper_after', name: 'Cave Keeper Moss' },
  r9_ic_carver: { intro: 'r9.ic.carver', after: 'r9.ic.carver_after', name: 'Ice Carver Pim' },
  r9_ic_sledder: { intro: 'r9.ic.sledder', after: 'r9.ic.sledder_after', name: 'Sled Racer Juno' },
})) TALK[k] ??= v; // field-team entries above win
for (const [k, v] of Object.entries({ // r9_old_riverbed (map fill, Oct 30 2026); DRAFT lines in ./text_fallback.js
  r9_rb_spotter: { intro: 'r9.fill.r9_rb_spotter', after: 'r9.fill.r9_rb_spotter_after', name: "Birdwatcher Ash" },
})) TALK[k] ??= v; // field-team entries above win
for (const [k, v] of Object.entries({ // r9_switchbacks (map fill, Oct 30 2026); DRAFT lines in ./text_fallback.js
  r9_sw_shelf_skier: { intro: 'r9.fill.r9_sw_shelf_skier', after: 'r9.fill.r9_sw_shelf_skier_after', name: "Skier Tove" },
})) TALK[k] ??= v; // field-team entries above win
const TRAINER_DEFAULT = { intro: null, after: 'r9.trainer_after' };

export function attachRegion9(scene, { systems } = {}) {
  const sys = () => systems || scene.systems;
  const flags = scene.flags, has = (f) => flags.has(f);
  const set = (f) => { if (!flags.has(f)) (scene.setFlag ? scene.setFlag(f, true) : flags.add(f)); };
  const text = (k) => { const v = getPath(scene.lines, k); const p = Array.isArray(v) ? v : v?.pages; return p?.length ? p : fallbackText(k); };
  const say = (k, sp) => { const p = text(k); return p.length && scene.say ? scene.say(p, sp) : Promise.resolve(); };
  const ask = async (k, q) => (await scene.ask?.([...text(k), ...(q ? text(q) : [])], ['Yes', 'No'])) === 0;
  const narr = { name: null, portrait: null, battle: null };
  const fx = scene.r9fx = makeSummitFx(scene);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const warp = async (spawn, kind = 'door') => { if (!scene.startWarp) return; scene.startWarp(spawn, kind); for (let i = 0; scene.fade && i < 400; i++) await wait(25); };
  const pt = (k) => POINTS[k] || null;
  const to = (map, k) => { const p = pt(k) || POINTS[map]?.[k]; return p && { map, x: p.x, y: p.y, facing: p.facing === 'up' ? 'down' : p.facing || 'down' }; };
  const heal = () => { sys()?.party?.healAll?.(); scene.healedAt = scene.ms; };
  const partyEmpty = () => !(sys()?.party?.list || scene.party || []).length;

  /** One battle: true win, false loss. The past never blacks out: a loss heals and you try again. */
  async function fight(map, id, sp, onLoss) {
    if (partyEmpty()) { await scene.say?.(["I don't have a creature to battle with."], narr); return false; }
    const won = scene.hooks?.onBattle ? (await scene.hooks.onBattle({ map, id, forceTurnBased: true })) !== false : true;
    scene.log?.push?.({ tick: scene.tick, type: 'battle', npc: id, won });
    if (won) { scene.seen[def(`${map}.${id}`)] = true; await sys()?.onTrainerWin?.({ map, def: { id, kind: 'trainer' }, speaker: sp }); return true; }
    if (onLoss) await onLoss(); // the trainer's battle_won line comes before the patch-up / blackout
    if (isPast(map)) { heal(); await say('fin.retry_heal', narr); return false; }
    const out = await sys()?.onTrainerLoss?.({ map, def: { id } }); if (!out) await sys()?.onPartyFainted?.();
    return false;
  }

  async function talk({ mapName, def: d, speaker }) {
    const t = TALK[d.id] || (d.kind === 'trainer' ? TRAINER_DEFAULT : { say: 'r9.trainer_after' });
    const sp = t.name ? { ...speaker, name: t.name } : speaker;
    if (d.id === 'fin_t_coralie') return coralieTalk(sp);
    // Text Bot lines (data/textbot_flashback_lab_v2.json -> overworld_lines maps.<map>.<id>, Oct 30 2026): pages = challenge,
    // battle_lost = the trainer lost (player won), battle_won = the trainer won (player lost), after = later talks.
    const L = scene.lines?.maps?.[mapName]?.[d.id];
    if (L?.battle_lost && !t.say) {
      const lsp = L.name ? { ...speaker, name: L.name } : sp, says = (pages) => (pages?.length && scene.say ? scene.say(pages, lsp) : Promise.resolve());
      if (scene.seen[def(`${mapName}.${d.id}`)]) return says(L.after || L.battle_lost);
      if (t.needs && !has(t.needs) && !scene.devMasterKey) return say(t.wait, lsp);
      await says(L.pages);
      if (!(await fight(mapName, d.id, lsp, () => says(L.battle_won)))) return;
      await says(L.battle_lost);
      if (t.flag) set(t.flag);
      return;
    }
    if (t.say && t.shop) { await say(t.say, sp); return scene.systems?.openShop?.(); }
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
    if (!has('fin_released')) { await say('fin.dome_touch', narr); await fx.breakTank?.(); set('fin_released'); }
    await say('fin.released', narr);
    for (let i = 0; i < R9.phases.length; i++) {
      await say(`fin.battle.phase_${i + 1}`, narr);
      const won = scene.hooks?.onBattle ? (await scene.hooks.onBattle({ map: R9.guardianMap, id: R9.phases[i], forceTurnBased: true })) !== false : true;
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
      // story_beats.md F5 (rewritten for Gary Q-W14, 11:09 PM CT): the release is never shown. Flashback (optional),
      // then a loading screen home at dawn. The walk to work, the RT report and the four follow in reportAtWork(); credits 2 come after the memory is lost.
      if (WELLSPIRE_OPTS.collapseShown) await say('fin.never.collapse', narr); // Q-W10: off (found by absence)
      if (WELLSPIRE_OPTS.dreamVariant) { await warp(FLASHBACK.to, 'ending'); await say('dream.post_e2', narr); }
      set(FLASHBACK.done);
      await warp(FLASHBACK.home, 'ending');
      set('fin_woke_home'); set('spring_running');
      await say('fin.home.wake', narr);
      await say('fin.never.letter_blank', narr);
      await say('fin.never.mum', { name: 'Mum' });
      await say('fin.home.to_work', narr);
      scene.log?.push?.({ tick: scene.tick, type: 'ending', step: 'ending2' });
    } finally { release(); }
  }

  /** Clouds part, light, shake: the towering Ondravel (summit_fx.js). Runs every visit (short after the first). */
  async function summitReveal() {
    const c = fx.centre(); if (!c) return;
    const first = !has('fin_summit_seen'); fx.active = true; fx.row = 0;
    try {
      fx.cloud = 1; if (first) await say('fin.summit.clouds', narr);
      await fx.pan(c, first ? 1600 : 700);
      const shake = fx.shake(first ? 1400 : 600, first ? 9 : 5);
      await fx.tween(first ? 2400 : 900, (e) => { fx.cloud = 1 - e; fx.light = e; }); await shake;
      fx.row = 1; if (first) await say('fin.summit.reveal', narr);
      await fx.flashOut('200,160,255', 140, 700); fx.row = 2; await fx.shake(500, 6);
      if (first) await say('fin.summit.flare', narr);
      if (first) { // short face-off: the player, then the Guardian, eye to eye, before the light takes you back
        const p = scene.player?.pixel?.(); if (p) await fx.pan({ x: p.px + 32, y: p.py + 32 }, 900);
        fx.row = 1; await say('fin.summit.faceoff', narr); await fx.pan(c, 700); await fx.shake(400, 4); }
      set('fin_summit_seen');
    } finally { fx.cloud = 0; fx.active = false; await fx.release(700); }
  }

  const SPOTS = {
    r9_cloudway_note: () => say('r9.cloudway_note', narr), r9_cloudway_note_2: () => say('r9.cloudway_note_2', narr),
    r9_echo_note: () => say('r9.echo_note', narr), r9_echo_note_2: () => say('r9.echo_note_2', narr),
    r9_cloudline_note: () => say('r9.cloudline_note', narr), r9_cloudline_note_2: () => say('r9.cloudline_note_2', narr),
    r9_heart_note: () => say('r9.heart_note', narr), r9_heart_note_2: () => say('r9.heart_note_2', narr),
    fin_summit_cairn: () => say(has('ending2_done') ? 'fin.never.summit_empty' : 'fin.summit_cairn', narr),
    fin_past_logbook: () => say('fin.past_logbook', narr),
    r9_riverbed_entry: async () => { if (has('ending2_done')) return say('r9.gone_riverbed', narr); if (await ask('r9.riverbed_entry', 'r9.riverbed_entry_ask')) await warp(to('r9_old_riverbed', '_arrive_riverbed')); },
    r9_riverbed_up: async () => { await say('r9.riverbed_up', narr); await warp(to('r9_cairnfold', 'r9_cairnfold_down')); },
    r9_cairnfold_down: async () => { await say('r9.cairnfold_down', narr); await warp(to('r9_old_riverbed', 'r9_riverbed_up')); },
    r9_name_sign: () => say('r9.name_sign', narr), r9_riverbed_marks: () => say('r9.riverbed_marks', narr),
    r9_cairnfold_sign: () => say('r9.cairnfold_sign', narr), r9_kid_drawing: () => say('r9.kid_drawing', narr),
    r9_lodge_legend: () => say('r9.lodge_legend', narr), r9_skylift_notice: () => say('r9.skylift_notice', narr),
    r9_skylift_entry: async () => {
      if (has('ending2_done')) return say('r9.gone_skylift', narr);
      if (!(await ask('r9.skylift_entry', 'r9.skylift_entry_ask'))) return;
      scene.lastDoor = { ...R9.liftDoor }; // the upper station's door leads out into Cairnfold
      await warp({ map: 'r9_skylift_upper', x: 9, y: 11, facing: 'up' });
    },
    r9_skylift_down: async () => { if (await ask('r9.skylift_down')) await warp(to('frostspire_lift_int', 'r9_skylift_entry')); },
    r9_switchbacks_up: async () => { await say('r9.switchbacks_up', narr); await warp(to('r9_icefall', '_arrive_icefall')); },
    r9_icefall_signal: () => say('r9.icefall_signal', narr),
    fin_camp_supplies: () => say('summit.camp_supplies', narr), fin_camp_mast: () => say('summit.camp_mast', narr),
    r9_riverbed_gully: () => say('r9.fill.r9_riverbed_gully', narr),
    r9_switchbacks_cairn: () => say('r9.fill.r9_switchbacks_cairn', narr),
    r9_icefall_pool: () => say('r9.icefall_pool', narr), r9_icefall_pegs: () => say('r9.icefall_pegs', narr),
    r9_icefall_carving: () => say('r9.icefall_carving', narr),
    fin_camp_fire: async () => { heal(); await say('summit.camp_fire', narr); },
    fin_spire_door: async () => {
      if (!has('found_team_summit')) return say('summit.spire_door_wait', narr);
      await say('summit.spire_door', narr); await warp(to('fin_lab1_now_f1', '_arrive_spire'));
    },
    r9_spire_f1_nursery: () => say('r9.spire_f1_nursery', narr), r9_spire_f2_chair: () => say('r9.spire_f2_chair', narr),
    r9_spire_f3_growth: () => say('r9.spire_f3_growth', narr),
    fin_dome: async () => {
      if (has('fin_guardian_beaten')) return say('fin.epilogue.bench', narr);
      await summitReveal();
      await say('fin.guardian_plea_1', narr); await say('fin.guardian_plea_2', narr); await say('fin.guardian_plea_3', narr);
      if (!(await ask('fin.guardian_plea_ask'))) return;
      set('fin_timeslip');
      fx.row = 2; await fx.flashOut('190,140,255', 400, 300);
      await say('fin.timeslip', narr);
      fx.row = null; fx.light = 0; fx.flash = 0; scene.camFocus = null;
      await warp(to('fin_past_station_m', '_arrive_past_m'), 'ending');
      await say('fin.past_arrive', narr);
    },
    fin_reader: () => say('fin.reader_reject', narr),
    fin_sluice: () => say(has('fin_past_m_done') ? 'fin.m.sluice' : 'fin.m.sluice_shut', narr),
    fin_t_tide_door: () => say(has('fin_coralie_door') ? 'fin.t.tide_door' : 'fin.t.tide_door_shut', narr),
    fin_test8_plug: () => plug(null),
    fin_lab1_window: () => say(has('fin_spire_floor_4') ? 'fin.lab1.window_lights' : 'fin.lab1.window_storm', narr),
    fin_past_dome: () => (has('fin_guardian_beaten') ? say('fin.past_dome_after', narr) : !has('fin_enc_lead_beaten') && !scene.devMasterKey ? say('fin.enc.tank_locked', narr) : guardian()),
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

  async function flashback() {
    const release = scene.lockSave?.('wellspire_flashback') || (() => {});
    try {
      set(FLASHBACK.done);
      await warp(FLASHBACK.to, 'ending'); // loading screen into the flashback tiles
      await say('dream.post_e2', narr);
      await warp(FLASHBACK.home, 'ending'); // loading screen back to the player's house
      if (FLASHBACK.after) await FLASHBACK.after({ scene, say, narr, set, has, warp });
    } finally { release(); }
  }
  async function walkToWork() { // F5-2b: the trickle by the bridge, Ron and the bins, one big wet print heading downstream
    set(REPORT.walked);
    await say('fin.walk.spring', narr);
    await say('fin.walk.ron', narr);
  }
  async function reportAtWork() { // F5-4 to F5-6
    const release = scene.lockSave?.('wellspire_report') || (() => {});
    try {
      await say('fin.report.form', narr); // RITA's form: already open, titled with your ID, the body blank
      set('fin_reported_rt');
      const m = scene.map, p = scene.player, spots = [[-2, -2], [-1, -2], [1, -2], [2, -2]];
      REPORT.four.forEach(([id], i) => { try {
        const d = m?.name === REPORT.work.map && REPORT.work.desks?.[i], q = d ? { x: d[0], y: d[1] } : { x: p.x + spots[i][0], y: p.y + spots[i][1] };
        if (!m?.isWalkable?.(q.x, q.y) || m?.npcAt?.(q.x, q.y) || !scene.npcs?.list) return;
        const n = new Npc({ id: `r9_report_${id}`, kind: 'object', x: q.x, y: q.y, facing: 'down', story: true }, m.name, scene.spriteMap?.[`lantern_rest.${id}`] || null, false);
        n.behaviour = 'static'; n.faceToward?.(p.x, p.y); scene.npcs.list.push(n); m.occupy?.(n.x, n.y, n); scene.story?.loadImgs?.(n);
      } catch { /* a missing sprite never blocks the scene */ } });
      await say('fin.report.arrive', narr);
      set('field_team_home'); // Ending 2 only, after fin_reported_rt
      await scene.r9fx?.flashOut?.('232,228,244', 1400, 2400); // the memory fades: the River motif swells, then cuts
      set('fin_memory_lost');
      await say('fin.report.greeting', { name: 'Teo' });
      await say('fin.report.teo_list', narr);
      set('wellspire_gone'); set('ending2_done');
      const record = { ...(scene.gameCleared || {}) };
      try { await (await import('../ui/credits.js?v=v0.2.106-alpha')).runCredits(scene, record, { variant: 'ending2' }); } catch (e) { console.error('credits 2:', e); }
      await say('fin.epilogue.postgame', narr);
      scene.log?.push?.({ tick: scene.tick, type: 'ending', step: 'ending2' });
    } finally { release(); }
  }
  function coralieDue() {
    const c = CORALIE_COVE, p = scene.player;
    return WELLSPIRE_OPTS.coraliePresent && has(c.flag) && !has(c.done) && scene.map?.name === c.map && p && Math.abs(p.x - c.x) <= c.r && Math.abs(p.y - c.y) <= c.r;
  }
  async function coralieCove() {
    set(CORALIE_COVE.done);
    try { // present-day Coralie walks up beside you at the cove and stays there
      const p = scene.player, m = scene.map;
      const c = [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy })).find((q) => m?.isWalkable?.(q.x, q.y) && !m?.npcAt?.(q.x, q.y));
      if (c && scene.npcs?.list) {
        const n = new Npc({ id: 'r9_coralie_cove', kind: 'object', x: c.x, y: c.y, facing: 'down', story: true }, m.name, scene.spriteMap?.['tidewater_coast.r9_coralie_cove'] || scene.spriteMap?.['fin_past_signal_lab.fin_t_coralie'] || null, false);
        n.behaviour = 'static'; n.faceToward?.(p.x, p.y); scene.npcs.list.push(n); m.occupy?.(n.x, n.y, n); scene.story?.loadImgs?.(n);
      }
    } catch { /* the line still plays without her sprite */ }
    await say('fin.epilogue.coralie', { name: 'Coralie' }); // canon F3 line, unchanged
  }
  function tick() {
    if (scene.busy || scene.paused || scene.fade || scene._r9Courier) return;
    if (has(FLASHBACK.flag) && !has(FLASHBACK.done)) { scene._r9Courier = true; scene.script(flashback).finally(() => { scene._r9Courier = false; }); return; }
    if (has('fin_woke_home') && !has(REPORT.walked) && scene.map?.name === REPORT.walk) { scene._r9Courier = true; scene.script(walkToWork).finally(() => { scene._r9Courier = false; }); return; }
    if (has('fin_woke_home') && !has('fin_reported_rt') && scene.map?.name === REPORT.work.map) { scene._r9Courier = true; scene.script(reportAtWork).finally(() => { scene._r9Courier = false; }); return; }
    if (has('ending2_done') && !has('post_duty_board_seen') && scene.map?.name === REPORT.work.map) { set('post_duty_board_seen'); scene._r9Courier = true; scene.script(async () => { await say('post.duty_board_home', narr); await say('fin.never.teams_home', narr); }).finally(() => { scene._r9Courier = false; }); return; }
    if (coralieDue()) { scene._r9Courier = true; scene.script(coralieCove).finally(() => { scene._r9Courier = false; }); return; }
    if (courierDue(flags, scene.map?.name)) { scene._r9Courier = true; scene.script(courier).finally(() => { scene._r9Courier = false; }); }
  }

  scene.talkHooks = scene.talkHooks || [];
  scene.talkHooks.push({ match: (m, d) => !!d?.region9, run: (ctx) => talk(ctx) });
  // Ending 2 (Text Bot DRAFT, data/textbot_flashback_lab.json): Ron at home after the river comes back
  scene.talkHooks.push({ match: (m, d) => /^house_1f(_v2)?$/.test(m) && d?.id === 'ron' && has('ending2_done'), run: ({ speaker }) => say('fin.e2.ron', speaker || { name: 'Ron' }) });
  const iv = typeof setInterval !== 'undefined' && typeof window !== 'undefined' ? setInterval(() => { try { tick(); } catch (e) { console.error('region9 tick:', e); } }, 1000) : null;
  const api = { walkToWork, reportAtWork, flashback, coralieCove, runSpot, warpBlocked, edgeBlocked, tick, courier, guardian, finale, text, SPOTS, stop: () => iv && clearInterval(iv) };
  scene.region9 = api;
  return api;
}
