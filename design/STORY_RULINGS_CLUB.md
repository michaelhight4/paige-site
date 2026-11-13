# Kilumen — the Fernwick club and the rebels (Story Bot, Thu 2026-10-22, 9:10 PM CT)
Gary (via World Design, his words): "lets add a club too just for fun, thats where the rebels hangout".
Grounding: SOUL_PLAYBOOK 6.2 already names an opposition, "the Riverbank Stranger's people", who believe the crystal itself causes creature fear. The rebels ARE that group, seen at street level. No new faction is invented.

## Status
- APPROVED by Story Bot (small calls, fine to build): club name, look, NPC roles and front-room lines, the side-story hook.
- NEEDS GARY'S OK in his own words (big calls): R1, R2, R3 below. Back-room content waits on them.

## The club: **The Firefly** (juice bar and music hangout)
- Fernwick fireflies dim near crystal ore (STORY_RULINGS_SOUL #7). The rebels took the firefly as their sign: light that isn't company violet. Neon firefly over the side-alley door; dance floor glows warm amber/green, never violet.
- Tone: fun first (Gary: "just for fun"). A **juice bar and music hangout**: cosy, bright, a dance floor, not a war room.
- **Gary's rule (Oct 22, his words): "no hints at drinknig or drugs or smoking at all".** Juices, teas and milkshakes only. No alcohol-style jokes or wording (no "bartender", "tab", "round", "on the rocks", "hangover", "tipsy" etc.), no smoke, haze or fog effects, no ashtrays, bottles that look like liquor, or pill/drug references. Applies to art, lines and props.
- Open to everyone, any time of day (busier at Dusk/Night; daytime = DJ asleep in a booth, counter keeper wiping the juice counter).

## The rebels: **the Unbound**
- Revival Tech calls uncrystalled creatures "unbound" as a warning. The rebels wear the word proudly.
- Who: ordinary locals — growers, an ex-lab cleaner, a courier, an old fan of loud music. Not soldiers. Non-violent: posters, gossip, protest songs, and looking for missing people.
- Against: dominance crystals and Revival Tech's grip on the region. NOT against creatures or the player personally.
- Their creatures still wear crystals (gameplay rule: crystals never come off before the ending), but many have **painted their crystals in the creature's own colour** as a statement. Purely cosmetic. This quietly echoes Warmth without stating the finale truth.
- They're **partly right, partly naive** (6.2): one patron line admits a wild Enraged creature wrecked his greenhouse.

## NPCs (front room, safe to write now)
- **rebel_bouncer** — big, polite, clocks the player's company lanyard. Before `flg_promoted` isn't reachable anyway; after: "Revival Tech badge. Huh. Dance floor's neutral ground. Back room isn't." Lets you in.
- **rebel_bartender** (NPC id unchanged; role is now the **juice/snack counter keeper**) — runs the place, sells juices, teas, milkshakes and snacks that act as feeds/small heals (Text Bot names them; keep cute and clearly juice/tea/shake, e.g. "Pond Berry Juice", "Fern Mint Tea", "Firefly Shake"). Warm, dry wit; Fernwick gag applies: she's somebody's aunt.
- **rebel_dj** — hums a 5-note phrase he "heard in a dream" and can never finish (the River motif, unresolved, ties to E1/E14). Owns the side-story hook.
- **rebel_patron_1** — protest-poster artist, painted crystal on her creature. Uses creature names, never RT numbers.
- **rebel_patron_2** — the greenhouse guy (the "partly naive" counterweight; sees both sides).
- **rebel_patron_3** — comic: dances badly, insists it's "a protest".
- Optional gag: if Ron is with you, Ron dances once, badly, and the DJ plays him the toy-piano Ron motif.
- Vane never appears here. Nobody here is a villain.

## Side-story hook: **"The Missing Note"** (approved)
- The DJ's dream phrase is missing its last note. Find 4 old records in Fernwick/Thornwood/Route 1/Lanternport (World Design places). Each record adds a layer to his remix.
- Reward: a cosmetic firefly lantern for the room/camp only. (Warmth charm DROPPED Oct 22: E1 already gives the Driftwood Charm, no duplicate.) The remix stays unresolved: "Still missing one. It'll turn up." It resolves only in the ending (Leitmotif rule #4). After the ending the club plays the finished version.

## BIG CALLS — for Gary (recommendations)
- **R1. Rebels = the Riverbank Stranger's people.** Recommend yes: it uses what's already in the design (6.2) instead of a new faction. The Stranger is never seen in the club, only referenced ("Someone by the river told me—").
- **R2. Back room (`TBD_rebel_backroom` → rename `flg_firefly_backroom`).** Recommend it unlocks after `read_drift_log` (the first field-team tint-drift log page), when the bouncer sees you're "asking the right questions". Inside: a wall of MISSING flyers — the rebels are looking for the field team too, so it's a clue hub (hints toward camp locations, nothing about the discovery); a Field Camp map hint; and a crystal-paint vendor (cosmetic). No reveal of what the field team found before the finale.
- **R3. Vane link and stakes.** Recommend light: one inbox memo after you first visit ("Fernwick establishment, unlicensed handlers. Monitor only. – H.V."), no raid, no player choice to join or betray, and no ending branch (keeps the single ending, matching recommendation B). Post-ending, the rebels hold the first party with clear crystals.

## R2 DECIDED BY GARY (Oct 22, 2026, his words via World Design): "Open the back room from the first visit"
No drift-log gate and no flag. `TBD_rebel_backroom` is dropped. The back room is open from the first visit, with the MISSING-flyer wall and the crystal-paint vendor.
- **Bouncer line changes** (the old "Back room isn't" no longer fits): "Revival Tech lanyard. Huh. Fine. Dance floor's for dancing, back room's for looking. Be decent." 

### The field team's names (Story Bot canon, Oct 22, 2026; nothing earlier named them)
- **Pell Ashby** — the doodler (log pages full of creature sketches).
- **Marta Quill** — rates every lunch out of 10.
- **Teo Brack** — team lead, tidy, writes lists.
- **Imke Sorrel** — the youngest, hums while she works.
(Dana is NOT one of the four; she quit, per the Dana side story.)

### MISSING-flyer wall, staged so it never points to a place the player can't reach yet
Flyers never say WHY the team went or what they found. The rebels are looking too; they don't know the truth.
- **Tier 0, first visit (always):** one big team flyer, "MISSING: Revival Tech field team. Four of them. Last check-in: Greystone. Anyone seen them, tell the counter." (Greystone as last check-in is already said in the promotion scene.) Plus 4 portrait flyers with personality only, no places: Pell ("Probably drawing something. Interrupt him."), Marta ("Will review your sandwich."), Teo ("Has a list. You're probably on it."), Imke ("If you hear humming, that's her."). Plus 2-3 fun local flyers (lost Tumbloam, open-mic night, "Names, not numbers" poster).
- **Tier 1, `beat_master_fernwick`:** pinned note, "Someone saw an empty tent off the Thornwood path. Ferns all grown over it."
- **Tier 2, `beat_master_revival`:** two notes, "A courier swears there's a cold camp stove in the Greystone dark." and "Lights seen up by Frostspire, past the old rope bridge."
- **Tier 3, `beat_master_frostspire`:** "Mirefen fisher found a field notebook in the reeds. Wouldn't hand it over. Ask nicely."
- **Camp restored:** when a camp is restored (camp flags, World/Coder ids), its note gets a hand-drawn tick and "FOUND THE CAMP. NOT THEM." 
- **Post-game reunion:** flyers come down and one banner goes up: "FOUND. ALL FOUR." The rebels throw the party.
World Design: please confirm each camp is really reachable at the tier flag I gave; if not, move the note to the right flag.

### Crystal-paint vendor (rebel_paint_vendor, new NPC id if needed)
- Sells crystal paint in each creature's own colour. **Cosmetic only**: no stats, no Warmth effect. The crystal stays on.
- Tone: proud craftsperson. Example sense: "Your creature, your colour. Still a crystal, sure. Doesn't have to look like theirs."

## Text Bot pending calls — Story Bot rulings (Oct 22, 9:15 PM CT)
1. `ron_in_party` approved as the Ron-gag flag (Coder implements; shows once).
2. "FOUND. ALL FOUR." gates on a separate `field_team_home` flag (the reunion is post-game, after `finale_done`).
3. No Warmth charm reward (see above); lantern only.
4. Finished tune, gated `finale_done`, DJ: "Last note turned up. Turns out the tune was always meant to end there." Patron_3 can add: "Now THAT I can dance to. Badly."

## Camp placement (Story Bot, Oct 22, 9:50 PM CT)
- Thornwood camp sits west of gate_thornwood_east (note stays beat_master_fernwick).
- Greystone camp sits in Greystone B1 past the forced fern/boulder puzzle (note stays beat_master_revival).
- Record 4 stays in Lanternport, held until that map exists.
- CORRECTION (10:05 PM CT): Greystone B1 has no flag gate, so the Greystone camp stays in B1 and note_greystone moves to beat_master_fernwick (tier 1, with Thornwood). Frostspire stays at beat_master_revival.
