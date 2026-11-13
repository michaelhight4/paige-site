#!/usr/bin/env python3
"""Check every warp/exit landing: in bounds, painted ground, walkable. Usage: landing_audit.py MAPDIR_or_URL [...]"""
import json,sys,os,urllib.request
WALK={0,3,4,5,6,7,8}  # refined below from map.js if possible
def load(src):
    if src.startswith('http'):
        idx=json.load(urllib.request.urlopen(src.rstrip('/')+'/index.json')) if False else None
    ms={}
    for f in os.listdir(src):
        if f.endswith('.json'):
            try:d=json.load(open(os.path.join(src,f)))
            except Exception:continue
            if isinstance(d,dict) and 'width' in d and 'layers' in d: ms[d.get('name',f[:-5])]=d
    return ms
def chk(ms,walk):
    bad=[]
    def land(src,what,to,x,y):
        m=ms.get(to)
        if not m: bad.append((src,what,to,x,y,'missing map'));return
        W,H=m['width'],m['height']
        if not(0<=x<W and 0<=y<H): bad.append((src,what,to,x,y,f'out of bounds {W}x{H}'));return
        L=m['layers'];g=L.get('ground')
        if g and g[y][x]==0: bad.append((src,what,to,x,y,'unpainted ground'))
        c=L.get('collision')
        if c and c[y][x] not in walk: bad.append((src,what,to,x,y,f'collision {c[y][x]}'))
    for n,m in ms.items():
        for i,w in enumerate(m.get('warps',[])): land(n,f'warp#{i}@{w["x"]},{w["y"]}',w['to'],w['tx'],w['ty'])
        for i,e in enumerate(m.get('exits',[])):
            to=e.get('to');t=ms.get(to)
            if not t: bad.append((n,f'exit#{i}',to,0,0,'missing map'));continue
            off=e.get('offset',0);ed=e.get('edge');col=m['layers']['collision']
            for k in range(e.get('start',0),e.get('end',0)+1):
                j=k+off
                if ed in('west','east'):
                    if not(0<=k<m['height']) or col[k][0 if ed=='west' else -1] not in walk: continue
                    land(n,f'exit#{i} {ed} row{k}',to,t['width']-1 if ed=='west' else 0,j)
                else:
                    if not(0<=k<m['width']) or col[0 if ed=='north' else -1][k] not in walk: continue
                    land(n,f'exit#{i} {ed} col{k}',to,j,t['height']-1 if ed=='north' else 0)
    return bad
if __name__=='__main__':
    walk=set(json.loads(os.environ.get('WALK','[0]')))
    tot=0
    for d in sys.argv[1:]:
        b=chk(load(d),walk);tot+=len(b);print('##',d,len(b))
        for r in b:print(' ',*r)
    sys.exit(1 if tot else 0)
