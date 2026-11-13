"""List every colour each creature uses OUTSIDE its crystal masks (all battle/anim/overworld/icon sprites, native size)."""
import sys, os, glob, json, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../icons/tools'))
from klib import *
def sprite_files(n):
    fs=[f for d in ('battle','anim','overworld') for f in glob.glob(f'{C}/{n}/{d}/**/*.png',recursive=True)
        if not f.endswith(('_2x.png','_3x.png')) and 'sheet' not in os.path.basename(f)]
    fs+= [f'{P}/icons/{n}_icon_f{i}.png' for i in range(2)]
    return sorted(fs)
def icon_mask(n,f):
    return np.array(Image.open(f'{P}/warmth/masks/{n}/icons/{os.path.basename(f)}'))>0
def crystal(n,f):
    return icon_mask(n,f) if '/icons/' in f else mask_for(n,f)
def inventory(n):
    cnt=collections.Counter()
    for f in sprite_files(n):
        a=load(f); m=crystal(n,f); h=hexmap(a)
        cnt.update(h[(a[...,3]>0)&~m].ravel().tolist())
    return cnt
if __name__=='__main__':
    for n in NAMES:
        c=inventory(n)
        print(n, ' '.join(f'{k}:{v}' for k,v in sorted(c.items(),key=lambda kv:luma(kv[0]))))
