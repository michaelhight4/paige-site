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
