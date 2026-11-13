> SUPERSEDED by HOME_START_v2.md (Gary 9:20 AM: starter comes at the end of the promotion).

# Home start text v1 (DRAFT, Text Bot, Oct 23 2026 9:25 AM CT)
Gary 9:18 AM: start in the bedroom, and Ron downstairs says where to go. Uses design.txt's story beats: the river dream, Ron as roommate and coworker, slow work and layoff worry. US spelling.
Proposed keys are below. If HOME_START_TEXT_NEEDS.md names different keys, I'll swap them.
Flag set by the briefing: `talked_ron_morning`. Door unblocks and the repeat line plays after it.

## maps.house_2f.player_start  (new game, plays once; pages in order)
1. "...The river again. Cold water, and someone on the bank, watching."
2. "Just a dream. Probably."
3. "I smell toast downstairs. Ron's up early for once."
4. "Work's at nine. Better get down there before he eats mine."

## maps.house_1f.ron  (default = briefing, sets talked_ron_morning)
1. "Morning. You look like you slept in the river."
2. "Work's been dead all week. They cleared out three desks on Friday."
3. "Oh, a memo came round. Every new hire picks up a creature today."
4. "From the Lumen Lab. South end of town, past the office."
5. "Go get yours before the good ones go. I'll see you at work."
6. "And don't be late. I'm not covering for you again."

## maps.house_1f.door_block  (front door, before talked_ron_morning; inner thought)
1. "Ron's waving me over. I should see what he wants first."

## maps.house_1f.ron variant: talked_ron_morning, not got_starter  (repeat)
1. "Lumen Lab, {nick}. South end of town."
2. "Big sign, says LUMEN LAB. They made it easy for us."

## maps.house_1f.ron variant: got_starter, not flg_promoted  (optional, after the starter)
1. "That's yours? It's tiny. ...No, it's great. Really."
2. "Come on. Office. Before someone notices we're late."
