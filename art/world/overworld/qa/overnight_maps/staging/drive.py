# DRAFT driver: runs the SANDBOX tools/run.py --check (shared lock via run.py/runguard; writes nothing), then renders + exports the overnight maps.
import sys, os, builtins, json, shutil, io, time
import PIL.Image as PI
ST = os.path.dirname(os.path.abspath(__file__)); SB = os.path.join(ST, 'sandbox', 'overworld'); QA = os.path.dirname(ST)
SAVE, OPEN = PI.Image.save, builtins.open
ORIG = [(mod, n, getattr(mod, n)) for mod, n in ((os, 'remove'), (os, 'unlink'), (os, 'makedirs'), (os, 'mkdir'), (os, 'replace'), (os, 'rename'), (shutil, 'rmtree'), (shutil, 'copy'), (shutil, 'copyfile'), (shutil, 'copy2'), (io, 'open'))]
os.chdir(SB); sys.argv = ['run.py', '--check']; sys.path.insert(0, os.path.join(SB, 'tools'))
g = {'__name__': '__main__', '__file__': os.path.join(SB, 'tools', 'run.py')}
code = 0
try: exec(compile(OPEN(g['__file__']).read(), g['__file__'], 'exec'), g)
except SystemExit as e: code = e.code
PI.Image.save, builtins.open = SAVE, OPEN
for mod, n, f in ORIG: setattr(mod, n, f)
print('RUN_EXIT', code, flush=True)
_gm = next((mod for mod in list(sys.modules.values()) if getattr(mod, 'GD_ENC', None) is not None), None)
if _gm is not None: g['GD_ENC'], g['GD_REPORT'] = _gm.GD_ENC, _gm.GD_REPORT; g['ITEM_AUDIT'] = getattr(_gm, 'ITEM_AUDIT', {})
if _gm is None and 'res' in g:   # run_path hook modules are not in sys.modules: collect from the draft maps themselves
    _dm = [g['res'][n][0] for n in g['res'] if getattr(g['res'][n][0], 'draft', False)]
    if any(hasattr(mm, 'gd_tables') for mm in _dm):
        g['GD_ENC'] = {k: v for mm in _dm for k, v in getattr(mm, 'gd_tables', {}).items()}
        g['GD_REPORT'] = {mm.name: mm.gd_report for mm in _dm if hasattr(mm, 'gd_report')}
    g['ITEM_AUDIT'] = {mm.name: mm.item_audit for mm in _dm if getattr(mm, 'item_audit', None)}
if 'GD_ENC' in g:   # dump Game dev tables (+ keep any older table still used by a map, filled from that map's GD land table)
    old = json.load(OPEN(os.path.join(ST, 'encounters_overnight.json')))
    T = dict(g['GD_ENC']); used = {z['table']: n for n, mm in ((n, g['res'][n][0]) for n in g['res'] if getattr(g['res'][n][0], 'draft', False)) for z in mm.enc_zones}
    for t, n in used.items():
        if t in T: continue
        land = [k for k in T if k.startswith(n + '_') and T[k]['method'] == 'grass']
        T[t] = dict(T[land[0]], source=T[land[0]]['source'] + ' (copied for this strip)') if land else old.get(t)
    newtxt = json.dumps(T, indent=1); prev = OPEN(os.path.join(SB, 'encounters_overnight.json')).read()
    for p in (os.path.join(ST, 'encounters_overnight.json'), os.path.join(SB, 'encounters_overnight.json')): OPEN(p, 'w').write(newtxt)
    print('GD_ENC tables', len(T), 'CHANGED' if newtxt != prev else 'same', flush=True)
if 'res' not in g: sys.exit(2)
res = g["res"]; ON = [n for n in res if getattr(res[n][0], "draft", False)]; print("ON", len(ON), ON)
import build, time_of_day as tod, numpy as np
CODES = dict(grass=1, grass_dark=2, cave=3, mud=4, sand=5, snow=6, path=7, trail=8, water=9, cave_water=10, cavewall=11)
only = set(sys.argv[1:]) if False else None
out = {}
# export ids (00:58 CT): the sandbox registers the new maps' on-demand edge tiles BEFORE the late tiles (terminal, club_*, camp_cold),
# so in memory those late tiles sit on new ids. Staged JSON must not renumber anything: every tile the live tileset.json has keeps
# its live id (looked up by name); tiles new to these drafts get placeholder ids 6001+ in registration order (snow pine last).
_LIVE = json.load(OPEN(os.path.join(QA, '..', '..', 'tileset.json')))['tiles']
_LBN = {t['name']: t['id'] for t in _LIVE}; _MEMN = {t['id']: t['name'] for t in build.TILES}
_core_max = max(t['id'] for t in _LIVE if t['id'] < 5000); NEW_IDS = {}
# 01:05 CT: staged-only PLACEHOLDER block 6001-6999. The ids right after the live core range are claimed by the autotile port
# (tile_id_ledger + new_tile_ids.txt, 1578-1823 and on), ext tiles are 5001-5677, interiors 7001+. A real run.py numbers these by name, last.
STAGE_ID0 = 6000; assert not any(STAGE_ID0 < t['id'] < 7000 for t in _LIVE), 'staged placeholder block 6001-6999 is no longer free in live tileset.json'
_next = [STAGE_ID0]
def _xid(v):
    if not v: return v
    n = _MEMN[v]
    if n in _LBN: return _LBN[n]
    if n not in NEW_IDS: _next[0] += 1; NEW_IDS[n] = _next[0]
    return NEW_IDS[n]
for _n in sorted({t['name'] for t in build.TILES if t['name'] not in _LBN}, key=lambda n: build.BYNAME[n]['id']): _xid(build.BYNAME[_n]['id'])
def _X(L): return [[_xid(v) for v in r] for r in L]
for name in ON:
    if name not in res: print('MISSING', name); continue
    m, G, D, O, C, E = res[name]; d = os.path.join(ST, name); os.makedirs(d, exist_ok=True)
    im = build.render(m, G, D, O).convert('RGB'); s = 16; sm = im.resize((m.w * s, m.h * s), PI.LANCZOS); a = np.asarray(sm).astype(float)
    panels = [PI.fromarray(np.clip(tod.grade_fn(ph, a), 0, 255).astype('uint8')) for ph in ('dawn', 'day', 'dusk', 'night')]
    W, H = m.w * s, m.h * s; sheet = PI.new('RGB', (W * 2 + 8, H * 2 + 8), (20, 20, 28))
    for i, p in enumerate(panels): sheet.paste(p, ((i % 2) * (W + 8), (i // 2) * (H + 8)))
    sheet.save(os.path.join(d, f'{name}_overview.png'), optimize=True)
    if getattr(m, 'snow_pine_cells', None):   # 64 px close-up, 4 phases (snow pine check)
        fx, fy = min(m.snow_pine_cells, key=lambda c: abs(c[0] - m.w // 2) + abs(c[1] - m.h // 3))[:2]
        x0, y0 = max(0, min(m.w - 12, fx - 6)), max(0, min(m.h - 8, fy - 4)); cw, ch = min(12, m.w) * 64, min(8, m.h) * 64
        cu = np.asarray(im.crop((x0 * 64, y0 * 64, x0 * 64 + cw, y0 * 64 + ch))).astype(float)
        cs = PI.new('RGB', (cw * 2 + 8, ch * 2 + 8), (20, 20, 28))
        for i, ph in enumerate(('dawn', 'day', 'dusk', 'night')): cs.paste(PI.fromarray(np.clip(tod.grade_fn(ph, cu), 0, 255).astype('uint8')), ((i % 2) * (cw + 8), (i // 2) * (ch + 8)))
        cs.save(os.path.join(d, f'{name}_snowpine_closeup.png'), optimize=True)
    panels[1].save(os.path.join(d, f'{name}_day.png'), optimize=True); panels[3].save(os.path.join(d, f'{name}_night.png'), optimize=True)
    json.dump(dict(map=name, width=m.w, height=m.h, codes=CODES, note='DRAFT: port IntGrid codes; 0 = interior floor / not autotiled',
                   intgrid=[[CODES.get(t, 0) for t in row] for row in m.terr]), OPEN(os.path.join(d, 'terrain.json'), 'w'))
    ent = dict(map=name, draft=True, title=m.title, size=[m.w, m.h], exits=m.exits, warps=m.warps, npcs_pending=m.npcs_pending, signs_pending=m.signs_pending,
               items=m.items, encounter_zones=m.enc_zones, story_gates=m.story_gates, forced_grass=m.forced_grass, fly_point=m.fly_point,
               puzzle=m.puzzle, hall_puzzle=getattr(m, 'hall_puzzle', None), field_obstacles=m.field_obstacles, rail_only=getattr(m, 'rail_only', None),
               layers=dict(ground=_X(G), decoration=_X(D), overlay=_X(O), collision=C, encounter=E))
    json.dump(ent, OPEN(os.path.join(d, 'map_draft.json'), 'w'))
    gm = dict(name=name, title=m.title, draft=True, width=m.w, height=m.h, tile_size=64, tileset=os.path.relpath(os.path.join(QA, '..', '..', 'tileset.json'), d),
              layers=dict(ground=_X(G), decoration=_X(D), overlay=_X(O), collision=C, encounter=E), tiles_new='../tile_ids_staged.json', warps=m.warps, exits=m.exits, npcs=[], signs=[], items=m.items,
              encounter_zones=m.enc_zones, source=getattr(m, 'source', ''),
              npcs_pending_text=[dict(n, text_ref=f'overworld_lines.json maps.{name}.{n["id"]} (key requested from Text Bot)') for n in m.npcs_pending],
              signs_pending_text=[dict(x, text_ref=f'overworld_lines.json maps.{name}.{x["id"]} (key requested from Text Bot)', text_note='dev label only') for x in m.signs_pending],
              pending_text_note='DRAFT staged map (GameMap format as run.py writes it). npcs/signs stay pending until Text Bot adds maps.' + name + '.* keys; engine: treat pending exactly like npcs/signs.')
    for k in ('puzzle', 'story_gates', 'forced_grass', 'fly_point'):
        if getattr(m, k, None): gm[k] = getattr(m, k)
    for k in ('hall_puzzle', 'master_flag', 'field_obstacles', 'rail_only'):
        if getattr(m, k, None): gm[k] = getattr(m, k)
    json.dump(gm, OPEN(os.path.join(d, name + '.json'), 'w'))
    out[name] = dict(size=f'{m.w}x{m.h}', exits=[f"{e['edge']} {e['start']}-{e['end']} -> {e['to']} (off {e['offset']})" for e in m.exits],
                     warps=[f"({w['x']},{w['y']}) -> {w['to']}" for w in m.warps], zones=sorted({z['table'] for z in m.enc_zones}),
                     trainers=[n['id'] for n in m.npcs_pending if n['kind'] in ('trainer_hooded', 'master')],
                     refs=[f"maps.{name}.{n['id']}" for n in m.npcs_pending + m.signs_pending],
                     obstacles=[f"{o['kind']}@({o['x']},{o['y']})" for o in m.field_obstacles] + [f"gate {sg['id']} ({sg['flag']})" for sg in m.story_gates] +
                               [f"forced {f['id']}" for f in m.forced_grass] + ([f"puzzle {len(m.puzzle['switches'])} sw/{len(m.puzzle['boulders'])} boulders"] if m.puzzle else []))
# tile-id cross-check (00:58 CT): every exported id must be a live id with the same name, or one of the new ids listed here
_live = {t['id']: t['name'] for t in _LIVE}; _bad = []
for name in out:
    gmj = json.load(OPEN(os.path.join(ST, name, name + '.json')))
    for k in ('ground', 'decoration', 'overlay'):
        for r in gmj['layers'][k]:
            for v in r:
                if v and v not in _live and v not in NEW_IDS.values(): _bad.append((name, v))
_used = {}
for name in out:
    m, G, D, O, C, E = res[name]
    for L in (G, D, O):
        for r in L:
            for v in r:
                if v and _MEMN[v] in NEW_IDS: _used.setdefault(_MEMN[v], set()).add(name)
json.dump(dict(note='DRAFT: tiles the staged maps use that live tileset.json does not have yet. They carry staged PLACEHOLDER ids 6001+ (free block: the ids after '
               f'the live core range, live core max {_core_max}, belong to the autotile port); every other id in the staged maps is the LIVE id of the same-named tile (nothing renumbered). '
               'Images: sandbox build (tools/run.py in staging/sandbox); a real run.py on promotion registers them by name, last.',
               live_core_max=_core_max, unknown_ids=_bad[:50], ids={str(i): dict(name=n, maps=sorted(_used.get(n, ()))) for n, i in sorted(NEW_IDS.items(), key=lambda kv: kv[1]) if n in _used}),
          OPEN(os.path.join(ST, 'tile_ids_staged.json'), 'w'), indent=1)
print('NEW TILE IDS used by staged maps:', len(_used), '| unknown ids:', len(_bad), flush=True)
json.dump(dict(exit=code, gd=g.get('GD_REPORT'), item_audit=g.get('ITEM_AUDIT'), snow_pine=g.get('OVN_LOG'), maps=out, t=time.strftime('%H:%M %Z')), OPEN(os.path.join(ST, 'drive_result.json'), 'w'), indent=1)
print('RENDERED', len(out))
