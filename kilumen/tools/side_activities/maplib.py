import json,os
ROOT=os.path.join(os.path.dirname(__file__),'..','..')
OW=os.path.join(ROOT,'art/world/overworld')
_ts=json.load(open(os.path.join(OW,'tileset.json')))
BYID={t['id']:t for t in _ts['tiles']}
for e in _ts.get('extra_tiles') or []:
    if isinstance(e,dict) and 'id' in e: BYID.setdefault(e['id'],e)
def load(n): return json.load(open(os.path.join(OW,'maps',n+'.json')))
def save(n,m):
    p=os.path.join(OW,'maps',n+'.json'); raw=open(p).read()
    if raw.startswith('{\n'):
        ind=len(raw[2:])-len(raw[2:].lstrip(' ')); txt=json.dumps(m,indent=ind,ensure_ascii=False)
    else: txt=json.dumps(m,separators=(',',':'),ensure_ascii=False)
    if json.dumps(json.loads(raw),ensure_ascii=True)==json.dumps(json.loads(raw),ensure_ascii=False) and '\\u' in raw: txt=json.dumps(m,indent=ind if raw.startswith('{\n') else None,separators=None if raw.startswith('{\n') else (',',':'))
    open(p,'w').write(txt+('\n' if raw.endswith('\n') else ''))
def at(m,x,y):
    out={}
    for k,L in m['layers'].items():
        v=L[y][x]
        if k in('collision','encounter'): out[k]=v
        elif v: out[k]=BYID.get(v,{}).get('name',v)
    return out

NAME2ID={}
for t in BYID.values(): NAME2ID.setdefault(t['name'],t['id'])
def protected_cells(m):
    P=set()
    for w in m.get('warps',[])+(m.get('locked_warps') or []):
        if 'x' in w: P.add((w['x'],w['y']))
    for k in ('npcs','interact_spots','signs','items','flag_swaps'):
        for c in m.get(k) or []:
            if isinstance(c.get('x'),int): P.add((c['x'],c['y']))
            if isinstance(c.get('stand'),list): P.add(tuple(c['stand']))
    for k in ('npcs','signs'):
        for c in (m.get('text_pending') or {}).get(k,[]) or []:
            if isinstance(c,dict) and isinstance(c.get('x'),int): P.add((c['x'],c['y']))
    H=len(m['layers']['collision']);W=len(m['layers']['collision'][0])
    for e in m.get('exits',[]):
        for i in range(e.get('start',0),e.get('end',-1)+1):
            P.add({'north':(i,0),'south':(i,H-1),'west':(0,i),'east':(W-1,i)}.get(e.get('edge'),(-1,-1)))
    fp=m.get('fly_point')
    if fp: P.add((fp['x'],fp['y']))
    return P
def inside(m,x,y):
    H=len(m['layers']['collision']);W=len(m['layers']['collision'][0])
    pad=m.get('padding') or {};dx,dy=pad.get('dx',0),pad.get('dy',0)
    ow,oh=pad.get('old_size') or (W-2*dx,H-2*dy)
    return dx+1<=x<dx+ow-1 and dy+1<=y<dy+oh-1 and 0<x<W-1 and 0<y<H-1
def plain(m,x,y,P,enc_ok=True):
    L=m['layers']
    if not(0<=y<len(L['collision']) and 0<=x<len(L['collision'][0])): return False
    if L['collision'][y][x]!=0 or (x,y) in P: return False
    if L.get('decoration') and L['decoration'][y][x]: return False
    if L.get('overlay') and L['overlay'][y][x]: return False
    if not enc_ok and L.get('encounter') and L['encounter'][y][x]: return False
    g=BYID.get(L['ground'][y][x],{}).get('name','')
    return bool(g) and not g.startswith('water')
def find_open(m,sx,sy,P,r=8,ring=1):
    best=None
    for y in range(sy-r,sy+r+1):
        for x in range(sx-r,sx+r+1):
            if not inside(m,x,y) or not plain(m,x,y,P,True): continue
            if not all(plain(m,x+a,y+b,P) for a in range(-ring,ring+1) for b in range(-ring,ring+1) if (a,b)!=(0,0)): continue
            if not plain(m,x,y+1,P,True): continue
            dd=(x-sx)**2+(y-sy)**2
            if best is None or dd<best[0]: best=(dd,x,y)
    return best and (best[1],best[2])
PASS={0,2,4,7,8,9,10,3,11}
def reach(m):
    col=m['layers']['collision'];H=len(col);W=len(col[0]);seeds=[(w['x'],w['y']) for w in m.get('warps',[])]
    for e in m.get('exits',[]):
        for i in range(e.get('start',0),e.get('end',-1)+1):
            seeds.append({'north':(i,0),'south':(i,H-1),'west':(0,i),'east':(W-1,i)}[e['edge']])
    if m.get('player_start'): seeds.append((m['player_start']['x'],m['player_start']['y']))
    seen=set();st=list(seeds)
    while st:
        x,y=st.pop()
        if (x,y) in seen or not(0<=x<W and 0<=y<H): continue
        seen.add((x,y))
        for nx,ny in((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if 0<=nx<W and 0<=ny<H and col[ny][nx] in PASS: st.append((nx,ny))
    return seen
def put_prop(m,x,y,tile):
    m['layers']['decoration'][y][x]=NAME2ID[tile]; m['layers']['collision'][y][x]=1
def spot_lines(pages,again=None,extra=None):
    b={'pages':pages}
    if again: b['lines']=[{'id':'first','flags':[],'when':{'once':True},'pages':pages},{'id':'default','flags':[],'pages':again}]
    else: b['lines']=[{'id':'default','flags':[],'pages':pages}]
    if extra: b.update(extra)
    return b
