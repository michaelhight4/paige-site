P = '/workspace/kilumen/text/build_overworld_lines.py'
s = open(P).read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (s.count(old), old[:80])
    s = s.replace(old, new)

# unreachable: a bin_stage line only shadows a later line with the same stage
rep('''            if set(a['flags']) <= set(b['flags']) and all(bw.get(k) == v for k, v in aw.items()):''',
    '''            if set(a['flags']) <= set(b['flags']) and all(bw.get(k) == v for k, v in aw.items()) \\
               and (a.get('bin_stage') is None or a.get('bin_stage') == b.get('bin_stage')):''')

# SKIP_KEYS
rep("'text_was', 'gives', 'gift', 'region'}", "'text_was', 'gives', 'gift', 'region', 'disabled_until', 'fallback_for'}")

# bin validator: stage/count consistency
old = s[s.index("            COIN = {\"1\": \"beat_master_fernwick\""):s.index("for _m, _c in signs_awaiting_world_id.items():")]
new = '''            # v0.4.3: stage = coin COUNT (Coder binStage(): 'empty' if empty_flag, 8 if all_badges, else number of beat_master_* flags,
            # capped at 8). Lines must key on bin_stage only, never on a single coin flag, so out-of-order coins pick the right line.
            COIN_FLAGS = sorted(f for f in FLAGS_OK if f.startswith('beat_master_'))
            WORDS = {1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight'}
            stages = {l.get('bin_stage') for l in b['lines'][:-1]} | {b.get('bin_stage_default')}
            if stages != set(bs['tiles']): errs.append(f'{mid}.bin_ron: stages {sorted(map(str, stages))} != bin_stages tiles {sorted(bs["tiles"])}')
            for l in b['lines'][:-1]:
                st = l.get('bin_stage')
                if st == 'empty':
                    if l['flags'] != [bs['empty_flag']]: errs.append(f'{mid}.bin_ron.{l["id"]}: empty line must be flags [{bs["empty_flag"]}]')
                    if b['lines'].index(l) != 0: errs.append(f'{mid}.bin_ron: empty line must come first')
                elif st is not None and str(st).isdigit() and 1 <= int(st) <= 8:
                    coinish = [f for f in l['flags'] if f.startswith('beat_master_') or f == 'all_badges']
                    if coinish: errs.append(f'{mid}.bin_ron.{l["id"]}: stage {st} keys on coin flag(s) {coinish}; stage = coin count, use bin_stage only')
                    if l['id'] != 'bin_creature' and not re.match(rf"(?i)\\W*{WORDS[int(st)]}\\b", l['pages'][0]):
                        errs.append(f'{mid}.bin_ron.{l["id"]}: stage {st} text must open with the bag count "{WORDS[int(st)].title()}"')
                    flies = any(re.search(r'\\bflies\\b', pg) for pg in l['pages'])
                    if int(st) >= bs['overlay_from_stage'] and l['id'] != 'bin_creature' and not flies: errs.append(f'{mid}.bin_ron.{l["id"]}: stage {st} shows flies, text should mention them')
                    if int(st) < bs['overlay_from_stage'] and flies: errs.append(f'{mid}.bin_ron.{l["id"]}: no flies before stage {bs["overlay_from_stage"]}')
                else: errs.append(f'{mid}.bin_ron.{l["id"]}: missing bin_stage')
            if b.get('bin_stage_default') != '0': errs.append(f'{mid}.bin_ron: default must describe stage 0')
            # simulate Coder's picker for every coin subset (any order): the line shown must describe the tile shown
            def _bin_stage(fl): return 'empty' if bs['empty_flag'] in fl else (8 if 'all_badges' in fl else min(8, sum(f.startswith('beat_master_') for f in fl)))
            def _pick(fl, st, counters):
                for l in b['lines']:
                    if l.get('pending_story_call') or not all(f in fl for f in l['flags']): continue
                    if l.get('bin_stage') is not None and str(l['bin_stage']) != str(st): continue
                    w = l.get('when', {})
                    if 'count_gte' in w and counters.get(w['count_gte']['counter'], 0) < w['count_gte']['n']: continue
                    return l
            cases = [set(c) for k in range(len(COIN_FLAGS) + 1) for c in itertools.combinations(COIN_FLAGS, k)]
            cases += [c | {'all_badges'} for c in cases[::7]] + [c | {bs['empty_flag']} for c in cases[::11]]
            for fl in cases:
                st = _bin_stage(fl)
                for counters in ({}, {'bin_inspects_after_8': 8}):
                    got = _pick(fl, st, counters)
                    want = str(st) if st else None
                    shown = got.get('bin_stage') if got and got['id'] != 'default' else None
                    if got is None or (shown != want and not (st == 0 and got['id'] == 'default')):
                        errs.append(f'{mid}.bin_ron: coins {sorted(fl)} show tile {st} but text {got and got["id"]}'); break
                else: continue
                break

'''
s = s.replace(old, new)
open(P, 'w').write(s); print('ok3')
