# Text Bot handoff: regions 5 and 6 story lines
*Story Bot, Oct 29 2026 1:41 PM CT; **updated 1:45 PM CT for Gary's 1:43 PM rulings G1-G5. Tags: [NEW] = new line group, [CHANGED] = intent changed, redo or re-check.*** Source beats: REGION_5_MIREFEN.md (R5), REGION_6_TIDEWATER.md (R6). Text Bot writes all final lines. **[SAMPLE]** lines in the region files are tone only.*
Rules: 2 x 40 chars per page; no blocked words (route, berry, PP, shiny, throw for capture, Pokédex, nurse, weed, super effective); "coin"; "dark" not fog words in Mirefen hall; no drink/smoke/drug hints; RITA calls the player `{employee_id}` only; never state what the field team found; never write Vane's motive, the Vane memo, the crystal-release ending, or a Riverbank Stranger link. Gate anything that depends on OPEN_QUESTIONS until Gary rules.

## Region 5
| # | Key area (proposed) | Speaker / object | Lines | Intent | Ref |
|---|---|---|---|---|---|
| 1 | maps.route1_east.* | ridge sign + pencil graffiti | 2 | comic; ridge is being chipped | R5 §3.1 |
| 2 | maps.route1_east.* | survey researcher (+ new trainers' intro/defeat/after) | 3-4 per NPC | doubt, "lower every season" | §3.1 |
| 3 | inspect: E1 pillars after dim | system | 1 | wonder, wordless-ish | §3.1 |
| 4 | system_company_voice area_new route1_east / sunmeadow / mirefen / station / storm | RITA | 5 | sarcastic asset talk | §3.2, §4, §5.1 |
| 5 | sunmeadow_croft.nan | Nan | 3-5 (+1 soup line, undated, gated on Q4) | warm, tired, both sides; **[CHANGED]** her "brighter as more got fitted" is now true (Guardian fact 2), say it plainly, not as a guess | §3.2 |
| 6 | sunmeadow_croft.ron | Ron sighting | 4-6 + bin line placement per Q6 | bravado over hurt; "job down the coast" | §6 |
| 7 | mirefen NPCs | painted-crystal owner, kids, sandbaggers | 6-8 | ordinary Unbound; storm prep | §3.4, §4 |
| 8 | prop:camp_mirefen lunch tin | inspect | 1 | "7/10" | §3.5 |
| 9 | storm sequence | townsfolk, system, Wenna | 6-8 | the turning beat; frogs go quiet | §4 |
| 10 | company_inbox storm memo | "Facilities" | 1 email | unsigned, ironic; NOT Vane | §4 |
| 11 | station_mirefen inspects | plaque, closing notice, shoe sign, jars, visitor book, whiteboard, clipboard, counter + sticky note, sampling map, **[NEW]** signal strip chart + I.S. sleeping-creature doodle, **[NEW]** bonded-unit tally | ~14 | first discovery; facts 2 and 3 as data, never naming the Guardian | §5 |
| 12 | station key reader | system | 1-2 | reader hesitates, lets you in **[CHANGED]** card is from the Benefits node | §5 |
| 13 | rt_outpost_mirefen.supervisor + Benefits board | **[CHANGED]** promotion pq_bog_census unlocks node; **[NEW]** node card text "Research Access: Station M", card-by-post pigeonhole inspect | 4-6 + RITA + node text 1-2 | a big door sold as a perk | §7 |
| 14 | masters.mirefen (Wenna) | intro, flag variants (camp/Marta **[CHANGED: Marta now canon, drop hedge]**, Warmth ≥60, rematch), mid-battle line, coin, gift, after, after_storm, storm-window | ~14 | gruff, tender; keep existing hall JSON | §8 |
| 15 | hall_mirefen helpers | h1-h3 | existing + 1 hint each about listening | soul in the puzzle | §8 |
| 16 | side quests | sq_ask_nicely, sq_count_numbers, sq_wenna_lamp (new), **[NEW] sq_gd_riverglint "Where It Rested"** (angler 4-5, islet inspects 3, RITA 1, drawing item text) | ~28 | see table, §9a | §9, §9a |
| 17 | Lantern Rest keeper | +1 line after sq_lumen_chain | 1 | Wick | §9 |
| 17a | sunmeadow trainer Trail Kid Jory | **[NEW]** default "best name" line + post-`beat_master_tidewater` proud line | 2 | small, soulful, shared name | R5 §3.2 |

## Region 6
| # | Key area | Speaker / object | Lines | Intent | Ref |
|---|---|---|---|---|---|
| 18 | brookhollow storm variant | neighbours, kid, home NPC (**[CHANGED]** + river-is-low remark), Ron's bin inspect | 6-8 | homecoming in rain | R6 §3.1 |
| 19 | route_coast stranded NPCs + new trainers | postman, cliff diver, reef contractor, fisher | 3-4 each | rescues; both sides | §3.2 |
| 20 | tidewater_coast townsfolk | boat-counting kid, harbour crew, poster | 6-8 | a town that rescues by habit | §3.3 |
| 21 | Ron 5, Tidewater (**[CHANGED]: optional**) | opener before the choice (umbrella, job, coin-5 bin line, honest layoff line) **plays for all**; choice prompt; **[NEW]** decline reaction; **[NEW]** harbour-slip rematch line; **[NEW]** parting beat if unfought when the Master falls (2-3 pages, warm, `ron5_missed`); win, loss, after (pocket plant, path variants), umbrella hand-off on all paths | ~19 | full soul beat either way; 5 bags, no flies | §5 |
| 22 | storm turn morning | system / townsfolk / RITA | 3-4 | relief | §4 |
| 23 | lab_tidewater inspects | reader, buoys, chart, **[NEW]** river-mouth contour map + photo + T.B./I.S. sticky notes, rota, birthday card, visitor sheet, crate, tide warning | ~12 | recognition; fact 1 lands as data | §6 |
| 24 | rt_desk_tidewater.clerk + Benefits board | **[CHANGED]** promotion pq_storm_duty (no Ron requirement) unlocks node; **[NEW]** node text "Research Access: Station T" | 4-6 + node text | blanket clerk irony | §7 |
| 25 | masters.tidewater_coast (Jory) | rope scene, flag variants (rescues, Ron win/lose, **[NEW]** Ron declined, Warmth ≥60, rushing), battle talk, coin, gift, after | ~15 | calm, kind | §8 |
| 26 | side quests | **[CHANGED]** sq_gd_sea_glass now states it: violet glass washes from the river mouth, "the river's bleeding"; sq_ug_lifeguard; sq_lights_in_window; **[CHANGED]** sq_ron_umbrella reachable fought or not (`met_ron_tidewater`) | ~24 | see table | §9 |
| 27 | items | Ron's Umbrella, Reed Lamp (R5), key cards "Station M" / "Station T" names | names + descriptions | Game dev confirms ids | R5 §5, §9; R6 §5 |

## Lines to change or re-check in existing drafts
- **[CHANGED, ruled G3]** tidewater Ron line "The flies have names now. / Don't ask me their names, {nick}." → move to the Lanternport Ron scene (mq_lanternport). Tidewater uses the coin-5 (5 bags, no flies) bin line instead.
- halls_tidewater_coast `after`: "The road's long gone" fine; add morning-after variant.
- **[CHANGED, ruled G4]** sunmeadow trainer "Trail Kid Jory" keeps his name (no rename); add row 17a lines.
- **[CHANGED, ruled G2]** any Marta/Mirefen-camp hedges in camp and Wenna drafts: write as fact.
- Club `note_mirefen` "fisher" → "someone" is fine (angler doesn't fish).
