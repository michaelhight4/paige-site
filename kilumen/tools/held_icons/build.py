import re,json,os,sys
sys.path.insert(0,'.')
from gen import *; from designs import D,CHARM
src=open('/workspace/kilumen_held/kilumen/src/rtb/view.js').read()
m=re.search(r"EL_COLOR = \{(.*?)\};",src,re.S).group(1)
EL=dict(re.findall(r"(\w+): '#([0-9a-f]{6})'",m))
EL.update({'swamp':'6f8f3a','rain':'7fb0d8','legendary':'ffc640'})
CH={'sprig':'grass','shellbead':'bug','droplet':'water','tidebell':'sea','brookstone':'freshwater','plainthread':'normal','glint':'light','wisp':'spirit','hush':'ghost','gustfeather':'wind','quill':'bird','clodstone':'earth','ember':'fire','bogroot':'swamp','drizzle':'rain','runestitch':'mystic','dusk':'dark','slag':'magma','scaleshard':'dragos','horncap':'demon','brimtooth':'devil','halo':'angelic','crownstone':'god','mythmark':'legendary'}
def hx(h): return tuple(int(h[i:i+2],16) for i in (0,2,4))
def ramp(c):
    m=lambda c,f:tuple(max(0,min(255,int(v*f))) for v in c)
    l=lambda c,t:tuple(int(v+(255-v)*t) for v in c)
    return [m(c,.45),m(c,.75),c,l(c,.6)]
out=sys.argv[1]; os.makedirs(out,exist_ok=True); icons={}
for k,(rp,rows) in D.items(): icons[k]=render(rows,rp)
for k,el in CH.items():
    if el not in EL: print('noel',el); continue
    R['el']=ramp(hx(EL[el]))
    rows=[r.replace('B','i').replace('C','j').replace('D','k').replace('E','l') for r in CHARM[1]]
    icons[k+'_charm']=render(rows,CHARM[0]+['el'])
for k,im in icons.items():
    im.save(f'{out}/{k}.png'); im.resize((32,32),0).save(f'{out}/{k}_2x.png'); im.resize((48,48),0).save(f'{out}/{k}_3x.png')
print(len(icons))
