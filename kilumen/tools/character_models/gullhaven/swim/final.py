import sys; sys.path.insert(0,'.'); from swim import *
exec(open('run.py').read().split("os.makedirs")[0].split("from swim import *")[1])
R='/workspace/wt_cm_masters/kilumen/art/characters/pixel/'
dirs=['down','left','right','up']; outs={}
for k,(p,kp) in S.items():
    od=R+('humans/cal/swim/' if k=='cal' else f'npcs/{k}/swim/'); os.makedirs(od,exist_ok=True); outs[k]=od
    sh=build(p,kp,k=='cal'); n=f'{k}_swim_sheet'
    sh.save(od+n+'.png'); up(sh,2).save(od+n+'_2x.png'); up(sh,3).save(od+n+'_3x.png')
    for r,dn in enumerate(dirs):
        fr=[up(sh.crop((c*64,r*96,c*64+64,r*96+96)),2) for c in range(4)]
        fr[0].save(od+f'{k}_swim_{dn}_2x.gif',save_all=True,append_images=fr[1:],duration=180,loop=0,disposal=2,transparency=0) if False else None
        bg=[Image.new('RGBA',f.size,(64,128,176,255)) for f in fr]
        for b,f in zip(bg,fr): b.alpha_composite(f)
        bg[0].convert('RGB').save(od+f'{k}_swim_{dn}_2x.gif',save_all=True,append_images=[b.convert('RGB') for b in bg[1:]],duration=180,loop=0)
    json.dump({"frame_size":[64,96],"cols":4,"rows":["down","left","right","up"],"frames":4,"ms":180,"loop":True,
      "waterline_y":WL,"bob_px":BOB,"note":"DRAFT. Body already cropped at the waterline; ripple ring baked in (solid pixels). Draw at the walk-sheet anchor with no extra crop/bob/foam. Frames 0-3 = stroke cycle (idle may hold col 0 or loop)."},open(od+f'{k}_swim.json','w'),indent=1)
# contact
ks=list(S); C=Image.new('RGB',(40+ks.__len__()*0+4*64*3+140, 60+len(ks)*4*(96*0+64)),(220,226,214))
cell=3; CW=140+4*64*2; C=Image.new('RGB',(CW*2, 60+3*4*126+40),(220,226,214)); d=ImageDraw.Draw(C)
d.text((10,15),"DRAFT - Gullhaven swim animations (4 frames x 4 dirs, 2x, on sea-blue strip) - cal = player",fill=(25,18,16))
for i,k in enumerate(ks):
    sh=up(Image.open(outs[k]+f'{k}_swim_sheet.png'),2); x0=(i%2)*CW+10; y0=50+(i//2)*4*126
    d.text((x0,y0),k+" [DRAFT]",fill=(25,18,16))
    for r,dn in enumerate(dirs):
        y=y0+14+r*124; d.rectangle([x0+60,y,x0+60+512,y+120],fill=(64,128,176)); d.text((x0,y+40),dn,fill=(25,18,16))
        strip=sh.crop((0,r*192+40,512,r*192+160)); C.paste(strip,(x0+60,y),strip)
ref=Image.open('/workspace/gary_videos/swim_reference.jpg').convert('RGB'); ref.thumbnail((300,180)); C2=Image.new('RGB',(C.width+330,C.height),(220,226,214)); C2.paste(C,(0,0)); C2.paste(ref,(C.width+15,60)); ImageDraw.Draw(C2).text((C.width+15,45),'reference',fill=(25,18,16)); C=C2
C.save('contact_sheet_gullhaven_swim.png'); print(C.size)
