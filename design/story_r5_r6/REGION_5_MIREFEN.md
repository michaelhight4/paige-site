# Region 5: Route 1 East, Sunmeadow, Mirefen and the bog (Master Wenna Peat)
*Story Bot outline, Thu Oct 29 2026, 1:40 PM CT; **updated 1:45 PM CT with Gary's 1:43 PM rulings (G1-G5, see §12)**. Package B of design/REGIONS_5_6_PLAN.md. OUTLINE ONLY: no art, no code, no final lines.*
*Every quoted line marked **[SAMPLE]** is a tone sketch for Text Bot, not shipping text. Banned player words respected (no route/berry/PP/shiny/throw-for-capture/Pokédex; "coin" not badge; "dark", never fog wording in the hall).*

## 0. Rules this outline obeys
- **Canon used:** STORY_RULINGS_SOUL (#3 bins, #4 motifs, #7 lumen/Warmth/tint drift, #14 Lantern Rest), STORY_RULINGS_CLUB (The Firefly, the Unbound, MISSING wall tier 3 = Mirefen notebook, "The Missing Note"), QUESTS.md `mq_sunmeadow_crossing`, `mq_mirefen` (main owns the notebook), SOUL_PLAYBOOK 2.6 (Frostspire/Mirefen arc = storm season).
- **Gary, Oct 29 (via parent):** Route 1 East is part of R5. Research areas exist only from R5 on, so the sunken station is the **first research area the player ever sees**. R5 and R6 ship together and must flow. Ron's next battle is in R6, **not here**: Ron is seen in R5 but does not battle (see §6).
- **Kept OPEN (not written as canon anywhere below):** Vane's motive, the crystal-release ending, any Riverbank Stranger link, the Vane memo. Clues may point; nothing explains.
- **Guardian throughline: APPROVED (Gary, Oct 29 1:43 PM CT, G1).** Canon now (from UNDERGROUND_GUARDIAN_SIDESTORIES §5, SOUL 6.4, DEX 442/443/449): the Guardian (Dex 442 Ondravel, name pending) is the river beast of the opening dream; its forehead crystal is cracked and dim; Revival Tech's violet signal (the violet in every crystal) is tuned off the Guardian's crystal, which is why the dream feels like a plea. Three facts are planted across the game: **(1)** the signal is stronger near water and the old river; **(2)** the Guardian's power grows with every crystal fitted (more crystals, brighter shine, lower river); **(3)** a bonded creature's own lumen pushes back (Warmth). R5 plants facts 2 and 3 and opens fact 1; R6 lands fact 1. Still NOT in R5/R6: that the player must battle it down, that it releases crystals (ending ruling B is open), any Vane link, any Stranger link. The Guardian is foreshadowed, never seen, until the finale.
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
