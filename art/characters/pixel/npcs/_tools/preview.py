"""previews: villagers_preview.png / trainers_preview.png (2x overworld lineup: down/left/right/up stand + down walk frames, labelled)
+ <kind>_walk_2x.gif (all of that kind walking down, side by side)"""
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
NPC='/workspace/kilumen/art/characters/pixel/npcs/'
cast=json.load(open(NPC+'_tools/cast.json'))['cast']
try: F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
except: F=ImageFont.load_default()
def fr(pid,d,f): return Image.open(f'{NPC}{pid}/overworld/{pid}_chibi/{pid}_chibi_{d}_{f}.png').convert('RGBA')
def lineup(kind,out):
    ids=[c for c in cast if c['kind']==kind]
    cols=4 if kind=='villager' else 3
    cw=9*128+20; ch=192+40
    rows=(len(ids)+cols-1)//cols
    W=cols*cw; H=rows*ch+10
    im=Image.new('RGBA',(W,H),(232,236,226,255)); dr=ImageDraw.Draw(im)
    for k,c in enumerate(ids):
        x0=(k%cols)*cw+10; y0=(k//cols)*ch+6
        dr.text((x0,y0),f"{c['id']}  -  {c['class']}",fill=(20,20,30),font=F)
        frames=[fr(c['id'],d,'stand') for d in ['down','left','right','up']]+[fr(c['id'],'down',f'walk{i}') for i in range(4)]
        for j,f in enumerate(frames):
            f2=f.resize((128,192),Image.NEAREST); bx=x0+j*128+(14 if j>=4 else 0)
            im.alpha_composite(f2,(bx,y0+22))
    im.save(NPC+'_preview/'+out); print(out,im.size)
    # walk gif: every NPC of this kind walking down then left/right/up, 2x
    n=len(ids); per=8; gw=min(n,10); gh=(n+gw-1)//gw
    gframes=[]
    for d in ['down','left','right','up']:
        for i in range(4):
            g=Image.new('RGBA',(gw*136,gh*200),(232,236,226,255))
            for k,c in enumerate(ids):
                g.alpha_composite(fr(c['id'],d,f'walk{i}').resize((128,192),Image.NEAREST),((k%gw)*136+4,(k//gw)*200+4))
            gframes.append(g.convert('P',palette=Image.ADAPTIVE,colors=255))
    gp=NPC+'_preview/'+out.replace('_preview.png','_walk_2x.gif')
    gframes[0].save(gp,save_all=True,append_images=gframes[1:],duration=150,loop=0); print(gp)
if __name__=='__main__':
    for k in sys.argv[1:]:
        if k!='extra': lineup(k,k+'s_preview.png')

def _glob_por(pid):
    import glob
    fs=sorted(glob.glob(f'{NPC}{pid}/portraits/{pid}_*.png'))
    order=['neutral','happy','pleased','grin','angry','stern']
    return sorted(fs,key=lambda f:min([i for i,o in enumerate(order) if f.endswith('_'+o+'.png')] or [9]))
def portraits(out='portraits_preview.png',sc=0.5):
    ids=[c for c in cast if c['kind']=='trainer']
    cols=3; th=int(512*sc); cw=3*int(380*sc)+30; ch=th+34
    rows=(len(ids)+cols-1)//cols
    im=Image.new('RGBA',(cols*cw,rows*ch+10),(232,236,226,255)); dr=ImageDraw.Draw(im)
    for k,c in enumerate(ids):
        x0=(k%cols)*cw+10; y0=(k//cols)*ch+6
        dr.text((x0,y0),f"{c['id']}  -  {c['class']}",fill=(20,20,30),font=F)
        x=x0
        for f in _glob_por(c['id']):
            p=Image.open(f).convert('RGBA'); p=p.resize((int(p.width*sc),th),Image.LANCZOS)
            im.alpha_composite(p,(x,y0+20)); dr.text((x+4,y0+20+th-14),os.path.basename(f)[len(c['id'])+1:-4],fill=(90,90,90),font=F)
            x+=p.width+4
    im.save(NPC+'_preview/'+out); print(out,im.size)
def battle(out='trainers_battle_2x.png'):
    ids=[c for c in cast if c['kind']=='trainer']
    cw=150; W=len(ids)*cw+20
    im=Image.new('RGBA',(W,256+60),(232,236,226,255)); dr=ImageDraw.Draw(im)
    for k,c in enumerate(ids):
        p=Image.open(f"{NPC}{c['id']}/trainer/{c['id']}_trainer_64x128.png").convert('RGBA').resize((128,256),Image.NEAREST)
        im.alpha_composite(p,(10+k*cw,8)); dr.text((10+k*cw,272),c['id'].replace('tr_',''),fill=(20,20,30),font=F)
    im.save(NPC+'_preview/'+out); print(out,im.size)
if __name__=='__main__' and 'extra' in sys.argv: portraits(); battle()
