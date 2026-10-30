import json,sys
from maplib import *
d=json.load(open('../../data/textbot_world_fill.json'))
TILE={'fin_camp_bench':'memorial_bench'}
lp='../../text/overworld_lines.json'; L=json.load(open(lp))
mapsd={}
out=[]
for s in d['section1_postgame_finale']['new_signs']:
  mn=s['map']; m=mapsd.setdefault(mn,load(mn)); P=protected_cells(m); sg=s['suggested']; x,y=sg['x'],sg['y']
  before=reach(m)
  bound={(c['x'],c['y']) for c in m.get('signs',[])+m.get('interact_spots',[])}
  dec=m['layers']['decoration'][y][x]; nm=BYID.get(dec,{}).get('name')
  st=(0,0)
  st=tuple(sg['stand'])
  if nm=='sign' and (x,y) not in bound and m['layers']['collision'][st[1]][st[0]] in PASS:
    how='reused existing sign tile'
  else:
    pos=find_open(m,x,y,P) or find_open(m,x,y,P,r=12) 
    if not pos: print('NO SPOT',s['id']); sys.exit(1)
    x,y=pos; put_prop(m,x,y,TILE.get(s['id'],'sign')); how=f"placed {TILE.get(s['id'],'sign')} (script pick {sg['x']},{sg['y']} was {nm or 'ground'})"
  after=reach(m); lost=before-after-{(x,y)}
  assert not lost,(s['id'],lost)
  m.setdefault('interact_spots',[]).append({'id':s['id'],'kind':'sign','x':x,'y':y,'stand':list(st) if how.startswith('reused') else [x,y+1],'face':sg['face'] if how.startswith('reused') else 'up','tile':BYID[m['layers']['decoration'][y][x]]['name'],'text':f"maps.{mn}.{s['id']}"})
  L['maps'].setdefault(mn,{})[s['id']]=spot_lines(s['pages'],extra={'kind':'sign','_src':'data/textbot_world_fill.json new_signs (Text Bot)'})
  out.append((mn,s['id'],x,y,how))
for mn,m in mapsd.items(): save(mn,m)
open(lp,'w').write(json.dumps(L,indent=1,ensure_ascii=False)+'\n')
for o in out: print(o)
