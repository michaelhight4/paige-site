# Text Bot request: RITA crystal resupply (coder, Oct 23 2026; Gary 2:39 PM CT)

File: text/overworld_lines.json -> `system_company_voice`. Speaker RITA (company voice): sarcastic, only cares about company
asset value, calls the player by the bare 6-digit `{employee_id}` only. 1-2 short pages each.

Keys (4-variant rule): `crystal_resupply`, `crystal_resupply_2`, `crystal_resupply_3`, `crystal_resupply_4`

When: the player runs out of dominance crystals during the opening test run (catch 2 kilumen, lab_brookhollow) before
catching two. Shown back in the overworld after the battle; the bag is then restocked to 5. Repeats each time they run
out, until the test run is done.

Meaning: the company will supply more crystals, but it's going to reflect on your check. Vars: `{employee_id}`, `{count}` (5).

Code fallback (in use until filled): "{employee_id}: out of crystals already? The company will supply more." /
"This will reflect on your check. Try not to waste assets."

Blocked: PP, shiny, super effective, Pokédex, Poké Ball, Gotcha!, nurse, weed, route/routes; never "throw" for capture.
