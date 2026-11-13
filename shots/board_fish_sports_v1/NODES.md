# RT Employee Benefits: fishing / sports / skills / commuter / key cards (dev/board-fish-sports, Oct 29 2026)

Cost = points per rank. "Min ID" = ID level per rank. Region caps = max rank in regions 1/2/3/4. Text is placeholder (RTB_TEXT); Text Bot owns text/*.py.

## Angler Plan (fishing)
| Node | Ranks: cost / min ID / value | Region caps R1-R4 | Effect |
|---|---|---|---|
| rod_quick_bite | 1/2/500, 2/7/1000 | 1,1,2,2 | Bite comes sooner (ms cut from the longest wait) |
| rod_steady_grip | 1/3/120, 1/6/240, 2/10/360 | 1,2,2,3 | Reel window wider (ms) |
| rod_deep_water | 2/5/x1.15, 2/10/x1.3 | 0,1,1,2 | Rare fish chance multiplier |
| bait_allowance | 1/4/20%, 2/8/35% | 0,1,2,2 | Chance a cast keeps its bait |
| bait_premium | 1/6/+25%, 2/10/+50% | 0,1,1,2 | Bait effects scaled up |

## Wellness Plan (sports / feeds)
| Node | Ranks | Caps | Effect |
|---|---|---|---|
| grow_stipend | 1/2/-15%, 2/7/-30% | 1,1,2,2 | Grow timers shorter |
| training_allowance | 1/4/+10%, 2/9/+20% | 0,1,2,2 | Build gain from practice (+15 cap kept) |
| wellness_days | 1/3/x1.25, 2/8/x1.5 | 1,1,2,2 | Fullness clears faster (recovery) |
| light_lunch | 1/6/-10%, 2/10/-20% | 0,1,1,2 | Fruit fills less |

## Commuter Plan
| commuter_benefit | 1/4/-15%, 1/7/-30%, 2/10/-50% | 0,1,2,3 | Paid fast-travel fare discount. **Coming soon**: there is no paid fast travel today (rail is free with the pass, Skylift free). `travelFare()` is ready. |

## Executive Perks: board-only skills (taught from the Team menu "Board skill"; never in wild pools, learnsets, trainers or AI)
| Node | Cost | Region / Min ID | Skill | Element / role | Pow / Acc / Energy | Effect |
|---|---|---|---|---|---|---|
| skill_tidal_audit | 3 | R2 / 6 | Tidal Audit | water attack | 75/95/10 | 30% foe speed -1 |
| skill_overtime_blaze | 3 | R3 / 8 | Overtime Blaze | fire attack | 90/90/8 | self sp.atk -1 |
| skill_hostile_restructure | 3 | R3 / 9 | Restructure | earth attack | 70/100/10 | 30% foe speed -1 |
| skill_team_huddle | 4 | R4 / 10 | Team Huddle | light support | -/-/6 | heal 1/4, def +1 |
| skill_hostile_takeover | 4 | R4 / 12 | Hostile Takeover | dark utility | -/90/8 | foe atk -1, sp.atk -1 |

## R&D Clearance: key cards (regions 5-8 only, per Gary)
Buying grants a flag. A `locked_warps` entry with `unlock_flag` opens for it (map.js `keyDoorAt`), and story_gates clear on the same flag. All key cards are **coming soon** until the region exists.

| Node | Cost / Min ID | Flag | Region | Area | Rough research species |
|---|---|---|---|---|---|
| rt_node_station_m | 2 / 14 (needs promoted_id14) | rt_keycard_r5 | 5 | Mirefen sunken station | swamp / water-earth, peat bog dwellers |
| rt_node_station_t | 2 / 16 (needs promoted_id16) | rt_keycard_r6 | 6 | Tidewater sea-cave lab | tide pool / cave water, glow-in-dark deep fish |
| keycard_r7 | 4 / 12 | rt_keycard_r7 | 7 | TBD (proposal: flooded archive) | water-dark escapees |
| keycard_r8 | 4 / 12 | rt_keycard_r8 | 8 | TBD (proposal: deep-pressure tank) | rare water / light prototypes |

The ids, flag, cost and min ID for station_m and station_t match dev/r56-wiring 996d8a57, so the merge keeps one node per region. That branch enforces `requiresFlag`.

**Research capture hook:** capture.js `RESEARCH_SPECIES` (Set, empty until the roster is picked) and `RESEARCH_CATCH_MULT` 0.6. Research species catch at x0.6 and roll one rarity tier harder. Both paths go through `researchRate` (placeholder and synced creatures).

## Balance
The new sink costs about 60 points in total against about 11 points from ID levels 1-12, plus milestone points (Gold 1, Platinum 2, a parallel change). So players pick a lane. Rank 1 of most fish and feed nodes costs 1 point, so a light buy is cheap and full mastery is a long goal.
