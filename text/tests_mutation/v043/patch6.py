P='/workspace/kilumen/text/build_overworld_lines.py'; s=open(P).read()
old="""            if k not in ('_meta', '_proposed_names'): _rt_walk(v, f'{path}/{k}')"""
assert s.count(old)==1
s=s.replace(old,"""            if k not in ('_meta', '_proposed_names') and k not in SKIP_KEYS: _rt_walk(v, f'{path}/{k}')""")
old2="""    for _m in re.finditer(r'RT-\\d{4}', json.dumps(doc[_sec], ensure_ascii=False)):"""
assert s.count(old2)==1, 'x'
s=s.replace(old2,"""    _txt = []
    def _tw(o, k=None):
        if isinstance(o, str) and k not in SKIP_KEYS: _txt.append(o)
        elif isinstance(o, dict): [_tw(v, kk) for kk, v in o.items()]
        elif isinstance(o, list): [_tw(v, k) for v in o]
    _tw(doc[_sec])
    for _m in re.finditer(r'RT-\\d{4}', ' '.join(_txt)):""")
open(P,'w').write(s); print('ok6')
