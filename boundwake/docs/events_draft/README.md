# Boundwake — November 5 event and journal drafts

DRAFT only. Coder wires the approved array into `data_fantasy/events.json`; this handoff does not merge it.

## Files

- `events_batch_nov5.json`: **75 new events**, JSON array, three choices per event.
- `tournament_guild_journals.md`: journal alternatives, UI strings, placeholder contract, and accounting notes for tournament teams and adventure guild halls.
- `README.md`: counts, identifiers, validation, and integration questions.

## Coverage

| Category | New | Current live | Live after approval |
| --- | ---: | ---: | ---: |
| work | 24 | 11 | 35 |
| fame | 15 | 2 | 17 |
| school | 20 | 7 | 27 |
| combat | 4 | 4 | 8 |
| exploration | 5 | 4 | 9 |
| relationship | 4 | 7 | 11 |
| travel | 3 | 2 | 5 |
| **Total added** | **75** | | |

Current core: **89** events. Proposed core: **164**. The **36 passion events remain separate and unchanged**; including them would make **200** overall.

School, work, and fame account for 59 of the 75 additions. Tournament and guild tags describe flavor, not ownership requirements or state mutations.

## Integration notes

- Mirrors the existing event shape, including `src` / `journal_src: "text"`, numeric `ages` pairs, `req` for spending, and optional `p` / `skill` / `win` / `fail`.
- Uses only effect keys already present in the live event file. No team, guild, roster, bracket, or hiring effects were invented.
- All 75 cards use `once: true`; weights are 2 for fame and 3 otherwise. These are conservative draft defaults for Game Dev to rebalance, not a new cooldown system.
- Career gates use existing career names and `if.career` syntax. Pay-packet, coworker-break, and end-of-work cards use `if.job`. Two spell lessons require the existing `mana_awakened` flag.
- School cards otherwise work as village-tutor / practice-yard scenes in their listed age bands. No new school-enrollment predicate is assumed.
- Meet cards are preparations, public encounters, or paid assistance. They do not award competition wins, skip entry costs, create a team, or assume the player is captain.
- Hall cards concern public-desk visits, casual work, or people met there. They do not assume player ownership or grant guild renown through ordinary player-renown effects.
- The journal pack follows the design lock's interim costs and rewards. UI gold summaries must distinguish gross prize/payout from net settlement. Annual fees must not be deducted once per job.
- Journal entries are first person, brief, and concrete. Inns serve food and tea. Restricted themes, copied setting terms, creature-collection imitation, and prohibited vocabulary are absent from the new event content.

## Validation performed

- Parsed the JSON array successfully with Python's JSON parser; exactly 75 unique new IDs.
- No ID collisions with the 89 live events, the 36 passion events, or IDs mentioned in the older `fantasy_lifesim/text/events.md` notes.
- Checked required fields, known categories/effect keys, age ordering, three choices per card, chance branches, and spending requirements.
- Every outcome has one journal string of at most two sentences. Reviewed the complete batch for voice, action order, age suitability, readable choices, and distinct premises.
- Screened event text for restricted vocabulary and themes; reviewed the journal pack against the content rules as well.
- No game execution, commits, pushes, live-data edits, or Lifeline file access/changes.

## Questions for Gary / Coder

No questions block reviewing or merging the ordinary event array.

1. **School availability:** Should these age-gated tutor/practice scenes remain broadly available, or does the final scheduler need an enrollment check? No unsupported predicate was added.
2. **Fee accounting:** The lock names annual fees but describes job payout minus fee. Choose annual settlement or an explicit fee allocation before wiring the net-gold variants; never charge the annual fee for every job.
3. **Hall scheduling:** Clarify whether the jobs/year formula is a hall-wide limit capped by roster size, or is intended to combine with the separate per-adventurer 1/2/3 job limits. UI hints promise only capacity, not assignments.
4. **Upfront hire cost:** Annual Low/Mid/High fees are specified; renown-tier upfront hire amounts are not. The journal pack keeps those separate and leaves the upfront amount dynamic.
5. **Closing a hall:** Decide treatment of pending jobs, roster, unpaid fees, and coffer funds. The short closure journals promise no refunds or automatic settlement.
6. **Calendar ages:** Team and hall unlock hints refer to calendar ages 16 and 18 from the lock; Coder should bind those UI checks to `cage`, not reinterpret the generic event `ages` format.

## New IDs

### work (24)

- `work_bellows_split`
- `work_uneven_scales`
- `work_frost_cloth`
- `work_ward_labels`
- `work_gate_queue`
- `work_borrowed_verse`
- `work_map_copy`
- `work_rain_watch`
- `work_unsteady_charm`
- `work_snare_check`
- `work_hall_damp_forms`
- `work_hall_boot_rack`
- `work_meet_water_table`
- `work_craft_meet_bench`
- `work_short_pay_packet`
- `work_market_awning`
- `work_kitchen_count`
- `work_delivery_seal`
- `work_apprentice_left_hand`
- `work_shared_noon`
- `work_old_pattern`
- `work_hall_meal_count`
- `work_notice_handwriting`
- `work_last_order`

### fame (15)

- `fame_wrong_portrait`
- `fame_shared_credit`
- `fame_tea_interruption`
- `fame_tiny_signature`
- `fame_meet_banner_spelling`
- `fame_hall_testimonial`
- `fame_borrowed_face`
- `fame_better_story`
- `fame_seat_front`
- `fame_familiar_rival`
- `fame_name_day_request`
- `fame_quiet_good_word`
- `fame_public_correction`
- `fame_craft_judge_invite`
- `fame_recognition_rain`

### school (20)

- `school_slate_edge`
- `school_seed_sums`
- `school_rain_roof`
- `school_borrowed_page`
- `school_yard_distance`
- `school_practice_bow`
- `school_shield_straps`
- `school_quiet_recitation`
- `school_map_upside`
- `school_mend_satchel`
- `school_archive_worm`
- `school_garden_turn`
- `school_fair_measure`
- `school_chalk_circle`
- `school_spark_cup`
- `school_story_two_ends`
- `school_practice_pause`
- `school_new_pupil`
- `school_public_question`
- `school_fair_team_sketch`

### combat (4)

- `combat_loose_practice_head`
- `combat_cart_ram`
- `combat_ring_boundary`
- `combat_guarded_retreat`

### exploration (5)

- `explore_hollow_bridge`
- `explore_glass_moss`
- `explore_shepherd_steps`
- `explore_chiming_cave`
- `explore_orchard_wall`

### relationship (4)

- `rel_saved_chair`
- `rel_mended_handle`
- `rel_disputed_memory`
- `rel_hall_departure`

### travel (3)

- `travel_meet_wagon`
- `travel_ferry_rope`
- `travel_hall_waymark`

