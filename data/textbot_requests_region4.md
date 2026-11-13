# Text Bot requests (rail + region 4)
Fallback strings in src/rail/index.js (FB object) need real lines in text/overworld_lines.json: closed_pre, closed, closed_again, relay_idle, relay_dark, relay_calm, relay_no_team, pass_give, received, tip, menu title/subtitle, why_no_pass, why_not_visited, why_not_built, confirm, arrive.
Region 4: Frostspire NPC/sign lines, Master 4 lines, RITA region 4 lines + 4 new message variants, sq_cold_hands reward label (avoid "tonic").

## Region 4 build pass (Oct 29 2026, dev/region4-station) — new keys needed
All strings below are live PLACEHOLDERS in `data/region4/region4.json` (runtime `src/region4/index.js` reads `overworld_lines.json region4.*` first, then the placeholder). Please write final text; same tone rules (RITA sarcastic, calls the player by `{employee_id}` only). No blocked words.

- **Access decision:** Gary Oct 29 2026 2:52 AM CT (pt1814u): Frostspire has NO train station; it is reached by the Skylift (cable lift) only. Please retire any line that promises a Frostspire platform.
- `region4.npcs.skylift_operator_pass` — `closed`, `open`, `ask` (bottom of the lift, Frostspire Pass, x24 y3). "Rated for one" theme ties to mq_frostspire.
- `region4.npcs.skylift_operator` — `open`, `night`, `ask` (top of the lift, Frostspire x27 y42).
- `region4.npcs.climber` (npc id `frostspire_climber`, sq_cold_hands) — `start`, `waiting`, `give`, `after`, `received`. Reward label must read "Big Remedy" (never the internal id).
- `region4.npcs.rt_supervisor` (`frostspire_rt_supervisor`) — `idle`, `hold` (uses `{task}`), `ready`, `ceremony` (uses `{title}`), `after`, `bonus` (uses `{amount}`).
- `region4.npcs.kid_sledder` — `default`, `after_master`; `region4.npcs.hut_keeper` — `default`, `night`, `after_master`.
- `region4.signs.frostspire_sign_skylift`, `region4.signs.frostspire_sign_benefits`.
- Promotion titles: "Senior Field Associate" (ID 10), "Field Lead" (ID 12); quest titles `pq_cold_site_audit`, `pq_field_lead`.
- RITA (`system_company_voice`, region tag 4), 4 variants each (`<base>`, `_2`, `_3`, `_4`): `r4_daily_bonus` (`{amount}`), `r4_promotion_hold`, `r4_promotion` (`{title}`), `r4_skylift`, `master_beaten_frostspire`.
- `system.wip_after_master4` — WIP notice now shows after Master 4 (flag `seen_wip_notice_r4`).
- Benefits nodes: `daily_bonus` (Daily Bonus: 50/150/300 gold per in-game day), `ceremony_bonus` (gold at each promotion ceremony) — label + one-line description each.
- Kilindex blurbs: `system_kilindex.entries.{rimewick,hushpine,cairnhorn,glintmoth,skivvet,aurorel}.blurb`.

## v2 town (Oct 29 2026): new RT office interior
- `frostspire_office_int_clerk` (front desk, Frostspire RT office; layout copied from Saltmere office): 1-2 short default lines + an after_master line. Placeholder in map: TEXTBOT_PLACEHOLDER.
- `frostspire_office_int_coworker` (desk worker): 1-2 short default lines (cold-weather office small talk).
- Sign/NPC coordinates in frostspire.json moved in the v2 layout; ids and text_refs are unchanged, so no existing line needs rewriting. `frostspire_hall_int_sign_hall_outside` now sits by the hall door at (24,18).

## v3 (Oct 29 2026): Skylift station interior (frostspire_lift_int, copy of station_int)
- `frostspire_lift_clerk` (Skylift ticket desk): 1-2 lines about the cable lift down to the pass. Avoid train wording; Frostspire has no rail.
- `frostspire_lift_traveller`: 1 waiting-for-the-lift line.

## v6 soul (Oct 29 2026): hut keeper tea
- `region4.npcs.hut_keeper.tea_offer` (asked after her normal line, Yes/No), `tea_yes` (she hands over a warm cup), `tea_no` (gentle, the pot stays warm). Placeholders are in `data/region4/region4.json`. Cosy, short, no blocked words (never "tonic"). Sets flag `r4_had_tea` (no item, no heal).

## v7 (Oct 29 2026): new candle species needs a name (Gary 10:32 CT: keep both creatures)
- Rimewick is the blue frost hare again (live art). The round candle creature with two warm gold wick flames is now a separate species, id `tbdcandle`, dex 478 (provisional), light/mystic, Frostspire grass at dusk/night. Shown in game as `Frostwick` (was the placeholder `TBD`).
- Please send: a real name (one word, not a Pokémon-like name, no clash with existing species), and the Kilindex blurb `system_kilindex.entries.tbdcandle.blurb`. The coder will rename the id and files once the name lands.
- **Name landed (Oct 29 2026): Frostwick** (Gary's pick). `tbdcandle` now shows as Frostwick in game (design/cute_sets/cute_r4.json name, synced into data/creatures_synced.json + src/ui/species_synced.gen.js; wild in frostspire_grass at dusk/night, L29-31). The id stays `tbdcandle` for now. Blurb: please move `_pending_entries.tbdcandle` into `system_kilindex.entries` (the species is in creatures_synced.json now).
