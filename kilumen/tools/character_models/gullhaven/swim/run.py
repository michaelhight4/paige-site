import sys; sys.path.insert(0,'.'); from swim import *
N='/workspace/wt_cm_masters/kilumen/art/characters/pixel/npcs/'
S={'cal':('/workspace/wt_seaport/kilumen/art/characters/pixel/humans/cal/overworld/cal_chibi_sheet.png',0.36)}
for x in 'abcde': S['tr_swimmer_gullhaven_'+x]=(N+f'tr_swimmer_gullhaven_{x}/overworld/tr_swimmer_gullhaven_{x}_chibi_sheet.png',0.34)
os.makedirs('out',exist_ok=True)
for k,(p,kp) in S.items(): build(p,kp).save(f'out/{k}_swim_sheet.png')
prev=Image.new('RGBA',(256*6,384),(64,128,176,255))
for i,k in enumerate(S): im=Image.open(f'out/{k}_swim_sheet.png'); prev.alpha_composite(im,(i*256,0))
up(prev,2).save('prev.png')
