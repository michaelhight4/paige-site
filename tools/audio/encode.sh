#!/usr/bin/env bash
# Encode rendered WAVs (from render_beepbox.mjs / make_sfx.mjs) into the shipped formats. Needs ffmpeg (libvorbis + aac).
#   OGG Vorbis = primary (Chrome, Firefox, Android, Safari 17+ / iOS 17+); M4A AAC = fallback for older iPhone Safari.
# Usage: bash tools/audio/encode.sh   (reads /tmp/kil_audio_build or $OUT)
set -euo pipefail
cd "$(dirname "$0")/../.."
IN="${OUT:-/tmp/kil_audio_build}"
# Loudness (Oct 22, 2026, after Gary's "seems a little loud"): music is normalised to MUSIC_LUFS integrated (default
# -16) with ONE linear gain per loop (ffmpeg volume=, no limiter or compressor), so the loop seam stays sample-continuous.
# The renderer's -1 dBFS peak normalise left the loops at -11 to -12 LUFS with true peaks above -1 dBTP (route.m4a
# reached +1.2 dBTP). Check with: bash tools/audio/loudness.sh
MUSIC_LUFS="${MUSIC_LUFS:--16}"
lufs() { ffmpeg -nostats -hide_banner -i "$1" -af ebur128 -f null - 2>&1 | awk '/Summary/{s=1} s && /I:/{print $2; exit}'; }
for id in town route battle saltmere aurelith revival_heights; do
  [ -f "$IN/$id.wav" ] || continue
  I=$(lufs "$IN/$id.wav"); G=$(awk -v t="$MUSIC_LUFS" -v i="$I" 'BEGIN{printf "%.2f", t - i}')
  echo "$id: wav $I LUFS -> gain ${G} dB -> target $MUSIC_LUFS LUFS"
  ffmpeg -loglevel error -y -i "$IN/$id.wav" -map_metadata -1 -af "volume=${G}dB" -c:a libvorbis -q:a 2 "audio/music/kil_draft_$id.ogg"
  ffmpeg -loglevel error -y -i "$IN/$id.wav" -map_metadata -1 -af "volume=${G}dB" -c:a aac -b:a 96k -movflags +faststart "audio/music/kil_draft_$id.m4a"
done
if [ -f "$IN/kil_sfx_draft.wav" ]; then
  ffmpeg -loglevel error -y -i "$IN/kil_sfx_draft.wav" -map_metadata -1 -c:a libvorbis -q:a 3 audio/sfx/kil_sfx_draft.ogg
  ffmpeg -loglevel error -y -i "$IN/kil_sfx_draft.wav" -map_metadata -1 -c:a aac -b:a 64k -movflags +faststart audio/sfx/kil_sfx_draft.m4a
fi
ls -l audio/music audio/sfx
