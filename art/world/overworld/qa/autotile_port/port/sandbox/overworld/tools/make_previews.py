# Documentation previews (run after run.py). Writes previews/before_after_tallgrass.png, chokepoint_*.png, roadblock_*.png, bike_path_*.png
import json, os, shutil
from PIL import Image
from preview_util import *
OUT = f'{BASE}/previews'; sil = silhouette()
byname = {t['name']: t['id'] for t in ts()['tiles']}
def side(*ims, gap=24):
    W = sum(i.width for i in ims) + gap * (len(ims) - 1); H = max(i.height for i in ims)
    o = Image.new('RGBA', (W, H), (26, 18, 38, 255)); x = 0
    for i in ims: o.paste(i, (x, 0)); x += i.width + gap
    return o
def gate_override(mapname, gid):
    m = json.load(open(f'{BASE}/maps/{mapname}.json')); g = next(g for g in m['story_gates'] if g['id'] == gid)
    return {('decoration', c['x'], c['y']): (byname[c['cleared_tile']] if c['cleared_tile'] else 0) for c in g['cells']}, g
# 1. tall grass before/after (BEFORE = archived render of the old tiles with the sprite pasted on top, as the old renderer did)
bp = '/workspace/tools_pre_tallgrass_backup/before.png' if os.path.exists('/workspace/tools_pre_tallgrass_backup/before.png') else '/tmp/ba/before.png'
before = Image.open(bp).convert('RGBA'); before.alpha_composite(x3(sil), ((16 - 13) * 192, (24 - 19 + 1) * 192 - 288))
after = x3(render_region('route1', 13, 19, 22, 26, sprites=[(16, 24, sil)]))
side(label(before, 'BEFORE (old tall grass: sprite stands on top)'), label(after, 'AFTER (new tall grass: waist-up overlay, tips, outline)')).convert('RGB').save(f'{OUT}/before_after_tallgrass.png', optimize=True)
# 2. forced-grass chokepoint: Route 1 north (1x crop scaled 3x), sprite mid-grass
x3i = lambda im: x3(im)
side(label(x3(render_region('route1', 0, 0, 11, 7, sprites=[(5, 3, sil)])), 'CHOKEPOINT r1_north_choke: Route 1 -> Fernwick, no way around'),
     label(x3(render_region('thornwood', 17, 17, 27, 25, sprites=[(22, 22, sil)])), 'CHOKEPOINT tw_east_choke: Thornwood -> Greystone mouth')).convert('RGB').save(f'{OUT}/chokepoint_forced_grass.png', optimize=True)
# 3. roadblocks before/after
ov, g = gate_override('route1', 'gate_route1_east')
side(label(x3(render_region('route1', 34, 0, 43, 10, sprites=[(40, 5, sil)])), 'ROUTE 1 EAST - BLOCKED (crystal barrier lit)'),
     label(x3(render_region('route1', 34, 0, 43, 10, sprites=[(42, 5, sil)], override=ov)), 'CLEARED after beat_master_frostspire (dim, walkable)')).convert('RGB').save(f'{OUT}/roadblock_route1_east_before_after.png', optimize=True)
ov, g = gate_override('brookhollow', 'gate_brookhollow_east')
side(label(x3(render_region('brookhollow', 25, 8, 33, 16, sprites=[(30, 12, sil)])), 'BROOKHOLLOW EAST - BLOCKED (RT checkpoint)'),
     label(x3(render_region('brookhollow', 25, 8, 33, 16, sprites=[(32, 12, sil)], override=ov)), 'CLEARED after beat_master_fernwick')).convert('RGB').save(f'{OUT}/roadblock_brookhollow_east_before_after.png', optimize=True)
ov, g = gate_override('thornwood', 'gate_thornwood_east')
tw = json.load(open(f'{BASE}/maps/thornwood.json'))
side(label(x3(render_region('thornwood', 26, 18, tw['width'] - 1, 26, sprites=[(31, 22, sil)])), 'THORNWOOD EAST - BLOCKED (fallen log)'),
     label(x3(render_region('thornwood', 26, 18, tw['width'] - 1, 26, sprites=[(33, 22, sil)], override=ov)), 'CLEARED after beat_master_saltmere')).convert('RGB').save(f'{OUT}/roadblock_thornwood_east_before_after.png', optimize=True)
# 4. bike paths
side(label(x3(render_region('thornwood', 12, 11, 21, 18, sprites=[(17, 14, sil)])), 'BIKE: Thornwood ramp pocket (ramp_e one-way in, rail out)'),
     label(x3(render_region('route1', 8, 8, 20, 13, sprites=[(14, 10, sil)])), 'BIKE: Route 1 marsh boardwalk (bike_only rail)')).convert('RGB').save(f'{OUT}/bike_paths.png', optimize=True)
print('ok')
