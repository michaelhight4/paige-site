import json
from PIL import Image,ImageDraw,ImageFont
import numpy as np
from scipy import ndimage as nd
S=json.load(open('/tmp/k/spr.json'))
def fgmask(a):
  white=(a.min(2)>=232)&(a.max(2)-a.min(2)<22)
  lab,n=nd.label(white);edge=set(np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]))-{0}
  fg=~np.isin(lab,list(edge));fg=nd.binary_opening(fg,iterations=1)
  holes=nd.binary_fill_holes(fg)&~fg;hl,hn=nd.label(holes);hs=nd.sum(holes,hl,range(1,hn+1))
  return fg|np.isin(hl,[i+1 for i,v in enumerate(hs) if v<250])
def cells(path):
  im=np.array(Image.open(path).convert('RGB')).astype(int);H,W,_=im.shape
  fg=fgmask(im);l,n=nd.label(fg);sz=nd.sum(fg,l,range(1,n+1));com=nd.center_of_mass(fg,l,range(1,n+1))
  masks=[np.zeros_like(fg) for _ in range(10)]
  for i,(s_,(cy,cx)) in enumerate(zip(sz,com)):
    if s_<60: continue
    k=int(cy//(H/2))*5+int(cx//(W/5));masks[k]|=(l==i+1)
  return [(im,m) for m in masks]
def sprite(src,box=88,pad=6):
  if isinstance(src,tuple): a,fg=src
  else: a=src;fg=fgmask(a);l,n=nd.label(fg);sz=nd.sum(fg,l,range(1,n+1));fg=np.isin(l,[i+1 for i,v in enumerate(sz) if v>=max(60,sz.max()*0.01)])
  ys,xs=np.where(fg);sl=(slice(ys.min(),ys.max()+1),slice(xs.min(),xs.max()+1))
  rgba=np.dstack([a[sl],fg[sl]*255]).astype('uint8');im=Image.fromarray(rgba,'RGBA')
  inner=box-2*pad;f=max(im.width,im.height)/inner;sz=(max(1,round(im.width/f)),max(1,round(im.height/f)))
  rgb=im.convert('RGB').resize(sz,Image.LANCZOS).quantize(64,method=Image.Quantize.MAXCOVERAGE).convert('RGB')
  al=im.getchannel('A').resize(sz,Image.BOX).point(lambda v:255 if v>120 else 0)
  rgb.putalpha(al);out=Image.new('RGBA',(box,box),(0,0,0,0));out.paste(rgb,((box-sz[0])//2,box-pad-sz[1]),rgb)
  A=np.array(out)[:,:,3];bad=A[:pad].any() or A[-pad:].any() or A[:,:pad].any() or A[:,-pad:].any()
  CHECK.append(bad);return out
CHECK=[]
grid={6:cells('_work/r6_raw.jpg'),7:cells('_work/r7_raw.jpg'),8:cells('_work/r8_raw.jpg')}
ORIG={6:'puffgill kelpkit drizzlop cocklet foamfawn nubbinray shoalpup breakwarden galecrest undertusk',7:'wickmote fogkin paperpaw lensmoth bellbuoy hushlet lampwisp beaconwraith tidelore veilfin',8:'ashbun pumicub emberkip smoglet geysquirt cinderpip forgehorn anvilaurox slagdrake calderune'}
src={}
for r,v in ORIG.items():
  for k,n in enumerate(v.split()): src[n]=grid[r][k]
import os
for n in ['smoglet','swellhound','lanternshade','beaconwraith','smeltbull','geysquirt']:
  src[n]=np.array(Image.open(f'_work/{n}_raw.jpg').convert('RGB')).astype(int)
CW=100;LW=150;RH=150
sheet=Image.new('RGB',(LW+11*CW+20,50+3*RH),'#1d1b26');d=ImageDraw.Draw(sheet)
F=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
d.text((12,12),"Kilumen - NEW 33 concept sheet (regions 6-8, DRAFT)",fill='#e8e0ff',font=F(18))
reg={6:("Tidewater","R6 · Lv 43-49","#2a6f86"),7:("Lanternport","R7 · Lv 54-64","#6a5a9a"),8:("Cindervale","R8 · Lv 58-68","#9a4a2a")}
for ri,r in enumerate((6,7,8)):
  y=50+ri*RH;d.rectangle((6,y+4,sheet.width-6,y+RH-4),fill='#262433',outline=reg[r][2],width=2)
  d.rectangle((6,y+4,LW-6,y+RH-4),fill=reg[r][2]);d.text((16,y+50),reg[r][0],fill='white',font=F(17));d.text((16,y+76),reg[r][1],fill='#f0f0f0',font=F(12))
  for k,e in enumerate([x for x in S if x[2]==r]):
    s=sprite(src[e[0]]);name=e[1]
    x=LW+k*CW;sheet.paste(s,(x+(CW-s.width)//2,y+14),s);s.save(f'_work/cut/{e[0]}.png')
    w=d.textlength(name,font=F(11));d.text((x+(CW-w)/2,y+RH-30),name,fill='#ffffff',font=F(11))
sheet.resize((sheet.width*2,sheet.height*2),Image.NEAREST).save('concept_sheet.png')

print('sprites',len(CHECK),'border hits',sum(CHECK))
