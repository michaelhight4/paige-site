# Sports events: status and build plan (dev/sports-events, Oct 29 2026)

| Event | Town | Status |
|---|---|---|
| Brookhollow Dash (Coach Wren) | Brookhollow | LIVE: practice + tournament every 3 days; Dash badge now unlocks from tournament wins |
| Garden Hop | Fernwick | BUILT: practice + town cup (this branch) |
| Tide Run | Saltmere | BUILT: practice + town cup |
| Signal Relay | Revival Heights | BUILT: practice + town cup |
| Ice Slide | Frostspire | BUILT (was locked behind LIVE_REGION=3): practice + town cup |
| Lantern Catch | Lanternport | BUILT (was locked): practice + town cup |
| Forge Push | Cindervale | BUILT (was locked): practice + town cup |
| Aurelith Games (major) | Aurelith | PLANNED: badge stays "coming soon" |
| Tug of war (strength, team) | TBD | PLANNED (Gary Oct 28): no code yet |

Town cups (src/sports/town_cup.js): 100 gold entry, 600 prize (times the difficulty money multiplier), every 3 in-game days,
staggered by region (offset = region % 3) so some town holds its cup every day, one entry per window. Three seeded rivals
post scores from their athletics stats; beat them all to win. A win shows the Dash champion screen (only Cal and the winning
Kilumen, big medal behind) and stacks the town's badge. Life: per-town coach (placeholder names), coach quips mid-run,
a pre-rendered crowd strip that bobs with hype, gasps on a slip and roars on streaks (one drawImage a frame).

## Build plan: Aurelith Games (major)
1. Entry gate: one town cup won in at least 4 of the 6 towns (badge counts already exist).
2. Format: reuse meet.js (brackets-manager) with an `aurelith` multi-event: 3 rounds, each a random town event; points via POINTS.
3. Schedule: every 9 in-game days (one per 3 town-cup cycles), fee 500, prize 3000 plus the `games_aurelith_major` badge.
4. Venue: an Aurelith stadium NPC (reuse coach model + palette swap); bigger crowd strip (3 rows); same champion screen.
5. Tests: entry gate, schedule, settle; shots on PC and phone. About 1-2 days.

## Build plan: Tug of war
1. Team entrant (meet.js already supports kind 'team'): 3 creatures, strength = sum of `power` + `stamina` weighting.
2. Mechanic: rhythm-tap pull meter vs a rival team (port a free-licensed tug/tap-race mechanic, credit in THIRD_PARTY_LICENSES).
3. Gary to pick the town; then add it to TOWN_EVENTS and the cup schedule. About 2 days.
