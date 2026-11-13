# Kilumen hall text: cindervale (coin 8)

**DRAFT, not signed off by Gary.** Overnight Text Bot worker draft, 2026-10-23 00:43 CT. Source: `design/overnight_gd/halls/cindervale.json` (read only).

- Master: **Brannock Fell** (fire + magma) — DRAFT — open question for Gary
- Coin: **Forge Coin** — DRAFT — open question for Gary (needs web clash check). Player text says 'coin', never the other word.
- Hall map: `cindervale_hall_int` (unbuilt). Flag: `beat_master_cindervale`. Puzzle: Quench channels (outline).
- Key style follows `overworld_lines.json` (`pages` = intro, `battle_lost` = their line when the player wins, `after` = talk again). New keys for Coder to confirm: `battle_won` (Master's line when the player loses), `coin_handover`, `gift`.
- Hall signs, guide and puzzle hints have no ids in the GD file, so they use `TODO-spot:<hall_map>_<thing>` for World Design to place.

Text_refs filled: 5/5 (`trainers.hall_cindervale.h1`, `trainers.hall_cindervale.h2`, `trainers.hall_cindervale.h3`, `trainers.hall_cindervale.h4`, `masters.cindervale`). Lines (text boxes): 35.

## Notes

- 'after' avoids saying the arena is open: arena unlock (all_badges vs finale_done) is still an open question for Gary.
- Internal flag all_badges is never shown; player text says coin(s).

## masters.cindervale

```json
{
 "_name": "Brannock Fell",
 "_name_status": "DRAFT — open question for Gary",
 "_coin_name": "Forge Coin",
 "_coin_name_status": "DRAFT — open question for Gary (web clash check pending)",
 "_element": "fire + magma",
 "_flag": "beat_master_cindervale",
 "_npc_id": "master_cindervale",
 "pages": [
  "Seven coins. The road's hammered you into shape on the way here.",
  "Last one's mine. Let's see what you're made of."
 ],
 "battle_lost": [
  "Ha! Tempered. That's what you are."
 ],
 "battle_won": [
  "Not yet. Cool off and come back hotter."
 ],
 "coin_handover": [
  "Take the Forge Coin. That's eight. That's all of them.",
  "Made it myself. It'll outlast both of us."
 ],
 "gift": [
  "Three seeds for your team. The last stop's earned them."
 ],
 "after": [
  "Eight coins. Folk in Aurelith will want to know your name now.",
  "Go home for a bit. You look like you need it."
 ],
 "lines": [
  {
   "id": "default",
   "flags": [],
   "pages": [
    "Seven coins. The road's hammered you into shape on the way here.",
    "Last one's mine. Let's see what you're made of."
   ]
  }
 ]
}
```

## trainers (hall_cindervale)

```json
{
 "hall_cindervale": {
  "h1": {
   "_id": "tr_hall_cindervale_h1",
   "_name": "Jem",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "slagrook",
    "foundrax"
   ],
   "pages": [
    "Mind the apron. It's my good one."
   ],
   "battle_lost": [
    "Still a good apron."
   ],
   "after": [
    "Taps are few. Count the tiles you need before you pour."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "Mind the apron. It's my good one."
     ]
    }
   ]
  },
  "h2": {
   "_id": "tr_hall_cindervale_h2",
   "_name": "Kerr",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "pyrogrim",
    "sunderhoof"
   ],
   "pages": [
    "It's warm in here. That's not a joke, I'm just telling you."
   ],
   "battle_lost": [
    "Now I'm warm and I've lost."
   ],
   "after": [
    "Cooled tiles near a bellows won't stay cool. Pick a line away from them."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "It's warm in here. That's not a joke, I'm just telling you."
     ]
    }
   ]
  },
  "h3": {
   "_id": "tr_hall_cindervale_h3",
   "_name": "Lark",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "ingotitan",
    "slagrook"
   ],
   "pages": [
    "My Ingotitan's been at this forge longer than me. Show it some respect."
   ],
   "battle_lost": [
    "It respected you back. Annoying."
   ],
   "after": [
    "The lever by the door starts the floor over. Use it. Nobody counts."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "My Ingotitan's been at this forge longer than me. Show it some respect."
     ]
    }
   ]
  },
  "h4": {
   "_id": "tr_hall_cindervale_h4",
   "_name": "Mabry",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "kilnant",
    "cinderwraith"
   ],
   "pages": [
    "Seven coins? That's why your hands look so steady."
   ],
   "battle_lost": [
    "Mine don't. Go on, the anvil's yours."
   ],
   "after": [
    "Brannock talks a lot before he battles. Let him. It's the only break you'll get."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "Seven coins? That's why your hands look so steady."
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
 "TODO-spot:cindervale_hall_int_sign_hall_outside": [
  "CINDERVALE MASTER'S HALL\nThe Forge. Master: Brannock Fell (fire)",
  "Floor's hot. Shoes are your problem."
 ],
 "TODO-spot:cindervale_hall_int_sign_quench": [
  "QUENCH CHANNELS\nFill the bucket at a spring tap. It holds three pours.",
  "Pour on lava to cool it to stone. Bellows heat it back up."
 ],
 "TODO-spot:cindervale_hall_int_sign_reset_lever": [
  "RESET LEVER\nPull to start the floor over. Nobody's counting."
 ],
 "TODO-spot:cindervale_hall_int_guide": [
  "Spring taps fill your bucket. Three pours a bucket, and there aren't many taps.",
  "Pour on lava and it cools to stone for good. Unless a bellows gets at it.",
  "Count the tiles you need before your first pour. Then count again."
 ]
}
```

## Puzzle hint text (TODO-spot)

Puzzle outline (GD): Lava channels cross the forge floor. Spring taps fill a bucket (holds 3 pours). Pour on a lava tile to cool it to stone for good. Taps are few, so plan which tiles to cool. Bellows tiles push heat back and re-melt nearby cooled tiles (2 rooms). Reset lever at the door.

```json
{
 "TODO-spot:cindervale_hall_int_spring_tap": [
  "A spring tap. Your bucket fills up. Three pours."
 ],
 "TODO-spot:cindervale_hall_int_spring_tap_dry": [
  "The tap's dry. That's all this one had."
 ],
 "TODO-spot:cindervale_hall_int_pour": [
  "Pour water on the lava?"
 ],
 "TODO-spot:cindervale_hall_int_poured": [
  "It hisses and goes dark. Stone now."
 ],
 "TODO-spot:cindervale_hall_int_bellows": [
  "A bellows. It huffs heat at the tiles around it."
 ],
 "TODO-spot:cindervale_hall_int_remelt": [
  "The bellows huffs. The stone nearby glows red again."
 ]
}
```
