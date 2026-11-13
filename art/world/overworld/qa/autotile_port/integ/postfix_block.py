
# ===================================================================================================================
# INTEGRATOR POSTFIX (Oct 23 2026 ~00:55 CT, appended at integration; staged source unchanged)
#  (a) blocked word: player-visible pocket label -> 'Glow Remedy' (item ids like energy_tonic / tonic_small stay as they are)
#  (b) GAME_QUALITY_CHECKLIST line 354: no smoke, haze or fog anywhere -> visible fog/mist/haze/smoke words replaced,
#      mirefen_hall_int is a DARKNESS puzzle lit by reed lamps (no fog layer)
import re as _re
_VIS = [(r'Fogwalker', 'Lampwalker'), (r'fog bank', 'reed bank'), (r'\bfog\b', 'dark'), (r'\bFog\b', 'Dark'),
        (r'\bmist\b', 'dusk'), (r'\bMist\b', 'Dusk'), (r'\bhaze\b', 'dusk'), (r'\bHaze\b', 'Dusk'), (r'\bsmoke\b', 'dust'), (r'\bSmoke\b', 'Dust')]
def _idkey(k): return k in ('species', 'to', 'src', 'table', 'text_ref', 'what_id', 'item', 'opens') or k == 'id' or k.endswith('_id') or k.endswith('flag')
def _scrub(o, k=None):
    if isinstance(o, str):
        if k is not None and _idkey(k): return o
        for a, b in _VIS: o = _re.sub(a, b, o)
        return o
    if isinstance(o, dict): return {kk: _scrub(v, kk) for kk, v in o.items()}
    if isinstance(o, list) and o and not isinstance(o[0], list): return [_scrub(v, k) for v in o]
    return o
_SCRUB_LOG = []
for _n in ON_ORDER:
    _m = ON[_n]
    for _a, _v in list(vars(_m).items()):
        if isinstance(_v, (dict, list)) and _a not in ('layers', 'ground', 'deco', 'overlay', 'terr', 'coll', 'collision'):
            _nv = _scrub(_v)
            if _nv != _v: setattr(_m, _a, _nv); _SCRUB_LOG.append(f'{_n}.{_a}')
    if isinstance(getattr(_m, 'title', None), str): _m.title = _scrub(_m.title)
    if getattr(_m, 'fog_layer', None): _m.fog_layer = None; _SCRUB_LOG.append(f'{_n}: fog_layer removed')
# mirefen hall: darkness overlay + reed lamps (same JSON grid, same cell ids '1'..'4', same S/G)
_h = ON.get('mirefen_hall_int')
if _h is not None:
    _hp = _h.hall_puzzle; _ox, _oy = _hp['origin']
    _g = _json.load(open(f"{HP_DIR}/mirefen.json"))['grid']
    _lamps = {c: [_ox + x, _oy + y] for y, r in enumerate(_g) for x, c in enumerate(r) if c in '1234'}
    for _c, (_x, _y) in _lamps.items(): _h.deco[_y][_x] = 'lamp'      # art TODO: dedicated reed_lamp tile (unlit/lit pair)
    _hp['overlay'] = dict(kind='darkness', light='reed_lamp', lamps={c: _lamps[c] for c in sorted(_lamps)}, order=['3', '1', '4', '2'],
                          reveal='hall starts dark; lighting the reed lamps in the croak order (3,1,4,2) lights the boardwalk path to G; unlit cells stay dark',
                          note='GQC line 354: no fog/haze/smoke. Replaces the hall JSON cue "fog layer = existing mirefen fog" (Coder: update the cue/runtime view to darkness).')
    _hp['cue'] = 'frogs croak the order (sound) + a ripple and lamp glow by each reed lamp (visual); darkness overlay, lamps light the path'
    _SCRUB_LOG.append('mirefen_hall_int: darkness overlay + 4 reed lamps')
print('OVERNIGHT POSTFIX:', _SCRUB_LOG)
