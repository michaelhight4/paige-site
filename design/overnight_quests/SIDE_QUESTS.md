# Kilumen side quests (DRAFT for Gary)

**Status: DRAFT. Not wired into the game. No game code or data was edited.** Written overnight, 2026-10-23 (CT). Machine-readable version: `side_quests_draft.json` (format: `SCHEMA.md`).

**34 side quests** in 14 zones. Built-map quests: 21; map pending: 13.

How to read: each quest lists giver, prerequisites, steps (flag set per step), reward, the quest's own dialogue (one bullet = one text box), and notes. Where a quest reuses existing Text Bot lines, they are copied word for word and marked in the notes. `!flag` = flag must be unset.

## Play-order index

| Order | Zone | Quest | Id | Map |
|---|---|---|---|---|
| 11 | brookhollow | The Bean Thief | `sq_bean_thief` | built |
| 12 | brookhollow | Meet Five | `sq_first_five` | built |
| 13 | brookhollow | A Fly for the Fisher | `sq_fisher_fly` | built |
| 14 | brookhollow | Bin Day Is Tomorrow | `sq_bin_day` | built |
| 15 | brookhollow | Dana's Desk | `sq_dana` | map pending |
| 16 | brookhollow | Ron's Other Job | `sq_ron_job` | map pending |
| 17 | brookhollow | The Kid's Last Joke | `sq_kid_joke` | built |
| 21 | route1 | Fork Road Regulars | `sq_fork_regulars` | built |
| 22 | route1 | Over the Wall | `sq_over_the_wall` | map pending |
| 31 | fernwick | The Missing Note | `sq_missing_note` | map pending |
| 32 | fernwick | Mixing Colours | `sq_paint_job` | built |
| 33 | fernwick | Ticks on the Flyer | `sq_tell_the_counter` | built |
| 34 | fernwick | Dance of the Firefly | `sq_open_mic` | built |
| 35 | fernwick | Answers to Biscuit | `sq_biscuit` | built |
| 36 | fernwick | Where the Fireflies Went | `sq_fireflies` | built |
| 37 | fernwick | The Last Parcel | `sq_courier_last_route` | built |
| 38 | fernwick | KEEP OUT (please) | `sq_fort_sign` | built |
| 41 | thornwood | Stumps That Blink | `sq_burlbeetle_count` | built |
| 42 | thornwood | Lunch on the Trail | `sq_stuck_with_me` | built |
| 51 | greystone_caverns | Honest Map | `sq_cave_sketch` | built |
| 52 | greystone_caverns | Ferns for Old Hal | `sq_flowers_old_hal` | built |
| 61 | saltmere | The Lucky-Crystal Seller | `sq_lucky` | map pending |
| 62 | saltmere | Thursday Weigh-In | `sq_first_weigh_in` | map pending |
| 63 | saltmere | Attempt Forty-Four | `sq_bottle_44` | built |
| 71 | revival_heights | No Lanyard, No Lift | `sq_lost_lanyard` | map pending |
| 81 | frostspire | Cold Hands | `sq_cold_hands` | map pending |
| 86 | sunmeadow_fields | Past the Shine | `sq_past_the_shine` | map pending |
| 91 | mirefen | Ask Nicely | `sq_ask_nicely` | built |
| 92 | mirefen | The Lumen Chain | `sq_lumen_chain` | built |
| 93 | mirefen | Count Day | `sq_count_day` | built |
| 101 | tidewater_coast | Sea Glass | `sq_sea_glass` | map pending |
| 111 | lanternport | The Keeper's Forecasts | `sq_forecast` | map pending |
| 121 | cindervale | Baked on the Rocks | `sq_warm_stones` | map pending |
| 131 | aurelith | A Stub from Aurelith | `sq_ticket_stub` | map pending |

## Brookhollow  (7)

### The Bean Thief  `sq_bean_thief`  (order 11, built)

- **Giver:** `villager_garden` on `brookhollow`
- **Prerequisites:** `got_starter`
- **Reward:** `watering_can` x1; flags `sq_bean_thief_done`

**Steps**

1. Talk to the gardener about the eaten beans. _[`brookhollow` (18,13) → `sq_bean_thief_start`]_
2. Stake out the bean rows at Night and spot the culprit (a Tumbloam). _[`brookhollow` → `sq_bean_thief_seen` — if `phase == Night`]_
3. Leave Trail Mix at the end of the row so the Tumbloam has its own snack. _[`brookhollow` → `sq_bean_thief_fed` — if `has_item trail_mix`]_
4. Tell the gardener. _[`brookhollow` (18,13) → `sq_bean_thief_done`]_

**Lines**

- `villager_garden` (start):
  - "Something's eating my beans. Neat little bites, every night."
  - "Sit up tonight and catch the culprit? Gently. It's probably small."
- `system` (step s2):
  - "A little ball-shaped creature rolls between the bean rows."
  - "It's a Tumbloam, nibbling very politely."
- `system` (step s3):
  - "You leave some Trail Mix at the end of the row."
  - "The Tumbloam rolls over to it. Fair trade."
- `villager_garden` (in_progress):
  - "Night's when it comes. Bring a snack. It's only hungry, not bad."
- `villager_garden` (turn_in):
  - "A Tumbloam! I knew it. Polite little thief."
  - "Here, my old watering can. Grow something of your own."

**Notes**

- Builds on the gardener's existing default line (beans eaten, 'Probably a Tumbloam'). Feeds the SOUL_PLAYBOOK 1.5 garden: 'the garden NPC gives [the watering can] after a small favour'.
- World to pick the bean-row tile near villager_garden (18,13); 'at' left null.
- Trail Mix sources already on the map: brookhollow bh_north_trees (13,2), route1 r1_tree_gap (17,13).

### Meet Five  `sq_first_five`  (order 12, built)

- **Giver:** `lab_brookhollow_aide` on `lab_brookhollow`
- **Prerequisites:** `got_starter`
- **Reward:** `dominance_crystal` x3; flags `sq_first_five_done`

**Steps**

1. Get the aide's tip: meet five different creatures. _[`lab_brookhollow` → `sq_first_five_start`]_
2. Meet five different species (seen, not caught) in the Kilindex. _[`route1` → `sq_first_five_met` — if `kilindex_seen >= 5`]_
3. Report back to the aide. _[`lab_brookhollow` → `sq_first_five_done`]_

**Lines**

- `lab_brookhollow_aide` (start):
  - "First field lesson: meet five different creatures."
  - "Not catch. Meet. Then come tell me about them."
- `lab_brookhollow_aide` (in_progress):
  - "Grass, water, trees. They're all out there, hiding badly."
- `lab_brookhollow_aide` (turn_in):
  - "Five! And you didn't skip the boring ones."
  - "Here, three crystals. Company issue. Meet first, then decide."

**Notes**

- Follows the aide's existing tip line ('the Kilindex logs every creature you meet... Meet everything. Write it down.').
- Condition needs a Kilindex seen-count hook from Coder.

### A Fly for the Fisher  `sq_fisher_fly`  (order 13, built)

- **Giver:** `fisher` on `brookhollow`
- **Prerequisites:** `flg_promoted`
- **Reward:** `feed_bag` x1; money 200; flags `sq_fisher_fly_done`

**Steps**

1. Hear the fisher out: the river's too low for his old lures. _[`brookhollow` (21,17) → `sq_fisher_fly_start`]_
2. Ask the fly-tier in Fernwick for a hand-tied fly. _[`home_fernwick_c` → `sq_fisher_fly_got`]_
3. Bring the fly back to the fisher. _[`brookhollow` (21,17) → `sq_fisher_fly_given`]_
4. Meet him on the bridge at Dusk to see it work. _[`brookhollow` (23,13) → `sq_fisher_fly_done` — if `phase == Dusk`]_

**Lines**

- `fisher` (start):
  - "River's too low for my old lures. Need something smaller."
  - "Fella in Fernwick ties flies. Ask him for one?"
- `home_fernwick_c_hobbyist` (step s2):
  - "A fly for the Brookhollow fisher? Twelve years, and finally a customer."
  - "Take this one. It's the easy knot. My best knot."
- `fisher` (turn_in):
  - "Hand-tied. Look at that."
  - "Come to the bridge at dusk. I'll show you how it's done."
- `fisher` (step s4):
  - "Caught nothing. Best evening I've had all year."
  - "Tell him the fly works. It's not a lie, exactly."

**Notes**

- Uses the fisher's Dusk move to the bridge (23,13) from SOUL_PLAYBOOK 2.2 (schedule system not built yet).
- Pairs two existing jokes: the fisher's low river and the hobbyist who has 'caught one fish'. No surveyor/field-team talk in quest lines.

### Bin Day Is Tomorrow  `sq_bin_day`  (order 14, built)

- **Giver:** `prop:bin_ron` on `brookhollow`
- **Prerequisites:** `flg_promoted`
- **Reward:** no items; flags `sq_bin_day_done`

**Steps**

1. Inspect Ron's bin by the front door. Bin day is 'tomorrow'. _[`brookhollow` (7,8) → `sq_bin_day_seen`]_
2. After each Master coin one more bag appears (up to 8; flies from bag 6). Text Bot's bin_1..bin_8 lines play; nothing to do. _[`brookhollow` (7,8) → `sq_bin_day_bag_8` — if `all_badges`]_
3. Between coin 8 and the finale, inspect the full bin: E5 Bin Monument. 8 more presses and a Mirewump pops out (rare catch). _[`brookhollow` (7,8) → `sq_bin_monument` — if `all_badges && !finale_done`]_
4. After the finale, Ron takes the bags out: last overworld beat before the credits. _[`brookhollow` (7,8) → `sq_bin_day_done` — if `finale_done`]_

**Lines**

- `system` (step s3):
  - "This is no longer a bin. It is a landmark."
- `ron` (turn_in):
  - "Told you. Tomorrow."

**Notes**

- Canon: STORY_RULINGS_SOUL #3 and SOUL_PLAYBOOK 2.3 / E5. Both lines above are quoted word for word from those rulings; Text Bot owns all other bin lines (bin_1..bin_8, bin_empty).
- The payoff scene has no other dialogue (ruling). E5 is missable on purpose: after the finale the bin is empty.
- Brief said this gag uses ron_in_party. Per STORY_RULINGS_CLUB, ron_in_party is the flag for Ron's one-time dance at The Firefly (Text Bot line club_int.rebel_dj ron_gag), not for the bins. The bins run on coin flags. Gary: confirm, or say if Ron should also comment on the bin when ron_in_party.
- All steps are on built maps, but the later steps need all 8 coins (later zones) and the finale.

### Dana's Desk  `sq_dana`  (order 15, map pending)

- **Giver:** `prop:dana_desk` on `office_int`
- **Prerequisites:** `flg_promoted`
- **Reward:** `dana_team_card` x1; flags `sq_dana_met`

**Steps**

1. Check Dana's cleared desk: a second sticky note in odd shorthand. _[`office_int` → `sq_dana_desk_note`]_
2. Find Dana's unsent drafts in the company inbox (secret E3); they decode the shorthand. _[`house_2f` → `sq_dana_note`]_
3. Find small scratched initials near the Greystone camp. _[`greystone_b1` → `sq_dana_greystone` — if `camp_restored_greystone`]_
4. Post-game: find Dana on Frostspire and battle her. _[`frostspire` → `sq_dana_met` — if `finale_done`]_

**Lines**

- `system` (step s1):
  - "Under the 'soon' note there's another. Shorthand: 'FS. N face. Sat.'"
  - "Means nothing to you. Yet."
- `system` (step s2):
  - "Unsent draft from Dana. Subject: 'Going up.'"
  - "'Frostspire. North face. Don't wait for me.'"
- `system` (step s3):
  - "Scratched small into the rock: 'D. was here. Briefly.'"
- `dana` (step s4):
  - "You found the note. Took you long enough."
  - "I didn't vanish. I quit. Then I climbed. Fancy a match?"
- `dana` (turn_in):
  - "Good fight. Here's my team card. Frame it or don't."
  - "Tell the office I said hi. Actually, don't."

**Notes**

- SOUL_PLAYBOOK 8.5-B. Dana appears ONLY in the post-game Frostspire fight (Story Bot). She is not one of the four field-team members; she quit.
- The shorthand decodes to a climbing trip, matching Text Bot's existing dana_gone_climbing desk line. Nothing about the field team's discovery.
- OPEN for Gary/Story Bot: 8.5-B puts Dana's initials 'at a camp' in Greystone. That could hint Dana was with the field team. Draft keeps it vague ('Briefly.'); cut the step if it muddies 'she quit'.
- Dana's sprite/NPC id 'dana' and the Frostspire spot are new.

### Ron's Other Job  `sq_ron_job`  (order 16, map pending)

- **Giver:** `ron` on `house_1f`
- **Prerequisites:** `beat_master_saltmere`
- **Reward:** `ron_croft_apron` x1; flags `sq_ron_croft`

**Steps**

1. Read Ron's CV on the house_1f table. _[`house_1f` → `sq_ron_cv`]_
2. Ron mentions an interview at the Lumen Line (gag). _[`station_int` → `sq_ron_interview_1` — if `ron_in_party`]_
3. Ron mentions an interview at a Saltmere fishmonger (gag). _[`saltmere` → `sq_ron_interview_2` — if `ron_in_party`]_
4. After the Revival Heights layoff letter (main story), Ron says a short sincere line. _[`revival_heights` → `sq_ron_letter`]_
5. Post-game: Nan Wexley hires Ron part-time at the Croft. _[`sunmeadow_croft` → `sq_ron_croft` — if `finale_done`]_

**Lines**

- `system` (step s1):
  - "Ron's CV. 'Skills: punctual (mostly), team player, bins.'"
  - "Someone has crossed out 'bins'."
- `ron` (step s2):
  - "Lumen Line wanted a conductor. I said 'all aboard' too loud."
  - "Apparently there's a right volume."
- `ron` (step s3):
  - "Fishmonger job. I named every fish. They said that's 'a problem'."
- `ron` (step s4):
  - "It's fine. It's just a letter."
  - "Thanks for not saying anything. That helps, {nick}."
- `nan_wexley` (step s5):
  - "Ron, is it? Can you carry feed without naming it?"
  - "...Fine. Name it. You start Monday."
- `ron` (turn_in):
  - "Part-time, {nick}! Real job. They use names here."

**Notes**

- SOUL_PLAYBOOK 8.5-F. The letter scene itself is main story (Ron's music turns minor only there, STORY_RULINGS_SOUL #4); this quest only adds one quiet line after it. Main worker: merge or drop step 4 if your scene covers it.
- Interview gags use ron_in_party as a condition; if Ron isn't travelling then, play them as phone texts instead.
- Uses Croft NPC nan_wexley and map sunmeadow_croft (proposed ids in SOUL_PLAYBOOK 8.3, unbuilt).
- Grouped under brookhollow because the giver (Ron, house_1f) is there; the quest runs from coin 2 to post-game.

### The Kid's Last Joke  `sq_kid_joke`  (order 17, built)

- **Giver:** `kid` on `brookhollow`
- **Prerequisites:** `beat_master_revival`
- **Reward:** `calm_tea` x1; flags `sq_kid_done`

**Steps**

1. The kid's joke falls flat. His dad stopped laughing. _[`brookhollow` (12,20) → `sq_kid_flat`]_
2. Visit the parent, who is reading job ads. _[`home_fernwick_a` → `sq_kid_ads`]_
3. Take a 'We're hiring Care Associates!' form from a heal-centre suggestion box. _[`heal_brookhollow` → `sq_kid_form`]_
4. Give the form to the parent. _[`home_fernwick_a` → `sq_kid_done`]_

**Lines**

- `kid` (start):
  - "Why did the crystal quit? ...I forget the rest."
  - "Dad stopped laughing. He reads job ads at breakfast now."
- `home_fernwick_a_parent` (step s2):
  - "Job ads. 'Must love paperwork.' I do not love paperwork."
- `system` (step s3):
  - "A flyer: 'We're hiring Care Associates!'"
  - "You take a form. Nobody stops you."
- `home_fernwick_a_parent` (turn_in):
  - "Care Associate? Looking after creatures all day?"
  - "...I'd actually like that. Thanks."
- `kid` (after):
  - "Why don't Tumbloams get lost? They always know which way is down."
  - "Dad laughed. Twice."

**Notes**

- SOUL_PLAYBOOK 8.5-E. Its parent id 'parent_c in house_int_c, Fernwick warp (22,6)' is out of date: that warp now goes to home_fernwick_a, whose NPC is home_fernwick_a_parent. Used that here.
- OPEN for Gary: 8.5-E puts the Brookhollow kid's parent in a Fernwick house, and the kid's own line says 'My mom says'. Keep the Fernwick parent, or move the parent to a Brookhollow home?
- Result per 8.5-E: the parent later appears as a Care Associate at the Fernwick branch (needs a Coder/World swap). Form can come from either suggestion_box (heal_brookhollow or heal_fernwick).

## Route 1  (2)

### Fork Road Regulars  `sq_fork_regulars`  (order 21, built)

- **Giver:** `trainer_r1_b` on `route1`
- **Prerequisites:** `got_starter`
- **Reward:** `trail_mix` x2, `tonic_small` x1; money 300; flags `sq_fork_regulars_done`

**Steps**

1. Beat trainer_r1_b; she dares you to beat the other two Route 1 trainers. _[`route1` (31,13) → `beat_trainer_r1_b`]_
2. Beat trainer_r1_a. _[`route1` (12,20) → `beat_trainer_r1_a`]_
3. Beat trainer_r1_c. _[`route1` (34,9) → `beat_trainer_r1_c`]_
4. Go back and gloat. _[`route1` (31,13) → `sq_fork_regulars_done`]_

**Lines**

- `trainer_r1_b` (start):
  - "Not bad. The other two on this road think they're better than me."
  - "Beat them both, then come back and gloat."
- `trainer_r1_b` (in_progress):
  - "Still one left. I can see them from here, smirking."
- `trainer_r1_b` (turn_in):
  - "Both of them? Ha! They'll never hear the end of it."
  - "Trail Mix. Trainers' lunch. You earned it."

**Notes**

- Trainer-defeat flags don't exist yet; beat_trainer_r1_a/b/c are proposed. Use the engine's ids if Coder already has a pattern.
- Hook for SOUL_PLAYBOOK 1.11 rematch calls: she can swap numbers here.
- Gender of trainer_r1_b is not set anywhere; 'she' is a draft choice.

### Over the Wall  `sq_over_the_wall`  (order 22, map pending)

- **Giver:** `trainer_r1_c` on `route1`
- **Prerequisites:** `got_starter`
- **Reward:** `energy_tonic` x1; flags `sq_over_the_wall_done`

**Steps**

1. trainer_r1_c wonders what's past the Sunmeadow shine. _[`route1` (34,9) → `sq_over_the_wall_start`]_
2. Once the barrier dims, pick a bloom in Sunmeadow Fields. _[`sunmeadow_fields` → `sq_over_the_wall_bloom` — if `beat_master_frostspire`]_
3. Bring it back to trainer_r1_c. _[`route1` (34,9) → `sq_over_the_wall_done`]_

**Lines**

- `trainer_r1_c` (start):
  - "Every day I stare at that shine. What's even over there?"
  - "If it ever opens, bring me something back. Anything."
- `trainer_r1_c` (turn_in):
  - "A flower. From the other side. It smells like... a flower."
  - "Perfect. Have this Pep Remedy. Pricey stuff, so don't waste it."

**Notes**

- Builds on trainer_r1_c's existing line 'Sunmeadow's walled off, so you're getting me instead.'
- The Route 1 barrier dims at beat_master_frostspire (progression.py).
- Reward is one Pep Remedy (energy_tonic): expensive by design, so it's a late, single reward.

## Fernwick (incl. The Firefly)  (8)

### The Missing Note  `sq_missing_note`  (order 31, map pending)

- **Giver:** `rebel_dj` on `club_int`
- **Prerequisites:** none
- **Reward:** `firefly_lantern` x1; flags `flg_missing_note_done`

**Steps**

1. Talk to the DJ at The Firefly (Dusk or Night). Four old records are missing. _[`club_int` → `flg_missing_note_started` — if `phase in (Dusk, Night)`]_
2. Find an Old Record in Fernwick. _[`fernwick` (27,5) → `item_fernwick_old_record`]_
3. Find an Old Record in Thornwood. _[`thornwood` (5,15) → `item_thornwood_old_record`]_
4. Find an Old Record on Route 1. _[`route1` (20,23) → `item_route1_old_record`]_
5. Find the last Old Record in Lanternport (map pending). _[`lanternport` → `item_lanternport_old_record` — if `beat_master_tidewater`]_
6. Bring all four back to the DJ. _[`club_int` → `flg_missing_note_done` — if `flg_record_4 && phase in (Dusk, Night)`]_

**Lines**

- `rebel_dj` (start):
  - "Dreamed this tune years back. Five notes. I only ever get four."
  - "Five notes, and the last one's gone. Reckon it's on an old record."
  - "Four of mine went missing years back. Find them?"
- `rebel_dj` (step s2):
  - "That's one! Hear that bassline? Always meant to be there."
- `rebel_dj` (step s3):
  - "Two. Strings now. Starting to sound like a river."
- `rebel_dj` (step s4):
  - "Three. Someone hummed this exact bit to me once. Odd."
- `rebel_dj` (turn_in):
  - "Four. That's all of them. Let me stitch it together..."
  - "Take this firefly lantern. Warms up a room. Warms up a camp, too."
- `rebel_dj` (after):
  - "Still missing one. It'll turn up."
- `rebel_dj` (after):
  - "Last note turned up. Turns out the tune was always meant to end there."
- `rebel_patron_3` (after):
  - "Now THAT I can dance to. Badly."

**Notes**

- ALL lines are Text Bot's existing club_int.rebel_dj / rebel_patron_3 lines, copied word for word (overworld_lines.json v0.4.9 and STORY_RULINGS_CLUB). Don't edit them here.
- Records are map items 'old_record'. Any pickup sets the LOWEST unset flg_record_N, so the in-progress lines follow how many you've found, not which map. Step order is just a suggestion.
- Record 1-3 lines are keyed to flg_record_1..3 (Text Bot). The step key on each line is only for readers.
- Record 4 is held in Lanternport (map pending); condition beat_master_tidewater is a guess for when Lanternport opens.
- Reward is lantern only (ruling). The DJ is asleep at dawn/day.
- Text Bot gating: note_reward needs flg_record_4. note_close ('Still missing one') plays AFTER flg_missing_note_done: the fifth note of the dream is still missing. tune_finished ('Last note turned up...') plays at finale_done, and so does patron_3's 'Badly' line (Text Bot to confirm the patron gate).
- Separate Text Bot gag, not part of the quest: rebel_dj ron_gag (ron_in_party, once).
- NOT canon, so not in lines: any link between the tune and the field team or the Riverbank Stranger.

### Mixing Colours  `sq_paint_job`  (order 32, built)

- **Giver:** `rebel_paint_vendor` on `club_int`
- **Prerequisites:** none
- **Reward:** no items; flags `sq_paint_job_done`, `paint_free_coat`

**Steps**

1. The paint vendor has run out of greens, browns and reds. _[`club_int` → `sq_paint_job_start` — if `phase in (Dusk, Night)`]_
2. Pick fern dye leaves in Thornwood. _[`thornwood` → `sq_paint_job_fern`]_
3. Dig river clay from the Brookhollow riverbank. _[`brookhollow` → `sq_paint_job_clay`]_
4. Ask the juice counter for leftover berry pulp. _[`club_int` → `sq_paint_job_berry`]_
5. Bring all three to the paint vendor. _[`club_int` → `sq_paint_job_done` — if `phase in (Dusk, Night)`]_

**Lines**

- `rebel_paint_vendor` (start):
  - "Out of greens, browns and reds. Can't paint a Cindrip without red."
  - "Bring me fern leaves, river clay and berry pulp?"
- `rebel_bartender` (step s4):
  - "Berry pulp? Left over from the shakes. Take the lot."
- `rebel_paint_vendor` (turn_in):
  - "Fern, clay, berry. That's three colours back on the shelf."
  - "Free coat on any creature you like. Paint's cosmetic. Won't make anyone stronger."
- `rebel_paint_vendor` (after):
  - "Took me three weeks to get a Cindrip's shade right."

**Notes**

- Cosmetic only: the reward is one free paint job (no stats).
- 'Paint's cosmetic. Won't make anyone stronger.' and the three-weeks line are the vendor's existing lines, copied word for word.
- Shop open Dusk/Night (ruling). The rebel_bartender id is fine as an id; player text calls them 'the juice counter'.
- World to pick tiles for the fern patch and clay bank (at = null).

### Ticks on the Flyer  `sq_tell_the_counter`  (order 33, built)

- **Giver:** `rebel_bartender` on `club_int`
- **Prerequisites:** `beat_master_fernwick`
- **Reward:** `pond_berry_juice` x1, `mossberry_shake` x1, `fern_mint_tea` x1, `firefly_shake` x1; flags `sq_counter_done`

**Steps**

1. Read the MISSING flyer and its pinned notes at The Firefly. _[`club_int` → `sq_counter_start`]_
2. Thornwood camp restored: tell the juice counter. _[`club_int` → `sq_counter_thornwood` — if `camp_restored_thornwood`]_
3. Greystone camp restored: tell the juice counter. _[`club_int` → `sq_counter_greystone` — if `camp_restored_greystone`]_
4. Frostspire camp restored: tell the juice counter. _[`club_int` → `sq_counter_frostspire` — if `camp_restored_frostspire`]_
5. Mirefen camp restored: tell the juice counter. _[`club_int` → `sq_counter_mirefen` — if `camp_restored_mirefen`]_
6. After the team is home, come back to The Firefly. _[`club_int` → `sq_counter_done` — if `field_team_home`]_

**Lines**

- `rebel_bartender` (start):
  - "That flyer's been up a long time. Notes keep getting pinned to it."
  - "Find anything out there, tell me first. I'll make it worth your while."
- `rebel_bartender` (step s2):
  - "Thornwood camp? Someone was there. Not lately, but someone."
  - "Pond Berry Juice. On the house."
- `rebel_bartender` (step s3):
  - "Greystone too. Bet the stove still works."
  - "Mossberry Shake. Thick enough to stand a spoon in."
- `rebel_bartender` (step s4):
  - "Frostspire? In that cold? Here, warm up."
  - "Fern Mint Tea. My own blend."
- `rebel_bartender` (step s5):
  - "Mirefen. That's every camp, then."
  - "Firefly Shake. I only make these for big news."
- `rebel_bartender` (turn_in):
  - "You did it. Look at that flyer. Every name ticked."
  - "Shakes for the whole room tonight. Even the bouncer smiled."

**Notes**

- Side piece on top of the main worker's camp restorations. The main draft owns the camps; this quest only reacts to camp_restored_* flags.
- Text Bot owns the flyer, the pinned notes and the per-camp ticks ('FOUND THE CAMP. NOT THEM.', 'FOUND. ALL FOUR.'). This quest adds no flyer text.
- Note tiers (ruling): note_thornwood and note_greystone at beat_master_fernwick, note_frostspire at beat_master_revival, note_mirefen at beat_master_frostspire.
- Player text calls this NPC 'the juice counter' (rebel_bartender is used only as the id). Drinks are juices, teas and milkshakes only.
- NOT canon, so not in lines: the counter or other regulars belonging to the Riverbank Stranger's people. The lines only show a regular who cares.
- Every step happens at club_int (built). It only waits on camp flags, and the Frostspire camp is on an unbuilt map.

### Dance of the Firefly  `sq_open_mic`  (order 34, built)

- **Giver:** `rebel_patron_3` on `club_int`
- **Prerequisites:** none
- **Reward:** `firefly_shake` x1; flags `sq_open_mic_done`

**Steps**

1. Patron_3 signed up for open mic with a dance they don't know. _[`club_int` → `sq_open_mic_start` — if `phase == Night`]_
2. Read the dance steps poster in the back room. _[`club_int` → `sq_open_mic_steps`]_
3. Step on the dance-floor tiles in order: left, left, back, spin. _[`club_int` → `sq_open_mic_danced` — if `phase == Night`]_
4. Tell patron_3. _[`club_int` → `sq_open_mic_done`]_

**Lines**

- `rebel_patron_3` (start):
  - "Open mic's coming. I'm doing a dance. I don't know a dance."
  - "Someone pinned the steps up out back. Learn them, show me?"
- `prop:dance_steps_poster` (step s2):
  - "DANCE OF THE FIREFLY: Left. Left. Back. Spin."
  - "(Spin optional. Dignity also optional.)"
- `system` (step s3):
  - "You stumble. Somebody claps anyway. Try again."
- `rebel_patron_3` (turn_in):
  - "Left, left, back, spin... I've got it! Sort of."
  - "Firefly Shake's on me. Don't tell Dov."

**Notes**

- Local puzzle. The tiles are 4 floor tiles near the DJ booth (prop ids club_floor_tile_1..4). A wrong order resets. World/Coder to place them.
- Ties to the existing flyer_open_mic line ('...earplugs if Dov signs up'). Dov stays offscreen.
- The back room is open from the first visit (ruling).

### Answers to Biscuit  `sq_biscuit`  (order 35, built)

- **Giver:** `prop:flyer_lost_creature` on `club_int`
- **Prerequisites:** `flg_promoted`
- **Reward:** `feed_bag_small` x2; money 300; flags `sq_biscuit_done`

**Steps**

1. Read the LOST flyer at The Firefly: a Tumbloam called Biscuit. _[`club_int` → `sq_biscuit_start`]_
2. Find Biscuit stuck below the Route 1 ledges. _[`route1` (22,17) → `sq_biscuit_found`]_
3. Go the long way around and come at Biscuit from above so it rolls toward the exit. _[`route1` → `sq_biscuit_freed`]_
4. Bring the news to the owner. _[`fernwick` → `sq_biscuit_done`]_

**Lines**

- `system` (step s2):
  - "Below the ledge, a Tumbloam rolls down, tries to climb, rolls down again."
  - "It looks pleased with itself anyway."
- `system` (step s3):
  - "You come at it from above. It rolls the right way, straight home."
- `prue_hollin` (turn_in):
  - "Biscuit! You rolled off again, didn't you?"
  - "Thank you. It's not much. Biscuit says thanks too."

**Notes**

- The flyer text is Text Bot's existing club_int.flyer_lost_creature. This quest adds no flyer lines.
- Ledge puzzle: Route 1 has one-way ledges (sign_r1_ledge 22,17). Tumbloams roll downhill, so the player must loop around and come from above.
- OPEN for Gary: three different uses of 'Biscuit'. (1) this lost-flyer Tumbloam, (2) the T5 trade Tumbloam from Prue Hollin, (3) Ron's nickname line. Draft makes (1) and (2) the same creature: Prue posted the flyer, and later trades Biscuit to you because 'it likes you better'. Owner npc prue_hollin and her map are not placed yet.
- If Gary keeps them separate, swap the owner to a new Fernwick NPC.

### Where the Fireflies Went  `sq_fireflies`  (order 36, built)

- **Giver:** `elder` on `fernwick`
- **Prerequisites:** `has_survey_parcel`
- **Reward:** no items; flags `sq_fireflies_done`, `skill_glowcall`

**Steps**

1. At Night, count the fireflies at the pond for the elder. Only 3 left. _[`fernwick` (7,20) → `sq_fireflies_start` — if `phase == Night`]_
2. Plant lumen moss in the Thornwood scar. _[`thornwood` (27,11) → `sq_fireflies_scar_1`]_
3. Plant lumen moss in the Greystone entrance scar. _[`greystone_entrance` (16,12) → `sq_fireflies_scar_2`]_
4. Plant lumen moss in one more Greystone dig scar (spot TBD by World Design). _[`greystone_b1` → `sq_fireflies_scar_3`]_
5. Count again at the pond at Night: 12 fireflies. _[`fernwick` (16,20) → `sq_fireflies_done` — if `phase == Night`]_

**Lines**

- `elder` (start):
  - "Count them with me? ...Three. There used to be dozens."
  - "Lumen moss heals cut ground. Plant some where old crystal was dug out?"
- `system` (step s2):
  - "You press lumen moss into the scar. It glows, faintly."
- `system` (step s3):
  - "You press lumen moss into the scar. It glows, faintly."
- `system` (step s4):
  - "You press lumen moss into the scar. It glows, faintly."
- `elder` (in_progress):
  - "Three scars, I'd guess. The land remembers every one."
- `elder` (turn_in):
  - "Count again. ...Ten, eleven, twelve. Twelve!"
  - "Let me teach you Glowcall. Dark places won't seem so dark."

**Notes**

- SOUL_PLAYBOOK 8.5-D. Pond tiles x15-18, y20-21; at (16,20) is a placeholder.
- Prereq has_survey_parcel is a guess so Greystone is reachable. The elder gives lumen moss x3 at the start. The Trail Buddy hums at each scar (SP 1.2). A full firefly return stays an ending moment (SP 6.5); 12 is the side-quest result.
- Glowcall is a FIELD SKILL (unlock TBD in FIELD_SKILLS.md), so it's given as flag skill_glowcall (proposed), not an item. OPEN: the skill's effect and the third Greystone scar (World Design).
- 'The digging' is local colour only. It must not imply the Vane memo or Vane's motive (not canon).

### The Last Parcel  `sq_courier_last_route`  (order 37, built)

- **Giver:** `villager_f1` on `fernwick`
- **Prerequisites:** `flg_promoted`
- **Reward:** `tonic_small` x2; flags `sq_courier_done`

**Steps**

1. The ex-courier still has one parcel he never delivered. _[`fernwick` (20,10) → `sq_courier_start`]_
2. Deliver it to the house with the kettle in Brookhollow. _[`home_brookhollow_a` → `sq_courier_delivered`]_
3. Tell the ex-courier. _[`fernwick` (20,10) → `sq_courier_done`]_

**Lines**

- `villager_f1` (start):
  - "My last parcel. Never got delivered. Then the job went."
  - "Brookhollow, the house with the kettle. Would you?"
- `home_brookhollow_a_owner` (step s2):
  - "A parcel? For me? Postmarked two years ago."
  - "A new kettle whistle! Now it can sing again."
- `villager_f1` (turn_in):
  - "Delivered. My route's finally done. Thank you."
  - "Take these. Couriers always carry spares."

**Notes**

- Builds on villager_f1's ex-courier lines and the home_brookhollow_a_owner kettle line.
- Delivery quest. The parcel is a key item that is removed on delivery.

### KEEP OUT (please)  `sq_fort_sign`  (order 38, built)

- **Giver:** `home_lanternport_c_kid` on `home_lanternport_c`
- **Prerequisites:** none
- **Reward:** `trail_mix` x1; flags `sq_fort_sign_done`

**Steps**

1. The kid wants a scary sign for the fort. _[`home_lanternport_c` → `sq_fort_sign_start`]_
2. Ask the painter at The Firefly (Dusk or Night). _[`club_int` → `sq_fort_sign_painted` — if `phase in (Dusk, Night)`]_
3. Bring the sign to the kid. _[`home_lanternport_c` → `sq_fort_sign_done`]_

**Lines**

- `home_lanternport_c_kid` (start):
  - "My fort needs a sign. A scary one."
  - "The painter at the club could do it. Ask?"
- `rebel_paint_vendor` (step s2):
  - "A fort sign? Scary? Leave it with me."
  - "Done. 'KEEP OUT (please).' Manners matter."
- `home_lanternport_c_kid` (turn_in):
  - "Perfect. Now nobody gets in. Unless they ask nicely."
  - "You can come in. You know the password."

**Notes**

- home_lanternport_c is the id of a house in FERNWICK (warp 16,18). The id is misleading; flagged for World Design.
- Builds on the kid's existing fort / password 'please' line.
- Optional: a prop 'fort_sign' appears in the house after the quest.

## Thornwood  (2)

### Stumps That Blink  `sq_burlbeetle_count`  (order 41, built)

- **Giver:** `trainer_tw_bug` on `thornwood`
- **Prerequisites:** `beat_master_fernwick`
- **Reward:** `vigor_seed` x1; flags `sq_burlbeetle_done`

**Steps**

1. The bug catcher can't tell Burlbeetles from stumps. _[`thornwood` (11,15) → `sq_burlbeetle_start`]_
2. Find the five stumps that blink. _[`thornwood` → `sq_burlbeetle_found_5` — if `burlbeetle_stump_1..5 all checked`]_
3. Report the count. _[`thornwood` (11,15) → `sq_burlbeetle_done`]_

**Lines**

- `trainer_tw_bug` (start):
  - "Burlbeetles look like stumps. I've counted three. I think."
  - "Find the ones that blink. Stumps don't blink."
- `prop:burlbeetle_stump_1` (step s2):
  - "The stump blinks at you. Then pretends it didn't."
- `trainer_tw_bug` (in_progress):
  - "Tap every stump. The real stumps won't mind."
- `trainer_tw_bug` (turn_in):
  - "Five! I'd counted two of those as actual stumps."
  - "Here, a Vigor Seed. For keeping your eyes open."

**Notes**

- Builds on trainer_tw_bug's existing joke that Burlbeetles look like stumps.
- Five new stump props (burlbeetle_stump_1..5). The same blink line plays on each. World to place them on Thornwood tree-edge tiles; a sixth decoy stump says 'Just a stump.'
- The quest starts after beat_master_fernwick, so the trainer has already been battled.

### Lunch on the Trail  `sq_stuck_with_me`  (order 42, built)

- **Giver:** `trainer_tw_b` on `thornwood`
- **Prerequisites:** `beat_master_fernwick`
- **Reward:** `energy_tonic` x1; flags `sq_lunch_done`

**Steps**

1. The hiker by the blocked east trail is hungry. _[`thornwood` (27,16) → `sq_lunch_start`]_
2. Get a packed lunch from the juice counter at The Firefly. _[`club_int` → `sq_lunch_got`]_
3. Bring it back. _[`thornwood` (27,16) → `sq_lunch_done`]_

**Lines**

- `trainer_tw_b` (start):
  - "East trail's blocked and I've waited all day."
  - "Didn't pack lunch. Didn't think I'd need it. Help?"
- `rebel_bartender` (step s2):
  - "Packed lunch for Thornwood? Sandwich and a Pond Berry Juice. Off you go."
- `trainer_tw_b` (turn_in):
  - "Sandwich! You're a hero. A small, sandwich-shaped hero."
  - "Take this Pep Remedy. Bought it for the trip. Trip's off."

**Notes**

- Builds on trainer_tw_b's existing 'east trail's blocked' line. Run only while the east trail is still blocked (Coder: use whatever flag unblocks sign_tw_east).
- Pep Remedy (energy_tonic) is pricey, so one is a generous reward, and the line explains why he has it.
- Player text calls the NPC 'the juice counter'; rebel_bartender is used only as the id.

## Greystone Caverns (incl. Lantern Rest)  (2)

### Honest Map  `sq_cave_sketch`  (order 51, built)

- **Giver:** `hiker` on `greystone_entrance`
- **Prerequisites:** `has_survey_parcel`
- **Reward:** `crystal_dust` x2; money 500; flags `sq_sketch_done`

**Steps**

1. The hiker is sketching the caves and hates dead ends. _[`greystone_entrance` (15,10) → `sq_sketch_start`]_
2. Check the west dead end. _[`greystone_entrance` (3,4) → `sq_sketch_1`]_
3. Check the south-west dead end. _[`greystone_entrance` (1,11) → `sq_sketch_2`]_
4. Check the north dead end on B1. _[`greystone_b1` (10,3) → `sq_sketch_3`]_
5. Check the east dead end on B1. _[`greystone_b1` (24,16) → `sq_sketch_4`]_
6. Report back. _[`greystone_entrance` (15,10) → `sq_sketch_done`]_

**Lines**

- `hiker` (start):
  - "I'm sketching the caves. Dead ends are the worst part."
  - "Peek into four for me? Just tell me what's there."
- `system` (step s2):
  - "Dead end. You make a note for the hiker."
- `hiker` (turn_in):
  - "Four dead ends. My map's finally honest."
  - "Here, some crystal dust I dug up. Can't sketch with it."

**Notes**

- All four spots are existing dead-end item tiles (gs_west_dead_end, gs_sw_dead_end, b1_north_dead_end, b1_east_dead_end), so the player gets the hidden items on the way.
- The system line repeats at each dead end (steps 2-5). The (1,11) spot sits next to the lantern_rest warp (0,11), a soft nudge toward the memorial.
- Prereq has_survey_parcel is a guess at when Greystone opens.

### Ferns for Old Hal  `sq_flowers_old_hal`  (order 52, built)

- **Giver:** `elder` on `fernwick`
- **Prerequisites:** `has_survey_parcel`
- **Reward:** `trail_mix` x2; flags `sq_hal_done`

**Steps**

1. The Fernwick elder asks you to take ferns to Old Hal's stone. _[`fernwick` (7,20) → `sq_hal_start`]_
2. Lay the ferns at Old Hal's stone in the Lantern Rest. _[`lantern_rest` → `sq_hal_laid`]_
3. Tell the elder. _[`fernwick` (7,20) → `sq_hal_done`]_

**Lines**

- `elder` (start):
  - "Old Hal fixed my roof twice. Never charged me once."
  - "He rests past Greystone now. Take him these ferns?"
- `system` (step s2):
  - "You lay the ferns by the stone. OLD HAL & CINDER."
- `keeper` (step s2):
  - "Hal's got visitors. Good. Cinder would've chewed those ferns."
- `elder` (turn_in):
  - "Thank you. Roof's still dry. That's Hal's doing."
  - "I baked these for him. He'd want you to have them."

**Notes**

- Builds on lantern_rest stone_6 ('OLD HAL & CINDER Fixed every roof in Fernwick'). The stone text is World/Text-owned; the system line only names it.
- Zone is greystone_caverns because the main step is at lantern_rest; the giver is in Fernwick. Lantern Rest is off greystone_entrance (0,11).
- Gentle tone: a memorial errand, no sadness beat beyond the keeper's line. Follows STORY_ART_LESSONS: show, don't explain.

## Saltmere  (3)

### The Lucky-Crystal Seller  `sq_lucky`  (order 61, map pending)

- **Giver:** `lucky_crystal_seller` on `saltmere`
- **Prerequisites:** `beat_master_fernwick`
- **Reward:** `glass_crystal` x1; flags `sq_lucky_done`

**Steps**

1. Buy a lucky crystal from the seller in any city (1 of 4). _[`saltmere` → `sq_lucky_1`]_
2. Buy another in a different city (2 of 4). _[`revival_heights` → `sq_lucky_2`]_
3. Buy another in a different city (3 of 4). _[`lanternport` → `sq_lucky_3`]_
4. Buy another in a different city (4 of 4). A compliance memo lands in your inbox. _[`cindervale` → `sq_lucky_4`]_
5. After the ending, visit the seller, who has finally gone honest. _[`aurelith` → `sq_lucky_done` — if `sq_lucky_4 && finale_done`]_

**Lines**

- `lucky_crystal_seller` (start):
  - "Lucky crystal! Brings luck. Pretty much guaranteed."
  - "Looks a lot like glass. That's how you know it's lucky."
- `system` (step s4):
  - "Inbox: 'Unauthorised crystal resale under investigation. Please report sellers.'"
  - "You decide not to."
- `lucky_crystal_seller` (turn_in):
  - "Clear crystals. 100% nothing."
  - "Finally honest."
- `system` (after):
  - "Your Glass Crystal does nothing. Your Trail Buddy loves it anyway."

**Notes**

- SOUL_PLAYBOOK 8.5-C. The seller's start and turn_in lines are Text Bot's existing unplaced_npcs.lucky_crystal_seller lines (default, seller_ending), copied word for word. Per-city pitches (seller_saltmere, seller_revival, seller_lanternport, seller_cindervale, seller_aurelith) play on each purchase and aren't repeated here.
- Any 4 of the 5 cities count. Step maps are just examples. The memo text paraphrases 8.5-C; Text Bot may own inbox copy.
- Ruling (STORY_RULINGS_SOUL #3): the crystals are plain glass. Never imply they do anything.
- Zone is saltmere, the first city he appears in. The seller npc is still unplaced (proposed).

### Thursday Weigh-In  `sq_first_weigh_in`  (order 62, map pending)

- **Giver:** `weigh_in_host` on `saltmere`
- **Prerequisites:** `beat_master_fernwick`
- **Reward:** no items; flags `sq_weigh_done`, `ribbon_weigh_in`

**Steps**

1. Meet the harbour weigh-in host (any day). _[`saltmere` → `sq_weigh_start`]_
2. On a Thursday, enter a creature of the featured species. _[`saltmere` → `sq_weigh_entered` — if `weekday == thu`]_
3. Beat the record holder on the board (heaviest OR lightest). _[`saltmere` → `sq_weigh_done`]_

**Lines**

- `weigh_in_host` (start):
  - "Thursdays we weigh creatures. Heaviest wins. Lightest also wins."
  - "Bring the featured species. Crowd's free. Cheering's mandatory."
- `weigh_in_host` (in_progress):
  - "Not Thursday yet. The scales need their rest."
- `weigh_in_host` (turn_in):
  - "New record! Somebody fetch the chalk!"
  - "Here's your ribbon. It shows on the Kilindex card. Forever."

**Notes**

- Intro quest for the SOUL_PLAYBOOK 1.6 Weigh-In system (needs weekday clock 1.4, harbour scales prop). The quest only teaches it. Weekly contests continue without it.
- weigh_in_host is a new NPC. The record board shows an NPC holder name. Text Bot to name them.

### Attempt Forty-Four  `sq_bottle_44`  (order 63, built)

- **Giver:** `home_saltmere_a_hobbyist` on `home_saltmere_a`
- **Prerequisites:** `beat_master_fernwick`
- **Reward:** `coin_pouch_small` x1; flags `sq_bottle_done`

**Steps**

1. The ship-in-a-bottle builder snapped another mast. _[`home_saltmere_a` → `sq_bottle_start`]_
2. Find a thin, straight twig in Thornwood's glade. _[`thornwood` (22,11) → `sq_bottle_twig`]_
3. Bring it back. _[`home_saltmere_a` → `sq_bottle_done`]_

**Lines**

- `home_saltmere_a_hobbyist` (start):
  - "Attempt forty-three. The mast snapped. Again."
  - "Thornwood twigs grow thin and straight. Bring me one?"
- `system` (step s2):
  - "A twig as straight as a pencil. Perfect for a tiny mast."
- `home_saltmere_a_hobbyist` (turn_in):
  - "Forty-four. It's in. It's standing. Don't breathe."
  - "...Perfect. Take this pouch. I'd only spend it on more tiny ships."

**Notes**

- Builds on the hobbyist's existing '43rd attempt' line. Backtrack fetch to a built map; the twig is next to the existing tw_glade_tree item (22,11).
- The home_saltmere_a interior map exists, so map_status is 'built', but the Saltmere town map is to_come. The quest can't be reached until the town exists.

## Revival Heights  (1)

### No Lanyard, No Lift  `sq_lost_lanyard`  (order 71, map pending)

- **Giver:** `rh_intern` on `revival_heights`
- **Prerequisites:** `beat_master_saltmere`
- **Reward:** `tonic_small` x2; flags `sq_lanyard_done`

**Steps**

1. A Revival Tech intern has lost their lanyard. _[`revival_heights` → `sq_lanyard_start`]_
2. Look under the benches at the Lumen Line station. _[`station_int` → `sq_lanyard_found`]_
3. Return it. _[`revival_heights` → `sq_lanyard_done`]_

**Lines**

- `rh_intern` (start):
  - "Lost my lanyard. No lanyard, no lift. No lift, no job."
  - "Last had it at the station. Could you look?"
- `system` (step s2):
  - "Under a bench: a lanyard. 'INTERN. Smile! You're Revival Tech.'"
- `rh_intern` (turn_in):
  - "My lanyard! I can take the lift again. Forty floors."
  - "Have these. Lobby freebies. Everyone gets some."

**Notes**

- Small company-life piece. Office humour, no plot. Fits the grey-morality tone: staff are just people.
- rh_intern is a new NPC. station_int exists in overworld_lines; World to confirm which city's station holds the bench (Revival Heights is rail-linked).

## Frostspire  (1)

### Cold Hands  `sq_cold_hands`  (order 81, map pending)

- **Giver:** `frostspire_climber` on `frostspire`
- **Prerequisites:** `beat_master_revival`
- **Reward:** `tonic_large` x1; flags `sq_cold_done`

**Steps**

1. A climber's hands are too cold to tie knots. _[`frostspire` → `sq_cold_start`]_
2. Bring something warm: Fern Mint Tea from The Firefly. _[`club_int` → `sq_cold_tea` — if `has_item fern_mint_tea`]_
3. Give it to the climber. _[`frostspire` → `sq_cold_done`]_

**Lines**

- `frostspire_climber` (start):
  - "Hands are too cold to tie a knot."
  - "Anything warm? Tea, maybe? I'll make it worth your while."
- `frostspire_climber` (turn_in):
  - "Fern mint. That's the stuff. Fingers are back."
  - "Take this Big Remedy. Mountains eat Small ones."

**Notes**

- Thin canon for Frostspire (no placed NPCs). New climber NPC. The Frostspire camp is main-worker territory, so this stays clear of it.
- Dana's post-game fight (sq_dana) also happens on Frostspire. The climber could later say 'Someone's up the north face' as a nudge (optional Text Bot line).
- fern_mint_tea is an existing item (also given in sq_tell_the_counter).

## Sunmeadow Fields  (1)

### Past the Shine  `sq_past_the_shine`  (order 86, map pending)

- **Giver:** `prop:sign_r1_ne` on `route1`
- **Prerequisites:** `beat_master_frostspire`
- **Reward:** `feed_bag` x2; flags `sq_shine_done`, `croft_open`

**Steps**

1. Read the Route 1 sign: 'Wexley's Croft – past the shine'. _[`route1` (40,3) → `sq_shine_start`]_
2. Find the Croft in Sunmeadow and meet Nan Wexley. _[`sunmeadow_croft` → `sq_shine_met`]_
3. Herd three loose Tumbloams back into the paddock. _[`sunmeadow_croft` → `sq_shine_herded`]_
4. Tell Nan. _[`sunmeadow_croft` → `sq_shine_done`]_

**Lines**

- `nan_wexley` (start):
  - "A visitor! Good. Three Tumbloams got out. Again."
  - "Herd them back in? Come at them from uphill."
- `system` (step s3):
  - "The Tumbloam rolls downhill, straight into the paddock."
- `nan_wexley` (turn_in):
  - "All three. You've done this before, haven't you?"
  - "Croft's open to you now. Bring anyone who needs looking after."

**Notes**

- Intro to the SOUL_PLAYBOOK 8.3 Croft (Nan Ottilie Wexley, Ferris, maps sunmeadow_croft / croft_int, all proposed). The sign text is quoted from 8.3; World/Text own the sign.
- Gate: the Route 1 barrier dims at beat_master_frostspire.
- Uses the same 'Tumbloams roll downhill' rule as sq_biscuit so the mechanic is taught once and reused.
- Player text says 'herd' (house banned-word list).

## Mirefen  (3)

### Ask Nicely  `sq_ask_nicely`  (order 91, built)

- **Giver:** `mirefen_angler` on `mirefen_bog`
- **Prerequisites:** `beat_master_frostspire`
- **Reward:** `field_notebook` x1; flags `sq_nicely_done`

**Steps**

1. Ask the quiet angler about the field notebook (flyer note: 'Ask nicely'). _[`mirefen_bog` → `sq_nicely_start`]_
2. Sit with them at Dusk without talking. _[`mirefen_bog` → `sq_nicely_sat` — if `phase == Dusk`]_
3. Ask again. _[`mirefen_bog` → `sq_nicely_done`]_

**Lines**

- `mirefen_angler` (start):
  - "Notebook? Maybe. I like the quiet. Sit a while first."
- `system` (step s2):
  - "You sit. The bog bubbles. Nobody says anything for ages."
  - "It's nice, actually."
- `mirefen_angler` (turn_in):
  - "You can sit still. Rare, that."
  - "Found this in the reeds. Someone's field notes. Yours now."
- `mirefen_angler` (after):
  - "I just like the quiet."

**Notes**

- Follows the club note_mirefen tier (beat_master_frostspire): 'Mirefen fisher found a field notebook... Ask nicely'. The 'after' line is the angler's existing default, word for word.
- OVERLAP RISK with the main worker: if the main quest uses the notebook to find the Mirefen camp, merge this in as its opening, or keep it side-only and make the notebook a keepsake. Notebook contents are not written here (no reveal of the field team's discovery).
- Phase name 'Dusk' follows the phase list (dawn, day, dusk, night).

### The Lumen Chain  `sq_lumen_chain`  (order 92, built)

- **Giver:** `corwen_fell` on `mirefen_bog`
- **Prerequisites:** `has_bike`
- **Reward:** `framed_letter` x1; flags `sq_chain_done`, `wick_trail_glow`

**Steps**

1. Trade with Corwen on the bog islet at Night to get Purl, then read Purl's old letter at any heal-centre terminal. _[`mirefen_bog` (13,3) → `sq_chain_letter` — if `trade_t6_done && phase == Night`]_
2. Deliver the letter to Lune on Route 1's high corner at Night and trade for Matins. _[`route1` (40,1) → `sq_chain_lune` — if `phase == Night`]_
3. Deliver Lune's reply to Ivo below the caves and trade for Wick. _[`greystone_b1` (24,17) → `sq_chain_ivo`]_
4. Take Wick to the Lantern Rest. His lantern brightens at one stone. _[`lantern_rest` → `sq_chain_done`]_

**Lines**

- `system` (step s1):
  - "An old letter, never delivered. 'To L. Ashby, Route 1, the high corner.'"
- `lune_ashby` (step s2):
  - "Corwen's handwriting. Took the long way, didn't it?"
  - "Take my reply below the caves? To I. Stannard."
- `ivo_stannard` (step s3):
  - "Lune still writes. Good."
  - "Take Wick to the Lantern Rest. There's someone he'd like to see."
- `system` (step s4):
  - "Wick's lantern brightens at one stone. It stays bright."
- `keeper` (turn_in):
  - "That's Ivo's Wick. Look at that lantern go."
  - "Ivo asked me to frame this letter for you. Hang it somewhere warm."

**Notes**

- SOUL_PLAYBOOK 8.5-A plus 8.4 trades T6, T4, T3. Trade asks and swaps are Text Bot's (about 8 pages per trader); these lines are only the chain beats.
- Each trade can also be done on its own; the chain is one-way (Purl to Matins to Wick).
- OPEN: which Lantern Rest stone Wick brightens at (8.4 T3: 'the light of Ivo's old canary-creature'). Maybe stone_blank? Keep the ruling that it becomes a bench in mind. Gary/World to pick.
- OPEN: trader 'Lune Ashby' shares a surname with field-team member Pell Ashby. Intended family link, or rename? Not hinted in lines.
- Theme (notes only): lumen is passed on through people.
- Zone is mirefen because the chain starts with Corwen (T6).

### Count Day  `sq_count_day`  (order 93, built)

- **Giver:** `mirefen_census_clerk` on `mirefen_bog`
- **Prerequisites:** `has_bike`
- **Reward:** no items; money 300; flags `sq_count_done`, `mirefen_count_unlocked`

**Steps**

1. The census clerk explains the daily Mirefen Count. _[`mirefen_bog` → `sq_count_start`]_
2. Check today's spotlight species on the company terminal. _[`mirefen_bog` → `sq_count_spotlight`]_
3. Finish one count (20 nets, no battles; binoculars work as the scope). _[`mirefen_bog` → `sq_count_done`]_

**Lines**

- `mirefen_census_clerk` (start):
  - "Company census. Twenty nets, no battles, one scope."
  - "Today's spotlight is on the terminal. Count carefully. Head office checks."
- `mirefen_census_clerk` (turn_in):
  - "Clean count. Head office will love it. Or ignore it."
  - "Come back tomorrow. The spotlight changes daily."

**Notes**

- Intro quest for SOUL_PLAYBOOK 1.10 Mirefen Count. The daily repeat is a system, not this quest.
- mirefen_census_clerk is a new NPC. Survey nets are a special-area tool (Coder).

## Tidewater Coast  (1)

### Sea Glass  `sq_sea_glass`  (order 101, map pending)

- **Giver:** `tidewater_beachcomber` on `tidewater_coast`
- **Prerequisites:** `has_tideglide`
- **Reward:** `feed_bag` x1; money 400; flags `sq_glass_done`

**Steps**

1. A beachcomber collects sea glass, but the best bits are offshore. _[`tidewater_coast` → `sq_glass_start`]_
2. Glide out and pick up three pieces of sea glass on the sandbars. _[`tidewater_coast` → `sq_glass_3`]_
3. Bring them back. _[`tidewater_coast` → `sq_glass_done`]_

**Lines**

- `tidewater_beachcomber` (start):
  - "The good sea glass washes up on the sandbars. Can't swim."
  - "Three pieces? Green's my favourite. Any colour, really."
- `system` (step s2):
  - "A piece of sea glass, worn smooth as a pebble."
- `tidewater_beachcomber` (turn_in):
  - "Look at that green. Worn smooth as a mint."
  - "Here. For the trip back."

**Notes**

- Placeholder for Tidewater Coast, which has very little canon (no NPCs, no map). Uses has_tideglide so the new move gets a quick side use.
- Wording deliberately avoids comparing sea glass to bottles (house rule: no hints at drinking).

## Lanternport  (1)

### The Keeper's Forecasts  `sq_forecast`  (order 111, map pending)

- **Giver:** `lighthouse_keeper` on `lanternport`
- **Prerequisites:** `beat_master_tidewater`
- **Reward:** no items; flags `sq_forecast_done`, `app_sky_almanac`

**Steps**

1. Read the lighthouse keeper's weekly forecast board. _[`lanternport` → `sq_forecast_start`]_
2. Be in the forecast zone during the forecast weather or phase (1 of 5). _[`any` → `sq_forecast_1`]_
3. Correct forecast 2 of 5. _[`any` → `sq_forecast_2`]_
4. Correct forecast 3 of 5. _[`any` → `sq_forecast_3`]_
5. Correct forecast 4 of 5. _[`any` → `sq_forecast_4`]_
6. Correct forecast 5 of 5. _[`any` → `sq_forecast_5`]_
7. The last forecast: meteor night at Lanternport. A Cosmic creature appears. _[`lanternport` → `sq_forecast_done` — if `sq_forecast_5 && phase == Night`]_

**Lines**

- `lighthouse_keeper` (start):
  - "Forecast's on the board. I'm right more often than not."
  - "Go and check. Come back and tell me I'm a genius."
- `lighthouse_keeper` (in_progress):
  - "Right again? Of course. The sky tells me things."
- `lighthouse_keeper` (step s7):
  - "Tonight's the big one. Look up. Then look out."
- `lighthouse_keeper` (turn_in):
  - "Five out of five, plus a meteor. I'm framing that."
  - "Here, the Sky Almanac for your phone. Next meteor night's in it."

**Notes**

- SOUL_PLAYBOOK 8.5-G. Needs the weather/phase system and the meteor night (1.7). The scripted Cosmic encounter belongs to Story/Code.
- Forecast steps are generated from the board (zone + weather/phase). Map and position are null by design.
- lighthouse_keeper is a new NPC (Lanternport is still planned). Lanternport also holds Missing Note record 4 (see sq_missing_note).

## Cindervale  (1)

### Baked on the Rocks  `sq_warm_stones`  (order 121, map pending)

- **Giver:** `cindervale_baker` on `cindervale`
- **Prerequisites:** `beat_master_lanternport`
- **Reward:** `trail_mix` x2; money 300; flags `sq_stones_done`

**Steps**

1. A baker cooks on the warm ground but is out of mossberries. _[`cindervale` → `sq_stones_start`]_
2. Pick mossberries in Fernwick (bush by the east tree). _[`fernwick` (29,9) → `sq_stones_berries`]_
3. Bring them back. _[`cindervale` → `sq_stones_done`]_

**Lines**

- `cindervale_baker` (start):
  - "The ground's warm enough to bake on. Cheapest oven around."
  - "Out of mossberries, though. Fernwick grows the best. Fetch some?"
- `cindervale_baker` (turn_in):
  - "Mossberry buns, fresh off the hot rocks."
  - "Take a few. Careful, they're lava-hot. That's a joke. Mostly."

**Notes**

- Placeholder for Cindervale, which has thin canon (only the lucky-crystal seller line). New baker NPC.
- No volcano-fume wording or gags, per house rules. Heat comes from warm ground only.
- World to pick the bush tile; (29,9) is near the existing fw_east_tree item.

## Aurelith  (1)

### A Stub from Aurelith  `sq_ticket_stub`  (order 131, map pending)

- **Giver:** `home_fernwick_a_kid` on `home_fernwick_a`
- **Prerequisites:** `all_badges`
- **Reward:** `feed_bag_small` x1; flags `sq_stub_done`

**Steps**

1. The Fernwick kid who wants to beat all eight Masters hears you did it. _[`home_fernwick_a` → `sq_stub_start`]_
2. Ask the arena usher in Aurelith for a spare ticket stub. _[`aurelith` → `sq_stub_got`]_
3. Bring it to the kid. _[`home_fernwick_a` → `sq_stub_done`]_

**Lines**

- `home_fernwick_a_kid` (start):
  - "You've got all eight coins? ALL eight?"
  - "Bring me something from Aurelith. Anything! Please!"
- `aurelith_usher` (step s2):
  - "A spare stub for a kid? Here. Tell them the Masters say hi."
- `home_fernwick_a_kid` (turn_in):
  - "A real stub! From the real arena!"
  - "I'm beating all eight. Then you. Then I'm having a nap."

**Notes**

- Pays off home_fernwick_a_kid's existing 'beat all 8 Masters' line. Player text says 'coins' (never the banned alternative).
- aurelith_usher is a new NPC. Aurelith is rail-only and to_come.
- Zone is aurelith because the key step is there; the giver is in Fernwick.

## New ids to add

Every id below doesn't exist in code/data yet. Flags are proposed; the SOUL 8.5 `sq_*` stems are kept as written.

**NPCs**

- `dana` (npc) — sq_dana
- `nan_wexley` (npc, proposed SP 8.3) — sq_ron_job
- `prue_hollin` (npc, T5 trade; placement TBD) — sq_biscuit
- `lucky_crystal_seller` (npc placement) — sq_lucky
- `weigh_in_host` (npc) — sq_first_weigh_in
- `rh_intern` (npc) — sq_lost_lanyard
- `frostspire_climber` (npc) — sq_cold_hands
- `nan_wexley` (npc, proposed SP 8.3) — sq_past_the_shine
- `corwen_fell / lune_ashby / ivo_stannard` (npcs, SP 8.4) — sq_lumen_chain
- `mirefen_census_clerk` (npc) — sq_count_day
- `tidewater_beachcomber` (npc) — sq_sea_glass
- `lighthouse_keeper` (npc) — sq_forecast
- `cindervale_baker` (npc) — sq_warm_stones
- `aurelith_usher` (npc) — sq_ticket_stub

**Maps**

- `frostspire` (map) — sq_dana
- `sunmeadow_croft` (map, proposed SP 8.3) — sq_ron_job
- `sunmeadow_croft` (map, proposed SP 8.3) — sq_past_the_shine

**Items**

- `watering_can` (item) — sq_bean_thief
- `hand_tied_fly` (key item) — sq_fisher_fly
- `dana_team_card` (item) — sq_dana
- `ron_croft_apron` (item) — sq_ron_job
- `rehire_form` (key item) — sq_kid_joke
- `sunmeadow_bloom` (key item) — sq_over_the_wall
- `item_lanternport_old_record` (pickup flag for the Lanternport map item) — sq_missing_note
- `fern_dye` (key item) — sq_paint_job
- `river_clay` (key item) — sq_paint_job
- `berry_pulp` (key item) — sq_paint_job
- `lumen_moss` (key item) — sq_fireflies
- `old_parcel` (key item) — sq_courier_last_route
- `fort_sign` (key item + prop) — sq_fort_sign
- `packed_lunch` (key item) — sq_stuck_with_me
- `fern_posy` (key item) — sq_flowers_old_hal
- `lucky_crystal` (shop item, cosmetic, no effect) — sq_lucky
- `glass_crystal` (held item, no effect) — sq_lucky
- `thin_twig` (key item) — sq_bottle_44
- `intern_lanyard` (key item) — sq_lost_lanyard
- `field_notebook` (key item) — sq_ask_nicely
- `framed_letter` (item, Field Camp decor) — sq_lumen_chain
- `sea_glass` (key item) — sq_sea_glass
- `mossberries` (key item) — sq_warm_stones
- `arena_ticket_stub` (key item) — sq_ticket_stub

**Props**

- `dance_steps_poster` (prop) — sq_open_mic
- `club_floor_tile_1..4` (props) — sq_open_mic
- `burlbeetle_stump_1..5` (props) — sq_burlbeetle_count
- `burlbeetle_stump_decoy` (prop) — sq_burlbeetle_count
- `harbour_scales` (prop) — sq_first_weigh_in
- `forecast_board` (prop) — sq_forecast

**Flags**

- `sq_bean_thief_start` — sq_bean_thief
- `sq_bean_thief_seen` — sq_bean_thief
- `sq_bean_thief_fed` — sq_bean_thief
- `sq_bean_thief_done` — sq_bean_thief
- `sq_first_five_start` — sq_first_five
- `sq_first_five_met` — sq_first_five
- `sq_first_five_done` — sq_first_five
- `sq_fisher_fly_start` — sq_fisher_fly
- `sq_fisher_fly_got` — sq_fisher_fly
- `sq_fisher_fly_given` — sq_fisher_fly
- `sq_fisher_fly_done` — sq_fisher_fly
- `sq_bin_day_seen` — sq_bin_day
- `sq_bin_day_bag_8` — sq_bin_day
- `sq_bin_monument` — sq_bin_day
- `sq_bin_day_done` — sq_bin_day
- `sq_dana_desk_note` — sq_dana
- `sq_ron_interview_1` — sq_ron_job
- `sq_ron_interview_2` — sq_ron_job
- `sq_kid_flat` — sq_kid_joke
- `sq_kid_form` — sq_kid_joke
- `beat_trainer_r1_a` — sq_fork_regulars
- `beat_trainer_r1_b` — sq_fork_regulars
- `beat_trainer_r1_c` — sq_fork_regulars
- `sq_fork_regulars_done` — sq_fork_regulars
- `sq_over_the_wall_start` — sq_over_the_wall
- `sq_over_the_wall_bloom` — sq_over_the_wall
- `sq_over_the_wall_done` — sq_over_the_wall
- `sq_paint_job_start` — sq_paint_job
- `sq_paint_job_fern` — sq_paint_job
- `sq_paint_job_clay` — sq_paint_job
- `sq_paint_job_berry` — sq_paint_job
- `sq_paint_job_done` — sq_paint_job
- `paint_free_coat` — sq_paint_job
- `sq_counter_start` — sq_tell_the_counter
- `sq_counter_thornwood` — sq_tell_the_counter
- `sq_counter_greystone` — sq_tell_the_counter
- `sq_counter_frostspire` — sq_tell_the_counter
- `sq_counter_mirefen` — sq_tell_the_counter
- `sq_counter_done` — sq_tell_the_counter
- `sq_open_mic_start` — sq_open_mic
- `sq_open_mic_steps` — sq_open_mic
- `sq_open_mic_danced` — sq_open_mic
- `sq_open_mic_done` — sq_open_mic
- `sq_biscuit_start` — sq_biscuit
- `sq_biscuit_found` — sq_biscuit
- `sq_biscuit_freed` — sq_biscuit
- `sq_biscuit_done` — sq_biscuit
- `biscuit_tumbloam` (scripted overworld creature) — sq_biscuit
- `sq_fireflies_start` — sq_fireflies
- `sq_fireflies_scar_1` — sq_fireflies
- `sq_fireflies_scar_2` — sq_fireflies
- `sq_fireflies_scar_3` — sq_fireflies
- `sq_fireflies_done` — sq_fireflies
- `skill_glowcall` (flag, field skill) — sq_fireflies
- `sq_courier_start` — sq_courier_last_route
- `sq_courier_delivered` — sq_courier_last_route
- `sq_courier_done` — sq_courier_last_route
- `sq_fort_sign_start` — sq_fort_sign
- `sq_fort_sign_painted` — sq_fort_sign
- `sq_fort_sign_done` — sq_fort_sign
- `sq_burlbeetle_start` — sq_burlbeetle_count
- `sq_burlbeetle_found_5` — sq_burlbeetle_count
- `sq_burlbeetle_done` — sq_burlbeetle_count
- `sq_lunch_start` — sq_stuck_with_me
- `sq_lunch_got` — sq_stuck_with_me
- `sq_lunch_done` — sq_stuck_with_me
- `sq_sketch_start` — sq_cave_sketch
- `sq_sketch_1` — sq_cave_sketch
- `sq_sketch_2` — sq_cave_sketch
- `sq_sketch_3` — sq_cave_sketch
- `sq_sketch_4` — sq_cave_sketch
- `sq_sketch_done` — sq_cave_sketch
- `sq_hal_start` — sq_flowers_old_hal
- `sq_hal_laid` — sq_flowers_old_hal
- `sq_hal_done` — sq_flowers_old_hal
- `sq_weigh_start` — sq_first_weigh_in
- `sq_weigh_entered` — sq_first_weigh_in
- `sq_weigh_done` — sq_first_weigh_in
- `ribbon_weigh_in` — sq_first_weigh_in
- `sq_bottle_start` — sq_bottle_44
- `sq_bottle_twig` — sq_bottle_44
- `sq_bottle_done` — sq_bottle_44
- `sq_lanyard_start` — sq_lost_lanyard
- `sq_lanyard_found` — sq_lost_lanyard
- `sq_lanyard_done` — sq_lost_lanyard
- `sq_cold_start` — sq_cold_hands
- `sq_cold_tea` — sq_cold_hands
- `sq_cold_done` — sq_cold_hands
- `sq_shine_start` — sq_past_the_shine
- `sq_shine_met` — sq_past_the_shine
- `sq_shine_herded` — sq_past_the_shine
- `sq_shine_done` — sq_past_the_shine
- `croft_open` — sq_past_the_shine
- `sq_nicely_start` — sq_ask_nicely
- `sq_nicely_sat` — sq_ask_nicely
- `sq_nicely_done` — sq_ask_nicely
- `sq_chain_lune` — sq_lumen_chain
- `sq_chain_ivo` — sq_lumen_chain
- `wick_trail_glow` — sq_lumen_chain
- `trade_t6_done / trade_t4_done / trade_t3_done` (SP 8.4) — sq_lumen_chain
- `sq_count_start` — sq_count_day
- `sq_count_spotlight` — sq_count_day
- `sq_count_done` — sq_count_day
- `mirefen_count_unlocked` — sq_count_day
- `sq_glass_start` — sq_sea_glass
- `sq_glass_3` — sq_sea_glass
- `sq_glass_done` — sq_sea_glass
- `sq_forecast_start` — sq_forecast
- `sq_forecast_1..5` (SP 8.5-G) — sq_forecast
- `sq_forecast_done` — sq_forecast
- `app_sky_almanac` — sq_forecast
- `sq_stones_start` — sq_warm_stones
- `sq_stones_berries` — sq_warm_stones
- `sq_stones_done` — sq_warm_stones
- `sq_stub_start` — sq_ticket_stub
- `sq_stub_got` — sq_ticket_stub
- `sq_stub_done` — sq_ticket_stub

## Open questions for Gary

1. **Ron's bins and `ron_in_party`.** The brief tied the bins gag to `ron_in_party`. In the rulings, `ron_in_party` drives Ron's one-time dance at The Firefly, and the bins run on coin counts (bag per coin, E5 Monument, "Told you. Tomorrow." after the finale). The draft follows the rulings. Should Ron also comment on the bin when he's travelling with you?
2. **Three "Biscuit"s.** The lost-flyer Tumbloam at The Firefly, the T5 trade Tumbloam (Prue Hollin), and Ron's nickname line. The draft makes the first two the same creature (`sq_biscuit`: Prue posted the flyer and later trades Biscuit to you). Keep that, or rename one?
3. **Kid's Last Joke household.** SOUL 8.5-E points to `parent_c` / `house_int_c` (Fernwick warp 22,6), which is now `home_fernwick_a` (`home_fernwick_a_parent`). So a Brookhollow kid has a parent in Fernwick, and his own line says "mom" while 8.5-E says "Dad". Keep, or move the parent?
4. **Dana's Greystone initials.** 8.5-B puts "scratched initials at a camp". That could hint she was with the field team, but she isn't one of the four. The draft keeps it vague ("D. was here. Briefly."). Cut it?
5. **Glowcall** is a field skill with its unlock TBD (FIELD_SKILLS.md). The third firefly scar (one more Greystone spot) is World Design's pick.
6. **Lumen Chain stone.** Which Lantern Rest stone Wick brightens at. And trader **Lune Ashby** shares a surname with field-team member **Pell Ashby**: intended, or rename?
7. **`sq_ask_nicely` vs main.** The Mirefen field notebook (club note tier at `beat_master_frostspire`) may be part of the main worker's Mirefen camp beat. Merge, or keep as side?
8. **`sq_ron_job` step 4** sits right after the main-story layoff letter. Main worker to merge or drop.
9. **Zone order numbers** are guesses (10, 20, ... by play order); `quests_draft.json` didn't exist at writing time. Re-key `order` when the main draft lands. They match the play order in `design/overnight_gd/INDEX.md`, except that Aurelith comes last here because its quest needs `all_badges`.
10. **Thin zones.** Tidewater Coast, Cindervale and Frostspire have no canon NPCs, so each got one placeholder quest with a new NPC (`sq_sea_glass`, `sq_warm_stones`, `sq_cold_hands`). Keep, cut, or replace?
11. **Trainer-defeat flags** don't exist. `beat_trainer_r1_a/b/c` are proposed; swap to Coder's pattern if one appears.
12. Side note from a source read (not this worker's area): the overnight GD draft names the Lanternport Master "Isolde Vane". House rule says Vane is referred to by catalogue number. Possible name clash for Story Bot to check.

## Missing from sources (at writing time)

- `text/drafts/overnight/` does not exist. Only `text/drafts/club_*_v0.x.md` are present. Quest lines here mirror the shipped `text/overworld_lines.json` v0.4.9 instead.
- `design/overnight_quests/quests_draft.json` (main worker) did not exist, so orders and camp beats weren't cross-checked.
- No quest loader or `data/quests.json` exists (per SCHEMA.md).
- Items `firefly_lantern`, `pond_berry_juice`, `mossberry_shake`, `fern_mint_tea` and `firefly_shake` exist in Text Bot's item catalogue (`text/system_lines.py` / `overworld_lines.json`) but not yet in game data (`src/`, `data/`). Treat them as "catalogue ids, Coder to add".
- No NPC canon for Tidewater, Cindervale or Frostspire. No Lanternport map (Missing Note record 4 and the forecasts wait on it).
- SOUL systems used as hooks are unbuilt: weekday clock (1.4), garden plots (1.5), Weigh-In (1.6), meteor night (1.7), Croft (8.3), trade system (8.4), Mirefen Count (1.10), NPC schedules (2.2).

## Rules check

- JSON validated with Python (all keys present, step and line references resolve, no duplicate ids).
- Both files grepped against the SCHEMA.md banned-word list and the house no-alcohol/drugs/smoking terms. Clean: the only hit is the NPC id `rebel_bartender`, which is allowed as an id.
- Every text box is 20 words or fewer.
- Not-canon calls (rebels = the Riverbank Stranger's people, the Vane memo, Vane's motive, the ending) appear only in notes, never in lines.
