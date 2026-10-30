#!/usr/bin/env python3
"""Register the Gullhaven maps in world_layout, encounters_wired and fishing_tables. Idempotent."""
import json, os
R = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../..'))
def lj(p): return json.load(open(os.path.join(R, p)))
CAPS_FMT = {}
def dj(p, d, **k):
    f = os.path.join(R, p); nl = open(f).read().endswith(chr(10))
    open(f, 'w').write(json.dumps(d, **(k or {'indent': 1})) + (chr(10) if nl else ''))
NEW = ['gullhaven', 'gullhaven_lagoon', 'gullhaven_cliffs', 'gullhaven_sea', 'gullhaven_cave_west', 'gullhaven_cave_east']
w = lj('art/world/overworld/world_layout.json')
w['zones'] = [z for z in w['zones'] if z['id'] != 'gullhaven']
fp = {"x": 7, "y": 10, "facing": "down"}
w['zones'].append({"id": "gullhaven", "name": "Gullhaven", "type": "town", "map_pos": {"x": 0.62, "y": 0.93},
    "map_label": {"x0": 0.585, "y0": 0.94, "x1": 0.66, "y1": 0.965}, "status": "built", "maps": NEW,
    "puzzle_tier": 6, "fly_point": fp, "fly": True, "rail_stop": False, "no_fly_reason": None,
    "reached_by": "Tideglide south from Tidewater Coast; sea maze -> Kelpwind/Gullbone Cave -> Gullhaven Cliffs",
    "level_band": {"wild": [52, 56], "trainers": [54, 58]}, "feature": "Gullhaven Fishing Derby (gullhaven_lagoon)"})
for m in NEW:
    if m not in w['maps_built']: w['maps_built'].append(m)
w['fly']['destinations']['gullhaven'] = {"visited_flag": "visited_gullhaven", "fly": True, "rail_stop": False, "fly_point": fp, "map": "gullhaven"}
dj('art/world/overworld/world_layout.json', w, ensure_ascii=True)

e = lj('data/encounters_wired.json')
S = lambda sp, lo, hi, wt, **k: dict(species=sp, level=[lo, hi], weight=wt, **k)
e['zones']['gullhaven_sea_water'] = {"method": "surf", "rate": 0.08, "band": [52, 56], "maps": ["gullhaven_sea"], "slots": [
    S('wavelin', 52, 55, 30), S('reefshell', 52, 55, 25), S('ribboneel', 53, 55, 18), S('breakerfin', 54, 56, 12),
    S('hullwhale', 54, 56, 10), S('tidemarrow', 56, 56, 5)]}
for cv, slots in (('gullhaven_cave_west_cave', [S('kelpstrider', 52, 55, 35), S('barnaclump', 53, 55, 30), S('echoshell', 52, 54, 25), S('olmling', 55, 56, 10)]),
                  ('gullhaven_cave_east_cave', [S('pearlisk', 52, 55, 30), S('brinecube', 52, 55, 30), S('wreckwarden', 53, 55, 25), S('squidge', 54, 56, 10), S('medulet', 56, 56, 5)])):
    e['zones'][cv] = {"method": "cave", "rate": 0.06, "band": [52, 56], "maps": [cv.rsplit('_cave', 1)[0]], "slots": slots}
dj('data/encounters_wired.json', e)
src = lj('art/world/overworld/encounters/encounters.json')  # source table (habitat tools regenerate wired from it)
for k in ('gullhaven_sea_water', 'gullhaven_cave_west_cave', 'gullhaven_cave_east_cave'): src['zones'][k] = e['zones'][k]
dj('art/world/overworld/encounters/encounters.json', src)
caps = lj('tools/level_curve/rod_caps.json')
for m in ('gullhaven_lagoon', 'gullhaven_sea', 'gullhaven_cliffs'): caps[m] = 58  # band 52-56 wild, 54-58 trainers
dj('tools/level_curve/rod_caps.json', caps, **CAPS_FMT)

f = lj('data/fishing_tables.json')
def tier(rows): return {"slots": [dict(species=s, level=[lo, hi], weight=wt, rarity=r) for s, lo, hi, wt, r in rows]}
LAG = {"basic": tier([('wavelin', 50, 53, 45, 'common'), ('reefshell', 50, 53, 35, 'common'), ('ribboneel', 51, 54, 15, 'uncommon'), ('spratwyrm', 53, 54, 5, 'rare')]),
       "good": tier([('wavelin', 52, 54, 30, 'common'), ('hullwhale', 52, 55, 25, 'common'), ('ribboneel', 52, 55, 20, 'uncommon'), ('breakerfin', 53, 55, 15, 'uncommon'), ('spratwyrm', 54, 55, 7, 'rare'), ('tidemarrow', 55, 55, 3, 'rare')]),
       "super": tier([('hullwhale', 53, 56, 25, 'common'), ('breakerfin', 54, 56, 25, 'uncommon'), ('ribboneel', 54, 56, 20, 'uncommon'), ('spratwyrm', 55, 56, 14, 'rare'), ('tidemarrow', 55, 56, 10, 'rare'), ('plashcrown', 56, 56, 6, 'rare')])}
f['maps']['gullhaven_lagoon'] = LAG
f['maps']['gullhaven_sea'] = copy = json.loads(json.dumps(LAG))
f['maps']['gullhaven_cliffs'] = {"basic": tier([('paleminnow', 50, 52, 70, 'common'), ('finnip', 50, 52, 30, 'uncommon')]),
                                 "good": tier([('paleminnow', 51, 53, 50, 'common'), ('finnip', 51, 53, 35, 'uncommon'), ('whelkin', 53, 53, 15, 'rare')]),
                                 "super": tier([('finnip', 52, 54, 50, 'uncommon'), ('whelkin', 53, 55, 50, 'rare')])}
dj('data/fishing_tables.json', f)
print('registered')
