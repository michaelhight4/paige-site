import json,os,glob,datetime
from PIL import Image
P='/workspace/kilumen/art/characters/pixel/'; N=P+'npcs/'
cast=json.load(open(N+'_tools/cast.json'))['cast']; cls={c['id']:c for c in cast}
PAL={tuple(int(h[i:i+2],16) for i in (0,2,4)) for h in open('/workspace/kilumen/art/world/overworld/palette.hex').read().split() if len(h.strip('#'))==6 for h in [h.strip('#')]}
def sheets(pid,root='npcs'):
    b=f'{root}/{pid}/'; o={'overworld_sheet':b+f'overworld/{pid}_chibi_sheet.png','overworld_sheet_2x':b+f'overworld/{pid}_chibi_sheet_2x.png','overworld_sheet_3x':b+f'overworld/{pid}_chibi_sheet_3x.png','overworld_frames_dir':b+f'overworld/{pid}_chibi/'}
    if os.path.exists(P+b+'trainer'):
        o['trainer_64x128']=b+f'trainer/{pid}_trainer_64x128.png'
        o['portraits']={os.path.basename(f)[len(pid)+1:-4]:f[len(P):] for f in sorted(glob.glob(P+b+f'portraits/{pid}_*.png'))}
    return o
def ent(pid,note=None,alt=None,root='npcs'):
    e={'sprite_id':pid,'class':cls[pid]['class'] if pid in cls else 'main cast',**sheets(pid,root)}
    if alt: e['alt_sprite_id']=alt
    if note: e['note']=note
    return e
M={
 'brookhollow.villager_garden':ent('vil_gardener_f'),
 'brookhollow.fisher':ent('vil_fisher_m'),
 'brookhollow.kid':ent('vil_kid_m'),
 'brookhollow.rt_guard_east':ent('vil_guard_m'),
 'house_1f.ron':ent('ron',root='humans',note='existing main-cast sheet'),
 'office_int.receptionist':ent('vil_receptionist_f'),
 'office_int.manager':ent('vil_manager_m'),
 'office_int.coworker':ent('vil_office_m'),
 'heal_centre_int.healer':ent('vil_healer_f'),
 'shop_int.clerk':ent('vil_shopkeeper_m'),
 'house_int_a.cook':ent('vil_cook_f'),
 'house_int_b.scholar':ent('vil_scholar_m'),
 'house_int_c.kid_c':ent('vil_kid_m_b',note="line says he can't beat his sister: vil_kid_f_b is available if a sister NPC is added"),
 'house_int_c.parent_c':ent('vil_parent_m'),
 'route1.trainer_r1_a':ent('tr_youngster_m'),
 'route1.trainer_r1_b':ent('tr_lass_f'),
 'route1.trainer_r1_c':ent('tr_camper_f'),
 'fernwick.ron_rival_1':ent('ron',root='humans',note='existing main-cast sheet'),
 'fernwick.villager_f1':ent('vil_courier_f'),
 'fernwick.elder':ent('vil_elder_m',alt='vil_elder_f',note='gender not fixed by the text; elder_f (cane) is the alternative'),
 'fernwick_hall_int.helper_1':ent('tr_gymtrainer_m'),
 'fernwick_hall_int.helper_2':ent('tr_gymtrainer_f'),
 'fernwick_hall_int.master_fernwick':ent('tr_master_fernwick_m'),
 'fernwick_hall_int.guide':ent('vil_gardener_f_b',note='non-battling hall guide; reuse of the farmer swap'),
 'thornwood.trainer_tw_bug':ent('tr_bugcatcher_f'),
 'thornwood.trainer_tw_b':ent('tr_ranger_m'),
 'thornwood.dissident_hint':ent('vil_dissident_m'),
 'greystone_entrance.hiker':ent('tr_hiker_m'),
 'greystone_b1.hiker_b1':ent('tr_hiker_f'),
 'station_int.station_clerk':ent('vil_receptionist_f_b'),
 'station_int.station_traveller':ent('vil_office_m_b'),
 'station_int.restricted_airspace_officer':ent('vil_officer_f',note='optional: the restricted_airspace spot is a sign; use only if an officer NPC stands beside it'),
 'mirefen_bog.mirefen_angler':ent('vil_fisher_m',note='reuse of the Brookhollow fisher; different map'),
 'lantern_rest.keeper':ent('vil_elder_f'),
 'unplaced.lucky_crystal_seller':ent('vil_guard_m_b',note='PLACEHOLDER reuse (navy+gold attendant swap); a dedicated huckster design is recommended'),
}
spare=['vil_kid_f','vil_kid_f_b','vil_worker_f','tr_swimmer_m','tr_swimmer_f','tr_scientist_m','tr_scientist_f','tr_master_saltmere_f']
out={'_meta':{'generated':datetime.datetime.now().strftime('%Y-%m-%d %H:%M CDT'),'status':'DRAFT - not approved; awaiting Gary','source':'text/overworld_lines.json v0.4.0 maps.* + unplaced_npcs','paths':'relative to art/characters/pixel/','key':'<map_id>.<spot_id>'},
     'map':M,'unassigned_ready':{p:ent(p) for p in spare}}
json.dump(out,open(N+'npc_sprite_map.json','w'),indent=1)
# manifest + palette check
files={};off_total=0;semi=0
for c in cast:
    pid=c['id'];L=[]
    for f in sorted(glob.glob(N+pid+'/**/*',recursive=True)):
        if os.path.isdir(f): continue
        im=Image.open(f); e={'path':f[len(P):],'bytes':os.path.getsize(f),'size':list(im.size)}
        if f.endswith('.png') and '/portraits/' not in f:
            a=im.convert('RGBA'); px=list(a.getdata())
            off=sum(1 for p in px if p[3]==255 and p[:3] not in PAL); sa=sum(1 for p in px if 0<p[3]<255)
            off_total+=off; semi+=sa
        L.append(e)
    files[pid]={'kind':c['kind'],'class':c['class'],'files':L}
man={'generated':datetime.datetime.now().strftime('%Y-%m-%d %H:%M CDT'),'status':'DRAFT - not approved; awaiting Gary',
 'scope':f"{sum(c['kind']=='villager' for c in cast)} villagers + {sum(c['kind']=='trainer' for c in cast)} trainers",
 'palette':'/workspace/kilumen/art/world/overworld/palette.hex (official 64 colours)',
 'palette_check':{'off_palette_opaque_pixels':off_total,'semi_alpha_pixels':semi,'scope':'all sprite PNGs (overworld + trainer); portraits are painted and exempt like humans/*/portraits'},
 'previews':['npcs/_preview/'+os.path.basename(f) for f in sorted(glob.glob(N+'_preview/*'))],
 'sprite_map':'npcs/npc_sprite_map.json','npcs':files}
json.dump(man,open(N+'manifest.json','w'),indent=1)
print('off',off_total,'semi',semi,'files',sum(len(v['files']) for v in files.values()),'mapped',len(M))
