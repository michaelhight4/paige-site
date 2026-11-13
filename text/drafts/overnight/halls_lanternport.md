# Kilumen hall text: lanternport (coin 7)

**DRAFT, not signed off by Gary.** Overnight Text Bot worker draft, 2026-10-23 00:43 CT. Source: `design/overnight_gd/halls/lanternport.json` (read only).

- Master: **Delphine Orrin** (spirit + ghost (PROPOSED)) — DRAFT — open question for Gary
- Coin: **Beacon Coin** — DRAFT — open question for Gary (needs web clash check). Player text says 'coin', never the other word.
- Hall map: `lanternport_hall_int` (unbuilt). Flag: `beat_master_lanternport`. Puzzle: Lens signal (outline).
- Key style follows `overworld_lines.json` (`pages` = intro, `battle_lost` = their line when the player wins, `after` = talk again). New keys for Coder to confirm: `battle_won` (Master's line when the player loses), `coin_handover`, `gift`, `horn`.
- Hall signs, guide and puzzle hints have no ids in the GD file, so they use `TODO-spot:<hall_map>_<thing>` for World Design to place.

Text_refs filled: 4/4 (`trainers.hall_lanternport.h1`, `trainers.hall_lanternport.h2`, `trainers.hall_lanternport.h3`, `masters.lanternport`). Lines (text boxes): 32.

## Notes

- Master is Delphine Orrin (Gary ruling 7: not Vane). 'after' is Story Bot's mq_lanternport turn_in, kept word for word. horn = existing system line (blockers.gate_cindervale_giant.wake mirrors it).
- gift dominance_crystal_plus x5 -> 'five crystals'.

## masters.lanternport

```json
{
 "_name": "Delphine Orrin",
 "_name_status": "DRAFT — open question for Gary",
 "_coin_name": "Beacon Coin",
 "_coin_name_status": "DRAFT — open question for Gary (web clash check pending)",
 "_element": "spirit + ghost (PROPOSED)",
 "_flag": "beat_master_lanternport",
 "_npc_id": "master_lanternport",
 "pages": [
  "This light's been out for years. Ships still find the harbour. Something guides them in.",
  "I'd like to think it's my team. Shall we see?"
 ],
 "battle_lost": [
  "Well. You found your way just fine."
 ],
 "battle_won": [
  "Even lighthouses go dark sometimes.",
  "Rest, then climb back up."
 ],
 "coin_handover": [
  "Take the Beacon Coin. That's seven.",
  "It glows a little at night. Don't ask me how."
 ],
 "gift": [
  "Five crystals as well. Good ones. The harbour has plenty."
 ],
 "after": [
  "The tide-lock's open. Fernwick's a short walk now.",
  "And the horn... someone's been asleep on the Cindervale road too long."
 ],
 "lines": [
  {
   "id": "default",
   "flags": [],
   "pages": [
    "This light's been out for years. Ships still find the harbour. Something guides them in.",
    "I'd like to think it's my team. Shall we see?"
   ]
  }
 ],
 "horn": [
  "Far off, the Lanternport horn sounds."
 ]
}
```

## trainers (hall_lanternport)

```json
{
 "hall_lanternport": {
  "h1": {
   "_id": "tr_hall_lanternport_h1",
   "_name": "Gil",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "gloamtick",
    "wreckwarden"
   ],
   "pages": [
    "Lit every lamp in this town for thirty years. Never this one."
   ],
   "battle_lost": [
    "Still never lit it."
   ],
   "after": [
    "Long beam, short beam. Write it down if you need to. I did."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "Lit every lamp in this town for thirty years. Never this one."
     ]
    }
   ]
  },
  "h2": {
   "_id": "tr_hall_lanternport_h2",
   "_name": "Hana",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "runeskein",
    "lanternkeep"
   ],
   "pages": [
    "People say this place is haunted. It is. They're friendly."
   ],
   "battle_lost": [
    "Friendly, not strong. Noted."
   ],
   "after": [
    "Each floor uses the same four colours. The order changes."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "People say this place is haunted. It is. They're friendly."
     ]
    }
   ]
  },
  "h3": {
   "_id": "tr_hall_lanternport_h3",
   "_name": "Iska",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "kelpstrider",
    "novarch"
   ],
   "pages": [
    "Top floor's the darkest. You'll want to look at the sea."
   ],
   "battle_lost": [
    "Go on, then. Look at the sea."
   ],
   "after": [
    "The code's in the water. The reflection, not the waves."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "Top floor's the darkest. You'll want to look at the sea."
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
 "TODO-spot:lanternport_hall_int_sign_hall_outside": [
  "THE OLD LIGHTHOUSE\nLanternport Master: Delphine Orrin (spirit)",
  "The stairs open floor by floor. Watch the lens."
 ],
 "TODO-spot:lanternport_hall_int_sign_lens": [
  "LENS SIGNAL\nThe lens flashes a code in four colours.",
  "Light the lamps in that order. Wrong order? They go out. Try again."
 ],
 "TODO-spot:lanternport_hall_int_sign_top_floor": [
  "TOP FLOOR\nNo lens up here. Have a look out of the window."
 ],
 "TODO-spot:lanternport_hall_int_guide": [
  "The lens flashes long and short beams through four coloured panes.",
  "Every floor has four lamps in those colours. Light them in the order you saw.",
  "Get it wrong and they go out. No harm done. The ghosts find it funny."
 ]
}
```

## Puzzle hint text (TODO-spot)

Puzzle outline (GD): The lighthouse is dark. At the foot, the lens flashes a code (long/short beams across 4 coloured panes). Each floor has 4 lamp posts in those colours; light them in the code order to open the stair. Wrong order: lamps go out, no penalty. Top floor: the code is shown only in the reflection on the sea (look out of the window).

```json
{
 "TODO-spot:lanternport_hall_int_lens": [
  "The lens flashes. Long, short, short, long... in four colours."
 ],
 "TODO-spot:lanternport_hall_int_lamp_post": [
  "A lamp post with a coloured pane. Light it?"
 ],
 "TODO-spot:lanternport_hall_int_lamps_out": [
  "The lamps on this floor go out together. Back to the start."
 ],
 "TODO-spot:lanternport_hall_int_window_top": [
  "Out on the dark sea, a reflection of the lens. It's flashing a code."
 ]
}
```
