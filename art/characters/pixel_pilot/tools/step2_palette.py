import sys; sys.path.insert(0,'tools')
from pxlib import *
import glob, numpy as np
from PIL import Image
FX=[(255,250,215),(255,220,95),(255,160,45),(232,88,24),(150,42,22),(244,226,255),(196,140,255),(142,72,224),(255,255,255),(30,20,26)]
EXT=12
names=[f for f in sorted(glob.glob('base/*.png'))]
# World Design's palette now exists: use it as the ONLY source of colours
WD='/workspace/kilumen/art/world/overworld/palette.png'
w=np.array(Image.open(WD).convert('RGBA')).reshape(-1,4)
pal=np.unique(w[w[:,3]>0][:,:3],axis=0).astype(int)
WDN=len(pal)
def rmd(px,pal):
    rm=(px[:,None,0]+pal[None,:,0])/2
    dr,dg,db=[(px[:,None,i]-pal[None,:,i]) for i in range(3)]
    return (2+rm/256)*dr**2+4*dg**2+(2+(255-rm)/256)*db**2
# character extension ramp: colours the creature/human bases need that WD lacks
allpx=np.concatenate([np.array(Image.open(f))[np.array(Image.open(f))[...,3]>0][:,:3] for f in names]).astype(int)
sub=allpx[::7]
err=rmd(sub,pal).min(1)
far=sub[err>np.percentile(err,70)]
q=Image.fromarray(far.reshape(1,-1,3).astype('uint8')).quantize(colors=EXT,method=Image.Quantize.MEDIANCUT,kmeans=4,dither=Image.Dither.NONE)
ext=np.array(q.getpalette()[:EXT*3]).reshape(-1,3)
pal=np.vstack([pal,ext]); np.save('tools/palette_ext.npy',ext)
np.save('tools/palette.npy',pal)
def remap(a):
    m=a[...,3]>0; px=a[m][:,:3].astype(int)
    rm=(px[:,None,0]+pal[None,:,0])/2
    dr,dg,db=[(px[:,None,i]-pal[None,:,i]) for i in range(3)]
    d=(2+rm/256)*dr**2+4*dg**2+(2+(255-rm)/256)*db**2; a=a.copy(); a[m,:3]=pal[d.argmin(1)]; return a
for f in names:
    a=remap(np.array(Image.open(f))); Image.fromarray(a).save(f)
    print(f, ncolors(Image.fromarray(a)))
# swatch image
n=len(pal); cols=8; S=24
im=Image.new('RGB',(cols*S,-(-n//cols)*S),'white')
from PIL import ImageDraw; d=ImageDraw.Draw(im)
order=sorted(range(n),key=lambda i:(np.argmax(pal[i]) , sum(pal[i])))
for k,i in enumerate(order):
    x=(k%cols)*S; y=(k//cols)*S; d.rectangle([x,y,x+S-1,y+S-1],fill=tuple(int(v) for v in pal[i]))
im.save('palette_in_use_64.png')
open('palette_in_use_64.hex','w').write('\n'.join('%02x%02x%02x'%tuple(int(v) for v in pal[i]) for i in order))
print('palette',n)
