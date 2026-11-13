# Autotile port plan (port first, rebuild second): Oct 23 2026, 12:02 AM CT
Read-only on live files. Everything here lives in qa/autotile_port/. Evidence: survey.json, coverage.json, rule_proof.json, brookhollow_trial/.

**Key finding:** the generated maps are already rule-placed. tools/build.py `resolve()` turns a semantic terrain grid into edges and corners (priority, an 8-neighbour mask, the majority lower terrain and a hash wobble). The tiles come from WD's own hand-made `transition()` recipe. rule_proof.py recovers the terrain from the shipped ground layer and re-runs the rule: **7 of 7 maps reproduce 100%** (5,960 of 5,960 cells). So the "port" moves the terrain grid and the rules out of code and into data/LDtk. No art changes.

## 1. Maps, how borders are made today, terrain pairs
| map | size | borders today | pairs (cells) |
|---|---|---|---|
| brookhollow | 34x32 | resolve() | path>grass 172, water>grass 53, water>path 11; 8 three-way cells |
| route1 | 44x34 | resolve() + hand ledges | trail>grass 196, water>grass 18, sand>grass 14, water>sand 6 |
| fernwick | 30x24 | resolve() | path>grass 118, water>grass 6, water>path 2; 3 three-way cells |
| thornwood | 36x30 | resolve() + hand cliff strip y4 + ledges | trail>grass_dark 173, mud>grass_dark 11, water>grass_dark 6 |
| lantern_rest | 16x15 | resolve() | trail>grass 22 |
| greystone_entrance / _b1 | 28x22 / 30x24 | resolve() + cavewall rule | cave_water>cave 14 / 6 |
| route1_storm (variant) | 44x34 | storm.py over route1 | + flood/deep/water pairs |
| mirefen_bog | 24x18 | biome worker's resolve (biomes_extra.py) | x_bog>moss, x_bog>mud, x_mud>moss |
| 24 live interiors, 49 staged interiors, 2 QA maps | - | iwall rule (face/upper/top), wall/floor only | none |

Not rule-placed anywhere: cliffs and ledges (hand-placed l/m/r strips in maps.py) and the tree borders (`border()`).

## 2. Marks
- **PORT (8):** brookhollow, route1, fernwick, thornwood, lantern_rest, greystone_entrance, greystone_b1, route1_storm. The rules reproduce them exactly, so they port losslessly.
- **PORT by its owner (1):** mirefen_bog. It uses the biome worker's rule set, which I don't touch.
- **REBUILD (0):** no map needs a rebuild. Rebuilding is only an option later, for cliffs and ledges (see 3).
- **N/A (75):** the 24 live and 49 staged interiors (the walls are already rule-placed, with no terrain borders) and 2 QA maps (biome worker).

## 3. Transition sets
- **Exist (hand-made, WD recipe), as 47-blob style 4-side + 4-corner masks with 3 wobbles.** Coverage of the 46 non-empty blob configs:
  - path>grass 34, water>grass 32, most others ~30. Any missing config is drawn on demand by `build.trans_tile`, using the same recipe. So a live build never lacks a tile.
- **Thin (fine today, but they become gaps once maps get edited):**
  - water>path (2 configs), water>trail (0), water>grass_dark (1), and the mirefen and storm pairs (1–6).
  - path>grass_dark and snow>grass have no wobble variants.
- **Missing:**
  - (a) **3-way junction tiles.** Today the rule draws only the majority neighbour: 8 cells in Brookhollow, 3 in Fernwick, all where water meets path and grass at the bridges.
  - (b) **cavewall convex and concave corners.**
  - (c) **cliff/ledge 13-tile strip rule.**
- **tilegen gap-fillers exist only for path_grass, sand_grass and water_grass** (47-blob + 16 dual-grid + LDtk rules), with one texture variant, no 3-way and no animation.
  - None exist for trail, grass_dark, mud, cave, water>path, 3-way, cliffs or cavewall.
  - Those would need WD's recipe (preferred, since it matches the art) or Tilesetter PNGs that Gary exports.

## 4. Mechanism
- **Rules stay in our generator, as the single authority.** brookhollow_trial/rules.json is `resolve()` written out as data.
- **LDtk gets a `Terrain` IntGrid layer** with codes from rules.json; the trial writes terrain.json in that form. Designers paint terrain there.
  - On import, the bridge runs the rules and bakes Ground.
  - I don't recommend native LDtk auto-layer rules as the authority. LDtk's random picks can't reproduce our vhash wobble, so the output would not be byte-identical, and the bridge doesn't import auto-layer output yet.
  - Exported LDtk auto-rules are fine as an *in-editor preview* only.
- **Depth pass is unaffected.** Ground stays flat, and shadows come only from the decoration layer.
- **Time-of-day grade is unaffected.** It is the same tiles and palette, and the trial renders day and night through `time_of_day.render_map`.
- **PC and mobile profiles are unaffected.** They share the map data and neither profile is touched.
- **`run.py --check` stays green.** Ground ids are identical, and the bridge round-trip stays at 32/32.

## 5. Brookhollow trial (done, on a copy: brookhollow_trial/run_trial.py)
1. Copy the map, tileset, palette, grades and sheets into `copy/` (sha1 manifest; live sha1s re-checked afterwards).
2. Recover terrain.json (the IntGrid) from the ground layer.
3. Write rules.json.
4. Place the edges by rule into `copy/maps/brookhollow_rule.json`.
5. Check: ids exist, only ground may differ, entities are identical.
6. Edit demo: paint a pond and a path spur on the terrain only, and let the rules place the edges.
7. Render before_after.png (day + night, current | rule-placed | diff) and edit_demo.png.

## 6. Estimate (WD time) and asks
| phase | effort |
|---|---|
| P1: save the `terrain` layer in map JSON and load rules.json in build.py (no output change) | 0.5 day |
| P2: bridge Terrain IntGrid ⇄ Ground bake (Coder's bridge) + LDtk preview rules | 1 day (Coder) + 0.5 day |
| P3: roll out to the 8 PORT maps, with a byte-identical check per map | 0.5 day |
| P4: 3-way junction tiles (water/path/grass, about 6 masks) via WD recipe | 1 day |
| P5: cavewall corners + cliff/ledge strip rule (the only real rebuild) | 2 days |
| P6: fill out the thin pairs (water>path, water>trail, grass_dark) as the maps get edited | 0.5 day |

**Asks for Coder**
1. Confirm the full backup is verified, so live edits can start.
2. Bridge support: import a `Terrain` IntGrid and call our resolve to bake Ground; leave the auto-layer output ignored.
3. OK for WD to change tools/build.py (P1).

**Asks for Gary**
1. Should the 3-way junctions get real tiles (P4), or stay as the majority edge they are today?
2. OK for the WD recipe to fill the missing configs (it matches the hand-made art)? tilegen/Tilesetter would be used only where the recipe can't do the job (cliffs, if wanted).
3. Are cliffs and ledges in scope (P5)?

## Trial results (12:01 AM CT)
- **Rule-placed vs current:** 0 cells changed out of 1,088, and 0 pixels differ at both day and night. All 1,088 tiles come straight from the existing hand-made set.
- **Edit demo:** I painted 15 terrain cells and the rules re-tiled those 15.
  - 4 cells use their exact tile.
  - 11 use a hand-made fallback: 3 of them substitute another wobble of the same mask, and 8 substitute a tile with the same blob key. A live build would draw these fresh with `trans_tile`.
  - No tilegen gap-fill tiles were used.
- **Checks:**
  - Trial check: PASS (ids exist, other layers and entities identical, live sha1s unchanged).
  - `run.py --check`: nothing written; in-memory problems: 0.
