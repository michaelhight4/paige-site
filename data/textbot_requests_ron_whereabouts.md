# Text Bot request: Ron whereabouts (v0.2.49, Gary 8:54 AM CT Oct 29 2026)

Ron now lives at home (house_1f) between Master wins and only shows up in the town whose Master is next.
Code currently uses placeholder lines from `src/overworld/ron_whereabouts.js` (RON_HOME_PLACEHOLDER / RON_TOWN_PLACEHOLDER).
Please add these keys to overworld_lines.json (arrays of pages, `{nick}` allowed); the code picks them up automatically.

## Home reaction, first talk after beating each Master
`maps.house_1f.ron_home_after_<zone>` for zone in:
fernwick, saltmere, revival_heights, frostspire, mirefen, tidewater_coast, lanternport, cindervale, aurelith (after final rival).

## Town greeting while that Master is next (spawned Ron by the hall door)
`maps.<town>.ron_town` for the same towns. Only used where the map has no static Ron NPC
(currently frostspire, mirefen, tidewater_coast, cindervale); static Rons keep their existing rival lines.
