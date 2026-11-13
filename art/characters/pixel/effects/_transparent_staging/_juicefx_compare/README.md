# JuiceFX vs Aseprite/pipeline — 2026-10-30 (CT)

**JuiceFX result: not tested on the art. It cannot run headless.** JuiceFX (Steam, `C:\Program Files (x86)\Steam\steamapps\common\JuiceFX\JuiceFX.exe`)
is a GameMaker GUI app: no command-line flags, no batch mode in documentation.html; its .jpf presets are only loaded through the GUI,
and its export goes through a bundled ImageMagick `convert.bat`. Nothing could be driven unattended on Gary's PC, so no JuiceFX frames exist to compare.

Quality call per effect (rule: JuiceFX replaces only where equal or better):
- **fire: keep Aseprite/pipeline.** JuiceFX output unavailable, so it can't be shown equal or better. Its presets (squash, shine, shake,
  outline, dissolve) transform a finished sprite and are not built for a fixed 64-colour palette or 1-bit alpha, so its output would need re-quantizing.
- **swamp: keep Aseprite/pipeline, with the night-rim fix.** Same reason. The night fix was done in the pipeline instead (light rim a6d460 + darker core G1b).

Swamp night readability (validator, threshold 0.5): impact 0.46 -> 0.597, travel_p2f 0.443 -> 0.558, travel_f2p 0.394 -> 0.525.
Files: swamp_*_night_before_vs_after.gif (left before, right after), swamp_night_before_vs_after_contact.png. Before backup: ../_swamp_prev_nightrim_20261030/.

Time: Aseprite CLI rebuild of 22 folders (164 frames) took 2.3 s in batch mode. The pipeline swamp rebuild took about 2 s, and the full validator about 5 s.
JuiceFX: the time can't be measured, because every effect would need manual GUI work plus re-quantizing.
