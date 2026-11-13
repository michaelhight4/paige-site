# Kilumen name clash check

Text Bot, Thu Oct 22 2026, about 8:30 PM CT. Nothing was sent or published.

**Scope:** proper names and coined terms in `design/design.txt` (Gary's design doc) and `design/MECHANICS_PARITY.md`, plus names Text Bot proposed for system text (v0.4.4).

**Method:** web search for each name, checking the same genre first (creature collectors: Pokémon, Temtem, Coromon, Nexomon, Cassette Beasts, Digimon), then games in general, then trademarks and brands.

**What this is not:** a legal clearance. Before release, a trademark search (USPTO/EUIPO) is needed for the title "Kilumen" and for any name used on a store page.

**Verdict key**
- **clear:** no clash found that matters.
- **minor risk:** a similar name exists in an unrelated field, or the word is generic. Keep it, but don't trademark it.
- **rename:** the same or a near-same name is used for the same kind of thing in a game, or it's a registered mark in a field close to ours.

## Rename (3)

| name | what it is | clash found (source) | verdict | suggested alternative |
|---|---|---|---|---|
| Drowsy | status effect (MECHANICS_PARITY, battle statuses) | The exact status name in Pokémon Legends: Arceus, where it replaces Sleep (Serebii, Bulbapedia). It's also a status in Coromon (coromon.com wiki). | rename | **Groggy**: not a status in Temtem, Coromon, Nexomon or Cassette Beasts. It is only a boss state in Summoners War and MapleStory (web search, Oct 22). |
| Cosmic (variant) | Gary's rare colour variant (design doc) | Nexomon: Extinction calls its shiny-equivalent variant "Cosmic" (Steam discussions, r/Nexomon). That's the same genre and the same mechanic. | rename (**Gary's term: his call**) | **Skykissed**: only found as a Brawlhalla place name and a user-named Wolvden wolf. **Starborn** is minor risk (Starfield's faction). Avoid "Starlit" (a Creatures of Sonaria creature) and anything to do with meteors (Pokémon's Minior). A rename means editing the player-facing "Cosmic" wording in `system_cosmic` (and the meteor_night line). No ids change. |
| Field Notes | exp-share item (MECHANICS_PARITY) | FIELD NOTES is a registered trademark of Coudal Partners for notebooks (Justia, Markinton). That's close to a paper "notes" item. | rename | **Bench Ledger**: the only hit was a feature label in a fantasy-sports app, with no trademark (web search, Oct 22). Or "Shared Logbook". |

## Minor risk (keep; don't trademark)

| name | what it is | clash found (source) | verdict | suggested alternative |
|---|---|---|---|---|
| Kilumen | game title, creature family | K-Lumen, an Estonian lighting company (different spelling and field) | minor risk | Keep. Run a formal trademark search before release. |
| Kilindex | creature register | Klindex, an Italian floor-grinding brand (near-spelling, unrelated field) | minor risk | Keep |
| Enraged / Aggressive | angry wild variant (design doc) | "Enraged" is a Temtem trait (temtem.wiki.gg). It's also a common game word. | minor risk | Keep "Aggressive" for players and "Enraged" internally, or use "Riled" |
| Masters / Battle Masters arena | endgame challengers and arena | Pokémon Masters EX (mobile game). "Masters" is also generic. | minor risk | "The Masters" as a group is fine. Avoid the exact "Masters EX" / "Masters League". Alternative: "Battle Masters Hall". |
| Lineage | IV-equivalent (MECHANICS_PARITY) | NCSoft's MMO *Lineage*. Also a generic genetics term. | minor risk | Keep (it's a stat label, not a title) |
| Retreat | battle menu label (run) | "Retreat cost" in the Pokémon card game | minor risk | Keep. The game uses it as a plain verb. Alternative: "Back Off". |
| Agility | speed stat | A Pokémon move name. Also a generic RPG stat. | minor risk | Keep, or use "Pace" |
| Tideglide II | ferry (MECHANICS_PARITY) | "Tideglider", a School of Dragons dragon | minor risk | Keep |
| Skylift | air travel (World) | GTA helicopter "Skylift" | minor risk | Keep, or use "Skyway" |
| Stonebreak | place / skill (World) | ESO boss "Stonebreaker" and a WoW NPC | minor risk | Keep |
| Mirefen | swamp area (World) | D&D adventure "Descent into Mirefen" (Menagerie Press, 2019) | minor risk | Keep, or use "Mirewick" |
| Revival Point | blackout respawn (MECHANICS_PARITY) | Revival point mechanic in Free Fire | minor risk | Keep (descriptive) |
| Revival Tech | heal staff (design doc) | "Revival Tech Solutions", a real repair shop | minor risk | Keep |
| Lumen Line / Lumen Line Courier | courier trade service | "LumenLine", an Android app (removed) | minor risk | Keep |
| Skill Memory | skill relearner (MECHANICS_PARITY) | "Skill Memory" item in Digimon Masters Online | minor risk (same genre, generic words) | Keep, or use "Skill Recall" |
| Proving Floor | Masters' venue | Close to Wizardry's "Proving Grounds" | minor risk | Keep |
| Concord Spire | landmark | Close to "Guild Spire" (Concord). Generic words. | minor risk | Keep |
| Legendary Guardian (doc spells it "Gaurdian") | story legendary | Generic phrase. Used loosely in many games. | minor risk | Keep, and fix the spelling to **Guardian** in the doc |
| Hush Spray | repel item | A real lidocaine throat spray | minor risk | Keep |
| Angler's Line | fishing rod item | WoW has "Angler's ..." line items | minor risk | Keep |
| Ridgeline | area (World) | Honda Ridgeline truck | minor risk | Keep (place name) |
| Starborn | (alternative for Cosmic) | Starfield faction | minor risk | Prefer Skykissed |

## Clear

| name | what it is | clash found (source) | verdict | suggested alternative |
|---|---|---|---|---|
| Dominance crystal | design doc item | none found | clear | — |
| Glowcall | field skill (light) | none found | clear | — |
| Brushbreak | field skill (cutting) | none found | clear | — |
| Training Reels | TM-equivalent | Blue Archive's "Tactical Training Blu-ray" is a similar idea with a different name | clear | — |
| Rest Drops / Remedies / Clear Salts | heal and cure items | none in genre (generic words) | clear | — |
| Clean Strike | crit-equivalent | only a carrom app | clear | — |
| Affinity (×1.3) | same-element bonus | generic. Nothing in genre for STAB. | clear | — |
| Temperament | nature-equivalent | generic | clear | — |
| Field Training | EV-equivalent | generic | clear | — |
| Vitality / Might / Guard / Focus / Resolve | stat names | generic RPG words | clear | — |
| Scorched / Chilled / Jolted / Tainted | statuses | not official status names in Temtem, Coromon or the studied games, per search | clear | — |
| Field Archive | creature storage (8×30) | none found | clear | — |
| Transfer to Revival Tech | release-equivalent | none found | clear | — |
| Courier Bike / Trail Runners / Trail Buddy | travel items and follower | generic. "Courier Crisis" is a different name. | clear | — |
| Wexley's Croft | daycare-equivalent | none found | clear | — |
| Weigh-In / Field Camps / Learning Portal | events and places | generic | clear | — |
| Company Benefits Board (doc spells it "Benifits") | perk board | generic | clear | Fix the spelling to **Benefits** in the doc |
| Employee ID / Smartphone / energy meter / gold / Feed | design doc terms | generic | clear | — |
| Challenge coins (player-facing "coin") | badge-equivalent | a real-world military tradition. Generic. | clear | — |
| supply satchel | bag | generic | clear | — |
| Lumen Shimmer | variant sparkle | none found | clear | — |
| Crystal Warmth | Croft affection | generic | clear | — |
| File today's report | save menu label | generic | clear | — |
| Branch Access Card, book titles, pocket names (earlier pass) | key item and labels | none found | clear | — |

## Notes
- The places World named (Brookhollow, Lanternport, Fernwick, Saltmere, etc.) were NOT checked one by one in this pass. They're compound English place names with low risk, but give them a quick check before they are final.
- Everything flagged "rename" stays in the text for now. Text Bot renames nothing until Gary/Game dev decide (rule: never invent or rename ids/names on my own). The only text that would change is the player-facing wording. No ids change.
