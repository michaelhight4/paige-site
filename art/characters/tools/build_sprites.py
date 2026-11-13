# Builds masters/battle/overworld sprites + preview from generated model sheets.
import numpy as np, os
from PIL import Image, ImageDraw
from scipy import ndimage
A='/cursor/stores/store-e454a015-d6d2-40df-88e4-4a11afd8a669/grok-bot/agents/c2266925-e9a1-4884-823a-a8be212afc8b/attachments/'
O='/workspace/kilumen/art/characters/'
S={ # name: (hash prefix, kind)
'tumbloam':('7d7dcb9e','c'),'burrowmane':('efa46af8','c'),'bastonox':('51427e6a','c'),
'cindrip':('17753bc1','c'),'emberlunx':('ec8ec80e','c'),'forgeharrow':('20512418','c'),
'rillop':('1416b4a9','c'),'brookhorn':('f752dede','c'),'tidemarrow':('fec02e7a','c'),
'sailquill':('2bf06dba','c'),'halovy':('ee571d13','c'),'gloamtick':('52a96acc','c'),
'runeskein':('c729704c','c'),'burlbeetle':('6a353241','c'),'mirewump':('bc236ecd','c'),
'slagrook':('6ebe76fa','c'),
'player_boy':('37a251b4','h'),'player_girl':('38721e8b','h'),'ron_rival':('5e0ec089','h'),
'director_vane_mentor':('f02974c1','h'),'riverbank_stranger':('fbe86ab0','h')}
import glob
def cut(img,box):
    c=np.array(img.crop(box).convert('RGB')).astype(int)
    white=(c.min(2)>232)
    lab,_=ndimage.label(white)
    border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(border))
    fg=~bg
    # keep largest foreground blobs (drop stray neighbours touching the edge)
    fl,n=ndimage.label(fg)
    if n:
        sizes=ndimage.sum(fg,fl,range(1,n+1)); big=int(sizes.argmax())+1
        edge=set(np.unique(np.concatenate([fl[:,0],fl[:,-1]])))
        keep=[big]+[i+1 for i,s in enumerate(sizes) if i+1!=big and s>0.01*sizes.max() and (i+1) not in edge]
        fg=np.isin(fl,keep)
    alpha=ndimage.binary_erosion(fg,iterations=1)
    alpha=ndimage.gaussian_filter(alpha.astype(float),0.7)
    rgba=np.dstack([c,(alpha*255).astype(int)]).astype('uint8')
    im=Image.fromarray(rgba,'RGBA'); return im.crop(im.getbbox())
def fit(im,W,H,pad=0.04,bottom=True):
    s=min(W*(1-2*pad)/im.width,H*(1-pad)/im.height)
    r=im.resize((max(1,round(im.width*s)),max(1,round(im.height*s))),Image.LANCZOS)
    cv=Image.new('RGBA',(W,H),(0,0,0,0))
    x=(W-r.width)//2; y=H-r.height-(2 if bottom else (H-r.height)//2)
    cv.paste(r,(x,y),r); return cv
for d in ['masters','battle','overworld']: os.makedirs(O+d,exist_ok=True)
for n,(h,k) in S.items():
    f=glob.glob(A+h+'*')[0]; img=Image.open(f).convert('RGB'); W,H=img.size
    img.save(O+f'masters/{n}_sheet.png')
    rows=2 if k=='c' else 1; ch=H//rows; cw=W//4
    front=cut(img,(0,0,cw,ch)); battle=cut(img,(3*cw if k=='c' else int(0.66*W),0,W,ch))
    fit(front,512,512 if k=='c' else 768).save(O+f'masters/{n}_front_512.png')
    fit(battle,256,256,bottom=False).save(O+f'battle/{n}_battle_256.png')
    if k=='h':
        fit(front,192,288,pad=0.06).save(O+f'overworld/{n}_ow_192x288.png')
        fit(front,128,192,pad=0.06).save(O+f'overworld/{n}_ow_128x192.png')
    else:
        fit(front,192,192,pad=0.08).save(O+f'overworld/{n}_ow_192.png')
        fit(front,128,128,pad=0.08).save(O+f'overworld/{n}_ow_128.png')
# preview: tile sheets 3 columns
names=list(S); tw,th=640,360; cols=3; rws=-(-len(names)//cols)
P=Image.new('RGB',(cols*tw,rws*(th+28)),'white'); d=ImageDraw.Draw(P)
for i,n in enumerate(names):
    im=Image.open(O+f'masters/{n}_sheet.png'); im.thumbnail((tw,th))
    x=(i%cols)*tw; y=(i//cols)*(th+28); P.paste(im,(x+(tw-im.width)//2,y+28)); d.text((x+8,y+8),n,fill='black')
P.save(O+'preview_all.png'); print('done',len(names))
