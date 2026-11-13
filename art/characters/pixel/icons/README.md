# Kilumen party icons (DRAFT, not approved by Gary, NOT wired in)

These are 32x32 party and menu icons for all 16 creatures. Each has 2 frames: f0 is at rest and f1 is the bob.
They follow the classic monster-battler layout (one small 2-frame icon per species in the party list). That is the only thing borrowed: every pixel here comes from Kilumen's own creature art.
No game code, data or atlas references these files yet. Wire them in only after Gary approves.

## Files
| Path | What |
|---|---|
| `<name>_icon_f0.png`, `<name>_icon_f1.png` | 32x32 native frames (plus `_2x`, `_3x` nearest-neighbour copies) |
| `<name>_icon_sheet.png` | 64x32 sheet: f0 on the left, f1 on the right (plus `_2x`, `_3x`) |
| `icons_sheet.png` + `icons_sheet.json` | 64x512 sheet for all creatures, one row each in alphabetical order. The JSON has rects, source sprite, bob type and crystal pixel counts |
| `icons_preview_3x.png` | Party-slot mock at 3x on the menu grey, f0 next to f1 |
| `icons_bob_3x.gif` | Bob loop for all 16 (260 ms per frame) |
| `_preview/icons_tod_warmth_check_2x.png` | Each icon over grass in dawn/day/dusk/night (sprite grade), at Warmth 0 and 3 |
| `_preview/icons_warmth_stages_3x.png` | All icons through Warmth stages 0-3 |
| `tools/` | Build scripts (`build_icons.py`, `icon_core.py`, `touchups.py`, `export.py`, `klib.py`) |

## How they were made
- **Source:** the front battle sprite, shrunk to fit 31x29 with the feet on row 30 and centred. The fire line (cindrip, emberlunx, forgeharrow) uses the overworld left-facing stand frame instead. Its side view reads better at 32 px, and the shrink keeps bright lava accents that plain averaging turned to mud.
- **Shrink:** a palette-aware box filter picks the nearest `palette.hex` colour per cell. Crystal cells are taken from the Warmth crystal mask so the crystal is never lost. Outlines and eyes are protected, then a despeckle pass removes lone pixels.
- **Hand touch-ups** (`tools/touchups.py`): eyes on cindrip, emberlunx, forgeharrow and halovy; a rebuilt 2x2 tail gem on cindrip and a 5 px gem on emberlunx so their crystals read at icon size.
- **Bob (f1):**
  - Grounded creatures: everything above a pivot row in the lower body moves down 1 px, so it squashes and the feet stay planted. The pivot row is chosen to avoid splitting a crystal.
  - Floaters (gloamtick, halovy): the whole sprite dips 1 px.
- **Every icon has a crystal.** The smallest is brookhorn's at 6 px. Counts are in `icons_sheet.json`.

## Crystal Warmth
- **Masks:** these use the same format as the existing ones (1-bit PNG, same size and filename as the sprite, 255 means crystal), at
  `art/characters/pixel/warmth/masks/<name>/icons/<name>_icon_f0.png` (and `_f1`, `_2x`, `_3x`, `_sheet`).
- **Data:** `warmth/masks/<name>/crystal_index.json` now lists the `icons/...` sprites and sheets. `warmth/warmth_tints.json` has an `icon_masks` entry per creature. The stage tints themselves are unchanged, because icons use the creature's existing stages.
- **Caveat:** `warmth/tools/build.py` rewrites `crystal_index.json` and `warmth_tints.json` from scratch, which drops the icon entries. If you run it, run `python3 icons/tools/build_icons.py all` afterwards. That step is idempotent and puts them back.
- The original versions of both files, from before the icon entries were added, are backed up in `/workspace/scratch/warmth_tints.backup.json` and `/workspace/scratch/warmth_idx_backup/`.

## Draw order
Cosmic swap (if Cosmic) → Crystal Warmth (inside the mask) → time-of-day **sprite** grade (`grades.json` `<phase>.sprite`, no lights). Same as every other creature sprite.

## Left for the Coder (timing only, no art needed) (SOUL_PLAYBOOK 5.4)
- Normal bob: 260 ms per frame.
- The lead (slot 1) icon bobs faster, for example 160 ms.
- Low-HP icons droop and bob slowly, for example 520 ms, or hold f1.
- Cosmic icons twinkle every 4 s. That is a VFX overlay, see `../cosmic/README.md`.
- Draw the icons at integer zoom with nearest-neighbour scaling.

## Checklist rules applied (`/workspace/quality/GAME_QUALITY_CHECKLIST.md`)
- **Palette:** palette.hex colours only. Alpha is 0 or 255 only, with no anti-aliasing. Integer-scaled copies only. The exporter validates all of these.
- **Anchor:** consistent, with the feet on row 30.
- **Variants:** a Cosmic icon is the same pixels with the swap applied, so its shading is kept.
- **Time of day:** checked in all 4 phases with the sprite grade, at Warmth 0 and 3. No new night glow.
- **Art in progress stays local:** not wired in, not pushed.
- **Review:** contact sheets were made and looked at before reporting.

## Known draft issues
- Under the night grade, the fire-line icons are very dark. Their overworld sprites are just as dark.
- At 32 px, brookhorn's and rillop's crystals are only a few pixels.
- Tidemarrow's wings and antlers fill the frame width, so its body is small.
