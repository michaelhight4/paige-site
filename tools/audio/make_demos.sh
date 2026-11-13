#!/usr/bin/env bash
# Audition files for Gary (not shipped): shots/wave2_audio/<id>_x2.ogg (loop played twice, so the wrap point is audible
# at the midpoint), plus .mp4 (H.264 + AAC) and .webm (VP9 + Opus) with a still card, and an SFX run-through.
# Oct 22, 2026: SUFFIX + LEVEL render the demos at the game's DEFAULT playback level instead of file level, without
# touching the earlier set:  SUFFIX=_v2 LEVEL=pc bash tools/audio/make_demos.sh  -> <id>_v2.mp4 etc. LEVEL=pc|mobile
# reads master x music / master x sfx from src/platform/<LEVEL>.json "audio" (what a fresh install plays). LEVEL unset =
# file level (the original wave 2 demos). WEBM=0 skips the .webm copies.
set -euo pipefail
cd "$(dirname "$0")/../.."
SUFFIX="${SUFFIX:-}"; LEVEL="${LEVEL:-}"; WEBM="${WEBM:-1}"; MG=1; SG=1; LVL=""
D=shots/wave2_audio; T=/tmp/kil_audio_build/demo$SUFFIX; mkdir -p "$D" "$T"
if [ -n "$LEVEL" ]; then
  read -r MG SG <<<"$(node -e "const a=JSON.parse(require('fs').readFileSync('src/platform/$LEVEL.json','utf8')).audio;console.log((a.master*a.music).toFixed(4),(a.master*a.sfx).toFixed(4))")"
  LVL="Game default ($LEVEL): music x$MG, effects x$SG  -  as a fresh install plays it"
fi
declare -A INFO=([town]="Town loop  -  F major, 100 BPM, 12 bars, 28.8 s" [route]="Route loop  -  D major, 132 BPM, 16 bars, 29.1 s" [battle]="Battle loop  -  A minor, 152 BPM, 16 bars, 25.3 s" [sfx]="SFX sprite  -  cursor, select, back, door, grass, blip, save")
card() { # $1 id, $2 audio file
  ffmpeg -loglevel error -y -i "$2" -lavfi "showwavespic=s=1600x360:colors=#7fd1ff|#ffd27f:split_channels=1" -frames:v 1 "$T/$1_wave.png"
  python3 - "$1" "${INFO[$1]}" "$T/$1_wave.png" "$T/$1_card.png" "$LVL" <<'PY'
import sys
from PIL import Image, ImageDraw, ImageFont
id_, info, wave, out, lvl = sys.argv[1:]
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf'
im = Image.new('RGB', (1920, 1080), (18, 22, 34)); d = ImageDraw.Draw(im)
d.text((160, 120), 'Kilumen  -  DRAFT audio (Gary can veto)', font=ImageFont.truetype(F % '-Bold', 56), fill=(255, 214, 120))
d.text((160, 210), info, font=ImageFont.truetype(F % '', 44), fill=(230, 236, 255))
sub = 'Played twice: the loop point is at the exact middle.' if id_ != 'sfx' else 'Each sound twice, 0.5 s apart. Original jsfxr parameter sets.'
d.text((160, 280), sub, font=ImageFont.truetype(F % '', 34), fill=(160, 176, 210))
if lvl: d.text((160, 330), lvl, font=ImageFont.truetype(F % '', 30), fill=(140, 230, 160))
w = Image.open(wave).convert('RGB'); im.paste(w, (160, 400))
if id_ != 'sfx': d.line([(960, 380), (960, 780)], fill=(255, 110, 110), width=4); d.text((975, 790), 'loop point', font=ImageFont.truetype(F % '', 28), fill=(255, 140, 140))
d.text((160, 940), 'Made with BeepBox (MIT) / jsfxr (Unlicense) as offline tools. Original music, local only, Oct 22, 2026.', font=ImageFont.truetype(F % '', 26), fill=(120, 132, 160))
im.save(out)
PY
  local dur; dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$2") # -t: -shortest alone left ~30 s of silent still
  ffmpeg -loglevel error -y -loop 1 -framerate 2 -t "$dur" -i "$T/$1_card.png" -i "$2" -c:v libx264 -tune stillimage -pix_fmt yuv420p -c:a aac -b:a 128k -shortest -movflags +faststart "$D/$1$SUFFIX.mp4"
  [ "$WEBM" = 0 ] || ffmpeg -loglevel error -y -loop 1 -framerate 2 -t "$dur" -i "$T/$1_card.png" -i "$2" -c:v libvpx-vp9 -b:v 0 -crf 40 -c:a libopus -b:a 96k -shortest "$D/$1$SUFFIX.webm"
  cp "$T/$1_card.png" "$D/$1${SUFFIX}_still.png"
}
for id in town route battle; do
  ffmpeg -loglevel error -y -stream_loop 1 -i "audio/music/kil_draft_$id.ogg" -af "volume=$MG" -c:a libvorbis -q:a 4 "$D/${id}${SUFFIX}_x2.ogg"
  card "$id" "$D/${id}${SUFFIX}_x2.ogg"
done
# SFX: each sprite slice twice with 0.5 s gaps
python3 - "$SG" "$D/sfx${SUFFIX}_run.ogg" <<'PY'
import json, subprocess, sys
sg, dst = sys.argv[1:]
m = json.load(open('audio/sfx/kil_sfx_draft.json'))['sprite']
parts = []
for k, (o, d) in m.items():
    for _ in range(2): parts.append(f"atrim={o/1000}:{(o+d)/1000},asetpts=PTS-STARTPTS,apad=pad_dur=0.5")
fc = ';'.join(f"[0:a]{p}[a{i}]" for i, p in enumerate(parts)) + ';' + ''.join(f"[a{i}]" for i in range(len(parts))) + f"concat=n={len(parts)}:v=0:a=1,volume={sg}[o]"
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', 'audio/sfx/kil_sfx_draft.ogg', '-filter_complex', fc, '-map', '[o]', '-c:a', 'libvorbis', '-q:a', '4', dst], check=True)
PY
card sfx "$D/sfx${SUFFIX}_run.ogg"
ls -l "$D"
