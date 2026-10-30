# Text Bot request: side activities + town inspectables (Coder, Oct 30 2026)

Branch dev/side-activities. Text Bot owns all text. Every line below is a **PLACEHOLDER** written by Coder so the game runs;
please replace it (same key, same page shape: max 2 lines of ~32 chars per page). House rules apply: no blocked words
(tests/side_activities.test.mjs `BLOCKED`), say *hall*, and *catch* for capture.

## 1. Side activities (`text/overworld_lines.json` root `side.*`; fallback now in `src/side/text_fallback.js`)

| key | placeholder |
|---|---|
| `side.fern_letters.intro` | [PLACEHOLDER] FERNWICK POST. "Three letters blew / away in the storm. Seen them? |
| `side.fern_letters.first` | [PLACEHOLDER] A letter is tucked behind the / lamp. It is addressed to Fernwick Post. |
| `side.fern_letters.found` | [PLACEHOLDER] Another letter, a bit damp. |
| `side.fern_letters.already` | [PLACEHOLDER] Just a lamp now. |
| `side.fern_letters.all_found` | [PLACEHOLDER] That makes three. The post box / is by the square. |
| `side.fern_letters.turn_in_short` | [PLACEHOLDER] Some letters are still missing. / Try the lamps. |
| `side.fern_letters.complete` | [PLACEHOLDER] The letters drop into the box. / A note says thank you. |
| `side.fern_letters.done_again` | [PLACEHOLDER] FERNWICK POST. All letters in. |
| `side.frost_lamps.first` | [PLACEHOLDER] Frost on the lamp glass. / You wipe it clear. It shines. |
| `side.frost_lamps.found` | [PLACEHOLDER] Another lamp, clear again. |
| `side.frost_lamps.already` | [PLACEHOLDER] This lamp is clear. |
| `side.frost_lamps.complete` | [PLACEHOLDER] The square lamps are all clear. / The town looks brighter. |
| `side.frost_lamps.done_again` | [PLACEHOLDER] The lamp glows. No frost yet. |
| `side.salt_tide_quiz.intro` | [PLACEHOLDER] TIDE BOARD QUIZ. Three questions / about the salt pans. Try it? |
| `side.salt_tide_quiz.q1` | [PLACEHOLDER] When are the salt pans raked? |
| `side.salt_tide_quiz.c1a` | [PH] At noon |
| `side.salt_tide_quiz.c1b` | [PH] At low tide |
| `side.salt_tide_quiz.c1c` | [PH] Never |
| `side.salt_tide_quiz.q2` | [PLACEHOLDER] What dries the salt? |
| `side.salt_tide_quiz.c2a` | [PH] Sun and wind |
| `side.salt_tide_quiz.c2b` | [PH] A big fan |
| `side.salt_tide_quiz.c2c` | [PH] Rain |
| `side.salt_tide_quiz.q3` | [PLACEHOLDER] Which day are the pans closed? |
| `side.salt_tide_quiz.c3a` | [PH] Monday |
| `side.salt_tide_quiz.c3b` | [PH] Friday |
| `side.salt_tide_quiz.c3c` | [PH] Tuesday |
| `side.salt_tide_quiz.pass` | [PLACEHOLDER] All right! The board has a / little gold star for you. |
| `side.salt_tide_quiz.fail` | [PLACEHOLDER] Not quite. The answers are / all around town. |
| `side.salt_tide_quiz.done_again` | [PLACEHOLDER] Full marks again. The star / stays where it is. |
| `side.salt_tide_quiz.declined` | [PLACEHOLDER] Maybe later. |
| `side.cinder_ore_weigh.intro` | [PLACEHOLDER] ORE WEIGH. Guess the cart\'s load. / Two right out of three wins. |
| `side.cinder_ore_weigh.ask` | [PLACEHOLDER] How heavy is this load? |
| `side.cinder_ore_weigh.right` | [PLACEHOLDER] Spot on! |
| `side.cinder_ore_weigh.wrong` | [PLACEHOLDER] Not that one. |
| `side.cinder_ore_weigh.pass` | [PLACEHOLDER] A good eye for ore. |
| `side.cinder_ore_weigh.fail` | [PLACEHOLDER] The scales win this time. |
| `side.cinder_ore_weigh.done_again` | [PLACEHOLDER] Good guessing again. / The foreman just nods. |
| `side.cinder_ore_weigh.declined` | [PLACEHOLDER] Maybe later. |
| `side.merit` | [PLACEHOLDER] Merit points +{n}. |

Notes: fern_letters = 3 lamps + post box (Fernwick); frost_lamps = 4 square lamps (Frostspire); salt_tide_quiz = 3 questions,
answer index 1/0/2 (keep the right answer in that slot or tell Coder); cinder_ore_weigh = guess 3/5/8 kg, 2 of 3 wins.
`side.merit` keeps the `{n}` token (points). Choice labels (`c1a`...) must fit one menu line (max 14 chars).

## 2. Town inspectables (`text/overworld_lines.json` `maps.<map>.<id>`, status PLACEHOLDER)

| map | id | placeholder |
|---|---|---|
| brookhollow | `brookhollow_notice` | NOTICE: "Lost: one red scarf. Ask at the office." |
| brookhollow | `brookhollow_bin_2` | A bin. Somebody's old shopping list: "Bread. Milk. Courage." |
| fernwick | `fernwick_notice` | FERNWICK NOTICES: "Hall open daily. Please wipe your boots." |
| fernwick | `fernwick_bin` | A bin full of fern clippings. It smells like rain. |
| frostspire | `frostspire_notice` | FROSTSPIRE NOTICES: "Skylift runs in all weather. Mostly." |
| frostspire | `frostspire_bin` | A bin, frozen shut. It will open in spring. |
| frostspire | `frostspire_barrel` | A barrel of grit for the paths. Someone has drawn a face on it. |
| frostspire_office_int | `frostspire_office_bookcase` | Snow reports, filed by year. Every one says "a lot". |
| home_brookhollow_a | `brookhollow_a_bookcase` | Picture books, a road atlas and "Creatures of the Valley". |
| home_brookhollow_a | `brookhollow_a_radio` | The radio crackles: "...and a sunny week across the valley..." |
| home_brookhollow_b | `brookhollow_b_bookcase` | Cookbooks. One is just called "Soup, and Why". |
| home_cindervale_a | `cindervale_a_tool_rack` | Pokers and tongs for the fire. All polished. All warm. |
| home_fernwick_a | `fernwick_a_bookcase` | Field guides to mosses. All of them well thumbed. |
| home_fernwick_c | `fernwick_c_bookcase` | Fishing diaries, one per year. The fish get bigger every year. |
| home_fernwick_c | `fernwick_c_shelf` | A shelf of jars: fishing hooks, buttons, and one very old biscuit. |
| home_lanternport_a | `lanternport_a_bookcase` | Sea charts and a book of knots. The page for "bowline" is torn. |
| home_saltmere_a | `saltmere_a_wheel` | An old ship's wheel. It still turns, a little stiffly. |
| home_saltmere_a | `saltmere_a_jars` | Jars of salt, each labelled with the year it was raked. |
| mirefen | `mirefen_bin` | A bin with a heavy stone on the lid. The ducks know why. |
| saltmere | `saltmere_notice` | SALTMERE NOTICES: "Salt pans closed Tuesdays for raking." |
| saltmere | `saltmere_bin` | A bin. Salt crusts the lid. Everything here is a bit salty. |
| saltmere_office_int | `saltmere_office_bookcase` | Binders: "Staff Rota", "More Staff Rota", "Rota (OLD)". |

Section 2-5 lines from data/textbot_world_fill.json were used as written (no request).
