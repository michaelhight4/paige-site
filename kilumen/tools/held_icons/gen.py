# Kilumen held-item pixel icons: 16x16, dark warm outline, 4-tone ramps (palette sampled from art/characters/pixel/icons).
import json, sys
from PIL import Image
O=(44,35,32,255)
R={ # dark -> light
 'metal':[(70,66,80),(110,104,118),(160,154,162),(226,222,214)],
 'gold':[(138,84,30),(204,140,44),(246,196,83),(255,238,170)],
 'leather':[(70,44,34),(106,68,46),(146,98,62),(186,136,86)],
 'red':[(110,30,44),(178,50,60),(228,90,86),(255,170,150)],
 'green':[(36,78,44),(64,128,60),(110,178,82),(184,226,126)],
 'glass':[(40,72,124),(72,124,194),(128,186,232),(226,244,255)],
 'purple':[(66,40,104),(116,70,166),(168,122,220),(226,202,255)],
 'cream':[(150,118,86),(198,166,118),(232,206,146),(252,242,212)],
 'amber':[(140,70,20),(206,116,30),(242,170,60),(255,226,140)],
 'teal':[(30,90,96),(46,140,140),(92,196,180),(190,240,220)],
 'navy':[(34,32,64),(56,56,100),(88,90,140),(140,146,190)],
 'white':[(150,150,170),(196,196,210),(232,232,240),(255,255,255)],
}
def render(rows, ramps):
    im=Image.new('RGBA',(16,16),(0,0,0,0))
    assert len(rows)==16, len(rows)
    for y,row in enumerate(rows):
        row=row.ljust(16,'.')
        if len(row)!=16: print('WIDTH',y,repr(row),file=sys.stderr)
        for x,ch in enumerate(row[:16]):
            if ch=='.': continue
            if ch=='o': im.putpixel((x,y),O); continue
            k='abcdefghijkl'.index(ch); ramp=R[ramps[k//4]]; im.putpixel((x,y),ramp[k%4]+(255,))
    return im
