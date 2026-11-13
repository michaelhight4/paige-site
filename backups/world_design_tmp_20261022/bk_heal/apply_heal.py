# paste new i_heal_machine into pristine sheets + re-solve its depth LUT (one group only)
import json,numpy as np,sys
from PIL import Image
sys.path.insert(0,'tools')
IT=json.load(open('interiors_new/tileset_interiors.json'));E={e['name']:e for e in IT['tiles']}
new=np.array(Image.open('/tmp/bk_heal/new_pristine_128.png').convert('RGBA'))
sheet=E['i_heal_machine_0_0']['sheet']
for k in (1,2,3):
    p='qa/furniture_colours/before/'+sheet.replace('tiles_1x/',f'tiles_{k}x/'); a=np.array(Image.open(p).convert('RGBA'))
    for r in (0,1):
        for c in (0,1):
            i=E[f'i_heal_machine_{r}_{c}']['index']; t=new[r*64:r*64+64,c*64:c*64+64]
            if k>1: t=t.repeat(k,0).repeat(k,1)
            a[(i//16)*64*k:(i//16)*64*k+64*k,(i%16)*64*k:(i%16)*64*k+64*k]=t
    Image.fromarray(a).save(p,optimize=True)
import furniture_depth_solve as S, furniture_depth as D
forbid=set()
for m in ('heal_brookhollow','heal_fernwick'): forbid|=S.surf_codes(m,{})
print('pre clash',S.hexes(new)&forbid)
ms=D.piece_masks('i_heal_machine',new,True); lut={}
for op,mk in ms.items():
    region=S.hexes(new,mk)
    for c in sorted(region):
        dd=S.pick(c,op,forbid|(region-{c}) if op in ('up','dn','dn2') else forbid)
        if dd: lut.setdefault(op,{})[c]=dd
print(json.dumps(lut))
t=json.load(open(D.TABLE)); g=t['groups']['i_heal_machine']; g['lut']=lut
json.dump(t,open(D.TABLE,'w'),indent=1)
out=D.apply_piece(g,'i_heal_machine',new); Image.fromarray(out).save('/tmp/bk_heal/new_depth_128.png'); Image.fromarray(out).resize((512,512),0).save('/tmp/bk_heal/new_depth_4x.png')
print('post clash',S.hexes(out)&forbid, 'glow',S.hexes(out)&D.GLOW)
