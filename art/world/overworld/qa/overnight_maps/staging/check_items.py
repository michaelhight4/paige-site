"""DRAFT QA (World Design, Oct 23 2026): independent item/pocket check on the staged GameMap JSONs.
R0 = no field skills, R1 = all skills (obstacle cells + water open). Items must be reachable in R1;
pocket items must sit in their obstacle's pocket_cells and be unreachable in R0. Read-only."""
import json,glob,os
from collections import deque
tot=pk=bad=0
for f in sorted(glob.glob('*/*.json')):
    m=os.path.basename(f)[:-5]
    if os.path.dirname(f)!=m: continue
    d=json.load(open(f)); C=d['layers']['collision']; W,H=d['width'],d['height']
    obs=d.get('field_obstacles',[]); ob={(o['x'],o['y']) for o in obs}
    blk={(n['x'],n['y']) for n in d.get('npcs_pending_text',[])+d.get('signs_pending_text',[])+d.get('npcs',[])+d.get('signs',[])}
    starts=[(w['x'],w['y']) for w in d['warps']]
    for e in d['exits']:
        for i in range(e['start'],e['end']+1):
            starts.append({'west':(0,i),'east':(W-1,i),'north':(i,0),'south':(i,H-1)}[e['edge']])
    def bfs(sk):
        S=set(starts); q=deque(starts)
        while q:
            x,y=q.popleft()
            for nx,ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                if 0<=nx<W and 0<=ny<H and (nx,ny) not in S and (nx,ny) not in blk:
                    c=C[ny][nx]
                    if c in (0,4) or (sk and ((nx,ny) in ob or c==3)): S.add((nx,ny)); q.append((nx,ny))
        return S
    R0,R1=bfs(False),bfs(True)
    for it in d['items']:
        tot+=1; p=(it['x'],it['y'])
        ok1 = p in R1 or any(n in R1 for n in ((p[0]+1,p[1]),(p[0]-1,p[1]),(p[0],p[1]+1),(p[0],p[1]-1)))
        okp=True
        if 'pocket' in it['id']:
            pk+=1; okp=any([p[0],p[1]] in o.get('pocket_cells',[]) for o in obs) and p not in R0
        if not(ok1 and okp): bad+=1; print('BAD',m,it['id'],p,ok1,okp)
print('items',tot,'pocket',pk,'bad',bad)
