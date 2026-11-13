import subprocess, shutil, os, re
src='/workspace/kilumen/text'
muts = {
 'too_long': ('"Bagged. Pleasure doing business."', '"Bagged. Pleasure doing business with you today, truly a joy, see you again soon okay."'),
 'ph_long': ('"{creature} picked up {skill}!"', '"{creature} picked up {skill} and {item} at {city} today!"'),
 'lifted': ('"You slipped away."', '"Got away safely!"'),
 'bad_parity': ('"parity": "F11"', '"parity": "Z99"'),
 'bad_build': ('"build": "built"}', '"build": "done"}', ),
 'variants_nocall': ('"variants": {"terminal"', '"variantz": 1, "variants": {"terminal"'),
 'no_sample': ('"Your phone pings. Text from {trainer}."', '"Your phone pings. Text from {sender}."'),
 'four_pages': ('"pages": ["Whirr... click... ding."]', '"pages": ["a","b","c","d"]'),
 'gender': ('"Report filed. {player}\'s day is on record."', '"Report filed. {player} did her best."'),
 'tiers_order': ('{"min": 25, "pages": ["Ferris', '{"min": 0, "pages": ["Ferris'),
 'long_choice': ('"choices": ["Ring it up", "Never mind"]', '"choices": ["Ring it up right now please", "Never mind"]'),
 'banned': ('"You picked up {item}."', '"You picked up {item} for the gym."'),
}
for name,(a,b) in muts.items():
    d=f'/tmp/v044/m_{name}'; shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    s=open(src+'/system_lines.py').read(); assert a in s, name
    if name=='variants_nocall':
        s=s.replace('"pending_gary_call": "phone_vs_pc_storage",\n                  "variants": {"terminal"', '"variants": {"terminal"')
    else: s=s.replace(a,b,1)
    open(d+'/system_lines.py','w').write(s)
    b2=open(src+'/build_overworld_lines.py').read()
    b2=re.sub(r"^OUT\s*=.*$", f"OUT = '{d}/out.json'", b2, count=1, flags=re.M)
    open(d+'/build.py','w').write(b2)
    r=subprocess.run(['python3',d+'/build.py'],capture_output=True,text=True,cwd=src)
    out=(r.stdout+r.stderr)
    errl=[l for l in out.splitlines() if not l.startswith('WARN') and not l.startswith('OK')]
    print(name, 'CAUGHT' if r.returncode else 'MISSED', '|', (errl[:1] or [''])[0][:150])
