# Kilumen audio: placeholders still waiting for real audio

Libs pass, Oct 22, 2026. **Every sound in the game right now is a placeholder.** Music is a seeded triangle-wave
loop that `synthTrack()` builds in src/audio/audio.js. Effects are ZzFX tones (`SFX` in audio.js). No audio files
ship yet. To swap in real audio, give `music()` a file URL per track id (howler takes mp3/ogg/webm/m4a) and swap
each `SFX` entry for a howler sprite or file. Ids, hooks and volumes stay the same.

## DRAFT audio on top (wave 2, Oct 22, 2026; Gary can veto)
Three original DRAFT loops and a DRAFT SFX sprite now cover some slots. They are drafts, not final audio.
- **Revert in one line:** in src/audio/audio.js set `DRAFT_AUDIO = { music: false, sfx: false }` (or veto just one
  half). Everything then goes back to the placeholders below, unchanged.
- **Music** (`DRAFT_MUSIC` in audio.js): `audio/music/kil_draft_{town,route,battle}.ogg` with an `.m4a` (AAC)
  fallback for older iPhone Safari.
  - town (28.8 s): brookhollow, fernwick, lanternport (day and night).
  - route (29.1 s): route.*, sunmeadow_fields, thornwood (day and night).
  - battle (25.3 s): plays while any battle screen (`.ui-battle`) is up. This is new: battle had no music before.
  - All other track ids (indoors, cave, greystone, mirefen, unbuilt zones) still use the generated placeholder.
- **SFX** (`DRAFT_SFX_SPRITE`): one 2.8 s sprite, `audio/sfx/kil_sfx_draft.ogg` / `.m4a`, holding all 7 ids. The
  ZzFX tones stay as the fallback until the sprite decodes, or if it fails.
- Sources and the rebuild steps are in audio/src/ (BeepBox JSON plus an editor URL per loop) and tools/audio/. See
  /workspace/quality/toolkit/MUSIC_SFX_PIPELINE.md.

## How music is chosen (`trackFor`)
- `heal_*` maps → `heal_centre`.
- `greystone*` maps → `cave`.
- `home_*` and `house_*` maps → `home`.
- Other indoor maps (clock.js `isIndoor`) → `interior`.
- Outdoors → `<zone>.day` at dawn and day, `<zone>.night` at dusk and night.
- Maps with no zone → `route.day` / `route.night`.
- Changing track crossfades: 1500 ms on PC, 1000 ms on mobile (pc.json / mobile.json `audio.crossfadeMs`).

## Music tracks (32)
| Track id | Used now? | Notes |
|---|---|---|
| home, interior, heal_centre, cave | yes | indoor / cave beds (no day/night split) |
| route.day, route.night | fallback | outdoor map with no zone in world_layout |
| brookhollow.day / .night | yes | town |
| fernwick.day / .night | yes | town |
| sunmeadow_fields.day / .night | yes | route1 |
| thornwood.day / .night | yes | |
| greystone_caverns.day / .night | yes | lantern_rest (the cave floors use `cave`) |
| mirefen.day / .night | yes | mirefen_bog |
| lanternport.day / .night | yes | town (its houses use `home`) |
| saltmere.day / .night | not yet | zone has no maps |
| cindervale.day / .night | not yet | zone has no maps |
| revival_heights.day / .night | not yet | zone has no maps |
| aurelith.day / .night | not yet | zone has no maps |
| tidewater_coast.day / .night | not yet | zone has no maps |
| frostspire.day / .night | not yet | zone has no maps |

Battle music: DRAFT `battle` loop (above), picked up from the `.ui-battle` element, so there are no hooks in src/battle.
Not in the list yet (no hook exists): title screen, jingles (level up, catch, heal), weather beds and ambience loops.

## Sound effects (7)
| Id | Fires on | Notes |
|---|---|---|
| cursor | menu cursor moves (ui.js `_select`; hover stays silent) | |
| select | menu confirm (ui.js `_activate`) | |
| back | menu back / close (ui.js `back`) | |
| door | every door-cell warp: doors, mats and stairs (overworld.js `startWarp`, kind door) | not on map-edge exits |
| grass | player steps into grass (overworld.js `onStepStart`, rustle branch) | |
| blip | dialogue text reveal (dialog.js `onPage` → `audio.blip`): one blip per 3 characters (PC) or 4 (mobile), max 24 per page; one blip when motion is reduced | |
| save | manual save from the menu Save screen only; autosave stays silent | |

Volumes and mute live in Options (Sound, Volume, Music volume, Effects volume). They are saved per platform in
localStorage `kilumen.audio.pc` / `kilumen.audio.mobile`. Defaults come from src/platform/pc.json and
mobile.json (`audio`).
