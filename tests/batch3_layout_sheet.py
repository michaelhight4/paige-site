# Before/after contact sheet for tests/batch3_layout_check.mjs (Oct 22, 2026 layout fix).
# Usage: python3 tests/batch3_layout_sheet.py [before_dir]   (default /tmp/kil_b3/layout_before; after = shots/batch3/layout)
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
A = os.path.join(ROOT, 'shots', 'batch3', 'layout')
B = sys.argv[1] if len(sys.argv) > 1 else '/tmp/kil_b3/layout_before'
rows = [r for r in json.load(open(os.path.join(A, 'layout.json'))) if r.get('mode') == 'dlg_toast']
TW = 520
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)
except Exception: font = ImageFont.load_default()
def tile(p):
    im = Image.open(p).convert('RGB'); s = TW / im.width
    return im.resize((TW, round(im.height * s)), Image.LANCZOS)
pairs = []
for r in rows:
    b = os.path.join(B, r['file'])
    pairs.append((tile(b) if os.path.exists(b) else None, tile(os.path.join(A, r['file'])), r))
rh = [max((p[0].height if p[0] else 0), p[1].height) + 44 for p in pairs]
sheet = Image.new('RGB', (2 * (TW + 20) + 10, sum(rh) + 50), (24, 20, 32)); d = ImageDraw.Draw(sheet)
d.text((10, 12), 'Kilumen layout fix (Oct 22 2026), dialogue + toast + battle image.  left: before   right: after', fill=(255, 250, 240), font=font)
y = 45
for (b, a, r), h in zip(pairs, rh):
    if b: sheet.paste(b, (10, y))
    sheet.paste(a, (TW + 30, y))
    c = r.get('checks') or {}; hits = {k: v for k, v in c.items() if k.endswith('Buttons') and v}
    d.text((10, y + a.height + 4), f"{r['plat']} {r['w']}x{r['h']} dpr{r['dpr']}  toast z {r.get('toastZ')}  battle {r.get('battle') and round(r['battle']['h'])}px tall  x{round(c.get('battleDeviceScale') or 0, 2)}  button hits {hits or 'none'}", fill=(230, 225, 240), font=font)
    y += h
out = os.path.join(A, 'layout_contact_sheet.png'); sheet.save(out); print(out, sheet.size)
