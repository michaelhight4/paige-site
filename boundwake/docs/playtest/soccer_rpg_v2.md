# Boundwake fast replay v2

## Run / result
- URL: http://localhost:8090/?fresh&skipintro ; one fresh life, no reroll, no code changes or state injection.
- Start: **Merek Brightwater**, Elf boy, comfortable family, **Restless Feet**, **wind affinity**, Hearthfold Vale. Three hidden talents advertised. 120 gold; Health 68, Spirit 71, Wits 74, Presence 49.
- Finished alive at **calendar/HUD age 36**. Peddler; sword path, Flowing River style, Gale Script school. Final: 2,981 gold, Health 94, Spirit 97, Wits 86, Presence 49, Strain 13, Renown 40, Mana 87/87; Actions 1/4. No death/reincarnation required.
- Method: forced Age +1, quick arbitrary event choices, UI-only testing. All 36 year advances reached the next exact HUD age; no skipped/doubled years observed.

## Prior-bug retest
| Check | Result | Observation |
|---|---|---|
| Adventure unlock at calendar age 10, including Elf | **PASS** | Disabled at 9 with age 10+ explanation. At HUD 10, Set out enabled; used it, Actions 4→3 and Adventure 5→4, opened Eyes in the Dark. |
| Work job lock reasons | **PASS**, copy exception below | Age 6/8 openings explicitly show Too young (age N+), sponsor requirement, or already-hold-post reason, rather than unexplained Locked. |
| Calendar-age 8 everyday work | **PASS** | Farmhand joined at 6; at 8 Inn Helper, Mill Helper, Kitchen Help, Courier, Fisher, Loom Helper had Join. Actually joined Inn Helper at 8; received wage next year. Stall Hand still locked at 8 by current gate (10+). |
| Stall Hand joinable by calendar age 12 | **PASS** | Joined at HUD 12; title changed to Stall Hand. Static requirement says 12 while lock reason says 10: bug 01. Exact age-10 join boundary not separately exercised. |
| Age +1 reliability | **PASS (forced clicks)** | 0→36 exact consecutive ages, including zero-action years. Pending choices hide Age +1 as expected. Ordinary/nonforced click reliability not established. |
| Skills Train spends action and increases skill | **PASS** | At 6 Swordsmanship 0→4, Actions 4/4→3/4, Strain 0→2. Later repeated training showed diminishing gains; Smithing reached novice and Spellcraft +5 at 30. |

## New findings (severity-first)
No P0/P1 crash or hard progression stop. Four confirmed UI/content defects plus one discovery concern requiring design confirmation. Screenshot paths below are relative to this report directory.

### P2 / needs confirmation — 05: no accessible travel route through age 36
- Screenshot: `bw2_bug_05.png` (age 36; all four other realm cards undiscovered).
- Steps: play Elf from birth; inspect Realms at 14, 18, 24, 30 and 36; visit local academy and tournament venue; Set out at 10 and three times at 25; advance to 36.
- Expected: age-14+ player has a discoverable/explained route to Travel, or concrete discovery prerequisites shown.
- Actual: all four destinations remain `??? (undiscovered)` with only “Undiscovered. Keep living — maps widen with years and roads.” Zero Travel buttons at 36. Could not exercise travel itself.
- Qualification: observed coverage blocker, **not proof** of broken calendar gate. Discovery may depend on event choices; a Stamped Travel Writ event was seen and its travel opportunity declined during fast random resolution. Confirm intended rules before treating as a regression.

### P2 — 03: Restless Feet promises an unimplemented positive effect (UI-admitted)
- Screenshot: `bw2_bug_03.png`.
- Steps: begin life with Restless Feet; note fate card “+exploration events · +strain”; click sidebar trait chip at age 12.
- Expected: promised exploration bonus works, or initial description does not advertise it.
- Actual: info dialog says: “Coded: +1 Strain each year (same yearly tick as Spark-born). Catalog also lists ‘+exploration events,’ but no extra exploration weight is applied in the engine yet.” Advertised upside disclaimed only in detailed info.
- Confidence: discrepancy directly documented by game's panel; engine implementation not inspected.

### P2 — 02: journal Adventure shortcut does nothing
- Screenshot: `bw2_bug_02.png` (Life remains selected after clicks).
- Steps: at 12 open Life; click Adventure chip in tournament-year journal line; repeat.
- Expected: navigate to Adventure, or show contextual information.
- Actual: remains on Life/Journal, no info dialog or visible navigation. Direct Adventure tab works. Tested twice; trait/affinity dialogs worked afterward.

### P3 — 01: Stall Hand age requirement contradicts lock reason
- Screenshot: `bw2_bug_01.png`.
- Steps: at 6 (also reproduced at 8), Work → Openings → Stall Hand.
- Expected: consistent minimum age across requirement and lock reason.
- Actual: “age 12 (stall hand)” but “Too young (age 10+).” Join worked at 12; exact age-10 boundary not tested.

### P3 — 04: expired political office produces repeated null term endings
- Screenshot: `bw2_bug_04.png`.
- Steps: at 19 Work → Court & moot → campaign for Commons Voice; choose Monthly; win two-year term; let expire; keep advancing without campaigning again.
- Expected: one named term-ending entry, then no further endings while not holding office.
- Actual: later journal years repeatedly contain **“My term as null ended.”** Explicitly observed every year 25–33, while Work shows Former officeholder. Raw null state floods journal.

## Covered systems
- **Life / events:** birth, illness, lessons, school/weather/social/work/travel-rumor events; quick choices, rest, healer. Healer spent 12g/action and explicitly joked about charging a healthy character. Hidden bad knee diagnosis and resolution observed. No fatal event.
- **Work:** Farmhand 6, Inn Helper 8, Stall Hand 12; wages; Work hard 24; promotion to Peddler 25 after Bartering reached requirement. Opened Herb Stall at 19, annual income observed. Staff/upgrades inspected, not purchased.
- **Guild hall:** opened local hall at 19 (150g + 1 action), hired Junia the Runner (30g, power 26); annual successes/failures/coffer/fees and cross-banner synergy observed. Fee/release/close controls inspected, not exhaustively exercised.
- **Politics / mentoring:** Commons Voice campaign won, term ended; Sword Path mentor enrolled; Mentor drill used (counter became 1 yrs).
- **Skills / academy:** martial Train at 6; mana awakening succeeded at 6 (one action, Mana 8/50); village academy Visit at 10 raised Literacy and entered Codex. Chose sword path, Flowing River and Gale Script; magic practice spent 5 mana and action; sword drill worked. Smithing trained at 25–27, Spellcraft at 30. Magic/drill disabled before school/style chosen, enabled afterward.
- **Adventure / teams:** actual adventures and choices; all 3-year checkpoints below. Founded Brightwater Circle at 19 (80g + action); captain + NPC Hesper, venue visit, realm meet won 21 (40g, team renown +5); Grand Teams entries 24/27/30. Accepted Greenwell Blade Circle invitation at 33. Handoff controls inspected, not invoked.
- **Bonds:** Spend time on mother consumed Social 3→2; added her to party. Clash explanation correctly warns against passive growth; closeness decayed despite generic Adventure heading promising growth. Make a friend remained disabled even at 33, without displayed reason; not asserted as bug because intended gate unknown.
- **Belongings:** shop categories and age/realm locks inspected; bought Vale Short Sword (45g, auto-equipped), unequipped/re-equipped. Relics, homes, mounts, tools, boards inspected, not exhaustively purchased. Notice-board Post disabled during inspection.
- **Realms / Codex:** academy and Ribbon Green Lists visits recorded; 32 Codex entries at 33 including events and dojo. Travel blocked by undiscovered destinations (05).
- **Circles / patronage:** at 12 expanded Circles & patronage; nine circle choices and grants inspected. Applied Letters Merit, won +48g, Spirit/Renown, action consumed; annual support observed. Did not join youth circle before aging out. Blade Circle invitation separately accepted at 33.
- **Info / shortcuts:** Restless Feet and wind affinity panels opened/closed, detailed text present. Journal Adventure shortcut failed (02). Music rendered in sidebar and floating control; audio not evaluated.
- **Not fully covered:** death/reincarnation, romance/family formation, real cross-realm travel, relic delves, all purchases, youth-circle membership, crime/punishment loops. Realm-law actions inspected, not executed.

## Tournament checkpoint ledger
| HUD age | Adventure check |
|---|---|
| 3 | Tournament year, bracket 1–8; no eligible meets before training. |
| 6 | Blade/Spark listed after training/awakening; Blade place 4, +2g/+1 renown, one action. |
| 9 | Bracket 8–15; no eligible competing skill yet. |
| 12 | Tournament year; no eligible competing skill yet. |
| 15 | Swordsmanship trained to 12; Blade listed, entered, place 6. |
| 18 | Adult bracket; Blade place 8; Spark appeared after magic practice but actions exhausted. |
| 21 | Blade entered; captain/NPC hired; venue visited; realm team meet won, place 1. |
| 24 | Blade place 4; Grand Teams place 6 (+10g/team renown +1). |
| 27 | Blade place 4; Forge place 8; Grand Teams place 3 (+40g/team renown +4). |
| 30 | Blade place 3 (+9g/+4 renown, invitation); Forge place 8; Grand Teams place 3. |
| 33 | Blade/Spark/Forge listed; Spark place 8; accepted Greenwell Blade Circle invitation. |
| 36 | Blade/Spark/Forge listed and all entered: Blade **place 1**, +28g/+12 renown, Emberlight Drill Hall invitation; Spark/Forge place 8. |

## Scores (subjective, one fast Elf life)
- **Early game: 79/100.** Calendar Adventure/job fixes materially improve play; action spending and skill gains legible. Tournament entry and awakening work. Stale eligibility copy and weak shortcuts still confuse.
- **Mid game: 74/100.** Enterprise income, office, guild hall, teams, school/style and invitations coexist and work. Null office spam and unexplained map/social locks reduce clarity; travel untested.
- **Overall early/mid: 76/100.** No softlock/crash to 36; remaining concerns mainly discoverability and feedback.

## Blockers / caveats
- None to reaching 36. Travel coverage blocked by four undiscovered destinations; no sign-in/payment/captcha required.
- Locator clicks on new event buttons often timed out while scrolling. Re-read/retry worked; observed button bounding boxes + browser mouse clicks resolved reliably. **Not counted as game click bugs.** No native Computer tool used. Two long batches hit automation's 30-second limit; state re-read before continuing.
- Console only showed favicon-16.png/favicon-32.png 404s; no gameplay exception observed. Not listed as gameplay bug.
- One random life, not exhaustive deterministic suite. No code modified or save/storage/debug manipulation used.
