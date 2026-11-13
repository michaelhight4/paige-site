"""Prepare the effect-only 1x inputs for kil_fx_build.lua (Gary's Aseprite) from the staging JSON.
Writes /tmp/kfx_scratch/ase_run/{in/<el>_<anim>/f<i>.png, jobs.lua, info_jobs.json, kil_fx_build.lua}
and zips it to /tmp/kfx_scratch/transparent_impacts_inputs.zip. PC run dir is given with --pcdir; --only el/anim,... builds a subset; --zip NAME names the zip."""
import os, sys, json, shutil, zipfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
from PIL import Image
import build_transparent_staging as B

PCDIR = sys.argv[sys.argv.index('--pcdir') + 1] if '--pcdir' in sys.argv else r'C:\Users\seeth\kilumen_aseprite\work\transparent_impacts\run'
ONLY = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None   # e.g. fire/impact,god/impact
ZIPNAME = sys.argv[sys.argv.index('--zip') + 1] if '--zip' in sys.argv else 'transparent_impacts_inputs.zip'
RUN = '/tmp/kfx_scratch/ase_run'
shutil.rmtree(RUN, ignore_errors=True); os.makedirs(RUN)
jobs, info = [], []
for el in B.EL.ELEMENTS:
    for anim in B.ANIMS:
        if ONLY and f'{el}/{anim}' not in ONLY: continue
        meta = json.load(open(f'{B.STAGE}/{el}/{anim}/{el}_{anim}_battle_2x.json'))
        M = B.MARGIN if meta['rendered_with_margin'] else 0
        src = B.render(el, anim, M)
        c = meta['crop_in_source_canvas_native']
        box = (c['x'] + M, c['y'] + M, c['x'] + M + c['w'], c['y'] + M + c['h'])
        cf = B.crop_frames(src, box)
        d = f'in/{el}_{anim}'; os.makedirs(f'{RUN}/{d}')
        names = []
        for i, f in enumerate(cf):
            Image.fromarray(f, 'RGBA').save(f'{RUN}/{d}/f{i}.png'); names.append(f'{d}\\f{i}.png'.replace('/', '\\'))
        a = meta['anchor']
        sl = ([('impact_centre', *a['native'])] if anim == 'impact' else
              [('path_start', a['start'][0] // 2, a['start'][1] // 2), ('path_end', a['end'][0] // 2, a['end'][1] // 2)])
        sl = [s for s in sl if 0 <= s[1] < c['w'] and 0 <= s[2] < c['h']]
        jobs.append(dict(base=f'{el}_{anim}', dir=f'{el}\\{anim}', tag=anim, w=c['w'], h=c['h'], frames=names,
                         ms=[fr['ms'] for fr in meta['frames']], slices=sl))
        info.append({'cmd': 'info', 'id': f'{el}_{anim}', 'in': f'{PCDIR}\\out\\{el}\\{anim}\\{el}_{anim}.aseprite',
                     'expect': {'frames': len(cf), 'width': c['w'], 'height': c['h']}})
def lua(v):
    if isinstance(v, str): return '"' + v.replace('\\', '\\\\') + '"'
    if isinstance(v, (list, tuple)): return '{' + ','.join(lua(x) for x in v) + '}'
    if isinstance(v, dict): return '{' + ','.join(f'{k}={lua(x)}' for k, x in v.items()) + '}'
    return str(v)
open(f'{RUN}/jobs.lua', 'w').write('return {\n' + ',\n'.join(lua(j) for j in jobs) + '\n}\n')
json.dump(info, open(f'{RUN}/info_jobs.json', 'w'), indent=0)
shutil.copy(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kil_fx_build.lua'), RUN)
z = '/tmp/kfx_scratch/' + ZIPNAME
with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as Z:
    for r, _, fs in os.walk(RUN):
        for f in fs: Z.write(os.path.join(r, f), os.path.relpath(os.path.join(r, f), RUN))
print(len(jobs), 'jobs', sum(len(j['frames']) for j in jobs), 'frames ->', z, os.path.getsize(z), 'bytes')
