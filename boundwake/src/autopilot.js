// Boundwake Autopilot / Skip (basic, free) — cage calendar, 1 turn = 1 year.
// Reference: Lifeline autopilot pause-on-important + yearly spend leftovers.
// Docs: docs/AUTOPILOT.md

import * as E from './bw_engine.js?v=advack1';

export const SKIP_PRESETS = [1, 5, 10, 25];
export const MAX_SKIP = 100;

const DANGEROUS_RE = /\b(attack|fight|steal|murder|poison|ambush|assault|riot|blood|kill|duel|crime|rob|stab|risk it|danger|reckless)\b/i;
const IMPORTANT_CAT = new Set(['death', 'romance', 'love', 'family', 'heir', 'legacy', 'tournament', 'ownership', 'crime', 'prison']);
const IMPORTANT_TAG = new Set(['important', 'romance', 'family', 'heir', 'tournament', 'ownership', 'guild', 'team', 'death', 'jail', 'prison', 'legacy']);
const IMPORTANT_ID_RE = /^(own_|x_rom|rom_|love_|family_|heir_|tour_|guild_|team_|jail|prison|death)/i;

let _running = false;
let _stop = false;

export function isRunning() { return _running; }
export function requestStop() { _stop = true; }

export function isImportantEvent(ev) {
  if (!ev) return false;
  if (ev.important || ev.pause || ev.autopilot === 'pause') return true;
  if (IMPORTANT_CAT.has(String(ev.cat || '').toLowerCase())) return true;
  const tags = ev.tags || [];
  if (tags.some((t) => IMPORTANT_TAG.has(String(t).toLowerCase()))) return true;
  if (IMPORTANT_ID_RE.test(String(ev.id || ''))) return true;
  // Ownership founding / team founding beats
  if (/found|handoff|seize|rival|wedding|birth|propose|imprison|arrest|sentence/i.test(String(ev.id || '') + ' ' + String(ev.title || ''))) return true;
  return false;
}

function choiceDangerous(c) {
  if (!c) return true;
  if (c.danger || c.risky || c.deadly) return true;
  const blob = `${c.label || ''} ${c.text || ''} ${c.blurb || ''}`;
  return DANGEROUS_RE.test(blob);
}

/** Prefer first unlocked non-dangerous choice; else first unlocked. */
export function pickSafeChoiceIndex(card) {
  if (!card?.choices?.length) return -1;
  const unlocked = card.choices.map((c, i) => ({ c, i })).filter(({ c }) => !c.locked);
  if (!unlocked.length) return -1;
  const safe = unlocked.find(({ c }) => !choiceDangerous(c));
  return (safe || unlocked[0]).i;
}

function pauseReason(s, card) {
  if (!s.alive) return { kind: 'death', reason: 'You died.' };
  if (s.prison) return { kind: 'jail', reason: 'Imprisoned — autopilot paused.' };
  if (card && isImportantEvent(card)) return { kind: 'important', reason: `Important: ${card.title || card.id || 'event'}` };
  // Ownership founding moments
  if (s.flags?.ui_pause_auto) return { kind: 'flag', reason: 'Paused for a key decision.' };
  return null;
}

/** Spend leftover act budget with short rules (documented in AUTOPILOT.md). */
export function spendLeftover(s) {
  const ran = [];
  if (!s?.alive || s.prison) return ran;
  // Rest if strained
  while ((s.budget?.act || 0) > 0 && (s.stats?.stress || 0) >= 70) {
    const r = E.rest(s);
    if (!r?.ok) break;
    ran.push({ id: 'rest', msg: r.msg || 'Rested.' });
  }
  // Work if employed
  while ((s.budget?.act || 0) > 0 && s.job) {
    const r = E.workHard(s);
    if (!r?.ok) break;
    ran.push({ id: 'work', msg: r.msg || 'Worked.' });
  }
  // Train lowest unlocked skill (prefer primary / soft)
  let guard = 0;
  while ((s.budget?.act || 0) > 0 && guard++ < 8) {
    const skills = (E.D?.skills?.skills || []).map((k) => k.id);
    let best = null, bestV = Infinity;
    for (const id of skills) {
      const why = E.trainLockReason(s, id);
      if (why) continue;
      const v = s.skills[id] || 0;
      if (v < bestV) { bestV = v; best = id; }
    }
    if (!best) break;
    const r = E.train(s, best);
    if (!r?.ok) break;
    ran.push({ id: 'train', skill: best, msg: r.msg || `Trained ${best}.` });
  }
  // Otherwise rest away leftover acts
  while ((s.budget?.act || 0) > 0) {
    const r = E.rest(s);
    if (!r?.ok) break;
    ran.push({ id: 'rest', msg: r.msg || 'Rested.' });
  }
  return ran;
}

/**
 * Resolve pending events safely for one year-start, or pause.
 * Returns { ok, paused, reason, resolved[] }
 */
export function resolvePendingSafe(s) {
  const resolved = [];
  while (s.pending?.length) {
    const card = E.pendingCard(s);
    if (!card) break;
    const pause = pauseReason(s, card);
    if (pause && pause.kind === 'important') {
      return { ok: false, paused: pause, resolved };
    }
    if (pause && pause.kind === 'jail') {
      return { ok: false, paused: pause, resolved };
    }
    const i = pickSafeChoiceIndex(card);
    if (i < 0) return { ok: false, paused: { kind: 'locked', reason: 'No available choices — decide manually.' }, resolved };
    const r = E.resolve(s, i);
    resolved.push({ id: card.id, title: card.title, choice: i, msg: r?.msg });
    if (!s.alive) return { ok: false, paused: { kind: 'death', reason: 'You died.' }, resolved };
    if (s.prison) return { ok: false, paused: { kind: 'jail', reason: 'Imprisoned — autopilot paused.' }, resolved };
  }
  return { ok: true, paused: null, resolved };
}

/** One cage year: resolve pending → ageUp → spend leftovers → resolve new pending if safe. */
export function runOneYear(s) {
  if (!s?.alive) return { ok: false, paused: { kind: 'death', reason: 'You died.' }, spent: [], resolved: [] };
  if (_stop) return { ok: false, paused: { kind: 'stop', reason: 'Stopped.' }, spent: [], resolved: [] };
  if (s.prison) return { ok: false, paused: { kind: 'jail', reason: 'Imprisoned — autopilot paused.' }, spent: [], resolved: [] };

  const pre = resolvePendingSafe(s);
  if (!pre.ok) return { ok: false, paused: pre.paused, spent: [], resolved: pre.resolved };

  const from = E.cage(s);
  E.ageUp(s);
  const to = E.cage(s);

  if (!s.alive) return { ok: false, paused: { kind: 'death', reason: 'You died.' }, from, to, spent: [], resolved: pre.resolved };

  // New events from ageUp — pause if important before auto-picking
  if (s.pending?.length) {
    const card = E.pendingCard(s);
    if (card && isImportantEvent(card)) {
      return { ok: false, paused: { kind: 'important', reason: `Important: ${card.title || card.id}` }, from, to, spent: [], resolved: pre.resolved };
    }
    if (s.prison) {
      return { ok: false, paused: { kind: 'jail', reason: 'Imprisoned — autopilot paused.' }, from, to, spent: [], resolved: pre.resolved };
    }
  }

  const spent = spendLeftover(s);

  // Clear remaining safe pending so next year starts clean; pause on important
  const post = resolvePendingSafe(s);
  if (!post.ok) {
    return { ok: false, paused: post.paused, from, to, spent, resolved: pre.resolved.concat(post.resolved) };
  }

  return { ok: true, paused: null, from, to, spent, resolved: pre.resolved.concat(post.resolved) };
}

/**
 * Skip N calendar years. Calls onYear(result) each year; onPause(pause) when stopping early.
 * Yields to UI via await waitMs between years.
 */
export async function skipYears(s, n, { onYear, onPause, waitMs = 40 } = {}) {
  const total = Math.max(1, Math.min(MAX_SKIP, Math.floor(n) || 1));
  _running = true;
  _stop = false;
  const years = [];
  try {
    for (let i = 0; i < total; i++) {
      if (_stop) {
        const p = { kind: 'stop', reason: 'Stopped.' };
        onPause?.(p, years);
        return { ok: false, paused: p, years, done: i, wanted: total };
      }
      if (!s.alive) {
        const p = { kind: 'death', reason: 'You died.' };
        onPause?.(p, years);
        return { ok: false, paused: p, years, done: i, wanted: total };
      }
      const y = runOneYear(s);
      years.push(y);
      onYear?.(y, i + 1, total);
      if (!y.ok) {
        onPause?.(y.paused, years);
        return { ok: false, paused: y.paused, years, done: i + 1, wanted: total };
      }
      if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
    }
    return { ok: true, paused: null, years, done: total, wanted: total };
  } finally {
    _running = false;
    _stop = false;
  }
}
