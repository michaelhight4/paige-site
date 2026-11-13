#!/usr/bin/env python3
"""Padded maps follow-up (Gary 10:25 AM CT, Oct 23 2026: keep the padded maps, fix what still points at old coordinates).
Each padded map carries padding {dx, dy}: every coordinate INSIDE it is already shifted. This fixes the references FROM
other maps, using the pre-pad snapshot (backups/centre_camera_pad_20261023_0915) as the source of the unpadded values:
  1. door warps (tx, ty) into a padded map           -> unpadded target + that map's (dx, dy)
  2. interiors' entered_from door / return_to        -> unpadded + that map's (dx, dy)
  3. edge exit offsets between maps with different pads -> offset + pad(to) - pad(from) along the edge
Some interiors were shifted by a flat (10, 10) instead of the target's own pad; this puts them on the right cell.
Usage: python3 tools/pad_fix.py [--write] [--snap /path/to/unpadded/maps]"""
import json, glob, os, sys, tarfile, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAPS = os.path.join(ROOT, 'art/world/overworld/maps')
WRITE = '--write' in sys.argv
snap = sys.argv[sys.argv.index('--snap') + 1] if '--snap' in sys.argv else None
if not snap:
    t = tempfile.mkdtemp(); tarfile.open(os.path.join(ROOT, 'backups/centre_camera_pad_20261023_0915/overworld.tar.gz')).extractall(t)
    snap = os.path.join(t, 'overworld/maps')
load = lambda f: json.load(open(f))
cur = {os.path.basename(f)[:-5]: load(f) for f in glob.glob(MAPS + '/*.json')}
old = {os.path.basename(f)[:-5]: load(f) for f in glob.glob(snap + '/*.json')}
pad = {n: ((j.get('padding') or {}).get('dx', 0), (j.get('padding') or {}).get('dy', 0)) for n, j in cur.items()}
changed, log = set(), []
for n, c in cur.items():
    u = old.get(n)
    if not u: continue
    # 1. warps (match by index and destination)
    for i, w in enumerate(c.get('warps', [])):
        if i >= len(u.get('warps', [])): break
        wu = u['warps'][i]
        if wu.get('to') != w.get('to') or not isinstance(wu.get('tx'), int) or w['to'] not in pad: continue
        dx, dy = pad[w['to']]; exp = [wu['tx'] + dx, wu['ty'] + dy]
        if [w['tx'], w['ty']] != exp:
            log.append(f'warp {n}[{i}] -> {w["to"]}: {w["tx"]},{w["ty"]} -> {exp[0]},{exp[1]}'); w['tx'], w['ty'] = exp; changed.add(n)
    # 2. entered_from
    for i, e in enumerate(c.get('entered_from', []) or []):
        if i >= len(u.get('entered_from', []) or []): break
        eu = u['entered_from'][i]
        if eu.get('map') != e.get('map') or e['map'] not in pad: continue
        dx, dy = pad[e['map']]
        for k in ('door', 'return_to'):
            if isinstance(eu.get(k), list):
                exp = [eu[k][0] + dx, eu[k][1] + dy]
                if e.get(k) != exp: log.append(f'entered_from {n}[{i}] {e["map"]}.{k}: {e.get(k)} -> {exp}'); e[k] = exp; changed.add(n)
    # 3. exit offsets
    for i, e in enumerate(c.get('exits', [])):
        if i >= len(u.get('exits', [])): break
        eu = u['exits'][i]
        if eu.get('to') != e.get('to') or e['to'] not in pad: continue
        ax = 0 if e['edge'] in ('north', 'south') else 1
        exp = (eu.get('offset') or 0) + pad[e['to']][ax] - pad[n][ax]
        if (e.get('offset') or 0) != exp:
            log.append(f'exit {n} {e["edge"]} -> {e["to"]}: offset {e.get("offset")} -> {exp}'); e['offset'] = exp; changed.add(n)
print('\n'.join(log)); print(f'{len(log)} fixes in {len(changed)} maps:', sorted(changed))
if WRITE:
    for n in changed:
        f = os.path.join(MAPS, n + '.json'); raw = open(f).read()
        compact = '\n' not in raw.strip()
        with open(f, 'w') as fh:
            json.dump(cur[n], fh, ensure_ascii=False, **({'separators': (',', ':')} if compact else {'indent': 1}))
            if raw.endswith('\n'): fh.write('\n')
    print('written')

# 4. world_layout.json fly destinations: copy each built map's own (padded) fly_point
LP = os.path.join(ROOT, 'art/world/overworld/world_layout.json')
L = json.load(open(LP)); nfp = 0
for k, d in (L.get('fly') or {}).get('destinations', {}).items():
    m = cur.get(d.get('map') or '')
    if m and isinstance(m.get('fly_point'), dict) and isinstance(d.get('fly_point'), dict):
        exp = {kk: m['fly_point'][kk] for kk in ('x', 'y', 'facing') if kk in m['fly_point']}
        if d['fly_point'] != exp: print(f'world_layout fly {k}: {d["fly_point"]} -> {exp}'); d['fly_point'] = exp; nfp += 1
if WRITE and nfp:
    raw = open(LP).read()
    with open(LP, 'w') as fh:
        json.dump(L, fh, ensure_ascii=False, **({'separators': (',', ':')} if '\n' not in raw.strip() else {'indent': 1}))
        if raw.endswith('\n'): fh.write('\n')
    print('world_layout written')
