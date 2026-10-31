# Text Bot request: RT Benefits board reset + board point tasks + tree bonuses (dev/rt-respec, Oct 31 2026)

All lines below are PLACEHOLDERS in code. Please write final RITA-tone text. Keep `{tokens}` exactly.

## Reset (system_rt_benefits.*, fallback in src/ui/rt_benefits_screen.js RTB_TEXT)
| key | placeholder |
|---|---|
| labels.reset | Reset board |
| labels.reset_go | Reset |
| confirm_reset | Reset the board? Every rank goes back and you get all {points} spent points back. Key cards stay. Free. HR is shocked too. |
| toast.reset | Board reset. {points} points back in your pocket. |
| toast.reset_none | Nothing to reset. You have not spent anything. |
| confirm (existing, please revise) | currently ends "No refunds. Company policy." which is no longer true now that resets exist |

## Board point tasks (system_tasks.board_tasks.<id>.{title,rule}) — src/systems/board_tasks.js
| id | points | placeholder title | placeholder rule |
|---|---|---|---|
| oly_town_<venue> x8 (fernwick, saltmere, revival_heights, frostspire, lanternport, cindervale, mirefen, tidewater) | 1 each | {Town} Champion | Win the {Town} Olympics. |
| oly_gold_<venue> x8 (signature: hop, haul, relay, slide, catch, push, sprint, swim) | 1 each | {Event} Gold | Win gold in {Event} at {Town}. |
| oly_aurelith | 2 | Aurelith Champion | Win the Aurelith Olympics. |
| oly_sweep | 1 | Clean Sweep | Win every event in one town Olympics. |
| oly_sweep_aurelith | 1 | Grand Sweep | Win every event in the Aurelith Olympics. |

## Tree bonuses (system_tasks.board_tasks.tree_bonus.*)
| key | placeholder |
|---|---|
| toast | Tree complete: {tree}. +1 benefit point. |
| tree.oly_towns | Town Champions |
| tree.oly_golds | Signature Golds |
| tree.oly_grand | Grand Olympics |
Milestone card trees reuse the existing system_tasks.milestones.<id>.title.

## v2 — Tasks screen "Board tasks" section (PLACEHOLDER text, please replace)
Keys under `system_tasks.board_tasks.*` (fallbacks live in `BOARD_TASK_TEXT`, src/systems/board_tasks.js):
- `head` — "Board tasks" (section header, shows done/19)
- `tree.oly_towns` / `tree.oly_golds` / `tree.oly_grand` — "Town Champions" / "Signature Golds" / "Grand Olympics"
- `rule.oly_towns` / `rule.oly_golds` / `rule.oly_grand` — one-line rule per tree
- `<task_id>.title` for all 19 task ids (oly_town_<venue>, oly_gold_<venue>, oly_aurelith, oly_sweep, oly_sweep_aurelith) — placeholder is the venue / "Event (Venue)" name
- `points` — "+{n} pt"; `progress` — "{done}/{total}"
- `tree_bonus` — "Tree bonus +{n}"; `tree_bonus_done` — "Tree bonus earned" (also shown as a chip on every milestone row)
- `bonuses` — "Tree bonuses {done}/{total}" (22 trees); `bonuses_rule` — "Finish every task in a tree for +1 benefit point, once per tree."
