from pieces_bedroom import *
def cells(img, idxs, cols=1):
    """slice a multi-tile piece (32px logical tiles) into sheet indices, row-major."""
    out = {}
    for k, i in enumerate(idxs): x, y = k % cols * 32, k // cols * 32; out[i] = img.im.crop((x, y, x+32, y+32))
    return out
I = {}
I.update(cells(bed(), [12, 13])); I[27] = chair().im; I[173] = dresser().im
REG = {'tiles_1x/interior.png': I}
for s in ('interiors_new/tiles_1x/i_furniture.png', 'interiors_new/tiles_1x/i_brand.png', 'tiles_1x/x_furniture_fix.png'): REG.setdefault(s, {})
