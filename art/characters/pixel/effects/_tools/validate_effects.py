"""Validate the Kilumen effect library.
Checks per element/anim: frame count 6-8 (and matches registry), 1x/2x counts match, frame sizes,
palette-only colours (shared 64-colour palette) + binary alpha (0/255), every 2x == exact nearest-neighbour
of its 1x, sheets == concatenated frames, sheet_2x == NN of sheet, transparent GIF frame count.
Run: python3 validate_effects.py  -> prints summary, writes effects/_preview/validation_report.json, exit 1 on failure."""
import os, sys, json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from fxlib import PAL
import elements as EL
ROOT='/workspace/kilumen/art/characters/pixel/effects'
PALSET={tuple(int(v) for v in c[:3]) for c in PAL}
assert len(PALSET)==64
SIZES={'travel_p2f':(240,176),'travel_f2p':(240,176),'impact':(96,112)}
def nn(a): return np.repeat(np.repeat(a,2,0),2,1)
def load(p): return np.array(Image.open(p).convert('RGBA'))
def check_px(a):
    errs=[]
    al=a[...,3]
    if not np.isin(al,(0,255)).all(): errs.append('non-binary alpha')
    rgb=a[al>0][:,:3]
    cols={tuple(map(int,c)) for c in np.unique(rgb,axis=0)} if len(rgb) else set()
    bad=cols-PALSET
    if bad: errs.append(f'{len(bad)} off-palette colours e.g. {sorted(bad)[:3]}')
    return errs,cols
def validate():
    rep={'elements':{},'ok':True,'palette_colours':64}
    for el,(nt,ni,*_) in EL.ELEMENTS.items():
        E={}
        for anim in ('travel_p2f','travel_f2p','impact'):
            d=f'{ROOT}/{el}/{anim}'; errs=[]; warns=[]
            want=ni if anim=='impact' else nt
            f1=sorted(os.listdir(d+'/1x'),key=lambda s:int(s.split('_f')[-1].split('.')[0]))
            f2=sorted(os.listdir(d+'/2x'),key=lambda s:int(s.split('_f')[-1].split('_')[0]))
            n=len(f1)
            if not 6<=n<=8: errs.append(f'frame count {n} not in 6-8')
            if n!=want: errs.append(f'frame count {n} != registry {want}')
            if len(f2)!=n: errs.append(f'2x count {len(f2)} != 1x {n}')
            used=set(); frames=[]
            for i in range(n):
                a=load(f'{d}/1x/{el}_{anim}_f{i}.png'); frames.append(a)
                if a.shape[1::-1]!=SIZES[anim]: errs.append(f'f{i} size {a.shape[1::-1]}')
                e,c=check_px(a); used|=c; errs+= [f'f{i}: {x}' for x in e]
                if (a[...,3]>0).sum()==0: warns.append(f'f{i} is empty (blank end/hold frame)')
                b=load(f'{d}/2x/{el}_{anim}_f{i}_2x.png')
                if b.shape!=nn(a).shape or not np.array_equal(b,nn(a)): errs.append(f'f{i}: 2x is not exact NN of 1x')
            sh=load(f'{d}/{el}_{anim}_sheet.png'); sh2=load(f'{d}/{el}_{anim}_sheet_2x.png')
            if frames and not np.array_equal(sh,np.concatenate(frames,1)): errs.append('sheet != frames')
            if not np.array_equal(sh2,nn(sh)): errs.append('sheet_2x != NN(sheet)')
            g=Image.open(f'{d}/{el}_{anim}_2x.gif')
            if getattr(g,'n_frames',1)!=n: errs.append(f'gif frames {g.n_frames} != {n}')
            for p in (f'{d}/{el}_{anim}_battle_2x.gif',):
                if not os.path.exists(p): errs.append('missing '+os.path.basename(p))
            E[anim]={'frames':n,'palette_ok':not any('palette' in x or 'alpha' in x for x in errs),
                     'nn_2x_ok':not any('2x' in x for x in errs),'colours_used':len(used),
                     'errors':errs,'warnings':warns,'pass':not errs}
            if errs: rep['ok']=False
        rep['elements'][el]=E
    return rep
if __name__=='__main__':
    r=validate()
    json.dump(r,open(f'{ROOT}/_preview/validation_report.json','w'),indent=1)
    for el,E in r['elements'].items():
        print(f"{el:11s}",' '.join(f"{a}:{v['frames']}f {'PASS' if v['pass'] else 'FAIL'} ({v['colours_used']}c)" for a,v in E.items()),
              *[f'\n   ! {a}: {x}' for a,v in E.items() for x in v['errors']],*[f'\n   ~ {a}: {x}' for a,v in E.items() for x in v['warnings']])
    print('ALL OK' if r['ok'] else 'FAILURES'); sys.exit(0 if r['ok'] else 1)
