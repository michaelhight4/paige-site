# overview: per char: original | body | body+relaxed | ext arm (upper+fore) with joints, 3x, cropped to upper 2/3
import sys,json,numpy as np
sys.path.insert(0,'.')
from PIL import Image,ImageDraw
from rcfg2 import CFG
R='/workspace/kilumen/art/characters/pixel/capture_poses/rig_parts/'
PX='/workspace/kilumen/art/characters/pixel/'
def row(cid,S=3,y0=20,y1=100):
    d=R+cid+'/'; L={n:Image.open(d+n+'.png') for n in ('body','arm_relaxed','arm_extend_upper','arm_extend_fore')}
    j=json.load(open(d+'rig.json')); o=Image.open(PX+CFG[cid]['src']).convert('RGBA')
    br=L['body'].copy(); br.alpha_composite(L['arm_relaxed'])
    ar=L['arm_extend_upper'].copy(); ar.alpha_composite(L['arm_extend_fore'])
    ar2=ar.copy()
    for k,col in (('shoulder_px',(255,0,255,255)),('elbow_px',(0,255,255,255)),('wrist_px',(255,255,0,255)),('hand_center_px',(255,0,0,255))): ar2.putpixel(tuple(j[k]),col)
    cells=[o,L['body'],br,ar2,L['arm_extend_fore']]
    h=min(y1,o.height)-y0; w=o.width
    im=Image.new('RGB',(len(cells)*(w*S+4)+90,h*S),(40,40,40)); ImageDraw.Draw(im).text((2,2),cid[:14],fill='white')
    for i,c in enumerate(cells):
        bg=Image.new('RGBA',c.size,(120,150,120,255)); bg.alpha_composite(c)
        im.paste(bg.crop((0,y0,w,y0+h)).resize((w*S,h*S),Image.NEAREST),(90+i*(w*S+4),0))
    return im
if __name__=='__main__':
    out=sys.argv[1]; ids=sys.argv[2:]
    rs=[row(c) for c in ids]; W=max(r.width for r in rs)
    o=Image.new('RGB',(W,sum(r.height+4 for r in rs)),(0,0,0)); y=0
    for r in rs: o.paste(r,(0,y)); y+=r.height+4
    o.save(out)
