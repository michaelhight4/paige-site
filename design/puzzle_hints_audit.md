# Kilumen puzzle hint audit (halls + open world)

Oct 30 2026. Research and audit only. No code was changed. Lines marked **[TEXT BOT REQUEST]** are requests that describe what a line has to do. They are not final text. In-game text has to avoid the blocked words (gym, elite, route, Poké-anything). This doc calls the buildings "halls".

Code read: `wt_r58/kilumen` (branch dev/regions-5-8): `src/progression/{hall_v2,puzzles,halls,hall_lamps,hall_anim}.js`, `art/world/overworld/maps/*_hall_int.json` + `lanternport_lighthouse*.json`, `text/overworld_lines.json`. Also `wt_wellspire/kilumen`: `src/systems/puzzles.js`, `src/overnight/field.js`, `art/world/overworld/puzzles/*.runtime.json`, `src/region9`.

---
## Part 1. How the Pokemon games hint at puzzle solutions (Gen 2-5)

### 1.1 Devices
| Device | Pokemon examples | What it does |
|---|---|---|
| **Guide NPC at the entrance** (the "Gym Guide") | Every hall from Gen 2 on. In HGSS/Pt/BW he names the mechanic in one sentence, e.g. Pastoria: press the switches to change the water level. Driftveil: ride the lifts. | Names the rule, never the solution. Always next to the door, so asking again costs nothing. |
| **Trainer after-battle lines** | Ecruteak trainers hint that there's a hidden path. Sootopolis trainers warn about the cracked ice. Mistralton trainers explain the cannons. | They hand out the hint after the battle, at the spot where the player needs it. |
| **Signs** | Hall statue plaques, "ICE PATH" and cave entrance signs, Rocket hideout notes. The Ruins of Alph chambers have wall text and unown hint panels ("a POKéMON that..."). Regi chambers have braille on the walls. | Tells you what you're looking at and frames the task. |
| **Visual tells** | Cracked floor tiles (Sootopolis, Sky Pillar), arrow/spinner tiles (Rocket hideout, Viridian), a distinct ice texture, coloured switches + matching gates (Pastoria water colours, Mahogany ice), boulder holes, Strength-boulder sprites, cut-tree sprites. | Things that work differently look different. |
| **Tutorial room first** | Sootopolis 1F is a tiny ice room before the big ones. Mahogany starts with a short slide. Ice Path B1F starts small. Driftveil starts with one lift. Mistralton's first cannon is right by the door. | Teaches the rule where failing is cheap. |
| **Reset mechanism** | Leave and come back and boulders reset (Seafoam, Victory Road, Ice Path). Sootopolis: fall through the cracked ice and you land back at the start of the floor. Spinner tiles drop you back at the entrance loop. Pastoria switches toggle and can always be re-pressed. | Any mistake can be undone. You can't get permanently stuck. |
| **Pacing** | Every hall goes 1 small → 2 medium → 1 large/twist. Sootopolis is 3 floors, each bigger. Pastoria is 3 water levels. Mistralton's cannons go short to long. | Mario-style "introduce, develop, twist, conclude". |
| **No soft-locks** | Beaten trainers turn aside or stand clear of the path. Strength boulders reset on re-entry. Ice slides always end on a tile you can leave from. Cut trees grow back but are never the only way out without Cut. | You can always back out. |
| **Field-move prompts** | "This tree looks like it can be CUT down!" Asking at a boulder: "It's a big boulder." Gen 4/5 add a yes/no prompt: "Would you like to use Strength?" | Tells you what the object is and which move it needs. |

### 1.2 Notes per example
- **Ecruteak hall (HGSS)**: invisible floor over a pit. Fall and you land on 1F by the start, a gentle reset. The guide hints there's a hidden path. Trainers stand on the real path, so they act as landmarks. https://bulbapedia.bulbagarden.net/wiki/Ecruteak_Gym
- **Mahogany hall**: ice slides you until you hit an obstacle. Rocks are the stopping points, and they're visible. https://bulbapedia.bulbagarden.net/wiki/Mahogany_Gym
- **Blackthorn hall**: push boulders into holes over lava to build bridges. Leave and they reset. https://bulbapedia.bulbagarden.net/wiki/Blackthorn_Gym
- **Sootopolis hall (Emerald)**: cracked ice has to be stepped on exactly once. Fall through and you go down a floor, back to the start. The first floor is tiny. The stair only appears once every tile has cracked, which is clear feedback. https://bulbapedia.bulbagarden.net/wiki/Sootopolis_Gym
- **Pastoria hall (Pt)**: three switch colours set the water height. Each switch works from every height, so you can't get stuck. https://bulbapedia.bulbagarden.net/wiki/Pastoria_Gym
- **Snowpoint hall**: you slide on ice and roll snowballs. Trainers stop you mid-slide (they act as landmarks). https://bulbapedia.bulbagarden.net/wiki/Snowpoint_Gym
- **Driftveil hall (BW)**: lifts, one per floor, each with a visible switch. https://bulbapedia.bulbagarden.net/wiki/Driftveil_Gym
- **Mistralton hall**: cannons fire you in the direction the barrel faces (a visual tell), and the first one is by the door. https://bulbapedia.bulbagarden.net/wiki/Mistralton_Gym
- **Ice Path / Seafoam / Victory Road**: push boulders through holes, and leaving resets them. https://bulbapedia.bulbagarden.net/wiki/Ice_Path , https://bulbapedia.bulbagarden.net/wiki/Seafoam_Islands , https://bulbapedia.bulbagarden.net/wiki/Victory_Road
- **Ruins of Alph**: sliding tile puzzles. The finished picture is the hint, and the wall text names what to do. https://bulbapedia.bulbagarden.net/wiki/Ruins_of_Alph
- **Rocket hideout spinner tiles**: you can see the arrows, and the stop tiles are distinct. https://bulbapedia.bulbagarden.net/wiki/Team_Rocket_Hideout
- **Sky Pillar**: cracked floors need the Mach Bike, and falling sends you down a floor (a reset). https://bulbapedia.bulbagarden.net/wiki/Sky_Pillar
- **Regi braille**: the Sealed Chamber's braille spells out the action ("dig here", Relicanth/Wailord). The braille chart in the Pokédex is a hint outside the puzzle itself. https://bulbapedia.bulbagarden.net/wiki/Sealed_Chamber
- **Cut trees**: sprite + inspect text + a yes/no prompt. https://bulbapedia.bulbagarden.net/wiki/HM01
- Walkthrough cross-check: https://www.serebii.net/heartgoldsoulsilver/ , https://www.serebii.net/platinum/ , https://www.serebii.net/blackwhite/
- Design framing: "introduce, develop, twist, conclude" https://pathwisehq.com/learn/game-design/05-level-design . Escalating NPC hints https://nophinou.com/Notes/Puzzle%20design . Community list of puzzle types https://www.pokecommunity.com/threads/gym-and-other-puzzles.312303/

### 1.3 Rules taken from these examples (used in the audit)
1. **Name the rule, not the answer.** The guide gets one line on the rule and a second line when asked again.
2. **Teach in a 3x3 to 5x5 room by the door** where you can't fail.
3. **Things that work differently look different.** Each special tile type gets its own colour or animation, and its look matches the effect (an arrow points the way you'll go).
4. **Put cause and effect on screen.** If a gate opens out of view, the camera pans to it or a toast says which way.
5. **Hints at the spot.** After-battle lines describe the part of the room the trainer stands in.
6. **Make reset obvious.** Walking back out the door resets the room. Tell the player that.
7. **No soft-locks.** Already true in code (bits reset at the door, trainers return to their seats, the solver proves each hall).

---
## Part 2. Kilumen as it stands: what applies to every hall
- `hall_v2.js` has **DRAFT** `HALL_HINTS` (added to the attendant's progress line until the Master is beaten) and `HALL_ENTRY` toasts. The r58 branch has hints for fernwick, saltmere, revival, mirefen, frostspire, tidewater, cindervale and lanternport. **The wellspire worktree only has frostspire.** `text/overworld_lines.json system_halls` only has `hint_frostspire` in final text.
- **Reset is already built** (bits go back to 0 when you come in through the door) **but nothing tells the player.** No line says "walk out and back in to reset".
- Gate news toast: "A gate opened to the {dir}." This is a good Pastoria-style cause-and-effect device. It only covers plates.
- **Hall trainers' `after` lines describe the old v1 puzzles**, not the v2 maps. Cindervale talks about "springs", "pour" and "cooled tiles near a bellows". Tidewater talks about "stop it at high/low" tides. The v2 maps use conveyors, warp pads, slide floor and T/U plates. **These lines are now misleading. This is the top fix overall.**
- No hall has a `signs` entry apart from Lanternport dev labels. No tutorial room exists. Each hall's foyer (the 3-row open area by the door) is flat floor and teaches nothing.
- Visual tells: `hall_anim.js` animates conveyors, currents, ice sparkle and warp pads, but **only in dev**. It's off on the public alpha (`paigegames.net`). On the public build, tiles may not show what they do.
- Invisible walls `x` (Revival, Lanternport 1F) have no tell.
- Lanternport hall_int has no attendant (`villager_scholar`). The guide is on lighthouse 1F.

---
## Part 3. Hall-by-hall audit
Format: **Today**, then **Missing**, then **Plan** (G = guide line, T = tutorial room, V = visual tell, A = after-battle lines, S = sign, R = reset).

### Fernwick: plates + gate (hall 1)
Today: one T plate opens gate b. There's a HALL_HINTS draft. Wellspire also has the older runtime (latch plates + toggle crystals) in `fernwick_hall_int.runtime.json`. Check which one ships.
Missing: the plate→gate link is out of view. The two runtime models disagree.
Plan: G: **[TEXT BOT REQUEST] system_halls.hint_fernwick**: plates open gates; step on one and look for what moved. V: plate and gate share a colour, and on press the camera pans to the gate (or the toast fires). T: this is hall 1, so the foyer is the tutorial: put a plate 2 tiles from the door that opens a gate you can see. A: one trainer: **[TEXT BOT REQUEST]** point toward the plate in the maze's east corridor. R: **[TEXT BOT REQUEST] system_halls.reset_note** (shared by every hall): the room sets itself back when you step out the door.

### Saltmere: T plate flips gates a/b (one bit, two gates)
Today: the hint says "Each floor plate swaps which gate is open". Gate news toast. Saltmere's grid has 2 T plates on bit 0, so the second plate undoes the first, Pastoria style.
Missing: nothing shows the current state (which gate is open now). There's no foyer demo.
Plan: V: an a/b colour pair (for example gate a and the plate's "off" are the same colour). The plate sprite shows the current state. T: put a plate in the foyer in sight of gate a only, so a step shows one swap. A: **[TEXT BOT REQUEST]** h1/h2 after-lines: "one plate, one swap; the second plate swaps it back". G: keep the draft and Text Bot finalises it. R: reset_note.

### Revival Heights: invisible-wall maze + prism relay
Today: the hint covers the prisms only. The beam is drawn live (good, like a Ruins-of-Alph "picture" tell). The prism_open toast. The **invisible `x` maze** (rows 15-23) has no tell.
Missing: invisible walls are pure trial and error (Ecruteak at least lets you fall to a soft reset; here you just bump). The prisms are at the start (rows 25-27), which is good. They act as the tutorial, because the emitter, a prism and the receiver are all visible on one screen.
Plan: V: a faint shimmer on an `x` when you bump it (hall_anim's "ghost shimmer" already exists, so ship it on the alpha). Trainers stand on the true path as landmarks (Ecruteak trick). A: **[TEXT BOT REQUEST]** maze trainers: "the walls show when you touch them; follow where we stand". G: **[TEXT BOT REQUEST] hint_revival_heights** page 2 about the hidden walls. S: **[TEXT BOT REQUEST]** a plaque by the emitter: "turn the crystals to carry the light". R: reset_note (the door also resets the prisms, per the bit layout).

### Mirefen: push tiles (bog currents) + darkness/lamps
Today: the hint says "Arrow plates in the bog carry you…; try the short one by the door". `hall_lamps.js` darkness lights the reed lamps in `order`. The older boardwalk model needs the lamps in the frogs' order with a wrong-lamp reset.
Missing: the lamp order hint (the "frogs") has no line in v2 text. Arrows rely on anim, which is off on the alpha.
Plan: V: draw a static arrow on each push tile (no anim needed). T: rows 15-17 are the push block next to the foyer. Make one 1-tile push the first thing you meet. A: **[TEXT BOT REQUEST]** a frog-themed after line giving the order as a riddle, if lamps are still in v2. G: keep it. R: reset_note.

### Frostspire: slide ice (`i`), two lanes
Today: final text `hint_frostspire` ("slide up the middle lane, by the pillar"). This is the only finished hint. The ice sparkle is anim-only.
Missing: the hint gives away the answer (it's a solution, not a rule). There's no small ice room. Rows 13-14 come first and are a bigger field than rows 5-6.
Plan: G page 1 is the rule: **[TEXT BOT REQUEST] hint_frostspire rewrite**: ice keeps you sliding until something stops you; look for what will stop you. Page 2 (on asking again) is the current lane line. T: make row 13-15 a 3-lane mini field where every slide ends on safe floor. V: stopping pillars use a distinct, high-contrast tile. A: **[TEXT BOT REQUEST]** h1-h4: one each about the stop pillars and the windbreaks. R: reset_note. A slide always ends on floor (the solver proves it), so no soft-lock.

### Tidewater: T/U plates (two bits), glide lanes (slide floor `i`), gates b/d
Today: hints draft (2 pages, good, includes "Beaten trainers step aside"). HALL_ENTRY toast. The gate toast includes the `{tide}` state.
Missing: **after-lines (h1 Marlow, h2 Moss) describe a v1 high/low tide timer** ("stop it at high"), which doesn't exist in v2. The T and U plates look the same apart from the tileset swap. There's no on-screen tide meter.
Plan: A: **[TEXT BOT REQUEST]** rewrite h1-h5 after lines for v2: two shell plates, each turns one tide gate; glide lanes slide you until a rock. V: colour the T plate and gate b one colour (for example sand) and the U plate and gate d another (sea blue). Show a small tide badge in the HUD while in the hall. T: the foyer (rows 17-19) gets one demo glide strip of 3 tiles. G: keep both pages. R: reset_note.

### Cindervale Forge: conveyors (push tiles `^v<>`), springs (warp pads 1-3), plates T/U, slide floor
Today: hints draft ("Arrow plates are conveyors… start through the gap on the far right; belts loop"). HALL_ENTRY "Arrow plates move you." The warp pads ("springs") are never explained.
Missing: **the after-lines are v1** (h1 Jem: "Springs are few. Count the tiles… before you pour"; h2 Kerr: "Cooled tiles near a bellows"). Neither matches v2. The conveyor block (rows 23-26) is the first thing you meet and it's the densest part of the hall. That's the opposite of tutorial-first. There's no tell for which warp pads are paired.
Plan: T: re-plan row 27 (the full-width open corridor) to have a single 1-tile conveyor before the field. V: static arrow art on each belt. Paired springs share a number or colour glyph (pad 1 = 1, and so on), like Mistralton barrels pointing the way. A: **[TEXT BOT REQUEST]** rewrite h1-h6 after lines: belts carry you one way; springs with the same mark send you to each other; the far-right gap is the way in. G: page 3 **[TEXT BOT REQUEST]** on springs. R: reset_note + "the belts loop back, so you can't get stuck" (already in the hint).

### Lanternport lighthouse: 1F invisible maze, 2F warp pads 1-4, 3F maze + plate, lamp room (Master)
Today: hints draft (it describes floors, not mechanics). The guide is on lighthouse 1F. The signs are dev labels. HALL_ENTRY "The Master waits at the far end of the carpet".
Missing: the 1F invisible `x` walls have no tell. On 2F the warp pairs are 4 pairs with no marking. There's no hint that the 3F T plate opens gate b at the stairs. "Lamp room" is not a puzzle today, just the Master's carpet.
Plan: G: **[TEXT BOT REQUEST] hint_lanternport** with one page per floor's rule (hidden walls / paired lights / the plate by the stairs). V: lamp-glow on bumped invisible walls (diegetic: the lighthouse lamp shows them). Each 2F pad pair shares a lens colour. S: turn the dev-label signs into real signs: **[TEXT BOT REQUEST]** stairs signs that name each floor's trick. A: **[TEXT BOT REQUEST]** h1-h10, at least one per floor, about that floor. Optional twist: make the lamp room a mini puzzle (light the great lens) as the "conclude" beat. R: each floor's door resets that floor; say so once.

---
## Part 4. Open-world puzzles
### Greystone B1: boulder + hold plate + release crystal (`greystone_b1.runtime.json`, `field.js`)
Today: walk into the boulder and it moves. The hold plate only stays down under the boulder. The north crystal is a release for players coming south. Boulders reset on map reload. Hiker_b1 is there.
Missing: no line says the plate needs weight. There's no inspect text on the boulder. Reload-reset is never mentioned. Two rocks block the direct line and there's no hint to "line it up first".
Plan: S: **[TEXT BOT REQUEST]** plaque by the plate: it sinks under something heavy, and stepping off lets it rise. A: **[TEXT BOT REQUEST]** hiker_b1 after line: push it round the rocks; leave the cave and it rolls back. V: the plate shows down/up states, and add a scrape mark on the floor along the solution's turn tile. R: say the reload reset in the hiker line. Inspect: **[TEXT BOT REQUEST] field.boulder.inspect**.

### Wellspire / region 9 caves (wellspire worktree): plates + resonance crystals
- **r9_cloudline**: 3 latch plates frozen into the tarns (crossing ice). Missing: no plate counter, no ice rule. Plan: V: the gate shows 3 lamps that light per plate (count feedback). A: **[TEXT BOT REQUEST]** r9_cl_field_1-3 after lines, one per plate's whereabouts. S: **[TEXT BOT REQUEST]** a cairn sign at the gate: "three lights wake the gate".
- **r9_cloudway**: 2 latch plates (W + E). Easy. Plan: the same lamp counter on the gate. One trainer line pointing to the far shelf.
- **r9_echo_cave**: 3 crystals, each flips itself and its neighbours, middle starts lit. Answer: touch W then E. Missing: "flips neighbours" is invisible, so this is Lights Out with no tell. Plan: V: a ripple/sound arc from the touched crystal to its neighbours when it flips. T: this IS the small tutorial for heart_cave, so keep it before heart_cave in progression. A: **[TEXT BOT REQUEST]** r9_ec_field_1/2: "each one sings to the ones beside it". S: **[TEXT BOT REQUEST]** cave wall carving (braille-style legend) showing three lit crystals.
- **r9_heart_cave**: 2 plates (lower gate), then 4 neighbour-flip crystals (upper gate). Answer: outer two. Plan: same ripple tell. A: **[TEXT BOT REQUEST]** a trainer line: "it worked on three in the echo cave; four is the same song". R: **[TEXT BOT REQUEST]** a reset rule plus line. Today crystals only reset by reload, if at all. Make "touch the same crystal twice to undo" explicit.
- **Fernwick runtime crystals** (wellspire): same neighbour-flip, same tell.

### Field skills (Tideglide / Brushbreak / Stonebreak / Glowcall; `field_skills` in overworld_lines.json)
Today: inspect + prompt + cant_use_yet lines exist (good, Gen 4 style). Brushbreak, Stonebreak and Glowcall are "proposed, no built map uses them".
Missing: the cant_use_yet line for brushbreak/stonebreak needs to say where the skill comes from (Tideglide's line already says "Try Mirefen"). Plan: **[TEXT BOT REQUEST]** cant_use_yet for each, naming the town. V: brush and cracked rock tiles must be visually different from ordinary scenery.

### Open-world ice (cindervale / brookhollow maps mention ice/slide)
Not audited in depth (no runtime json). Apply the Frostspire plan: a small first patch, a visible stop tile, and slides always end on floor.

---
## Part 5. Top fixes (priority order)
1. Rewrite the **v1-era after-battle lines** in Cindervale and Tidewater (they describe mechanics that no longer exist). Then check every hall's `after` lines against its v2 grid.
2. **Ship static visual tells on the public alpha** (arrows on conveyors, ice texture, paired-pad glyphs, plate↔gate colour). `hallanim` is off on paigegames.net.
3. Add a shared **reset_note** line plus a door toast once per hall.
4. Turn each hall's **foyer into a tutorial strip** (1 plate / 1 belt / 3 ice tiles).
5. Add **tells for invisible walls** (Revival, Lanternport 1F) by showing them on bump and using trainers as landmarks.
6. Add **neighbour-flip feedback** for crystals and a **lamp counter** on gates for multi-plate puzzles.
7. Rewrite Frostspire's final hint as "rule first, answer on the second ask". Use the same two-tier pattern for every `hint_<zone>`.
8. Merge the wellspire HALL_HINTS (frostspire only) with r58's full set when the branches merge.
