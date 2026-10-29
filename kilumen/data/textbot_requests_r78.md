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
