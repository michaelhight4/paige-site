// Kilumen dev runtime flags (v0.2.26). Plain flags read by the game's gating code. Nothing here is a key or a permission:
// only dev/devgate.js (server-checked admin account + ?dev=1) ever turns `active` on, and every flag is memory-only (never saved).
// masterKey: the gating code (map.js passable, overworld.js exits/doors/hall Master, wip_notice.js) lets the player through while it
// is on. It never writes badges / story flags / beaten-trainer records, so turning it off restores the real gating exactly.
export const DEV = { active: false, masterKey: false, speed: 1, world: 1 }; // world: v0.2.58 global world speed (1/4/10/25/100), memory-only
