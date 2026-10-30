# Wellspire flashback lab: text spots handoff

Every string here is a dev placeholder that Text Bot owns. The keys go in `overworld_lines.json` under `maps.<map>.<id>`. Signs show their text at once. A trainer only engages once its entry has `battle_lost` (plus `intro`/`battle_won`, as for the other past-lab staff). Rebellion era: eerie but not gory, and the blocked-word list was checked.

## fin_past_wlab_01_entry (room 1/10, arrival (5, 11))

- sign `fin_wlab_note_visitor` at (2,2): VISITOR LOG, Signal Test 7 week. Badges stay at the desk. Nobody goes past the white line alone. _(note: dev label only (DRAFT, WD); final text = text_ref)_
- sign `fin_wlab_note_cast` at (1,5): A cast of the Line 1 forehead crystal, made for the funding visit. The real one is still in him. _(note: dev label only (DRAFT, WD); final text = text_ref)_
- trainer `fin_wlab_tech_1` at (6,6) facing left, sight 1: needs intro, battle_won, battle_lost, after

## fin_past_wlab_02_medical (room 2/10, arrival (7, 11))

- sign `fin_wlab_note_beds` at (2,2): Bed 3 is for staff. Line 1 handlers keep reporting the same headache. Logged as "the hum". _(note: dev label only (DRAFT, WD); final text = text_ref)_
- sign `fin_wlab_note_heal` at (13,8): Restorer unit, set to gentle. Someone has glued a cover over the overdrive switch. _(note: dev label only (DRAFT, WD); final text = text_ref)_
- trainer `fin_wlab_tech_2` at (11,10) facing left, sight 1: needs intro, battle_won, battle_lost, after

## fin_past_wlab_03_control (room 3/10, arrival (7, 11))

- sign `fin_wlab_note_test7` at (2,3): SIGNAL TEST 7. Output 140 percent. Crest crystal stress: red. HOLD. _(note: dev label only (DRAFT, WD); final text = text_ref)_
- sign `fin_wlab_note_finch` at (12,3): Handwritten on the screen bezel: "Do not run Test 8. Not on him. - C. Finch" _(note: dev label only (DRAFT, WD); final text = text_ref)_
- trainer `fin_wlab_tech_3` at (8,9) facing left, sight 1: needs intro, battle_won, battle_lost, after
- trainer `fin_wlab_tech_4` at (10,4) facing left, sight 9: needs intro, battle_won, battle_lost, after

## fin_past_wlab_04_tanks (room 4/10, arrival (8, 12))

- sign `fin_wlab_note_lines` at (1,4): Lines 2 to 9: asleep. Lights low after eight. They dream when the core runs loud. _(note: dev label only (DRAFT, WD); final text = text_ref)_
- trainer `fin_wlab_tech_5` at (9,8) facing left, sight 1: needs intro, battle_won, battle_lost, after
- trainer `fin_wlab_tech_6` at (12,5) facing left, sight 11: needs intro, battle_won, battle_lost, after

## fin_past_wlab_05_amber (room 5/10, arrival (2, 7))

- sign `fin_wlab_note_amber` at (9,3): AMBER LINE. Kept for study, never woken. This week three of them turned to face the door. _(note: dev label only (DRAFT, WD); final text = text_ref)_
- trainer `fin_wlab_tech_7` at (6,4) facing down, sight 2: needs intro, battle_won, battle_lost, after
- trainer `fin_wlab_tech_8` at (12,7) facing up, sight 4: needs intro, battle_won, battle_lost, after

## fin_past_wlab_06_growth (room 6/10, arrival (12, 11))

- sign `fin_wlab_note_growth` at (13,4): The feeding schedule has been torn down. Under it, in marker: WE ARE LETTING THEM OUT. _(note: dev label only (DRAFT, WD); final text = text_ref)_
- trainer `fin_wlab_tech_9` at (8,7) facing left, sight 1: needs intro, battle_won, battle_lost, after
- trainer `fin_wlab_tech_10` at (5,5) facing up, sight 2: needs intro, battle_won, battle_lost, after

## fin_past_wlab_07_vats (room 7/10, arrival (3, 13))

- sign `fin_wlab_note_vat` at (6,2): Vat 3 drained Tuesday. Whoever was in it went down to the river. Nobody signed for it. _(note: dev label only (DRAFT, WD); final text = text_ref)_
- trainer `fin_wlab_tech_11` at (8,3) facing down, sight 6: needs intro, battle_won, battle_lost, after
- trainer `fin_wlab_tech_12` at (15,13) facing left, sight 4: needs intro, battle_won, battle_lost, after

## fin_past_wlab_08_core (room 8/10, arrival (3, 13))

- sign `fin_wlab_note_core` at (3,3): Core load: OVERDRIVEN. The helix hums the same note as the Line 1 crest. It is getting louder. _(note: dev label only (DRAFT, WD); final text = text_ref)_
- trainer `fin_wlab_tech_13` at (3,6) facing down, sight 2: needs intro, battle_won, battle_lost, after
- trainer `fin_wlab_tech_14` at (16,7) facing left, sight 3: needs intro, battle_won, battle_lost, after

## fin_past_wlab_09_observation (room 9/10, arrival (3, 9))

- sign `fin_wlab_note_window` at (1,8): From here you can see the river. The Breakout is tonight. Leave every door open behind you. _(note: dev label only (DRAFT, WD); final text = text_ref)_
- trainer `fin_wlab_tech_15` at (11,6) facing left, sight 1: needs intro, battle_won, battle_lost, after
- trainer `fin_wlab_chief` at (12,5) facing left, sight 3: needs intro, battle_won, battle_lost, after

## fin_past_wlab_10_ondravel (room 10/10, arrival (7, 11))

- interact `fin_past_dome` prop (7,7), stand (7, 8): reuses the existing fin_past_enclosure handler and text
- interact `fin_past_logbook` prop (3,9), stand (3, 10): reuses the existing fin_past_enclosure handler and text
