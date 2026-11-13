# Region layout: positions for every place + check that each link points the way its exit side faces. Usage: python3 layout.py <game_root>
import json,re
P={'frostspire':(0.34,0.09),'frostspire_pass':(0.37,0.20),'greystone_b1':(0.40,0.30),'greystone_entrance':(0.48,0.31),
'thornwood':(0.46,0.44),'fernwick':(0.28,0.46),'route_fernwick_lanternport':(0.14,0.50),'lanternport':(0.12,0.80),
'route1':(0.28,0.585),'brookhollow':(0.28,0.70),'route_east':(0.43,0.70),'route_coast':(0.43,0.79),'tidewater_coast':(0.40,0.885),
'aurelith':(0.58,0.70),'route_cindervale':(0.58,0.80),'cindervale':(0.60,0.895),'route_aurelith_saltmere':(0.71,0.70),'saltmere':(0.83,0.68),
'route_revival_saltmere':(0.81,0.56),'revival_heights':(0.78,0.44),'route_revival':(0.62,0.44),'route_revival_sunmeadow':(0.73,0.33),
'sunmeadow_fields':(0.70,0.21),'route_sunmeadow_mirefen':(0.83,0.30),'mirefen':(0.93,0.39),'route_saltmere_mirefen':(0.93,0.62)}
def fit(x,y): return (round(0.085+(x-0.12)*0.83/0.81,4), round(0.075+(y-0.09)*0.82/0.805,4))
P={k:fit(*v) for k,v in P.items()}
src=open(__import__('sys').argv[1]+'/src/ui/connections.gen.js').read()
E=json.loads(re.search(r'CONN_EDGES = (\[.*?\]);',src).group(1))
V={'north':(0,-1),'south':(0,1),'east':(1,0),'west':(-1,0)}
bad=0
for e in E:
  for a,b,s in ((e['a'],e['b'],e['sa']),(e['b'],e['a'],e['sb'])):
    if s=='door':continue
    dx=(P[b][0]-P[a][0])*2304;dy=(P[b][1]-P[a][1])*1728;v=V[s]
    if dx*v[0]+dy*v[1] < 0.7*(dx*dx+dy*dy)**.5*0.75: bad+=1;print('BAD',a,s,b,round(dx),round(dy))
print('bad',bad);import os;json.dump(P,open(os.path.dirname(os.path.abspath(__file__))+'/pos.json','w'),indent=1)
print(min(p[0] for p in P.values()),max(p[0] for p in P.values()),min(p[1] for p in P.values()),max(p[1] for p in P.values()))
