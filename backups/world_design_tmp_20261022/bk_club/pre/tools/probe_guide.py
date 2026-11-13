# read-only helper (imports the auditor's audit.py/cam.py unedited) + Gary's 2340x1080 @3 (780x360 CSS) view
import sys; sys.path.insert(0, '/workspace/kilumen/art/world/overworld/qa/interior_scale_audit')
import audit as A, cam as C
EXTRA = A.view_info(('Phone 2340x1080 (780x360 @3)', 'mobile', 780, 360, 3))
VIEWS = [v for v in A.VI if v['plat'] == 'mobile' and 'Tablet' not in v['name']] + [EXTRA]
n = 'fernwick_hall_int'; a = A.analyse(n); col = a['m']['layers']['collision']
occupied = {(n_['x'], n_['y']) for n_ in a['m'].get('npcs', [])}
def hits(cell, stand):
    out = []
    for vi in VIEWS:
        c = C.cam_for(stand, a, vi)
        for z in C.zones(vi):
            for what, cc in (('guide', cell), ('player', stand)):
                o = C.overlap(C.cell_rect_css(*cc, c, vi), z)
                if o > 0: out.append((vi['name'][:22], what, z[0], round(o, 2)))
    return out
if __name__ == '__main__':
    cells = [tuple(map(int, s.split(','))) for s in sys.argv[1:]] or [(x, y) for y in range(3, 17) for x in range(16)]
    for cell in cells:
        x, y = cell
        if col[y][x]: continue
        stands = [(x+dx, y+dy) for dx, dy in ((0,1),(0,-1),(1,0),(-1,0)) if 0 <= x+dx < 16 and 0 <= y+dy < 18 and not col[y+dy][x+dx] and (x+dx, y+dy) not in occupied]
        res = {s: hits(cell, s) for s in stands}
        clean = [s for s, h in res.items() if not h]
        print(cell, 'clean stands', clean, '| hit stands', {s: h for s, h in res.items() if h} if len(sys.argv) > 1 else len(res) - len(clean))
