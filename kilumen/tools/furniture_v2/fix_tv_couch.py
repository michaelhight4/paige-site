"""v4 TV/couch facing fixes (World Design audit; run after build_v3_hybrid.py, then grid_fit --check and tv_couch_check.py).
- house_1f, house_int_c: undo the v2 swap tv 814 -> i_tv 7209 and back-view sofa 810/811 -> i_sofa_brook 7153/7154
- home_brookhollow_b / home_fernwick_a / home_lanternport_c: top-wall i_tv removed; kit_tv_back 9394/9395 placed on row 8
  below the down-facing couch (row 7 stays a walkable gap). Idempotent."""
import json, os
OW = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../art/world/overworld/maps')
UNSWAP = {7209: 814, 7153: 810, 7154: 811}
TVBACK = {'home_brookhollow_b': ((3, 3), 3), 'home_fernwick_a': ((8, 3), 7), 'home_lanternport_c': ((3, 3), 3)}
def edit(name, fn):
    p = os.path.join(OW, name + '.json'); m = json.load(open(p)); fn(m['layers']); json.dump(m, open(p, 'w'), separators=(',', ':'))
def unswap(L):
    for k in ('decoration', 'overlay'):
        for row in L.get(k) or []:
            for x, v in enumerate(row):
                if v in UNSWAP: row[x] = UNSWAP[v]
for n in ('house_1f', 'house_int_c'): edit(n, unswap)
for n, ((ox, oy), x0) in TVBACK.items():
    def mv(L, ox=ox, oy=oy, x0=x0):
        if L['decoration'][oy][ox] == 7209: L['decoration'][oy][ox] = 0; L['collision'][oy][ox] = 0
        L['decoration'][8][x0], L['decoration'][8][x0 + 1] = 9394, 9395; L['collision'][8][x0] = L['collision'][8][x0 + 1] = 1
        assert all(c == 0 for c in L['collision'][7][x0:x0 + 2]), n + ' row 7 gap blocked'
    edit(n, mv)
print('tv/couch fixes applied')
