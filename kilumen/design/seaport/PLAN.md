# Gullhaven — seaport region + Fishing Derby (dev/seaport, Oct 30 2026)

## Name and lore
**Gullhaven**: a harbour town on a cliff shelf, reached only by water. Gulls nest in the cliffs, and the town runs a fishing derby any day on its lagoon.
The derby crystal is the **Tidelumen**: a lumen shard cut by the tide. It is only good for one derby cast.

## Layout (maps reuse the existing kit; no new art)
| Map | Size | Role |
|---|---|---|
| tidewater_coast (edited) | — | channel at x26-27 from row 36 down is now water (with encounters); new south exit → gullhaven_sea |
| gullhaven_sea | 40x44 | sea maze of Tideglide corridors, 5 swimmer trainers (sight 4-6, they see across water), 2 hidden items, sign; two sand islands with cave mouths at (6,39) and (33,39) |
| gullhaven_cave_west "Kelpwind Cave" | 30x24 | unique DFS maze (seed 31), hermit, item; top door → cliffs (8,10) |
| gullhaven_cave_east "Gullbone Cave" | 30x24 | unique DFS maze (seed 32), hermit, item; top door → cliffs (27,10) |
| gullhaven_cliffs | 36x24 | side map: both cave mouths, tide pool (fishing), birdwatcher; east exit → town |
| gullhaven | 40x30 | town: heal centre, shop, fly point (7,10), harbour master, crier, angler; south exit → lagoon |
| gullhaven_lagoon | 32x22 | **derby area**: desk + clerk (13,5), weigh-in scale (19-20,5; use spot 19,6), three piers |

Builders: `tools/seaport/build_gullhaven.py` (maps), `tools/seaport/register_gullhaven.py` (world layout, encounters, fishing, rod caps). Both can be re-run.

## Level band
Wild 52-56, trainers 54-58, rod cap 58. R6 caps at 50 and R7 opens at 60, so Gullhaven sits between them: an optional water side-trip that bridges the gap.
It stays well under the enemy cap of 68.

## Fishing Derby rules
- Talk to the clerk. The desk shows the run's **featured Kilu** and asks to enter. On Yes you get **10 Tidelumens**; each cast uses 1, hooked or not. You get a loaner rod if you have none.
- **Not timed.** The day clock is held (timescale 0) from entry to turn-in.
- **Area lock:** the derby area is the whole gullhaven_lagoon map. Any warp or edge exit while a run is live asks "Quit the derby?". Yes forfeits the run (score 0, no prize) and leaves. No turns you back.
- A hooked fish skips the battle. It is weighed on the scale, and a scale card shows its points.
- When the crystals run out, take the haul to the **weigh-in scale** to turn in. You can also turn in early at the desk.
- Turn-in gives the prize tier and best score (saved). Your heaviest fish joins the party with its `weight_kg`.
- If you reload mid-run, the run resumes with the crystals and featured Kilu that were saved. The haul caught so far is lost.

### Weight (water-type catches)
`kg = min + (max - min) * r^2.2`, where r is uniform in [0,1), rounded to 0.1 kg. `frac = (kg - min) / (max - min)`.
The exponent makes heavy rolls rare: P(frac ≥ 0.9) ≈ 4.7% and P(frac ≥ 0.95) ≈ 2.3%. The weight is stored on the Kilu as `weight_kg` and shown in its summary as "Weight N kg".
(Only derby catches roll a weight. Normal fishing still goes to battle and does not set weight_kg.)

| Species | kg range | | Species | kg range |
|---|---|---|---|---|
| wavelin | 2-9 | | spratwyrm | 8-32 |
| reefshell | 4-14 | | tidemarrow | 20-85 |
| ribboneel | 3-18 | | plashcrown | 15-60 |
| breakerfin | 12-45 | | hullwhale | 60-240 |
| paleminnow | 0.2-1.2 | | finnip | 0.5-3 |
| whelkin | 1-6 | | other | 1-10 (default) |

### Points per catch (shown on the scale)
| Part | Points |
|---|---|
| Rarity base | common 10, uncommon 25, rare 60 |
| Weight | round(20 × frac), 0-20 |
| Record size (frac ≥ 0.95) | +15 |
| Personal best (heavier than this save's record for the species) | +5 |
| Featured Kilu | whole catch ×2 |

`catch = (base + weight + record + pb) × (featured ? 2 : 1)`

### Haul score (turn-in)
The leaderboard shape (largest / total weight / count) is adapted from RiverKing (Apache-2.0).
`score = Σ catch + 2 × count + 10 (if there is at least 1 fish, bonus for the heaviest)`

Range: 0 (no fish, or forfeit) up to about 10 × (60+20+15+5) × 2 + 30 = 2030 in theory. A typical run of 10 commons/uncommons scores about 200-320.

### Prize tiers (existing items)
| Tier | Score ≥ | Prize |
|---|---|---|
| crest | 380 | hollowstar_roe ×1 |
| gold | 260 | lantern_moth ×3 |
| silver | 150 | glimmer_worm ×3 |
| bronze | 60 | potion ×2 |

### Featured Kilu rule
One featured Kilu per run. It is picked uniformly from the derby water's pool: every species in any rod tier of `fishing_tables.maps.gullhaven_lagoon`.
It is rolled when the desk is first opened, held until that run ends, and saved in `active.featured` (so a reload keeps it) and in `last.featured`.
It is shown in the desk prompt and on the HUD (top-left), and its catches are worth ×2.

### Save (`save.systems.derby`)
`{ best, runs, records: {species: kg}, last: {score, featured, tier}, active: {crystals, featured} | null }`. It is validated in src/overworld/save_schema.js.
