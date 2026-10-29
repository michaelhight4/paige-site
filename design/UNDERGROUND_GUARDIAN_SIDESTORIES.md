# Underground push-back + the Guardian's power: side-story audit and proposals
*Coder audit, Thu Oct 29 2026, 11:40 AM CT. Asked by Gary at 10:53 AM CT: "are we adding enough side stories to fuel the underground push back on the kilumen research and the power of the guardian you end up needing to defeat?"*
*Outlines only, no code or data changed. Text Bot drafts every line later. Story Bot / Gary own canon. Banned player words checked (no PP, shiny, super effective, Pokédex, Poké Ball, Gotcha!, nurse, weed, route(s), "throw" for capture).*

Sources read: `design/overnight_quests/SIDE_QUESTS.md` (34 side quests), `design/overnight_quests/QUESTS.md`, `design/SOUL_PLAYBOOK.md` (6.2, 6.4, 6.6, E1/E6/E7/E14, leitmotifs), `design/STORY_RULINGS_SOUL.md`, `design/STORY_RULINGS_CLUB.md`, `design/DEX_450.md` (442 Ondravel, 443 Kilumora), `/workspace/quality/dev_notes/kilumen.md`, `data/quests.json` + `src/progression/quests.js`.

Regions = the 8 Master halls: 1 Fernwick (with Brookhollow, the first trail, Thornwood, The Firefly), 2 Saltmere (with Greystone Caverns + Lantern Rest), 3 Revival Heights, 4 Frostspire (with Sunmeadow Fields), 5 Mirefen, 6 Tidewater Coast, 7 Lanternport, 8 Cindervale. Aurelith = finale.

---

## 1. Short answer
**No, not yet.** The underground thread is strong in region 1 (The Firefly is a hub with 6 quests) and then almost vanishes. Regions 3, 6, 7 and 8 have **zero** side stories that feed it; regions 2, 4 and 5 have one or two that feed it by accident (moss, a map, a trade chain). The Guardian's power is fed by **no side quest at all**, only by easter eggs (E1 pillars, E14 dreams) and the River motif. And the finale's confrontation (`mq_finale` step 6) is still a PENDING STORY CALL, so nothing in the side layer is pointing at a payoff yet.

## 2. Main-plot threads that exist today
| Thread | Where it lives | State |
|---|---|---|
| **The Unbound** (rebels, "the Riverbank Stranger's people") believe the crystal causes creature fear. Street-level opposition to Revival Tech's crystal research. | STORY_RULINGS_CLUB R1, SOUL 6.2; hub = The Firefly (`club_int`) | Ruled. No raid, no join/betray, single ending. Post-game they host the clear-crystal party. |
| **Tint drift** = Warmth = the creature's own lumen pushing back through the crystal; company logs it as a defect. | STORY_RULINGS_SOUL #7, inbox memos, Revival Tech jingle swap | Ruled. Implied only, never stated before the finale. |
| **The missing field team** (4 researchers) proved drift only happens with bonded creatures, went to Greystone to find the ore source, check-in cancelled. | SOUL 6.6, camps, log pages, E7 tally marks, Firefly MISSING wall, `sq_tell_the_counter` | Built spine. Found alive post-finale (`found_field_team`). |
| **Ore = old lumen pooled underground.** Digging scars the land; fireflies dim; Trail Buddy flinches at ore. | STORY_RULINGS_SOUL #7 | Ruled; fed only by `sq_fireflies`. |
| **Director Hollis Vane**, "comfort, not cruelty"; buried the drift findings. | STORY_RULINGS_SOUL A (recommendation) | **Pending Gary.** |
| **The Guardian** (Dex 442 Ondravel, name pending): river beast from the opening dream, forehead crystal cracked and dim until the finale, offers to release every crystal; Guardian battle = "Awe" with the full River motif. | SOUL 6.4, DEX_450, leitmotif bible, E1, E14 | **Pending Gary** (ruling B). Note: Gary's question says the Guardian is someone "you end up needing to defeat"; the docs frame it as a gift-giver you battle in awe. Section 5 proposes a way to make both true. |
| **Kilumora** (Dex 443): "every dominance crystal was chipped from its wings". | DEX_450 note only | Unused in story. Strong underground lever (see proposals). |
| **Legendary Guardian quest** | QUESTS.md line 631 | Explicitly **not drafted**. |

## 3. Which side stories feed the threads today (per region) and the gaps
Legend: **U** = builds the underground's case, **G** = foreshadows the Guardian's power, (weak) = only by setting.

| Region | Side quests that feed | Feeds | Gap |
|---|---|---|---|
| 1 Fernwick | `sq_tell_the_counter` (MISSING wall, camp ticks), `sq_fireflies` (ore scars dim the fireflies), `sq_missing_note` (DJ's records, the unfinished 5-note River phrase), `sq_paint_job` (crystal paint), `sq_open_mic`, `sq_fort_sign` (weak) | U strong, G weak (DJ hum only) | Nothing tells the player **what the Unbound actually want or have seen**. No Unbound member has a personal stake on screen. |
| 2 Saltmere (+Greystone) | `sq_cave_sketch` (weak), `sq_flowers_old_hal` (Lantern Rest, weak), `sq_lucky` (glass crystals mock RT, comic) | U weak | No Unbound presence in Saltmere at all. Greystone is THE ore site and the last check-in, but no side story shows the dig, the workers, or what the ore does. |
| 3 Revival Heights | `sq_lost_lanyard` (pro-company, neutral) | none | **Total gap**, and it's the company's home town. No insider who doubts. |
| 4 Frostspire (+Sunmeadow) | `sq_cold_hands`, `sq_past_the_shine`, `sq_over_the_wall` | none | Frostspire camp + main quest mention drift, but side layer is all errands. Sunmeadow's barrier "shine" is a crystal field; never explained. |
| 5 Mirefen | `sq_lumen_chain` (Wick's lantern brightens at a stone), `sq_ask_nicely` (field notebook), `sq_count_day` | U medium, G weak | Count Day is the company's census of wild creatures; it never pays off as research harm. |
| 6 Tidewater | `sq_sea_glass` (placeholder) | none | **Total gap.** Water region next to the Guardian's river; ideal for G. |
| 7 Lanternport | `sq_forecast`, `sq_missing_note` step 5 (record) | weak | Ron's shared log page is main-plot; no side story backs it. |
| 8 Cindervale | `sq_warm_stones` (placeholder) | none | **Total gap.** Caldrith (Dex 447) sleeps under Cindervale; no link to the crystal/Guardian. |
| Aurelith | `sq_ticket_stub`, `sq_lucky` payoff | none | Finale confrontation itself pending. |

**Score:** 8 of 34 side quests touch the theme; 6 of those are in region 1. Regions 3, 6, 8 have nothing. 0 side quests build the Guardian.

## 4. Design rules for the new set
- **Vignettes, not lectures** (SOUL rule 4). The Unbound's case is shown through people and creatures, never stated. Nobody says "the crystal causes fear" outright before the finale.
- **Both sides partly right** (SOUL 6.2). At least one story per three regions shows a wild creature that really is dangerous, so Vane isn't a strawman.
- **The Guardian is foreshadowed, never seen** until the finale: river motif fragments, cracked forehead crystal motifs, Riverglint (449) where it "once rested", the dreams moving upstream (E14).
- **Warmth is the evidence.** Many payoffs read the lead creature's Warmth (no disobedience, no crystal removal before the ending; ruling #7).
- **No drinking, smoking or drugs** at The Firefly or anywhere (Gary rule). Juice counter only.
- **No new faction.** Unbound members can be new NPCs, but they're the same group.
- Each region gets one **U** story, one **G** story, and where noted a third that does both. Each has a soul/personality beat.

## 5. The Guardian's power: a throughline proposal (for Gary)
To square "the Guardian you need to defeat" with "the Guardian offers release": **the Guardian has been pulled under the company's signal.** Kilumora's legend says every crystal was chipped from its wings; the Guardian's own forehead crystal is "cracked and dim". Proposal: Revival Tech's master signal (the violet in every crystal) is tuned off the Guardian's crystal, which is why the River dream feels like a plea. In the finale you have to **battle it down to crack its crystal** (the "defeat"), and once it's clear, it releases every crystal (the "gift"). The side stories below plant three facts across the 8 regions so the finale lands:
1. The violet signal is stronger near water and the old river (the Guardian's bed).
2. The Guardian's power grows with every crystal fitted (each new crystal feeds the signal; Count Day numbers rise, the river runs lower).
3. A bonded creature's own lumen can push back against it (Warmth). So your team's Warmth is what wins the fight.
This needs Gary's ruling before Text Bot writes anything that states it.

## 6. Proposed new side stories (outlines)
Ids are proposals (`sq_ug_*` = underground, `sq_gd_*` = Guardian). Map ids are internal, not player text.

### Region 1 — Fernwick (+Brookhollow, Thornwood, The Firefly)
1. **`sq_ug_greenhouse` "Two Pots"** — *Hook:* the greenhouse guy (rebel_patron_2) grows the same seedling twice, one by a crystal shard, one by a firefly jar, and asks you to check them each day for 3 days.
   - *Underground:* the crystal pot wilts a little; the firefly pot thrives. He refuses to draw a conclusion ("one pot's not science"), which is the Unbound's honest side.
   - *Guardian:* on day 3 the firefly pot has a tiny water bead that hums the first 2 River notes.
   - *Soul:* he's the "partly naive" one; ends by giving you the healthy cutting for your room (house_2f decoration).
2. **`sq_ug_poster_names` "Names, Not Numbers"** — *Hook:* the poster artist (rebel_patron_1) wants your creatures' nicknames for the poster wall.
   - *Underground:* she paints creature names over RT catalogue numbers clipped from company flyers. Your nicknames go up too.
   - *Guardian:* the last blank space she leaves for "the big one from the river, whatever its name is".
   - *Soul:* if your lead has Warmth 50+, she paints its true colour faintly behind the violet. Ties to poster_names prop.
3. **`sq_gd_dj_phrase` "The Fifth Note"** (follow-on to `sq_missing_note`) — *Hook:* with his records back, the DJ still can't finish the 5-note phrase.
   - *Guardian:* he plays it at night; your lead creature turns toward the river every time it stops on note 4. He says he heard it "under the water, like something calling for help".
   - *Underground:* he's sure the company signal "jams" the last note.
   - *Soul:* he's embarrassed he dreams about a river; Ron (if in party later) admits he does too.

### Region 2 — Saltmere (+Greystone Caverns, Lantern Rest)
1. **`sq_ug_dock_shards` "Off the Books"** — *Hook:* a Saltmere dockhand quietly asks you to count crates from Greystone that don't match the shipping log.
   - *Underground:* more ore leaves than RT declares. The dockhand is Unbound but scared for his job; you just count.
   - *Guardian:* one crate is wet and has river silt in it, though Greystone is dry.
   - *Soul:* he pays you in Saltmere salt-toffee, "the only thing here that isn't counted".
2. **`sq_gd_miner_lamp` "What Ivo Heard"** — *Hook:* a retired Greystone miner (new NPC, name TBD; working name Ivo) tells you why he quit: the deepest seam "breathed".
   - *Guardian:* in greystone_b1 at night a crack in the wall shows water moving behind violet crystal; Wick's lantern dims there.
   - *Underground:* Ivo left because the creatures digging beside him were crystalled and couldn't flinch when the seam shifted. Shows the ore site, the cost, without horror.
   - *Soul:* ties to Lantern Rest; Ivo lays a stone for "the canary-creature that warned me anyway".
3. **`sq_ug_honest_glass` "Glass Is Honest"** (rider on `sq_lucky`) — *Hook:* the lucky-crystal seller confesses his "glass crystals" sell best to people who hate the real ones.
   - *Underground:* shows ordinary townsfolk buying a fake crystal so their creature "looks fitted" for RT inspectors, but isn't. Quiet resistance through comedy.
   - *Soul:* he's a coward with a heart; small, funny, true.

### Region 3 — Revival Heights (biggest gap)
1. **`sq_ug_intern_memo` "Recalibration Queue"** — *Hook:* the intern from `sq_lost_lanyard` asks you to deliver a box of "drift units" to the lab floor.
   - *Underground:* the box is creature carry-cases with tags reading "tint drift: recalibrate". The intern starts to ask questions and you see the doubt grow. Nothing is shown being harmed; the cases just go behind a door.
   - *Guardian:* the lab floor window looks at the river; the intern says the river "used to be higher".
   - *Soul:* she's eager, then quiet. Post-game she joins the Unbound party with a clear-crystal creature.
2. **`sq_gd_lobby_art` "The Founder's Picture"** — *Hook:* the HQ lobby has a painting of the founder kneeling by a huge river creature with a cracked crystal; a security guard asks you to report anyone "staring at it too long".
   - *Guardian:* the first image of the Guardian anywhere, half covered by a company banner. The plaque says "Where it all began".
   - *Underground:* an old cleaner says the Unbound "would give their eyeteeth for the bit under the banner". You can lift the banner corner at night to see the creature's eyes are shut, in pain.
   - *Soul:* the guard is kind and bored; he lets you look "for one second".

### Region 4 — Frostspire (+Sunmeadow Fields)
1. **`sq_ug_frozen_camp` "Notes in the Snow"** — *Hook:* the Frostspire climber (`sq_cold_hands`) found a frozen field-team page by the pass.
   - *Underground:* the page is a drift chart: bonded creatures warm, unbonded creatures cold. You carry it to The Firefly; the bouncer pins it up.
   - *Guardian:* a pencil note on the back: "signal strongest downstream?"
   - *Soul:* field-team personality beat (the one who rates lunches rates the snow).
2. **`sq_gd_shine` "What the Shine Is"** — *Hook:* an old Sunmeadow farmer (new NPC, name TBD; working name Nan) says the shine on the barrier gets brighter every season "as more creatures get fitted".
   - *Guardian:* plants fact #2: more crystals, brighter barrier, lower river.
   - *Underground:* Nan isn't Unbound; she just counts seasons. Both-sides beat: her Tumbloams escaped the shine and one got hurt by a wild Enraged creature. "Wild is hard. That doesn't make the shine kind."
   - *Soul:* Halovy at dawn; a quiet stop-and-look moment.

### Region 5 — Mirefen
1. **`sq_ug_count_numbers` "Count Day, Again"** (follow-on to `sq_count_day`) — *Hook:* the census clerk notices the count goes down every week in the same reeds.
   - *Underground:* RT field crews take creatures from the count area for "catalogue". The clerk quietly changes her report to names instead of numbers.
   - *Guardian:* where the count drops, the bog water is lowest.
   - *Soul:* she's a rules person who breaks one rule, once, and is proud.
2. **`sq_gd_riverglint` "Where It Rested"** — *Hook:* the quiet angler (`sq_ask_nicely`) asks you to find a Riverglint (449) by the dark islet.
   - *Guardian:* Riverglint only appears where the Guardian "once rested"; it flashes gold toward upstream. The angler says the old people called the river beast "the one who keeps the light".
   - *Soul:* sitting in silence again at Dusk. No reward but a nod and an old drawing of the Guardian.

### Region 6 — Tidewater Coast (total gap)
1. **`sq_gd_sea_glass` "Violet Glass"** (rewrite of placeholder `sq_sea_glass`) — *Hook:* the beachcomber's best sea glass is violet, and there's more of it every month.
   - *Guardian:* it's crystal dust washing out of the river mouth. Plants fact #1: the signal runs with water. The beachcomber says the river "is bleeding".
   - *Underground:* she gives a bag to the Unbound "for evidence"; you deliver it to The Firefly.
   - *Soul:* she makes wind chimes; one plays the River phrase by accident in the breeze.
2. **`sq_ug_lifeguard` "Unbound in the Water"** — *Hook:* the lifeguard (tidewater_coast_lifeguard) works with an uncrystalled swimming creature, illegally.
   - *Underground:* proof a bond works without a crystal. If your lead has high Warmth, the lifeguard trusts you with the secret; otherwise he says nothing.
   - *Both sides:* a storm rescue scene where the uncrystalled creature panics first, then comes back on its own.
   - *Soul:* gruff, protective, brave.

### Region 7 — Lanternport
1. **`sq_ug_keeper_logbook` "The Keeper's Other Log"** — *Hook:* the lighthouse keeper (`sq_forecast`) keeps a second logbook of every violet light seen at sea at night.
   - *Underground:* the lights are RT boats moving crates (ties to Saltmere's dock count). The keeper gives you a page for The Firefly.
   - *Guardian:* the lights always sail upstream at the river mouth.
   - *Soul:* he forecasts everything except people.
2. **`sq_gd_ron_dream` "Same Dream"** (after Ron shares the log page) — *Hook:* Ron admits he's been having the river dream too.
   - *Guardian:* in his version the creature's crystal is cracking and it's angry, not sad. Foreshadows the fight: "It didn't want help. It wanted out."
   - *Soul:* Ron's turn toward trust; he's scared and makes a bin joke about it.

### Region 8 — Cindervale (total gap)
1. **`sq_gd_caldrith` "Why the Forges Stay Warm"** — *Hook:* the smith (cindervale_smith) says the forges are cooling since RT opened a crystal kiln next door.
   - *Guardian:* the sleeping fire legendary (Caldrith, 447) is "dreaming of the river creature's pain". The power fact: the Guardian's signal reaches even under the volcano. Sets the scale of the final fight.
   - *Underground:* the smith refuses to fit crystals to forge creatures; the Unbound have a quiet ally here.
   - *Soul:* the baker from `sq_warm_stones` notices her rocks aren't as warm either; small domestic proof.
2. **`sq_ug_last_flyer` "Everyone Signs"** — *Hook:* the Unbound send a final petition from The Firefly: get signatures in every town you've helped.
   - *Underground:* calls back the people from every region's story above (greenhouse guy, dockhand, intern, Nan, clerk, beachcomber, keeper, smith). Shows the case has been built by ordinary people, not one rebel.
   - *Guardian:* the last signature is a river-stone print left on the paper overnight. Unexplained.
   - *Soul:* a payoff for the player's journey before Aurelith; the Firefly flyer wall gets one new poster: "WE ASKED. NOW WE GO."

### Finale tie-in (Aurelith / HQ upper floors), for Story Bot
- The petition + evidence (sea glass, keeper's page, drift chart, dock count) are on the field team's table when you find them, unlocking `truth_revealed` text without exposition.
- The Guardian battle uses the planted facts: its power scales with "every crystal ever fitted"; your team's **Warmth** pushes back (fact #3). After you crack its crystal it offers the release (SOUL 6.4 / ruling B unchanged).

## 7. Open calls for Gary / Story Bot
1. Approve the Section 5 throughline (Guardian pulled under the company signal, so you must defeat it before it can release the crystals)?
2. Is Kilumora (443) the same being as the Guardian, its mate, or a separate legend?
3. Ruling A (Vane) and B (crystal release) still pending; these outlines assume both as recommended.
4. Total new side stories proposed: 19 (2-3 per region). Thin-region placeholders `sq_sea_glass` and `sq_warm_stones` are rewritten rather than duplicated.
