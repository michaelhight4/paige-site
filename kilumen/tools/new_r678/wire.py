"""NEW 35 + 5 uncatchable wiring (Coder, Oct 31 2026; Gary pt2665u). Idempotent: species entries in species_synced.gen.js,
wild slots in both encounter files, Lanternport (R7) wild cap 60. All numbers PLACEHOLDER (sync_creatures formula)."""
import json, re
SP = 'src/ui/species_synced.gen.js'
NEW = json.load(open('/workspace/kilumen/design/new_r678/NEW_35.json'))['creatures']
STAGE_TOTAL = {1: 285, 2: 375, 3: 480}; RM = {'common': 1, 'uncommon': 1.04, 'rare': 1.08, 'very rare': 1.14}
RC = {'common': 1, 'uncommon': 0.8, 'rare': 0.6, 'very rare': 0.4}
LEAN = {'earth': [1.1, 1.05, 1.25, 0.8, 0.95, 0.85], 'fire': [0.95, 1.05, 0.9, 1.2, 0.9, 1.0], 'water': [1.05, 0.95, 1.0, 1.05, 1.1, 0.85],
  'sea': [1.15, 1.0, 1.05, 1.0, 1.0, 0.8], 'rain': [1.0, 0.9, 0.95, 1.1, 1.1, 0.95], 'wind': [0.9, 0.95, 0.85, 1.05, 0.95, 1.3],
  'bird': [0.9, 1.1, 0.85, 0.95, 0.9, 1.3], 'grass': [1.05, 0.95, 1.05, 1.05, 1.1, 0.8], 'bug': [0.95, 1.1, 1.1, 0.85, 0.95, 1.05],
  'light': [0.95, 0.85, 0.9, 1.25, 1.1, 0.95], 'dark': [0.9, 1.15, 0.9, 1.0, 0.9, 1.15], 'ghost': [0.85, 0.95, 0.9, 1.2, 1.05, 1.05],
  'mystic': [0.95, 0.85, 0.9, 1.25, 1.1, 0.95], 'spirit': [1.0, 0.85, 0.95, 1.15, 1.15, 0.9], 'magma': [1.05, 1.15, 1.1, 1.0, 0.85, 0.85]}
POOL = {'earth': 'earth', 'grass': 'earth', 'bug': 'earth', 'fire': 'fire', 'magma': 'fire', 'water': 'water', 'sea': 'water', 'rain': 'water',
  'wind': 'wind', 'bird': 'wind', 'light': 'light', 'dark': 'dark', 'ghost': 'dark', 'mystic': 'mystic', 'spirit': 'mystic'}
K = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
FOUND = {6: 'Tidewater Coast', 7: 'Lanternport', 8: 'Cindervale'}
def stats(t, rar, stage, ln):
    tot = (STAGE_TOTAL[stage] if ln > 1 else 400) * RM[rar]
    w = [LEAN[t[0]][i] * 0.7 + LEAN[t[-1]][i] * 0.3 for i in range(6)]; s = sum(w)
    return {k: max(20, round(tot * w[i] / s)) for i, k in enumerate(K)}
src = open(SP).read()
have = set(re.findall(r'"id":"([a-z0-9_]+)"', src)); maxdex = max(int(x) for x in re.findall(r'"dex":(\d+)', src))
maxdex = max(maxdex, 482)  # Jestrix line (species_jestrix.js) holds 479-482
lines = []
for n, c in enumerate(NEW):
    i = c['id']
    if i in have: continue
    ev = c['evolution']; st, ln = ev['stage'], ev['line_length']
    m = re.search(r'(\d+)', ev.get('method') or '')
    e = {'id': i, 'name': c['name'], 'el': c['types'], 'line': f"dex:{ev['line'][0]}", 'found': FOUND[c['region']], 'blurb': '',
         'blurbKey': f'system_kilindex.entries.{i}.blurb', 'dex': maxdex + 1 + n, 'rarity': 'rare' if c['rarity'] == 'very rare' else c['rarity'],
         'stage': st - 1 if ln > 1 else -1, 'prevo': ev['evolves_from'], 'evo': ev['evolves_to']}
    if ev['evolves_from']: e['evoLevel'] = int(m.group(1))
    e.update({'baseStats': stats(c['types'], c['rarity'], st, ln),
        'catchRate': round((0.6 if st <= 1 else 0.4 if st == 2 else 0.2) * RC[c['rarity']], 3),
        'baseXp': 50 + 40 * max(0, st - 1) + (10 if 'rare' in c['rarity'] else 0), 'skillPool': POOL[c['types'][0]],
        'icon': {'f0': f'creatures/{i}/overworld/{i}_ow/{i}_ow_down_stand.png', 'f1': f'creatures/{i}/overworld/{i}_ow/{i}_ow_down_walk1.png'},
        'synced': True, 'ph': 1, 'art': 'draft', 'newR678': 1})
    lines.append(json.dumps(e, separators=(',', ':')))
if lines:
    src = src.replace('}];\n', '},\n' + ',\n'.join(lines) + '];\n', 1)
    src = src.replace('+ r78 hand-wired 14', '+ r78 hand-wired 14 + NEW r678 35 (tools/new_r678/wire.py, Oct 31 2026)', 1)
    open(SP, 'w').write(src)
# wild slots: zone -> [(species, lo, hi, weight, time?)]
ADD = {
 'route_coast_grass': [('shoalpup', 43, 44, 12), ('cocklet', 46, 48, 10), ('drizzlop', 46, 48, 4, 'night')],
 'route_coast_water': [('nubbinray', 46, 48, 10), ('swellhound', 45, 47, 8)],
 'tidewater_coast_grass': [('puffgill', 47, 49, 10), ('kelpkit', 47, 49, 10), ('foamfawn', 47, 49, 4), ('drizzlop', 47, 49, 3)],
 'tidewater_coast_water': [('puffgill', 47, 49, 6), ('galecrest', 48, 49, 3), ('breakwarden', 48, 49, 3)],
 'tidewater_coast_cave': [('undertusk', 48, 49, 3), ('cocklet', 47, 49, 8)],
 'route_fernwick_lanternport_grass': [('wickmote', 57, 60, 12), ('paperpaw', 57, 60, 12), ('lampwisp', 54, 55, 12), ('lensmoth', 57, 60, 5), ('hushlet', 57, 60, 5, 'night'), ('hearthkit', 56, 58, 8)],
 'lanternport_water': [('fogkin', 56, 59, 8), ('bellbuoy', 56, 59, 8), ('tidelore', 57, 59, 3), ('veilfin', 58, 59, 2)],
 'lanternport_grotto_cave': [('lanternshade', 56, 60, 10), ('fogkin', 58, 60, 8), ('lanternkeep', 59, 60, 4)],
 'route_cindervale_grass': [('ashbun', 66, 68, 12), ('pumicub', 66, 68, 12), ('emberkip', 60, 61, 8), ('forgehorn', 58, 59, 10), ('smoglet', 66, 68, 8), ('geysquirt', 66, 68, 8), ('cinderpip', 66, 68, 4), ('flarekite', 62, 66, 5), ('smeltbull', 60, 65, 6)],
 'cindervale_caldera_cave': [('slagdrake', 67, 68, 4), ('anvilaurox', 66, 68, 3), ('pyrevane', 68, 68, 1), ('calderune', 68, 68, 2), ('clinkerback', 67, 68, 4), ('cinderwyrm', 67, 68, 2), ('emberseraph', 68, 68, 1, 'night'), ('geysquirt', 67, 68, 6)],
}
R7 = {'lanternport_water': (56, 59), 'route_fernwick_lanternport_grass': (57, 60), 'route_fernwick_lanternport_water': (57, 60), 'lanternport_grotto_cave': (58, 60), 'lp_harbour': (55, 56)}
def capr7(z, lo, hi):
    for s in z['slots']:
        a, b = s['level']
        if b > 60 or a > 60: s['level'] = [max(54, min(a, hi) if a <= 60 else lo), min(60, hi if b > hi else b)]
        if s['level'][0] > s['level'][1]: s['level'][0] = s['level'][1]
    if isinstance((z.get('cap') or {}).get('level'), list): z['cap']['level'] = [min(z['cap']['level'][0], 60), min(z['cap']['level'][1], 60)]
    elif isinstance((z.get('cap') or {}).get('level'), int): z['cap']['level'] = min(z['cap']['level'], 60)
for f in ['data/encounters_wired.json', 'art/world/overworld/encounters/encounters.json']:
    d = json.load(open(f)); Z = d['zones']
    for zid, (lo, hi) in R7.items():
        if zid in Z: capr7(Z[zid], lo, hi)
    for zid, sl in ADD.items():
        if zid not in Z: continue
        cur = {s['species'] for s in Z[zid]['slots']}
        for t in sl:
            if t[0] in cur: continue
            s = {'species': t[0], 'level': [t[1], t[2]], 'weight': t[3], 'src': 'new_r678'}
            if len(t) > 4: s['time'] = [t[4]]
            Z[zid]['slots'].append(s)
    for k in ('species_with_art',):
        if isinstance(d.get(k), list):
            for t in {x[0] for v in ADD.values() for x in v}:
                if t not in d[k]: d[k].append(t)
    json.dump(d, open(f, 'w'), indent=1, ensure_ascii=False); open(f, 'a').write('\n')
print('added', len(lines))
