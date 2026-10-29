# Text Bot requests: Aurelith Arena (Coder, Oct 29 2026, DRAFT)

Maps: lobby `aurelith_arena` (behind the stadium lobby doors, gate_aurelith_arena / all_badges) and one themed room per
fighter, `aurelith_arena_room_1`..`_8` (stairs between rooms open when that room's fighter is beaten in the run). Text keys
stay under `maps.aurelith_arena.*` for all fighters. Code: `src/region78/arena.js`
(fallbacks in ARENA_FALLBACK until these land). Call them "Arena fighters" (banned-word list applies).

## maps.aurelith_arena
- `aurelith_arena_clerk` - `{pages}` sign-up clerk: explains 8 Arena fighters, back to back, no heal between, take the stairs to the first room.
- `arena_fighter_1` .. `arena_fighter_8` - each `{name, pages, battle_lost, battle_won}`:
  `pages` = challenge, `battle_lost` = line after the player beats them, `battle_won` = line when the player loses.
  | id | room | type | name (fallback; text `name` wins) | ace |
  |---|---|---|---|---|
  | arena_fighter_1 | aurelith_arena_room_1 | water | Marisol | Hullwhale L67 |
  | arena_fighter_2 | aurelith_arena_room_2 | fire | Ignatia | Calderax L67 |
  | arena_fighter_3 | aurelith_arena_room_3 | wind | Zephra | Stratodrake L68 |
  | arena_fighter_4 | aurelith_arena_room_4 | earth | Ottoline | Geodrake L68 |
  | arena_fighter_5 | aurelith_arena_room_5 | grass | Fennick | Sproutwyrm L68 |
  | arena_fighter_6 | aurelith_arena_room_6 | light | Iona | Northling L69 |
  | arena_fighter_7 | aurelith_arena_room_7 | mystic | Oriel | Novarch L69 |
  | arena_fighter_8 | aurelith_arena_room_8 | dark | Corvin | Maestrix L69 |

## system_arena (pages lists)
- `run_start` - asked by fighter 1 before the run (Yes / No answer follows).
- `next_fighter` - after a win: the stairs to the next room are open.
- `fighter_beaten` - a fighter already beaten in this run, talked to again.
- `fighter_waiting` - fighters 2-8 if talked to directly ("start with the first fighter").
- `run_lost` - the run ends (also ends when the player walks back down to the lobby) (blackout to the last clinic follows).
- `run_won` - all 8 beaten (sets `arena_cleared`).
- `clerk_cleared` - clerk after `arena_cleared`.
