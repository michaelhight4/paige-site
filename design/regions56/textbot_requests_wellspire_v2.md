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



# Wellspire v2 (Coder, Oct 29 2026, Gary 10:17 to 10:21 PM CT)

The climb (3 caves + 3 outdoor areas), the RT field research teams (every present-day Wellspire trainer), the cloud-split summit and the "it never happened" ending beats.
HOUSE RULE: the deeper story is only HINTED. No line may explain the time loop, the cover-up, RT studying the player, or the rebels being right. Keep it odd, contradictory, déjà vu. Speaker names come from the map NPCs (tools/wellspire/field_teams.py); the "Name:" prefix inside lines is house style, keep or drop as you like.

## r9.ft.r9_rb_hiker.intro
DRAFT:
- Wren: RT Hydrology, Team Cobalt. You too?
- Wren: This river has been dry for three hundred years. Our maps say there is no river. Our maps say there is no mountain.
- Wren: Show me what you've got.

## r9.ft.r9_rb_hiker.after
DRAFT:
- Wren: I keep measuring the riverbed. It keeps being a little deeper than yesterday.

## r9.ft.r9_rb_dowser.intro
DRAFT:
- Ansel: Field Researcher, Cobalt. Head Office sent us a letter. Handwritten. No signature.
- Ansel: Did yours smell of snow too?

## r9.ft.r9_rb_dowser.after
DRAFT:
- Ansel: Funny. I could swear you beat me last time as well.
- Ansel: ...There wasn't a last time. Forget I said that.

## r9.ft.r9_rb_guide.intro
DRAFT:
- Petra: Field Lead, Cobalt. Eleven years on the northern survey. Never once seen this valley.
- Petra: I don't like places that appear. Let's see if you're real, at least.

## r9.ft.r9_rb_guide.after
DRAFT:
- Petra: Keep going up. Everyone does, apparently.

## r9.ft.r9_skylift_rider.intro
DRAFT:
- Joss: RT Survey Pilot. I flew over this range on Tuesday. Clouds the whole way. Flat ground under them.
- Joss: Then I took the lift, and here we are.

## r9.ft.r9_skylift_rider.after
DRAFT:
- Joss: The lift timetable lists a stop up here. The ink is older than the lift.

## r9.ft.r9_sw_mountaineer_1.intro
DRAFT:
- Bram: Path Surveyor, Team Harrow. These switchbacks are cut by hand. Old hands.
- Bram: Nobody ever came up here. So who cut them?

## r9.ft.r9_sw_mountaineer_1.after
DRAFT:
- Bram: Every bend has a marker stone. One has your initials on it. Weathered.

## r9.ft.r9_sw_climber_1.intro
DRAFT:
- Ilse: Harrow. Do you get the feeling you've climbed this before? Every step, half a second early?

## r9.ft.r9_sw_climber_1.after
DRAFT:
- Ilse: There. You did the thing with your foot before the loose rock. Like you knew.

## r9.ft.r9_sw_survey_1.intro
DRAFT:
- Odo: Team Gannet, geology. This rock is old. Very old. And it isn't on a single core sample we own.

## r9.ft.r9_sw_survey_1.after
DRAFT:
- Odo: Maybe the samples are wrong. Maybe the rock is. I keep both in the same bag.

## r9.ft.r9_sw_survey_2.intro
DRAFT:
- Maren: Gannet. Someone at Head Office said "it would like to see you." It. Not they.
- Maren: I've been thinking about that word all day.

## r9.ft.r9_sw_survey_2.after
DRAFT:
- Maren: Sorry. Nerves. The mountain hums when you stand still. Some of the hum sounds like my own thoughts.

## r9.ft.r9_sw_survey_3.intro
DRAFT:
- Tobin: Field Lead, Gannet. We filed a report that this region doesn't exist. Head Office stamped it "noted".
- Tobin: Just "noted". Then they sent you.

## r9.ft.r9_sw_survey_3.after
DRAFT:
- Tobin: Go on. We'll write you down as "arrived". Again.

## r9.ft.r9_sw_climber_2.intro
DRAFT:
- Sela: Harrow. Last one before the ice. I'm meant to stop anyone who isn't ready.
- Sela: Nobody told me who decides that.

## r9.ft.r9_sw_climber_2.after
DRAFT:
- Sela: Ready, then. Or something like it.

## r9.ft.r9_ic_climber_1.intro
DRAFT:
- Nils: Team Sedge, ice cores. The ice here has layers for every winter. Thousands of them.
- Nils: And they're all the same winter.

## r9.ft.r9_ic_climber_1.after
DRAFT:
- Nils: Same snow, same ash, same dust. Over and over. Ice doesn't do that.

## r9.ft.r9_ic_climber_2.intro
DRAFT:
- Hedda: Sedge. You're the one from Brookhollow? You came through here in spring.
- Hedda: ...Didn't you? I have a photo. It's blurry.

## r9.ft.r9_ic_climber_2.after
DRAFT:
- Hedda: The photo's blank now. I'm sure it wasn't.

## r9.ft.r9_ic_diver.intro
DRAFT:
- Cass: Cave Diver, Sedge. The water down there is warm. In a glacier.
- Cass: Something below is keeping it awake.

## r9.ft.r9_ic_diver.after
DRAFT:
- Cass: I hear a heartbeat when I dive. Slow. Patient.

## r9.ft.r9_ic_keeper.intro
DRAFT:
- Rook: Field Lead, Sedge. Our radio picks up a signal up here. It's RT's old call sign.
- Rook: The one from before the rebellion. Nobody's used it in a lifetime.

## r9.ft.r9_ic_keeper.after
DRAFT:
- Rook: It repeats your employee number. I didn't tell you that.

## r9.ft.r9_cw_field_1.intro
DRAFT:
- Fenna: Weather Watcher, Team Lark. The clouds up here don't move with the wind. They move with you.
- Fenna: Walk left. See?

## r9.ft.r9_cw_field_1.after
DRAFT:
- Fenna: My barometer reads "fine" with a little picture of a sun. It never had a picture.
- Fenna: Up here you have to keep your thoughts tidy. Head Office says don't let it in your head. Never said what "it" was.

## r9.ft.r9_cw_field_2.intro
DRAFT:
- Dov: Lark. The plates in the stone here are RT design. Old RT. Pre-rebellion.
- Dov: So either RT built this, or someone wants us to think it did.

## r9.ft.r9_cw_field_2.after
DRAFT:
- Dov: Either way, the plates know your weight. They clicked before you stepped.

## r9.ft.r9_cw_field_3.intro
DRAFT:
- Linnea: Field Lead, Lark. Head Office says we're here to observe the disturbance.
- Linnea: Funny thing. The disturbance arrived when you did.

## r9.ft.r9_cw_field_3.after
DRAFT:
- Linnea: Observing. As instructed. Don't mind me.

## r9.ft.r9_ec_field_1.intro
DRAFT:
- Ezra: Sound Recordist, Team Quill. Clap once.
- Ezra: ...The cave answers twice. The second one is a little bit late. Like a memory.

## r9.ft.r9_ec_field_1.after
DRAFT:
- Ezra: I recorded our battle. On the tape it's already over before it starts.
- Ezra: And my pen keeps ending up back in my hand. I put it down. It's in my hand.

## r9.ft.r9_ec_field_2.intro
DRAFT:
- Nadia: Archivist, Quill. I brought every RT record that mentions this mountain.
- Nadia: It's an empty bag. I carry it anyway. It's heavy.

## r9.ft.r9_ec_field_2.after
DRAFT:
- Nadia: One record did turn up. A field researcher's file. The researcher and the subject have the same name.
- Nadia: Clerical error, probably. Most things are.

## r9.ft.r9_cl_field_1.intro
DRAFT:
- Gus: Cartographer, Team Moraine. I've drawn this ridge four times today. Every map comes out different.
- Gus: Except the bit where you're standing. That's always the same.

## r9.ft.r9_cl_field_1.after
DRAFT:
- Gus: I'll leave you off the map. Seems polite.

## r9.ft.r9_cl_field_2.intro
DRAFT:
- Yara: Moraine. The ice here doesn't slide. It waits.
- Yara: Sorry. That doesn't mean anything. It's just what it feels like.

## r9.ft.r9_cl_field_2.after
DRAFT:
- Yara: My grandmother had a word for this place. She was one of the people who left RT, back then.
- Yara: She said every creature on the continent was made in a lab. Everyone called her silly.
- Yara: She never remembered the rebellion night the way the rest of us do. Said it never got into her head.

## r9.ft.r9_cl_field_3.intro
DRAFT:
- Hal: Field Lead, Moraine. They warned us about the top. Not what's there. Just "don't look straight at it."
- Hal: Who's "they"? Good question. The memo was signed by us.

## r9.ft.r9_cl_field_3.after
DRAFT:
- Hal: Our own signatures. I don't remember signing. Neither does anyone.

## r9.ft.r9_hc_field_1.intro
DRAFT:
- Ione: Senior Researcher, Team Vesper. We've been waiting. Longer than you'd think.
- Ione: You always come up the cave on the left. Today you came up the left. Good.

## r9.ft.r9_hc_field_1.after
DRAFT:
- Ione: Don't worry. We write everything down. It helps, a little.

## r9.ft.r9_hc_field_2.intro
DRAFT:
- Corwin: Vesper. I keep a list of things I remember that didn't happen.
- Corwin: You're on it. Twice.

## r9.ft.r9_hc_field_2.after
DRAFT:
- Corwin: Three times now. Funny. I can't remember packing for this trip.

## r9.ft.r9_hc_field_3.intro
DRAFT:
- Agathe: Field Director, Vesper. Head Office asked me for one thing. Watch the field researcher closely.
- Agathe: I asked which researcher. They said "the one who is watching."
- Agathe: Let's begin.

## r9.ft.r9_hc_field_3.after
DRAFT:
- Agathe: The summit is just above. Whatever you see there, write it down before you blink.

## r9.cloudway_note
DRAFT:
- A survey peg, RT blue. The tag reads: "Cloudway. Surveyed by RT, year of the founding."
- Under it, newer pencil: "This path was not here this morning."

## r9.cloudway_note_2
DRAFT:
- Stones are stacked into a little cairn. One for each person who has climbed past.
- You count them. You stop counting at your own age.

## r9.echo_note
DRAFT:
- Writing scratched into the cave wall, old and careful: "EVERY ONE OF THEM CAME OUT OF A LAB. WE REMEMBER. WE WERE NOT MAD."
- Under it, smaller: "don't let it in your head"

## r9.echo_note_2
DRAFT:
- A field notebook left on a ledge. Every page has the same entry, in slightly different handwriting:
- "Subject arrived. Subject climbed. Subject went up. Subject came back down. Subject does not remember."

## r9.cloudline_note
DRAFT:
- A weather board, frozen. The forecast for tomorrow has been chalked in already: "Same as today."

## r9.cloudline_note_2
DRAFT:
- A torn leaflet, the kind the rebels handed out. Only one line is left:
- "...they don't need saving. They need us to stop looking."

## r9.heart_note
DRAFT:
- An RT staff locker. Inside: a field team jacket your size. The name patch has been unpicked.

## r9.heart_note_2
DRAFT:
- A visitor log, very old. Most names are faded to nothing.
- The last line is fresh. It is your name. The date is blank.

## fin.summit_cairn
DRAFT:
- A cairn at the top of the world. Someone has left a thermos on it.
- It is still warm. It is exactly like Ron's.

## fin.past_logbook
DRAFT:
- Night shift log, Lab 1. "Enclosure stable. Subject calm. All doors sealed."
- "Visitor: one. Signed in by: nobody. Description: field jacket, about your height, looked like they'd been here before."

## fin.summit.clouds
DRAFT:
- The cloud is so thick you cannot see your own hands.
- Then the mountain breathes in.

## fin.summit.reveal
DRAFT:
- The clouds tear open from the middle.
- Light comes down like a staircase, and at the bottom of it, taller than the spire, is Ondravel.
- You have the strangest feeling that he is surprised you are on time.

## fin.summit.flare
DRAFT:
- The crystal on his brow catches. The whole sky turns violet.
- He does not speak. You understand him anyway.

## fin.never.summit_empty
DRAFT:
- The summit is quiet. Snow, sky, the crystal ring.
- There are no footprints in the snow. Not his. Not yours.

## fin.never.letter_blank
DRAFT:
- You take the Head Office letter out of your bag to read it again.
- The paper is blank. It has always been blank. Hasn't it?

## fin.never.rita
DRAFT:
- RITA: I have no record of a courier, {employee_id}.
- RITA: I do have a record of you reading the letter. Seven times.

## fin.never.keeper
DRAFT:
- Keeper: The old rebellion stories have a kid in them. Field jacket. Walked into Lab 1 and let the light out.
- Keeper: My gran told it to me when I was small. Funny. The kid looked a lot like you.

## fin.never.teo
DRAFT:
- Teo: The readings from the summit came back. Flat. Nothing has been up there for centuries.
- Teo: ...Then why does everyone in Cairnfold remember the light?

## fin.never.mum
DRAFT:
- Mum: What letter, love?

## fin.never.head_office
DRAFT:
- There is a new envelope on the bench. Cream paper. Your name by hand.
- "Thank you, {player}. Your report has been filed with the others."
- "See you next year."

## fin.never.teams_home
DRAFT:
- Down in the lowland towns, the RT field teams wake up at home, one by one.
- There is mountain dust and ice-melt on their boots by the door. Each of them has a blank letter in a coat pocket.
- Every clock in their houses stopped at the same minute. Nobody can say where the last few weeks went.
- "Must have been a long shift," somebody says. Somebody always says that.

## fin.home.wake
DRAFT:
- Dawn. You wake up in your own bed.
- The crystal on the shelf glows the way it always does. The violet throb is gone from it.
- Your boots by the bed are dusty with something pale, like ice-melt dried in the sun.

## fin.home.to_work
DRAFT:
- You have to tell RT. All of it. The mountain, the teams, him.
- Time to go to work.

## fin.walk.spring
DRAFT:
- By the bridge, a thin trickle runs in the dry riverbed. Nobody seems to notice.
- In the mud, one big wet print, heading downstream.

## fin.walk.ron
DRAFT:
- Ron is taking the bins out. He waves.

## fin.report.form
DRAFT:
- RITA's report form is already open on the front desk, titled with your ID number.
- The body of it is blank.

## fin.report.arrive
DRAFT:
- Through to the field team room. Teo, Marta, Pell and Imke are at their desks as if they never left. The kettle is on.
- There is mountain dust on their boots.
- You open your mouth to tell them where you've been...

## fin.report.greeting
DRAFT:
- Teo: Morning! Kettle's just boiled. Want one?

## fin.report.teo_list
DRAFT:
- On Teo's desk is a list. "Find source" is crossed off, in a hand he doesn't seem to recognise.
- You can't remember what you came in to say. It doesn't seem important.

## post.duty_board_home
DRAFT:
- At the Revival Centre, the RT duty board lists every Wellspire team as "Home".
- There is no departure entry, and no return entry.

## fin.never.collapse
DRAFT:
- Far to the north, past the old riverbed, something folds quietly away. Nobody looks up.

## dream.post_e2
DRAFT:
- The lab, long ago. Rows of tanks glow in the dark. Small shapes turn over inside them.
- Staff in white coats write on clipboards. A light flashes over each tank, and the shape inside it flinches.
- Many small lights press against a glass dome. You are not in it.

## r9.gone_riverbed
DRAFT:
- The old riverbed runs north a little way, then stops at a bank of grass.
- There is nothing up there. There never was, as far as you can see.

## r9.gone_skylift
DRAFT:
- "UPPER LINE: SERVICE SUSPENDED." The sign is thick with dust.
- A field team clipboard hangs on the gate. The sign-in sheet has eight team names signed in, and none signed out. Every one of them is home.

## fin.never.last
DRAFT:
- Far to the north, above the clouds, something very old closes its eyes.
- It might be sleeping. It might be smiling. It is hard to tell from here.
