P = '/workspace/kilumen/text/build_overworld_lines.py'
s = open(P).read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (s.count(old), old[:80])
    s = s.replace(old, new)

# spare maps: no zone-wiring todo while spare
rep('''            else: zone_todo.setdefault(w['zone'], set()).add(mid)''',
    '''            elif mid in SPARE_MAPS: SPARE_ZONE_LINES.setdefault(mid, set()).add(w['zone'])
            else: zone_todo.setdefault(w['zone'], set()).add(mid)''')
rep('''zone_todo = {}
def _pages(l)''', '''zone_todo = {}; SPARE_ZONE_LINES = {}
def _pages(l)''')

# new checks, appended just before the final dump
anchor = "json.dump(doc, open(OUT, 'w'), ensure_ascii=False, indent=1)"
assert s.count(anchor) == 1
new_checks = r'''
# ---------- v0.4.3 checks ----------
# (a) every when / trigger_when key must be one Coder's picker handles (src/overworld/lines.js whenMatches, read-only).
#     A line using an unsupported key must carry disabled_until AND have a fallback line (fallback_for) in the same block.
PICKER_SRC = '/workspace/kilumen/src/overworld/lines.js'
_wm = re.search(r'export function whenMatches[\s\S]*?\n}\n', open(PICKER_SRC).read()).group(0)
PICKER_KEYS = set(re.findall(r"case '(\w+)'", _wm))
if not PICKER_KEYS >= {'phase', 'hour', 'count_gte'}: errs.append(f'could not read picker keys from {PICKER_SRC}')
WHEN_USED = {}
def _when_walk(o, path):
    if isinstance(o, dict):
        if isinstance(o.get('lines'), list):
            ids = {l.get('id') for l in o['lines'] if isinstance(l, dict)}
            for l in o['lines']:
                if not isinstance(l, dict): continue
                bad = [k for k in l.get('when', {}) if k not in PICKER_KEYS]
                for k in l.get('when', {}): WHEN_USED.setdefault(k, []).append(f'{path}#{l.get("id")}')
                if bad:
                    if not l.get('disabled_until'): errs.append(f'{path}.{l.get("id")}: when key(s) {bad} not supported by Coder\'s picker; mark disabled_until')
                    if not any(isinstance(x, dict) and x.get('fallback_for') == l.get('id') for x in o['lines']):
                        errs.append(f'{path}.{l.get("id")}: unsupported when key(s) {bad} need a fallback line (fallback_for: {l.get("id")})')
                if l.get('fallback_for') and l['fallback_for'] not in ids: errs.append(f'{path}.{l.get("id")}: fallback_for names a missing line')
                if l.get('fallback_for') and [k for k in l.get('when', {}) if k not in PICKER_KEYS]: errs.append(f'{path}.{l.get("id")}: fallback uses an unsupported key')
        for k, v in o.items():
            if k == 'trigger_when' and isinstance(v, dict):
                for kk in v:
                    WHEN_USED.setdefault(kk, []).append(f'{path} (trigger_when)')
                    if kk not in PICKER_KEYS: errs.append(f'{path}: trigger_when key {kk} not supported by Coder\'s picker')
            elif k not in ('_meta',): _when_walk(v, f'{path}.{k}' if path else k)
    elif isinstance(o, list):
        for i, v in enumerate(o): _when_walk(v, path)
_when_walk(doc, '')
meta['when_key_audit'] = {
 "_note": f"Every when / trigger_when key used in this file vs Coder's picker ({PICKER_SRC.replace('/workspace/kilumen/', '')} whenMatches, dev/overworld-v1). Unknown keys never match there.",
 "supported_by_picker": sorted(PICKER_KEYS),
 "used": {k: len(v) for k, v in sorted(WHEN_USED.items())},
 "unsupported": {k: {"used_by": v, "fallback": "kid_dusk (when.phase dusk, fallback_for kid_school); kid_school stays, disabled_until weekday ships" if k == 'weekday' else "none"}
                 for k, v in sorted(WHEN_USED.items()) if k not in PICKER_KEYS},
}
for k, v in meta['when_key_audit']['unsupported'].items():
    if v['fallback'] == 'none': errs.append(f'when key {k} unsupported with no fallback')
# (b) {rt_number}: every page must still fit with any 4-digit catalogue number (RT-0000 .. RT-9999, all 7 characters wide)
RT_VALUES = ['RT-0000', 'RT-9999', 'RT-1111', 'RT-0147']
def _rt_walk(o, path):
    if isinstance(o, str) and '{rt_number}' in o:
        for v in RT_VALUES:
            t = o.replace('{rt_number}', v)
            if sum(len(textwrap.wrap(p, 40) or ['']) for p in t.split('\n')) > 2: errs.append(f'{{rt_number}}={v} breaks the page at {path}')
    elif isinstance(o, dict):
        for k, v in o.items():
            if k not in ('_meta', '_proposed_names'): _rt_walk(v, f'{path}/{k}')
    elif isinstance(o, list):
        for i, v in enumerate(o): _rt_walk(v, f'{path}/{i}')
_rt_walk(doc, '')
for _sec in ('vane', 'catalogue'):   # no hard-coded catalogue number stands in for {rt_number} (except the RT-0000 nickname joke)
    for _m in re.finditer(r'RT-\d{4}', json.dumps(doc[_sec], ensure_ascii=False)):
        if _m.group(0) != 'RT-0000': errs.append(f'{_sec}: hard-coded catalogue number {_m.group(0)}, use {{rt_number}}')
# (c) every World text_ref in maps/*.json must resolve to a picker-readable entry; if maps.<map>.<id> also exists, both must match
def _get(path):
    o = doc
    for p in path.split('.'):
        if not isinstance(o, dict) or p not in o: return None
        o = o[p]
    return o
for _mid, _mj in MAPJ.items():
    if _mid in RETIRED: continue
    for _d in _mj.get('npcs', []) + _mj.get('signs', []) + _mj.get('npcs_pending_text', []) + _mj.get('signs_pending_text', []) + _tp(_mj, 'npcs') + _tp(_mj, 'signs'):
        _r = re.search(r'overworld_lines\.json\s+([\w.]+)', _d.get('text_ref', ''))
        if not _r: continue
        _t = _get(_r.group(1)); _own = maps.get(_mid, {}).get(_d['id'])
        if not isinstance(_t, dict) or not isinstance(_t.get('lines'), list): errs.append(f'{_mid}.{_d["id"]}: text_ref {_r.group(1)} does not resolve to an entry with lines')
        elif _own and (_own['lines'] != _t['lines'] or _own['pages'] != _t['pages']): errs.append(f'{_mid}.{_d["id"]}: maps.{_mid}.{_d["id"]} and text_ref {_r.group(1)} differ')
# (d) spare maps: kept, valid, and flagged as spare (not broken); warn if a door now leads there (then drop it from SPARE_MAPS)
DOOR_TO = {d.get('to') for d in WL.get('interior_doors', [])} | {w.get('to') for mj in MAPJ.values() for w in mj.get('warps', [])}
for _mid in SPARE_MAPS:
    if _mid not in MAPJ: errs.append(f'spare map {_mid} has no maps/{_mid}.json')
    if _mid not in maps: errs.append(f'spare map {_mid} has no text')
    if _mid in DOOR_TO: warns.append(f'spare map {_mid} now has a door: drop it from SPARE_MAPS')
meta['spare_maps'] = {"_note": "Maps World keeps as spares until a town needs them (8:20 PM CT). Their text is parked under maps.<map> as usual "
                               "(ids match the map file) and passes every check; no door leads there, which is expected, not an error.",
                      **SPARE_MAPS}
if SPARE_ZONE_LINES: meta['spare_maps']['_zone_lines_parked'] = {k: sorted(v) for k, v in SPARE_ZONE_LINES.items()}
if errs:
    print('\n'.join(errs)); sys.exit(1)
'''
s = s.replace(anchor, new_checks + anchor)
open(P, 'w').write(s); print('ok4')
