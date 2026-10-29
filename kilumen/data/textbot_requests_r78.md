# Text Bot requests: regions 7-8 (dev/regions-5-8, Oct 29 2026)

Placeholders live in code until these keys exist (Text Bot owns text/*.py). Plan: design/REGIONS_78_PLAN.md.

| Key | Used by | Placeholder / intent |
|---|---|---|
| `system.wip_after_master8` | src/systems/wip_notice.js (after coin 8) | "That's as far as the story goes for now. The road to Aurelith is still being built." |
| `system_story_r78.r7_ron_page_handoff` | src/region78/index.js (Lanternport, once, after coin 6) | Ron finally shares the log page from his coat pocket (story_beats R6 §8 plant). Major-key Ron. |
| `system_story_r78.r7_ron_flies` | same scene | "The flies have names now." (moved here from Tidewater, G3) |
| `system_story_r78.r7_node_name` / `r7_node_desc` | Benefits node rt_node_station_l | Region 7 key card: lighthouse signal store |
| `system_story_r78.r8_node_name` / `r8_node_desc` | Benefits node rt_node_station_c | Region 8 key card: foundry lab |
| `system_company_voice` lines for `id_cap_r7`, `id_cap_r8`, `promoted_id18`, `promoted_id20`, `rt_keycard_r7`, `rt_keycard_r8` | RITA (company voice) | same pattern as r5/r6 |
| `maps.lanternport_grotto.*`, `maps.cindervale_caldera.*` | caves (once World Design builds them) | signs, trainer lines |
| `maps.house_1f.ron_home_after_lanternport`, `..._after_cindervale` | ron_whereabouts.js | Ron's home reaction to coins 7 / 8 |

## Oct 29 2026, story §L rev 2 + hall order (coder)
Still needed (code has placeholders or fallbacks):
- `ron.lanternport.greet`, `bins6_flies`, `bins7_flies`, `page_offer`, `page_why`, `page_give`, `leave`, `ron6_plant`, and `lore.lanternport.page`. Until these land, the hand-off falls back to `system_story_r78.r7_ron_page_handoff` and `r7_ron_flies`.
- `system_story_r78.field_reading_sheet_name` / `_desc` (key item Field Reading Sheet).
- `system_field.hall_locked_prev`: the hall door prompt, with a {master} slot for the previous town.
- `system_story_r78.lanternport_gate`: only used if Gary turns the gate on (currently off).
- Please remove the `maps.lanternport.lanternport_ron_5` lines (the NPC is gone).
