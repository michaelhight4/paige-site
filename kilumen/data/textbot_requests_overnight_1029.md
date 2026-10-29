# Text Bot requests: overnight Oct 29 2026 (Coder)

Everything below ships with PLACEHOLDER text. Text Bot owns `text/*.py` and `overworld_lines.json`, so Coder did not
touch them. Please write the real lines; keep the keys and `{tokens}`. Banned words as always (no PP, shiny, super effective,
Pokédex, Poké Ball, Gotcha!, nurse, 'tonic' as a label, weed, route/routes, throw for capture).

## 1. Difficulty (src/systems/difficulty.js, src/ui/ui.js)
- `difficulty.title` "Pick a difficulty." (New game), `difficulty.option_label` "Difficulty" (Options)
- `difficulty.easy|normal|hard.label` Easy / Normal / Hard
- `difficulty.easy.blurb` "Foes hit half as hard and sit closer to your level. Pays less."
- `difficulty.normal.blurb` "The game as it is meant to be played."
- `difficulty.hard.blurb` "Foes hit 50% harder and train above you. Pays a little more."
- Save card: "Continue · {difficulty}"

## 2. Masters using healing items (src/battle/ui_sd.js, key `foe_item_used`, tokens {trainer} {item} {creature})
Three rotating lines with personality, ideally per Master (Nerys Bryde, Cassia Lume, ...). Placeholders:
- "{trainer} isn't done yet! A {item} for {creature}."
- "{trainer} digs into the bag. {creature} gets a {item}!"
- "\"Hold on, {creature}!\" {trainer} uses a {item}."
Item names come from the catalogue (Small Remedy / Big Remedy). Never call them tonics.

## 3. Team Link Band
- Item catalogue `system_item_catalogue.team_link_band`: name (PH "Team Link Band"), pocket gear, description pages
  (PH idea: "Held. If its holder sat out a fight, it still gets half the XP.")
- Battle end, key `link_band_xp` {creature} {n}: PH "{creature} watched and learned: +{n} XP from the Team Link Band."
- Pack, holding: PH "{name} is holding the {item}." / "{name} hands the {item} back." / prompt "{item}: who holds it?"
- Saltmere fisher (`overworld_lines.json maps.saltmere.saltmere_fisher`, src/systems/link_band.js LINK_LINES_PH) once
  Master 1 is beaten and the team has 3+ creatures:
  give: "Big team you've got. Half of them just sit on the bench, eh?" / "Here. A Team Link Band. Whoever holds it learns
  from watching, even if they never step in." / "You got the Team Link Band!" / "Give it to someone in your Pack, gear pocket."
  after: "The band works best on the little ones. They watch everything."

## 4. Town practice events (src/sports/town_strings.js `TS`, coach npcs `<town>_practice_coach`)
Per event: `title`, `hello` (coach intro), `how` (controls). Events: garden_hop (Fernwick), tide_run (Saltmere),
signal_relay (Revival Heights), ice_slide (Frostspire), lantern_catch (Lanternport), forge_push (Cindervale).
Also coach_name (per town would be lovely), not_ready (unbuilt regions), pick/start/again/back/best/none_yet/result/new_best,
grade_gold|silver|bronze|none, the react_<grade> creature reaction lines ({creature}, 2+ each), and the pop_* shouts
(Perfect! Splash! Too slow! Washed back! Whoa! Soot! Miss Good).

## rtb_trainer.* (real-time trainer fights, Coder Oct 29 2026, branch rtb-trainer) — PLACEHOLDER lines, Text Bot owns them
Speech bubble above the overworld trainer (short, about 25 characters max). Vars: {trainer}, {creature}, {item}.
- `rtb_trainer.start_banner`: "{trainer} wants to fight!"
- `rtb_trainer.send_out` (array): "Go, {creature}!" / "You got this, {creature}!" / "{creature}, show them!"
- `rtb_trainer.recall` (array): "{creature}, come back!" / "Take a breather, {creature}."
- `rtb_trainer.item` (array, trainer heals with a Remedy): "Hang in there, {creature}!" / "Here, {creature}. A {item}."
- `rtb_trainer.send_out_banner`: banner when the next creature comes out (PH "{trainer} sends out {creature}!")
- `rtb_trainer.link_band_xp`: floating number line, vars {creature} {n}: "{creature} +{n} XP (Link Band)"
