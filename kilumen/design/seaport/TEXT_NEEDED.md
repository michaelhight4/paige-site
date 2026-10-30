# Gullhaven — lines needed from Text Bot
Every line in game is a placeholder for now. Please avoid these words: PP, shiny, super effective, Pokédex, Poké Ball, Gotcha!, nurse, weed, route(s), berry, elite(s), gym (say "hall"), and "throw" for capture.

## Derby (src/seaport/derby.js TEXT; tokens in {braces})
| Key | Context |
|---|---|
| derby.desk_intro | clerk intro + Yes/No. {n} crystals, {featured}, {mult} |
| derby.desk_busy | talking mid-run. {n}, {score} |
| derby.turn_in_early | ask to turn in with {n} crystals unused (Yes/No) |
| derby.start | run begins, clock stops |
| derby.no_crystal | tried to cast with none left |
| derby.catch | {species} {kg} {points} |
| derby.catch_featured | same, featured Kilu |
| derby.record | record-size roll |
| derby.out | last crystal used |
| derby.leave_ask | quit prompt (Yes/No) |
| derby.forfeit | after quitting |
| derby.scale_idle | scale with no run. {best} |
| derby.turn_in | result. {score} {tier} |
| derby.no_tier | result with no prize. {score} |
| derby.new_best | new best score |
| derby.keeper | heaviest fish joins you. {species} {kg} |

## Map lines (overworld_lines.json maps.*)
- gullhaven_sea: sign, swimmer_a…e (each needs before-battle and defeat lines)
- gullhaven_cave_west: hermit · gullhaven_cave_east: hermit
- gullhaven_cliffs: sign, birdwatcher
- gullhaven: sign, harbour_master, derby_crier, angler
- gullhaven_lagoon: derby_clerk (default line when the hook is off), sign
- Map titles: "Kelpwind Cave" and "Gullbone Cave" (feel free to rename)
