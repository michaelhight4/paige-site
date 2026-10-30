#!/usr/bin/env python3
"""Wellspire lab/polish solid-prop guard (Director art QA 2026-10-30).

grid_fit_and_swap.py --check only covers managed() tiles (^wlk_), so a solid wl_* prop (tank, vat, console...) flipped
to 'walk' passed CI. This fails if any such prop tile is walkable, or a map cell holding one has collision 0."""
import glob, json, re, sys
from pathlib import Path
root = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
ow = root / 'art/world/overworld'
SOLID = re.compile(r'^wl_(tank|bigtank|console|vat|jar|helix|scan|holo|growth|porthole|pit|wall)')
tiles = json.load(open(ow / 'tileset_arena.json'))
tiles = tiles['tiles'] if isinstance(tiles, dict) else tiles
solid = {t['id']: t['name'] for t in tiles if t.get('category') in ('wellspire_lab', 'wellspire_polish') and SOLID.match(t['name'])
         and not t.get('overlay_walk')}
bad = [f"tile {i} {solid[i]} is walkable" for t in tiles if (i := t['id']) in solid and (t.get('walkable') or t.get('collision') == 'walk')]
for p in sorted(glob.glob(str(ow / 'maps/*.json'))):
    m = json.load(open(p)); L = m.get('layers', {})
    col = L.get('collision') if isinstance(L, dict) else None
    if not isinstance(col, list): continue
    for name, grid in (L.items() if isinstance(L, dict) else []):
        if name == 'collision' or not isinstance(grid, list): continue
        for y, row in enumerate(grid):
            if not isinstance(row, list): continue
            for x, v in enumerate(row):
                if v in solid and y < len(col) and x < len(col[y]) and col[y][x] == 0:
                    bad.append(f"{Path(p).name} ({x},{y}) {name}={solid[v]} but collision 0")
print(f"wellspire solid props: {len(solid)} tiles checked, {len(bad)} problems")
for b in bad[:50]: print('  ' + b)
sys.exit(1 if bad else 0)
