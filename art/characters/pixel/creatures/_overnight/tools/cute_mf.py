"""manifest_overnight.jsonl lines for cute-set creatures (coder_cute_r1). Reuses mf.py's schema with DEX entries from design/cute_sets.
Usage: python3 cute_mf.py id...   (skips ids already present)"""
import sys, json, os, glob
src = open(os.path.join(os.path.dirname(__file__), 'mf.py')).read()
OUT = '/workspace/kilumen/art/characters/pixel/creatures/_overnight/manifest_overnight.jsonl'
have = set()
for l in open(OUT):
    try: have.add(json.loads(l)['name'])
    except Exception: pass
ids = [n for n in sys.argv[1:] if n not in have]
for n in sys.argv[1:]:
    if n in have: print('already', n)
if ids:
    src = src.replace("'worker': 'A'}", "'worker': 'coder_cute_r1'}").replace("'note': 'draft, awaiting Gary'", "'note': 'draft, awaiting Gary; cute set r1 (Gary 2:19 PM CT Oct 23 2026), DEX entry in design/cute_sets/cute_r1.json; held out of encounter tables'")
    sys.argv = ['mf.py'] + ids
    g = {'__name__': '__main__', '__file__': 'mf.py'}
    # inject cute DEX after mf.py loads DEX_450
    src = src.replace("OUT = f'{CRE}/_overnight/manifest_overnight.jsonl'",
        "OUT = f'{CRE}/_overnight/manifest_overnight.jsonl'\nimport glob as _g\nfor _s in _g.glob('/workspace/kilumen/design/cute_sets/cute_r*.json'):\n    for _c in json.load(open(_s))['creatures']: DEX.setdefault(_c['id'], _c)")
    assert "worker': 'coder_cute_r1'" in src and '_g.glob' in src
    exec(compile(src, 'mf.py', 'exec'), g)
