# Kilumen element attack effect library

Reusable pixel overlay animations for battle attacks. All the art is original and code-drawn: 1x native, hard pixels, no AA. It uses only the shared 64-colour palette (`art/world/overworld/palette.png`) plus full transparency. **Not wired into the game.**

## Layout
`<element>/<anim>/` where anim is `travel_p2f` (player back sprite → foe), `travel_f2p` (foe → player) or `impact`. Each anim folder holds:
- `1x/<el>_<anim>_f<i>.png` and `2x/<el>_<anim>_f<i>_2x.png` (exact nearest-neighbour)
- `<el>_<anim>_sheet.png` / `_sheet_2x.png` (horizontal strip, frame i at x = i*frame_w)
- `<el>_<anim>_2x.gif` (transparent) and `<el>_<anim>_battle_2x.gif` (composited on the pilot battle screen)

Frame sizes: travel is 240x176, placed at (40,40) on the 320x240 battle screen. Impact is 96x112, with origin (48,64) on the hit creature's centre (flip_x for the player side).
Anchors, fps and paths are in `_parts/animator_manifest.json` → `effects`.

## Previews (`_preview/`)
- `<el>_battle_2x.gif`: full exchange: p2f → foe impact → f2p → player impact.
- `<el>_strip(_2x).png`: onion-skins plus impact frames.
- `contact_sheet_all(_2x).png`, `contact_impacts(_2x).png`, `contact_travel_p2f(_2x).png`
- `validation_report.json`

## Rebuild
`python3 _tools/build_library.py` renders, validates, builds contact sheets and merges the manifest (only the `effects` key).
`python3 _tools/gen_effects.py fire water` re-renders a subset. `python3 _tools/validate_effects.py` validates only.
Drawing code is in `_tools/elements.py` (one travel + impact function per element). The primitives are in `_tools/fxlib.py`.

| element | p2f frames | f2p frames | impact frames | fps travel/impact | design |
|---|---|---|---|---|---|
| fire | 7 | 7 | 8 | 14/12 | main type: tumbling fireball w/ flame tongue tail, embers, smoke; impact = flame burst then smoke |
| water | 7 | 7 | 8 | 12/12 | main type: lobbed squash-stretch water orb + droplet trail; impact = crown splash + ripples |
| earth | 7 | 7 | 8 | 10/10 | main type: heavy tumbling boulder on high arc + dust; impact = rock spikes erupt, debris, dust |
| wind | 6 | 6 | 7 | 16/14 | main type: twin crescent air-blades on a weaving path; impact = slash X then spinning funnel |
| light | 6 | 6 | 7 | 18/14 | main type: straight fast lance with sparkle wake; impact = cross flare, starburst, ring, twinkles |
| dark | 8 | 8 | 8 | 12/12 | main type: ink orb with writhing tendrils; impact = tendrils implode then black shock ring |
| mystic | 7 | 7 | 8 | 12/12 | main type: core with 3 helix-orbiting motes + glyph; impact = rune circle, column, rising glyphs |
| legendary | 8 | 8 | 8 | 14/12 | main type: spinning 8-point star with tri-colour ribbon tail; impact = prismatic rings + crown crest |
| grass | 7 | 7 | 8 | 12/12 | sub type: stream of spinning leaves; impact = whipping vines, leaf burst, little blossoms |
| bug | 7 | 7 | 8 | 16/14 | sub type: buzzing swarm with flicking wings; impact = swarm orbits target with stinger jabs |
| sea | 7 | 7 | 8 | 12/12 | sub type: curling wave crest surfing the path; impact = wave curls over and crashes into foam |
| freshwater | 7 | 7 | 7 | 12/12 | sub type: wobbling bubble stream; impact = bubbles cluster then pop one by one |
| swamp | 7 | 7 | 8 | 10/10 | sub type: lobbed sludge glob with drips; impact = splat, goo runs down, toxic bubbles |
| rain | 7 | 7 | 8 | 16/12 | sub type: volley of rain needles; impact = cloud forms above target and pours |
| magma | 7 | 7 | 8 | 10/10 | sub type: crusted lava glob, drips, smoke; impact = splash, lava pool, geyser, fumes |
| dragos | 8 | 8 | 7 | 14/14 | sub type: serpentine crimson dragon-ribbon with horned head; impact = triple claw slashes in an X + scale shards |
| bird | 6 | 6 | 7 | 16/12 | sub type: V-formation feather darts; impact = talon rakes then feather explosion drifting down |
| spirit | 7 | 7 | 8 | 12/12 | sub type: cyan soul-wisp with 2 orbiting wisps; impact = spirit flare then wisps spiral upward |
| ghost | 8 | 8 | 8 | 10/10 | sub type: phasing phantom with after-images; impact = looming face screams, warped rings |
| demon | 7 | 7 | 8 | 14/12 | sub type: spiked crimson orb with soot trail; impact = fanged jaws snap shut + crimson burst |
| angelic | 7 | 7 | 8 | 12/12 | sub type: spinning golden halo shedding feathers; impact = wings of light unfold then shed feathers |
| god | 8 | 8 | 8 | 12/12 | sub type: radiant sun-disc with orbiting motes; impact = divine column from above + ground shockwave |
| devil | 6 | 6 | 8 | 16/12 | sub type: forked crimson hell-bolt with trident head; impact = cracked ground erupts in black-red hellfire |

## Rule (Gary, Oct 22 2026)
Effects belong to SKILLS, never to creatures. Any creature using a skill plays that skill's same effect. Wire as skill -> effect id (currently one effect set per element); never per-creature.
