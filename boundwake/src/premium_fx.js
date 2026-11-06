// Effects of Boundwake premium passes. Checks Premium.isUnlocked at call time.
import * as Premium from './premium.js';
import * as E from './bw_engine.js';
import { log } from './core.js';
import { clamp } from './rng.js';

export const on = (id) => Premium.isUnlocked(id);

function once(s, id, fn) {
  s.flags = s.flags || {};
  const k = 'prem_' + id;
  if (s.flags[k]) return false;
  s.flags[k] = 1;
  fn();
  return true;
}

/** Start-of-life / continue bonuses. Call from begin + reincarnate/heir paths. */
export function applyStart(s) {
  if (!s) return [];
  const done = [];
  if (on('dragonhoard') && once(s, 'dragonhoard', () => {
    s.gold = (s.gold || 0) + 1000;
    log(s, 'Dragonhoard: I woke with 1,000 gold already in the purse.', 'money');
  })) done.push('dragonhoard');

  if (on('heralds_favor')) {
    if (once(s, 'heralds_favor', () => {
      s.stats.fame = Math.max(s.stats.fame || 0, 80);
      log(s, "Herald's Favor: the realm already knew my name.", 'fame');
    })) done.push('heralds_favor');
  }

  if (on('eternal_bloom')) {
    if (s.ailments?.length) { s.ailments = []; log(s, 'Eternal Bloom: my ailments faded.', 'health'); }
    done.push('eternal_bloom');
  }

  if (on('keep_keys') && E.cage(s) >= 18 && once(s, 'keep_keys', () => {
    grantKeepHome(s);
  })) done.push('keep_keys');

  if (on('banner_lord') && E.cage(s) >= 16 && once(s, 'banner_lord', () => {
    // Founding still needs affinity skill — attempt when player has one ≥15
    tryGrantBannerTeam(s);
  })) done.push('banner_lord');

  if (on('banner_champion') && once(s, 'banner_champion', () => {
    // Prime top physical/craft affinity skill toward draft readiness
    const skills = Object.entries(s.skills || {}).sort((a, b) => b[1] - a[1]);
    if (skills[0]) {
      const [id, v] = skills[0];
      s.skills[id] = Math.max(v, 15);
      log(s, `Banner Champion: ${id.replace(/_/g, ' ')} primed for the lists.`, 'team');
    }
  })) done.push('banner_champion');

  if (on('kinblessed')) { s.flags.kinblessed = 1; done.push('kinblessed'); }

  return done;
}

function grantKeepHome(s) {
  const id = 'gear_ember_hall';
  if (!E.gearDef?.(id)) {
    s.gold = (s.gold || 0) + 600;
    log(s, 'Keep Keys: Emberlight Hall was not in the stall list — 600 gold instead.', 'gear');
    return;
  }
  const gr = (s.gear ||= { owned: [], equipped: {}, home: null });
  if (!gr.owned.includes(id)) gr.owned.push(id);
  gr.home = id;
  s.flags.has_home = 1;
  log(s, 'Keep Keys: the doors of Emberlight Hall opened for me.', 'gear');
}

function tryGrantBannerTeam(s) {
  if (s.team) return;
  // Pick best affinity skill ≥15 or top skill
  const skills = Object.entries(s.skills || {}).sort((a, b) => b[1] - a[1]);
  const pick = skills.find(([, v]) => v >= 15) || skills[0];
  if (!pick) return;
  const [sk] = pick;
  // Use engine foundTeam with fee waived via temp gold
  const fee = 80;
  const had = s.gold;
  s.gold = Math.max(s.gold, fee);
  const r = E.foundTeam?.(s, (s.last || 'Vale') + ' Circle', sk);
  if (!r?.ok) s.gold = had;
  else {
    s.gold = had; // refund founding fee for pack owners
    log(s, 'Banner Lord: my tournament team was raised without the founding purse.', 'team');
  }
}

/** Renown floor while Herald's Favor is active. */
export function fameFloor(s) {
  if (!on('heralds_favor') || !s?.stats) return;
  if (s.stats.fame < 60) s.stats.fame = 60;
}

export const neverAilment = () => on('eternal_bloom');
export const neverCaught = () => on('shadowcloak');
export const neverToll = () => on('tollbreaker');
export const unlimitedHeirs = () => on('kinblessed');

/** Archsage: set one skill to at least 40 (once per life via UI). */
export function archsageBoost(s, skillId) {
  if (!on('archsage')) return { ok: false, msg: 'Needs Archsage Quill.' };
  if (!s.skills || s.skills[skillId] == null) return { ok: false, msg: 'Unknown skill.' };
  if (s.flags?.prem_archsage_used) return { ok: false, msg: 'Archsage Quill already used this life.' };
  s.skills[skillId] = Math.max(s.skills[skillId], 40);
  s.flags.prem_archsage_used = 1;
  const msg = `Archsage Quill: ${skillId.replace(/_/g, ' ')} rose to journeyman.`;
  log(s, msg, 'skill');
  return { ok: true, msg };
}

/** Fateweaver stub — full editor UI later. */
export function fateweaverSet(s, { age, stats } = {}) {
  if (!on('fateweaver')) return { ok: false, msg: 'Needs Fateweaver.' };
  if (age != null) s.age = Math.max(0, Number(age) || 0);
  if (stats && typeof stats === 'object') {
    for (const [k, v] of Object.entries(stats)) {
      if (s.stats[k] != null) s.stats[k] = clamp(Number(v) || 0, 0, 100);
    }
  }
  log(s, 'Fateweaver: the waking bent to my will.', 'meta');
  return { ok: true, msg: 'Fate rewritten.' };
}
