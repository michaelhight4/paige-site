CFG={}
N='npcs/%s/trainer/%s_trainer_64x128.png'
FRONT_NOTE=("Front view: extend arm = the arm on the SCREEN-LEFT side of the image (anatomically the trainer's own RIGHT arm); "
            "it reaches toward screen-left / the player side.")
BACK_NOTE=("Back view: extend arm = the player's own RIGHT arm, on the SCREEN-RIGHT side of the image; it reaches up-right toward the foe.")
CFG['cal']=dict(src='humans/cal/overworld/cal_chibi/cal_chibi_up_stand.png',view='back',side='screen_right',arm_used='own_right (screen-right, back view)',
  ext=dict(poly=[(40,38),(44,37),(47,40),(49,45),(50,52),(50,68),(46,68),(46,56),(43,56),(43,46),(41,42)],keep_y=38,keep_poly=[(36,36),(44,36),(45,40),(43,44),(42,46)]),
  rel=dict(poly=[(9,38),(17,36),(21,40),(20,46),(20,69),(9,69)],keep_y=42),
  shoulder=[44,41],elbow=[45,50],wrist=[46,57],hand=[46,62],notes=BACK_NOTE)
CFG['tr_hiker_m']=dict(src=N%('tr_hiker_m','tr_hiker_m'),view='front',side='screen_left',arm_used='screen-left arm (trainer own right)',
  ext=dict(poly=[(0,37),(12,36),(14,40),(14,74),(12,76),(11,86),(0,86)],keep_y=38,keep_poly=[(9,36),(15,36),(15,47),(12,47)]),
  rel=dict(poly=[(49,36),(64,36),(64,86),(52,86),(51,76),(49,74),(50,40)],keep_y=38,keep_poly=[(48,36),(54,36),(51,47),(48,47)]),
  shoulder=[11,44],elbow=[9,59],wrist=[8,73],hand=[8,78],notes=FRONT_NOTE)

# ---- remaining characters: arm regions start from the v1 erase polygons (which outline each hanging arm), then per-sprite fixes ----
import sys as _s
_s.path.insert(0,'/workspace/kilumen/art/characters/pixel/capture_poses/_tools')
from configs import CFG as V1
def _keep(S,side):
    x,y=S
    if side=='L': return [(x-2,y-8),(x+4,y-8),(x+4,y+3),(x+1,y+3)]
    return [(x+2,y-8),(x-4,y-8),(x-4,y+3),(x-1,y+3)]
def auto(cid,view,ext_poly,rel_poly,S,Srel,ext_extra={},rel_extra={},**kw):
    side='screen_left' if view=='front' else 'screen_right'
    es,rs=('L','R') if view=='front' else ('R','L')
    ky=lambda p:min(q[1] for q in p)
    ext=dict(poly=ext_poly,keep_y=ky(ext_poly),keep_poly=_keep(S,es)); ext.update(ext_extra)
    rel=dict(poly=rel_poly,keep_y=ky(rel_poly),keep_poly=_keep(Srel,rs)); rel.update(rel_extra)
    CFG[cid]=dict(src=V1[cid]['src'],view=view,side=side,
       arm_used='screen-left arm (trainer own right)' if view=='front' else 'own_right (screen-right, back view)',
       ext=ext,rel=rel,shoulder=list(S),notes=FRONT_NOTE if view=='front' else BACK_NOTE,**kw)
def frontv1(cid,**kw):
    v=V1[cid]; SL=v['frames']['hold']['L'][0]; SR=v['frames']['hold']['R'][0]
    ee=dict(kw.pop('ext_extra',{})); re_=dict(kw.pop('rel_extra',{}))
    if v.get('fill'):
        for p in v['fill']:
            (ee if max(q[0] for q in p)<32 else re_).setdefault('v1fill',[]).append(p)
    for p,mx in v.get('mfill',[]):
        (ee if max(q[0] for q in p)<32 else re_).setdefault('mfill',[]).append((p,mx))
    auto(cid,'front',kw.pop('ext_poly',v['erase'][0]),kw.pop('rel_poly',v['erase'][1]),SL,SR,ee,re_,**kw)
for k in sorted(V1):
    if k.startswith('tr_') and k!='tr_hiker_m': frontv1(k)
auto('mira','back',V1['mira']['erase'][1],V1['mira']['erase'][0],(43,45),(20,45))
