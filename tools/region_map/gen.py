# Kilumen region overview generator (Oct 25, 2026). Usage: python3 gen.py <game_root> <old_painted_map> <out.png>
# Rebuilds the painted Region map from the painted map's own textures/icons/name plates, placed at pos.json
# (laid out so every link points the way its exit side faces) with dotted paths along the real map links (connections.gen.js).
import os; HERE=os.path.dirname(os.path.abspath(__file__))
import json, numpy as np, cv2, math, random, sys
from PIL import Image
ROOT=sys.argv[1]; OLD=sys.argv[2]; OUT=sys.argv[3]
random.seed(7); np.random.seed(7)
src=np.array(Image.open(OLD).convert('RGB')).astype(np.float32); H,W=src.shape[:2]
L=json.load(open(ROOT+'/art/world/overworld/world_layout.json')); Z={z['id']:z for z in L['zones']}
_O=json.load(open(HERE+'/old_pos.json'))  # where things sit on the OLD painting (cut-out sources)
OLDP={k:(_O[k]['x']*W,_O[k]['y']*H) for k in Z}
P=json.load(open(HERE+'/pos.json')); px=lambda k:(P[k][0]*W,P[k][1]*H)
import re
E=json.loads(re.search(r'CONN_EDGES = (\[.*?\]);',open(ROOT+'/src/ui/connections.gen.js').read()).group(1))
def noise(sc,seed):
  r=np.random.RandomState(seed); n=np.zeros((H,W),np.float32)
  for o in range(4):
    s=sc/(2**o); g=r.rand(int(H/s)+3,int(W/s)+3).astype(np.float32)
    n+=cv2.resize(g,(int(W/s+3)*1,int(H/s+3)*1),interpolation=cv2.INTER_CUBIC)[:H,:W] if False else cv2.resize(g,(W+int(3*s),H+int(3*s)),interpolation=cv2.INTER_CUBIC)[:H,:W]*(0.5**o)
  return n/1.875
_u=src.astype(np.uint8); _v=cv2.cvtColor(_u,cv2.COLOR_RGB2HSV)[...,2]; _m=cv2.dilate(((_v<62)).astype(np.uint8)*255,np.ones((5,5),np.uint8))
CLEAN=cv2.inpaint(_u,_m,6,cv2.INPAINT_TELEA).astype(np.float32)
def synth(box,seed,ps=200,step=120,clean=True):
  S0=CLEAN if clean else src; r=random.Random(seed); x0,y0,x1,y1=box; out=np.zeros((H,W,3),np.float32); wsum=np.zeros((H,W,1),np.float32)
  yy,xx=np.mgrid[0:ps,0:ps]; m=(np.clip(1-np.abs(xx-ps/2)/(ps/2),0,1)*np.clip(1-np.abs(yy-ps/2)/(ps/2),0,1))[...,None]**1.5+1e-4
  for y in range(-ps//2,H,step):
    for x in range(-ps//2,W,step):
      sx=r.randint(x0,max(x0,x1-ps)); sy=r.randint(y0,max(y0,y1-ps)); p=S0[sy:sy+ps,sx:sx+ps]
      if r.random()<.5: p=p[:,::-1]
      if r.random()<.5: p=p[::-1]
      p=p*(0.94+0.12*r.random())
      ax,ay=max(0,x),max(0,y); bx,by=min(W,x+ps),min(H,y+ps)
      if bx<=ax or by<=ay: continue
      out[ay:by,ax:bx]+=p[ay-y:by-y,ax-x:bx-x]*m[ay-y:by-y,ax-x:bx-x]; wsum[ay:by,ax:bx]+=m[ay-y:by-y,ax-x:bx-x]
  return out/wsum
T={'sea':synth((30,400,190,700),1,150,90),'grass':synth((1650,860,1950,1010),2,150,80),'grass2':synth((1700,1050,1900,1200),3,140,90),
 'forest':synth((700,340,1100,490),4,clean=False),'meadow':synth((1400,170,1750,300),5),'swamp':synth((1920,450,2180,700),6),
 'snow':synth((380,60,640,200),7,clean=False),'rock':synth((900,40,1280,180),8,140,90,clean=False)}
yy,xx=np.mgrid[0:H,0:W].astype(np.float32); n1=noise(160,11); n2=noise(160,12)
wx=xx+(n1-.5)*260; wy=yy+(n2-.5)*260
def blob(cx,cy,r): return np.exp(-(((wx-cx*W)**2+(wy-cy*H)**2)/(r*W)**2))
S={'grass':[np.full((H,W),.35,np.float32)],'grass2':[],'forest':[],'meadow':[],'swamp':[],'snow':[],'rock':[]}
def add(b,x,y,r,s=1): S[b].append(blob(x,y,r)*s)
tw=P['thornwood']; add('forest',tw[0],tw[1]-.05,.12,1.3)
for x,y in ((.18,.63),(.62,.585),(.74,.83),(.22,.36),(.55,.15),(.95,.80),(.36,.75)): add('forest',x,y,.05,.9)
for x,y in ((.28,.53),(.30,.77),(.66,.66),(.47,.83),(.83,.75)): add('grass2',x,y,.07,1)
add('meadow',*P['sunmeadow_fields'],.11,1.3); add('swamp',P['mirefen'][0]-.05,P['mirefen'][1]+.02,.14,1.6); add('swamp',*P['route_saltmere_mirefen'],.06)
fs=P['frostspire']; add('snow',fs[0],fs[1]-.03,.13,1.4); add('snow',P['frostspire_pass'][0],P['frostspire_pass'][1]-.02,.06,1.1)
add('rock',P['greystone_entrance'][0],P['greystone_entrance'][1]-.04,.07,1.2); add('rock',P['greystone_b1'][0],P['greystone_b1'][1]-.03,.05,1.1)
keys=[k for k in S if S[k]]; F=np.stack([np.max(np.stack(S[k]),0) for k in keys]); F=np.exp(F*14); F/=F.sum(0)
img=sum(F[i][...,None]*T[k] for i,k in enumerate(keys))
# land mask: superellipse + noise, port bay near lanternport, sea south of tidewater/cindervale
nx=(xx/W-.5)/.47; ny=(yy/H-.47)/.47; d=(np.abs(nx)**4+np.abs(ny)**4)**.25 + (noise(220,21)-.5)*.35
lp=P['lanternport']; d+=0.30*np.exp(-(((xx/W-lp[0]+.07)/.06)**2+((yy/H-lp[1])/.08)**2))
land=np.clip((1.0-d)*14,0,1)
for k in ('lanternport','tidewater_coast','cindervale'):  # keep coast towns on land
  x,y=px(k); land=np.maximum(land,np.clip(1.6-np.hypot((xx-x)/150,(yy-y)/110),0,1))
land[:int(.12*H)]=np.maximum(land[:int(.12*H)],np.clip((.12*H-yy[:int(.12*H)])/40,0,1)*(np.abs(xx[:int(.12*H)]/W-.40)<.28))
sand=np.array([214,196,150],np.float32); edge=np.clip(1-np.abs(land-.5)*2.2,0,1)[...,None]
img=img*land[...,None]+T['sea']*(1-land[...,None]); img=img*(1-edge*.8)+sand*edge*.8
# river
pts=np.array([(.565,.0),(.56,.14),(.545,.27),(.555,.37),(.525,.52),(.505,.62),(.50,.76),(.51,.98)])*[W,H]
t=np.linspace(0,1,400); from scipy.interpolate import CubicSpline
cs=CubicSpline(np.linspace(0,1,len(pts)),pts); rv=cs(t)
rm=np.zeros((H,W),np.uint8); cv2.polylines(rm,[rv.astype(np.int32)],False,255,22,cv2.LINE_AA)
rm=cv2.GaussianBlur(rm,(0,0),3).astype(np.float32)[...,None]/255
img=img*(1-rm)+(T['sea']*1.05)*rm
# frame from original
de=np.minimum(np.minimum(xx,W-1-xx),np.minimum(yy,H-1-yy))+(n1-.5)*50
fa=np.clip((80-de)/40,0,1)[...,None]; img=img*(1-fa)+src*fa
def paste(box,cx,cy,feather=.85,ax=.5,ay=.5):
  global img
  x0,y0,x1,y1=[int(v) for v in box]; p=src[y0:y1,x0:x1]; h,w=p.shape[:2]
  Y,X=np.mgrid[0:h,0:w]; r=np.hypot((X-w/2)/(w/2),(Y-h/2)/(h/2)); m=np.clip((1-r)/(1-feather),0,1)[...,None]
  ox,oy=int(cx-w*ax),int(cy-h*ay); a=max(0,ox),max(0,oy); b=min(W,ox+w),min(H,oy+h)
  img[a[1]:b[1],a[0]:b[0]]=img[a[1]:b[1],a[0]:b[0]]*(1-m[a[1]-oy:b[1]-oy,a[0]-ox:b[0]-ox])+p[a[1]-oy:b[1]-oy,a[0]-ox:b[0]-ox]*m[a[1]-oy:b[1]-oy,a[0]-ox:b[0]-ox]
# big features: mountains, cave
paste((250,30,800,260),*px('frostspire'),.55,.5,.75)
paste((380,60,640,220),*px('frostspire_pass'),.5,.5,.8)
paste((920,30,1300,230),*px('greystone_entrance'),.5,.5,.8)
paste((960,40,1160,200),*px('greystone_b1'),.5,.5,.85)
paste((1960,20,2290,330),.925*W,.10*H,.6)  # compass
# paths
def dash(a,b,sa,sb):
  A=np.array(px(a));B=np.array(px(b));D=np.linalg.norm(B-A);V={'north':(0,-1),'south':(0,1),'east':(1,0),'west':(-1,0)}
  k=.55 if D>700 else .4; ta=np.array(V.get(sa,(B-A)/D))*D*k; tb=np.array(V.get(sb,(A-B)/D))*D*k
  t=np.linspace(0,1,int(D/4))[:,None]; c=(1-t)**3*A+3*(1-t)**2*t*(A+ta)+3*(1-t)*t**2*(B+tb)+t**3*B
  seg=np.r_[0,np.cumsum(np.linalg.norm(np.diff(c,axis=0),axis=1))]; out=[]
  for s in np.arange(10,seg[-1]-10,26):
    i=np.searchsorted(seg,s); i=min(i,len(c)-2); dv=c[i+1]-c[i]; out.append((c[i],math.degrees(math.atan2(dv[1],dv[0]))))
  return out
pm=np.zeros((H,W),np.uint8)
for e in E:
  for c,ang in dash(e['a'],e['b'],e['sa'],e['sb']): cv2.ellipse(pm,(int(c[0]),int(c[1])),(11,5),ang,0,360,255,-1,cv2.LINE_AA)
pa=(pm.astype(np.float32)/255*.97)[...,None]; img=img*(1-pa)+np.array([48,36,26],np.float32)*pa
# town icons + plates
ICON={'brookhollow':(150,160),'fernwick':(130,140),'saltmere':(120,130),'cindervale':(170,170),'revival_heights':(200,210),'lanternport':(230,240),'aurelith':(250,250)}
for k,(hw,hh) in ICON.items():
  ox,oy=OLDP[k]; paste((ox-hw,oy-hh,ox+hw,oy+12),*px(k),.55,.5,(hh)/(hh+12))
import os; HERE=os.path.dirname(os.path.abspath(__file__)); exec(open(HERE+'/plates.py').read())
def plate(k):
  ox,oy=[int(v) for v in OLDP[k]]; x,y,w,h=PB[k]; return (ox-220+x-6,oy-10+y-6,ox-220+x+w+6,oy-10+y+h+6),0
PL={k:plate(k) for k in Z}
LAB={}
POSK={'greystone_caverns':'greystone_entrance'}
for k,(b,_) in PL.items():
  nk=POSK.get(k,k)
  if nk not in P: continue
  x0,y0,x1,y1=[int(v) for v in b]; p=src[y0:y1,x0:x1]; w,h=x1-x0,y1-y0; cx,cy=px(nk); ox,oy=int(cx-w/2),int(cy+4)
  Y,X=np.mgrid[0:h,0:w]; m=np.clip(np.minimum(np.minimum(X,w-1-X),np.minimum(Y,h-1-Y))/4.0,0,1)[...,None]
  img[oy:oy+h,ox:ox+w]=img[oy:oy+h,ox:ox+w]*(1-m)+p*m
  LAB[k]={'x0':round((ox+6)/W,3),'y0':round((oy+6)/H,3),'x1':round((ox+w-6)/W,3),'y1':round((oy+h-6)/H,3)}
Image.fromarray(np.clip(img,0,255).astype(np.uint8)).save(OUT)
json.dump(LAB,open(OUT+'.labels.json','w'));print('ok')
