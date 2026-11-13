import sys, json, random; sys.path.insert(0,'tools')
from pxlib import place, up
from step3_battle_anim import attack_frames, canvas, bob, glow, gif, nat, F
import numpy as np
from PIL import Image, ImageDraw
WDIR='/workspace/kilumen/art/world/overworld/'
P=lambda r,g,b:(r,g,b,255)
INK=P(26,18,38); VIO=P(138,74,206); CREAM=P(252,246,232); SAND=P(232,206,146)
SKY=[P(198,236,250),P(122,194,232),P(70,146,206)]; GR=[P(166,212,96),P(120,186,72),P(82,152,58),P(54,118,52),P(36,82,46)]
FOR=[P(84,134,78),P(56,104,62),P(36,78,52)]
def over(dst,src,xy): dst.alpha_composite(src if isinstance(src,Image.Image) else Image.fromarray(src),xy)
# ---------- Cal at trainer/battle proportions ----------
cn=Image.open('base/cal_normal.png'); c,_=place(cn,64,128,pad_b=2); c.save('battle/cal_trainer_64x128.png'); up(c,2).save('battle/cal_trainer_64x128_2x.png'); up(c,3).save('battle/cal_trainer_64x128_3x.png')
# ---------- battle scene (native 320x240, shown at 2x) ----------
W,H=320,240
def battle_bg():
    im=Image.new('RGBA',(W,H),SKY[0]); d=ImageDraw.Draw(im)
    for y in range(H):
        if y<40: c=SKY[0]
        elif y<70: c=SKY[1] if (y>46 or (y%2==0)) else SKY[0]
        else: c=SKY[1]
        d.line([0,y,W,y],fill=c)
    # distant treeline (blocky bumps)
    rnd=random.Random(3)
    for x in range(0,W,6):
        h=rnd.randint(8,18); d.rectangle([x,96-h,x+7,104],fill=FOR[1]); d.rectangle([x+1,96-h,x+3,96-h+2],fill=FOR[0])
    d.rectangle([0,104,W,H],fill=GR[1])
    for y in range(104,H,1):
        if y%14==0: d.line([0,y,W,y],fill=GR[2])
    for x in range(0,W,2):
        if (x//2)%3==0: d.point((x,105),fill=GR[0])
    # platforms
    for (cx,cy,rx,ry) in ((234,164,66,15),(74,236,86,20)):
        d.ellipse([cx-rx,cy-ry,cx+rx,cy+ry],fill=INK); d.ellipse([cx-rx+1,cy-ry+1,cx+rx-1,cy+ry-1],fill=GR[3]); d.ellipse([cx-rx+4,cy-ry+2,cx+rx-4,cy+ry-4],fill=GR[2]); d.ellipse([cx-rx+12,cy-ry+3,cx+rx-20,cy+ry-8],fill=GR[1])
    # HP bars, no text
    for (x,y,frac) in ((14,20,0.82),(186,196,0.64)):
        d.rectangle([x,y,x+120,y+24],fill=INK); d.rectangle([x+1,y+1,x+119,y+23],fill=CREAM); d.rectangle([x+3,y+3,x+117,y+21],fill=SAND)
        d.rectangle([x+8,y+13,x+112,y+19],fill=INK); d.rectangle([x+9,y+14,x+9+int(102*frac),y+18],fill=GR[1]); d.line([x+9,y+14,x+9+int(102*frac),y+14],fill=GR[0])
        d.rectangle([x+8,y+5,x+50,y+9],fill=P(204,198,194))  # name placeholder bar (blank)
    return im
bg=battle_bg()
emb=Image.open('base/emberlunx.png'); ex,ey=234-emb.width//2,166-emb.height
cb=Image.open('base/cindrip_back.png'); cx0,cy0=12,H-cb.height
mouth=nat('cindrip_back',(860,330)); src=(cx0+mouth[0],cy0+mouth[1]); tgt=(ex+emb.width//2-4,ey+emb.height//2-6)
random.seed(7)
atk=attack_frames(cb,'back',W,H,cx0,cy0,src,tgt,(10,8,6),16)
base=canvas(cb,W,H,cx0,cy0); split=cy0+int(cb.height*0.72)
idle=[glow(bob(base,split,dy),g) for dy,g in ((0,0),(-1,1),(-2,2),(-1,1))]
def scene(layer,shake=0):
    im=bg.copy(); over(im,emb,(ex+shake,ey)); over(im,layer,(0,0)); return np.array(im)
frames=[];ms=[]
for _ in range(3): frames+= [scene(f) for f in idle]; ms+=[180,160,200,160]
for i,f in enumerate(atk): frames.append(scene(f,shake=(3 if i==5 else -2 if i==6 else 0))); ms.append([140,110,120,70,70,150,110,160][i])
frames+=[scene(f) for f in idle]; ms+=[180,160,200,160]
gif(frames,'battle_preview_2x.gif',ms,2)
Image.fromarray(frames[0]).save('battle_preview_native.png')
battle2x=up(Image.fromarray(frames[0]),2); battle2x.save('battle_preview_2x.png')
# ---------- grass patch with Cal + follower (native, 2x) ----------
ter=Image.open(WDIR+'tiles_1x/terrain.png').convert('RGBA'); deco=Image.open(WDIR+'tiles_1x/deco.png').convert('RGBA')
tile=lambda sh,c,r: sh.crop((c*64,r*64,c*64+64,r*64+64))
gw,gh=6,3; patch=Image.new('RGBA',(gw*64,gh*64)); rnd=random.Random(5)
for y in range(gh):
    for x in range(gw):
        patch.alpha_composite(tile(ter,rnd.choice([0,0,1,2]),0),(x*64,y*64))
        if y==2 or (x in (0,5) and y==1) or (x==4 and y==0): patch.alpha_composite(tile(deco,0,0),(x*64,y*64))
        if (x,y)==(0,0): patch.alpha_composite(tile(deco,4,0),(0,0))
cal_d=Image.open('overworld/cal_chibi/cal_chibi_down_stand.png'); cin_l=Image.open('overworld/cindrip_ow/cindrip_ow_left_stand.png')
patch.alpha_composite(cal_d,(2*64,(1+1)*64-96)); patch.alpha_composite(cin_l,(3*64,1*64))
patch.save('overworld_patch_native.png'); patch2=up(patch,2)
# ---------- compose pilot_preview ----------
master=Image.open('/workspace/kilumen/art/characters/masters/cindrip_front_512.png').convert('RGBA')
pix=up(Image.open('battle/cindrip_front_128.png'),4)
caln=up(Image.open('battle/cal_trainer_64x128.png'),3); calc=up(Image.open('overworld/cal_chibi/cal_chibi_down_stand.png'),3)
line=[Image.open(f'battle/{n}.png') for n in ('cindrip_front_128','emberlunx_128','forgeharrow_160')]
PW=1600; PH=40+480+40+512+40+384+40
pv=Image.new('RGBA',(PW,PH),P(30,24,40)); d=ImageDraw.Draw(pv)
def frame(x,y,w,h): d.rectangle([x-4,y-4,x+w+3,y+h+3],outline=VIO,width=2)
pv.alpha_composite(battle2x,(40,40)); frame(40,40,640,480)
# line strip at 2x on sky panel
lx=720; strip=Image.new('RGBA',(840,480),P(52,40,66)); sx=10
for s in line:
    s2=up(s,2); strip.alpha_composite(s2,(sx,470-s2.height)); sx+=s2.width-10
pv.alpha_composite(strip,(lx,40)); frame(lx,40,840,480)
y2=40+480+40
mp=Image.new('RGBA',(1100,512),CREAM); mp.alpha_composite(master,(30,0)); mp.alpha_composite(pix,(560,0)); pv.alpha_composite(mp,(40,y2)); frame(40,y2,1100,512)
cp=Image.new('RGBA',(420,512),P(198,236,250)); cp.alpha_composite(caln,(10,512-caln.height-20)); cp.alpha_composite(calc,(10+caln.width+10,512-calc.height-20)); pv.alpha_composite(cp,(1140,y2)); frame(1140,y2,420,512)
y3=y2+512+40; pv.alpha_composite(patch2,(40,y3)); frame(40,y3,768,384)
# cal walk strip (down) at 2x next to patch
ws=Image.new('RGBA',(712,384),P(52,40,66)); sh=Image.open('overworld/cal_chibi_sheet.png')
for i in range(5): ws.alpha_composite(up(sh.crop((i*64,0,i*64+64,96)),2),(8+i*140,8))
cs=Image.open('overworld/cindrip_ow_sheet.png')
for i in range(5): ws.alpha_composite(up(cs.crop((i*64,128,i*64+64,192)),2),(8+i*140,224))
pv.alpha_composite(ws,(848,y3)); frame(848,y3,712,384)
pv.convert('RGB').save('pilot_preview.png'); print('pilot',pv.size)
# ---------- dialogue preview 2560x1440 ----------
bh=Image.open(WDIR+'previews/brookhollow.png').convert('RGBA')
OX,OY=9*192,int(6.5*192); dp=bh.crop((OX,OY,OX+2560,OY+1440))
def at(tx,ty): return ((tx*192)-OX, (ty+1)*192-288-OY)
cal_r=up(Image.open('overworld/cal_chibi/cal_chibi_right_stand.png'),3); ron=up(Image.open('overworld/ron_chibi_down_stand.png'),3)
dp.alpha_composite(cal_r,at(16,10)); dp.alpha_composite(ron,at(17,10))
# pixel dialogue box, drawn at native (1/3) then x3
nw,nh=2560//3+1,1440//3+1; ui=Image.new('RGBA',(nw,nh),(0,0,0,0)); u=ImageDraw.Draw(ui)
bx0,by0,bx1,by1=16,nh-124,nw-17,nh-12
u.rectangle([bx0,by0,bx1,by1],fill=INK); u.rectangle([bx0+1,by0+1,bx1-1,by1-1],fill=VIO); u.rectangle([bx0+3,by0+3,bx1-3,by1-3],fill=INK); u.rectangle([bx0+4,by0+4,bx1-4,by1-4],fill=CREAM)
u.rectangle([bx0+7,by0+7,bx1-7,by1-7],outline=SAND)
# empty name tab
u.rectangle([bx0+10,by0-18,bx0+110,by0+1],fill=INK); u.rectangle([bx0+11,by0-17,bx0+109,by0],fill=VIO); u.rectangle([bx0+13,by0-15,bx0+107,by0],fill=P(96,48,150))
# advance arrow
ax,ay=bx1-22,by1-16; u.polygon([(ax,ay),(ax+8,ay),(ax+4,ay+5)],fill=VIO)
ui3=up(ui,3).crop((0,0,2560,1440))
por=Image.open('portraits/ron_neutral.png')
dp.alpha_composite(por,(2560-48-por.width-30,(by0*3)-por.height+6))
dp.alpha_composite(ui3,(0,0))
dp.convert('RGB').save('dialogue_preview.png'); print('dialogue',dp.size)
