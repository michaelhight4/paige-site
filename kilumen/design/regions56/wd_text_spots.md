# Regions 5/6 – text ids needing lines (World Design → Text Bot)
All live under `maps.<map>.*` in text/overworld_lines.json unless noted. Avoid blocked words (PP, shiny, super effective, Pokedex, Poke Ball, Gotcha!, nurse, gym, tonic, weed, tap).

| map | kind | id | note |
|---|---|---|---|
| mirefen_bog | npc | mirefen_bog_hatch_watcher | stands by the sunken-station hatch |
| mirefen_bog | sign | mirefen_bog_hatch_sign | "RT Sunken Station: key card only" |
| mirefen_bog | gate | blockers.gate_mirefen_sunken_hatch.before / .after | flag rt_keycard_r5 |
| lab_mirefen_sunken | npc | lab_mirefen_sunken_researcher | |
| lab_mirefen_sunken | spot | lab_mirefen_sunken_spot1..4 | machines, tanks, racks, desk PC |
| tidewater_cave_int | npc | tidewater_cave_int_diver | |
| tidewater_cave_int | sign | tidewater_cave_int_lab_sign | |
| tidewater_cave_int | gate | blockers.gate_tidewater_cave_lab.before / .after | flag rt_keycard_r6 |
| lab_tidewater_cave | npc | lab_tidewater_cave_researcher | |
| lab_tidewater_cave | spot | lab_tidewater_cave_spot1..4 | tanks, coral, racks, desk |
| rt_outpost_int | npc | rt_outpost_int_clerk | shared RT outpost (Mirefen + Tidewater) |
| route_coast (storm variant) | gate | blockers for flooded stream cells | reuses the route_coast gate id |
| tidewater_coast | event | event_spots.ron_battle_r6 | Ron's pre-battle line (stand point 18,13) |
