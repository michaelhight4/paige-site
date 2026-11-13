# Encounter generator report (NOT applied)

Built 2026-10-23 by tools/gen_encounters.mjs. Zones that already have a table keep it ("never redo finished work").
This lists what the generator WOULD produce for those zones (plan_pool, fully built species only), next to the current table, so Gary can pick anything by hand. Nothing here was written into any table.

## Existing slots below their evolution level (not changed)

| file | zone | species | level | DEX min level | slot kind |
|---|---|---|---|---|---|
| data/encounters_wired.json | thornwood_grass | burrowmane | 9-13 | 16 | hand-made |
| data/encounters_wired.json | thornwood_grass | bramblehog | 9-13 | 17 | sync_added placeholder slot |
| data/encounters_wired.json | thornwood_grass | lancebeetle | 9-13 | 12 | sync_added placeholder slot |
| data/encounters_wired.json | greystone_glowfern | cavernwing | 20-27 | 22 | sync_added placeholder slot |
| data/encounters_wired.json | greystone_glowfern | rubblon | 20-27 | 25 | sync_added placeholder slot |
| data/encounters_wired.json | greystone_glowfern | cragmont | 20-27 | 41 | sync_added placeholder slot |
| data/encounters_wired.json | greystone_glowfern | delvemaw | 20-27 | 28 | sync_added placeholder slot |
| data/encounters_wired.json | greystone_glowfern | geodrake | 20-27 | 34 | sync_added placeholder slot |
| data/encounters_wired.json | greystone_glowfern | shaftwraith | 20-27 | 32 | sync_added placeholder slot |
| data/encounters_wired.json | greystone_glowfern | facetarch | 20-27 | 33 | sync_added placeholder slot |
| data/encounters_wired.json | greystone_glowfern | columnpede | 20-27 | 30 | sync_added placeholder slot |
| data/encounters_wired.json | route_east_grass | fleecelight | 12-16 | 26 | sync_added placeholder slot |
| data/encounters_wired.json | route_east_grass | snapmoor | 12-16 | 30 | sync_added placeholder slot |
| data/encounters_wired.json | route_aurelith_saltmere_grass | rooftrove | 15-18 | 24 | sync_added placeholder slot |
| data/encounters_wired.json | route_aurelith_saltmere_grass | gearwarden | 15-18 | 30 | sync_added placeholder slot |
| data/encounters_wired.json | route_aurelith_saltmere_grass | plashcrown | 15-18 | 26 | sync_added placeholder slot |
| data/encounters_wired.json | route_aurelith_saltmere_grass | eavesgrim | 15-18 | 30 | sync_added placeholder slot |
| data/encounters_wired.json | route_revival_grass | reverion | 20-24 | 22 | sync_added placeholder slot |
| data/encounters_wired.json | frostspire_pass_grass | shagmount | 27-31 | 30 | sync_added placeholder slot |
| data/encounters_wired.json | frostspire_grass | tundrarch | 29-33 | 40 | sync_added placeholder slot |
| data/encounters_wired.json | route_cindervale_grass | foundrax | 46-50 | 50 | sync_added placeholder slot |
| data/encounters_wired.json | route_cindervale_grass | calderax | 46-50 | 55 | sync_added placeholder slot |
| data/encounters_wired.json | route_cindervale_grass | pyrogrim | 46-50 | 48 | sync_added placeholder slot |
| data/encounters_wired.json | fs_ice_cave | bastonox | 31-33 | 32 | hand-made (inert draft, does not roll) |
| live encounters.json | thornwood_grass | burrowmane | 9-13 | 16 | hand-made |
| live encounters.json | greystone_glowfern | bastonox | 25-27 | 32 | hand-made |

## Region 1: Brookhollow to Master 1 (Fernwick) (wild 2-9)

### bh_river_fish (brookhollow, fishing (rod, later), gd_draft, not rollable now) band 3-10
- current hand-made: rillop 3-6 w80, rillop 8-10 w5, dartling 3-6 w15
- current sync_added placeholder slots: (none)
- plan would add: musselin 3-10 w30, eftling 3-10 w15
- in current table but not in plan pool: none
- level/weight differences: dartling now 3-6 w15 / plan 3-10 w30; rillop now 3-6 w80 / plan 3-10 w5

### sunmeadow_grass (route1, grass, existing) band 2-4
- current hand-made: tumbloam 2-4 w30, sailquill 2-4 w30, gloamtick 3-4 w15, halovy 3-4 w2, rillop 2-4 w18, burlbeetle 2-4 w20
- current sync_added placeholder slots: peeplark 2-4 w4, nibbin 2-4 w4, dewmite 2-4 w4, cloverkin 2-4 w4, hushowl 2-4 w2, mumblet 2-4 w2, thistlepup 2-4 w4, puffwhirl 2-4 w4, pebblant 2-4 w4, glintfly 2-4 w2, flickermole 2-4 w2
- plan would add: puddlenip 2-4 w15
- in current table but not in plan pool: tumbloam, gloamtick, halovy, rillop, glintfly, flickermole
- level/weight differences: peeplark now 2-4 w4 / plan 2-4 w30; nibbin now 2-4 w4 / plan 2-4 w30; dewmite now 2-4 w4 / plan 2-4 w30; cloverkin now 2-4 w4 / plan 2-4 w30; thistlepup now 2-4 w4 / plan 2-4 w30; puffwhirl now 2-4 w4 / plan 2-4 w30; pebblant now 2-4 w4 / plan 2-4 w30; burlbeetle now 2-4 w20 / plan 2-4 w30; hushowl now 2-4 w2 / plan 2-4 w15; mumblet now 2-4 w2 / plan 2-4 w15

## Region 2: Thornwood to Master 2 (Saltmere) (wild 9-22)

### route_aurelith_saltmere_grass (route_aurelith_saltmere, grass, existing) band 15-18
- current hand-made: sailquill 15-18 w30, medulet 15-17 w20, ankerling 15-18 w20, burlbeetle 15-17 w15, gloamtick 16-18 w10, halovy 17-18 w5
- current sync_added placeholder slots: rooftrove 15-18 w2, cogwhisk 15-18 w2, gearwarden 15-18 w1, plashcrown 15-18 w2, eavesgrim 15-18 w1, lampwick 15-18 w4, foldwing 15-18 w2, pennantail 15-18 w4, velvetabby 15-18 w2, brinepipit 15-18 w4, pouchbill 15-18 w4
- plan would add: railmite 15-18 w30, gildfinch 15-18 w15, gargolet 15-18 w15
- in current table but not in plan pool: halovy, rooftrove, gearwarden, plashcrown, eavesgrim, foldwing, velvetabby, brinepipit, pouchbill
- level/weight differences: burlbeetle now 15-17 w15 / plan 15-18 w30; lampwick now 15-18 w4 / plan 15-18 w30; pennantail now 15-18 w4 / plan 15-18 w30; medulet now 15-17 w20 / plan 15-18 w30; ankerling now 15-18 w20 / plan 15-18 w30; gloamtick now 16-18 w10 / plan 15-18 w15; cogwhisk now 15-18 w2 / plan 15-18 w15

### route_aurelith_saltmere_water (route_aurelith_saltmere, water (Tideglide), existing, not rollable now) band 28-34
- current hand-made: rakefin 28-33 w60, ribboneel 30-34 w15, whelkin 28-32 w25
- current sync_added placeholder slots: (none)
- plan would add: medulet 28-34 w30, ankerling 28-34 w30, plashcrown 28-34 w15
- in current table but not in plan pool: none
- level/weight differences: whelkin now 28-32 w25 / plan 28-34 w30; ribboneel now 30-34 w15 / plan 28-34 w15; rakefin now 28-33 w60 / plan 28-34 w5

### route_east_grass (route_east, grass, existing) band 12-16
- current hand-made: spinelet 12-15 w25, sailquill 12-16 w25, burlbeetle 12-15 w20, gloamtick 13-16 w15, foalgust 12-15 w10, halovy 15-16 w5
- current sync_added placeholder slots: flockpup 12-16 w4, bleatling 12-16 w4, crowkin 12-16 w4, grainling 12-16 w4, millwhirl 12-16 w4, loamworm 12-16 w4, glimmerlamb 12-16 w2, fleecelight 12-16 w1, tinderwren 12-16 w4, ditchsnap 12-16 w4, snapmoor 12-16 w2
- plan would add: nothing
- in current table but not in plan pool: gloamtick, foalgust, halovy, glimmerlamb, fleecelight, snapmoor
- level/weight differences: sailquill now 12-16 w25 / plan 12-16 w30; burlbeetle now 12-15 w20 / plan 12-16 w30; spinelet now 12-15 w25 / plan 12-16 w30; flockpup now 12-16 w4 / plan 12-16 w30; bleatling now 12-16 w4 / plan 12-16 w30; crowkin now 12-16 w4 / plan 12-16 w30; grainling now 12-16 w4 / plan 12-16 w30; millwhirl now 12-16 w4 / plan 12-16 w30; loamworm now 12-16 w4 / plan 12-16 w30; tinderwren now 12-16 w4 / plan 12-16 w30; ditchsnap now 12-16 w4 / plan 12-16 w30

### route_east_reeds (route_east, grass, existing) band 12-16
- current hand-made: spinelet 12-15 w25, sailquill 12-16 w25, burlbeetle 12-15 w20, gloamtick 13-16 w15, foalgust 12-15 w10, halovy 15-16 w5
- current sync_added placeholder slots: (none)
- plan would add: flockpup 12-16 w30, bleatling 12-16 w30, crowkin 12-16 w30, grainling 12-16 w30, millwhirl 12-16 w30, loamworm 12-16 w30, tinderwren 12-16 w30, ditchsnap 12-16 w30
- in current table but not in plan pool: gloamtick, foalgust, halovy
- level/weight differences: sailquill now 12-16 w25 / plan 12-16 w30; burlbeetle now 12-15 w20 / plan 12-16 w30; spinelet now 12-15 w25 / plan 12-16 w30

### route_east_water (route_east, water (Tideglide), existing, not rollable now) band 25-32
- current hand-made: streambarb 25-30 w55, musselin 28-32 w40
- current sync_added placeholder slots: (none)
- plan would add: ditchsnap 25-32 w30, snapmoor 30-32 w15
- in current table but not in plan pool: none
- level/weight differences: musselin now 28-32 w40 / plan 25-32 w30; streambarb now 25-30 w55 / plan 25-32 w15

### saltmere_water (saltmere, water (Tideglide), existing, not rollable now) band 28-35
- current hand-made: bulwarkrab 30-34 w55, spraytern 32-35 w15, brineseal 28-30 w30
- current sync_added placeholder slots: pinchkin 28-35 w4, blubbet 28-35 w2, sandstarlet 28-35 w4, finnip 28-35 w2, quaymouser 28-35 w4, polypip 28-35 w4, dawnfin 28-35 w1, spratwyrm 28-35 w1
- plan would add: medulet 28-35 w30, whelkin 28-35 w30, ankerling 28-35 w30, brinecube 28-35 w30
- in current table but not in plan pool: brineseal, finnip, dawnfin, spratwyrm
- level/weight differences: pinchkin now 28-35 w4 / plan 28-35 w30; sandstarlet now 28-35 w4 / plan 28-35 w30; quaymouser now 28-35 w4 / plan 28-35 w30; polypip now 28-35 w4 / plan 28-35 w30; bulwarkrab now 30-34 w55 / plan 28-35 w15; spraytern now 32-35 w15 / plan 28-35 w15; blubbet now 28-35 w2 / plan 28-35 w15

### thornwood_grass (thornwood, grass, existing) band 9-13
- current hand-made: burlbeetle 9-13 w35, burrowmane 9-13 w25, tumbloam 9-12 w15, gloamtick 10-13 w15, sailquill 9-13 w10
- current sync_added placeholder slots: briarlet 9-13 w4, bramblehog 9-13 w2, thornpod 9-13 w2, lancebeetle 9-13 w1
- plan would add: spinelet 9-13 w30
- in current table but not in plan pool: burrowmane, tumbloam, gloamtick, bramblehog, thornpod, lancebeetle
- level/weight differences: sailquill now 9-13 w10 / plan 9-13 w30; burlbeetle now 9-13 w35 / plan 9-13 w30; briarlet now 9-13 w4 / plan 9-13 w30

### thornwood_pond (thornwood, water (Tideglide, revisit), gd_draft, not rollable now) band 24-30
- current hand-made: reedmoot 24-28 w60, puddlenip 26-30 w30, streambarb 26-28 w10
- current sync_added placeholder slots: (none)
- plan would add: nothing
- in current table but not in plan pool: none
- level/weight differences: puddlenip now 26-30 w30 / plan 24-30 w15; streambarb now 26-28 w10 / plan 24-30 w15; reedmoot now 24-28 w60 / plan 24-30 w15

## Region 3: Route Revival, Greystone to Master 3 (Revival Heights) (wild 18-27)

### greystone_b1_floor (greystone_b1, cave, gd_draft, not rollable now) band 14-18
- current hand-made: gloamtick 14-18 w40, moatling 14-18 w35, slagrook 15-18 w20, ankerling 18-18 w5
- current sync_added placeholder slots: (none)
- plan would add: brinecube 14-18 w30, pebbit 14-18 w30, delvelet 14-18 w30, dripweaver 14-18 w30, stonepede 14-18 w30, gargolet 14-18 w15, geodling 14-18 w15
- in current table but not in plan pool: none
- level/weight differences: ankerling now 18-18 w5 / plan 14-18 w30; slagrook now 15-18 w20 / plan 14-18 w30; gloamtick now 14-18 w40 / plan 14-18 w15; moatling now 14-18 w35 / plan 14-18 w15

### greystone_b2_track (greystone_b1, cave (planned B2), gd_draft, not rollable now) band 24-28
- current hand-made: brinecube 24-28 w30, slagrook 24-28 w30, gloamtick 24-28 w25, gargolet 24-28 w15
- current sync_added placeholder slots: (none)
- plan would add: ankerling 24-28 w30, pebbit 24-28 w30, delvelet 24-28 w30, dripweaver 24-28 w30, stonepede 24-28 w30, moatling 24-28 w15, cavernwing 24-28 w15
- in current table but not in plan pool: none
- level/weight differences: gloamtick now 24-28 w25 / plan 24-28 w15

### greystone_glowfern (greystone_entrance, cave_fern, existing) band 20-27
- current hand-made: humstone 20-25 w30, chiselbug 25-27 w5, gloamtick 20-25 w30, slagrook 20-25 w20, pebbadillo 20-23 w15
- current sync_added placeholder slots: cavernwing 20-27 w2, pebbit 20-27 w4, rubblon 20-27 w2, cragmont 20-27 w1, fernlume 20-27 w2, delvemaw 20-27 w2, geodling 20-27 w2, geodrake 20-27 w1, glimslug 20-27 w4, cavernmaw 20-27 w1, minewisp 20-27 w2, shaftwraith 20-27 w1, dripweaver 20-27 w4, facetling 20-27 w2, facetarch 20-27 w1, lavalurk 20-27 w2, olmling 20-27 w4, stonepede 20-27 w4, columnpede 20-27 w2
- plan would add: delvelet 20-27 w30
- in current table but not in plan pool: humstone, cragmont, fernlume, delvemaw, geodrake, glimslug, cavernmaw, minewisp, shaftwraith, facetling, facetarch, lavalurk, olmling, columnpede
- level/weight differences: pebbadillo now 20-23 w15 / plan 20-27 w30; chiselbug now 25-27 w5 / plan 20-27 w30; pebbit now 20-27 w4 / plan 20-27 w30; dripweaver now 20-27 w4 / plan 20-27 w30; stonepede now 20-27 w4 / plan 20-27 w30; slagrook now 20-25 w20 / plan 20-27 w30; gloamtick now 20-25 w30 / plan 20-27 w15; cavernwing now 20-27 w2 / plan 22-27 w15; rubblon now 20-27 w2 / plan 25-27 w15; geodling now 20-27 w2 / plan 20-27 w15

### route_revival_grass (route_revival, grass, existing) band 20-24
- current hand-made: gargolet 20-24 w25, burlbeetle 20-23 w20, sproutwyrm 20-24 w20, sailquill 20-24 w15, gloamtick 21-24 w15, halovy 22-24 w5
- current sync_added placeholder slots: scutadillo 20-24 w2, highkite 20-24 w2, topiarix 20-24 w2, kindlepup 20-24 w4, prismwing 20-24 w2, reverion 20-24 w1
- plan would add: railmite 20-24 w30, pebbadillo 20-24 w30, chiselbug 20-24 w30, gildfinch 20-24 w15, tollkin 20-24 w15
- in current table but not in plan pool: sproutwyrm, halovy, highkite, topiarix, prismwing, reverion
- level/weight differences: sailquill now 20-24 w15 / plan 20-24 w30; burlbeetle now 20-23 w20 / plan 20-24 w30; kindlepup now 20-24 w4 / plan 20-24 w30; gloamtick now 21-24 w15 / plan 20-24 w15; gargolet now 20-24 w25 / plan 20-24 w15; scutadillo now 20-24 w2 / plan 20-24 w15

### route_revival_tr_crystal_grass (route_revival, grass, existing) band 21-24
- current hand-made: halovy 22-24 w30, gildfinch 21-24 w40, tollkin 23-24 w5, railmite 21-23 w25
- current sync_added placeholder slots: (none)
- plan would add: sailquill 21-24 w30, burlbeetle 21-24 w30, pebbadillo 21-24 w30, kindlepup 21-24 w30, chiselbug 21-24 w30, gloamtick 21-24 w15, gargolet 21-24 w15, scutadillo 21-24 w15
- in current table but not in plan pool: halovy
- level/weight differences: railmite now 21-23 w25 / plan 21-24 w30; gildfinch now 21-24 w40 / plan 21-24 w15; tollkin now 23-24 w5 / plan 21-24 w15

## Region 4: Frostspire Pass to Master 4 (Frostspire) (wild 24-33)

### frostspire_cave (frostspire, cave, existing) band 30-33
- current hand-made: gloamtick 30-33 w40, burrowmane 31-33 w25, squallwhirl 30-32 w35
- current sync_added placeholder slots: (none)
- plan would add: burlbeetle 30-33 w30, snowmuff 30-33 w30
- in current table but not in plan pool: none
- level/weight differences: gloamtick now 30-33 w40 / plan 30-33 w15; squallwhirl now 30-32 w35 / plan 30-33 w15; burrowmane now 31-33 w25 / plan 30-33 w5

### frostspire_grass (frostspire, grass, existing) band 29-33
- current hand-made: skyrender 29-33 w35, sailquill 29-33 w25, signalwren 30-33 w20, halovy 31-33 w5, burlbeetle 29-32 w15
- current sync_added placeholder slots: tundrarch 29-33 w1
- plan would add: snowmuff 29-33 w30, gloamtick 29-33 w15, squallwhirl 29-33 w15, northling 29-33 w15
- in current table but not in plan pool: skyrender, halovy, tundrarch
- level/weight differences: sailquill now 29-33 w25 / plan 29-33 w30; burlbeetle now 29-32 w15 / plan 29-33 w30; signalwren now 30-33 w20 / plan 29-33 w30

### frostspire_pass_grass (frostspire_pass, grass, existing) band 27-31
- current hand-made: sailquill 27-31 w30, snowgrouse 27-31 w30, delvelet 27-30 w15, gloamtick 28-31 w10, signalwren 28-31 w15
- current sync_added placeholder slots: frostlop 27-31 w4, shagmount 27-31 w2, ledgebex 27-31 w4, talusmouse 27-31 w4, snowcairn 27-31 w1
- plan would add: frostweevil 27-31 w30
- in current table but not in plan pool: snowcairn
- level/weight differences: signalwren now 28-31 w15 / plan 27-31 w30; delvelet now 27-30 w15 / plan 27-31 w30; frostlop now 27-31 w4 / plan 27-31 w30; ledgebex now 27-31 w4 / plan 27-31 w30; talusmouse now 27-31 w4 / plan 27-31 w30; gloamtick now 28-31 w10 / plan 27-31 w15; shagmount now 27-31 w2 / plan 30-31 w15

### route_revival_saltmere_grass (route_revival_saltmere, grass, existing) band 26-29
- current hand-made: sailquill 26-29 w30, spraytern 26-29 w20, chiselbug 26-29 w20, glarekit 26-28 w15, gloamtick 27-29 w15
- current sync_added placeholder slots: (none)
- plan would add: frostlop 26-29 w30, ledgebex 26-29 w30, talusmouse 26-29 w30, frostweevil 26-29 w30, snowgrouse 26-29 w30
- in current table but not in plan pool: none
- level/weight differences: chiselbug now 26-29 w20 / plan 26-29 w30; gloamtick now 27-29 w15 / plan 26-29 w15; spraytern now 26-29 w20 / plan 26-29 w15; glarekit now 26-28 w15 / plan 26-29 w15

## Region 5: Sunmeadow, Mirefen to Master 5 (Mirefen) (wild 28-41)

### mirefen_bog_surf (mirefen_bog, water (Tideglide), existing, not rollable now) band 30-41
- current hand-made: mirewump 34-39 w45, brookhorn 34-39 w35, tidemarrow 39-41 w5, rillop 30-34 w15
- current sync_added placeholder slots: (none)
- plan would add: nothing
- in current table but not in plan pool: brookhorn, tidemarrow
- level/weight differences: mirewump now 34-39 w45 / plan 30-41 w30; rillop now 30-34 w15 / plan 30-41 w5

### mirefen_grass_ne (mirefen_bog, grass, existing) band 33-38
- current hand-made: mirewump 33-37 w35, brookhorn 33-37 w20, burlbeetle 33-37 w15, runeskein 37-38 w4, sailquill 33-37 w15, gloamtick 33-37 w12
- current sync_added placeholder slots: (none)
- plan would add: nothing
- in current table but not in plan pool: brookhorn, runeskein, gloamtick
- level/weight differences: sailquill now 33-37 w15 / plan 33-38 w30; burlbeetle now 33-37 w15 / plan 33-38 w30; mirewump now 33-37 w35 / plan 33-38 w30

### mirefen_grass_s (mirefen_bog, grass, existing) band 34-39
- current hand-made: mirewump 34-38 w35, brookhorn 34-38 w20, burlbeetle 34-38 w15, runeskein 38-39 w5, sailquill 34-38 w15, gloamtick 34-38 w12
- current sync_added placeholder slots: (none)
- plan would add: nothing
- in current table but not in plan pool: brookhorn, runeskein, gloamtick
- level/weight differences: sailquill now 34-38 w15 / plan 34-39 w30; burlbeetle now 34-38 w15 / plan 34-39 w30; mirewump now 34-38 w35 / plan 34-39 w30

### mirefen_grass_w (mirefen_bog, grass, existing) band 33-38
- current hand-made: mirewump 33-37 w35, brookhorn 33-37 w20, burlbeetle 33-37 w15, runeskein 37-38 w3, sailquill 33-37 w15, gloamtick 33-37 w12
- current sync_added placeholder slots: (none)
- plan would add: nothing
- in current table but not in plan pool: brookhorn, runeskein, gloamtick
- level/weight differences: sailquill now 33-37 w15 / plan 33-38 w30; burlbeetle now 33-37 w15 / plan 33-38 w30; mirewump now 33-37 w35 / plan 33-38 w30

### route_revival_sunmeadow_grass (route_revival_sunmeadow, grass, existing) band 31-34
- current hand-made: northling 31-34 w40, halovy 32-34 w20, snowmuff 31-34 w20, runeskein 33-34 w5, sailquill 31-34 w15
- current sync_added placeholder slots: (none)
- plan would add: nothing
- in current table but not in plan pool: halovy, runeskein
- level/weight differences: sailquill now 31-34 w15 / plan 31-34 w30; snowmuff now 31-34 w20 / plan 31-34 w30; northling now 31-34 w40 / plan 31-34 w15

### route_saltmere_mirefen_grass (route_saltmere_mirefen, grass, existing) band 32-35
- current hand-made: frostweevil 32-35 w30, bulwarkrab 32-35 w25, reedmoot 32-35 w20, sailquill 32-35 w15, gloamtick 33-35 w10
- current sync_added placeholder slots: (none)
- plan would add: mirewump 32-35 w30
- in current table but not in plan pool: bulwarkrab, reedmoot, gloamtick
- level/weight differences: sailquill now 32-35 w15 / plan 32-35 w30

### route_saltmere_mirefen_water (route_saltmere_mirefen, water (Tideglide), existing, not rollable now) band 32-36
- current hand-made: spraytern 32-36 w50, paleminnow 32-35 w30, brineseal 35-36 w20
- current sync_added placeholder slots: (none)
- plan would add: frostweevil 32-36 w30, mirewump 32-36 w30, reedmoot 32-36 w15, bulwarkrab 32-36 w15
- in current table but not in plan pool: brineseal
- level/weight differences: paleminnow now 32-35 w30 / plan 32-36 w30; spraytern now 32-36 w50 / plan 32-36 w15

### route_sunmeadow_mirefen_grass (route_sunmeadow_mirefen, grass, existing) band 32-35
- current hand-made: frostweevil 32-35 w30, eftwarden 32-35 w25, burlbeetle 32-35 w15, gloamtick 33-35 w15, sailquill 32-35 w15
- current sync_added placeholder slots: (none)
- plan would add: mirewump 32-35 w30
- in current table but not in plan pool: eftwarden, gloamtick
- level/weight differences: sailquill now 32-35 w15 / plan 32-35 w30; burlbeetle now 32-35 w15 / plan 32-35 w30

### sunmeadow_fields_grass (sunmeadow_fields, grass, existing) band 30-34
- current hand-made: sailquill 30-34 w25, burrowmane 30-34 w25, burlbeetle 30-33 w15, snowmuff 31-34 w15, halovy 32-34 w8, gloamtick 31-34 w12
- current sync_added placeholder slots: (none)
- plan would add: nothing
- in current table but not in plan pool: burrowmane, halovy, gloamtick
- level/weight differences: sailquill now 30-34 w25 / plan 30-34 w30; burlbeetle now 30-33 w15 / plan 30-34 w30; snowmuff now 31-34 w15 / plan 30-34 w30

### sunmeadow_fields_water (sunmeadow_fields, water (Tideglide), existing, not rollable now) band 28-35
- current hand-made: brookhorn 30-34 w60, floepaddle 28-30 w30, bulwarkrab 34-35 w10
- current sync_added placeholder slots: (none)
- plan would add: nothing
- in current table but not in plan pool: none
- level/weight differences: bulwarkrab now 34-35 w10 / plan 28-35 w15; floepaddle now 28-30 w30 / plan 28-35 w15; brookhorn now 30-34 w60 / plan 28-35 w5

## Region 6: Coast Road to Master 6 (Tidewater Coast) (wild 36-45)

### route_coast_grass (route_coast, grass, existing) band 38-42
- current hand-made: sailquill 38-42 w30, spraytern 38-42 w25, parasoleaf 38-41 w20, burlbeetle 38-41 w10, gloamtick 39-42 w15
- current sync_added placeholder slots: (none)
- plan would add: mirewump 38-42 w30, drenchcrab 38-42 w30
- in current table but not in plan pool: none
- level/weight differences: burlbeetle now 38-41 w10 / plan 38-42 w30; parasoleaf now 38-41 w20 / plan 38-42 w30; gloamtick now 39-42 w15 / plan 38-42 w15; spraytern now 38-42 w25 / plan 38-42 w15

### route_coast_water (route_coast, water (Tideglide), existing, not rollable now) band 36-43
- current hand-made: mirewump 36-40 w30, mirewump 38-42 w35, drenchcrab 38-42 w25, tuskwallow 41-43 w10
- current sync_added placeholder slots: (none)
- plan would add: parasoleaf 36-43 w30, spraytern 36-43 w15
- in current table but not in plan pool: tuskwallow
- level/weight differences: mirewump now 36-40 w30 / plan 36-43 w30; drenchcrab now 38-42 w25 / plan 36-43 w30

### tidewater_coast_cave (tidewater_coast, cave, existing) band 41-45
- current hand-made: gloamtick 41-45 w40, pearlisk 41-45 w40, runeskein 44-45 w20
- current sync_added placeholder slots: (none)
- plan would add: burlbeetle 41-45 w30, barnaclump 41-45 w30, squidge 41-45 w30, shorehound 41-45 w15, tidepony 41-45 w15, bleachghast 41-45 w15, lurelamp 41-45 w5, kelpstrider 41-45 w5
- in current table but not in plan pool: pearlisk
- level/weight differences: gloamtick now 41-45 w40 / plan 41-45 w15; runeskein now 44-45 w20 / plan 41-45 w5

### tidewater_coast_grass (tidewater_coast, grass, existing) band 40-44
- current hand-made: sailquill 40-44 w35, nudiblume 40-44 w30, burlbeetle 40-43 w10, gloamtick 41-44 w15, halovy 43-44 w10
- current sync_added placeholder slots: cliffpuff 40-44 w2, raywing 40-44 w1, lurelamp 40-44 w1, bristlereef 40-44 w2, breakerfin 40-44 w2, spinyclaw 40-44 w4, foamkin 40-44 w4, kelpstrider 40-44 w1, tidepony 40-44 w2, bleachghast 40-44 w2, squidge 40-44 w4
- plan would add: barnaclump 40-44 w30, shorehound 40-44 w15
- in current table but not in plan pool: nudiblume, halovy, raywing, lurelamp, bristlereef, breakerfin, spinyclaw, kelpstrider, tidepony, bleachghast
- level/weight differences: sailquill now 40-44 w35 / plan 40-44 w30; burlbeetle now 40-43 w10 / plan 40-44 w30; foamkin now 40-44 w4 / plan 40-44 w30; squidge now 40-44 w4 / plan 40-44 w30; gloamtick now 41-44 w15 / plan 40-44 w15; cliffpuff now 40-44 w2 / plan 40-44 w15

### tidewater_coast_water (tidewater_coast, water (Tideglide), existing, not rollable now) band 40-45
- current hand-made: barnaclump 40-45 w55, hullwhale 42-45 w25, wavelin 40-44 w20
- current sync_added placeholder slots: (none)
- plan would add: spinyclaw 40-45 w30, foamkin 40-45 w30, squidge 40-45 w30, bristlereef 40-45 w15, shorehound 40-45 w15
- in current table but not in plan pool: hullwhale
- level/weight differences: wavelin now 40-44 w20 / plan 40-45 w30; barnaclump now 40-45 w55 / plan 40-45 w30

## Region 7: Lanternport to Master 7 (wild 40-47)

### lanternport_water (lanternport, water (Tideglide), existing, not rollable now) band 42-46
- current hand-made: mooncrab 42-46 w60, seaglint 43-46 w25, reefshell 42-45 w15
- current sync_added placeholder slots: moorcoil 42-46 w2
- plan would add: sluicekin 42-46 w30
- in current table but not in plan pool: none
- level/weight differences: seaglint now 43-46 w25 / plan 42-46 w30; moorcoil now 42-46 w2 / plan 42-46 w15; mooncrab now 42-46 w60 / plan 42-46 w15; reefshell now 42-45 w15 / plan 42-46 w5

### route_fernwick_lanternport_grass (route_fernwick_lanternport, grass, existing) band 44-47
- current hand-made: tidemarrow 44-47 w30, shorehound 44-47 w20, sailquill 44-47 w20, gloamtick 44-47 w20, halovy 46-47 w10
- current sync_added placeholder slots: frondlet 44-47 w2, frondhart 44-47 w1, fernstag 44-47 w1, shellbloom 44-47 w4, pondkin 44-47 w4, hearthkit 44-47 w4, kilnpaw 44-47 w2, wickerling 44-47 w2, dustbonnet 44-47 w2, ledgedove 44-47 w4, belfrydove 44-47 w2, capling 44-47 w4, toadcap 44-47 w2, candlewren 44-47 w1, cobblepup 44-47 w4, hummbel 44-47 w2, combwarden 44-47 w1, lintmouse 44-47 w4, weathervex 44-47 w2, lanternkeep 44-47 w1, novarch 44-47 w1, wreckwarden 44-47 w1, mournhorn 44-47 w2, netspinner 44-47 w4, chartmouse 44-47 w2
- plan would add: seaglint 44-47 w30
- in current table but not in plan pool: tidemarrow, halovy, frondlet, frondhart, fernstag, shellbloom, pondkin, hearthkit, kilnpaw, wickerling, dustbonnet, ledgedove, belfrydove, capling, toadcap, candlewren, cobblepup, hummbel, combwarden, lintmouse, weathervex, lanternkeep, novarch, wreckwarden, chartmouse
- level/weight differences: sailquill now 44-47 w20 / plan 44-47 w30; netspinner now 44-47 w4 / plan 44-47 w30; gloamtick now 44-47 w20 / plan 44-47 w15; shorehound now 44-47 w20 / plan 44-47 w15; mournhorn now 44-47 w2 / plan 44-47 w15

### route_fernwick_lanternport_water (route_fernwick_lanternport, water (Tideglide), existing, not rollable now) band 40-47
- current hand-made: sluicekin 44-47 w50, reefshell 40-44 w30, seaglint 46-47 w20
- current sync_added placeholder slots: (none)
- plan would add: shorehound 40-47 w15, moorcoil 40-47 w15, mooncrab 40-47 w15, tidemarrow 40-47 w5
- in current table but not in plan pool: none
- level/weight differences: sluicekin now 44-47 w50 / plan 40-47 w30; seaglint now 46-47 w20 / plan 40-47 w30; reefshell now 40-44 w30 / plan 40-47 w5

## Region 8: Cindervale Road to Master 8 (Cindervale) (wild 45-53)

### route_cindervale_cave (route_cindervale, cave, existing) band 47-50
- current hand-made: slagrook 47-50 w40, pumicepuff 47-50 w40, pharolith 50-50 w5, forgeharrow 47-50 w15
- current sync_added placeholder slots: (none)
- plan would add: emberbrock 47-50 w30, gloamtick 47-50 w15, geysirox 47-50 w15, obsidiax 47-50 w15, clinkerback 47-50 w5
- in current table but not in plan pool: none
- level/weight differences: slagrook now 47-50 w40 / plan 47-50 w30; pumicepuff now 47-50 w40 / plan 47-50 w30; forgeharrow now 47-50 w15 / plan 47-50 w5; pharolith now 50-50 w5 / plan 48-50 w5

### route_cindervale_grass (route_cindervale, grass, existing) band 46-50
- current hand-made: slagrook 46-50 w30, obsidiax 46-50 w25, brimtoad 46-50 w15, pumicepuff 47-50 w15, gloamtick 47-50 w15
- current sync_added placeholder slots: foundrax 46-50 w1, cinderwyrm 46-50 w1, calderax 46-50 w1, pyrogrim 46-50 w1, ingotitan 46-50 w2, kilnant 46-50 w2, cinderwraith 46-50 w1, charlurcher 46-50 w2, glyphforge 46-50 w1, sparkplume 46-50 w4, kilnowl 46-50 w2, embermink 46-50 w4
- plan would add: emberbrock 46-50 w30, geysirox 46-50 w15
- in current table but not in plan pool: foundrax, cinderwyrm, calderax, pyrogrim, ingotitan, kilnant, cinderwraith, charlurcher, glyphforge, sparkplume, kilnowl, embermink
- level/weight differences: pumicepuff now 47-50 w15 / plan 46-50 w30; brimtoad now 46-50 w15 / plan 46-50 w30; gloamtick now 47-50 w15 / plan 46-50 w15; obsidiax now 46-50 w25 / plan 46-50 w15

