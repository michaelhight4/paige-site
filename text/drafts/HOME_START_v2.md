# Home start text v2 (DRAFT, Text Bot, Oct 23 2026 9:30 AM CT). Replaces v1.
Gary 9:18 AM: start in the bedroom, and Ron downstairs says where to go. Gary 9:20 AM: "you don't get your starter until the end of the promotion".
So Ron sends you to WORK (the Revival Tech field office, office_int, for the promotion scene). Nothing here mentions the lab before then. US spelling, every page fits 2x40.
Keys and the flag are unchanged: `talked_ron_morning` is set by the briefing.

## maps.house_2f.player_start  (new game, plays once; pages in order)
1. "...The river again. Cold water, and someone on the bank, watching."
2. "Just a dream. Probably."
3. "I smell toast downstairs. Ron's up early for once."
4. "Work's at nine. Better get down there before he eats mine."

## maps.house_1f.ron  (default = briefing, sets talked_ron_morning)
1. "Morning. You look like you slept in the river."
2. "Work's been dead all week. They cleared out three desks on Friday."
3. "And now the boss wants to see us both. First thing. No reason given."
4. "That's either really good or really bad. My money's on bad."
5. "Field office, same as always. Go on, I'll be right behind you."
6. "And don't be late. I'm not covering for you again."

## maps.house_1f.door_block  (front door, before talked_ron_morning; inner thought)
1. "Ron's waving me over. I should see what he wants first."

## maps.house_1f.ron variant: talked_ron_morning, not flg_promoted  (repeat)
1. "Field office, {nick}. The boss is waiting."
2. "If it's layoffs, at least we'll know by lunch."

## Removed from v1: the post-starter line
The starter now comes at the end of the promotion, so got_starter and flg_promoted land together. Ron's existing flg_promoted variant ("Field researchers. Us. I still think they mixed us up with someone else." / "Fernwick's first. Try to keep up.") already covers what comes after, so no extra line is needed.
