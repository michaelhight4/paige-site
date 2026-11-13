import json,re
d=json.load(open('quests_draft.json'))
ban=[r'\bPP\b','shiny','super effective','pok[eé]dex','pok[eé] ?ball','gotcha','\bnurse','\bbadges?\b','beer','wine','ale\b','pub\b','drunk','\bbar\b','bartender','cigar','smok','\bdrug','haze','\bfog','tipsy','vodka','whisk(e)?y','cocktail','booze','liquor','vape','pipe\b','high on','stoned']
ids=set();bad=0
for q in d['quests']:
  assert q['id'] not in ids, q['id']; ids.add(q['id'])
  for k in ['id','title','type','zone','order','giver','prerequisites','steps','reward','lines','notes','status']: assert k in q,(q['id'],k)
  sid={s['id'] for s in q['steps']}
  for l in q['lines']:
    if l.get('step') and l['step'] not in sid: print('bad step ref',q['id'],l['step'])
    for t in l['text']:
      if len(t.split())>20: print('LONG',q['id'],len(t.split()),t)
  txt=json.dumps({k:q[k] for k in ['title','lines','steps']},ensure_ascii=False)
  for b in ban:
    for m in re.finditer(b,txt,re.I):
      ctx=txt[max(0,m.start()-40):m.end()+40]
      if 'all_badges' in ctx: continue
      print('BAN?',q['id'],b,'::',ctx); bad+=1
print(len(d['quests']),'quests; flagged',bad)
