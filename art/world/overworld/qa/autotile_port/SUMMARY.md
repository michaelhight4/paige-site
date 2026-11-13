# Autotile port — STATUS: LIVE since 01:38 AM CT, Oct 23 2026

Applied live on the 8 rollout maps at 01:38 AM CT (gate opened 01:35 after Coder confirmed the off-box backup).
- Pre-port tarball: `/workspace/kilumen/backups/autotile_port_live_20261023_0138/overworld_pre_port.tgz` (+ `manifest.sha1` in the same folder).
- Live results: run.py exit 0, `--check` 0 problems, Text Bot validator unchanged, map_bridge roundtrip 60/60.
- Ids on live: the ledger was rebased by name (legacy 1..1824 unchanged, 0 ids moved). The port's new tiles are **1825..2066 (242)**; the 1578–1823 numbers below are from the staged sandbox run and are superseded.
- Before/afters: `<map>/before_after.png`.

## Per map (sandbox run 00:30 CT Oct 23: full run EXIT 0, `--check` 0 problems)
| map | cells changed | what |
|---|---|---|
| brookhollow | 8 | water/path/grass 3-way junctions (P4) |
| fernwick | 3 | 3-way junctions (P4) |
| route1_storm | 1 | water/trail/grass junction at (32,13) |
| route1 | 1 | ledge strip rule (P5): (28,12) ledge_m → ledge_r at the walkable flower gap |
| greystone_entrance | 10 | cave wall corners (P5) |
| greystone_b1 | 15 | cave wall corners (P5) |
| thornwood, lantern_rest | 0 | already correct; the rule matches what was hand-placed (thornwood cliffs next to the cave entrance are kept via `joins`) |

Every rollout map also gets a `terrain` key (codes from `tools/autotile_rules.json`). The engine ignores this key and the bridge keeps it.
mirefen_bog is untouched.

## New tiles (staged numbering; live = 1825..2066, see the top): ids 1578–1823 (246), added at the end, so no legacy id moves
- 12 junction tiles: `water>path+grass_*`, plus `water>trail+grass_0101_1100_0101_0100_w1`.
- 4 cave corners: `cavewall_face_{u,l}_{e,w}`.
- 230 thin-pair fills (P6): water>path, water>trail and water>grass_dark (46 each), plus path>grass_dark w1/w2 (92).
- Full list: `port/new_tile_ids.txt`.

Check: all 2744 legacy tiles have the same id, sheet and index (`port/compare.json`).
Fallbacks: none. Everything uses the hand recipe; tilegen was not used.

## How it works (P1)
- `tools/autotile_rules.json` is the source of truth: maps, priority, terrain codes, junction, cave corners, strips and thin pairs.
- `tools/tile_id_ledger.json` freezes the legacy name→id map. Any new tile is numbered after the last legacy id.
- `build.py` only executes the rules.

## Before/afters
- `copy/<map>/before_after.png` (staged): before | after | diff at day and at night, plus zoomed crops. Diff colours: yellow = junction, blue = cave corner, pink = strip.
- After the live apply, these are regenerated to `<map>/before_after.png`.

## Apply (done 01:38 AM CT)
- Backup: `/workspace/kilumen/backups/autotile_port_live_20261023_0138/` (the planned `autotile_port_20261023/` path was not used).
- Live run plus `--check`: done, 0 problems.
- Text Bot validator: done, unchanged.
