"""Sunmeadow barn + beekeeper cottage (Gary approved, Oct 30 2026 12:48 PM CT via World Design, kilumen_balance_plan_wd.md).
The Bee Hollow cave doors (25,11) and (40,30) are gone: the pocket moved to route_sunmeadow_mirefen (cave_hive, see
pass2_specs/route_sunmeadow_mirefen.py). Here: a red barn (farm_pool kit, 5x4, x23-27 y8-11) whose closed doors sit on the
old mouth (25,11), and the tl_cabin beekeeper cottage (x39-41 y28-30, closed door 40,30) facing south into the old hollow,
which is now an open bee yard: the one-way ledge at y36 x36-38 becomes plain grass so the yard joins the south strip both ways.
Both are plain buildings (door collision 1, no warp). Beehives by the cottage, a scarecrow and a hay bale by the barn.
Run on the current map (not a rebuild), then wd_scenes.py and tools/map_audit/fix_live_flags.py. Idempotent."""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, 'art/world/overworld/maps/sunmeadow_fields.json')
TS = {t['name']: t['id'] for t in json.load(open(os.path.join(ROOT, 'art/world/overworld/tileset.json')))['tiles']}
m = json.load(open(P)); L = m['layers']; G, D, O, C, E = (L[k] for k in ('ground', 'decoration', 'overlay', 'collision', 'encounter'))
NM = {v: k for k, v in TS.items()}
def nm(t): return NM.get(t, '')
GRASS = G[12][25]
def clear(x, y):
    D[y][x] = 0; O[y][x] = 0; C[y][x] = 0; E[y][x] = 0
    if not nm(G[y][x]).startswith('grass'): G[y][x] = GRASS
def kill_tree(x, y):  # whole tree: trunk (tree_base) + its canopy one row up
    if nm(D[y][x]).startswith('tree_base'):
        clear(x, y)
        if y > 0 and O[y - 1][x]: O[y - 1][x] = 0
def building(x0, y0, w, h, name):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w): kill_tree(x, y)
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            clear(x, y); D[y][x] = TS[name(y - y0, x - x0)]; C[y][x] = 1
def prop(name, x, y): clear(x, y); D[y][x] = TS[name]; C[y][x] = 1
# hollow content moved to the route: drop its warps, trainer, egg spot and items here
m['warps'] = [w for w in m['warps'] if w.get('pocket') != 'smf_pocket_hollow']
m['npcs'] = [n for n in m['npcs'] if n['id'] != 'r9_smfp_beekeeper']
m['interact_spots'] = [s for s in m.get('interact_spots', []) if s['id'] != 'r9_smfp_egg_hive']
m['items'] = [i for i in m['items'] if i['id'] not in ('r9_smfp_seed_e', 'smf_hollow_seed_visible')]
for i in m['items']:
    if i['id'] == 'sunmeadow_fields_item_2' and (i['x'], i['y']) == (39, 28): i['x'] = 38   # was under the cottage's back row
# R6: the Bee Hollow's visible seed left with the hollow, so the Clover Dell shows one instead (spec: smf_dell_seed_visible)
if not any(i['id'] == 'smf_dell_seed_visible' for i in m['items']):
    m['items'].append({'id': 'smf_dell_seed_visible', 'x': 18, 'y': 28, 'hidden': False, 'item': 'vigor_seed', 'flag': 'item_sunmeadow_fields_smf_dell_seed_visible'})
# barn on the old north mouth, cottage on the old pocket door
building(23, 8, 5, 4, lambda r, c: f'fp_barn_{r}_{c}')
building(39, 28, 3, 3, lambda r, c: f'tl_cabin_{r}_{c}')
for x in range(36, 39):                       # ledge -> grass: the yard is open both ways
    if nm(D[36][x]).startswith('ledge'): clear(x, 36)
prop('fp_scarecrow', 29, 13); prop('fp_hay_bale', 22, 12)
prop('fp_beehive', 43, 31); prop('fp_beehive', 44, 33); prop('fp_beehive', 42, 34)
json.dump(m, open(P, 'w'), indent=1)
print('ok', len(m['warps']), 'warps')
