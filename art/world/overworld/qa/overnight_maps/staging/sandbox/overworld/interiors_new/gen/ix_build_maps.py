import json, os, glob
from ix_mapkit import D
def main():
    import ix_maps_homes as H
    H.PAIRS.clear()
    rooms = H.build()
    try:
        import ix_maps_b2 as B2
        rooms += B2.build(H)
    except ImportError:
        pass
    os.makedirs(os.path.join(D, 'maps'), exist_ok=True)
    for p in glob.glob(os.path.join(D, 'maps', '*.json')): os.remove(p)
    import ix_puzzles
    for r in rooms:
        if 'puzzle' in r.extra:
            r.extra['puzzle']['verified'] = ix_puzzles.verified_block(r.to_json())
            v = r.extra['puzzle']['verified']; print('verified', r.id, v['solvable'], v['states_explored'], v['softlock_states'], v['shortest_solution'])
    ids = set()
    for r in rooms:
        assert r.id not in ids, r.id; ids.add(r.id)
        r.save()
    json.dump(H.PAIRS, open(os.path.join(D, 'pairings.json'), 'w'), indent=1)
    print('maps', len(rooms))
    return rooms
