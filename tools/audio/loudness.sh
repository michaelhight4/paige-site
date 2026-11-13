#!/usr/bin/env bash
# Loudness report (Oct 22, 2026): integrated LUFS, sample peak and true peak (ffmpeg ebur128) for every shipped draft
# file, or for the files given as arguments. Targets: music -16 LUFS integrated, true peak <= -1 dBTP; SFX sprite peaks
# <= -1 dBTP with the per-sound tiers from make_sfx.mjs. Usage: bash tools/audio/loudness.sh [files...]
set -euo pipefail
cd "$(dirname "$0")/../.."
FILES=("$@"); [ ${#FILES[@]} -gt 0 ] || FILES=(audio/music/kil_draft_{town,route,battle,saltmere,aurelith,revival_heights}.{ogg,m4a} audio/sfx/kil_sfx_draft.{ogg,m4a})
printf '%-44s %10s %12s %10s\n' file 'I (LUFS)' 'sample pk' 'true pk'
for f in "${FILES[@]}"; do
  ffmpeg -nostats -hide_banner -i "$f" -af ebur128=peak=true+sample -f null - 2>&1 | awk -v f="$f" '
    /Summary/{s=1} s && /I:/{i=$2} s && /Sample peak:/{sp=1} s && /True peak:/{tp=1}
    s && /Peak:/{ if (tp) t=$2; else if (sp) p=$2 }
    END{ printf "%-44s %10s %10s dBFS %7s dBTP\n", f, i, p, t }'
done
