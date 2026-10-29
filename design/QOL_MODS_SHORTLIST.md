# Kilumen QoL shortlist (research only), Oct 29, 2026, 10:46 AM CT
Asked by Gary: "look up other popular mods that we can find free source or recreate easily that might improve quality of life in our game".

**Licence rules (from quality/OPEN_SOURCE_TOOLKIT.md and dev_notes/kilumen_github_candidates_2026-10-23.md):** pret decomps and Essentials have no OSS licence, so recreate from the idea only. PokeRogue is **AGPL-3.0**, so read it for ideas only and never copy its code. Showdown and @smogon/calc are **MIT** (Showdown is already vendored in `vendor/battle-sim`). Radical Red, Unbound, Cassette Beasts and Temtem are closed source, so recreate. Never copy names, data or text from any of them.
Licences for the last four repos were not re-read this turn, so check each LICENSE file before porting anything.

| # | Proposed name | What it does | Seen in | Licence / source | Effort | Kilumen today |
|---|---|---|---|---|---|---|
| 1 | **Battle Pace** (1x/2x/3x + skip FX) | Speeds up battle text and animations, with an option to skip skill FX | PokeRogue, Radical Red, emulator fast-forward, Temtem | Recreate | S | Missing. No battle-speed option; the Options menu has only cosmetic toggles (`ui_tools2.js`) |
| 2 | **Text Speed / instant text** | Text speed setting, and holding the button finishes the line | Every Essentials/decomp QoL pack | Recreate | S | Missing (no text-speed hit) |
| 3 | **Run Toggle** | Makes running the default or a toggle instead of hold-to-run | Unbound, Radical Red, Essentials "Auto Run" | Recreate | S | Partial: RUN mode exists (`movement.js`); no toggle setting |
| 4 | **Team XP Share** (toggle) | Gives XP to benched team members | Gen 6+ Exp. Share, Unbound, Cassette Beasts | Recreate. Hook `-kxp` in the MIT sim fork | S–M | Missing (MECHANICS_PARITY B19) |
| 5 | **Skill Recall in menu** | Relearn forgotten or skipped skills from the team menu, not just from an NPC | Radical Red, Unbound, PokeRogue | Recreate. Data comes from the learnsets table | M | Designed only (B23). Needs B21 learnsets turned on |
| 6 | **Reusable Teach Discs** | Teach items that are not used up | Gen 5+, all major hacks | Recreate | S (once B22 exists) | Designed only (B22) |
| 7 | **Matchup Hint** | Effectiveness arrows on skills, plus an optional damage-range preview | Showdown, Radical Red, PokeRogue, Temtem | **@smogon/calc, MIT** (github.com/smogon/damage-calc). Port the interface only; already a candidate (#5 in the Oct 23 notes) | S hint / M calc | Missing in the UI (only `autobattle.js` dev code) |
| 8 | **Stats & Potential viewer** | Summary page that shows hidden stat potential and growth, with colour bars | Radical Red, Unbound, PokeRogue, Essentials | Recreate | S–M | Partial: Health/Power/Guard on level-up box only; no hidden-stat system to view yet |
| 9 | **Area Sightings** | Per-zone list of what can appear (seen or caught silhouettes) and rarity | Unbound, PokeRogue biome view, Temtem | Recreate. Data already exists: `kilindex.regions` + `data/encounters_wired.json` | S | Partial: data logged (`kilindex.js`), no per-area screen |
| 10 | **Storage Anywhere** | Open creature storage from the phone (optionally after a story flag) | Radical Red, Unbound, Essentials | Recreate | S–M | Missing as a player feature (storage only in dev tools) |
| 11 | **Field Skills without slots** | Field skills (Tideglide/Brushbreak/Stonebreak) are tied to a key item or flag, not a team skill slot | Radical Red, Unbound, Gen 7 Ride | Recreate | S | **Already the design**: `field.js` uses flags. Flag `field` is OFF; keep it this way |
| 12 | **Repel-style auto renew** | When an encounter-blocking item runs out, prompt "Use another?" | Gen 5+, decomp QoL | Recreate | S | Unclear: only dev/debug hits for repel/lure; needs a design call first |
| 13 | **Bag auto-sort + register shortcut** | Sort the bag by type, name or newest; bind an item to a hotkey | Essentials, Unbound | Recreate (Fuse.js MIT already a candidate for search) | S | Missing (only dev sort) |
| 14 | **Companion Walk** | Lead creature follows the player in the overworld | HGSS, Essentials "Following Pokémon" plugin, Cassette Beasts | Recreate. The plugin has no OSS licence | M–L (needs sprites for 450 species) | Missing. Only the camera/audio "follow" exists |
| 15 | **Quick Save / suspend** | One-button save from the menu plus a resume slot | Emulator save states, PokeRogue | Recreate | S | Mostly built: autosave every ~60 s plus on flag change/pagehide (`overworld.js:40`) and a save screen. Could add a menu shortcut only |
| 16 | **Rename Anywhere** | Rename a creature from the summary page instead of a name-rater NPC | Gen 7+, Radical Red | Recreate (keep the existing obscenity filter, `src/vendor/obscenity`) | S | Partial: `nickname` field exists; no in-menu rename found |
| 17 | **Variant odds tracker** (structure only) | Shows chain/encounter counter and boosted variant odds | PokeRogue, Radical Red | Recreate | S | Partial: `VARIANT_MODS` + `kilindex.variants` exist (B27) |

**Recommended first batch (all S, recreate, no licence risk):** 1, 2, 3, 9, 13, then 4 and 7 (MIT calc).
**Blocked words:** these names avoid PP, "shiny", "super effective", Pokédex, Poké Ball, nurse, route and "throw". The Showdown/Essentials terms in the "Seen in" column are references only and are not player-facing.
