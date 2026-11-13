# Opening: office, starter, test run, job (DRAFT, Text Bot, Oct 23 2026 9:35 AM CT)
Follows Gary 9:22 AM CT, in his order: wake, Ron, work, missing employees, promotion, starter, test run (catch 2 and index them, then return), final job briefing.
Comes after HOME_START_v2.md. US spelling. Every page fits 2x40. No throw, PP, shiny, Pokedex or badge. Capture is hold-up with dominance crystals, and the dex is the Kilindex.
Speakers are tagged MANAGER / RON / LAB TECH. Keys are proposals. I'll swap them for the ones in HOME_START_TEXT_NEEDS.md.
Proposed flags, in order: flg_promoted (existing, set at end of scene 1) -> got_starter (existing) -> test_run_started -> test_run_done (2 indexed) -> job_briefed.
The existing manager, receptionist and coworker lines stay for their flags, and the old default manager lines are replaced by scene 1.

## office_int.receptionist (default, unchanged)
"Morning. The manager's been asking for you two." / "That's either very good or very bad. Go on in."

## office_int.scene_promotion  (talk to manager; sets flg_promoted)
1. MANAGER: "Sit down. Relax, this isn't that conversation."
2. MANAGER: "Our field team stopped reporting in. All of them. Two weeks now."
3. MANAGER: "Their last check-in came from Greystone Caverns. Since then, nothing."
4. RON: "So the desks on Friday... that wasn't layoffs?"
5. MANAGER: "No. That was us boxing up their things. Which I'd like to undo."
6. MANAGER: "As of today, you two are field researchers. Congratulations."
7. RON: "Is there a raise in this?"
8. MANAGER: "There's a creature in this. Lab's next door. Come on."

## lab_brookhollow.scene_starter_intro  (before the choice)
1. LAB TECH: "Three cradles. Three creatures. Each one's been raised here since it hatched."
2. MANAGER: "They're in the cases with the lights spinning over them. Go and look."
3. MANAGER: "Pick one. You'll be together a long while, so don't just go by looks."
4. RON: "I'm going by looks."
(the spinning golden arrows show over the starter cases from page 2)
(choice UI)
## lab_brookhollow.starter_confirm  ({lead} = chosen creature's species name)
1. "Take {lead} as your partner?"
## lab_brookhollow.scene_starter_after  (sets got_starter; Ron takes one of the other two)
1. RON: "Then I'll take this one. It looked at me first."
2. LAB TECH: "{lead} seems to like you. That's a good start."

## lab_brookhollow.scene_test_run  (sets test_run_started; give dominance crystals, amount is Game dev's call)
1. MANAGER: "Before anyone signs anything, a test run."
2. MANAGER: "Go out to the tall grass. Catch two wild creatures and log them in the Kilindex."
3. MANAGER: "These crystals are on the company. Hold one up when a creature's worn down."
4. MANAGER: "Two creatures, logged. Then come back here. Don't wander off to Fernwick."
5. RON: "Race you."
6. MANAGER: "It's not a race. ...Fine. It's a race."

## lab_brookhollow.manager_test_run_repeat  (test_run_started, not test_run_done)
1. "Two wild creatures, caught and logged. Tall grass is just outside town."
2. "Wear one down first, then hold a crystal up. Don't waste them."
## (inner thought / toast when the 2nd creature is indexed; sets test_run_done)
1. "That's two in the Kilindex. Time to head back to the lab."

## lab_brookhollow.scene_test_run_return  (test_run_done)
1. MANAGER: "Two logged. Clean entries, too. Nice work."
2. RON: "I got mine first, for the record."
3. MANAGER: "Noted. Ignored. Now, the actual job."

## lab_brookhollow.scene_job_briefing  (sets job_briefed; continues straight on)
1. MANAGER: "Raise your creatures. Find as many kinds as you can. Log every one."
2. MANAGER: "And keep an ear out for the field team. Greystone's where they went quiet."
3. MANAGER: "Now, pay. You're not on the clock anymore. You're paid on progress."
4. MANAGER: "Coins won, creatures logged, reports filed. No progress, no pay."
5. RON: "So no more paid lunch breaks."
6. MANAGER: "Correct. So get to work."

## After job_briefed
The existing manager flg_promoted variant takes over ("Our own checkpoints only pass registered trainers. Win a Master's coin." / "Fernwick's Master is the closest. Straight up Route 1."). If the manager stays in the lab instead of the office, Coder moves that variant's spot. The text doesn't change.

## maps.brookhollow.ron_too_dangerous  (leaving town edge without got_starter; Ron runs up and walks the player back)
Default (not flg_promoted):
1. RON: "Hey! Hey. Where do you think you're going?"
2. RON: "That grass is full of wild creatures, and you've got nothing on you."
3. RON: "Too dangerous out there alone. Work's this way. Come on."
Variant (flg_promoted, not got_starter):
1. RON: "Whoa. Field researcher for five minutes and you're already off?"
2. RON: "Not without a creature. The wild out there would eat you alive."
3. RON: "Lab first. Come on, I'll walk you back."
