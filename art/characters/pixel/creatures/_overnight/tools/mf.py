"""Append one manifest_overnight.jsonl line per creature (worker A), same schema as worker C's lines.
Usage: python3 mf.py n1 n2 ...   (skips names already present for worker A)"""
import sys, json, os
from PIL import Image
CRE = '/workspace/kilumen/art/characters/pixel/creatures'
DEX = {c['id']: c for c in json.load(open('/workspace/kilumen/design/DEX_450.json'))['creatures']}
OUT = f'{CRE}/_overnight/manifest_overnight.jsonl'
done = set()
if os.path.exists(OUT):
    for l in open(OUT):
        try:
            j = json.loads(l)
            if j.get('worker') == 'A': done.add(j['name'])
        except Exception: pass
def gifms(p):
    im = Image.open(p); ms = []
    try:
        while True: ms.append(im.info.get('duration')); im.seek(im.tell() + 1)
    except EOFError: pass
    return ms
for n in sys.argv[1:]:
    if n in done: print('already', n); continue
    d = f'{CRE}/{n}'; r = lambda p: f'{n}/{p}'
    files = {'front': r(f'battle/{n}_front_128.png'), 'back': r(f'battle/{n}_back_128.png'),
             'front_2x': r(f'battle/{n}_front_128_2x.png'), 'back_2x': r(f'battle/{n}_back_128_2x.png'),
             'idle': {s: {'sheet': r(f'anim/{n}_{s}_idle_sheet.png'), 'frames': [r(f'anim/{n}_{s}_idle/{n}_{s}_idle_f{i}.png') for i in range(4)]} for s in ('front', 'back')},
             'walk': {dr: {'stand': r(f'overworld/{n}_ow/{n}_ow_{dr}_stand.png'), 'frames': [r(f'overworld/{n}_ow/{n}_ow_{dr}_walk{i}.png') for i in range(4)]} for dr in ('down', 'left', 'right', 'up')},
             'ow_sheet': r(f'overworld/{n}_ow_sheet.png'),
             'base': {k: r(f'base/{n}_{k}.png') for k in ('front', 'back', 'ow_down', 'ow_left', 'ow_right', 'ow_up')},
             'icon': {'sheet': r(f'icons/{n}_icon_sheet.png'), 'frames': [r(f'icons/{n}_icon_f{i}.png') for i in range(2)]}}
    if os.path.exists(f'{d}/cosmic/{n}_cosmic_swap.json'):
        files['cosmic'] = {'front': r(f'cosmic/{n}_cosmic_front_128.png'), 'back': r(f'cosmic/{n}_cosmic_back_128.png'), 'swap': r(f'cosmic/{n}_cosmic_swap.json')}
    def walkp(v):
        if isinstance(v, str): yield v
        elif isinstance(v, list):
            for x in v: yield from walkp(x)
        else:
            for x in v.values(): yield from walkp(x)
    miss = [p for p in walkp(files) if not os.path.exists(f'{CRE}/{p}')]
    assert not miss, miss
    line = {'dex': DEX[n]['dex_no'], 'name': n, 'dir': f'art/characters/pixel/creatures/{n}', 'files': files,
            'frames': {'battle_size': [128, 128], 'ow_size': [64, 64],
                       'idle': {'count': 4, 'ms': gifms(f'{d}/anim/{n}_front_idle_2x.gif')},
                       'walk': {'count': 4, 'ms': gifms(f'{d}/overworld/{n}_ow_walk_down_2x.gif')[0], 'dirs': ['down', 'left', 'right', 'up']},
                       'scales': {'battle': [1, 2], 'ow': [1, 2, 3]}},
            'status': 'draft', 'note': 'draft, awaiting Gary', 'wired': False, 'worker': 'A'}
    with open(OUT, 'a') as f: f.write(json.dumps(line) + '\n')
    print('manifest+', n)
