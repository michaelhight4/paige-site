"""Gullhaven trees with a real 35-degree front face (user 8:00 AM Oct 30 2026).

One tree = two 64px cells: gh_tree_top (overlay, the lit canopy TOP plane seen from 35 deg) above gh_tree_base (deco, the
darker canopy FRONT face, trunk and root shadow). Existing overworld tree palette only; the top is always lighter than the
front. Writes tiles_{1,2,3}x/gh_trees.png (2 cells wide: col 0 = top, col 1 = base; 2x/3x are nearest-neighbour)."""
import math, os, random
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'world', 'overworld')
LINE, DEEP, FRONT, FRONT_LO = (24, 56, 44), (36, 82, 46), (54, 118, 52), (36, 78, 52)
MID, LIT, RIM = (82, 152, 58), (120, 186, 72), (84, 134, 78)
BARK_D, BARK, BARK_L, SHADOW = (44, 35, 32), (106, 68, 46), (146, 98, 62), (24, 56, 44, 110)
CX, TOP_CY, RX, RY = 32, 46, 29, 22          # top plane ellipse (35 deg foreshortened disc)
FACE_BOT = 98                                # bottom of the canopy front face
def draw():
    im = Image.new('RGBA', (64, 128), (0, 0, 0, 0)); px = im.load(); rnd = random.Random(35)
    def put(x, y, c):
        if 0 <= x < 64 and 0 <= y < 128: px[x, y] = c + (255,) if len(c) == 3 else c
    # root shadow
    for y in range(118, 127):
        for x in range(10, 54):
            if ((x - 32) / 22) ** 2 + ((y - 122) / 4.5) ** 2 <= 1: put(x, y, SHADOW)
    # trunk (lit left, dark right)
    for y in range(FACE_BOT - 4, 123):
        for x in range(26, 39):
            put(x, y, BARK_D if x in (26, 38) or y == 122 else BARK_L if x < 30 else BARK)
    # canopy front face: vertical leaf wall from the top ellipse's equator down to scalloped clumps
    def bottom(x):
        s = 6 * abs(math.sin((x - 3) * math.pi / 14))  # three leaf clumps
        return FACE_BOT - 6 + s * 0.9
    for x in range(CX - RX, CX + RX + 1):
        dx = (x - CX) / RX
        if abs(dx) > 1: continue
        top = TOP_CY
        bot = bottom(x) - (1 - math.sqrt(max(0, 1 - dx * dx))) * 18
        for y in range(top, int(bot) + 1):
            edge = abs(dx) > 0.9 or y >= int(bot) - 0
            dark = dx > 0.35 or y > bot - 7
            c = LINE if edge else (FRONT_LO if dark else FRONT)
            if not edge and rnd.random() < 0.09 and y < bot - 8: c = DEEP
            put(x, y, c)
    # top plane: lighter than every front pixel, lit from upper-left
    for y in range(TOP_CY - RY - 1, TOP_CY + RY + 2):
        for x in range(CX - RX - 1, CX + RX + 2):
            d = ((x - CX) / RX) ** 2 + ((y - TOP_CY) / RY) ** 2
            if d > 1.0: continue
            if d > 0.86: put(x, y, DEEP if y < TOP_CY else RIM); continue
            l = -(x - CX) / RX * 0.6 - (y - TOP_CY) / RY * 0.8 + rnd.uniform(-0.12, 0.12)
            put(x, y, LIT if l > 0.25 else MID if l > -0.45 else RIM)
    # leaf clusters on the top (2x2 lit clumps) and lip highlight where top meets front
    for _ in range(26):
        a, r = rnd.uniform(0, 2 * math.pi), rnd.uniform(0, 0.75)
        x, y = int(CX + math.cos(a) * r * RX), int(TOP_CY + math.sin(a) * r * RY)
        if x + y < CX + TOP_CY + 6:
            for ox in (0, 1):
                for oy in (0, 1): put(x + ox, y + oy, LIT)
    for x in range(CX - RX + 3, CX + RX - 2):
        y = int(TOP_CY + RY * math.sqrt(max(0, 1 - ((x - CX) / RX) ** 2)))
        put(x, y + 1, MID if x < CX + 8 else RIM)
    return im
def main():
    im = draw()
    for k in (1, 2, 3):
        sheet = Image.new('RGBA', (128 * k, 64 * k), (0, 0, 0, 0))
        sheet.alpha_composite(im.crop((0, 0, 64, 64)).resize((64 * k, 64 * k), Image.NEAREST), (0, 0))
        sheet.alpha_composite(im.crop((0, 64, 64, 128)).resize((64 * k, 64 * k), Image.NEAREST), (64 * k, 0))
        sheet.save(os.path.join(OUT, f'tiles_{k}x', 'gh_trees.png'))
    prev = Image.new('RGBA', (64, 128), (232, 214, 160, 255)); prev.alpha_composite(im)
    prev.resize((256, 512), Image.NEAREST).save('/tmp/gh_tree_preview.png')
if __name__ == '__main__': main()
