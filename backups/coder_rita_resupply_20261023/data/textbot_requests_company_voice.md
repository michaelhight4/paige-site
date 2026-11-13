# Text Bot request: company voice lines (Coder, Oct 23 2026)

## TONE RULE (read first; applies to every key below)

Gary, Oct 23 2026, his words:
- 12:19 PM CT: "also we could refrence the way satisfactory does their employee model in game, and how the ai jumps in to talk to you when youve completed or discovered something"
- 12:20 PM CT: "its sarcastic and makes sure you know youre just a number, always calling you by your empoloyee id"
- 12:21 PM CT, **his model line (tone model, use it as the yardstick):** "Good job 001893! New creatures help boost company asset value!"
- 12:22 PM CT: "the ai needs to be inheritly sarcastic and all they care about is how your discovery boost company asset values"

Rules:
1. **Sarcasm is the base of every line**, not occasional flavour. Upbeat corporate cheer that is obviously hollow.
2. **It only cares about company asset value.** Every completion or discovery is framed purely as its value to the company. Creatures are "assets", areas are "land on the asset map", wins are "value held / value up". It never actually praises the player as a person (a "Good job" is fine when it's plainly about the asset, as in Gary's line).
3. **Always address the player by the bare 6-digit employee number `{employee_id}`** (e.g. `001893`: no letter prefix, no "Employee #", no "ID:"). Never `{player}`, never `{nick}`, never a name. Use the number in every line, ideally page 1.
4. **PG and kid-friendly**: sarcastic, not mean. No insults about the player, no threats, no firing jokes that land as bullying, no money worries beyond "your pay: unchanged"-level gags.
5. **Short**: 1-2 pages per key, each page max 2 lines x 40 chars (80 chars). One page is best. It pops up in a small strip while the player keeps walking.
6. **Structure only from the reference.** No names, phrases, catchphrases, voice or style lifted from Satisfactory; never ADA / FICSIT or anything that sounds like them. Our company is Revival Tech; the AI is RITA (Resource Inventory and Tracking Assistant), named by Gary 12:27 PM CT Oct 23 2026.
7. Blocked player words: route/routes (say Trail), PP, shiny, super effective, Pokédex (say Kilindex), Poké Ball (say crystal), Gotcha!, nurse, throw (for capture: the trainer holds up a crystal), weed.

Example tone notes (NOT final lines, just the direction):
- first catch -> "first asset acquired", value went from nothing to something, paperwork already filed.
- new Kilindex entry -> Gary's line is the model; variations on "more kinds = more asset value".
- milestone counts -> the number goes up, the employee is still a number.
- new area -> more land on the asset map; maybe "try not to scuff it".
- evolution -> "asset upgrade", value up, the employee's pay is not.
- Master beaten -> shareholders/the board are pleased with the assets, pointedly not with the employee.
- ID level up -> "congratulations, you're a slightly more valuable number".
- Benefits Board perk -> perks exist because a comfy employee moves assets faster (allegedly).
- quest done -> task closed, value delivered, back to work.

## Where it shows

A small strip at the top right (portrait + speaker name + one page of text). It never stops the player, never shows during battles, dialogue, cutscenes or the phone menu, and at most one line per burst of events (the most important wins). A / F / a tap dismisses it; otherwise it hides after a few seconds. Default OFF until Gary signs off (dev: `?cv=1`). Settings: Options > Company voice = Full / Milestones only / Off.

Read by `src/systems/company_voice.js` (`pages()`): `system_company_voice.<key>` as `pages` (array) or `{ pages: [...] }`; at most 2 pages are shown. Coder did NOT edit text/overworld_lines.json; the code has the fallbacks below until these keys land.

Placeholders passed to every line: `{employee_id}` (6 digits, also a global text var from now on, usable in any line, e.g. company_inbox emails) plus the usual textVars. Extra per event below.

## Keys

| key | event context (when it fires) | extra vars | tier | fallback in code now |
|---|---|---|---|---|
| `system_company_voice.speaker` | Name tag on the strip. `labels.name` (24 chars max). | - | - | RITA |
| `system_company_voice.first_catch` | First creature ever caught in the wild (once per save; usually during the lab test run on Trail 1). | `{creature}` | milestone | Good job {employee_id}! First asset acquired. / Company asset value: up from nothing. |
| `system_company_voice.kilindex_new` | A new kind registered in the Kilindex, only for the first few (registered count 2, 3, 4; count 1 is the starter). | `{count}` | full | **Good job {employee_id}! New creatures help boost company asset value!** (Gary's line, verbatim) |
| `system_company_voice.kilindex_milestone` | Registered count reaches 10, 25, 50, 100, 150, 250, 350, 450. Optional per-count keys `kilindex_milestone_10`, `_25`, `_50`, `_100`, `_150`, `_250`, `_350`, `_450` win over the generic one. | `{count}` | milestone | {employee_id}: {count} kinds on file. Asset value is up. / You're still a number. A busier one. |
| `system_company_voice.area_new` | First time an area name sign shows for a map (outdoor towns / Trails, named caves; once per map per save). | `{area}` (display name) | full | {employee_id}: {area} logged. / More land for the asset map. Thrilling. |
| `system_company_voice.first_evolution` | First creature that grows into a new form (once per save). | `{creature}`, `{new}` | milestone | {employee_id}: {creature} became {new}. / Bigger asset, bigger value. Your pay: same. |
| `system_company_voice.trainer_first_win` | First trainer battle won (once per save). | `{trainer}` (dev id, title-cased; may be rough) | full | {employee_id}: first win on file. / Winning keeps our assets looking pricey. |
| `system_company_voice.rival_beaten` | Each win over Ron (`beat_rival_ron_<n>`, once each). | `{trainer}` = Ron | full | {employee_id}: you beat {trainer}. / The assets did the work. Noted anyway. |
| `system_company_voice.master_beaten` | Each Master beaten (`beat_master_<town>`, once each). Highest-but-one priority. | `{master}` (town, e.g. Fernwick) | milestone | {employee_id}: {master} Master beaten. / Asset value up. The board is delighted. Not with you. |
| `system_company_voice.id_level_up` | Employee ID level goes up (company.idLevel; no code raises it yet, fires when it does). Top priority. | `{level}` | milestone | {employee_id}: Employee ID level {level}. / Congratulations. You're a pricier number now. |
| `system_company_voice.board_node` | A Benefits Board node rank goes up (no purchase code yet, fires when it does). | `{node}` (dev id, title-cased), `{rank}` | milestone | {employee_id}: Benefits Board perk filed. / Happy staff move assets faster. Allegedly. |
| `system_company_voice.quest_done` | A quest completes (`q_<id>_done`). Main quests count as milestone, side quests as full. | `{quest}` (quest title) | full / milestone | {employee_id}: task closed: {quest}. / Value delivered. Back to work. |

Nice to have (optional): 2-3 variants per key as `variants: [[...pages], [...pages]]` is NOT read yet; if Text Bot wants variety, say so and Coder will add a rotation.

Suggested build tag: `partial` (parity id: Text Bot to pick the Employee ID / company row; Coder did not check the parity table). Section note: "Company voice (Gary Oct 23 2026, 12:19-12:22 PM CT). Default off (?cv=1)."
