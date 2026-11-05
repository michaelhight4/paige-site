# Boundwake playtest
Build: http://localhost:8090/?fresh&skipintro (loaded fine). Character: Brynn Marrow, Dwarf girl, common family, Spark-born, light affinity, Hearthfold Vale. Played age 0 -> 22 (fast pass, random event choices).
Covered: fate screen, Life, Work (joined Farmhand), Adventure, Skills (viewed), Bonds, Realms, Codex, Belongings, ~9 random events (Fever Season, Festival Ribbon, Rolling Lucky, Roof-Test Storm, Parent's Nameday, A Small Life...).
NOT covered: tournaments, Skills Train, guild tracks, travel, death/reincarnation, trait/affinity info panels.

## Bugs (severity first)
1. HIGH - Adventure tab (bw_bug_01.png): at age 22 shows "The road is for older feet (age 10+)" and Set out disabled. Steps: Begin life, age to 22, open Adventure. Expected: unlocked (and tournaments/meets listed at ages 3/6/9...). Actual: locked; no tournament list seen at any age.
2. HIGH - Work tab (bw_bug_02.png): at age 22, jobs with age 8/12 requirements (Stall Hand, Inn Helper, Mill Helper, Kitchen Help, Runner) are "Locked" with no reason shown; Join works only for some age-6 jobs. After joining Farmhand (bw_bug_03.png) Farmhand itself became Locked (ok) but Stall Hand etc. still locked. Locked reason is not displayed (UX; contradicts "Locked Train always shows why").
3. MED - "Age +1" button never reaches a stable state (Playwright "element is not stable" indefinitely - constant animation). Normal click times out in automation; force click needed. Possibly also hurts real users with click misses.
4. MED - Skills "Train" buttons: click on first Train did nothing visible in my attempt (clickfail/no state change confirmed; retest manually). Also at age 22 Skills had 0 strength/endurance with Actions still 4/4 - actions never consumed in my run (I only aged), so unverified.
5. LOW - Event toast overlaps tab bar (bw_bug_04.png, "It followed me home..." covers Skills/Bonds tabs). 
6. LOW - Event modal stays in DOM briefly after choice (repeated clicks double-fire attempts); after choosing, stale card may still accept a click.
7. LOW - Icon-only buttons (tab icons, affinity chip, music) lack accessible names in some cases; /favicon.ico 404 (2 console errors).
8. LOW - Passive journal repeats "Roads and shared work kept bonds warm with Liora" every year at ages 1-3 (spam), and Oren's temperament clash message while Closeness 39.
9. Observation - parents both age 47 when player is 22 and Strain 0/Renown 0 at 22 with 20 gold: economy/progression feels flat if you only age.

## Score
Early game fullness/fun: ~45/100 (pretty UI, good events, but gating bugs hid adventure/tournaments).
Blockers: Adventure locked at 22, Age button instability, time (fast-pass requested).
