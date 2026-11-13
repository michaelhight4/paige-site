import subprocess,sys
src=open('build_overworld_lines.py').read().replace("OUT = ","OUT = '/tmp/v042/mut_out.json' or ",1)
M=[("town",'"Sit by the fire if you like. Everyone does."','"Sit by the fire. Fernwick folk always do."',"names a town"),
 ("recolour",'"Tying flies. The fishing kind."','"Tying flies on the ochre rug."',"recolour"),
 ("light",'"Late shift. Just me, the polisher and the hum."','"Late shift. Lights low, just me and the hum."',"talks about light"),
 ("colour",'"Sorry about the mess. We have a kid."','"Sorry about the mess on the blue carpet."',"room colour"),
 ("retired","# ---- v0.4.2 lines with no home yet","maps['house_int_a'] = {'cook': npc(['x'])}\n# ---- v0.4.2 lines with no home yet","retired map"),
 ("phase",'when={"phase": "night"}),\n                L("tech_brookhollow"','when={"phase": "evening"}),\n                L("tech_brookhollow"',"bad phase"),
 ("stand",'_P("home_saltmere_a", 2, 2, [2, 3]','_P("home_saltmere_a", 2, 2, [2, 4]',"does not reach"),
 ("pending",' "roster": npc(',' "roster_x": npc(',"roster has no text"),
 ("default",'unplaced["npcs"]["house_int_a.cook"] = {','unplaced["npcs"]["house_int_a.cook"] = {"lines_x": 0,',None),
]
for name,a,b,want in M:
    assert src.count(a)>=1,(name)
    t=src.replace(a,b,1); open('/tmp/v042/mut.py.run','w').write(t)
    r=subprocess.run([sys.executable,'/tmp/v042/mut.py.run'],capture_output=True,text=True)
    out=r.stdout+r.stderr
    ok = (want is None) or (r.returncode!=0 and want in out)
    print(name, 'CAUGHT' if ok else 'MISSED', '' if ok else out[-300:])
