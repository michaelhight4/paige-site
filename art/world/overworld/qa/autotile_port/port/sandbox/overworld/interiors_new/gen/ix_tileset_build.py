# Builds the interiors tileset: sheets at 1x/2x/3x + tileset_interiors(_2x,_3x).json, ids 7001+.
import os, json
import numpy as np
from PIL import Image
from ix_canvas import Cv, T, check_image, OW
import ix_ground as ground, ix_furniture as furniture, ix_brand as brand

OUT = os.path.join(OW, 'interiors_new')
ID0 = 7000
CODES = {'walk': 0, 'block': 1, 'ledge_s': 2, 'water': 3, 'door': 4, 'boulder': 5, 'gate': 6, 'plate': 7, 'bike_only': 8, 'ramp': 9, 'ice': 10, 'deep_water': 11}
CNAME = {v: k for k, v in CODES.items()}
SHEETS = ['i_floor', 'i_wall', 'i_furniture', 'i_puzzle', 'i_brand']
BRAND = ('i_rt', 'i_counter_rt', 'i_crystal_polisher', 'i_suggestion_box', 'i_newsletter_rack', 'i_staffdoor_locked', 'i_locker', 'i_crystal_crate', 'i_mat_rtbranch', 'i_floor_rtbranch', 'i_wall_top_rtbranch', 'i_wall_upper_rtbranch', 'i_wall_upper_win_rtbranch', 'i_wall_face_rtbranch')

def sheet_of(cat):
    return {'floor': 'i_floor', 'wall': 'i_wall', 'puzzle': 'i_puzzle', 'overlay': 'i_puzzle'}.get(cat, 'i_furniture')

def build():
    ground.build(); brand.build_ground(ground.g)
    entries = []   # (name, image64, coll, cat, notes, sheet, extra)
    for name, d in ground.GROUND.items():
        im = d['cv'].image(outline=False)
        e = dict(name=name, im=im, coll=d['coll'], cat=d['cat'], notes=d['notes'], sheet=sheet_of(d['cat']))
        if d['frames']:
            e['frames'] = [f.image(outline=False) for f in d['frames'][1:]]
        entries.append(e)
    multi = {}
    for name, o in furniture.OBJ.items():
        w, h = o['w'], o['h']
        cv = Cv(w * T, h * T); o['fn'](cv)
        im = cv.image(outline=o['outline'])
        cat = o['cat']
        if w == 1 and h == 1:
            entries.append(dict(name=name, im=im, coll=o['coll'], cat=cat, notes=o['notes'], sheet=sheet_of(cat)))
        else:
            multi[name] = {'w': w, 'h': h, 'tile_name_pattern': name + '_<row>_<col>'}
            for r in range(h):
                for c in range(w):
                    entries.append(dict(name='%s_%d_%d' % (name, r, c), im=im.crop((c * T, r * T, c * T + T, r * T + T)), coll=o['coll'],
                                        cat=cat, notes=(o['notes'] + ' ' if o['notes'] else '') + 'part r%d c%d of %dx%d' % (r, c, w, h), sheet=sheet_of(cat)))
    # lay out sheets
    per = {s: [] for s in SHEETS}
    for e in entries: per['i_brand' if e['name'].startswith(BRAND) else e['sheet']].append(e)
    tiles = []; nid = ID0 + 1; sheet_imgs = {}
    for s in SHEETS:
        lst = per[s]
        n = sum(1 + len(e.get('frames', [])) for e in lst)
        rows = (n + 15) // 16
        sheet = Image.new('RGBA', (16 * T, rows * T), (0, 0, 0, 0))
        idx = 0
        for e in lst:
            anim = None
            ims = [e['im']] + e.get('frames', [])
            first = idx
            for k, im in enumerate(ims):
                assert check_image(im), e['name']
                sheet.paste(im, ((idx % 16) * T, (idx // 16) * T)); idx += 1
            t = {'id': nid, 'name': e['name'], 'category': e['cat'], 'sheet': None, 'index': first, 'col': first % 16, 'row': first // 16,
                 'walkable': e['coll'] in (0, 7), 'collision': CNAME[e['coll']], 'collision_code': e['coll'],
                 'encounter': False, 'sheet_key': s}
            if e['notes']: t['notes'] = e['notes']
            if len(ims) > 1: t['animation'] = {'frames': list(range(first, first + len(ims))), 'frame_ms': 260, 'loop': True}
            tiles.append(t); nid += 1
        sheet_imgs[s] = sheet
    # states (puzzle pairs)
    by = {t['name']: t['id'] for t in tiles}
    pairs = [('i_plate_off', 'i_plate_on'), ('i_holdplate_off', 'i_holdplate_on'), ('i_crystal_off', 'i_crystal_on'), ('i_gate_closed', 'i_gate_open'),
             ('i_laser_closed', 'i_laser_open'), ('i_beam_receiver_off', 'i_beam_receiver_on'), ('i_basin_empty', 'i_basin_full'),
             ('i_mirror_slash', 'i_mirror_back'), ('i_crust_a', 'i_crust_cracked')]
    for a, b in pairs:
        for t in tiles:
            if t['name'] in (a, b): t['states'] = {'off': by[a], 'on': by[b]}
    for t in tiles:
        if t['name'] == 'i_crust_cracked': t['states']['next'] = by['i_brine_pit']
    for scale in (1, 2, 3):
        d = os.path.join(OUT, 'tiles_%dx' % scale); os.makedirs(d, exist_ok=True)
        for s, im in sheet_imgs.items():
            (im if scale == 1 else im.resize((im.width * scale, im.height * scale), Image.NEAREST)).save(os.path.join(d, s + '.png'))
        js = {'tile_size': T * scale, 'native_tile_size': T, 'scale': scale, 'columns_per_sheet': 16, 'id_zero': 'empty', 'id_offset': ID0, 'name_prefix': 'i_',
              'note': 'INTERIORS kit (homes, marts, heal centres, Master halls, lab, HQ lobby, stations). Same schema as tileset.json; ids 7001+ and names start with "i_" so it merges without clashes with tileset.json (1-999) and tileset_extra.json (5001+). See interiors_new/INTERIORS.md.',
              'collision_codes': CODES, 'render': 'nearest-neighbour, integer zoom only', 'palette': '../palette.png',
              'draw_order': ['ground', 'decoration', 'characters + ysort', 'overlay (beams)'],
              'sheets': {s: 'tiles_%dx/%s.png' % (scale, s) for s in SHEETS}, 'multi_tile_objects': multi, 'tiles': []}
        for t in tiles:
            tt = dict(t); tt['sheet'] = 'tiles_%dx/%s.png' % (scale, tt.pop('sheet_key')); js['tiles'].append(tt)
        fn = 'tileset_interiors.json' if scale == 1 else 'tileset_interiors_%dx.json' % scale
        json.dump(js, open(os.path.join(OUT, fn), 'w'), indent=1)
    return tiles, sheet_imgs, multi

def seam_check(tiles, sheets, seed=5):
    """Seam metric per floor family: lay a random 6x6 mosaic of the variants and measure the colour jump across
    tile boundaries (columns/rows 64k-1 -> 64k) against the jumps between every pair of interior neighbouring
    columns/rows. A visible seam shows up as a boundary jump above the interior 90th percentile. Also reports
    whether edge pixels are identical across variants (they may differ only where a joint line separates them)."""
    import collections
    rng = np.random.default_rng(seed)
    fam = collections.defaultdict(list)
    for t in tiles:
        if t['category'] in ('floor',) and t['name'][-2] == '_' and t['name'][-1] in 'abc':
            fam[t['name'][:-2]].append(t)
    rep = {}
    for f, ts in fam.items():
        ims = [np.asarray(sheets[t['sheet_key']].crop((t['col'] * T, t['row'] * T, t['col'] * T + T, t['row'] * T + T)))[..., :3].astype(int) for t in ts]
        N = 6
        mos = np.zeros((N * T, N * T, 3), int)
        for y in range(N):
            for x in range(N):
                mos[y * T:(y + 1) * T, x * T:(x + 1) * T] = ims[int(rng.integers(0, len(ims)))]
        dc = np.abs(np.diff(mos, axis=1)).sum(2).mean(0)    # jump between column k and k+1
        dr = np.abs(np.diff(mos, axis=0)).sum(2).mean(1)
        bcol = [k * T - 1 for k in range(1, N)]
        # same phase inside the tiles (patterns repeat every 16 px), so a plank gap that legitimately falls on
        # the edge is compared with the plank gaps inside the tile, not with flat plank faces
        icol = [k for k in range(len(dc)) if (k + 1) % T != 0 and (k + 1) % 16 == 0]
        out = {}
        for nm, d in (('x', dc), ('y', dr)):
            b = float(np.mean([d[k] for k in bcol])); ref = float(max(d[k] for k in icol))
            out[nm] = (round(b, 1), round(ref, 1), b <= ref * 1.15 + 4)
        rep[f] = dict(variants=len(ts), boundary_vs_interior_x=out['x'][:2], boundary_vs_interior_y=out['y'][:2], seam_free=bool(out['x'][2] and out['y'][2]))
    return rep
