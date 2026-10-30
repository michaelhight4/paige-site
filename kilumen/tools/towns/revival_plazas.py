"""Revival Heights plazas (Gary, Oct 30 2026 4:08-4:09 PM CT, three screenshots): plaza paving (x_city_plaza_0-3) over the open
grass so the props stand out, framed flower beds (grass + flowers, edged by the paving) next to the props.
A north: east of the fountain plaza round the cafe tables to the shop and clock tower, and the RTHQ east front.
B south market: the lane and stall rows below the long path wall (left of the road round the cabin, right of it above the
  planter row); the planter row, pond, flower field and forest edge stay grass.
C east crossroads: between the sand paths round the stalls, bench and statue; cave mouth (45,17), forest edge and the
  gazebo lawn stay grass.
Only grass ground under walkable cells or props is paved; paths, doors, warps, trees, flowers, buildings, water untouched.
A 1-tile grass border is left round each region. Idempotent. Usage: python3 tools/towns/revival_plazas.py"""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OW = os.path.join(ROOT, 'art', 'world', 'overworld'); MP = os.path.join(OW, 'maps', 'revival_heights.json')
TS = json.load(open(os.path.join(OW, 'tileset.json')))['tiles']; ID = {t['name']: t['id'] for t in TS}; NM = {t['id']: t['name'] for t in TS}
CAT = {t['id']: t.get('category') for t in TS}
PLAZA = [ID[f'x_city_plaza_{i}'] for i in range(4)]
REGIONS = {'A_north': [(23, 27, 10, 13), (26, 27, 14, 14), (27, 27, 18, 18), (40, 41, 9, 13)],
           'B_market': [(15, 26, 29, 33), (31, 42, 29, 31)],
           'C_crossroads': [(49, 54, 12, 16)],
           # Gary 4:24 PM CT: the two sand strips with posts beside the top flower fields widen into small plazas
           'D_top_left': [(13, 13, 6, 6), (8, 13, 8, 9)], 'D_top_mid': [(31, 36, 7, 8)]}
BEDS = [(23, 11), (23, 12), (26, 10), (27, 10),                      # A: beside the cafe tables
        (52, 12), (53, 12),
        (8, 9), (9, 9), (31, 8), (32, 8),                            # D: below the lamp/bench pairs of the top plazas                                          # C: under the stalls / beside the statue
        (20, 32), (21, 32), (20, 33), (21, 33), (24, 32), (24, 33)]  # B: between the log stools (a bed by the east stall tipped density B1_high, so none there)
KEEP = re.compile(r'(tree|cave|flowers_|gazebo|door|stairs|ledge|fp_pool|water)')
def main():
    m = json.load(open(MP)); L = m['layers']; G, D, C = L['ground'], L['decoration'], L['collision']
    warps = {(w['x'], w['y']) for w in m['warps']}; paved = beds = 0
    for (x, y) in BEDS:
        if NM.get(G[y][x], '').startswith('grass') and not D[y][x] and C[y][x] == 0 and (x, y) not in warps:
            D[y][x] = ID['flowers_warm' if (x + y) % 2 else 'flowers_violet']; beds += 1
    for rects in REGIONS.values():
        for x0, x1, y0, y1 in rects:
            for y in range(y0, y1 + 1):
                for x in range(x0, x1 + 1):
                    d = NM.get(D[y][x], '') if D[y][x] else ''
                    if not NM.get(G[y][x], '').startswith('grass') or (x, y) in warps or KEEP.search(d): continue
                    if D[y][x] and CAT.get(D[y][x]) in ('building', 'landmark', 'door'): continue
                    if C[y][x] not in (0, 1): continue
                    G[y][x] = PLAZA[(x * 7 + y * 3) % 4]; paved += 1
    json.dump(m, open(MP, 'w'), indent=1); print('paved', paved, 'beds', beds)
if __name__ == '__main__': main()
