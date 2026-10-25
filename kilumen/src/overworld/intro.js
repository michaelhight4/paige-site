// Home start v1 (Oct 23, 2026; DEV): the Pokemon-style new-game opening.
//   new game -> black hold until the title/UI is closed -> slow fade in on house_2f's player_start -> wake-up thought
//   (inner monologue: italic, no speaker name) -> Ron downstairs gives the morning briefing (sets talked_ron_morning)
//   -> objective "Go to the Revival Tech office". Until then the house_1f front door turns you back with a thought line.
// Then (Gary 9:22 AM CT, Text Bot OPENING_OFFICE_v1.md): office manager -> scene_promotion (flg_promoted) -> fade to the lab
//   -> cradles: scene_starter_intro / starter_confirm / scene_starter_after (got_starter) -> scene_test_run (5 dominance
//   crystals, test_run_started) -> catch + log 2 wild Kilumen (counter, thought, test_run_done) -> back in the lab:
//   scene_test_run_return + scene_job_briefing (job_briefed = free roam). Until job_briefed the map edges out of
//   brookhollow/route1 turn you back. Everything is gated on intro_new_game, so old saves keep the old flow.
// Text keys (Text Bot owns text/overworld_lines.json; FALLBACK below is code-only draft text from
// text/drafts/HOME_START_v2.md, used only while the file has no merged lines): see design/HOME_START_TEXT_NEEDS.md.
// Nothing here hard-codes an outdoor tile: the outside spawn is looked up from the warps by `to` name (World Design pads
// the outdoor maps), interiors (house_2f / house_1f) are read from their own map JSON.
import { OPPOSITE, Npc } from './npcs.js?v=v0.2.23-alpha';
import { StarterPicker } from './starter_pick.js?v=v0.2.23-alpha';
import { approach, automoveOn } from './automove.js?v=v0.2.23-alpha';
import { conga, throughDoor, spawnAhead, doorTo, ghostBystanders, ESCORT } from './escort.js?v=v0.2.23-alpha'; // office -> lab on foot, 3rd in line (Gary 2:35-2:36 PM CT) // story auto-walk (Gary, Oct 23 2026): walk up to the speaker first
import { StoryRon, STORY_RON, loadNpcImgs } from './story_ron.js?v=v0.2.23-alpha'; // Ron at work + in the lab, his partner behind him (Gary 2:21 / 2:22 PM CT)

export const HOME = {
  bedroom: 'house_2f', downstairs: 'house_1f', outside: 'brookhollow', ron: 'ron',
  started: 'intro_new_game',          // set only by a new game (old saves never get it, so they are never blocked)
  briefed: 'talked_ron_morning',      // set by Ron's briefing (Text Bot's flag name)
  past: ['flg_promoted', 'got_starter'], // story already past the morning (dev ?flags= links): no block, no briefing takeover
  objective: 'Go to the Revival Tech office',
  wakeSeen: 'intro:wake',             // seen-key: the wake-up thought plays once
  wakeFadeTicks: 75,                  // ~1.25 s at 60 Hz (a normal door fade-in is shorter)
};

// Code fallbacks ONLY (not in overworld_lines.json). Text Bot's v2 draft wording; replace by merging the keys.
export const FALLBACK = {
  player_start: [
    '...The river again. Cold water, and someone on the bank, watching.',
    'Just a dream. Probably.',
    "I smell toast downstairs. Ron's up early for once.",
    "Work's at nine. Better get down there before he eats mine.",
  ],
  ron_briefing: [
    'Morning. You look like you slept in the river.',
    "Work's been dead all week. They cleared out three desks on Friday.",
    'And now the boss wants to see us both. First thing. No reason given.',
    "That's either really good or really bad. My money's on bad.",
    "Field office, same as always. Go on, I'll be right behind you.",
    "And don't be late. I'm not covering for you again.",
  ],
  ron_repeat: ['Field office, {nick}. The boss is waiting.', "If it's layoffs, at least we'll know by lunch."],
  door_block: ["Ron's waving me over. I should see what he wants first."],
};

export const THOUGHT = { name: null, portrait: null, battle: null, thought: true };

const pagesOf = (v) => (Array.isArray(v) ? v : v?.pages || (typeof v === 'string' ? [v] : null));

/** A new game: no ?map= start and no saved position (Continue / old saves always have one). */
export const isNewGame = (opts = {}) => !opts.start && !opts.saveData?.pos;

/** New-game spawn: the bedroom map's own player_start (top-level, or its kind:'spawn' npc). */
export function bedroomSpawn(json) {
  const ps = json?.player_start || (json?.npcs || []).find((n) => n.kind === 'spawn' || n.id === 'player_start');
  if (!ps) return null;
  return { map: json.name || HOME.bedroom, x: ps.x, y: ps.y, facing: ps.facing || 'down' };
}

/** "Start outside as before" (?skipintro=1): where the front door of house_1f lets you out, found by warp `to` name.
 *  Prefers the house's own door warp (to: brookhollow, tx/ty kept in sync by World Design), else the outdoor warp
 *  to house_1f + one tile below it. Null if neither exists (caller falls back to CONFIG.start). */
export function outsideSpawn(houseJson, outsideJson) {
  const out = (houseJson?.warps || []).find((w) => w.to === HOME.outside && Number.isFinite(w.tx));
  if (out) return { map: HOME.outside, x: out.tx, y: out.ty, facing: out.facing || 'down' };
  const door = (outsideJson?.warps || []).find((w) => w.to === HOME.downstairs);
  if (door) return { map: HOME.outside, x: door.x, y: door.y + 1, facing: 'down' };
  return null;
}

/** True when Text Bot's merged lines already carry the morning flow (a Ron line keyed on talked_ron_morning). */
export function ronMerged(entry) {
  return !!(entry?.lines || []).some((l) => (l.flags || []).includes(HOME.briefed));
}

/** Story still in the morning: a new game that hasn't been promoted / got a starter yet. */
export function inMorning(flags) {
  return flags.has(HOME.started) && !HOME.past.some((f) => flags.has(f));
}

/** The front door of house_1f is blocked: new game, morning, briefing not heard yet. */
export function doorBlocked(flags, mapName, warp) {
  return mapName === HOME.downstairs && warp?.to === HOME.outside && inMorning(flags) && !flags.has(HOME.briefed);
}

// ---- office -> promotion -> starter -> test run -> job briefing (Gary 9:22 AM CT; Text Bot OPENING_OFFICE_v1) ----------
export const OPEN = {
  office: 'office_int', manager: 'manager', lab: 'lab_brookhollow', researcher: 'lab_brookhollow_researcher',
  promoted: 'flg_promoted', starter: 'got_starter', runStarted: 'test_run_started', runDone: 'test_run_done', briefed: 'job_briefed',
  need: 2,                        // creatures caught AND registered in the Kilindex for the test run
  crystals: 5, crystalItem: 'dominance_crystal', // handed over with scene_test_run (Game dev's call: 5 = 2 catches + misses)
  area: ['brookhollow', 'route1'], // the starting area: until job_briefed you can't leave it (route1 only once the run starts)
  base: 'test_run_base', logged: 'test_run_logged', // counters (save.js keeps any finite counter)
  introSeen: 'intro:starter_intro',
  ritaFlag: 'rita_installed',       // the lab tech installed RITA (company_voice.js RITA_INSTALLED: nothing of hers before it)
  cradles: { cradle_1: 'nibbin', cradle_2: 'cindrip', cradle_3: 'rillop' }, // fallback only (Nibbin replaced Tumbloam, Oct 23 2026): systems cfg.starterCradles wins
  objectives: {
    office: 'Go to the Revival Tech office', lab: 'Pick a partner at the lab',
    run: (n, need) => `Test run: catch and log ${need} wild Kilumen (${n}/${need})`, back: 'Return to the lab',
  },
};

// Code fallbacks ONLY (Text Bot's OPENING_OFFICE_v1.md). "WHO: text" pages: the tag picks the speaker (see SPEAKERS).
export const FALLBACK_OFFICE = {
  scene_promotion: [
    "MANAGER: Sit down. Relax, this isn't that conversation.",
    'MANAGER: Our field team stopped reporting in. All of them. Two weeks now.',
    'MANAGER: Their last check-in came from Greystone Caverns. Since then, nothing.',
    "RON: So the desks on Friday... that wasn't layoffs?",
    "MANAGER: No. That was us boxing up their things. Which I'd like to undo.",
    'MANAGER: As of today, you two are field researchers. Congratulations.',
    'RON: Is there a raise in this?',
    "MANAGER: There's a creature in this. Lab's next door. Come on.",
  ],
  manager_starter_repeat: ["The lab's next door. Your partner's waiting."],
  scene_starter_intro: [ // 4 pages (OPENING_OFFICE_v1.md, 9:36): the golden arrows over the cases start on page 2
    "LAB TECH: Three cradles. Three creatures. Each one's been raised here since it hatched.",
    'MANAGER: They\'re in the cases with the lights spinning over them. Go and look.',
    "MANAGER: Pick one. You'll be together a long while, so don't just go by looks.",
    "RON: I'm going by looks.",
  ],
  starter_confirm: ['Take {lead} as your partner?'],
  scene_starter_after: ["RON: Then I'll take this one. It looked at me first.", "LAB TECH: {lead} seems to like you. That's a good start."],
  scene_test_run: [
    'MANAGER: Before anyone signs anything, a test run.',
    'MANAGER: Go out to the tall grass. Catch two wild creatures and log them in the Kilindex.',
    "MANAGER: These crystals are on the company. Hold one up when a creature's worn down.",
    "MANAGER: Two creatures, logged. Then come back here. Don't wander off to Fernwick.",
    'RON: Race you.',
    "MANAGER: It's not a race. ...Fine. It's a race.",
  ],
  crystals_received: ['Got {count} dominance crystals.'],
  manager_test_run_repeat: [
    'Two wild creatures, caught and logged. Tall grass is just outside town.',
    "Wear one down first, then hold a crystal up. Don't waste them.",
  ],
  test_run_progress: ['Test run: {n}/{need} logged.'],
  test_run_logged: ["That's two in the Kilindex. Time to head back to the lab."],
  scene_test_run_return: [
    'MANAGER: Two logged. Clean entries, too. Nice work.',
    'RON: I got mine first, for the record.',
    'MANAGER: Noted. Ignored. Now, the actual job.',
  ],
  scene_job_briefing: [
    'MANAGER: Raise your creatures. Find as many kinds as you can. Log every one.',
    "MANAGER: And keep an ear out for the field team. Greystone's where they went quiet.",
    "MANAGER: Now, pay. You're not on the clock anymore. You're paid on progress.",
    'MANAGER: Coins won, creatures logged, reports filed. No progress, no pay.',
    'RON: So no more paid lunch breaks.',
    'MANAGER: Correct. So get to work.',
  ],
  // maps.brookhollow.ron_too_dangerous (OPENING_OFFICE_v1.md): default = not flg_promoted; promoted = flg_promoted, no got_starter
  ron_too_dangerous: {
    default: [
      'Hey! Hey. Where do you think you\'re going?',
      "That grass is full of wild creatures, and you've got nothing on you.",
      "Too dangerous out there alone. Work's this way. Come on.",
    ],
    promoted: [
      "Whoa. Field researcher for five minutes and you're already off?",
      'Not without a creature. The wild out there would eat you alive.',
      "Lab first. Come on, I'll walk you back.",
    ],
  },
  // story Ron between beats (Gary 2:21 PM CT): keys requested in data/textbot_requests_nibbin_starter.md (maps.lab_brookhollow.ron_story_*)
  ron_story: {
    office: ["Go on. The boss is right there."],
    lab: ["Go on, pick one. I'm going by looks."],
    back: ['I got mine first, for the record.'],
  },
  picker_title: 'Choose your partner', // [TODO Text Bot: system_opening.starter_picker_title]
  cradle_not_yet: ["Those cradles aren't for me. Not yet, anyway."],
  // RITA install (Gary 3:58 / 3:59 PM CT Oct 23 2026: the lab guy "installs Rita" during the tutorial, before you choose a
  // kilumen). Code defaults; Text Bot keys maps.lab_brookhollow.scene_rita_install / rita_install_progress
  // (data/textbot_requests_rita_install.md).
  scene_rita_install: [
    'LAB TECH: Oh, one more thing before you pick. Your device, please. I need to install RITA.',
    'LAB TECH: Resource Inventory and Tracking Assistant. Cutting-edge AI, built to assist the field teams.',
    "LAB TECH: She tracks your creatures, your crystals, your progress. She's very helpful. She'll tell you so herself.",
    'LAB TECH: She also has a bit of a personality. Revival Tech calls that a feature.',
  ],
  rita_install_progress: ['Installing RITA... 100%. The device chimes.'],
  // Escort walk beats (Gary 4:00 PM CT: "the walk is supposed to give the story body"). Text Bot keys
  // maps.brookhollow.escort_street / escort_midway (same request file).
  escort_street: ["MANAGER: Lab's down by the river. Stay close, and don't stop to pet anything."],
  escort_midway: [
    "RON: So what's the lab like?",
    "MANAGER: Clean. Quiet. Expensive. Don't touch anything you can't afford.",
    'RON: So... nothing.',
  ],
  leave_block: {
    office: ['Work first. The office is back in town.'],
    lab: ['Not without a partner. The lab first.'],
    run: ["Two creatures, then back to the lab. Fernwick can wait."],
    back: ['The lab first. They want those two logged.'],
  },
};

export const SPEAKERS = { MANAGER: 'Manager', RON: 'Ron', 'LAB TECH': 'Lab Tech' };

/** "WHO: text" pages -> runs of { speaker, pages } (consecutive same speaker = one dialog). Untagged pages keep `dflt`.
 *  Also accepts { speaker|who, text } page objects (if Text Bot merges that shape). */
export function speakerRuns(pages, dflt = null) {
  const runs = [];
  for (const pg of pages || []) {
    let who = null, text = pg;
    if (pg && typeof pg === 'object') { who = pg.speaker || pg.who || null; text = pg.text ?? pg.page ?? ''; }
    else { const m = /^(MANAGER|RON|LAB TECH):\s*/.exec(String(pg)); if (m) { who = m[1]; text = pg.slice(m[0].length); } }
    const name = who ? (SPEAKERS[String(who).toUpperCase()] || who) : dflt;
    const last = runs[runs.length - 1];
    if (last && last.name === name) last.pages.push(text); else runs.push({ name, pages: [text] });
  }
  return runs;
}

/** Owned creatures (team + Archive) that are registered in the Kilindex (no Kilindex module: every owned one counts). */
export function ownedLogged(scene) {
  const sys = scene.systems, kx = sys?.kilindex?.data?.caught || sys?.kilindex?.toJSON?.()?.caught || null;
  const all = sys ? [...(sys.party?.list || []), ...(sys.archive?.boxes || []).flat()] : [...(scene.party || [])];
  return all.filter((c) => c && (!kx || kx[c.species])).length;
}

/** Leaving the starting area by a map edge is refused: new game, job not briefed yet, and the exit leaves
 *  brookhollow/route1 (before the test run even route1 is closed: no partner yet). Padding-safe: by `to` name only. */
export function leaveBlocked(flags, mapName, exit) {
  if (!exit || !flags.has(HOME.started) || flags.has(OPEN.briefed)) return false;
  if (!OPEN.area.includes(mapName)) return false;
  return !(flags.has(OPEN.runStarted) && OPEN.area.includes(exit.to));
}

/** Ron catch (Gary 9:36 AM CT): no starter yet (no got_starter AND an empty party) and a map edge out of brookhollow.
 *  Applies to every save (old alpha saves with no creature too), never once a starter exists. Padding-safe: edge exits only. */
export function ronCatchApplies(flags, mapName, exit, partySize) {
  return !!exit && mapName === HOME.outside && !flags.has(OPEN.starter) && !(partySize > 0);
}

/** ron_too_dangerous variant by flag: 'promoted' (flg_promoted, no got_starter) or 'default'. */
export const ronCatchVariant = (flags) => (flags.has(OPEN.promoted) && !flags.has(OPEN.starter) ? 'promoted' : 'default');

/** Inward step for an exit's edge (back into town). */
export const INWARD = { north: 'down', south: 'up', east: 'left', west: 'right' };

/** Party size from systems (live list) or the scene. */
export const partySize = (scene) => (scene.systems?.party?.list || scene.party || []).length;

/** Starter cases (lab interact spots that are cradles) -> marker spots, once the arrows are on. */
export function cradleSpots(map, cradles) {
  return (map?.json?.text_pending?.interact_spots || []).filter((sp) => cradles[sp.id]).map((sp) => ({ x: sp.x, y: sp.y, up: 0.55, id: sp.id })); // tip just above the case glass (cases ~1.5 tiles tall)
}

/** Objective stage key (office / lab / run / back) or null. */
export function stageFor(flags) {
  if (!flags.has(HOME.started) && !flags.has(HOME.briefed) && !flags.has(OPEN.runStarted)) return null;
  if (flags.has(OPEN.briefed)) return null;
  if (flags.has(OPEN.runDone)) return 'back';
  if (flags.has(OPEN.runStarted)) return 'run';
  if (flags.has(OPEN.promoted)) return flags.has(OPEN.starter) ? null : 'lab';
  return flags.has(HOME.briefed) ? 'office' : 'ron';
}

/** Current objective text for the HUD / tests (null = nothing to show). */
export function objectiveFor(flags, counters = {}) {
  const st = stageFor(flags), O = OPEN.objectives;
  if (!st) return null;
  if (st === 'ron') return 'Talk to Ron downstairs';
  if (st === 'run') return O.run(Math.min(OPEN.need, counters[OPEN.logged] || 0), OPEN.need);
  return O[st];
}

export class HomeStart {
  /** @param {import('./overworld.js?v=v0.2.23-alpha').Overworld} scene  @param {{newGame:boolean, gate?:()=>boolean}} opts */
  constructor(scene, opts = {}) {
    this.scene = scene; this.newGame = !!opts.newGame; this.gate = opts.gate || null;
    this.holding = false; this.wakePending = false; this._gateSince = null;
    this.arrowsOn = false;  // starter-case arrows: on from scene_starter_intro page 2 until got_starter
    this.picker = null;     // StarterPicker (DOM), made on first use; null in node tests
    this.catchRon = null;   // the temporary Ron of the "too dangerous" catch while he is on the map
    this.story = new StoryRon(this); // story Ron (office / lab), house_1f Ron away, Ron's partner follower (story_ron.js)
  }

  /** After the first map is loaded (init). New game: mark it, hold on black, wake-up thought after the fade. */
  begin() {
    const s = this.scene;
    if (!this.newGame) return;
    if (!s.flags.has(HOME.started)) s.setFlag(HOME.started);
    if (s.map?.name === HOME.bedroom && !s.seen[HOME.wakeSeen]) {
      this.wakePending = true; this.holding = true;
      s.fade = { phase: 'hold', t: 0, len: HOME.wakeFadeTicks }; s.player.locked = true;
      s.log.push({ tick: s.tick, type: 'intro', step: 'hold' });
    }
  }

  /** Every tick (Overworld.step). Leaves the black hold once the title / UI is closed; then plays the wake thought. */
  tick() {
    const s = this.scene;
    if (!this._qPatched && s.progression?.quests) this._patchQuests(s.progression.quests);
    if (this._tripPending && !s.busy && !s.fade && !s.dialog?.active) { this._tripPending = false; s.script(() => this.walkToLab()); }
    if (this.holding) {
      const blocked = this.gate ? this.gate() : false;
      if (this._gateSince == null) this._gateSince = s.tick;
      // safety: a UI that never mounts can't keep the screen black (10 s), but an open title holds as long as it's open
      if (blocked && !(blocked === 'loading' && s.tick - this._gateSince > 600)) return;
      this.holding = false; s.fade.phase = 'in'; s.fade.t = 0;
      s.log.push({ tick: s.tick, type: 'intro', step: 'fadeIn' });
      return;
    }
    if (this.wakePending && !s.fade && !s.busy && !(this.gate && this.gate() === true)) {
      this.wakePending = false;
      s.log.push({ tick: s.tick, type: 'intro', step: 'wake' });
      // save lock: wakeSeen is marked after script()'s checkpoint, so a close mid-thought replays the wake-up
      s.script(() => { s.seen[HOME.wakeSeen] = true; s._dirty = true; return this.wake(); });
      return;
    }
    this.story.tick();
    this._tickAuto();
    this._tickRun();
    this._tickReturn();
    this._tickLab();
    this._tickCatchRon();
  }

  // ---- story auto-walk (automove.js; Gary Oct 23 2026: "force the players movements into the conversation same as pokemon")
  /** Beats that wait for a talk start by themselves on arrival: spark, the player walks up, then the normal talk.
   *  Ron's morning briefing (house_1f) and the manager's promotion (office_int). Off with ?automove=0. */
  _tickAuto() {
    const s = this.scene, F = s.flags, map = s.map?.name;
    if (map !== this._autoMap) { this._autoMap = map; this._autoFired = new Set(); } // once per visit
    if (!this._autoReady()) return;
    if (map === HOME.downstairs && inMorning(F) && !F.has(HOME.briefed)) this._autoTalk('briefing', HOME.ron, (n, pre) => this.onTalk(n, n.def, pre));
    else if (map === OPEN.office && F.has(HOME.started) && F.has(HOME.briefed) && !F.has(OPEN.promoted) && !F.has(OPEN.briefed)) {
      this._autoTalk('promotion', OPEN.manager, (n, pre) => this._onOpeningTalk(n, n.def, pre));
    }
  }

  _autoReady() {
    const s = this.scene, p = s.player;
    if (!automoveOn(s) || s.busy || s.fade || s.dialog?.active || this.picker?.active || (this.gate && this.gate() === true)) return false;
    if (globalThis.kilumen?.ui?.active) return false; // a menu / phone is open: wait for it to close
    return !!p && !p.moving && p.state === 'idle';
  }

  /** Start a talk beat with the walk-up as its first step (inside the talk's own script: checkpoint, no saves, input off). */
  _autoTalk(beat, id, start) {
    const n = this.scene.npcs?.byId?.(id);
    if (!n || this._autoFired?.has(beat)) return false;
    (this._autoFired ||= new Set()).add(beat);
    return start(n, () => { this.story.kick(n); return approach(this.scene, n, { beat }); }); // Ron (if here) heads over too
  }

  /** Walk-up for beats that already start by themselves (lab intro, test-run return). No NPC / switched off: no-op. */
  async _autoApproach(beat, id) {
    const s = this.scene, n = s.npcs?.byId?.(id);
    if (!n || !automoveOn(s)) return null;
    return approach(s, n, { beat });
  }

  async wake() {
    const s = this.scene, e = s._entryFor?.(HOME.bedroom, { id: 'player_start' });
    const merged = pagesOf(e && s.pick(e, `maps.${HOME.bedroom}.player_start`)) || null;
    // the file's old 2-page dream is superseded by the 4-page wake-up until Text Bot merges (merged = 3+ pages)
    await s.say(merged && merged.length > 2 ? merged : FALLBACK.player_start, THOUGHT);
    this._questSkip(1); // the quest prototype's s1 text is this same dream: don't play it twice (?pg=quests)
  }

  /** Ron in house_1f. Returns true when this module handled the talk (Overworld.talk returns early). */
  onTalk(n, def, pre = null) {
    const s = this.scene;
    if (def?.id === STORY_RON.id) return this._storyRonTalk(n);
    if (def?.id === ESCORT.bossId) { s.script(async () => { s.npcs.beginTalk(n); try { await this._scene(this._pages(OPEN.office, 'manager_starter_repeat', FALLBACK_OFFICE.manager_starter_repeat), { name: 'Manager', portrait: null, battle: null }); } finally { s.npcs.endTalk(n); } }); return true; } // the boss, in the lab
    if (this._onOpeningTalk(n, def, pre)) return true;
    if (s.map?.name !== HOME.downstairs || def?.id !== HOME.ron) return false;
    const e = s._entryFor(HOME.downstairs, def), merged = ronMerged(e);
    if (!merged && !s.flags.has(HOME.started)) return false; // old saves without the new game marker: unchanged
    const key = `maps.${HOME.downstairs}.${HOME.ron}`;
    const picked = e ? s.pick(e, key) : null;
    const isDefault = !picked || picked.id === 'default' || !(picked.flags || []).length;
    if (!isDefault && !(merged && (picked.flags || []).includes(HOME.briefed))) return false; // a story line (promoted, coins...): normal flow
    const briefing = isDefault && !s.flags.has(HOME.briefed) && (merged || inMorning(s.flags));
    let pages;
    if (merged) pages = picked?.pages || e.pages;
    else if (briefing) pages = FALLBACK.ron_briefing;
    else if (s.flags.has(HOME.briefed)) pages = FALLBACK.ron_repeat;
    else return false; // past the morning (dev flags) with no merged line: the file's default
    s.log.push({ tick: s.tick, type: 'intro', step: briefing ? 'briefing' : 'ron' });
    s.script(async () => {
      if (pre) await pre(); // story auto-walk: walk up to Ron first (same script: one checkpoint, no save mid-walk)
      if (n) s.npcs.beginTalk(n);
      try {
        await s.say(pages, s.speakerFor(n));
        if (briefing) this.afterBriefing();
      } finally { if (n) s.npcs.endTalk(n); }
      if (briefing && n && s.flags.has(HOME.briefed)) await this.story.walkOut(n); // "I'll be right behind you": he heads out first
    });
    return true;
  }

  afterBriefing() {
    const s = this.scene;
    s.setFlag(HOME.briefed);
    this._questSkip(2);
    s.progression?.hud?.update?.();
    s.toast(`New objective: ${HOME.objective}`);
  }

  /** Door onto the street. Returns true when the step is refused (caller returns 'stop' to the mover). */
  onDoor(warp) {
    const s = this.scene;
    if (!doorBlocked(s.flags, s.map?.name, warp)) return false;
    const back = OPPOSITE[s.player.facing] || 'up';
    s.log.push({ tick: s.tick, type: 'intro', step: 'doorBlock' });
    s.script(async () => {
      const e = s.lines?.maps?.[HOME.downstairs]?.door_block;
      const file = pagesOf(e?.lines ? s.pick(e, `maps.${HOME.downstairs}.door_block`) || e : e);
      await s.say(file || FALLBACK.door_block, THOUGHT);
      // gently turned back: one step back into the room, facing it
      const p = s.player;
      p.facing = back; p._attempt(back, s.worldApi(), []);
    });
    return true;
  }

  /** Quest prototype (?pg=quests, off by default): its main quest's s1 / s2 step text is the old dream + Ron's layoff talk,
   *  which this opening now plays itself. Drop those two step texts in a new game so nothing repeats. */
  _patchQuests(qb) {
    this._qPatched = true;
    const s = this.scene, orig = qb.lines.bind(qb), skip = new Set(['mq_brookhollow_promotion_s1', 'mq_brookhollow_promotion_s2']);
    qb.lines = (q, context, step = null) => orig(q, context, step).filter((l) => !(context === 'step' && skip.has(l.step) && s.flags.has(HOME.started)));
  }

  /** Quest prototype (?pg=quests): count step n of the main quest as done so its own step text doesn't repeat ours. */
  _questSkip(n) {
    const qb = this.scene.progression?.quests;
    const q = qb?.quests?.find((x) => x.id === 'mq_brookhollow_promotion'), st = q?.steps?.[n - 1];
    if (!st || st.flag) return;
    const done = (qb.state.steps[q.id] ||= []);
    if (!done.includes(st.id)) done.push(st.id);
  }

  // ---- office / lab / test run / job ---------------------------------------------------------------------------------
  /** Merged Text Bot pages for maps.<map>.<key> (plain pages or a { lines } entry), else the code fallback. */
  _pages(map, key, fb) {
    const s = this.scene, e = s.lines?.maps?.[map]?.[key];
    const file = e ? pagesOf(e.lines ? s.pick(e, `maps.${map}.${key}`) || e : e) : null;
    return file && file.length ? file : fb;
  }

  /** system_opening.<key> (proposed new section) or the fallback. */
  _sysPages(key, fb) {
    const s = this.scene, e = s.lines?.system_opening?.[key];
    const file = e ? pagesOf(e.lines ? s.pick(e, `system_opening.${key}`) || e : e) : null;
    return file && file.length ? file : fb;
  }

  /** Play "WHO: text" pages as runs of speakers (untagged = `dflt` speaker). */
  async _scene(pages, dflt = null, vars = null) {
    const s = this.scene, v = { ...s.textVars(), ...(vars || {}) };
    for (const r of speakerRuns(pages, dflt?.name ?? null)) {
      const sp = r.name === (dflt?.name ?? null) && dflt ? dflt : { name: r.name, portrait: null, battle: null };
      this.story?.faceFor(r.name); // story Ron faces whoever is talking
      await s.say(s.fill(r.pages, v), sp);
    }
  }

  _objectiveToast() {
    const o = this.objective();
    this.scene.progression?.hud?.update?.();
    if (o) this.scene.toast(`New objective: ${o}`);
  }

  /** Office manager / lab researcher. Returns true when handled. */
  _onOpeningTalk(n, def, pre = null) {
    const s = this.scene, F = s.flags, map = s.map?.name;
    if (!F.has(HOME.started) || F.has(OPEN.briefed)) return false; // old saves / dev flag links / after the opening: unchanged
    const isMgr = map === OPEN.office && def?.id === OPEN.manager, isLab = map === OPEN.lab && def?.id === OPEN.researcher;
    if (!isMgr && !isLab) return false;
    let run = null;
    if (isMgr && !F.has(OPEN.promoted)) run = () => this.promotion(n);
    else if (isMgr && !F.has(OPEN.starter)) run = () => this._scene(this._pages(OPEN.office, 'manager_starter_repeat', FALLBACK_OFFICE.manager_starter_repeat), s.speakerFor(n));
    else if (F.has(OPEN.runStarted) && !F.has(OPEN.runDone)) run = () => this._scene(this._pages(OPEN.lab, 'manager_test_run_repeat', FALLBACK_OFFICE.manager_test_run_repeat), s.speakerFor(n));
    else if (isLab && F.has(OPEN.runDone)) run = () => this.jobBriefing();
    if (!run) return false;
    s.log.push({ tick: s.tick, type: 'intro', step: `talk:${def.id}` });
    s.script(async () => { if (pre) await pre(); if (n) s.npcs.beginTalk(n); try { await run(); } finally { if (n) s.npcs.endTalk(n); } });
    return true;
  }

  /** office_int.scene_promotion: sets flg_promoted, then "Come on." -> fade to the lab, one tile inside its door. */
  async promotion(n) {
    const s = this.scene;
    await this.story.join(n); // Ron next to the player, in front of the manager
    await this._scene(this._pages(OPEN.office, 'scene_promotion', FALLBACK_OFFICE.scene_promotion), s.speakerFor(n));
    s.setFlag(OPEN.promoted);
    s.log.push({ tick: s.tick, type: 'intro', step: 'promoted' });
    this._objectiveToast();
    // Gary 2:35 PM CT: no teleport; you follow your boss and Ron to the lab (walkToLab, its own script after this one's save)
    if (automoveOn(s) && s.map?.name === OPEN.office) { this._tripPending = true; return; }
    const spawn = await this.labSpawn(); // ?automove=0: the old fade to the lab door
    if (spawn) s.startWarp(spawn, 'door');
  }

  /** Office -> Brookhollow -> lab on foot (escort.js): the boss leads, Ron 2nd, the player 3rd, each into the tile the one
   *  ahead left. Real steps through the real doors (landings from the map files); input frozen and no saves inside (this
   *  is a scene.script: the checkpoint save is right before). Any leg with no route / stuck: the old fade to the lab. */
  async walkToLab() {
    const s = this.scene, p = s.player, story = this.story, load = (n) => loadNpcImgs(s, n);
    const specs = [{ id: ESCORT.bossId, sprite: s.npcs.byId(OPEN.manager)?.sprite || this._bossSprite || null, load }, { id: STORY_RON.id, sprite: s.spriteMap?.[STORY_RON.sprite] || null, load }];
    this._bossSprite = specs[0].sprite;
    const hooks = s.hooks, enc = hooks?.onEncounterTile;
    if (hooks) hooks.onEncounterTile = null; // no wild battles on the way
    const remove = (n) => story.remove(n);
    s.log.push({ tick: s.tick, type: 'intro', step: 'walkToLab', from: s.map?.name });
    try {
      if (s.map?.name === OPEN.office) {
        const boss = s.npcs.byId(OPEN.manager), ron = story.npc() || story.spawn(), out = doorTo(s.map, HOME.outside, p);
        let ok = !!(boss && ron && out);
        const unghost = ghostBystanders(s, [boss, ron]); // nobody else in the way (coworkers stand still, walk-through)
        try {
          if (ok) ok = (await conga(s, [boss, ron], out.front)).ok;
          if (ok) ok = await throughDoor(s, [boss, ron], out, remove);
        } finally { unghost(); }
        if (!ok && s.map?.name === OPEN.office) await this._tripFallback('office');
      }
      if (s.map?.name === HOME.outside) {
        const lab = doorTo(s.map, OPEN.lab, p), line = lab ? spawnAhead(s, specs, lab.front) : [];
        let ok = !!(lab && line.length === specs.length);
        const unghost = ghostBystanders(s, line); // townsfolk stand still and never block the lane (live v0.2.4 soft-lock)
        try {
          if (ok) { for (const n of line) n.faceToward(p.x, p.y); await this._scene(this._pages(HOME.outside, 'escort_street', FALLBACK_OFFICE.escort_street)); }
          if (ok) ok = (await conga(s, line, lab.front, { mid: { at: 0.5, run: () => this._scene(this._pages(HOME.outside, 'escort_midway', FALLBACK_OFFICE.escort_midway)) } })).ok;
          if (ok) ok = await throughDoor(s, line, lab, remove);
        } finally { unghost(); }
        if (!ok && s.map?.name !== OPEN.lab) { for (const n of line) if (s.npcs.list.includes(n)) remove(n); await this._tripFallback('street'); }
      }
      if (s.map?.name === OPEN.lab) { // they went in first and stepped aside; the lab beat (researcher, Ron joins) runs next
        const res = s.npcs.byId(OPEN.researcher), tgt = res ? { x: res.x, y: res.y + 1 } : null;
        if (!s.npcs.byId(ESCORT.bossId)) spawnAhead(s, story.npc() ? [specs[0]] : specs, tgt, { aside: true });
        for (const n of [s.npcs.byId(ESCORT.bossId), story.npc()]) if (n) n.faceToward(p.x, p.y);
      }
    } finally { if (hooks) hooks.onEncounterTile = enc; }
    s.log.push({ tick: s.tick, type: 'intro', step: 'walkToLabDone', map: s.map?.name, x: p.x, y: p.y });
  }

  async _tripFallback(where) {
    const s = this.scene, spawn = await this.labSpawn();
    s.log.push({ tick: s.tick, type: 'escort', step: 'fallback', where });
    if (!spawn) return;
    s.startWarp(spawn, 'door');
    await this._until(() => s.map?.name === OPEN.lab && !s.fade, 8000);
  }

  /** Inside lab_brookhollow's street door (found by `to` name), facing in. */
  async labSpawn() {
    try {
      const lab = await this.scene.loadMap(OPEN.lab), d = (lab.warps || []).find((w) => w.to === HOME.outside);
      return d ? { map: OPEN.lab, x: d.x, y: d.y - 1, facing: 'up' } : null;
    } catch { return null; }
  }

  /** Before Overworld.interact's systems hook: the starter cradles in a new game. True = handled. */
  onInteract(fx, fy) {
    const s = this.scene, F = s.flags;
    if (s.map?.name !== OPEN.lab || !F.has(HOME.started) || F.has(OPEN.starter)) return false;
    const cradles = s.systems?.cfg?.starterCradles || OPEN.cradles;
    const c = (s.map.json?.text_pending?.interact_spots || []).find((sp) => sp.x === fx && sp.y === fy && cradles[sp.id]);
    if (!c) return false;
    if (!F.has(OPEN.promoted)) {
      s.log.push({ tick: s.tick, type: 'intro', step: 'cradleNotYet' });
      s.script(() => s.say(this._pages(OPEN.lab, 'cradle_not_yet', FALLBACK_OFFICE.cradle_not_yet), THOUGHT));
      return true;
    }
    if (!F.has(OPEN.ritaFlag)) { s.script(() => this.ritaInstall()); return true; } // RITA first, then the pick
    s.script(() => this.pickStarter(c.id));
    return true;
  }

  /** Lab arrival after the promotion (new game): scene_starter_intro plays by itself, once. */
  _tickLab() {
    const s = this.scene, F = s.flags;
    if (s.map?.name !== OPEN.lab || !F.has(HOME.started) || !F.has(OPEN.promoted) || F.has(OPEN.starter)) return;
    if (s.seen[OPEN.introSeen] && F.has(OPEN.ritaFlag)) return;
    if (s.busy || s.fade || (this.gate && this.gate() === true)) return;
    if (s.seen[OPEN.introSeen]) { s.script(() => this.ritaInstall()); return; } // closed between the intro and the install (or a v0.2.4 save): install only
    s.script(async () => { await this._autoApproach('starterIntro', OPEN.researcher); await this.story.join(s.npcs.byId(OPEN.researcher)); return this.starterIntro(); }); // walk up to the lab tech, Ron beside you
  }

  /** lab_brookhollow.scene_starter_intro (4 pages): page 1, then the arrows switch on, then pages 2+. */
  async starterIntro() {
    const s = this.scene;
    if (s.seen[OPEN.introSeen]) { this.arrowsOn = true; return; }
    const pages = this._pages(OPEN.lab, 'scene_starter_intro', FALLBACK_OFFICE.scene_starter_intro);
    s.log.push({ tick: s.tick, type: 'intro', step: 'starterIntro' });
    await this._scene(pages.slice(0, 1));
    this.arrowsOn = true; // page 2: "the cases with the lights spinning over them"
    s.log.push({ tick: s.tick, type: 'intro', step: 'arrowsOn' });
    await this._scene(pages.slice(1));
    s.seen[OPEN.introSeen] = true; s._dirty = true;
    await this.ritaInstall(); // same script: the checkpoint save was right before the lab beat, none during
  }

  /** The lab tech installs RITA on your device (Gary 3:58 / 3:59 PM CT Oct 23 2026), in the tutorial before the starter pick.
   *  His lines, an "installing" beat with a chime, then rita_installed is set and her first strip (the one-time Trainer 1
   *  intro, company_voice.js) is queued; it shows as soon as this script lets go. Once per save. */
  async ritaInstall() {
    const s = this.scene, F = s.flags;
    if (F.has(OPEN.ritaFlag)) return;
    const res = s.npcs?.byId?.(OPEN.researcher);
    s.log.push({ tick: s.tick, type: 'intro', step: 'ritaInstall' });
    if (res) s.npcs.beginTalk(res);
    try {
      await this._scene(this._pages(OPEN.lab, 'scene_rita_install', FALLBACK_OFFICE.scene_rita_install), res ? { ...s.speakerFor(res), name: 'LAB TECH' } : null);
      try { s.audio?.sfx?.('save'); } catch { /* no audio */ }
      await s.say(s.fill(this._pages(OPEN.lab, 'rita_install_progress', FALLBACK_OFFICE.rita_install_progress), s.textVars()), { name: null, portrait: null, battle: null });
    } finally { if (res) s.npcs.endTalk(res); }
    if (s.setFlag) s.setFlag(OPEN.ritaFlag); else F.add(OPEN.ritaFlag);
    s._dirty = true;
    s.log.push({ tick: s.tick, type: 'intro', step: 'ritaInstalled' });
    s.companyVoice?.emit('rita_install'); // her first strip: direct queue, shown once the script ends
  }

  /** Marker spots this module wants drawn (overworld view -> marker.js): the starter cases, page 2 until got_starter. */
  markerSpots() {
    const s = this.scene, F = s.flags;
    if (s.map?.name !== OPEN.lab || F.has(OPEN.starter) || !F.has(OPEN.promoted)) return [];
    if (!this.arrowsOn && !s.seen[OPEN.introSeen]) return [];
    return cradleSpots(s.map, s.systems?.cfg?.starterCradles || OPEN.cradles);
  }

  /** Cradle -> preview panel (highlight starts on that case) -> starter_confirm. No = back to the panel, B = walk away. */
  async pickStarter(cradleId) {
    const s = this.scene, cradles = s.systems?.cfg?.starterCradles || OPEN.cradles;
    if (!s.seen[OPEN.introSeen]) await this.starterIntro();
    const doc = globalThis.document;
    if (!this.picker && doc?.body && !s.opts?.noPicker) {
      try { this.picker = new StarterPicker(doc, { mobile: !!s.opts?.platform?.profile?.touch || doc.body.classList.contains('touch') || !!doc.getElementById('touchpad')?.offsetParent }); } catch (e) { console.warn('starter picker off:', e.message); }
    }
    if (!this.picker) return this.chooseStarter(cradles[cradleId]); // node tests / no DOM: the plain confirm
    const ids = cradleSpots(s.map, cradles).sort((a, b) => a.x - b.x || a.y - b.y).map((sp) => sp.id);
    const list = ids.map((id) => cradles[id]);
    let sel = Math.max(0, ids.indexOf(cradleId));
    for (;;) {
      s.log.push({ tick: s.tick, type: 'intro', step: 'picker', sel });
      const k = await this.picker.open(list, sel, { title: this._sysPages('starter_picker_title', [FALLBACK_OFFICE.picker_title])[0], reduced: reducedMotionOf(s) });
      if (k == null) { s.log.push({ tick: s.tick, type: 'intro', step: 'pickerBack' }); return false; }
      sel = k;
      if (await this.chooseStarter(list[k])) return true;
    }
  }

  async chooseStarter(species) {
    const s = this.scene, sys = s.systems;
    if (!s.seen[OPEN.introSeen]) await this.starterIntro();
    const { speciesName } = await import('../systems/creature.js?v=v0.2.23-alpha').catch(() => ({}));
    const lead = speciesName ? speciesName(species) : speciesLabel(species), vars = { ...s.textVars(), lead, creature: lead };
    const k = await s.ask(s.fill(this._pages(OPEN.lab, 'starter_confirm', FALLBACK_OFFICE.starter_confirm), vars), ['Yes', 'No']);
    if (k !== 0) return false;
    const origin = { map: s.map.name, how: 'starter', day: s.clock?.day ?? 0 };
    const r = sys?.party?.chooseStarter ? sys.party.chooseStarter(species, { origin }) : { ok: true };
    if (!r.ok) return false;
    try { sys?.kilindex?.markCaught?.(species, { zone: s.zone?.() || s.map.name }); } catch {}
    if (!s.flags.has(OPEN.starter)) s.setFlag(OPEN.starter);
    this.arrowsOn = false;
    s.log.push({ tick: s.tick, type: 'intro', step: 'starter', species });
    await this.story.takeCradle(species); // "Then I'll take this one": Ron walks to his counter-pick, the case goes dark
    await this._scene(this._pages(OPEN.lab, 'scene_starter_after', FALLBACK_OFFICE.scene_starter_after), null, vars);
    await this.testRun();
    await this.story.walkOut(); // "Race you": out the door, partner behind him
    return true;
  }

  /** lab_brookhollow.scene_test_run: crystals, test_run_started, baseline for the 2-creature counter. */
  async testRun() {
    const s = this.scene;
    await this._scene(this._pages(OPEN.lab, 'scene_test_run', FALLBACK_OFFICE.scene_test_run));
    s.systems?.bag?.add?.(OPEN.crystalItem, OPEN.crystals);
    await s.say(s.fill(this._pages(OPEN.lab, 'crystals_received', FALLBACK_OFFICE.crystals_received), { ...s.textVars(), count: OPEN.crystals }));
    s.counters[OPEN.base] = ownedLogged(s); s.counters[OPEN.logged] = 0; s._dirty = true;
    s.setFlag(OPEN.runStarted);
    s.log.push({ tick: s.tick, type: 'intro', step: 'testRun', crystals: OPEN.crystals, base: s.counters[OPEN.base] });
    this._objectiveToast();
  }

  /** Every tick while the run is on: creatures owned + registered since the run started. */
  _tickRun() {
    const s = this.scene, F = s.flags;
    if (!F.has(OPEN.runStarted) || F.has(OPEN.runDone)) return;
    if (s.busy || s.fade || (this.gate && this.gate() === true)) return; // after the battle / dialog closes
    const n = Math.max(0, Math.min(OPEN.need, ownedLogged(s) - (s.counters[OPEN.base] || 0)));
    if (n === (s.counters[OPEN.logged] || 0)) return;
    s.log.push({ tick: s.tick, type: 'intro', step: 'logged', n });
    if (n < OPEN.need) { s.counters[OPEN.logged] = n; s._dirty = true; s.progression?.hud?.update?.(); s.toast(s.fill(this._sysPages('test_run_progress', FALLBACK_OFFICE.test_run_progress), { ...s.textVars(), n, need: OPEN.need })[0]); return; }
    s.script(async () => { // save lock: the final count lands after script()'s checkpoint, so a close mid-thought replays it
      s.counters[OPEN.logged] = n; s._dirty = true; s.progression?.hud?.update?.();
      await s.say(this._sysPages('test_run_logged', FALLBACK_OFFICE.test_run_logged), THOUGHT);
      s.setFlag(OPEN.runDone);
      this._objectiveToast();
    });
  }

  /** Return trigger: walking into the lab with the run done plays the return + job briefing (or talk to the researcher). */
  _tickReturn() {
    const s = this.scene;
    if (s.map?.name !== OPEN.lab || !s.flags.has(OPEN.runDone) || s.flags.has(OPEN.briefed)) return;
    if (s.busy || s.fade || (this.gate && this.gate() === true)) return;
    s.script(async () => { await this._autoApproach('jobBriefing', OPEN.researcher); await this.story.join(s.npcs.byId(OPEN.researcher)); return this.jobBriefing(); }); // walk up to the lab tech, Ron beside you
  }

  async jobBriefing() {
    const s = this.scene;
    if (s.flags.has(OPEN.briefed)) return;
    await this._scene(this._pages(OPEN.lab, 'scene_test_run_return', FALLBACK_OFFICE.scene_test_run_return));
    await this._scene(this._pages(OPEN.lab, 'scene_job_briefing', FALLBACK_OFFICE.scene_job_briefing));
    s.setFlag(OPEN.briefed);
    s.log.push({ tick: s.tick, type: 'intro', step: 'jobBriefed' });
    s.progression?.hud?.update?.();
    s.toast(this._sysPages('free_roam', ['Free roam: raise your Kilumen and log as many as you can.'])[0]);
    await this.story.walkOut(); // off to Fernwick (story Ron leaves; house_1f's Ron is home again)
  }

  /** Talking to the story Ron between beats: a short line by stage (code fallback; Text Bot keys requested). */
  _storyRonTalk(n) {
    const s = this.scene, F = s.flags;
    const st = s.map?.name === OPEN.office ? 'office' : F.has(OPEN.runDone) ? 'back' : 'lab';
    s.log.push({ tick: s.tick, type: 'intro', step: 'storyRonTalk', st });
    s.script(async () => {
      if (n) s.npcs.beginTalk(n);
      try { await s.say(this._pages(OPEN.lab, `ron_story_${st}`, FALLBACK_OFFICE.ron_story[st]), { name: 'Ron', portrait: null, battle: null }); } finally { if (n) s.npcs.endTalk(n); }
    });
    return true;
  }

  /** Map edge out of the starting area: thought + turned back. True = refused (caller returns 'stop'). */
  onEdge(exit) {
    const s = this.scene;
    if (ronCatchApplies(s.flags, s.map?.name, exit, partySize(s))) { this.ronCatch(exit); return true; }
    if (!leaveBlocked(s.flags, s.map?.name, exit)) return false;
    const st = stageFor(s.flags) || 'office', back = OPPOSITE[s.player.facing] || 'down';
    s.log.push({ tick: s.tick, type: 'intro', step: 'leaveBlock', to: exit.to });
    s.script(async () => {
      const e = s.lines?.system_opening?.leave_block;
      const file = e ? pagesOf(e.lines ? s.pick(e, 'system_opening.leave_block') || e : e) : null;
      await s.say(file || FALLBACK_OFFICE.leave_block[st] || FALLBACK_OFFICE.leave_block.office, THOUGHT);
      const p = s.player; p.facing = back; p._attempt(back, s.worldApi(), []);
    });
    return true;
  }

  objective() { return objectiveFor(this.scene.flags, this.scene.counters); }

  // ---- Ron catch (Gary 9:36 AM CT): no creature yet + a brookhollow exit -> Ron runs up, "too dangerous", walks you back --
  /** Input is frozen for the whole scene (scene.script). Never traps: every step is a normal walkability-checked step. */
  ronCatch(exit) {
    const s = this.scene, variant = ronCatchVariant(s.flags);
    s.log.push({ tick: s.tick, type: 'intro', step: 'ronCatch', to: exit.to, edge: exit.edge, variant });
    s.script(async () => {
      const p = s.player, inward = INWARD[exit.edge] || OPPOSITE[p.facing] || 'down';
      p.facing = inward; // turns round at the sound of Ron
      const ron = this._spawnCatchRon(inward);
      if (ron) {
        const near = this._cellNear(p.x, p.y, inward);
        ron.mover.mode = 'run'; // he runs up
        if (near && s.npcs.walkTo(ron.id, near.x, near.y, { stay: false })) await this._until(() => !ron.goal && !ron.script.length && !ron.mover.moving, 6000);
        if (Math.abs(ron.x - p.x) + Math.abs(ron.y - p.y) > 1 && near) this._placeNpc(ron, near.x, near.y); // couldn't reach: stand him there
        ron.faceToward(p.x, p.y); p.facing = towards(p, ron) || inward;
      }
      await s.say(this._ronLines(variant), ron ? s.speakerFor(ron) : { name: 'Ron', portrait: null, battle: null });
      // walk back into town: Ron leads, the player follows (3 tiles, each a normal checked step; blocked = stop there)
      if (ron) {
        ron.mover.mode = 'walk';
        const lead = this._cellAlong(p.x, p.y, inward, 5), at = `${ron.x},${ron.y}`;
        if (lead && s.npcs.walkTo(ron.id, lead.x, lead.y, { stay: false })) await this._until(() => `${ron.x},${ron.y}` !== at, 1500);
      }
      for (let i = 0; i < 3; i++) {
        await this._until(() => !p.moving, 1500);
        const before = `${p.x},${p.y}`;
        p.facing = inward; p._attempt(inward, s.worldApi(), []);
        await this._until(() => !p.moving, 1500);
        if (`${p.x},${p.y}` === before) { await this._wait(250); p._attempt(inward, s.worldApi(), []); await this._until(() => !p.moving, 1500); if (`${p.x},${p.y}` === before) break; }
      }
      if (ron) { const off = this.catchRon?.from; if (off) s.npcs.walkTo(ron.id, off.x, off.y, { stay: false }); this.catchRon.leaving = s.tick; }
      s.log.push({ tick: s.tick, type: 'intro', step: 'ronCatchDone', x: p.x, y: p.y });
    });
  }

  _ronLines(variant) {
    const s = this.scene, e = s.lines?.maps?.[HOME.outside]?.ron_too_dangerous;
    let file = null;
    if (e?.lines) file = pagesOf(s.pick(e, `maps.${HOME.outside}.ron_too_dangerous`));
    else if (e?.[variant]) file = pagesOf(e[variant]);
    else if (e && variant === 'default') file = pagesOf(e);
    return file && file.length ? file : FALLBACK_OFFICE.ron_too_dangerous[variant];
  }

  /** Temporary Ron (house_1f.ron sprite) placed just off-screen inside town, on a walkable cell he can path from. */
  _spawnCatchRon(inward) {
    const s = this.scene, m = s.map, p = s.player;
    if (!m || !s.npcs) return null;
    const z = s.zoom || 1, cw = s.canvas?.width || 1280, ch = s.canvas?.height || 720;
    const half = (inward === 'up' || inward === 'down' ? ch : cw) / (64 * z) / 2;
    const far = Math.max(4, Math.min(12, Math.ceil(half) + 1));
    let from = null;
    for (let d = far; d >= 3 && !from; d--) from = this._cellAlong(p.x, p.y, inward, d, true);
    if (!from) return null;
    const def = { id: 'ron_catch', kind: 'object', x: from.x, y: from.y, facing: OPPOSITE[inward] };
    const n = new Npc(def, m.name, s.spriteMap?.['house_1f.ron'] || null, false);
    n.behaviour = 'static';
    s.npcs.list.push(n); m.occupy?.(n.x, n.y, n);
    this.catchRon = { npc: n, from, mapName: m.name, leaving: null };
    const sp = n.sprite;
    if (sp?.overworld_sheet && s.img) {
      const base = s.config.pixelDir, k = s.sheetScale, scaled = k === 1 ? sp.overworld_sheet : sp[`overworld_sheet_${k}x`];
      Promise.all([s.img(base + sp.overworld_sheet), s.img(scaled && base + scaled)]).then(([a, b]) => { n.imgs = { 1: a, [k]: b || null }; }).catch(() => {});
    }
    return n;
  }

  /** Remove the temporary Ron once he has walked off (or after 4 s, or on a map change). */
  _tickCatchRon() {
    const c = this.catchRon, s = this.scene;
    if (!c) return;
    if (s.map?.name !== c.mapName) { this.catchRon = null; return; }
    if (c.leaving == null) return;
    const n = c.npc, home = n.x === c.from.x && n.y === c.from.y;
    if ((home && !n.mover.moving) || s.tick - c.leaving > 240) this._removeNpc(n);
  }

  _removeNpc(n) {
    const s = this.scene;
    s.npcs.list = s.npcs.list.filter((x) => x !== n);
    s.map?.vacate?.(n.x, n.y, n); s.map?.vacate?.(n.mover.tx, n.mover.ty, n);
    this.catchRon = null;
  }

  _placeNpc(n, x, y) {
    const m = this.scene.map;
    m.vacate?.(n.x, n.y, n); n.script = []; n.goal = null;
    n.mover.place(x, y); m.occupy?.(x, y, n);
  }

  /** Walkable free cell `d` steps from (x,y) toward `dir`; widens sideways (+-1..3) when that cell is blocked. */
  _cellAlong(x, y, dir, d, needPath = false) {
    const s = this.scene, m = s.map, D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    const side = D[0] ? [0, 1] : [1, 0];
    for (const o of [0, 1, -1, 2, -2, 3, -3]) {
      const cx = x + D[0] * d + side[0] * o, cy = y + D[1] * d + side[1] * o;
      if (!this._free(cx, cy)) continue;
      if (needPath && !this._reach(cx, cy, x, y)) continue;
      return { x: cx, y: cy };
    }
    return null;
  }

  /** The cell next to the player on the town side (else beside them). */
  _cellNear(x, y, inward) {
    for (const dir of [inward, 'left', 'right', 'up', 'down']) { const c = this._cellAlong(x, y, dir, 1); if (c && Math.abs(c.x - x) + Math.abs(c.y - y) === 1) return c; }
    return null;
  }

  _free(x, y) {
    const s = this.scene, m = s.map;
    if (!m?.inBounds?.(x, y) || m.code(x, y) !== 0 || m.npcAt?.(x, y) || m.warpAt?.(x, y)) return false;
    return !(s.player.x === x && s.player.y === y);
  }

  /** Is there a walking path from (fx,fy) to a cell next to (tx,ty)? (cheap BFS over walk cells, 600-cell cap) */
  _reach(fx, fy, tx, ty) {
    const seen = new Set([fx + ',' + fy]), q = [[fx, fy]];
    while (q.length && seen.size < 600) {
      const [x, y] = q.shift();
      if (Math.abs(x - tx) + Math.abs(y - ty) === 1) return true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (seen.has(k) || !this._free(nx, ny)) continue;
        seen.add(k); q.push([nx, ny]);
      }
    }
    return false;
  }

  _wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
  async _until(pred, ms) { const t0 = Date.now(); while (!pred() && Date.now() - t0 < ms) await this._wait(16); }
}

const towards = (p, n) => { const dx = n.x - p.x, dy = n.y - p.y; if (!dx && !dy) return null; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); };

/** Reduced motion for the picker / markers: ?motion=reduce, prefers-reduced-motion (living.js) or the UI's toggle. */
function reducedMotionOf(s) {
  return !!(s.life?.reducedMotion || globalThis.document?.body?.classList?.contains('ui-reduce'));
}

/** Display name for a species id (systems' creature data when present, else Title Case of the id). */
function speciesLabel(sp) {
  return String(sp || '').replace(/(^|_)(\w)/g, (_, a, b) => (a ? ' ' : '') + b.toUpperCase());
}
