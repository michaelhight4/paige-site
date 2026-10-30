# Text Bot requests: final Ron at the Aurelith tower (Coder, Oct 29 2026, DRAFT)

Code: `src/region78/arena.js` (RON7, towerTop, ron7Talk). Tower = the 8 Arena rooms `aurelith_arena_room_1`..`_8`;
final Ron waits in the lobby `aurelith_arena` by the exit (NPC `aurelith_arena_ron_final`, battle key
`aurelith_arena_int.aurelith_arena_ron_final`). Merge into `text/overworld_lines.json` (union-merge, overworld_lines only).

## Already written and used as-is (approved Gary 5:55 PM CT, `ron.final_tower`)
| story_beats name | key used | when |
|---|---|---|
| ron.tower_top_wait | `ron.final_tower.top_wait` | room 8 won (first clear): Ron beside the player, then he leaves |
| ron.bottom_congrats | `ron.final_tower.intro` | talk to Ron in the lobby |
| ron.ron7_intro | `ron.final_tower.challenge` | right before the battle |
| ron.ron7_lose | `ron.final_tower.battle_lost` | player won |
| (loss) | `ron.final_tower.battle_won` | player lost (blackout follows) |
| ron.ron7_after | `ron.final_tower.after` | after the win (then the ending), and on later talks |

## New (please write)
- `system_arena.tower_heal` - `{pages}` system line right after Ron's top_wait: the stadium staff fully heal the team
  (NOT Ron: Gary dropped Ron's free heal, story_beats F-0 rev 2). Fallback: "The stadium staff patch your team up. All Kilu are fully healed."
  Banned-word list applies.
