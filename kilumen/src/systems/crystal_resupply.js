// RITA crystal resupply (Oct 23 2026, coder; Gary 2:39 PM CT): out of dominance crystals during the opening test run
// (lab_brookhollow: test_run_started set, test_run_done not, fewer than OPEN.need caught + registered) -> RITA says the
// company will supply more but it reflects on your check, and the bag is restocked to OPEN.crystals (5).
// ONLY AFTER A BATTLE (Gary 2:39 PM CT "only after battle"): systems.applyBattleResult (every battle end) arms a pending
// check; it runs on the first step back in the overworld (no script / battle / dialogue / fade / save lock), never
// mid-battle and never from other overworld changes (shop, items). Repeatable each battle until the run is done; never
// after. No coin cost: the paycheck line is flavour only (Gary 2:40 PM CT "no actual deduction").
// Restock happens without RITA too (?cv=0 / mode Off) so the run can never soft-lock. Save: _dirty -> the usual step
// save; company_voice.js checkpoints before showing and never saves while the strip is up.
import { OPEN, ownedLogged } from '../overworld/intro.js?v=v0.2.16-alpha';

const PLUS = 'dominance_crystal_plus'; // Prime Crystals also count as "not out"

/** Run state alone: run on, not done, 0 crystals, fewer than OPEN.need logged. */
export function resupplyNeeded(s) {
  const F = s.flags;
  if (!F?.has(OPEN.runStarted) || F.has(OPEN.runDone)) return false;
  const bag = s.systems?.bag; if (!bag) return false;
  if (bag.count(OPEN.crystalItem) > 0 || bag.count(PLUS) > 0) return false;
  const n = Math.max(Number(s.counters?.[OPEN.logged]) || 0, ownedLogged(s) - (s.counters?.[OPEN.base] || 0));
  return n < OPEN.need;
}
/** Back in the overworld after a battle with nothing on screen. */
export function overworldClear(s) {
  if (s.busy || s.fade || s.dialog?.active || s.battle) return false;
  try { const r = s.saveLockReason?.(); if (r) return false; } catch { /* stub */ }
  return true;
}
/** Due = a battle ended since the last check, the overworld is clear, and the run needs crystals. */
export function resupplyDue(s) { return !!s._resupplyPending && overworldClear(s) && resupplyNeeded(s); }

export function checkResupply(s) {
  if (!s._resupplyPending || !overworldClear(s)) return false;
  s._resupplyPending = false; // one check per battle end
  if (!resupplyNeeded(s)) return false;
  const bag = s.systems.bag;
  bag.add(OPEN.crystalItem, OPEN.crystals - bag.count(OPEN.crystalItem));
  s._dirty = true;
  s.log?.push?.({ tick: s.tick, type: 'crystalResupply', count: OPEN.crystals });
  const cv = s.companyVoice || globalThis.window?.kilumen?.companyVoice;
  cv?.emit?.('crystal_resupply', { count: OPEN.crystals });
  return true;
}

/** Wrap systems.applyBattleResult (battle end) once; systems may arrive after attach, so step retries. */
export function wrapBattleEnd(s) {
  const sys = s.systems;
  if (!sys || typeof sys.applyBattleResult !== 'function' || sys._crystalResupplyWrapped) return;
  const apply = sys.applyBattleResult.bind(sys);
  sys.applyBattleResult = (res, ...a) => { const out = apply(res, ...a); s._resupplyPending = true; return out; };
  sys._crystalResupplyWrapped = true;
}

export function attachCrystalResupply(s) {
  if (!s || s._crystalResupply || typeof s.step !== 'function') return;
  s._crystalResupply = true;
  wrapBattleEnd(s);
  const step = s.step.bind(s);
  s.step = (snap) => { step(snap); try { wrapBattleEnd(s); checkResupply(s); } catch (e) { console.error('crystal resupply:', e); } };
}
