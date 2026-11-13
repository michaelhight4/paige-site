import sys; sys.path.insert(0,'tools')
from pxlib import *
from PIL import Image
import json
R='raw/'; B='base/'; import os; os.makedirs(B,exist_ok=True)
meta={}
def go(name,src,box,th=None,tw=None,ncol=24):
    img=Image.open(R+src); spr,s,org=snap(img,box,th,tw,ncol); spr.save(B+name+'.png'); meta[name]=dict(scale=float(s),org=[int(v) for v in org],size=spr.size,src=src,box=box); print(name,spr.size,ncolors(spr))
go('cindrip_front','cindrip_front.jpg',None,th=104,tw=124,ncol=28)
go('cindrip_back','cindrip_back.jpg',None,th=112,tw=124,ncol=28)
go('emberlunx','emberlunx.jpg',None,th=120,tw=124,ncol=28)
go('forgeharrow','forgeharrow.jpg',None,th=150,tw=156,ncol=32)
# chibi cal 4 views (1024x576 image), quarters
bx=find_boxes(Image.open(R+'cal_chibi.jpg'),4); print(bx)
for b,d in zip(bx,['down','left','right','up']):
    go('cal_chibi_'+d,'cal_chibi.jpg',b,th=90,ncol=22)
go('cal_normal','cal_normal.jpg',find_boxes(Image.open(R+'cal_normal.jpg'),4)[0],th=124,ncol=26)
go('ron_chibi','ron_chibi.jpg',None,th=90,ncol=22)
go('cindrip_ow_down','cindrip_ow_front.jpg',None,th=48,ncol=18)
bx=find_boxes(Image.open(R+'cindrip_ow_views.jpg'),3,dil=1); print(bx)
for b,d in zip(bx,['left','right','up']):
    go('cindrip_ow_'+d,'cindrip_ow_views.jpg',b,tw=58 if d!='up' else None,th=None if d!='up' else 46,ncol=18)
json.dump(meta,open(B+'meta.json','w'),indent=1)
