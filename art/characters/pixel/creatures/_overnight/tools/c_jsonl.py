"""append one manifest_overnight.jsonl line per finished creature (Coder wires from this)."""
import json, os, sys, fcntl
ROOT = '/workspace/kilumen/art/characters/pixel/creatures'
DEX = {e['id']: e for e in json.load(open('/workspace/kilumen/design/DEX_450.json'))['creatures']}
def line(n):
    d = f'{ROOT}/{n}'; r = lambda p: f'art/characters/pixel/creatures/{n}/{p}'
    assert os.path.exists(f'{d}/battle/{n}_front_128.png'), n
    dirs = ['down', 'left', 'right', 'up']
    files = {
        'front': r(f'battle/{n}_front_128.png'), 'back': r(f'battle/{n}_back_128.png'),
        'front_2x': r(f'battle/{n}_front_128_2x.png'), 'back_2x': r(f'battle/{n}_back_128_2x.png'),
        'idle': {v: {'sheet': r(f'anim/{n}_{v}_idle_sheet.png'), 'frames': [r(f'anim/{n}_{v}_idle/{n}_{v}_idle_f{i}.png') for i in range(4)]} for v in ('front', 'back')},
        'walk': {k: {'stand': r(f'overworld/{n}_ow/{n}_ow_{k}_stand.png'), 'frames': [r(f'overworld/{n}_ow/{n}_ow_{k}_walk{i}.png') for i in range(4)]} for k in dirs},
        'ow_sheet': r(f'overworld/{n}_ow_sheet.png'),
        'base': {k: r(f'base/{n}_{k}.png') for k in ['front', 'back'] + [f'ow_{x}' for x in dirs]},
    }
    for v in [files['front'], files['back'], *files['idle']['front']['frames'], *files['walk']['down']['frames']]:
        assert os.path.exists(f'/workspace/kilumen/{v}'), v
    frames = {'battle_size': [128, 128], 'ow_size': [64, 64], 'idle': {'count': 4, 'ms': [180, 160, 200, 160], 'bob_px': [0, -1, -2, -1]},
              'walk': {'count': 4, 'ms': 130, 'dirs': dirs}, 'scales': {'battle': [1, 2], 'ow': [1, 2, 3]}}
    return {'dex': DEX[n]['dex_no'], 'name': n, 'dir': f'art/characters/pixel/creatures/{n}', 'files': files, 'frames': frames,
            'status': 'draft', 'note': 'draft, awaiting Gary', 'wired': False, 'worker': 'C'}
def append(names):
    p = f'{ROOT}/_overnight/manifest_overnight.jsonl'
    with open(p, 'a') as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        for n in names: f.write(json.dumps(line(n)) + '\n')
def append_once(n):
    p = f'{ROOT}/_overnight/manifest_overnight.jsonl'
    if os.path.exists(p) and any(json.loads(l).get('name') == n for l in open(p) if l.strip()): print('jsonl: already has', n); return
    append([n]); print('jsonl: appended', n)
if __name__ == '__main__': append(sys.argv[1:])
