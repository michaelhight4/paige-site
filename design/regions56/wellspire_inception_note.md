# Wellspire v2: the hidden layers (note for Story Bot)

From: Coder, Oct 29 2026. Gary's direction, 10:17 to 10:21 PM CT. Branch `dev/wellspire-v2` (not published).
I have NOT edited `story_beats.md`. This note is for you to fold in however you see fit.

## The rule above all
**It is only ever HINTED.** No character explains any of it. Players work it out themselves from odd or contradictory lines, déjà vu, documents, environmental details, NPCs remembering things that didn't happen, and an ambiguous ending. Every draft line is written to that rule. Please keep it when you rewrite.

## What is really going on (for us, never for the player)
1. **None of it happened.** Ondravel was never on the summit, the player was never in the past, and the Head Office letter never came.
2. **Everyone remembers it anyway.** The whole continent shares the memory, including people "remembering" the player in the rebellion stories.
3. **It is Ondravel's cover-up.** He hides how strong the Kilumen really are by making it look as if the player broke them free. In truth the player *let him out*.
4. **The time loop.** RT employs the player as a field researcher *because* the player is in a time loop. RT can't work out how or why, so they hired the player to research... the player.
5. **The last layer:** the rebels were right all along. They weren't "crazy hippies".

## Where the clues are seeded (draft keys, data/textbot_requests_wellspire.md, "Wellspire v2")
| Layer | Clues |
|---|---|
| 1. Never happened | `fin.never.summit_empty` (no footprints), `fin.never.letter_blank` (the letter is blank), `fin.never.mum` ("What letter, love?"), `fin.never.rita` (no courier on record, but a record of you reading it seven times), `fin.never.teo` (readings flat for centuries, yet Cairnfold remembers the light) |
| 2. Shared memory | `fin.never.keeper` (the kid in the rebellion stories looked like you), `fin.past_logbook` (a visitor "who looked like they'd been here before"), `r9.ft.r9_ic_climber_2.*` (a photo of you from spring, now blank), `r9.ft.r9_rb_dowser.after` |
| 3. Cover-up / the region was made | Every field team says the region isn't on any map: `r9.ft.r9_rb_hiker.intro`, `r9_rb_guide`, `r9_skylift_rider`, `r9_sw_mountaineer_1`, `r9_sw_survey_1`/`_3`, `r9_cl_field_1`. Ice with the same winter over and over (`r9_ic_climber_1`), clouds that move with you (`r9_cw_field_1`), memo signed by the team itself (`r9_cl_field_3`), `fin.summit.reveal` ("surprised you are on time"), `fin.never.last` (sleeping or smiling) |
| 4. Time loop / RT studies you | Head Office's letter "it would like to see you" (`r9_sw_survey_2`), RT's old call sign repeating your employee number (`r9_ic_keeper.after`), a file where researcher and subject share a name (`r9_ec_field_2.after`), the notebook "Subject... does not remember" (`r9.echo_note_2`), Team Vesper (`r9_hc_field_*`: "you always come up the left", "a list of things I remember that didn't happen: you're on it", "watch the one who is watching"), the cairn count (`r9.cloudway_note_2`), the warm thermos (`fin.summit_cairn`), the visitor log with your name and a blank date (`r9.heart_note_2`), Head Office's "filed with the others... see you next year" (`fin.never.head_office`) |
| 5. Rebels were right | `r9.echo_note` ("WE WERE NOT MAD. WE WERE LISTENING."), `r9.cloudline_note_2` (leaflet: "they need us to stop looking"), `r9_cl_field_2.after` (a grandmother who left RT and never said she was wrong), `r9.heart_note` (a field jacket your size, name unpicked) |

## Structure (unchanged beats, reused)
Cairnfold → Switchbacks (outdoor 1) → Icefall (cave 1) → **Cloudway** (outdoor 2, plates) → **Echo Cave** (cave 2, crystals) → **Cloudline** (outdoor 3, plates on ice) → **Heart Cave** (cave 3, plates + crystals) → Summit Camp → spire f1 to f3 → **the summit** (bespoke: cloud sea, crystal ring, a towering animated Ondravel). Clouds part, light, shake, flash, then the existing plea and the time slip. The rebellion (Station M, Signal Lab, Lab 1) is reused. The **bespoke past enclosure** has Ondravel sealed in crystal. Then the 3 phases, riverbend dawn, the present, credits 2 and the Lantern Rest epilogue (now carrying the "never happened" beats).

## Open for you
- The Coralie epilogue is **not placed**, because there is no present-day Coralie NPC. Her line ("You hadn't done it yet") already fits layer 4 if you want it.
- All new text is DRAFT (code fallbacks in `src/region9/text_fallback_v2.js`) until Text Bot replaces it.

## Update: Gary's answers (10:53 to 10:54 PM CT) and how the build follows §W
- **Kilumen power:** telepathic control over items and minds (it began when their brains were linked in the lab incident). Hinted by a pen that keeps returning to a hand (`r9.ft.r9_ec_field_1.after`), a hum that sounds like your own thoughts (`r9_sw_survey_2.after`), and the warning "don't let it in your head" (`r9.echo_note`).
- **Rebels:** people who know every creature was lab-made, and who are not under the Guardian's control. Hinted by `r9.echo_note` ("EVERY ONE OF THEM CAME OUT OF A LAB") and by Yara's grandmother (`r9_cl_field_2.after`), who never remembered the rebellion night the way everyone else does.
- **Time loop:** a Guardian-made construct, real to everyone except the rebels.
- **The letter really arrives:** the courier is unchanged. It is the Guardian luring the player, just as it lured the field teams (who also got letters: `r9_rb_dowser`, `r9_sw_survey_2`). "The letter is blank" (`fin.never.letter_blank`) only happens after Ending 2, as §W-4 says.
- **Cairnfold locals kept.**
- **After Ending 2, Wellspire is gone.** That is the only world change.
  - The Wellspire dot is hidden on the world map (`world_layout` zone `gone_flag: ending2_done`).
  - The riverbed entry and the Skylift entry now lead nowhere (`r9.gone_riverbed`, `r9.gone_skylift`). The Skylift has a sign-in sheet with eight names and no sign-out.
- **The field teams (Gary 10:55 PM CT, replaces the missing-staff idea):** when Wellspire collapses, the field teams all wake up at home. Hinted by a postcard in the epilogue (`fin.never.teams_home`: their watches all stopped at the same minute, and they feel 'like we walked a long way up something'), and by the Skylift sign-in sheet, now all signed out in unfamiliar handwriting. Corwin's 'since next week' watch line stays as the paradox hint.
- **Ron gives no heal:** the build adds none. The summit camp fire is the only heal, as before.
- **Map order vs §W-1:** the build is longer than §W-1. It runs riverbed/Skylift → Switchbacks (outdoor) → Icefall (cave) → Cloudway (outdoor, plates) → Echo Cave (cave, crystals) → Cloudline (outdoor, plates on ice) → Heart Cave (cave, plates + crystals) → Summit Camp → the sealed lab under the spire (f1 to f3) → summit.
  - §W-1's puzzle ideas are not built: water marks, ice mirrors, River-note doors and relays. The build uses plates and crystals.
  - The mural, the Delta clipboard and the Lodge insert are not placed yet.
  - The team names differ from §W-1: Cobalt, Harrow, Gannet, Sedge, Lark, Quill, Moraine and Vesper, rather than Bravo, Kestrel, Delta and Harrow. Rename freely.

## Update (10:57 PM CT, following Story Bot's revised §W)
- **Cut:** `fin.never.missing_notice` and Corwin's "since next week" watch. Corwin now says he "can't remember packing for this trip", a memory gap.
- **Softened:** `r9.echo_note` now reads "creature after creature, each with a lab number scratched beside it… WE REMEMBER. WE WERE NOT MAD." It never says "made" outright (Q-W12, pending).
- **H6 post-E2 beats in the Ending 2 epilogue:**
  - `fin.never.teams_home`: dust and ice-melt on boots, a blank letter in a coat pocket, clocks stopped at the same minute, weeks nobody can account for.
  - `post.duty_board_home`: the board reads "Home", with no departure or return entry.
  - `r9.gone_skylift`: eight names signed in, none signed out, all of them home.
- **Flags set:** `ending2_done`, `wellspire_gone` and `field_team_home`.
  - The duty board is narrated in the epilogue for now. It is not yet a prop at the Revival Centre.
  - The per-town boot props are not placed.
- **Toggles in `src/region9/index.js` `WELLSPIRE_OPTS`,** all off pending Gary:
  - `collapseShown` (Q-W10): shows `fin.never.collapse`.
  - `dreamVariant` (Q-W11): sets `dream_post_e2`. A draft `dream.post_e2` text exists, but the opening-dream scene does not read it yet.
  - `coraliePresent` (Q-W13): plays the canon `fin.epilogue.coralie` line in the epilogue. There is no Tidewater cove NPC yet.

## Update (11:05 to 11:08 PM CT: Gary's answers and Story Bot's §W)
- **Q-W10, the collapse is not shown.** `collapseShown` stays false. Players notice by absence.
- **Q-W12, the lab origin may be stated.** `r9.echo_note` is restored ("EVERY ONE OF THEM CAME OUT OF A LAB…").
  - It is now an optional easter egg: wall writing in Echo Cave's east dead-end (stand at (22,10)).
  - It sets no flag, and nothing depends on it. The origin stays implied in R5/R6.
- **Main-path power clue:** Fenna (`r9.ft.r9_cw_field_1.after`, Cloudway) says "Head Office says don't let it in your head. Never said what 'it' was."
- **Flashback** (`FLASHBACK` in `src/region9/index.js`):
  - The Ending 2 epilogue sets `wellspire_flashback_due`.
  - On the next tick, a loading screen (`warp` kind `ending`) takes the player to the `fin_past_lab1_f1` tiles, which plays `dream.post_e2`: the lab making and experimenting on them.
  - A second loading screen then takes the player home to `house_1f` (5,8).
  - `FLASHBACK.after` is null: one swappable hook for Q-W14 (how the release/ending plays after the return home).
  - Turn it off with `WELLSPIRE_OPTS.dreamVariant=false`.
- **Q-W13, present-day Coralie at the Tidewater cove:**
  - After `ending2_done`, entering the cove (`tidewater_coast` near (44,33)) spawns `r9_coralie_cove` beside the player, using the Coralie sprite.
  - She plays the canon `fin.epilogue.coralie` line once (`coralie_cove_done`) and stays standing there for that visit.
  - The Coralie epilogue is therefore now placed.

## Update (11:09 PM CT): Gary's Q-W14 ending sequence, now built
- **The new sequence:** present release → credits → flashback (loading screen into the `fin_past_lab1_f1` tiles, `dream.post_e2`) → loading screen home to `house_1f`.
  - At home: `fin.home.wake` (dusty boots), then `fin.never.letter_blank`, then Mum's "What letter, love?", then `fin.home.to_work`. The flag `fin_report_due` is set.
- **At work:** the player walks to work, the RT HQ lobby (`aurelith_rthq_int`, swappable as `REPORT.work`). There:
  - Teo, Marta, Pell and Imke are standing by the desk.
  - `fin.report.*` plays, with a memory-fade screen effect (`r9fx.flashOut`, pale violet). The report is never given (`fin_report_faded`).
  - Then come the head-office, teams-home and duty-board lines, the postgame line, and `fin.never.last`.
- **Removed:** the Lantern Rest walk-home/arrival (`fin.epilogue.team_arrive`, keeper/marta/teo bench lines, `fin.never.keeper`, `fin.never.rita`). The texts stay in the files but are no longer played.
- `tests/wellspire.test.mjs` has been updated to match the new warp order.

## Update (11:10 PM CT): following Story Bot's rewritten F5
This replaces the 11:09 section above.

**The release is never shown.** The `fin_lab1_now` present-release step is removed, and so is the `fin_present_release` flag. The summit Ondravel now hides on `fin_woke_home` instead.

**The finale runs in this order:**
1. Riverbend.
2. Optional flashback: a loading screen into `fin_past_lab1_f1` (`dream.post_e2`).
3. A loading screen to the player's bed in `house_2f`. This sets `fin_woke_home` and `spring_running`.
4. At home: `fin.home.wake` (the crystal's throb is gone, dusty boots), the blank letter, Mum, then `fin.home.to_work`.

**F5-2b, Brookhollow:** entering Brookhollow plays `fin.walk.spring` (the trickle by the bridge and the wet print) and `fin.walk.ron` (Ron waves with the bins).

**F5-4 to F5-6, at `heal_brookhollow` (the RT Brookhollow branch):**
- `fin.report.form` (RITA's form is open, titled with your ID, its body blank) sets `fin_reported_rt`.
- The four appear at their desks: `fin.report.arrive`, which sets `field_team_home`.
- The memory fades (`flashOut`), which sets `fin_memory_lost`.
- Then Teo's ordinary greeting and his list ("find source" crossed off).
- This sets `wellspire_gone` and `ending2_done`, then **Credits 2** plays.

**Flag order:** `fin_woke_home` → `fin_reported_rt` → `field_team_home` → `fin_memory_lost` → `wellspire_gone` → `ending2_done`. This is tested in `tests/wellspire.test.mjs`.

**Post-credits (optional):**
- Coralie at the cove sets `fin_coralie_epilogue`.
- At Lantern Rest, the existing `fin_ep_*` NPCs and the `fin_bench_swap` spot are gated on `field_team_home` and `ending2_done`.
- A post-E2 visit to the RT branch shows `post.duty_board_home` and `fin.never.teams_home`.

**Not done:**
- The `item_drift_readings` key item is not given.
- The repainted-stencil last card in the Credits 2 data is untouched.
- The River-motif audio swell and cut is not wired; only the visual fade is.

- **Gary approved (11:16 PM CT):** the reunion happens at the RT office, and the Lantern Rest bench is an optional post-credits visit. The memory loss covers only Wellspire, the summit and the flashback. `fin_memory_lost` clears no flags, so the R6 knowledge flags are kept.

## D10 map ids: placeholder → real id in the build (for Story Bot to paste; Coder does not edit story_beats.md)
| §F/§W placeholder | Real map id (dev/wellspire-v2) | Notes |
|---|---|---|
| PLACEHOLDER_r9_wellspire | region `r9` / world_layout zone "wellspire" | hidden after `ending2_done` (`gone_flag`) |
| PLACEHOLDER_r9_old_riverbed | `r9_old_riverbed` | entry B, from Brookhollow |
| PLACEHOLDER_r9_skylift_upper | `r9_skylift_upper` | entry A, from Frostspire |
| PLACEHOLDER_r9_cairnfold | `r9_cairnfold` | town, locals kept |
| PLACEHOLDER_r9_lower_slopes (A1) | `r9_switchbacks` lower part | there is no separate slopes map |
| PLACEHOLDER_r9_switchbacks (A2) | `r9_switchbacks` + `r9_cloudway` | |
| PLACEHOLDER_r9_icefall / _icefall_cave (C1) | `r9_icefall` | |
| (echo cave, C2) | `r9_echo_cave` | |
| (extra outdoor + cave) | `r9_cloudline`, `r9_heart_cave` | |
| PLACEHOLDER_fin_summit_camp | `fin_summit_camp` | |
| PLACEHOLDER_fin_lab1_now_ext / _f1..f3 / fin_lab1_now | `fin_lab1_now_f1`, `_f2`, `_f3`, `fin_lab1_now` (summit dome) | |
| PLACEHOLDER_fin_past_station_m | `fin_past_station_m` | |
| PLACEHOLDER_fin_past_signal_lab | `fin_past_signal_lab` | |
| PLACEHOLDER_fin_past_lab1 | `fin_past_lab1_f1` to `_f4` | f1 is also the flashback tiles |
| PLACEHOLDER_fin_past_enclosure | `fin_past_enclosure` | |
| PLACEHOLDER_fin_past_riverbend | `fin_past_riverbend` | |
| PLACEHOLDER_lantern_rest | `lantern_rest` | |
| brookhollow_home (F5-2) | `house_2f` (bed), `house_1f` | |
| RT office (F5-4/5) | `heal_brookhollow` | Revival Tech Brookhollow branch |
| Tidewater cove (F5-7) | `tidewater_coast` near (44,33) | |
