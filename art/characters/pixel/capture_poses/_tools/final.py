import json, os, sys, numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import build, CFG, PX, OUT
from caplib import snap_check
INK='1a1226'; DOT='d6acff'
def h2(c): return tuple(int(c[i:i+2],16) for i in (0,2,4))
os.makedirs(OUT+'player',exist_ok=True); os.makedirs(OUT+'trainers/frames',exist_ok=True); os.makedirs(OUT+'_preview',exist_ok=True)
players=['cal','mira']; trainers=sorted(k for k in CFG if k.startswith('tr_'))
hp={}; res={}; bad=[]
for sid in players+trainers:
    r=build(sid); res[sid]=r
    h,w=r['a'].shape[:2]; n=len(r['frames'])
    strip=np.concatenate(r['frames'],1)
    for i,f in enumerate(r['frames']):
        pc=snap_check(f)
        if pc!=(0,0): bad.append((sid,r['names'][i],pc))
        # feet anchor unchanged: bottom rows identical to source
        assert (f[-20:]==r['a'][-20:]).all() or sid in('tr_hiker_f',), sid
    if sid in players:
        key=f'{sid}_back_capture'; Image.fromarray(strip).save(OUT+f'player/{key}.png')
        for nm,f in zip(r['names'],r['frames']): Image.fromarray(f).save(OUT+f'player/{key}_{nm}.png')
    else:
        key=f'{sid}_capture'; Image.fromarray(strip).save(OUT+f'trainers/{key}.png')
        for nm,f in zip(r['names'],r['frames']): Image.fromarray(f).save(OUT+f'trainers/frames/{key}_{nm}.png')
    hp[key]=dict(frames=r['names'],frame_w=w,frame_h=h,hold_px=[list(map(int,p)) for p in r['hold']])
json.dump(hp,open(OUT+'hold_points.json','w'),indent=1)
print('palette problems',bad)

# ---- 3x preview with placeholder crystal dot (preview only) ----
S=3; LBL=170
def dot(img,x,y):
    d=ImageDraw.Draw(img)
    d.rectangle([x-2,y-2,x+2,y+2],fill=h2(INK)+(255,)); d.rectangle([x-1,y-1,x+1,y+1],fill=h2(DOT)+(255,)); img.putpixel((x,y),(255,255,255,255) if False else h2('f8eabe')+(255,))
rows=[]
for sid in players+trainers:
    r=res[sid]; key=[k for k in hp if k.startswith(sid+'_')][0]
    h,w=r['a'].shape[:2]
    cells=[('source',Image.fromarray(r['a']),None)]+[(nm,Image.fromarray(f),p) for nm,f,p in zip(r['names'],r['frames'],r['hold'])]
    row=Image.new('RGBA',(LBL+len(cells)*(w*S+6),h*S+16),(112,140,112,255)); d=ImageDraw.Draw(row)
    d.text((4,4),key,fill='black'); d.text((4,18),'hold_px:',fill='black')
    for i,(nm,_,p) in enumerate(cells[1:]): d.text((4,32+14*i),f'{nm} {p}',fill='black')
    for i,(nm,im,p) in enumerate(cells):
        im=im.copy()
        if p is not None: dot(im,*p)
        bg=Image.new('RGBA',im.size,(150,176,150,255)); bg.alpha_composite(im)
        x=LBL+i*(w*S+6); row.paste(bg.resize((w*S,h*S),Image.NEAREST),(x,14)); d.text((x+2,2),nm,fill='black')
    rows.append(row)
W=max(r.width for r in rows); H=sum(r.height+4 for r in rows)+24
P=Image.new('RGBA',(W,H),(60,60,60,255)); ImageDraw.Draw(P).text((6,6),'Kilumen capture poses - DRAFT, awaiting Gary. Crystal dot = PREVIEW ONLY placeholder at hold_px (d6acff + INK 1a1226 outline). 3x nearest-neighbour.',fill='white')
y=24
for r in rows: P.paste(r,(0,y)); y+=r.height+4
P.save(OUT+'_preview/capture_poses_3x.png'); print('preview',P.size)

# ---- 4-phase time-of-day check (sprite grade), reusing /workspace/tod/check_sprite.py functions ----
src=open('/workspace/tod/check_sprite.py').read(); src=src[:src.index("os.makedirs(P+'/_preview'")]
ns={}; exec(src,ns)
trows=[]
for sid in players+trainers:
    r=res[sid]; parts=[[ns['cell'](f,sid,ph) for f in r['frames']] for ph in ns['PH']]
    trows.append((sid,parts))
# sheet() needs equal widths per row: pad 2-frame rows to 4 frame slots
ns['sheet'](trows,OUT+'_preview/capture_poses_tod_4phase.png')
print('alphas',sorted(ns['alphas']),'UNMAPPED',{k:sorted(v) for k,v in ns['unm'].items()})
