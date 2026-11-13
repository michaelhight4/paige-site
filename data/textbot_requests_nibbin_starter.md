# Text Bot requests: Nibbin earth starter + story Ron (Coder, Fri Oct 23 2026, CT)

Gary's reason for the swap: Tumbloam "looks a lot like Cindrip". The earth starter is now **Nibbin -> Gnawford** (pure earth, evolves at 16).
Nibbin and Gnawford are **starter-only** (never wild, never on a non-rival trainer). **Tumbloam stays as an ordinary wild creature.**
Code is done in dev. Coder did NOT edit text/*.py or text/overworld_lines.json. Please make the changes below in your sources.
Player-facing text must not use blocked words (PP, shiny, super effective, Pokedex, route/routes, etc.). Use "Trail" and "Kilindex".

## 1. Creature blurbs (TODO text id)
| key | now | need |
|---|---|---|
| system_kilindex.entries.nibbin.blurb | "" (empty) | TODO text id: a 1-2 line Kilindex blurb. Nibbin is a small earth gnawer; it is the lab's earth partner. |
| system_kilindex.entries.gnawford.blurb | "" (empty) | TODO text id: a blurb for the evolved form (L16). |
| found field for nibbin / gnawford (src/ui/species_synced.gen.js, generated from creatures_synced) | "Trail 1" | Should read "Brookhollow Lab" (or "Partner only"), because the species is never wild. This is data, not Text Bot text. Coder can change it in the sync source once you pick the wording. |

## 2. Lines that still say Tumbloam is the starter
| where | current text | change |
|---|---|---|
| data/quests.json:79 `mq_brookhollow_promotion_s5.desc` | "Pick a partner at the Brookhollow lab: Tumbloam, Cindrip or Rillop (level 5)." | Replace Tumbloam with **Nibbin**. |
| text/drafts/overnight/fernwick.md:12, saltmere.md:12, lanternport.md:12 | "(Tumbloam-player version ...)" | Draft notes only. Read them as the "Nibbin-player version". Ron's team for that branch is unchanged (he still counter-picks Cindrip). |
| Any lab or picker line, or any Ron line, that names Tumbloam as a starter or as Ron's pick | - | Use Nibbin / Gnawford. Ron's counter-pick is now: Nibbin -> Ron takes **Cindrip**, Cindrip -> **Rillop**, Rillop -> **Nibbin**. On a Rillop save, Ron's partner is Nibbin, and later Gnawford (Saltmere). |

Tumbloam lines that are about the wild creature (Biscuit flyer, bean-row thief, paddock, heal-centre box joke, "Probably a Tumbloam up from the river") stay as they are.

## 3. New keys: Ron now goes with the player to work and to the lab (Gary: "room mate is missing at work and the lab")
A temporary story Ron (npc id `ron_story`) stands next to the player during the manager's promotion (office_int) and at the lab cradles.
If the player talks to him between beats, the code reads these keys and falls back to the strings in `FALLBACK_OFFICE.ron_story` (src/overworld/intro.js):
| key | fallback (code) | when |
|---|---|---|
| maps.lab_brookhollow.ron_story_office | "Go on. The boss is right there." | In the office, before the promotion |
| maps.lab_brookhollow.ron_story_lab | "Go on, pick one. I'm going by looks." | In the lab, before the pick |
| maps.lab_brookhollow.ron_story_back | "I got mine first, for the record." | In the lab, after the test run (before he walks out) |
(The keys sit under lab_brookhollow because that is where `_pages(OPEN.lab, ...)` reads them. If you would rather put ron_story_office under maps.office_int, tell Coder.)

Staging note for the existing lab lines: at "Then I'll take this one", Ron now **walks to his cradle and takes it**, and the cradle shows as empty. His creature then follows him the same way the player's follower does. After the starter scene and the test run he walks out. Any existing line where Ron "grabs" his pick will fit this.

## 4. Lines that can no longer be reached
- `maps.house_1f.ron` variant **v_talked_ron_morning** (overworld_lines.json:2374): the briefing is now forced (auto-walk), and Ron walks out of the house right after it. He is not in house_1f again until the job briefing is done, so the repeat line never shows. Keep it or retire it; it is harmless either way.

## 5. Picker title
- `system_opening.starter_picker_title`: the code fallback is "Choose your partner". The `// [TODO Text Bot: ...]` code comment in intro.js stays on purpose. Please confirm or provide the line.

## 6. Check
After you edit, please grep the new lines for blocked words (PP, shiny, super effective, Pokedex, route/routes). `npm test` (tests/nibbin_starter.test.mjs, tests/story_ron.test.mjs) does not read your text, so nothing breaks if a key is missing; the fallbacks are used.
