"""Step 5: QA + manifest. Checks every exported PNG/GIF of the 7 wild creatures is
binary-alpha and palette-only (shared 64-colour palette.png), then writes
pixel/_parts/wild_manifest.json listing every file with bytes, pixel size, frame count
and role."""
import os, json, glob, re
from wild_pxlib import *
from PIL import Image
PALSET = {tuple(c) for c in PAL.tolist()}

def role(rel):
    p = rel.split('/')
    if p[1] == 'raw': return 'source: generated painted/pixel-style art used as snap input' + (' (REJECTED variant, kept for reference)' if 'rejected' in rel else '')
    if p[1] == '_work': return 'reference: base before Burlbeetle 6-leg fix'
    if p[1] == 'base': return 'base: cleaned palette-snapped sprite (single source for all frames of this view)' if rel.endswith('.png') else 'base metadata (scale, crop, fixes)'
    if p[1] == 'battle': return 'battle static %s sprite 128px native%s' % ('front' if '_front_' in rel else 'back (player side)', ', 2x' if '_2x' in rel else '')
    if p[1] == 'anim':
        v = 'front' if '_front_' in rel else 'back'
        if rel.endswith('.gif'): return f'battle {v} idle loop GIF 2x'
        if '_sheet' in rel: return f'battle {v} idle sheet (4 frames horizontal)' + (' 2x' if '_2x' in rel else '')
        return f'battle {v} idle frame' + (' 2x' if '_2x' in rel else '')
    if p[1] == 'overworld':
        k = re.search(r'_(\d)x\.', rel); sc = (' %sx' % k.group(1)) if k else ' native'
        if rel.endswith('.gif'):
            d = re.search(r'walk_(\w+?)_\dx', rel).group(1)
            return f'overworld walk GIF ({d}){sc}' if d != 'all' else f'overworld walk GIF, all 4 directions side by side{sc}'
        if '_sheet' in rel: return 'overworld sheet: rows down,left,right,up; cols stand,walk0-3 (64x64 cells)' + sc
        m = re.search(r'_(down|left|right|up)_(stand|walk\d)', rel)
        return f'overworld frame {m.group(1)} {m.group(2)} (64x64 cell){sc}'
    if rel.endswith('README.md'): return 'readme'
    return 'other'

def check(path):
    im = Image.open(path); frames = getattr(im, 'n_frames', 1); bad = []
    for i in range(frames):
        im.seek(i); a = np.array(im.convert('RGBA'))
        al = np.unique(a[..., 3]);
        if not set(al.tolist()) <= {0, 255}: bad.append('soft alpha')
        cols = {tuple(c) for c in np.unique(a[a[..., 3] > 0][:, :3], axis=0).tolist()}
        if not cols <= PALSET: bad.append('off-palette %d' % len(cols - PALSET))
    return im.size, frames, sorted(set(bad))

def main():
    man = {'spec': {'battle': '128px native (+2x)', 'overworld': '64x64 cell native (+2x, +3x)', 'palette': PAL_PNG,
                    'display': '3x for 1440p, 2x for 1080p, nearest-neighbour', 'idle_ms': [180, 160, 200, 160]},
           'creatures': {}}
    problems = []
    for n in WILD:
        C = f'{CRE}/{n}'; files = []
        for f in sorted(glob.glob(f'{C}/**/*', recursive=True)):
            if os.path.isdir(f): continue
            rel = os.path.relpath(f, CRE); e = {'path': 'creatures/' + rel, 'bytes': os.path.getsize(f), 'role': role(rel)}
            if f.endswith(('.png', '.gif')):
                size, fr, bad = check(f) if '/raw/' not in f else (Image.open(f).size, 1, [])
                e['px'] = list(size); e['frames'] = fr
                if '_sheet' in f: e['frames'] = 20 if '/overworld/' in f else 4
                if bad and '/raw/' not in f: problems.append((rel, bad)); e['qa'] = bad
            elif f.endswith('.jpg'): e['px'] = list(Image.open(f).size); e['frames'] = 1
            files.append(e)
        cnt = lambda pred: sum(1 for e in files if pred(e['path']))
        man['creatures'][n] = {
            'counts': {'files': len(files),
                       'battle_static': cnt(lambda p: '/battle/' in p),
                       'idle_frames_per_view': 4,
                       'idle_frame_files': cnt(lambda p: '/anim/' in p and re.search(r'_f\d', p) is not None),
                       'ow_frame_files': cnt(lambda p: '/overworld/' in p and p.endswith('.png') and '_sheet' not in p),
                       'ow_frames_per_direction': '1 stand + 4 walk', 'gifs': cnt(lambda p: p.endswith('.gif'))},
            'files': files}
    man['qa_problems'] = problems
    os.makedirs(f'{ROOT}/_parts', exist_ok=True)
    json.dump(man, open(f'{ROOT}/_parts/wild_manifest.json', 'w'), indent=1)
    for n, v in man['creatures'].items(): print(n, v['counts'])
    print('QA problems:', problems)

if __name__ == '__main__': main()
