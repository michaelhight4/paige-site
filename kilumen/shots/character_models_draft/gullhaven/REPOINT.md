# REPOINT (DRAFT) - Gullhaven character art

Branch `character-models/gullhaven`. Art only; `npc_sprite_map.json` NOT edited. Coder: add these entries under `"map"` (on `dev/seaport` none of the 12 Gullhaven NPCs has an entry, so they all render the kind fallback stand-in: `villager` / `trainer_hooded`).

| map key | sprite_id | battle |
|---|---|---|
| `gullhaven_sea.gullhaven_sea_swimmer_a` | `tr_swimmer_gullhaven_a` | yes |
| `gullhaven_sea.gullhaven_sea_swimmer_b` | `tr_swimmer_gullhaven_b` | yes |
| `gullhaven_sea.gullhaven_sea_swimmer_c` | `tr_swimmer_gullhaven_c` | yes |
| `gullhaven_sea.gullhaven_sea_swimmer_d` | `tr_swimmer_gullhaven_d` | yes |
| `gullhaven_sea.gullhaven_sea_swimmer_e` | `tr_swimmer_gullhaven_e` | yes |
| `gullhaven_lagoon.gullhaven_lagoon_derby_clerk` | `npc_gull_derby_host_m` | yes |
| `gullhaven.gullhaven_harbour_master` | `vil_gull_harbour_master_f` | - |
| `gullhaven.gullhaven_derby_crier` | `vil_gull_derby_crier_m` | - |
| `gullhaven.gullhaven_angler` | `vil_gull_angler_f` | - |
| `gullhaven_cave_east.gullhaven_cave_east_hermit` | `vil_gull_hermit_m` | - |
| `gullhaven_cave_west.gullhaven_cave_west_hermit` | `vil_gull_hermit_f` | - |
| `gullhaven_cliffs.gullhaven_cliffs_birdwatcher` | `vil_gull_birdwatcher_f` | - |

Notes:
- Swimmers: `gd_class` is `diver`; battle sprite 64x128 at 1x/2x/3x in `trainer/`. Modest swimwear (rash guards, knee-length shorts/leggings, full wetsuit).
- Derby host = `gullhaven_lagoon_derby_clerk` (the `derby: desk` NPC). It is `kind: villager` in data, so battle art is extra; keep the kind as villager unless a battle is added. If you'd rather the host be `gullhaven_derby_crier`, swap the two sprite_ids.
- No portraits: Gullhaven data references none. Frame dirs aren't committed (per repo convention); rebuild with `kilumen/tools/character_models/gullhaven/npc_build_gull.py` (set NPC root, copy each trainer `_chibi.jpg` to `_normal.jpg`).

Example entries:
```json
{
 "gullhaven_sea.gullhaven_sea_swimmer_a": {
  "sprite_id": "tr_swimmer_gullhaven_a",
  "class": "DRAFT",
  "overworld_sheet": "npcs/tr_swimmer_gullhaven_a/overworld/tr_swimmer_gullhaven_a_chibi_sheet.png",
  "overworld_sheet_2x": "npcs/tr_swimmer_gullhaven_a/overworld/tr_swimmer_gullhaven_a_chibi_sheet_2x.png",
  "overworld_sheet_3x": "npcs/tr_swimmer_gullhaven_a/overworld/tr_swimmer_gullhaven_a_chibi_sheet_3x.png",
  "overworld_frames_dir": "npcs/tr_swimmer_gullhaven_a/overworld/tr_swimmer_gullhaven_a_chibi/",
  "trainer_64x128": "npcs/tr_swimmer_gullhaven_a/trainer/tr_swimmer_gullhaven_a_trainer_64x128.png"
 },
 "gullhaven_sea.gullhaven_sea_swimmer_b": {
  "sprite_id": "tr_swimmer_gullhaven_b",
  "class": "DRAFT",
  "overworld_sheet": "npcs/tr_swimmer_gullhaven_b/overworld/tr_swimmer_gullhaven_b_chibi_sheet.png",
  "overworld_sheet_2x": "npcs/tr_swimmer_gullhaven_b/overworld/tr_swimmer_gullhaven_b_chibi_sheet_2x.png",
  "overworld_sheet_3x": "npcs/tr_swimmer_gullhaven_b/overworld/tr_swimmer_gullhaven_b_chibi_sheet_3x.png",
  "overworld_frames_dir": "npcs/tr_swimmer_gullhaven_b/overworld/tr_swimmer_gullhaven_b_chibi/",
  "trainer_64x128": "npcs/tr_swimmer_gullhaven_b/trainer/tr_swimmer_gullhaven_b_trainer_64x128.png"
 },
 "gullhaven_sea.gullhaven_sea_swimmer_c": {
  "sprite_id": "tr_swimmer_gullhaven_c",
  "class": "DRAFT",
  "overworld_sheet": "npcs/tr_swimmer_gullhaven_c/overworld/tr_swimmer_gullhaven_c_chibi_sheet.png",
  "overworld_sheet_2x": "npcs/tr_swimmer_gullhaven_c/overworld/tr_swimmer_gullhaven_c_chibi_sheet_2x.png",
  "overworld_sheet_3x": "npcs/tr_swimmer_gullhaven_c/overworld/tr_swimmer_gullhaven_c_chibi_sheet_3x.png",
  "overworld_frames_dir": "npcs/tr_swimmer_gullhaven_c/overworld/tr_swimmer_gullhaven_c_chibi/",
  "trainer_64x128": "npcs/tr_swimmer_gullhaven_c/trainer/tr_swimmer_gullhaven_c_trainer_64x128.png"
 },
 "gullhaven_sea.gullhaven_sea_swimmer_d": {
  "sprite_id": "tr_swimmer_gullhaven_d",
  "class": "DRAFT",
  "overworld_sheet": "npcs/tr_swimmer_gullhaven_d/overworld/tr_swimmer_gullhaven_d_chibi_sheet.png",
  "overworld_sheet_2x": "npcs/tr_swimmer_gullhaven_d/overworld/tr_swimmer_gullhaven_d_chibi_sheet_2x.png",
  "overworld_sheet_3x": "npcs/tr_swimmer_gullhaven_d/overworld/tr_swimmer_gullhaven_d_chibi_sheet_3x.png",
  "overworld_frames_dir": "npcs/tr_swimmer_gullhaven_d/overworld/tr_swimmer_gullhaven_d_chibi/",
  "trainer_64x128": "npcs/tr_swimmer_gullhaven_d/trainer/tr_swimmer_gullhaven_d_trainer_64x128.png"
 },
 "gullhaven_sea.gullhaven_sea_swimmer_e": {
  "sprite_id": "tr_swimmer_gullhaven_e",
  "class": "DRAFT",
  "overworld_sheet": "npcs/tr_swimmer_gullhaven_e/overworld/tr_swimmer_gullhaven_e_chibi_sheet.png",
  "overworld_sheet_2x": "npcs/tr_swimmer_gullhaven_e/overworld/tr_swimmer_gullhaven_e_chibi_sheet_2x.png",
  "overworld_sheet_3x": "npcs/tr_swimmer_gullhaven_e/overworld/tr_swimmer_gullhaven_e_chibi_sheet_3x.png",
  "overworld_frames_dir": "npcs/tr_swimmer_gullhaven_e/overworld/tr_swimmer_gullhaven_e_chibi/",
  "trainer_64x128": "npcs/tr_swimmer_gullhaven_e/trainer/tr_swimmer_gullhaven_e_trainer_64x128.png"
 },
 "gullhaven_lagoon.gullhaven_lagoon_derby_clerk": {
  "sprite_id": "npc_gull_derby_host_m",
  "class": "DRAFT",
  "overworld_sheet": "npcs/npc_gull_derby_host_m/overworld/npc_gull_derby_host_m_chibi_sheet.png",
  "overworld_sheet_2x": "npcs/npc_gull_derby_host_m/overworld/npc_gull_derby_host_m_chibi_sheet_2x.png",
  "overworld_sheet_3x": "npcs/npc_gull_derby_host_m/overworld/npc_gull_derby_host_m_chibi_sheet_3x.png",
  "overworld_frames_dir": "npcs/npc_gull_derby_host_m/overworld/npc_gull_derby_host_m_chibi/",
  "trainer_64x128": "npcs/npc_gull_derby_host_m/trainer/npc_gull_derby_host_m_trainer_64x128.png"
 },
 "gullhaven.gullhaven_harbour_master": {
  "sprite_id": "vil_gull_harbour_master_f",
  "class": "DRAFT",
  "overworld_sheet": "npcs/vil_gull_harbour_master_f/overworld/vil_gull_harbour_master_f_chibi_sheet.png",
  "overworld_sheet_2x": "npcs/vil_gull_harbour_master_f/overworld/vil_gull_harbour_master_f_chibi_sheet_2x.png",
  "overworld_sheet_3x": "npcs/vil_gull_harbour_master_f/overworld/vil_gull_harbour_master_f_chibi_sheet_3x.png",
  "overworld_frames_dir": "npcs/vil_gull_harbour_master_f/overworld/vil_gull_harbour_master_f_chibi/"
 },
 "gullhaven.gullhaven_derby_crier": {
  "sprite_id": "vil_gull_derby_crier_m",
  "class": "DRAFT",
  "overworld_sheet": "npcs/vil_gull_derby_crier_m/overworld/vil_gull_derby_crier_m_chibi_sheet.png",
  "overworld_sheet_2x": "npcs/vil_gull_derby_crier_m/overworld/vil_gull_derby_crier_m_chibi_sheet_2x.png",
  "overworld_sheet_3x": "npcs/vil_gull_derby_crier_m/overworld/vil_gull_derby_crier_m_chibi_sheet_3x.png",
  "overworld_frames_dir": "npcs/vil_gull_derby_crier_m/overworld/vil_gull_derby_crier_m_chibi/"
 },
 "gullhaven.gullhaven_angler": {
  "sprite_id": "vil_gull_angler_f",
  "class": "DRAFT",
  "overworld_sheet": "npcs/vil_gull_angler_f/overworld/vil_gull_angler_f_chibi_sheet.png",
  "overworld_sheet_2x": "npcs/vil_gull_angler_f/overworld/vil_gull_angler_f_chibi_sheet_2x.png",
  "overworld_sheet_3x": "npcs/vil_gull_angler_f/overworld/vil_gull_angler_f_chibi_sheet_3x.png",
  "overworld_frames_dir": "npcs/vil_gull_angler_f/overworld/vil_gull_angler_f_chibi/"
 },
 "gullhaven_cave_east.gullhaven_cave_east_hermit": {
  "sprite_id": "vil_gull_hermit_m",
  "class": "DRAFT",
  "overworld_sheet": "npcs/vil_gull_hermit_m/overworld/vil_gull_hermit_m_chibi_sheet.png",
  "overworld_sheet_2x": "npcs/vil_gull_hermit_m/overworld/vil_gull_hermit_m_chibi_sheet_2x.png",
  "overworld_sheet_3x": "npcs/vil_gull_hermit_m/overworld/vil_gull_hermit_m_chibi_sheet_3x.png",
  "overworld_frames_dir": "npcs/vil_gull_hermit_m/overworld/vil_gull_hermit_m_chibi/"
 },
 "gullhaven_cave_west.gullhaven_cave_west_hermit": {
  "sprite_id": "vil_gull_hermit_f",
  "class": "DRAFT",
  "overworld_sheet": "npcs/vil_gull_hermit_f/overworld/vil_gull_hermit_f_chibi_sheet.png",
  "overworld_sheet_2x": "npcs/vil_gull_hermit_f/overworld/vil_gull_hermit_f_chibi_sheet_2x.png",
  "overworld_sheet_3x": "npcs/vil_gull_hermit_f/overworld/vil_gull_hermit_f_chibi_sheet_3x.png",
  "overworld_frames_dir": "npcs/vil_gull_hermit_f/overworld/vil_gull_hermit_f_chibi/"
 },
 "gullhaven_cliffs.gullhaven_cliffs_birdwatcher": {
  "sprite_id": "vil_gull_birdwatcher_f",
  "class": "DRAFT",
  "overworld_sheet": "npcs/vil_gull_birdwatcher_f/overworld/vil_gull_birdwatcher_f_chibi_sheet.png",
  "overworld_sheet_2x": "npcs/vil_gull_birdwatcher_f/overworld/vil_gull_birdwatcher_f_chibi_sheet_2x.png",
  "overworld_sheet_3x": "npcs/vil_gull_birdwatcher_f/overworld/vil_gull_birdwatcher_f_chibi_sheet_3x.png",
  "overworld_frames_dir": "npcs/vil_gull_birdwatcher_f/overworld/vil_gull_birdwatcher_f_chibi/"
 }
}
```
