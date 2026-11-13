# Worker A: contact sheet of ALL creature folders: front + back + one walk frame, 3x nearest, labelled
import os,re,glob
from PIL import Image,ImageDraw
R=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))
def pick(pats):
    for p in pats:
        g=sorted(f for f in glob.glob(p) if not re.search(r'_(2|3)x\.png$',f))
        if g: return g[0]
names=[n for n in sorted(os.listdir(R)) if re.fullmatch(r'[a-z0-9_]+',n) and '_pre_fix_' not in n and os.path.isdir(f'{R}/{n}')]
cells=[];miss=[]
for n in names:
    fr=pick([f'{R}/{n}/battle/*front*.png',f'{R}/{n}/**/*front*.png']); bk=pick([f'{R}/{n}/battle/*back*.png',f'{R}/{n}/**/*back*.png'])
    wk=pick([f'{R}/{n}/overworld/*/*down_walk1.png',f'{R}/{n}/overworld/**/*walk*.png',f'{R}/{n}/**/*walk*.png'])
    if not (fr and bk and wk): miss.append(n); continue
    cells.append((n,[Image.open(x).convert('RGBA') for x in (fr,bk,wk)]))
S=3; CW,CH=128*S*2+64*S+40,128*S+30; COLS=6
sheet=Image.new('RGB',(CW*COLS,CH*((len(cells)+COLS-1)//COLS)),(200,200,200)); d=ImageDraw.Draw(sheet)
for i,(n,ims) in enumerate(cells):
    x0,y0=(i%COLS)*CW,(i//COLS)*CH; d.text((x0+6,y0+6),n,fill=(0,0,0)); x=x0+6
    for im in ims:
        im=im.resize((im.width*S,im.height*S),Image.NEAREST); sheet.paste(im,(x,y0+24+(128*S-im.height)),im); x+=im.width+10
sheet.save(os.path.join(R,'_overnight','contact_sheet.png'),optimize=True)
print('cells',len(cells),'missing',miss,sheet.size)
