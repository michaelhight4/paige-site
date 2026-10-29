# Kilumen R5-6 weather lite (not wired)
Same art and look as ../weather/, but drawn as CSS-composited layers instead of canvas fills.
Files: lite.css, *_f0.webp rain tiles, perf_lite.html/.mjs (harness = ../perf copy + `&lite=1`, `&t=` freeze), shots.mjs, weather_lite_contact_sheet.png, look_scores.json, perf_results_lite*.json.

## Wiring (for Coder)
1. Split the battle/overworld render: backdrop canvas (bottom), then `<div class="wx wx-rain|wx-storm|wx-fog">`, then a transparent sprite/HUD canvas on top. Clear only the sprite dirty rects on the top canvas. Fog must sit under the HP cards and sprites (Gary's battle rule), and this order does that.
2. Markup: rain/storm `<div class="mv ox"><div class="mv oy"></div></div>`; storm adds `<div class="wx-tint"></div><div class="wx-flash"><div class="w"></div><img src="lightning_bolt_N.webp"></div>`; fog `<div class="mv band a"></div><div class="mv band b"></div>`.
3. Lightning: remove the CSS loop animation and toggle opacity from JS on the 6-14 s timer with the spec sequence. Keep the cap at 3 flashes per 10 s and alpha at 0.55 or less. Add `.reduce-flashing` on `.wx` when that setting is on.
4. Do not change the per-frame JS. Toggle classes only on a weather change. Pause with `animation-play-state:paused` when the game pauses.
5. Fix asset URLs in lite.css for the game's paths. Use the _f0 rain tiles; animated webp backgrounds re-raster every frame and cost about 3 fps.
