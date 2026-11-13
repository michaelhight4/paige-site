# Sim results (headless, real engine, scratch copy /tmp/r56sim/k2 only)
**Data:** gnawford buffed to 480 total. This is the Coder default, **pending Gary**. One M5 team for every starter. The swamp/sea attacks in moves_swamp_sea.json are wired into the scratch copy only, with Bogroot/Tidebell Charms on the swamp/sea members.
**Assumed player:** M5 = starter 36, highkite 34, glassvine 33, prismite 33, eftwarden 32, with held items, bag 3 small + 2 large heals. M6/Ron = starter 41 + 39/38/38/37/37 (adds weathervex), bag 3+3.

| Fight (200 seeds each) | nibbin | cindrip | rillop |
|---|---|---|---|
| Master 5 Wenna Peat (ace fenmaw L36) | 0.42 | 0.53 | 0.53 |
| Master 6 Jory Swell (ace atollback L41) | 0.595 | 0.505 | 0.51 |
| Ron 6, optional (ace L41) | 0.435 | 0.49 | 0.57 |

## Tuning made after adding the moves
- **M5:** the swamp attacks made the old team far too hard (0.06/0.21/0.09). Fix: mirejaw now leads, every non-duckmoss member is L36, and duckmoss is L35. Lead order swings results by ±0.3.
- **M6:** deluvane went from L35 to L33. atollback learns Kelp Lash so it can answer earth types; without it, nibbin was about 0.70. lurelamp, pearlisk and driftknot carry Brine Lash.
- **Ron (cindrip):** deluvane went from L37 to L39.

## Earlier results for reference
- Old water-only moves, k2 data: M5 0.42/0.545/0.565, M6 0.53/0.465/0.44.
- Current unbuffed gnawford, old moves: M5 nibbin 0.245 (byStarter glimmoth fallback 0.51), M6 0.44/0.465/0.44, Ron nibbin 0.315 / rillop 0.735.

## Findings
- The `fadeout` evasion stall makes fights coin flips. Master/Ron teams list their skills explicitly without it.
- Results are very sensitive to lead order and ±1 level. Re-sim after any team edit.

## Hammerhead line (Oct 29, 2:25 PM CT)
Mallup and Gavelgill were added only to regular trainers (tr_route_coast_b, tr_tidewater_coast_e). The M5, M6 and Ron 6 teams are unchanged, so the rates above still stand and no re-sim was needed. The player assumptions also leave the line out.
