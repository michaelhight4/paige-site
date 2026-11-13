"""Full room before (live house_1f, live art) vs after (house_1f_v2, ix2 kit + v2 cells), 2x, one image."""
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from compose import compose
from PIL import Image, ImageDraw, ImageFont
a = compose('house_1f', False, 2); b = compose('house_1f_v2', True, 2)
try: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 40)
except Exception: f = None
g = 40; im = Image.new('RGBA', (a.width * 2 + g * 3, a.height + 110), (24, 20, 26, 255)); d = ImageDraw.Draw(im)
im.alpha_composite(a, (g, 90)); im.alpha_composite(b, (a.width + g * 2, 90))
d.text((g, 25), 'BEFORE  house_1f (live)', fill='white', font=f); d.text((a.width + g * 2, 25), 'AFTER  house_1f_v2 (?ix2=1, worn kit)', fill='white', font=f)
out = os.path.join(os.path.dirname(__file__), '../../shots/interiors_v2/before_after.png'); im.convert('RGB').save(out); print(out, im.size)
