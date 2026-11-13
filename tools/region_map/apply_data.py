# Writes the new region placement into world_layout.json (map_pos, map_label, link list) and connections.gen.js. Usage: apply_data.py <root> <labels.json>
import json,sys,re,os
R=sys.argv[1]; HERE=os.path.dirname(os.path.abspath(__file__))
P=json.load(open(HERE+'/pos.json')); LAB=json.load(open(sys.argv[2]))
f=R+'/art/world/overworld/world_layout.json'; raw=open(f).read(); d=json.loads(raw)
for z in d['zones']:
  k='greystone_entrance' if z['id']=='greystone_caverns' else z['id']
  if k in P: z['map_pos']={'x':round(P[k][0],3),'y':round(P[k][1],3)}
  if z['id'] in LAB: z['map_label']=LAB[z['id']]
for r in d['routes']:
  if r['id']=='brookhollow-tidewater': r.update(name='East Road, Coast Road',map='maps/route_east.json, maps/route_coast.json',via=['route_east','route_coast'])
if not any(r['id']=='lanternport-tidewater' for r in d['routes']):
  d['routes'].append({'id':'lanternport-tidewater','name':'','from_zone':'lanternport','to_zone':'tidewater_coast','status':'to_come','map':'direct edge exit'})
d['source']=d['source'].replace('../world_map.png (2304x1728)','../world_map.png (2304x1728, regenerated Oct 25 2026 by tools/region_map to match the real map links; old painting kept as world_map_prev)',1) if 'regenerated' not in d['source'] else d['source']
out=json.dumps(d,separators=(',',':'),ensure_ascii=False) if not raw.startswith('{\n') else json.dumps(d,indent=1,ensure_ascii=False)
open(f,'w').write(out+('\n' if raw.endswith('\n') else ''))
g=R+'/src/ui/connections.gen.js'
if os.path.exists(g):
  s=open(g).read(); m=re.search(r'CONN_NODES = (\[.*?\]);',s); N=json.loads(m.group(1))
  for n in N: n['x'],n['y']=P[n['id']]
  s=s.replace(m.group(1),json.dumps(N)); s=re.sub(r'\n"overview placement[^\n]*','',s)
  s=s.replace('map_pos (same placement as the painted overview)','world_layout map_pos + tools/region_map/pos.json (same placement as the regenerated Region map)')
  open(g,'w').write(s)
print('done')
