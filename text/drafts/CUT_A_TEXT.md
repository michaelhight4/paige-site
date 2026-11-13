# CUT_A_TEXT: starter-flow text for Coder (Text Bot, Oct 23 2026, 9:58 AM CT). DRAFT, pending Gary.

Text is now in overworld_lines.json (built from build_overworld_lines.py + system_lines.py, --check green).

## 1. src/systems/index.js, starterAt() (lines 134 and 137): hard-coded TODO strings
Keys: maps.lab_brookhollow.starter_confirm and maps.lab_brookhollow.starter_received
Fill {lead} with the cradle species' display name (the lead isn't set yet at the confirm step).

Line 134, replace:
    [`[TODO Text Bot: starter cradle line] It's ${name}. Take it with you?`]
with (file text, falling back to the same words):
    s.fill(pagesOf(lines.maps.lab_brookhollow.starter_confirm) ?? ['Take {lead} as your partner?'], { lead: name })
Paste-ready literal:  `Take ${name} as your partner?`

Line 137, replace:
    [`[TODO Text Bot: starter received line] ${name} joined your team!`]
with key maps.lab_brookhollow.starter_received
Paste-ready literal:  `${name} is on your team now.`

## 2. src/overworld/intro.js FALLBACK_OFFICE (lines 115, 132, 137, 165, 166, 168-171, 569)
No change needed for players: every key now exists in the file, so these fallbacks no longer show.
If you want to clean them, these are the file texts:
- office_int.manager_starter_repeat: "The lab's right next door. Your partner's over there, not in here." / "Go on. The creatures are friendlier than HR."
- lab_brookhollow.crystals_received: "You got {count} dominance crystals." / "Company property. Try to bring some back."
- system_opening.test_run_progress: "Test run: {n}/{need} logged."
- system_opening.starter_picker_title: "Choose your partner"
- lab_brookhollow.cradle_not_yet: "A crystal cradle. Something small is asleep in there." / "Not mine to open. Not yet, anyway."
- system_opening.leave_block: office "Work's the other way. The office won't wait all day."; lab "Not without a partner. Lab first."; run "The test run's on Route 1. Fernwick can wait till I'm done."; back "Two logged. The lab's waiting on me, not the road."
- system_opening.free_roam: "Free roam. Raise your team and log every kind you can find."

## 3. Not done (paused by Gary 9:53 AM CT)
- system.wip_after_master2 pop-up was NOT added to system_lines.py. Text from Gary: "That's as far as the story goes for now. The rest is still being built." / "You're free to keep exploring. Just try not to break anything." Button: "OK".
