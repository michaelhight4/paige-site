# Text Bot request: RITA crystal resupply (coder, Oct 23 2026; Gary 2:39 / 2:40 PM CT)

File: text/overworld_lines.json -> `system_company_voice` (Text Bot owns it; coder never hand-edits).
Speaker: RITA, Revival Tech's company voice. Sarcastic, only cares about company asset value, always calls the player by
the bare 6-digit `{employee_id}` (never a name). 1-2 short pages per key, each page <= 80 characters.

Keys (4-variant rule): `system_company_voice.crystal_resupply`, `crystal_resupply_2`, `crystal_resupply_3`, `crystal_resupply_4`
(company_voice.js picks a random variant, never the same one twice in a row; rita_voice.js plays a clip per key if one exists).

When: ONLY right after a battle ends, during the opening test run (lab_brookhollow: "catch and log two wild Kilumen"),
when the player has 0 dominance crystals and has not yet caught two. Repeats every time it happens until the run is done.
The bag is refilled to 5 dominance crystals as the line shows.

Meaning: crystal stock is out; Revival Tech is supplying more; the cost will reflect on their paycheck (flavour only:
no real deduction happens, so don't quote an amount). Vars: `{employee_id}`, `{count}` (= 5).

Code fallback in use until filled (src/systems/company_voice.js FALLBACK.crystal_resupply).

Blocked player words: PP, shiny, super effective, Pokédex, Poké Ball, Gotcha!, nurse, weed, route/routes; never "throw"
for capture. No '[TODO' strings.

(Supersedes data/textbot_requests_rita_resupply.md, an earlier draft of the same request; same keys.)
