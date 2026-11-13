import sys,numpy as np
from PIL import Image
for p in sys.argv[1:]:
    im=Image.open(p).convert('RGB'); h,s,v=[np.asarray(c).astype(float) for c in im.convert('HSV').split()]
    # PIL hue 0-255; olive/yellow-green ~ 40-95
    m=(h>=38)&(h<=100)&(s>40)&(v<235)
    h[m]=np.clip(h[m]+12,0,255); s[m]=np.clip(s[m]*1.5,0,255)
    out=Image.merge('HSV',[Image.fromarray(x.astype('uint8')) for x in (h,s,v)]).convert('RGB'); out.save(p,quality=97); print(p,m.mean().round(3))
