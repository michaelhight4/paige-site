#!/usr/bin/env python3
"""Generates data/social.json (platforms, post types, brands, gear) and merges the gear catalog/shop into data/slice/assets.json,
art_map.json, assets/art/manifest.json and the 128-style gear icons in assets/art/gear/. Safe to re-run."""
import json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def P(*a): return os.path.join(R, *a)
plats = [
 dict(id='chirpr', name='Chirpr', icon='🐦', role='Short text', minAge=13, growth=1.0, viral=1.0, sponsor=0.8, risk=1.6, verify=1.0, likes=['humor','drama','info'], dislikes=['family','looks'], audience='Fast, loud and argumentative.', personality='Rewards hot takes and memes. Pretty photos and family albums barely move it. Drama-prone.'),
 dict(id='snapfolio', name='Snapfolio', icon='📷', role='Photos', minAge=13, growth=1.0, viral=0.8, sponsor=1.2, risk=0.8, verify=1.0, likes=['looks','food','travel','pets'], dislikes=['drama','info'], audience='Scrolls for pretty things.', personality='Looks-weighted. Selfies, food and travel soar; rants and lectures sink.'),
 dict(id='clipwave', name='Clipwave', icon='🎬', role='Short video', minAge=13, growth=1.2, viral=1.8, sponsor=0.9, risk=1.0, verify=1.5, likes=['dance','humor','challenge'], dislikes=['info','family'], audience='Young, restless, fond of dances.', personality='Highest viral chance. Dances, skits and challenges win. Long explanations die in six seconds.'),
 dict(id='vidnest', name='VidNest', icon='📺', role='Long video / gaming', minAge=13, growth=0.7, viral=0.7, sponsor=1.6, risk=0.9, verify=2.0, likes=['gaming','info','career'], dislikes=['dance','looks'], audience='Patient viewers who stay for 20 minutes.', personality='Slow growth, best sponsor pay. Tutorials and gaming do well.'),
 dict(id='liveloop', name='LiveLoop', icon='🔴', role='Live streaming', minAge=13, growth=0.9, viral=1.0, sponsor=1.1, risk=1.3, verify=1.2, likes=['live','gaming','humor'], dislikes=['family'], audience='Chat that never stops typing.', personality='Live Q&A and gaming shine. Donations need 16+. Ties to the Live Streamer career.'),
 dict(id='kinbook', name='Kinbook', icon='👪', role='Family & friends', minAge=13, growth=0.5, viral=0.3, sponsor=0.5, risk=0.4, verify=0.5, likes=['family','food','pets','cause'], dislikes=['drama','mature'], audience='Aunts, cousins and your old teachers.', personality='Low ceiling, low risk. Family photos and causes are loved; edgy posts are noticed by grandma.'),
 dict(id='velvet', name='Velvet Circle', icon='💎', role='Fan club (paid)', minAge=18, growth=0.6, viral=0.2, sponsor=0.6, risk=1.4, verify=0.8, likes=['mature','looks'], dislikes=['family','cause'], audience='Paying subscribers, adults only.', personality='18+. Subscriber income, no mainstream sponsors; text-described content only, never graphic.'),
 dict(id='podcastle', name='Podcastle', icon='🎙️', role='Audio', minAge=16, growth=0.8, viral=0.5, sponsor=1.4, risk=0.7, verify=1.2, likes=['audio','info','career','cause'], dislikes=['dance','looks'], audience='Commuters and dog walkers.', personality='Smarts-weighted. Interviews and tutorials build a loyal audience. 16+.'),
]
def post(id,name,icon,tag,niche,styles,pl,minAge,base,viral,risk,stat,mature=False,rec=False):
    return dict(id=id,name=name,icon=icon,tag=tag,niche=niche,styles=styles,plats=pl,minAge=minAge,base=base,viral=viral,risk=risk,stat=stat,mature=mature)
ALLP=[p['id'] for p in plats]; M=['chirpr','snapfolio','clipwave','vidnest','liveloop','kinbook','podcastle']
posts=[
 post('selfie','Selfie','🤳','Safe','looks',['looks'],['snapfolio','clipwave','kinbook','chirpr'],13,1.0,0.03,0.03,'looks'),
 post('outfit','Outfit / fashion','👗','Safe','looks',['looks'],['snapfolio','clipwave','kinbook'],13,1.0,0.04,0.03,'looks'),
 post('food','Food','🍜','Safe','lifestyle',['food'],['snapfolio','clipwave','kinbook','vidnest'],13,0.9,0.03,0.02,'looks'),
 post('pet','Pet','🐶','Safe','lifestyle',['pets'],['snapfolio','clipwave','kinbook','chirpr'],13,0.9,0.05,0.01,'health'),
 post('travel','Travel','✈️','Safe','lifestyle',['travel','looks'],['snapfolio','vidnest','kinbook','clipwave'],13,1.0,0.03,0.03,'looks'),
 post('meme','Meme','😂','Safe','humor',['humor'],['chirpr','clipwave','snapfolio','kinbook'],13,1.1,0.06,0.06,'smarts'),
 post('skit','Random skit','🎭','Safe','humor',['humor'],['clipwave','vidnest','liveloop'],13,1.2,0.07,0.07,'looks'),
 post('challenge','Challenge','🏆','Spicy','humor',['challenge','humor'],['clipwave','chirpr','vidnest'],13,1.3,0.09,0.12,'health'),
 post('dance','Dance','💃','Safe','dance',['dance','looks'],['clipwave','snapfolio'],13,1.3,0.10,0.04,'looks'),
 post('tutorial','Tutorial / tips','📚','Safe','info',['info'],['vidnest','podcastle','chirpr','clipwave'],13,1.0,0.03,0.02,'smarts'),
 post('gaming','Gaming','🎮','Safe','gaming',['gaming'],['vidnest','liveloop','clipwave'],13,1.2,0.05,0.05,'smarts'),
 post('bts','Behind the scenes','🎥','Safe','career',['career'],['vidnest','snapfolio','podcastle','kinbook'],13,0.9,0.03,0.02,'smarts'),
 post('family','Family photo','👨‍👩‍👧','Safe','family',['family'],['kinbook','snapfolio','chirpr'],13,0.5,0.01,0.02,'happiness'),
 post('hottake','Hot take / political','🔥','Risky','drama',['drama','info'],['chirpr','vidnest','podcastle','liveloop'],13,1.4,0.12,0.30,'smarts'),
 post('charity','Charity / cause','💛','Safe','cause',['cause'],['kinbook','snapfolio','chirpr','podcastle','vidnest'],13,0.8,0.02,0.01,'happiness'),
 post('rant','Rant','😤','Risky','drama',['drama'],['chirpr','liveloop','vidnest','clipwave'],13,1.2,0.10,0.35,'happiness'),
 post('qa','Live Q&A','💬','Safe','live',['live','humor'],['liveloop','clipwave','chirpr'],13,1.1,0.05,0.08,'smarts'),
 post('collabpost','Collab post','🤝','Safe','humor',['humor','live'],['clipwave','vidnest','liveloop','podcastle','snapfolio'],13,1.3,0.08,0.06,'looks'),
 post('interview','Interview episode','🎤','Safe','audio',['audio','info'],['podcastle'],16,1.1,0.05,0.05,'smarts'),
 post('storytime','Storytime episode','📖','Safe','audio',['audio','humor'],['podcastle'],16,1.0,0.05,0.07,'smarts'),
 post('nostalgia','Nostalgia / old tech fumble','📼','Safe','humor',['humor','info'],['vidnest','kinbook','chirpr','clipwave'],65,1.2,0.07,0.01,'happiness'),
 post('spicy','Spicy photos (text-described)','🔞','Risky','mature',['mature','looks'],['velvet'],18,2.0,0.02,0.20,'looks',True),
 post('tease','Late-night club post (text-described)','🌙','Risky','mature',['mature'],['velvet'],18,1.6,0.02,0.15,'looks',True),
]
brands=[('Fizzy Pop Cola','drink',13,True,1.0,['food','lifestyle','humor']),('Crunchy Bites','snacks',13,True,0.9,['food','lifestyle']),('Pixel Gear','gaming',13,True,1.1,['gaming','humor']),('GlowUp Skincare','beauty',13,True,1.2,['looks','lifestyle']),('Urban Thread','fashion',13,True,1.1,['looks','lifestyle']),('Wanderly Travel','travel',13,True,1.3,['lifestyle','looks']),('StudyBuddy Apps','education',13,True,1.0,['info','career']),('Pawfect Pet Co','pets',13,True,0.9,['lifestyle','family']),('FitFuel Gym','fitness',13,True,1.2,['dance','looks','lifestyle']),('Nimbus Phones','tech',13,True,1.5,['info','gaming','career']),('Everbank','finance',18,False,1.6,['info','career']),('Lucky Spin Casino','gambling',18,False,2.0,['humor','gaming']),('Cask & Ember Spirits','alcohol',18,False,1.8,['lifestyle','humor']),('QuickCash Loans','finance',18,False,1.4,['info']),('MiracleSlim Tea','dubious',16,False,1.7,['looks','lifestyle'])]
gear=[]
KINDS=[('cam','Camera','📷'),('mic','Microphone','🎤'),('light','Lighting rig','💡'),('desk','Desk & studio','🖥️'),('set','Full set','🎬')]
TN=['Starter','Pro','Studio']
PR={'cam':[180,900,4800],'mic':[90,450,2400],'light':[120,600,3200],'desk':[250,1400,7500],'set':[900,5200,28000]}
GB={ # growth, viral, sponsor fractions
 'cam':[(0.03,0.04,0.02),(0.07,0.09,0.05),(0.12,0.16,0.09)],'mic':[(0.02,0.02,0.03),(0.05,0.05,0.06),(0.09,0.09,0.11)],
 'light':[(0.02,0.03,0.02),(0.05,0.07,0.05),(0.09,0.12,0.09)],'desk':[(0.03,0.02,0.03),(0.06,0.05,0.07),(0.10,0.09,0.12)],
 'set':[(0.10,0.12,0.08),(0.20,0.25,0.18),(0.34,0.42,0.30)]}
for k,n,ic in KINDS:
    for t in range(3):
        g,v,sp=GB[k][t]
        gear.append(dict(id=f'{k}_{t+1}',name=(f'{TN[t]} {n.lower()}' if k!='set' else {0:'Starter creator set',1:'Pro creator set',2:'Studio creator set'}[t]),base=PR[k][t],age=[0,0],cond=[96,100],kind=k,tier=t+1,growth=g,viral=v,sponsor=sp,art=f'gear_{k}_{t+1}',rarity=1))
social=dict(platforms=plats,posts=posts,brands=[dict(name=b[0],cat=b[1],minAge=b[2],kidSafe=b[3],pay=b[4],niches=b[5],premium=b[0] in('Everbank','Nimbus Phones','Wanderly Travel')) for b in brands],gear=gear,
 rivals=['Maxie Vale','Dex Quill','Juno Park','Tobias Reed','Lena Frost','Kai Moreno','Priya Nandan','Otis Bell','Sunny Cho','Rafa Duarte','Mina Aoki','Zed Holloway'],
 niches=['looks','lifestyle','humor','dance','info','gaming','career','family','cause','live','audio','drama','mature'],
 team=[dict(id='editor',name='Editor',icon='✂️',minFollowers=5000,salary=18000,blurb='Raises post quality, cuts burnout, helps with consistency.'),dict(id='manager',name='Manager',icon='📋',minFollowers=25000,salary=30000,blurb='+10% sponsor pay, fewer bad-fit deals, cools drama.'),dict(id='agent',name='Agent',icon='🕴️',minFollowers=100000,salary=0,cut=0.1,blurb='+1 offer a year, +15% sponsor pay, takes 10% of social income.')],
 teamNames=['Sam Okafor','Rita Brandt','Chen Wei','Alba Torres','Moe Fitch','Dara Quinn','Lev Ortiz','Ada Mbeki'])
social['chat']=dict(
 users=['xX_pogchamp','nightowl88','mod_marta','tiny_tim','sleepy_sam','gg_gwen','lurker_lou','captain_chaos','pixelpete','byte_bella','donut_dan','salty_sal'],
 lines=dict(hype=['LETS GOOO','this is insane','W streamer','clip it clip it','chat is going wild','HYPE HYPE HYPE'],chill=['so cozy tonight','love this vibe','nice and relaxing','good talk honestly','this is my comfort stream'],edgy=['ooooh he said it','mods mods','this is gonna get clipped','spicy!!','chat is divided lol','report incoming?'],charity=['donating right now','so wholesome','you are a legend','all heart','took my last five bucks, worth it'],risky=['are you sure about this','this will not end well','F in chat','bro what','wait is this allowed?'],boring=['zzz','is this the same bit as last week','chat dead','lag?']),
 scenes=[
  dict(id='troll',prompt='A troll floods your chat mid-game. Chat waits to see what you do.',choices=[dict(label='Ban them calmly',tone='chill',subsPct=2,rep=2),dict(label='Roast them on stream',tone='edgy',subsPct=6,rep=-2,strike=0.12),dict(label='Ignore it and keep playing',tone='boring',subsPct=-1)]),
  dict(id='donation',prompt='Someone donates $500 and asks you to say something outrageous.',choices=[dict(label='Do it',tone='risky',subsPct=7,money=500,strike=0.18,rep=-3),dict(label='Thank them and decline',tone='chill',subsPct=2,money=500,rep=2),dict(label='Turn it into a charity push',tone='charity',subsPct=4,money=250,rep=5)]),
  dict(id='challenge',prompt='Chat votes for a hard challenge: finish the level with no healing.',choices=[dict(label='Accept the challenge',tone='hype',subsPct=8,burnout=4),dict(label='Negotiate an easier rule',tone='chill',subsPct=2),dict(label='Refuse',tone='boring',subsPct=-2)]),
  dict(id='guest',prompt='A bigger streamer joins your raid and asks for a collab on the spot.',choices=[dict(label='Collab live',tone='hype',subsPct=10,rep=1),dict(label='Say you are busy',tone='boring',subsPct=-1),dict(label='Challenge them to a duel',tone='edgy',subsPct=6,strike=0.06)]),
  dict(id='slip',prompt='You accidentally say something you should not have on a hot mic.',choices=[dict(label='Own it and apologize',tone='chill',subsPct=0,rep=2),dict(label='Laugh it off',tone='risky',subsPct=3,strike=0.15,rep=-3),dict(label='Pretend it never happened',tone='boring',subsPct=-3,rep=-2)]),
  dict(id='rant',prompt='The game crashes before you save. Chat is watching.',choices=[dict(label='Rage quit',tone='edgy',subsPct=5,burnout=3,strike=0.1),dict(label='Laugh and restart',tone='hype',subsPct=4),dict(label='Call it a night',tone='chill',subsPct=0)])])
json.dump(social,open(P('data','social.json'),'w'),indent=1,ensure_ascii=False)

# ---- shop: catalog + shop + pricing category in slice assets.json
A=json.load(open(P('data','slice','assets.json')))
A['catalogs']['gear']=[{k:v for k,v in g.items() if k not in('growth','viral','sponsor','art','tier','kind')}|{'kind':g['kind']} for g in gear]
A['pricing']['categories']['gear']=dict(name='Creator gear',icon='🎥',depr=0.05,depr_cap_years=15,cond_decay=[0,1],upkeep_pct=0,sell_factor=0.6,max_owned=30,min_age=13)
if not any(s['id']=='gear_hub' for s in A['shops']):
    A['shops'].append(dict(id='gear_hub',name='Creator Gear Hub',category='gear',kind='gear_store',blurb='Cameras, mics, lighting, desks and full sets for streamers and podcasters.',catalog='gear',count=15,markup=[1.0,1.0],age=[0,0],cond=[96,100]))
json.dump(A,open(P('data','slice','assets.json'),'w'),indent=1,ensure_ascii=False)
am=json.load(open(P('data','art_map.json')))
am['artCategory']['gear']='gear'; am['default']['gear']='gear_cam_1'
am['map']['gear']={g['id']:g['art'] for g in gear}
json.dump(am,open(P('data','art_map.json'),'w'),indent=1,ensure_ascii=False)

# ---- 128-style item icons (SVG, slot-svg-v1: data-slot + baked default + var fallback; outline #2b2a3a; shading = semi-transparent overlays)
O='#2b2a3a'
def sl(slot,fill,extra,tag='rect',**a):
    at=' '.join(f'{k.replace("_","-")}="{v}"' for k,v in a.items())
    return f'<{tag} {at} data-slot="{slot}" fill="{fill}" style="fill:var(--slot-{slot},{fill})" {extra}/>'
def px(x,y,w,h,slot=None,fill='#fff',extra=''):
    if slot: return sl(slot,fill,extra,'rect',x=x,y=y,width=w,height=h)
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" {extra}/>'
SH='fill="#000" fill-opacity=".22"'; HI='fill="#fff" fill-opacity=".35"'
D={'body':'#3f4a6b','trim':'#f3efe4','accent':'#e8573d','metal':'#b8bcc8','glass':'#9fd8ee','shadow':'#1b1b2a'}
def cam(t):
    w=44+t*8
    s=[sl('shadow',D['shadow'],'fill-opacity=".28" stroke="none"','ellipse',cx=64,cy=116,rx=36,ry=5),
       px(64-w//2,44,w,44,'body',D['body']),px(64-w//2,44,w,6,None,'#fff','fill-opacity=".25" stroke="none"'),px(64-w//2,82,w,6,None,'#000','fill-opacity=".22" stroke="none"')]
    s+= [sl('metal',D['metal'],'','circle',cx=64,cy=66,r=14+t*2),sl('glass',D['glass'],'','circle',cx=64,cy=66,r=9+t*2),px(60,60,4,4,None,'#fff','fill-opacity=".7" stroke="none"')]
    s+= [px(64-w//2+4,38,10,6,'accent',D['accent']),px(64+w//2-14,48,8,5,'trim',D['trim'])]
    if t>=1: s.append(px(64-w//2-10,52,10,24,'metal',D['metal']))
    if t>=2: s+= [px(64+w//2,52,10,24,'metal',D['metal']),px(58,24,12,14,'metal',D['metal']),px(50,18,28,6,'accent',D['accent'])]
    s+=[px(58,88,12,16,'metal',D['metal']),px(44,104,40,8,'body',D['body'])]
    return s
def mic(t):
    s=[sl('shadow',D['shadow'],'fill-opacity=".28" stroke="none"','ellipse',cx=64,cy=116,rx=30,ry=5)]
    s+=[px(60,70,8,36,'metal',D['metal']),px(46,106,36,8,'body',D['body'])]
    r=14+t*3
    s+=[sl('body',D['body'],'','circle',cx=64,cy=48,r=r),sl('metal',D['metal'],'fill-opacity=".9"','circle',cx=64,cy=48,r=r-5)]
    s+=[px(60,40,4,4,None,'#fff','fill-opacity=".6" stroke="none"'),px(58,52,12,3,None,'#000','fill-opacity=".25" stroke="none"')]
    if t>=1: s+=[px(40,34,5,28,'accent',D['accent']),px(83,34,5,28,'accent',D['accent']),px(40,60,48,5,'accent',D['accent'])]
    if t>=2: s+=[px(54,22,20,5,'trim',D['trim']),px(30,78,68,6,'trim',D['trim'])]
    return s
def light(t):
    s=[sl('shadow',D['shadow'],'fill-opacity=".28" stroke="none"','ellipse',cx=64,cy=118,rx=34,ry=5),px(61,66,6,48,'metal',D['metal']),px(42,112,44,6,'body',D['body']),px(50,100,28,4,'body',D['body'])]
    n=1+t
    for i in range(n):
        x=64-(n*26)//2+i*26+(0 if n>1 else -0)
        s+=[px(x,24 if n==1 else 30,26 if n>1 else 40,40 if n==1 else 34,'body',D['body']),px(x+3,28 if n==1 else 34,20 if n>1 else 34,30 if n==1 else 26,'glass',D['glass'])]
    s+=[px(48 if n==1 else 40,62,32 if n==1 else 48,5,'accent',D['accent'])]
    return s
def desk(t):
    s=[sl('shadow',D['shadow'],'fill-opacity=".28" stroke="none"','ellipse',cx=64,cy=118,rx=50,ry=5),px(16,70,96,8,'trim',D['trim']),px(20,78,8,34,'metal',D['metal']),px(100,78,8,34,'metal',D['metal']),px(16,70,96,3,None,'#fff','fill-opacity=".4" stroke="none"')]
    s+=[px(40,36,48,32,'body',D['body']),px(44,40,40,24,'glass',D['glass']),px(60,68,8,4,'metal',D['metal'])]
    if t>=1: s+=[px(14,44,22,26,'body',D['body']),px(18,48,14,18,'glass',D['glass']),px(92,52,22,16,'accent',D['accent'])]
    if t>=2: s+=[px(14,26,100,6,'accent',D['accent']),px(28,32,4,4,'trim',D['trim']),px(96,32,4,4,'trim',D['trim']),px(46,88,36,12,'body',D['body'])]
    return s
def sset(t):
    s=[]
    s+=desk(min(t,2))[:]
    s+=[px(86,34,10,14,'accent',D['accent']),px(88,48,6,22,'metal',D['metal'])]
    s+=[px(4,40,14,22,'body',D['body']),px(7,43,8,10,'glass',D['glass'])]
    if t>=1: s+=[px(104,36,16,26,'body',D['body']),px(108,40,8,8,'accent',D['accent'])]
    if t>=2: s+=[px(52,10,24,8,'metal',D['metal']),px(60,18,8,8,'accent',D['accent'])]
    return s
os.makedirs(P('assets','art','gear'),exist_ok=True)
man=json.load(open(P('assets','art','manifest.json')))
man['assets']=[a for a in man['assets'] if a['category']!='gear']
fn={'cam':cam,'mic':mic,'light':light,'desk':desk,'set':sset}
for g in gear:
    shapes=fn[g['kind']](g['tier']-1)
    body='\n'.join(f'<g id="{g["art"]}-{i}">{x}</g>' if False else x for i,x in enumerate(shapes))
    # unique ids per slot shape
    out=[];cnt=0
    for x in shapes:
        if 'data-slot' in x:
            cnt+=1; x=x.replace('data-slot=',f'id="{g["art"]}-s{cnt}" data-slot=',1)
        out.append(x)
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" shape-rendering="crispEdges" data-asset="{g["art"]}" data-category="gear">\n<g stroke="{O}" stroke-width="2" stroke-linejoin="miter">\n'+'\n'.join(out)+'\n</g>\n</svg>\n'
    open(P('assets','art','gear',g['art']+'.svg'),'w').write(svg)
    used=[]; 
    for sname in ['shadow','body','trim','accent','metal','glass']:
        if f'data-slot="{sname}"' in svg: used.append(sname)
    man['assets'].append(dict(id=g['art'],category='gear',file=f'gear/{g["art"]}.svg',slots=used,defaults={k:D[k] for k in used},rarity='common',name=g['name'],tags=['gear',g['kind']],pair=None,pairRole=None,viewBox='0 0 128 128'))
json.dump(man,open(P('assets','art','manifest.json'),'w'),indent=1,ensure_ascii=False)
ui=json.load(open(P('ui','data','ui_config.json')))
ui['shopKinds']['gear_store']=dict(section='Creator Gear',icon='🎥')
ui.setdefault('assetIcons',{})['gear']='🎥'
json.dump(ui,open(P('ui','data','ui_config.json'),'w'),indent=1,ensure_ascii=False)
print('ok',len(gear),'gear items')
# keep the data copy of the manifest in sync, and give gear its own (non-valued) recolor category: body/trim/accent/metal recolor, price never changes
import shutil
shutil.copy(P('assets','art','manifest.json'),P('data','art_manifest.json'))
pal=json.load(open(P('data','palettes.json')))
g=json.loads(json.dumps(pal['categories']['cars'])); g['aliases']=['gear']; g['valued']={k:0 for k in g.get('valued',{'body':0})}
pal['categories']['gear']=g
json.dump(pal,open(P('data','palettes.json'),'w'),indent=1,ensure_ascii=False)
