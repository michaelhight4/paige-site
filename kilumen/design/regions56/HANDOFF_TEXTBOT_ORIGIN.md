# Text Bot handoff: origin reveal (R5/R6) + finale
*Story Bot, Thu Oct 29 2026, 3:08 PM CT. Source: `design/regions56/story_beats.md`, section "✅ CANON (Gary approved, Oct 29 3:05 PM CT)" (D0-D10) and §F (finale, DRAFT). [SAMPLE] lines are tone only; you write the final lines.*
**Rules:** 2 x 40 chars per page; no blocked words (route, berry, PP, shiny, throw for capture, Pokédex, nurse, weed, super effective); "coin"; no drink/smoke/drug hints. **Nobody ever says "they were made" outright**: Coralie implies, Ron infers as questions, and the logs show data. No Master hints at it. No Vane, no Stranger, no release talk in R5/R6.

## CANON keys
| Key | Who / what | Intent | Tone |
|---|---|---|---|
| `lore.r5.plaque_old` | old plaque under the new one | Only "...LINE 14 BREEDING ANNEXE" readable | flat, institutional |
| `lore.r5.jar_species` | jar row label | Species names + generation, not core numbers | label text; the horror is in the plainness |
| `lore.r5.term_log_1..3` | Terminal 1, 3 pages | released to the bog → lost, sealed → Head Office: "count what got out. Do not say 'got out'." | dry memos; page 3 a quiet gut-punch |
| `lore.r5.visitor_dc` | Marta, visitor book | "Damage control, they call it. We call it a census." | warm, wry |
| `lore.r5.marta_census_line` | Marta's last camp page | "I don't think they're escapes. I think they live here now." | gentle doubt |
| `rita.lab_m.exit` | RITA | research is a perk, "not a story" | sarcastic, {employee_id} |
| *(changed intent)* Station M counter | inspect | tally of escapes counted back | ache |
| `lore.r6.term_index_header` / `lore.r6.term_index_row` | Terminal 2 | template {dex_no} {species} {line} {facility}; Line 1 = 442 river unit, Line 2 = 443 | database cold |
| `lore.r6.breakout_log_1..3` | three labs, same week | unresponsive → attacking staff → breached; map circles Revival Heights | escalating, short |
| `lore.r6.test7_sheet` | run sheet | objective "single-carrier command, all lines", source Line 1, load 140%; last row shaky: "Source crystal fracture. All lines reacting." | technical, then broken handwriting |
| `lore.r6.brief` | unsigned brief | containment → companionship; damage control → research | corporate irony, unsigned (NOT Vane) |
| `lore.r6.teo_note_v2` | Teo, visitor sheet | "maybe the scanners are wrong" | list-maker, hopeful |
| `rita.lab_t.exit`, `rita.lab_t.exit_beat` | RITA | "session noted" … pause … "Have a nice day." (her only stumble) | sarcasm cracks once |
| `ron.r6.lab_join` | Ron, cave mouth | boat's not till the tide turns; he's coming in to "read the signs out loud" | bravado over nerves |
| `ron.r6.cheer` | Ron, during reef battles | one line each, optional | best-friend heckling |
| `ron.r6.index_react` | Ron at Terminal 2 | finds his partner's line; jokes, then doesn't | joke dies halfway |
| `ron.r6.logs_react` (+ `_short` cove variant) | Ron | works it out loud as questions: "...So before that week there weren't any." Revival Heights: he did the bins there | quiet, no rage |
| `ron.r6.still_mine` | Ron to his partner | "Still mine, though. Right?" | the soul beat of the reveal; the lead creature leans on him |
| `ron.r6.boat_leave` | Ron, cove | jokes to cover it; "Don't read anything else without me." | warm; Ron motif major |
| `npc.confessor.c1` | Coralie | "Everyone reads the shelf." | tired |
| `npc.confessor.c2` | Coralie | "Read the dates." | pointing, not telling |
| `npc.confessor.c3` | Coralie | the job: counting, bringing back, mopping up | plain |
| `npc.confessor.c3b_cause` | Coralie, to Ron's Test 7 question | "I was on nights that week. I made the tea. ...That's all I'm saying." | REWORKED: implied only; also the finale loop (she made the tea that night) |
| `npc.confessor.c4` | Coralie | her partner was a "retrieval"; she'd fight anyone who called it an escape | fierce love |
| `npc.confessor.c5` / `c5_warmth60` | Coralie | asks the lead creature's name / sees its colour: "Theirs did that too. Your four." | soft |
| `npc.confessor.c6_ron` | Coralie to Ron | "Always was." | one nod |
| `seed.r1.home_drawing`, `seed.r1.mum_drawing` | R1 home | Grandad's river with no creatures; "very quiet" | homely |
| `seed.r2.poster_fineprint` | Revival Centre poster | "since the Incident" | tiny fine print |
| `seed.r2.stone_stamp` | old stones, after `lore_origin_full` | "RT Heritage Office" stamp; the Glyph Scholar line stays | discovery |
| `seed.r3.club_enraged` | Club patron | "my dad said that's what the first lot were like" | offhand |
| `seed.r4.returned_board` | Greystone/Frostspire | "Returned: ###" | lost-and-found feel |
| `dex.field.line`, `dex.field.heritage_note` | Dex | "Line: —" until reveal; "Entry source: RT Heritage Office." | UI text |
**Removed (don't write):** `ron.lanternport.origin_aside`, `master.wenna.origin_aside`, `dex.field.line_none`.

## DRAFT keys (finale §F; write only after Gary approves)
- **Arrival:** `fin.guardian_plea_*`, `fin.reader_reject`
- **Station M:** `fin.m.handler_1..3`, `fin.m.boss_greave_intro/lose/after`, `fin.m.sluice`
- **Signal Lab:** `fin.t.tech_1..3`, `fin.t.boss_holt_intro/lose/after`, `fin.t.coralie_door`, `fin.t.coralie_name`, `fin.t.coralie_plug`
- **Spire:** `fin.lab1.staff_1..4`, `fin.lab1.chief_intro/lose/after`, `fin.lab1.window_lights`
- **Dome and battle:** `fin.dome_touch`, `fin.battle.phase_1..3`
- **Return:** `fin.riverbend_dawn`, `fin.present_release_b_yes`, `fin.present_release_b_alt`
- **Epilogue:** `fin.epilogue.team_arrive`, `fin.epilogue.marta_bench`, `fin.epilogue.coralie`
- **Tone:** the research staff are scared people, not villains; the Guardian is in pain, not evil; no Vane.

- Story Bot ruling (Oct 29 2026, 3:12 PM CT): 443 Kilumora = "Line 2, Facility 1" (both originals from the first lab/spire). Ron partner lines use {ron_partner_species}/{ron_partner_line} since his team follows the player starter (counter-starter); starters are later Facility lines. ron.r6.boat_leave placement waits on Gary (G6 timing).

## Added 3:20 PM CT: two-ending structure (structure CANON, keys DRAFT, see §F-A to F-C)
- **Ending 1 / courier:** `end1.credits_last_card`, `end1.keeper_not_yet`, `courier.knock`, `courier.dry_every_one` (the R6 Coast Road postman), `letter.ho_assignment` (bland perks-form tone recommended; unsigned "Head Office"; NOT Vane), `letter.team_postcard` ("Still counting. Don't carve anything." + frog doodle), `rita.letter_qr`, `ron.letter_react`, `ron.thermos` (soup), `mum.letter_react`
- **Summit:** `summit.sign_*`, `summit.trainers_*`, `summit.camp.teo/marta/pell/imke`, `summit.team_morning`

## Added 3:24 PM CT: Gary's answers F2/F6/F7/F8/F9/F10 (CANON) and new keys
- **CANON:** crystals keep working after the release (F2), the Guardian is **Ondravel** (Dex 442, F6), the letter is **eerily kind** (F7), the field team comes home only in Ending 2 with a postcard in Ending 1 (F8), the mountain is a full region (F9), and the final tower is the Aurelith Games Stadium (F10).
- **Rewritten intent:**
  - `letter.ho_assignment`: warm, personal and too knowing. It names the lead creature, Mum's soup and the Stadium. It asks a "favour". Signed "With love, Head Office". No threat.
  - `rita.letter_qr`: "I didn't write this one."
  - `ron.letter_react`: "'With love.' ...Yeah, I'd be scared too."
- **Removed:** `fin.present_release_b_yes`, `fin.present_release_b_alt` and the flag `fin_ending_b`.
- **Replaced by:** `fin.present_release`, where crystals stay on, the throb goes, the spring trickles and Ondravel bows to the lead creature.
- **New keys:**
  - Stadium: `stadium.floor8_run_line`, `stadium.lobby_banner`, `ron.tower_top_wait`, `ron.bottom_congrats`, `ron.ron7_intro/lose/after` (DRAFT; `ron.roof_heal` removed 5:17 PM CT)
  - Region (placeholder name Wellspire): `r9.name_sign`, `r9.riverbed_marks`, `r9.skylift_notice`, `r9.cairnfold_*`, `r9.lodge_legend`, `r9.kid_drawing`, `r9.survey_crew_1..3`, `r9.icefall_*`, `r9.spire_f1..f3_*`
  - Epilogue: `fin.epilogue.teo_readings`
- **CLOSED (CANON, Gary, 5:55 PM CT, via Coder):** F3 Coralie's "I knew your face" epilogue is kept (`fin` epilogue Coralie key, write final); F4 boss names Greave, Holt and the Chief stay; G6: beating the Tidewater Master forces the low tide (flag `tidewater_low_tide_forced`), which fires `ron.r6.boat_leave` at the cove.
- **Still OPEN, don't write final:** a young Vane (F1; the 3:25 PM note says no), the river return speed (Q-F12) and the mountain name (Q-F13), unless the 3:25 PM picks below already closed them.

- 3:25 PM CT: mountain = Wellspire; roof fight = Ron 7 with pre-fight heal (ron.roof_heal) [SUPERSEDED 5:17 PM CT: no heal; Ron 7 at the Stadium bottom]; river returns slowly; no young Vane.
