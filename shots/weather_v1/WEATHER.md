# Kilumen weather v1 (branch dev/weather-rain)

Code: `kilumen/src/weather/`. Weather rolls per 3 in-game hours from a per-save seed (saved in `systems.weather`), by area type. Indoors is always clear; `*_storm` maps are always storm. Changes ease over 4 s.

## Chances per 3-hour block

| Area | Row | clear | fog | rain_light | rain_heavy | storm | snow_light | ice_fog | blizzard |
|---|---|---|---|---|---|---|---|---|---|
| temperate | day | 52% | 8% | 22% | 12% | 6% | · | · | · |
| temperate | dawn | 42% | 30% | 16% | 8% | 4% | · | · | · |
| swamp | day | 34% | 22% | 22% | 14% | 8% | · | · | · |
| swamp | dawn | 24% | 46% | 16% | 10% | 4% | · | · | · |
| snowy | day | · | · | · | · | · | 66% | 10% | 24% |
| snowy | dawn | · | · | · | · | · | 56% | 26% | 18% |

Dawn = blocks starting 03:00–08:59. Snowy areas never roll rain. Swamp = mirefen, mirefen_bog, route_saltmere_mirefen, route_sunmeadow_mirefen; snowy = frostspire maps.

## Encounter modifiers (wild grass rolls)

| Kind | Step rate | Element weight | Species weight | Weather-only species (weight, grass zones only) | Notes |
|---|---|---|---|---|---|
| clear | ×1 | — | — | — |  |
| fog | ×1.15 | ghost ×1.6, mystic ×1.6, dark ×1.4 | — | dustbonnet w5, mournlily w3 |  |
| rain_light | ×1 | water ×1.5, swamp ×1.3, rain ×2 | — | — |  |
| rain_heavy | ×1 | water ×1.8, swamp ×1.5, rain ×2.5 | — | puddlenip w10, pondkin w8 (swamp) |  |
| storm | ×1 | water ×2, swamp ×1.6, rain ×3 | — | puddlenip w10, drizzlebill w4, pondkin w8 (swamp) |  |
| snow_light | ×1 | — | snowgrouse ×1.2, frostlop ×1.3, snowdrowse ×1.3, alpuff ×1.2 | — |  |
| ice_fog | ×1.1 | ghost ×1.5, mystic ×1.6 | snowdrowse ×3 | — |  |
| blizzard | ×1.1 | wind ×1.4 | snowgrouse ×1.8, frostlop ×2, shagmount ×2, tundrarch ×2.5, snowdrowse ×1.8, ledgebex ×1.5 | snowcairn w6, rimewick w3 |  |

Data field: any slot in `data/encounters_wired.json` may carry `"weather": {"rain": 2}` (multiplier; groups rain / fog / snow or an exact kind) or `"weather": ["rain"]` (only in that weather).

## Fishing modifiers

| Kind | Bite chance | Wait | Uncommon weight | Rare weight |
|---|---|---|---|---|
| clear | ×1 | ×1 | ×1 | ×1 |
| fog | ×0.85 | ×1.3 | ×1.3 | ×1.8 |
| rain_light | ×1.12 | ×1 | ×1.15 | ×1.3 |
| rain_heavy | ×1.22 | ×1 | ×1.3 | ×1.6 |
| storm | ×1.3 | ×0.9 | ×1.4 | ×2 |
| snow_light | ×1 | ×1 | ×1 | ×1 |
| ice_fog | ×0.85 | ×1.25 | ×1 | ×1.6 |
| blizzard | ×0.9 | ×1 | ×1.3 | ×1.5 |

Fog also plans trainer sight -1 tile (in MODS.fog, not wired: trainer code is shared with other work).

## Frame cost (measured Oct 29 2026, Playwright Chromium, 4x CPU throttle, software canvas on the box)

wxDraw = time inside the weather draw call per frame (st.prof timer). Whole-frame numbers are noisy on the box: origin/main itself measured 18.7 ms main-thread/frame on phone route1 (no weather), and ?wx=0 on this branch 17.8 ms, so whole-frame deltas between kinds are mostly box noise.

| Run | weather draw avg ms | p95 ms | main-thread ms/frame | rAF avg ms |
|---|---|---|---|---|
| phone_route1_clear | 0.043 | 0.1 | 28.8 | 28.92 |
| phone_route1_rain_light | 0.182 | 0.5 | 28.33 | 29.2 |
| phone_route1_rain_heavy | 0.184 | 0.5 | 36.83 | 37.45 |
| phone_route1_storm | 0.413 | 0.7 | 40.18 | 39.89 |
| phone_route1_fog | 0.126 | 0.4 | 44.18 | 43.35 |
| phone_route1_clear_2 | 0.062 | 0.1 | 31.6 | 31.76 |
| phone_frostspire_pass_snow_light | 0.159 | 0.6 | 49.6 | 49.23 |
| phone_frostspire_pass_blizzard | 0.207 | 0.7 | 52.43 | 50.9 |
| phone_frostspire_pass_ice_fog | 0.078 | 0.5 | 85.64 | 86.94 |
| pc_route1_clear | 0.222 | 0.6 | 126.11 | 123.32 |
| pc_route1_rain_light | 0.24 | 0.8 | 59.68 | 58.97 |
| pc_route1_rain_heavy | 0.247 | 0.8 | 51.08 | 50.17 |
| pc_route1_storm | 0.662 | 4.3 | 129.53 | 118.79 |
| pc_route1_fog | 0.158 | 0.9 | 218.63 | 206.41 |
| pc_route1_clear_2 | 0.019 | 0.1 | 36.11 | 36.06 |
| pc_frostspire_pass_snow_light | 0.877 | 0.9 | 244.82 | 231.06 |
| pc_frostspire_pass_blizzard | 0.131 | 0.7 | 146.36 | 144.2 |
| pc_frostspire_pass_ice_fog | 0.077 | 0.2 | 83.99 | 80.65 |

## Snow change
soul.js flakeCount: cap 160 → 210, density /9000 → /6800, phone ×0.4 → ×0.45. Flakes ~20% larger, far flakes brighter. Light snow adds a faint low drift band (weather fx). Blizzard multiplies the soul.js flake count up to ×2.2 and pushes the wind ×4.

## Files
Shots: `<kind>_pc.png` / `<kind>_phone.png`, contact_sheet_{pc,phone}.png, clip_{pc,phone}.mp4 (route1 clear → light → heavy → storm → fog → clear, then Frostspire light snow → blizzard → ice fog; 4 s eases). Scripts: _wx_shots.mjs, _wx_perf.mjs. Raw: report.json, perf.json.
QA note: the alpha build strips dev URL flags, so shots force weather with `kilumen.scene.weather.set(kind)`. `?wx=0` (kept) turns weather off.
