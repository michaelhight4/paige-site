// Kilumen sports: the Brookhollow dash venue rules (free practice + the 3-day tournament). Pure logic, no DOM. Oct 28 2026.
// Tournament windows come from the existing in-game clock (scene.clock.day): window w = floor(day / EVERY_DAYS). The
// tournament is held on the first day of each window (day % EVERY_DAYS === 0); one entry per window. Fee and prize go
// through the existing Wallet (systems/shop.js: spend / add). State lives in systems.state.sports (saved with systems).
export const TOURNEY = { fee: 150, prize: 1000, everyDays: 3 };
export const VENUE = { map: 'brookhollow', npcId: 'dash_coach' };

export const windowOf = (day) => Math.floor(Math.max(0, day | 0) / TOURNEY.everyDays);
export const isTourneyDay = (day) => (Math.max(0, day | 0) % TOURNEY.everyDays) === 0;
/** Days until the next tournament day (0 = today). */
export const daysUntil = (day) => { const r = Math.max(0, day | 0) % TOURNEY.everyDays; return r === 0 ? 0 : TOURNEY.everyDays - r; };

export function sportsState(sysState) {
  const s = (sysState.sports ||= {});
  s.enteredWindow ??= -1; s.entries ??= 0; s.wins ??= 0; s.practice ??= 0; s.best ??= null;
  return s;
}

/** -> {ok:true} | {ok:false, reason:'not_today'|'entered'|'gold'|'no_team', days} */
export function canEnter({ day, coins, state, teamSize = 1 }) {
  const days = daysUntil(day);
  if (!teamSize) return { ok: false, reason: 'no_team', days };
  if (!isTourneyDay(day)) return { ok: false, reason: 'not_today', days };
  if (state.enteredWindow === windowOf(day)) return { ok: false, reason: 'entered', days: TOURNEY.everyDays };
  if (coins < TOURNEY.fee) return { ok: false, reason: 'gold', days };
  return { ok: true, days };
}

/** Takes the fee and marks the window. Call only after canEnter().ok. -> true if paid. */
export function payEntry({ day, wallet, state }) {
  if (!canEnter({ day, coins: wallet.coins, state }).ok) return false;
  if (!wallet.spend(TOURNEY.fee)) return false;
  state.enteredWindow = windowOf(day); state.entries++;
  return true;
}

/** After the final: pays the prize to a winner. -> prize paid (0 if not first). */
export function settle({ place, time, wallet, state }) {
  if (Number.isFinite(time) && (state.best == null || time < state.best)) state.best = +time.toFixed(2);
  if (place !== 1) return 0;
  state.wins++;
  return wallet.add(TOURNEY.prize);
}
