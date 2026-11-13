# normalise a grey generated background to white (border-connected flood fill) so c_build's white-bg keying works
import sys, numpy as np
from PIL import Image
from scipy import ndimage
for p in sys.argv[1:]:
    a = np.asarray(Image.open(p).convert('RGB')).astype(int)
    h, w, _ = a.shape
    edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(edge, 0)
    m = np.abs(a - bg).max(2) < 22
    lab, _ = ndimage.label(m)
    ids = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fill = np.isin(lab, list(ids))
    a[fill] = 255
    Image.fromarray(a.astype(np.uint8)).save(p, quality=97)
    print(p, 'bg', bg.tolist(), 'filled %.2f' % fill.mean())
