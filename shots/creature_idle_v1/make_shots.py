# Offline render of the ?cidle=1 prototype math (mirrors src/overworld/creature_idle.js + renderer.actor). Not a browser capture.
from PIL import Image, ImageDraw
C='art/characters/pixel/creatures/'; OUT='shots/creature_idle_v1/'
SP=['cindrip','belfrydove','blubbet']; Z=2; BG=(104,150,82,255)
IDLE=[(0,1),(-1,.97),(-1,.95),(0,.97)]
def motion(ms,walk,t=0):
    if walk: return (2,1.03,.98) if int(t*4)%2 else (0,.93,1.05)
    l,sy=IDLE[(ms//450)%4]; return (-l,sy,1+(1-sy)*.5)
def tile(img,col,row,lift,sy,sx,dx=0):
    cv=Image.new('RGBA',(160*Z,96*Z),BG); d=ImageDraw.Draw(cv)
    for x in range(0,160*Z,64*Z): d.line([(x,0),(x,96*Z)],fill=(92,136,72,255))
    fr=img.crop((col*64,row*64,col*64+64,row*64+64))
    w,h=round(64*sx),round(64*sy); fr=fr.resize((w,h),Image.NEAREST).resize((w*Z,h*Z),Image.NEAREST)
    gx=48*Z+dx*Z; gy=88*Z
    d.ellipse([gx+20*Z,gy-4*Z,gx+44*Z,gy+1*Z],fill=(60,90,50,255))
    cv.alpha_composite(fr,(gx+(64*Z-w*Z)//2,gy-h*Z-round(lift)*Z)); return cv
def save(fr,ms,p): fr[0].save(p,save_all=True,append_images=fr[1:],duration=ms,loop=0,disposal=2)
sheet_cells=[]
for s in SP:
    ow=Image.open(f'{C}{s}/overworld/{s}_ow_sheet.png').convert('RGBA')
    # battle idle: existing GIF frames composited on a backdrop
    g=Image.open(f'{C}{s}/anim/{s}_front_idle_2x.gif'); bf=[];bd=[]
    for i in range(g.n_frames):
        g.seek(i); c=Image.new('RGBA',(256,256),(214,226,240,255)); c.alpha_composite(g.convert('RGBA')); bf.append(c); bd.append(g.info['duration'])
    save(bf,bd,f'{OUT}{s}_battle_idle.gif')
    idle=[tile(ow,0,0,*motion(i*450,False)) for i in range(4)]; save(idle,450,f'{OUT}{s}_ow_idle.gif')
    walk=[]
    for row,dx0,dx1 in [(2,-32,32),(1,32,-32),(0,0,0),(3,0,0)]:
        for k in range(8):
            t=k/8; m=motion(0,True,t); col=[1,2,3,4][int(t*4)]
            walk.append(tile(ow,col,row,*m,dx=round(dx0+(dx1-dx0)*t)))
    save(walk,67,f'{OUT}{s}_ow_walk.gif')
    sheet_cells.append((bf[0],idle,walk))
# contact sheet: battle frame | 4 idle steps | 4 walk steps (right)
W=256+4*320+4*320; H=3*256; cs=Image.new('RGBA',(W,H),(40,40,48,255))
for r,(b,idle,walk) in enumerate(sheet_cells):
    cs.alpha_composite(b,(0,r*256))
    for i,f in enumerate(idle): cs.alpha_composite(f,(256+i*320,r*256+32))
    for i,f in enumerate(walk[0:8:2]): cs.alpha_composite(f,(256+1280+i*320,r*256+32))
cs.save(OUT+'contact_sheet.png'); print('ok')
