"""Tide currents on real water (Coder, Oct 31 2026; Gary pt2665u "add ... tides"). Short lanes in open water, a calm lane
always beside each (escape sideways), ending on calm water, never on warps/exits/NPCs or across a required single-lane path."""
import json
M = 'art/world/overworld/maps/'
LANES = {
  'tidewater_coast': [((27, 37), 'down', 6)],          # sea lane to Gullhaven: col 27 runs seaward, col 26 stays calm both ways
  'route_coast': [((15, 28), 'right', 7)],             # 2-row crossing: row 28 drifts east, row 29 calm
  'lanternport': [((24, 34), 'left', 12), ((29, 34), 'right', 12)],  # harbour band (bridge x26-27 is the dry path); rows 33/35 calm
  'gullhaven_sea': [((6, 30), 'right', 15), ((34, 33), 'left', 14), ((36, 9), 'down', 7)],
}
D = {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}
for name, lanes in LANES.items():
    p = M + name + '.json'; raw = open(p).read(); m = json.loads(raw); C = m['layers']['collision']
    cur = {}
    for (x, y), d, n in lanes:
        for i in range(n):
            cx, cy = x + D[d][0] * i, y + D[d][1] * i
            assert C[cy][cx] in (3, 11), (name, cx, cy, C[cy][cx]); cur[f'{cx},{cy}'] = d
    m['currents'] = cur
    if raw.lstrip().startswith('{"'): s = json.dumps(m, separators=(',', ':'), ensure_ascii=False)
    else: s = json.dumps(m, indent=1, ensure_ascii=False)
    open(p, 'w').write(s + ('\n' if raw.endswith('\n') else ''))
    print(name, len(cur))
