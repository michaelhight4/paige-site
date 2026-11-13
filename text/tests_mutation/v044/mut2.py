import subprocess, shutil, os, re
src='/workspace/kilumen/text'
muts={'press':('"Use {bike_button} to get on or off.','"Press {bike_button} to get on or off.'),
 'hardkey':('"Hold {run_button} to run."','"Hold Shift to run."'),
 'abutton':('"Hold {confirm_button} to show the whole page at once."','"Hold the A button to show the whole page at once."'),
 'tap':('"Hold {run_button} to run."','"Tap {run_button} to run."'),
 'nospec':('"assigned": ["{item} is now on {hotkey}."]','"assigned": ["{item} is now on {menu_button}."]'),
 'devlong':('"touch": "the SEL button"','"touch": "the SEL button at the bottom right corner"')}
for name,(a,b) in muts.items():
    d=f'/tmp/v044/n_{name}'; shutil.rmtree(d,ignore_errors=True); os.makedirs(d)
    shutil.copy(src+'/system_lines.py',d)
    s=open(src+'/build_overworld_lines.py').read(); assert a in s,name; s=s.replace(a,b,1)
    s=re.sub(r"^OUT\s*=.*$", f"OUT = '{d}/out.json'", s, count=1, flags=re.M)
    open(d+'/build.py','w').write(s)
    r=subprocess.run(['python3',d+'/build.py'],capture_output=True,text=True,cwd=src)
    e=[l for l in (r.stdout+r.stderr).splitlines() if not l.startswith(('WARN','OK'))]
    print(name,'CAUGHT' if r.returncode else 'MISSED','|',(e[:1] or [''])[0][:140])
