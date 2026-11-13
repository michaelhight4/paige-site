"""Bring Gary's Aseprite outputs (kil_fx_build.lua run) into the staging mirror.
Input: unzipped results folder (default /tmp/kfx_scratch/ase_out) with <el>/<anim>/<el>_<anim>.aseprite,
_battle_2x.gif, _battle_2x_sheet.png, _battle_2x_sheet_aseprite.json and the two report jsonl files.
Per element/anim, into _transparent_staging/<el>/<anim>/:
  <el>_<anim>.aseprite                      Aseprite source (1x, layer fx, tag, slices, Kilumen palette)  [copied]
  <el>_<anim>_battle_2x_sheet.png           Aseprite's 2x sheet export                                      [copied]
  <el>_<anim>_battle_2x_sheet_aseprite.json Aseprite's own JSON-array data                                  [copied]
  <el>_<anim>_battle_2x.gif                 Aseprite's GIF frames + durations, re-wrapped with disposal=2 on every
                                            frame (Aseprite's encoder picks disposal 1 on some frames); pixels unchanged
  <el>_<anim>_battle_2x.json                our metadata (anchor etc.), gains an "aseprite" block
Raw Aseprite GIFs + reports are kept in _transparent_staging/_aseprite_run/."""
import os, sys, json, shutil
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
from PIL import Image
from fxlib import save_gif
import build_transparent_staging as B

args = [a for a in sys.argv[1:]]
RUNTAG = args[args.index('--run') + 1] if '--run' in args else None      # e.g. run2: reports go to _aseprite_run/run2/
args = [a for k, a in enumerate(args) if a != '--run' and (k == 0 or args[k - 1] != '--run')]
A = args[0] if args else '/tmp/kfx_scratch/ase_out'
RAW = f'{B.STAGE}/_aseprite_run'
os.makedirs(f'{RAW}/raw_gifs', exist_ok=True)
REP = f'{RAW}/{RUNTAG}' if RUNTAG else RAW
os.makedirs(REP, exist_ok=True)
for f in ('kil_fx_report.jsonl', 'info_report.jsonl'): shutil.copy(f'{A}/{f}', REP)
info = {}
for l in open(f'{A}/info_report.jsonl'):
    r = json.loads(l)
    if r.get('cmd') == 'info': info[r['id']] = r
n = 0
for el in B.EL.ELEMENTS:
    for an in B.ANIMS:
        s, d, base = f'{A}/{el}/{an}', f'{B.STAGE}/{el}/{an}', f'{el}_{an}'
        if not os.path.exists(f'{s}/{base}.aseprite'): continue      # subset run: only what Aseprite rebuilt
        if base not in info: raise SystemExit(f'{base}: no kil.lua info record')
        for ext in ('.aseprite', '_battle_2x_sheet.png', '_battle_2x_sheet_aseprite.json'):
            shutil.copy(f'{s}/{base}{ext}', f'{d}/{base}{ext}')
        shutil.copy(f'{s}/{base}_battle_2x.gif', f'{RAW}/raw_gifs/{base}_battle_2x_aseprite_raw.gif')
        g = Image.open(f'{s}/{base}_battle_2x.gif'); fr, ms = [], []
        for i in range(g.n_frames):
            g.seek(i); ms.append(g.info['duration'])
            x = np.array(g.convert('RGBA')); x[x[..., 3] == 0] = 0; fr.append(x)
        save_gif(fr, f'{d}/{base}_battle_2x.gif', ms, transparent=True)
        mp = f'{d}/{base}_battle_2x.json'; meta = json.load(open(mp))
        ainfo = info[base]
        meta['sheet_aseprite_json'] = f'{base}_battle_2x_sheet_aseprite.json'
        meta['aseprite'] = {'source': f'{base}.aseprite', 'version': ainfo.get('aseprite'), 'built_by': 'Gary\'s Aseprite 1.3.18.6 (batch) via _tools/aseprite/kil_fx_build.lua',
                            'layers': ainfo.get('layer_names'), 'tags': [t['name'] for t in ainfo.get('tags', [])],
                            'gif_note': 'pixels/durations from Aseprite\'s GIF export, re-wrapped with disposal=2 on every frame',
                            'source_is_1x': True, 'export_scale': 2, 'run': RUNTAG or 'run'}
        json.dump(meta, open(mp, 'w'), indent=1); n += 1
print('imported', n)
