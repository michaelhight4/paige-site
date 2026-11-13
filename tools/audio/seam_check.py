#!/usr/bin/env python3
"""Loop-seam check on the SHIPPED (encoded) loops (Oct 22, 2026). Decodes each file with ffmpeg to float, then compares
the wrap step |first - last| with the loop's own sample-to-sample steps: the wrap must be no bigger than the 99.9th
percentile step (i.e. no click), the decoded length must match the expected loop length, and there must be no leading
silence (AAC priming gap). Usage: python3 tools/audio/seam_check.py [files...]   (exit 1 on any failure)"""
import subprocess, sys, json
import numpy as np
EXPECT = {'town': 28.8, 'route': 29.09, 'battle': 25.26, 'saltmere': 68.571, 'aurelith': 61.936, 'revival_heights': 72.0}
files = sys.argv[1:] or [f'audio/music/kil_draft_{i}.{e}' for i in EXPECT for e in ('ogg', 'm4a')]
bad = 0
for f in files:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-f', 'f32le', '-ac', '2', '-ar', '44100', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype='<f4').reshape(-1, 2)
    steps = np.abs(np.diff(x, axis=0)).max(axis=1)
    wrap = float(np.abs(x[0] - x[-1]).max()); p999 = float(np.percentile(steps, 99.9)); mean = float(steps.mean())
    lead = int(np.argmax(np.abs(x).max(axis=1) > 1e-4)); sec = len(x) / 44100
    exp = next((v for k, v in EXPECT.items() if k in f), None)
    ok = wrap <= p999 and lead / 44.1 < 5 and (exp is None or abs(sec - exp) < 0.025)
    bad += not ok
    print(json.dumps({'file': f, 'sec': round(sec, 3), 'leadMs': round(lead / 44.1, 1), 'wrapJump': round(wrap, 4), 'meanStep': round(mean, 4), 'p999Step': round(p999, 4), 'ratioToMean': round(wrap / mean, 2), 'loopClean': ok}))
print('SEAM', 'FAIL' if bad else 'PASS'); sys.exit(1 if bad else 0)
