# Gullhaven — story brief v2 (DRAFT, pending Gary's approval)
*Story Bot, Oct 30 2026 ~7:50 AM CT. v2 aligns with branch `dev/seaport` (`/workspace/wt_seaport/kilumen/design/seaport/PLAN.md`, `textbot_seaport.json`). v1 is backed up as `gullhaven_story.backup_v1.md`. Coder's rulings are still draft: the derby lives in Gullhaven only, the lantern-festival tie stays light, and the causeway hint and the post-Ending 2 print are approved. Lines marked [SAMPLE] are tone only; Text Bot owns the wording. Game code, PLAN.md and the derby rules are unchanged.*

## 0. Canon on dev/seaport (used as-is)
- **Route in:** `tidewater_coast` (channel x26-27, south exit) → `gullhaven_sea` (a Tideglide sea maze with 5 swimmers: Marla, Tobin, Nell, Fenn, Rowan) → sand islands → `gullhaven_cave_west` "Kelpwind Cave" or `gullhaven_cave_east` "Gullbone Cave" (each has a hermit) → `gullhaven_cliffs` (sign, birdwatcher, tide pool) → `gullhaven` (heal centre, shop, harbour master, derby crier, angler; Skylift fly point at (7,10), `visited_gullhaven`) → `gullhaven_lagoon` (derby clerk at (13,5), weigh-in scale, three piers).
- **Derby (rules unchanged):** 10 Tidelumens, 1 per cast; untimed; leaving the lagoon forfeits the run; points from rarity, weight, record size and the featured Kilu (×2); tiers are crest, gold, silver and bronze. Optional side trip, wild Lv 52-56.

## 1. Why sea only (fits the Tideglide + caves route)
- **Physical:** Gullhaven sits on a cliff shelf. On the seaward side the cliffs drop sheer, and the water around them is a maze of rocks and fast cross-currents that wrecks hulls. Boats don't get through, but strong swimmers and a Tideglide partner can. The only way up from the waterline is through the two sea caves, which the tide carved under the cliffs. Kelpwind and Gullbone open onto the cliff top above the town.
- **Skylift:** the first arrival must be by sea. Once you have stood in town (`visited_gullhaven`), the fly point lets you return by Skylift, which is the existing code. In-world: "the gulls know you now."
- **History (approved hint seed):** a stone causeway once ran from the Tidewater shore. Its stumps are the rocks the maze now winds between. Locals say it was "taken down the bad year, before my gran's time" (about 50 years ago, the same date as the Breakout). The official story is storm damage. The game never says why.

## 2. Link to the main plot (hint level only; no origin words, no Ondravel, Kilumora, Wellspire or Coralie)
| # | Seed | Where (existing NPC/spot) | Condition |
|---|---|---|---|
| 1 | Causeway "taken down the bad year" | `gullhaven_harbour_master` (extra page). Optional new sign `gullhaven_sea_causeway_sign` on a stump (needs a WD prop) | always |
| 2 | "Violet nights" on the water near the old river mouth (G1 fact 1) | `gullhaven_angler` (Night variant) | Night |
| 3 | Bryn's fish: a beast with a light on its brow that swam up the old river, which ran lower every year after (fact 2 and the dream) | `gullhaven_lagoon_derby_clerk` = **Marlo Hollis** | after the first derby turn-in |
| 4 | A dream that "the sea was asking me something" (a soft hint of Ondravel's telepathy) | `gullhaven_cave_west_hermit` (the 9-year Kelpwind hermit) | `visited_gullhaven` |
| 5 | **Approved:** a big wet print on the slip, heading inland, then a shrug | same Kelpwind hermit | `ending2_done` (existing flag, src/region9) |
| 6 | Old RT survey hut, roster board with 4 blank hooks | **optional.** Needs a new prop on `gullhaven_cliffs`; cut it if WD has no slot | always |
The trail buddy's low unhappy sound at the lagoon pier ends (SOUL 1.2) is optional and has no text.

## 3. Derby legend, merged into the lagoon derby
The clerk at the desk is **Marlo Hollis**, 60s, loud and kind, Bryn Hollis's great-grandson. The run text (`derby.*`) stays as written. Marlo tells the legend on his talk line once you've turned in a run.

> Long ago, before the causeway came down, Gullhaven held a contest every spring tide for the biggest catch. One year old Bryn Hollis came back with nothing, laughed, and said she'd seen the biggest fish in the world and let it go. It rose under her at dusk, longer than the harbour, with a light on its brow "like a lantern somebody forgot to put out". It didn't take her bait. It looked at her the way a dog looks at a door, then swam for the old river mouth. Nobody believed her. The next year the river ran lower, and the year after that lower again.
>
> So every derby, Gullhaven is really fishing for Bryn's fish, and nobody expects to catch it. The toast at the weigh-in is *"Big enough to let go."*

**Lantern tie (light, no new item or system):** after any prize tier, Marlo adds one flavour page: "Hang a lantern on the pier end tonight, so it can find its way back. Lanternport does the same, festival nights." The gold prize is already `lantern_moth ×3`, which fits. Tiers and prizes are unchanged. The Lanternport Saturday derby (audit draft) is **dropped**.

## 4. Speakers and line placement (reuse the existing NPCs)
| Speaker (existing id) | Map | Story job | Keys |
|---|---|---|---|
| Swimmers Marla…Rowan (`gullhaven_sea_swimmer_a..e`) | gullhaven_sea | Why sea only: currents break boats. Rowan's `after` line points to the caves | existing; add the "no boat gets through" idea to one `after` line (e.g. swimmer_b Tobin) |
| `gullhaven_sea_sign` | gullhaven_sea | keep | — |
| Kelpwind hermit (`gullhaven_cave_west_hermit`) | cave_west | Seeds 4 and 5 | `+ dream` (`visited_gullhaven`), `+ print` (`ending2_done`) |
| Gullbone hermit (`gullhaven_cave_east_hermit`) | cave_east | "the cave is the only stair up" | `+ stair` page |
| Birdwatcher (`gullhaven_cliffs_birdwatcher`) | cliffs | Gull comedy and the Skylift "gulls know you" line (replaces the v1 kid) | `+ skylift` page |
| Harbour master (`gullhaven_harbour_master`) | gullhaven | Seed 1 (causeway). **Fix:** "only boats and swimmers" → "only swimmers" | edit + 1 page |
| Derby crier (`gullhaven_derby_crier`) | gullhaven | Mentions "Bryn's fish" by name only | 1 phrase |
| Angler (`gullhaven_angler`) | gullhaven | Tidelumen lore (keep) + Seed 2 at Night | `+ night` variant |
| **Marlo Hollis** (`gullhaven_lagoon_derby_clerk`) | gullhaven_lagoon | Runs the derby; tells the legend; lantern page | name the clerk; `+ legend`; `derby.turn_in` gets the lantern page |
| Ron (optional cameo) | gullhaven_lagoon, pier | Enters the derby and loses to a swimmer kid. No lore | show when `ron_knows_origin` && !`beat_master_lanternport`; sets `ron_gullhaven_seen` |
| Heal centre | heal interior | shared heal text, no custom lines | — |

**Flags:** existing `visited_gullhaven`, `ending2_done`, `ron_knows_origin`, `beat_master_lanternport`. New: `ron_gullhaven_seen`, `gh_legend_heard` (set by Marlo's legend talk).
**Set registry:** all 7 maps above, as built by `tools/seaport/build_gullhaven.py`. Fixed props: the desk at (13,5), the scale at (19-20,5), three piers, two cave mouths on the cliffs, and the fly point at (7,10). If seeds 1 and 6 are kept, add the causeway stump sign and the survey hut.

## 5. Open items vs PLAN.md / branch
1. PLAN says "a **yearly** fishing derby", but the code runs it any day and the clerk says "come back soon". Recommend "the derby runs every day the lagoon allows". The legend no longer says "Saturdays".
2. `gullhaven_harbour_master` says "only boats and swimmers": this conflicts with the no-boats reason (the line fix is in §4).
3. The heal-centre door in `gullhaven` warps to `heal_brookhollow` (build_gullhaven.py:265). There's no `heal_gullhaven` interior, which is probably a placeholder. For Coder; it doesn't affect the story.
4. Seeds 1 (sign) and 6 (survey hut) need new props. They're optional.
5. Ron's cameo: how does he get there with no boats? Suggest a single line: "Swam. Don't ask." Or cut the cameo.
