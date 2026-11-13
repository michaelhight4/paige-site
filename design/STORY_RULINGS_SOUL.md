# Kilumen — Story Bot rulings on the Soul Playbook
*Story Bot, Thu 2026-10-22, 7:30 PM CT. These answer the calls asked of me on top-15 items #3, #4, #7 and #14 in SOUL_PLAYBOOK.md. The two big story decisions at the bottom are RECOMMENDATIONS ONLY. Gary decides them in his own words.*

## #3 Ron's running gags (2.3 / E5) — APPROVED with these rules
- **The bins.** The bin at `brookhollow` (7,8) is Ron's. Bin day is always "tomorrow". After each Master coin, one more bag appears, up to 8. Flies show from bag 6. Each Ron battle opens with one bin line, and Text Bot writes 8 that escalate ("It's fine." … "The bags have a smell now. Not ours. Their own.").
- **E5 Bin Monument** can only be found between coin 8 and the finale. After the finale the bin is empty, so E5 is missable on purpose.
- **Payoff.** Ron takes the bags out after the finale. That's the last overworld beat before the credits, with no dialogue except "Told you. Tomorrow." Bin day finally comes once he stops putting his life off. That ties to his layoff low point (6.1).
- **Dana's desk.** Approved as written. She is never seen until the post-game Frostspire fight.
- **Lucky-crystal seller.** Approved, plus one rule: his crystals are plain glass. He's the comic mirror of Revival Tech, selling a crystal that does nothing. Ending product: "Clear crystals. 100% nothing. Finally honest."
- **Friday cake.** Nobody knows who's leaving. Payoff: the first Friday after the field team comes home, the cake says "WELCOME BACK". It's the only cake that isn't a goodbye.

## #4 Leitmotif bible (4.2) — APPROVED, with ownership and trigger rules
- **Order.** All five motifs (River, Ron, Revival Tech, Home, Journey) get written and approved before any zone track. Story Bot owns what each motif means and when it plays. Whoever does audio (there's no audio bot yet) owns the notes.
- **River** stays unresolved, never landing on the tonic, until the crystal-release moment in the ending. The first resolved River phrase in the whole game is the one under the ending.
- **Ron** turns minor and slow only once, at the Revival Heights layoff letter. It's back to major from Lanternport on, after he shares the log page.
- **Revival Tech.** The reharmonised task-complete jingle swaps in at one flag: after the player reads the first field team log page that describes tint drift (see #7). Before that it's always the bright version, so the player notices the change.
- **Home.** The heal jingle is its first 2 bars. Lantern Rest quotes Home slowed and fragmented on music box, not River, because grief there means home lost.
- **Journey.** It plays with Home at the final Master. In the credits, Home, River (resolved) and Ron play together.
- **Originality.** Each motif is checked to make sure it's not a near-copy of any existing game theme, per Gary's no-copying rule.

## #7 What Crystal Warmth means in the lore — RULING
- Every creature has its own inner light, its **lumen**, in its signature colour. The name Kilumen comes from this.
- Revival Tech cuts dominance crystals from ore that forms where old lumen pooled underground, in deposits like Greystone. A fitted crystal smothers the creature's lumen under the company's violet signal, which keeps it calm and obedient.
- **Warmth is the creature's own lumen pushing back through the crystal because it chooses you.** The tint change is literally its true colour showing.
- **Inside the company,** this is logged as a defect called "tint drift". Inbox memos talk about recalibrating units that drift. Vane reads drift as instability.
- **The missing field team** found that drift happens only with bonded creatures. That means the crystal isn't needed for a creature to be safe or loyal. They went to Greystone to find out where the ore comes from, and the check-in was cancelled. Players only ever see this in implied pieces: log pages, memos, E7 tally marks. No character states it outright before the finale.
- **Gameplay rules.** Warmth never makes a creature disobey, and the crystal never comes off before the ending. At 100 Warmth the crystal is nearly the creature's own colour, with a faint violet core still there. Keep the colour-blind marker from 7.5.
- **Trail Buddy** reacts unhappily to dug ore (1.2) because that ore is old lumen. Fernwick fireflies dim for the same reason.

## #14 Lantern Rest memorial (6.3) — APPROVED
- **Location.** A small dedicated map off `greystone_entrance`. World Design picks the exact spot. No battles and no wild encounters, and the Hush Spray isn't needed there.
- **Markers.** About 8 stones. Each pairs a person's name with a creature's name, and each epitaph is warm and specific, never horror ("Walked every morning. Both of them."). Text Bot writes them, and I check the tone.
- **The keeper** keeps a Gloamtick holding "the spark of my old friend". Lore fit: a Gloamtick lantern holds lumen.
- **The blank stone** is for the field team, "until they come home". **They come home alive** in the post-game, which makes it a reunion, not a twist (6.6). The blank stone is not carved. It's taken away and replaced with a small bench, and the keeper says "Didn't need it. Best kind of stone to lose." That's the only change to the map after the reunion.
- **Music** is near-silent. See #4: Home on music box, with whole bars of silence.

## BIG DECISIONS — recommendations for Gary (not final)
**A. Director Hollis Vane's motive.** I recommend 6.2, "comfort, not cruelty", plus two additions:
1. **Why he believes it.** Years ago he saw an unbound Aggressive creature hurt someone he cared about, and the crystal felt like the cure.
2. **His real sin.** He buried the field team's tint-drift findings and cancelled their check-in. Their findings proved the crystals weren't needed, and admitting that would undo his life's work. So he's wrong because he refuses the evidence, not because he's evil. He calls creatures only by catalogue number (1.3).
- In the ending he sees the clear crystals himself. He isn't killed or jailed on screen. He's left to live with it.
- The opposition is partly right too: crystals cause some of the fear, but wild creatures can still be dangerous.

**B. The crystal-release ending.** I recommend 6.4 with one safety change so no player loses their team:
- The Guardian releases every crystal. Creatures at high Warmth stay, and their crystal goes clear.
- Creatures at lower Warmth wander off happily to the Field Camps. Walking up to one rejoins it, clear-crystalled, with no grind.
- Post-game catches use a new clear capture method with no dominance crystal, so the core loop carries on after the theme pays off. Coder needs to flag this as a system change.
- The opposite route, where the player refuses the release, is NOT recommended. It splits the ending and doubles the work.

Gary: approve, change or reject A and B in your own words before anyone builds them.

---
## Rulings: regions 5 and 6 story (Gary, Thu Oct 29 2026, 1:43 PM CT, relayed by Coder; logged by Story Bot)
- **G1. Guardian throughline approved.** UNDERGROUND_GUARDIAN_SIDESTORIES §5 is canon: the violet signal is tuned off the Guardian's crystal; (1) it is stronger near water and the old river, (2) the Guardian's pull grows with every crystal fitted, so the river runs lower, (3) a bonded creature's Warmth pushes back. R5 plants facts 2 and 3 (Station M charts, "Where It Rested"); R6 lands fact 1 (lab river-mouth contours, Violet Glass). `sq_gd_riverglint` is un-held. Still OPEN: Vane's motive, the Vane memo, the release ending (ruling B), the Stranger link.
- **G2. Mirefen camp = Marta Quill.** Canon.
- **G3. Ron's Tidewater fight is optional; it is Ron 5.** 5 bags. "The flies have names now" moves to Lanternport. The umbrella, the honest layoff line and "Inside Out" play whether or not the player fights. A decline reaction exists. Coder: exempt it from the Ron 2-6 hard gate.
- **G4. Both Jorys stay.** Trail Kid Jory (Sunmeadow) gets one small line about the shared name.
- **G5. Key cards come from Benefits board nodes.** A promotion unlocks the node, and the node grants the card. Research areas exist only from R5 on.
Detail: design/story_r5_r6/ and design/regions56/story_beats.md.
- **G6 (Gary, 1:47 PM CT). Ron 5 rematch window:** it ends at the Tidewater Master, not at Lanternport. If Ron 5 is unfought when the Master falls, Ron leaves after a short, warm parting beat (`ron5_missed`, no penalty).
- **G7 (Gary, 1:47 PM CT). Master names are final:** Wenna Peat (Mirefen) and Jory Swell (Tidewater).

## SUPERSEDED (Gary, Oct 29 2026, 3:22 PM CT, ruling F2)
Big decision B recommendation (crystals clear on release, creatures wander to Field Camps) is OUT. Canon: fitted crystals keep working after Ondravel is freed; his pain is gone so the signal goes calm. See regions56/story_beats.md section F.
