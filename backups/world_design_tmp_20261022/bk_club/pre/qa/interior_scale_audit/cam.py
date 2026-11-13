import json, sys
sys.path.insert(0, '.')
import audit as A
from PIL import Image
PIX = '/workspace/kilumen/art/characters/pixel/'
# Coder's touch safe zones (CSS px): bottom-left 200x200, bottom-right 300x120
def zones(vi):
    return [('d-pad', 0, vi['ch']-200, 200, vi['ch']), ('buttons', vi['cw']-300, vi['ch']-120, vi['cw'], vi['ch'])]
def cell_rect_css(x, y, cam, vi):
    k = vi['z']/vi['dpr']
    return ((x*64-cam[0])*k, (y*64-cam[1])*k, ((x+1)*64-cam[0])*k, ((y+1)*64-cam[1])*k)
def overlap(r, z):
    ax0, ay0, ax1, ay1 = r; _, bx0, by0, bx1, by1 = z
    w = max(0, min(ax1, bx1)-max(ax0, bx0)); h = max(0, min(ay1, by1)-max(ay0, by0))
    return w*h/((ax1-ax0)*(ay1-ay0))
def cam_for(stand, a, vi):
    vwp, vhp = vi['W']/vi['z'], vi['H']/vi['z']
    return (A.cam_axis(stand[0]*64+32, a['W']*64, vwp), A.cam_axis(stand[1]*64+32, a['H']*64, vhp))
def targets(a):
    t = []
    m = a['m']
    for w in a['warps']:
        # player stands on the tile above the mat / stair (arrival side) and then on the mat
        t.append(('exit' if w['to'] in ('$return','brookhollow','fernwick') else 'stairs', f"{w['to'].split('_')[0] if w['to']!='$return' else 'exit'}({w['x']},{w['y']})", (w['x'], w['y']), [(w['x'], w['y']), (w['x'], w['y']-1) if w['y']>0 else (w['x'], w['y'])]))
    seen_all = set()
    for d in a['npcs']:
        if not isinstance(d.get('x'), int) or d.get('kind') == 'spawn': continue
        x, y = d['x'], d['y']
        col = m['layers']['collision']
        talk = [(x+dx, y+dy) for dx, dy in ((0,1),(1,0),(-1,0),(0,-1)) if 0<=x+dx<a['W'] and 0<=y+dy<a['H'] and col[y+dy][x+dx] in (0,7)]
        if not talk:  # across a counter
            talk = [(x, y+2)]
        t.append(('npc', d['id'], (x, y), talk[:1]))
    for s in a['spots']:
        t.append(('spot', s['id'], (s['x'], s['y']), [tuple(s['stand'])]))
    return t
def run():
    res = {}
    for n in A.INTERIORS:
        a = A.analyse(n); r = {'a': a, 'views': {}}
        for vi in A.VI:
            fitx = a['W'] <= vi['vw']; fity = a['H'] <= vi['vh']
            voidx = max(0, (vi['vw']-a['W'])/2); voidy = max(0, (vi['vh']-a['H'])/2)
            scrollx = max(0, a['W']-vi['vw']); scrolly = max(0, a['H']-vi['vh'])
            void_frac = 1 - min(1, a['W']/vi['vw'])*min(1, a['H']/vi['vh'])
            hits = []
            if vi['plat'] == 'mobile':
                for kind, tid, cell, stands in targets(a):
                    for st in stands:
                        cam = cam_for(st, a, vi)
                        for z in zones(vi):
                            for c, what in ((cell, 'target'), (st, 'player')):
                                o = overlap(cell_rect_css(*c, cam, vi), z)
                                if o >= 0.25 and what == 'target':
                                    hits.append((kind, tid, z[0], round(o, 2)))
            r['views'][vi['name']] = dict(fitx=fitx, fity=fity, voidx=voidx, voidy=voidy, scrollx=scrollx, scrolly=scrolly, void_frac=void_frac, hits=sorted(set(hits)))
        res[n] = r
    return res
if __name__ == '__main__':
    res = run()
    for n, r in res.items():
        a = r['a']; print('=====', n, a['W'], a['H'])
        for v, d in r['views'].items():
            print(f"  {v:34s} fit {'Y' if d['fitx'] else 'n'}{'Y' if d['fity'] else 'n'} void LR {d['voidx']:.1f} TB {d['voidy']:.1f} scroll {d['scrollx']:.2f}x{d['scrolly']:.2f} black {d['void_frac']*100:.0f}% hits {d['hits']}")
    # NPC sprite sizes
    spr = A.spr
    for k, v in spr.items():
        if k.split('.')[0] in A.INTERIORS:
            im = Image.open(PIX + v['overworld_sheet']); print(k, v['sprite_id'], im.size)
