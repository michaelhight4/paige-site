import sys
from classify import *
n = sys.argv[1]; keys = sys.argv[2:]
for rel in sprites(n):
    if (not keys or key_of(rel) in keys) and (rel.startswith('battle/') or rel.endswith('_stand.png')):
        a = load(n, rel); lab, k = components(a); F = comp_feats(lab, k); L = classify_key(n, rel)
        print(key_of(rel), a.shape[0], ' '.join(f"#{i}({f['cx']:.0f},{f['cy']:.0f}|{f['w']}x{f['h']}|{f['area']}){'C' if (L[lab==i]==1).any() else ''}" for i, f in F.items() if f['area'] >= 3 or (L[lab==i]==1).any()))
