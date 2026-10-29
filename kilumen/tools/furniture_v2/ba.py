import sys
from PIL import Image, ImageDraw, ImageFont
d='/workspace/kilumen/shots/furniture_v2/'; lab=sys.argv[1]
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',28)
for v in ('pc','phone'):
  a=Image.open(f'{d}{lab}_before_{v}.png').convert('RGB');b=Image.open(f'{d}{lab}_after_{v}.png').convert('RGB')
  if v=='phone': a=a.resize((a.width//2,a.height//2));b=b.resize((b.width//2,b.height//2))
  o=Image.new('RGB',(a.width*2+30,a.height+50),(24,20,26));o.paste(a,(10,45));o.paste(b,(a.width+20,45));g=ImageDraw.Draw(o)
  g.text((10,8),f'BEFORE {lab} ({v})',fill='white',font=f);g.text((a.width+20,8),f'AFTER furniture v2 ({v})',fill='white',font=f);o.save(f'{d}{lab}_compare_{v}.png')
