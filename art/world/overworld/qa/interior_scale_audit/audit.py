# Read-only audit script (writes only into this folder).
import json, os, collections
from PIL import Image
OW = '/workspace/kilumen/art/world/overworld/'
OUT = OW + 'qa/interior_scale_audit/'
ts = json.load(open(OW + 'tileset.json'))
T = {t['id']: t for t in ts['tiles']}
N = {t['id']: t['name'] for t in ts['tiles']}
MTO = ts['multi_tile_objects']
spr = json.load(open('/workspace/kilumen/art/characters/pixel/npcs/npc_sprite_map.json'))['map']

INTERIORS = ['house_1f','house_2f','office_int','home_brookhollow_a','home_brookhollow_b','home_brookhollow_b_2f',
             'lab_brookhollow','heal_brookhollow','shop_int','heal_fernwick','home_fernwick_a','home_fernwick_a_2f',
             'home_fernwick_c','home_lanternport_c','home_lanternport_c_2f','fernwick_hall_int']
door_table = json.load(open(OW + 'qa/interiors_hookup/door_table.json'))
def load(n): return json.load(open(OW + 'maps/' + n + '.json'))

# ---------- exterior footprints ----------
def building_at(town, dx, dy):
    m = load(town); dec = m['layers']['decoration']
    nm = N.get(dec[dy][dx], '')
    import re
    mm = re.match(r'(.+)_(\d+)_(\d+)$', nm)
    if not mm: return nm, None
    base, r, c = mm.group(1), int(mm.group(2)), int(mm.group(3))
    # flood bbox of same base
    W, H = m['width'], m['height']
    xs, ys = [], []
    for y in range(H):
        for x in range(W):
            n2 = N.get(dec[y][x], '')
            if n2.startswith(base + '_') and re.match(r'.+_\d+_\d+$', n2) and abs(x-dx) < 10 and abs(y-dy) < 10:
                xs.append(x); ys.append(y)
    # also overlay (roofs)
    ov = m['layers']['overlay']
    for y in range(H):
        for x in range(W):
            n2 = N.get(ov[y][x], '')
            if n2.startswith(base + '_') and abs(x-dx) < 10 and abs(y-dy) < 10:
                xs.append(x); ys.append(y)
    mt = MTO.get(base)
    return base, dict(x0=min(xs), y0=min(ys), x1=max(xs), y1=max(ys), w=max(xs)-min(xs)+1, h=max(ys)-min(ys)+1,
                      mto=(mt['w'], mt['h']) if mt else None)

# ---------- viewports ----------
# engine: canvas = innerW*dpr x innerH*dpr; zoom = 1 if h<600 else max(2, floor(h/480)); map smaller than view on an axis -> centred on black
VIEWS = [
  # name, platform, css_w, css_h, dpr
  ('PC 1280x720', 'pc', 1280, 720, 1),
  ('PC 1920x1080', 'pc', 1920, 1080, 1),
  ('PC 2560x1440', 'pc', 2560, 1440, 1),
  ('Phone 844x390 @3 (iPhone 12-14)', 'mobile', 844, 390, 3),
  ('Phone 2340x1080 (851x393 @2.75)', 'mobile', 851, 393, 2.75),
  ('Phone 2400x1080 (873x393 @2.75)', 'mobile', 873, 393, 2.75),
  ('Tablet 1024x768 @2 (iPad)', 'mobile', 1024, 768, 2),
  ('Tablet 1024x768 @1', 'mobile', 1024, 768, 1),
]
def zoom_for(h): return 1 if h < 600 else max(2, h // 480)
# touch controls (style.css), CSS px from the corners
DPAD = dict(left=18, bottom=18, w=174, h=174)   # plus nothing else on the left
BTNS_W = 56 + 14 + 56 + 14 + 76 + 14 + 76        # DBG, SEL, B, A with 14px gaps
BTNS = dict(right=22, bottom=30, w=BTNS_W, h=76)
def view_info(v):
    name, plat, cw, ch, dpr = v
    W, H = round(cw*dpr), round(ch*dpr); z = zoom_for(H)
    tile_css = 64*z/dpr
    return dict(name=name, plat=plat, W=W, H=H, z=z, vw=W/z/64, vh=H/z/64, tile_css=tile_css, cw=cw, ch=ch, dpr=dpr)
VI = [view_info(v) for v in VIEWS]

def cam_axis(focus, mappx, view):
    if mappx <= view: return round((mappx - view)/2)
    mx = int(mappx - view)
    return min(mx, max(0, round(focus - view/2)))

def covered_cells(mw, mh, vi, focus_cell):
    """cells (x,y) whose centre lies under a touch control, camera following focus_cell (native px)"""
    vwp, vhp = vi['W']/vi['z'], vi['H']/vi['z']
    cx = cam_axis(focus_cell[0]*64+32, mw*64, vwp); cy = cam_axis(focus_cell[1]*64+32, mh*64, vhp)
    k = vi['z']/vi['dpr']   # css px per native px
    rects = [  # in css px: x0,y0,x1,y1
      (DPAD['left'], vi['ch']-DPAD['bottom']-DPAD['h'], DPAD['left']+DPAD['w'], vi['ch']-DPAD['bottom']),
      (vi['cw']-BTNS['right']-BTNS['w'], vi['ch']-BTNS['bottom']-BTNS['h'], vi['cw']-BTNS['right'], vi['ch']-BTNS['bottom'])]
    out = set()
    for y in range(mh):
        for x in range(mw):
            sx = (x*64+32 - cx)*k; sy = (y*64+32 - cy)*k
            for (a,b,c,d) in rects:
                if a <= sx <= c and b <= sy <= d: out.add((x,y))
    return out, (cx, cy)

# ---------- per-interior analysis ----------
WALK = {0, 4, 7}
def analyse(n):
    m = load(n); W, H = m['width'], m['height']; col = m['layers']['collision']; dec = m['layers']['decoration']
    tp = m.get('text_pending') or {}
    npcs = m.get('npcs', []) + tp.get('npcs', []); spots = m.get('interact_spots', []) + tp.get('interact_spots', [])
    npc_cells = {(d['x'], d['y']) for d in npcs if isinstance(d.get('x'), int)}
    warps = m.get('warps', [])
    exits = [w for w in warps if w['to'] in ('$return','brookhollow','fernwick')]
    # arrival: from door table / entered_from or tile above exit
    arr = None
    ef = m.get('entered_from')
    if ef: arr = tuple(ef[0]['arrival'])
    else:
        for d in door_table if isinstance(door_table, list) else door_table.get('doors', []):
            pass
    if arr is None and exits: arr = (exits[0]['x'], exits[0]['y']-1)
    if arr is None:  # 2F: arrival from the 1F stairs warp target
        for o in INTERIORS:
            for w in load(o).get('warps', []):
                if w['to'] == n: arr = (w['tx'], w['ty'])
    # BFS walkable (npcs block)
    def walk(x,y): return 0<=x<W and 0<=y<H and col[y][x] in WALK and (x,y) not in npc_cells
    seen = {arr}; q=[arr]
    while q:
        x,y = q.pop()
        if col[y][x] == 4 and (x,y)!=arr: continue
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            c=(x+dx,y+dy)
            if c not in seen and walk(*c): seen.add(c); q.append(c)
    walk_cells = [(x,y) for y in range(H) for x in range(W) if col[y][x] in WALK]
    unreach = [c for c in walk_cells if c not in seen and c not in npc_cells]
    floor_rows = [y for y in range(H) if any(col[y][x] in WALK for x in range(W))]
    floor_cols = [x for x in range(W) if any(col[y][x] in WALK for y in range(H))]
    fw, fh = max(floor_cols)-min(floor_cols)+1, max(floor_rows)-min(floor_rows)+1
    # walls on the side columns?
    side_walls = all(col[y][0]==1 for y in floor_rows) and all(col[y][W-1]==1 for y in floor_rows)
    # mats
    mats = [(w['x'], w['y']) for w in exits]
    mat_tiles = [N.get(dec[y][x],'') for (x,y) in mats]
    # spots
    face_vec = dict(up=(0,-1), down=(0,1), left=(-1,0), right=(1,0))
    spot_issues = []
    for s in spots:
        sx, sy = s['stand']
        if s.get('kind') == 'trigger': 
            if not walk(sx,sy): spot_issues.append(f"{s['id']}: trigger cell ({sx},{sy}) not walkable")
            continue
        fx, fy = face_vec[s['face']]
        if (sx+fx, sy+fy) != (s['x'], s['y']): spot_issues.append(f"{s['id']}: stand ({sx},{sy}) facing {s['face']} does not face ({s['x']},{s['y']})")
        if not (0<=sx<W and 0<=sy<H) or col[sy][sx] not in WALK: spot_issues.append(f"{s['id']}: stand ({sx},{sy}) not walkable")
        elif (sx,sy) not in seen: spot_issues.append(f"{s['id']}: stand ({sx},{sy}) unreachable")
        if (sx,sy) in npc_cells: spot_issues.append(f"{s['id']}: stand ({sx},{sy}) occupied by an NPC")
        if (sx,sy) in mats: spot_issues.append(f"{s['id']}: stand ({sx},{sy}) is the exit mat")
        tn = N.get(dec[s['y']][s['x']], '') if 0<=s['x']<W and 0<=s['y']<H else ''
        if s.get('tile') and not tn.startswith(s['tile']) and not s['tile'].startswith('window'):
            spot_issues.append(f"{s['id']}: tile at ({s['x']},{s['y']}) is '{tn or 'empty'}', spot says '{s['tile']}'")
    # npc talk access
    npc_issues = []
    for d in npcs:
        if not isinstance(d.get('x'), int): continue
        x,y = d['x'], d['y']
        if col[y][x] != 0: npc_issues.append(f"NPC {d['id']} at ({x},{y}) stands on collision {col[y][x]}")
        adj = [(x+dx,y+dy) for dx,dy in ((1,0),(-1,0),(0,1),(0,-1))]
        talk = [c for c in adj if c in seen]
        # across-counter talk: two cells away through a counter
        across = [(x+2*dx,y+2*dy) for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)) if 0<=x+dx<W and 0<=y+dy<H and col[y+dy][x+dx]==1 and 'counter' in N.get(dec[y+dy][x+dx],'')]
        across = [c for c in across if c in seen]
        if not talk and not across: npc_issues.append(f"NPC {d['id']} at ({x},{y}) cannot be reached to talk")
        if d['id'] in [] : pass
        if (map_key := n+'.'+d['id']) not in spr and d.get('kind') not in ('object','spawn'):
            npc_issues.append(f"NPC {d['id']}: no sprite in npc_sprite_map ({map_key})")
    # furniture footprints
    import re
    groups = collections.defaultdict(list)
    for y in range(H):
        for x in range(W):
            nm = N.get(dec[y][x], '')
            if not nm or nm.startswith(('window','i_mat','door_mat','mat')): continue
            mm = re.match(r'(.+?)_(\d+)_(\d+)$', nm)
            base = mm.group(1) if mm else nm
            groups[base].append((x,y,col[y][x]))
    furn = []
    for base, cells in groups.items():
        # split into connected components
        cs = {(x,y):c for x,y,c in cells}; left=set(cs); comps=[]
        while left:
            s=left.pop(); comp=[s]; st=[s]
            while st:
                a,b=st.pop()
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    c=(a+dx,b+dy)
                    if c in left: left.remove(c); comp.append(c); st.append(c)
            comps.append(comp)
        for comp in comps:
            xs=[c[0] for c in comp]; ys=[c[1] for c in comp]
            furn.append(dict(base=base, x=min(xs), y=min(ys), w=max(xs)-min(xs)+1, h=max(ys)-min(ys)+1,
                             walkable=[c for c in comp if cs[c] in WALK]))
    # tile native size check
    bad_tiles = set()
    for L in ('ground','decoration','overlay'):
        for row in m['layers'][L]:
            for tid in row:
                if tid and tid in T:
                    t = T[tid]
                    if t.get('w', 64) != 64 or t.get('h', 64) != 64: bad_tiles.add(t['name'])
                elif tid: bad_tiles.add(f'unknown id {tid}')
    return dict(name=n, W=W, H=H, m=m, fw=fw, fh=fh, walk_n=len(walk_cells), reach_n=len(seen), unreach=unreach,
                side_walls=side_walls, mats=mats, mat_tiles=mat_tiles, arr=arr, spots=spots, npcs=npcs,
                spot_issues=spot_issues, npc_issues=npc_issues, furn=furn, bad_tiles=bad_tiles, warps=warps,
                engine_npcs=len(m.get('npcs',[])), pending_npcs=len(tp.get('npcs',[])), pending_spots=len(tp.get('interact_spots',[])))

if __name__ == '__main__':
    res = {}
    for n in INTERIORS:
        a = analyse(n); res[n] = a
        print('=====', n, f"{a['W']}x{a['H']} floor bbox {a['fw']}x{a['fh']} walk {a['walk_n']} reach {a['reach_n']} arr {a['arr']} mats {a['mats']} {a['mat_tiles']} sidewalls {a['side_walls']}")
        print('  engine npcs', a['engine_npcs'], 'pending npcs', a['pending_npcs'], 'pending spots', a['pending_spots'])
        print('  unreach', a['unreach'])
        for s in a['spot_issues'] + a['npc_issues']: print('  !', s)
        print('  furn', [(f['base'], f['x'], f['y'], f"{f['w']}x{f['h']}", f['walkable']) for f in a['furn']])
        print('  badtiles', a['bad_tiles'])
        print('  warps', [(w['x'], w['y'], w['to'], w.get('tx'), w.get('ty')) for w in a['warps']])
    for vi in VI: print(vi)
