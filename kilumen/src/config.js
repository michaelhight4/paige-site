// Kilumen: paths and start settings. Paths are relative to index.html (the repo root is served as-is).
export const CONFIG = Object.freeze({
  overworldDir: 'art/world/overworld/',           // World Design kit (README: OVERWORLD_README.md)
  mapsDir: 'art/world/overworld/maps/',
  worldLayout: 'art/world/overworld/world_layout.json',
  textLines: 'text/overworld_lines.json',          // Text Bot strings (items.*, blockers.*)
  // Player sheets, 64x96 native cells, rows down/left/right/up (MOVEMENT.md 3; animator_manifest.json "run_bike").
  //  walk: Character models, 5 cols (stand, walk0-3)   run: Animator, 6 cols (run0-5)   bike: Animator, 5 cols (bike_stand, bike0-3)
  playerSheets: {
    walk: { 1: 'art/characters/pixel/humans/cal/overworld/cal_chibi_sheet.png',
            2: 'art/characters/pixel/humans/cal/overworld/cal_chibi_sheet_2x.png',
            3: 'art/characters/pixel/humans/cal/overworld/cal_chibi_sheet_3x.png' },
    run: { 1: 'art/characters/pixel/humans/cal/run_bike/sheets/cal_chibi_run_sheet.png',
           2: 'art/characters/pixel/humans/cal/run_bike/sheets/cal_chibi_run_sheet_2x.png',
           3: 'art/characters/pixel/humans/cal/run_bike/sheets/cal_chibi_run_sheet_3x.png' },
    bike: { 1: 'art/characters/pixel/humans/cal/run_bike/sheets/cal_chibi_bike_sheet.png',
            2: 'art/characters/pixel/humans/cal/run_bike/sheets/cal_chibi_bike_sheet_2x.png',
            3: 'art/characters/pixel/humans/cal/run_bike/sheets/cal_chibi_bike_sheet_3x.png' },
    // Tideglide skiff (Animator r56 package #5): cols idle0, glide0-3 (wake composited under), built from tideglide/cal/*
    tideglide: { 1: 'art/characters/pixel/humans/cal/tideglide/cal_tideglide_sheet.png',
                 2: 'art/characters/pixel/humans/cal/tideglide/cal_tideglide_sheet_2x.png',
                 3: 'art/characters/pixel/humans/cal/tideglide/cal_tideglide_sheet_3x.png' },
  },
  // Story flags start empty (new game). Dev: ?flags=has_run_shoes,has_bike,beat_master_fernwick
  // Flag names come from tools/progression.py / world_layout.json progression_flags.
  startFlags: [],
  buttonNames: { run_button: 'B', bike_button: 'Select' },
  // Dev start: outside the player's house in Brookhollow. The kit says "new-game spawn 2F" but gives no tile (README gap).
  start: { map: 'brookhollow', x: 17, y: 15, facing: 'down' }, // padded frame (+12,+7; was 5,8 before the Oct 23 pad)
  closedPathText: 'The path ahead is closed.',
  // ---- soul pass (unapproved art: local only) ----
  playerName: 'Cal',
  ronNicknames: false,             // {nick}: Ron's nicknames (text ron_nicknames) only when on; off = the player's name
  rtNumberPlaceholder: 'RT-0147',  // {rt_number}: no catalogue numbers exist yet (catch flow is a later pass)
  pixelDir: 'art/characters/pixel/',
  npcSpriteMap: 'art/characters/pixel/npcs/npc_sprite_map.json',
  warmthTints: 'art/characters/pixel/warmth/warmth_tints.json',
  warmthDir: 'art/characters/pixel/warmth/',
  timeOfDayDir: 'art/world/overworld/time_of_day/',
  grades: 'art/world/overworld/time_of_day/grades.json',
  depth: 'src/overworld/depth.json',               // depth pass (contact shadows + wall-base shading), src/overworld/depth.js
  // Optional, Gary's call (CODER_LIST.md item 5): keep palette greens lit at dusk/night inside the emissive mask on
  // club_int + fernwick (club dance floor / sign). Default OFF. Dev preview: ?litgreens=1. src/overworld/lighting.js
  litGreensAtNight: false,
  // Night FX v1 (Gary, Oct 23 2026: window/lamp light at night, moonlight feel, moving clouds). src/overworld/nightfx.js.
  // ON in dev and (v0.2.3, Gary Oct 23) in the alpha build too; the alpha ignores the URL flags. Per-device: profiles' nightFx block
  // (pc.json / mobile.json: lightCell, clouds, flicker). Dev URL: ?nightfx=0|1 (all three), ?moonlight= ?nightlights= ?clouds=0|1.
  nightFx: Object.freeze({ nightLights: true, moonlight: true, clouds: true }),
  nightFxAnchors: 'src/overworld/nightfx_anchors.json', // coder-owned window/lamp light anchors (map files stay World Design's)
  paletteHex: 'art/palette/kilumen.hex',                // locked 64-colour palette (moon map snaps to it)
});

// v0.2.16 (Gary): every trainer with battle lines who sees the player engages (no talk-only / optional trainers). false = map sight data only.
export const ALL_TRAINERS_ENGAGE = true;
export const DEFAULT_SIGHT_RANGE = 3;
