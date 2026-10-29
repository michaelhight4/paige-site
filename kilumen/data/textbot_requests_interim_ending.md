# Text Bot requests: interim ending (v0.2.86-alpha, branch dev/interim-ending)

Gary approved an interim ending (Oct 29 2026): beat Ron 6 in Aurelith holding all 8 coins -> Ron + RITA lines -> credits
scroll -> warp home to Brookhollow -> postgame note. The game keeps going after it (the Aurelith Arena / mq_finale is unbuilt).

Code reads these keys from `text/overworld_lines.json` and falls back to the placeholder wording below until they exist
(`src/progression/ending.js` ENDING_FALLBACK, `src/ui/credits.js` CREDIT_FALLBACK). Text Bot owns text/*; Coder did not edit it.
Blocked words still apply (PP, shiny, super effective, Pokédex, Poké Ball, Gotcha!, nurse, weed, route(s), berry);
tests/interim_ending.test.mjs scans the fallbacks. `{name}` = player name. Arrays = dialog pages / credit lines.

## Reused (already written, no request)
- Ron after the win: `maps.aurelith.aurelith_ron_6.after` ("Lead the way. I'll try to look like I belong.")
- RITA after the win: `system_company_voice.rival_beaten_ron_6_2` (fires as the RITA beat right after Ron)

## New keys requested: `system_ending.*`
| key | shown | placeholder |
|---|---|---|
| `ron_home` | pages, Ron, on arriving home in Brookhollow | "Home, then. Head Office can wait one more day." / "Somebody should take the bins out. ...Fine. Tomorrow." |
| `postgame` | pages, system note after ron_home | "GAME CLEARED." / "Your save keeps going: catch, battle and explore anywhere you like." / "The Aurelith Arena opens in a future update. Head Office is still up there." |
| `credits_open` | lines under the KILUMEN title | "You did it, {name}." / "Eight coins. One Ron. A very long week." |
| `credits_team_head` | heading over the player's team sprites | "The team that got you here" |
| `credits_coins_head` | heading over the 8 coin towns | "Eight halls, eight coins" |
| `credits_ron` | [heading, lines...] | "Ron" / "Who lost six times" / "and came along anyway." |
| `credits_rita` | [heading, lines...] | "RITA" / "Who logged every step." / "Lunch break: still pending." |
| `credits_bin` | [heading, lines...] (Ron's bin running joke) | "The bin" / "Still waiting." / "Ron says tomorrow." |
| `credits_crew_head` | heading | "Made with care by" |
| `credits_crew` | [[role, name], ...] (Gary to confirm names) | Director: Gary · Story: Story Bot · Words: Text Bot · World: World Design · Art & animation: the art team · Code: Coder · Studio: Paige Games |
| `credits_thanks` | lines | "And you." / "Thank you for playing Kilumen." |
| `credits_end` | end card, held ~2.6 s | "To be continued..." / "Head Office is still up there." |

Tone ask (Gary): heart, not a bare list. Warm, a little funny, short lines (the scroll is ~60 s at normal speed).
