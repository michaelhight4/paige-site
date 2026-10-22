#!/usr/bin/env python3
"""Generates data/politics.json (offices, per-country equivalents, platforms, trick questions, donors, royalty, court cases)."""
import json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = lambda id,name,tier,minAge,term,pay,seats,cand,need,cost,kind='election',**k: dict(id=id,name=name,tier=tier,minAge=minAge,term=term,pay=pay,seats=seats,cand=cand,needTier=need,filing=cost,kind=kind,**k)
slots=[
 S('council','Local Council Member',1,18,4,30000,8,16,0,500,scope='City'),
 S('school','School Board Commissioner',1,21,4,24000,5,9,0,400,scope='District'),
 S('sheriff','Sheriff',2,25,4,95000,1,3,0,1500,scope='County',clean=True),
 S('mayor','Mayor',2,25,4,115000,1,4,1,2500,scope='City'),
 S('congress','Congress',3,25,2,174000,1,5,1,10000,scope='District'),
 S('governor','Governor',3,30,4,190000,1,4,2,25000,scope='State'),
 S('senate','Senate',4,30,6,176000,1,4,2,40000,scope='State'),
 S('president','President',5,35,4,400000,1,5,3,150000,scope='Nation',termLimit=2),
 S('judge','Judge',2,30,6,160000,1,1,0,0,'appointed',scope='Court',degree='law_school',years=0),
 S('state_supreme','State Supreme Court Justice',3,35,12,210000,1,1,2,0,'appointed',scope='State',degree='law_school',years=4),
 S('federal_supreme','Federal Supreme Court Justice',4,40,99,285000,1,1,3,0,'appointed',scope='Nation',degree='law_school',years=8),
]
T=lambda **k:k
titles={
 'us':{},
 'uk':T(council='Local Councillor',school='School Governor',sheriff='Police & Crime Commissioner',mayor='Mayor',congress='Member of Parliament',governor='First Minister (devolved)',senate='Peer (House of Lords seat)',president='Prime Minister',judge='Magistrate Judge',state_supreme='High Court Judge',federal_supreme='Supreme Court Justice'),
 'jp':T(council='Municipal Assembly Member',school='Board of Education Member',sheriff='Prefectural Police Chief',mayor='Mayor',congress='Member of the House of Representatives',governor='Prefectural Governor',senate='Member of the House of Councillors',president='Prime Minister',judge='District Court Judge',state_supreme='High Court Judge',federal_supreme='Supreme Court Justice'),
 'de':T(council='Gemeinderat Member',school='School Board Member',sheriff='District Police President',mayor='Mayor (Bürgermeister)',congress='Member of the Bundestag',governor='Minister-President',senate='Member of the Bundesrat',president='Chancellor',judge='Local Court Judge',state_supreme='Higher Regional Court Judge',federal_supreme='Federal Constitutional Court Justice'),
 'br':T(council='City Councillor (Vereador)',school='School Council Member',sheriff='Police Delegate',mayor='Mayor (Prefeito)',congress='Federal Deputy',governor='Governor',senate='Senator',president='President',judge='Judge',state_supreme='State Appeals Judge',federal_supreme='Federal Supreme Court Minister'),
 'ng':T(council='Local Government Councillor',school='School Board Member',sheriff='Divisional Police Officer',mayor='Local Government Chairman',congress='House of Representatives Member',governor='Governor',senate='Senator',president='President',judge='Magistrate',state_supreme='State High Court Judge',federal_supreme='Supreme Court Justice'),
 'in':T(council='Municipal Councillor',school='School Management Member',sheriff='Superintendent of Police',mayor='Mayor',congress='Member of the Lok Sabha',governor='Chief Minister',senate='Member of the Rajya Sabha',president='Prime Minister',judge='District Judge',state_supreme='High Court Judge',federal_supreme='Supreme Court Justice'),
 'mx':T(council='Municipal Regidor',school='School Council Member',sheriff='Municipal Police Chief',mayor='Municipal President',congress='Federal Deputy',governor='Governor',senate='Senator',president='President',judge='District Judge',state_supreme='State Supreme Court Magistrate',federal_supreme='Supreme Court Minister'),
 'fr':T(council='Conseiller Municipal',school='School Board Delegate',sheriff='Departmental Police Prefect',mayor='Mayor (Maire)',congress='Member of the National Assembly',governor='Regional Council President',senate='Senator',president='President',judge='Tribunal Judge',state_supreme='Court of Appeal Judge',federal_supreme='Constitutional Council Member'),
 'ua':T(council='City Council Deputy',school='School Board Member',sheriff='Chief of Regional Police',mayor='Mayor',congress='People\'s Deputy (Verkhovna Rada)',governor='Regional Governor',senate='Deputy Speaker (single chamber)',president='President',judge='Local Court Judge',state_supreme='Appeals Court Judge',federal_supreme='Constitutional Court Judge'),
}
base=dict(council='Local Council Member',school='School Board Commissioner',sheriff='Sheriff',mayor='Mayor',congress='Congress Member',governor='Governor',senate='Senator',president='President',judge='Judge',state_supreme='State Supreme Court Justice',federal_supreme='Federal Supreme Court Justice')
for c in titles: titles[c]={**base,**titles[c]}
systems={'us':'presidential','uk':'parliamentary','jp':'parliamentary','de':'parliamentary','br':'presidential','ng':'presidential','in':'parliamentary','mx':'presidential','fr':'presidential','ua':'presidential'}
monarchies={'uk':dict(house='House of Windmere',male='King',female='Queen',consortM='Prince Consort',consortF='Queen Consort'),'jp':dict(house='Imperial House of Yamato',male='Emperor',female='Empress',consortM='Imperial Consort',consortF='Empress Consort')}
platforms=[dict(id='economy',name='Jobs & the economy',icon='💼',fit=dict(council=1,school=0,sheriff=0,mayor=3,congress=3,governor=3,senate=3,president=3)),
 dict(id='safety',name='Law & order',icon='🚓',fit=dict(council=2,school=1,sheriff=5,mayor=3,congress=1,governor=2,senate=1,president=2)),
 dict(id='schools',name='Schools & families',icon='🏫',fit=dict(council=2,school=5,sheriff=0,mayor=2,congress=2,governor=2,senate=1,president=1)),
 dict(id='health',name='Health care',icon='🏥',fit=dict(council=1,school=1,sheriff=0,mayor=1,congress=3,governor=3,senate=3,president=3)),
 dict(id='green',name='Environment & energy',icon='🌱',fit=dict(council=2,school=1,sheriff=0,mayor=2,congress=2,governor=2,senate=3,president=2)),
 dict(id='taxes',name='Lower taxes',icon='💸',fit=dict(council=2,school=0,sheriff=1,mayor=2,congress=2,governor=3,senate=3,president=3))]
def C(label,points,cash=0,rep=0,karma=0,scandal=0): return dict(label=label,points=points,cost=dict(cash=cash,rep=rep,karma=karma),scandal=scandal)
questions=[
 dict(id='q_taxes',text='"Will you raise taxes?" The cameras are rolling.',choices=[C('Promise never to, knowing you will have to',8,rep=-3),C('Dodge with a joke about the weather',4,rep=-1,cash=-500),C('Blame the other side loudly',7,karma=-4,scandal=0.04)]),
 dict(id='q_past',text='"Is it true you once lied about your past?"',choices=[C('Deny everything',8,rep=-4,scandal=0.08),C('Admit a small thing to bury the big thing',5,rep=-2),C('Attack the reporter',6,karma=-4,rep=-3)]),
 dict(id='q_money',text='"Who is funding your campaign?"',choices=[C('"Ordinary hard-working people"',8,rep=-3,scandal=0.05),C('Refuse to answer',3,rep=-2),C('List only the friendly donors',5,rep=-1,scandal=0.03)]),
 dict(id='q_crime',text='"What will you do about crime?"',choices=[C('Promise to lock up everyone',8,karma=-3,rep=-2),C('Promise miracles, no budget',6,rep=-3),C('Blame the previous administration',5,karma=-2)]),
 dict(id='q_family',text='"Does your family support you?"',choices=[C('Stage a family photo shoot',7,cash=-1500,rep=-1),C('Say they are "private people"',3),C('Claim they inspire everything, awkwardly',5,karma=-1,rep=-1)]),
 dict(id='q_debate',text='"Your opponent called you a fraud. Respond."',choices=[C('Call them something worse',8,karma=-4,rep=-3),C('Laugh nervously',2,rep=-1),C('Bring up their divorce',7,karma=-5,rep=-2,scandal=0.04)]),
 dict(id='q_future',text='"What is your plan for the next four years?"',choices=[C('Read a vague slogan three times',6,rep=-2),C('Promise something obviously impossible',9,rep=-5),C('Say "change" with great feeling',5,rep=-1,cash=-300)]),
 dict(id='q_scandal',text='"A leaked recording sounds like you. Is it?"',choices=[C('"That is AI-generated"',8,rep=-4,scandal=0.07),C('"Taken out of context"',5,rep=-2),C('Walk off the stage',3,rep=-3,karma=-1)]),
]
donors=[dict(type='Corporate PAC',names=['Titan Industries PAC','Meridian Holdings','Vanta Energy'],mult=1.6,favors=['tax_break','contract','deregulate']),
 dict(type='Labor union',names=['United Workers Alliance','Trades Council 12'],mult=1.1,favors=['jobs','wages']),
 dict(type='Billionaire',names=['Cassian Vale','Odette Marlowe','R. J. Hargrove'],mult=2.2,favors=['appointment','contract','pardon']),
 dict(type='Lobby group',names=['Citizens for Progress','Agri-Voice Coalition','Tech Forward'],mult=1.3,favors=['deregulate','tax_break']),
 dict(type='Local business owner',names=['Pat\'s Hardware','Dellacroix Motors','Sunny Side Diner'],mult=0.4,favors=['contract','permit'])]
favorKinds={'tax_break':'a tax break','contract':'a government contract','deregulate':'loosened regulations','jobs':'protecting their jobs bill','wages':'a wage deal','appointment':'a plum appointment for a friend','pardon':'a quiet pardon','permit':'a fast-tracked permit'}
foes=['Veskaria','the Northern Pact','Dravenmoor','the Corsair Coast','Khorazan']
royal=dict(duties=[dict(id='gala',name='Charity gala',icon='🎗️',pop=3,fame=2,karma=2,stress=2,gaffe=0.05),dict(id='visit',name='State visit',icon='🛬',pop=4,fame=3,karma=0,stress=4,gaffe=0.10),dict(id='ribbon',name='Ribbon cutting',icon='✂️',pop=2,fame=1,karma=0,stress=1,gaffe=0.03),dict(id='address',name='Public address',icon='🎙️',pop=3,fame=2,karma=0,stress=3,gaffe=0.08),dict(id='parade',name='Military parade',icon='🎖️',pop=3,fame=2,karma=0,stress=3,gaffe=0.04)],
 names=dict(male=['Edmund','Alaric','Hugh','Leopold','Casimir','Roland','Aldric'],female=['Isolde','Margaret','Beatrix','Adelaide','Seraphine','Eleanor','Wilhelmina'],jp_male=['Akihito','Naruhito','Hirohito','Fumihito'],jp_female=['Masako','Sayako','Kiko','Aiko']),allowance=dict(monarch=900000,heir=300000,royal=120000,consort=250000))
cases=[dict(id='c1',text='A tech giant is accused of crushing smaller rivals.',choices=[dict(label='Rule against the giant',rep=3,donors=-1,approval=5),dict(label='Rule for the giant',rep=-3,cash=20000,approval=-4),dict(label='Split the baby',rep=0,approval=0)]),
 dict(id='c2',text='A protest group challenges a new law.',choices=[dict(label='Strike the law down',rep=2,approval=3,donors=-1),dict(label='Uphold the law',rep=1,approval=-2),dict(label='Send it back to the legislature',rep=0,approval=1)]),
 dict(id='c3',text='A defendant with famous friends asks for leniency.',choices=[dict(label='Show leniency',rep=-4,cash=15000,approval=-3),dict(label='Apply the law as written',rep=4,approval=4),dict(label='Recuse yourself',rep=1,approval=0)])]
d=dict(slots=slots,titles=titles,systems=systems,monarchies=monarchies,platforms=platforms,questions=questions,donors=donors,favorKinds=favorKinds,foes=foes,royal=royal,cases=cases,
 opponentNames=['Harlan Pike','Veronica Stahl','Dutch Calloway','Ingrid Lowell','Marcus Obi','Delia Fontaine','Bram Ketterly','Soledad Ruiz','Gideon Marsh','Tamsin Hale','Rex Aldous','Nia Okoro','Walt Brennigan','Esme Park','Lucian Frost','Hilda Voss'],
 party=['Unity','Liberty','Reform','Heritage'])
json.dump(d,open(os.path.join(R,'data','politics.json'),'w'),indent=1,ensure_ascii=False); print('ok')
