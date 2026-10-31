// Store perks: what each entitlement does to a save (dev/kilumen-store). Pure functions over plain state, so the
// Node tests drive them directly; src/store/index.js calls them from the running game.
// Per-save store state lives in the save's open `systems` block: sys.state.store = {goldDay, goldPaid, packFor, packGot}.
import { PERKS, KILU_PACK } from './config.js?v=v0.2.108-alpha';

export const storeState = (sysState) => (sysState.store && typeof sysState.store === 'object' ? sysState.store : (sysState.store = {}));

/** daily_gold: 200 gold once per in-game day. Pays for `day` only if it has not paid for that day yet.
 *  -> amount paid (0 or 200). wallet: {add(n)} */
export function payDailyGold(st, day, ents, wallet) {
  if (!ents.has('daily_gold') || !Number.isFinite(day)) return 0;
  if (st.goldDay === day) return 0;
  st.goldDay = day; st.goldPaid = (st.goldPaid || 0) + PERKS.dailyGold;
  wallet?.add?.(PERKS.dailyGold);
  return PERKS.dailyGold;
}

/** Subscription boost: +25% XP and money while active, x1 otherwise. Multiplies on top of every existing rule. */
export const boostMult = (ents) => (ents?.boostActive?.() ? 1 + PERKS.boost : 1);
/** Extra money for an award that already ran (amount = what the existing rules paid). */
export const boostBonus = (amount, ents) => (amount > 0 && ents?.boostActive?.() ? Math.floor(amount * PERKS.boost) : 0);
/** XP after the boost (n = XP from the existing rules, trainer multipliers included). */
export const boostXp = (n, ents) => (ents?.boostActive?.() ? Math.max(1, Math.floor(n * (1 + PERKS.boost))) : n);

/** board_unlock: is a RT Employee Benefits node covered by the overlay? Key-card nodes (grantFlag: they open story doors)
 *  and promotion-gated nodes (requiresFlag) are left to the story. */
export const boardCovers = (node) => !!node && !node.grantFlag && !node.requiresFlag;

/** kilu_pack: grant the four pack Kilu once per save (saveId). live=false (art not approved): nothing is granted and
 *  the claim stays open, so the real Kilu arrive once Gary approves. make(entry) -> creature. -> list of granted creatures */
export function grantKiluPack(st, saveId, ents, { live = false, make, add } = {}) {
  if (!ents.has('kilu_pack') || !saveId || !live) return [];
  if (st.packFor === saveId || typeof make !== 'function') return [];
  const got = [];
  for (const e of KILU_PACK) { const c = make(e); if (c) { add(c); got.push(c); } }
  if (!got.length) return got; // nothing made (species missing): leave the claim open
  st.packFor = saveId; st.packGot = got.map((c) => c.species);
  return got;
}
export { PERKS, KILU_PACK };
