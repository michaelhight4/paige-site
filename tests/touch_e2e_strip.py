"""Frame strip per engine for tests/touch_e2e.mjs: shots/touch_e2e/<engine>_strip.png (frames listed in report.json)."""
import json, os
from PIL import Image, ImageDraw
OUT = os.path.join(os.path.dirname(__file__), '..', 'shots', 'touch_e2e')
rep = json.load(open(os.path.join(OUT, 'report.json')))
for r in rep:
    ims = [(f, Image.open(os.path.join(OUT, f)).convert('RGB')) for f in r['frames']]
    TH = 200  # same height for every frame (the portrait frame is narrow)
    th = [(f, im.resize((round(im.width * TH / im.height), TH))) for f, im in ims]
    H = TH + 22
    sheet = Image.new('RGB', (sum(t.width for _, t in th) + 6 * (len(th) + 1), H + 34), (24, 24, 28))
    d = ImageDraw.Draw(sheet)
    ok = sum(x['ok'] for x in r['results'])
    d.text((6, 6), f"{r['engine']}  {r['device']}  holds via {r['touch']}  {'PASS' if r['pass'] else 'FAIL'} {ok}/{len(r['results'])}", fill=(230, 230, 230))
    x = 6
    for f, t in th:
        sheet.paste(t, (x, 26))
        d.text((x, 30 + t.height), f.split('_', 2)[-1].rsplit('.', 1)[0], fill=(200, 200, 200))
        x += t.width + 6
    p = os.path.join(OUT, f"{r['engine']}_strip.png"); sheet.save(p); print(p, sheet.size)
