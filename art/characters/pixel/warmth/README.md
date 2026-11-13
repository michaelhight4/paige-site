# Crystal Warmth: crystal tint data (playbook #7, SOUL_PLAYBOOK §1.1)

> **STATUS: DRAFT. Gary has NOT signed off on this art.** It is approved for building but must not ship until he approves the colours. The `status` field in `warmth_tints.json` says the same.

Each creature's dominance crystal starts in the cold violet "company control" colour. As the hidden **Warmth** stat (0–100) rises, it shifts in three steps toward that creature's own signature colour. The change applies to the battle sprites (front/back and idle frames) and to the overworld follower (Trail Buddy) walk/stand frames. Only crystal pixels change. Everything else, including violet pixels that are *not* crystal (wing fins, shell seams, eyes, smoke), stays exactly as authored.

This is art data only: no audio, no code wiring.

## Files

| Path | What |
|---|---|
| `warmth_tints.json` | **The data.** Thresholds, source ramp, and for each creature: per-stage `#src → #dst` colour maps plus the signature colour and justification. |
| `masks/<creature>/<same relative path as the sprite>` | 8-bit greyscale PNG per sprite, **255 = crystal**, 0 = leave alone. These exist for every native battle/anim/overworld frame, every `_2x`/`_3x` variant and every sprite sheet (`anim/*_idle_sheet*.png`, `overworld/*_ow_sheet*.png`). 1408 files in total. |
| `masks/<creature>/crystal_index.json` | The same masks as text. For each native sprite: `size`, `crystal_px`, `colours_present`, and `rows` as run-length rows `[y, x_start, x_end]` (inclusive, native pixels). `sheets` maps each 1x sheet to the frame tiles it contains (`frame`, `x`, `y`, `w`, `h`). |
| `_preview/` | **Previews only, not runtime assets** (see below). |
| `tools/` | The scripts that produced the above. `python3 tools/build.py` rebuilds masks and the JSON with validation; `python3 tools/previews.py` then rebuilds the previews. `overrides.py` holds the hand calls on which violet bits count as crystal, and `ramps.py` holds the colour ramps. |

Sprites live in `art/characters/pixel/creatures/<creature>/` (battle, anim, overworld). All colours come from `art/world/overworld/palette.hex`.

## Thresholds

| Stage | Warmth | Look |
|---|---|---|
| 0 | 0–24 | cold violet, the authored "company control" crystal (identity: no change) |
| 1 | 25–49 | first tint: warm targets pass through dusty rose, cool/green targets through periwinkle blue |
| 2 | 50–74 | second tint, mostly the signature hue (green targets pass through teal) |
| 3 | 75–100 | full signature colour, slightly brighter (a "glow") |

`stage = 0 if warmth < 25 else 1 if warmth < 50 else 2 if warmth < 75 else 3`

## How to apply the swap

1. Pick the stage from Warmth (above).
2. Load the sprite and its mask at the same relative path under `masks/<creature>/`. For a `_2x`/`_3x` sprite or a sheet, use its own exported mask, or nearest-neighbour upscale/tile the native mask; they are identical.
3. For every pixel where the mask is non-zero, look up its RGB as `#rrggbb` in `creatures[name].stages[stage]` and replace it. Alpha is unchanged. Masked pixels are always one of the six source-ramp colours, so the lookup always hits.
4. Never touch pixels outside the mask, even if they are the same violet.
5. Stage 0 is an identity map, so you can skip the swap entirely.

Every stage map covers all 6 source violets: `3a1e60 603096 8a4ace b076ec d6acff f4e2ff` (dark → light). The idle animation's glow frames use the brighter violets, so all six must be mapped.

Equivalently, this is a palette swap restricted to the mask. With an indexed or shader approach, sample the mask and remap the 6 violets through a 4×6 lookup per creature.

## Signature colours

| Creature | Element | Signature | Why |
|---|---|---|---|
| tumbloam | Earth | `#78ba48` moss green | Earth line shares one colour so the bond carries through evolution. Moss green comes from Tumbloam's moss-speckled shell and Burrowmane's moss mane (living earth, not cold stone). Green reads clearly against the slate/tan shell. |
| burrowmane | Earth | `#78ba48` moss green | Earth line (see Tumbloam). Matches its moss mane directly. |
| bastonox | Earth | `#78ba48` moss green | Earth line (see Tumbloam). Moss on a fortress shell is the patient guardian overgrown with life. The shoulder clusters read strongly green on the grey shell. |
| cindrip | Fire | `#d46616` ember orange | Fire line: ember orange, the colour of its lava-coal plates and sneezed sparks. Strong contrast on the charcoal body. Stage 3 runs ember-orange edge into a white-hot core so the gems read apart from the orange lava cracks. |
| emberlunx | Fire | `#d46616` ember orange | Fire line (see Cindrip). Ember orange on the coal crest. |
| forgeharrow | Fire | `#d46616` ember orange | Fire line (see Cindrip). Kiln-fire orange, the breath smiths used to fire kilns. |
| rillop | Water | `#70cab8` seafoam | Water line: seafoam aqua, straight from its "seafoam otter" design and the teal stripe colour of the line. Readable on the grey body. |
| brookhorn | Water | `#70cab8` seafoam | Water line (see Rillop). |
| tidemarrow | Water | `#70cab8` seafoam | Water line (see Rillop). The coral-horn beads glow sea-foam pale, which reads as calm coast weather. |
| sailquill | Wind | `#f08868` sunrise coral | Sunrise coral, picked up from its orange beak and feet. A cheerful messenger of Sunmeadow mornings. Its body is already sky blue, so a blue crystal would vanish; a warm coral/yellow bead pops on the dark streamers. |
| halovy | Light | `#f6a0ba` dawn rose | Dawn rose: it appears at dawn to the lost. Pink contrasts with its cream body, where gold would blend in. |
| gloamtick | Dark/Ghost | `#e29d40` candle amber | Candle amber: its lantern is said to hold a lost soul's spark. With Warmth the spark becomes a real candle flame (it ties into Wick's lantern glow, playbook T3). Reads strongly on the dusk-grey body. |
| runeskein | Mystic | `#a23432` crimson thread | Crimson thread: a red "thread of fate" bead pin on its teal-and-cream yarn. Red complements the teal weave, so the small pin stays visible. |
| burlbeetle | Earth/Bug | `#a6d460` sprout lime | Sprout lime: a sleepy tree-burl beetle whose knots bud new growth. Lime pops on its brown bark body. Kept lighter and yellower than the Earth line moss so the two stay distinct. |
| mirewump | Water/Swamp | `#7ac2e8` clear-pond blue | Clear-pond blue: the clean water under the Mirefen bog. Its body is moss green, so green pebbles would vanish; blue pebbles read clearly. |
| slagrook | Fire/Magma | `#fcd668` white-hot yellow | White-hot yellow: the furnace window heats from violet to white-hot. Its shell is already red-orange, so only a near-white yellow glow reads as "hotter" and stays visible. |

Evolution lines share one colour so the bond carries through evolution: Earth = moss, Fire = ember, Water = seafoam.

### Stage ramps (replacement for `3a1e60 603096 8a4ace b076ec d6acff f4e2ff`)

| Creature | Stage 1 | Stage 2 | Stage 3 |
|---|---|---|---|
| tumbloam | 3a1e60 30488c 4a70ba 4692ce 7ac2e8 c6ecfa | 18382c 246e6c 3e9c92 70cab8 c6ecfa fcf6e8 | 24522e 367634 52983a 78ba48 a6d460 f8eabe |
| burrowmane | 3a1e60 30488c 4a70ba 4692ce 7ac2e8 c6ecfa | 18382c 246e6c 3e9c92 70cab8 c6ecfa fcf6e8 | 24522e 367634 52983a 78ba48 a6d460 f8eabe |
| bastonox | 3a1e60 30488c 4a70ba 4692ce 7ac2e8 c6ecfa | 18382c 246e6c 3e9c92 70cab8 c6ecfa fcf6e8 | 24522e 367634 52983a 78ba48 a6d460 f8eabe |
| cindrip | 3a1e60 6e222a d2608c daa2ba f6a0ba ecdec4 | 6e222a a23432 d05440 f08868 deb478 f8eabe | 6e222a d46616 eea23c fcd668 f8eabe fcf6e8 |
| emberlunx | 3a1e60 6e222a d2608c daa2ba f6a0ba ecdec4 | 6e222a a23432 d05440 f08868 deb478 f8eabe | 6e222a d46616 eea23c fcd668 f8eabe fcf6e8 |
| forgeharrow | 3a1e60 6e222a d2608c daa2ba f6a0ba ecdec4 | 6e222a a23432 d05440 f08868 deb478 f8eabe | 6e222a d46616 eea23c fcd668 f8eabe fcf6e8 |
| rillop | 3a1e60 30488c 4a70ba 4692ce 7ac2e8 c6ecfa | 1e4078 2c64a8 3e9c92 7ac2e8 c6ecfa fcf6e8 | 246e6c 3e9c92 70cab8 c6ecfa fcf6e8 fcf6e8 |
| brookhorn | 3a1e60 30488c 4a70ba 4692ce 7ac2e8 c6ecfa | 1e4078 2c64a8 3e9c92 7ac2e8 c6ecfa fcf6e8 | 246e6c 3e9c92 70cab8 c6ecfa fcf6e8 fcf6e8 |
| tidemarrow | 3a1e60 30488c 4a70ba 4692ce 7ac2e8 c6ecfa | 1e4078 2c64a8 3e9c92 7ac2e8 c6ecfa fcf6e8 | 246e6c 3e9c92 70cab8 c6ecfa fcf6e8 fcf6e8 |
| sailquill | 3a1e60 6e222a d2608c daa2ba f6a0ba ecdec4 | 6e222a a23432 d05440 f6a0ba f8eabe fcf6e8 | a23432 d05440 f08868 fcd668 f8eabe fcf6e8 |
| halovy | 3a1e60 6e222a d2608c daa2ba f6a0ba ecdec4 | 3a1e60 6e222a a23432 d2608c f6a0ba fcf6e8 | 6e222a a23432 d2608c f6a0ba f8eabe fcf6e8 |
| gloamtick | 3a1e60 6e222a d2608c daa2ba f6a0ba ecdec4 | 6e222a a23432 d05440 f08868 deb478 f8eabe | 6a3019 9f4013 e29d40 fcd668 f8eabe fcf6e8 |
| runeskein | 3a1e60 6e222a d2608c daa2ba f6a0ba ecdec4 | 3a1e60 6e222a a23432 d2608c f6a0ba fcf6e8 | 2c1a12 561c0e 6e222a a23432 d2608c f6a0ba |
| burlbeetle | 3a1e60 30488c 4a70ba 4692ce 7ac2e8 c6ecfa | 18382c 246e6c 3e9c92 70cab8 c6ecfa fcf6e8 | 38683e 52983a 78ba48 a6d460 f8eabe fcf6e8 |
| mirewump | 3a1e60 30488c 4a70ba 4692ce 7ac2e8 c6ecfa | 1e4078 2c64a8 4692ce 7ac2e8 c6ecfa fcf6e8 | 2c64a8 4692ce 7ac2e8 c6ecfa fcf6e8 fcf6e8 |
| slagrook | 3a1e60 6e222a d2608c daa2ba f6a0ba ecdec4 | 6e222a d05440 f08868 deb478 e8ce92 f8eabe | c46e2e eea23c fcd668 f8eabe fcf6e8 fcf6e8 |

The ramps were designed by hand. Automatic colour interpolation snapped to the 64-colour palette produced muddy greys. Lightness stays monotonic dark → light within every stage, and any violet step that covers ≥10% of a creature's crystal pixels changes at every stage. The one accepted exception: brookhorn's brightest highlight `f4e2ff` is near-white in both stage 2 and stage 3.

## Validation (done by `build.py` / `previews.py`)

- 0 pixels outside the masks change, for every stage and every sprite (checked again in `_preview/warmth_diff_check.png`).
- Every output colour is in `palette.hex`, and stage 0 is identity.
- Every masked pixel is one of the six source violets.
- Masks are consistent across idle/walk frames: each frame's crystal pixel count is within 0.75–1.33× its key frame.

## Previews (`_preview/`, not for runtime)

- `warmth_all_2x.png`: every creature's battle front at 2x, stages 0–3 side by side, with the ramp swatches.
- `warmth_battle_fronts.gif`: all 16 battle fronts (idle animating), stepping 0→1→2→3→2→1.
- `warmth_overworld_walk_3x.gif`: all 16 Trail Buddy walk cycles at 3x on grass, stepping through the stages.
- `warmth_bastonox_2x.gif`, `warmth_gloamtick_2x.gif`: single-creature close-ups.
- `warmth_overworld_check_1..4.png`: overworld stand frames (4 directions) at true 1x size plus 2x, all stages, on grass, for readability.
- `warmth_diff_check.png`: red marks every pixel that differs between stage 3 and stage 0.

## Caveats / known limits

- **No party/menu icon art exists** in the repo, so there are no icon masks. If the party icon is derived from an existing sprite (e.g. `ow_down_stand` or the battle front), reuse that sprite's mask. If new icon art is drawn, it needs a mask (rerun `build.py` after adding an override if needed).
- **Some sprites show no crystal at all**, so they cannot show Warmth: the `ow_down` (facing camera) stand/walk frames of tumbloam, burrowmane, cindrip, emberlunx, brookhorn, sailquill and slagrook (crystal is on the tail/back). These are listed under `sprites_without_visible_crystal` in the JSON. Other directions do show it.
- **Tiny crystals at overworld size**: cindrip ow left/right (4–5 px tail tip), sailquill ow_up (3 px), halovy ow (7–10 px halo ends), gloamtick ow lantern. The change is visible in the previews but subtle at 1x.
- **Violet that is not crystal stays violet** by design: tidemarrow's wing membranes, rillop/brookhorn dorsal fins, sailquill's crest stripe, tumbloam's shell seams, the gloamtick tail smoke and lantern cap, and eyes/glints. Tidemarrow in particular still reads quite violet at stage 3 because its wings are large. If Gary wants those to warm too, that is a mask/design change, not a data change.
- **Mask judgement calls** (in `tools/overrides.py`): gloamtick's crystal = lantern core + glass panes; tidemarrow's = antler beads + tail tip; sailquill's = streamer beads; rillop ow_down includes the tail tip that peeks between its legs.
- **Moss stage 3 on grass**: the Earth line's green crystals sit on green grass in the overworld. They still read because the crystal is lighter and sits on a grey shell, but the contrast is lower than on battle backgrounds.
- **Fire line**: ember orange is close to the lava-crack colour, so stage 3 adds a white-hot yellow core to keep the gems distinct.
- The Cosmic/silver crystal described in the playbook is not covered because no sprites for it exist yet.
- Palette: everything fits in the existing 64 colours. See the optional proposals below.

## Optional palette proposals for World Design (not required, not added)

The palette has a hue gap between violet (H≈305°) and rose (H≈351°), and only two periwinkles. Stage 1 therefore jumps from violet straight to rose or blue. If World Design wants smoother stage-1 transitions, a small bridge would help:
- plum/magenta ~H330: e.g. `#7a2a6e`, `#b04a9a`, `#d27ac8`
- a mid periwinkle ~H245: e.g. `#5a5ac8`

The current data does not use these.
