# Text Bot requests: Wellspire + finale (Coder, Oct 29 2026)

Source: design/regions56/story_beats.md §F (§F8 keys). Write each key at the ROOT of text/overworld_lines.json (dotted path = nested objects; value = array of pages or {pages:[...]}). Until a key exists the game shows the DRAFT below (src/region9/text_fallback.js). Placeholders: {player}, {lead}, {employee_id}. Blocked words apply.

Story rules: the field team is home only in Ending 2; the river comes back slowly; crystals keep working; no young Vane. [SAMPLE] lines stay as written ("Dry. Every one.", "EMPLOYEE NOT FOUND.", "No. Don't tell me. I'd only have to forget it.", "Eight. It's a good bench.", "Didn't need it. Best kind of stone to lose.").

Credits 2: system_ending2.credits_open / credits_coins_head / credits_ron / credits_rita / credits_bin / credits_end. Crew stays: Gary Hight, plus "Grok Bot was used in the production of this game."

## courier.knock
DRAFT:
- Knock knock knock.
- Someone is at the front door.

## courier.dry_every_one
DRAFT:
- The Coast Road postman. Soaked to the knees, and proud of it.
- Letters for you. Dry. Every one.

## letter.ho_assignment
DRAFT:
- A cream envelope. Heavy paper. Your name written by hand.
- "Dear {player}, and dear {lead}. We hope the soup was warm and the bins went out. We are so proud of you both."
- "Thank you for everything you have done for them."
- "There is a disturbance on Wellspire, at the top of the old river. We think it would like to see you. Nothing bad will happen. Take a coat."
- "With love, Head Office."
- No signature. No employee number. Just that.

## letter.team_postcard
DRAFT:
- A postcard, too. A snowy peak on the front.
- "Snowed in up north. All fine. Teo says hello. Marta says the benches here are a 3." - the field team

## rita.letter_qr
DRAFT:
- The letter has a QR code. Your phone buzzes.
- RITA: I didn't write this one, {employee_id}.
- RITA: ...Wear a coat.

## mum.letter_react
DRAFT:
- Mum: Who writes to a child like that?

## ron.letter_react
DRAFT:
- Ron leans over your shoulder and reads it.
- Ron: "With love." ...Yeah, I'd be scared too.

## ron.thermos
DRAFT:
- Ron: Here. Nan's soup. I'm not coming, I've got bins.
- Ron: Bring the flask back. She counts them.
- You got a thermos of Nan's soup.

## r9.unlocked
DRAFT:
- The Skylift Upper Line at Frostspire is running again. And the old riverbed north of Brookhollow is dry enough to walk.

## r9.riverbed_entry
DRAFT:
- The river you grew up beside. North of here, the bed is dry all the way up.

## r9.riverbed_entry_ask
DRAFT:
- Walk up the dry riverbed?

## r9.name_sign
DRAFT:
- OLD RIVERBED. To Wellspire and Cairnfold.
- Someone has scratched underneath: "where did it go?"

## r9.riverbed_marks
DRAFT:
- Old water marks on the bank, far above your head.
- The river used to be this deep.

## r9.riverbed_up
DRAFT:
- The bed climbs into the hills. Cairnfold is up ahead.

## r9.cairnfold_down
DRAFT:
- The dry riverbed runs all the way down to Brookhollow.

## r9.skylift_entry
DRAFT:
- SKYLIFT UPPER LINE. Service resumed at Head Office's request. Have a lovely trip.

## r9.skylift_entry_ask
DRAFT:
- Ride up to Wellspire?

## r9.skylift_notice
DRAFT:
- A typed note: "This line has been paid for. Please run it. Thank you so much." No name.

## r9.skylift_down
DRAFT:
- Ride back down to Frostspire?

## r9.skylift_operator
DRAFT:
- I never got a letter. Just a note that it was paid for.
- Paid for by who? It doesn't say. It just says thank you.

## r9.cairnfold_sign
DRAFT:
- CAIRNFOLD. Highest village on the old river. Mind the goats.

## r9.cairnfold_herder_1
DRAFT:
- Violet nights for a month now. The goats won't sleep.

## r9.cairnfold_herder_2
DRAFT:
- The light comes off the top of the peak. Like a heartbeat.

## r9.cairnfold_elder
DRAFT:
- My gran said the river came out of the mountain. Then one year it didn't.

## r9.cairnfold_kid
DRAFT:
- I drew the thing in the sky! It's a fish. A sad big fish.

## r9.cairnfold_weaver
DRAFT:
- Visitors from Head Office? No. They only ever send letters up here.

## r9.cairnfold_walker
DRAFT:
- The switchbacks are south of the village. Snow all the way.

## r9.cairnfold_lodge_fan
DRAFT:
- Have you seen the Lodge? They sell the Legend of Ondravel. Lovely tea towels.

## r9.cairnfold_watcher
DRAFT:
- Some nights the light pulses. Some nights it just... waits.

## r9.cairnfold_baker
DRAFT:
- Bread's fresh. Water's from the snow. Has been for fifty years.

## r9.kid_drawing
DRAFT:
- A child's drawing pinned to the wall: a big sad fish in a violet sky.

## r9.lodge_clerk
DRAFT:
- Welcome to the RT Heritage Lodge! Legend booklets, tea towels, a little crystal fish.

## r9.lodge_legend
DRAFT:
- THE LEGEND OF ONDRAVEL: a kind spirit sleeps in the peak and blesses the valley with crystal light.
- You know better.

## r9.switchbacks_up
DRAFT:
- A frozen waterfall. The old river's top. The cave goes in behind the ice.

## r9.survey_crew_1
DRAFT:
- RT survey crew. We all got kind letters. "Please go and look."

## r9.survey_crew_2
DRAFT:
- I say we don't go up. Nobody's ever that nice in a letter.

## r9.survey_crew_3
DRAFT:
- We'll argue about it after. You go, if you're going.

## r9.icefall_signal
DRAFT:
- The signal is strongest here. In the ice, your team's crystals show their own colours.

## r9.trainer_after
DRAFT:
- Go on up. It's waiting for you, I think.

## summit.camp.teo
DRAFT:
- Teo: You found us! Snowed in, all alive.
- Teo: We followed the ore north. Item one on my list: find the source. Still not crossed off.

## summit.camp.marta
DRAFT:
- Marta: The bench here? A 2. It's a log.
- Marta: Go up if you have to. We'll keep the fire going.

## summit.camp.pell
DRAFT:
- Pell: I've drawn the spire forty times. It looks different every time.

## summit.camp.imke
DRAFT:
- Imke hums a tune. You know it from somewhere. A dream.
- Imke: We stay here. You go. Come back down.

## summit.camp_fire
DRAFT:
- The camp fire. Warm. Your team rests by it.
- Your Kilu are fully healed.

## summit.spire_door_wait
DRAFT:
- A crystal door. It hums. Find the field team first: they're at the camp.

## summit.spire_door
DRAFT:
- The crystal door hums open for a creature showing its own colour.

## summit.team_morning
DRAFT:
- Morning at the summit camp. The spire is quiet.
- Teo crosses "find source" off his list.
- Teo: Let's go home.

## r9.spire_f1_nursery
DRAFT:
- A Line 1 nursery. Little beds, fifty years cold.

## r9.spire_f2_chair
DRAFT:
- The Test 7 room. An empty control chair, facing the wall.

## r9.spire_f3_growth
DRAFT:
- Kilumora crystal has grown over everything here. Violet, humming.

## r9.spire_keeper_after
DRAFT:
- Facility Keeper. We only ever got letters, too.

## r9.floor_locked
DRAFT:
- The stairs are sealed with crystal. The keeper on this floor holds the key light.

## fin.guardian_plea_1
DRAFT:
- A dome, grown solid with violet crystal. Something huge is inside.
- Its forehead crystal is cracked and dim.

## fin.guardian_plea_2
DRAFT:
- The river tune from your dream starts to play.
- {lead}'s crystal shows its own colour. The creature in the dome looks at that, not at you.

## fin.guardian_plea_3
DRAFT:
- It is not ordering. It is asking.

## fin.guardian_plea_ask
DRAFT:
- Put your hand on the dome?

## fin.timeslip
DRAFT:
- The screen floods with river blue.
- Water rising. Rain. A storm.

## fin.past_arrive
DRAFT:
- A river bank in a storm. The river is full, higher than any mark you have seen.
- Violet light throbs like a heartbeat. Your team flinches, then steadies.

## fin.reader_reject
DRAFT:
- The door reader reads your lanyard.
- EMPLOYEE NOT FOUND.
- ...Your phone is quiet. RITA isn't here. Not yet.

## fin.m.handler_1
DRAFT:
- Annexe handler. Stay back! The batch is loose!

## fin.m.handler_2
DRAFT:
- These bands were meant to calm them. They don't!

## fin.m.handler_3
DRAFT:
- Who are you? You're not on the night list!

## fin.m.handler_after
DRAFT:
- Just get out. Get everyone out.

## fin.m.boss_greave_intro
DRAFT:
- Dr. Ansel Greave, Annexe Lead. I am holding this batch.
- If it goes, so do my staff's jobs. I won't let it.

## fin.m.boss_greave_lose
DRAFT:
- ...You're right. The jobs don't matter if the people drown.

## fin.m.boss_greave_after
DRAFT:
- Greave hauls the sluice wheel round.
- The Line 14 batch pours out into the river bend. His staff run for the door.
- Greave: Write it down as a field trial. Nobody will ask.

## fin.m.sluice
DRAFT:
- The sluice gate to the river. The wheel is open now.

## fin.m.sluice_shut
DRAFT:
- The sluice gate to the river. Greave's staff won't let you near it.

## fin.m.current
DRAFT:
- You let the full river carry you down to the coast.

## fin.t.tech_1
DRAFT:
- Signal tech. Test 7 broke something. We're trying to fix it!

## fin.t.tech_2
DRAFT:
- Every pulse is louder. Can you hear it?

## fin.t.tech_3
DRAFT:
- Holt says Test 8 will get control back. I hope she's right.

## fin.t.tech_after
DRAFT:
- Go. Talk to Holt. Please.

## fin.t.coralie_door
DRAFT:
- A young tech by the tea trolley. Her badge says FINCH, C.
- Coralie: You're not staff. ...Come on. I'll open the tide door.

## fin.t.coralie_name
DRAFT:
- Coralie: What's your name?

## fin.t.coralie_name_cut
DRAFT:
- No. Don't tell me. I'd only have to forget it.

## fin.t.coralie_wait
DRAFT:
- Coralie: I made the tea. That's all I'm meant to do tonight.

## fin.t.tide_door
DRAFT:
- The tide door. Coralie has left it unlocked.

## fin.t.tide_door_shut
DRAFT:
- The tide door is locked.

## fin.t.boss_holt_wait
DRAFT:
- Holt: Techs only past the console. Who let you in?

## fin.t.boss_holt_intro
DRAFT:
- Dr. Maren Holt, Signal Lead. Test 8 runs now. More power, more control.
- Move.

## fin.t.boss_holt_lose
DRAFT:
- ...It would have finished it. Wouldn't it.

## fin.t.boss_holt_after
DRAFT:
- Holt sits down hard. She does not touch the console again.

## fin.t.coralie_plug
DRAFT:
- Coralie pulls the Test 8 plug herself. Her hand shakes.
- She writes the last row of the run sheet. You don't read it to her.

## fin.t.plug_done
DRAFT:
- The Test 8 plug hangs loose. The run sheet is full.

## fin.t.plug_wait
DRAFT:
- The Test 8 console. Holt is standing in front of it.

## fin.t.light_pull
DRAFT:
- River blue pulls you back up the river, all the way to its source.

## fin.lab1.staff_1
DRAFT:
- Containment staff. Nobody goes up!

## fin.lab1.staff_2
DRAFT:
- Line 1 is the danger. The Chief said so.

## fin.lab1.staff_3
DRAFT:
- The walls are humming. Please turn back.

## fin.lab1.staff_4
DRAFT:
- The Chief holds the top landing. You'll have to go through me first.

## fin.lab1.staff_after
DRAFT:
- Go on, then. Up.

## fin.lab1.chief_wait
DRAFT:
- The Chief: Nobody reaches the landing while my staff still stand.

## fin.lab1.chief_intro
DRAFT:
- The Chief: That thing is the source of all this. It stays shut in.
- It's hurting. I know. It stays shut in.

## fin.lab1.chief_lose
DRAFT:
- The Chief: ...Then you go. I won't watch.

## fin.lab1.chief_after
DRAFT:
- The Chief stands aside from the landing.

## fin.lab1.window_lights
DRAFT:
- Through the window: three labs. Their lights go out one by one.

## fin.dome_touch
DRAFT:
- A clear dome. Line 1 inside, thrashing. Its forehead crystal is freshly cracked.
- You put your hand on the dome. {lead} presses its crystal to it.
- Its own colour runs into the crack. The dome splits.

## fin.released
DRAFT:
- Free. Still screaming the cracked signal. It turns on you: not hate. The pain looking for somewhere to go.

## fin.battle.phase_1
DRAFT:
- Phase 1: Violet. The maddened signal hits your team with every pulse.

## fin.battle.phase_2
DRAFT:
- Phase 2: Flood. The full river pours into the dome.

## fin.battle.phase_3
DRAFT:
- Phase 3: Own colour. Its crystal flickers river blue. The dream's tune comes back.

## fin.battle.lost
DRAFT:
- The light throws you back to the top landing. Your team is healed. Try again.

## fin.battle.won
DRAFT:
- Ondravel lowers its head to {lead}. The pulse stops.

## fin.riverbend_dawn
DRAFT:
- Dawn. Ondravel carries you down the river to a wide bend.
- Boats are coming. It lies down in the bend and stays. It already knows this is how it goes.
- It nudges you back toward the light.

## fin.present_release
DRAFT:
- River blue fades. The present. The same dome, the same Ondravel. It has waited fifty years for you.
- The old crystal crumbles from the inside. It steps out.
- Every crystal stays on and keeps working. But the throb in the violet is gone.
- Up at the summit, the dry spring trickles.
- Ondravel bows to {lead}, not to you, and goes down the old riverbed toward home.

## fin.epilogue.team_arrive
DRAFT:
- Lantern Rest. The field team walks in with you from the mountain road. All of them.
- Ron is already there with the keeper.

## fin.epilogue.keeper_bench
DRAFT:
- The keeper lifts the blank stone away and sets a bench there.
- Keeper: Didn't need it. Best kind of stone to lose.

## fin.epilogue.marta_bench
DRAFT:
- Marta: Eight. It's a good bench.

## fin.epilogue.teo_readings
DRAFT:
- Teo: Keep a copy of these. The drift readings.
- Teo: Crystals work. So does this. People get to choose now.

## fin.epilogue.pell
DRAFT:
- Pell: I drew the spire one more time. It looks quiet now.

## fin.epilogue.imke
DRAFT:
- Imke hums the river tune. This time it ends.

## fin.epilogue.bench
DRAFT:
- The new bench. Marta gave it an eight.

## fin.epilogue.coralie
DRAFT:
- Coralie: I knew your face the minute you walked in. I couldn't say. You hadn't done it yet.

## fin.epilogue.postgame
DRAFT:
- THE END.
- The river comes back slowly. Your save keeps going.

## fin.retry_heal
DRAFT:
- Your team is healed. Try again.

