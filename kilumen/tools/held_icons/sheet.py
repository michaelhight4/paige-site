import sys,glob,os
from PIL import Image,ImageDraw
d=sys.argv[1]; fs=sorted(f for f in glob.glob(d+'/*.png') if '_2x' not in f and '_3x' not in f)
cols=6; cw,ch=150,96; S=Image.new('RGB',(cols*cw,((len(fs)+cols-1)//cols)*ch),(40,34,48)); dr=ImageDraw.Draw(S)
for i,f in enumerate(fs):
    im=Image.open(f); x,y=(i%cols)*cw,(i//cols)*ch
    S.paste(im,(x+6,y+8),im); S.paste(im.resize((64,64),0),(x+30,y+8),im.resize((64,64),0))
    dr.text((x+4,y+78),os.path.basename(f)[:-4],fill=(230,220,200))
S.save(sys.argv[2]); print(S.size)
