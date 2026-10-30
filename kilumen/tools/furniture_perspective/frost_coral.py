#!/usr/bin/env python3
"""i_plant_frost_coral (id 7501, i_furniture col 6 row 24): Frostspire's 'frost coral' (Text Bot line heal_frostspire_plant_coral).
The pink i_plant_coral recoloured to ice (pale cyan tips, blue-grey shade, white glints), same pot, outline and shadow,
so it stays on the shared projection. Written per scale from that scale's own coral cell (no resampling). Idempotent."""
import json, os, colorsys
from PIL import Image
OW = os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'world', 'overworld')
SRC, DST, ID = (12, 6), (6, 24), 7501
def ice(px):
    r, g, b, a = px
    if a == 0: return px
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if not (s > 0.25 and (h > 0.85 or h < 0.04 or 0.1 < h < 0.18)): return px      # only the pink coral + its yellow dots
    if 0.1 < h < 0.18: return (236, 250, 255, a)                                      # dots -> frost glints
    nl = min(0.93, 0.05 + 1.3 * l ** 1.6)                                                # keep the dark outline dark
    r2, g2, b2 = colorsys.hls_to_rgb(0.55, nl, 0.45)
    return (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
for sheet in ('i_furniture_v3', 'i_furniture'):
    for s, k in ((1, '1x'), (2, '2x'), (3, '3x')):
        f = f'{OW}/interiors_new/tiles_{k}/{sheet}.png'
        if not os.path.exists(f): continue
        im = Image.open(f).convert('RGBA'); T = 64 * s
        c = im.crop((SRC[0] * T, SRC[1] * T, SRC[0] * T + T, SRC[1] * T + T)); c.putdata([ice(p) for p in list(c.getdata())])
        im.paste(c, (DST[0] * T, DST[1] * T)); im.save(f); im.save(f[:-4] + '.webp', lossless=True)
for f, k in (('tileset.json', '1x'), ('tileset_2x.json', '2x'), ('tileset_3x.json', '3x')):
    p = f'{OW}/{f}'; d = json.load(open(p)); d['tiles'] = [t for t in d['tiles'] if t['id'] != ID]
    base = next(t for t in d['tiles'] if t['name'] == 'i_plant_coral')
    d['tiles'].append({**base, 'id': ID, 'name': 'i_plant_frost_coral', 'index': DST[1] * 16 + DST[0], 'col': DST[0], 'row': DST[1]})
    d['tiles'].sort(key=lambda t: t['id']); open(p, 'w').write(json.dumps(d))
M = f'{OW}/maps/heal_frostspire.json'; d = json.load(open(M)); n = 0
for row in d['layers']['decoration']:
    for i, v in enumerate(row):
        if v == 7219: row[i] = ID; n += 1
for sp in d.get('text_pending', {}).get('interact_spots', []):
    if sp.get('tile') == 'i_plant_coral': sp['tile'] = 'i_plant_frost_coral'
open(M, 'w').write(json.dumps(d, indent=1, ensure_ascii=False) + '\n'); print('frostspire cells swapped', n)
