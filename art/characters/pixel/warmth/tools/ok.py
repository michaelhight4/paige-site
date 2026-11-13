import numpy as np
from wlib import PAL
def srgb2lin(c):
    c=np.asarray(c,float)/255; return np.where(c<=0.04045,c/12.92,((c+0.055)/1.055)**2.4)
def oklab(h):
    r,g,b=srgb2lin([int(h[i:i+2],16) for i in (0,2,4)])
    l=0.4122214708*r+0.5363325363*g+0.0514459929*b; m=0.2119034982*r+0.6806995451*g+0.1073969566*b; s=0.0883024619*r+0.2817188376*g+0.6299787005*b
    l,m,s=np.cbrt([l,m,s])
    return np.array([0.2104542553*l+0.7936177850*m-0.0040720468*s,1.9779984951*l-2.4285922050*m+0.4505937099*s,0.0259040371*l+0.7827717662*m-0.8086757660*s])
PL={h:oklab(h) for h in PAL}
def snap(v,exclude=()):
    return min((h for h in PL if h not in exclude),key=lambda h:np.linalg.norm(PL[h]-v))
