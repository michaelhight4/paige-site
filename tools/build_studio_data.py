#!/usr/bin/env python3
"""One-off: extends Game dev's studio_data.json (from /workspace/lifesim_studio_ui) into data/studio_data.json.
All gameplay content for studios lives in the output JSON. Re-run only if you want to regenerate from the source file."""
import json, sys
src = sys.argv[1] if len(sys.argv) > 1 else '/workspace/lifesim_studio_ui/data/studio_data.json'
d = json.load(open(src))
d['meta']['note'] = 'All content lives here. Fantasy/isekai reskin: edit labels/ids/numbers only (see DESIGN.md).'
d['meta']['unit'] = 'copies'
diff = dict(action=1.0, rpg=1.3, puzzle=0.8, sim=1.1, adventure=1.0, strategy=1.2, sports=0.9, horror=0.8)
for g in d['genres']: g['difficulty'] = diff[g['id']]
def tiers(rows):
    keys = ['id','label','icon','cost','teamSize','baseYears','risk','baseQuality','baseRev','price']
    return [dict(zip(keys, r)) for r in rows]
IC = ['🌱','🌿','🌳','🏔️']
game_t = tiers([('small','Small (indie)',IC[0],20000,3,1,.15,5.0,800000,10),('medium','Medium',IC[1],90000,6,2,.3,5.8,2500000,25),
                ('large','Large (AA)',IC[2],300000,10,4,.5,6.6,9000000,50),('epic','Epic (AAA)',IC[3],1500000,16,7,.65,7.2,28000000,70)])
film_t = tiers([('small','Micro-budget',IC[0],400000,3,1,.15,5.0,900000,12),('medium','Indie',IC[1],3000000,5,2,.3,5.8,6600000,14),
                ('large','Studio mid-budget',IC[2],25000000,9,3.5,.5,6.6,55000000,15),('epic','Blockbuster',IC[3],100000000,14,6,.65,7.2,220000000,16)])
tv_t = tiers([('small','Cable-budget',IC[0],600000,3,0.6,.15,5.0,900000,6),('medium','Prestige-lite',IC[1],4000000,5,1,.3,5.8,6000000,7),
              ('large','Premium',IC[2],18000000,8,1.5,.5,6.6,26000000,8),('epic','Event series',IC[3],60000000,12,2.5,.65,7.2,90000000,9)])
mt = d['mediaTypes']
mt['film'] = mt.pop('movie')
anime = mt.pop('anime')
for k, v in mt.items(): v['unitName'] = v.get('unitName', k)
# roles: one per effort-area slot (area ids are stable across media, labels change)
mt['game'].update(sector='tech', unit='copies', studioShare=0.7, tiers=game_t,
    roles=[dict(id='designer',name='Designer',base=65000),dict(id='artist',name='Artist',base=60000),dict(id='composer',name='Composer',base=55000),dict(id='writer',name='Writer',base=55000),dict(id='programmer',name='Programmer',base=70000)],
    areaRoles=dict(gameplay='designer',graphics='artist',sound='composer',story='writer',polish='programmer'),
    engineLabel='Engine', engines=[
      dict(id='e_basic',name='Basic Engine',cost=0,qualityBonus=0.0,speedMult=1.0,minFame=0),
      dict(id='e_custom',name='Custom In-house Engine',cost=40000,qualityBonus=0.4,speedMult=0.95,minFame=0),
      dict(id='e_licensed',name='Premium Licensed Engine',cost=150000,qualityBonus=0.8,speedMult=0.9,minFame=15),
      dict(id='e_next',name='NextGen Engine',cost=600000,qualityBonus=1.3,speedMult=0.85,minFame=40)])
film_roles = [dict(id='writer',name='Screenwriter',base=50000),dict(id='actor',name='Lead Actor',base=90000),dict(id='vfx_artist',name='VFX Artist',base=65000),dict(id='composer',name='Composer',base=55000),dict(id='producer',name='Producer / Marketing',base=60000)]
film_ar = dict(gameplay='writer',graphics='actor',sound='vfx_artist',story='composer',polish='producer')
def plat(rows): return [dict(id=a,name=b,reach=c,feeFrac=e) for a,b,c,e in rows]
mt['film'].update(sector='media', unit='tickets', studioShare=0.5, tiers=film_t, roles=film_roles, areaRoles=film_ar,
    platforms=plat([('p_multiplex','Multiplex Chain',1.2,0.04),('p_arthouse','Art-house Circuit',0.6,0.0),('p_stream','StreamFlix (fict.)',0.9,0.0),('p_imax','GrandScreen',1.4,0.05)]),
    engineLabel='Production Tech', engines=[
      dict(id='e_basic',name='Digital Cameras',cost=0,qualityBonus=0.0,speedMult=1.0,minFame=0),
      dict(id='e_cine',name='Cinema Rigs',cost=300000,qualityBonus=0.5,speedMult=0.95,minFame=0),
      dict(id='e_virtual',name='Virtual Production Stage',cost=3000000,qualityBonus=1.2,speedMult=0.88,minFame=35)])
tv = mt['tv']
tv.update(sector='media', unit='viewers', studioShare=0.6, tiers=tv_t, roles=film_roles, areaRoles=film_ar,
    platforms=tv['platforms'], engineLabel='Production Tech', episodeOptions=[6,10,13,22],
    engines=[dict(id='e_basic',name='Standard Studio Lot',cost=0,qualityBonus=0.0,speedMult=1.0,minFame=0),
             dict(id='e_set',name='Streaming-grade Sets',cost=250000,qualityBonus=0.5,speedMult=0.95,minFame=0),
             dict(id='e_virtual',name='Virtual Set Volume',cost=2000000,qualityBonus=1.1,speedMult=0.88,minFame=35)])
for p in tv['platforms']: p.update(reach=dict(n_one=0.8,n_prime=1.2,n_cable=0.7,n_stream=1.0)[p['id']], feeFrac=0.0)
# TV formats: live action / animation / anime. Override labels (+ cost & difficulty multipliers). Anime labels come from Game dev's "anime" media.
tv['formats'] = {
  'live': dict(label='Live action', costMult=1.0, difficultyMult=1.0),
  'animation': dict(label='Animation', costMult=0.9, difficultyMult=1.1,
       areas=[dict(id='gameplay',label='Script',icon='📜'),dict(id='graphics',label='Voice Cast',icon='🎙️'),dict(id='sound',label='Animation',icon='🎞️'),dict(id='story',label='Music',icon='🎼'),dict(id='polish',label='Marketing',icon='📣')],
       genreLabels=dict(action='Action-Toon',rpg='Fantasy Saga',puzzle='Mystery Toon',sim='Family Sitcom',adventure='Adventure',strategy='Satire',sports='Sports',horror='Spooky'),
       themeLabels=anime['themeLabels'] | dict(space='Space',pirates='Seafaring',cyber='Tech',school='School'),
       roleNames=dict(actor='Voice Lead',vfx_artist='Animator'),
       platforms=[dict(id='n_kids',name='KidsNet',reach=0.9,feeFrac=0),dict(id='n_prime',name='Primetime 9',reach=1.2,feeFrac=0),dict(id='n_stream',name='StreamBox',reach=1.0,feeFrac=0)]),
  'anime': dict(label='Anime', costMult=0.85, difficultyMult=1.15, areas=anime['areas'], genreLabels=anime['genreLabels'], themeLabels=anime['themeLabels'],
       roleNames=dict(actor='Voice Actor',vfx_artist='Key Animator'),
       platforms=[dict(id=p['id'],name=p['name'],reach=r,feeFrac=0) for p,r in zip(anime['platforms'],[0.7,1.2,1.0,1.1])]) }
tv['renewal'] = dict(renewScore=6.5, chanceScore=5.0, fatigue=0.15, carryHype=0.35, carryRatings=0.5)
# specialists
for s in d['specialists']: s.update(media=['game'], minFame=0)
for s in d['specialists']:
    if s['id']=='s_design': s['minFame']=10
    if s['id']=='s_tech': s['minFame']=20
def sp(i,n,role,ic,ab,sal,tr,bio,media,fame): return dict(id=i,name=n,role=role,icon=ic,areaBonus=ab,salaryPerTurn=sal,traits=tr,bio=bio,media=media,minFame=fame)
d['specialists'] += [
 sp('s_scribe','Odile Park','Screenwriter','📝',dict(gameplay=1.2,story=0.3),2400,['Wordy','Visionary'],'Dialogue that gets quoted.',['film','tv'],0),
 sp('s_pr','Bea Calloway','Publicist','📣',dict(polish=1.3),2100,['Trendy'],'Turns premieres into events.',['film','tv'],10),
 sp('s_vfx','Kiri Tan','VFX Supervisor','💥',dict(sound=1.2,polish=0.3),3000,['Slow','Perfectionist'],'Invisible effects.',['film'],15),
 sp('s_maestro','Anselm Rook','Composer','🎼',dict(story=1.2),2600,['Moody'],'Themes you hum for years.',['film','tv'],20),
 sp('s_showrunner','Ravi Menon','Showrunner','🎬',dict(gameplay=0.8,polish=0.6),3000,['Fast'],'Keeps a writers room on schedule.',['tv'],25),
 sp('s_sensei','Haru Ito','Animation Director','🎞️',dict(sound=1.3,graphics=0.4),3200,['Perfectionist'],'Every frame hand-checked.',['tv'],25),
 sp('s_star','Dante Vale','Star Actor','🌟',dict(graphics=1.4),6000,['Trendy'],'Opens a film by name alone.',['film','tv'],30),
 sp('s_auteur','Vesper Lang','Legendary Auteur','🏆',dict(gameplay=1.0,graphics=0.8,story=0.8),9000,['Visionary','Perfectionist'],'Awards-season royalty.',['film','tv','game'],60),
 sp('s_legend','Zed Quartermain','Industry Legend','👑',dict(gameplay=0.7,graphics=0.7,sound=0.5,story=0.5,polish=0.7),8000,['Fast','Visionary'],'Shipped a dozen classics.',['game'],50)]
# audience
gf = lambda **k: k
d['audiences'] = [
 dict(id='everyone',name='Everyone',icon='👪',salesMult=1.0,genreFit={}),
 dict(id='kids',name='Kids',icon='🧒',salesMult=0.85,genreFit=gf(horror=0.5,action=0.9,puzzle=1.2,sim=1.1,adventure=1.15)),
 dict(id='teen',name='Teens',icon='🧑',salesMult=1.05,genreFit=gf(action=1.1,sports=1.1,horror=1.1)),
 dict(id='mature',name='Mature',icon='🧔',salesMult=0.95,genreFit=gf(horror=1.2,strategy=1.1,rpg=1.1,puzzle=0.9,sim=0.95))]
d['nameGen'] = dict(adjectives=['Crimson','Silent','Last','Neon','Hidden','Iron','Lost','Golden','Wild','Midnight','Broken','Eternal'],
    nouns=['Dragon','Harbor','Signal','Garden','Empire','Frontier','Legacy','Horizon','Tide','Vault','Echo','Odyssey'],
    patterns=['{adj} {noun}','The {adj} {noun}','{noun} of {noun2}','{adj} {noun}: Reborn','Project {noun}'])
d['fameTiers'] = [dict(min=0,label='Unknown',dealMult=1.0),dict(min=15,label='Rising Name',dealMult=1.05),dict(min=35,label='Industry Player',dealMult=1.12),
                  dict(min=60,label='Household Name',dealMult=1.2),dict(min=85,label='Legend',dealMult=1.3)]
W = d['balance']['weights']; W.update(skill=5.0, skillNeutral=0.4, hardware=1.2, sequel=0.15)
d['balance']['sensation'] = dict(base=0.005, qualityRef=7.5, qualityWeight=0.2, hypeWeight=0.05, trendWeight=0.06, shareWeight=0.06, salesMultMin=2.5, salesMultMax=5.0, fameBase=8, fameScale=4, max=0.7, fameDecayPerYear=2, stockShock=0.25)
d['balance']['consoles'] = dict(startPower=85, powerLossPerYear=6, refreshChancePerYear=0.12, refreshPower=90, refreshMindBoost=1.3, driftPersist=0.6, driftNoise=0.05, mindNoise=0.1, shareExponent=1.0)
for c in d['consoles']:
    sh = d['consoleShare']['share'][c['id']]; c['share0'] = sh[0]; c['drift0'] = round((sh[-1]/sh[0]) ** (1/(len(sh)-1)) - 1, 4)
    c['age0'] = {'c_nova':4,'c_aegis':3,'c_lumen':1,'c_pixie':0}[c['id']]
d['marketing'] = [dict(id='none',name='None',costFrac=0.0,hype=0),dict(id='std',name='Standard',costFrac=0.06,hype=15),dict(id='blitz',name='Blitz',costFrac=0.15,hype=35)]
d['sequel'] = dict(minReleases=1)
d['sampleHistory'] = []
json.dump(d, open('data/studio_data.json','w'), ensure_ascii=False, indent=1)
print('wrote data/studio_data.json', len(json.dumps(d)))
