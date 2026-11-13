"""Contact + style-match sheets for a cute set (coder_cute_r1, Oct 23 2026). Usage: python3 cute_sheets.py cute_r1 v1"""
import sys, json
from PIL import Image, ImageDraw, ImageFont
SET, VER = sys.argv[1], sys.argv[2]
J = json.load(open(f'/workspace/kilumen/design/cute_sets/{SET}.json'))
CRE = '/workspace/kilumen/art/characters/pixel/creatures'
OUT = f'/workspace/kilumen/shots/{SET}' if VER == '-' else f'/workspace/kilumen/shots/{SET}_{VER}'
import os; os.makedirs(OUT, exist_ok=True)
REG = J['_meta'].get('region', 1)
F = lambda s, b=False: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if b else ''), s)
BG = (206, 222, 196, 255)
def front(n): return Image.open(f'{CRE}/{n}/battle/{n}_front_128_2x.png').convert('RGBA')
def wrap(t, w):
    out, line = [], ''
    for word in t.split():
        if len(line) + len(word) + 1 > w: out.append(line); line = word
        else: line = (line + ' ' + word).strip()
    return out + [line]
cs = J['creatures']; CW, CH = 300, 420
S = Image.new('RGBA', (CW * 3 + 20, CH * 2 + 70), BG); d = ImageDraw.Draw(S)
d.text((12, 10), f"Kilumen cute set, region {REG} ({SET}) - front sprites 128px shown 2x - DRAFT for Gary", fill=(30, 20, 30), font=F(16, True))
for i, c in enumerate(cs):
    x, y = 10 + (i % 3) * CW, 50 + (i // 3) * CH
    d.rounded_rectangle((x + 4, y + 4, x + CW - 8, y + CH - 8), 12, fill=(236, 242, 230, 255), outline=(120, 140, 110, 255))
    S.alpha_composite(front(c['id']), (x + (CW - 256) // 2, y + 10))
    d.text((x + 16, y + 270), c['name'], fill=(30, 20, 30), font=F(22, True))
    d.text((x + 16, y + 298), ' / '.join(t.capitalize() for t in c['types']) + f"   ({c['rarity']}, single stage)", fill=(70, 50, 90), font=F(13))
    for k, l in enumerate(wrap('Habitat: ' + c['habitat'], 38)[:5]):
        d.text((x + 16, y + 322 + 17 * k), l, fill=(40, 40, 40), font=F(13))
S.save(f'{OUT}/contact_sheet.png'); print('contact', S.size)
EX = ['rillop', 'peeplark', 'cloverkin', 'hearthkit', 'pebbit', 'chartmouse'] if REG == 1 else [c['id'] for c in json.load(open('/workspace/kilumen/design/cute_sets/cute_r1.json'))['creatures']]
T = Image.new('RGBA', (6 * 270 + 20, 2 * 300 + 80), BG); d = ImageDraw.Draw(T)
d.text((12, 10), ('Style match: new cute set (top) vs existing region 1 creatures (bottom)' if REG == 1 else f'Style match: cute set region {REG} (top) vs cute set region 1 (bottom)') + (', same 128px battle frame at 2x'), fill=(30, 20, 30), font=F(20, True))
for r, ids in enumerate(([c['id'] for c in cs], EX)):
    for i, n in enumerate(ids):
        x, y = 10 + i * 270, 50 + r * 300
        T.alpha_composite(front(n), (x, y)); d.text((x + 8, y + 262), n + ('  (new)' if r == 0 else '  (existing)'), fill=(30, 20, 30), font=F(16, True))
T.save(f'{OUT}/style_match_vs_' + ('region1' if REG == 1 else 'cute_r1') + '.png'); print('style', T.size)
