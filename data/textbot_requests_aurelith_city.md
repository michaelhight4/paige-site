# Text Bot requests: Aurelith capital city (branch dev/aurelith-city)

Text Bot owns text/*.py and text/overworld_lines.json. The maps already point at these keys
(`text_ref: overworld_lines.json maps.<map>.<npc_id>`), but the entries below don't exist yet.
Please write them. Keep them to 1-3 short lines and avoid every blocked word
(PP, shiny, super effective, Pokédex, Poké Ball, Gotcha!, nurse, weed, route/routes, berry).
Suggested lines are only a starting point.

## NPC lines missing (maps.<map>.<id>)
| map | id | where / role | suggested gist |
|---|---|---|---|
| aurelith | aurelith_commuter | Rail Blvd, walking to the terminal | Trains every hour; the capital never sleeps |
| aurelith | aurelith_business | Galleria block (53,19) | Revival Tech's tower runs half the city |
| aurelith | aurelith_fan_1 | Stadium plaza | Waiting to see a challenger with all 8 coins |
| aurelith | aurelith_fan_2 | Stadium plaza | Bought a scarf in the Galleria for the Games |
| aurelith | aurelith_station_guard | Terminal forecourt | Airspace is closed, so rail is the only way in |
| aurelith | aurelith_tourist | Crown Avenue | First time in the capital; the fountain is a must |
| aurelith | aurelith_gate_guide_e | East Gate | East Gate leads back toward the eastern paths |
| aurelith | aurelith_gate_guide_s | South Gate (36,45) | South Gate heads for Cindervale |
| aurelith | aurelith_park_walker | Canal park | The canal is calm; creatures don't nest here |
| aurelith | aurelith_cafe_regular | outside the closed café | The café is shut today; should reopen soon |
| aurelith_galleria_1f_int | aurelith_galleria_clerk_1 | 1F counter | Welcome to the Galleria; lift goes to the roof |
| aurelith_galleria_1f_int | aurelith_galleria_shopper_1 | 1F | Stocking up on capture crystals |
| aurelith_galleria_2f_int | aurelith_galleria_clerk_2 | 2F | Battle items on this floor |
| aurelith_galleria_2f_int | aurelith_galleria_shopper_2 | 2F | Prepping for the Arena |
| aurelith_galleria_3f_int | aurelith_galleria_clerk_3 | 3F | Sports gear and team kits |
| aurelith_galleria_3f_int | aurelith_galleria_shopper_3 | 3F | Wants the Stadium jersey |
| aurelith_galleria_4f_int | aurelith_galleria_clerk_4 | 4F | Home and decor |
| aurelith_galleria_4f_int | aurelith_galleria_shopper_4 | 4F | Decorating a new Aurelith flat |
| aurelith_galleria_roof | aurelith_roof_kid | roof garden | You can see the whole stadium from up here |
| aurelith_hotel_int | aurelith_hotel_clerk | front desk | Rooms are fully booked for the Games |
| aurelith_hotel_int | aurelith_hotel_guest | lobby | Came in on the train for the Games |
| aurelith_hotel_2f_int | aurelith_hotel_tourist | 2F hall | Lost the room key; the lift is handy |
| aurelith_rthq_int | aurelith_rthq_receptionist | lobby desk | Staff only past the lobby; lore about Revival Tech |
| aurelith_rthq_int | aurelith_rthq_staffer | lobby | Revival Tech's founding story (lore) |
| aurelith_stadium_int | aurelith_stadium_attendant | concourse | Arena doors open only for all 8 coins |
| aurelith_stadium_int | aurelith_stadium_fan | concourse | Seats sell out every Games |
| aurelith_terminal_int | aurelith_terminal_clerk | ticket desk | Tickets / rail info (rail menu binding later) |
| aurelith_terminal_int | aurelith_terminal_traveller | hall | Just arrived; the capital is huge |
| aurelith_terminal_int | aurelith_terminal_guard | hall | Restricted airspace reminder |
| home_aurelith_flat | home_aurelith_flat_resident | flat | Small flat, great view of the canal |

## Sign texts to confirm or replace (currently placeholder text in the map JSON)
- aurelith.aurelith_capitol_door / museum_door / cafe_door / school_door: "Closed today." (closed doors, interiors not built)
- aurelith.aurelith_tram_stop: "Tram stop: Terminal - Stadium (not running yet)"
- aurelith.aurelith_kiosk: "City info kiosk" (needs a real kiosk blurb / city directory)
- aurelith.aurelith_crown_avenue_sign, aurelith_rail_blvd_sign: street signs
- aurelith_stadium_int.aurelith_stadium_board: "Aurelith Games: the Arena is open to holders of all 8 challenge coins."
- aurelith_rthq_int.aurelith_rthq_plaque: "Revival Tech - head office. Founded in Aurelith."
- aurelith_galleria_dir_1..4: floor directory (1F heals/crystals, 2F battle items, 3F sports gear, 4F home and decor)
- aurelith_terminal_int.aurelith_terminal_timetable: "TBD: departures" -> needs a real timetable line
- Lift prompts (Galleria 1F-4F + Roof, Hotel 1F/2F): the floor labels are in the map JSON; a prompt line like "Which floor?" is wanted
