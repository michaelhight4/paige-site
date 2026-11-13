# greystone_caverns: overnight text DRAFT

**DRAFT, not signed off by Gary.** Text Bot overnight worker, 2026-10-23 00:46 CT. Keys = Game dev text_ref ids (design/overnight_gd/trainers_greystone_caverns.json). Spot ids = World Design `maps.greystone_caverns.<id>` from qa/overnight_maps (staged only) where they exist, else `TODO-spot:` placeholders.
Story step: after coin 1 (optional, open), crossed at step 6 to Frostspire pass | GD map id `greystone_caverns` | World map id `greystone_caverns` (live map)

Format: each line is one dialogue page (max 2 x 40 chars). `intro` = trainer pages, `defeat` = battle_lost (player wins), `after` = repeat talk.

## Trainers

### `trainers.greystone.hiker` - Hillwalker Ivo (tr_greystone_hiker)

- spot: `maps.greystone_entrance.hiker` (existing NPC, now a trainer) | where (GD): existing npc hiker (15,10) greystone_entrance | team: Pebbit L14, Delvelet L15
- intro (new, battle first): "Down here on your own? Let's see if you can handle the dark first."
- defeat: "All right. You'll do. Watch the ferns."
- after: existing `maps.greystone_entrance.hiker.pages` kept as-is (the tips): "Those ferns glow when something walks through. Doesn't mean it's friendly." / "A crew in Revival Tech jackets went down those stairs. Never saw them come up." / "North tunnel's sealed with rock. If you're going on, it's the lower floor."

### `trainers.greystone.hiker_b1` - Hillwalker Sully (tr_greystone_hiker_b1)

- spot: `maps.greystone_b1.hiker_b1` (existing NPC, now a trainer) | where (GD): existing npc hiker_b1 (12,7) greystone_b1; keeps the plate hint | team: Geodling L16, Slagrook L16
- intro (new, battle first): "Before I tell you about that plate, humour me."
- defeat: "Okay. You earned the tip."
- after: existing `maps.greystone_b1.hiker_b1.pages` kept as-is (the tips): "That plate hums when something heavy sits on it." / "Standing on it yourself won't do it. You have to leave something there." / "Line the boulder up before you push. It resets if you leave the floor."

### `trainers.greystone.c` - Field Researcher Mags (tr_greystone_c)

- spot: `TODO-spot:greystone_caverns_c_researcher` | where (GD): NEW: B1, near the Greystone camp; lost field-team flavour | team: Gloamtick L15, Cavernmaw L16
- intro: "I was meant to meet a field team down here. You're not them."
- defeat: "You're not them. But you're not bad."
- after: "Their camp's still set up. Bedrolls out, maps pinned." / "Like they meant to come back."

### `trainers.greystone.d` - Hillwalker Dov (tr_greystone_d)

- spot: `TODO-spot:greystone_caverns_d_hiker` | where (GD): NEW: B2 (planned) mine track, revisit after coin 3 | team: Dripweaver L26, Slagrook L27
- intro: "This mine track's mine today. Ha. Sorry, I've been down here a while."
- defeat: "Should've stuck to the jokes."
- after: "The carts still roll if you give them a shove. Don't ride them."

### `trainers.greystone.e` - Climber Fen (tr_greystone_e)

- spot: `TODO-spot:greystone_caverns_e_climber` | where (GD): NEW: B2 (planned) | team: Stonepede L26, Gloamtick L27, Cavernwing L28
- intro: "Three creatures, one rope, no patience. Let's go."
- defeat: "Right. The rope's fine. I'm the problem."
- after: "There's a dead end past the rails. Someone left something there."

## Pickups (Game dev items_greystone_caverns.json)

The "found" message is the generic system line (`You found {item}!`-style, system_items). Only hidden pickups get a nearby hint line.

- `gs_b2_track_end` (vigor_seed -> **Vigor Seed**) at: B2 bike mine-track end (bike only)
- `gs_b2_camp_stove` (tonic_large -> **Big Remedy**, hidden) at: B2 cold camp stove (club note tier 2) | hint (inspect/sparkle text, `TODO-spot:greystone_caverns_gs_b2_camp_stove_hint`): "Something glints behind the cold camp stove."
- `gs_b2_dead_end` (dominance_crystal_plus -> **Prime Crystal**) at: B2 dead end

## Puzzle / obstacle hints

- `TODO-spot:greystone_b2_mine_track`: "Old mine rails. The cart still rolls if you push it." / "On a bike you could follow the track to the end."

_Halls and quests: written by the second worker (halls_*.md, quests_*.md)._
