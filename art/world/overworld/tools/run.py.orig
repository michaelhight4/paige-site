# Builds the pixel-art overworld kit: tiles (64px native), 1x/2x/3x sheets, tilesets, maps, previews, puzzle verification.
#   python3 tools/run.py            full build: takes /tmp/kilumen_run.lock (a second full run waits up to KILUMEN_LOCK_WAIT s, default 600, then exits 75)
#   python3 tools/run.py --check    validate only: builds in memory, runs every check, writes NOTHING; exit 0 = all checks pass, 1 = problems
#   --no-wait                       do not wait for the lock: exit 75 at once if another run holds it
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
import runguard                               # lock + --check sandbox (must run before anything can write)
CHECK = runguard.CHECK
from maps import *
# ---- HOOK for other workers' maps (do not edit their files here) ----
# EXTRA MAPS HOOK: every overworld/maps_new/*.py (and tools/maps_new/*.py) is executed with this module's globals (Map, MAPS, helpers, BYNAME, ...),
# in file-name order, after the core maps. A file just builds maps with the same helpers and calls MAPS.append(m).
import glob, runpy
_here = os.path.dirname(os.path.abspath(__file__))
for _f in sorted(glob.glob(os.path.join(_here, '..', 'maps_new', '*.py')) + glob.glob(os.path.join(_here, 'maps_new', '*.py'))):
    runpy.run_path(_f, init_globals=dict(globals()))
import json, shutil, time, copy
t0 = time.time()
# ---- biome worker merge (EXTRA_TILES.md): maps_new/*.json -> main build, Route 1 storm variant ----
import extra_merge, storm
MAPS += extra_merge.import_maps(Map, BYNAME)
import interiors_merge                       # interiors hookup (Oct 22 2026): interiors_new kit (read-only) + reuse rule, see OVERWORLD_README "Interior reuse"
MAPS += interiors_merge.import_maps(Map, BYNAME); IX_ROWS = interiors_merge.hookup(MAPS)
apply_v040_imported(MAPS)                    # Text Bot v0.4.0: handcar + rail_buffer spot on station_int (maps_new stays untouched)
import club                                  # The Firefly (club_int) + Fernwick door/sign + old_record pickups (tools/club.py; tiles registered late)
CLUB_MAP = club.apply(MAPS)
import world_data                            # World data pass (Oct 22 2026): terminal, windows, Text Bot spots, trainer sight, item flags (tools/world_data.py)
WD_LOG = world_data.apply(MAPS); WD_SPOTS = world_data.text_spots(MAPS)
import furniture_depth, furniture_colours as _FCD   # interior depth (Gary, Oct 22): tall tops -> overlay above characters, bases stay solid on decoration
import build as _bd; furniture_depth.apply_frames(_bd.TILES, only={'i_company_terminal'})   # late core tile (world_data)
DEPTH_LOG = furniture_depth.lift_tops(MAPS, set(_FCD.SCOPE + interiors_merge.RETIRED) - {'station_int'}); WD_LOG += DEPTH_LOG
import overnight_tiles; overnight_tiles.apply(MAPS)   # SANDBOX (overnight maps): record green trees on snow (swapped after the last tile)
VARIANTS = storm.make_variants(MAPS)          # route1_storm (flooded east lowland), stored in maps/ but not a separate place
MAPNAMES = {m.name for m in MAPS + VARIANTS}
res = {}; report = []; notes = []
for m in MAPS + VARIANTS:
    G, D, O, C, E = m.pre if hasattr(m, 'pre') else finalize(m); res[m.name] = (m, G, D, O, C, E)
    # door rule: every collision-4 cell must be a warp. A door with nowhere to go must not exist (README section 7).
    wp = {(w['x'], w['y']) for w in m.warps}
    for y in range(m.h):
        for x in range(m.w):
            if C[y][x] == 4 and (x, y) not in wp: report.append(f'{m.name}: door tile (code 4) without a warp at ({x},{y})')

# ---------------- puzzle solver: BFS over (player, boulders, switch states) ----------------
def solve(m, C, start, max_states=3_000_000):
    P = m.puzzle; sw = {s['id']: s for s in P['switches']}; swpos = {(s['x'], s['y']): s for s in P['switches']}
    gates = {(g['x'], g['y']): g['channel'] for g in P['gates']}
    chans = collections.defaultdict(list)
    for s in P['switches']: chans[s['channel']].append(s)
    base = [[(0 if v == 5 else v) for v in row] for row in C]
    def is_on(s, on, bs, pl):
        if s['mode'] == 'hold': return (s['x'], s['y']) in bs or (s['x'], s['y']) == pl
        return s['id'] in on
    def gate_open(ch, on, bs, pl):   # a gate may list several channels: opens if ANY of them is fully on
        return any(all(is_on(s, on, bs, pl) for s in chans[c]) for c in (ch if isinstance(ch, list) else [ch]))
    def free(x, y, on, bs, pl):
        c = base[y][x]
        if (x, y) in bs: return False
        if c in (0, 4, 7): return True
        return c == 6 and gate_open(gates[(x, y)], on, bs, pl)
    def latch(on, cell):
        s = swpos.get(cell)
        if s and s['type'] == 'plate' and s['mode'] == 'latch' and s['id'] not in on: return on | {s['id']}
        return on
    st0 = (start, tuple(sorted((b['x'], b['y']) for b in P['boulders'])), frozenset(s['id'] for s in P['switches'] if s['start_on']))
    st0 = (st0[0], st0[1], latch(st0[2], start))
    par = {st0: None}; q = collections.deque([st0]); first = {start: st0}
    while q and len(par) < max_states:
        st = q.popleft(); (x, y), bs, on = st
        if base[y][x] == 4 and (x, y) != start: continue
        nxt = []
        for dx, dy, nm in ((0, 1, 'D'), (0, -1, 'U'), (1, 0, 'R'), (-1, 0, 'L')):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < m.w and 0 <= ny < m.h): continue
            bset = set(bs)
            if (nx, ny) in bset:   # push
                bx, by = nx + dx, ny + dy
                if not (0 <= bx < m.w and 0 <= by < m.h) or base[by][bx] not in (0, 7) or (bx, by) in bset: continue
                bset.discard((nx, ny)); bset.add((bx, by)); nb = tuple(sorted(bset))
                non = latch(latch(on, (bx, by)), (nx, ny)); nxt.append((((nx, ny), nb, non), nm + '*'))
                continue
            c = base[ny][nx]
            if c == 2:
                if dy == 1 and ny + 1 < m.h and free(nx, ny + 1, on, bs, (x, y)): nxt.append((((nx, ny + 1), bs, latch(on, (nx, ny + 1))), 'J'))
                continue
            if free(nx, ny, on, bs, (x, y)): nxt.append((((nx, ny), bs, latch(on, (nx, ny))), nm))
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):   # interact with adjacent crystal
            s = swpos.get((x + dx, y + dy))
            if s and s['type'] == 'crystal': nxt.append((((x, y), bs, on ^ frozenset(s['toggles'])), f"A{s['id']}"))
        for ns, mv in nxt:
            if ns not in par:
                par[ns] = (st, mv); q.append(ns)
                if ns[0] not in first: first[ns[0]] = ns
    def path_to(cell):
        st = first.get(cell); out = []
        while st is not None and par[st] is not None: st, mv = par[st]; out.append(mv)
        return out[::-1]
    return set(first), path_to, len(par)

def compress(mv):
    out = []
    for x in mv:
        if out and out[-1][0] == x: out[-1][1] += 1
        else: out.append([x, 1])
    return ' '.join(f'{a}{b}' if b > 1 else a for a, b in out)

WD_TERMINAL_ID = world_data.late_tiles(res)   # new core tile registered after every map is final (ids stay stable)
CLUB_TILES = club.late(res)                    # club tiles after the terminal: new ids at the end, placeholders patched
furniture_depth.apply_frames(_bd.TILES, only={'i_company_terminal'})   # FIX (Oct 22): the call above ran before late_tiles registered the terminal (no-op); run it now
CLUB_BAD, CLUB_REACH = club.verify(res); report += [f'club_int: {b}' for b in CLUB_BAD]; print(f'CLUB: {len(CLUB_TILES)} tiles, {CLUB_REACH} cells reachable from the door, problems: {CLUB_BAD or "none"}')
OVN_LOG = overnight_tiles.late(res); print('\n'.join(OVN_LOG))   # SANDBOX (overnight maps): snow pine pair registered LAST, ids patched like club.late
WD_TAGS = world_data.tag(res)                # Animator soul data: tags.shallow / crystal / firefly_zone / bird_perch
# ---------------- connectivity (all story flags set: gates open; per-flag states are checked by progression.check) ----------------
import progression
for name, (m, G, D, O, C, E) in res.items():
    if name in storm.SKIP_GENERIC: continue        # variants get their own checks (storm.check)
    C = progression.state_C(m, C, set(progression.STORY_FLAGS))
    pts = {k: v for k, v in entry_cells(m).items() if v}
    tg = dict(pts)
    if m.puzzle and m.puzzle.get('goal'): tg['goal:' + m.puzzle['goal']['what']] = (m.puzzle['goal']['x'], m.puzzle['goal']['y'])
    for k, p in pts.items():
        if m.puzzle: reach, path_to, nst = solve(m, C, p)
        else: reach = bfs(m, C, p)
        miss = [k2 for k2, p2 in tg.items() if p2 not in reach]
        if miss: report.append(f'{name}: from {k} cannot reach {miss[:4]}')
    if m.puzzle:
        # proof that the puzzle really gates progress: static BFS with gates shut and boulders as walls
        k0, p0 = next(iter(pts.items())); reach0 = bfs(m, C, p0)
        gated = [k for k, p in tg.items() if p not in reach0]
        reach, path_to, nst = solve(m, C, p0)
        sol = {k: compress(path_to(p)) for k, p in tg.items() if k in gated}
        m.puzzle['verified'] = dict(start=k0, states_explored=nst, gated_targets=gated, shortest_solution=sol,
                                    legend='U/D/L/R step, X* = step that pushes a boulder, J = ledge jump, A<id> = touch crystal, n = repeat')
        notes.append(f'{name}: puzzle solvable; {len(gated)} target(s) gated behind it; {nst} states searched')
        for k, v in sol.items(): notes.append(f'   {k}: {v}')
        if not gated: report.append(f'{name}: puzzle does not gate anything')
    for n in m.npcs + m.items + getattr(m, 'npcs_pending', []):
        if C[n['y']][n['x']] not in (0, 7): report.append(f"{name}: {n['id']} stands on blocked tile ({C[n['y']][n['x']]})")
    _idn = {t['id']: t['name'] for t in BYNAME.values()}
    for sp in getattr(m, 'interact_spots', []):   # Text Bot v0.4.0 named spots: same rules as build_overworld_lines.py
        sx, sy = sp['stand']; dn = _idn.get(D[sp['y']][sp['x']], '') or ''
        if C[sy][sx] not in (0, 7): report.append(f"{name}: spot {sp['id']} stand ({sx},{sy}) is blocked ({C[sy][sx]})")
        if sp['kind'] == 'trigger':
            if (sx, sy) != (sp['x'], sp['y']): report.append(f"{name}: trigger {sp['id']} stand != x,y")
        else:
            dx, dy = dict(up=(0, -1), down=(0, 1), left=(-1, 0), right=(1, 0))[sp['face']]
            if (sx + dx, sy + dy) != (sp['x'], sp['y']): report.append(f"{name}: spot {sp['id']} stand+face does not reach ({sp['x']},{sp['y']})")
        if not dn.startswith(sp['tile']): report.append(f"{name}: spot {sp['id']} expects tile {sp['tile']}* at ({sp['x']},{sp['y']}), found {dn or 'nothing'}")
    for wp in m.warps:
        if wp['to'] == '$return' or wp['note'].startswith('TO COME'): continue
        if wp['to'] not in MAPNAMES: report.append(f"{name}: warp to unknown map {wp['to']}"); continue
        Ct = res[wp['to']][4]
        if Ct[wp['ty']][wp['tx']] not in (0, 7): report.append(f"{name}: warp to {wp['to']} lands on blocked ({wp['tx']},{wp['ty']})")
    for ex in m.exits:
        if not ex['note'].startswith('TO COME') and ex['to'] not in MAPNAMES: report.append(f"{name}: exit to unknown map {ex['to']}")
    if any(w['note'].startswith('TO COME') for w in m.warps): report.append(f'{name}: has TO COME door warp')
for name, msgs in storm.check(res, bfs).items():
    for ok, msg in msgs: (notes if ok else report).append(f'{name}: {msg}')
_ixp, _ixn = interiors_merge.check(res, MAPNAMES, IX_ROWS); report += _ixp; notes += ['--- interiors hookup ---'] + _ixn
IX_DOC, _ixrc = interiors_merge.write_recolours(IX_ROWS); _ixr = interiors_merge.check_recolours(IX_DOC, _ixrc, IX_ROWS); report += _ixr
notes.append(f"home_recolours (staged): {len(IX_DOC['schemes'])} schemes, {len(IX_DOC['recolourable'])} recolourable tiles "
             f"({sum(1 for v in IX_DOC['recolourable'].values() if v['mask'])} masked), {len(IX_DOC['doors'])} doors; checks {'OK' if not _ixr else 'FAIL'}")
json.dump(IX_ROWS, open(os.path.join(OUT, 'qa', 'interiors_hookup', 'door_table.json'), 'w'), indent=1)
_wdp = world_data.check(res, bfs, MAPS); report += _wdp; WD_DOC = world_data.write(res, MAPS)
notes += ['--- world data ---'] + WD_LOG + [f'tags: {WD_TAGS}', f'text spots added: {[(n, s["id"]) for n, s in WD_SPOTS]}', f'encounter tables: {list(WD_DOC["zones"])}', f'items: {sum(len(m.items) for m in MAPS)} placed, flags unique']
print('WORLD DATA:', 'OK' if not _wdp else f'FAIL {len(_wdp)}')
# Text Bot id check (8:39 PM): every id in overworld_lines.json maps.<map>.* and unplaced.*.proposed_spot must exist in the built maps
_tip, _tin = world_data.check_text_ids({m.name: m for m in MAPS}); report += _tip
print('TEXT IDS:', f'OK ({_tin} ids from overworld_lines.json present)' if not _tip else f'FAIL, {len(_tip)} of {_tin} missing'); print('\n'.join('  ! ' + x for x in _tip))
pp, pn, pextra = progression.check({k: v for k, v in res.items() if k not in storm.SKIP_GENERIC})
print('\n'.join(report) or 'ALL CONNECTED (puzzle maps checked in solved state)')
print('PROGRESSION:', 'PASS' if not pp else 'FAIL'); print('\n'.join('  ! ' + x for x in pp))
notes += ['--- progression ---'] + pn; report += pp
print('\n'.join(notes))
json.dump(dict(problems=report, notes=notes), open('/tmp/report.json', 'w'), indent=1)
if CHECK:
    # --check: also validate what is on disk now (maps/*.json, read only) against overworld_lines.json, then stop before any output step
    _disk = {os.path.basename(f)[:-5]: json.load(open(f)) for f in glob.glob(f'{OUT}/maps/*.json')}
    _dp, _dn = world_data.check_text_ids(_disk)
    print('TEXT IDS (maps/*.json on disk):', f'OK ({_dn} ids)' if not _dp else f'FAIL, {len(_dp)} of {_dn} missing'); print('\n'.join('  ! ' + x for x in _dp))
    print(f'--check: nothing written ({len(runguard.SUPPRESSED)} write calls suppressed); in-memory problems: {len(report)}')
    _sys.exit(1 if (report or _dp) else 0)

# ---------------- outputs ----------------
for d in ('tiles', 'tiles_128'):
    if os.path.isdir(f'{OUT}/{d}'): shutil.rmtree(f'{OUT}/{d}')      # old painted 192px kit (superseded by pixel art)
if os.path.exists(f'{OUT}/tileset_128.json'): os.remove(f'{OUT}/tileset_128.json')
for d in ('tiles_1x', 'tiles_2x', 'tiles_3x', 'previews', 'maps', 'refs'): os.makedirs(f'{OUT}/{d}', exist_ok=True)
palette_png(f'{OUT}/palette.png')
for nm, im in REFS.items(): im.save(f'{OUT}/refs/{nm}_1x.png'); im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(f'{OUT}/refs/{nm}_3x.png')
byname = {t['name']: t for t in TILES}
_byid = {t['id']: t for t in TILES}
def _fog_img(m, frame=0):
    im = Image.new('RGBA', (m.w * T, m.h * T), (0, 0, 0, 0))
    for y in range(m.h):
        for x in range(m.w):
            v = m.fog_layer[y][x]
            if v: fr = _byid[v]['frames']; im.alpha_composite(fr[frame % len(fr)], (x * T, y * T))
    return im
for name, (m, G, D, O, C, E) in res.items():
    im = render(m, G, D, O)
    if getattr(m, 'fog_layer', None): im.alpha_composite(_fog_img(m))
    im.convert('RGB').resize((im.width * 3, im.height * 3), Image.NEAREST).save(f'{OUT}/previews/{name}.png', optimize=True)
    t = 32; sm = im.resize((m.w * t, m.h * t), Image.NEAREST); d = ImageDraw.Draw(sm, 'RGBA')
    for y in range(m.h):
        for x in range(m.w):
            c = {1: (255, 0, 0, 70), 2: (255, 160, 0, 120), 3: (0, 80, 255, 60), 4: (0, 255, 0, 150), 5: (255, 255, 255, 120), 6: (200, 0, 255, 120), 7: (0, 255, 255, 120),
                 8: (255, 120, 200, 110), 9: (255, 220, 120, 120), 10: (170, 230, 255, 140), 11: (0, 20, 160, 130)}.get(C[y][x])
            if c: d.rectangle([x * t, y * t, x * t + t - 1, y * t + t - 1], fill=c)
            if E[y][x]: d.rectangle([x * t + 4, y * t + 4, x * t + t - 5, y * t + t - 5], outline=(255, 255, 0, 200), width=2)
    for n in m.npcs + getattr(m, 'npcs_pending', []) + (getattr(m, 'soul', None) or {}).get('text_pending', {}).get('npcs', []): d.ellipse([n['x'] * t + 6, n['y'] * t + 6, n['x'] * t + t - 6, n['y'] * t + t - 6], fill=(255, 255, 255, 230), outline=(0, 0, 0))
    for n in m.items: d.rectangle([n['x'] * t + 10, n['y'] * t + 10, n['x'] * t + t - 10, n['y'] * t + t - 10], fill=(255, 0, 255, 230))
    sm.convert('RGB').save(f'{OUT}/previews/{name}_debug.png')
    data = dict(name=m.name, title=m.title, width=m.w, height=m.h, tile_size=T, tileset='../tileset.json',
                layers=dict(ground=G, decoration=D, overlay=O, collision=C, encounter=E),
                warps=m.warps, exits=m.exits, npcs=[dict(n, text_ref=f'overworld_lines.json maps.{name}.{n["id"]}') for n in m.npcs],
                signs=[dict(s, text_ref=f'overworld_lines.json maps.{name}.{s["id"]}', text_note='dev label only; final text = text_ref') for s in m.signs], items=m.items, encounter_zones=m.enc_zones)
    if getattr(m, 'fog_layer', None): data['layers']['fog'] = m.fog_layer; data['fog'] = m.fog_meta
    if hasattr(m, 'npcs_pending'):
        data['source'] = m.source
        data['npcs_pending_text'] = [dict(n, text_ref=extra_merge.PENDING_REF.get((name, n['id']), f'overworld_lines.json maps.{name}.{n["id"]} (key requested from Text Bot)')) for n in m.npcs_pending]
        data['signs_pending_text'] = [dict(s, text_ref=extra_merge.PENDING_REF.get((name, s['id']), f'overworld_lines.json maps.{name}.{s["id"]} (key requested from Text Bot)'), text_note='dev label only') for s in m.signs_pending]
        data['pending_text_note'] = ('These npcs/signs are real and placed, but kept out of npcs/signs until Text Bot adds maps.' + name +
                                     '.* keys (the Text Bot validator requires npcs/signs ids == its maps.<name> keys). Engine: treat them exactly like npcs/signs.')
    if name == 'house_2f':
        ps = next(n for n in m.npcs if n['id'] == 'player_start')
        data['player_start'] = dict(x=ps['x'], y=ps['y'], facing=ps['facing'], when='new game (no save)', note='same cell as npc player_start (progression.py world graph starts here)')
    if getattr(m, 'variant_of', None): data['variant_of'] = m.variant_of
    if getattr(m, 'variants', None): data['variants'] = m.variants
    if m.puzzle: data['puzzle'] = m.puzzle
    if m.story_gates: data['story_gates'] = m.story_gates
    if m.forced_grass: data['forced_grass'] = m.forced_grass
    if m.fly_point: data['fly_point'] = m.fly_point
    if getattr(m, 'movement_extra', None): data['movement_extra'] = m.movement_extra
    if getattr(m, 'soul', None): data.update(m.soul)
    if getattr(m, 'tags', None): data['tags'] = m.tags   # world_data.tag (Animator soul data)
    if getattr(m, 'interact_spots', None): data['interact_spots'] = m.interact_spots   # Text Bot v0.4.0 named interact spots                     # soul pass: bin_stages / ambient / flag_swaps / mood
    data['movement'] = dict(run=not progression.INDOOR_OR_CAVE(name) or True, bike=not progression.INDOOR_OR_CAVE(name),
                            note='running allowed everywhere (incl. indoors); bike outdoors only - see MOVEMENT.md')
    if m.bike or pextra.get(name, {}).get('bike_only_region'):
        data['bike'] = dict(m.bike or {}, no_dismount_cells=pextra.get(name, {}).get('bike_only_region', []),
                            rule='player cannot get off the bike on these cells (reachable only by bike)')
    if getattr(m, 'variant_of', None):
        os.makedirs(f'{OUT}/maps/variants', exist_ok=True); data['tileset'] = '../../tileset.json'
        open(f'{OUT}/maps/variants/{name}.json', 'w').write(json.dumps(data, separators=(',', ':')))
    else: open(f'{OUT}/maps/{name}.json', 'w').write(json.dumps(data, separators=(',', ':')))
cats = collections.OrderedDict()
for t in TILES:
    if not t.get('ext'): cats.setdefault(t['cat'], []).append(t)      # x_ tiles keep their own sheets in tiles_extra/
entries = []
for cat, ts in cats.items():
    n = sum(len(t['frames']) for t in ts); cols = 16; rows = (n + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * T, rows * T), (0, 0, 0, 0)); i = 0
    for t in ts:
        idx = []
        for f in t['frames']: sheet.paste(f, ((i % cols) * T, (i // cols) * T)); idx.append(i); i += 1
        e = dict(id=t['id'], name=t['name'], category=cat, sheet=f'tiles_1x/{cat}.png', index=idx[0], col=idx[0] % cols, row=idx[0] // cols,
                 walkable=t['coll'] in ('walk', 'door', 'plate'), collision=t['coll'], collision_code=COLL[t['coll']], encounter=bool(t['enc']))
        if t.get('anim'): e['animation'] = dict(t['anim'], frames=idx[1:], idle_frame=idx[0])
        elif len(idx) > 1: e['animation'] = dict(frames=idx, frame_ms=t['ms'], loop=True)
        if t['notes']: e['notes'] = t['notes']
        if t.get('ysort'): e['ysort'] = True
        if t['states']: e['states'] = {k: byname[v]['id'] for k, v in t['states'].items()}
        entries.append(e)
    sheet.save(f'{OUT}/tiles_1x/{cat}.png', optimize=True)
    for k in (2, 3): sheet.resize((sheet.width * k, sheet.height * k), Image.NEAREST).save(f'{OUT}/tiles_{k}x/{cat}.png', optimize=True)
base = dict(tile_size=T, native_tile_size=T, scale=1, columns_per_sheet=16, id_zero='empty', collision_codes=COLL,
            render='nearest-neighbour, integer zoom only', palette='palette.png',
            draw_order=['ground', 'decoration', 'characters + ysort overlay tiles, sorted by tile row (character first on ties)', 'overlay (non-ysort: canopies, roofs)'],
            sheets=dict({c: f'tiles_1x/{c}.png' for c in cats}, **extra_merge.sheets(1), **interiors_merge.sheets(1)),
            multi_tile_objects=dict({k: dict(w=v[0], h=v[1], tile_name_pattern=f'{k}_<row>_<col>') for k, v in MULTI.items()}, **extra_merge.XT['multi_tile_objects'], **interiors_merge.IT['multi_tile_objects']),
            tiles=entries + extra_merge.tileset_entries(1) + interiors_merge.tileset_entries(1))
import furniture_fix; furniture_fix.x_sheet_entries(base['tiles'], BYNAME)   # fixed x_ station tiles -> tiles_1x/x_furniture_fix.png (ids kept)
base['sheets']['x_furniture_fix'] = 'tiles_1x/x_furniture_fix.png'
base['ambient'] = dict(footprints=FOOTPRINTS, fish='maps with an ambient.fish_spots list draw fish_shadow/fish_ripple there (see OVERWORLD_README section 14)')
base['draw_order'].append('fog (layers.fog, maps with a fog block only: drawn last, above overlay; tile state "clear" = 0 once the fog is cleared)')
base['extra_tiles'] = ('ids 5001-5677 (x_ names) come from the biome worker kit tileset_extra.json; sheets x_<category> -> tiles_extra/<k>x/. '
                       'Entries with alias_of are pixel-identical copies of a base tile: maps use the base id (merge remaps them).')
for e in base['tiles']:
    if e.get('alias_of'): e['alias_of'] = dict(name=e['alias_of'], id=byname[e['alias_of']]['id']) if e['alias_of'] in byname else None
    if e.get('alias_of') is None: e.pop('alias_of', None)
json.dump(base, open(f'{OUT}/tileset.json', 'w'), indent=1)
for k, use in ((2, '1080p'), (3, '1440p')):
    ts = json.loads(json.dumps(base)); ts['tile_size'] = T * k; ts['scale'] = k; ts['sheets'] = dict({c: f'tiles_{k}x/{c}.png' for c in cats}, **extra_merge.sheets(k), **interiors_merge.sheets(k), x_furniture_fix=f'tiles_{k}x/x_furniture_fix.png')
    for e in ts['tiles']: e['sheet'] = e['sheet'].replace('tiles_1x/', f'tiles_{k}x/').replace('tiles_extra/1x/', f'tiles_extra/{k}x/')
    ts['note'] = f'{use} variant: nearest-neighbour x{k} of the native 64px pixel art. Same ids/indices/cols/rows; maps work unchanged.'
    json.dump(ts, open(f'{OUT}/tileset_{k}x.json', 'w'), indent=1)
# world_layout.json: refresh the generated progression sections (hand-written zone/route data is kept)
_wl = json.load(open(f'{OUT}/world_layout.json'))
_mj = {m.name: json.load(open(f'{OUT}/maps/{m.name}.json')) for m in MAPS}
_wl.update(progression.world_sections(_mj, _wl['zones']))
_wl['maps_built'] = sorted(m.name for m in MAPS)          # includes merged maps_new maps (mirefen_bog, station_int)
_wl['map_variants'] = {m.name: dict(variant_of=m.variant_of['map'], active_when=m.variant_of['active_when']) for m in VARIANTS}
for z in _wl['zones']:
    if z['id'] == 'mirefen' and 'mirefen_bog' not in z['maps']: z['maps'].append('mirefen_bog')
    if z['id'] == 'greystone_caverns' and 'lantern_rest' not in z['maps']: z['maps'].append('lantern_rest')   # soul pass #14 side glade
_wl['shared_interiors'] = ['RULE: only story-necessary buildings get a unique interior (OVERWORLD_README "Interior reuse"); everything else is shared, exits use $return',
    'heal_brookhollow: THE shared Revival Tech heal branch (every town without a story need; Fernwick has its own: 8.5-E)',
    'shop_int: THE shared mart', 'station_int: every Lumen Line stop (exit mats use $return)'] + [
    f"{h['map']}: shared home design {h['id']} ({h['size']}, {h['style']}); rotated 1 in 4 per area, per-door recolour" for h in interiors_merge.HOME_POOL] + [
    f"{r}: RETIRED (kept in maps/, no door warps to it)" for r in interiors_merge.RETIRED]
_wl['unique_interiors'] = interiors_merge.UNIQUE
_wl['interior_doors'] = IX_ROWS
world_data.zone_wiring(_wl, IX_ROWS)          # Text Bot v0.4.2 meta.zone_wiring_todo: every interior listed under its town(s)
_wl['rail']['station_interior'] = storm.STATION_NOTE
_wl['progression_check'] = dict(result='PASS' if not pp else 'FAIL', problems=pp, checked='per flag state: gates, forced grass, bike optional / no soft-lock, Skylift + rail add no reachability')
for z in _wl['zones']:
    d = _wl['fly']['destinations'].get(z['id'])
    if d: z['fly_point'] = d.get('fly_point'); z['fly'] = d['fly']; z['rail_stop'] = d['rail_stop']; z['no_fly_reason'] = d.get('no_fly_reason')
    if d and not d['fly']: z['notes'] = (z['notes'].split(' | No fly:')[0] + ' | No fly: ' + progression.RESTRICT).strip(' |')
json.dump(_wl, open(f'{OUT}/world_layout.json', 'w'), indent=1)
print(len(TILES), 'tiles', f'{time.time() - t0:.0f}s')
# ---- time-of-day grades (soul pass #9): grades.json + LUT PNGs + previews/time_of_day.png (reads the previews written above) ----
import time_of_day
_tod = time_of_day.build(); print('time_of_day:', list(_tod['grades']), 'day identity:', all(k == v for k, v in _tod['grades']['day']['map'].items()))
# ---- interiors hookup previews + 4-phase check (recolour -> grade); needs the previews written above ----
import interiors_previews
# ---- furniture-colour rule (GAME_QUALITY_CHECKLIST, Oct 22 2026): reads the maps/*.json + tileset.json + home_recolours.json written above ----
import furniture_colours
_fc, _fcrows = furniture_colours.check()
print('FURNITURE COLOURS:', 'OK, 0 overlaps' if not _fcrows else f'FAIL, {len(_fcrows)} overlaps (qa/furniture_colours/report.json)')
print('\n'.join('  ! ' + x for x in _fc[:40]))
if _tip: print(f'run.py: FAIL: {len(_tip)} Text Bot ids missing after the build (TEXT IDS above)'); _sys.exit(1)
