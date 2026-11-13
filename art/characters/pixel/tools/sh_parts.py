"""Shared outputs for the starters+humans slice -> pixel/_parts/ (preview, idle montage, manifest, README)."""
import sys, os, json, glob, time; sys.path.insert(0,os.path.dirname(__file__))
from sh_pxlib import *
from PIL import Image, ImageDraw
PIX='/workspace/kilumen/art/characters/pixel/'; OUT=PIX+'_parts/'; os.makedirs(OUT,exist_ok=True)
CRE=['tumbloam','burrowmane','bastonox','cindrip','emberlunx','forgeharrow','rillop','brookhorn','tidemarrow']
SZ={'bastonox':160,'forgeharrow':160,'tidemarrow':160}; OWS={'bastonox':96,'forgeharrow':96,'tidemarrow':96}
HUM=[('cal','cal'),('ron','ron'),('mira','mira'),('vane','vane'),('riverbank_stranger','stranger')]
BG=nearest((40,32,52)); PANEL=nearest((150,196,150)); SKY=nearest((170,205,230))
# ---------- contact sheet ----------
rowH=340; W=40+340*2+4*200+40
creH=len(CRE)*rowH
humH=len(HUM)*560
sheet=Image.new('RGBA',(max(W,40+300+4*200+3*400+40),40+creH+40+humH+40),BG+(255,))
for i,n in enumerate(CRE):
    y=40+i*rowH; s=SZ.get(n,128); o=OWS.get(n,64)
    pnl=Image.new('RGBA',(W-80,rowH-20),SKY+(255,))
    for j,v in enumerate(('front','back')):
        p=Image.open(PIX+f'creatures/{n}/battle/{n}_{v}_{s}_2x.png'); pnl.alpha_composite(p,(10+j*340,pnl.height-p.height-5))
    for j,d in enumerate(('down','left','right','up')):
        p=Image.open(PIX+f'creatures/{n}/overworld/{n}_ow/{n}_ow_{d}_stand_2x.png'); pnl.alpha_composite(p,(700+j*200,pnl.height-p.height-5))
    sheet.alpha_composite(pnl,(40,y))
for i,(f,n) in enumerate(HUM):
    y=40+creH+40+i*560; pnl=Image.new('RGBA',(sheet.width-80,540),PANEL+(255,))
    t=Image.open(PIX+f'humans/{f}/trainer/{n}_trainer_64x128_3x.png'); pnl.alpha_composite(t,(10,540-t.height-10))
    for j,d in enumerate(('down','left','right','up')):
        p=Image.open(PIX+f'humans/{f}/overworld/{n}_chibi/{n}_chibi_{d}_stand_3x.png'); pnl.alpha_composite(p,(220+j*200,540-p.height-10))
    x=1040
    for pf in sorted(glob.glob(PIX+f'humans/{f}/portraits/*.png')):
        p=Image.open(pf); pnl.alpha_composite(p,(x,14)); x+=p.width+8
    sheet.alpha_composite(pnl,(40,y))
sheet=sheet.crop((0,0,max(W,x+60),sheet.height))
sheet.convert('RGB').save(OUT+'starters_humans_preview.png')
# ---------- idle GIF montage (front+back idles, native 160 cells, shown 2x) ----------
cells=[]
for n in CRE:
    for v in ('front','back'):
        fr=[np.array(Image.open(PIX+f'creatures/{n}/anim/{n}_{v}_idle/{n}_{v}_idle_f{k}.png')) for k in range(4)]
        cells.append(fr)
C=160; cols=6; rows=3
mont=[]
for k in range(4):
    m=np.zeros((rows*C,cols*C,4),'uint8'); m[...]=SKY+(255,)
    for idx,fr in enumerate(cells):
        a=fr[k]; h,w=a.shape[:2]; r,c=divmod(idx,cols); y=r*C+(C-h); x=c*C+(C-w)//2
        reg=m[y:y+h,x:x+w]; msk=a[...,3]>0; reg[msk]=a[msk]
    mont.append(m)
gif(mont,OUT+'starters_idle_montage_2x.gif',[180,160,200,160],2)
Image.fromarray(mont[0]).save(OUT+'starters_idle_montage_f0.png')
# ---------- manifest ----------
def files_of(root):
    return sorted(p for p in glob.glob(root+'/**/*',recursive=True) if os.path.isfile(p) and '__pycache__' not in p and '/run_bike/' not in p)
def info(p):
    d={'path':os.path.relpath(p,PIX),'bytes':os.path.getsize(p)}
    if p.endswith(('.png','.gif','.jpg')):
        im=Image.open(p); d['size']=list(im.size)
        if p.endswith('.gif'): d['frames']=getattr(im,'n_frames',1)
    return d
man={'generated':time.strftime('%Y-%m-%d %H:%M %Z'),'scope':'9 starters + 5 humans (Phase 3 slice; wild creatures + effects handled by other workers)',
     'palette':'/workspace/kilumen/art/world/overworld/palette.png (official 64 colours; every sprite/frame pixel is on it)',
     'creatures':{},'humans':{},'parts':[],'tools':[],'raw':[]}
for n in CRE: man['creatures'][n]={'battle_size':SZ.get(n,128),'overworld_size':OWS.get(n,64),'files':[info(p) for p in files_of(PIX+'creatures/'+n)]}
for f,n in HUM: man['humans'][f]={'trainer':'64x128','chibi':'64x96','files':[info(p) for p in files_of(PIX+'humans/'+f)]}
man['tools']=[info(p) for p in files_of(PIX+'tools') if '/sh_' in p]
mine=['tumbloam','burrowmane','bastonox','emberlunx','forgeharrow','rillop','brookhorn','tidemarrow','mira','ron','vane','stranger']
man['raw']=[info(p) for p in files_of(PIX+'raw') if os.path.basename(p).split('_')[0] in mine]
# palette check
bad=0
for grp in ('creatures','humans'):
    for k,v in man[grp].items():
        for fi in v['files']:
            p=PIX+fi['path']
            if p.endswith('.png') and '/portraits/' not in p:
                a=np.array(Image.open(p).convert('RGBA')); px=a[a[...,3]>0][:,:3]
                if len(px):
                    u=np.unique(px,axis=0); s=set(map(tuple,PAL)); bad+=sum(tuple(c) not in s for c in u)
                if ((a[...,3]>0)&(a[...,3]<255)).any(): bad+=1
man['palette_check_offpalette_or_semialpha']=int(bad)
man['parts']=[info(p) for p in [OUT+'starters_humans_preview.png',OUT+'starters_idle_montage_2x.gif',OUT+'starters_idle_montage_f0.png']]
cnt=lambda g:sum(len(v['files']) for v in man[g].values())
man['counts']={'creature_files':cnt('creatures'),'human_files':cnt('humans'),'tools':len(man['tools']),'raw':len(man['raw']),'parts':len(man['parts'])+2}
json.dump(man,open(OUT+'starters_humans_manifest.json','w'),indent=1)
print(man['counts'],'offpalette/semialpha:',bad, sheet.size)
