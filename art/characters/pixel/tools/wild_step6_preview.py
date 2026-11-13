"""Step 6: contact sheet pixel/_parts/wild_preview.png. One row per creature:
battle front + back (2x), idle frames front (1x), overworld sheet (1x, 4 dirs x 5 frames)."""
from wild_pxlib import *
from PIL import Image, ImageDraw
BG = (176, 196, 170, 255)

def main():
    rows = []
    for n in WILD:
        C = f'{CRE}/{n}'
        parts = [Image.open(f'{C}/battle/{n}_front_128_2x.png'), Image.open(f'{C}/battle/{n}_back_128_2x.png'),
                 Image.open(f'{C}/overworld/{n}_ow_sheet.png'),
                 up(Image.open(f'{C}/overworld/{n}_ow/{n}_ow_down_stand.png'), 3)]
        H = max(p.height for p in parts) + 20; W = sum(p.width + 12 for p in parts) + 12
        r = Image.new('RGBA', (W, H), BG); x = 12
        for p in parts: r.alpha_composite(p.convert('RGBA'), (x, H - p.height - 4)); x += p.width + 12
        ImageDraw.Draw(r).text((12, 3), n.capitalize(), fill=(20, 12, 18, 255))
        rows.append(r)
    W = max(r.width for r in rows); H = sum(r.height + 4 for r in rows) + 24
    s = Image.new('RGBA', (W, H), (120, 132, 116, 255))
    ImageDraw.Draw(s).text((12, 6), 'Kilumen wild creatures  |  battle front/back 128px @2x  |  overworld 64px sheet @1x (down,left,right,up x stand+4 walk)  |  OW stand @3x', fill=(255, 255, 255, 255))
    y = 24
    for r in rows: s.alpha_composite(r, (0, y)); y += r.height + 4
    s.save(f'{ROOT}/_parts/wild_preview.png'); print(s.size)

if __name__ == '__main__': main()
