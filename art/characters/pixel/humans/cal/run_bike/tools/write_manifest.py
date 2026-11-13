#!/usr/bin/env python3
"""Read-merge-write the "run_bike" key of _parts/animator_manifest.json. Never touches other keys (e.g. "effects")."""
import json, os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_run_bike as g
KIL = g.KIL; MAN = f'{KIL}/art/characters/pixel/_parts/animator_manifest.json'
REL = f'{KIL}/'
def rel(p): return p.replace(REL, '')

def char_entry(char):
    out = f'{KIL}/art/characters/pixel/humans/{char}/run_bike'; pre = f'{char}_chibi'
    T = g.TIMING
    seat = {'right': [24, 65], 'left': [39, 65], 'down': [32, 65], 'up': [32, 65]}
    hip_bike = {'right': [26, 64], 'left': [37, 64], 'down': [32, 64], 'up': [32, 64]}
    wd, st = g.load_walk(char); g.set_profile(char, st)
    part_hip = {'right': [g.SIDE_GEO['right']['hip'], 65], 'left': [g.SIDE_GEO['left']['hip'], 65], 'down': [32, 65], 'up': [32, 65]}
    e = {'source_walk': rel(wd) + '/', 'profile': {k: v for k, v in g.P.items()}, 'anims': {}, 'parts': {}}
    for a in ('run', 'bike'):
        A = {'frames': T[a]['frames'], 'size': [64, 96], 'scales': [1, 2, 3],
             'fps': T[a]['fps'], 'ms_per_frame': T[a]['ms'], 'gif_ms': g.gif_ms(T[a]['ms']),
             'tiles_per_s': T[a]['tiles_per_s'], 'px_per_s': T[a]['tiles_per_s'] * 64,
             'px_per_frame': round(T[a]['px_per_frame'], 4), 'advance': 'distance',
             'loop': True,
             'sheet': {s: rel(f'{out}/sheets/{pre}_{a}_sheet' + ('' if s == '1x' else f'_{s}') + '.png') for s in ('1x', '2x', '3x')},
             'sheet_layout': {'rows': g.DIRS, 'cols': (['bike_stand'] if a == 'bike' else []) + [f'{a}{i}' for i in range(T[a]['frames'])], 'cell': [64, 96]},
             'gif_all_2x': rel(f'{out}/gifs/{pre}_{a}_all_2x.gif'),
             'dirs': {}}
        for d in g.DIRS:
            names = [f'{a}{i}' for i in range(T[a]['frames'])]
            D = {'frames': T[a]['frames'], 'size': [64, 96], 'fps': T[a]['fps'],
                 'anchor': [32, 96], 'foot_point': [32, 93],
                 'paths': {'1x': [rel(f'{out}/frames/{pre}_{d}_{n}.png') for n in names],
                           '2x': [rel(f'{out}/frames_2x/{pre}_{d}_{n}_2x.png') for n in names],
                           '3x': [rel(f'{out}/frames_3x/{pre}_{d}_{n}_3x.png') for n in names]},
                 'gif': {s: rel(f'{out}/gifs/{pre}_{a}_{d}_{s}.gif') for s in ('2x', '3x')}}
            if a == 'run':
                D['hip_point'] = [32, g.HEM]; D['idle_frame'] = rel(f'{wd}/{pre}_{d}_stand.png')
                D['contact_frames'] = [0, 3]; D['airborne_frames'] = [2, 5]
            else:
                D['stand'] = {s: rel(f'{out}/{"frames" if s=="1x" else "frames_"+s}/{pre}_{d}_bike_stand{"" if s=="1x" else "_"+s}.png') for s in ('1x', '2x', '3x')}
                D['seat_point'] = seat[d]; D['rider_hip_point'] = hip_bike[d]; D['wheel_contact_row'] = 93
            A['dirs'][d] = D
        e['anims'][a] = A
    for d in g.DIRS:
        e['parts'][f'seated_upper_{d}'] = {'path': rel(f'{out}/parts/{pre}_{d}_seated_upper.png'), 'size': [64, 96],
            'hip_anchor': part_hip[d], 'use': 'place so hip_anchor lands on a mount/seat rider_hip_point (bike, flying mount, train seat)'}
    return e

def main():
    entry = {
        'version': 1,
        'generator': 'art/characters/pixel/humans/cal/run_bike/tools/gen_run_bike.py',
        'notes': 'art/characters/pixel/humans/cal/run_bike/MOVEMENT_NOTES.md',
        'validator': 'art/characters/pixel/humans/cal/run_bike/tools/validate.py <char>',
        'conventions': {'frame_size': [64, 96], 'tile': 64, 'anchor': 'frame bottom-centre (32,96) on tile bottom-centre; draw at x=tileX*64, y=(tileY+1)*64-96',
                        'foot_row': 93, 'scaling': 'integer nearest-neighbour only', 'palette': 'art/world/overworld/palette.hex',
                        'frame_advance': 'by distance travelled: frame = floor(dist_px / px_per_frame) % frames; fps listed is the equivalent at nominal speed'},
        'speeds_tiles_per_s': {'walk': 4, 'run': 8, 'bike': 12},
        'walk_reference': {'frames': 4, 'px_per_frame': 32, 'fps_at_speed': 8},
        'characters': {c: {**char_entry(c), 'status': 'done'} for c in ('cal', 'mira')},
    }
    # re-read immediately before writing; merge only our key
    data = {}
    if os.path.exists(MAN):
        with open(MAN) as f: data = json.load(f)
    data['run_bike'] = entry
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(MAN), suffix='.tmp')
    with os.fdopen(fd, 'w') as f: json.dump(data, f, indent=2)
    os.replace(tmp, MAN)
    print('merged run_bike into', MAN, '; keys now:', list(data))

if __name__ == '__main__': main()
