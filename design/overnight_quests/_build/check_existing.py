import json,re,sys
sys.path.insert(0,'.')
from mq_data import MAIN
raw=open('/workspace/kilumen/text/overworld_lines.json').read()
def norm(s): return re.sub(r'[^a-z0-9]','',s.lower())
R=norm(raw.replace('\\u2019',"'"))
for q in MAIN:
  for l in q['lines']:
    if 'existing' in l:
      miss=[t for t in l['text'] if norm(t) not in R]
      if miss: print(q['id'],l['npc'],l['existing'],'MISSING:',miss)
