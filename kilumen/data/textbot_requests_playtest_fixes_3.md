# Text Bot requests: playtest fixes 3 (Coder, Oct 29 2026)

New player-facing keys used with placeholder fallbacks in code. Text Bot owns text/*.py, so these were NOT added there.
Please add final copy (no banned words: PP, shiny, super effective, Pokédex, Poké Ball, Gotcha!, nurse, weed, route, throw, berry).

| Key | Used in | Placeholder (fallback in code) |
|---|---|---|
| `system_items.team_link_band.pages` | Pack item info (src/ui/systems_screens.js) | Shares battle XP: the team earns 25% more. Give it to a creature to hold. |
| `system_party.summary_labels.labels.met_starter` | Team detail "Met in" for a starter with no map record | Your first partner |
| `system_party.summary_labels.labels.met_gift` | Team detail "Met in" for a gift creature with no map record | A gift |

Also: the Mirefen Master's gate line (hall lamps not solved yet) lives in src/progression/index.js:
"Light the reed lamps in the right order first. Then we talk." A key for it would be welcome.
