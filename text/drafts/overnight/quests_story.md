# Kilumen quest/story text: QUESTS.md 'Lines for Text Bot to align' items 4-10

**DRAFT, not signed off by Gary.** Overnight Text Bot worker, 2026-10-23 00:44 CT. Source: `design/overnight_quests/QUESTS.md` (read only). Items 1-3 already applied, skipped.

Keys follow `overworld_lines.json` style. Npc/prop ids and flags are QUESTS.md's proposals (`New ids to add`); map keys for unbuilt maps are placeholders until World places the spots. Field-team initials and names depend on QUESTS open question 3 (camp owners) — open question for Gary.

## route1 / fernwick: Ron: Trail Runners handover (mq_route1_benchmark s4)

QUESTS item(s): 6. Text boxes: 3.

- Story Bot's two pages kept; third page adds Ron's Fernwick cockiness (he never loses gracefully yet).
- Plays after the Ron 1 battle, before the existing 'sandwich' after-line.

```json
{
 "maps.fernwick.ron_rival_1.after_battle_handover": {
  "sets_flag": "has_run_shoes",
  "after_flag": "beat_rival_ron_1",
  "pages": [
   "Here. Company Trail Runners. They sent me two pairs.",
   "Don't ask why. I didn't ask why.",
   "Wear them. You'll need the speed if you want to keep up with me."
  ]
 }
}
```

## saltmere: Ron: ID jealousy (mq_saltmere_parcel s4)

QUESTS item(s): 6. Text boxes: 4.

- Existing opener 'One bag by the bin now...' stays as page set 2 (Text Bot's).

```json
{
 "ron_battle_openers.ron_rival_saltmere.id_jealousy (plays before the existing bin opener)": {
  "flags": [
   "has_bike"
  ],
  "pages": [
   "Your ID says 'Field Researcher II'. Mine just says 'Field Researcher'.",
   "No numeral. Just vibes. Let's fix that, {nick}."
  ]
 },
 "ron_rival_saltmere.battle_lost": {
  "pages": [
   "Still no numeral. Brilliant."
  ]
 }
}
```

## saltmere_office_int: New NPC: saltmere_office_clerk (mq_saltmere_parcel s3)

QUESTS item(s): 9. Text boxes: 5.

- clerk_parcel is Story Bot's line word for word. coin_pouch_small payback is a proposal; no text names it.

```json
{
 "maps.saltmere_office_int.saltmere_office_clerk": {
  "pages": [
   "Saltmere office. If it's a complaint, the box is by the door.",
   "If it's a parcel, I'm all yours."
  ],
  "lines": [
   {
    "id": "clerk_bike_done",
    "flags": [
     "has_bike"
    ],
    "pages": [
     "Bike treating you all right? Bring it back clean. Ish."
    ]
   },
   {
    "id": "clerk_parcel",
    "flags": [
     "has_survey_parcel"
    ],
    "sets_flag": "has_bike",
    "pages": [
     "Survey parcel, signed for. They said it'd be a week. It's been a season.",
     "Take the Courier Bike. The boardwalks here are bikes only."
    ]
   },
   {
    "id": "default",
    "flags": [],
    "pages": [
     "Saltmere office. If it's a complaint, the box is by the door.",
     "If it's a parcel, I'm all yours."
    ]
   }
  ]
 }
}
```

## revival_hq_int: Letter scene + new NPC hq_receptionist (mq_revival_heights s4; mq_finale s4)

QUESTS item(s): 6, 8, 9. Text boxes: 11.

- ron_letter = Story Bot draft, kept (Ron's minor-key music beat). Contents of the letter are never shown.
- sq_ron_job s4 keeps only the second sentence (QUESTS item 8).
- Receptionist default mentions floor eight to set up the tower_floors email (9-12 senior only).

```json
{
 "maps.revival_hq_int.hq_receptionist": {
  "pages": [
   "Revival Tech Head Office. Lifts are staff only past floor eight.",
   "Visitors' toilets are on the left. That's the most common question."
  ],
  "lines": [
   {
    "id": "rec_lanyard",
    "flags": [
     "all_badges"
    ],
    "sets_flag": "has_senior_lanyard",
    "pages": [
     "Eight coins? That's senior grade. Here's your lanyard.",
     "The lift will stop wherever you like now. Please don't make me regret it."
    ]
   },
   {
    "id": "rec_post_ron",
    "flags": [
     "beat_rival_ron_3"
    ],
    "when": {
     "not_flags": [
      "ron_layoff_letter"
     ]
    },
    "pages": [
     "Post for Ron? Hand delivered. Head Office likes paper."
    ]
   },
   {
    "id": "default",
    "flags": [],
    "pages": [
     "Revival Tech Head Office. Lifts are staff only past floor eight.",
     "Visitors' toilets are on the left. That's the most common question."
    ]
   }
  ]
 },
 "maps.revival_hq_int.ron.ron_letter (sets ron_layoff_letter)": {
  "pages": [
   "...",
   "It's fine. It's just a letter.",
   "Go on, {nick}. The Master's waiting. I'll catch up."
  ]
 },
 "maps.revival_hq_int.ron.sq_ron_job_s4 (flags ron_layoff_letter, !beat_master_revival; sets sq_ron_letter)": {
  "pages": [
   "Thanks for not saying anything. That helps, {nick}."
  ]
 },
 "maps.revival_hq_int.ron.ron_lanyard (finale s4, ron_in_party)": {
  "pages": [
   "My lanyard's green. Or it was. They took it back.",
   "I'll just stand very close to you."
  ]
 }
}
```

## revival_station_int: New NPC: station_clerk_central (mq_revival_heights s7)

QUESTS item(s): 9. Text boxes: 4.

- clerk_pass is Story Bot's wording. Pass item id rail_pass vs flag only = open question (QUESTS q15).

```json
{
 "maps.revival_station_int.station_clerk_central": {
  "pages": [
   "Central station. Trains every hour. Mostly on the hour."
  ],
  "lines": [
   {
    "id": "clerk_pass_done",
    "flags": [
     "has_rail_pass"
    ],
    "pages": [
     "Pass still in your wallet? Good. That's the whole job of a pass."
    ]
   },
   {
    "id": "clerk_pass",
    "flags": [
     "beat_master_revival"
    ],
    "sets_flag": "has_rail_pass",
    "pages": [
     "Lumen Line pass, field grade. Every station that has one.",
     "Skylift won't take you into the rail-only cities. Trains will."
    ]
   },
   {
    "id": "default",
    "flags": [],
    "pages": [
     "Central station. Trains every hour. Mostly on the hour."
    ]
   }
  ]
 }
}
```

## lab_brookhollow: New NPC: lab_lead_varga (mq_brookhollow_promotion s5)

QUESTS item(s): 9. Text boxes: 5.

- Story Bot lines kept. Open: lab_lead_varga vs existing lab_brookhollow_researcher/aide (QUESTS q9); if Varga replaces the researcher, merge her lines in.

```json
{
 "maps.lab_brookhollow.lab_lead_varga": {
  "pages": [
   "Ines Varga, lab lead. Three partners ready, none of them catalogued yet.",
   "Pick the one that looks back at you. Ron gets whoever's left."
  ],
  "lines": [
   {
    "id": "varga_after",
    "flags": [
     "got_starter"
    ],
    "pages": [
     "Good choice. Crystals and remedies are on the house. Just this once.",
     "Fernwick's up Route 1. Bring it back in one piece."
    ]
   },
   {
    "id": "varga_coin8",
    "flags": [
     "all_badges"
    ],
    "pages": [
     "Eight coins and {lead} still looks happy. That's the bit I care about."
    ]
   },
   {
    "id": "default",
    "flags": [],
    "pages": [
     "Ines Varga, lab lead. Three partners ready, none of them catalogued yet.",
     "Pick the one that looks back at you. Ron gets whoever's left."
    ]
   }
  ]
 }
}
```

## thornwood: Log page: prop:log_thornwood (mq_thornwood_camp s4)

QUESTS item(s): 9. Text boxes: 6.

- Initials depend on the camp-owner proposal (QUESTS open q3) — open question for Gary before they ship.

```json
{
 "maps.thornwood.log_thornwood": {
  "sets_flag": [
   "read_log_thornwood",
   "read_drift_log"
  ],
  "active_when": "camp_restored_thornwood",
  "pages": [
   "A field log page, damp at the edges. Signed 'I.S.'",
   "'Night two. Teo made a list of his lists. I hummed till he gave up.'",
   "'My partner's crystal looks less violet by the fire. Probably just the light.'"
  ],
  "lines": [
   {
    "id": "read",
    "flags": [
     "read_log_thornwood"
    ],
    "pages": [
     "The log page. 'Probably just the light.'"
    ]
   },
   {
    "id": "default",
    "flags": [],
    "pages": [
     "A field log page, damp at the edges. Signed 'I.S.'",
     "'Night two. Teo made a list of his lists. I hummed till he gave up.'",
     "'My partner's crystal looks less violet by the fire. Probably just the light.'"
    ]
   }
  ]
 }
}
```

## greystone_b1: Log page + tally crystal (mq_greystone_camp s5-s6)

QUESTS item(s): 9. Text boxes: 5.

- Story Bot wording kept; tally_crystal spot (3,9) per QUESTS.

```json
{
 "maps.greystone_b1.log_greystone": {
  "sets_flag": "read_log_greystone",
  "active_when": "camp_restored_greystone",
  "pages": [
   "A list in tidy capitals, signed 'T.B.'",
   "'CHECK-IN, DAY 9. 1. Seam found. 2. Samples bagged. 3. Readings odd again.'",
   "'4. Odd only on our own four. 5. Ask Head Office. In person.'"
  ]
 },
 "maps.greystone_b1.tally_crystal": {
  "sets_flag": "tally_marks_seen",
  "pages": [
   "Tally marks scratched into the crystal. Twenty-three of them.",
   "Four sets of initials underneath. One of them is just a doodle of a fern."
  ]
 }
}
```

## frostspire: Camp + log page (mq_frostspire s3-s4)

QUESTS item(s): 5, 9. Text boxes: 15.

- Same shape and wording pattern as camp_thornwood / camp_greystone (prompt_after_line = default). use = Story Bot's mq_frostspire s3 line.
- camp_restored line reused word for word (QUESTS item 5). Club note_frostspire ticks on the same flag.

```json
{
 "maps.frostspire.camp_frostspire": {
  "pages": [
   "A tent half buried in snow. The stove's iced shut.",
   "Nobody's been up here in a long while."
  ],
  "prompt": [
   "Clear the camp and light the stove?"
  ],
  "choices": [
   "Yes",
   "No"
  ],
  "prompt_after_line": "default",
  "use": [
   "You dig the tent out of the drift and knock the ice off the stove.",
   "It lights. Barely. Then properly."
  ],
  "declined": [
   "You leave the camp as it is. For now."
  ],
  "sets_flag": "camp_restored_frostspire",
  "active_when": "beat_master_revival",
  "lines": [
   {
    "id": "camp_restored_first",
    "flags": [
     "camp_restored_frostspire"
    ],
    "when": {
     "once": true
    },
    "pages": [
     "The camp's dug out again.",
     "Still no sign of them."
    ]
   },
   {
    "id": "camp_restored",
    "flags": [
     "camp_restored_frostspire"
    ],
    "pages": [
     "Your camp now. Stove's warm, tent's dry.",
     "A good spot to sit a while with your team."
    ]
   },
   {
    "id": "default",
    "flags": [],
    "pages": [
     "A tent half buried in snow. The stove's iced shut.",
     "Nobody's been up here in a long while."
    ]
   }
  ]
 },
 "maps.frostspire.log_frostspire": {
  "sets_flag": "read_log_frostspire",
  "active_when": "camp_restored_frostspire",
  "pages": [
   "A page in loopy handwriting, signed 'P.A.', pinned under a rock.",
   "'Snowed in two nights. Went up to the shrine. It's gone quiet.'",
   "'The crystals on the path hum instead. Teo wants it on the list.'"
  ]
 }
}
```

## mirefen_bog: Camp, log page, angler notebook line (mq_mirefen s1-s4)

QUESTS item(s): 5, 7, 9. Text boxes: 18.

- Angler line keeps 'Fish? No.' true (QUESTS item 7).
- Camp needs World's spot id on mirefen_bog (reed island, bike boards).

```json
{
 "maps.mirefen_bog.mirefen_angler.lines[angler_notebook] (insert above angler_glide; flags beat_master_frostspire, when not has_field_notebook; sets has_field_notebook)": {
  "pages": [
   "The notebook? Didn't catch a fish. Caught that.",
   "Someone drew a map in the back. Badly. Take it."
  ]
 },
 "maps.mirefen_bog.mirefen_angler.lines[angler_after_notebook] (flags has_field_notebook)": {
  "pages": [
   "Find the camp? The reeds hide everything out there. Even tents."
  ]
 },
 "maps.mirefen_bog.camp_mirefen": {
  "pages": [
   "A tent slumped in the reeds. Water's got into everything.",
   "Nobody's been out here in a long while."
  ],
  "prompt": [
   "Clear the camp and light the stove?"
  ],
  "choices": [
   "Yes",
   "No"
  ],
  "prompt_after_line": "default",
  "use": [
   "You haul the tent out of the reeds and wring it out.",
   "The stove's dry inside. Someone wrapped it up properly."
  ],
  "declined": [
   "You leave the camp as it is. For now."
  ],
  "sets_flag": "camp_restored_mirefen",
  "active_when": "has_field_notebook",
  "lines": [
   {
    "id": "camp_restored_first",
    "flags": [
     "camp_restored_mirefen"
    ],
    "when": {
     "once": true
    },
    "pages": [
     "The camp's back on dry ground.",
     "Still no sign of them."
    ]
   },
   {
    "id": "camp_restored",
    "flags": [
     "camp_restored_mirefen"
    ],
    "pages": [
     "Your camp now. Stove's warm, tent's dry.",
     "A good spot to sit a while with your team."
    ]
   },
   {
    "id": "default",
    "flags": [],
    "pages": [
     "A tent slumped in the reeds. Water's got into everything.",
     "Nobody's been out here in a long while."
    ]
   }
  ]
 },
 "maps.mirefen_bog.log_mirefen": {
  "sets_flag": "read_log_mirefen",
  "active_when": "camp_restored_mirefen",
  "pages": [
   "Neat handwriting, signed 'M.Q.' The last page is dated.",
   "'Bog census done by hand. The scanners don't like our four.'",
   "'Off to Head Office with Teo's list. Back by Friday.'"
  ]
 },
 "maps.club_int.note_mirefen (wording suggestion only)": {
  "suggest": "'A Mirefen fisher pulled...' -> 'Someone in Mirefen pulled a field notebook from the reeds.' (the angler says they never fish)"
 }
}
```

## lanternport: Ron: 'chose to share it' + Teo's last page (mq_lanternport s2)

QUESTS item(s): 6, 9. Text boxes: 9.

- Story Bot lines kept (Ron arc: finds information and chooses to share it). Ron laid off but still travelling = open question q8.

```json
{
 "maps.lanternport.ron.ron_page (after beat_rival_ron_5; sets read_log_lanternport with the page)": {
  "flags": [
   "beat_rival_ron_5"
  ],
  "pages": [
   "Found this in a lost-and-found box at the station. Revival Tech paper.",
   "I read it. Then I thought about keeping it. Then I didn't."
  ]
 },
 "maps.lanternport.log_lanternport": {
  "pages": [
   "Tidy capitals again. 'T.B.' The last list.",
   "'1. Head Office wants our four brought in. 2. Not leaving them.'",
   "'3. Going anyway. All of us. With them.'"
  ]
 },
 "maps.lanternport.ron.ron_why (flags read_log_lanternport)": {
  "pages": [
   "No job, remember? So I'm not doing this for the company.",
   "I'm doing it because they're ours. Same as you."
  ]
 },
 "maps.lanternport.ron.ron_why_again (flags read_log_lanternport, beat_master_lanternport)": {
  "pages": [
   "Seven coins. I'll stop saying I'm going easy on you."
  ]
 }
}
```

## aurelith: Finale opener = bin line 8 + after-battle (mq_finale s2-s3)

QUESTS item(s): 6. Text boxes: 6.

- Escalation follows #1-#7 (one bag ... their own smell) and lands on bag 8 = coin 8. 'Seven and a sandwich' kept from Story Bot's stand-in.
- Id ron_rival_aurelith proposed (GD: ron_6, flag beat_rival_ron_6).

```json
{
 "ron_battle_openers.ron_rival_aurelith (bin opener #8; replaces the stand-in)": [
  {
   "id": "default",
   "flags": [
    "all_badges"
   ],
   "soul_item": "3,10",
   "pages": [
    "Eight bags now. The lid's given up, {nick}. So have the neighbours.",
    "Eight coins for you. Me? Seven and a sandwich.",
    "One more, for old times. Then we go and get them."
   ]
  }
 ],
 "ron_rival_aurelith.battle_lost (sets ron_in_party)": {
  "pages": [
   "Yeah. Okay. You were always going to win that one.",
   "Head Office. In person. Like the list said. I'm coming."
  ]
 }
}
```

## revival_hq_upper: Field-team voices + Ron 'standing here with you' (mq_finale s5, s7)

QUESTS item(s): 6, 9. Text boxes: 7.

- Confrontation (s6, truth_revealed) is PENDING Gary — no lines written for it. Pell's line kept plain per brief; Teo lists; Marta 'Friday'; Imke hums.
- Finale location (HQ floors 9-12 vs Greystone B2) is open; map key may change.

```json
{
 "maps.revival_hq_upper.ft_teo": {
  "pages": [
   "Item one: you found us. Item two: we're all right.",
   "Item three: is there food? That's the important one."
  ]
 },
 "maps.revival_hq_upper.ft_marta": {
  "pages": [
   "We said back by Friday. We didn't say which Friday."
  ]
 },
 "maps.revival_hq_upper.ft_pell": {
  "pages": [
   "Did anyone water my plants? Don't answer. I can tell."
  ]
 },
 "maps.revival_hq_upper.ft_imke (narration box, she only hums)": {
  "pages": [
   "Imke is humming. Her partner hums along, a little off-key."
  ]
 },
 "maps.revival_hq_upper.ron.ron_with_you (found_field_team)": {
  "pages": [
   "I'm not battling you, {nick}. I'm standing here. With you.",
   "Big difference."
  ]
 }
}
```

## office_int: Field team home: ft_teo (mq_welcome_back s2)

QUESTS item(s): 9. Text boxes: 5.

- ft_teo = Story Bot line. Marta/Pell/Imke office lines are new Text Bot drafts so all four desks answer.

```json
{
 "maps.office_int.ft_teo (field_team_home)": {
  "pages": [
   "Item one: thank you. There's no item two.",
   "...Fine. Item two: cake's Friday."
  ]
 },
 "maps.office_int.ft_marta (field_team_home)": {
  "pages": [
   "It's Friday. I checked. This time I checked."
  ]
 },
 "maps.office_int.ft_pell (field_team_home)": {
  "pages": [
   "My plants survived. Don't tell me who watered them. I want to guess."
  ]
 },
 "maps.office_int.ft_imke (field_team_home)": {
  "pages": [
   "Imke waves without looking up. She's still humming."
  ]
 }
}
```

## house rules (existing text, item 10): Wording fixes to apply in overworld_lines.json (suggestions only; not edited here)

QUESTS item(s): 10. Text boxes: 2.

- Both old lines break the banned weather-word rule. Text Bot owns overworld_lines.json; apply in the next build pass.

```json
{
 "maps.home_lanternport_c.*.kid_lanternport page 1": {
  "old": "When the fog comes in I pretend the house is a ship.",
  "new": "When the rain comes in sideways I pretend the house is a ship."
 },
 "blockers.gate_saltmere_causeway.before page 1": {
  "old": "The causeway is under knee-deep meltwater. The far end fades into mist.",
  "new": "The causeway is under knee-deep meltwater. You can't see the far end from here."
 },
 "maps.club_int.rebel_bartender": {
  "note": "Internal id only (display role 'juice counter'). Never shown. Suggest a future id rename to club_juice_counter if Coder agrees; quest speaker ids would follow."
 }
}
```

## lanternport hall (item 4): Lanternport Master name

QUESTS item(s): 4. Text boxes: 0.


```json
{
 "masters.lanternport": {
  "see": "halls_lanternport.md (Delphine Orrin, not Vane; DRAFT — open question for Gary)"
 }
}
```
