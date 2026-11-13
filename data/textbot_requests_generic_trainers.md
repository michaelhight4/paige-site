# Text Bot request: generic class-named trainers in region 1 (Coder, Oct 23 2026)

Gary, 12:23 PM CT Oct 23 2026: "also we can add some that are just named young or old trainer or expert trianer or new trainer"
Gary, 12:24 PM CT Oct 23 2026: "those share one model to make it easier"

Five new optional side-fight trainers are placed on the maps (sight 0, talk to challenge). They all share one existing sprite (`tr_ranger_m`).
Each npc has `text_ref: overworld_lines.json maps.<map>.<id>`. None of them has a key in text/overworld_lines.json yet.
Until the keys exist, talking to them does nothing (overworld.js `talk()` returns quietly when there is no entry, and it only starts a battle when the entry has `battle_lost`). So the game is safe in the meantime.
Coder did not edit overworld_lines.json or build_overworld_lines.py.

## Needed keys (same shape as `maps.route1.trainer_r1_e`: pages, battle_lost, after, trainer_class, name, note, lines[default])

**Status at 12:27 PM CT:** Text Bot already drafted keys for all five ids (the ids match, so keep them). But the drafts use personal names (Milo, Tess, Agatha, Percy, Wynn). Please replace each `name` with the class only. "Agatha" is also a name from another franchise, so it has to go regardless.
The game shows `entry.name`, so `name` must be the class text. Coder's map/team data stores no personal names: npc ids plus the class in the note only.

The display name is just the class. Set `name` and `trainer_class` to the same text, e.g. `"name": "Young Trainer", "trainer_class": "Young Trainer"`.

| key | name / trainer_class | where | team | personality hint |
|---|---|---|---|---|
| `maps.route1.trainer_r1_new` | New Trainer | Trail 1, open meadow by the Brookhollow end (east of the trail fork) | peeplark L3 | nervous: first ever battle, shaky but trying |
| `maps.route1.trainer_r1_young` | Young Trainer | Trail 1, mid trail, quiet corner past the big bend | nibbin L5, sailquill L5 | eager: can't wait to battle, bouncy |
| `maps.route1.trainer_r1_expert` | Expert Trainer | Trail 1, near the Fernwick exit at the north end | hushowl L8, pebblant L8, thistlepup L8 | smug/teaching: shows off, then gives a tip (e.g. walk the grass to log more kilumen) |
| `maps.fernwick.trainer_fw_old` | Old Trainer | Fernwick, NW corner west of the heal centre | burlbeetle L7, dewmite L8 | nostalgic: "back in my day" about the trail and the old grass |
| `maps.fernwick.trainer_fw_young` | Young Trainer | Fernwick, west side of the square between the houses | glintfly L6, gloamtick L7 | eager: wants to train for the Master's Hall |

- Lines: short, kid-friendly, 1 page each for `pages` / `battle_lost` / `after`.
- Note: these trainers are all optional. Don't write lines that imply the player must fight them.
- Say "trail", never "route". Capture means holding up a crystal, never throwing.

## Blocked words reminder
No 'PP', 'shiny', 'super effective', 'Pokedex', 'Poke Ball', 'Gotcha!', 'nurse', 'weed', 'route'/'routes', and no 'throw' for capture. No Pokemon/Digimon names or text.
