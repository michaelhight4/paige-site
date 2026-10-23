// Kilumen: paths and start settings. Paths are relative to index.html (the repo root is served as-is).
export const CONFIG = Object.freeze({
  overworldDir: 'art/world/overworld/',           // World Design kit (README: OVERWORLD_README.md)
  mapsDir: 'art/world/overworld/maps/',
  worldLayout: 'art/world/overworld/world_layout.json',
  // Player overworld sheet (Character models pixel pilot): 5 cols (stand, walk0-3) x 4 rows (down, left, right, up), 64x96 native.
  playerSheet: { 1: 'art/characters/pixel_pilot/overworld/cal_chibi_sheet.png',
                 2: 'art/characters/pixel_pilot/overworld/cal_chibi_sheet_2x.png',
                 3: 'art/characters/pixel_pilot/overworld/cal_chibi_sheet_3x.png' },
  // Dev start: outside the player's house in Brookhollow. The kit says "new-game spawn 2F" but gives no tile (README gap).
  start: { map: 'brookhollow', x: 5, y: 8, facing: 'down' },
  closedPathText: 'The path ahead is closed.',
});
