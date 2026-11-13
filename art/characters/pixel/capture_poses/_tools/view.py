import sys
from PIL import Image
ims=[Image.open(f'/tmp/cap/dbg_{s}.png') for s in sys.argv[2:]]
W=Image.new('RGB',(max(i.width for i in ims),sum(i.height for i in ims)),'white');y=0
for i in ims: W.paste(i,(0,y));y+=i.height
W.save(sys.argv[1])
