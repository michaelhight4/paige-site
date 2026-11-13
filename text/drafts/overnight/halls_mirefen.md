# Kilumen hall text: mirefen (coin 5)

**DRAFT, not signed off by Gary.** Overnight Text Bot worker draft, 2026-10-23 00:43 CT. Source: `design/overnight_gd/halls/mirefen.json` (read only).

- Master: **Wenna Peat** (swamp) — DRAFT — open question for Gary
- Coin: **Reed Coin** — DRAFT — open question for Gary (needs web clash check). Player text says 'coin', never the other word.
- Hall map: `mirefen_hall_int` (unbuilt). Flag: `beat_master_mirefen`. Puzzle: Bog-light boardwalk (outline).
- Key style follows `overworld_lines.json` (`pages` = intro, `battle_lost` = their line when the player wins, `after` = talk again). New keys for Coder to confirm: `battle_won` (Master's line when the player loses), `coin_handover`, `gift`, `skill_learned`, `after_storm`.
- Hall signs, guide and puzzle hints have no ids in the GD file, so they use `TODO-spot:<hall_map>_<thing>` for World Design to place.

Text_refs filled: 4/4 (`trainers.hall_mirefen.h1`, `trainers.hall_mirefen.h2`, `trainers.hall_mirefen.h3`, `masters.mirefen`). Lines (text boxes): 33.

## Notes

- GD puzzle outline uses a banned weather word for the dark hall; house rule bans it, so all text says 'dark' instead. World/Coder: please use a darkness layer and keep the effect wordless.
- after_storm plays on storm_season && !has_tideglide; it gives Tideglide (has_tideglide). skill = system line.

## masters.mirefen

```json
{
 "_name": "Wenna Peat",
 "_name_status": "DRAFT — open question for Gary",
 "_coin_name": "Reed Coin",
 "_coin_name_status": "DRAFT — open question for Gary (web clash check pending)",
 "_element": "swamp",
 "_flag": "beat_master_mirefen",
 "_npc_id": "master_mirefen",
 "pages": [
  "Folk call the bog dirty. It's just honest. Everything in it is doing something.",
  "Same as my team. Come on, then."
 ],
 "battle_lost": [
  "Muddy work. Good work."
 ],
 "battle_won": [
  "The bog takes boots, not grudges.",
  "Dry off and come back."
 ],
 "coin_handover": [
  "Take the Reed Coin. That's five.",
  "It's been in the bog. It's been cleaned. Twice."
 ],
 "gift": [
  "A couple of seeds too. Feed them to your team, not the garden."
 ],
 "after": [
  "Storm's coming in off the sea. You'll feel it by tonight.",
  "When it hits, come and find me. I'll teach your team to glide the water."
 ],
 "lines": [
  {
   "id": "default",
   "flags": [],
   "pages": [
    "Folk call the bog dirty. It's just honest. Everything in it is doing something.",
    "Same as my team. Come on, then."
   ]
  }
 ],
 "after_storm": [
  "There it is. The coast road's under water now.",
  "Let's teach your team Tideglide. Stay on its back and let it do the work."
 ],
 "skill_learned": [
  "You can now use Tideglide outside battle."
 ]
}
```

## trainers (hall_mirefen)

```json
{
 "hall_mirefen": {
  "h1": {
   "_id": "tr_hall_mirefen_h1",
   "_name": "Cass",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "mirewump",
    "bulrusher"
   ],
   "pages": [
    "The planks you can't see are still there. Probably."
   ],
   "battle_lost": [
    "Probably I should've trained more."
   ],
   "after": [
    "A sinking plank comes back up. Count two, then go."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "The planks you can't see are still there. Probably."
     ]
    }
   ]
  },
  "h2": {
   "_id": "tr_hall_mirefen_h2",
   "_name": "Juno",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "gloamtick",
    "mirewump"
   ],
   "pages": [
    "It's dark in here on purpose. Wenna says it builds character."
   ],
   "battle_lost": [
    "My character's fine. My team, less so."
   ],
   "after": [
    "The frogs croak in an order. Light the lamps the same way."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "It's dark in here on purpose. Wenna says it builds character."
     ]
    }
   ]
  },
  "h3": {
   "_id": "tr_hall_mirefen_h3",
   "_name": "Arlo",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "cypresshade",
    "mirejaw"
   ],
   "pages": [
    "Last stretch of boards. My Mirejaw sleeps under this one."
   ],
   "battle_lost": [
    "Now he's awake. Thanks for that."
   ],
   "after": [
    "Can't hear the frogs? Watch for ripples. Each one starts by a lamp."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "Last stretch of boards. My Mirejaw sleeps under this one."
     ]
    }
   ]
  }
 }
}
```

## Hall signs + guide (TODO-spot)

```json
{
 "TODO-spot:mirefen_hall_int_sign_hall_outside": [
  "MIREFEN MASTER'S HALL\nMaster: Wenna Peat (swamp)",
  "Stilts checked every spring. Mostly."
 ],
 "TODO-spot:mirefen_hall_int_sign_boardwalk": [
  "BOG-LIGHT BOARDWALK\nLight a reed lamp to see the planks near it.",
  "Some planks sink. Wait and they come back up. Listen to the frogs."
 ],
 "TODO-spot:mirefen_hall_int_guide": [
  "It's dark on the water. Light a reed lamp and you'll see the planks near it.",
  "The frogs croak in an order. Light the lamps in that same order.",
  "Can't hear them? Watch the water. Every croak leaves a ripple by its lamp."
 ]
}
```

## Puzzle hint text (TODO-spot)

Puzzle outline (GD): [GD: the hall starts dark — see the note above.] Reed lamps along the walls: lighting one shows the boardwalk planks near it for a while. Some planks sink after 2 steps and come back up. Light lamps in the order the frogs croak (sound cue + ripple on the water for accessibility) to reveal the full path to the Master.

```json
{
 "TODO-spot:mirefen_hall_int_reed_lamp": [
  "A reed lamp. Light it?"
 ],
 "TODO-spot:mirefen_hall_int_reed_lamp_lit": [
  "The lamp catches. Planks show up on the water nearby."
 ],
 "TODO-spot:mirefen_hall_int_reed_lamp_wrong": [
  "The lamps flicker out. The frogs go quiet, then start again."
 ],
 "TODO-spot:mirefen_hall_int_sinking_plank": [
  "This plank is sinking. Give it a moment."
 ]
}
```
