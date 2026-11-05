# Boundwake music beds

Original instrumental compositions (written note-by-note in Python/pretty_midi, rendered with FluidSynth + FluidR3_GM soundfont, MIT-licensed). No samples or external MIDI. Sources: `/workspace/boundwake/music_src/compose.py` (+ .mid files).

| File | Duration | BPM / Key | Use |
|---|---|---|---|
| hub_life.ogg / .mp3 | ~44.3 s (17 bars) | 92 BPM, G major | Hub / village / life turns |
| adventure_travel.ogg / .mp3 | ~44.4 s (20 bars) | 108 BPM, A major | Travel, guild/adventure, realm roads |
| dusk_night.ogg / .mp3 | ~30.0 s (9 bars) | 72 BPM, D major | Dusk / night, lantern-lit vale |

Instruments: harp, nylon guitar, flute, clarinet, strings, cello/bass, light hand percussion (dusk adds soft vibraphone).

## Looping
Loop the whole file (`audio.loop = true`). Each file is exactly N bars; the render was cut from the middle of a 3x pass, so the reverb tail from the end is already baked into the start — the loop is seamless. Edges have a 12 ms fade only.
Prefer `.ogg` (exact length, gapless); `.mp3` adds ~40 ms encoder padding that may cause a tiny gap in `<audio>` loops — for MP3 use Web Audio `AudioBufferSourceNode.loop` or fall back to OGG. Crossfade 1–2 s when switching between tracks.
