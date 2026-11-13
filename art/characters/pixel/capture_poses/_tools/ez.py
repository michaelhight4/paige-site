import sys;sys.path.insert(0,'.')
from build import *; from zoom import zoom
from PIL import Image
sid=sys.argv[1]; box=tuple(map(int,sys.argv[2].split(',')))
r=build(sid); W=r['a'].shape[1]
im=np.concatenate([r['a'],r['b']],1)
zoom(Image.fromarray(im),f'/tmp/cap/e_{sid}.png',(box[0],box[1],box[2]+W,box[3]),8)
