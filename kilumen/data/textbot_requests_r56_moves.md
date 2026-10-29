# Text Bot requests: region 5/6 moves (dev/r56-wiring, Oct 29 2026)

Placeholder only. Avoid blocked words (PP, shiny, super effective, Pokédex, Poké Ball, Gotcha!, nurse, weed, route/routes, berry, throw).

Skill names/descs (`skills.*` catalogue): bogsnap "Bog Snap", mirelob "Mire Lob", brinelash "Brine Lash", undertow "Undertow", kelplash "Kelp Lash".
- mirelob: may lower the target's Speed. undertow: may lower the target's Attack.

Old Gus tutor (`system_story_r56.*`, src/region56/tutor.js TUTOR_KEYS; NPC tr_tidewater_coast_lighthouse_keeper not placed yet):
- old_gus_offer: offers to teach Brine Lash ({creature}). Needs `choices: ['Teach it', 'Not today']` next to `pages` (tutor.js reads system_story_r56.old_gus_offer.choices; that pair is the fallback). {skill} is also filled.
- old_gus_none: nobody in the party can learn it.
- old_gus_taught: {creature} learned Brine Lash.
- old_gus_known: {creature} already knows it.

Map title: route_coast is now "Coast Road" (maps.route_coast title / area banner).
