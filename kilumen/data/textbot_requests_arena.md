# Text Bot requests: Aurelith Arena (Coder, Oct 29 2026, DRAFT)

Map `aurelith_arena` (behind the stadium lobby doors, gate_aurelith_arena / all_badges). Code: `src/region78/arena.js`
(fallbacks in ARENA_FALLBACK until these land). Call them "Arena fighters" (banned-word list applies).

## maps.aurelith_arena
- `aurelith_arena_clerk` - `{pages}` sign-up clerk: explains 8 Arena fighters, back to back, no heal between, start with the first fighter by the door.
- `arena_fighter_1` .. `arena_fighter_8` - each `{name, pages, battle_lost, battle_won}`:
  `pages` = challenge, `battle_lost` = line after the player beats them, `battle_won` = line when the player loses.
  | id | type | name (placeholder) | ace |
  |---|---|---|---|
  | arena_fighter_1 | water | Marlo | Hullwhale L67 |
  | arena_fighter_2 | fire | Sabine | Calderax L67 |
  | arena_fighter_3 | wind | Teo | Stratodrake L68 |
  | arena_fighter_4 | earth | Hesper | Geodrake L68 |
  | arena_fighter_5 | grass | Bram | Sproutwyrm L68 |
  | arena_fighter_6 | light | Iona | Northling L69 |
  | arena_fighter_7 | mystic | Quill | Novarch L69 |
  | arena_fighter_8 | dark | Corvin | Maestrix L69 |

## system_arena (pages lists)
- `run_start` - asked by fighter 1 before the run (Yes / No answer follows).
- `next_fighter` - between fights.
- `fighter_waiting` - fighters 2-8 if talked to directly ("start with the first fighter").
- `run_lost` - the run ends (blackout to the last clinic follows).
- `run_won` - all 8 beaten (sets `arena_cleared`).
- `clerk_cleared` - clerk after `arena_cleared`.
