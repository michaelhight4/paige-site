# Gullhaven — story brief (DRAFT, pending Gary's approval)
*Story Bot, Oct 30 2026 ~7:40 AM CT. Followed story-quality-standard (Phase 0/1: canon check, set registry, causality). Lines marked [SAMPLE] are tone only; Text Bot owns final wording. Banned player words respected (no route/berry/PP/shiny/badge/Pokédex).*

## 0. Canon check (what exists)
- **"Gullhaven" appears nowhere in the repo** (rg across /workspace incl. design, data, src, text, maps, dev notes). No map, NPCs or dialogue exist. Everything here is NEW and DRAFT.
- Related canon/drafts used: Lanternport (Region 7) has a ferry and a **Sat night ferry + lantern festival** (SOUL 1.4); the worldbuilding audit asks for **"a fishing derby on Saturdays"** on the Lanternport pier (draft) and "one water-only pocket per coastal region"; Tideglide (R5) is the surf skill; Atollback lore "sailors once mistook a resting one for land" (DEX 315); origin canon in `regions56/story_beats.md` §D/§F/§W.
- **Proposed placement:** a small fishing island off **Lanternport (Region 7)**, map id `PLACEHOLDER_gullhaven` (+ `PLACEHOLDER_gullhaven_pier`). Order-safe: may be visited before or after Tidewater.

## 1. Why sea only
- **Physical:** Gullhaven sits on a ring of sea stacks across the **Gullrace**, a tide-race strait too fast to bridge. Ferry from Lanternport (daily; extra Sat derby sailing) or, after `has_tideglide`, glide across at slack water. Fits existing travel: ferry = Lanternport canon, Tideglide = surf gate. No Skylift landing (gull colonies cover every roof; locals: "the gulls don't share").
- **In-world history (hint seed):** a stone causeway once linked it to the mainland. Its stumps still show at low tide. Locals say it was "taken down the bad year, before my gran's time" (≈ 50 years: the Breakout). Official story: storm damage. Truth (never stated): RT pulled it to keep whatever was loose on the mainland off the island, or the reverse. Players who did the R6 lab may connect the date; others just see old stones.

## 2. Link to the main plot (hint level only)
Gullhaven never says "made", "lab", "Test 7" or "Breakout". Seeds, each readable as mere island folklore:
1. **The causeway stumps** — date matches the breakout logs (R6-3). Sign: "Causeway, removed [year]. By order." No signature.
2. **The old RT "Coastal Survey Hut"** (locked, Heritage-plaque style). Peeled paint shows a field-team roster board with 4 blank hooks — echoes the missing field team without naming them. Interact only.
3. **Violet nights on the Gullrace.** Old fishers say the water "glows the colour of the crystals" on still nights, stronger at the river mouth (planted G1 fact 1: signal stronger near water). Buddy makes its low unhappy sound on the pier end (SOUL 1.2).
4. **The derby's "first fish"** (legend below) — a big river beast that swam *out to sea and back up again*: a soft echo of Ondravel and the river dream. Never named; never a Guardian.
5. **Post-Ending 2 only:** one fisher mentions a "big wet print on the slip" heading inland, then shrugs. (Mirrors H1/H2 canon print; memory-loss safe since it's the fisher's memory.)
- **Not here:** Coralie (stays at the Tidewater cove, implies only), Ondravel's name, Kilumora, telepathic control, Wellspire, Vane, the Stranger. Ondravel's telepathy is at most one villager's dream ("dreamt the sea was asking me something"), optional.

## 3. Derby legend (told by locals)
Long ago, before the ferry and before the causeway came down, Gullhaven's fishers held a contest every spring tide to see who could land the biggest catch. One year an old netter named Bryn Hollis came back with nothing, and laughed, and said she'd seen the biggest fish in the world and let it go.

She said it rose under her boat at dusk, longer than the harbour, with a light on its brow "like a lantern somebody forgot to put out". It didn't take her bait. It looked at her, the way a dog looks at a door, and then it turned and swam toward the mainland, up where the old river used to meet the sea. Nobody believed her. The next year the river ran lower, and the year after that lower again.

So now, every Saturday, Gullhaven fishes for "Bryn's fish". Nobody expects to catch it. The derby prize is a tin lantern, and the winner hangs it on the pier end overnight, "so it can find its way back." The island's toast at the weigh-in: *"Big enough to let go."*

(Hint value: brow light = cracked crystal; river ran lower = G1 fact 2; looking "at a door" = a plea, the dream. Reads as a fish story to anyone who hasn't seen the finale.)

## 4. Suggested NPCs / speakers (for Text Bot)
| Speaker | Where (set) | Line keys (suggested) | Intent |
|---|---|---|---|
| Ferry pilot (Lanternport side) | Lanternport ferry slip | `gh.ferry.depart`, `gh.ferry.derby_sat` | How to get there; Saturday extra sailing. [SAMPLE] "Gullrace waits for nobody. Neither do I." |
| Derby host, **Marlo Hollis** (Bryn's great-grandson, 60s, loud, kind) | Gullhaven pier, weigh-in table | `gh.derby.intro/rules/weighin/win/lose/legend` | Runs the derby; tells the legend (§3). |
| Old netter, **Aunt Sall** (80s) | Bench by causeway stumps | `gh.sall.stumps`, `gh.sall.violet_nights` | Seeds 1 and 3. Vague, fond. "Taken down the bad year." |
| Child shell-counter | Beach | `gh.kid.gulls`, `gh.kid.lantern` | Comic; why no Skylift (gulls). |
| Heal/shop keeper | Heal hut | `gh.heal.*` | Standard. |
| Sign: causeway | Low-tide stumps | `gh.sign.causeway` | Seed 1 (fixed text). |
| Interact: Survey Hut board | RT hut (locked) | `gh.ins.survey_board` | Seed 2. |
| Optional dreamer fisher | Net shed | `gh.dreamer.sea_asks`; post-E2 `gh.dreamer.print` | Seeds telepathy (soft) and #5. |
| Ron (optional, after `ron_knows_origin`) | Ferry deck | `ron.gullhaven.derby` | Light: he enters the derby, loses to a child. No lore. |

**Set registry (to add to sets/REGISTRY.md once approved):** `gullhaven` town (pier, weigh-in table, lantern hook at pier end, causeway stumps SW, survey hut N, net shed, heal hut, beach); `gullhaven_ferry` (deck interior, reused both ways). Flags: `visited_gullhaven`, `derby_entered`, `derby_won`, `seen_gh_causeway`, `seen_gh_survey_board`.

## 5. Open questions for Gary
1. Gullhaven is new: confirm placement off **Lanternport (R7)** and the name.
2. The audit put the Saturday derby on the **Lanternport pier**. Move it to Gullhaven (recommended; ferry from Lanternport) or keep both (Lanternport weigh-in only)?
3. Sat already has the Lanternport night ferry + lantern festival + meteor night: OK for the derby lantern prize to tie into that festival?
4. Tideglide crossing allowed, or ferry only (stronger "sea town" feel)?
5. Approve the causeway "removed the bad year" seed, and the post-Ending 2 print line.
