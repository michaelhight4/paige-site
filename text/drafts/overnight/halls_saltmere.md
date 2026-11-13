# Kilumen hall text: saltmere (coin 2)

**DRAFT, not signed off by Gary.** Overnight Text Bot worker draft, 2026-10-23 00:43 CT. Source: `design/overnight_gd/halls/saltmere.json` (read only).

- Master: **Nerys Bryde** (water (PROPOSED; sprite tr_master_saltmere_f exists)) — DRAFT — open question for Gary
- Coin: **Brine Coin** — DRAFT — open question for Gary (needs web clash check). Player text says 'coin', never the other word.
- Hall map: `saltmere_hall_int` (unbuilt). Flag: `beat_master_saltmere`. Puzzle: Salt-pan sluices (outline).
- Key style follows `overworld_lines.json` (`pages` = intro, `battle_lost` = their line when the player wins, `after` = talk again). New keys for Coder to confirm: `battle_won` (Master's line when the player loses), `coin_handover`, `gift`.
- Hall signs, guide and puzzle hints have no ids in the GD file, so they use `TODO-spot:<hall_map>_<thing>` for World Design to place.

Text_refs filled: 4/4 (`trainers.hall_saltmere.h1`, `trainers.hall_saltmere.h2`, `trainers.hall_saltmere.h3`, `masters.saltmere`). Lines (text boxes): 31.

## Notes

- Courier Bike comes from the RT office clerk (quests_story.md), not the Master; no bike line here.
- gift_item dominance_crystal_plus x3 -> 'these crystals' (display name TBD).

## masters.saltmere

```json
{
 "_name": "Nerys Bryde",
 "_name_status": "DRAFT — open question for Gary",
 "_coin_name": "Brine Coin",
 "_coin_name_status": "DRAFT — open question for Gary (web clash check pending)",
 "_element": "water (PROPOSED; sprite tr_master_saltmere_f exists)",
 "_flag": "beat_master_saltmere",
 "_npc_id": "master_saltmere",
 "pages": [
  "Saltmere runs on tides and paperwork. I handle the tides.",
  "You crossed my pans dry. Let's see how you do in deep water."
 ],
 "battle_lost": [
  "Well. That's the tide gone out on me."
 ],
 "battle_won": [
  "The sea doesn't hold a grudge, and neither do I.",
  "Dry off and come back."
 ],
 "coin_handover": [
  "Take the Brine Coin. That's two.",
  "Salt gets into it. Give it a rub now and then."
 ],
 "gift": [
  "And these crystals. Better than the shop ones. Don't tell the shop."
 ],
 "after": [
  "The fallen trunk on the Thornwood trail? Two coins and the crew will clear it for you.",
  "Revival Heights is up that way. Mind how you go."
 ],
 "lines": [
  {
   "id": "default",
   "flags": [],
   "pages": [
    "Saltmere runs on tides and paperwork. I handle the tides.",
    "You crossed my pans dry. Let's see how you do in deep water."
   ]
  }
 ]
}
```

## trainers (hall_saltmere)

```json
{
 "hall_saltmere": {
  "h1": {
   "_id": "tr_hall_saltmere_h1",
   "_name": "Nell",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "sandstarlet",
    "blubbet"
   ],
   "pages": [
    "Careful, the floor's half salt and half sea.",
    "Mostly sea right now."
   ],
   "battle_lost": [
    "I slipped. Not on the floor. In the battle."
   ],
   "after": [
    "Watch what each wheel does to the pan next door, not just its own."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "Careful, the floor's half salt and half sea.",
      "Mostly sea right now."
     ]
    }
   ]
  },
  "h2": {
   "_id": "tr_hall_saltmere_h2",
   "_name": "Ivo",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "medulet",
    "whelkin"
   ],
   "pages": [
    "I turn these wheels all day. My arms are huge.",
    "My team's even bigger. Let's go."
   ],
   "battle_lost": [
    "Okay. My arms are still huge, though."
   ],
   "after": [
    "Pan went under? Turn the same wheel back. Nothing in here is stuck for good."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "I turn these wheels all day. My arms are huge.",
      "My team's even bigger. Let's go."
     ]
    }
   ]
  },
  "h3": {
   "_id": "tr_hall_saltmere_h3",
   "_name": "Sully",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "finnip",
    "ribboneel"
   ],
   "pages": [
    "Last wheel's mine. You want the dais, you go through me."
   ],
   "battle_lost": [
    "Fine. The dais is yours. The wheel's still mine."
   ],
   "after": [
    "The stripes on the drying rack aren't decoration. Just saying."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "Last wheel's mine. You want the dais, you go through me."
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
 "TODO-spot:saltmere_hall_int_sign_hall_outside": [
  "SALTMERE MASTER'S HALL\nMaster: Nerys Bryde (water)",
  "Wipe your boots. The pans are wet. All of them."
 ],
 "TODO-spot:saltmere_hall_int_sign_sluices": [
  "SLUICE WHEELS\nEach wheel lifts one pan and drops the one next to it.",
  "Lost your dry line? Step on the tile by the door to reset."
 ],
 "TODO-spot:saltmere_hall_int_guide": [
  "Three wheels, three pans. Each wheel lifts one pan and drops its neighbour.",
  "Turn one, then look at all three. Not just the one you turned.",
  "The drying rack by the door knows the order. It just won't say it out loud."
 ]
}
```

## Puzzle hint text (TODO-spot)

Puzzle outline (GD): The hall is a row of salt pans at three water heights. Three sluice wheels each raise one pan and lower its neighbour. Raised pans are walkable salt crust; lowered pans are water (no Tideglide yet). Turn the wheels in the right order to make a dry line to the dais. A drying rack shows the order as salt stripes (hint without text). Reset tile at the door.

```json
{
 "TODO-spot:saltmere_hall_int_drying_rack": [
  "A drying rack. Salt has dried on the cloth in stripes.",
  "Some stripes are wide, some are thin. Like someone counting."
 ],
 "TODO-spot:saltmere_hall_int_reset_tile": [
  "Reset tile. The pans slosh back to how they started."
 ]
}
```
