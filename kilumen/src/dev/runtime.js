// Kilumen dev runtime flags (v0.2.26). Plain flags read by the game's gating code. Nothing here is a key or a permission:
// only dev/devgate.js (server-checked admin account + ?dev=1) ever turns `active` on, and every flag is memory-only (never saved).
// masterKey: the gating code (map.js passable, overworld.js exits/doors/hall Master, wip_notice.js) lets the player through while it
// is on. It never writes badges / story flags / beaten-trainer records, so turning it off restores the real gating exactly.
export const DEV = { active: false, masterKey: false, speed: 1, world: 1 }; // world: v0.2.58 global world speed (1/4/10/25/100), memory-only

/** Oct 30 2026 (Gary): dev fast walk. With DEV.fastWalk (default on in a dev session) the player's walk / bike / Tideglide
 *  runs at world speed: the sim already sub-steps up to world x fixed ticks per frame, so every tile still gets its own
 *  arrive (warps, trainer sight, encounters, collisions). The tap/hold-repeat gates stay real-time via mover.worldSpeed.
 *  fastWalk off = the old v0.2.59 behaviour (multiplier divided by world speed so the walk stays at walk speed). */
export function devWalkPace(mover, dev) {
  if (!mover) return;
  const w = dev?.world > 1 ? dev.world : 1, s = dev?.speed || 1;
  if (dev?.fastWalk !== false) { mover.speedMultiplier = s; mover.worldSpeed = w; }
  else { mover.speedMultiplier = s / w; mover.worldSpeed = 1; }
}
