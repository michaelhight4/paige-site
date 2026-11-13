# Text Bot request: stronger crystals from Benefits Board nodes (Coder, Oct 23 2026)

Gary, 12:17 PM CT Oct 23 2026: "you can get more powerful crystal from the board nodes"

Two new crystal items are in code (`src/systems/data/crystal_grades.js`). Neither has a key in text/overworld_lines.json yet.
The code uses a neutral fallback name until the key exists. Coder did not edit overworld_lines.json.
Neither item shows anywhere in region 1. They only show in a non-region-1 shop once the player owns the `crystal_grade` board node rank, and no board UI exists yet.
So nothing here is urgent for the region 1 update.

## Needed keys (system_item_catalogue, same shape as `dominance_crystal_plus`)

| key | grade | unlocked by | fallback name in code | page ideas (Text Bot to write) |
|---|---|---|---|---|
| `system_item_catalogue.fine_crystal` | 1.25x | crystal_grade rank I | Fine Crystal | A step above a plain crystal. Earned through the Benefits Board. |
| `system_item_catalogue.apex_crystal` | 2x | crystal_grade rank III | Apex Crystal | The strongest crystal the Company issues. Holds the toughest creatures. |

- Format: `{ "name": ..., "pocket": "crystals", "pages": [2 short lines], "parity": "E4", "build": "partial" }`.
- Names are Text Bot's call. The fallbacks are placeholders, so rename them freely. Keep the item ids `fine_crystal` / `apex_crystal`.
- Existing `dominance_crystal_plus` ("Prime Crystal", 1.5x) is now crystal_grade rank II outside region 1. Its text needs no change. Its pages could hint at the board later.
- Read by: `src/battle/ui_sd.js` Pack (via the catalogue name), `src/systems/bag.js` nameOf, and shop lists.

## Later (when the board UI is built, not needed now)

| key idea | what |
|---|---|
| board node name + description for `crystal_grade` ranks I–III | e.g. "Crystal Lab: issue Fine / Prime / Apex crystals". Lives in the CRYSTAL LAB branch per docs/systems_open_source_eval.md §7. |

## Blocked words reminder
No 'throw', 'Poké Ball', 'Great Ball', 'Ultra Ball', 'Master Ball', 'Gotcha!', 'route', 'PP', 'shiny', 'super effective'. Crystals are held up / used, never thrown.
