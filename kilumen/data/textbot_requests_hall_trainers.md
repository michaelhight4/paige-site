# Text Bot requests: hall trainers v1 (Coder, Oct 29 2026)

New hall trainers (Gary pt2060u: "we add more trainers to the gyms"). Each needs a block under
`maps.<hall map>.<npc id>` in text/overworld_lines.json, same shape as `saltmere_hall_int_h1`:
`pages` (pre-battle, 1-2 lines), `battle_lost` (1 line), `after` (1 line, ideally a puzzle or Master hint),
`name`, `trainer_class`. Names below are Coder proposals (in masters.json `name_placeholder`); rename freely,
but avoid clashes with the existing trainers. Blocked words as usual (no gym, route, berry, Poke words).

| map | npc id | proposed name | class | hall theme | team (species L) |
|---|---|---|---|---|---|
| fernwick_hall_int | fernwick_hall_int_h3 | Tamsin | Hall Trainee | earth | cobblepup 9, lintmouse 9 |
| fernwick_hall_int | fernwick_hall_int_h4 | Hobb | Hall Trainee | earth | pebblant 9, tumbloam 9 |
| fernwick_hall_int | fernwick_hall_int_h5 | Wren | Hall Trainee | earth | burlbeetle 10, pumicepuff 10 |
| fernwick_hall_int | fernwick_hall_int_h6 | Pell | Hall Trainee | earth | bleatling 10, netspinner 10, railmite 11 |
| saltmere_hall_int | saltmere_hall_int_h4 | Odile | Hall Helper | water/sea | sandstarlet 12, blubbet 12 |
| saltmere_hall_int | saltmere_hall_int_h5 | Brannock | Hall Helper | water/sea | ribboneel 13, spratwyrm 13 |
| saltmere_hall_int | saltmere_hall_int_h6 | Peg | Hall Helper | water/sea | polypip 13, medulet 13, quaymouser 14 |
| revival_hall_int | revival_hall_int_h5 | Seren | Hall Helper | light | halovy 19, gildfinch 19 |
| revival_hall_int | revival_hall_int_h6 | Alder | Hall Helper | light | glarekit 20, dawnfin 20, lampwick 21 |
| frostspire_hall_int | frostspire_hall_int_h4 | Halvard | Hall Helper | bird/wind | spraytern 30, signalwren 30 |
| frostspire_hall_int | frostspire_hall_int_h5 | Isolde | Hall Helper | bird/wind | sailquill 31, highkite 31 |
| frostspire_hall_int | frostspire_hall_int_h6 | Kestrel | Hall Helper | bird/wind | pouchbill 31, snowgrouse 31, belfrydove 32 |
| mirefen_hall_int | mirefen_hall_int_h4 | Nettle | Hall Helper | swamp | mirewump 34, snapmoor 34 |
| mirefen_hall_int | mirefen_hall_int_h5 | Osric | Hall Helper | swamp | reedmoot 35, eftwarden 35 |
| mirefen_hall_int | mirefen_hall_int_h6 | Bryony | Hall Helper | swamp | brimtoad 35, ditchsnap 35, pondkin 36 |
| tidewater_hall_int | tidewater_hall_int_h5 | Coral | Hall Helper | sea | coilarch 40, spraytern 40 |
| tidewater_hall_int | tidewater_hall_int_h6 | Fitch | Hall Helper | sea | bulwarkrab 41, tundrarch 41, squidge 42 |
| lanternport_hall_int | lanternport_hall_int_h4 | Vesper | Hall Helper | spirit/ghost | runeskein 44, lanternkeep 44 |
| lanternport_hall_int | lanternport_hall_int_h5 | Morrow | Hall Helper | spirit/ghost | foamkin 45, wreckwarden 45 |
| lanternport_hall_int | lanternport_hall_int_h6 | Ysolde | Hall Helper | spirit/ghost | novarch 45, bleachghast 45, gloamtick 46 |
| cindervale_hall_int | cindervale_hall_int_h5 | Ashby | Hall Helper | fire/magma | cinderwraith 48, slagrook 48 |
| cindervale_hall_int | cindervale_hall_int_h6 | Tolla | Hall Helper | fire/magma | kilnant 49, foundrax 49, kilnowl 50 |

Until these land the trainers battle normally but say nothing before the fight (no placeholder text is shown).
