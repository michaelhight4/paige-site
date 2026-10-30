"""Cairnfold's own Revival Tech branch + RT Stores (wellspire fixes, Oct 30 2026).
Cairnfold was a Frostspire clone whose heal door went to heal_brookhollow and whose shop door went to the shared
shop_int ("RT Stores · Brookhollow", starter stock). This builds heal_cairnfold (from heal_frostspire: pine floor,
red rug) and shop_cairnfold (from shop_int: slate floor, interior_kind 'mart'), repoints the two doors, registers the
branch (blackout respawn) + the 'wellspire' shop region (endgame stock), and adds PLACEHOLDER lines for Text Bot.
Idempotent: re-run safely."""
import json, os, copy
R = os.path.join(os.path.dirname(__file__), '..', '..')
M = os.path.join(R, 'art/world/overworld/maps')
def lj(p): return json.load(open(p))
def dj(p, d, ind=1): open(p, 'w').write(json.dumps(d, indent=ind, ensure_ascii=False) + '\n')
ts = lj(os.path.join(R, 'art/world/overworld/tileset.json'))
nid = {t['name']: t['id'] for t in ts['tiles']}; idn = {v: k for k, v in nid.items()}
def swap(d, layer, fn):
    g = d['layers'][layer]
    for y, row in enumerate(g):
        for x, v in enumerate(row):
            n = idn.get(v)
            if n:
                m = fn(n, x, y)
                if m != n: row[x] = nid[m]
PH = 'PLACEHOLDER (Text Bot):'
# ---- heal_cairnfold
h = lj(f'{M}/heal_frostspire.json'); h = copy.deepcopy(h)
h.update(name='heal_cairnfold', title='Revival Tech Cairnfold branch', region='wellspire',
         source='tools/wellspire/cairnfold_services.py (from heal_frostspire; pine floor, red rug)',
         unique_reason='Cairnfold Revival Tech branch: own branch state (blackout respawn + copay = shops.json branches.heal_cairnfold)',
         entered_from=[{'map': 'r9_cairnfold', 'door': [15, 25], 'arrival': [6, 7]}])
h['warps'] = [{'x': 6, 'y': 8, 'to': 'r9_cairnfold', 'tx': 15, 'ty': 26, 'facing': 'down'}]
swap(h, 'ground', lambda n, x, y: n.replace('i_floor_rtbranch_', 'i_floor_pine_') if n.startswith('i_floor_rtbranch_') else n)
swap(h, 'decoration', lambda n, x, y: n.replace('i_rug_violet_', 'i_rug_red_') if n.startswith('i_rug_violet_') else n)
tp = h.get('text_pending', {})
for k in ('npcs', 'signs', 'interact_spots'):
    for e in tp.get(k, []) or []:
        if isinstance(e.get('id'), str): e['id'] = e['id'].replace('heal_frostspire', 'heal_cairnfold')
        e.pop('text_was', None)
dj(f'{M}/heal_cairnfold.json', h)
# ---- shop_cairnfold
s = copy.deepcopy(lj(f'{M}/shop_int.json'))
s.update(name='shop_cairnfold', title='RT Stores Cairnfold mart', region='wellspire', interior_kind='mart', interior_role='unique',
         source='tools/wellspire/cairnfold_services.py (from shop_int; slate floor)',
         unique_reason='Cairnfold mart: own interior + Wellspire endgame stock (shops.json regions.wellspire)',
         entered_from=[{'map': 'r9_cairnfold', 'door': [22, 25], 'arrival': [5, 7]}])
s['warps'] = [{'x': 5, 'y': 8, 'to': 'r9_cairnfold', 'tx': 22, 'ty': 26, 'facing': 'down'}]
swap(s, 'ground', lambda n, x, y: 'i_floor_slate_' + 'abc'[(x * 7 + y * 3) % 3] if n == 'floor_tile' else n)
for n in s.get('npcs', []):
    if n['id'] == 'clerk': n['id'] = 'shop_cairnfold_clerk'; n['variant_of'] = 'clerk'
s.pop('text_pending', None)
dj(f'{M}/shop_cairnfold.json', s)
# ---- doors
cf = lj(f'{M}/r9_cairnfold.json')
for w in cf['warps']:
    if (w['x'], w['y']) == (15, 25): w.update(to='heal_cairnfold', tx=6, ty=7)
    if (w['x'], w['y']) == (22, 25): w.update(to='shop_cairnfold', tx=5, ty=7)
for sp in cf.get('interact_spots', []):
    if sp['id'] == 'r9_cairnfold_sign': sp.update(kind='sign', tile='sign', text='maps.r9_cairnfold.r9_cairnfold_sign')
dj(f'{M}/r9_cairnfold.json', cf)
# ---- layout zone
lp = os.path.join(R, 'art/world/overworld/world_layout.json'); raw = open(lp).read(); lay = json.loads(raw)
for z in lay['zones']:
    if z['id'] == 'wellspire':
        for m in ('heal_cairnfold', 'shop_cairnfold'):
            if m not in z['maps']: z['maps'].append(m)
for m in ('heal_cairnfold', 'shop_cairnfold'):
    if 'maps_built' in lay and m not in lay['maps_built']: lay['maps_built'].append(m)
ind = len(raw.split('\n')[1]) - len(raw.split('\n')[1].lstrip()) if raw.startswith('{\n') else None
open(lp, 'w').write(json.dumps(lay, indent=ind, ensure_ascii=False, separators=None if ind else (',', ':')) + '\n')
# ---- shops.json: branch + region
sp_ = os.path.join(R, 'src/systems/data/shops.json'); raw = open(sp_).read(); sh = json.loads(raw)
sh['branches']['heal_cairnfold'] = {'zone': 'wellspire', 'carer': 'heal_cairnfold_carer', 'stand': {'x': 6, 'y': 5, 'facing': 'up'},
                                    'returnDoor': {'map': 'r9_cairnfold', 'x': 15, 'y': 25}}
sh['regions']['wellspire'] = {'city': 'Cairnfold', 'copay': 400, 'prices': {}, 'stock': [
    {'coins': 0, 'items': ['fine_crystal', 'dominance_crystal_plus', 'tonic_large', 'energy_tonic', 'remedy_pouch', 'calm_tea', 'trail_mix', 'feed_bag']},
    {'coins': 8, 'items': ['apex_crystal', 'vigor_seed', 'deepgut_paste', 'mint_sprig']},
    {'coins': 8, 'items': ['iron_brace', 'focus_lens', 'steady_sight', 'quick_tassel']}]}
ind = len(raw.split('\n')[1]) - len(raw.split('\n')[1].lstrip())
open(sp_, 'w').write(json.dumps(sh, indent=ind, ensure_ascii=False) + '\n')
# ---- placeholder lines
lp = os.path.join(R, 'text/overworld_lines.json'); raw = open(lp).read(); L = json.loads(raw)
mp = L['maps']
src = mp.get('heal_frostspire', {})
hc = mp.setdefault('heal_cairnfold', {})
def ph(key, pages, **extra):
    e = {'pages': pages, 'lines': [{'id': 'default', 'flags': [], 'pages': pages}], 'status': 'PLACEHOLDER', 'note': f'{PH} {key}', **extra}
    return e
for nid_, e in src.items():
    k = nid_.replace('heal_frostspire', 'heal_cairnfold')
    if k in hc: continue
    if nid_.endswith('_carer'):
        hc[k] = ph(f'maps.heal_cairnfold.{k}', ['Welcome to Revival Tech, Cairnfold branch.', 'Want me to rest your team?'],
                   after_heal=['All rested. Mind the ice on the way out.'], declined=['Okay. The bench by the heater is free.'])
    elif 'rostspire' in json.dumps(e) or nid_.endswith('_technician'):
        hc[k] = ph(f'maps.heal_cairnfold.{k}', ['Cold crystals crack if you polish them too fast.', 'So I go slow.'] if nid_.endswith('_technician') else ['Revival Tech, Cairnfold branch.'])
    else:
        hc[k] = copy.deepcopy(e)  # generic branch prop text, same as every branch
sc_ = mp.setdefault('shop_cairnfold', {})
sc_.setdefault('shop_cairnfold_clerk', ph('maps.shop_cairnfold.shop_cairnfold_clerk', ['RT Stores, Cairnfold. Last shop before the summit.', 'What do you need?'], kind='clerk', variant_of='clerk'))
mp.setdefault('r9_cairnfold', {}).setdefault('r9_cairnfold_sign', ph('maps.r9_cairnfold.r9_cairnfold_sign', ['CAIRNFOLD', 'Revival Tech branch · RT Stores']))
ind = len(raw.split('\n')[1]) - len(raw.split('\n')[1].lstrip())
open(lp, 'w').write(json.dumps(L, indent=ind, ensure_ascii=False) + '\n')
print('ok', sorted(hc), sorted(sc_))
# ---- npc sprites: same uniforms as the Frostspire branch
sp_ = os.path.join(R, 'art/characters/pixel/npcs/npc_sprite_map.json'); raw = open(sp_).read(); S = json.loads(raw)
for k, v in list(S['map'].items()):
    if k.startswith('heal_frostspire.'):
        S['map'].setdefault(k.replace('heal_frostspire', 'heal_cairnfold'), copy.deepcopy(v))
ind = len(raw.split('\n')[1]) - len(raw.split('\n')[1].lstrip())
open(sp_, 'w').write(json.dumps(S, indent=ind, ensure_ascii=False) + '\n')
