# Kilumen hall text: revival_heights (coin 3)

**DRAFT, not signed off by Gary.** Overnight Text Bot worker draft, 2026-10-23 00:43 CT. Source: `design/overnight_gd/halls/revival_heights.json` (read only).

- Master: **Cassia Lume** (light (PROPOSED: crystal city, RT HQ)) — DRAFT — open question for Gary
- Coin: **Prism Coin** — DRAFT — open question for Gary (needs web clash check). Player text says 'coin', never the other word.
- Hall map: `revival_hall_int` (unbuilt). Flag: `beat_master_revival`. Puzzle: Prism relay (outline).
- Key style follows `overworld_lines.json` (`pages` = intro, `battle_lost` = their line when the player wins, `after` = talk again). New keys for Coder to confirm: `battle_won` (Master's line when the player loses), `coin_handover`, `gift`.
- Hall signs, guide and puzzle hints have no ids in the GD file, so they use `TODO-spot:<hall_map>_<thing>` for World Design to place.

Text_refs filled: 5/5 (`trainers.hall_revival_heights.h1`, `trainers.hall_revival_heights.h2`, `trainers.hall_revival_heights.h3`, `trainers.hall_revival_heights.h4`, `masters.revival_heights`). Lines (text boxes): 33.

## Notes

- h4 GD name 'Hollis' clashes with Director Hollis Vane (QUESTS open q 6). Lines never name him; rename needed — open question for Gary.
- h3 'Fen' is fine but close to Fernwick/Mirefen; flagged only.
- violet_note is the story tie-in from the puzzle outline; says nothing about why (finale pending).
- Lumen Line Pass + Branch Access Card are handed out by other NPCs, not the Master.

## masters.revival_heights

```json
{
 "_name": "Cassia Lume",
 "_name_status": "DRAFT — open question for Gary",
 "_coin_name": "Prism Coin",
 "_coin_name_status": "DRAFT — open question for Gary (web clash check pending)",
 "_element": "light (PROPOSED: crystal city, RT HQ)",
 "_flag": "beat_master_revival",
 "_npc_id": "master_revival_heights",
 "pages": [
  "Everything in this city is polished. The floors, the windows, the smiles.",
  "My team's the one thing here that glows on its own. Ready?"
 ],
 "battle_lost": [
  "Bright work. And I don't say that to everyone up here."
 ],
 "battle_won": [
  "Too much light at once. It happens.",
  "Rest your eyes and come back."
 ],
 "coin_handover": [
  "Take the Prism Coin. That's three.",
  "Hold it up to a window. It throws a little rainbow. Everyone checks."
 ],
 "gift": [
  "Two Pep Remedies as well. Head Office hands them out like mints."
 ],
 "after": [
  "The bridge on the Frostspire pass needs a three-coin trainer to approve repairs. That's you.",
  "And the south gate opens for you now. Saltmere's straight down the hill."
 ],
 "lines": [
  {
   "id": "default",
   "flags": [],
   "pages": [
    "Everything in this city is polished. The floors, the windows, the smiles.",
    "My team's the one thing here that glows on its own. Ready?"
   ]
  }
 ]
}
```

## trainers (hall_revival_heights)

```json
{
 "hall_revival_heights": {
  "h1": {
   "_id": "tr_hall_revival_heights_h1",
   "_name": "Mags",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "halovy",
    "glarekit"
   ],
   "pages": [
    "Mind your eyes. The light in here bounces off everything."
   ],
   "battle_lost": [
    "I'm seeing spots. That one's on me."
   ],
   "after": [
    "Turn a prism, then trace the beam with your finger. Looks daft. Works."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "Mind your eyes. The light in here bounces off everything."
     ]
    }
   ]
  },
  "h2": {
   "_id": "tr_hall_revival_heights_h2",
   "_name": "Dov",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "prismwing",
    "glimmerlamb"
   ],
   "pages": [
    "My Glimmerlamb glows in the dark. Does yours do anything fun?"
   ],
   "battle_lost": [
    "Okay, that was fun. Just not for me."
   ],
   "after": [
    "Beam hitting a wall? The last prism you turned is usually the problem."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "My Glimmerlamb glows in the dark. Does yours do anything fun?"
     ]
    }
   ]
  },
  "h3": {
   "_id": "tr_hall_revival_heights_h3",
   "_name": "Fen",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "tollkin",
    "dawnfin"
   ],
   "pages": [
    "I work at Head Office on weekdays. This is my weekend."
   ],
   "battle_lost": [
    "Back to the weekdays, then."
   ],
   "after": [
    "Room two's easier if you start from the door and work back to the beam."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "I work at Head Office on weekdays. This is my weekend."
     ]
    }
   ]
  },
  "h4": {
   "_id": "tr_hall_revival_heights_h4",
   "_name": "Hollis",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "candlewren",
    "halovy"
   ],
   "pages": [
    "Last prism's behind me. So's the Master. No pressure."
   ],
   "battle_lost": [
    "Go on. She's been watching the whole time."
   ],
   "after": [
    "Room three wants the beam through both crystals. One after the other."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "Last prism's behind me. So's the Master. No pressure."
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
 "TODO-spot:revival_hall_int_sign_hall_outside": [
  "REVIVAL HEIGHTS MASTER'S HALL\nMaster: Cassia Lume (light)",
  "Hall upkeep kindly paid for by Revival Tech."
 ],
 "TODO-spot:revival_hall_int_sign_prisms": [
  "PRISM RELAY\nTurn a prism to send the beam. A lit crystal opens its door.",
  "Room three: one beam, two crystals, in a row. Plan ahead."
 ],
 "TODO-spot:revival_hall_int_guide": [
  "The beam comes in through the ceiling. Prisms bounce it.",
  "Press A at a prism to turn it. Four ways it can face.",
  "Light the crystal by a door and the door opens. That's the whole trick. Mostly."
 ]
}
```

## Puzzle hint text (TODO-spot)

Puzzle outline (GD): A violet crystal beam enters from the ceiling. Rotating prisms (4 facings, A to turn) bounce it; a lit receiver crystal opens its door. Three rooms, each adding one prism. Room 3: the beam must pass two receivers in a row. Helpers stand in beam-free alcoves. Story tie-in: the same violet crystal as the Brookhollow field office.

```json
{
 "TODO-spot:revival_hall_int_receiver_dim": [
  "A crystal set in the wall. Dark for now."
 ],
 "TODO-spot:revival_hall_int_receiver_lit": [
  "The crystal glows violet. The door beside it slides open."
 ],
 "TODO-spot:revival_hall_int_violet_note": [
  "Same violet as the crystal at your branch office.",
  "Must be a company colour."
 ]
}
```
