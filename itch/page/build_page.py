from PIL import Image, ImageFilter, ImageEnhance, ImageDraw, ImageFont
import os
C='/workspace/kilumen/art/characters/pixel/creatures/'
key=Image.open('/workspace/kilumen/art/world/key_art_notext.png').convert('RGB')
# banner 960x250: crop band of key art
k=key.resize((960,540),Image.LANCZOS).crop((0,150,960,400))
k=ImageEnhance.Brightness(k).enhance(0.9).convert('RGBA')
# left-to-right dark gradient for logo legibility on right
g=Image.new('RGBA',(960,250));d=ImageDraw.Draw(g)
for x in range(960):
  a=int(max(0,(x-380)/580)*150); d.line([(x,0),(x,250)],fill=(20,22,40,a))
k.alpha_composite(g)
logo=Image.open('/workspace/kilumen_steam/store_art/logo.png').convert('RGBA')
lw=440;logo=logo.resize((lw,int(logo.height*lw/logo.width)),Image.LANCZOS)
k.alpha_composite(logo,(960-lw-30,40))
for name,x,y,sc,flip in [('slagrook',250,98,1,False),('emberlunx',372,110,1,True),('halovy',345,12,1,True)]:
  s=Image.open(f'{C}{name}/battle/{name}_front_128.png').convert('RGBA')
  bb=s.getbbox();s=s.crop(bb)
  if flip: s=s.transpose(Image.FLIP_LEFT_RIGHT)
  s=s.resize((s.width*sc,s.height*sc),Image.NEAREST)
  k.alpha_composite(s,(x,250-s.height-6 if y>50 else y))
dd=ImageDraw.Draw(k)
try: f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22)
except: f=ImageFont.load_default()
t='Start of a Journey';w=dd.textlength(t,font=f);cx=960-lw/2-30
dd.text((cx-w/2+2,172),t,font=f,fill=(25,18,16));dd.text((cx-w/2,170),t,font=f,fill=(255,240,200))
k.convert('RGB').save('banner.png')
# background
b=key.resize((1920,1080),Image.LANCZOS).filter(ImageFilter.GaussianBlur(14))
b=ImageEnhance.Color(b).enhance(0.6);b=ImageEnhance.Brightness(b).enhance(0.28)
ov=Image.new('RGB',(1920,1080),(16,20,36));b=Image.blend(b,ov,0.45)
b.save('background.png')
# screenshots
S='/workspace/kilumen_android/store_listing/'
for i,n in enumerate(['phone_03_battle','phone_04_capture','tablet7_04_kilindex','phone_01_town','phone_06_olympics'],1):
  Image.open(S+n+'.png').convert('RGB').resize((1280,720),Image.LANCZOS).save(f'screenshot_{i}.png')
# preview
P=Image.new('RGB',(1600,1150),(16,20,36));pd=ImageDraw.Draw(P)
P.paste(Image.open('banner.png').resize((1440,375),Image.LANCZOS),(80,30))
P.paste(Image.open('background.png').resize((480,270)),(80,430));pd.text((80,705),'background.png',fill='white',font=f)
for i in range(5):
  im=Image.open(f'screenshot_{i+1}.png').resize((480,270));x=80+((i+1)%3)*500;y=430+((i+1)//3)*330
  P.paste(im,(x,y));pd.text((x,y+275),f'screenshot_{i+1}.png',fill='white',font=f)
pd.text((80,1100),'Kilumen itch page set — DRAFT, Gary review required',fill=(255,210,63),font=f)
P.save('preview.png')
