"""Phase 3 build: 9 starters + 5 humans. Run from pixel/: python3 tools/sh_build.py [creatures|humans|all]"""
import sys, os, json; sys.path.insert(0,os.path.dirname(__file__))
from sh_pxlib import *
from PIL import Image
PIX='/workspace/kilumen/art/characters/pixel/'; PIL_='/workspace/kilumen/art/characters/pixel_pilot/'
R=PIX+'raw/'; BASE=PIX+'tools/sh_base/'; os.makedirs(BASE,exist_ok=True)
meta={}
def boxes(src,n): return find_boxes(Image.open(R+src),n,dil=1)
def mk(name,src,box,th,tw,ncol):
    spr,s,org=snap_off(Image.open(src if src.startswith('/') else R+src),box,th,tw,ncol)
    spr.save(BASE+name+'.png'); meta[name]=dict(src=src,box=box and [int(v) for v in box],scale=float(s),size=spr.size,colors=ncolors(spr)); return spr
def pilot_base(name):
    spr=Image.fromarray(remap(np.array(Image.open(PIL_+'base/'+name+'.png').convert('RGBA'))),'RGBA')
    spr.save(BASE+'pilot_'+name+'.png'); meta['pilot_'+name]=dict(src=PIL_+'base/'+name+'.png',remapped=True,size=spr.size,colors=ncolors(spr)); return spr
STAGE={'basic':dict(W=128,th=104,tw=120,ncol=28,OW=64,oth=48,otw=58,ocol=18),
       'mid':  dict(W=128,th=118,tw=124,ncol=28,OW=64,oth=54,otw=60,ocol=20),
       'final':dict(W=160,th=150,tw=156,ncol=32,OW=96,oth=80,otw=90,ocol=24)}
CRE=[('tumbloam','basic'),('burrowmane','mid'),('bastonox','final'),('cindrip','basic'),('emberlunx','mid'),('forgeharrow','final'),
     ('rillop','basic'),('brookhorn','mid'),('tidemarrow','final')]
def creature(n,st):
    P=STAGE[st]; out=PIX+f'creatures/{n}/'
    for d in ('battle','anim','overworld'): os.makedirs(out+d,exist_ok=True)
    # ---- battle bases
    if n=='cindrip': fr,bk=pilot_base('cindrip_front'),pilot_base('cindrip_back')
    else:
        bx=boxes(f'{n}_battle.jpg',2)
        bk=mk(f'{n}_back',f'{n}_battle.jpg',bx[1],P['th'],P['tw'],P['ncol'])
        if n in('emberlunx','forgeharrow'): fr=pilot_base(n)
        else: fr=mk(f'{n}_front',f'{n}_battle.jpg',bx[0],P['th'],P['tw'],P['ncol'])
    W=P['W']
    for view,s in (('front',fr),('back',bk)):
        c,_=place(s,W,W,bottom=True,pad_b=2); c=Image.fromarray(remap(np.array(c)))
        c.save(out+f'battle/{n}_{view}_{W}.png'); up(c,2).save(out+f'battle/{n}_{view}_{W}_2x.png')
        save_anim(idle_frames(s,W,W),out+'anim',f'{n}_{view}_idle',[180,160,200,160])
    # ---- overworld
    if n=='cindrip':
        views={d:pilot_base('cindrip_ow_'+d) for d in ['down','left','right','up']}
    else:
        bx=boxes(f'{n}_ow.jpg',4); views={}
        for b,d in zip(bx,['down','left','right','up']):
            views[d]=mk(f'{n}_ow_{d}',f'{n}_ow.jpg',b,P['oth'] if d in('down','up') else P['oth']+4,P['otw'],P['ocol'])
    OW=P['OW']
    export_set(out+'overworld',f'{n}_ow',views,OW,OW,0.28,[2,3],130,lift=2,stride=2,bodybob=1,sidefrac=0.24,quad=True)
HUM={'cal':dict(arms=True,por=['neutral','happy','surprised']),
     'ron':dict(arms=True,por=['neutral','happy','angry']),
     'mira':dict(arms=True,por=['neutral','cheerful','determined']),
     'vane':dict(arms=False,por=['composed','pleased','stern']),
     'stranger':dict(arms=False,por=['calm','kind','sorrowful'])}
FOLDER={'stranger':'riverbank_stranger'}
from scipy import ndimage as ndi
HOLE=1500
def matte(rgb,thr=238,BAND=4):
    mn=rgb.min(2); bg=mn>thr
    lab,_=ndi.label(bg); border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    fg=~np.isin(lab,list(border))  # everything not connected to the border white (small enclosed whites kept)
    # enclosed white pockets bigger than HOLE px (e.g. gap between ponytail and neck) are background too
    hl,hn=ndi.label(bg&fg)
    if hn:
        hs=ndi.sum(bg&fg,hl,range(1,hn+1)); fg=fg&~np.isin(hl,[i+1 for i,v in enumerate(hs) if v>HOLE])
    lab2,n=ndi.label(fg); sizes=ndi.sum(fg,lab2,range(1,n+1)); fg=lab2==(1+int(np.argmax(sizes)))
    band=fg & ~ndi.binary_erosion(fg,iterations=BAND)
    a=np.where(fg,1.0,0.0); soft=np.clip((255-mn.astype(float))/(255-170),0,1); a[band]=np.minimum(1.0,soft[band])
    a=ndi.gaussian_filter(a,0.6)*fg
    col=rgb.astype(float); al=np.clip(a,1e-3,1)[...,None]; col=np.clip((col-255*(1-al))/al,0,255)
    return np.dstack([col,a*255]).astype('uint8')
def portraits(who,names,out):
    im=np.array(Image.open(R+f'{who}_portraits.jpg').convert('RGB')); H,Wd=im.shape[:2]
    cnt=(im.min(2)<238).sum(0)
    # split points: emptiest column within +-90px of the 1/3 and 2/3 marks (busts may touch)
    cuts=[0]+[int(c-90+np.argmin(cnt[c-90:c+90])) for c in (Wd//3,2*Wd//3)]+[Wd]
    res=[]
    for i,nm in enumerate(names):
        x0=cuts[i]+(1 if i>0 else 0); x1=cuts[i+1]
        crop=np.full((H+20,x1-x0+20,3),255,'uint8'); crop[10:10+H,10:10+x1-x0]=im[:,x0:x1]
        rgba=Image.fromarray(matte(crop)); rgba=rgba.crop(rgba.getbbox())
        k=512/rgba.height; rgba=rgba.resize((round(rgba.width*k),512),Image.LANCZOS)
        rgba.save(out+f'portraits/{who}_{nm}.png'); res.append((nm,rgba.size))
    return res
def human(who):
    cfg=HUM[who]; out=PIX+f'humans/{FOLDER.get(who,who)}/'
    for d in ('trainer','overworld','portraits'): os.makedirs(out+d,exist_ok=True)
    if who=='cal':
        tr=pilot_base('cal_normal'); views={d:pilot_base('cal_chibi_'+d) for d in ['down','left','right','up']}
        import shutil
        for nm in cfg['por']: shutil.copy(PIL_+f'portraits/cal_{nm}.png',out+f'portraits/cal_{nm}.png')
    else:
        tr=mk(f'{who}_trainer',f'{who}_normal.jpg',boxes(f'{who}_normal.jpg',4)[0],124,62,26)
        views={d:mk(f'{who}_chibi_{d}',f'{who}_chibi.jpg',b,90,62,22) for b,d in zip(boxes(f'{who}_chibi.jpg',4),['down','left','right','up'])}
        print(who,portraits(who,cfg['por'],out))
    c,_=place(tr,64,128,pad_b=2); c=Image.fromarray(remap(np.array(c)))
    c.save(out+f'trainer/{who}_trainer_64x128.png'); up(c,2).save(out+f'trainer/{who}_trainer_64x128_2x.png'); up(c,3).save(out+f'trainer/{who}_trainer_64x128_3x.png')
    export_set(out+'overworld',f'{who}_chibi',views,64,96,0.2,[2,3],150,lift=2,stride=2,bodybob=1,sidefrac=0.12,arms=cfg['arms'])
if __name__=='__main__':
    what=sys.argv[1] if len(sys.argv)>1 else 'all'
    if what in('creatures','all'):
        for n,st in CRE: creature(n,st); print('done',n)
    if what in('humans','all'):
        for w in HUM: human(w); print('done',w)
    mp=BASE+f'meta_{what}.json'; json.dump(meta,open(mp,'w'),indent=1)
