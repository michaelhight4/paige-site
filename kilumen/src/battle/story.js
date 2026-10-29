// Story results of trainer battles (dev build, battles default v1, Oct 23, 2026). Source: CRITICAL_PATH.md §2
// (art/world/overworld) and text/overworld_lines.json notes; no new story content here.
//  - step 2: Fernwick rival battle 1 vs Ron. He hands over the Trail Runners WIN OR LOSE (items.running_shoes),
//    so a loss doesn't black out and the story goes on. `beat_rival_ron_1` is set on a win only (open question
//    for Gary: the CP table lists it for step 2 without saying "on a win").
//  - step 3: the Master of Fernwick sets `beat_master_fernwick` (opens gate_brookhollow_east).
//  - Ron rival battles 2-6 (Gary, Oct 23, 2026, 9:05 AM CT): a loss blacks out to the last clinic AND the player must
//    beat Ron to progress: `beat_rival_ron_<n>` (the quest/story gate) is set on a win only, `defeated:` stays unset so
//    he can be rematched until won. `blackoutOnLoss` forces the blackout even if the engine left a creature standing.
//    Battle 1 above is unchanged (continueOnLoss).
// Every other trainer: no flags (prize money only, Systems.onTrainerWin).
export const TRAINER_RESULTS = {
  'fernwick.ron_rival_1': { win: ['beat_rival_ron_1'], either: ['has_run_shoes'], continueOnLoss: true, gift: 'running_shoes' },
  'fernwick_hall_int.master_fernwick': { win: ['beat_master_fernwick'] },
};

/** Ron rival battles 2-6: World Design map NPC (map.id) -> battle number. */
export const RON_RIVALS = {
  'saltmere.saltmere_ron_2': 2,
  'revival_heights.revival_heights_ron_3': 3,
  'frostspire_pass.frostspire_pass_ron_4': 4,
  'aurelith.aurelith_ron_6': 6,
};
// Ron 5 at Tidewater (G3, story_beats R6 §5, dev/r56-wiring): OPTIONAL. Exempt from the Ron 2-6 hard gate: a loss is a normal
// blackout but blocks nothing and closes the fight (no forced rematch). Win, loss: met_ron_tidewater + ron5_fought + the umbrella.
// Decline / rematch / missed parting: src/region56/ron5.js. The Lanternport catch-up was removed (story_beats §L: Lanternport is a talk-only page hand-off).
RON_RIVALS['tidewater_coast.tidewater_coast_ron_5'] = 5;
RON_RIVALS['tidewater_coast.tidewater_coast_ron_5_slip'] = 5; // harbour slip rematch (after a decline, until beat_master_tidewater)
export const RON_OPTIONAL = new Set([5]);
export const RON5_EITHER = ['met_ron_tidewater', 'ron5_fought', 'has_rons_umbrella'];
for (const [k, n] of Object.entries(RON_RIVALS)) {
  TRAINER_RESULTS[k] = RON_OPTIONAL.has(n)
    ? { win: [`beat_rival_ron_${n}`], either: [...RON5_EITHER], optional: true }
    : { win: [`beat_rival_ron_${n}`], blackoutOnLoss: true };
}
// Final Ron (Ron 7, tower bottom; ron_team.js RON_FINAL): a win sets both ending flags ending.js ENDING.tower checks.
TRAINER_RESULTS['aurelith_arena_int.aurelith_arena_ron_final'] = { win: ['beat_n_ron_7', 'ron_final_beaten'], blackoutOnLoss: true };

/** What a trainer battle result does to the story. -> {flags[], continueOnLoss, gift|null, done[, blackoutOnLoss]} */
export function trainerOutcome(mapName, id, won) {
  const r = TRAINER_RESULTS[`${mapName}.${id}`] || {};
  const flags = [...(won ? r.win || [] : []), ...(r.either || [])];
  const cont = !!r.continueOnLoss;
  const out = { flags, continueOnLoss: cont, gift: r.gift || null, done: won || cont || !!r.optional };
  if (r.optional) out.optional = true; // Ron 5: never a progression gate // done = don't re-challenge (defeated:)
  if (r.blackoutOnLoss && !cont) out.blackoutOnLoss = true; // Ron 2-6: a loss always goes back to the last clinic
  return out;
}
