# Text Bot requests: Badges tab (dev/badges-tab, Oct 29 2026)
Players see "coin", never "badge", in story text; the tab label is yours to pick (placeholder "Badges").
Blocked: PP, shiny, Pokédex, Poké Ball, route, berry, weed, nurse, super effective.
Keys (placeholder fallback in src/achievements/defs.js `ph` / screen.js):
- system_badges.labels.{tab, case, titles, events, milestones, coming_soon, soon_tag, locked, earned_on, first, latest, times}
- system_badges.<id>.name and .desc for every id in ACH_DEFS: coin_<town> x8, title_brookhollow_dash,
  event_<brookhollow_dash|garden_hop|tide_run|signal_relay|ice_slide|lantern_catch|forge_push>, games_aurelith_major,
  ms_masters_1/4/8, ms_kilindex_10/50/100.
