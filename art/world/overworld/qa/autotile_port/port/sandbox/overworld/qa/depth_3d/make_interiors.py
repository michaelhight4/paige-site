# Interior furniture depth BEFORE/AFTER (Oct 22 2026). Read-only: BEFORE = /tmp/bk_depth/before_tree (pre-depth backup),
# AFTER = the live overworld tree. Writes ONLY qa/depth_3d/interiors_before_after.png (+ interiors_report.json).
# Last column = AFTER + SIMULATED engine contact / wall-base shadows on a separate layer (preview only; never baked into tiles).
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); OW = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(OW, 'tools'))
import time_of_day as TOD
BEFORE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/bk_depth/before_tree'
T = 64; SHADOW = (26, 18, 38, 96)
MAPS = [('heal_brookhollow', 'identity', 'Heal branch (heal_brookhollow)'), ('shop_int', 'identity', 'Mart (shop_int)'),
        ('home_lanternport_c', 'h3_slate', 'Shared home H3, slate scheme (home_lanternport_c via Fernwick door)'), ('office_int', 'identity', 'Office (office_int)')]
TB = TOD.tables()
def hx(s): return tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))

def render(ow, name, scheme, grade):
    ts = json.load(open(f'{ow}/tileset.json')); by = {t['id']: t for t in ts['tiles']}
    rc = json.load(open(f'{ow}/interiors_new/home_recolours.json')); sm = {hx(k): hx(v) for k, v in rc['schemes'][scheme]['map'].items()}
    recol = {v['id']: v.get('mask') for v in rc['recolourable'].values()}
    _keep = TOD.EMISSIVE; TOD.EMISSIVE = {k: v for k, v in _keep.items() if k in {t['name'] for t in ts['tiles']}}   # BEFORE tree predates newer emissive tiles
    try: masks = TOD.emissive_masks(ow)
    finally: TOD.EMISSIVE = _keep
    m = json.load(open(f'{ow}/maps/{name}.json')); sheets = {}
    tab = dict(TB[grade], _name=grade)
    W, H = m['width'] * T, m['height'] * T
    lay = {}
    for ln in ('ground', 'decoration', 'overlay'):
        im = np.zeros((H, W, 4), np.uint8)
        for y, row in enumerate(m['layers'].get(ln) or []):
            for x, tid in enumerate(row):
                t = by.get(tid)
                if not t: continue
                sh = t['sheet']
                if sh not in sheets: sheets[sh] = Image.open(f'{ow}/{sh}').convert('RGBA')
                i = t['index']; a = np.array(sheets[sh].crop(((i % 16) * T, (i // 16) * T, (i % 16 + 1) * T, (i // 16 + 1) * T)))
                if tid in recol and sm:                     # per-door scheme: exact swap, walls/floors only, BEFORE the grade
                    mk = recol[tid]; sel = np.ones(a.shape[:2], bool)
                    if mk: sel = np.array(Image.open(f'{ow}/{mk}').convert('L')) > 0 if os.path.exists(f'{ow}/{mk}') else sel
                    for src, dst in sm.items():
                        hit = sel & (a[..., 3] == 255) & np.all(a[..., :3] == src, -1); a[hit, :3] = dst
                if grade != 'day':
                    e = masks.get(sh); em = None
                    if e is not None: em = e.crop(((i % 16) * T, (i // 16) * T, (i % 16 + 1) * T, (i // 16 + 1) * T))
                    a = np.array(TOD.apply(Image.fromarray(a, 'RGBA'), tab, em))
                al = a[..., 3] > 0; dst = im[y * T:(y + 1) * T, x * T:(x + 1) * T]; dst[al] = a[al]
        lay[ln] = im
    return m, lay

def sim_shadow(m, lay, ow):
    """engine-side preview only, aligned to src/overworld/depth.json (indoor): contact shadow = furniture silhouette offset [4,2] (4 px right, 2 px down), alpha 80;
    wall-base strip = 6 px under wall faces, alpha 64. Colour = kit SHADOW rgb (day grade shadowDst)."""
    ts = json.load(open(f'{ow}/tileset.json')); by = {t['id']: t for t in ts['tiles']}
    H, W = lay['ground'].shape[:2]; sh = np.zeros((H, W), bool); furn = np.zeros((H, W), bool); wallb = np.zeros((H, W), bool)
    import re
    flat = re.compile(r'(rug|mat|floor|wall|window|door|stairs|poster|sign|logo|banner|timetable)')
    for ln in ('decoration', 'overlay'):
        for y, row in enumerate(m['layers'].get(ln) or []):
            for x, tid in enumerate(row):
                t = by.get(tid)
                if not t: continue
                n = t['name']; cell = lay[ln][y * T:(y + 1) * T, x * T:(x + 1) * T][..., 3] == 255
                if re.search(r'i_wall_face|iwall_face|wall_face', n): wallb[(y + 1) * T:(y + 1) * T + 6, x * T:(x + 1) * T] = True
                elif not flat.search(n): furn[y * T:(y + 1) * T, x * T:(x + 1) * T] |= cell
    for y, row in enumerate(m['layers']['ground']):
        for x, tid in enumerate(row):
            t = by.get(tid)
            if t and re.search(r'wall_face', t['name']): wallb[(y + 1) * T:(y + 1) * T + 6, x * T:(x + 1) * T] = True
    s = np.zeros_like(furn); s[2:, 4:] = furn[:-2, :-4]; sh = s & ~furn; wb = wallb & ~furn & ~sh
    out = np.zeros((H, W, 4), np.uint8); out[sh] = (*SHADOW[:3], 80); out[wb] = (*SHADOW[:3], 64); return out

def comp(lay, shadow=None):
    H, W = lay['ground'].shape[:2]; c = Image.new('RGBA', (W, H), (26, 18, 38, 255))
    c.alpha_composite(Image.fromarray(lay['ground']))
    if shadow is not None: c.alpha_composite(Image.fromarray(shadow))
    c.alpha_composite(Image.fromarray(lay['decoration'])); c.alpha_composite(Image.fromarray(lay['overlay'])); return c.convert('RGB')

COLS = ['BEFORE day', 'AFTER day', 'BEFORE night', 'AFTER night', 'AFTER day + SIMULATED engine shadows (preview layer, not baked)']
rows = []; rep = {}
for name, scheme, title in MAPS:
    ims = []
    for ow, g in ((BEFORE, 'day'), (OW, 'day'), (BEFORE, 'night'), (OW, 'night')):
        m, lay = render(ow, name, scheme, g); ims.append(comp(lay))
    m, lay = render(OW, name, scheme, 'day'); ims.append(comp(lay, sim_shadow(m, lay, OW)))
    a, b = np.array(ims[0]), np.array(ims[1]); rep[name] = dict(scheme=scheme, changed_px_day=int(np.any(a != b, -1).sum()))
    rows.append((title, ims))
pad = 16; lab = 28; cw = max(im.width for _, ims in rows for im in ims)
Wt = pad + len(COLS) * (cw + pad); Ht = lab + sum(lab + ims[0].height + pad for _, ims in rows) + pad
out = Image.new('RGB', (Wt, Ht), (34, 26, 48)); d = ImageDraw.Draw(out)
for i, c in enumerate(COLS): d.text((pad + i * (cw + pad), 8), c, fill=(250, 240, 220))
y = lab
for title, ims in rows:
    d.text((pad, y + 8), title, fill=(255, 214, 104)); y += lab
    for i, im in enumerate(ims): out.paste(im, (pad + i * (cw + pad), y))
    y += ims[0].height + pad
d.text((pad, Ht - 14), 'Interiors stay on the day grade in-engine (indoor_rule); night column = grade preview. Shadows in the last column are a simulation of Coder\'s engine pass.', fill=(200, 190, 220))
out.save(f'{HERE}/interiors_before_after.png', optimize=True)
json.dump(rep, open(f'{HERE}/interiors_report.json', 'w'), indent=1); print(rep)
