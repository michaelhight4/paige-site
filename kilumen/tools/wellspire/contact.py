from PIL import Image,ImageDraw;import glob,os
D=os.environ.get('SHOTS','shots/wellspire_v2')  # SHOTS=shots/wellspire_v3 for v3
for plat in['pc','phone']:
  fs=sorted(glob.glob(f'{D}/{plat}_*.png'));W,H=(320,180) if plat=='pc' else (150,300);c=6;r=-(-len(fs)//c)
  im=Image.new('RGB',(c*W,r*(H+16)),'black');d=ImageDraw.Draw(im)
  for i,f in enumerate(fs):
    t=Image.open(f).convert('RGB');t.thumbnail((W,H));x,y=i%c*W,i//c*(H+16);im.paste(t,(x,y+16));d.text((x+2,y+2),os.path.basename(f)[:40],fill='white')
  im.save(f'{D}/contact_{plat}.png')
