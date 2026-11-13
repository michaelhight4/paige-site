# Soul pass (SOUL_PLAYBOOK): animator deliverables

| item | folder | readme |
|---|---|---|
| #2 Spotted! | `spotted/` | `spotted/README.md` |
| #5 Battle hit feedback and transitions | `battle_feedback/` | `battle_feedback/README.md` |
| #6 Trail Buddy | `trail_buddy/` | `trail_buddy/README.md` |
| #12 Ambient life | `ambient/` | `ambient/README.md` |
| #15 Lap nap | `lap_nap/` | `lap_nap/README.md` |

All art is 64px-grid pixel art on the shared 64-colour palette (`art/world/overworld/palette.png`), with alpha 0/255 only.
Original designs, no external references. Nothing is wired into the game. Coder hooks are described in each README / `hook_specs.json`.

## Tools (`_tools/`)

* `soul_lib.py`: shared helpers (palette, loaders, write_anim, previews, world render via preview_util).
* `gen_spotted.py`, `gen_battle_feedback.py`, `gen_trail_buddy.py`, `gen_ambient.py`, `gen_lap_nap.py`: generators.
* `validate_soul.py`: palette/alpha, sizes per kind, frame counts, exact 2x, sheet = concatenated frames, no stray frames.
* `write_manifest.py`: read-merge-write of `_parts/animator_manifest.json`. It replaces only the `soul` key.
* `write_readmes.py`: these READMEs.
* `build_all.py`: runs everything in order (about 15 min; previews read the live world tileset).
