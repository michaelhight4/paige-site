# Kilumen hall text: frostspire (coin 4)

**DRAFT, not signed off by Gary.** Overnight Text Bot worker draft, 2026-10-23 00:43 CT. Source: `design/overnight_gd/halls/frostspire.json` (read only).

- Master: **Hale Corrie** (bird + wind (PROPOSED: Skylift reward = a flying creature carries you)) — DRAFT — open question for Gary
- Coin: **Aerie Coin** — DRAFT — open question for Gary (needs web clash check). Player text says 'coin', never the other word.
- Hall map: `frostspire_hall_int` (unbuilt). Flag: `beat_master_frostspire`. Puzzle: Gust lanes (outline).
- Key style follows `overworld_lines.json` (`pages` = intro, `battle_lost` = their line when the player wins, `after` = talk again). New keys for Coder to confirm: `battle_won` (Master's line when the player loses), `coin_handover`, `gift`, `skill_learned`.
- Hall signs, guide and puzzle hints have no ids in the GD file, so they use `TODO-spot:<hall_map>_<thing>` for World Design to place.

Text_refs filled: 4/4 (`trainers.hall_frostspire.h1`, `trainers.hall_frostspire.h2`, `trainers.hall_frostspire.h3`, `masters.frostspire`). Lines (text boxes): 30.

## Notes

- Element framed as wind/birds, not ice (puzzle note). GD gift id (large remedy) -> display 'Big Remedy'.
- skill = system line after has_skylift is set.

## masters.frostspire

```json
{
 "_name": "Hale Corrie",
 "_name_status": "DRAFT — open question for Gary",
 "_coin_name": "Aerie Coin",
 "_coin_name_status": "DRAFT — open question for Gary (web clash check pending)",
 "_element": "bird + wind (PROPOSED: Skylift reward = a flying creature carries you)",
 "_flag": "beat_master_frostspire",
 "_npc_id": "master_frostspire",
 "pages": [
  "People climb the peak for the view. I stayed for the wind.",
  "My team was born in it. Let's see if yours can keep up."
 ],
 "battle_lost": [
  "Hah. You flew through that."
 ],
 "battle_won": [
  "Grounded. Happens to all of us.",
  "Catch your breath and try again."
 ],
 "coin_handover": [
  "Take the Aerie Coin. Four now, isn't it?",
  "Light as a feather. Near enough."
 ],
 "gift": [
  "Three Big Remedies. It's a long way down, even when you fly."
 ],
 "after": [
  "With that coin, a bird partner can carry you between towns. Skylift, we call it.",
  "Not into the rail-only cities, mind. They're fussy about their sky."
 ],
 "lines": [
  {
   "id": "default",
   "flags": [],
   "pages": [
    "People climb the peak for the view. I stayed for the wind.",
    "My team was born in it. Let's see if yours can keep up."
   ]
  }
 ],
 "skill_learned": [
  "You can now use Skylift outside battle."
 ]
}
```

## trainers (hall_frostspire)

```json
{
 "hall_frostspire": {
  "h1": {
   "_id": "tr_hall_frostspire_h1",
   "_name": "Rue",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "sailquill",
    "snowgrouse"
   ],
   "pages": [
    "Wind took my hat on day one. I stayed anyway."
   ],
   "battle_lost": [
    "Wind took that one too."
   ],
   "after": [
    "The feathers point the way the vents blow. Look down before you step."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "Wind took my hat on day one. I stayed anyway."
     ]
    }
   ]
  },
  "h2": {
   "_id": "tr_hall_frostspire_h2",
   "_name": "Bram",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "highkite",
    "signalwren"
   ],
   "pages": [
    "Up here you battle and lean at the same time."
   ],
   "battle_lost": [
    "I leaned the wrong way."
   ],
   "after": [
    "One bell rope swaps every vent in the room. Think before you pull."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "Up here you battle and lean at the same time."
     ]
    }
   ]
  },
  "h3": {
   "_id": "tr_hall_frostspire_h3",
   "_name": "Tilly",
   "_name_status": "DRAFT — open question for Gary",
   "_class_display": "Hall Helper",
   "_team": [
    "spraytern",
    "sailquill"
   ],
   "pages": [
    "You made the top ledge? Most people end up back on the floor."
   ],
   "battle_lost": [
    "Well, you're not on the floor. I nearly am."
   ],
   "after": [
    "The eyrie's just past me. Hale's been watching since you walked in."
   ],
   "lines": [
    {
     "id": "default",
     "flags": [],
     "pages": [
      "You made the top ledge? Most people end up back on the floor."
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
 "TODO-spot:frostspire_hall_int_sign_hall_outside": [
  "FROSTSPIRE MASTER'S HALL\nMaster: Hale Corrie (wind)",
  "The roof is open. Hold onto your hat."
 ],
 "TODO-spot:frostspire_hall_int_sign_gusts": [
  "GUST LANES\nVents push you along until a banner stops you.",
  "Pull a bell rope to swap the vents. Check the feathers first."
 ],
 "TODO-spot:frostspire_hall_int_guide": [
  "The vents carry you. You don't get a say until a banner stops you.",
  "Bell ropes swap which vents are blowing. Every vent, not just one.",
  "Fall off a lane and you land on the floor below. Nothing hurts but your pride."
 ]
}
```

## Puzzle hint text (TODO-spot)

Puzzle outline (GD): An open-roof hall on the peak. Wind vents push the player along a lane until a windbreak banner stops them. Bell ropes switch which vents blow (2 states). Feathers on the floor show the current direction. Find the vent setting that carries you up the ledges to the eyrie. Falling off a lane drops you to the floor below (no reset needed).

```json
{
 "TODO-spot:frostspire_hall_int_bell_rope": [
  "A bell rope. Pull it?"
 ],
 "TODO-spot:frostspire_hall_int_bell_rope_pulled": [
  "The bell rings. All the vents change direction at once."
 ],
 "TODO-spot:frostspire_hall_int_feathers": [
  "Feathers on the floor, all pointing the same way. That's where the wind's going."
 ]
}
```
