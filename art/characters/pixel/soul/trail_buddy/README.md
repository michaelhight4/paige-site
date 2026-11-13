# Soul pass: #6 Trail Buddy

Follower set for all 16 creatures (13 at 64x64, plus bastonox, forgeharrow and tidemarrow at 96x96), 4 directions each:
follow (walk) cycle, hop, flinch, happy, sniff, yawn, sit, uneasy (near crystal), plus specials: Sailquill flight and
flight_shadow, Rillop wade, Tumbloam bench, Gloamtick lantern flare, Cindrip rain shake-off.

## Layout

Each animation folder holds `1x/<name>_NN.png` (transparent, hard pixels, palette-only), `2x/<name>_NN_2x.png` (exact nearest-neighbour), `<name>_sheet.png` + `<name>_sheet_2x.png` (frames left to right) and `<name>_2x.gif`. Timing, anchors and paths are in `_meta.json` and in the manifest key `soul.trail_buddy`.

## Assets (470 animations)

| animation (folder) | kind | size | frames | ms per frame | anchor | loop | creatures |
|---|---|---|---|---|---|---|---|
| `creatures/<c>/bastonox_follow_down` | creature | 96x96 | 4 | 62 | [32, 61] | yes | bastonox |
| `creatures/<c>/bastonox_hop_down` | creature | 96x96 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | bastonox |
| `creatures/<c>/bastonox_flinch_down` | creature | 96x96 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | bastonox |
| `creatures/<c>/bastonox_uneasy_down` | creature | 96x96 | 4 | 220,90,220,90 | [32, 61] | yes | bastonox |
| `creatures/<c>/bastonox_sniff_down` | creature | 96x96 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | bastonox |
| `creatures/<c>/bastonox_yawn_down` | creature | 96x96 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | bastonox |
| `creatures/<c>/bastonox_sit_down` | creature | 96x96 | 4 | 80,400,600,600 | [32, 61] | yes | bastonox |
| `creatures/<c>/bastonox_follow_up` | creature | 96x96 | 4 | 62 | [32, 61] | yes | bastonox |
| `creatures/<c>/bastonox_hop_up` | creature | 96x96 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | bastonox |
| `creatures/<c>/bastonox_flinch_up` | creature | 96x96 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | bastonox |
| `creatures/<c>/bastonox_uneasy_up` | creature | 96x96 | 4 | 220,90,220,90 | [32, 61] | yes | bastonox |
| `creatures/<c>/bastonox_sniff_up` | creature | 96x96 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | bastonox |
| `creatures/<c>/bastonox_yawn_up` | creature | 96x96 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | bastonox |
| `creatures/<c>/bastonox_sit_up` | creature | 96x96 | 4 | 80,400,600,600 | [32, 61] | yes | bastonox |
| `creatures/<c>/bastonox_follow_left` | creature | 96x96 | 4 | 62 | [32, 61] | yes | bastonox |
| `creatures/<c>/bastonox_hop_left` | creature | 96x96 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | bastonox |
| `creatures/<c>/bastonox_flinch_left` | creature | 96x96 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | bastonox |
| `creatures/<c>/bastonox_uneasy_left` | creature | 96x96 | 4 | 220,90,220,90 | [32, 61] | yes | bastonox |
| `creatures/<c>/bastonox_sniff_left` | creature | 96x96 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | bastonox |
| `creatures/<c>/bastonox_yawn_left` | creature | 96x96 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | bastonox |
| `creatures/<c>/bastonox_sit_left` | creature | 96x96 | 4 | 80,400,600,600 | [32, 61] | yes | bastonox |
| `creatures/<c>/bastonox_follow_right` | creature | 96x96 | 4 | 62 | [32, 61] | yes | bastonox |
| `creatures/<c>/bastonox_hop_right` | creature | 96x96 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | bastonox |
| `creatures/<c>/bastonox_flinch_right` | creature | 96x96 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | bastonox |
| `creatures/<c>/bastonox_uneasy_right` | creature | 96x96 | 4 | 220,90,220,90 | [32, 61] | yes | bastonox |
| `creatures/<c>/bastonox_sniff_right` | creature | 96x96 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | bastonox |
| `creatures/<c>/bastonox_yawn_right` | creature | 96x96 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | bastonox |
| `creatures/<c>/bastonox_sit_right` | creature | 96x96 | 4 | 80,400,600,600 | [32, 61] | yes | bastonox |
| `creatures/<c>/brookhorn_follow_down` | creature | 64x64 | 4 | 62 | [32, 61] | yes | brookhorn |
| `creatures/<c>/brookhorn_hop_down` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | brookhorn |
| `creatures/<c>/brookhorn_flinch_down` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | brookhorn |
| `creatures/<c>/brookhorn_uneasy_down` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | brookhorn |
| `creatures/<c>/brookhorn_sniff_down` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | brookhorn |
| `creatures/<c>/brookhorn_yawn_down` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | brookhorn |
| `creatures/<c>/brookhorn_sit_down` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | brookhorn |
| `creatures/<c>/brookhorn_follow_up` | creature | 64x64 | 4 | 62 | [32, 61] | yes | brookhorn |
| `creatures/<c>/brookhorn_hop_up` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | brookhorn |
| `creatures/<c>/brookhorn_flinch_up` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | brookhorn |
| `creatures/<c>/brookhorn_uneasy_up` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | brookhorn |
| `creatures/<c>/brookhorn_sniff_up` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | brookhorn |
| `creatures/<c>/brookhorn_yawn_up` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | brookhorn |
| `creatures/<c>/brookhorn_sit_up` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | brookhorn |
| `creatures/<c>/brookhorn_follow_left` | creature | 64x64 | 4 | 62 | [32, 61] | yes | brookhorn |
| `creatures/<c>/brookhorn_hop_left` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | brookhorn |
| `creatures/<c>/brookhorn_flinch_left` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | brookhorn |
| `creatures/<c>/brookhorn_uneasy_left` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | brookhorn |
| `creatures/<c>/brookhorn_sniff_left` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | brookhorn |
| `creatures/<c>/brookhorn_yawn_left` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | brookhorn |
| `creatures/<c>/brookhorn_sit_left` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | brookhorn |
| `creatures/<c>/brookhorn_follow_right` | creature | 64x64 | 4 | 62 | [32, 61] | yes | brookhorn |
| `creatures/<c>/brookhorn_hop_right` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | brookhorn |
| `creatures/<c>/brookhorn_flinch_right` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | brookhorn |
| `creatures/<c>/brookhorn_uneasy_right` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | brookhorn |
| `creatures/<c>/brookhorn_sniff_right` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | brookhorn |
| `creatures/<c>/brookhorn_yawn_right` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | brookhorn |
| `creatures/<c>/brookhorn_sit_right` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | brookhorn |
| `creatures/<c>/burlbeetle_follow_down` | creature | 64x64 | 4 | 62 | [32, 61] | yes | burlbeetle |
| `creatures/<c>/burlbeetle_hop_down` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | burlbeetle |
| `creatures/<c>/burlbeetle_flinch_down` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | burlbeetle |
| `creatures/<c>/burlbeetle_uneasy_down` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | burlbeetle |
| `creatures/<c>/burlbeetle_sniff_down` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | burlbeetle |
| `creatures/<c>/burlbeetle_yawn_down` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | burlbeetle |
| `creatures/<c>/burlbeetle_sit_down` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | burlbeetle |
| `creatures/<c>/burlbeetle_follow_up` | creature | 64x64 | 4 | 62 | [32, 61] | yes | burlbeetle |
| `creatures/<c>/burlbeetle_hop_up` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | burlbeetle |
| `creatures/<c>/burlbeetle_flinch_up` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | burlbeetle |
| `creatures/<c>/burlbeetle_uneasy_up` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | burlbeetle |
| `creatures/<c>/burlbeetle_sniff_up` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | burlbeetle |
| `creatures/<c>/burlbeetle_yawn_up` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | burlbeetle |
| `creatures/<c>/burlbeetle_sit_up` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | burlbeetle |
| `creatures/<c>/burlbeetle_follow_left` | creature | 64x64 | 4 | 62 | [32, 61] | yes | burlbeetle |
| `creatures/<c>/burlbeetle_hop_left` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | burlbeetle |
| `creatures/<c>/burlbeetle_flinch_left` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | burlbeetle |
| `creatures/<c>/burlbeetle_uneasy_left` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | burlbeetle |
| `creatures/<c>/burlbeetle_sniff_left` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | burlbeetle |
| `creatures/<c>/burlbeetle_yawn_left` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | burlbeetle |
| `creatures/<c>/burlbeetle_sit_left` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | burlbeetle |
| `creatures/<c>/burlbeetle_follow_right` | creature | 64x64 | 4 | 62 | [32, 61] | yes | burlbeetle |
| `creatures/<c>/burlbeetle_hop_right` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | burlbeetle |
| `creatures/<c>/burlbeetle_flinch_right` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | burlbeetle |
| `creatures/<c>/burlbeetle_uneasy_right` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | burlbeetle |
| `creatures/<c>/burlbeetle_sniff_right` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | burlbeetle |
| `creatures/<c>/burlbeetle_yawn_right` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | burlbeetle |
| `creatures/<c>/burlbeetle_sit_right` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | burlbeetle |
| `creatures/<c>/burrowmane_follow_down` | creature | 64x64 | 4 | 62 | [32, 61] | yes | burrowmane |
| `creatures/<c>/burrowmane_hop_down` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | burrowmane |
| `creatures/<c>/burrowmane_flinch_down` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | burrowmane |
| `creatures/<c>/burrowmane_uneasy_down` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | burrowmane |
| `creatures/<c>/burrowmane_sniff_down` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | burrowmane |
| `creatures/<c>/burrowmane_yawn_down` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | burrowmane |
| `creatures/<c>/burrowmane_sit_down` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | burrowmane |
| `creatures/<c>/burrowmane_follow_up` | creature | 64x64 | 4 | 62 | [32, 61] | yes | burrowmane |
| `creatures/<c>/burrowmane_hop_up` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | burrowmane |
| `creatures/<c>/burrowmane_flinch_up` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | burrowmane |
| `creatures/<c>/burrowmane_uneasy_up` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | burrowmane |
| `creatures/<c>/burrowmane_sniff_up` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | burrowmane |
| `creatures/<c>/burrowmane_yawn_up` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | burrowmane |
| `creatures/<c>/burrowmane_sit_up` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | burrowmane |
| `creatures/<c>/burrowmane_follow_left` | creature | 64x64 | 4 | 62 | [32, 61] | yes | burrowmane |
| `creatures/<c>/burrowmane_hop_left` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | burrowmane |
| `creatures/<c>/burrowmane_flinch_left` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | burrowmane |
| `creatures/<c>/burrowmane_uneasy_left` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | burrowmane |
| `creatures/<c>/burrowmane_sniff_left` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | burrowmane |
| `creatures/<c>/burrowmane_yawn_left` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | burrowmane |
| `creatures/<c>/burrowmane_sit_left` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | burrowmane |
| `creatures/<c>/burrowmane_follow_right` | creature | 64x64 | 4 | 62 | [32, 61] | yes | burrowmane |
| `creatures/<c>/burrowmane_hop_right` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | burrowmane |
| `creatures/<c>/burrowmane_flinch_right` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | burrowmane |
| `creatures/<c>/burrowmane_uneasy_right` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | burrowmane |
| `creatures/<c>/burrowmane_sniff_right` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | burrowmane |
| `creatures/<c>/burrowmane_yawn_right` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | burrowmane |
| `creatures/<c>/burrowmane_sit_right` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | burrowmane |
| `creatures/<c>/cindrip_follow_down` | creature | 64x64 | 4 | 62 | [32, 61] | yes | cindrip |
| `creatures/<c>/cindrip_hop_down` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | cindrip |
| `creatures/<c>/cindrip_flinch_down` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | cindrip |
| `creatures/<c>/cindrip_uneasy_down` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | cindrip |
| `creatures/<c>/cindrip_sniff_down` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | cindrip |
| `creatures/<c>/cindrip_yawn_down` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | cindrip |
| `creatures/<c>/cindrip_sit_down` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | cindrip |
| `creatures/<c>/cindrip_follow_up` | creature | 64x64 | 4 | 62 | [32, 61] | yes | cindrip |
| `creatures/<c>/cindrip_hop_up` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | cindrip |
| `creatures/<c>/cindrip_flinch_up` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | cindrip |
| `creatures/<c>/cindrip_uneasy_up` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | cindrip |
| `creatures/<c>/cindrip_sniff_up` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | cindrip |
| `creatures/<c>/cindrip_yawn_up` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | cindrip |
| `creatures/<c>/cindrip_sit_up` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | cindrip |
| `creatures/<c>/cindrip_follow_left` | creature | 64x64 | 4 | 62 | [32, 61] | yes | cindrip |
| `creatures/<c>/cindrip_hop_left` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | cindrip |
| `creatures/<c>/cindrip_flinch_left` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | cindrip |
| `creatures/<c>/cindrip_uneasy_left` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | cindrip |
| `creatures/<c>/cindrip_sniff_left` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | cindrip |
| `creatures/<c>/cindrip_yawn_left` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | cindrip |
| `creatures/<c>/cindrip_sit_left` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | cindrip |
| `creatures/<c>/cindrip_follow_right` | creature | 64x64 | 4 | 62 | [32, 61] | yes | cindrip |
| `creatures/<c>/cindrip_hop_right` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | cindrip |
| `creatures/<c>/cindrip_flinch_right` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | cindrip |
| `creatures/<c>/cindrip_uneasy_right` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | cindrip |
| `creatures/<c>/cindrip_sniff_right` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | cindrip |
| `creatures/<c>/cindrip_yawn_right` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | cindrip |
| `creatures/<c>/cindrip_sit_right` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | cindrip |
| `creatures/<c>/emberlunx_follow_down` | creature | 64x64 | 4 | 62 | [32, 61] | yes | emberlunx |
| `creatures/<c>/emberlunx_hop_down` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | emberlunx |
| `creatures/<c>/emberlunx_flinch_down` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | emberlunx |
| `creatures/<c>/emberlunx_uneasy_down` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | emberlunx |
| `creatures/<c>/emberlunx_sniff_down` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | emberlunx |
| `creatures/<c>/emberlunx_yawn_down` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | emberlunx |
| `creatures/<c>/emberlunx_sit_down` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | emberlunx |
| `creatures/<c>/emberlunx_follow_up` | creature | 64x64 | 4 | 62 | [32, 61] | yes | emberlunx |
| `creatures/<c>/emberlunx_hop_up` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | emberlunx |
| `creatures/<c>/emberlunx_flinch_up` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | emberlunx |
| `creatures/<c>/emberlunx_uneasy_up` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | emberlunx |
| `creatures/<c>/emberlunx_sniff_up` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | emberlunx |
| `creatures/<c>/emberlunx_yawn_up` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | emberlunx |
| `creatures/<c>/emberlunx_sit_up` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | emberlunx |
| `creatures/<c>/emberlunx_follow_left` | creature | 64x64 | 4 | 62 | [32, 61] | yes | emberlunx |
| `creatures/<c>/emberlunx_hop_left` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | emberlunx |
| `creatures/<c>/emberlunx_flinch_left` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | emberlunx |
| `creatures/<c>/emberlunx_uneasy_left` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | emberlunx |
| `creatures/<c>/emberlunx_sniff_left` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | emberlunx |
| `creatures/<c>/emberlunx_yawn_left` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | emberlunx |
| `creatures/<c>/emberlunx_sit_left` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | emberlunx |
| `creatures/<c>/emberlunx_follow_right` | creature | 64x64 | 4 | 62 | [32, 61] | yes | emberlunx |
| `creatures/<c>/emberlunx_hop_right` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | emberlunx |
| `creatures/<c>/emberlunx_flinch_right` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | emberlunx |
| `creatures/<c>/emberlunx_uneasy_right` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | emberlunx |
| `creatures/<c>/emberlunx_sniff_right` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | emberlunx |
| `creatures/<c>/emberlunx_yawn_right` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | emberlunx |
| `creatures/<c>/emberlunx_sit_right` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | emberlunx |
| `creatures/<c>/forgeharrow_follow_down` | creature | 96x96 | 4 | 62 | [32, 61] | yes | forgeharrow |
| `creatures/<c>/forgeharrow_hop_down` | creature | 96x96 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | forgeharrow |
| `creatures/<c>/forgeharrow_flinch_down` | creature | 96x96 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | forgeharrow |
| `creatures/<c>/forgeharrow_uneasy_down` | creature | 96x96 | 4 | 220,90,220,90 | [32, 61] | yes | forgeharrow |
| `creatures/<c>/forgeharrow_sniff_down` | creature | 96x96 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | forgeharrow |
| `creatures/<c>/forgeharrow_yawn_down` | creature | 96x96 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | forgeharrow |
| `creatures/<c>/forgeharrow_sit_down` | creature | 96x96 | 4 | 80,400,600,600 | [32, 61] | yes | forgeharrow |
| `creatures/<c>/forgeharrow_follow_up` | creature | 96x96 | 4 | 62 | [32, 61] | yes | forgeharrow |
| `creatures/<c>/forgeharrow_hop_up` | creature | 96x96 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | forgeharrow |
| `creatures/<c>/forgeharrow_flinch_up` | creature | 96x96 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | forgeharrow |
| `creatures/<c>/forgeharrow_uneasy_up` | creature | 96x96 | 4 | 220,90,220,90 | [32, 61] | yes | forgeharrow |
| `creatures/<c>/forgeharrow_sniff_up` | creature | 96x96 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | forgeharrow |
| `creatures/<c>/forgeharrow_yawn_up` | creature | 96x96 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | forgeharrow |
| `creatures/<c>/forgeharrow_sit_up` | creature | 96x96 | 4 | 80,400,600,600 | [32, 61] | yes | forgeharrow |
| `creatures/<c>/forgeharrow_follow_left` | creature | 96x96 | 4 | 62 | [32, 61] | yes | forgeharrow |
| `creatures/<c>/forgeharrow_hop_left` | creature | 96x96 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | forgeharrow |
| `creatures/<c>/forgeharrow_flinch_left` | creature | 96x96 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | forgeharrow |
| `creatures/<c>/forgeharrow_uneasy_left` | creature | 96x96 | 4 | 220,90,220,90 | [32, 61] | yes | forgeharrow |
| `creatures/<c>/forgeharrow_sniff_left` | creature | 96x96 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | forgeharrow |
| `creatures/<c>/forgeharrow_yawn_left` | creature | 96x96 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | forgeharrow |
| `creatures/<c>/forgeharrow_sit_left` | creature | 96x96 | 4 | 80,400,600,600 | [32, 61] | yes | forgeharrow |
| `creatures/<c>/forgeharrow_follow_right` | creature | 96x96 | 4 | 62 | [32, 61] | yes | forgeharrow |
| `creatures/<c>/forgeharrow_hop_right` | creature | 96x96 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | forgeharrow |
| `creatures/<c>/forgeharrow_flinch_right` | creature | 96x96 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | forgeharrow |
| `creatures/<c>/forgeharrow_uneasy_right` | creature | 96x96 | 4 | 220,90,220,90 | [32, 61] | yes | forgeharrow |
| `creatures/<c>/forgeharrow_sniff_right` | creature | 96x96 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | forgeharrow |
| `creatures/<c>/forgeharrow_yawn_right` | creature | 96x96 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | forgeharrow |
| `creatures/<c>/forgeharrow_sit_right` | creature | 96x96 | 4 | 80,400,600,600 | [32, 61] | yes | forgeharrow |
| `creatures/<c>/gloamtick_follow_down` | creature | 64x64 | 4 | 62 | [32, 61] | yes | gloamtick |
| `creatures/<c>/gloamtick_hop_down` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | gloamtick |
| `creatures/<c>/gloamtick_flinch_down` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | gloamtick |
| `creatures/<c>/gloamtick_uneasy_down` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | gloamtick |
| `creatures/<c>/gloamtick_sniff_down` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | gloamtick |
| `creatures/<c>/gloamtick_yawn_down` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | gloamtick |
| `creatures/<c>/gloamtick_sit_down` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | gloamtick |
| `creatures/<c>/gloamtick_follow_up` | creature | 64x64 | 4 | 62 | [32, 61] | yes | gloamtick |
| `creatures/<c>/gloamtick_hop_up` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | gloamtick |
| `creatures/<c>/gloamtick_flinch_up` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | gloamtick |
| `creatures/<c>/gloamtick_uneasy_up` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | gloamtick |
| `creatures/<c>/gloamtick_sniff_up` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | gloamtick |
| `creatures/<c>/gloamtick_yawn_up` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | gloamtick |
| `creatures/<c>/gloamtick_sit_up` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | gloamtick |
| `creatures/<c>/gloamtick_follow_left` | creature | 64x64 | 4 | 62 | [32, 61] | yes | gloamtick |
| `creatures/<c>/gloamtick_hop_left` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | gloamtick |
| `creatures/<c>/gloamtick_flinch_left` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | gloamtick |
| `creatures/<c>/gloamtick_uneasy_left` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | gloamtick |
| `creatures/<c>/gloamtick_sniff_left` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | gloamtick |
| `creatures/<c>/gloamtick_yawn_left` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | gloamtick |
| `creatures/<c>/gloamtick_sit_left` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | gloamtick |
| `creatures/<c>/gloamtick_follow_right` | creature | 64x64 | 4 | 62 | [32, 61] | yes | gloamtick |
| `creatures/<c>/gloamtick_hop_right` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | gloamtick |
| `creatures/<c>/gloamtick_flinch_right` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | gloamtick |
| `creatures/<c>/gloamtick_uneasy_right` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | gloamtick |
| `creatures/<c>/gloamtick_sniff_right` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | gloamtick |
| `creatures/<c>/gloamtick_yawn_right` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | gloamtick |
| `creatures/<c>/gloamtick_sit_right` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | gloamtick |
| `creatures/<c>/halovy_follow_down` | creature | 64x64 | 4 | 62 | [32, 61] | yes | halovy |
| `creatures/<c>/halovy_hop_down` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | halovy |
| `creatures/<c>/halovy_flinch_down` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | halovy |
| `creatures/<c>/halovy_uneasy_down` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | halovy |
| `creatures/<c>/halovy_sniff_down` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | halovy |
| `creatures/<c>/halovy_yawn_down` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | halovy |
| `creatures/<c>/halovy_sit_down` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | halovy |
| `creatures/<c>/halovy_follow_up` | creature | 64x64 | 4 | 62 | [32, 61] | yes | halovy |
| `creatures/<c>/halovy_hop_up` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | halovy |
| `creatures/<c>/halovy_flinch_up` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | halovy |
| `creatures/<c>/halovy_uneasy_up` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | halovy |
| `creatures/<c>/halovy_sniff_up` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | halovy |
| `creatures/<c>/halovy_yawn_up` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | halovy |
| `creatures/<c>/halovy_sit_up` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | halovy |
| `creatures/<c>/halovy_follow_left` | creature | 64x64 | 4 | 62 | [32, 61] | yes | halovy |
| `creatures/<c>/halovy_hop_left` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | halovy |
| `creatures/<c>/halovy_flinch_left` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | halovy |
| `creatures/<c>/halovy_uneasy_left` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | halovy |
| `creatures/<c>/halovy_sniff_left` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | halovy |
| `creatures/<c>/halovy_yawn_left` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | halovy |
| `creatures/<c>/halovy_sit_left` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | halovy |
| `creatures/<c>/halovy_follow_right` | creature | 64x64 | 4 | 62 | [32, 61] | yes | halovy |
| `creatures/<c>/halovy_hop_right` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | halovy |
| `creatures/<c>/halovy_flinch_right` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | halovy |
| `creatures/<c>/halovy_uneasy_right` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | halovy |
| `creatures/<c>/halovy_sniff_right` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | halovy |
| `creatures/<c>/halovy_yawn_right` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | halovy |
| `creatures/<c>/halovy_sit_right` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | halovy |
| `creatures/<c>/mirewump_follow_down` | creature | 64x64 | 4 | 62 | [32, 61] | yes | mirewump |
| `creatures/<c>/mirewump_hop_down` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | mirewump |
| `creatures/<c>/mirewump_flinch_down` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | mirewump |
| `creatures/<c>/mirewump_uneasy_down` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | mirewump |
| `creatures/<c>/mirewump_sniff_down` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | mirewump |
| `creatures/<c>/mirewump_yawn_down` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | mirewump |
| `creatures/<c>/mirewump_sit_down` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | mirewump |
| `creatures/<c>/mirewump_follow_up` | creature | 64x64 | 4 | 62 | [32, 61] | yes | mirewump |
| `creatures/<c>/mirewump_hop_up` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | mirewump |
| `creatures/<c>/mirewump_flinch_up` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | mirewump |
| `creatures/<c>/mirewump_uneasy_up` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | mirewump |
| `creatures/<c>/mirewump_sniff_up` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | mirewump |
| `creatures/<c>/mirewump_yawn_up` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | mirewump |
| `creatures/<c>/mirewump_sit_up` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | mirewump |
| `creatures/<c>/mirewump_follow_left` | creature | 64x64 | 4 | 62 | [32, 61] | yes | mirewump |
| `creatures/<c>/mirewump_hop_left` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | mirewump |
| `creatures/<c>/mirewump_flinch_left` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | mirewump |
| `creatures/<c>/mirewump_uneasy_left` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | mirewump |
| `creatures/<c>/mirewump_sniff_left` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | mirewump |
| `creatures/<c>/mirewump_yawn_left` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | mirewump |
| `creatures/<c>/mirewump_sit_left` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | mirewump |
| `creatures/<c>/mirewump_follow_right` | creature | 64x64 | 4 | 62 | [32, 61] | yes | mirewump |
| `creatures/<c>/mirewump_hop_right` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | mirewump |
| `creatures/<c>/mirewump_flinch_right` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | mirewump |
| `creatures/<c>/mirewump_uneasy_right` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | mirewump |
| `creatures/<c>/mirewump_sniff_right` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | mirewump |
| `creatures/<c>/mirewump_yawn_right` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | mirewump |
| `creatures/<c>/mirewump_sit_right` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | mirewump |
| `creatures/<c>/rillop_follow_down` | creature | 64x64 | 4 | 62 | [32, 61] | yes | rillop |
| `creatures/<c>/rillop_hop_down` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | rillop |
| `creatures/<c>/rillop_flinch_down` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | rillop |
| `creatures/<c>/rillop_uneasy_down` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | rillop |
| `creatures/<c>/rillop_sniff_down` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | rillop |
| `creatures/<c>/rillop_yawn_down` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | rillop |
| `creatures/<c>/rillop_sit_down` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | rillop |
| `creatures/<c>/rillop_follow_up` | creature | 64x64 | 4 | 62 | [32, 61] | yes | rillop |
| `creatures/<c>/rillop_hop_up` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | rillop |
| `creatures/<c>/rillop_flinch_up` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | rillop |
| `creatures/<c>/rillop_uneasy_up` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | rillop |
| `creatures/<c>/rillop_sniff_up` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | rillop |
| `creatures/<c>/rillop_yawn_up` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | rillop |
| `creatures/<c>/rillop_sit_up` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | rillop |
| `creatures/<c>/rillop_follow_left` | creature | 64x64 | 4 | 62 | [32, 61] | yes | rillop |
| `creatures/<c>/rillop_hop_left` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | rillop |
| `creatures/<c>/rillop_flinch_left` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | rillop |
| `creatures/<c>/rillop_uneasy_left` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | rillop |
| `creatures/<c>/rillop_sniff_left` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | rillop |
| `creatures/<c>/rillop_yawn_left` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | rillop |
| `creatures/<c>/rillop_sit_left` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | rillop |
| `creatures/<c>/rillop_follow_right` | creature | 64x64 | 4 | 62 | [32, 61] | yes | rillop |
| `creatures/<c>/rillop_hop_right` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | rillop |
| `creatures/<c>/rillop_flinch_right` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | rillop |
| `creatures/<c>/rillop_uneasy_right` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | rillop |
| `creatures/<c>/rillop_sniff_right` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | rillop |
| `creatures/<c>/rillop_yawn_right` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | rillop |
| `creatures/<c>/rillop_sit_right` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | rillop |
| `creatures/<c>/runeskein_follow_down` | creature | 64x64 | 4 | 62 | [32, 61] | yes | runeskein |
| `creatures/<c>/runeskein_hop_down` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | runeskein |
| `creatures/<c>/runeskein_flinch_down` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | runeskein |
| `creatures/<c>/runeskein_uneasy_down` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | runeskein |
| `creatures/<c>/runeskein_sniff_down` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | runeskein |
| `creatures/<c>/runeskein_yawn_down` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | runeskein |
| `creatures/<c>/runeskein_sit_down` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | runeskein |
| `creatures/<c>/runeskein_follow_up` | creature | 64x64 | 4 | 62 | [32, 61] | yes | runeskein |
| `creatures/<c>/runeskein_hop_up` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | runeskein |
| `creatures/<c>/runeskein_flinch_up` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | runeskein |
| `creatures/<c>/runeskein_uneasy_up` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | runeskein |
| `creatures/<c>/runeskein_sniff_up` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | runeskein |
| `creatures/<c>/runeskein_yawn_up` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | runeskein |
| `creatures/<c>/runeskein_sit_up` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | runeskein |
| `creatures/<c>/runeskein_follow_left` | creature | 64x64 | 4 | 62 | [32, 61] | yes | runeskein |
| `creatures/<c>/runeskein_hop_left` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | runeskein |
| `creatures/<c>/runeskein_flinch_left` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | runeskein |
| `creatures/<c>/runeskein_uneasy_left` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | runeskein |
| `creatures/<c>/runeskein_sniff_left` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | runeskein |
| `creatures/<c>/runeskein_yawn_left` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | runeskein |
| `creatures/<c>/runeskein_sit_left` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | runeskein |
| `creatures/<c>/runeskein_follow_right` | creature | 64x64 | 4 | 62 | [32, 61] | yes | runeskein |
| `creatures/<c>/runeskein_hop_right` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | runeskein |
| `creatures/<c>/runeskein_flinch_right` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | runeskein |
| `creatures/<c>/runeskein_uneasy_right` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | runeskein |
| `creatures/<c>/runeskein_sniff_right` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | runeskein |
| `creatures/<c>/runeskein_yawn_right` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | runeskein |
| `creatures/<c>/runeskein_sit_right` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | runeskein |
| `creatures/<c>/sailquill_follow_down` | creature | 64x64 | 4 | 62 | [32, 61] | yes | sailquill |
| `creatures/<c>/sailquill_hop_down` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | sailquill |
| `creatures/<c>/sailquill_flinch_down` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | sailquill |
| `creatures/<c>/sailquill_uneasy_down` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | sailquill |
| `creatures/<c>/sailquill_sniff_down` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | sailquill |
| `creatures/<c>/sailquill_yawn_down` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | sailquill |
| `creatures/<c>/sailquill_sit_down` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | sailquill |
| `creatures/<c>/sailquill_follow_up` | creature | 64x64 | 4 | 62 | [32, 61] | yes | sailquill |
| `creatures/<c>/sailquill_hop_up` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | sailquill |
| `creatures/<c>/sailquill_flinch_up` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | sailquill |
| `creatures/<c>/sailquill_uneasy_up` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | sailquill |
| `creatures/<c>/sailquill_sniff_up` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | sailquill |
| `creatures/<c>/sailquill_yawn_up` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | sailquill |
| `creatures/<c>/sailquill_sit_up` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | sailquill |
| `creatures/<c>/sailquill_follow_left` | creature | 64x64 | 4 | 62 | [32, 61] | yes | sailquill |
| `creatures/<c>/sailquill_hop_left` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | sailquill |
| `creatures/<c>/sailquill_flinch_left` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | sailquill |
| `creatures/<c>/sailquill_uneasy_left` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | sailquill |
| `creatures/<c>/sailquill_sniff_left` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | sailquill |
| `creatures/<c>/sailquill_yawn_left` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | sailquill |
| `creatures/<c>/sailquill_sit_left` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | sailquill |
| `creatures/<c>/sailquill_follow_right` | creature | 64x64 | 4 | 62 | [32, 61] | yes | sailquill |
| `creatures/<c>/sailquill_hop_right` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | sailquill |
| `creatures/<c>/sailquill_flinch_right` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | sailquill |
| `creatures/<c>/sailquill_uneasy_right` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | sailquill |
| `creatures/<c>/sailquill_sniff_right` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | sailquill |
| `creatures/<c>/sailquill_yawn_right` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | sailquill |
| `creatures/<c>/sailquill_sit_right` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | sailquill |
| `creatures/<c>/slagrook_follow_down` | creature | 64x64 | 4 | 62 | [32, 61] | yes | slagrook |
| `creatures/<c>/slagrook_hop_down` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | slagrook |
| `creatures/<c>/slagrook_flinch_down` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | slagrook |
| `creatures/<c>/slagrook_uneasy_down` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | slagrook |
| `creatures/<c>/slagrook_sniff_down` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | slagrook |
| `creatures/<c>/slagrook_yawn_down` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | slagrook |
| `creatures/<c>/slagrook_sit_down` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | slagrook |
| `creatures/<c>/slagrook_follow_up` | creature | 64x64 | 4 | 62 | [32, 61] | yes | slagrook |
| `creatures/<c>/slagrook_hop_up` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | slagrook |
| `creatures/<c>/slagrook_flinch_up` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | slagrook |
| `creatures/<c>/slagrook_uneasy_up` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | slagrook |
| `creatures/<c>/slagrook_sniff_up` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | slagrook |
| `creatures/<c>/slagrook_yawn_up` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | slagrook |
| `creatures/<c>/slagrook_sit_up` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | slagrook |
| `creatures/<c>/slagrook_follow_left` | creature | 64x64 | 4 | 62 | [32, 61] | yes | slagrook |
| `creatures/<c>/slagrook_hop_left` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | slagrook |
| `creatures/<c>/slagrook_flinch_left` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | slagrook |
| `creatures/<c>/slagrook_uneasy_left` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | slagrook |
| `creatures/<c>/slagrook_sniff_left` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | slagrook |
| `creatures/<c>/slagrook_yawn_left` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | slagrook |
| `creatures/<c>/slagrook_sit_left` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | slagrook |
| `creatures/<c>/slagrook_follow_right` | creature | 64x64 | 4 | 62 | [32, 61] | yes | slagrook |
| `creatures/<c>/slagrook_hop_right` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | slagrook |
| `creatures/<c>/slagrook_flinch_right` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | slagrook |
| `creatures/<c>/slagrook_uneasy_right` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | slagrook |
| `creatures/<c>/slagrook_sniff_right` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | slagrook |
| `creatures/<c>/slagrook_yawn_right` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | slagrook |
| `creatures/<c>/slagrook_sit_right` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | slagrook |
| `creatures/<c>/tidemarrow_follow_down` | creature | 96x96 | 4 | 62 | [32, 61] | yes | tidemarrow |
| `creatures/<c>/tidemarrow_hop_down` | creature | 96x96 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | tidemarrow |
| `creatures/<c>/tidemarrow_flinch_down` | creature | 96x96 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | tidemarrow |
| `creatures/<c>/tidemarrow_uneasy_down` | creature | 96x96 | 4 | 220,90,220,90 | [32, 61] | yes | tidemarrow |
| `creatures/<c>/tidemarrow_sniff_down` | creature | 96x96 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | tidemarrow |
| `creatures/<c>/tidemarrow_yawn_down` | creature | 96x96 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | tidemarrow |
| `creatures/<c>/tidemarrow_sit_down` | creature | 96x96 | 4 | 80,400,600,600 | [32, 61] | yes | tidemarrow |
| `creatures/<c>/tidemarrow_follow_up` | creature | 96x96 | 4 | 62 | [32, 61] | yes | tidemarrow |
| `creatures/<c>/tidemarrow_hop_up` | creature | 96x96 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | tidemarrow |
| `creatures/<c>/tidemarrow_flinch_up` | creature | 96x96 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | tidemarrow |
| `creatures/<c>/tidemarrow_uneasy_up` | creature | 96x96 | 4 | 220,90,220,90 | [32, 61] | yes | tidemarrow |
| `creatures/<c>/tidemarrow_sniff_up` | creature | 96x96 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | tidemarrow |
| `creatures/<c>/tidemarrow_yawn_up` | creature | 96x96 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | tidemarrow |
| `creatures/<c>/tidemarrow_sit_up` | creature | 96x96 | 4 | 80,400,600,600 | [32, 61] | yes | tidemarrow |
| `creatures/<c>/tidemarrow_follow_left` | creature | 96x96 | 4 | 62 | [32, 61] | yes | tidemarrow |
| `creatures/<c>/tidemarrow_hop_left` | creature | 96x96 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | tidemarrow |
| `creatures/<c>/tidemarrow_flinch_left` | creature | 96x96 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | tidemarrow |
| `creatures/<c>/tidemarrow_uneasy_left` | creature | 96x96 | 4 | 220,90,220,90 | [32, 61] | yes | tidemarrow |
| `creatures/<c>/tidemarrow_sniff_left` | creature | 96x96 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | tidemarrow |
| `creatures/<c>/tidemarrow_yawn_left` | creature | 96x96 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | tidemarrow |
| `creatures/<c>/tidemarrow_sit_left` | creature | 96x96 | 4 | 80,400,600,600 | [32, 61] | yes | tidemarrow |
| `creatures/<c>/tidemarrow_follow_right` | creature | 96x96 | 4 | 62 | [32, 61] | yes | tidemarrow |
| `creatures/<c>/tidemarrow_hop_right` | creature | 96x96 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | tidemarrow |
| `creatures/<c>/tidemarrow_flinch_right` | creature | 96x96 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | tidemarrow |
| `creatures/<c>/tidemarrow_uneasy_right` | creature | 96x96 | 4 | 220,90,220,90 | [32, 61] | yes | tidemarrow |
| `creatures/<c>/tidemarrow_sniff_right` | creature | 96x96 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | tidemarrow |
| `creatures/<c>/tidemarrow_yawn_right` | creature | 96x96 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | tidemarrow |
| `creatures/<c>/tidemarrow_sit_right` | creature | 96x96 | 4 | 80,400,600,600 | [32, 61] | yes | tidemarrow |
| `creatures/<c>/tumbloam_follow_down` | creature | 64x64 | 4 | 62 | [32, 61] | yes | tumbloam |
| `creatures/<c>/tumbloam_hop_down` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | tumbloam |
| `creatures/<c>/tumbloam_flinch_down` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | tumbloam |
| `creatures/<c>/tumbloam_uneasy_down` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | tumbloam |
| `creatures/<c>/tumbloam_sniff_down` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | tumbloam |
| `creatures/<c>/tumbloam_yawn_down` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | tumbloam |
| `creatures/<c>/tumbloam_sit_down` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | tumbloam |
| `creatures/<c>/tumbloam_follow_up` | creature | 64x64 | 4 | 62 | [32, 61] | yes | tumbloam |
| `creatures/<c>/tumbloam_hop_up` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | tumbloam |
| `creatures/<c>/tumbloam_flinch_up` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | tumbloam |
| `creatures/<c>/tumbloam_uneasy_up` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | tumbloam |
| `creatures/<c>/tumbloam_sniff_up` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | tumbloam |
| `creatures/<c>/tumbloam_yawn_up` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | tumbloam |
| `creatures/<c>/tumbloam_sit_up` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | tumbloam |
| `creatures/<c>/tumbloam_follow_left` | creature | 64x64 | 4 | 62 | [32, 61] | yes | tumbloam |
| `creatures/<c>/tumbloam_hop_left` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | tumbloam |
| `creatures/<c>/tumbloam_flinch_left` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | tumbloam |
| `creatures/<c>/tumbloam_uneasy_left` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | tumbloam |
| `creatures/<c>/tumbloam_sniff_left` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | tumbloam |
| `creatures/<c>/tumbloam_yawn_left` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | tumbloam |
| `creatures/<c>/tumbloam_sit_left` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | tumbloam |
| `creatures/<c>/tumbloam_follow_right` | creature | 64x64 | 4 | 62 | [32, 61] | yes | tumbloam |
| `creatures/<c>/tumbloam_hop_right` | creature | 64x64 | 7 | 60,40,40,60,40,50,60 | [32, 61] | no | tumbloam |
| `creatures/<c>/tumbloam_flinch_right` | creature | 64x64 | 8 | 40,60,50,50,50,60,60,60 | [32, 61] | no | tumbloam |
| `creatures/<c>/tumbloam_uneasy_right` | creature | 64x64 | 4 | 220,90,220,90 | [32, 61] | yes | tumbloam |
| `creatures/<c>/tumbloam_sniff_right` | creature | 64x64 | 7 | 160,80,140,80,140,80,200 | [32, 61] | no | tumbloam |
| `creatures/<c>/tumbloam_yawn_right` | creature | 64x64 | 8 | 200,100,120,380,260,120,80,200 | [32, 61] | no | tumbloam |
| `creatures/<c>/tumbloam_sit_right` | creature | 64x64 | 4 | 80,400,600,600 | [32, 61] | yes | tumbloam |
| `specials/cindrip_shakeoff_down` | creature | 64x64 | 7 | 50,50,50,50,60,70,120 | [32, 61] | no | - |
| `specials/rillop_wade_down` | creature | 64x64 | 4 | 62 | [32, 61] | yes | - |
| `specials/rillop_wade_idle_down` | creature | 64x64 | 4 | 180 | [32, 61] | yes | - |
| `specials/sailquill_fly_down` | creature | 64x64 | 4 | 70 | [32, 61] | yes | - |
| `specials/gloamtick_flare_down` | creature | 64x64 | 6 | 80,100,260,200,200,300 | [32, 61] | no | - |
| `specials/cindrip_shakeoff_left` | creature | 64x64 | 7 | 50,50,50,50,60,70,120 | [32, 61] | no | - |
| `specials/rillop_wade_left` | creature | 64x64 | 4 | 62 | [32, 61] | yes | - |
| `specials/rillop_wade_idle_left` | creature | 64x64 | 4 | 180 | [32, 61] | yes | - |
| `specials/sailquill_fly_left` | creature | 64x64 | 4 | 70 | [32, 61] | yes | - |
| `specials/gloamtick_flare_left` | creature | 64x64 | 6 | 80,100,260,200,200,300 | [32, 61] | no | - |
| `specials/cindrip_shakeoff_right` | creature | 64x64 | 7 | 50,50,50,50,60,70,120 | [32, 61] | no | - |
| `specials/rillop_wade_right` | creature | 64x64 | 4 | 62 | [32, 61] | yes | - |
| `specials/rillop_wade_idle_right` | creature | 64x64 | 4 | 180 | [32, 61] | yes | - |
| `specials/sailquill_fly_right` | creature | 64x64 | 4 | 70 | [32, 61] | yes | - |
| `specials/gloamtick_flare_right` | creature | 64x64 | 6 | 80,100,260,200,200,300 | [32, 61] | no | - |
| `specials/cindrip_shakeoff_up` | creature | 64x64 | 7 | 50,50,50,50,60,70,120 | [32, 61] | no | - |
| `specials/rillop_wade_up` | creature | 64x64 | 4 | 62 | [32, 61] | yes | - |
| `specials/rillop_wade_idle_up` | creature | 64x64 | 4 | 180 | [32, 61] | yes | - |
| `specials/sailquill_fly_up` | creature | 64x64 | 4 | 70 | [32, 61] | yes | - |
| `specials/gloamtick_flare_up` | creature | 64x64 | 6 | 80,100,260,200,200,300 | [32, 61] | no | - |
| `specials/tumbloam_bench_down` | creature | 64x64 | 6 | 60,50,60,90,700,500 | [32, 61] | yes | - |
| `specials/flight_shadow` | overlay | 26x8 | 1 | 100 | [13, 4] | yes | - |

## Per-animation notes

* `creatures/<c>/bastonox_follow_down`: Follow cycle = the existing ow walk frames at the player walk rate (16 px per frame, 62 ms); buddy uses the player path delayed one tile.
* `creatures/<c>/bastonox_hop_down`: Reaction: happy/notice hop. Play once with an emote (heart / note / sparkle).
* `creatures/<c>/bastonox_flinch_down`: Reaction: Enraged-nearby tell (1.7b): play with the anger emote during the 0.3 s edge pulse.
* `creatures/<c>/bastonox_uneasy_down`: Crystal unease: loop while adjacent (<=1 tile) to crystal ore/dig scars; show the sweat emote once on entry; low unhappy sound.
* `creatures/<c>/bastonox_sniff_down`: Idle (5.7): sniff the ground.
* `creatures/<c>/bastonox_yawn_down`: Idle (5.7): yawn/stretch with a sigh puff.
* `creatures/<c>/bastonox_sit_down`: Idle (5.7): settle down. Play 00-01 once, then loop 02-03. Any move input cancels to follow.
* `specials/cindrip_shakeoff_down`: Rain: shake off water (play when rain starts / after leaving rain). Puddle avoidance is pathing (code).
* `specials/rillop_wade_down`: Brookhollow river edge: wading walk; draw on the water cell (collision water allowed for the buddy only).
* `specials/rillop_wade_idle_down`: Wading idle (ripple line cycles).
* `specials/sailquill_fly_down`: Flight cycle; draw body at y-14 px (hook_specs.sailquill_flight) with flight_shadow on the ground.
* `specials/gloamtick_flare_down`: Lantern flare near graves (<=2 tiles from a memorial stone/grave). Cooldown 6 s.
* `specials/tumbloam_bench_down`: Bench sit: buddy steps onto the bench cell, plays 00-03 once, then loops 04-05. Frames already include the -10 px seat lift.
* `specials/flight_shadow`: Ground shadow for flying buddies (50% Bayer ink). Centre on the buddy foot point (32,61) of its ground cell.

## Coder hook notes

* Generic sit is a squash, and yawn has no eye-closing (no per-creature eye edits).
* On a bike the buddy goes back into its ball.
* Some poses are subtle at 1x (Cindrip drops, a few trail poses).

The full parameters are in `hook_specs.json`, embedded here:

```json
{
 "anchor": "all buddy frames are 64x64 with foot (32,61), identical to <c>_ow_<dir>_stand: draw at (tileX*64, tileY*64) + walk offset.",
 "follow": {
  "delay": "one tile behind: buddy takes the cell the player just left, moving with the same 16 px per frame / 62 ms cadence",
  "stairs_warps": "on warp the buddy appears on the cell behind the player facing the same way",
  "ledges": "hop frames during the ledge arc",
  "bike_run": "run: same cycle at the run frame rate; bike: buddy returns to its ball (hidden) - our choice, the playbook does not cover it"
 },
 "reaction_table_hook": "talk to buddy -> emote + one-liner by place/weather/time/Warmth (text owned by Text Bot). Emote anchor (12,23) at (buddy_x+32, buddy_y+bbox_top-1). Pair: happy=hop+heart, music zones=hop+note, rare item=hop+sparkle, rain=dots (cindrip: shakeoff), night=yawn, Enraged nearby=flinch+anger, crystal ore=uneasy+sweat.",
 "idle": {
  "after_ms": 6000,
  "cycle": [
   "sniff",
   "yawn",
   "sit"
  ],
  "gap_ms": [
   3000,
   6000
  ],
  "note": "pick randomly, never the same twice in a row; cancel on player move"
 },
 "crystal_unease": {
  "trigger": "buddy within 1 tile of a crystal ore / dig scar tile (thornwood (27,11), greystone_entrance (16,12) ...)",
  "play": "turn to face the crystal, emote sweat once, loop <c>_uneasy_<dir>",
  "audio": "low unhappy sound (Audio)",
  "exit": "when the player moves away, resume follow"
 },
 "sailquill_flight": {
  "lift_px": 14,
  "bob_px": [
   0,
   -1,
   -2,
   -1
  ],
  "bob_ms": 140,
  "shadow": "specials/flight_shadow under foot point",
  "bridge_circle": {
   "radius_px": 44,
   "period_ms": 1800,
   "direction": "counter-clockwise",
   "facing": "pick the 4-dir frame closest to the tangent",
   "trigger": "player standing on a bridge cell"
  },
  "flies_ahead": "when walking straight 3+ tiles: target cell = one tile AHEAD of the player instead of behind"
 },
 "rillop_wade": "Brookhollow river edge: when the path runs beside the river (x22..24), the buddy may take the adjacent water cell and uses specials/rillop_wade_<dir>",
 "tumbloam_bench": "when the player stands still 2 s next to a bench, tumbloam steps onto the bench cell and plays specials/tumbloam_bench_down",
 "gloamtick_flare": "within 2 tiles of a grave / memorial stone: play specials/gloamtick_flare_<dir> once, 6 s cooldown",
 "cindrip_rain": "cindrip never enters puddle cells (pathing: take the next cell of the player trail that is not a puddle, catch up after). Shake off when rain starts and after leaving a rain zone.",
 "reduced_motion": "hop -> single 1-frame 2 px lift; shakeoff -> frame 00 + 06 only; uneasy -> frame 00 held (no shiver); idles unchanged."
}
```

## Previews

* `previews/follow_brookhollow_2x.gif`
* `previews/gloamtick_flare_lantern_rest_night_2x.gif`
* `previews/idles_route1_2x.gif`
* `previews/poses_all_contact_a.png`
* `previews/poses_all_contact_b.png`
* `previews/poses_named_contact_2x.png`
* `previews/specials_contact_2x.png`
* `previews/specials_day_2x.gif`
* `previews/uneasy_crystal_thornwood_2x.gif`

## Reproduce / validate

```
cd art/characters/pixel/soul/_tools
python3 gen_trail_buddy.py
python3 validate_soul.py trail_buddy
python3 write_manifest.py
```
