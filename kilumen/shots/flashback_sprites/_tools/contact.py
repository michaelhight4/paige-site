from PIL import Image, ImageDraw
import glob,os,numpy as np
R='/workspace/wt_wellspire/kilumen/shots/flashback_sprites/'
ids=['lab_tech_coat_m','lab_tech_coat_f','lab_tech_scrubs','lab_hazmat','lab_researcher_m','coralie_present']
dirs=['down','left','right','up']; S=2; cw=64*S+12; rh=96*S+26
W=180+cw*4; H=40+rh*len(ids)
im=Image.new('RGB',(W,H),(214,206,190)); d=ImageDraw.Draw(im)
d.text((8,8),'DRAFT - flashback lab staff + present-day Coralie - 64x96 overworld (shown 2x): down / left / right / up',fill=(25,18,16))
for r,i in enumerate(ids):
  y=40+r*rh; d.text((8,y+90),i,fill=(25,18,16)); d.text((8,y+104),'DRAFT',fill=(160,30,30))
  for c,dr in enumerate(dirs):
    f=Image.open(f'{R}{i}/overworld/{i}_chibi/{i}_chibi_{dr}_stand.png').convert('RGBA')
    a=np.array(f)[:,:,3]; assert f.size==(64,96) and set(np.unique(a))<= {0,255}, (i,dr)
    x=180+c*cw; d.rectangle([x,y,x+64*S+3,y+96*S+3],fill=(236,230,218))
    im.paste(f.resize((64*S,96*S),Image.NEAREST),(x+2,y+2),f.resize((64*S,96*S),Image.NEAREST))
    if r==0: d.text((x+40,28),dr,fill=(25,18,16))
im.save(R+'contact_sheet.png'); print('ok',im.size)
