"""Build cosmic_swaps.json + previews. python3 build_cosmic.py  (DRAFT; not wired in)."""
import sys, os, json
HERE=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,HERE); sys.path.insert(0,HERE+'/../../icons/tools')
from klib import *
from inventory import inventory, sprite_files, crystal
from swaps import SWAPS
from PIL import ImageDraw
COS=P+'/cosmic'; PREV=COS+'/_preview'
GLOW={'fcd668','e8ce92','ecdec4','f8eabe','603096','8a4ace','b076ec','d6acff'}
G=json.load(open(A+'/world/overworld/time_of_day/grades.json'))['grades']; PH=['dawn','day','dusk','night']
WT=json.load(open(P+'/warmth/warmth_tints.json'))

def check():
    probs=[]
    for n in NAMES:
        name,idea,mp=SWAPS[n]; inv=inventory(n)
        for s,d in mp.items():
            if s not in PALSET or d not in PALSET: probs.append((n,'off-palette',s,d))
            if s not in inv: print('  note: shared line map colour not used by',n,s,'(left out of JSON)')
            if d in GLOW and s not in GLOW: probs.append((n,'non-glow mapped onto night-glow',s,d))
            if d in VIOLETS and s not in VIOLETS: probs.append((n,'mapped onto crystal violet',s,d))
        cov=sum(v for k,v in inv.items() if k in mp)/sum(inv.values())
        print(f'{n:12s} {name:12s} recoloured {cov*100:4.1f}% of body px; untouched: '+
              ' '.join(f'{k}:{v}' for k,v in sorted(inv.items(),key=lambda kv:-kv[1]) if k not in mp)[:200])
    return probs

def apply(a,m,mp):
    o=a.copy(); h=hexmap(a)
    for y,x in zip(*np.where((a[...,3]>0)&~m)):
        d=mp.get(h[y,x])
        if d: o[y,x,:3]=rgb(d)
    return o

def warm(a,m,n,st):
    if st==0: return a.copy()
    mp={k.lstrip('#'):v.lstrip('#') for k,v in WT['creatures'][n]['stages'][str(st)].items()}
    o=a.copy(); h=hexmap(a)
    for y,x in zip(*np.where(m)): o[y,x,:3]=rgb(mp[h[y,x]])
    return o

def grade(a,ph,key='sprite'):
    mp=(G[ph][key] if key else G[ph])['map']; o=a.copy(); h=hexmap(a)
    for y,x in zip(*np.where(a[...,3]>0)): o[y,x,:3]=rgb(mp[h[y,x]])
    return o

def up(a,k): return np.repeat(np.repeat(a,k,0),k,1)
def crop(a):
    bb=Image.fromarray(a).getbbox(); return a[bb[1]:bb[3],bb[0]:bb[2]]

def views(n):
    out=[]
    for lab,f in (('front',battle(n,'front')),('back',battle(n,'back')),('overworld',ow(n,'left','stand')),('icon',f'{P}/icons/{n}_icon_f0.png')):
        a=load(f); m=crystal(n,f); out.append((lab,a,m))
    return out

BG=(94,88,102)
def preview_all():
    mp_all={n:SWAPS[n][2] for n in NAMES}
    rows=[]
    for n in NAMES:
        vs=views(n); tiles=[]
        for lab,a,m in vs:
            c=apply(a,m,mp_all[n])
            bb=Image.fromarray(a).getbbox()
            tiles.append((lab,up(a[bb[1]:bb[3],bb[0]:bb[2]],2),up(c[bb[1]:bb[3],bb[0]:bb[2]],2)))
        rows.append((n,tiles))
    colw=[max(r[1][i][1].shape[1] for r in rows) for i in range(4)]
    W=130+sum(2*w+30 for w in colw); H=24+sum(max(t[1].shape[0] for t in r[1])+26 for r in rows)
    S=Image.new('RGBA',(W,H),BG+(255,)); d=ImageDraw.Draw(S)
    x=130
    for i,lab in enumerate(['front battle','back battle','overworld (left)','party icon']):
        d.text((x,6),f'{lab}: normal | cosmic',fill=(252,246,232)); x+=2*colw[i]+30
    y=24
    for n,tiles in rows:
        h=max(t[1].shape[0] for t in tiles)
        d.text((6,y+h//2-12),n,fill=(252,246,232)); d.text((6,y+h//2+2),SWAPS[n][0],fill=(198,236,250))
        x=130
        for i,(lab,a,c) in enumerate(tiles):
            S.alpha_composite(Image.fromarray(a),(x,y+h-a.shape[0])); S.alpha_composite(Image.fromarray(c),(x+colw[i]+8,y+h-c.shape[0]))
            x+=2*colw[i]+30
        d.line([(0,y+h+12),(W,y+h+12)],fill=(130,122,132)); y+=h+26
    S.save(f'{PREV}/cosmic_all_2x.png'); print('saved',S.size)

def preview_tod():
    """Cosmic overworld + icon in all 4 phases with the sprite grade, warmth stage 0 and 3 (order: cosmic swap -> warmth -> grade)."""
    ter=np.array(Image.open(A+'/world/overworld/tiles_1x/terrain.png').convert('RGBA'))
    z=2; rows=[]
    for n in NAMES:
        f=ow(n,'left','stand'); a=load(f); m=crystal(n,f); fi=f'{P}/icons/{n}_icon_f0.png'; ai=load(fi); mi=crystal(n,fi)
        cells=[]
        for ph in PH:
            for st in (0,3):
                for (x,mm) in ((a,m),(ai,mi)):
                    s=grade(warm(apply(x,mm,SWAPS[n][2]),mm,n,st),ph)
                    h,w=s.shape[:2]; bg=np.tile(ter[:64,:64],(h//64+1,w//64+1,1))[:h,:w].copy()
                    bg=grade(bg,ph,None); im=Image.fromarray(bg); im.alpha_composite(Image.fromarray(s))
                    cells.append(up(np.array(im),z))
        rows.append((n,cells))
    cw=[max(r[1][i].shape[1] for r in rows) for i in range(16)]
    W=110+sum(c+4 for c in cw); H=20+sum(max(c.shape[0] for c in r[1])+4 for r in rows)
    S=Image.new('RGBA',(W,H),(20,20,20,255)); d=ImageDraw.Draw(S)
    x=110
    for i in range(16):
        if i%2==0: d.text((x,4),f'{PH[i//4]} w{0 if (i//2)%2==0 else 3}',fill='white')
        x+=cw[i]+4
    y=20
    for n,cells in rows:
        d.text((4,y+20),n,fill='white'); x=110
        for i,c in enumerate(cells): S.alpha_composite(Image.fromarray(c),(x,y)); x+=cw[i]+4
        y+=max(c.shape[0] for c in cells)+4
    S.save(f'{PREV}/cosmic_tod_warmth_check_2x.png'); print('saved',S.size)

def preview_warmth():
    """Cosmic front battle sprites through Warmth stages 0-3 (1x, on the menu grey)."""
    tiles=[]
    for n in NAMES:
        f=battle(n,'front'); a=load(f); m=crystal(n,f); c=apply(a,m,SWAPS[n][2])
        tiles.append([crop(warm(c,m,n,st)) for st in range(4)])
    cw=max(t[0].shape[1] for t in tiles); ch=max(t[0].shape[0] for t in tiles)
    S=Image.new('RGBA',(8*(cw+6)+6,4*(ch+6)+6),BG+(255,))
    for i,t in enumerate(tiles):
        for st in range(4):
            x=6+((i%2)*4+st)*(cw+6); y=6+(i//2)*0
        for st in range(4): pass
    # 16 creatures x 4 stages -> 4 rows of (4 creatures x 4 stages)
    S=Image.new('RGBA',(16*(cw+4)+4,4*(ch+4)+4),BG+(255,))
    for i,t in enumerate(tiles):
        for st in range(4):
            a=t[st]; x=4+((i%4)*4+st)*(cw+4); y=4+(i//4)*(ch+4)
            S.alpha_composite(Image.fromarray(a),(x,y+ch-a.shape[0]))
    S.save(f'{PREV}/cosmic_warmth_stages_1x.png'); print('saved',S.size)

def write_json():
    doc={'feature':'Cosmic variants (rare alternate colouring)','status':'DRAFT: art NOT signed off by Gary. Not wired in.',
         'palette':'art/world/overworld/palette.hex (every src and dst colour is from it)',
         'how_to_apply':'For a Cosmic creature, recolour every sprite (battle front/back + idle frames, overworld frames, party icon) with swaps[creature]: '
            'exact #rrggbb match, alpha unchanged, ONLY on pixels outside the crystal mask (Warmth masks: art/characters/pixel/warmth/masks/<creature>/...). '
            'Colours not listed are left alone. Crystal pixels are never touched by this swap, so they stay violet and Crystal Warmth still applies. '
            'Order: 1) cosmic swap, 2) Crystal Warmth swap (inside mask), 3) time-of-day sprite grade. '
            'All swaps are single-pass lookups on the ORIGINAL colour (do not chain: a dst that is also a src must not be swapped again).',
         'vfx':'Starfield shimmer on encounter, the 3-note chime and the 4 s icon twinkle are NOT here. Those are for the Animator/Coder.',
         'swaps':{}, 'concepts':{}}
    for n in NAMES:
        name,idea,mp=SWAPS[n]
        inv=inventory(n)
        doc['swaps'][n]={'#'+s:'#'+d for s,d in mp.items() if s in inv}   # only colours this creature really uses
        doc['concepts'][n]={'name':name,'idea':idea}
    with open(f'{COS}/cosmic_swaps.json','w') as f: json.dump(doc,f,indent=1)

if __name__=='__main__':
    os.makedirs(PREV,exist_ok=True)
    pr=check(); print('PROBLEMS:',pr)
    write_json(); preview_all(); preview_tod(); preview_warmth()
