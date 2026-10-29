"""Flag every TV / couch pair that faces away from each other (couch must face its nearest TV, TV must face the couch).
    python tools/furniture/tv_couch_check.py [repo]      # exit 1 on any problem
Facing (vertical pieces only; side couches / couch3 / couch_low are skipped):
  couch faces DOWN: i_sofa_*, kit_couch_front      couch faces UP (back view): sofa (810/811)
  TV faces DOWN (top-wall, screen to viewer): tv, i_tv, i_tv_flat, kit_tv_unit      TV faces UP (seen from behind): kit_tv_back
A down-facing couch needs its nearest TV below it and facing up; an up-facing couch needs it above and facing down."""
import glob, json, os, re, sys
ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '../..'))
OW = os.path.join(ROOT, 'art/world/overworld')
def kind(t):
    n = re.sub(r'_\d+_\d+$', '', t['name']); p = (t.get('kit') or {}).get('piece')
    if p == 'couch_front' or n.startswith('i_sofa_'): return ('couch', 1)
    if n == 'sofa': return ('couch', -1)
    if p == 'tv_back': return ('tv', -1)
    if p == 'tv_unit' or n in ('tv', 'i_tv', 'i_tv_flat'): return ('tv', 1)
K = {t['id']: k for f in ('tileset.json', 'tileset_ix2.json') for t in json.load(open(os.path.join(OW, f)))['tiles'] if (k := kind(t))}
def check():
    probs = []
    for f in sorted(glob.glob(os.path.join(OW, 'maps', '*.json'))):
        m = json.load(open(f)); L = m['layers']; c = {'couch': [], 'tv': []}
        for k in ('ground', 'decoration', 'overlay'):
            for y, row in enumerate(L.get(k) or []):
                for x, v in enumerate(row):
                    if v in K: c[K[v][0]].append((x, y, K[v][1]))
        for (cx, cy, cf) in c['couch']:
            if not c['tv']: continue
            tx, ty, tf = min(c['tv'], key=lambda t: abs(t[0] - cx) + abs(t[1] - cy))
            ok = (ty - cy) * cf > 0 and tf == -cf
            if not ok: probs.append(f"{os.path.basename(f)[:-5]}: couch ({cx},{cy}) faces {'down' if cf > 0 else 'up'}, nearest TV ({tx},{ty}) is {'below' if ty > cy else 'above' if ty < cy else 'level'} facing {'down' if tf > 0 else 'up'}")
    return probs
if __name__ == '__main__':
    p = check(); print('\n'.join(p) or 'tv_couch_check: 0 problems'); sys.exit(1 if p else 0)
