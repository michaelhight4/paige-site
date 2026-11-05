# Boundwake local playtest v3

**Race/start:** Jory Reedley — Dwarf, boy, comfortable family; age 0, Hearthfold Vale, wind affinity, Restless Feet. Fresh start at `/?fresh&skipintro` (server `localhost:8090`).  
**Ages covered:** 0–30 inclusive; alive at 30. No death/heir sequence.  
**Route:** quick year advances with narrative choices; traveled to Glassmarket Coast at 14; joined Stall Hand at 16; won a Commons Voice seat at 18, held a 2-year term, and observed it end at 20. No code changed.  
**Score:** 74/100.  
**Blockers:** None.

## Prior-fix retests

- **Adventure at 10 — PASS.** At age 10, Adventure showed “Set out” and 5 yearly trips remaining.
- **Stall Hand joinable at 10 with matching copy — PASS.** At age 10, the enabled Join row read “Stall Hand · Merchant · Everyday,” “Buy low, sell high, smile through the bargain,” “40 gold/yr,” and “age 10 (stall hand).”
- **No repeating “term as null ended” after court term — PASS.** Commons Voice showed 2 yr left at 18, 1 yr left at 19, and “Former officeholder · tier 1 kept” at 20; no “term as null” text at 20 or 21.
- **Life journal Adventure chip navigates — FAIL.** Clicked an Adventure chip inside the age-3 journal entry at age 10 (and retested at 30); Life stayed open. The main Adventure tab itself navigated successfully.
- **Make a friend shows why if locked — PASS.** At age 10, the disabled Lantern Market choice displayed “Market: Age 16+.”
- **Realms Scout/discovery path and Travel — PASS.** Age 10 showed “Scouting opens at age 14”; at 14, Scout toward Glassmarket Coast succeeded, revealed the realm and enabled “Travel here.” Travel worked and moved the character to the coast.
- **Restless Feet info — PASS.** The trait text now says exploration and travel events find you more often, plus +1 Strain/year; it does not claim an unimplemented feature.
- **Favicon no 404 — MIXED.** Direct navigations to both favicon-32.png and favicon-16.png returned 200 `image/png`, but browser console also reported 404s for those same URLs during the session. Verify on a clean load before calling this fully clean.

## New findings (severity-first)

1. **P2 — Stall Hand Join silently removes 6 gold.** At age 16, the Stall Hand card displayed 40 gold/yr and no entry fee. Before clicking Join the balance was 111 gold; immediately after joining it was 105 gold. No fee or confirmation explained the 6-gold deduction. Repro: Work → first Everyday Stall Hand row → Join; compare balance. This is separate from later yearly wages.
2. **P2/P3 — Journal history is cramped/clipped at age 30.** On Life at age 30, the Journal pane showed its heading/blurb but most entries were out of view in a very short scroll area; the Adventure chip was difficult to see/reach. The page text still contained the age-by-age journal. Repro: advance to 30 → Life → inspect the Journal pane. See `bw3_bug_05.png` and `bw3_bug_06.png`.
3. **P3 — Duplicate first name makes Bonds ambiguous.** At age 10, “Make a friend” added a friend named Dorin while the existing father bond was also Dorin (father 33 vs friend 8, both in Village lessons). Repro: Bonds → Make a friend → inspect the list. Could be valid random naming, but relationships are hard to distinguish without a surname/unique label.
4. **P3 / confirm intended age gate — Child crime actions are visible.** At age 8, the Realm Law (shadow) panel offered “Attempt” for “Pilfer a Market Stall” and “Cutpurse on Market Row,” each severity 1, without an age lock or explanation. Repro: reach age 8 → Life/Realm Law panel. No attempt was made.

## Screenshots

- `/workspace/playtest_25x/bw3_bug_01.png` — fresh start / trait preview
- `/workspace/playtest_25x/bw3_bug_02.png` — age 9
- `/workspace/playtest_25x/bw3_bug_03.png` — age 10 Work openings and Stall Hand copy
- `/workspace/playtest_25x/bw3_bug_04.png` — age 30 Work / court panel
- `/workspace/playtest_25x/bw3_bug_05.png` — age 30 Life screen
- `/workspace/playtest_25x/bw3_bug_06.png` — age 30 journal scroll/chip visibility
