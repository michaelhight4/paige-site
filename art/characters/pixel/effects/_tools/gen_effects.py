"""Kilumen element attack effect library generator.
Run: python3 gen_effects.py   (from anywhere). Deterministic (seeded)."""
import os, sys, json, math
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
from fxlib import *
import elements as EL

ROOT='/workspace/kilumen/art/characters/pixel/effects'
PILOT='/workspace/kilumen/art/characters/pixel_pilot'
SW,SH=320,240                       # battle screen (native)
TW,TH=240,176; TOFF=(40,40)         # travel canvas size + its top-left on the battle screen
IW,IH=96,112; IANCH=(48,64)         # impact canvas + anchor (= creature centre)
# battle points (screen coords) taken from the pilot layout (Cindrip back lower-left, Emberlunx upper-right)
PLAYER_MOUTH=(114,161); FOE_CENTER=(230,100); FOE_MOUTH=(188,106); PLAYER_CENTER=(66,176)
def tc(p): return (p[0]-TOFF[0],p[1]-TOFF[1])

def make_paths(arc,wob,el):
    p2f=Path(tc(PLAYER_MOUTH),tc(FOE_CENTER),arc,(1.0,0.78),wob)
    f2p=Path(tc(FOE_MOUTH),tc(PLAYER_CENTER),arc,(0.8,1.15),wob)
    return p2f,f2p

def gen_element(el):
    nt,ni,fpst,fpsi,arc,wob,ol,note=EL.ELEMENTS[el]
    tr=getattr(EL,el+'_travel'); im=getattr(EL,el+'_impact')
    seed=sum(map(ord,el))*7
    p2f,f2p=make_paths(arc,wob,el)
    out={}
    for anim,P in (('travel_p2f',p2f),('travel_f2p',f2p)):
        fr=[]
        for i in range(nt):
            fx=FX(TW,TH,C(ol)); tr(fx,i,nt,P,seed); fr.append(fx.render())
        out[anim]=fr
    fr=[]
    for i in range(ni):
        fx=FX(IW,IH,C(ol)); im(fx,i,ni,IANCH,seed); fr.append(fx.render())
    out['impact']=fr
    return out

def save_anim(el,anim,frames,fps):
    d=f'{ROOT}/{el}/{anim}'; os.makedirs(d+'/1x',exist_ok=True); os.makedirs(d+'/2x',exist_ok=True)
    for f in os.listdir(d+'/1x'): os.remove(d+'/1x/'+f)
    for f in os.listdir(d+'/2x'): os.remove(d+'/2x/'+f)
    for i,f in enumerate(frames):
        Image.fromarray(f,'RGBA').save(f'{d}/1x/{el}_{anim}_f{i}.png')
        Image.fromarray(up(f),'RGBA').save(f'{d}/2x/{el}_{anim}_f{i}_2x.png')
    H,W=frames[0].shape[:2]; sheet=np.zeros((H,W*len(frames),4),'uint8')
    for i,f in enumerate(frames): sheet[:,i*W:(i+1)*W]=f
    Image.fromarray(sheet,'RGBA').save(f'{d}/{el}_{anim}_sheet.png')
    Image.fromarray(up(sheet),'RGBA').save(f'{d}/{el}_{anim}_sheet_2x.png')
    save_gif([up(f) for f in frames],f'{d}/{el}_{anim}_2x.gif',int(1000/fps))
    return d

def manifest_entry(el):
    """Manifest data for one element (no rendering needed). Paths relative to /workspace/kilumen."""
    nt,ni,fpst,fpsi,arc,wob,ol,note=EL.ELEMENTS[el]
    ent={'description':note,'outline':'#'+ol,'animations':{}}
    for anim in ('travel_p2f','travel_f2p','impact'):
        fps=fpsi if anim=='impact' else fpst
        n=ni if anim=='impact' else nt
        W,H=(IW,IH) if anim=='impact' else (TW,TH)
        d=f'{ROOT}/{el}/{anim}'
        rel=os.path.relpath(d,'/workspace/kilumen')
        a={'frames':n,'frame_size':[W,H],'frame_size_2x':[W*2,H*2],'fps':fps,
           'frame_ms':int(1000/fps),'loop':False,
           'frames_1x':[f'{rel}/1x/{el}_{anim}_f{i}.png' for i in range(n)],
           'frames_2x':[f'{rel}/2x/{el}_{anim}_f{i}_2x.png' for i in range(n)],
           'sheet_1x':f'{rel}/{el}_{anim}_sheet.png','sheet_2x':f'{rel}/{el}_{anim}_sheet_2x.png',
           'sheet_layout':'horizontal strip, frame i at x=i*frame_w',
           'gif_2x':f'{rel}/{el}_{anim}_2x.gif','battle_preview_gif_2x':f'{rel}/{el}_{anim}_battle_2x.gif'}
        if anim=='impact':
            a['anchor']={'type':'creature_centre','origin_px':list(IANCH),'origin_frac':[IANCH[0]/IW,IANCH[1]/IH],
                'note':'place so origin_px sits on the hit creature centre; same art used on foe and player (flip_x allowed)',
                'example_screen_targets_frac':{'foe':[FOE_CENTER[0]/SW,FOE_CENTER[1]/SH],'player':[PLAYER_CENTER[0]/SW,PLAYER_CENTER[1]/SH]}}
        else:
            P=make_paths(arc,wob,el)[0 if anim=='travel_p2f' else 1]
            S=(P.S[0]+TOFF[0],P.S[1]+TOFF[1]); E=(P.E[0]+TOFF[0],P.E[1]+TOFF[1])
            a['anchor']={'type':'screen_space_path','canvas_offset_on_screen_px':list(TOFF),
                'battle_screen_px':[SW,SH],
                'start_px_in_frame':[round(P.S[0]),round(P.S[1])],'end_px_in_frame':[round(P.E[0]),round(P.E[1])],
                'start_frac_screen':[round(S[0]/SW,4),round(S[1]/SH,4)],'end_frac_screen':[round(E[0]/SW,4),round(E[1]/SH,4)],
                'start_is':'player mouth (back sprite)' if anim=='travel_p2f' else 'foe mouth (front sprite)',
                'end_is':'foe centre' if anim=='travel_p2f' else 'player centre',
                'arc_px':arc,'wobble_px':wob,
                'frame_roles':'f0 = anticipation at start, middle = travel, last = arrival flash at end; chain impact right after'}
        ent['animations'][anim]=a
    return ent

BG=np.array(Image.open(f'{PILOT}/battle_preview_native.png').convert('RGBA'))
def over(base,fr,xy):
    b=base.copy(); h,w=fr.shape[:2]; x,y=xy
    x0,y0=max(0,x),max(0,y); x1,y1=min(SW,x+w),min(SH,y+h)
    sub=fr[y0-y:y1-y,x0-x:x1-x]; m=sub[...,3]>0
    reg=b[y0:y1,x0:x1]; reg[m]=sub[m]; b[y0:y1,x0:x1]=reg; return b
def place_imp(target): return (target[0]-IANCH[0],target[1]-IANCH[1])

def battle_gif(seq,path):
    frames=[up(f) for f,_ in seq]; ms=[m for _,m in seq]
    save_gif(frames,path,ms,transparent=False)

def main():
    only=sys.argv[1:] or list(EL.ELEMENTS)
    os.makedirs(ROOT+'/_preview',exist_ok=True)
    for el in only:
        nt,ni,fpst,fpsi,arc,wob,ol,note=EL.ELEMENTS[el]
        A=gen_element(el)
        for anim,frames in A.items():
            fps=fpsi if anim=='impact' else fpst
            d=save_anim(el,anim,frames,fps)
            # per-animation battle preview gif
            seq=[(BG,300)]
            for f in frames:
                xy=TOFF if anim!='impact' else place_imp(FOE_CENTER)
                seq.append((over(BG,f,xy),int(1000/fps)))
            seq.append((BG,400))
            battle_gif(seq,f'{d}/{el}_{anim}_battle_2x.gif')
        # element battle preview: p2f -> impact on foe -> f2p -> impact on player
        seq=[(BG,350)]
        for f in A['travel_p2f']: seq.append((over(BG,f,TOFF),int(1000/fpst)))
        for f in A['impact']: seq.append((over(BG,f,place_imp(FOE_CENTER)),int(1000/fpsi)))
        seq.append((BG,450))
        for f in A['travel_f2p']: seq.append((over(BG,f,TOFF),int(1000/fpst)))
        fl=[f[:,::-1] for f in A['impact']]
        for f in fl: seq.append((over(BG,f,place_imp(PLAYER_CENTER)),int(1000/fpsi)))
        seq.append((BG,500))
        battle_gif(seq,f'{ROOT}/_preview/{el}_battle_2x.gif')
        # element strip (for review): onion travel p2f / f2p over bg + impact frames
        strip=element_strip(el,A)
        Image.fromarray(strip).save(f'{ROOT}/_preview/{el}_strip.png')
        Image.fromarray(up(strip)).save(f'{ROOT}/_preview/{el}_strip_2x.png')
        print(el,{k:len(v) for k,v in A.items()},flush=True)

GREY=np.array([96,92,110,255],'uint8')
def onion(frames):
    H,W=frames[0].shape[:2]; o=np.zeros((H,W,4),'uint8')
    for f in frames:
        m=f[...,3]>0; o[m]=f[m]
    return o
def element_strip(el,A):
    # row 1: p2f onion on battle crop + f2p onion on battle crop ; row 2: impact frames on grey
    crop=BG[TOFF[1]:TOFF[1]+TH,TOFF[0]:TOFF[0]+TW]
    def onbg(fr,bg):
        b=bg.copy(); m=fr[...,3]>0; b[m]=fr[m]; return b
    r1=np.concatenate([onbg(onion(A['travel_p2f']),crop),np.zeros((TH,4,4),'uint8')+255,onbg(onion(A['travel_f2p']),crop)],1)
    imps=[np.concatenate([onbg(f,np.zeros_like(f)+GREY),np.zeros((IH,2,4),'uint8')+255],1) for f in A['impact']]
    r2=np.concatenate(imps,1)
    W=max(r1.shape[1],r2.shape[1])
    def pad(a): return np.concatenate([a,np.zeros((a.shape[0],W-a.shape[1],4),'uint8')+np.array([30,28,36,255],'uint8')],1)
    lab=np.zeros((12,W,4),'uint8')+np.array([30,28,36,255],'uint8')
    li=Image.fromarray(lab); ImageDraw.Draw(li).text((2,0),f'{el}: travel p2f (onion) | travel f2p (onion) / impact frames',fill=(255,255,255,255)); lab=np.array(li)
    return np.concatenate([lab,pad(r1),np.zeros((2,W,4),'uint8')+255,pad(r2)],0)

if __name__=='__main__': main()
