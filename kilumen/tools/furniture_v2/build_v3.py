"""Furniture v2 build: redraw every furniture/prop asset in the shared kit (pieces.py via mapping.py) into *_v3.png sheets.
Same ids and indices as before (maps keep working); animated props get extra frame cells appended below the sheet and
an entry in furniture_v3_anim.json. Usage: python build_v3.py [repo_kilumen_dir]"""
import sys, os, re, json, collections; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
from mapping import spec, animated
ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '../..'))
OW = os.path.join(ROOT, 'art/world/overworld')
SHEETS = ['tiles_1x/interior.png', 'interiors_new/tiles_1x/i_furniture.png', 'interiors_new/tiles_1x/i_brand.png', 'tiles_1x/x_furniture_fix.png', 'tiles_1x/ix2_kit.png']
FRAMES, FRAME_MS = 4, 220
def src(sheet, n):
    p = sheet.replace('tiles_1x', f'tiles_{n}x'); v2 = p.replace('.png', '_v2.png')
    return os.path.join(OW, v2 if os.path.exists(os.path.join(OW, v2)) else p)
def dst(sheet, n): return os.path.join(OW, sheet.replace('tiles_1x', f'tiles_{n}x').replace('.png', '_v3.png'))
def main():
    tiles = json.load(open(os.path.join(OW, 'tileset.json')))['tiles'] + json.load(open(os.path.join(OW, 'tileset_ix2.json')))['tiles']
    groups = collections.defaultdict(dict)
    for t in tiles:
        if t['sheet'] not in SHEETS or t.get('alias_of'): continue
        m = re.match(r'(.*)_(\d+)_(\d+)$', t['name']); base, r, c = (m.group(1), int(m.group(2)), int(m.group(3))) if m else (t['name'], 0, 0)
        groups[(t['sheet'], base)][(r, c)] = t
    cells = collections.defaultdict(dict); anim = {}; report = []; sheet_imgs = []; extra = collections.defaultdict(list)
    for (sheet, base), parts in sorted(groups.items()):
        sp = spec(base)
        if not sp: continue
        fn, kw = sp; h = max(r for r, _ in parts)+1; w = max(c for _, c in parts)+1
        nf = FRAMES if animated(fn, kw) else 1
        imgs = [fn(w=w, h=h, f=f, **kw).im if nf > 1 else fn(w=w, h=h, **kw).im for f in range(nf)]
        for (r, c), t in parts.items():
            crop = lambda im: im.crop((c*32, r*32, c*32+32, r*32+32))
            cells[sheet][t['index']] = crop(imgs[0])
            if nf > 1:
                fr = [t['index']]
                for im in imgs[1:]: extra[sheet].append(crop(im)); fr.append(-len(extra[sheet]))  # placeholder, resolved below
                anim[t['id']] = {'sheet': sheet, 'frames': fr, 'frame_ms': FRAME_MS}
        sheet_imgs.append((base, imgs))
        report.append(f'{sheet.split("/")[-1]:22s} {base:34s} {w}x{h} -> {fn.__name__}{"  [animated]" if nf > 1 else ""}')
    for sheet in SHEETS:
        base_im = Image.open(src(sheet, 1)); cols = base_im.width // 64; rows = base_im.height // 64
        n_extra = len(extra[sheet]); add_rows = (n_extra + cols - 1) // cols
        for n in (1, 2, 3):
            C = 64*n; im = Image.open(src(sheet, n)).convert('RGBA'); out = Image.new('RGBA', (im.width, im.height + add_rows*C), (0, 0, 0, 0)); out.paste(im, (0, 0))
            for idx, art in cells[sheet].items():
                x, y = idx % cols * C, idx // cols * C; out.paste((0, 0, 0, 0), (x, y, x+C, y+C)); out.alpha_composite(art.resize((C, C), Image.NEAREST), (x, y))
            for k, art in enumerate(extra[sheet]):
                idx = rows*cols + k; out.alpha_composite(art.resize((C, C), Image.NEAREST), (idx % cols * C, idx // cols * C))
            out.save(dst(sheet, n), optimize=True)
        for a in anim.values():
            if a['sheet'] == sheet: a['frames'] = [f if f >= 0 else rows*cols + (-f-1) for f in a['frames']]
        if sheet == 'tiles_1x/interior.png':  # ixlight normal sheet: neutral normals for redrawn cells (art carries its own planes)
            nm = Image.open(os.path.join(OW, 'tiles_1x/interior_v2_n.png')).convert('RGBA')
            for idx, art in cells[sheet].items():
                x, y = idx % cols * 64, idx // cols * 64; a = art.resize((64, 64), Image.NEAREST).split()[3]
                flat = Image.new('RGBA', (64, 64), (128, 128, 255, 255)); flat.putalpha(a); nm.paste((0, 0, 0, 0), (x, y, x+64, y+64)); nm.paste(flat, (x, y))
            nm.save(os.path.join(OW, 'tiles_1x/interior_v3_n.png'), optimize=True)
    json.dump({'note': 'furniture v2 animated props (tools/furniture_v2/build_v3.py); frames index the *_v3.png sheet; merged only with ix2',
               'anim': {str(k): {'frames': v['frames'], 'frame_ms': v['frame_ms']} for k, v in anim.items()}}, open(os.path.join(OW, 'furniture_v3_anim.json'), 'w'), indent=0)
    open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'BUILD_REPORT.txt'), 'w').write('\n'.join(report) + '\n')
    contact(sheet_imgs)
    print(len(report), 'pieces redrawn,', len(anim), 'animated tiles,', sum(len(v) for v in cells.values()), 'cells')
def contact(items, out=None):
    from PIL import ImageDraw
    S = 2; cw = 2*32*S + 16; ch = 2*32*S + 26; cols = 16; seen = {}
    for b, ims in items:  # one entry per base (dedupe identical town/size variants only by name)
        seen.setdefault(b, ims)
    items = list(seen.items()); rows = (len(items)+cols-1)//cols
    im = Image.new('RGBA', (cols*cw, rows*ch+30), (214, 190, 156, 255)); d = ImageDraw.Draw(im)
    d.text((8, 8), f'Kilumen furniture v2 kit - {len(items)} pieces (frame 0; * = animated)', fill=(40, 24, 30))
    for i, (b, ims) in enumerate(items):
        x, y = i % cols*cw + 8, i//cols*ch + 30; a = ims[0]; a = a.resize((a.width*S, a.height*S), Image.NEAREST)
        if a.width > cw-16: a = a.resize((cw-16, int(a.height*(cw-16)/a.width)), Image.NEAREST)
        if a.height > ch-26: a = a.resize((int(a.width*(ch-26)/a.height), ch-26), Image.NEAREST)
        im.alpha_composite(a, (x, y)); d.text((x, y+ch-24), (('*' if len(ims) > 1 else '') + b.replace('kit_', ''))[:22], fill=(40, 24, 30))
    out = out or os.environ.get('FV2_CONTACT', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kit_contact_sheet.png'))
    im.save(out); return out
if __name__ == '__main__': main()
