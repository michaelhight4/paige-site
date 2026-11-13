import sys; sys.path.insert(0,'tools')
from pxlib import find_boxes
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
def matte(rgb,thr=238,BAND=3):
    mn=rgb.min(2); bg=mn>thr
    lab,_=ndi.label(bg); border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    outside=np.isin(lab,list(border))
    fg=~outside; fg=ndi.binary_fill_holes(fg)
    lab2,n=ndi.label(fg); sizes=ndi.sum(fg,lab2,range(1,n+1)); fg=lab2==(1+int(np.argmax(sizes)))
    # soft edge: color-to-alpha on a 2px band at the boundary (handles vignette fades)
    band=fg & ~ndi.binary_erosion(fg,iterations=BAND)
    a=np.where(fg,1.0,0.0)
    soft=np.clip((255-mn.astype(float))/(255-170),0,1)
    a[band]=np.minimum(1.0,soft[band]*1.0+0.0)
    a=ndi.gaussian_filter(a,0.6)*fg + 0
    # unmix white from semi-transparent pixels
    col=rgb.astype(float); al=np.clip(a,1e-3,1)[...,None]
    col=np.clip((col-255*(1-al))/al,0,255)
    return np.dstack([col,a*255]).astype('uint8')
for who,names in [('cal',['neutral','happy','surprised']),('ron',['neutral','happy','angry'])]:
    im=Image.open(f'raw/portrait_{who}.jpg').convert('RGB')
    boxes=find_boxes(im,3,thr=238,dil=4)
    for b,nm in zip(boxes,names):
        x0,y0,x1,y1=b; pad=6
        crop=np.array(im.crop((max(0,x0-pad),max(0,y0-pad),min(im.width,x1+pad),min(im.height,y1+pad))))
        rgba=Image.fromarray(matte(crop,BAND=14 if who=="ron" else 4)); bb=rgba.getbbox(); rgba=rgba.crop(bb)
        k=512/rgba.height; rgba=rgba.resize((round(rgba.width*k),512),Image.LANCZOS)
        rgba.save(f'portraits/{who}_{nm}.png'); print(who,nm,rgba.size,b)
