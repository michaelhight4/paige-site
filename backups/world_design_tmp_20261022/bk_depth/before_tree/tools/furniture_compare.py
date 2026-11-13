# Before/after sheet for the furniture-colour fix: qa/furniture_colours/compare.png
# Rows: shared home designs H1-H4 + heal_brookhollow. Columns: before (pre-fix maps + pristine interiors art in qa/furniture_colours/before/
# and the /tmp backup of maps/tileset) | after (current build). Each label shows the identity-scheme furniture/floor+wall overlaps (unique tile x hex).
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import furniture_colours as FC
BK = os.environ.get('FURN_BEFORE_DIR', '/tmp/bk_furn')
ROWS = [('H1', 'home_brookhollow_a'), ('H2', 'home_fernwick_c'), ('H3', 'home_lanternport_c'), ('H4', 'home_saltmere_a'), ('heal', 'heal_brookhollow')]
_SH = {}
def sheet(path):
    if path not in _SH: _SH[path] = np.array(Image.open(path).convert('RGBA'))
    return _SH[path]
class State:
    def __init__(s, before):
        s.before = before
        s.TS = {e['id']: e for e in json.load(open(os.path.join(BK if before else OUT, 'tileset.json')))['tiles']}
    def px(s, e):
        p = e['sheet']
        if s.before and p.startswith('interiors_new/'): p = os.path.join(OUT, 'qa', 'furniture_colours', 'before', p[len('interiors_new/'):])
        else: p = os.path.join(OUT, p)
        a = sheet(p); x, y = e['col'] * 64, e['row'] * 64; return a[y:y + 64, x:x + 64]
    def layers(s, m): return json.load(open(os.path.join(BK if s.before else OUT, 'maps', m + '.json')))['layers']
    def render(s, m):
        L = s.layers(m); h, w = len(L['ground']), len(L['ground'][0]); im = Image.new('RGBA', (w * 64, h * 64), (26, 18, 38, 255))
        for lay in ('ground', 'decoration', 'overlay'):
            for y, r in enumerate(L[lay]):
                for x, v in enumerate(r):
                    if v: im.alpha_composite(Image.fromarray(s.px(s.TS[v])), (x * 64, y * 64))
        return im.convert('RGB')
    def overlaps(s, m):
        L = s.layers(m); ids = {v for lay in ('ground', 'decoration', 'overlay') for r in L[lay] for v in r if v}
        def codes(e):
            a = s.px(e); op = a[..., 3] == 255
            return {'%02x%02x%02x' % tuple(p[:3]) for p in a[op]}
        surf = set(); furn = []
        for i in ids:
            e = s.TS[i]; c = FC.cls(e)
            if c in ('floor', 'wall'): surf |= codes(e)
            elif c == 'furniture': furn.append(codes(e))
        return sum(len(f & surf) for f in furn)
def main():
    B, A = State(True), State(False); S = 0.5; pad = 12; lab = 26
    cells = []
    for tag, m in ROWS:
        b, a = B.render(m), A.render(m)
        b = b.resize((int(b.width * S), int(b.height * S)), Image.NEAREST); a = a.resize((int(a.width * S), int(a.height * S)), Image.NEAREST)
        cells.append((tag, m, b, a, B.overlaps(m), A.overlaps(m)))
    cw = max(c[2].width for c in cells); W = pad + 2 * (cw + pad); H = 40 + sum(c[2].height + lab + pad for c in cells)
    sheet_im = Image.new('RGB', (W, H), (250, 244, 230)); d = ImageDraw.Draw(sheet_im)
    d.text((pad, 10), 'Furniture-colour rule: BEFORE (left) vs AFTER (right). n = furniture hex codes shared with floor/wall (identity scheme)', fill=(40, 30, 50))
    y = 40; res = {}
    for tag, m, b, a, nb, na in cells:
        d.text((pad, y + 6), f'{tag} {m}  before n={nb}', fill=(150, 30, 40) if nb else (30, 110, 50))
        d.text((pad * 2 + cw, y + 6), f'after n={na}', fill=(150, 30, 40) if na else (30, 110, 50))
        sheet_im.paste(b, (pad, y + lab)); sheet_im.paste(a, (pad * 2 + cw, y + lab)); y += b.height + lab + pad
        res[m] = dict(design=tag, before=nb, after=na)
    os.makedirs(os.path.join(OUT, 'qa', 'furniture_colours'), exist_ok=True)
    p = os.path.join(OUT, 'qa', 'furniture_colours', 'compare.png'); sheet_im.save(p); print(p, res)
if __name__ == '__main__': main()
