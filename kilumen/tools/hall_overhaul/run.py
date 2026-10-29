import json, os, sys
from plan import gen, render, Image
OUT = '/workspace/wt_hall/kilumen/shots/hall_overhaul_plan'; os.makedirs(OUT, exist_ok=True)
usesT = lambda h, r: any(h.at(*c) in 'TU' for c in r['cells'])
usesAll = lambda chars: (lambda h, r: all(any(h.at(*c) == ch for c in r['cells']) for ch in chars))
S = [
 dict(name='fernwick', title='1 Fernwick (earth)', w=19, h=21, scale='1.39x of 16x18', trainers=3, minsteps=30, bands=[('maze', 1)], door=['.', 'b'], plates_in={0: 'T'}, need=usesT,
      mech='Rumble plate: step on it to sink the stone slab (B) at the dais door; maze of earth walls'),
 dict(name='saltmere', title='2 Saltmere (water)', w=15, h=17, scale='1.45x of 11x16', trainers=4, minsteps=30, bands=[('maze', 1), ('maze', 1)], door=['.', 'b', 'a'], plates_in={0: 'T', 1: 'T'}, need=usesT,
      mech='Sluice wheels (T) swap which salt pan is dry: A pans or B pans; two pan rooms'),
 dict(name='revival_heights', title='3 Revival Heights (light)', w=17, h=29, scale='1.66x of 11x27', trainers=5, minsteps=60, bands=[('hidden', 1), ('maze', 1)], door=['.', 'b', 'a'], plates_in={0: 'T', 1: 'T'}, need=usesT,
      mech='Glass maze (invisible walls, shimmer when lit) then prism plates (T) swing the beam to open light gates A/B'),
 dict(name='frostspire', title='4 Frostspire (wind)', w=17, h=21, scale='2.03x of 11x16', trainers=6, minsteps=40, rock=0.14, bands=[('ice', 1), ('maze', 1), ('ice', 1)], door=['.', '.', 'b', '.'], plates_in={1: 'T'}, need=usesT,
      mech='Gust floors (slide until a rock or wall) + bell-rope plate (T) that drops the wind gate (B)'),
 dict(name='mirefen', title='5 Mirefen (swamp)', w=19, h=23, scale='2.09x of 11x19', trainers=7, minsteps=60, dark='2, +1 per lit reed lamp', pushd=0.45, bands=[('push', 1), ('dark', 2)], door=['.', '.', 'b'], plates_in={1: 'T'}, need=usesT,
      mech='Dark bog: reed currents push you (^v<>), then a lamp-lit maze; lamp plate (T) lifts the boardwalk gate (B)'),
 dict(name='tidewater', title='6 Tidewater (sea)', w=21, h=21, scale='2.86x of 11x14', trainers=8, minsteps=60, pushd=0.4, rock=0.12, bands=[('push', 1), ('maze', 2), ('ice', 1)], door=['.', '.', 'd', 'b'], plates_in={1: 'TU'}, need=usesAll('TU'),
      mech='Rip currents (^v<>), tide shells: T = high/low tide (A/B shallows), U = sea gate (C/D); tideglide slide by the Master'),
 dict(name='lanternport', title='7 Lanternport (spirit)', w=23, h=27, scale='2.69x of 11x21', trainers=10, minsteps=70, dark='2 (spirit lanterns show warp pads)', rooms=3, pairs=4, bands=[('hidden', 1), ('warp', 1), ('maze', 1)], door=['.', '.', 'b', 'a'], plates_in={1: 'T', 2: 'T'}, need=lambda h, r: usesT(h, r) and any(h.at(*c).isdigit() for c in r['cells']),
      mech='Dark hall: phantom walls (invisible), spirit-lantern warp pads 1-4 across sealed crypts, lantern plates (T) for ghost gates'),
 dict(name='cindervale', title='8 Cindervale (fire)', w=25, h=33, scale='4.4x of 11x17 (largest hall by area)', trainers=12, minsteps=90, pushd=0.4, rock=0.12, rooms=3, pairs=3, bands=[('push', 1), ('warp', 1), ('maze', 1), ('ice', 1)], door=['.', '.', '.', 'd', 'b'], plates_in={1: 'T', 2: 'TU'}, need=usesAll('TU'),
      mech='Magma conveyors (^v<>), vent warps 1-3, quench plates T/U cool lava gates A-D, cooled-glass slide to the Master'),
]
sel = sys.argv[1:]; summary = {}
for s in S:
    if sel and s['name'] not in sel: continue
    h, r, tr, seed = gen(s)
    render(h, r, tr, s, f"{OUT}/{s['name']}.png")
    summary[s['name']] = dict(size=[h.w, h.h], seed=seed, trainers=[dict(n=i + 1, at=list(t[1]), facing=t[2], sight=len(t[3]), first_path_step=t[0]) for i, t in enumerate(tr)],
        master=list(h.find('M')[0]), start=list(h.find('S')[0]), states=r['states'], softlocks=r['softlocks'], solution_moves=r['steps'], moves=r['moves'], grid=[''.join(x) for x in h.g])
    print(s['name'], h.w, h.h, 'seed', seed, 'trainers', len(tr), 'states', r['states'], 'softlocks', r['softlocks'], 'moves', r['steps'], flush=True)
old = json.load(open(f'{OUT}/plans.json')) if sel and os.path.exists(f'{OUT}/plans.json') else {}
old.update(summary); json.dump(old, open(f'{OUT}/plans.json', 'w'), indent=1)
ims = [Image.open(f"{OUT}/{s['name']}.png") for s in S if os.path.exists(f"{OUT}/{s['name']}.png")]
if len(ims) == 8:
    cw, ch = max(i.width for i in ims), max(i.height for i in ims); sheet = Image.new('RGB', (cw * 4, ch * 2), (24, 22, 30))
    for k, im in enumerate(ims): sheet.paste(im, ((k % 4) * cw, (k // 4) * ch))
    sheet.save(f'{OUT}/contact_sheet.png'); print('sheet', sheet.size)
