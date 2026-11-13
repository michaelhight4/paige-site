import sys; sys.path.insert(0,'.')
from rig import build, save
from rcfg2 import CFG
for cid in sys.argv[1:]:
    r=build(cid,CFG[cid]); rep=save(cid,CFG[cid],r)
    print(cid,'ink',r['ink'],rep['palette'],'diff',rep['recompose_diff_px'])
