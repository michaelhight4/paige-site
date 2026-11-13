# Hand-traced arm regions (row-wise inner boundary, inclusive) for the 15 non-pilot sprites. Overrides rcfg auto entries.
from rcfg import CFG, V1, _keep, FRONT_NOTE, BACK_NOTE
def bpoly(side,pts,W=64):
    """pts: [(y, x_inner_inclusive)] top->bottom. side 'L' = arm on screen-left (poly runs to x=0)."""
    ex=0 if side=='L' else W-1
    return [(ex,pts[0][0])]+[(x,y) for y,x in pts]+[(ex,pts[-1][0])]
def mirror(pts,s=63): return [(y,s-x) for y,x in pts]
def _k5(S):
    return None   # no stub: torso keeps its own side edge (seam re-outlined); shoulder cap rows above the cut stay in body
def arm(side,pts,S,**kw):
    d=dict(poly=bpoly(side,pts),keep_y=pts[0][0],keep_poly=_k5(S)); d.update(kw); return d
def front(cid,L,SL,R=None,SR=None,ms=63,ext_kw={},rel_kw={},**kw):
    R=R if R is not None else mirror(L,ms); SR=SR or (ms-SL[0],SL[1])
    CFG[cid]=dict(src=V1[cid]['src'],view='front',side='screen_left',arm_used='screen-left arm (trainer own right)',
        ext=arm('L',L,SL,**ext_kw),rel=arm('R',R,SR,**rel_kw) if not isinstance(R,dict) else R,shoulder=list(SL),notes=FRONT_NOTE,**kw)
def v1rel(cid,SR):
    """relaxed arm region + body fill straight from the v1 erase/fill polygons (bent hip arms)"""
    v=V1[cid]; d=dict(poly=v['erase'][1],keep_y=min(q[1] for q in v['erase'][1]),keep_poly=_k5(SR))
    f=[p for p in v.get('fill',[]) if max(q[0] for q in p)>=32]
    if f: d['v1fill']=f
    m=[(p,mx) for p,mx in v.get('mfill',[]) if max(q[0] for q in p)>=32]
    if m: d['mfill']=m
    return d
# mira (back view): extend = screen-right arm
_mr=[(40,41),(44,42),(48,43),(56,43),(57,45),(68,45)]
CFG['mira']=dict(src=V1['mira']['src'],view='back',side='screen_right',arm_used='own_right (screen-right, back view)',
    ext=arm('R',_mr,(44,44)),rel=arm('L',mirror(_mr,62),(18,44)),shoulder=[44,44],notes=BACK_NOTE)
front('tr_bugcatcher_f',[(55,24),(61,24),(62,23),(82,23),(83,22),(90,21)],(21,59),ms=62)
front('tr_camper_f',[(43,20),(73,20),(74,19),(81,19)],(18,46))
front('tr_gymtrainer_f',[(38,20),(47,20),(50,18),(61,18),(62,17),(77,17)],(17,41),R=[(38,43),(70,43),(71,44),(77,44)],SR=(46,41))
front('tr_gymtrainer_m',[(38,14),(55,14),(56,15),(73,15)],(11,41))
front('tr_hiker_f',[(32,22),(38,21),(61,21)],(20,36),R=[(34,46),(50,47),(77,47)],SR=(46,37),
      prop_rects=[(8,60,13,127),(10,48,11,50)])  # trekking pole removed (blocks the arm)
front('tr_lass_f',[(62,19),(76,19),(77,18),(88,18)],(17,63),ms=62)
front('tr_master_fernwick_m',[(44,12),(84,12)],(10,48),R=[(44,51),(84,51)])
front('tr_master_saltmere_f',[(33,16),(50,15),(58,14),(62,13),(78,13)],(14,36))
front('tr_ranger_m',[(33,17),(45,16),(55,15),(60,14),(66,13),(80,13)],(14,37))
front('tr_scientist_f',[(30,21),(40,19),(50,17),(60,15),(66,14),(70,14)],(18,34),
      prop_rects=[(6,71,14,73),(6,74,13,80),(9,70,9,70)],prep=[(10,70,'ink'),(11,70,'ink'),(12,70,'ink'),(13,70,'ink'),(14,70,None)])  # handheld scanner removed
front('tr_scientist_m',[(30,18),(60,17),(79,17),(80,16),(81,16)],(16,34))
front('tr_swimmer_f',[(30,21),(57,21),(58,20),(60,19),(62,18),(78,18)],(18,34),
      R=[(30,43),(46,43),(46.5,41),(55,41),(55.5,42),(58,42),(58.5,43),(62,43),(63,45),(78,45)],SR=(45,34))  # arm inner outlines go with the arms
front('tr_swimmer_m',[(30,17),(48,17),(60,16),(66,16),(66.5,14),(80,14)],(15,34))
front('tr_youngster_m',[(60,22),(70,22),(80,21),(93,20)],(20,63))
for k,s in (('tr_master_saltmere_f',(47,36)),('tr_ranger_m',(49,36)),('tr_scientist_f',(47,36)),('tr_swimmer_m',(48,36))):
    CFG[k]['rel']=v1rel(k,s)

for k,n in (('tr_hiker_f','Prop removed: trekking pole (x8-13,y60-127 and its tip above the hand).'),
            ('tr_scientist_f','Prop removed: handheld scanner (x6-14,y70-80); hand closed with a 1px outline at y70.')):
    CFG[k]['notes']=CFG[k]['notes']+' '+n
CFG['tr_ranger_m']['rel']=dict(poly=[(44,34),(63,34),(63,66),(38,66),(37,58),(42,54),(42,42)],keep_y=34,keep_poly=_k5((49,37)))  # torso edge already drawn at x40-41: no fill

for _k in CFG:
    if _k not in ('cal','tr_hiker_m'): CFG[_k]['despeckle']=True
