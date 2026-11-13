# fx_extra (Animator)

**DRAFT - not approved by Gary. NOT wired into game code.** Last build: 2026-10-22 23:12 CT.

Extra FX the Game dev inventory found missing or partial. Original art, 64-colour palette (`art/world/overworld/palette.hex`), alpha 0/255, drawn at 1x; previews 2x nearest.
No smoke/haze anywhere. Every piece has 4-phase (dawn/day/dusk/night) check strips in `<piece>/_preview/*_tod_2x.*`.

| piece | what |
|---|---|
| capture/ | hold-up/absorb capture: raise, beam, absorb, pulse_1..4, lock_bloom, breakout_generic/fire/water/wind (names match the code steps) |
| heal_restore/ | one cradle ring, whole team floats in together, one scanner sweep, glow, done ping + party glow/seep hooks |
| item_pickup/ | soft supply bag idle, pickup open (dither-out), hidden-item sparkle |
| grass_leaves/ | tall-grass step leaves (2 variants + reduced motion) |
| warmth_stage_up/ | stage-up ring per ramp family (10), stage pips, crystal anchors |
| cosmic_shimmer/ | starfield tile, encounter aura, icon twinkle, summary sparkle |
| evolution/ | generic evolution overlay: Warmth veins, dither reveal from the crystal point, local ring burst, cancel, reduced motion |
| tod_checks/ | read-only ToD strips for existing soul/ spotted, transitions, hit feedback |

Older versions (before the Oct 22 IP check) are kept for reference in `_superseded_ip_2026-10-22/` - do not use them.
Tools: `_tools/fxx_lib.py` (shared), `_tools/gen_<piece>.py`, `_tools/build_all.py`, `_tools/validate_fx_extra.py`, `_tools/gen_readmes.py`.
Readability metric: fraction of FX pixels with |dLuma| >= 28 against the graded background, per phase (pass >= 0.5). The number can be fooled (tiny particles) - always look at the strip too.
