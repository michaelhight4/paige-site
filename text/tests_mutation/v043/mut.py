import subprocess,sys
src=open('build_overworld_lines.py').read().replace("OUT = ","OUT = '/tmp/v043/mut_out.json' or ",1)
M=[("coinflag",'L("bin_5", ["Five bags. The lid gave up a while ago."], item="3"','L("bin_5", ["Five bags. The lid gave up a while ago."], flags=["beat_master_mirefen"], item="3"',"coin flag"),
 ("countword",'"Four bags. One of them is leaking something blue."','"Bags. One of them is leaking something blue."',"bag count"),
 ("stage_swap",'item="3", bin_stage="4")','item="3", bin_stage="5")',"stages"),
 ("weekday_nodisable",'    disabled_until="weekday (1.4','    disabled_untilX="weekday (1.4',"disabled_until"),
 ("weekday_nofallback",'fallback_for="kid_school"','fallback_for="kid_schoolX"',"fallback"),
 ("rt_long",'"Logged as {rt_number}."','"Logged as {rt_number}. Logged as {rt_number}. Logged as {rt_number}. Logged as {rt_number}."',"breaks the page"),
 ("rt_hard",'"Logged as {rt_number}."','"Logged as RT-0147."',"hard-coded"),
 ("ref_list",'    for _key in list(rail_only[_sec]): rail_only[_sec][_key] = _entry(rail_only[_sec][_key])','    pass',None),
 ("ref_diverge","    rail_only[_sec][_key] = _e\n","    _e['pages'] = ['x']; rail_only[_sec][_key] = _e\n","differ"),
 ("spare_missing",' "home_saltmere_a": "World 8:20',' "home_saltmere_zz": "World 8:20',"spare map"),
]
for name,a,b,want in M:
    assert src.count(a)>=1,(name)
    t=src.replace(a,b,1); open('/tmp/v043/mut_run.py','w').write(t)
    r=subprocess.run([sys.executable,'/tmp/v043/mut_run.py'],capture_output=True,text=True)
    out=r.stdout+r.stderr
    ok = (r.returncode!=0) if want is None else (r.returncode!=0 and want in out)
    print(name, 'CAUGHT' if ok else 'MISSED', '' if ok else out[-300:])
