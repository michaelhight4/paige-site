"""New evos (Gary 2:18 PM CT Oct 23 2026): vaultpede (stonepede line stage 3), pricklon + geodurchin (spinelet line).
Thin wrapper over Worker A's ovn_build.py (same pipeline: snap -> 64-colour palette -> INK outline, 128 battle, idles,
64x64 OW, icons, cosmic, ToD check). The new ids are not in DEX_450.json, so DEX entries come from
design/dex_additions_new_evos.json, merged in memory (DEX_450 untouched). manifest() (parts.overnight_a in
pixel/manifest.json) is replaced by a manifest_overnight.jsonl line (what tools/sync_creatures.mjs reads).
Usage: python3 new_evos_build.py --front vaultpede ...   (front concept base + battle 128 only)
       python3 new_evos_build.py vaultpede ...           (full set)"""
import sys, os, json, glob, copy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ovn_build as O
ADD = json.load(open('/workspace/kilumen/design/dex_additions_new_evos.json'))
for c in ADD['creatures']: O.DEX[c['id']] = c
for k, v in ADD['evolution_overrides'].items(): O.DEX[k] = copy.deepcopy(O.DEX[k]); O.DEX[k]['evolution'].update(v)
NEWCFG = {
 'vaultpede': {'walk': 'quad', 'legfrac': 0.3, 'sidefrac': 0.3, 'mirror_right': True, 'ow_ms': 160, 'holes': [0.45, 0.95],
               'notes': 'Stage 3 of stonepede line (larger armored columnpede). OW right view mirrored from left.'},
 'pricklon': {'walk': 'quad', 'mirror_right': True, 'battle': (112, 124), 'ow': (50, 56), 'notes': 'Stage 2 of spinelet line. OW right view mirrored from left.'},
 'geodurchin': {'walk': 'quad', 'legfrac': 0.28, 'battle': (124, 124), 'ow': (54, 58), 'mirror_right': True, 'ow_ms': 150, 'notes': 'Stage 3 of spinelet line. OW right view mirrored from left.'},
}
O.CFG.update({k: {**NEWCFG[k], **O.CFG.get(k, {})} for k in NEWCFG})

def front_only(n):
    c = O.CFG[n]; C = f'{O.CRE}/{n}'; B = f'{C}/base'; os.makedirs(B, exist_ok=True)
    (bth, btw), _ = O.SIZE[c.get('size', O.DEX[n]['size_class'])]; bth, btw = c.get('battle', (bth, btw))
    img = O.S1.boost(O.Image.open(f'{C}/raw/battle_front.jpg'), [(1.7, 245, 300, 0)] + c.get('boost', []))
    spr, s, org = O.snap(img, None, bth, btw, 28)
    if c.get('holes'): spr = O.holes(img, spr, c['holes'])
    spr = O.Image.fromarray(O.remap(O.np.array(spr), tuple(c.get('exclude', ()))))
    os.makedirs(f'{C}/battle', exist_ok=True)
    cv, _ = O.place(spr, 128, 128, bottom=True, pad_b=2); cv.save(f'{C}/battle/{n}_front_128.png'); O.up(cv, 2).save(f'{C}/battle/{n}_front_128_2x.png')
    print(n, 'front', spr.size, 'colours', O.ncolors(spr))

def jsonl(n, concept):
    """same line format as Worker A's columnpede line (paths relative to creatures/), worker coder_new_evos"""
    P = f'{O.OV}/manifest_overnight.jsonl'
    rows = [l for l in open(P).read().split('\n') if l.strip()]
    tpl = next(l for l in rows if json.loads(l).get('name') == 'columnpede')
    line = json.loads(tpl.replace('columnpede', n))
    line['dex'] = O.DEX[n]['dex_no']; line['frames']['walk']['ms'] = O.CFG[n].get('ow_ms', 130)
    if not concept: line['files'].pop('cosmic', None)
    line.update(worker='coder_new_evos', note='draft, awaiting Gary; new evo (Gary 2:18 PM CT Oct 23 2026), DEX entry in design/dex_additions_new_evos.json')
    miss = [f for f in json.dumps(line['files']).split('"') if f.startswith(n + '/') and not os.path.exists(f'{O.CRE}/{f}')]
    assert not miss, miss
    rows = [l for l in rows if json.loads(l).get('name') != n] + [json.dumps(line)]
    open(P, 'w').write('\n'.join(rows) + '\n')

def build(n):
    c = O.CFG[n]
    O.bases(n, c); O.battle_idle(n, c); O.overworld(n, c); O.icons(n, c); concept = O.cosmic(n, c)
    r = O.tod(n); tres = {'night': r['night'], 'day': r['day']}
    bad = O.validate(n); O.readme(n, c, concept, tres); jsonl(n, concept)
    open(f'{O.CRE}/{n}/CLAIMED_BY_CODER_NEW_EVOS', 'w').write('coder (new evos) 2026-10-23\n')
    print(f'{n}: bad={bad[:3]} cosmic={concept} night={r["night"]}')

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == '--jsonl': [jsonl(n, O.cosmic(n, O.CFG[n])) for n in a[1:]]
    elif a[0] == '--front': [front_only(n) for n in a[1:]]
    else: [build(n) for n in a]
