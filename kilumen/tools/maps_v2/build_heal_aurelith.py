"""heal_aurelith: Aurelith's own Revival Tech branch (Gary 2:40 PM CT Oct 29 2026: "Give Aurelith its own heal centre").
Same kit as the other branches (rtbranch floor/walls, RT counter, redrawn crystal polisher i_crystal_polisher at the heal
spot, posters, terminal) but capital-grade: 15x11 (others 13x9/14x10), windowed back wall, twin palms, Aurelith sofas, a
violet runner from the door to the counter. Heal FX: fx_art.js FX_CFG.healFire.maps -> the fire variant plays only here.
Run: python3 tools/maps_v2/build_heal_aurelith.py   (rewrites art/world/overworld/maps/heal_aurelith.json)
"""
import json, os, random
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'art/world/overworld/maps/heal_aurelith.json')
W, H, DX = 15, 11, 7                     # door column 7, mat on the bottom row
rnd = random.Random(7)
g = [[0] * W for _ in range(H)]; dec = [[0] * W for _ in range(H)]; col = [[0] * W for _ in range(H)]
for x in range(W):
    g[0][x] = 7467; g[1][x] = 7469 if x in (1, 4, 10, 13) else 7468; g[2][x] = 7470
    for y in range(3): col[y][x] = 1
for y in range(3, H):
    for x in range(W): g[y][x] = rnd.choice((7464, 7464, 7465, 7466))
def put(x, y, t, block=True):
    dec[y][x] = t
    if block: col[y][x] = 1
# back wall: posters, polisher (2x2 at the heal spot, behind the carer), RT logo
put(2, 1, 7480, False); put(12, 1, 7481, False); put(10, 1, 7482, False)
put(6, 1, 7476); put(7, 1, 7477); put(6, 2, 7478); put(7, 2, 7479)
put(8, 1, 7471, False); put(9, 1, 7472, False)
# counter row 4 (x5..9), staff walk behind it on row 3; suggestion box + newsletter rack close the staff area
put(5, 4, 7473); [put(x, 4, 7474) for x in (6, 7, 8)]; put(9, 4, 7475)
put(4, 3, 7483); put(10, 3, 7484)
# twin palms (2 tall) in the back corners, storage terminal on the right
put(0, 3, 7216); put(0, 4, 7217); put(14, 3, 7216); put(14, 4, 7217)
put(12, 4, 1764)
# violet rug at the heal stand (7,5) + runner to the door
rug = [[7238, 7239, 7240], [7241, 7242, 7243], [7244, 7245, 7246]]
for j in range(3):
    for i in range(3): put(6 + i, 5 + j, rug[j][i], False)
for y in (8, 9): put(7, y, 7242, False)
# waiting area: Aurelith sofas against the side walls' plants
put(1, 7, 7161); put(2, 7, 7162); put(12, 7, 7161); put(13, 7, 7162)
put(0, 9, 7214); put(14, 9, 7214); put(0, 7, 7213); put(14, 7, 7213)
put(DX, 10, 7490, False); col[10][DX] = 4
M = {
 'name': 'heal_aurelith', 'title': 'Revival Tech Aurelith branch', 'width': W, 'height': H, 'tile_size': 64, 'tileset': '../tileset.json',
 'layers': {'ground': g, 'decoration': dec, 'overlay': [[0] * W for _ in range(H)], 'collision': col, 'encounter': [[0] * W for _ in range(H)]},
 'warps': [{'x': DX, 'y': 10, 'to': 'aurelith', 'tx': 17, 'ty': 19, 'facing': 'down', 'note': 'exit to aurelith heal door (17,18)'}],
 'exits': [], 'npcs': [], 'signs': [], 'items': [], 'encounter_zones': [],
 'source': 'tools/maps_v2/build_heal_aurelith.py (Coder, Oct 29 2026)', 'region': 'aurelith', 'interior_kind': 'heal', 'interior_role': 'unique',
 'branding': 'Revival Tech capital branch (player employer): grander kit, fire heal FX (fx_art.js FX_CFG.healFire)',
 'text_pending': {
  'npcs': [
   {'id': 'heal_aurelith_carer', 'x': 7, 'y': 3, 'facing': 'down', 'kind': 'healer', 'note': 'capital branch attendant; talk across the counter from (7,5)', 'text_ref': 'rt_branch.attendant'},
   {'id': 'heal_aurelith_technician', 'x': 6, 'y': 3, 'facing': 'up', 'kind': 'rt_staff', 'note': 'polishing technician at the crystal polisher', 'text_ref': 'rt_branch.technician'},
   {'id': 'heal_aurelith_storage_user', 'x': 12, 'y': 5, 'facing': 'up', 'kind': 'TBD', 'note': 'using the storage PC (12,4)'},
   {'id': 'heal_aurelith_visitor', 'x': 3, 'y': 8, 'facing': 'left', 'kind': 'TBD', 'note': 'capital visitor in the waiting area'}],
  'signs': [{'x': 4, 'y': 3, 'text_ref': 'rt_branch.suggestion_box', 'id': 'suggestion_box'}, {'x': 10, 'y': 3, 'text_ref': 'rt_branch.newsletter', 'id': 'newsletter'}],
  'interact_spots': [{'id': 'company_terminal', 'kind': 'prop', 'x': 12, 'y': 4, 'stand': [11, 4], 'face': 'right', 'tile': 'i_company_terminal'}]},
 'entered_from': [{'map': 'aurelith', 'door': [17, 18], 'arrival': [DX, 9], 'return_to': [17, 19]}],
 'movement': {'run': True, 'bike': False, 'note': 'running allowed everywhere (incl. indoors); bike outdoors only - see MOVEMENT.md'},
}
json.dump(M, open(OUT, 'w'))
print('wrote', OUT)
