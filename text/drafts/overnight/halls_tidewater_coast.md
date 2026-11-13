# Kilumen hall text: tidewater_coast (coin 6)

**DRAFT, not signed off by Gary.** Overnight Text Bot worker draft, 2026-10-23 00:43 CT. Source: `design/overnight_gd/halls/tidewater_coast.json` (read only).

- Master: **Jory Swell** (sea) — DRAFT — open question for Gary
- Coin: **Undertow Coin** — DRAFT — open question for Gary (needs web clash check). Player text says 'coin', never the other word.
- Hall map: `tidewater_hall_int` (unbuilt). Flag: `beat_master_tidewater`. Puzzle: Tide clock (outline).
- Key style follows `overworld_lines.json` (`pages` = intro, `battle_lost` = their line when the player wins, `after` = talk again). New keys for Coder to confirm: `battle_won` (Master's line when the player loses), `coin_handover`, `gift`.
- Hall signs, guide and puzzle hints have no ids in the GD file, so they use `TODO-spot:<hall_map>_<thing>` for World Design to place.

Text_refs filled: 5/5 (`trainers.hall_tidewater_coast.h1`, `trainers.hall_tidewater_coast.h2`, `trainers.hall_tidewater_coast.h3`, `trainers.hall_tidewater_coast.h4`, `masters.tidewater_coast`). Lines (text boxes): 34.

## Notes

- h1 name is still TBD_NAME_1 (GD) — name needed, open question for Gary. h1 is talk-to (in water), so the intro asks.
- h4 GD name 'Ferris' clashes with a Lantern Rest stone (QUESTS open q 6). Lines never name him; rename — open question for Gary.
- GD gift id (energy remedy) -> display 'Pep Remedy'.

## masters.tidewater_coast

```json
{
 "_name": "Jory Swell",
 "_name_status": "DRAFT — open question for Gary",
 "_coin_name": "Undertow Coin",
 "_coin_name_status": "DRAFT — open question for Gary (web clash check pending)",
 "_element": "sea",
 "_flag": "beat_master_tidewater",
 "_npc_id": "master_tidewater_coast",
 "pages": [
  "Calm water lies. Down here, the pull's always going somewhere.",
  "Let's see if your team keeps its footing."
 ],
 "battle_lost": [
  "That's me pulled under. Fair enough."
 ],
 "battle_won": [
  "The sea wins some. Not every one, though.",
  "Try again."
 ],
 "coin_handover": [
  "Take the Undertow Coin. That's six.",
  "Feels heavier than it is. That's the point."
 ],
 "gift": [
  "Two Pep Remedies. The swim out is longer than the swim in."
 ],
 "after": [
  "Lanternport's north up the coast. Take the sea lane. The road's long gone.",
  "Their Master keeps the old lighthouse. Bring a warm jumper."
 ],
 "lines": [
  {
   "id": "default",
   "flags": [],
   "pages": [
    "Calm water lies. Down here, the pull's always going somewhere.",
    "Let's see if your team keeps its footing."
   ]
  }
 ]
}
```

## trainers (hall_tidewater_coast)

```json
{
 "hall_tidewater_coast": {
  "h1": {
   "_id": "tr_hall_tidewater_coast_h1",
   "_name": "TBD_NAME_1",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "squidge",
    "spinyclaw"
   ],
   "pages": [
    "Don't mind me, I'm checking the ledges.",
    "Fancy a battle while you're down here?"
   ],
   "battle_lost": [
    "Right. Back under I go."
   ],
   "after": [
    "High tide opens the glide lanes. Low tide opens the floor. Mix them."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "Don't mind me, I'm checking the ledges.",
      "Fancy a battle while you're down here?"
     ]
    }
   ]
  },
  "h2": {
   "_id": "tr_hall_tidewater_coast_h2",
   "_name": "Moss",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "downpaw",
    "driftknot"
   ],
   "pages": [
    "Tide's coming in. You've got about one battle."
   ],
   "battle_lost": [
    "And now the tide's coming in on me."
   ],
   "after": [
    "Stop the clock at high when you need a lane. Stop it at low when you need the floor."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "Tide's coming in. You've got about one battle."
     ]
    }
   ]
  },
  "h3": {
   "_id": "tr_hall_tidewater_coast_h3",
   "_name": "Edda",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "nudiblume",
    "tundrarch"
   ],
   "pages": [
    "The water moves every few steps. I counted. I had time."
   ],
   "battle_lost": [
    "I'll go count something else."
   ],
   "after": [
    "We move with the tide too. If I'm on a different ledge later, that's why."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "The water moves every few steps. I counted. I had time."
     ]
    }
   ]
  },
  "h4": {
   "_id": "tr_hall_tidewater_coast_h4",
   "_name": "Ferris",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "foamkin",
    "coilarch"
   ],
   "pages": [
    "Last ledge. Jory's past me, on the dry rock."
   ],
   "battle_lost": [
    "Go on, before the water changes its mind."
   ],
   "after": [
    "Jory likes the tide halfway. Not my problem anymore."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "Last ledge. Jory's past me, on the dry rock."
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
 "TODO-spot:tidewater_hall_int_sign_hall_outside": [
  "TIDEWATER MASTER'S HALL\nMaster: Jory Swell (sea)",
  "Check the shell clock before you go in. Then check it again."
 ],
 "TODO-spot:tidewater_hall_int_sign_tide_clock": [
  "TIDE CLOCK\nLow tide: walk the floor. High tide: glide the lanes.",
  "A shell switch stops the clock right where it is."
 ],
 "TODO-spot:tidewater_hall_int_guide": [
  "The water comes and goes with your steps. The big shell clock shows where it's at.",
  "Two shell switches. One holds it high, one holds it low.",
  "You'll need both tides to reach Jory. Walk a bit, glide a bit."
 ]
}
```

## Puzzle hint text (TODO-spot)

Puzzle outline (GD): A sea cave that floods and drains on a step counter (a big shell clock on the wall shows the tide). At low tide the floor is walkable; at high tide only Tideglide lanes are open. Two shell switches stop the clock at high or low. Plan a route that mixes walking and gliding. Helpers move between ledges with the tide.

```json
{
 "TODO-spot:tidewater_hall_int_shell_clock": [
  "A huge shell clock. The hand points at the tide right now."
 ],
 "TODO-spot:tidewater_hall_int_shell_switch_high": [
  "Shell switch. The clock stops at high tide."
 ],
 "TODO-spot:tidewater_hall_int_shell_switch_low": [
  "Shell switch. The clock stops at low tide."
 ],
 "TODO-spot:tidewater_hall_int_shell_switch_off": [
  "The clock starts ticking again. The water starts moving."
 ]
}
```
