# Regions 5 and 6: story beats (merged)
*Merged by Story Bot, Thu Oct 29 2026, 1:48 PM CT, from design/story_r5_r6/REGION_5_MIREFEN.md and REGION_6_TIDEWATER.md (source of truth). Includes Gary's rulings G1-G7.*

---
# Region 5: Route 1 East, Sunmeadow, Mirefen and the bog (Master Wenna Peat)
*Story Bot outline, Thu Oct 29 2026, 1:40 PM CT; **updated 1:45 PM CT with Gary's 1:43 PM rulings (G1-G5, see §12)**. Package B of design/REGIONS_5_6_PLAN.md. OUTLINE ONLY: no art, no code, no final lines.*
*Every quoted line marked **[SAMPLE]** is a tone sketch for Text Bot, not shipping text. Banned player words respected (no route/berry/PP/shiny/throw-for-capture/Pokédex; "coin" not badge; "dark", never fog wording in the hall).*

## 0. Rules this outline obeys
- **Canon used:** STORY_RULINGS_SOUL (#3 bins, #4 motifs, #7 lumen/Warmth/tint drift, #14 Lantern Rest), STORY_RULINGS_CLUB (The Firefly, the Unbound, MISSING wall tier 3 = Mirefen notebook, "The Missing Note"), QUESTS.md `mq_sunmeadow_crossing`, `mq_mirefen` (main owns the notebook), SOUL_PLAYBOOK 2.6 (Frostspire/Mirefen arc = storm season).
- **Gary, Oct 29 (via parent):** Route 1 East is part of R5. Research areas exist only from R5 on, so the sunken station is the **first research area the player ever sees**. R5 and R6 ship together and must flow. Ron's next battle is in R6, **not here**: Ron is seen in R5 but does not battle (see §6).
- **Kept OPEN (not written as canon anywhere below):** Vane's motive, the crystal-release ending, any Riverbank Stranger link, the Vane memo. Clues may point; nothing explains.
- **Guardian throughline: APPROVED (Gary, Oct 29 1:43 PM CT, G1).** Canon now (from UNDERGROUND_GUARDIAN_SIDESTORIES §5, SOUL 6.4, DEX 442/443/449): the Guardian (Dex 442 Ondravel, name pending) is the river beast of the opening dream; its forehead crystal is cracked and dim; Revival Tech's violet signal (the violet in every crystal) is tuned off the Guardian's crystal, which is why the dream feels like a plea. Three facts are planted across the game: **(1)** the signal is stronger near water and the old river; **(2)** the Guardian's power grows with every crystal fitted (more crystals, brighter shine, lower river); **(3)** a bonded creature's own lumen pushes back (Warmth). R5 plants facts 2 and 3 and opens fact 1; R6 lands fact 1. Still NOT in R5/R6: that the player must battle it down, that it releases crystals (ending ruling B now CANON 3:22 PM CT: crystals keep working, see F5), any Vane link, any Stranger link. The Guardian is foreshadowed, never seen, until the finale.
- **Never stated:** what the field team found. Players feel it through drift, not words (SOUL #7).
- **Gameplay rules:** Warmth never causes disobedience; crystals never come off.
- Story-quality-standard Phase 1 applied: beat tables carry place, time, who, emotion, props, movement. Set lock: every place named here is listed in §9 for World Design's set registry before its first scene.

## 1. Region arc in one breath
The walls dimmed at Frostspire. What was hidden behind them is not a secret lab but a **meadow that is quietly getting better** and a **bog that remembers**. Region 5 is the warm breath before the storm: Nan's Croft, frogs, stilt houses, Marta's careful handwriting. Then the player goes **under** the bog and sees, for the first time, a place where the company studied light itself. They come up, win the Reed Coin, and the sky turns. The storm season starts and it follows them home into region 6.
Emotional curve: relief → curiosity → cosy → unease (station) → earned pride (Wenna) → foreboding (storm).
Motifs: Journey (open fields), Home fragments at Nan's, Revival Tech (bright or reharmonised per `read_drift_log`) in the station, River as a 2-note water drip in the station's deepest room, then 3 notes at Where It Rested (§9a). Never resolves. River never resolves.

## 2. Flow and gates
| Step | Map | Gate | Sets |
|---|---|---|---|
| 1 | route1 east wall → **Route 1 East** (crystal ridge) | `beat_master_frostspire` (wall dims) | `reached_route1_east` (new) |
| 2 | Route 1 East → **sunmeadow_fields** (also reachable via North Road from Revival Heights) | — | `mq_sunmeadow_crossing` s1 |
| 3 | Sunmeadow Croft (Nan Wexley) | — | `sq_shine_*` |
| 4 | Reed Road (or Causeway from Saltmere) → **mirefen** | — | `reached_mirefen` |
| 5 | mirefen_bog: angler, notebook, Marta's camp | `has_bike` for bike boards | `has_field_notebook`, `camp_restored_mirefen`, `read_log_mirefen` |
| 6 | RT Mirefen outpost: promotion unlocks Benefits node → node grants key card | promotion quest §7 + buy node `rt_node_station_m` | `promoted_id14`, `rt_keycard_r5` |
| 7 | **Sunken station** (under mirefen_bog) | `rt_keycard_r5` | `found_station_r5` (new) |
| 8 | mirefen_hall_int: boardwalk puzzle 3-1-4-2, Wenna | — | `beat_master_mirefen` |
| 9 | **Storm breaks** → Wenna teaches Tideglide | `storm_season` | `has_tideglide` |
| → | Storm hook to region 6: Coast Road floods | `gate_coast_road_flood` | — |
Station (7) may be done before or after the Master; the station's last room is better with Tideglide (§5.6 optional pool), so it rewards a return trip.

## 3. Map beats

### 3.1 Route 1 East (crystal ridge), wild 28-32 per DEX (re-level per Game dev §2)
**Feel:** the first fresh air after the cold. Sun on violet-veined rock. The land here was behind the shine for years.
| # | Place | Time | Who | Emotion | Beat |
|---|---|---|---|---|---|
| 1 | Barrier line (E1 pillars at route1 x41) | any | player, lead creature | wonder | The wall is dim. Walking through, the lead creature stops and looks back at the pillars. If E1 was solved, the pillars hum all five notes at once, very faint, then stop (River unresolved). No reward; a moment. |
| 2 | Ridge path | Day | Ridgeskinks sunning | calm, funny | Ridgeskinks lie on the crystal rocks and do not move for you. Sign says "RT SURVEY RIDGE. DO NOT CHIP." Someone has chipped it anyway. |
| 3 | Survey stake line | Day | Field Researcher (existing route trainers re-homed or new) | doubt | A researcher re-takes readings the company already has. "Same numbers, only lower" (echo of Nash on North Road). The ridge glows a little less every season since the wall went up. Points to ore = old lumen (ruled) without saying it. |
| 4 | Ridge overlook | Dusk | — | awe | First sight of Sunmeadow below, gold, and far off a dark smudge of Mirefen and the grey sea. Storm clouds on the horizon, not moving yet (plant). |
| 5 | Optional nook | any | Spinemonitor patrol | threat | A wild Spinemonitor "patrols with a slow, proud walk" and charges if you cut its path: the both-sides rule (wild can be dangerous). |
Sample: **[SAMPLE]** survey sign graffiti: "DO NOT CHIP." / underneath, in pencil: "Too late."

### 3.2 Sunmeadow Fields (+ North Road from Revival Heights)
**Feel:** a place that got its breath back. Flowers came back "the week the wall went dim" (Lomond, existing draft).
- **Arrival beat:** first area sign; RITA area line ("Land behind the barrier is now land on the asset map, {employee_id}."). Contrast: the meadow is the least company-shaped place the player has seen.
- **Nan Wexley's Croft (`sq_shine_*`, existing follow-up):** herd 3 loose Tumbloams. Nan is warm, tired, counts seasons. **Field-team timeline is OPEN** (QUESTS.md note: whether the team stayed here before Greystone) → kept out; Nan only says, **[SAMPLE]** "Had four guests once. Ate everything. Rated my soup an eight. I'm still cross about it." This is a personality nod to Marta (rates lunches) that does NOT set a date. Text Bot: keep it undated. If Gary rejects the visit, cut this one line; nothing else depends on it.
- **"What the Shine Is" (`sq_gd_shine`, from UG audit):** Nan says the shine got brighter every season "as more creatures got fitted". Both-sides beat: one of her Tumbloams was hurt by a wild Enraged creature. "Wild is hard. That doesn't make the shine kind." Keep the "more fitted = brighter" as **Nan's opinion**, not fact (Guardian throughline is a proposal).
- **Trail Kid Jory (G4, both Jorys stay):** after you beat Master Jory Swell (R6), the Sunmeadow kid has one new line. Intent: he's heard there's a Master with his name and is quietly, hugely proud, and wants to know if the Master is nice, because he'd hate to share a name with someone mean. [SAMPLE] "There's a Master called Jory? Is he kind? ...Good. Then I'll keep it." Before R6 (default): he says his name is "the best name" and nobody else has it. Shows once per flag.
- **Ron sighting (no battle):** see §6.
- **Storm plant:** wind turns the meadow grass silver as you leave east. Sunquails stop singing.

### 3.3 Reed Road / Causeway
- Boardwalk starts; red planks are rotten (Ranger Ulla's existing line). Frogs at night = fine; no frogs = worry (Camper Vic) → this pays off in §4 when the frogs go quiet before the storm.
- Causeway (from Saltmere) is drained "for the thaw"; at storm season it floods (sets up R6 water theme).

### 3.4 Mirefen (stilt town)
**Feel:** everyone's slightly damp and nobody minds. Houses lean left; "So do we, now."
- Town greets the player with gossip about the bog lights (Scholar Dilys). Kids run the boardwalks barefoot.
- **RT Mirefen outpost** (new interior, World Design): one damp desk, one supervisor who'd rather be fishing. Promotion beat (§7).
- **The Firefly echo:** a single painted crystal on a Mirefen dog-like creature (Unbound presence here is ordinary, not a cell). Owner says **[SAMPLE]** "My aunt in Fernwick does the paint. Don't tell the outpost."
- **Wenna's hall** is a boathouse on the edge; the hall is dark inside with reed lamps (darkness layer, no fog wording).

### 3.5 Mirefen Bog (dungeon) and Marta's camp — `mq_mirefen` (main, existing)
Keep existing steps. Soul beats added:
| # | Place | Time | Who | Emotion | Beat |
|---|---|---|---|---|---|
| 1 | Boardwalk | any | quiet angler | guarded → kind | "Fish? In this bog? No." Hands the notebook: "Didn't catch a fish. Caught that." (existing). |
| 2 | Reed island (bike boards) | any | — | hope | Camp in the reeds. Tent wrung out; the stove was wrapped up properly (existing). Add: a lunch tin with "7/10" scratched on the lid. |
| 3 | Stove | any | — | ache | Marta's last page (existing text, signed M.Q.; **Mirefen camp = Marta Quill, CANON (G2, Oct 29)**). "The scanners don't like our four" lands harder now: it is the drift idea seen from the field, never explained. |
| 4 | Leaving the island | Dusk | lead creature | warmth | If lead Warmth ≥ 50, it nudges the notebook in the bag. Nothing else. |
After `camp_restored_mirefen`, The Firefly MISSING note gets its tick (existing `sq_counter_mirefen`).

## 4. Start of storm season (the region's turning beat)
Biggest single moment in R5; save the biggest panel/shot for it.
| # | Place | Time | Who | Emotion | Beat |
|---|---|---|---|---|---|
| 1 | mirefen_hall_int door | right after `beat_master_mirefen` | player, Wenna | pride | Coin handed over. Wenna smells the air mid-sentence and stops. |
| 2 | Mirefen boardwalks | Dusk, forced | townsfolk | bustle | Everyone is pulling in nets, tying boats, stacking sandbags. No panic: they've done this every year. Kids are sent home. |
| 3 | Boardwalk edge | Dusk | — | unease | **The frogs go quiet** (pays off Camper Vic). Music drops to one held note. |
| 4 | Sky | Night | — | awe/fear | First lightning over the sea. Rain starts. Storm palette swaps in (World/Animator; `route1_storm` precedent). `storm_season` set. |
| 5 | Wenna's jetty | Night, rain | Wenna, player's water creature | trust | `after_storm`: "The coast road's under water now." She teaches **Tideglide**: the player's creature carries them across the black water, and Wenna walks alongside on the boards until the boards end. `has_tideglide`. |
| 6 | RITA | — | phone | sarcasm | **[SAMPLE]** "Weather event logged, {employee_id}. Assets are not waterproof. Please keep them dry." |
| 7 | Phone inbox (company) | — | — | dread, implied | One generic all-staff memo: "Storm season: field staff report in daily. Missed check-ins will be followed up." The irony (the field team's check-in was cancelled) is left for the player. **Not** a Vane memo; unsigned, from "Facilities". |
**Region link:** storm reaches everywhere the player has been: Brookhollow, Route 1 (storm variant exists) and the Coast Road south of Brookhollow floods (`gate_coast_road_flood`). The player's next goal is to **go home through the storm** — that's how R6 begins.

## 5. Research area #1: the sunken station under Mirefen Bog
**First-discovery weight (Gary):** this is the first time the player sees the company doing research instead of selling. It must feel like opening a door you weren't meant to find.
- **Working name:** RT **Mirefen Peat Station** ("Station M" on the key card). Players never see "research facility" until they read the door plaque. World: a stilted building that sank when the bog rose; entry by a hatch on the old boardwalk, ladder down into dry, tilted rooms behind sealed bulkheads, with one flooded room.
- **Gate:** `rt_keycard_r5` (granted by the Benefits board node `rt_node_station_m`, which the ID 14 promotion unlocks; §7, G5). The hatch has a reader that blinks violet. Sample: **[SAMPLE]** "ACCESS: RESEARCH STAFF. Your lanyard: FIELD. The reader thinks about it. Then it lets you in." (key card overrides).
- **Rules (plan §5):** research-only Kilumen (Bogbeacon, Fenmaw, Gloommire, Stampedor proposed), catch rate x0.5, +2 levels. **Lore reason** they're only here: the station kept them, and they stayed after it sank, living off the warm peat.

### 5.1 First-discovery sequence
| # | Room | Who | Emotion | Beat |
|---|---|---|---|---|
| 1 | Hatch / ladder | player, lead creature | hesitation | Lead creature won't go first. If Warmth ≥ 30, it follows close behind. Ladder is cold; music cuts to drips. |
| 2 | Airlock corridor | — | eerie calm | Lights flicker on, one by one, for you (automatic, still powered). A wall clock is stopped at a time the player can read (art must be legible, correct). A sign: "Shoes off on the clean floor." Mud everywhere. Small, sad joke. |
| 3 | Sample room | wild research Kilumen | wonder | Rows of glass jars of peat. Each jar glows a faint different colour. Label format: "Core 14. Depth 3 m. Colour: amber." These are **old lumen pooled in peat** (canon #7: ore forms where old lumen pooled). Bogbeacons sit on the warm jars like cats on a radiator. |
| 4 | Records office | — | curiosity | Readable logs (§5.2). A whiteboard half-wiped. |
| 5 | Crystal bench | — | unease | A bench of crystals cut from bog ore, each mounted over a small dish. Labels: "Unit test: calm response." A clipboard tallies "drift" per unit. Several units are marked "bonded – handler's own" and every one of those is ticked "drift: yes". The rest: "no". No conclusion is written. The player draws it. If `read_drift_log` is already set, the Revival Tech jingle plays reharmonised when you read it; otherwise reading this clipboard is a valid trigger for `read_drift_log` (Story Bot ruling: OK to trigger here; it is a field-team-era log about drift). |
| 6 | Flooded room (optional, Tideglide) | Fenmaw | awe | Room half under black water. Glide across to a sealed locker. Inside: a toy and a cracked handheld counter (§5.2). Two drips hit the water: the first two notes of the River phrase, then silence. |
| 7 | Exit | RITA | dissonance | **[SAMPLE]** "New asset site logged, {employee_id}. It was always ours. You just weren't cleared." |

### 5.2 Readable lore (clues advance, nothing resolves)
1. **Station plaque:** "Revival Tech Mirefen Peat Station. Lumen yield survey. Est. (year)." Text Bot picks a year consistent with the bible (OPEN Q: game's year scale).
2. **Closing notice:** "Station closed. Staff reassigned. Instruction from Head Office." No name, no reason. (Do NOT sign it H.V.; Vane memo is open.)
3. **Visitor book:** the last page has four handwritten entries on one day. Initials only, in four styles: a list-maker (T.B.), a doodle of a frog (P.A.), "Lunch: none, 2/10" (M.Q.), and a hummed tune written as five dots and a gap (I.S.). This puts the field team **here** after the station closed, borrowing it. **Does not say why** or when relative to Greystone (timeline OPEN). The "five dots and a gap" is the unfinished River phrase: a quiet link to the DJ's Missing Note, nothing more.
4. **Whiteboard (half-wiped):** "Q: does the unit need the crystal to stay calm IF bonded?" The rest is wiped. Someone wiped it in a hurry, or tidily — the player can't tell.
5. **Cracked counter (flooded room):** still shows a number: the count of research Kilumen the team logged. A sticky note on the back: "Count by hand. The scanners don't like our four." Same phrase as Marta's page: confirms she was here.
6. **Optional, after `beat_master_mirefen`:** an old sampling map with a pencilled arrow down the coast: "Tide readings: sea cave, Tidewater." → hooks R6's lab.
7. **Signal strip chart (crystal bench, G1):** a paper strip from a recorder labelled "Carrier: source reference". The violet trace dips every time a sample crystal is set on the bench and recovers slowly; a pencil note: "Each new unit draws on the source. Source is finite?" and, below in a different hand (I.S.), a doodle of a big sleeping creature with a crack on its brow. Plants fact 2 without naming the Guardian.
8. **Bonded-unit tally vs trace (G1):** the four bonded "handler's own" units sit at the bench end; their trace line is flatter, "less draw". Plants fact 3. No one writes why.
**Never** in the station: who cancelled the check-in, what the crystal "really" does beyond these readings, who the "source" is by name, any battle/release talk, any Vane, any Stranger.

### 5.3 Leaving the station (soul)
Back up the ladder into normal daylight (or storm). The lead creature shakes itself off and does something silly (sneeze, roll in mud). Light after the dark. If Warmth ≥ 70, its crystal glints its own colour for one frame (allowed: drift visual exists).

## 6. Ron in region 5 (sighting, no battle; battle is R6)
Ron is laid off (Revival Heights letter) and pretending he's "between things". Ron's motif stays minor-free (it turned minor once, at the letter; back to major only from Lanternport). Here it plays as normal toy-piano but **slower tempo** (audio call; flag if not allowed by motif rules — I rule it's a tempo change, not the minor shift, so OK).
- **Where:** Sunmeadow, at Nan's Croft fence, eating her soup. "Nan says I can stay if I fix the gate. I can't fix gates."
- **Beat:** he asks how many coins you have now. Five? He winces then grins. He says he's "heading down the coast to look at a job". (Sets up R6.)
- **Bins:** Text Bot bin line #5: he got a postcard from the neighbour about it. "It's fine." (The 8 bin lines are owned by Text Bot; this is just where #5 is heard if not in battle. If bin lines must only open battles, move it to R6 and skip here; OPEN-light.)
- **Post-game seed:** QUESTS sq s5 has Nan hiring Ron at the Croft after the finale. This sighting is where that starts: Nan watches him fail at the gate and says **[SAMPLE]** "Useless. Come back when you're not busy." Pays off later.

## 7. Promotion beat (RT Employee Benefits, region 5)
Plan §3: region 5 entry raises cap to ID 14, 1-2 perks, one promotion quest. Story wrapper (Game dev owns numbers/node ids):
- **`pq_bog_census` "Count What's There"** → ID 14, title **[SAMPLE]** "Wetland Field Lead". Needs: finish one Mirefen Count (`sq_count_done`) + restore Marta's camp. Report to the Mirefen outpost supervisor.
- **Scene (G5: cards come from Benefits nodes):** supervisor (feet up, damp socks on the heater) stamps your form. Promotion to ID 14 **unlocks** a new node on the RT Employee Benefits board: `rt_node_station_m` **"Research Access: Station M"** (id proposed; Game dev sets cost/rank). He points at the board: "There's a new pin on there. Field Leads can buy station access. Head Office says. Nobody said why. Nobody ever does." Buying the node **grants** `rt_keycard_r5`; the card arrives by internal post in the outpost pigeonhole, envelope damp. The discovery stays big because the door was a line item on a perks board.
- **First-of-its-kind note (Gary):** research areas exist only from R5 on, so this is the first research-access node on the board. Board card text sets the pattern for R6+ ("Research Access: Station _").
- **RITA:** **[SAMPLE]** "Promoted: Wetland Field Lead. Same number, {employee_id}. Wetter desk."
- Region 5 entry of the Benefits board opens at `beat_master_frostspire` (plan regionFlags). Story flavour: the board posting at the outpost is pinned under a frog-shaped paperweight.

## 8. Master Wenna Peat (Reed Coin, swamp; hall: bog-light boardwalk, frogs croak 3-1-4-2)
- **Who she is:** 50s, bog-born, sleeves always rolled, mud to the knee. Runs the hall out of an old boathouse. Gruff, practical, unexpectedly tender about frogs. Thinks people who call the bog dirty "haven't looked". Hates waste. Loves a good silence.
- **Personality anchors:** answers questions with chores; never says "well done", says "that'll do"; names every frog in the hall; keeps a reed lamp lit in the window for anyone out on the bog at night.
- **Hall (puzzle):** dark hall, reed lamps. Helpers hint that "the frogs know the way, you just have to shut up". Solving it means standing still and listening — soul in a mechanic.
- **Intro (beats, existing draft keeps):** "Folk call the bog dirty. It's just honest." **Reaction to the player:**
  - Notices the RT lanyard first, mud on the boots second. Rates the boots higher.
  - If the player restored Marta's camp before the hall: she knew the four. "The one who rated my eel pie a four. Fair. It was a four." Warm, then quiet: "They were kind to the frogs." (Marta = Mirefen camp is canon, G2.)
  - If lead Warmth ≥ 60: she looks at the crystal a beat too long. "Your one's showing its own colour. Don't let anybody at the outpost talk you into fixing that." She says nothing more. (Implies drift is good; doesn't explain.)
  - If player lost before: "Bog takes boots, not grudges." (existing battle_won).
- **Battle soul:** her ace (Game dev pick) has one off-type answer to the starter it beats (plan §2). Hard, fair. Mid-battle line when her ace is low: **[SAMPLE]** "Easy. You're fine. Breathe." — said to her creature, not the player.
- **After coin:** storm sequence (§4), then Tideglide on the jetty. Afterwards at her window: lamp is lit every night of storm season.

## 9. Side quests (region 5)
| id | Title | Status | Hook → payoff | Soul beat | Feeds |
|---|---|---|---|---|---|
| `sq_ask_nicely` | Ask Nicely | existing follow-up | sit with the angler at Dusk, no talking | The angler finally says one thing about themself: they used to work the station's boat. "Then it sank and nobody asked." (Light link to §5; no secrets.) | U light |
| `sq_count_day` + `sq_ug_count_numbers` | Count Day / Count Day, Again | existing + UG audit | census clerk; count drops in the same reeds weekly; she writes names not numbers | A rules person breaks one rule, once, proudly. Payoff after the station: the counter's number (§5.2 #5) matches the reeds that are emptying. She doesn't say who's taking them. | U |
| `sq_lumen_chain` | Lumen Chain (Wick's lantern) | existing | Wick brightens at a stone on the bog | Ivo's old companion's spark "knows" old lumen. Lantern Rest keeper gets one new line after. | G mood |
| `sq_gd_riverglint` | Where It Rested | **UN-HELD (G1); full outline §9a** | find Riverglint (449) by the dark islet at Dusk | see §9a | G strong |
| `sq_wenna_lamp` (new) | A Lamp in the Window | new | during storm season, a Mirefen kid is out on the bog at Night; follow Wenna's lamp to find them (Tideglide) | Wenna pretends she wasn't worried; gives the kid a chore. Reward: Reed Lamp (room decoration). | soul |
| `sq_shine_*` / `sq_gd_shine` | Past the Shine / What the Shine Is | existing + UG | Nan's Tumbloams | see §3.2 | U/G light |

## 9a. Where It Rested (`sq_gd_riverglint`), full outline (G1)
- **Giver:** the quiet angler, `mirefen_bog`. **Needs:** `sq_nicely_done` (sat at dusk) + `found_station_r5` (seen the sleeping-creature doodle). **Time:** Dusk.
| # | Place | Time | Who | Emotion | Beat |
|---|---|---|---|---|---|
| 1 | Boardwalk | Dusk | angler | trust | The angler, who used to crew the station's boat, says the station crew had a word for the islet: "the bed". The bog used to be a river bend before the water dropped. |
| 2 | Dark islet (Tideglide or bike boards) | Dusk | Riverglint (449) | wonder | A Riverglint flashes gold, always toward upstream (inland, toward Brookhollow's river). It appears only here, where the Guardian once rested (DEX 449 note). Catchable on a later visit; first visit is look-only. |
| 3 | Islet centre | Dusk | lead creature | pull | A hollow in the peat the size of a house, shaped like a curled body. In the middle, a stone with an old violet stain that pulses faintly. Lead creature turns toward upstream every time it pulses (echo of the DJ's note-4 beat, UG R1). If Warmth ≥ 50, its crystal shows its own colour for a beat while near the stone (fact 3: lumen pushes back). |
| 4 | Water's edge | Dusk | — | ache | River phrase, 3 notes from the water, then silence. The water level line on the old posts is far above today's water (fact 2: the river is lower). |
| 5 | Back with the angler | Night | angler | quiet | The angler gives an old drawing: a huge river creature, eyes shut, a crack in its brow crystal. "My gran said it keeps the light. Said it gets tired when people take too much of it." Says nothing more. |
| 6 | — | — | RITA | dissonance | [SAMPLE] "Unregistered landmark, {employee_id}. Not on the asset map. Please stop finding things that aren't on the asset map." |
- **Reward:** the drawing (key item / room decoration "Old River Drawing"); Riverglint becomes catchable at the islet. Flag `sq_rested_done`.
- **Feeds:** fact 2 (more taken, more tired, lower river), fact 3 (Warmth near the stone), opens fact 1 (signal stain sits in an old riverbed). Does NOT say the Guardian must be fought or will release anything.
- **Payoff hooks:** The Firefly poster artist's blank "big one from the river" space (UG R1) can take the drawing's outline; R6 lands fact 1 at the river mouth.

## 12. Gary rulings applied (Oct 29, 1:43 PM CT, relayed by Coder)
- G1 Guardian throughline approved → §0, §5.2 #7-8, §9a. Open calls untouched.
- G2 Mirefen camp = Marta, canon → §3.5, §8.
- G3 Ron's Tidewater fight = optional Ron 5 → R6 §5; R5 sighting unchanged.
- G4 Both Jorys stay → Trail Kid Jory line, §3.2.
- G5 Key cards come from Benefits board nodes; promotion unlocks the node → §2, §5, §7.

## 10. Set registry additions (World Design must build sheets before first scene)
route1_east (crystal ridge), sunmeadow_croft int, mirefen RT outpost int, mirefen_hall_int (built), mirefen_bog reed island camp, **station_mirefen** (hatch, airlock corridor, sample room, records office, crystal bench, flooded room), Wenna's jetty, Mirefen storm variant.

## 11. Into region 6
Leaving Mirefen in the storm, the player's goal is "head home, then south down the coast" (Ron said he's going there; Wenna says the coast road is under water; station map points at the Tidewater sea cave). Three threads, one direction.

---
# Region 6: Coast Road and Tidewater Coast (Master Jory Swell)
*Story Bot outline, Thu Oct 29 2026, 1:40 PM CT; **updated 1:45 PM CT with Gary's 1:43 PM rulings (G1-G5, see REGION_5 §12)**; G6-G7 (1:47 PM CT): Ron rematch window, final Master spellings. Package B of design/REGIONS_5_6_PLAN.md. OUTLINE ONLY. Lines marked **[SAMPLE]** are tone sketches for Text Bot, not shipping text.*
*Same rules as REGION_5_MIREFEN.md §0. Open calls (Vane's motive, crystal-release ending, Riverbank Stranger link, Vane memo) stay open.*

## 1. Region arc in one breath
Region 5 ended with the storm. Region 6 is **the storm at its height, and a town that lives with it**. The player goes home first (Brookhollow in the rain, Ron's bins blown over), then down the flooded Coast Road with Tideglide to Tidewater, where people rescue each other as a habit. Ron is there, soaked, at his lowest, and fights the player because it's the only thing he still knows how to do. Jory Swell teaches the region's lesson: **knowing when to turn back is not losing**. Under the sea cliffs, the second research lab shows the company was measuring the sea itself — and that someone from the field team got here first.
Emotional curve: homecoming in rain → effort (flood) → community → Ron's low and a crack of light → respect (Jory) → calm after the storm peak → pull north to Lanternport.
Motifs: Home (heal jingle in Brookhollow, a little slower in rain), Ron (toy piano, see §5), Revival Tech in the lab, River as wind-chime fragments (never resolved).

## 2. Flow and gates
| Step | Map | Gate | Sets |
|---|---|---|---|
| 1 | Mirefen → home: Reed Road / Sunmeadow / Route 1 (storm variant) → Brookhollow | `storm_season` | — |
| 2 | Brookhollow storm beat (§3.1) | `storm_season` | `saw_home_storm` (new, optional flag) |
| 3 | **Coast Road** (`route_coast` vs `route_brookhollow_tidewater`: name reconcile is World's) flooded | `gate_coast_road_flood` + `has_tideglide` | `mq_tidewater` s1 |
| 4 | **tidewater_coast** town | — | `reached_tidewater` |
| 5 | Sea wall: **Ron 5, OPTIONAL** (G3) | talk to Ron | `beat_rival_ron_5` on win; `ron5_declined` on decline; `met_ron_tidewater` either way |
| 6 | RT Tidewater desk: promotion unlocks Benefits node `rt_node_station_t` → node grants `rt_keycard_r6` (G5) | §7 | `promoted_id16`, `rt_keycard_r6` |
| 7 | **Sea-cave lab** (`tidewater_coast_cave`) | `rt_keycard_r6` + Tideglide + low tide | `found_lab_r6` |
| 8 | tidewater_hall_int: Tide clock puzzle, Jory | `has_tideglide` | `beat_master_tidewater` |
| 9 | Storm peak passes; sea lane north opens | `beat_master_tidewater` | `reached_lanternport` |

## 3. Map beats

### 3.1 Brookhollow in the storm (bridge beat between regions)
Short, no battle. It's what makes R5→R6 flow: the storm isn't "over there", it's at home.
| # | Place | Time | Who | Emotion | Beat |
|---|---|---|---|---|---|
| 1 | Brookhollow square | Night, rain | neighbours | homecoming | Lights on in every window. Neighbours sandbag doors. The kid from home start asks if you've "met any sea monsters yet". |
| 2 | Ron's bin (brookhollow 7,8) | rain | — | comedy/ache | Wind has knocked the bin over. Bags rolled to the fence. Player can stand them back up (interact). Text: one line. If you do, a neighbour waves from a window. |
| 3 | House | rain | Mum/home NPC (existing) | warmth | Heal at home. Guardian (G1): the river behind the house is lower than the player has ever seen it, even in a storm; Mum mentions it in passing. "Ron came by. Borrowed an umbrella. Said he's going down the coast for a job." |
| 4 | South edge | rain | sign | resolve | `gate_coast_road_flood`: "Deep enough to lose a boot. Maybe both." (existing). With Tideglide, the player goes on. |

### 3.2 Coast Road (storm-flooded)
**Feel:** the hardest, wettest walk yet. Waves break over the road. Fun, though: gliding over hedges that are now islands.
- **Stranded people:** 3-4 short rescues are the beats (each also a trainer spot for Game dev's +4-6 R6 trainers). E.g. a postman on a roof with dry letters he refuses to leave; a cliff diver who's "waiting it out" and bored; a reef researcher (RT contractor) whose float went out to sea. Each: a battle or a help, then they point you on.
- **Flood relief:** the player can carry a rescued Tumbloam back to a farmhouse (optional). Soul over XP.
- **Both-sides beat:** a wild Enraged sea creature thrown inland by the storm attacks the road (forced fight or optional). After, a fisher says **[SAMPLE]** "Storm frightens them. Frightens us too. We don't bite, mostly."
- **Storm peak cue:** halfway along, lightning shows the sea cave mouth under the cliffs for one frame (plants §6).

### 3.3 Tidewater Coast (town)
**Feel:** a town that has done this every year for 300 years. Everybody has a job in a storm. Rope, lanterns, soup.
- **Arrival:** the harbour crew are pulling boats up the slip. A child counts boats aloud. One is missing. (Hooks `sq_lights_in_window`, §8.)
- **Lifeguard** (existing NPC id `tidewater_coast_lifeguard`) runs the rescue hut; works with an uncrystalled swimming creature (UG audit `sq_ug_lifeguard`; §8).
- **Beachcomber** (existing) and the violet sea glass (§8).
- **RT Tidewater desk** in a shipping office: half the staff went home for the storm. Promotion (§7).
- **The Firefly echo:** "Names, not numbers" poster on the harbour wall, half washed off.

## 4. Storm season at its peak, then the turn
- R5 started the storm; R6 holds its peak. The Tide clock hall and the sea cave depend on tide; the storm is why the tides are wild.
- **The turn:** after `beat_master_tidewater`, the storm breaks overnight. Morning: first sun on wet slate, gulls back, the missing boat comes in (pays off §8). The storm season continues in the world (Lanternport is still windy) but the peak has passed. Animator: storm overlay → light rain → clear over 3 steps.
- **RITA [SAMPLE]:** "Storm damage below forecast, {employee_id}. Asset losses: acceptable. You: also acceptable."

## 5. Ron's rival battle (Gary: full beat with soul; bins + rivalry)
**Where:** the Tidewater sea wall, end of the breakwater, storm still blowing. **When:** after arriving in town, before the Master. Ron 5, **OPTIONAL (G3)**: Coder must exempt this fight from the Ron 2-6 hard-gate/blackout rule for progression; a loss still blacks out as a normal battle but blocks nothing. (Old note: required hard gate per current code (Ron 2-6 set their flag only on a win; loss = blackout). Optional vs required is a Game dev/Gary call (OPEN).
**Where Ron is in his arc:** laid off at Revival Heights. Since then he has been "going to look at a job" in every region. The job down the coast was a fishing-boat deckhand post. He came in the storm. The boat didn't go out. There is no job. He's sitting on the sea wall in the borrowed umbrella that's turned inside out.

| # | Place | Time | Who | Emotion (Ron / player) | Beat |
|---|---|---|---|---|---|
| 1 | Breakwater approach | storm | player | concern | You see a figure at the end of the wall. Waves come over. You walk out anyway. |
| 2 | End of wall | storm | Ron, his lead | bravado / — | Ron doesn't look round. "Don't say anything about the umbrella." |
| 3 | — | — | Ron | deflecting | He tells you the job "fell through, like, structurally". Then makes a bin joke: the bin line for this fight (Text Bot owns the 8; this is the one after coin 5). Sample sense: **[SAMPLE]** "Neighbour says the bags have started paying rent." |
| 4 | — | — | Ron | raw | The one honest line: he doesn't know what he is if he's not at work. "You've got coins. I've got... the bins." |
| 5 | — | — | Ron | rivalry as rescue | Then he stands up, because battling you is the one thing he's still good at. "Come on. Make me feel like I'm good at something. Or lose, that's fine too." |
| 6 | Battle | storm | — | — | Hard, fair. Ron's team has grown with him: his ace (Game dev) has a move he clearly practised alone. Mid-battle, if his ace is low: he shields it from the spray with the broken umbrella (animation beat). |
| 7a | Player wins | storm | Ron | crack of light | He laughs, actually laughs. "Yeah. Okay. That's the most fun I've had since the letter." |
| 7b | Player loses | storm | Ron | kindness | He doesn't gloat. "Go dry off. Come back. I'm not going anywhere. Literally. No boat." |
| 8 | After (win) | rain easing | Ron, player | trust beginning | He starts to say "I found something—", pats his coat pocket (the log page), then doesn't. "Later. When it's not raining on it." **Plant only**: he shares the page in Lanternport (existing `mq_lanternport` s2, where his motif returns to major). He must not show it here. |
| 9 | Goodbye | — | Ron | humour back | He gives you the inside-out umbrella. Key item / room decoration "Ron's Umbrella" (inside out). "It's a souvenir now." (Given on win, loss or decline; see the optional-fight rules below.) |
| 10 | Later, around town | — | Ron | small growth | Ron helps the harbour crew drag boats. A fisher says he's "useless but cheerful". He takes it as a compliment. |
- **Bin continuity (G3, ruled):** 5 bags (one per coin), no flies yet. The coin-5 bin line opens this talk. The existing line "The flies have names now" **moves to Lanternport** (Ron 6 / page hand-off scene).
- **Optional-fight rules (G3):** the talk splits after beat 4. **Everything with soul is before the split** so every player gets it: the umbrella, the job falling through, the coin-5 bin line and the honest layoff line ("You've got coins. I've got... the bins.") all play in beats 2-4 whether or not you fight. Then a choice: battle / not now.
  - **Decline reaction (new):** Ron is quiet for a second, then nods, almost relieved. Intent: he isn't hurt; he hears that you came out on a storm wall for him, not for a fight. [SAMPLE] "Yeah. No. You're right. I'd have lost my footing anyway." / "...Thanks for coming out here, though." He hands you the umbrella anyway (beat 9), says he'll be in town. Sets `ron5_declined`, `met_ron_tidewater`.
  - **Rematch:** if declined, Ron stays on the harbour slip (beat 10) until `beat_master_tidewater`; talk to battle him there. Line intent: "Changed your mind? Good. I've been practising on the gulls." **Ruled (Gary, 1:47 PM CT, G6):** the rematch window ends at `beat_master_tidewater`. If Ron 5 is still unfought when you beat the Master, a short, warm **parting beat** plays on the harbour slip as you leave the hall: Ron has his bag packed, says he's heading north for the next job, and is glad you got your coin. Intent: no guilt, no sulk; he's proud of you and a little lighter. [SAMPLE] "Coin six. Look at you." / "I'm off north. Save me a fight up there." Sets `ron5_missed`. No penalty; the umbrella was already given at the wall.
  - Win, loss and decline all lead to beats 8-10 (the pocket plant, the umbrella, helping the harbour crew). The pocket plant's wording differs slightly by path (Text Bot).
  - Jory's Ron reaction gets a third variant: declined → "Your friend on the wall. You didn't fight him? Good. Some days you just sit with someone."
- **Motif:** Ron toy piano plays out of tune in the storm (audio texture, still major). The minor shift happened once (letter); it's not repeated.

## 6. Research area #2: the sea-cave lab at Tidewater
Second research area. Not first-discovery anymore, so it plays on **recognition**: the player knows the shape now (reader, rooms, logs) and sees it's bigger.
- **Working name:** RT **Tidewater Signal Lab** (key card "Station T"). In the sea cave under the cliffs (`tidewater_coast_cave`). Reached by Tideglide at **low tide** (ties to the Tide clock theme; Jory may point you to the tide table).
- **Rules:** research-only Kilumen (Abyssray, Lurelamp, Pearlisk, Atollback proposed), x0.5 catch, +2 levels. Lore reason: the lab's lights drew them in and they stayed in the warm pools by the old generators.
- **Not abandoned:** unlike Station M, this lab is **in use**, just empty for the storm. A half-finished mug of tea and a jacket on a chair. The player is trespassing on something live. Tension, not horror.

### 6.1 Sequence
| # | Room | Emotion | Beat |
|---|---|---|---|
| 1 | Cave mouth at low tide | awe | Glide in under the cliff. Violet light from inside reflects on the water. Reader blinks; card works. |
| 2 | Pool room | wonder | Tide pools lit from below. Lurelamps drift. Equipment buoys in each pool, numbered. |
| 3 | Instrument room | unease | Big wall chart: a violet line ("signal strength") over a blue line ("tide"). They move together. **No caption interprets it.** A sticky note: "Correlation is not cause. – T." (Teo-like tidiness; initials only.) |
| 4 | Staff room | human | Rota on the wall; the storm-week column says "ALL STAFF OFF – STORM". A birthday card for someone in the lab, signed by six people. Normal people work here. Both sides. |
| 5 | Sealed drawer (needs the Station M visitor book read, `found_station_r5`) | hope | A second visitor sheet: three entries, initials T.B., P.A., I.S. **M.Q. is missing** (she went to the bog? or ahead? unknown). Note: "Readings copied. Taking them north." → points to Lanternport (where Ron's page waits). Does **not** say Head Office, Greystone, or why. Timeline vs Greystone OPEN. |
| 6 | Shipping crate | dread, implied | A crate stencilled for Lanternport: "INSTRUMENTS – SIGNAL". Lid nailed. Can't open. |
| 7 | Exit at turning tide | urgency | Water rising; glide out before the mouth floods (timed but generous; hard, fair). |
- **River fragment:** in the pool room, wind through the cave mouth plays 3 notes of the River phrase on hanging sea glass (matches beachcomber chimes in §8). Never resolves.
- **Not here:** Vane, any memo signed H.V., any Stranger, any battle/release talk.
- **Guardian, fact 1 lands (G1):** the instrument room's second chart is a coast map with the violet signal drawn as contours. The tightest contour sits on the **river mouth**, and the contours run inland up the river like a vein. Label: "Carrier strongest at fresh-water inflow. Source upstream?" A pinned photo of the river mouth at low tide shows a long dark shape under the water, too blurry to read. Sticky note (T.B.): "Don't guess. Measure." Under it, (I.S.): "It's sleeping. Or it's tired." The player now has all three facts (station: 2 and 3; islet: 2 and 3; lab: 1). Nothing names it or says what anyone will do about it.

## 7. Promotion beat (RT Employee Benefits, region 6)
Plan: cap ID 16, a perk, one promotion quest. Story wrapper (Game dev owns numbers/ids):
- **`pq_storm_duty` "Storm Duty"** → ID 16, title **[SAMPLE]** "Coastal Operations Lead". Needs: help 3 stranded people on the Coast Road (§3.2) + beat the Tidewater Master (Ron 5 is optional, so it is NOT a requirement, G3). Report to the Tidewater RT desk.
- **Scene:** the only person in the office is the night clerk, wrapped in a blanket, who promotes you because "the form says someone has to be here to sign it, and you're someone". Hands over `rt_keycard_r6` "for the cave thing. Don't go at high tide. Last one who did, we had to fill in a form."
- **Soul/irony:** the company promotes you for rescuing people, and the form counts them as "asset retention". RITA **[SAMPLE]**: "Promoted: Coastal Operations Lead. Rescues logged as asset retention, {employee_id}. Lovely."

## 8. Master Jory Swell (Undertow Coin, sea; hall: Tide clock, needs Tideglide)
- **Who he is:** 40s, ex-lifeboat crew, salt-white beard stubble, voice that never rises. Calm the way people get after they've seen the sea take things. Kind, dry, not chatty. Has a bad knee from a rescue; never mentions it. Thinks bravado drowns people.
- **Personality anchors:** asks "how's your team?" before "who are you?"; checks the tide table out of habit mid-conversation; pays out rope slowly. Shared name (G4, both stay): Sunmeadow's "Trail Kid Jory" keeps his name and gets one proud line (R5 §3.2). Jory himself never comments (optional: Text Bot may give him one if he hears of it).
- **Hall:** the Tide clock puzzle; helpers are his old crew. Message of the puzzle: wait for the right tide, don't force it.
- **Reaction to the player (flags):**
  - First meeting: he's out on the slipway in the storm helping pull a boat. You get roped in (literally, a grab-the-rope interact). Only then: "Thanks. Hall's up the hill. Come when it's calm. Nobody fights well in this."
  - If player did the Coast Road rescues: "Heard you pulled people off roofs on the way in. That's the job. The coin's just a coin."
  - If player battled Ron and won: "Your friend on the wall. He all right?" If lost to Ron first: "Bad day for everyone. Go easy." If declined: see §5 optional-fight rules.
  - If lead Warmth ≥ 60: he looks at the creature, not the crystal. "That one'd swim back for you." (Pairs with the lifeguard's secret.)
  - If the player rushes him (talks before the storm turns, optional): "Patience. The water's not ready and neither are you." (soft gate is flavour; real gate is the puzzle.)
- **Battle soul:** his ace (Game dev) is old and scarred; he talks to it calmly the whole fight. When it faints: he kneels with it, ignoring the player for a beat, then stands and hands over the coin. **[SAMPLE]** coin line keep: "Feels heavier than it is. That's the point."
- **After:** the storm turns overnight (§4). Morning: he's on the slip again. "Lanternport's north. Take the sea lane. Keeper there doesn't sleep in a storm either."

## 9. Side quests (region 6)
| id | Title | Status | Hook → payoff | Soul beat | Feeds |
|---|---|---|---|---|---|
| `sq_gd_sea_glass` | Violet Glass | rewrite of placeholder `sq_sea_glass` (UG audit) | beachcomber's best sea glass is violet, more every month; glide to 3 sandbars | She makes wind chimes; one plays part of the River phrase by accident. She gives a bag "for evidence" to deliver to The Firefly (back room). **Do not** say it's crystal dust from the river (that interpretation is the Guardian proposal; OPEN). **G1 update:** she now says it out loud: it washes out of the river mouth, worse every month, "like the river's bleeding" (UG §6). The glass hums faintly when near the lab's tight contour. Lands fact 1 from a local's eyes. | U, G mood |
| `sq_ug_lifeguard` | Unbound in the Water | UG audit | the lifeguard works with an uncrystalled swimming creature | Only shows the secret if lead Warmth ≥ 50. Storm rescue: the creature panics first, then comes back on its own (both sides). He's gruff, protective. Note: an uncrystalled creature exists as an NPC partner only; the player's crystals never come off. | U |
| `sq_lights_in_window` (new) | Lights in the Window | new | one fishing boat is missing in the storm; the skipper's kid keeps a lantern in the window | After the Master, the boat comes in at dawn. The kid falls asleep by the lantern. Player can blow it out (or not). Reward: none / a drawing. | soul |
| `sq_missing_note` step (record) | The Missing Note | existing chain | Record 4 stays in Lanternport (ruled). Optional: Tidewater beachcomber has heard the DJ's tune "in the chimes". One line only, no item. | G mood |
| `sq_ron_umbrella` (new, tiny) | Inside Out | new; **reachable fought or not (G3)**, needs `met_ron_tidewater` | after meeting Ron on the wall, find a working umbrella in the Tidewater shop and give it to Ron at Lanternport | He keeps the broken one anyway. | Ron arc |

## 10. Set registry additions (World Design)
Brookhollow storm variant, Coast Road storm-flood variant, tidewater_coast (+ breakwater end for Ron), RT Tidewater desk int, lifeguard hut int, tidewater_hall_int, **lab_tidewater** (cave mouth, pool room, instrument room, staff room, crate bay), beachcomber's sandbars.

## 11. Into region 7
Three threads point north: the sea lane (Jory), the crate stencilled Lanternport (lab), and Ron's pocket (the page he'll share at Lanternport). The Missing Note's last record is there too. Storm still windy; the lighthouse horn is waiting.

---
---
# ✅ CANON (Gary approved, Oct 29 3:05 PM CT): "Damage Control" origin reveal (R5/R6)
*Story Bot. rev 1 at 2:59 PM CT; rev 2 at 3:03 PM CT; **rev 3 at 3:07 PM CT**. Gary approved rev 2 (Guardian = Line 1, Kilumora = Line 2, the Heritage cover copy, Signal Test 7) with two changes, both applied here: **Ron learns in R6 alongside the player**, and **Coralie keeps the origin implied**. Everything in D0-D10 is **CANON** (Text Bot owns final wording; [SAMPLE] lines are tone only). **Only §F (Finale) details are DRAFT**; the finale premise itself is canon. G1-G7 above are unchanged. Backups in this folder: `story_beats.backup_2026-10-29_1459.md` (before the reveal), `_1502_predraft2`, `_1504_prefinale`, `_1506_prerev3`.*
*Map ids: the live outline's Station M (in `mirefen_bog`) and Signal Lab (in `tidewater_coast_cave`) are called `lab_mirefen_sunken` / `lab_tidewater_cave` here, per Gary. Neither id exists in the repo yet; Coder maps them.*

## D0. The truth (writers' room only, never shown as-is)
- Every Kilumen was made in a Revival Tech lab, **including the Guardian (442) and Kilumora (443)**. None existed before the labs.
- **Line 1 = the Guardian:** the first experiment, a river beast grown at the first lab on the old river. A forehead crystal was fitted to control it. RT tuned the violet master signal off that crystal (G1), and every later line was grown from Line 1's lumen, so one signal reaches them all.
- **Line 2 = Kilumora:** bred to grow crystal. Its shed wing-crystal, buried in the lab dumps and pooled underground, is the ore (SOUL #7). "Every dominance crystal chipped from its wings" is literally true.
- **Signal Test 7 (the cause):** Head Office wanted one signal to command every line at once and overdrove Line 1's crystal. It **cracked**. For one night the signal carried the Guardian's pain to every creature that shared its light. Three labs fell in the same week ("units unresponsive → attacking staff → breach"). This is the **Breakout, 40-60 years ago**.
- **Afterwards:** the creatures spread and settled, and the world grew up around them. The Guardian was re-enclosed as the signal source (finale, §F). Crystals were fitted one by one to drown out the cracked signal: containment, sold as companionship. Field researchers are damage control.
- **Cover story:** RT's **Heritage Office** published "legends" (the Dex text for 442/443, the old stones), so a world suddenly full of creatures had a past.
- **Warmth:** a bonded creature's own lumen drowns out the old pain from inside. That's why bonded creatures settle without needing the crystal (kept IMPLIED until the finale, SOUL #7).
- **Still OPEN:** Vane's motive, the Vane memo, the Riverbank Stranger link.
- **CANON (Gary, 3:22 PM CT, ruling B / Q-F2):** fitted crystals **keep working** after Ondravel is freed. Nothing comes off; the release changes the Guardian, the river and the people who know, not the hardware (see F5).

## D1. Pacing
| Stage | Where | Player learns | Hidden |
|---|---|---|---|
| Seeds | R1-R4 (D7) | Odd gaps: a world before creatures, "the Incident", Heritage stamps | Everything |
| Partial | R5 `lab_mirefen_sunken` | Some creatures were bred here, a batch was lost, and the team "counts what got out" | That all were made; the Breakout; Test 7 |
| Full, **pieced together (never told)** | R6 `lab_tidewater_cave`, **with Ron** | From the index, the logs and the Test 7 sheet: all were made, Line 1 first, and one test broke them all | Where Line 1 is now (finale); Vane; the ending; the Stranger |

## D2. R5: partial reveal in `lab_mirefen_sunken`
| # | Place | Who | Emotion | Beat | Key |
|---|---|---|---|---|---|
| R5-1 | Entry corridor | player, lead | unease | Under the "Lumen yield survey" plaque, an older plaque is mostly covered: "...LINE 14 BREEDING ANNEXE". | `lore.r5.plaque_old` |
| R5-2 | Sample room | lead | doubt | One jar row has species names, not core numbers: "Bogbeacon, gen 3", "Mirewump, gen 5". The lead creature sniffs the Mirewump jar for a long time. | `lore.r5.jar_species` |
| R5-3 | Crystal bench | — | — | G1 strip chart and bonded tally, unchanged. | (existing) |
| R5-4 | Terminal 1 | system | dread | (1) "Line 14 stable. Batch released to the bog for field trial." (2) "Field trial lost. Batch not responding to handlers. Station sealed." (3) "Head Office: count what got out. Do not say 'got out'." | `lore.r5.term_log_1..3` |
| R5-5 | Flooded locker | — | ache | The counter is a tally of escapes counted back. The sticky note about "our four" keeps its meaning. | CHANGED intent: Station M counter |
| R5-6 | Visitor book | — | warmth | Marta: "Damage control, they call it. We call it a census. Sounds kinder." | `lore.r5.visitor_dc` |
| R5-7 | Ladder out | RITA | — | [SAMPLE] "Reminder, {employee_id}: research facilities are a Benefits perk, not a story." | `rita.lab_m.exit` |
- **Marta's camp (G2):** her last page adds "Twelve today. All fine. I don't think they're escapes. I think they live here now." Key `lore.r5.marta_census_line`.
- **Crystal-only evolutions** (Amberpeat) are the station finishing its own lines, which is why they only work there.
- **Note:** in §F the player sees the night this batch was released. R5-4 log (1) is the same event, so no change is needed.

## D3. R6: full truth in `lab_tidewater_cave`, Ron alongside
**Why Ron is here:** the lab key card comes after the Master (G5, `pq_storm_duty`), and G6 says that by then Ron is leaving whether you fought him or not. His boat north sails from the cove at the next low tide, the same tide that opens the cave. He's at the cave mouth with his bag. Intent: he's got an hour and nowhere to be, so he comes in "to keep you out of trouble". G3/G6 stand: the fight window still closes at the Master, and the parting beat still plays there. This is just his last hour in town.
| # | Place | Who | Emotion | Beat | Key |
|---|---|---|---|---|---|
| R6-0 | Cave mouth, low tide | Ron | bravado over nerves | [SAMPLE] "Boat's not till the tide turns. I'm coming in. Someone has to read the signs out loud." Sets `ron_in_lab_r6`. | `ron.r6.lab_join` |
| R6-1 | Cave | Reef Researchers (Coralie, Idris) | normal | Live battles as written. Ron cheers (one line per battle, optional). | `ron.r6.cheer` |
| R6-2 | Instrument room | player, Ron | recognition | **Terminal 2:** containment index. Every Dex number has a line and a facility. The player's lead species has a line; Ron looks up his partner's species and finds it. Line 1 is "442, river unit, Facility 1". Line 2 is "443". | `lore.r6.term_index_header`, `lore.r6.term_index_row`, `ron.r6.index_react` |
| R6-3 | Archive shelf | — | dread | Three labs' logs, the same week: "Units unresponsive" / "Units attacking staff" / "Facility breached". A map circles every RT building, including Revival Heights. | `lore.r6.breakout_log_1..3` |
| R6-3b | Archive shelf | — | cold | **Signal Test 7 run sheet:** "Objective: single-carrier command, all lines. Source: Line 1. Load: 140%." Last row in a shaky hand: "Source crystal fracture. All lines reacting." Dated the night before log 1. | `lore.r6.test7_sheet` |
| R6-4 | Archive shelf | — | irony | Unsigned product brief: "Dominance crystal: containment, rebranded as companionship. Field teams: damage control, rebranded as research." | `lore.r6.brief` |
| R6-5 | Shelf, after 2-4 | Ron, player | the turn | **Ron's beat (intent):** he does the sums out loud, as questions nobody answers: the dates, "Line 1", "all lines". He arrives at it himself: [SAMPLE] "...So before that week there weren't any. Not one." Then Revival Heights on the map: "I took the bins out there for two years." No rage. He looks at his partner for a long time, then: "Still mine, though. Right?" The player's lead creature leans against his leg. Sets `ron_knows_origin`. | `ron.r6.logs_react`, `ron.r6.still_mine` |
| R6-6 | Back room | Coralie | see D4 | Implied confession. | `npc.confessor.*` |
| R6-7 | Visitor sheet | — | hope | Teo: "Readings copied. Taking them north. If the scanners don't like our four, maybe the scanners are wrong." | `lore.r6.teo_note_v2` |
| R6-8 | Exit | RITA | — | [SAMPLE] "Your session in an unlisted area has been noted, {employee_id}." Beat. "...Have a nice day." | `rita.lab_t.exit`, `rita.lab_t.exit_beat` |
| R6-9 | Cove, tide turning | Ron | humour back, tender | Ron's boat. Intent: he jokes to cover it; he'll "think about it on the boat". [SAMPLE] "Don't read anything else without me." He waves from the deck. The Ron motif stays major (G1/SOUL motif rule: back to major from Lanternport; here it's a bright toy piano). | `ron.r6.boat_leave` |
- **`ron_knows_origin` trigger:** set at R6-5 after `read_containment_index` + `read_breakout_logs` + `read_test7_sheet` while `ron_in_lab_r6`. If the player leaves early, Ron says it on the cove instead (same key, short variant `ron.r6.logs_react_short`).
- **Lanternport:** no origin aside (dropped). The G3 flies line and the page hand-off are unchanged.

## D4. Coralie Finch: implied confession (CANON shape)
- **Who:** Dr. Coralie Finch (live Reef Researcher), second talk after you beat her and after Terminal 2. She's around 70. She was a junior tech here on the night of Test 7 (and see §F).
- **Where/when:** back room, low tide, lamp only, cold dinner from a tin, her partner asleep on her feet. Ron leans in the doorway.
- **Rule:** she **never states the origin**. She points, confirms the job, and goes quiet. The player and Ron put it together.
| key | intent | [SAMPLE] |
|---|---|---|
| `npc.confessor.c1` | not denying, tired | "You read the shelf. Everyone reads the shelf." |
| `npc.confessor.c2` | points them back to the evidence | "Read the dates. Then read them again." |
| `npc.confessor.c3` | names the job, not the origin | "They call it research. It's counting. Bringing back. Mopping up." |
| `npc.confessor.c3b_cause` | **reworked: implied only.** Ron asks what Test 7 was. She looks at the run sheet and doesn't answer it. | "I was on nights that week. I made the tea. That's all I did. ...That's all I'm saying." |
| `npc.confessor.c4` | the turn: her partner | "This one was a 'retrieval'. Six years. I'd fight anyone who called it an escape now." |
| `npc.confessor.c5` | asks the lead creature's name, not its number | "What do you call yours? ...Good. Call it that." |
| `npc.confessor.c5_warmth60` | sees its colour, goes quiet | "Theirs did that too. Your four." |
| `npc.confessor.c6_ron` | to Ron's "Still mine?" | She nods once. "Always was." |
- **Must not say:** that they were made; Line 1's whereabouts; that crystals aren't needed; Vane; the ending; the Stranger.

## D5. Field researchers and the missing four
- The camps (Thornwood Imke, Greystone Teo, Frostspire Pell, Mirefen Marta, G2) were catch-again posts first; the four turned them into census camps where they counted, fed and named.
- Their drift finding (SOUL #7) threatens the business itself.
- Fate unchanged: missing, last check-in at Greystone, home alive in the post-game (§F6).

## D6. Recolours
| Element | Recolour |
|---|---|
| Revival Tech | "Revival" means bringing creatures back under control; the company exists because of the Breakout |
| Benefits board (G5) | Perks are clearance levels; Research Access nodes are doors to its own past |
| Vane | Runs a containment company. Motive stays OPEN |
| Ron | Learns in R6 with the player. Revival Heights, where he worked, is on the breach map. Holds on to "still mine". Bins and G3/G6 unchanged |
| Masters | **None know.** No Master line hints at it |
| Crystals | Containment, drowning out the cracked Line 1 signal; cut from Kilumora crystal |
| Crystal-only evolutions | Each lab finishing its own lines |
| Warmth / tint drift | A made creature showing it's someone; logged as a defect because, to containment, it is one |
| Guardian (G1) | Line 1, cracked by Test 7, re-enclosed; every crystal draws on it, so the river runs lower |
| Kilumora | Line 2, crystal-grower; its legend is Heritage copy |

## D7. Seeds for R1-R4 (approved; additive)
| # | Where | Seed | Key |
|---|---|---|---|
| S1 | R1 home | Grandad's drawing of the river "before the creatures": water and reeds, no animals. Mum: "Grandad drew that when he was your age. Said it was very quiet." | `seed.r1.home_drawing`, `seed.r1.mum_drawing` |
| S2 | Revival Centre poster | Fine print: "Serving the region since the Incident." | `seed.r2.poster_fineprint` |
| S3 | R2 old stones | Live Glyph Scholar line kept; a small "RT Heritage Office" stamp is readable after `lore_origin_full` | `seed.r2.stone_stamp` |
| S4 | R3 Club patron | "Enraged, they call it. My dad said that's what the first lot were like." | `seed.r3.club_enraged` |
| S5 | R4 Greystone/Frostspire | Old tally board: "Returned: ###" | `seed.r4.returned_board` |
| S6 | Dex | "Line" field shows "—" until `lore_origin_full` (442 = Line 1, 443 = Line 2); legendary entries get "Entry source: RT Heritage Office." | `dex.field.line`, `dex.field.heritage_note` |
| S7 | Opening dream | No change; it now reads as Line 1 calling | — |

## D8. Hooks (R5/R6)
- **Flags:** `lore_origin_r5`, `read_containment_index`, `read_breakout_logs`, `read_test7_sheet`, `seen_old_plaque_m`, `ron_in_lab_r6`, `ron_knows_origin` (**R6**, see D3), `lore_origin_full` (set with `ron_knows_origin`, or on leaving the lab with all three read), `confessor_done`.
- **Triggers:**
  - Terminal 1 needs `rt_keycard_r5` + station power.
  - Terminal 2 needs `rt_keycard_r6` + low tide.
  - Ron at the cave mouth needs `met_ron_tidewater` + `beat_master_tidewater` + `rt_keycard_r6`, at low tide.
  - The confession needs a Coralie win + `read_containment_index`.
  - Dex Line field and heritage note fill on `lore_origin_full`.
  - RITA exit lines on map exit.
  - Marta's line on `camp_restored_mirefen`.
- **Interactables:** `ins_m_plaque_old`, `ins_m_jar_species`, `term_m_log`, `ins_m_visitor_dc`, `term_t_index` (reads the lead and Ron's partner species), `ins_t_breakout_logs`, `ins_t_test7_sheet`, `ins_t_brief`, `npc_confessor`, `npc_ron_lab` (follower NPC in `lab_tidewater_cave`).
- **Removed:** `ron.lanternport.origin_aside`, `master.wenna.origin_aside`, `dex.field.line_none`.
- **Full key list:** HANDOFF_TEXTBOT_ORIGIN.md.

## D9. Conflicts handled
1. Dex 442/443 "ancient" text → Heritage cover copy (approved).
2. SOUL #7 "nobody states it before the finale" → now fully kept: Coralie implies, and Ron and the player infer.
3. SOUL #7 ore "old pooled lumen" → Kilumora crystal from the lab era.
4. Glyph Scholar line → kept, with the Heritage stamp.
5. G6 timing → Ron's parting beat still plays at the Master; R6 lab and boat are his last hour (no rematch). **Gary to glance.**
6. Q10 (lab staff) → untouched.

## D10. Still open (reveal)
- Map ids (Coder).
- G6 glance (D9.5).

---
## §F. FINALE: "The Night of Test 7"
**CANON premise (Gary):** before the final Guardian battle, the Guardian throws the player back in time to the Kilumen rebellion. The player defeats the research teams, reaches the Guardian's crystal enclosure and releases him, then fights him. Winning ends the game.
**CANON structure (Gary, relayed by Coder, Oct 29 3:19 PM CT):** **Ending 1** = credits roll after the final tower and Ron → after the credits, a **courier** delivers a **Head Office letter** asking the player to investigate a large disturbance in a **mountaintop region** → there the player meets the Guardian face to face → **Ending 2** = the time-travel rebellion chapter and the Guardian battle (F1-F5). **CANON answers (Gary, relayed by Coder, Oct 29 3:22 PM CT):** F2 crystals keep working after the release; F6 the Guardian's name is **Ondravel**; F7 the letter is **eerily kind**; F8 the split below is approved (field team home only in Ending 2, a postcard in Ending 1); F9 the mountain is a **full region** (F-C); F10 the final tower is the **Aurelith Games Stadium** (F-0). Still OPEN: F1 (young Vane), F3 (Coralie epilogue), F4 (boss names), G6 timing (D9.5). Backup before this edit: `story_beats.backup_2026-10-29_1523_preF2.md`.
This answers Q-F5: the lead-in is the courier letter, and the present first lab/spire is on the mountaintop.
**Everything else below is DRAFT, NOT CANON** (rev 4, Story Bot, 3:20 PM CT). Map ids are **PLACEHOLDER_**. Backup before this edit: `story_beats.backup_2026-10-29_1520_preending2.md`.

### F-0. Ending 1's final tower: the Aurelith Games Stadium (CANON: Gary F10)
- **Canon:** the same building as the coin-locked endgame Arena (`aurelith_arena`, gate `gate_aurelith_arena`, all 8 coins / `all_badges` from Cindervale). 8 trainers, one themed floor each, cleared in one run with no going back to heal, and re-battleable any number of times. Ending 1's credits follow it.
- **DRAFT story layer:**
  - Announcer Aurora (live NPC) calls each floor.
  - The lobby has an RT sponsor banner (company_voice).
  - Floor themes and trainers are Game dev's.
  - Story asks only for floor 8's trainer to say one line about "the run" being the point, not the trophy.
- **Ron after the tower (CANON: "the final tower and Ron"; details DRAFT):** Ron waits on the stadium **roof** after floor 8. Recommendation: one free heal first, from Ron himself, who refuses to beat you tired: [SAMPLE] "Heal up. I'm not winning on a technicality." Then the final Ron battle. **Flag (Q-F11):** the live Aurelith city NPC is "rival Ron #6, Lv 58-62" before the Arena, and our outline has Ron 5 at Tidewater. This roof fight's number (7? 8?) and whether the city Ron stays need Coder/Gary.
- **First clear only:** credits 1 roll after the roof (`ending1_done`). Re-battles of the 8 floors (and of Ron, if Game dev wants) never replay the credits.

### F-A. Two endings: what each resolves (CANON: Gary approved the split, F8)
**Principle:** Ending 1 closes the **people** story (Ron, home, the league); Ending 2 closes the **world** story (the Guardian, the lab, the missing team). Each gets its own soul payoff, so neither is hollow.
| Payoff | Ending 1 (final tower + Ron → credits 1) | Ending 2 (Guardian → credits 2 + epilogue) | Why |
|---|---|---|---|
| **Ron's arc** | **Resolved.** Final Ron battle at the tower, then home. **Ron takes out the bins: "Told you. Tomorrow."** Last overworld beat before credits 1 (SOUL #3, canon wording: "last overworld beat before the credits"). | Ron is a friend, not a rival: he waves you off at the courier beat, and he's at Lantern Rest in the epilogue. | The bins are Ron's beat, and Ron's story ends at Ending 1. Keeps SOUL #3 exactly. |
| **Bins / E5 Bin Monument** | The bin is empty after Ending 1, so E5 stays missable (between coin 8 and the finale, SOUL #3). | — | "Finale" = Ending 1 for E5 purposes (flag for Gary). |
| **Home motif** | Credits 1: **Home + Journey + Ron**. River plays only as the 3-note fragment, unresolved, over the last card. | Credits 2: **Home + River (resolved) + Ron** (SOUL motif ruling, canon trio). | SOUL: "River unresolved until the ending" means Ending 2. Credits 1 ending on the unresolved fragment IS the hook. |
| **Field team** | **Not home.** One warm sign of life instead: the courier also has a postcard with no stamp, four initials and a frog doodle: "Still counting. Don't carve anything." Lantern Rest keeper (optional visit): "Not yet. I can wait." | **Home alive**, found at a camp on the mountaintop: they followed the ore north and got snowed in near the spire (Teo's "Taking them north", R6). They walk home with you in the epilogue. | SOUL #14 says "post-game", and Ending 2 is the post-game. The postcard stops Ending 1 feeling like a loss. |
| **Lantern Rest blank stone → bench** | Stone stays, uncarved. | **The bench** (SOUL #14 canon line, "Best kind of stone to lose."). Marta rates it. | Only one change after the reunion, per SOUL #14. |
| **Guardian / River / crystals** | Untouched. The dream returns once, in the night after credits 1, just before the knock. | Ondravel freed; the River resolves; **crystals keep working** (canon F2). | G1. |
| **Origin truth (canon reveal)** | Already known from R6. Ending 1 doesn't re-address it. | Paid off: the player stands in the night it happened. | — |
| **Coralie** | — | Optional epilogue (Q-F3). | — |
**Ending 1 location:** credits 1 follow the Aurelith Games Stadium roof (F-0); the bins beat plays at Brookhollow after the roof, before the credits.
**Risk flagged:** players who stop at credits 1 never see the team home. Mitigation: the postcard, and credits 1 ends on "To be continued…"-style post-credit play (the knock), not a fade.

### F-B. The courier and the Head Office letter (DRAFT)
| # | Place | Time | Who | Emotion | Beat |
|---|---|---|---|---|---|
| 1 | Brookhollow, home | night after credits 1 | player | peace | Sleep. The River dream, one fragment. |
| 2 | Front door | morning | **courier = the R6 Coast Road postman** (the one who wouldn't leave his dry letters) | comic warmth | Knock. He's soaked and proud: "Dry. Every one." Hands over the letter, plus the field team's postcard (F-A). |
| 3 | Kitchen | morning | player, Mum | unease | **The letter (CANON tone: EERILY KIND, Gary F7; wording DRAFT).** Intent: warm, personal, too personal. Head Office knows the lead creature's name and calls it by name, not number (the one thing RT never does, which is the chill). It knows about Mum's soup, Ron's bins and the stadium roof. It thanks the player for "everything you've done for them". It asks, gently, for a favour: there's "a disturbance on (mountain)" and "we think it would like to see you". It promises nothing bad and makes no threat. Unsigned, just "With love, Head Office". NOT a Vane memo (OPEN). The player should feel looked after and watched at once. Mum: "Who writes to a child like that?" |
| 4 | Same | — | RITA (on the letter's QR) | unease | [SAMPLE] "I didn't write this one, {employee_id}." Beat. "...Wear a coat." (RITA, for once, not sarcastic.) |
| 5 | Ron's house | — | Ron | friendship | Ron reads it over your shoulder (eerily kind version, see below). He doesn't come (Ron is home, his story's done), but he gives you a thermos (no drink hint: soup, Nan's recipe). |
- **Tone: CANON eerily kind (F7).** Ron's line becomes: [SAMPLE] "'With love.' ...Yeah, I'd be scared too."

### F-C. The mountaintop region (CANON: a full region, Gary F9; everything else DRAFT)
**Name proposal.** Recommended: **Wellspire**.
- **Wellspire** (recommended): the old river's **well**spring and the lab's **spire** in one word. Locals named the peak after the tower without knowing what it was, and it hides Ondravel in plain sight.
- **Alt 1, Mount Ondra:** the RT Heritage Office "legend" name, after Ondravel. It's cover copy you can only see through after R6; risk: it names the Guardian too early.
- **Alt 2, Headwater Crown:** where the river rose; "crown" echoes Kilumora's crown of violet crystals and the spire's crystal cap.
- **Alt 3, Stillwater Peak:** the source that stopped (G1 fact 2), and what Ondravel's waiting has been for 50 years.
**Region id:** `PLACEHOLDER_r9_wellspire`. **Gating:**
- Opens only after `ending1_done` + `read_ho_letter` (the courier).
- Regions above it are all done by then: 8 coins, the Stadium, Ron.
- Two entrances:
  - **A** from Frostspire (R4): the closed **Skylift Upper Line** reopens ("Service resumed at Head Office's request", eerily kind signage).
  - **B** from Brookhollow: north up the **dry old riverbed**, the river the player grew up beside, to its source.
- No coin and no Master here (the Stadium was the league's end).

| Map (placeholder id) | Kind | Story role | Trainers / wild (Game dev sets numbers) |
|---|---|---|---|
| `PLACEHOLDER_r9_old_riverbed` | route (entry B) | Walk up the dry bed past old water marks far above your head; Riverglint (449) flashes upstream at dusk (R5 echo). | 3: a hiker, a dowser looking for "where the water went", a Heritage guide |
| `PLACEHOLDER_r9_skylift_upper` | station (entry A) | The reopened lift. The operator never got a letter, just a note that it was "paid for". | 1-2 |
| `PLACEHOLDER_r9_cairnfold` | **town** | High herders' village, the region's heal + mart. Folk have seen violet nights for a month. The **RT Heritage Lodge** sells the "Legend of Ondravel" (cover copy in a gift shop; the player knows better). A child has drawn a "sad big fish in the sky". | town NPCs 8-10 |
| `PLACEHOLDER_r9_switchbacks` | route | Snow, wind, the main climb. A **RT survey crew** (3) got kind letters too and argue about whether to go up. | 6: mountaineers, ice climbers, survey crew |
| `PLACEHOLDER_r9_icefall` | dungeon/cave | Frozen falls, the old river's top. Signal strongest here (G1 fact 1). Bonded creatures' crystals show their own colour in the ice. | 4 + wild |
| `PLACEHOLDER_fin_summit_camp` | camp | **The field team, snowed in, alive** (F8 canon). Heal, rest, and Teo's list. They followed the ore north. Pell has drawn the spire 40 times. They stay at camp while you go up. | none (safe) |
| `PLACEHOLDER_fin_lab1_now_ext` + `_f1..f3` + `PLACEHOLDER_fin_lab1_now` (dome) | spire dungeon | The present first lab, crystal-choked. Three floors of sealed 50-year-old labs: a Line 1 nursery, the Test 7 room with its empty control chair, and Kilumora crystal growth. **Soft gate:** crystal doors hum open for any creature showing its own colour (Warmth ≥ 1 tier, flavour; never forces obedience, SOUL #7). The top is the dome → F1. | 3 RT "Facility Keepers" (the eerie letters' authors? No: caretakers who also only ever got letters) |
- **Beats in order:** courier → entry A or B → Cairnfold (Lodge, the kid's drawing) → switchbacks (survey crew) → icefall (signal) → summit camp (reunion, but the team stays) → spire (3 floors) → dome → F1.
- **Set registry (story-quality-standard):** each map above is registered here before its first scene. The fixed props are the Lodge gift shop, the old water marks on the riverbed, the Test 7 empty chair and the Kilumora growth.
- **Music:** Journey thin and high; River fragments louder the higher you go; Home at the summit camp.

### F0. Set registry (per story-quality-standard: register before first scene)
| Set | Map id | First scene | Fixed props |
|---|---|---|---|
| First lab/spire, present: sealed, crystal-choked, **on the mountaintop** at the old river's dry source (Riverglint flashes upstream, R5; the R6 contours run inland toward it) | `PLACEHOLDER_fin_lab1_now` | F1 | Enclosure dome grown over with violet Kilumora crystal; the Guardian inside, cracked crystal dim; dry riverbed above |
| Station M, Breakout night (the sunken lab before it sank; the bog is still a river bend) | `PLACEHOLDER_fin_past_station_m` | F3a | New plaque "LINE 14 BREEDING ANNEXE" (the old plaque, R5-1); full jar rows; sluice gate to the river |
| Signal Lab, same night (`tidewater_coast_cave` 50 years earlier; masts new, no sea glass yet) | `PLACEHOLDER_fin_past_signal_lab` | F3b | Test 7 console; the run sheet (R6-3b) being written; a tea trolley |
| First lab, same night: on the mountaintop, the spring running full | `PLACEHOLDER_fin_past_lab1` | F3c | Crystal spire, 4 floors, enclosure at the top |
| Enclosure, top of the spire | `PLACEHOLDER_fin_past_enclosure` | F4 | Clear crystal dome, Line 1 inside, crystal freshly cracked |
| Old river, dawn | `PLACEHOLDER_fin_past_riverbend` | F5 | The river bend that becomes the Mirefen islet "bed" (R5 Where It Rested) |
| Lantern Rest (live design, map off `greystone_entrance`) | `PLACEHOLDER_lantern_rest` (use the live id when it exists) | F6 | 8 stones, the blank stone, the keeper's Gloamtick |

### F1. The trigger: why the Guardian does it
| # | Place | Time | Who | Emotion | Beat |
|---|---|---|---|---|---|
| 1 | `fin_lab1_now`, enclosure | night | player, team, Guardian | awe → grief | The player reaches the Guardian at the spire top after F-C (lead-in: the courier letter, canon). It's alive, enclosed for 40-60 years, the dome grown solid with crystal. Nothing in the present can open it: the crystal has grown over the lock for half a century. |
| 2 | Same | — | Guardian, lead | plea | The River motif from the opening dream plays. The lead creature's crystal shows its own colour (Warmth). The Guardian looks at that, not at the player. |
| 3 | Same | — | Guardian | resolve | **Why (intent):** the enclosure was only ever open once, on the night its crystal cracked. The Guardian can reach back along its own light only to the moment of its wound. It needs someone whose team pushes back against the pain (bonded, Warmth) to stand where no one could. It's asking, not ordering. Wordless: river light, the dream's water rising. |
| 4 | — | — | — | — | The screen floods with river blue. Flag `fin_timeslip`. |
- **Party rule:** the player's team goes too (bonded, crystals on: SOUL #7, crystals never come off before the ending). Items carry over. **Ron does not go**; he's back in the present (F5).

### F2. The rebellion night: what the player sees
- Landing: the old river bank by Station M, in a storm (mirrors R5's storm start). The river is **full**, higher than any marker the player has seen (G1 fact 2 inverted: no crystals fitted yet).
- Everywhere, lab creatures are panicking, not evil: Mirewump-line, Bogbeacon-line and others from the jars. Violet light pulses in time with a heartbeat-like throb (the cracked signal).
- The player's own team flinches at each pulse. At higher Warmth they steady faster (fact 3), and the player can feel it. Their crystals glow their own colour against the violet.
- Door readers reject the player's lanyard: [SAMPLE] "EMPLOYEE NOT FOUND." RITA is silent; she doesn't exist yet. (Keys `fin.reader_reject`, a beat of quiet.)

### F3. Research-team fights (three labs, the same night as the R6 logs)
The teams are not villains: they're scared staff trying to regain control with **prototype control bands** (pre-crystal). Each lab ends in a boss whose fight is about protecting people, and each one leaves something the present already shows (closed loop).
**F3a. Station M: "Line 14 Annexe".** Trainers: annexe handlers ×3.
- **Boss: Annexe Lead Dr. Ansel Greave** (PLACEHOLDER name). Wants to "hold the batch" to save his jobs and his staff.
- **After the win:** he opens the sluice to get his staff out, and the Line 14 batch floods out into the river bend. This IS R5 terminal log (1)-(2) ("Batch released… field trial lost"); the "field trial" wording was the cover-up.
- Exit by river current (Tideglide on the full river) down to the coast. After F3b, the Guardian's light pulls the player back up the river to its source on the mountaintop (river blue, a travel cut).
**F3b. Signal Lab: "Test 7".** Trainers: signal techs ×3.
- **Boss: Signal Lead Dr. Maren Holt** (PLACEHOLDER name). Wants to run **Test 8**, pushing harder to regain control, which would finish the Guardian.
- **Young Coralie Finch** (about 20, junior tech, on the tea trolley; canon in D4: "I was on nights that week. I made the tea."):
  - Before the boss, she unlocks the tide door for the player.
  - She asks their name; the player's answer is cut off. [SAMPLE] "No. Don't tell me. I'd only have to forget it."
  - After the boss she pulls the Test 8 plug herself. Her shaky hand writes the last row of the run sheet (R6-3b).
- **Avoid:** the player never reads the R6 sheet's future text to her.
**F3c. First lab: the spire.** Trainers: containment staff ×4, one per floor.
- **Boss: Containment Chief** (PLACEHOLDER, unnamed: "the Chief"). Holds the top landing to keep Line 1 shut in, believing it's the source of the danger, which it is, though it's hurting, not hostile.
- **Vane does not appear** (motive OPEN; Q-F1).
- **Climb:** four floors. Each pulse shakes the floor; the team reacts by Warmth tier (flavour only; never disobeys). The Kilumora-crystal walls (Line 2 growth) cast the violet. On the top floor a window shows the three labs' lights going out one by one.

### F4. The release and the final battle
| # | Place | Who | Emotion | Beat |
|---|---|---|---|---|
| 1 | `fin_past_enclosure` | player, lead, Guardian (Line 1) | awe | The dome is clear, not yet overgrown. The forehead crystal is freshly cracked. The Guardian thrashes in pain. |
| 2 | Dome | lead creature | courage | The player puts a hand on the dome. The lead creature presses its crystal to it, and its own colour runs into the crack in the dome. The dome splits. Flag `fin_released`. |
| 3 | Released | Guardian | pain | Free, but still screaming the cracked signal. It turns on the player: not hate, the pain looking for somewhere to go. |
| 4 | **Final battle** | Guardian (442) | — | **Phase 1, Violet:** the maddened signal; the pulse hits the player's team each turn. **Phase 2, Flood:** the full river pours in; water field. **Phase 3, Own colour:** the Guardian's crystal flickers river-blue (its own lumen pushing back, fact 3), and the opening dream theme returns. Numbers are Game dev's. Losing returns you to the top landing (retry), with no time-loop gimmick. |
| 5 | Win | Guardian | calm | The Guardian lowers its head to the lead creature. The pulse stops. **The game's win condition is met** (`fin_guardian_beaten`). |

### F5. The return, and why the present still holds
| # | Place | Time | Beat |
|---|---|---|---|
| 1 | `fin_past_riverbend` | dawn | The Guardian carries the player down the river to the bend (the future Mirefen islet). RT boats are coming. The Guardian lies down in the bend, choosing to stay: if it ran, the night could go differently, and it already knows this is how it goes. [SAMPLE, wordless intent] It nudges the player back toward the light. The hollow it lies in is the "bed" the player found in R5. |
| 2 | → `fin_lab1_now` | night (present, same moment) | River blue fades back. The present Guardian in the enclosure, the same one, has waited half a century for this exact child. It knows them. |
| 3 | Same | — | **Present release (CANON: crystals keep working, F2; staging DRAFT):** the 50-year crystal over the dome crumbles from the inside, because Ondravel is no longer hurting. It steps out. **Every fitted crystal, the player's included, stays on and keeps working.** What changes: the throb in the violet is gone (the pain under the signal stopped), the dry spring at the summit trickles again, and the player's team turns to look at Ondravel in their own colours. Ondravel bows to the lead creature, not the player, and goes down the old riverbed toward home (the River motif). `fin_present_release`. |
| 3b | — | — | **Why this holds (canon check):** (a) **Warmth:** unchanged; drift is still the creature's own lumen pushing through a working crystal. (b) **The field team's finding** (crystals aren't needed for bonded creatures, SOUL #7): still true, and now it's a choice, not a fix. Nobody's crystal pops off; the team walks home carrying the readings, and what the world does with them is people's work (the epilogue). (c) **Vane's sin** (recommendation A, OPEN): burying the findings stays a sin precisely because crystals still work, so there's no magic ending to excuse it. No Vane beat is written. **⚠ OVERRIDE FLAG:** this rejects SOUL BIG DECISION B's recommendation (crystals clear, creatures wander to Field Camps, a clear capture method). Update the SOUL doc and anything built on it, such as Field Camp post-game plans. (d) **The river:** the spring runs again, but the river stays low while crystals keep drawing on it. It's a slow return, not a reset. Flagged (Q-F12). |
| 4 | `fin_summit_camp` | morning | The field team packs up. They saw the spire go quiet. Teo crosses "find source" off his list. |
| 5 | Credits 2 | — | Home, River (**resolved for the first time**) and Ron's motif together (SOUL motif ruling). (Ron's bins beat was Ending 1, F-A.) |
| 6 | **Epilogue: Lantern Rest** | day | **The field team comes home alive** (canon SOUL #14), walking in with the player from the mountain road. Ron is already there with the keeper. The keeper lifts the blank stone away and sets a bench there: "Didn't need it. Best kind of stone to lose." Marta sits first and rates the bench out loud [SAMPLE] "Eight. It's a good bench." Imke hums the River phrase, resolved. **F2 beat:** Teo has the drift readings in a folder. He doesn't say what to do with them; he asks the player to keep a copy. [SAMPLE] "Crystals work. So does this. People get to choose now." |
| 7 | Optional epilogue: Tidewater cove | — | Old Coralie, to the player: [SAMPLE] "I knew your face the minute you walked in. I couldn't say. You hadn't done it yet." (Closes the loop. Q-F3.) |

### F6. Time-paradox risks and how they're avoided
| Risk | Avoided by |
|---|---|
| The player changes history | **Closed loop:** everything the player does in the past is already in the present: the batch release (R5 log), the run sheet's last row (R6-3b), Coralie's tea and silence, the riverbend "bed" (R5 Where It Rested), the Guardian re-enclosed. Nothing the player does contradicts a present record. |
| Meeting yourself, family, or the field team | The player's family and the field team weren't at the labs that night (the field team wasn't born yet; Grandad was a child far away). Only Coralie is met. |
| Coralie should have recognised the player in R6 | She did. Her R6 silence and her "Read the dates" now double as keeping the secret; F5-7 confirms it. |
| Ron in the past | He never goes; he learned in R6 (D3) and stays in the present. |
| Released in the past but enclosed in the present | The Guardian chose to stay at the bend (F5-1). RT re-enclosed it at dawn. |
| Vane's motive leaking via a young Vane | He doesn't appear (Q-F1). |
| A post-game save ordering bug (the field team home before the finale) | `field_team_home` only after `fin_present_release`. |
| The field team found on the summit in the present, but the past has nobody there | They weren't born 40-60 years ago; they're only in the present summit camp. |
| Playing on after Ending 1 changes the world before the courier | `ending1_done` locks the E5 bin (empty); the courier fires on the next sleep. No other world change until Ending 2. |
| Crystals coming off | They never do, in the past or the present (canon F2). |
| SOUL #7 "drift only with bonded creatures" | Respected: only the bonded team's Warmth steadies them. Panicked lab creatures show no drift. |

### F7. Checks against canon
- **G1:** facts 1-3 all play (the full river in the past, the throb by water, Warmth pushes back). Release outcome OPEN. ✓
- **G2:** Marta home and canon. ✓
- **G3/G6:** Ron 5 and his parting beat are untouched; Ron isn't in the past. G6 timing note (D9.5) still open. ✓
- **Two endings:** SOUL #3 bins = Ending 1 credits ✓; SOUL #14 reunion = post-game = Ending 2 ✓; SOUL motif rule (River resolves only at the ending, the credits trio) = Ending 2 ✓; the canon origin reveal is known before both endings ✓; the Head Office letter is unsigned (Vane memo OPEN) ✓.
- **G4/G7:** no conflict. ✓
- **G5:** the past has no Benefits board; the lanyard is rejected. ✓
- **SOUL #3 bins payoff, #7 Warmth and crystals, #14 Lantern Rest, the motif rules:** ✓
- **Ron's arc:** laid off → bins → R6 learns, "still mine" → home for "Tomorrow". ✓

### F8. Finale hooks and keys (DRAFT)
- **Structure flags:** `stadium_floor_1..8`, `stadium_cleared_once`, `ron_final_beaten`, `ending1_done`, `courier_delivered`, `read_ho_letter`, `got_team_postcard`, `reached_summit`, `found_team_summit`, `ending2_done`.
- **Flags:** `fin_timeslip`, `fin_past_m_done`, `fin_past_t_done`, `fin_spire_floor_1..4`, `fin_released`, `fin_guardian_beaten`, `fin_present_release` (variant, pending ruling B), `fin_coralie_epilogue`.
- **Region (Wellspire, placeholder):** `r9_unlocked` (on `read_ho_letter`), `skylift_upper_open`, `r9_entered_via_riverbed`, `r9_survey_crew_done`, `found_team_summit`, `spire_floor_1..3`, `spring_running` (on `fin_present_release`).
- **Structure triggers:** credits 1 after the first Stadium clear + roof Ron (sets `ending1_done`); the courier at the door on the next sleep/wake; the summit map unlocks on `read_ho_letter`; the spire top needs `found_team_summit`; credits 2 + the epilogue on `fin_present_release`.
- **Triggers:** the timeslip on the Guardian interaction in `fin_lab1_now`; the past maps in order M → T → lab1 (river current between them); each boss win opens the next; the dome needs all three; the epilogue after the credits.
- **Interactables:** `fin_reader` (reject), `fin_sluice` (Station M), `fin_test8_plug` (Coralie), `fin_dome`, `fin_bench_swap` (live Lantern Rest hook).
- **Keys:**
  - Ending 1 / courier: `end1.credits_last_card`, `end1.keeper_not_yet`, `courier.knock`, `courier.dry_every_one`, `letter.ho_assignment`, `letter.team_postcard`, `rita.letter_qr`, `ron.letter_react`, `ron.thermos`, `mum.letter_react`
  - Stadium: `stadium.floor8_run_line`, `stadium.lobby_banner`, `ron.roof_heal`, `ron.roof_intro/lose/after`
  - Courier letter: `letter.ho_assignment` (**REWRITTEN intent: eerily kind**), `rita.letter_qr` (REWRITTEN: "I didn't write this one."), `ron.letter_react` (REWRITTEN)
  - Wellspire: `r9.name_sign`, `r9.riverbed_marks`, `r9.skylift_notice`, `r9.cairnfold_*`, `r9.lodge_legend` (cover copy), `r9.kid_drawing`, `r9.survey_crew_1..3`, `r9.icefall_*`, `r9.spire_f1..f3_*`
  - Summit: `summit.sign_*`, `summit.trainers_*`, `summit.camp.teo/marta/pell/imke`, `summit.team_morning`
  - Arrival: `fin.guardian_plea_*` (wordless prompt/system), `fin.reader_reject`
  - Station M: `fin.m.handler_1..3`, `fin.m.boss_greave_intro/lose/after`, `fin.m.sluice`
  - Signal Lab: `fin.t.tech_1..3`, `fin.t.boss_holt_intro/lose/after`, `fin.t.coralie_door`, `fin.t.coralie_name`, `fin.t.coralie_plug`
  - Spire: `fin.lab1.staff_1..4`, `fin.lab1.chief_intro/lose/after`, `fin.lab1.window_lights`
  - Dome and battle: `fin.dome_touch`, `fin.battle.phase_1..3`
  - Return: `fin.riverbend_dawn`, `fin.present_release` (one version; B stubs removed), `fin.epilogue.teo_readings`
  - Epilogue: `fin.epilogue.team_arrive`, `fin.epilogue.marta_bench`, `fin.epilogue.coralie`

### F9. Open questions for Gary (finale)
- **Q-F1 (OPEN):** Does a young Vane appear on the rebellion night? Recommendation: no.
- **Q-F3 (OPEN):** Keep Coralie's "I knew your face" epilogue?
- **Q-F4 (OPEN):** Boss names (Greave, Holt, the Chief) are placeholders.
- **G6 timing (OPEN):** D9.5.
- **Q-F11 (new):** the roof Ron's battle number vs the live Aurelith "Ron #6" city NPC; free heal before Ron on the roof?
- **Q-F12 (new):** after the release, does the river come back slowly (recommended) or stay low?
- **Q-F13 (new):** pick the mountain name: Wellspire (recommended) / Mount Ondra / Headwater Crown / Stillwater Peak.
- **ANSWERED (CANON, 3:19-3:22 PM CT):** F2 crystals keep working; F5 courier + mountaintop; F6 Ondravel; F7 eerily kind; F8 split approved; F9 full region; F10 Aurelith Games Stadium (8 themed floors, one run with no heal back-out, re-battleable, credits 1 after it).

## CANON PICKS (Gary via Coder, Oct 29 2026, 3:25 PM CT)
- Q-F13: the mountain region is **Wellspire** (replace PLACEHOLDER region name; r9 = Wellspire).
- Q-F11: Ron heals the player before the roof fight. Numbering (Story Bot call): the roof fight is **Ron 7** (`ron_7`, flag `beat_n_ron_7`), after the existing Ron #6 in Aurelith city; ron_final_beaten aliases beat_n_ron_7.
- Q-F12: the river comes back SLOWLY after the release (spring trickles in Ending 2 epilogue; flow returns over later visits).
- F1: NO young Vane on the rebellion night.
- Still open: F3 (Coralie epilogue line), F4 (boss names Greave/Holt/the Chief), G6 timing.

---
## §L. Lanternport: Ron's page hand-off (DRAFT, rev 2, Oct 29 3:53 PM CT, awaiting Gary)
**Status:** DRAFT. Talk only, **no battle**. Requested by Coder (regions 7-8). The Ron numbering (Coder, 3:49 PM CT) is not yet a Gary ruling:
- Ron 5 at Tidewater (optional, G3).
- Ron 6 in Aurelith city, before the Arena.
- Ron 7 on the Stadium roof, with Ron's heal first (`ron_7` / `beat_n_ron_7`; F-0, which answers Q-F11).

**Intent.** Ron already knows the origin (R6-5, alongside the player). This scene is about **what he does with it**, not about learning anything new. The page is NOT an origin reveal. It is the **field team's lost reading sheet** that Ron picked up (R5, the pocket plant at R6 beat 8). It has Ron's partner's species on it, with a hand-drawn swatch of its *own* colour, logged as "drift, bonded, stable". It's proof his partner's colour is its own. He could keep it (it's the nicest thing anyone's written about them), but he gives it to the player because it says the team "went north", and the player's going north, not him.

**Gate (Gary via Coder, 3:52 PM CT: Lanternport is reachable BEFORE Tidewater):** `beat_master_tidewater` + not `ron_page_shared`, checked on every entry to Lanternport. If the player arrives early, the town plays normally without Ron, and the scene fires on the first visit after the Tidewater coin. It may come before or after the Lanternport hall/coin, so no line may assume either. It works whether or not the Tidewater fight or the R6 lab happened (no origin line in it).

| # | Place | Who | Emotion | Beat (intent only) | Key |
|---|---|---|---|---|---|
| L1 | Harbour steps, dusk, gulls | Ron, partner | easy | Ron is just *here* (R6-9 "think about it on the boat" pays off loosely: he took the boat north and stayed). Nothing says when the player last saw him or where they came from. He looks rested. The bin line uses the **current coin count** (6 or 7 bags; Text Bot writes `bins6_flies` + `bins7_flies` variants, or one line with {coins}), and **"the flies have names now"** (G3 moved line). | `ron.lanternport.greet`, `ron.lanternport.bins6_flies` / `bins7_flies` |
| L2 | Same | Ron | shy | Pulls out the page he wouldn't show in the rain (R6 beat 8). Hands it over unfolded. | `ron.lanternport.page_offer` |
| L3 | Same | — | tender | **The page (lore read):** a field reading sheet, Teo's hand. His partner's species, a colour swatch that isn't crystal violet, "drift: bonded, stable. Not a fault." Footer: "Team heading north after the ore." | `lore.lanternport.page` |
| L4 | Same | Ron | quiet pride | Intent: he says the sheet is the first time anyone official called his partner his. He kept it two regions. [SAMPLE] "Says it's not a fault. Wrote that down. On paper." | `ron.lanternport.page_why` |
| L5 | Same | Ron | letting go | Why he's giving it away: "North" is the player's road; he's done chasing. No origin talk; at most a glance at the partner. [SAMPLE] "You're going up there anyway. Take it to them." | `ron.lanternport.page_give` |
| L6 | Same | Ron | humour back | He's heading home, then "Aurelith, obviously, someone has to beat you." Plants Ron 6. Ron motif **back to major** (SOUL motif rule). | `ron.lanternport.leave`, `ron.lanternport.ron6_plant` |
- **Flags:** sets `ron_page_shared`, `read_log_lanternport` (keeps the live quest flag). The key item is "Field Reading Sheet" (`item_field_reading_sheet`). It pays off at `PLACEHOLDER_fin_summit_camp` (F-C): Teo recognises it. Optional key: `fin.summit.teo_sheet_back`.
- **Set registry:** Lanternport harbour steps (new set). Props: Ron's coat, the sheet (fixed text), gulls, the lighthouse visible across the harbour.

**Order check (story-quality-standard):**
- **Order (story order, not map order):** the scene always plays after Tidewater (Ron 5 window, R6 lab, the boat) because of the gate, and before Aurelith (Ron 6), since Aurelith needs all 8 coins. Lanternport itself may be visited earlier, but that has no effect. **It fits between Ron 5 and Ron 6, not between Ron 6 and Ron 7.**
- **Ron's arc:** laid off (R6 low) → learns the origin with the player (R6-5) → "think about it on the boat" (R6-9) → **here he chooses his partner over the paperwork and lets go of chasing** → Ron 6 as a friend-rival → Ron 7 on the roof → Ending 1's bins "Told you. Tomorrow." OK.
- **Origin canon:** no new reveal. Ron's knowledge stays as in R6. Coralie isn't mentioned (she only implies). Warmth is shown, not explained. The banned-word list is respected.

**Conflicts for Coder/Gary:**
1. **The live quest `mq_lanternport_s1` says "Battle him (Ron 5)"** (`beat_rival_ron_5`) and s2 says "Afterwards Ron hands you a log page". It needs a data change to talk-only (s1 → `ron_page_shared`).
2. **`lanternport_ron_5` "optional Ron 5 catch-up"** (plan line 37) clashes with G3 (Ron 5 is at Tidewater) and G6 (the rematch window ends at the Tidewater Master). Recommendation: remove it.
3. **The plan calls Ron 6 the "final Ron"** (lines 14, 38, 45). That's superseded by Ron 7 on the roof (Coder 3:49 PM CT; needs Gary's OK).
4. **Plan Q4: ANSWERED (Gary, 3:52 PM CT):** Lanternport stays reachable before Tidewater. The scene waits for the Tidewater coin and fires on a later visit.
5. The bag count is 6 or 7 depending on whether the Lanternport coin came first (G3: one bag per coin). Text Bot needs both variants. Coder: read the coin count at scene time.

- **rev 2 note (3:53 PM CT):** removed the arrive-from-Tidewater assumptions: the gate wording, the L1 boat line, the bag count and the order check. Backup: `story_beats.backup_2026-10-29_1553_preL2.md`.

---
## §S. Lanternport Grotto: the SIGNAL crate (DRAFT, rev 1, Oct 29 4:18 PM CT, awaiting Gary)
**Spot:** `lanternport_grotto_signal_crate` (keeper's alcove, 15,4; wired in wt_r58 `src/region78/index.js`). It's the same crate as the nailed-shut one in the Tidewater lab (`system_story_r56.g23_crate`; R6 lab table row 6, "INSTRUMENTS – SIGNAL").
**Job:** a SEED toward Signal Test 7, not the reveal. **Order-safe:** Lanternport is reachable before Tidewater, so the crate must read as merely odd to someone who hasn't done the R6 lab, and click for someone who has read the Test 7 sheet ("Load: 140%"). No origin words. Coralie and Ron aren't involved.

| Key | When | Intent | Suggested content (Text Bot writes the final line) |
|---|---|---|---|
| `system_story_r78.signal_crate_first` (sets `found_signal_crate_r7`) | first look | The lid has been pried up and the straw is damp. Most of it is gone, and one instrument is left: a **signal load gauge**, dial marked 0–150%. Past 100 the face is painted red, and someone has scratched a small "7" into the red. The needle is stuck at the far end. A soggy packing slip: "Return to Facility 1 for recalibration. Do not exceed 100%." | "LANTERNPORT. INSTRUMENTS – SIGNAL. The lid's been pried up. Only one gauge left in the straw. Its needle is jammed past the red, where someone scratched a '7'. The slip says: do not exceed 100%." |
| `system_story_r78.signal_crate_again` | repeats | The needle still hasn't moved. | "The SIGNAL gauge. Still jammed past the red." |
- **Seed logic:** the 7, the red band past 100 and "Facility 1" are the only hooks. The player who has read the R6 run sheet (Test 7, Line 1, Load 140%) connects them; the player who hasn't just carries an itch. Who pried it open stays unexplained (no new mystery owner; Record 4 of The Missing Note is untouched).
- **Banned/tone check:** no route/coin issues; no drug/drink hints; no company_voice; RITA silent.
- **Set registry:** keeper's alcove props: the crate (open), damp straw, the gauge (fixed: needle past red, a scratched 7), the slip.

**Tidewater `system_story_r56.g23_crate`: wire as an examine spot? YES (agree with Coder).** One line, no flag: "Nailed shut. Stencilled: LANTERNPORT. INSTRUMENTS – SIGNAL." That makes the Lanternport crate a recognisable callback, and both orders work: Tidewater first means "it got here"; Lanternport first means "there's another one" or "that's where it came from". Text Bot: keep the stencil text identical in both keys.
