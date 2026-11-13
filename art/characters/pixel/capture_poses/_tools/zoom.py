import sys
from PIL import Image,ImageDraw
def zoom(src,out,box=None,S=12):
    im=Image.open(src).convert('RGBA') if isinstance(src,str) else src
    if box is None: box=(0,0,im.width,im.height)
    x0,y0,x1,y1=box; c=im.crop(box)
    bg=Image.new('RGBA',c.size,(120,150,120,255)); bg.alpha_composite(c)
    z=bg.resize((c.width*S,c.height*S),Image.NEAREST)
    W=Image.new('RGB',(z.width+30,z.height+20),(255,255,255)); W.paste(z,(30,20)); d=ImageDraw.Draw(W)
    for i in range(c.width+1):
        X=30+i*S; d.line([(X,20),(X,W.height)],fill=(0,0,0) if (x0+i)%5==0 else (170,170,170))
        if (x0+i)%5==0 and i<c.width: d.text((X+1,4),str(x0+i),fill=(200,0,0))
    for j in range(c.height+1):
        Y=20+j*S; d.line([(30,Y),(W.width,Y)],fill=(0,0,0) if (y0+j)%5==0 else (170,170,170))
        if (y0+j)%5==0 and j<c.height: d.text((2,Y+1),str(y0+j),fill=(200,0,0))
    W.save(out)
if __name__=='__main__':
    a=sys.argv; zoom(a[1],a[2],tuple(map(int,a[3].split(','))) if len(a)>3 else None, int(a[4]) if len(a)>4 else 12)
