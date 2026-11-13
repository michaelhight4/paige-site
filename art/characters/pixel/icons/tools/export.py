"""Write icon PNGs, sheets, warmth masks + data entries, and previews (DRAFT)."""
import json, os
from klib import *
from PIL import ImageDraw
ICON=P+'/icons'; WARM=P+'/warmth'; PREV=ICON+'/_preview'
G=json.load(open(A+'/world/overworld/time_of_day/grades.json'))['grades']
PH=['dawn','day','dusk','night']
WT=json.load(open(WARM+'/warmth_tints.json'))
FRAME_MS=[260,260]

def up(a,k): return np.repeat(np.repeat(a,k,0),k,1)
def save(a,p): Image.fromarray(a).save(p)
def mimg(m): return (m.astype(np.uint8)*255)

def runs(m):
    r=[]
    for y in range(m.shape[0]):
        xs=np.where(m[y])[0]
        if len(xs)==0: continue
        s=xs[0]; pv=xs[0]
        for x in xs[1:]:
            if x!=pv+1: r.append([int(y),int(s),int(pv)]); s=x
            pv=x
        r.append([int(y),int(s),int(pv)])
    return r

def warm(a,m,n,st):
    if st==0: return a.copy()
    mp={k.lstrip('#'):v.lstrip('#') for k,v in WT['creatures'][n]['stages'][str(st)].items()}
    o=a.copy(); h=hexmap(a)
    for y,x in zip(*np.where(m)): o[y,x,:3]=rgb(mp[h[y,x]])
    return o

def grade(a,ph):
    mp=G[ph]['sprite']['map']; o=a.copy(); h=hexmap(a)
    for y,x in zip(*np.where(a[...,3]>0)): o[y,x,:3]=rgb(mp[h[y,x]])
    return o

def validate(n,fr,m):
    assert fr.shape==(32,32,4)
    assert set(np.unique(fr[...,3]))<= {0,255}, n
    h=hexmap(fr); cols=set(h[fr[...,3]>0].ravel())
    assert cols<=PALSET, (n,cols-PALSET)
    assert all(h[y,x] in VIOLETS for y,x in zip(*np.where(m))), n
    assert not (m&(fr[...,3]==0)).any()
    if m.sum()<3: print('WARN crystal small',n,m.sum())

def export_all(res,CFG):
    os.makedirs(PREV,exist_ok=True)
    sheet_doc={'status':'DRAFT: not approved by Gary, not wired in','frame_size':[32,32],'frame_ms':FRAME_MS,
               'layout':'row = creature (order below), col 0 = f0 (rest), col 1 = f1 (bob down)','creatures':[]}
    master=np.zeros((32*len(NAMES),64,4),np.uint8)
    for i,n in enumerate(NAMES):
        fr,ms=res[n]['frames'],res[n]['masks']
        md=f'{WARM}/masks/{n}/icons'; os.makedirs(md,exist_ok=True)
        idx_path=f'{WARM}/masks/{n}/crystal_index.json'; idx=json.load(open(idx_path))
        # drop stale icon entries, then re-add (idempotent)
        idx['sprites']={k:v for k,v in idx['sprites'].items() if not k.startswith('icons/')}
        idx['sheets']={k:v for k,v in idx['sheets'].items() if not k.startswith('icons/')}
        sh=np.concatenate(fr,1); shm=np.concatenate(ms,1)
        for f,(a,m) in enumerate(zip(fr,ms)):
            validate(n,a,m)
            base=f'{n}_icon_f{f}'
            save(a,f'{ICON}/{base}.png'); save(mimg(m),f'{md}/{base}.png')
            for k in (2,3):
                save(up(a,k),f'{ICON}/{base}_{k}x.png'); save(mimg(up(m,k)),f'{md}/{base}_{k}x.png')
            hh=hexmap(a)
            idx['sprites'][f'icons/{base}.png']={'size':[32,32],'crystal_px':int(m.sum()),
                'colours_present':sorted({'#'+hh[y,x] for y,x in zip(*np.where(m))},key=lambda c:VIOLETS.index(c[1:])),
                'rows':runs(m),'sprite_path':f'art/characters/pixel/icons/{base}.png'}
        save(sh,f'{ICON}/{n}_icon_sheet.png'); save(mimg(shm),f'{md}/{n}_icon_sheet.png')
        for k in (2,3):
            save(up(sh,k),f'{ICON}/{n}_icon_sheet_{k}x.png'); save(mimg(up(shm,k)),f'{md}/{n}_icon_sheet_{k}x.png')
        idx['sheets'][f'icons/{n}_icon_sheet.png']=[{'frame':f'icons/{n}_icon_f{f}.png','x':32*f,'y':0,'w':32,'h':32} for f in range(2)]
        with open(idx_path,'w') as fp: json.dump(idx,fp,separators=(',',':'))
        c=WT['creatures'][n]
        c['icon_masks']={'note':'Party icons live outside the creature folder at art/characters/pixel/icons/. '
            'Mask for art/characters/pixel/icons/<file> is masks/<creature>/icons/<file> (same file name; _2x/_3x and the per-creature sheet included). DRAFT, not wired in.',
            'sprites':[f'icons/{n}_icon_f{f}{s}.png' for f in range(2) for s in ('','_2x','_3x')]+[f'icons/{n}_icon_sheet{s}.png' for s in ('','_2x','_3x')]}
        master[32*i:32*i+32]=sh
        sheet_doc['creatures'].append({'name':n,'row':i,'f0':[0,32*i,32,32],'f1':[32,32*i,32,32],
            'source':os.path.relpath(res[n]['path'],A+'/..'),'bob':CFG[n]['kind'],
            'crystal_px':[int(m.sum()) for m in ms]})
    with open(WARM+'/warmth_tints.json','w') as fp: json.dump(WT,fp,indent=1)
    save(master,f'{ICON}/icons_sheet.png')
    with open(f'{ICON}/icons_sheet.json','w') as fp: json.dump(sheet_doc,fp,indent=1)
    previews(res)

UI=(94,88,102); UI2=(130,122,132)   # 5e5866 slot, 827a84 rim (palette mid-greys, like a party slot)
def previews(res):
    # icons_preview_3x.png: party-menu style slots, f0 and f1 side by side, at 3x
    z=3; cw=32*2*z+24; ch=32*z+28; cols=4
    S=Image.new('RGBA',(cols*cw+8,4*ch+8),(30,24,40,255)); d=ImageDraw.Draw(S)
    for i,n in enumerate(NAMES):
        x=8+(i%cols)*cw; y=8+(i//cols)*ch
        d.rectangle([x,y,x+cw-10,y+ch-10],fill=UI,outline=UI2)
        for f in range(2):
            S.alpha_composite(Image.fromarray(up(res[n]['frames'][f],z)),(x+4+f*(32*z+6),y+4))
        d.text((x+4,y+32*z+5),n,fill=(236,222,196))
    S.save(f'{ICON}/icons_preview_3x.png')
    # GIF: all 16 bobbing at 3x; lead slot (top-left) shows the "lead bobs faster" timing idea
    frames=[]
    for t in range(8):
        S=Image.new('RGBA',(cols*(32*z+8)+8,4*(32*z+8)+8),UI+(255,))
        for i,n in enumerate(NAMES):
            f=(t//2)%2
            S.alpha_composite(Image.fromarray(up(res[n]['frames'][f],z)),(8+(i%cols)*(32*z+8),8+(i//cols)*(32*z+8)))
        frames.append(S.convert('RGB').convert('P',palette=Image.ADAPTIVE,colors=255))
    frames[0].save(f'{ICON}/icons_bob_3x.gif',save_all=True,append_images=frames[1:],duration=FRAME_MS[0]//2*2//2,loop=0,disposal=1)
    # time-of-day x warmth check: rows=creature, cols = phase (4) x warmth stage (0,3), f0 at 2x over terrain
    ter=np.array(Image.open(A+'/world/overworld/tiles_1x/terrain.png').convert('RGBA'))[:32,:32]
    z=2; tw=32*z+4
    S=Image.new('RGBA',(90+8*tw,16+len(NAMES)*tw),(20,20,20,255)); d=ImageDraw.Draw(S)
    for j,ph in enumerate(PH):
        for k,st in enumerate((0,3)): d.text((90+(2*j+k)*tw,2),f'{ph} w{st}',fill='white')
    for i,n in enumerate(NAMES):
        d.text((2,16+i*tw+28),n,fill='white')
        a,m=res[n]['frames'][0],res[n]['masks'][0]
        for j,ph in enumerate(PH):
            bg=grade_terrain(ter,ph)
            for k,st in enumerate((0,3)):
                im=Image.fromarray(bg); im.alpha_composite(Image.fromarray(grade(warm(a,m,n,st),ph)))
                S.alpha_composite(Image.fromarray(up(np.array(im),z)),(90+(2*j+k)*tw,16+i*tw))
    S.save(f'{PREV}/icons_tod_warmth_check_2x.png')
    # warmth stages 0-3 on menu bg, 3x
    z=3
    S=Image.new('RGBA',(4*(32*z+6)*4+8,4*(32*z+6)+8),UI+(255,))
    for i,n in enumerate(NAMES):
        for st in range(4):
            a=warm(res[n]['frames'][0],res[n]['masks'][0],n,st)
            S.alpha_composite(Image.fromarray(up(a,z)),(4+((i%4)*4+st)*(32*z+6),4+(i//4)*(32*z+6)))
    S.save(f'{PREV}/icons_warmth_stages_3x.png')

def grade_terrain(t,ph):
    mp=G[ph]['map']; o=t.copy(); h=hexmap(t)
    for y,x in zip(*np.where(t[...,3]>0)): o[y,x,:3]=rgb(mp[h[y,x]])
    return o
