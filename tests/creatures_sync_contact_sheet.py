# Creature sync contact sheet (Oct 23, 2026): front battle sprite + name of every registered species (data/creatures_synced.json
# order for synced ones, after the hand-written 16). Synced (PLACEHOLDER stats, draft art) tiles are marked "synced".
# Usage: python3 tests/creatures_sync_contact_sheet.py  -> shots/creatures_overnight/contact_sheet.png
import json, re, os
from PIL import Image, ImageDraw, ImageFont
PIX = 'art/characters/pixel/creatures/'
src = open('src/ui/data.js').read()
orig = re.findall(r"\{ id: '([a-z0-9_]+)', name: '([^']+)'", src.split('export const SPECIES')[1].split('...SYNCED_SPECIES')[0])
gen = open('src/ui/species_synced.gen.js').read()
synced = json.loads(re.search(r'export const SYNCED_SPECIES = (\[.*?\]);\n', gen, re.S).group(1))
px = json.loads(re.search(r'export const SPRITE_PX = (\{.*?\});', gen).group(1))
items = [(i, n, False) for i, n in orig] + [(s['id'], s['name'], True) for s in synced]
T, COLS = 160, 10
rows = (len(items) + COLS - 1) // COLS
W, H = COLS * T, rows * (T + 34) + 50
img = Image.new('RGB', (W, H), (34, 30, 48)); d = ImageDraw.Draw(img)
try: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14); fs = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 11); fh = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
except Exception: f = fs = fh = ImageFont.load_default()
d.text((12, 12), f'Kilumen creature sync: {len(items)} registered ({len(synced)} synced overnight, placeholder stats, draft art)', fill=(255, 240, 200), font=fh)
for k, (cid, name, syn) in enumerate(items):
    x, y = (k % COLS) * T, 50 + (k // COLS) * (T + 34)
    d.rectangle([x + 3, y + 3, x + T - 4, y + T + 30], fill=(58, 52, 80) if syn else (48, 70, 60))
    p = f"{PIX}{cid}/battle/{cid}_front_{px.get(cid, 128)}.png"
    if os.path.exists(p):
        s = Image.open(p).convert('RGBA'); s.thumbnail((T - 16, T - 16), Image.NEAREST)
        img.paste(s, (x + (T - s.width) // 2, y + 6 + (T - 16 - s.height) // 2), s)
    else: d.text((x + 20, y + 60), 'MISSING', fill=(255, 80, 80), font=f)
    d.text((x + 8, y + T - 4), name, fill=(255, 255, 255), font=f)
    if syn: d.text((x + T - 52, y + T + 12), 'synced', fill=(190, 170, 255), font=fs)
img.save('shots/creatures_overnight/contact_sheet.png'); print(len(items), 'tiles', img.size)
