// Story results of trainer battles (dev build, battles default v1, Oct 23, 2026). Source: CRITICAL_PATH.md §2
// (art/world/overworld) and text/overworld_lines.json notes; no new story content here.
//  - step 2: Fernwick rival battle 1 vs Ron. He hands over the Trail Runners WIN OR LOSE (items.running_shoes),
//    so a loss doesn't black out and the story goes on. `beat_rival_ron_1` is set on a win only (open question
//    for Gary: the CP table lists it for step 2 without saying "on a win").
//  - step 3: the Master of Fernwick sets `beat_master_fernwick` (opens gate_brookhollow_east).
// Every other trainer: no flags (prize money only, Systems.onTrainerWin).
export const TRAINER_RESULTS = {
  'fernwick.ron_rival_1': { win: ['beat_rival_ron_1'], either: ['has_run_shoes'], continueOnLoss: true, gift: 'running_shoes' },
  'fernwick_hall_int.master_fernwick': { win: ['beat_master_fernwick'] },
};

/** What a trainer battle result does to the story. -> {flags[], continueOnLoss, gift|null, done} */
export function trainerOutcome(mapName, id, won) {
  const r = TRAINER_RESULTS[`${mapName}.${id}`] || {};
  const flags = [...(won ? r.win || [] : []), ...(r.either || [])];
  const cont = !!r.continueOnLoss;
  return { flags, continueOnLoss: cont, gift: r.gift || null, done: won || cont }; // done = don't re-challenge (defeated:)
}
