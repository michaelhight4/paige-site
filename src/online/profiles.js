// Online tuning per platform (online play groundwork, Oct 22, 2026; DRAFT, local only).
// PC and mobile are independent on purpose: each block is complete and neither reads from the other
// (same rule as src/platform/pc.json and mobile.json). Mobile is landscape-only, so its panels are
// laid out for a short, wide screen and every button is at least 44 CSS px.
const PC = Object.freeze({
  id: 'pc',
  sendHz: 8,              // position snapshots per second while moving (throttled; idle sends nothing)
  keyframeMs: 3000,       // idle: resend position this often (heals lost messages, late joiners, unblock)
  interpDelayMs: 180,     // render remote players this far in the past so there are two snapshots to blend
  teleportTiles: 3,       // a jump bigger than this (door, warp) snaps instead of sliding
  heartbeatMs: 2000,      // local transport: "I'm still here" (Supabase uses presence instead)
  peerTimeoutMs: 6500,    // local transport: forget a tab that stopped talking
  capPerChannel: 16,      // players per zone channel; extra players go to the next shard (zone#2 ...)
  maxShards: 8,
  joinGraceMs: 400,       // listen this long before deciding which shard we are in
  bubbleMs: 4000,         // quick-chat bubble lifetime
  chatCooldownMs: 1500,   // min gap between our own chat messages (quick-chat or typed)
  freeTextMaxLen: 60,
  freeTextDefault: false, // typed chat is OFF unless the player turns it on (kids may play)
  minButtonPx: 36,
  panelColumns: 2,
  keys: { chat: 'KeyT', players: 'KeyP' },
});
const MOBILE = Object.freeze({
  id: 'mobile',
  sendHz: 6,              // phones: fewer messages, a little more smoothing
  keyframeMs: 4000,
  interpDelayMs: 220,
  teleportTiles: 3,
  heartbeatMs: 2500,
  peerTimeoutMs: 8000,
  capPerChannel: 12,      // smaller screen, fewer ghosts
  maxShards: 8,
  joinGraceMs: 500,
  bubbleMs: 4500,
  chatCooldownMs: 2000,
  freeTextMaxLen: 48,
  freeTextDefault: false,
  minButtonPx: 44,        // touch target floor
  panelColumns: 4,        // landscape: wide rows of phrases, short panel
  keys: { chat: 'KeyT', players: 'KeyP' },
});
export const ONLINE_PROFILES = Object.freeze({ pc: PC, mobile: MOBILE });
export function onlineProfile(platformId) { return ONLINE_PROFILES[platformId] || PC; }
