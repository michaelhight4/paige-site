#!/usr/bin/env python3
"""Regions 7-8 World Design P3 (Oct 29 2026): give Lanternport (harbour) and Cindervale (foundry) more life.
Props on empty walkable cells only (asserted), a Lanternport pier into the harbour, market stalls, and new
townsfolk kept in text_pending until Text Bot adds maps.<town>.<id> lines. Idempotent.
Usage: python3 tools/wd_r78/town_life.py  (repo root)"""
import json
OW = 'art/world/overworld'
TS = json.load(open(f'{OW}/tileset.json'))['tiles'] + json.load(open(f'{OW}/tileset_ix2.json'))['tiles']
ID = {t['name']: t['id'] for t in TS}

def prop(m, name, x, y, code=1):
    L = m['layers']
    if L['decoration'][y][x] == ID[name]: return
    assert L['decoration'][y][x] == 0 and L['collision'][y][x] == 0, (m['name'], name, x, y, L['collision'][y][x])
    L['decoration'][y][x] = ID[name]; L['collision'][y][x] = 0 if name.startswith('flowers') else code

def npc(m, id, x, y, facing, note):
    tp = m.setdefault('text_pending', {}); lst = tp.setdefault('npcs', [])
    if any(n['id'] == id for n in lst): return
    assert m['layers']['collision'][y][x] == 0, (id, x, y)
    lst.append(dict(id=id, x=x, y=y, facing=facing, kind='townsfolk', note=note, text_ref=f'maps.{m["name"]}.{id}'))
    tp['note'] = 'Real, placed NPCs kept out of npcs until Text Bot adds maps.<town>.<id> lines (validator requires text). Engine places them once lines exist (overworld.js text_pending rule). Requests: design/regions78/wd_text_spots.md'

# ---- Lanternport ----
m = json.load(open(f'{OW}/maps/lanternport.json'))
L = m['layers']
# pier: 2-wide boardwalk south from the quay into the harbour, T-head with two harbour lanterns
for y in range(33, 38):
    for x in (26, 27):
        L['decoration'][y][x] = ID['x_boardwalk_v']; L['collision'][y][x] = 0
for x in range(24, 30):
    L['decoration'][38][x] = ID['x_boardwalk_h']; L['collision'][38][x] = 0
for x in (24, 29):
    L['decoration'][38][x] = ID['keeper_lantern']; L['collision'][38][x] = 1
# quay: crates / barrels at the ends, benches facing the water
for n, x, y in [('i_barrel', 12, 31), ('i_crates_0_0', 12, 32), ('i_crates_0_1', 13, 32), ('i_net', 41, 31), ('i_barrel', 41, 32), ('i_anchor', 40, 32),
                ('x_city_bench_h', 18, 32), ('x_city_bench_h', 34, 32)]:
    prop(m, n, x, y)
# fish / bread stall on the north square, flowers, net drying by the west street end
for n, x, y in [('x_city_stall_fruit_0_0', 16, 15), ('x_city_stall_fruit_1_0', 16, 16), ('x_city_stall_fabric_0_0', 34, 15), ('x_city_stall_fabric_1_0', 34, 16),
                ('flowers_warm', 13, 14), ('flowers_warm', 14, 14), ('flowers_violet', 40, 14), ('flowers_violet', 41, 14),
                ('i_net', 12, 24), ('i_barrel', 13, 24)]:
    prop(m, n, x, y)
npc(m, 'lanternport_pier_fisher', 26, 37, 'down', 'fisher at the end of the pier, line in the water')
npc(m, 'lanternport_stall_vendor', 16, 14, 'down', 'harbour fruit stall, gossip about the storm (look only)')
npc(m, 'lanternport_sailmaker', 34, 14, 'down', 'sail-cloth stall, patches storm-torn sails')
npc(m, 'lanternport_dock_worker', 39, 32, 'left', 'stacking crates on the quay')
json.dump(m, open(f'{OW}/maps/lanternport.json', 'w'), separators=(',', ':'))

# ---- Cindervale ----
m = json.load(open(f'{OW}/maps/cindervale.json'))
for n, x, y in [('i_anvil', 35, 27), ('i_tool_rack', 36, 26), ('i_ore_cart', 39, 27), ('i_ore_cart', 40, 27), ('kit_crates_worn_red_0_0', 38, 29), ('kit_crates_worn_red_0_1', 39, 29),
                ('i_barrel', 41, 26), ('rock', 34, 29), ('rock', 41, 29),
                ('x_city_stall_bread_0_0', 13, 28), ('x_city_stall_bread_1_0', 13, 29), ('x_city_stall_crystal_0_0', 17, 28), ('x_city_stall_crystal_1_0', 17, 29),
                ('x_city_bench_h', 19, 16), ('x_city_bench_h', 33, 16), ('rock', 12, 16), ('rock', 13, 16)]:
    prop(m, n, x, y)
npc(m, 'cindervale_ore_hauler', 38, 28, 'up', 'hauler unloading ore carts in the forge yard')
npc(m, 'cindervale_apprentice', 35, 28, 'up', 'apprentice practising on the yard anvil')
npc(m, 'cindervale_stall_baker', 13, 27, 'down', 'oven-bread stall by the hall')
npc(m, 'cindervale_crystal_seller', 17, 27, 'down', 'polished ore and crystal trinkets (look only)')
json.dump(m, open(f'{OW}/maps/cindervale.json', 'w'), separators=(',', ':'))
print('ok')

# ---- route_fernwick_lanternport: plan wants 5 road trainers (had 4). 5th in text_pending until its lines exist ----
m = json.load(open(f'{OW}/maps/route_fernwick_lanternport.json'))
lst = m.setdefault('text_pending', {}).setdefault('npcs', [])
if not any(n['id'] == 'route_fernwick_lanternport_trainer_5' for n in lst):
    assert m['layers']['collision'][26][16] == 0
    lst.append({"id": "route_fernwick_lanternport_trainer_5", "x": 16, "y": 26, "facing": "right", "kind": "trainer_hooded",
                "gd_id": "tr_route_fernwick_lanternport_e", "gd_class": "sailor", "team": [{"species": "mooncrab", "level": 47}, {"species": "moorcoil", "level": 48}],
                "sight": 4, "sight_range": 4, "prize": 2900, "sight_cells": [[17, 26], [18, 26], [19, 26], [20, 26]],
                "text_ref": "overworld_lines.json maps.route_fernwick_lanternport.route_fernwick_lanternport_trainer_5",
                "note": "WD r78 P3: 5th road trainer per REGIONS_78_PLAN (route_fernwick_lanternport 5). Needs Text Bot lines + Coder/GD standin check"})
    m['text_pending'].setdefault('note', 'Real, placed NPCs kept out of npcs until Text Bot adds lines (validator requires text).')
    json.dump(m, open(f'{OW}/maps/route_fernwick_lanternport.json', 'w'), separators=(',', ':'))
print('route ok')
