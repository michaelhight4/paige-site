"""Hall animated tiles kit (Animator, /workspace/kilumen_anim_halls, DRAFT pending Gary): packs the 27 strips into
art/world/overworld/tiles_{1,2,3}x/hall_anim.png (16 columns, one effect per row) and writes
art/world/overworld/tileset_hallanim.json (ids 9951+). Loaded only when the hallanim flag is on (src/progression/hall_anim.js).
python3 tools/hall_overhaul/anim_kit.py [src_dir]"""
import json, os, sys
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/kilumen_anim_halls'
OW = os.path.join(ROOT, 'art/world/overworld')
COLL = {'ice_sparkle': ('ice', 10), 'light_gate_closed': ('gate', 6), 'sluice_water': ('gate', 6), 'warp_pad': ('walk', 0), 'lava_vent': ('block', 1),
        'rip_tide': ('ice', 10)}
YSORT = {'reeds', 'prism'}
idx = json.load(open(os.path.join(SRC, 'index.json')))
effects = []
for hall, v in idx['halls'].items():
    for e in v['effects']: effects.append((hall, e))
rows = len(effects); tiles = []
sheets = {z: Image.new('RGBA', (16 * 64 * z, rows * 64 * z), (0, 0, 0, 0)) for z in (1, 2, 3)}
for r, (hall, e) in enumerate(effects):
    strip = Image.open(os.path.join(SRC, e['sheet'])).convert('RGBA'); assert strip.size == (64 * e['frames'], 64), e['id']
    for z, im in sheets.items(): im.paste(strip.resize((strip.width * z, 64 * z), Image.NEAREST), (0, r * 64 * z))
    name = f"ha_{hall}_{e['id']}"; c, code = COLL.get(e['id'], ('walk', 0))
    t = {'id': 9951 + r, 'name': name, 'category': 'hall_anim', 'sheet': 'tiles_1x/hall_anim.png', 'index': r * 16, 'col': 0, 'row': r,
         'walkable': code in (0, 10), 'collision': c, 'collision_code': code, 'encounter': False, 'hall': hall, 'layer': e['layer'],
         'animation': {'frames': [r * 16 + i for i in range(e['frames'])], 'frame_ms': e['ms'], 'loop': e['loop']}}
    if not e['loop']: t['animation']['idle_frame'] = r * 16
    if e['id'] in YSORT: t['ysort'] = True
    tiles.append(t)
for z, im in sheets.items(): im.save(os.path.join(OW, f'tiles_{z}x/hall_anim.png'), optimize=True)
json.dump({'note': 'Hall animated tiles (Animator, Oct 29 2026, DRAFT: Gary has not approved the art). Behind the hallanim flag '
           '(dev default on, alpha default off; ?hallanim=0|1). Built by tools/hall_overhaul/anim_kit.py; sheet path is swapped per zoom.',
           'tiles': tiles}, open(os.path.join(OW, 'tileset_hallanim.json'), 'w'), indent=1)
print(len(tiles), 'tiles', [t['name'] for t in tiles])
