# Kilumen animation and effects: Pokémon IP similarity check (Oct 22, 2026)

**What this is:** a practical risk review of the Animator's Kilumen effects against Pokémon. **It is not legal advice.** Before launch, get a games/IP lawyer to look at the capture item and the evolution sequence in particular.

**Gary's standing rule:** mechanics may follow Pokémon's structure, but all art, text, names and trade dress must be original.

**Method:**
- Opened the preview sheets, GIFs and frame montages myself.
- Read every README/JSON/generator in scope, plus the design docs that drive these animations.
- Checked public sources on copyright, trademarks, patents and enforcement (listed at the end).
- No art files were modified. This review was read-only.

**Scope:**
- `art/characters/pixel/effects/_transparent_staging/` (23 elements)
- `soul/` (spotted, battle_feedback, trail_buddy, ambient, lap_nap)
- `fx_extra/` (capture, heal_restore, item_pickup, grass_leaves, warmth_stage_up, cosmic_shimmer, evolution)
- Names and text in READMEs/JSON
- `design/SOUL_PLAYBOOK.md` and `design/MECHANICS_PARITY.md`

## How to read the risk levels
- **What is protected:**
  - Copyright protects *expression*: the specific look, sequence, timing, sounds and text.
  - It does not protect ideas, rules or mechanics. The US Copyright Office says this outright for games, and *Tetris Holding v. Xio* (D.N.J. 2012) held that a clone copying the "style, design, shape, and movement" of the pieces infringed even though the rules were free to use.
  - So "you can catch creatures" is free. "The capture plays out frame-for-frame like Pokémon's" is not.
- **Trademarks:** "POKÉ BALL" is a registered US trademark (Reg. 2,437,410, plus Serial 87940321). The red/white ball with a centre band and button is the series' best-known trade dress.
- **Patents:** Nintendo/TPC hold capture, summon and ride patents in Japan and the US, and have sued Palworld over them. Patents cover *mechanics*, so even fully original art doesn't remove that risk.
- **Enforcement:** it is real and frequent:
  - Fan games: Pokémon Uranium pulled in 2016, and 562 Game Jolt takedowns.
  - A Chinese copycat: 107M yuan (~$15M) judgment in 2024, settled in 2025.
  - Palworld: an active patent suit.
- **Risk levels:**
  - **High:** a player who knows Pokémon would recognise the specific sequence or look as "the Pokémon one". Change before showing publicly.
  - **Medium:** several familiar beats are stacked in Pokémon's order. Change the structure or look.
  - **Low:** a genre convention many games share, or clearly original.

## Top risks (fix before any public build)

| # | Item | What ours does | Closest Pokémon equivalent | Risk | Why | Recommended change |
|---|---|---|---|---|---|---|
| 1 | `fx_extra/capture` (catch sequence) | Device thrown in an arc. Creature turns into a light silhouette and shrinks into the crystal. Crystal drops with a bounce, then tilts/wobbles **3 times** on the beat. Success = **"click-lock" with the click SFX, then 3 stars rise**. Failure = break-out. The crystal has a **grey horizontal clasp band across its middle**. | The Poké Ball catch: thrown ball; Pokémon turns to red/white light and is pulled in; ball drops and **shakes up to 3 times**; success = **click + stars** (Gen 4+). The ball's **centre band** is its trademark look. | **HIGH** | Each beat alone is generic, but stacked in this order with this count (absorb → drop → 3 shakes → click → stars) it is the Poké Ball catch with a new shape. A centre band on a round-ish throwable adds trade-dress echo. The throw-to-capture mechanic itself is also the subject of Nintendo patents (see Patent note). | **Look:** remove the horizontal band. Use a vertical clasp, claw prongs gripping from the top, or a ring that orbits the crystal; nothing that splits it into two halves. **Suspense beat:** replace the 3 tilts with something that isn't a shake, e.g. the crystal **sinks into the ground and pulses its glow** while violet runes close around it one ring at a time, with a **variable** number of pulses (1–4 by catch odds) instead of a fixed 3. **Success:** no click+stars. Use something Kilumen-only, e.g. the runes lock into a full circle, the crystal blooms into facets and a Warmth-colour ring ripples out, plus an original chime (not a click). **Failure:** keep the element break-outs; they are original. **Docs:** SOUL_PLAYBOOK 5.3 ("wobbles 3 times … click-lock") and MECHANICS_PARITY item 5 ("3-beat wobble") prescribe the current version and must change first, or the next pass will rebuild it. |
| 2 | `fx_extra/evolution` | Old sprite → white silhouette (fill `fcf6e8`) → flips between old and new silhouettes on an **accelerating** schedule (600 ms down to 60 ms, 2.94 s) → one **full-screen white flash** → new sprite, "evolved into" text and a jingle. B cancels. The generator note quotes **"What? X is evolving!"** | The core-series evolution scene: white silhouette alternating old/new forms, speeding up, white flash, "Congratulations! Your X evolved into Y!", B to stop. | **HIGH** | This is one of the most recognisable sequences in the series, and ours matches its look, its signature accelerating timing and its flash. "What? X is evolving!" is Pokémon's own line, word for word (it is in a note now; it must never become player text). | **Change the visual idea:** Warmth-driven growth instead of a silhouette flip-flop. For example, the crystal mark cracks and violet light veins spread across the sprite, then the new form is revealed with an ordered-dither wipe outward from the crystal, coloured from the Warmth ramp (no white silhouette). **Timing:** no accelerating alternation; use a steady build (veins grow over 2–3 s), then the reveal. **Flash:** no full-screen white flash; use a ring burst in crystal colours limited to the sprite area. That also fixes a photosensitivity issue: the 60 ms steps are about 8 changes per second over the sprite. **Text:** write an original line (e.g. "X's crystal is changing…" / "X became Y!"). Delete the "What? X is evolving!" note from gen_evolution.py/evolution.json. B to cancel is a mechanic and can stay. |
| 3 | `fx_extra/heal_restore` (heal machine) | A tall machine with a screen and **6 round slots in a 2×3 grid**. After the "nurse" line, crystals are placed **one by one, 200 ms apart, with a SFX each**, then flash, then a short jingle. | The Pokémon Center healing machine: the Nurse puts Poké Balls one by one into a 6-slot tray (2×3 in many generations), each with a sound, then the healing jingle. | **MEDIUM** | Healing at a town building is a free mechanic. The risk is the *staging*: a 6-slot grid filled one by one with a per-item sound, then a short tune, copies Pokémon's scene beat for beat. The jingle is the part most likely to be called copying if its rhythm or contour resembles the Center tune. | **Machine:** one round cradle or a ring the whole team's crystals float into at once, or a lamp/scanner that sweeps across them in one pass; no slot grid and no one-at-a-time placement. **Staff:** rename "nurse" in the specs to the in-world role (e.g. Care Associate) so it doesn't leak into text. **Jingle:** write it from the Home motif with its own rhythm, and have Audio check it against the Center tune by ear before shipping. Also check the lap-nap scene in heal_centre_int keeps its own staging. |

## Medium / low-medium

| Item | What ours does | Closest Pokémon equivalent | Risk | Why | Recommended change |
|---|---|---|---|---|---|
| `fx_extra/cosmic_shimmer` (rare variant) | Ice-blue 4-point **starfield clipped inside the sprite**, an aura spiral on entry, **chime on aura frames 0/4/8**, an icon twinkle every 4 s, and a sparkle by the name on the summary. | Shiny Pokémon: on entry a **flash of stars around the sprite plus a "ping" sound**; a star mark on the summary. | LOW–MEDIUM | The rare-colour variant is a free mechanic, and the inside-sprite starfield is distinctive. The *entry* beat (sparkle burst + chime) is the familiar shiny cue. | Keep the inside-sprite starfield as the signature. On entry, avoid a star burst around the sprite: let the starfield "switch on" across the body, or use the aura spiral alone. Keep the 3-note chime original (not a single bright ping). Never say "shiny" in player text; "Cosmic" is good. Use a Kilumen mark (e.g. a small constellation glyph) instead of a plain star on the summary. |
| `soul/battle_feedback` transitions: `trainer_bars` | Horizontal bars wipe in to start trainer battles. | Gen 1–4 trainer battle intros (bars/stripes). | LOW–MEDIUM | Bar wipes are common across many games, but bars alone in Pokémon's pacing read as a direct nod. | Give it a Kilumen signature: violet crystal edges on the bars, a shard pattern, or bars that close into the crystal mark. The other transitions (wild_leaf, enraged_shard, ron_jacket, master_coin, guardian_whiteout, reduced_motion_fade) are fine. |
| `soul/battle_feedback` naming | Internal hook key `super_effective` (shake preset). | Battle text "It's super effective!" | LOW (text hygiene) | Internal keys aren't shipped expression, but they leak into strings and logs. | Rename to `strong_hit` (with the hook-up owner, since it's a code key) and make sure the player message is Kilumen's own wording. |

## Low risk (no change needed)

| Item | What ours does | Closest Pokémon equivalent | Risk | Notes |
|---|---|---|---|---|
| `soul/spotted` | Eye glint, then a **violet crystal spark** over the head, a hop and a walk-up. RT gem-shield variant. 8 emote bubbles (heart, sweat, dots, note, zzz, anger, ?, sparkle). | Trainer "!" spotted cue and walk-up. | LOW | Already designed as "not a '!' copy" (SOUL_PLAYBOOK 5.1). Emote bubbles are a broad genre convention. Keep "!" out of this cue entirely. |
| `soul/battle_feedback` (hit flash, shake, HP drain colours, faint, overuse crack) | 2 white hit flashes, x-shake, HP bar green/amber/red, faint = crystal flicker + dither fade + sink. | Hit blink, HP colour bar, faint drop. | LOW | Genre conventions used by most RPGs. The faint is already Kilumen-specific (crystal flicker). |
| `soul/battle_feedback` transitions (others) | Leaf, shard, jacket, coin, whiteout, fade. | Various battle intros. | LOW | Original motifs. |
| `soul/trail_buddy` | Partner follows the player. | Following Pokémon (HGSS, Let's Go). | LOW | A mechanic; Kilumen's own sprites and poses. |
| `soul/ambient`, `soul/lap_nap` | Idle/ambient life; creature naps on a lap in the heal interior. | None specific. | LOW | Original. |
| `fx_extra/item_pickup` | Leather satchel with a violet clasp crystal, plus a hidden-item sparkle. | Item ball on the ground, Itemfinder sparkle. | LOW | Already avoids the ball/orb shape. Keep it that way: items should never lie on the ground as small balls. |
| `fx_extra/grass_leaves` | Leaves flick when stepping in tall grass. | Grass rustle. | LOW | Generic. |
| `fx_extra/warmth_stage_up` | Rings per Warmth ramp family plus stage pips. | Stat-up arrows/sparkles. | LOW | Original mechanic and look. |
| `effects/_transparent_staging` (23 elements × impact, travel_f2p, travel_p2f) | Generic elemental shapes (flame, splash, rocks, gusts, crown for legendary, etc.). | Move animations. | LOW | Generic shapes, and Kilumen's own element list (sea, freshwater, swamp, magma, angelic, devil…). No attack mimics a specific Pokémon move's look. Keep move *names* original when they're attached (no "Thunderbolt" / "Hyper Beam"). |

## Text and name hygiene (internal notes are fine; player text must be clean)
Player-facing strings must never contain:
- PP, shiny, super effective, Pokédex, Poké Ball, Pokémon Center, Nurse Joy
- "What? X is evolving!" or "Congratulations! Your X evolved into Y!"
- "Gotcha!", or any other line lifted from the games

Current hits found in the art scope (all in notes/specs, none shipped yet):
- `fx_extra/_tools/gen_evolution.py` line 63 and `fx_extra/evolution/evolution.json` line 206: "What? X is evolving!". **Remove**; it is verbatim Pokémon text.
- `fx_extra/heal_restore/{README.md, heal_restore.json}` and `fx_extra/_tools/gen_heal_restore.py`: "nurse line ends". Rename to the Kilumen role.
- `soul/battle_feedback/{hook_specs.json, README.md}` and `soul/_tools/gen_battle_feedback.py`: key `super_effective`. Rename to `strong_hit`.

The design docs use PP/shiny/dex as internal shorthand (MECHANICS_PARITY), which is fine. Add those words to the battle engine's deny list (`tests/fixtures/battle_deny_hashes.json`) so they can't reach the UI.

## Patent note (the throw)
- **Japan:** Nintendo/TPC sued Pocketpair (Palworld) in 2024 under JP patents 7545191, 7493117 and 7528390, which cover aiming and throwing a capture item and riding. Pocketpair removed "throw a Pal Sphere to summon" in v0.3.11 (Nov 30, 2024) and changed gliding in v0.5.5.
  - The Japan Patent Office has since issued a rejection notice on a related application (prior art included ARK).
  - Reports in Sep 2026 describe Nintendo appealing a rejected related patent.
  - Per games fray, the Tokyo hearing was set for Oct 1, 2026, with a ruling expected Nov 9, 2026, and the claims narrowed to old Palworld versions.
- **US:** catch patents 12,179,111 and 12,220,638 (catching by launching an item), plus summon patent 12,403,397 (under a director-ordered re-exam; all 26 claims got a non-final rejection on Mar 25, 2026) and ride patents.
- **What this means for Kilumen:** any thrown capture item that hits a field creature and then rolls a success chance is the area these patents cover. Kilumen's capture happens inside a turn-based battle, which is long-standing genre territory. Still, before shipping, Gary should get a patent lawyer's view on the throw.
- **Lower-risk alternative to discuss:** don't throw. The tamer *plants* or *calls up* the crystal at the foe's feet (it rises from the ground), which also suits the "sinks and pulses" beat above.

## What to change in the design docs (so the next pass doesn't rebuild the copy)
- `SOUL_PLAYBOOK.md` §5.3 catch drama: replace "wobbles 3 times … click-lock" with the new beat (pulse count by odds, rune ring lock, bloom).
- §4.5 jingle list: "evolution start (rising)/done" is fine as a slot, but the cue must be original.
- §8.2b/c heal machine: replace the slot grid and one-by-one placement.
- `MECHANICS_PARITY.md` item 5 "3-beat wobble": change to "variable suspense beat (original)".
- C10 "Shiny-style rarity": fine as an internal note.

## Sources
- US Copyright Office, *Games* (FL-108 / "Games" registration page): mechanics and rules are not protected. https://www.copyright.gov/register/tx-games.html (archived FL-108: https://web.archive.org/web/20160411131325/www.copyright.gov/fls/fl108.html)
- *Tetris Holding, LLC v. Xio Interactive, Inc.*, D.N.J. 2012. https://www.govinfo.gov/content/pkg/USCOURTS-njd-3_09-cv-06115/pdf/USCOURTS-njd-3_09-cv-06115-0.pdf and https://law.justia.com/cases/federal/district-courts/new-jersey/njdce/3:2009cv06115/235418/61/
- ABA Landslide, "Why videogame rules are not expression protected by copyright law". https://www.americanbar.org/groups/intellectual_property_law/resources/landslide/archive/why-videogame-rules-are-not-expression-protected-copyright-law/
- POKE BALL US trademark, Reg. 2,437,410 (Justia): https://trademarks.justia.com/755/01/poke-75501792.html; POKÉ BALL Serial 87940321 (TTABVUE): https://ttabvue.uspto.gov/ttabvue/v?pno=87940321&pty=EXT; Canada POKE BALL Design 1754829: https://ised-isde.canada.ca/cipo/trademark-search/1754829?wbdisable=true
- Bulbapedia (fan wiki, used for describing the games' sequences): Catch rate (shake checks: "the Ball shakes three times"): https://bulbapedia.bulbagarden.net/wiki/Catch_rate; Shiny Pokémon ("surrounded by a flash of stars or light, accompanied by a pinging sound effect"): https://bulbapedia.bulbagarden.net/wiki/Shiny_Pok%C3%A9mon; Evolution (B button cancels): https://bulbapedia.bulbagarden.net/wiki/Evolution; Pokémon Center (healing machine): https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Center
- Pocketpair, "Report on Patent Infringement Lawsuit" (Nov 8, 2024): https://www.pocketpair.jp/en/news/report-on-patent-infringement-lawsuit/
- Pocketpair, "Regarding the lawsuit, changes to Palworld and the future" (May 8, 2025): https://www.pocketpair.jp/en/news/regarding-the-lawsuit-changes-to-palworld-and-the-future/
- AUTOMATON (Oct 30, 2025), JPO rejection notice on a related application: https://automaton-media.com/articles/newsjp/20251030-364111/
- Techdirt (Nov 3, 2025): https://www.techdirt.com/2025/11/03/japan-patent-office-rejects-key-patent-application-in-nintendos-palworld-lawsuit/
- Windows Central: https://www.windowscentral.com/gaming/nintendos-palworld-case-japan-patent-office-rejects-claim-not-original-enough
- Game Developer, US 12,403,397 summon patent: https://www.gamedeveloper.com/business/nintendo-patents-character-summoning-and-battling-mechanic-in-the-united-states
- The Verge: https://www.theverge.com/games/779062/nintendo-pokemon-summoning-battle-patent
- VGC, USPTO director-ordered re-exam: https://www.videogameschronicle.com/news/us-patent-office-director-orders-re-examination-of-nintendos-patent-on-summoning-characters-to-make-them-battle/
- Baker Botts, "Patenting Play" (Dec 2025; lists US 12,179,111, 12,220,638, 12,246,255, 12,409,387, 12,403,397): https://www.bakerbotts.com/thought-leadership/publications/2025/december/patenting-play
- MBHB, re-exam first action (Mar 25, 2026): https://www.mbhb.com/intelligence/snippets/pokemon-reexam-receives-first-action-from-uspto/
- games fray, ahead of the Oct 1, 2026 hearing: https://gamesfray.com/ahead-of-october-1-court-hearing-nintendo-has-zero-chance-of-prevailing-over-current-palworld-versions-it-may-get-30k-chump-change/
- Siarasia, case status (Jul 2026): https://siarasia.jp/patent/2638/
- ORICON (Sep 11, 2026), Nintendo appeal: https://www.oricon.co.jp/article/3374628/
- AUTOMATON West, TPC wins $15M against China-based copycat (2024): https://automaton-media.com/en/news/the-pokemon-company-wins-15-million-copyright-infringement-lawsuit-against-china-based-game-developers/
- China Court (English), mediated settlement (Apr 2025): https://english.court.gov.cn/2025-04/27/c_1089062.htm
- Kotaku, Pokémon Uranium pulled (Aug 2016): https://kotaku.com/pokemon-uranium-creators-pull-game-after-1-5-million-do-1785258831
- Kotaku, 562 Game Jolt takedowns: https://kotaku.com/website-says-nintendo-threat-forced-them-to-pull-hundre-1786069047
- Game Jolt DMCA notice text (cites "audiovisual work, music, fictional character depictions"): https://github.com/gamejolt/dmca/blob/main/2016/2016-09-02-nintendo.md
- Ars Technica (Sep 2016): https://arstechnica.com/gaming/2016/09/nintendos-dmca-backed-quest-against-online-fangames/
- Game Developer, how indies (Temtem, Coromon, etc.) differentiate monster combat: https://www.gamedeveloper.com/design/how-indies-add-flavor-to-monster-combat-25-years-after-pokemon
- Nintendo Life, Cassette Beasts dev on doing what Pokémon doesn't: https://www.nintendolife.com/features/cassette-beasts-dev-on-doing-what-pokemon-doesnt-in-a-zelda-inspired-overworld

## Evidence viewed
- `fx_extra/capture/_preview/capture_contact_2x.png`, plus frame montages of capture_full_success, wobble and success.
- Evolution, heal, cosmic encounter, item pickup and spotted route montages.
- `soul/spotted/previews/spotted_glyphs_4x.png`.
- `soul/battle_feedback/previews/transitions_contact.png`.
- `effects/_transparent_staging/_preview/impacts_contact_sheet.png`, `impacts_preview.gif`, and a travel montage.
- Scratch montages are in `/tmp/ipcheck/`.
