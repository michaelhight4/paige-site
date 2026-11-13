# Per-sprite capture-pose edit configs. Coordinates are native sprite pixels (x,y).
# erase: polygons of the hanging arms/props removed; fill: parts of those polygons that are body
# behind the arm (refilled by mirroring the neighbouring body texture); frames: arm joints
# (shoulder, elbow, hand-centre) per frame.
CFG={}
N='npcs/%s/trainer/%s_trainer_64x128.png'
WRAP=(['ecdec4','ccc6c2','a8a0a4'],3)
def tr(sid,SL,SR,hy,cx=31.5,el_up=10,el_out=4,raise_dy=14,raise_hy=None,**kw):
    raise_hy=SL[1]+1 if raise_hy is None else raise_hy
    fr={'raise':dict(L=(SL,(SL[0]-el_out,SL[1]+raise_dy),(cx-3.5,raise_hy)),R=(SR,(SR[0]+el_out,SR[1]+raise_dy),(cx+3.5,raise_hy))),
        'hold':dict(L=(SL,(SL[0]-el_out,hy+el_up),(cx-3.5,hy)),R=(SR,(SR[0]+el_out,hy+el_up),(cx+3.5,hy)))}
    fr.update(kw.pop('frames',{}))
    CFG[sid]=dict(src=N%(sid,sid),order=['raise','hold'],frames=fr,**kw)

tr('tr_gymtrainer_m',(13,36),(50,36),4,el_up=10,
  erase=[[(0,41),(15,41),(17,46),(17,68),(15,68),(15,78),(0,78)],[(64,41),(48,41),(46,46),(44,46),(44,68),(47,68),(47,78),(64,78)]],
  sleeve=['92623e','6a442e','6a3019'],skin=['e8ce92','deb478','ba8856'],sleeve_len=8,wrist=WRAP)
tr('tr_gymtrainer_f',(16,41),(46,41),4,
  erase=[[(0,44),(17,44),(19,48),(19,50),(22,50),(22,58),(19,58),(19,66),(17,70),(17,80),(0,80)],[(64,44),(46,44),(43,47),(43,58),(43,66),(45,70),(46,80),(64,80)]],
  fill=[[(19,50),(22,50),(22,58),(19,58)]],
  sleeve=['92623e','6a442e','462c22'],skin=['e8ce92','ccaa6e','87604d'],sleeve_len=7,wrist=WRAP,r_up=2.3,r_fore=2.0,r_hand=2.2)
tr('tr_camper_f',(17,46),(46,46),12,
  erase=[[(0,46),(18,46),(18,68),(17,68),(17,84),(0,84)],[(64,46),(45,46),(45,84),(64,84)]],
  sleeve=['e29d40','c46e2e','9f4013'],skin=['e8ce92','ccaa6e','92623e'],sleeve_len=16,r_up=2.4,r_fore=2.0,r_hand=2.2)

tr('tr_hiker_m',(15,40),(48,40),6,el_out=5,
  erase=[[(0,40),(15,40),(15,76),(12,76),(12,88),(0,88)],[(64,40),(49,40),(49,76),(52,76),(52,88),(64,88)]],
  sleeve=['e8ce92','ccaa6e','ba8856'],skin=['deb478','ba8856','92623e'],sleeve_len=99,r_up=3.6,r_fore=3.2,r_hand=2.8)
tr('tr_hiker_f',(19,36),(46,36),4,
  erase=[[(0,34),(20,34),(20,48),(25,48),(25,63),(15,63),(15,126),(8,126),(8,63),(0,63)],[(64,33),(47,33),(47,77),(64,77)]],
  fill=[[(19,48),(25,48),(25,63),(19,63)]],
  sleeve=['9f4013','6a3019','561c0e'],skin=['deb478','ccaa6e','ba8856'],hand=['deb478','ccaa6e','ba8856'],sleeve_len=99,r_up=2.6,r_fore=2.3,r_hand=2.3)
tr('tr_master_fernwick_m',(13,44),(50,44),4,el_out=5,
  erase=[[(0,46),(11,46),(11,88),(0,88)],[(64,46),(52,46),(52,88),(64,88)]],
  sleeve=['5e5866','54444e','3e3a48'],skin=['92623e','6a442e','462c22'],sleeve_len=99,r_up=3.0,r_fore=2.8,r_hand=2.5)
tr('tr_master_saltmere_f',(15,36),(47,36),4,
  erase=[[(0,34),(14,34),(14,77),(0,77)],[(64,34),(44,34),(44,42),(39,42),(39,51),(34,51),(34,59),(44,59),(44,64),(64,64)]],
  fill=[[(39,42),(44,42),(44,59),(34,59),(34,51),(39,51)]],
  sleeve=['1e4078','3e3a48','18382c'],skin=['deb478','ba8856','92623e'],sleeve_len=99,r_up=2.6,r_fore=2.3,r_hand=2.3)
tr('tr_ranger_m',(14,36),(49,36),4,
  erase=[[(0,36),(14,36),(15,80),(0,80)],[(64,36),(50,36),(50,42),(43,42),(43,59),(64,59)]],
  mfill=[([(43,42),(50,42),(50,59),(43,59)],31.5)],
  sleeve=['ba8856','87604d','6a442e'],skin=['92623e','6a442e','462c22'],sleeve_len=7,r_up=2.6,r_fore=2.3,r_hand=2.3)
tr('tr_scientist_f',(17,36),(47,36),4,
  erase=[[(0,32),(14,32),(14,62),(17,62),(17,82),(0,82)],[(64,32),(48,32),(48,41),(46,49),(35,49),(35,58),(64,58)]],
  fill=[[(14,62),(17,62),(17,82),(14,82)]],mfill=[([(35,49),(48,49),(48,58),(35,58)],(0,10))],
  sleeve=['fcf6e8','f4e2ff','a8a0a4'],skin=['deb478','ba8856','92623e'],sleeve_len=99,r_up=2.6,r_fore=2.4,r_hand=2.3)
tr('tr_scientist_m',(17,36),(47,36),4,
  erase=[[(0,33),(16,33),(16,67),(20,67),(20,80),(0,80)],[(64,33),(48,33),(48,67),(45,67),(45,80),(64,80)]],
  fill=[[(17,67),(20,67),(20,80),(17,80)],[(45,67),(48,67),(48,80),(45,80)]],
  sleeve=['fcf6e8','ccc6c2','a8a0a4'],skin=['e8ce92','ccaa6e','87604d'],cuff='246e6c',sleeve_len=99,r_up=2.8,r_fore=2.5,r_hand=2.3)
tr('tr_swimmer_f',(18,36),(45,36),4,
  erase=[[(0,36),(18,36),(18,80),(0,80)],[(64,36),(45,36),(45,80),(64,80)]],
  sleeve=['f08868','d05440','462c22'],skin=['e8ce92','ba8856','92623e'],sleeve_len=99,r_up=2.3,r_fore=2.0,r_hand=2.2)
tr('tr_swimmer_m',(15,36),(48,36),4,
  erase=[[(0,44),(15,44),(15,80),(0,80)],[(64,40),(48,40),(48,43),(44,43),(44,49),(41,49),(41,55),(35,55),(35,63),(41,63),(41,64),(64,64)]],
  mfill=[([(41,49),(44,49),(44,64),(41,64)],31.5),([(35,55),(41,55),(41,63),(35,63)],31.5)],
  sleeve=['1e4078','342842','29252b'],skin=['deb478','ba8856','92623e'],sleeve_len=6,r_up=2.6,r_fore=2.3,r_hand=2.3)
tr('tr_bugcatcher_f',(21,59),(43,59),25,el_out=6,
  erase=[[(0,62),(21,62),(21,90),(0,90)],[(64,62),(43,62),(43,90),(64,90)]],
  sleeve=['fcd668','e29d40','c46e2e'],skin=['deb478','ccaa6e','ba8856'],sleeve_len=5,r_up=2.2,r_fore=2.0,r_hand=2.2)
tr('tr_lass_f',(19,62),(44,62),25,el_out=6,
  erase=[[(0,63),(17,63),(17,90),(0,90)],[(64,63),(46,63),(46,90),(64,90)]],
  sleeve=['fcf6e8','f8eabe','ecdec4'],skin=['e8ce92','deb478','ba8856'],sleeve_len=0.62,r_up=2.2,r_fore=2.0,r_hand=2.2)
tr('tr_youngster_m',(19,62),(44,62),25,el_out=6,
  erase=[[(0,62),(19,62),(19,93),(0,93)],[(64,62),(44,62),(44,93),(64,93)]],
  sleeve=['d46616','9f4013','6a3019'],skin=['deb478','ccaa6e','ba8856'],sleeve_len=99,r_up=2.4,r_fore=2.2,r_hand=2.2)

# ---- player back sprites (base = overworld chibi up_stand: no battle back sprite exists yet) ----
def pl(sid,src,SL,SR,hy,er,sleeve,glove,cx=31.5,lean_y=37,**kw):
    L0,R0=SL,SR
    fr={
     'raise':dict(under=True,L=(SL,(SL[0]-11,SL[1]-10),(cx-2.5,22)),R=(SR,(SR[0]+11,SR[1]-10),(cx+2.5,22)),hold=(int(cx),22)),
     'hold':dict(L=(SL,(SL[0]-10,24),(cx-3.5,hy)),R=(SR,(SR[0]+10,24),(cx+3.5,hy))),
     'hold_strain':dict(lean=(-1,lean_y),L=((SL[0],SL[1]-1),(SL[0]-10,23),(cx-3.5,hy-1)),R=((SR[0],SR[1]-1),(SR[0]+11,23),(cx+3.5,hy))),
     'lowered':dict(under=True,L=(SL,(SL[0]-5,SL[1]+12),(cx-3,SL[1]+12)),R=(SR,(SR[0]+5,SR[1]+12),(cx+3,SR[1]+12)),hold=(int(cx),SL[1]+12)),
    }
    CFG[sid]=dict(src=src,order=['raise','hold','hold_strain','lowered'],frames=fr,erase=er,sleeve=sleeve,skin=glove,
                  sleeve_len=0.80,r_up=2.6,r_fore=2.3,r_hand=2.4,**kw)
pl('cal','humans/cal/overworld/cal_chibi/cal_chibi_up_stand.png',(19,43),(44,43),6,
   [[(0,43),(18,43),(18,68),(0,68)],[(64,43),(46,43),(46,68),(64,68)]],
   ['92623e','87604d','6a442e'],['462c22','2c1a12','191210'])
pl('mira','humans/mira/overworld/mira_chibi/mira_chibi_up_stand.png',(20,45),(43,45),6,
   [[(0,45),(18,45),(18,67),(0,67)],[(64,45),(45,45),(45,67),(64,67)]],
   ['92623e','6a442e','6a3019'],['462c22','29252b','191210'])
