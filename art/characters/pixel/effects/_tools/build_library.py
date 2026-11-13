"""One-shot build: python3 build_library.py [--no-render]
1) renders every element (gen_effects), 2) validates, 3) builds contact sheets in effects/_preview,
4) read-merge-writes the "effects" key into _parts/animator_manifest.json (other keys e.g. "run_bike" untouched)."""
import os, sys, json, tempfile, datetime
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import elements as EL, gen_effects as G, validate_effects as V
from fxlib import up
ROOT=G.ROOT; PV=ROOT+'/_preview'
MANIFEST='/workspace/kilumen/art/characters/pixel/_parts/animator_manifest.json'
BGc=(30,28,36,255)

def contact_sheets():
    strips=[np.array(Image.open(f'{PV}/{el}_strip.png').convert('RGBA')) for el in EL.ELEMENTS]
    W=max(s.shape[1] for s in strips)
    rows=[np.concatenate([s,np.zeros((s.shape[0],W-s.shape[1],4),'uint8')+np.array(BGc,'uint8')],1) for s in strips]
    sep=np.zeros((3,W,4),'uint8')+255
    full=np.concatenate(sum([[r,sep] for r in rows],[])[:-1],0)
    Image.fromarray(full).save(f'{PV}/contact_sheet_all.png'); Image.fromarray(up(full)).save(f'{PV}/contact_sheet_all_2x.png')
    # compact impact grid: one row per element, label column
    LW=70; IW,IH=G.IW,G.IH; grey=np.array([96,92,110,255],'uint8')
    img=Image.new('RGBA',(LW+8*(IW+2),len(EL.ELEMENTS)*(IH+2)),BGc); d=ImageDraw.Draw(img)
    for r,el in enumerate(EL.ELEMENTS):
        sh=np.array(Image.open(f'{ROOT}/{el}/impact/{el}_impact_sheet.png').convert('RGBA'))
        n=sh.shape[1]//IW
        d.text((4,r*(IH+2)+IH//2-5),el,fill=(255,255,255,255))
        for i in range(n):
            f=sh[:,i*IW:(i+1)*IW]; b=np.zeros_like(f)+grey; m=f[...,3]>0; b[m]=f[m]
            img.paste(Image.fromarray(b),(LW+i*(IW+2),r*(IH+2)))
    img.save(f'{PV}/contact_impacts.png'); Image.fromarray(up(np.array(img))).save(f'{PV}/contact_impacts_2x.png')
    # travel grid: p2f onion per element, 6 per row
    crop=G.BG[G.TOFF[1]:G.TOFF[1]+G.TH,G.TOFF[0]:G.TOFF[0]+G.TW]
    cols=6; els=list(EL.ELEMENTS); rr=(len(els)+cols-1)//cols
    img=Image.new('RGBA',(cols*(G.TW+2),rr*(G.TH+14)),BGc); d=ImageDraw.Draw(img)
    for k,el in enumerate(els):
        sh=np.array(Image.open(f'{ROOT}/{el}/travel_p2f/{el}_travel_p2f_sheet.png').convert('RGBA'))
        b=crop.copy()
        for i in range(sh.shape[1]//G.TW):
            f=sh[:,i*G.TW:(i+1)*G.TW]; m=f[...,3]>0; b[m]=f[m]
        x,y=(k%cols)*(G.TW+2),(k//cols)*(G.TH+14)
        d.text((x+2,y),el+' (p2f onion skin)',fill=(255,255,255,255)); img.paste(Image.fromarray(b),(x,y+12))
    img.save(f'{PV}/contact_travel_p2f.png'); Image.fromarray(up(np.array(img))).save(f'{PV}/contact_travel_p2f_2x.png')

def merge_manifest(rep):
    eff={'_about':{'generated_by':'art/characters/pixel/effects/_tools/build_library.py',
        'generated_at':datetime.datetime.now().astimezone().isoformat(timespec='seconds'),
        'paths_relative_to':'/workspace/kilumen','battle_screen_px':[G.SW,G.SH],'display_scale':2,
        'palette':'art/world/overworld/palette.png (64 colours) + full transparency',
        'travel_usage':'draw each travel frame with its top-left at canvas_offset_on_screen_px (pilot layout); for other layouts remap start/end anchors',
        'impact_usage':'draw impact frame so origin_px lands on the hit creature centre; flip_x when the player is hit (sea wave in particular)',
        'sequence':'travel_p2f -> impact(foe) ; travel_f2p -> impact(player)',
        'validated_by':'art/characters/pixel/effects/_tools/validate_effects.py','all_valid':rep['ok'],
        'status':'library only - not wired into the game'},'elements':{}}
    for el in EL.ELEMENTS:
        e=G.manifest_entry(el)
        for anim,a in e['animations'].items():
            v=rep['elements'][el][anim]
            a['palette_validated']=bool(v['palette_ok']); a['nn_2x_validated']=bool(v['nn_2x_ok']); a['validation_pass']=bool(v['pass'])
        eff['elements'][el]=e
    os.makedirs(os.path.dirname(MANIFEST),exist_ok=True)
    # read-merge-write as late as possible; only the "effects" key is ours
    cur={}
    if os.path.exists(MANIFEST):
        txt=open(MANIFEST).read()
        if txt.strip(): cur=json.loads(txt)
    cur['effects']=eff
    fd,tmp=tempfile.mkstemp(dir=os.path.dirname(MANIFEST),prefix='.animator_manifest.',suffix='.tmp')
    with os.fdopen(fd,'w') as f: json.dump(cur,f,indent=2)
    # final re-read just before replace, in case another worker wrote meanwhile
    if os.path.exists(MANIFEST):
        txt=open(MANIFEST).read()
        latest=json.loads(txt) if txt.strip() else {}
        if {k:v for k,v in latest.items() if k!='effects'}!={k:v for k,v in cur.items() if k!='effects'}:
            latest['effects']=eff
            with open(tmp,'w') as f: json.dump(latest,f,indent=2)
    os.replace(tmp,MANIFEST)
    return sorted(json.load(open(MANIFEST)).keys())

if __name__=='__main__':
    if '--no-render' not in sys.argv:
        sys.argv=[sys.argv[0]]; G.main()
    rep=V.validate(); json.dump(rep,open(f'{PV}/validation_report.json','w'),indent=1)
    print('validation', 'ALL OK' if rep['ok'] else 'FAILED')
    contact_sheets(); print('contact sheets written')
    print('manifest keys now:',merge_manifest(rep))
