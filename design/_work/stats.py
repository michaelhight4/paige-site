import json,heapq
B='/workspace/kilumen/art/world/overworld/maps/'
WALK={0,4,6,7,9}
def load(n):
    d=json.load(open(B+n+'.json')); return d
def exits_cells(d):
    W,H=d['width'],d['height'];out={}
    for e in d['exits']:
        cs=[]
        for k in range(e['start'],e['end']+1):
            cs.append({'north':(k,0),'south':(k,H-1),'west':(0,k),'east':(W-1,k)}[e['edge']])
        out[e['edge']+':'+e['to']]=cs
    return out
def nbrs(d,x,y,col,blocked):
    W,H=d['width'],d['height']
    for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
        nx,ny=x+dx,y+dy
        if not(0<=nx<W and 0<=ny<H) or (nx,ny) in blocked: continue
        c=col[ny][nx]
        if c==2:
            if dy==1 and ny+1<H and col[ny+1][nx] in WALK: yield nx,ny+1,2
            continue
        if c in WALK: yield nx,ny,1
def path(d,src,dst,grasscost):
    col=d['layers']['collision'];enc=d['layers']['encounter']
    blocked={(n["x"],n["y"]) for n in d["npcs"] if "trainer" in n["id"] or "villager" in n["id"] or "kid" in n["id"] or "fisher" in n["id"]}
    dist={};pq=[]
    for s in src: dist[s]=(0,0,0);heapq.heappush(pq,(0,0,0,s))
    best=None
    while pq:
        c,steps,g,(x,y)=heapq.heappop(pq)
        if (x,y) in dst: return steps,g
        if dist.get((x,y),(1e9,))[0]<c: continue
        for nx,ny,st in nbrs(d,x,y,col,blocked):
            gg=1 if enc[ny][nx] else 0
            nc=c+st+grasscost*gg
            if nc<dist.get((nx,ny),(1e9,))[0]:
                dist[(nx,ny)]=(nc,);heapq.heappush(pq,(nc,steps+st,g+gg,(nx,ny)))
    return None
for n in ['route1','thornwood','brookhollow']:
    d=load(n);col=d['layers']['collision'];enc=d['layers']['encounter'];W,H=d['width'],d['height']
    walk=sum(1 for r in col for c in r if c in WALK); bike=sum(1 for r in col for c in r if c==8)
    g=sum(1 for r in enc for c in r if c); 
    print(f'== {n} {W}x{H}={W*H}; walkable {walk} ({walk/W/H:.0%}), bike-only {bike}, encounter {g} = {g/W/H:.1%} of area, {g/walk:.1%} of walkable')
    ex=exits_cells(d); ks=list(ex)
    for i in range(len(ks)):
        for j in range(len(ks)):
            if i==j: continue
            a=path(d,ex[ks[i]],set(ex[ks[j]]),0); b=path(d,ex[ks[i]],set(ex[ks[j]]),1000)
            print(f'  {ks[i]} -> {ks[j]}: shortest {a}, min-grass {b}  (steps,grass)')
    for w in d['warps']: 
        pass
    print('  warps',[(w.get('x'),w.get('y'),w.get('to')) for w in d['warps']])
