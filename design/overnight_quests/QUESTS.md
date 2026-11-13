# Kilumen quests: DRAFT for Gary

**Status: DRAFT. Not signed off, not wired into the game, nothing published or pushed.** Written overnight 2026-10-23 (CT). Data: `quests_draft.json` (format: `SCHEMA.md`). Side-quest source files `side_quests_draft.json` / `SIDE_QUESTS.md` are untouched; Gary's rulings are applied only in the merged copy (`quests_draft.json`).

## Summary

- **16 main quests + 34 side quests = 50.** Main orders are 10, 20, ... 160 in play order. Side quests sort after their zone's main quest (main order + 1..9).
- **Main story:** Brookhollow promotion -> Route 1 / Ron 1 -> coin 1 Fernwick -> the four camps (Thornwood, Greystone, Frostspire, Mirefen), each with one field-log page -> Saltmere parcel / bike -> Revival Heights (Ron's layoff letter, rail pass) -> Frostspire (Skylift, walls dim) -> Sunmeadow crossing -> Mirefen (notebook, Tideglide, storm) -> Tidewater -> Lanternport (Ron shares the last page; tide-lock; horn) -> Cindervale (eight coins) -> finale (Ron's last battle, then he comes with you; HQ restricted floors; the team is found; the bins) -> post-game: welcome back, then the Aurelith arena.
- **The thread:** five log pages (Imke, Teo, Pell, Marta, Teo again) imply that something is off only with the team's own bonded creatures, and that they went to Head Office in person. Nothing says why. Vane's motive, the memo, the rebels and the crystal ending appear in notes only. The confrontation (finale step 6) is left as **PENDING STORY CALL**.
- **Existing lines:** every quest line that reuses a shipped Text Bot line (overworld_lines.json v0.4.9) is word for word and tagged `existing` with its key. A script checked all of them against the file. Untagged lines are new and Text Bot owns the final wording.
- **Gary's rulings 1-8 are applied in the merged copy.** Each changed side quest has a `MERGE (...)` note. Main/side overlaps: the main quest owns the Mirefen notebook, Ron's letter scene and 'Told you. Tomorrow.' sq_ask_nicely, sq_ron_job s4 and sq_bin_day s4 are now follow-ups.
- **Checks run:** the JSON parses, ids are unique, step refs are valid, every text box is 20 words or fewer, and the banned-word / alcohol / smoke / fog / 'badge' grep is clean on titles, steps and lines. The only grep hit is the existing internal npc id `rebel_bartender` (an id, never shown to the player; see Lines for Text Bot #10).

## Quests by zone (play order)

### brookhollow

#### [MAIN 10] Promoted (Apparently) (`mq_brookhollow_promotion`)
- Giver: `manager` @ `office_int` | map: built | needs: -
  s1. Wake from the river dream. Check the bed and laptop if you like. [`house_2f`]
  s2. Talk to Ron downstairs: slow week, layoff rumours. [`house_1f`]
  s3. Walk to the Revival Tech field office. Reception sends you in. [`office_int`]
  s4. The manager promotes you and Ron to field researchers. Field team missing; start in Fernwick. [`office_int`] -> sets `flg_promoted`
  s5. Pick a partner at the Brookhollow lab: Tumbloam, Cindrip or Rillop (level 5). [`lab_brookhollow`] -> sets `got_starter`
  s6. Optional: read the new company emails on the laptop (new_role, greystone_cancelled). [`house_2f`] (if `flg_promoted`)
- Reward: dominance_crystal x5, tonic_small x2; money 0; flags `flg_promoted`, `got_starter`
  - **player_start** (step): "...The river again. Cold water, and someone on the bank, watching. / Just a dream. Probably." *(existing)*
  - **ron** (step): "Morning. You look like you slept in the river. / Work's been dead all week. They cleared out three desks on Friday. / If layoffs are coming, I hope they wait till I've bought groceries." *(existing)*
  - **manager** (start): "Sit down. Relax, this isn't that conversation. / Our field team stopped reporting in. As of today, you two are field researchers. / Their last check-in was from Greystone Caverns. Start in Fernwick." *(existing)*
  - **lab_lead_varga** (step): "Ines Varga, lab lead. Three partners ready, none of them catalogued yet. / Pick the one that looks back at you. Ron gets whoever's left."
  - **lab_lead_varga** (turn_in): "Good choice. Crystals and remedies are on the house. Just this once. / Fernwick's up Route 1. Bring it back in one piece."
  - **ron** (after): "Field researchers. Us. I still think they mixed us up with someone else. / Fernwick's first. Try to keep up." *(existing)*
  - _Note:_ Design doc plot opening: river dream, Ron, layoff talk, both promoted. All pre-existing lines are mirrored word for word (see 'existing').
  - _Note:_ OPEN: starter order. lab_brookhollow sets got_starter, but no line says whether the starter comes before or after the promotion. Draft puts it after (the company hands field kit to new field staff).
  - _Note:_ OPEN: lab giver id. SOUL_PLAYBOOK names Lab Lead Ines Varga; no npc id exists in lab_brookhollow (no NPCs placed). Proposed id lab_lead_varga. Side quest sq_first_five uses lab_brookhollow_aide: one of them should be the other's assistant.
  - _Note:_ Tutorial flags tut_lab_done / tut_first_battle / tut_first_catch / tut_phone (SOUL_PLAYBOOK) can hang off s5 and Route 1; not duplicated here.
  - _Note:_ Starter reward items are a proposal (no starter kit is defined anywhere).

#### [side 11] The Bean Thief (`sq_bean_thief`)
- Giver: `villager_garden` @ `brookhollow` | map: built | needs: `got_starter`
  s1. Talk to the gardener about the eaten beans. [`brookhollow`] -> sets `sq_bean_thief_start`
  s2. Stake out the bean rows at Night and spot the culprit (a Tumbloam). [`brookhollow`] -> sets `sq_bean_thief_seen` (if `phase == Night`)
  s3. Leave Trail Mix at the end of the row so the Tumbloam has its own snack. [`brookhollow`] -> sets `sq_bean_thief_fed` (if `has_item trail_mix`)
  s4. Tell the gardener. [`brookhollow`] -> sets `sq_bean_thief_done`
- Reward: watering_can x1; money 0; flags `sq_bean_thief_done`

#### [side 12] Meet Five (`sq_first_five`)
- Giver: `lab_brookhollow_aide` @ `lab_brookhollow` | map: built | needs: `got_starter`
  s1. Get the aide's tip: meet five different creatures. [`lab_brookhollow`] -> sets `sq_first_five_start`
  s2. Meet five different species (seen, not caught) in the Kilindex. [`route1`] -> sets `sq_first_five_met` (if `kilindex_seen >= 5`)
  s3. Report back to the aide. [`lab_brookhollow`] -> sets `sq_first_five_done`
- Reward: dominance_crystal x3; money 0; flags `sq_first_five_done`

#### [side 13] A Fly for the Fisher (`sq_fisher_fly`)
- Giver: `fisher` @ `brookhollow` | map: built | needs: `flg_promoted`
  s1. Hear the fisher out: the river's too low for his old lures. [`brookhollow`] -> sets `sq_fisher_fly_start`
  s2. Ask the fly-tier in Fernwick for a hand-tied fly. [`home_fernwick_c`] -> sets `sq_fisher_fly_got`
  s3. Bring the fly back to the fisher. [`brookhollow`] -> sets `sq_fisher_fly_given`
  s4. Meet him on the bridge at Dusk to see it work. [`brookhollow`] -> sets `sq_fisher_fly_done` (if `phase == Dusk`)
- Reward: feed_bag x1; money 200; flags `sq_fisher_fly_done`

#### [side 14] Bin Day Is Tomorrow (`sq_bin_day`)
- Giver: `prop:bin_ron` @ `brookhollow` | map: built | needs: `flg_promoted`
  s1. Inspect Ron's bin by the front door. Bin day is 'tomorrow'. [`brookhollow`] -> sets `sq_bin_day_seen`
  s2. After each Master coin one more bag appears (up to 8; flies from bag 6). Text Bot's bin_1..bin_8 lines play; nothing to do. [`brookhollow`] -> sets `sq_bin_day_bag_8` (if `all_badges`)
  s3. Between coin 8 and the finale, inspect the full bin: E5 Bin Monument. 8 more presses and a Mirewump pops out (rare catch). [`brookhollow`] -> sets `sq_bin_monument` (if `all_badges && !finale_done`)
  s3b. While Ron is travelling with you (all_badges to the finale), inspect the bin: Ron has one quip. [`brookhollow`] -> sets `sq_bin_ron_quip` (if `ron_in_party && !finale_done`)
  s4. After the credits: the bin is empty. Inspect it (Text Bot bin_empty). Ron's payoff itself is main (mq_finale s8). [`brookhollow`] -> sets `sq_bin_day_done` (if `bins_taken_out`)
- Reward: -; money 0; flags `sq_bin_day_done`
  - _MERGE (Gary ruling / main overlap): Ruling 1: kept the coin-count version and added one Ron quip while ron_in_party is set (s3b). 'Told you. Tomorrow.' moved to main mq_finale s8 (main owns it); s4 is now the after-credits empty bin._

#### [side 15] Dana's Desk (`sq_dana`)
- Giver: `prop:dana_desk` @ `office_int` | map: map pending | needs: `flg_promoted`
  s1. Check Dana's cleared desk: a second sticky note in odd shorthand. [`office_int`] -> sets `sq_dana_desk_note`
  s2. Find Dana's unsent drafts in the company inbox (secret E3); they decode the shorthand. [`house_2f`] -> sets `sq_dana_note`
  s4. Post-game: find Dana on Frostspire and battle her. [`frostspire`] -> sets `sq_dana_met` (if `finale_done`)
- Reward: dana_team_card x1; money 0; flags `sq_dana_met`
  - _MERGE (Gary ruling / main overlap): Ruling 4: step s3 (initials near the Greystone camp), its line and its note are cut. Dana has no link to the field team's camps._

#### [side 16] Ron's Other Job (`sq_ron_job`)
- Giver: `ron` @ `house_1f` | map: map pending | needs: `beat_master_saltmere`
  s1. Read Ron's CV on the house_1f table. [`house_1f`] -> sets `sq_ron_cv`
  s2. Ron mentions an interview at the Lumen Line (gag). [`station_int`] -> sets `sq_ron_interview_1` (if `ron_in_party`)
  s3. Ron mentions an interview at a Saltmere fishmonger (gag). [`saltmere`] -> sets `sq_ron_interview_2` (if `ron_in_party`)
  s4. Right after the layoff letter (main mq_revival_heights s4), if you talk to Ron again before the Master, he says one quiet line. [`revival_hq_int`] -> sets `sq_ron_letter` (if `ron_layoff_letter`)
  s5. Post-game: Nan Wexley hires Ron part-time at the Croft. [`sunmeadow_croft`] -> sets `sq_ron_croft` (if `finale_done`)
- Reward: ron_croft_apron x1; money 0; flags `sq_ron_croft`
  - _MERGE (Gary ruling / main overlap): Main owns the letter scene (mq_revival_heights s4, which already has 'It's fine. It's just a letter.'). s4 is now a follow-up keyed to ron_layoff_letter, and only the second sentence stays so the line isn't said twice._

#### [side 17] The Kid's Last Joke (`sq_kid_joke`)
- Giver: `kid` @ `brookhollow` | map: map pending | needs: `beat_master_revival`
  s1. The kid's joke falls flat. His dad stopped laughing. [`brookhollow`] -> sets `sq_kid_flat`
  s2. Visit the kid's dad at home in Brookhollow. He's reading job ads. [`brookhollow_kid_home`] -> sets `sq_kid_ads`
  s3. Take a 'We're hiring Care Associates!' form from a heal-centre suggestion box. [`heal_brookhollow`] -> sets `sq_kid_form`
  s4. Give the form to the kid's dad. [`brookhollow_kid_home`] -> sets `sq_kid_done`
- Reward: calm_tea x1; money 0; flags `sq_kid_done`
  - _MERGE (Gary ruling / main overlap): Ruling 3: parent moved to a Brookhollow home, npc brookhollow_kid_dad; the kid says 'Dad'. Existing kid lines say 'My mom says': listed for Text Bot to align. The later Care Associate swap (8.5-E) now applies to brookhollow_kid_dad at the Brookhollow heal centre._

#### [MAIN 150] There Will Be Cake (`mq_welcome_back`)
- Giver: `manager` @ `office_int` | map: built | needs: `finale_done`
  s1. Read the reopening email: the Brookhollow office opens Monday. [`house_2f`] (if `finale_done`)
  s2. Go to the office. The field team is back at their desks. [`office_int`] -> sets `field_team_home`
  s3. Optional: the Firefly banner, the Lantern Rest blank stone and the Friday cake. [`fernwick`]
- Reward: firefly_shake x1; money 1000; flags `field_team_home`
  - **manager** (start): "Sit down. Relax, this one really isn't that conversation. / Four desks. Four chairs. All full. I counted twice."
  - **ft_teo** (turn_in): "Item one: thank you. There's no item two. / ...Fine. Item two: cake's Friday."
  - **ron** (after): "Bin day was yesterday. I was there. I'm a changed man, {nick}."
  - _Note:_ field_team_home is the existing flag that switches on: the cake_welcome email, the Firefly 'FOUND. ALL FOUR.' banner, the Lantern Rest keeper's 'Didn't need it' line, the coworker and sq_tell_the_counter follow-ups. This quest only gives those a single trigger.
  - _Note:_ Dana stays gone. She only appears in the post-game Frostspire fight (side sq_dana).
  - _Note:_ Reward is a proposal.

### route1

#### [MAIN 20] The Benchmark (`mq_route1_benchmark`)
- Giver: `ron_rival_1` @ `fernwick` | map: built | needs: `flg_promoted`, `got_starter`
  s1. Head north up Route 1. Three trainers on the trail (optional; see sq_fork_regulars). [`route1`]
  s2. Squeeze through the forced grass under Fernwick. [`route1`]
  s3. Ron is waiting in Fernwick. Battle him (Ron 1). [`fernwick`] -> sets `beat_rival_ron_1`
  s4. Ron hands over the Trail Runners. [`fernwick`] -> sets `has_run_shoes`
- Reward: trail_runners x1; money 0; flags `beat_rival_ron_1`, `has_run_shoes`
  - **ron_rival_1** (start): "There you are, {nick}. Bin day's tomorrow. It's fine. / The company says we're each other's benchmark. Let's see where you're at." *(existing)*
  - **ron_rival_1** (step): "Don't sweat it. I'll go easy next time. Probably." *(existing)*
  - **ron_rival_1** (turn_in): "Here. Company Trail Runners. They gave me two pairs. / Don't ask why. I didn't ask why."
  - **ron_rival_1** (after): "The Master's Hall is on the east side. I'm getting a sandwich first." *(existing)*
  - _Note:_ CRITICAL_PATH: has_run_shoes comes from beat_rival_ron_1. The handover line (s4) is new; Text Bot owns Ron's voice, so it is listed under 'Lines for Text Bot to align'.
  - _Note:_ Ron is cocky here (Ron arc: Fernwick). He never loses gracefully yet.
  - _Note:_ OPEN: the design doc lets the player pick 'work together' or 'friendly rivals' with Ron. No flag exists for that choice; this draft assumes rivals (the intended game).

#### [side 21] Fork Road Regulars (`sq_fork_regulars`)
- Giver: `trainer_r1_b` @ `route1` | map: built | needs: `got_starter`
  s1. Beat trainer_r1_b; she dares you to beat the other two Route 1 trainers. [`route1`] -> sets `beat_trainer_r1_b`
  s2. Beat trainer_r1_a. [`route1`] -> sets `beat_trainer_r1_a`
  s3. Beat trainer_r1_c. [`route1`] -> sets `beat_trainer_r1_c`
  s4. Go back and gloat. [`route1`] -> sets `sq_fork_regulars_done`
- Reward: trail_mix x2, tonic_small x1; money 300; flags `sq_fork_regulars_done`

#### [side 22] Over the Wall (`sq_over_the_wall`)
- Giver: `trainer_r1_c` @ `route1` | map: map pending | needs: `got_starter`
  s1. trainer_r1_c wonders what's past the Sunmeadow shine. [`route1`] -> sets `sq_over_the_wall_start`
  s2. Once the barrier dims, pick a bloom in Sunmeadow Fields. [`sunmeadow_fields`] -> sets `sq_over_the_wall_bloom` (if `beat_master_frostspire`)
  s3. Bring it back to trainer_r1_c. [`route1`] -> sets `sq_over_the_wall_done`
- Reward: energy_tonic x1; money 0; flags `sq_over_the_wall_done`

### fernwick

#### [MAIN 30] Stand Your Ground (`mq_fernwick_hall`)
- Giver: `guide` @ `fernwick_hall_int` | map: built | needs: `has_run_shoes`
  s1. Enter the Master's Hall on the east side of Fernwick. [`fernwick_hall_int`]
  s2. Step on both corner plates to open the first gate. [`fernwick_hall_int`]
  s3. Light all three crystals at once (each touch flips its neighbours). [`fernwick_hall_int`] -> sets `puzzle_fernwick_hall_solved`
  s4. Beat the two hall helpers (optional order). [`fernwick_hall_int`]
  s5. Battle the Master of Fernwick (Earth). [`fernwick_hall_int`] -> sets `beat_master_fernwick`
  s6. Report the coin at the office. The manager points you at Greystone. [`office_int`] (if `beat_master_fernwick`)
- Reward: tonic_large x1; money 0; flags `beat_master_fernwick`
  - **guide** (start): "Two plates, one in each corner. Step on both and the first gate opens. / Past that, the crystals. Each one you touch flips its neighbours. / The middle one starts lit. Leave it alone at first." *(existing)*
  - **master_fernwick** (in_progress): "Earth doesn't hurry, and neither do I. You took your time getting here. / Let's see if your team can stand its ground." *(existing)*
  - **master_fernwick** (turn_in): "That coin registers you as a trainer. Brookhollow's east road is open to you. / Looking for your missing crew? Miners heard voices down in Greystone." *(existing)*
  - **manager** (after): "A coin already. Good. Keep the reports coming. / And keep looking for the field team. Greystone first." *(existing)*
  - _Note:_ Coin 1. Opens gate_brookhollow_east (rt_guard_east hands over the survey_parcel; see mq_saltmere_parcel) and activates both camps (Thornwood, Greystone) plus the Firefly notes note_thornwood / note_greystone.
  - _Note:_ Reward item is a proposal; the GD draft (design/overnight_gd/halls/fernwick.json) has its own coin reward, use that if it differs.
  - _Note:_ GD draft suggests 'Oswin Marl' and 'Loam Coin'. Not used in lines (player text says 'coin').

#### [side 31] The Missing Note (`sq_missing_note`)
- Giver: `rebel_dj` @ `club_int` | map: map pending | needs: -
  s1. Talk to the DJ at The Firefly (Dusk or Night). Four old records are missing. [`club_int`] -> sets `flg_missing_note_started` (if `phase in (Dusk, Night)`)
  s2. Find an Old Record in Fernwick. [`fernwick`] -> sets `item_fernwick_old_record`
  s3. Find an Old Record in Thornwood. [`thornwood`] -> sets `item_thornwood_old_record`
  s4. Find an Old Record on Route 1. [`route1`] -> sets `item_route1_old_record`
  s5. Find the last Old Record in Lanternport (map pending). [`lanternport`] -> sets `item_lanternport_old_record` (if `beat_master_tidewater`)
  s6. Bring all four back to the DJ. [`club_int`] -> sets `flg_missing_note_done` (if `flg_record_4 && phase in (Dusk, Night)`)
- Reward: firefly_lantern x1; money 0; flags `flg_missing_note_done`

#### [side 32] Mixing Colours (`sq_paint_job`)
- Giver: `rebel_paint_vendor` @ `club_int` | map: built | needs: -
  s1. The paint vendor has run out of greens, browns and reds. [`club_int`] -> sets `sq_paint_job_start` (if `phase in (Dusk, Night)`)
  s2. Pick fern dye leaves in Thornwood. [`thornwood`] -> sets `sq_paint_job_fern`
  s3. Dig river clay from the Brookhollow riverbank. [`brookhollow`] -> sets `sq_paint_job_clay`
  s4. Ask the juice counter for leftover berry pulp. [`club_int`] -> sets `sq_paint_job_berry`
  s5. Bring all three to the paint vendor. [`club_int`] -> sets `sq_paint_job_done` (if `phase in (Dusk, Night)`)
- Reward: -; money 0; flags `sq_paint_job_done`, `paint_free_coat`

#### [side 33] Ticks on the Flyer (`sq_tell_the_counter`)
- Giver: `rebel_bartender` @ `club_int` | map: built | needs: `beat_master_fernwick`
  s1. Read the MISSING flyer and its pinned notes at The Firefly. [`club_int`] -> sets `sq_counter_start`
  s2. Thornwood camp restored: tell the juice counter. [`club_int`] -> sets `sq_counter_thornwood` (if `camp_restored_thornwood`)
  s3. Greystone camp restored: tell the juice counter. [`club_int`] -> sets `sq_counter_greystone` (if `camp_restored_greystone`)
  s4. Frostspire camp restored: tell the juice counter. [`club_int`] -> sets `sq_counter_frostspire` (if `camp_restored_frostspire`)
  s5. Mirefen camp restored: tell the juice counter. [`club_int`] -> sets `sq_counter_mirefen` (if `camp_restored_mirefen`)
  s6. After the team is home, come back to The Firefly. [`club_int`] -> sets `sq_counter_done` (if `field_team_home`)
- Reward: pond_berry_juice x1, mossberry_shake x1, fern_mint_tea x1, firefly_shake x1; money 0; flags `sq_counter_done`
  - _MERGE (Gary ruling / main overlap): Checked against main: it only reacts to camp_restored_* and field_team_home, which main now sets (mq_thornwood_camp, mq_greystone_camp, mq_frostspire, mq_mirefen, mq_welcome_back). No change._

#### [side 34] Dance of the Firefly (`sq_open_mic`)
- Giver: `rebel_patron_3` @ `club_int` | map: built | needs: -
  s1. Patron_3 signed up for open mic with a dance they don't know. [`club_int`] -> sets `sq_open_mic_start` (if `phase == Night`)
  s2. Read the dance steps poster in the back room. [`club_int`] -> sets `sq_open_mic_steps`
  s3. Step on the dance-floor tiles in order: left, left, back, spin. [`club_int`] -> sets `sq_open_mic_danced` (if `phase == Night`)
  s4. Tell patron_3. [`club_int`] -> sets `sq_open_mic_done`
- Reward: firefly_shake x1; money 0; flags `sq_open_mic_done`

#### [side 35] Answers to Biscuit (`sq_biscuit`)
- Giver: `prop:flyer_lost_creature` @ `club_int` | map: built | needs: `flg_promoted`
  s1. Read the LOST flyer at The Firefly: a Tumbloam called Biscuit. [`club_int`] -> sets `sq_biscuit_start`
  s2. Find Biscuit stuck below the Route 1 ledges. [`route1`] -> sets `sq_biscuit_found`
  s3. Go the long way around and come at Biscuit from above so it rolls toward the exit. [`route1`] -> sets `sq_biscuit_freed`
  s4. Bring the news to the owner. [`fernwick`] -> sets `sq_biscuit_done`
- Reward: feed_bag_small x2; money 300; flags `sq_biscuit_done`
  - _MERGE (Gary ruling / main overlap): Ruling 2: the lost-flyer Tumbloam and the T5 trade Tumbloam are the SAME creature (Prue Hollin). Ron's nickname for the player's unnamed lead (house_1f.ron ron_unnamed) changes to 'Crumb', so the two Biscuits don't collide. Text Bot's house_1f.ron ron_unnamed line ('I'm calling it Biscuit') must be aligned (see QUESTS.md)._

#### [side 36] Where the Fireflies Went (`sq_fireflies`)
- Giver: `elder` @ `fernwick` | map: built | needs: `has_survey_parcel`
  s1. At Night, count the fireflies at the pond for the elder. Only 3 left. [`fernwick`] -> sets `sq_fireflies_start` (if `phase == Night`)
  s2. Plant lumen moss in the Thornwood scar. [`thornwood`] -> sets `sq_fireflies_scar_1`
  s3. Plant lumen moss in the Greystone entrance scar. [`greystone_entrance`] -> sets `sq_fireflies_scar_2`
  s4. Plant lumen moss in one more Greystone dig scar (spot TBD by World Design). [`greystone_b1`] -> sets `sq_fireflies_scar_3`
  s5. Count again at the pond at Night: 12 fireflies. [`fernwick`] -> sets `sq_fireflies_done` (if `phase == Night`)
- Reward: -; money 0; flags `sq_fireflies_done`, `skill_glowcall`

#### [side 37] The Last Parcel (`sq_courier_last_route`)
- Giver: `villager_f1` @ `fernwick` | map: built | needs: `flg_promoted`
  s1. The ex-courier still has one parcel he never delivered. [`fernwick`] -> sets `sq_courier_start`
  s2. Deliver it to the house with the kettle in Brookhollow. [`home_brookhollow_a`] -> sets `sq_courier_delivered`
  s3. Tell the ex-courier. [`fernwick`] -> sets `sq_courier_done`
- Reward: tonic_small x2; money 0; flags `sq_courier_done`

#### [side 38] KEEP OUT (please) (`sq_fort_sign`)
- Giver: `home_lanternport_c_kid` @ `home_lanternport_c` | map: built | needs: -
  s1. The kid wants a scary sign for the fort. [`home_lanternport_c`] -> sets `sq_fort_sign_start`
  s2. Ask the painter at The Firefly (Dusk or Night). [`club_int`] -> sets `sq_fort_sign_painted` (if `phase in (Dusk, Night)`)
  s3. Bring the sign to the kid. [`home_lanternport_c`] -> sets `sq_fort_sign_done`
- Reward: trail_mix x1; money 0; flags `sq_fort_sign_done`

### thornwood

#### [MAIN 40] Ferns Over the Tent (`mq_thornwood_camp`)
- Giver: `prop:camp_thornwood` @ `thornwood` | map: built | needs: `beat_master_fernwick`
  s1. Take the Thornwood trail east of Fernwick. The dissident at (23,7) has words for your company ID. [`thornwood`]
  s2. Find the empty tent under the ferns. [`thornwood`]
  s3. Clear the camp and light the stove. [`thornwood`] -> sets `camp_restored_thornwood`
  s4. Read the field log page tucked in the tent. [`thornwood`] -> sets `read_log_thornwood`
  s5. Rest at the stove with your team (first Warmth rest). [`thornwood`] (if `camp_restored_thornwood`)
- Reward: trail_mix x2; money 0; flags `camp_restored_thornwood`, `read_log_thornwood`, `read_drift_log`
  - **dissident_hint** (step): "Revival Tech ID on your belt. Of course. / Ask your bosses what happens to the creatures they 'catalogue'. / Then ask why nobody comes back. The caves are right there." *(existing)*
  - **prop:camp_thornwood** (in_progress): "An empty tent, ferns grown right over it. / Nobody's slept here in a long while." *(existing)*
  - **prop:camp_thornwood** (step): "You pull the ferns off the tent and sweep out the leaves. / The stove catches on the second try." *(existing)*
  - **prop:log_thornwood** (step): "A field log page, damp at the edges. Signed 'I.S.' / 'Night two. Teo made a list of his lists. I hummed till he gave up.' / 'My partner's crystal looks less violet by the fire. Probably just the light.'"
  - **prop:camp_thornwood** (after): "Your camp now. Stove's warm, tent's dry. / A good spot to sit a while with your team." *(existing)*
  - _Note:_ Camp restore text is Text Bot's (Story Bot tone check 10:08 PM CT); mirrored word for word. This quest only adds the log page (SOUL_PLAYBOOK 1.9: each camp holds that member's log page) and the rest hook.
  - _Note:_ PROPOSAL (not canon): camp owners. Thornwood = Imke Sorrel (youngest, hums), Greystone = Teo Brack (lead, lists), Frostspire = Pell Ashby, Mirefen = Marta Quill. Text Bot noted no document ties a member to a camp. Gary to confirm before any initials ship.
  - _Note:_ read_drift_log: SOUL_PLAYBOOK's flag for the first tint-drift log page (jingle swap + recalibration option). This is the first page a player can find. The line only implies drift ('less violet by the fire'); it never says why.
  - _Note:_ The Firefly note_thornwood ticks on the same flag (Text Bot). sq_tell_the_counter step 2 is the follow-up.

#### [side 41] Stumps That Blink (`sq_burlbeetle_count`)
- Giver: `trainer_tw_bug` @ `thornwood` | map: built | needs: `beat_master_fernwick`
  s1. The bug catcher can't tell Burlbeetles from stumps. [`thornwood`] -> sets `sq_burlbeetle_start`
  s2. Find the five stumps that blink. [`thornwood`] -> sets `sq_burlbeetle_found_5` (if `burlbeetle_stump_1..5 all checked`)
  s3. Report the count. [`thornwood`] -> sets `sq_burlbeetle_done`
- Reward: vigor_seed x1; money 0; flags `sq_burlbeetle_done`

#### [side 42] Lunch on the Trail (`sq_stuck_with_me`)
- Giver: `trainer_tw_b` @ `thornwood` | map: built | needs: `beat_master_fernwick`
  s1. The hiker by the blocked east trail is hungry. [`thornwood`] -> sets `sq_lunch_start`
  s2. Get a packed lunch from the juice counter at The Firefly. [`club_int`] -> sets `sq_lunch_got`
  s3. Bring it back. [`thornwood`] -> sets `sq_lunch_done`
- Reward: energy_tonic x1; money 0; flags `sq_lunch_done`

### greystone_caverns

#### [MAIN 50] Greystone First (`mq_greystone_camp`)
- Giver: `hiker` @ `greystone_entrance` | map: built | needs: `beat_master_fernwick`
  s1. Enter Greystone Caverns from Thornwood's north path. Talk to the hiker. [`greystone_entrance`]
  s2. Go down to B1. Push the boulder onto the hold plate to open the north gate. [`greystone_b1`]
  s3. Find the cold camp stove in the far north of B1. [`greystone_b1`]
  s4. Clear the camp and light the stove. [`greystone_b1`] -> sets `camp_restored_greystone`
  s5. Read the field log page under the bedroll. [`greystone_b1`] -> sets `read_log_greystone`
  s6. Optional: the tally marks scratched into the crystal by the west wall (E7). [`greystone_b1`] -> sets `tally_marks_seen`
  s7. File a field report at any company terminal. Read the reply. [`heal_centre_int`] -> sets `mq_greystone_reported` (if `camp_restored_greystone`)
- Reward: energy_tonic x1, feed_bag x1; money 500; flags `camp_restored_greystone`, `read_log_greystone`, `mq_greystone_reported`
  - **hiker** (start): "Those ferns glow when something walks through. Doesn't mean it's friendly. / A crew in Revival Tech jackets went down those stairs. Never saw them come up." *(existing)*
  - **hiker_b1** (step): "That plate hums when something heavy sits on it. / Standing on it yourself won't do it. You have to leave something there. / Line the boulder up before you push. It resets if you leave the floor." *(existing)*
  - **prop:camp_greystone** (step): "You shake out the bedroll and brush off the dust. / The stove takes a few tries, then catches." *(existing)*
  - **prop:log_greystone** (step): "A list in tidy capitals, signed 'T.B.' / 'CHECK-IN, DAY 9. 1. Seam found. 2. Samples bagged. 3. Readings odd again.' / '4. Odd only on our own four. 5. Ask Head Office. In person.'"
  - **prop:tally_crystal** (step): "Tally marks scratched into the crystal. Twenty-three of them. / Four sets of initials underneath. One of them is just a doodle of a fern."
  - **company_terminal** (turn_in): "Report received. Thank you for your diligence. / The Greystone check-in was cancelled by the organiser. No further action is needed."
  - **prop:camp_greystone** (after): "Your camp now. Warm, for a cave. / A good spot to sit a while with your team." *(existing)*
  - _Note:_ Follows the manager's 'Greystone first'. Camp text is Text Bot's, mirrored word for word. The crystal case in the far room (b1_item, dominance_crystal_plus) stays a normal pickup.
  - _Note:_ Teo's list implies the field team's finding (odd readings only on their own bonded creatures) without saying it. 'Head Office. In person.' sets up the finale. Not canon until Gary approves the finale shape.
  - _Note:_ E7 Tally Marks (SOUL_PLAYBOOK): 23 days, initials. Initials are not spelled out in the line, so the camp-owner mapping stays open. Per Gary's ruling, Dana's initials are cut from the Greystone camp (sq_dana step 3 removed).
  - _Note:_ The terminal reply reuses the wording of the existing greystone_cancelled email ('cancelled by the organiser') so the two agree.
  - _Note:_ OPEN: GD draft re-bands Greystone wild levels to 12-18 because it's open right after coin 1 (design/overnight_gd/INDEX.md). This quest assumes it is.

#### [side 51] Honest Map (`sq_cave_sketch`)
- Giver: `hiker` @ `greystone_entrance` | map: built | needs: `has_survey_parcel`
  s1. The hiker is sketching the caves and hates dead ends. [`greystone_entrance`] -> sets `sq_sketch_start`
  s2. Check the west dead end. [`greystone_entrance`] -> sets `sq_sketch_1`
  s3. Check the south-west dead end. [`greystone_entrance`] -> sets `sq_sketch_2`
  s4. Check the north dead end on B1. [`greystone_b1`] -> sets `sq_sketch_3`
  s5. Check the east dead end on B1. [`greystone_b1`] -> sets `sq_sketch_4`
  s6. Report back. [`greystone_entrance`] -> sets `sq_sketch_done`
- Reward: crystal_dust x2; money 500; flags `sq_sketch_done`

#### [side 52] Ferns for Old Hal (`sq_flowers_old_hal`)
- Giver: `elder` @ `fernwick` | map: built | needs: `has_survey_parcel`
  s1. The Fernwick elder asks you to take ferns to Old Hal's stone. [`fernwick`] -> sets `sq_hal_start`
  s2. Lay the ferns at Old Hal's stone in the Lantern Rest. [`lantern_rest`] -> sets `sq_hal_laid`
  s3. Tell the elder. [`fernwick`] -> sets `sq_hal_done`
- Reward: trail_mix x2; money 0; flags `sq_hal_done`

### saltmere

#### [MAIN 60] Signed For (`mq_saltmere_parcel`)
- Giver: `rt_guard_east` @ `brookhollow` | map: map pending | needs: `beat_master_fernwick`
  s1. Show the coin at the east road. The guard hands you a survey parcel for Saltmere. [`brookhollow`] -> sets `has_survey_parcel`
  s2. Take the east road to Aurelith (pass through; the arena is sealed), then south to Saltmere. [`route_brookhollow_aurelith`]
  s3. Deliver the parcel to the Saltmere office clerk. She lends you a Courier Bike. [`saltmere_office_int`] -> sets `has_bike`
  s4. Ron is outside the office, sore about your ID level. Battle him (Ron 2). [`saltmere`] -> sets `beat_rival_ron_2`
  s5. Beat the Master of Saltmere. [`saltmere_hall_int`] -> sets `beat_master_saltmere`
- Reward: courier_bike x1, coin_pouch_small x1; money 0; flags `has_survey_parcel`, `has_bike`, `beat_master_saltmere`
  - **rt_guard_east** (start): "You're registered now. Road east is open. Mind the bridge, it creaks. / Heading east? Drop this parcel at the Saltmere office. They'll pay you back." *(existing)*
  - **rt_guard_east** (in_progress): "Saltmere's past Aurelith. The parcel's not getting any lighter." *(existing)*
  - **saltmere_office_clerk** (turn_in): "Survey parcel, signed for. They said it'd be a week. It's been a season. / Take the Courier Bike. The boardwalks here are bikes only."
  - **ron** (step): "Your ID says 'Field Researcher II'. Mine says 'Field Researcher'. / No numeral. Just vibes. Let's fix that, {nick}."
  - **ron** (step): "One bag by the bin now. It's fine, {nick}. / Tomorrow." *(existing)*
  - _Note:_ CRITICAL_PATH: has_survey_parcel (rt_guard_east) -> saltmere_office_clerk -> courier_bike / has_bike -> coin 2.
  - _Note:_ 'They'll pay you back' (guard line): coin_pouch_small is the payback. Proposal.
  - _Note:_ Ron's ID-level jealousy (Ron arc: Saltmere) is new text; listed for Text Bot. The bin opener is Text Bot's.
  - _Note:_ OPEN: GD draft suggests Master 'Nerys Bryde' (water). Lines here say only 'the Master'.
  - _Note:_ Map pending: saltmere, saltmere_office_int, saltmere_hall_int, route_brookhollow_aurelith, aurelith.

#### [side 61] The Lucky-Crystal Seller (`sq_lucky`)
- Giver: `lucky_crystal_seller` @ `saltmere` | map: map pending | needs: `beat_master_fernwick`
  s1. Buy a lucky crystal from the seller in any city (1 of 4). [`saltmere`] -> sets `sq_lucky_1`
  s2. Buy another in a different city (2 of 4). [`revival_heights`] -> sets `sq_lucky_2`
  s3. Buy another in a different city (3 of 4). [`lanternport`] -> sets `sq_lucky_3`
  s4. Buy another in a different city (4 of 4). A compliance memo lands in your inbox. [`cindervale`] -> sets `sq_lucky_4`
  s5. After the ending, visit the seller, who has finally gone honest. [`aurelith`] -> sets `sq_lucky_done` (if `sq_lucky_4 && finale_done`)
- Reward: glass_crystal x1; money 0; flags `sq_lucky_done`

#### [side 62] Thursday Weigh-In (`sq_first_weigh_in`)
- Giver: `weigh_in_host` @ `saltmere` | map: map pending | needs: `beat_master_fernwick`
  s1. Meet the harbour weigh-in host (any day). [`saltmere`] -> sets `sq_weigh_start`
  s2. On a Thursday, enter a creature of the featured species. [`saltmere`] -> sets `sq_weigh_entered` (if `weekday == thu`)
  s3. Beat the record holder on the board (heaviest OR lightest). [`saltmere`] -> sets `sq_weigh_done`
- Reward: -; money 0; flags `sq_weigh_done`, `ribbon_weigh_in`

#### [side 63] Attempt Forty-Four (`sq_bottle_44`)
- Giver: `home_saltmere_a_hobbyist` @ `home_saltmere_a` | map: built | needs: `beat_master_fernwick`
  s1. The ship-in-a-bottle builder snapped another mast. [`home_saltmere_a`] -> sets `sq_bottle_start`
  s2. Find a thin, straight twig in Thornwood's glade. [`thornwood`] -> sets `sq_bottle_twig`
  s3. Bring it back. [`home_saltmere_a`] -> sets `sq_bottle_done`
- Reward: coin_pouch_small x1; money 0; flags `sq_bottle_done`

### revival_heights

#### [MAIN 70] Head Office (`mq_revival_heights`)
- Giver: `sign:gate_thornwood_east` @ `thornwood` | map: map pending | needs: `beat_master_saltmere`
  s1. With two coins, the fallen trunk on the Thornwood trail is cleared. [`thornwood`] -> sets `gate_thornwood_east_cleared`
  s2. Follow the trail to Revival Heights (field staff use the long way round). [`route_thornwood_revival`]
  s3. Ron catches up at the HQ plaza. Battle him (Ron 3). [`revival_heights`] -> sets `beat_rival_ron_3`
  s4. Inside HQ reception, Ron opens a letter. Stay with him. [`revival_hq_int`] -> sets `ron_layoff_letter`
  s5. Beat the Master of Revival Heights. [`revival_hall_int`] -> sets `beat_master_revival`
  s6. The south gate guard opens the shortcut to Saltmere. [`revival_heights`] -> sets `gate_revival_checkpoint_open` (if `beat_master_revival`)
  s7. Collect the Lumen Line rail pass at Central station. [`revival_station_int`] -> sets `has_rail_pass` (if `beat_master_revival`)
- Reward: tonic_large x2; money 0; flags `ron_layoff_letter`, `beat_master_revival`, `has_rail_pass`
  - **sign:gate_thornwood_east** (after): "Only sawdust is left where the trunk was. / Someone carved 'FINALLY' into the stump." *(existing)*
  - **ron** (step): "Two bags. Maybe three. Doesn't matter. / Bin day's tomorrow. Let's go, {nick}." *(existing)*
  - **hq_receptionist** (step): "Post for Ron? Hand delivered. Head Office likes paper."
  - **ron** (step): "... / It's fine. It's just a letter. / Go on, {nick}. The Master's waiting. I'll catch up."
  - **gate_revival_checkpoint** (turn_in): "You beat the Heights Master? Fine. I'll open it from this side. / Saltmere's straight down the hill. Saves you the long way." *(existing)*
  - **station_clerk_central** (turn_in): "Lumen Line pass, field grade. Every station that has one. / Skylift won't take you into the rail-only cities. Trains will."
  - _Note:_ Ron arc beat (Revival Heights): the layoff letter. STORY_RULINGS_SOUL #4: Ron's music turns minor only here. The scene is main-story owned; sq_ron_job step 4 now follows it (condition ron_layoff_letter).
  - _Note:_ The letter's contents are never shown. Ron keeps travelling and battling anyway (he says why at Lanternport).
  - _Note:_ Ron has no surname in any source; the receptionist just says 'Post for Ron?'
  - _Note:_ OPEN: Director Hollis Vane cameo at HQ reception. His only existing line is '{rt_number}'; all his lines are pending a story call, so no cameo is written.
  - _Note:_ Hooks that land around here (Text Bot emails): tint_drift ('Drift is a defect. Please don't get attached to it.') and tower_floors (floors 9-12 senior only). Both pay off in mq_finale.
  - _Note:_ No Lumen Line Pass item id exists (has_rail_pass flag only). Proposed key item id rail_pass.
  - _Note:_ GD draft suggests 'Cassia Lume' (light). Not used in lines.
  - _Note:_ Map pending: route_thornwood_revival, revival_heights, revival_hq_int, revival_hall_int, revival_station_int.

#### [side 71] No Lanyard, No Lift (`sq_lost_lanyard`)
- Giver: `rh_intern` @ `revival_heights` | map: map pending | needs: `beat_master_saltmere`
  s1. A Revival Tech intern has lost their lanyard. [`revival_heights`] -> sets `sq_lanyard_start`
  s2. Look under the benches at the Lumen Line station. [`station_int`] -> sets `sq_lanyard_found`
  s3. Return it. [`revival_heights`] -> sets `sq_lanyard_done`
- Reward: tonic_small x2; money 0; flags `sq_lanyard_done`

#### [MAIN 140] In Person (`mq_finale`)
- Giver: `ron` @ `aurelith` | map: map pending | needs: `all_badges`
  s1. Optional: read the director_numbers email (catalogue numbers by Friday). [`house_2f`] (if `all_badges`)
  s2. Ron is waiting on the Aurelith arena steps. The last battle with him (six creatures). [`aurelith`] -> sets `beat_rival_ron_6`
  s3. Ron doesn't leave. He comes with you. [`aurelith`] -> sets `ron_in_party`
  s4. Take the Lumen Line to Revival Heights. Eight coins get you a senior lanyard at HQ reception. [`revival_hq_int`] -> sets `has_senior_lanyard`
  s5. Ride the lift past floor 9. Find the field team on the restricted floors. [`revival_hq_upper`] -> sets `found_field_team` (if `has_senior_lanyard`)
  s6. [PENDING STORY CALL] The confrontation. Who is there and what happens is Gary's call. [`revival_hq_upper`] -> sets `truth_revealed`
  s7. Everyone goes home. [`revival_hq_upper`] -> sets `finale_done`
  s8. Home. Ron walks past you to the bin, picks up all the bags and takes them out. [`brookhollow`] -> sets `bins_taken_out` (if `finale_done`)
  s9. Credits. [`brookhollow`] (if `bins_taken_out`)
- Reward: -; money 0; flags `beat_rival_ron_6`, `found_field_team`, `finale_done`, `bins_taken_out`, `!ron_in_party`
  - **ron** (start): "Eight coins. Me too, nearly. Seven and a sandwich. / One more, {nick}. For old times. Then we go and get them."
  - **ron** (step): "Yeah. Okay. You were always going to win that one. / Head Office. In person. Like the list said. I'm coming."
  - **hq_receptionist** (step): "Eight coins? That's senior grade. Here's your lanyard. / The lift will stop wherever you like now. Please don't make me regret it."
  - **ron** (step): "My lanyard's green. Or it was. They took it back. / I'll just stand very close to you."
  - **ft_teo** (step): "Item one: you found us. Item two: we're all right. / Item three: is there food? That's the important one."
  - **ft_marta** (step): "We said back by Friday. We didn't say which Friday."
  - **ft_pell** (step): "Did anyone water my plants? Don't answer. I can tell."
  - **ft_imke** (step): "Imke is humming. Her partner hums along, a little off-key."
  - **ron** (step): "I'm not battling you, {nick}. I'm standing here. With you. / Big difference."
  - **ron** (turn_in): "Told you. Tomorrow." *(existing)*
  - _Note:_ Shape: Ron final battle (GD: ron_6 at the Aurelith arena steps, 'Ron stands beside you afterwards') -> Ron in party -> HQ restricted floors -> team found -> [pending] -> finale_done -> the bins -> credits.
  - _Note:_ Hooks paid off: Greystone 'Ask Head Office. In person.', Mirefen 'Off to Head Office... Back by Friday', Lanternport 'Head Office wants our four brought in', the tower_floors email (floors 9-12 senior only; green lanyards), the director_numbers email (catalogue numbers by Friday).
  - _Note:_ PENDING STORY CALL (step 6). It isn't written because these aren't canon: Vane's motive, the Vane memo, who the rebels are (the Riverbank Stranger's people?) and whether the ending releases the crystals. truth_revealed is the flag reserved for it. No line here says what the crystals do.
  - _Note:_ ALTERNATIVE location: Greystone deep (B2, planned) instead of the HQ upper floors. The log pages work with both; only the lanyard step changes.
  - _Note:_ ron_in_party is set from s3 until finale_done (reward flag '!ron_in_party' = clear it, same ! convention as prerequisites). The window allows: the Firefly DJ gag (STORY_RULINGS_CLUB), the sq_ron_job interview gags and Ron's bin quip (Gary ruling 1).
  - _Note:_ Last beat: bins_taken_out plays the existing 'Told you. Tomorrow.' with no other dialogue (STORY_RULINGS_SOUL #3). sq_bin_day step 4 is now an after-credits look at the empty bin.
  - _Note:_ finale_done triggers Text Bot's reopening email ('The Brookhollow office reopens Monday...').
  - _Note:_ Field team lines are new and short. They show the voices from the brief: Teo lists, Imke hums, Marta's 'Friday', Pell plain. Text Bot to own them.
  - _Note:_ Map pending: aurelith, revival_hq_int, revival_hq_upper (floors 9-12).

### frostspire

#### [MAIN 80] Rated for One (`mq_frostspire`)
- Giver: `rt_engineer_pass` @ `route_greystone_frostspire` | map: map pending | needs: `beat_master_revival`
  s1. Take the Greystone pass north. The engineer approves the bridge for a three-coin trainer. [`route_greystone_frostspire`] -> sets `gate_frostspire_bridge_open`
  s2. Ron is at the rebuilt bridge. Battle him (Ron 4, optional per GD). [`route_greystone_frostspire`] -> sets `beat_rival_ron_4`
  s3. Find the snowed-in camp below the shrine and restore it. [`frostspire`] -> sets `camp_restored_frostspire`
  s4. Read the log page pinned under a rock. [`frostspire`] -> sets `read_log_frostspire`
  s5. Beat the Master of Frostspire. Learn Skylift. [`frostspire_hall_int`] -> sets `beat_master_frostspire`
  s6. The shrine is lit again. Down the mountain, three crystal walls go dim. [`frostspire`] -> sets `has_skylift` (if `beat_master_frostspire`)
- Reward: calm_tea x2, vigor_seed x1; money 0; flags `camp_restored_frostspire`, `read_log_frostspire`, `beat_master_frostspire`, `has_skylift`
  - **rt_engineer_pass** (start): "The rope bridge has snapped. Both halves are hanging off the cliffs. / Engineer: Repairs get approved when someone with three coins asks." *(existing)*
  - **rt_engineer_pass** (turn_in): "The bridge has been rebuilt. New rope, new planks. / Engineer: Rated for one person at a time. So, one person at a time." *(existing)*
  - **ron** (step): "The bags froze to the bin last night. / That's basically storage. Ready, {nick}?" *(existing)*
  - **prop:camp_frostspire** (step): "You dig the tent out of the drift and knock the ice off the stove. / It lights. Barely. Then properly."
  - **prop:log_frostspire** (step): "A page in loopy handwriting, signed 'P.A.' / 'Snowed in two nights. Went up to the shrine. It's gone quiet.' / 'The crystals on the path hum instead. Teo wants it on the list.'"
  - **system** (step): "Far below, the violet walls flicker... and dim."
  - _Note:_ CRITICAL_PATH: beat_master_frostspire gives has_skylift and dims the Route 1 east wall, the Saltmere causeway wall and the Sunmeadow north slope wall. The cause stays vague in all text: the shrine is lit, the walls dim, nobody says why.
  - _Note:_ Continuity: Route 1 trainer_r1_c says 'That crystal wall went up the night the Frostspire shrine went quiet.' Pell's page agrees with that (the shrine was quiet when the team got there) and doesn't explain it.
  - _Note:_ Camp text for Frostspire doesn't exist yet. The two camp lines here are new and listed for Text Bot. The club note_frostspire 'FOUND THE CAMP. NOT THEM.' ticks on camp_restored_frostspire.
  - _Note:_ Pell's page is the proposed camp mapping (open question).
  - _Note:_ Text Bot email no_comment (Frostspire shrine) lands here.
  - _Note:_ GD draft suggests 'Hale Corrie' (bird + wind). Not used in lines.
  - _Note:_ Map pending: route_greystone_frostspire, frostspire, frostspire_hall_int.

#### [side 81] [PLACEHOLDER] Cold Hands (`sq_cold_hands`)
- Giver: `frostspire_climber` @ `frostspire` | map: map pending | needs: `beat_master_revival`
  s1. A climber's hands are too cold to tie knots. [`frostspire`] -> sets `sq_cold_start`
  s2. Bring something warm: Fern Mint Tea from The Firefly. [`club_int`] -> sets `sq_cold_tea` (if `has_item fern_mint_tea`)
  s3. Give it to the climber. [`frostspire`] -> sets `sq_cold_done`
- Reward: tonic_large x1; money 0; flags `sq_cold_done`
  - _MERGE (Gary ruling / main overlap): Ruling 6: kept as a PLACEHOLDER for a thin zone. Replace when the zone has canon._

### sunmeadow_fields

#### [MAIN 90] Past the Shine (`mq_sunmeadow_crossing`)
- Giver: `system` @ `route1` | map: map pending | needs: `beat_master_frostspire`
  s1. The Route 1 east wall has dimmed. Walk through to Sunmeadow Fields. [`route1`]
  s2. Cross the meadow south-east toward Mirefen (or take the Saltmere causeway). [`route_sunmeadow_mirefen`] -> sets `reached_mirefen`
- Reward: -; money 0; flags `reached_mirefen`
  - **system** (step): "The violet wall is just glass now. Dim, and cold, and easy to walk past."
  - _Note:_ Pass-through beat. The Croft intro is the side quest sq_past_the_shine (same title on purpose: it's the follow-up, giver is the Route 1 sign). Main doesn't duplicate Nan.
  - _Note:_ OPEN: Nan Wexley says the team stayed at the Croft the night before Greystone (SOUL_PLAYBOOK 8.3). Sunmeadow was behind the crystal wall until coin 4, so they must have gone before the wall went up. That fits trainer_r1_c, but it needs a field-team timeline. Add a short Nan line here only if Gary wants it main.
  - _Note:_ Map pending: sunmeadow_fields (only the route1 strip is built), route_sunmeadow_mirefen, route_saltmere_mirefen.

#### [side 91] Past the Shine (`sq_past_the_shine`)
- Giver: `prop:sign_r1_ne` @ `route1` | map: map pending | needs: `beat_master_frostspire`
  s1. Read the Route 1 sign: 'Wexley's Croft – past the shine'. [`route1`] -> sets `sq_shine_start`
  s2. Find the Croft in Sunmeadow and meet Nan Wexley. [`sunmeadow_croft`] -> sets `sq_shine_met`
  s3. Herd three loose Tumbloams back into the paddock. [`sunmeadow_croft`] -> sets `sq_shine_herded`
  s4. Tell Nan. [`sunmeadow_croft`] -> sets `sq_shine_done`
- Reward: feed_bag x2; money 0; flags `sq_shine_done`, `croft_open`
  - _MERGE (Gary ruling / main overlap): order re-keyed 86 -> 91 to match main orders (ruling 8)._
  - _MERGE (Gary ruling / main overlap): Main mq_sunmeadow_crossing is just the walk-through. This quest stays the Croft intro (follow-up)._

### mirefen

#### [MAIN 100] Not a Fisher (`mq_mirefen`)
- Giver: `mirefen_angler` @ `mirefen_bog` | map: built | needs: `beat_master_frostspire`
  s1. Ask the quiet angler on the boardwalk about the field notebook from the club flyer. [`mirefen_bog`] -> sets `has_field_notebook`
  s2. Follow the notebook's sketch map to the camp on the reed island (bike boards). [`mirefen_bog`] (if `has_bike`)
  s3. Restore the camp. [`mirefen_bog`] -> sets `camp_restored_mirefen`
  s4. Read the last page of the notebook at the stove. [`mirefen_bog`] -> sets `read_log_mirefen`
  s5. Ron's here, ankle-deep. Battle him (optional, Text Bot opener). [`mirefen_bog`] -> sets `beat_rival_ron_mirefen`
  s6. Beat the Master of Mirefen. Learn Tideglide. The storm season starts. [`mirefen_hall_int`] -> sets `beat_master_mirefen`
- Reward: mossberry_shake x1, feed_bag x2; money 0; flags `has_field_notebook`, `camp_restored_mirefen`, `read_log_mirefen`, `beat_master_mirefen`, `has_tideglide`, `storm_season`
  - **mirefen_angler** (start): "Fish? In this bog? No. I just like the quiet. / Stay on the boards. The mud takes boots and doesn't give them back." *(existing)*
  - **mirefen_angler** (step): "The notebook? Didn't catch a fish. Caught that. / Someone drew a map in the back. Badly. Take it."
  - **prop:camp_mirefen** (step): "You haul the tent out of the reeds and wring it out. / The stove's dry inside. Someone wrapped it up properly."
  - **prop:log_mirefen** (step): "Neat handwriting, signed 'M.Q.' The last page is dated. / 'Bog census done by hand. The scanners don't like our four.' / 'Off to Head Office with Teo's list. Back by Friday.'"
  - **ron** (step): "This bog smells like bag five. / Bag five and I aren't speaking, {nick}." *(existing)*
  - **mirefen_angler** (after): "Storm's got the whole bog stirred up. / Even the frogs went home." *(existing)*
  - _Note:_ MAIN OWNS THE NOTEBOOK (Gary): the angler hands it over in s1. Club note_mirefen ('A Mirefen fisher pulled a field notebook from the reeds') is kept true: the angler did pull it out, just not while fishing. sq_ask_nicely is rewritten as a follow-up (sit with the angler at dusk after the camp is restored).
  - _Note:_ Marta's page says 'Back by Friday'. That ties to the cake_welcome email (Friday cake) at the end. 'Don't like our four' implies drift only touches bonded creatures. It doesn't explain it.
  - _Note:_ Proposed camp mapping: Mirefen = Marta Quill (open question).
  - _Note:_ CRITICAL_PATH: beat_master_mirefen -> has_tideglide, storm_season. Floods the coast road (gate_coast_road_flood).
  - _Note:_ OPEN: Ron battle count. GD has 6 Ron battles (none in Mirefen, Tidewater or Cindervale). Text Bot has openers for all 7 zones. Mirefen/Tidewater/Cindervale Ron steps are optional until Gary picks.
  - _Note:_ GD draft suggests 'Wenna Peat' (swamp). Not used in lines.
  - _Note:_ Map pending: camp spot on mirefen_bog, mirefen_hall_int.

#### [side 101] Ask Nicely (`sq_ask_nicely`)
- Giver: `mirefen_angler` @ `mirefen_bog` | map: built | needs: `camp_restored_mirefen`
  s1. After the Mirefen camp is restored, the angler is back on the boardwalk. Sit with them at dusk without talking. [`mirefen_bog`] -> sets `sq_nicely_sat` (if `phase == Dusk`)
  s2. Talk to them afterwards. [`mirefen_bog`] -> sets `sq_nicely_done` (if `sq_nicely_sat`)
- Reward: calm_tea x2; money 0; flags `sq_nicely_done`
  - _MERGE (Gary ruling / main overlap): order re-keyed 91 -> 101 to match main orders (ruling 8)._
  - _MERGE (Gary ruling / main overlap): Main owns the field notebook (mq_mirefen s1: the angler hands it over). Rewritten as a follow-up: prerequisite camp_restored_mirefen, the dusk sit stays, reward is calm_tea instead of the notebook. The 'after' line is still the angler's existing default._

#### [side 102] The Lumen Chain (`sq_lumen_chain`)
- Giver: `corwen_fell` @ `mirefen_bog` | map: built | needs: `has_bike`
  s1. Trade with Corwen on the bog islet at Night to get Purl, then read Purl's old letter at any heal-centre terminal. [`mirefen_bog`] -> sets `sq_chain_letter` (if `trade_t6_done && phase == Night`)
  s2. Deliver the letter to Lune on Route 1's high corner at Night and trade for Matins. [`route1`] -> sets `sq_chain_lune` (if `phase == Night`)
  s3. Deliver Lune's reply to Ivo below the caves and trade for Wick. [`greystone_b1`] -> sets `sq_chain_ivo`
  s4. Take Wick to the Lantern Rest. His lantern brightens at one stone. [`lantern_rest`] -> sets `sq_chain_done`
- Reward: framed_letter x1; money 0; flags `sq_chain_done`, `wick_trail_glow`
  - _MERGE (Gary ruling / main overlap): order re-keyed 92 -> 102 to match main orders (ruling 8)._
  - _MERGE (Gary ruling / main overlap): Ruling 5: trader renamed Lune Ashby -> Lune Hartley (lune_ashby -> lune_hartley). No family link to Pell Ashby._

#### [side 103] Count Day (`sq_count_day`)
- Giver: `mirefen_census_clerk` @ `mirefen_bog` | map: built | needs: `has_bike`
  s1. The census clerk explains the daily Mirefen Count. [`mirefen_bog`] -> sets `sq_count_start`
  s2. Check today's spotlight species on the company terminal. [`mirefen_bog`] -> sets `sq_count_spotlight`
  s3. Finish one count (20 nets, no battles; binoculars work as the scope). [`mirefen_bog`] -> sets `sq_count_done`
- Reward: -; money 300; flags `sq_count_done`, `mirefen_count_unlocked`
  - _MERGE (Gary ruling / main overlap): order re-keyed 93 -> 103 to match main orders (ruling 8)._

### tidewater_coast

#### [MAIN 110] Deep Enough to Lose a Boot (`mq_tidewater`)
- Giver: `sign:gate_coast_road_flood` @ `route_brookhollow_tidewater` | map: map pending | needs: `beat_master_mirefen`, `storm_season`
  s1. The storm has flooded the coast road south of Brookhollow. Cross it with Tideglide. [`route_brookhollow_tidewater`] (if `has_tideglide`)
  s2. Ron is on the sea wall. Battle him (optional, Text Bot opener). [`tidewater_coast`] -> sets `beat_rival_ron_tidewater`
  s3. Beat the Master of Tidewater Coast. [`tidewater_hall_int`] -> sets `beat_master_tidewater`
  s4. Take the sea lane north to Lanternport. [`tidewater_coast`] -> sets `reached_lanternport`
- Reward: tonic_large x2; money 0; flags `beat_master_tidewater`, `reached_lanternport`
  - **sign:gate_coast_road_flood** (start): "The coast road is underwater. Deep enough to lose a boot. Maybe both." *(existing)*
  - **ron** (step): "The flies have names now. / Don't ask me their names, {nick}." *(existing)*
  - _Note:_ Short on purpose. Thin zone; the side placeholder sq_sea_glass sits here.
  - _Note:_ OPEN (GD): Tidewater to Lanternport has no route in world_layout. GD treats it as a sea lane inside tidewater_coast. This quest follows that.
  - _Note:_ GD draft suggests 'Jory Swell' (sea). Not used in lines.
  - _Note:_ Map pending: route_brookhollow_tidewater, tidewater_coast, tidewater_hall_int.

#### [side 111] [PLACEHOLDER] Sea Glass (`sq_sea_glass`)
- Giver: `tidewater_beachcomber` @ `tidewater_coast` | map: map pending | needs: `has_tideglide`
  s1. A beachcomber collects sea glass, but the best bits are offshore. [`tidewater_coast`] -> sets `sq_glass_start`
  s2. Glide out and pick up three pieces of sea glass on the sandbars. [`tidewater_coast`] -> sets `sq_glass_3`
  s3. Bring them back. [`tidewater_coast`] -> sets `sq_glass_done`
- Reward: feed_bag x1; money 400; flags `sq_glass_done`
  - _MERGE (Gary ruling / main overlap): order re-keyed 101 -> 111 to match main orders (ruling 8)._
  - _MERGE (Gary ruling / main overlap): Ruling 6: kept as a PLACEHOLDER for a thin zone. Replace when the zone has canon._

### lanternport

#### [MAIN 120] The Page Ron Kept (`mq_lanternport`)
- Giver: `ron` @ `lanternport` | map: map pending | needs: `beat_master_tidewater`
  s1. Ron is waiting on the harbour steps. Battle him (Ron 5). [`lanternport`] -> sets `beat_rival_ron_5`
  s2. Afterwards Ron hands you a log page he found. He could have kept it. [`lanternport`] -> sets `read_log_lanternport`
  s3. Beat the Master of Lanternport in the old lighthouse. [`lanternport_hall_int`] -> sets `beat_master_lanternport`
  s4. The Master opens the tide-lock: a shortcut home to Fernwick. [`lanternport`] -> sets `tide_lock_open` (if `beat_master_lanternport`)
  s5. The Master sounds the lighthouse horn. Far off, something big wakes up. [`lanternport`] -> sets `lighthouse_horn_sounded` (if `beat_master_lanternport`)
- Reward: energy_tonic x2; money 0; flags `read_log_lanternport`, `beat_master_lanternport`, `tide_lock_open`, `lighthouse_horn_sounded`
  - **ron** (start): "The neighbour left a note about the bins. / I'm choosing to battle you instead, {nick}." *(existing)*
  - **ron** (step): "Found this in a lost-and-found box at the station. Revival Tech paper. / I read it. Then I thought about keeping it. Then I didn't."
  - **prop:log_lanternport** (step): "Tidy capitals again. 'T.B.' The last list. / '1. Head Office wants our four brought in. 2. Not leaving them.' / '3. Going anyway. All of us. With them.'"
  - **ron** (step): "No job, remember? So I'm not doing this for the company. / I'm doing it because they're ours. Same as you."
  - **master_lanternport** (turn_in): "The tide-lock's open. Fernwick's a short walk now. / And the horn... someone's been asleep on the Cindervale road too long."
  - **system** (step): "Far off, the Lanternport horn sounds."
  - _Note:_ Ron arc beat (Lanternport): Ron finds information and chooses to share it. The page is Teo's (lead, lists). It points at Head Office and sets up the finale without naming a motive.
  - _Note:_ GARY RULING 7: the Lanternport Master must not be named Vane. Draft name: Delphine Orrin (original; not used by any GD trainer name, but not web-checked). It's not in any line yet. CONFLICT: design/overnight_gd/halls/lanternport.json and overnight_gd/INDEX.md still say 'Isolde Vane'. That's another worker's file, so it's not edited here. The GD owner needs to change it.
  - _Note:_ CRITICAL_PATH: beat_master_lanternport -> tide-lock (route_fernwick_lanternport) and the horn that wakes the Cindervale giant (blockers.gate_cindervale_giant.wake mirrors 'Far off, the Lanternport horn sounds.').
  - _Note:_ Text Bot email recal_full ('Please stop booking your own team in') lands near here. It fits Teo's list. Left as an implication only.
  - _Note:_ Map pending: lanternport, lanternport_hall_int, lanternport station.

#### [side 121] The Keeper's Forecasts (`sq_forecast`)
- Giver: `lighthouse_keeper` @ `lanternport` | map: map pending | needs: `beat_master_tidewater`
  s1. Read the lighthouse keeper's weekly forecast board. [`lanternport`] -> sets `sq_forecast_start`
  s2. Be in the forecast zone during the forecast weather or phase (1 of 5). [`any`] -> sets `sq_forecast_1`
  s3. Correct forecast 2 of 5. [`any`] -> sets `sq_forecast_2`
  s4. Correct forecast 3 of 5. [`any`] -> sets `sq_forecast_3`
  s5. Correct forecast 4 of 5. [`any`] -> sets `sq_forecast_4`
  s6. Correct forecast 5 of 5. [`any`] -> sets `sq_forecast_5`
  s7. The last forecast: meteor night at Lanternport. A Cosmic creature appears. [`lanternport`] -> sets `sq_forecast_done` (if `sq_forecast_5 && phase == Night`)
- Reward: -; money 0; flags `sq_forecast_done`, `app_sky_almanac`
  - _MERGE (Gary ruling / main overlap): order re-keyed 111 -> 121 to match main orders (ruling 8)._

### cindervale

#### [MAIN 130] Something Louder (`mq_cindervale`)
- Giver: `sign:gate_cindervale_giant` @ `route_aurelith_cindervale` | map: map pending | needs: `beat_master_lanternport`
  s1. Take the volcanic road from Aurelith. The giant has left a dent where it slept. [`route_aurelith_cindervale`] (if `lighthouse_horn_sounded`)
  s2. Ron is at the town gate (optional, Text Bot opener). [`cindervale`] -> sets `beat_rival_ron_cindervale`
  s3. Beat the Master of Cindervale. Eight coins. [`cindervale_hall_int`] -> sets `beat_master_cindervale`
  s4. Eight coins registered. [`cindervale`] -> sets `all_badges` (if `beat_master_cindervale`)
- Reward: dominance_crystal_plus x3; money 0; flags `beat_master_cindervale`, `all_badges`
  - **sign:gate_cindervale_giant** (in_progress): "There's a giant dent in the road where it slept. The way to Cindervale is open." *(existing)*
  - **ron** (step): "The bags have a smell now. Not ours. Their own. / Tomorrow, {nick}. I mean it this time." *(existing)*
  - _Note:_ all_badges is the existing flag name (internal only; player text says 'coin'). It triggers Text Bot's director_numbers email ('send your team's catalogue numbers by Friday') and rt_guard_east's 'Eight coins' line.
  - _Note:_ GD draft suggests 'Brannock Fell' (fire + magma). Not used in lines.
  - _Note:_ Map pending: route_aurelith_cindervale, cindervale, cindervale_hall_int.

#### [side 131] [PLACEHOLDER] Baked on the Rocks (`sq_warm_stones`)
- Giver: `cindervale_baker` @ `cindervale` | map: map pending | needs: `beat_master_lanternport`
  s1. A baker cooks on the warm ground but is out of mossberries. [`cindervale`] -> sets `sq_stones_start`
  s2. Pick mossberries in Fernwick (bush by the east tree). [`fernwick`] -> sets `sq_stones_berries`
  s3. Bring them back. [`cindervale`] -> sets `sq_stones_done`
- Reward: trail_mix x2; money 300; flags `sq_stones_done`
  - _MERGE (Gary ruling / main overlap): order re-keyed 121 -> 131 to match main orders (ruling 8)._
  - _MERGE (Gary ruling / main overlap): Ruling 6: kept as a PLACEHOLDER for a thin zone. Replace when the zone has canon._

### aurelith

#### [MAIN 160] No Breaks Between (`mq_aurelith_arena`)
- Giver: `arena_doorman` @ `aurelith` | map: map pending | needs: `finale_done`
  s1. Enter the Aurelith arena. Battle Masters back to back. No healing between battles. [`aurelith_arena_int`]
  s2. Beat every Battle Master in one run. [`aurelith_arena_int`] -> sets `beat_aurelith_arena`
- Reward: vigor_seed x3; money 0; flags `beat_aurelith_arena`
  - **arena_doorman** (start): "Battle Masters, one after another. No breaks, no healing. / If you need a breather, now's the time."
  - _Note:_ Design doc: 8 Battle Masters, no healing. GD draft has 4 plus Ron, and asks 8 vs 15. Count is Gary's call.
  - _Note:_ OPEN: prerequisite. Text Bot meta calls the arena post-game (finale_done), but the design doc opens it at all_badges. Draft uses finale_done.
  - _Note:_ GD arena trainer name suggestions include 'Pell' (tr_aurelith_arena_2), which clashes with Pell Ashby. The GD owner should rename it.
  - _Note:_ beat_aurelith_arena unlocks Text Bot's Dana-desk tier and sq_ticket_stub.
  - _Note:_ Map pending: aurelith, aurelith_arena_int.

#### [side 161] A Stub from Aurelith (`sq_ticket_stub`)
- Giver: `home_fernwick_a_kid` @ `home_fernwick_a` | map: map pending | needs: `all_badges`
  s1. The Fernwick kid who wants to beat all eight Masters hears you did it. [`home_fernwick_a`] -> sets `sq_stub_start`
  s2. Ask the arena usher in Aurelith for a spare ticket stub. [`aurelith`] -> sets `sq_stub_got`
  s3. Bring it to the kid. [`home_fernwick_a`] -> sets `sq_stub_done`
- Reward: feed_bag_small x1; money 0; flags `sq_stub_done`
  - _MERGE (Gary ruling / main overlap): order re-keyed 131 -> 161 to match main orders (ruling 8)._
  - _MERGE (Gary ruling / main overlap): Aurelith side quest moved after the arena main quest (161), because the arena is post-game in main._

Company task quests and the Legendary Guardian quest are not main story, so they aren't drafted (see the notes in the design doc).

## New ids to add

Proposals only. Coder/World/Text to confirm. The side-quest flags (`sq_*`) are listed per quest in `new_ids` in the JSON and aren't repeated here.

**Main-quest flags:** `read_log_thornwood`, `read_log_greystone`, `read_log_frostspire`, `read_log_mirefen`, `read_log_lanternport`, `read_drift_log` (SOUL_PLAYBOOK name; set by the first page), `tally_marks_seen`, `mq_greystone_reported`, `ron_layoff_letter`, `has_field_notebook`, `reached_mirefen`, `reached_lanternport`, `tide_lock_open`, `lighthouse_horn_sounded`, `has_senior_lanyard`, `found_field_team`, `bins_taken_out`, `sq_bin_ron_quip`. Gate flags only if the blockers don't already set them: `gate_thornwood_east_cleared`, `gate_revival_checkpoint_open`, `gate_frostspire_bridge_open`.

**Ron battle flags (GD draft names):** `beat_rival_ron_2`..`beat_rival_ron_6`. Only if Gary keeps the extra battles: `beat_rival_ron_mirefen`, `beat_rival_ron_tidewater`, `beat_rival_ron_cindervale`.

**Existing flags this draft relies on but no code sets yet:** `truth_revealed` (finale step 6 placeholder), `ron_in_party` (set in mq_finale s3, cleared at finale_done), `field_team_home`, `finale_done`, `camp_restored_frostspire`, `camp_restored_mirefen`, `beat_aurelith_arena`, `has_rail_pass`, `has_skylift`, `has_tideglide`, `storm_season`.

**Items (key, proposed):** `field_notebook` (now main), `rail_pass` (no Lumen Line Pass id exists), `senior_lanyard`. The side merge also uses `dana_team_card`, `ron_croft_apron` and `rehire_form`. There's still no coin item id; coins are flags (`beat_master_*`), and only art `master_coin` exists.

**NPCs:** `lab_lead_varga`, `saltmere_office_clerk`, `hq_receptionist`, `station_clerk_central`, `ft_teo`, `ft_marta`, `ft_pell`, `ft_imke`, `master_saltmere` .. `master_cindervale` (GD ids), `brookhollow_kid_dad` (ruling 3), `lune_hartley` (ruling 5), plus the side npcs listed per quest. `arena_doorman` already exists.

**Props / interact spots:** `prop:log_thornwood`, `prop:log_greystone`, `prop:tally_crystal` (greystone_b1 3,9), `prop:camp_frostspire`, `prop:log_frostspire`, `prop:camp_mirefen`, `prop:log_mirefen`, `prop:log_lanternport`.

**Maps (pending):** saltmere, saltmere_office_int, saltmere_hall_int, route_brookhollow_aurelith, aurelith, aurelith_arena_int, route_thornwood_revival, revival_heights, revival_hq_int, **revival_hq_upper** (floors 9-12, finale), revival_hall_int, revival_station_int, route_greystone_frostspire, frostspire, frostspire_hall_int, sunmeadow_fields, route_sunmeadow_mirefen, mirefen_hall_int, route_brookhollow_tidewater, tidewater_coast, tidewater_hall_int, lanternport, lanternport_hall_int, route_aurelith_cindervale, cindervale, cindervale_hall_int, lab_brookhollow NPC placement, **brookhollow_kid_home** (ruling 3).

**Names (proposed):** Lanternport Master **Delphine Orrin** (ruling 7; not Vane). Trader **Lune Hartley** (ruling 5). Ron's nickname for the player's lead: **Crumb** (ruling 2).

## Lines for Text Bot to align

Text Bot's files were only read, never written. These are the alignments needed:

1. **Biscuit -> Crumb (ruling 2).** `maps.house_1f.ron` line `ron_unnamed`: "I'm calling it Biscuit. Don't fight me on this, {nick}." -> 'Crumb'. 'Biscuit' now belongs only to Prue Hollin's Tumbloam (lost flyer = T5 trade).
2. **Mom -> Dad (ruling 3).** `maps.brookhollow.kid`: default ("My mom says Revival Tech is laying people off."), `v_flg_promoted`, `kid_coin`, `kid_tower`, `kid_8` ("My mom says ...") and `kid_dusk` ("Don't tell my mom about the 'mostly'."). The kid's parent is now `brookhollow_kid_dad` in a Brookhollow home.
3. **Ron's bin payoff.** `house_1f.ron ron_ending` "Told you. Tomorrow." now plays in main `mq_finale` s8 (flag `bins_taken_out`), the last beat before the credits. sq_bin_day s4 is now the after-credits empty bin (`bin_empty`). New Ron bin quip while `ron_in_party` is set (sq_bin_day s3b): "Don't look at it, {nick}. It can tell when you look at it."
4. **Lanternport Master name (ruling 7).** Not Vane. Draft: Delphine Orrin. `masters.lanternport` text should use it (or Gary's pick). The GD files still say Isolde Vane (see the open questions).
5. **Camp text for Frostspire and Mirefen** doesn't exist yet. Draft restore lines are in mq_frostspire s3 and mq_mirefen s3, written to match the Thornwood/Greystone tone. The existing `camp_restored` / `camp_restored_first` text should apply to both.
6. **New Ron lines** (Ron's voice is Text Bot's): the Trail Runners handover (mq_route1_benchmark s4), the ID jealousy at Saltmere, the letter at Revival Heights, the Lanternport 'chose to share it' lines, and the finale (arena-steps opener and the 'standing here with you' line). The final battle needs a **bin line 8** opener; this draft uses "Eight coins. Me too, nearly. Seven and a sandwich." as a stand-in.
7. **Mirefen angler** gets one new conditional line (hands over the notebook). It keeps 'Fish? No.' true: "The notebook? Didn't catch a fish. Caught that." Club `note_mirefen` ('A Mirefen fisher...') reads fine next to it. Text Bot may want to change 'fisher' to 'someone'.
8. **sq_ron_job s4** keeps only "Thanks for not saying anything. That helps, {nick}." because the main letter scene already says "It's fine. It's just a letter."
9. **Log pages, field-team voices and new NPCs** (lab lead, Saltmere clerk, HQ receptionist, station clerk, Lanternport Master turn-in): all new and short, for Text Bot to own.
10. **Existing-text wording to check against house rules (not my files):** `home_lanternport_c_kid` "When the fog comes in..." and `gate_saltmere_causeway` "fades into mist" (the brief bans fog/haze wording). The internal npc id `rebel_bartender` (club_int) is never shown to players, but quest lines use it as a speaker id.

## Open questions for Gary

1. **Finale confrontation (mq_finale s6): PENDING.** Who is on the restricted floors, and what happens? These stay out of the lines until you rule: Vane's motive, the Vane memo, the rebels being the Riverbank Stranger's people, and the crystal-release ending. `truth_revealed` is reserved for it.
2. **Finale location:** HQ restricted floors 9-12 (`revival_hq_upper`; draft, ties into the tower_floors email and 'Head Office. In person.') or Greystone deep (B2)?
3. **Camp owners (proposal):** Thornwood = Imke, Greystone = Teo, Frostspire = Pell, Mirefen = Marta (plus a last Teo page at Lanternport). The log pages sign only initials. Confirm before they ship.
4. **Field-team timeline:** Croft night (before Greystone) -> Thornwood -> Greystone (23 tally marks; check-in cancelled) -> Frostspire (shrine already quiet) -> Mirefen ('Back by Friday') -> Head Office. Sunmeadow sat behind the crystal wall until coin 4, so the team must have passed before the wall went up. That fits Route 1's 'wall went up the night the shrine went quiet'. OK?
5. **Lanternport Master name:** draft Delphine Orrin (ruling 7). `design/overnight_gd/halls/lanternport.json` and `overnight_gd/INDEX.md` still say **Isolde Vane**. That's another worker's file and wasn't edited. Ask the GD owner to rename it.
6. **GD name clashes found in passing:** GD trainer name suggestions include Pell (arena Battle Master 2), Teo, Quill, Sorrel (the field team), Hollis (Vane's first name), Ines (Lab Lead Varga), Ferris and Nell (Lantern Rest stone). Rename in GD?
7. **Ron battle count:** GD has 6 (Fernwick, Saltmere, Revival, Frostspire pass, Lanternport, Aurelith final). Text Bot has openers for Mirefen, Tidewater and Cindervale too. The draft marks those three optional.
8. **Ron's layoff:** the letter is never read on screen, and Ron keeps travelling. At Lanternport he says he's doing it 'because they're ours'. OK that he's laid off but still battling? Or should the letter be a demotion?
9. **Starter order:** promotion first, then the lab starter (draft)? And the lab giver is `lab_lead_varga` vs the side quest's `lab_brookhollow_aide`.
10. **Work-together vs rivals choice** (design doc): no flag exists. The draft assumes rivals.
11. **Senior lanyard:** eight coins get the player senior access at HQ reception (finale s4). OK as the key? Or should it be a separate quest?
12. **Arena:** opens at finale_done (draft, matches Text Bot meta 'post-game') or at all_badges (design doc)? 8 Battle Masters (design doc) vs 4 + Ron (GD) vs 15?
13. **read_drift_log** is set by the first log page (Thornwood). It switches on the jingle swap and the recalibration option. Too early? It could move to the Greystone page instead.
14. **Coins as items:** no coin item id exists. Flags only, or add `coin_<zone>` items?
15. **Lumen Line pass:** add a `rail_pass` key item, or keep the flag `has_rail_pass` only?
16. **Nan Wexley in main:** her memory of the team's night before Greystone is left to the Croft side quest. Should a line move into main mq_sunmeadow_crossing?
17. **Tidewater -> Lanternport:** sea lane inside tidewater_coast (GD) or a real route?
18. **Director Vane cameo** at HQ (Revival Heights) is not written. All his lines are pending.

## Missing from the sources

- There's no quest loader or schema in the code, so `SCHEMA.md` here is our own format.
- `text/drafts/overnight/` doesn't exist; this draft used `text/overworld_lines.json` v0.4.9 (read only).
- Most later maps are unbuilt (all marked `map pending`).
- There's no item id for coins or the Lumen Line Pass.
- No canon gives master names or elements beyond Fernwick (Earth). The GD suggestions are noted per quest but kept out of the lines.
- No camp text exists for Frostspire or Mirefen, and no camp-to-member mapping exists anywhere.
- The 'Isolde Vane' clash is in design/overnight_gd.
