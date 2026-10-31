"""Tidewater Coast fishing dock (Gary, Oct 30 2026): pier x35 becomes one straight 2-wide plank dock x35-36 y33-41 (all
hd_deck planks, no turn); the two pale sand-edged strips in the water (top L at y35 x24-29, channel x26-27 y36-45) are repainted as
plain water. The channel's gameplay is kept unchanged: collision 3 (glide water) + encounter on x26-27 and the south exit to
gullhaven_sea x26-27. Moored boats (harbour_dock kit), cargo (barrel, fish crate, net) and 3 fisher NPCs. Re-runnable."""
import json, os
P = os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'world', 'overworld', 'maps', 'tidewater_coast.json')
j = json.load(open(P)); L = j['layers']; G, D, C = L['ground'], L['decoration'], L['collision']
WATER = (33, 35, 37)
def water(x, y): G[y][x] = WATER[(x * 7 + y * 3) % 3]
for x in range(24, 30): water(x, 35)
for y in range(36, 46):
    for x in (26, 27): water(x, y)
for y in range(33, 42):
    for x in (35, 36): D[y][x] = 12705; C[y][x] = 0
for (x, y), t in {(36, 34): 12706, (36, 36): 12707, (36, 38): 12708}.items(): D[y][x] = t; C[y][x] = 1
for (x, y), t in {(37, 36): 12703, (37, 37): 12704, (34, 38): 12701, (37, 39): 12702}.items(): D[y][x] = t; C[y][x] = 1
F = [('tidewater_coast_dock_fisher_1', 36, 41, 'down'), ('tidewater_coast_dock_fisher_2', 35, 41, 'down'),
     ('tidewater_coast_dock_fisher_3', 36, 37, 'right')]
j['npcs'] = [n for n in j['npcs'] if not n['id'].startswith('tidewater_coast_dock_fisher')]
for i, x, y, f in F:
    j['npcs'].append({'id': i, 'x': x, 'y': y, 'facing': f, 'kind': 'villager', 'gd_class': 'angler',
                      'text_ref': f'overworld_lines.json maps.tidewater_coast.{i}', 'note': 'fishing dock (Gary Oct 30 2026)'})
json.dump(j, open(P, 'w'), indent=1)
T = os.path.join(os.path.dirname(__file__), '..', '..', 'text', 'overworld_lines.json'); t = json.load(open(T))
PH = {1: 'DRAFT placeholder: dock fisher 1 (casting off the dock end).', 2: 'DRAFT placeholder: dock fisher 2 (fishing off the end).',
      3: 'DRAFT placeholder: dock fisher 3 (line in by the boats).'}
for n, s in PH.items():
    t['maps']['tidewater_coast'].setdefault(f'tidewater_coast_dock_fisher_{n}', {'pages': [s], 'kind': 'villager', 'status': 'DRAFT',
        'owner': 'Text Bot', 'textbot_review': True, 'lines': [{'id': 'default', 'flags': [], 'pages': [s]}]})
json.dump(t, open(T, 'w'), indent=1, ensure_ascii=False)
print('ok')
