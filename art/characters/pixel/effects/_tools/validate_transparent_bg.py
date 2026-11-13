"""night battle backdrop shared by previews (copy of validate_transparent.py helper)"""
import json
import numpy as np
from PIL import Image
_PALC = np.unique(np.array(Image.open('/workspace/kilumen/art/world/overworld/palette.png').convert('RGB')).reshape(-1, 3), axis=0)
_NMAP = json.load(open('/workspace/kilumen/art/world/overworld/time_of_day/grades.json'))['grades']['night']['map']
def _night_bg():
    bg = np.array(Image.open('/workspace/kilumen/art/world/battle_bg.png').convert('RGB').resize((640, 480), Image.BOX)).astype(int)
    d = ((bg[:, :, None, :] - _PALC[None, None].astype(int)) ** 2).sum(-1); bg = _PALC[d.argmin(-1)].astype('uint8')
    lut = {tuple(int(k[i:i + 2], 16) for i in (0, 2, 4)): tuple(int(v[i:i + 2], 16) for i in (0, 2, 4)) for k, v in _NMAP.items()}
    flat = bg.reshape(-1, 3)
    for i, c in enumerate(map(tuple, flat)): flat[i] = lut.get(c, c)
    return bg
NBG = _night_bg()
