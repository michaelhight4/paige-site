import sys
from collections import Counter
from PIL import Image
sys.path.insert(0,'.')
R='/workspace/kilumen/art/characters/pixel/'
def cc(src,box):
    a=Image.open(R+src).convert('RGBA');x0,y0,x1,y1=box
    c=Counter('%02x%02x%02x'%a.getpixel((x,y))[:3] for x in range(x0,x1+1) for y in range(y0,y1+1) if a.getpixel((x,y))[3])
    return c.most_common(8)
if __name__=='__main__':
    src=sys.argv[1]
    for b in sys.argv[2:]:
        print(b,cc(src,tuple(map(int,b.split(',')))))
