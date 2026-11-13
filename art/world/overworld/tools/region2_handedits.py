# Region 2 hand-edit preservation (region2_wd pass, Oct 23 2026). Runs in run.py right after centre_pad.apply, so every coordinate
# in tools/region2_handedits.json is the CURRENT padded coordinate. The coder promoted text_pending entities (lines exist), fixed exit
# offsets and moved one item to an NPC gift directly in maps/*.json; this re-applies those edits so a padded rebuild keeps them.
import os, json
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'region2_handedits.json')

def _drop(lst, ids): lst[:] = [e for e in lst if e.get('id') not in ids] if lst is not None else lst

def apply(MAPS):
    doc = json.load(open(DATA)); M = {m.name: m for m in MAPS}; log = []
    for name, ed in doc['maps'].items():
        m = M.get(name)
        if m is None: log.append(f'{name}: not built, skipped'); continue
        soul = getattr(m, 'soul', None) or {}; tp = soul.get('text_pending')
        for kind in ('npcs', 'signs', 'interact_spots'):
            ents = ed.get(kind) or []
            if not ents: continue
            ids = {e['id'] for e in ents}
            if tp: _drop(tp.get(kind), ids)
            if kind == 'npcs' and getattr(m, 'npcs_pending', None) is not None: _drop(m.npcs_pending, ids)
            if kind == 'signs' and getattr(m, 'signs_pending', None) is not None: _drop(m.signs_pending, ids)
            cur = getattr(m, kind, None)
            if cur is None: cur = []; setattr(m, kind, cur)
            pos = {e.get('id'): i for i, e in enumerate(cur)}
            for e in ents:
                if e['id'] in pos: cur[pos[e['id']]] = json.loads(json.dumps(e))
                else: cur.append(json.loads(json.dumps(e)))
            log.append(f'{name}: {kind} {sorted(ids)}')
        if tp is not None and not any(tp.get(k) for k in ('npcs', 'signs', 'interact_spots')): soul.pop('text_pending', None)
        if ed.get('drop_items'):
            m.items[:] = [i for i in m.items if i['id'] not in ed['drop_items']]; log.append(f'{name}: dropped items {ed["drop_items"]}')
        for e in m.exits:
            if e['to'] in (ed.get('exit_offsets') or {}): e['offset'] = ed['exit_offsets'][e['to']]; log.append(f"{name}: exit {e['to']} offset {e['offset']}")
    return log
