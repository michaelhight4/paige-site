# Builds DEX_450.json/.md from chunkNN.py files (DRAFT, awaiting Gary). Design data only; no game code touched.
import json, glob, re, importlib.util, collections, datetime
OUT='/workspace/kilumen/design/DEX_450'
ZONES=[('brookhollow','Brookhollow (river, start town)','2-5',None),
('route1','Route 1 (meadow grass; storm floods)','2-6','sunmeadow_grass'),
('fernwick','Fernwick (fern town, pond, gardens)','5-9',None),
('thornwood','Thornwood (forest, forced grass)','9-13','thornwood_grass'),
('route_east','Route East (Brookhollow east road)','12-16',None),
('aurelith','Aurelith (capital; rail only)','14-18',None),
('saltmere','Saltmere (harbour town, causeway, beach)','16-22',None),
('route_revival','Route Revival (Thornwood east)','18-23',None),
('revival_heights','Revival Heights (RT city, labs)','20-25',None),
('greystone','Greystone Caverns + B1 (glowfern)','20-27','greystone_glowfern'),
('frostspire_pass','Frostspire Pass (rope bridge, snowline)','24-29',None),
('frostspire','Frostspire (mountain town, peaks)','26-31',None),
('route1_east','Route 1 East (crystal ridge)','28-32',None),
('sunmeadow','Sunmeadow (open uplands)','29-34',None),
('mirefen_bog','Mirefen (bog, fog, Tideglide water)','33-39','mirefen_grass_w/ne/s, mirefen_bog_surf'),
('coast_road','Coast Road (storm-flooded)','36-41',None),
('tidewater_coast','Tidewater Coast (cliffs, reefs)','38-44',None),
('lanternport','Lanternport (lighthouse port)','42-47',None),
('cindervale_road','Cindervale Road (giant\'s road)','45-50',None),
('cindervale','Cindervale (volcanic forge valley)','47-53',None),
('postgame','Post-game (Aurelith arena, hidden places)','50+',None)]
ZI={z[0]:i for i,z in enumerate(ZONES)}
TYPES_MAIN=['earth','fire','water','grass','wind','light','dark','mystic']
TYPES_SUB=['angelic','bird','bug','demon','devil','dragos','freshwater','ghost','god','legendary','magma','rain','sea','spirit','swamp']
SIZES={'small':'small (~64 px in a 128 battle frame)','medium':'medium (~96 px)','large':'large (fills 128 px)','huge':'huge (160 px final frame)'}
BUMP={'common':'uncommon','uncommon':'rare','rare':'rare','legendary':'legendary'}
fams=[]
def L(zone,rarity,types,palette,crystal,*stages,existing=False,note=None):
    fams.append(dict(zone=zone,rarity=rarity,types=types,palette=palette,crystal=crystal,stages=stages,existing=existing,note=note))
def build():
    for f in sorted(glob.glob('chunk*.py')):
        src=open(f).read(); exec(compile(src,f,'exec'),{'L':L})
    entries=[];n=0
    for fam in fams:
        prev=None; line_ids=[s[0].lower() for s in fam['stages']]
        for i,s in enumerate(fam['stages']):
            name,size,look,persona,method=s[:5]; types=s[5] if len(s)>5 else fam['types']
            n+=1; r=fam['rarity']
            for _ in range(i): r=BUMP[r]
            e=dict(dex_no=n,id=name.lower(),name=name,types=types,
              evolution=dict(stage=i+1,line_length=len(line_ids),line=line_ids,evolves_from=prev,method=method,evolves_to=line_ids[i+1] if i+1<len(line_ids) else None),
              first_zone=fam['zone'],rarity=r,size_class=size,
              visual_brief=f"{look}. Palette: {fam['palette']}. Crystal: {fam['crystal']}.",
              flavour=persona,existing_art=fam['existing'],status='draft')
            if fam['note']: e['note']=fam['note']
            entries.append(e); prev=name.lower()
    return entries
BLOCK=[r'\bPP\b',r'shiny',r'super effective',r'pok[eé]dex',r'pok[eé] ball',r'gotcha!',r'nurse']
BLOCK_I=[r'\bbeer',r'\bwine',r'\bale\b',r'\bbrew',r'whisk(e)?y',r'\bvodka',r'\brum\b',r'\bdrunk',r'booze',r'tavern',r'\bpub\b',r'smok',r'cigar',r'tobacco',r'\bpipe\b',r'\bdrug',r'\bpills?\b',r'\bweed\b',r'opium',r'poppy',r'hookah',r'tipsy',r'liquor',r'cocktail',r'\bbar\b']
def lev(a,b):
    p=list(range(len(b)+1))
    for i,ca in enumerate(a,1):
        c=[i]
        for j,cb in enumerate(b,1): c.append(min(p[j]+1,c[j-1]+1,p[j-1]+(ca!=cb)))
        p=c
    return p[-1]
def validate(E):
    msgs=[]
    names=[e['id'] for e in E]; nums=[e['dex_no'] for e in E]
    dn=[k for k,v in collections.Counter(names).items() if v>1]; dd=[k for k,v in collections.Counter(nums).items() if v>1]
    msgs.append(f"- Unique names: {'PASS' if not dn else 'FAIL '+str(dn)} ({len(set(names))} names)")
    msgs.append(f"- Unique dex numbers, contiguous 1..{len(E)}: {'PASS' if not dd and sorted(nums)==list(range(1,len(E)+1)) else 'FAIL'}")
    ids=set(names); bad=[e['id'] for e in E if e['evolution']['evolves_from'] and e['evolution']['evolves_from'] not in ids]
    order=[e['id'] for e in E if e['evolution']['evolves_from'] and names.index(e['evolution']['evolves_from'])>names.index(e['id'])]
    msgs.append(f"- Every evolves_from exists: {'PASS' if not bad else 'FAIL '+str(bad)}; pre-evolution listed earlier: {'PASS' if not order else 'FAIL '+str(order)}")
    badt=[e['id'] for e in E if e['types'][0] not in TYPES_MAIN+TYPES_SUB or any(t not in TYPES_MAIN+TYPES_SUB for t in e['types'])]
    msgs.append(f"- Every type is in elements.js (minus 'normal'): {'PASS' if not badt else 'FAIL '+str(badt)}")
    txt=json.dumps(E,ensure_ascii=False)
    hits=[p for p in BLOCK if re.search(p,txt,0 if p.startswith(r'\bPP') else re.I)]+[p for p in BLOCK_I if re.search(p,txt,re.I)]
    msgs.append(f"- Blocked words / alcohol, drug, smoking terms: {'PASS (none found)' if not hits else 'FAIL '+str(hits)}")
    poke=[r['name'].replace('-','') for r in json.load(open('poke.json'))['results']]
    digi=[d['name'].lower().replace(' ','').replace('-','') for d in json.load(open('digi.json'))]
    ref=set(poke+digi); close=[]
    for e in E:
        nm=e['id']
        for r in ref:
            if nm==r or (len(nm)>=5 and lev(nm,r)<=2): close.append(f"{e['name']}~{r}"+(' (existing name, kept)' if e['existing_art'] else ''))
    msgs.append(f"- Name collision check vs 1,025 Pokémon species + 209 Digimon (exact or edit distance <=2): {'PASS (none)' if not close else 'CHECK '+', '.join(close)}")
    return msgs,close
def write(E,phase):
    msgs,close=validate(E)
    meta=dict(title='Kilumen creature design sheet (Kilindex 450)',status='DRAFT (awaiting Gary)',generated=datetime.datetime.now().strftime('%Y-%m-%d %H:%M CT'),
      progress=f"{len(E)} of 450 written ({phase})",
      rules=['Original designs only; Pokemon is structure reference only.','Every creature carries a violet dominance crystal; Cosmic variants recolour the body only and keep violet crystals.','Variants (Large/Small/Enraged/Cosmic) are markers, not entries.','Attack effects belong to skills, not creatures.','Types: first = main element row, second = sub-element (DD 8 main + 15 sub). normal is not used for creatures.'],
      zones_story_order=[dict(id=z,name=nm,wild_levels=lv,encounter_zone=ez) for z,nm,lv,ez in ZONES],size_classes=SIZES)
    json.dump(dict(meta=meta,creatures=E),open(OUT+'.json','w'),indent=1,ensure_ascii=False)
    tc=collections.Counter(); pc=collections.Counter(); lens=collections.Counter(); rar=collections.Counter()
    for e in E:
        for t in e['types']: tc[t]+=1
        pc[e['types'][0]]+=1; rar[e['rarity']]+=1
        if e['evolution']['stage']==1: lens[e['evolution']['line_length']]+=1
    md=[f"# Kilumen creature design sheet — DEX 450\n\n**DRAFT (awaiting Gary).** {meta['progress']}. Generated {meta['generated']}. Machine copy: `DEX_450.json`.\n",
        "Story order: dex numbers run in the order the player meets each zone (CRITICAL_PATH.md). Existing 16 creatures keep their names, types and art (marked ★). Lines are listed together; evolutions sit right after their pre-evolution.\n",
        "Rules: original designs; every creature has a violet dominance crystal (Cosmic variants keep violet crystals); attack effects belong to skills; variants are not entries. Size classes: "+'; '.join(f"**{k}** {v}" for k,v in SIZES.items())+".\n"]
    cur=None
    for e in E:
        if e['first_zone']!=cur:
            cur=e['first_zone']; z=ZONES[ZI[cur]]
            md.append(f"\n## {z[1]} — wild Lv {z[2]}"+(f" (encounter zone `{z[3]}`)" if z[3] else '')+"\n\n| # | Name | Type | Evolution | Rarity | Size | Visual brief | Flavour |\n|---|---|---|---|---|---|---|---|")
        ev=e['evolution']
        evs='single' if ev['line_length']==1 else f"{ev['stage']}/{ev['line_length']}"+(f" from {ev['evolves_from'].title()} ({ev['method']})" if ev['evolves_from'] else ' (base)')
        md.append(f"| {e['dex_no']:03d} | {e['name']}{' ★' if e['existing_art'] else ''} | {' / '.join(t.title() for t in e['types'])} | {evs} | {e['rarity']} | {e['size_class']} | {e['visual_brief']} | {e['flavour']}{(' *Note: '+e['note']+'*') if e.get('note') else ''} |")
    md.append("\n## Validation\n")
    md+=msgs
    md.append(f"\n- Lines by length (counted at stage 1): single {lens[1]}, 2-stage {lens[2]}, 3-stage {lens[3]} → creatures in single-stage: {lens[1]} of {len(E)} ({100*lens[1]//max(1,len(E))}%)")
    md.append(f"- Rarity: "+', '.join(f"{k} {v}" for k,v in rar.most_common()))
    md.append("\n### Type count (any slot / as main slot)\n\n| Type | Any slot | Main slot |\n|---|---|---|")
    for t in TYPES_MAIN+TYPES_SUB: md.append(f"| {t} | {tc[t]} | {pc[t]} |")
    open(OUT+'.md','w').write('\n'.join(md)+'\n')
    print(len(E),'entries;',*msgs,sep='\n')
if __name__=='__main__':
    import sys; E=build(); write(E,sys.argv[1] if len(sys.argv)>1 else 'in progress')
