"""Rig-part cutter for PixelOver bone rigging (DRAFT, awaiting Gary).
Cuts body / arm_extend_upper / arm_extend_fore / arm_relaxed from the ORIGINAL sprite.
All layers full canvas, palette-only, alpha 0/255."""
import json, os, sys, math, numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0,'/workspace/kilumen/art/characters/pixel/capture_poses/_tools')
from caplib import load, poly_mask, ink_of, rgb, hx, luma, snap_check, refill
PX='/workspace/kilumen/art/characters/pixel/'
OUT=PX+'capture_poses/rig_parts/'
N4=((1,0),(-1,0),(0,1),(0,-1))
def nb(m,y,x):
    H,W=m.shape
    for dy,dx in N4:
        yy,xx=y+dy,x+dx
        if 0<=yy<H and 0<=xx<W: yield yy,xx
def cut(a,arm,ink):
    """arm: dict poly, keep_y, fill(list polys), mfill. returns layer, erase mask, body-fill mask"""
    op=a[...,3]>0; H,W=op.shape
    P=poly_mask(a.shape,[arm['poly']])&op
    if 'notpoly' in arm: P&=~poly_mask(a.shape,arm['notpoly'])
    yy=np.arange(H)[:,None]*np.ones((1,W),int)
    er=P&(yy>=arm['keep_y'])                      # removed from body
    if arm.get('keep_poly'): er&=~poly_mask(a.shape,[arm['keep_poly']])
    lay=np.zeros_like(a); lay[P]=a[P]
    # body keeps a 1px seam where arm touched remaining body (becomes body outline, hidden under arm in compose)
    seam=np.zeros_like(er)
    for y,x in zip(*np.where(er)):
        if any(op[q] and not er[q] for q in nb(er,y,x)) and y>=arm['keep_y']+1: seam[y,x]=True
    seam&=~poly_mask(a.shape,arm.get('noseam',[])) if arm.get('noseam') else seam
    fillm=poly_mask(a.shape,arm.get('fill',[]))&er if arm.get('fill') else np.zeros_like(er)
    # arm cut edge outline: arm pixels touching kept body, below the shoulder overlap
    edge=np.zeros_like(er)
    for y,x in zip(*np.where(P)):
        if y<arm['keep_y']+arm.get('edge_skip',2): continue
        if any(op[q] and not P[q] for q in nb(P,y,x)): edge[y,x]=True
    return dict(P=P,er=er,seam=seam,fillm=fillm,edge=edge,lay=lay)
def outline_layer(lay,mask,ink,dark=None):
    o=lay.copy(); il=luma(rgb(ink))
    for y,x in zip(*np.where(mask)):
        if luma(o[y,x,:3])>il+(dark if dark is not None else 25): o[y,x,:3]=rgb(ink)
    return o
def build(cid,c):
    a0=load(PX+c['src']); H,W=a0.shape[:2]; ink=c.get('ink') or ink_of(a0)
    a=a0.copy()   # prop removal (documented in rig.json notes) happens on a working copy; diff is vs the true original
    for (x0,y0,x1,y1) in c.get('prop_rects',[]): a[y0:y1+1,x0:x1+1]=0
    for (x,y,col) in c.get('prep',[]):
        if col is None: a[y,x]=0
        else: a[y,x,:3]=rgb(ink if col=='ink' else col); a[y,x,3]=255
    E=cut(a,c['ext'],ink); R=cut(a,c['rel'],ink)
    body=a.copy()
    for X in (E,R):
        body[X['er']&~X['seam']&~X['fillm']]=0
    for X,arm in ((E,c['ext']),(R,c['rel'])):
        for poly,mx in arm.get('mfill',[]):
            mm=poly_mask(a.shape,[poly])&X['er']
            for y,x in zip(*np.where(mm)):
                if isinstance(mx,tuple): body[y,x]=a[y+mx[1],x+mx[0]]
                else:
                    sx=int(round(2*mx-x)); body[y,x]=a[y,sx]
        if arm.get('v1fill'):
            body,_=refill(body,X['er'],arm['v1fill'],c.get('cx',32))
        if arm.get('fill'):
            fm=X['fillm']
            # simple extend-fill: each row copies inward body texture mirrored at the boundary
            for y,x in zip(*np.where(fm&(body[...,3]==0))):
                d=arm['fill_dir']; k=1
                while 0<=x+d*k<W and (fm[y,x+d*k] and body[y,x+d*k,3]==0): k+=1
                s=x+d*k
                s2=min(max(s+(s-x)-1 if False else s+ (k-1),0),W-1)
                body[y,x]=a[y,s2] if a[y,s2,3] and not X['P'][y,s2] else a[y,s]
    # body outline on new edges (only pixels inside removed regions -> hidden in compose)
    ch=E['P']|R['P']; bop=body[...,3]>0
    il=luma(rgb(ink))
    for y,x in zip(*np.where(ch&bop)):
        if any(not bop[q] for q in nb(bop,y,x)) or x in(0,W-1):
            if luma(body[y,x,:3])>il+25: body[y,x,:3]=rgb(ink)
    for (x,y,col) in c.get('body_touch',[]):
        if col is None: body[y,x]=0
        else: body[y,x,:3]=rgb(ink if col=='ink' else col); body[y,x,3]=255
    # despeckle: tiny body islands left beside a cut move onto the adjacent arm layer (keeps recompose exact)
    mv_ext=np.zeros(body.shape[:2],bool); mv_rel=np.zeros(body.shape[:2],bool)
    if c.get('despeckle'):
        bop=body[...,3]>0; seen=np.zeros_like(bop)
        for y0,x0 in zip(*np.where(bop)):
            if seen[y0,x0]: continue
            st=[(y0,x0)]; comp=[]; seen[y0,x0]=1
            while st:
                y,x=st.pop(); comp.append((y,x))
                for dy in(-1,0,1):
                    for dx in(-1,0,1):
                        yy,xx=y+dy,x+dx
                        if 0<=yy<H and 0<=xx<W and bop[yy,xx] and not seen[yy,xx]: seen[yy,xx]=1; st.append((yy,xx))
            if len(comp)>=8: continue
            def near(L):
                return sum(L['lay'][max(0,y-2):y+3,max(0,x-2):x+3,3].astype(bool).sum() for y,x in comp)
            ne,nr=near(E),near(R)
            for y,x in comp:
                if ne>=nr and ne>0: mv_ext[y,x]=1
                elif nr>0: mv_rel[y,x]=1
                body[y,x]=0
    # arm layers with cut-edge outline
    ext=outline_layer(E['lay'],E['edge'],ink); rel=R['lay'].copy()
    ext[mv_ext]=a[mv_ext]; rel[mv_rel]=a[mv_rel]  # relaxed arm stays put: no cut-edge outline
    for (x,y,col) in c['ext'].get('touch',[]): ext[y,x,:3]=rgb(ink if col=='ink' else col); ext[y,x,3]=255
    if 'hand' not in c: autojoints(c,ext)
    S=np.array(c['shoulder'],float); Wr=np.array(c['wrist'],float); El=np.array(c['elbow'],float)
    ax=(Wr-S)/np.linalg.norm(Wr-S); e=np.dot(El-S,ax); ov=c.get('overlap',1.5)
    up=np.zeros_like(ext); fo=np.zeros_like(ext); m=ext[...,3]>0
    for y,x in zip(*np.where(m)):
        t=np.dot(np.array([x+0.5,y+0.5])-S,ax)
        if t<=e+ov: up[y,x]=ext[y,x]
        if t>=e-ov: fo[y,x]=ext[y,x]
    return dict(a=a0,ink=ink,body=body,up=up,fo=fo,rel=rel,E=E,R=R)
def autojoints(c,ext):
    m=ext[...,3]>0; ys=np.where(m.any(1))[0]; yb=int(ys.max())
    def cen(y0,y1):
        yy,xx=np.where(m[y0:y1+1]); return [int(round(xx.mean())),int(round(yy.mean()+y0))]
    hc=cen(yb-6,yb); wr=[cen(hc[1]-5,hc[1]-4)[0],hc[1]-4]
    ey=int(round((c['shoulder'][1]+wr[1])/2)); el=[cen(ey,ey)[0],ey]
    c.setdefault('hand',hc); c.setdefault('wrist',wr); c.setdefault('elbow',el)
def over(*ls):
    o=np.zeros_like(ls[0])
    for l in ls:
        m=l[...,3]>0; o[m]=l[m]
    return o
def save(cid,c,r):
    d=OUT+cid+'/'; os.makedirs(d+'_check',exist_ok=True)
    names=dict(body=r['body'],arm_extend_upper=r['up'],arm_extend_fore=r['fo'],arm_relaxed=r['rel'])
    bad={}
    for n,l in names.items():
        Image.fromarray(l).save(d+n+'.png'); bad[n]=snap_check(l)
    comp=over(r['body'],r['rel'],r['up'],r['fo'])
    diff=np.any(comp!=r['a'],axis=2)
    H,W=r['a'].shape[:2]
    j=dict(char_id=cid,canvas=[W,H],view=c['view'],extend_side=c['side'],
           arm_used=c['arm_used'],shoulder_px=c['shoulder'],elbow_px=c['elbow'],wrist_px=c['wrist'],hand_center_px=c['hand'],
           layers_bottom_to_top=['body.png','arm_relaxed.png','arm_extend_upper.png','arm_extend_fore.png'],
           outline_hex=r['ink'],notes=c.get('notes',''),status='draft, awaiting Gary')
    json.dump(j,open(d+'rig.json','w'),indent=1)
    # check render
    S=3; cells=[('original',r['a']),('recomposed',comp),('diff (red)',None),('body',r['body']),('arm_relaxed',r['rel']),('arm_extend_upper',r['up']),('arm_extend_fore',r['fo'])]
    im=Image.new('RGBA',(len(cells)*(W*S+6),H*S+16),(60,60,60,255)); dr=ImageDraw.Draw(im)
    for i,(n,l) in enumerate(cells):
        if l is None:
            l=r['a'].copy(); g=l[...,3]>0; l[g,:3]=(luma(l[g,:3])[:,None]*0.5+60).astype(np.uint8); l[diff]=[255,0,0,255]
        bg=Image.new('RGBA',(W,H),(150,176,150,255)); bg.alpha_composite(Image.fromarray(l))
        if n in('arm_extend_upper','arm_extend_fore'):
            dd=ImageDraw.Draw(bg)
            for p,col in ((c['shoulder'],(255,0,255,255)),(c['elbow'],(0,255,255,255)),(c['wrist'],(255,255,0,255)),(c['hand'],(255,0,0,255))): bg.putpixel(tuple(map(int,p)),col)
        x=i*(W*S+6); im.paste(bg.resize((W*S,H*S),Image.NEAREST),(x,14)); dr.text((x+2,2),n,fill='white')
    im.save(d+'_check/parts_3x.png')
    rep=dict(palette={k:v for k,v in bad.items()},recompose_diff_px=int(diff.sum()),diff_px=[[int(x),int(y)] for y,x in zip(*np.where(diff))])
    json.dump(rep,open(d+'_check/check.json','w'))
    return rep
