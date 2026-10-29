# tools/map_bridge: Kilumen <-> LDtk

Lets people paint and edit Kilumen maps in **LDtk 1.5.3** (MIT, deepnight/ldtk), then convert the result back to
Kilumen map JSON. The bridge is ours (no third-party code); it needs Python 3 + Pillow, plus `jsonschema` for `validate`.
Full workflow and rules: `/workspace/quality/toolkit/MAP_EDITOR_PIPELINE.md`.

**World Design owns `art/world/overworld/`.** The bridge only *reads* it. It refuses to write there (`assert_safe_out`),
and imported maps go to `build/maps_from_editor/`. World Design decides whether and how an edit goes into their maps
and their `tools/run.py --check`.

```
python3 tools/map_bridge/map_bridge.py export brookhollow --with-interiors   # -> build/map_editor/brookhollow.ldtk + atlas/
python3 tools/map_bridge/map_bridge.py validate build/map_editor/brookhollow.ldtk
#   ... edit in LDtk, Ctrl+S ...
python3 tools/map_bridge/map_bridge.py import build/map_editor/brookhollow.ldtk   # -> build/maps_from_editor/*.json
python3 tools/map_bridge/map_bridge.py diff build/maps_from_editor/brookhollow.json # what changed vs World Design's map
python3 tools/map_bridge/map_bridge.py render brookhollow --imported build/maps_from_editor/brookhollow.json --entities
python3 tools/map_bridge/map_bridge.py roundtrip --all                             # export -> import, byte-compare all maps
node --test tests/map_bridge.test.mjs
```

## How a map becomes an LDtk project
| Kilumen | LDtk |
|---|---|
| one map (`maps/<name>.json`) | one level (identifier = map name); `--with-interiors` follows warps transitively, so the town and every interior go in one project. The main map sits at 0,0 and the interiors are laid out to its right (Free world layout) |
| `tileset.json` (all 22 sheets) | one 64 px atlas PNG, `atlas/kilumen_atlas_<sha1>.png`, 64 columns, tiles in id order. Each slot's Kilumen **tile name** is stored in the tileset's `customData`, and its category in the `TileCategory` enum tags |
| `layers.ground / decoration / overlay / fog` | Tiles layers `Ground`, `Decoration`, `Overlay`, `Fog` (Fog only matters for mirefen_bog) |
| `layers.collision` | IntGrid `Collision`: 1 block, 2 ledge_s, 3 water, 4 door, 5 boulder, 6 gate, 7 plate, 8 bike_only, 9 ramp, 10 ice, 11 deep_water (0 = walk = empty) |
| `layers.encounter` | IntGrid `Encounter`: 1 grass, 2 cave |
| warps, locked_warps, exits, npcs (+ npcs_pending_text), signs (+ signs_pending_text), items, interact_spots, encounter_zones, forced_grass, flag_swaps, fly_point, player_start | entities `Warp`, `LockedWarp`, `Exit` (a strip on the map edge), `Npc`, `Sign`, `Item`, `InteractSpot` (`stand` is a Point), `EncounterZone` and `ForcedGrass` (resizable rects; x1/y1 inclusive), `FlagSwap`, `FlyPoint`, `PlayerStart`. NPC and sign entities have a `list` enum field that picks the Kilumen list |
| every other map key (story_gates, ambient, tags, puzzle, variants, ...) | the level field `kilumen_meta` (JSON, bridge-owned), kept verbatim |

Each entity also has a hidden `_json` field holding the original object, so keys without an editor field (pair_with,
approach, ...) survive. Typed fields win over `_json`, so editing in LDtk works as expected. Leave `_json` alone.

## Import rules
- Tiles are matched by **name** (atlas slot -> name -> the current id in `tileset.json`). World Design's id renumbering does not break old `.ldtk` files. A tile renamed or removed since export is a hard error.
- Hard errors (nothing is written): off-grid tiles or entities; tiles from a slot with no name; entities outside the map; an Exit not on its edge; duplicate ids within one list; required fields left empty. The required fields are: warp `to`/`tx`/`ty` (tx/ty may be empty for `$return`), exit `to`, npc/sign/interact `id`, item `id`/`item`, zone `table`. A freshly placed LDtk entity starts with empty fields.
- Warnings: flipped tiles (Kilumen has no flips), stacked tiles in one cell, a warp on a blocking collision cell, a warp target map that doesn't exist yet, and "World Design's map changed since export" (sha1 kept in the level field `source_sha1`).
- New entities get a canonical key order; existing ones keep their original order, so an unedited project re-imports **byte-identical** (`roundtrip --all`: 32/32 on 2026-10-22).
- LDtk auto-layer output (`autoLayerTiles`) is **not** imported. Paint tiles by hand, or bake them first.

## Files
- `kilumen_ldtk.py`: the library (export, import, lint, diff, renderers).
- `map_bridge.py`: the CLI.
- Schema and licence: `vendor_staging/ldtk/` (JSON_SCHEMA_v1.5.3.json, LICENSE).
