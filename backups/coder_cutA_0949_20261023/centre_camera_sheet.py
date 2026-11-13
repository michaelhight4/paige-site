# Centre camera contact sheet: before | after per corner, pc 1920x1080 and phone 932x430@3 (+ extras). Usage: python3 tests/centre_camera_sheet.py [suffix]
import json, sys, os
from PIL import Image, ImageDraw
D = 'shots/centre_camera'; SUF = sys.argv[1] if len(sys.argv) > 1 else ''
TW = 360
rep = {t: {(r['view'], r['scene']): r for r in json.load(open(f'{D}/{t}/report.json'))} for t in ['before', 'after']}
views = ['pc1920x1080', 'ph932x430@3', 'ph844x390@3']
scenes = [f'{m}_{c}' for m in ['brookhollow', 'route1', 'greystone_b1'] for c in ['tl', 'tr', 'bl', 'br']] + ['x_night_clouds_brookhollow_tl', 'x_rain_route1_br', 'x_interior_home_a', 'x_interior_heal']
cells = []
for s in scenes:
    row = []
    for v in views:
        for t in ['before', 'after']:
            r = rep[t].get((v, s))
            row.append((t, v, s, r))
    cells.append(row)
th = int(TW * 1080 / 1920) + 34
W = len(cells[0]) * (TW + 6) + 6; H = len(cells) * (th + 6) + 46
sheet = Image.new('RGB', (W, H), (24, 22, 30)); d = ImageDraw.Draw(sheet)
d.text((8, 8), f'Kilumen centre camera (Oct 23, 2026){SUF}: BEFORE (clamped) | AFTER (alwaysCentre). red cross = screen centre. err = player tile centre - screen centre (device px); ov = touch buttons over player', fill=(240, 240, 240))
for i, row in enumerate(cells):
    for j, (t, v, s, r) in enumerate(row):
        x, y = 6 + j * (TW + 6), 40 + i * (th + 6)
        if not r or 'file' not in r:
            d.text((x + 4, y + 4), f'{t} {v} {s}: n/a', fill=(150, 150, 150)); continue
        im = Image.open(f'{D}/{t}/{r["file"]}').convert('RGB'); k = TW / im.width
        im = im.resize((TW, int(im.height * k)), Image.NEAREST)
        dd = ImageDraw.Draw(im); cx, cy = TW // 2, im.height // 2
        dd.line((cx - 8, cy, cx + 8, cy), fill=(255, 0, 0)); dd.line((cx, cy - 8, cx, cy + 8), fill=(255, 0, 0))
        sheet.paste(im.crop((0, 0, TW, th - 34)), (x, y))
        e = r['centreErrPx']; ok = max(abs(e[0]), abs(e[1])) <= 1 and not r['overlaps']
        d.text((x + 2, y + th - 32), f'{t.upper()} {v} {s}', fill=(255, 255, 255))
        d.text((x + 2, y + th - 17), f'err {e[0]:.0f},{e[1]:.0f} ov {",".join(r["overlaps"]) or "-"} black {r["blackShare"]:.3f}', fill=(120, 230, 120) if ok else (255, 120, 120))
out = f'{D}/contact_sheet{SUF}.png'; sheet.save(out); print(out, sheet.size)
