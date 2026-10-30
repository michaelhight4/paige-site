// Kilumen overworld: shared constants (pure, no DOM; safe to import from Node tests).

/** Native tile size in px. All maths runs in native pixels; the renderer multiplies by the integer zoom. */
export const TILE = 64;
/** Humans are 64x96 native (1 x 1.5 tiles), feet at the bottom-centre of the tile. */
export const HUMAN_W = 64;
export const HUMAN_H = 96;

/** Fixed simulation rate. Logic runs in whole ticks so movement is integer native px per tick (no sub-pixel drift). */
export const TICK_HZ = 60;
export const TICK_MS = 1000 / TICK_HZ;

/** Collision codes, mirrored from tileset.json `collision_codes` (checked against the file in tests). */
export const Col = Object.freeze({
  WALK: 0,
  BLOCK: 1,
  LEDGE_S: 2, // one-way: only entered moving south; the player hops to the tile below
  WATER: 3,   // blocked until a water-crossing field skill exists
  DOOR: 4,    // walkable warp trigger (door / mat / stairs)
  BOULDER: 5, // blocked (push puzzles are a later task)
  GATE: 6,    // closed gate = blocked; an open gate is swapped to code 0
  PLATE: 7,   // walkable trigger
  BIKE_ONLY: 8, // narrow boardwalk: bike only (MOVEMENT.md 2); a wall on foot
  RAMP: 9,      // bike jump ramp: one-way 2-tile hop on the bike in the ramp's direction; a wall otherwise
  ICE: 10,        // EXTRA_TILES.md: walkable, slide-until-blocked (sliding not built yet: plain walk for now)
  DEEP_WATER: 11, // needs a deep-water field skill: blocked for now
});

export const WALKABLE = new Set([Col.WALK, Col.DOOR, Col.PLATE, Col.ICE]);

export const Dir = Object.freeze({ DOWN: 'down', LEFT: 'left', RIGHT: 'right', UP: 'up' });
export const DIRS = [Dir.DOWN, Dir.LEFT, Dir.RIGHT, Dir.UP];
export const DELTA = Object.freeze({
  down: { x: 0, y: 1 }, up: { x: 0, y: -1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
});
/** Row order of the human overworld sheets (cal_chibi_sheet*.png): down, left, right, up. */
export const SHEET_ROW = Object.freeze({ down: 0, left: 1, right: 2, up: 3 });
export const EDGE_FOR_DIR = Object.freeze({ up: 'north', down: 'south', left: 'west', right: 'east' });

/**
 * Movement modes (MOVEMENT.md 1). RUN = hold B with flag has_run_shoes (Trail Runners), not on the bike.
 * BIKE = Select toggles with flag has_bike (Courier Bike) on maps whose movement.bike is true.
 * Field skills (Tideglide water carry, Skylift, Lumen Line rail, flooding) are NOT modes here yet:
 * see FIELD_SKILLS.md and the hooks noted in overworld.js.
 */
export const MoveMode = Object.freeze({ WALK: 'walk', RUN: 'run', BIKE: 'bike' });

/**
 * Base ticks per tile at 60 Hz. Walk = 15 ticks = 250 ms = 4 tiles/s (README 2 / MOVEMENT.md: walk 4 tiles/s).
 * 64 px / 15 ticks is not whole, so GridMover.pixel() rounds: each tick moves 4 or 5 whole native px and the
 * camera follows the rounded position, so nothing is ever drawn at a sub-pixel offset.
 * RUN = 7.5 ticks (125 ms, 8 tiles/s) and BIKE = 5 ticks (83.3 ms, 12 tiles/s). Fractional bases alternate
 * 8/7-tick steps so the long-run average is exact (GridMover keeps a phase accumulator).
 */
export const BASE_TICKS_PER_TILE = Object.freeze({ walk: 15, run: 7.5, bike: 5 });

/** Turn-in-place: a tap shorter than this only turns the player; holding longer starts walking. */
export const TURN_TICKS = 6;
/** Step repeat (Oct 30 2026, Pokemon feel): a press steps once at once; holding the same direction only takes the next
 *  step after this long (~250 ms), so a short hold (150-240 ms) is always exactly one tile in every mode (walk/run/bike). */
export const REPEAT_TICKS = 15;
/** One bump (walking into a wall) lasts this long; it repeats while the direction is held. */
export const BUMP_TICKS = 24;
/** Ledge hop: 2 tiles over this many ticks, with an arc this many native px high. */
export const HOP_TICKS = 32;
export const HOP_HEIGHT = 16;
/** Bike ramp (MOVEMENT.md 5.6): 2 tiles in about 2 x 83 ms with a 6 px arc, holding bike1. */
export const RAMP_HEIGHT = 6;

/** Distance-based frame advance (MOVEMENT.md 1 / animator_manifest run_bike): native px per frame and frame count. */
export const ANIM = Object.freeze({
  walk: { pxPerFrame: 32, frames: 4 },
  run: { pxPerFrame: 64 / 3, frames: 6 },
  bike: { pxPerFrame: 48, frames: 4 },
});

/** Warp fade (each half). Short, per the brief. */
export const FADE_OUT_MS = 180;
export const FADE_IN_MS = 180;
