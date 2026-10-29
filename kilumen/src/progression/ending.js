// Kilumen: interim ending (v0.2.86-alpha, Gary approved Oct 29 2026: "after you beat the game it just keeps playing").
// The real finale (data/quests.json mq_finale s3-s9: HQ maps + confrontation) is pending Gary's story call, so until it
// is built the game ends here:
//   1. all_badges is set the moment the 8th Master coin is won (and on load for saves that already hold 8 coins).
//      It is a story flag, so setFlag() opens gate_aurelith_arena on the Aurelith map right away.
//   2. Beating Ron on the Aurelith arena steps (beat_rival_ron_6) while holding all 8 coins = game cleared:
//      Ron's closing lines + a RITA message, then the credits scroll (src/ui/credits.js). The whole thing runs inside
//      one scene script, so the save lock holds (no saving during the credits).
//   3. finale_done + the save field game_cleared {at, day, team} are set, then a warp home to Brookhollow (outside the
//      house) with a postgame note. A save that already cleared never replays it.
// Text: system_ending.* in text/overworld_lines.json when Text Bot adds it (data/textbot_requests_interim_ending.md),
// else the code fallbacks below.
import { coinCount } from '../overworld/lines.js?v=v0.2.86-alpha';

export const ENDING = {
  badges: 'all_badges', finalWin: 'beat_rival_ron_6', done: 'finale_done', coins: 8,
  ron: 'aurelith.aurelith_ron_6', save: 'game_cleared',
};

// Code fallbacks ONLY (existing written lines where they exist; new ones requested from Text Bot).
export const ENDING_FALLBACK = {
  ron_after: ['Lead the way. I\'ll try to look like I belong.'],                      // maps.aurelith.aurelith_ron_6.after
  rita: ["{employee_id}: Ron beaten on the arena steps. He's coming along.", 'Two staff, one trip. The travel budget approves.'], // system_company_voice.rival_beaten_ron_6_2
  ron_home: ['Home, then. Head Office can wait one more day.', "Somebody should take the bins out. ...Fine. Tomorrow."],
  postgame: ['GAME CLEARED.', 'Your save keeps going: catch, battle and explore anywhere you like.', 'The Aurelith Arena opens in a future update. Head Office is still up there.'],
};

/** True once 8 Master coins are held (coin flags = beat_master_*). */
export const hasAllCoins = (flags) => coinCount(flags) >= ENDING.coins;

/** Set all_badges if 8 coins are held and it is missing. scene = Overworld (setFlag opens the arena gate). -> set? */
export function syncAllBadges(scene) {
  if (!scene?.flags || scene.flags.has(ENDING.badges) || !hasAllCoins(scene.flags)) return false;
  scene.setFlag(ENDING.badges);
  return true;
}

/** The ending is due: Ron 6 beaten, all 8 coins, not cleared yet (in either order: Ron first, then the 8th coin, works too). */
export const endingDue = (flags) => flags.has(ENDING.finalWin) && flags.has(ENDING.badges) && !flags.has(ENDING.done);

/** Save field game_cleared: when, the in-game day and the team that did it. */
export function clearRecord(scene, now = Date.now()) {
  const list = scene?.systems?.party?.list || scene?.party || [];
  return {
    at: now, day: scene?.clock?.day ?? 0,
    team: list.slice(0, 6).map((c) => ({ species: c.species, nickname: c.nickname || null, level: Number.isInteger(c.level) ? c.level : null })),
  };
}

/** Normalise a loaded game_cleared field (null = never cleared). */
export function normClear(o) {
  if (!o || typeof o !== 'object' || !Number.isFinite(o.at)) return null;
  const team = Array.isArray(o.team) ? o.team.filter((c) => c && typeof c.species === 'string').slice(0, 6)
    .map((c) => ({ species: c.species, nickname: typeof c.nickname === 'string' ? c.nickname : null, level: Number.isInteger(c.level) ? c.level : null })) : [];
  return { at: o.at, day: Number.isFinite(o.day) ? o.day : 0, team };
}

const lines = (scene, key) => {
  const t = scene.text?.(`system_ending.${key}`);
  return Array.isArray(t) && t.length ? t : t?.pages || ENDING_FALLBACK[key];
};
const textOr = (scene, path, fb) => { const t = scene.text?.(path); return (Array.isArray(t) && t.length ? t : t?.pages) || fb; };

/**
 * Play the ending. Call from inside a scene script (the save lock is held by scene.busy) or it wraps itself in one.
 * opts.credits(scene, record) -> Promise (src/ui/credits.js runCredits); opts.wait(ms) for tests.
 */
export async function runInterimEnding(scene, opts = {}) {
  if (!scene.busy) { let r = false; await scene.script(async () => { r = await runInterimEnding(scene, opts); }); return r; }
  if (!endingDue(scene.flags) || scene._ending) return false;
  scene._ending = true;
  const release = scene.lockSave?.('ending') || (() => {});
  try {
    scene.log?.push({ tick: scene.tick, type: 'ending', step: 'start' });
    const ronSp = { name: 'Ron' }, ritaSp = { name: 'RITA' };
    if (!opts.onLoad) await scene.say(textOr(scene, 'maps.aurelith.aurelith_ron_6.after', ENDING_FALLBACK.ron_after), ronSp); // onLoad: an old save, the fight was long ago
    if (!opts.onLoad) await scene.say(textOr(scene, 'system_company_voice.rival_beaten_ron_6_2', ENDING_FALLBACK.rita), ritaSp);
    const record = clearRecord(scene);
    const credits = opts.credits || (async (s, r) => (await import('../ui/credits.js?v=v0.2.86-alpha')).runCredits(s, r));
    try { await credits(scene, record); } catch (e) { console.error('credits:', e); }
    scene.gameCleared = record;
    scene.setFlag(ENDING.done);
    scene.log?.push({ tick: scene.tick, type: 'ending', step: 'cleared' });
    const spawn = await scene._homeStart?.(true);
    if (spawn && scene.startWarp) {
      scene.startWarp(spawn, 'ending');
      const wait = opts.wait || ((ms) => new Promise((r) => setTimeout(r, ms)));
      for (let i = 0; scene.fade && i < 400; i++) await wait(25); // ~10 s cap
    }
    await scene.say(lines(scene, 'ron_home'), ronSp);
    await scene.say(lines(scene, 'postgame'), { name: null, portrait: null, battle: null });
    scene.log?.push({ tick: scene.tick, type: 'ending', step: 'home' });
    return true;
  } finally { scene._ending = false; release(); }
}
