import subprocess, shutil, os, re
src='/workspace/kilumen/text'
B=[ # (name, file, a, b)
 ('tipsy','b','"Mind the step. And the DJ."','"Mind the step. Bit tipsy, the DJ."'),
 ('on_the_house','b',"I'm somebody's aunt.\"","First one's on the house.\""),
 ('bartender_text','b',"I'm somebody's aunt.\"","Ask the bartender.\""),
 ('hangover','b','"Hum along if you know the ending. Nobody ever does."','"Hum along. Cures a hangover."'),
 ('rocks','b','Ferns grown right over it.','Shake on the rocks.'),
 ('booze','b','Juice is free.','Booze is free.'),
 ('beer','b','Juice is free.','Beer is free.'),
 ('wine','b','Juice is free.','Wine is free.'),
 ('cocktail','b','Juice is free.','Cocktails free.'),
 ('smoke','b','Ferns grown right over it.','Smoke still rising.'),
 ('haze','b','Ferns grown right over it.','Lost in the haze.'),
 ('pill','b','Ferns grown right over it.','Found a pill bottle.'),
 ('dive','b','"Mind the step. And the DJ."','"Best dive in town."'),
 ('tonic_name','s','"name": "Fern Mint Tea"','"name": "Fern Mint Tonic"'),
 ('badge','b','"Mind the step. And the DJ."','"Show your badge."'),
 ('franchise','b','"Mind the step. And the DJ."','"No Pok\u00e9mon inside."'),
 ('club_geometry','b','CLUB = {"map": "club_int", "text_pending": True, "proposed_spot": None','CLUB = {"map": "club_int", "text_pending": True, "x": 3, "y": 4, "proposed_spot": None'),
 ('vane','b','Juice is free.','Juice is free. H.V.'),
 ('control_still_caught','b',"I'm somebody's aunt.\"","Press the button.\""),
]
for name,f,a,b in B:
    d=f'/tmp/v046/m_{name}'; shutil.rmtree(d,ignore_errors=True); os.makedirs(d)
    s=open(src+'/system_lines.py').read(); bs=open(src+'/build_overworld_lines.py').read()
    if f=='s': assert a in s,name; s=s.replace(a,b,1)
    else: assert a in bs,name; bs=bs.replace(a,b,1)
    bs=re.sub(r"^OUT\s*=.*$", f"OUT = '{d}/out.json'", bs, count=1, flags=re.M)
    open(d+'/system_lines.py','w').write(s); open(d+'/build.py','w').write(bs)
    r=subprocess.run(['python3',d+'/build.py'],capture_output=True,text=True,cwd=src)
    e=[l for l in (r.stdout+r.stderr).splitlines() if not l.startswith(('WARN','OK'))]
    print(name,'CAUGHT' if r.returncode else 'MISSED','|',(e[:1] or [''])[0][:150])
