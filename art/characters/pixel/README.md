# Kilumen pixel character set (merged)
Status: awaiting Gary's approval, do not wire in yet.
- creatures/<name>/ : 16 creatures (9 starters, 7 wild): battle front/back, idles, 4-dir chibi overworld walk
- humans/<name>/ : Cal, Mira, Ron, Vane, Riverbank Stranger: trainer sprite, chibi walk, painted portraits; cal & mira also run_bike/
- effects/ : 23 element attack effects (to foe, to player, impact), by Animator; see effects/README.md
- manifest.json : merged index (parts: starters_humans, wild, animator)
Palette: /workspace/kilumen/art/world/overworld/palette.hex (shared 64)
Painted originals reserved for sequel: /workspace/art_library/painted_creatures_v1/

## Rule (Gary, Oct 22 2026)
Effects belong to SKILLS, never to creatures. Any creature using a skill plays that skill's same effect. Wire as skill -> effect id (currently one effect set per element); never per-creature.
