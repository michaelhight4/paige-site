"""Cute-set builder (coder_cute_r1, Oct 23 2026). Thin wrapper over ovn_build.py (Worker A pipeline, imported read-only).
Differences: DEX entries can come from design/cute_sets/<set>.json before they are merged into DEX_450; manifest goes to
parts.cute_<set> (not overnight_a); no shared review_A.png is written (own sheets in shots/).
Usage: python3 cute_build.py --front id...   (front only, for the contact sheet)
       python3 cute_build.py id...           (full set)"""
import sys, os, json, glob, time
sys.path.insert(0, os.path.dirname(__file__))
import ovn_build as O
from PIL import Image
import numpy as np
SETS = glob.glob('/workspace/kilumen/design/cute_sets/cute_r*.json')
CUTE = {}
for s in SETS:
    j = json.load(open(s))
    for c in j['creatures']: CUTE[c['id']] = dict(c, _set=j['_meta']['set'])
for k, c in CUTE.items():
    if k not in O.DEX:
        O.DEX[k] = dict(dex_no=c.get('dex_no'), id=k, name=c['name'], types=c['types'], first_zone=c['first_zone'], rarity=c['rarity'],
                        size_class=c['size_class'], evolution=dict(stage=1, line_length=1, line=[k], evolves_from=None, method=None, evolves_to=None))
CFGP = '/workspace/kilumen/design/cute_sets/cute_cfg.json'
CCFG = json.load(open(CFGP)) if os.path.exists(CFGP) else {}

def front_only(n, c):
    C = f'{O.CRE}/{n}'; B = f'{C}/base'; os.makedirs(B, exist_ok=True)
    (bth, btw), _ = O.SIZE[c.get('size', O.DEX[n]['size_class'])]; bth, btw = c.get('battle', (bth, btw))
    img = O.S1.boost(Image.open(f'{C}/raw/battle_front.jpg'), [(1.7, 245, 300, 0)] + c.get('boost', []))
    spr, s, org = O.snap(img, None, bth, btw, 28)
    spr = Image.fromarray(O.remap(np.array(spr), tuple(c.get('exclude', ())))); spr.save(f'{B}/{n}_front.png')
    os.makedirs(f'{C}/battle', exist_ok=True)
    cv, _ = O.place(spr, 128, 128, bottom=True, pad_b=2); cv.save(f'{C}/battle/{n}_front_128.png'); O.up(cv, 2).save(f'{C}/battle/{n}_front_128_2x.png')
    print(n, 'front', spr.size, O.ncolors(spr))

def manifest(n, c, concept, tres):
    x = O.DEX[n]; P = O.ROOT + '/manifest.json'; part = 'cute_' + CUTE[n]['_set'].split('_')[-1]
    files = sorted(os.path.relpath(p, O.ROOT) for p in glob.glob(f'{O.CRE}/{n}/**/*', recursive=True) if os.path.isfile(p))
    for _ in range(5):
        try: m = json.load(open(P)); break
        except Exception: time.sleep(0.5)
    m['parts'].setdefault(part, {'note': f'Cute creature set {part} (Gary 2:19 PM CT Oct 23 2026); held out of encounter tables until Gary places them', 'creatures': {}})
    m['parts'][part]['creatures'][n] = dict(status='draft, awaiting Gary', dex_no=x['dex_no'], name=x['name'], types=x['types'], line=x['evolution']['line'], zone=x['first_zone'],
        battle='128', overworld='64x64', cosmic=concept, tod_night=tres.get('night'), file_count=len(files), files=files)
    tmp = P + '.tmpCute'; json.dump(m, open(tmp, 'w'), indent=1); os.replace(tmp, P)

def build(n):
    c = CCFG.get(n, {}); t0 = time.time()
    O.bases(n, c); O.battle_idle(n, c); O.overworld(n, c); O.icons(n, c); concept = O.cosmic(n, c)
    r = O.tod(n); tres = {'night': r['night'], 'day': r['day']}
    bad = O.validate(n); O.readme(n, c, concept, tres); manifest(n, c, concept, tres)
    nf = len([p for p in glob.glob(f'{O.CRE}/{n}/**/*', recursive=True) if os.path.isfile(p)])
    print(f'{n}: files={nf} bad={bad[:3]} cosmic={concept} tod={r} t={time.time() - t0:.0f}s')
    return bad, r

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == '--front':
        for n in a[1:]: front_only(n, CCFG.get(n, {}))
    else:
        for n in a: build(n)
