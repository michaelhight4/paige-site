import subprocess, shutil, os, re
src='/workspace/kilumen/text'
B=[
 ('stale_ref','b',"def _get(path):\n    o = doc","def _get(path):\n    if path == 'maps.club_int.rebel_dj': path = 'unplaced_npcs.rebel_dj'\n    o = doc"),
 ('greystone_revert','b','("note_greystone", "beat_master_fernwick"','("note_greystone", "beat_master_revival"'),
 ('frostspire_moved','b','("note_frostspire", "beat_master_revival"','("note_frostspire", "beat_master_fernwick"'),
 ('camp_vane','b','"Nobody\'s slept here in a long while."','"Vane slept here."'),
 ('camp_crystal','b','"Nobody\'s slept here in a long while."','"No crystals needed out here."'),
 ('camp_name','b','"Nobody\'s slept here in a long while."','"Marta slept here."'),
 ('camp_why','b','"Nobody\'s slept here in a long while."','"Nobody knows why they left."'),
 ('camp_found','b','"Still no sign of them."','"They found the truth here."'),
 ('camp_beer','b','"The stove catches on the second try."','"A beer can by the stove."'),
 ('camp_smoke','b','"The stove catches on the second try."','"Smoke curls up from the stove."'),
 ('camp_badge','b','"You leave the camp as it is. For now."','"A badge lies in the dirt."'),
 ('camp_repended','b','      "story_ruling": CAMP_TONE_RULING,\n      "note"','      "pending_story_call": True,\n      "note"'),
 ('camp_flag_wrong','b','"sets_flag": flag, "active_when"','"sets_flag": "camp_restored_mirefen", "active_when"'),
 ('camp_missing','b','for (_m, _c), _e in CAMPS.items(): maps[_m][_c] = _e','for (_m, _c), _e in CAMPS.items():\n    if _c != "camp_greystone": maps[_m][_c] = _e'),
 ('control_ok','b','"Nobody\'s slept here in a long while."','"Press the button."'),
]
for name,f,a,b in B:
    d=f'/tmp/v049/m_{name}'; shutil.rmtree(d,ignore_errors=True); os.makedirs(d)
    s=open(src+'/system_lines.py').read(); bs=open(src+'/build_overworld_lines.py').read()
    if f=='s': assert a in s,name; s=s.replace(a,b,1)
    else: assert a in bs,name; bs=bs.replace(a,b,1)
    bs=re.sub(r"^OUT\s*=.*$", f"OUT = '{d}/out.json'", bs, count=1, flags=re.M)
    open(d+'/system_lines.py','w').write(s); open(d+'/build.py','w').write(bs)
    r=subprocess.run(['python3',d+'/build.py'],capture_output=True,text=True,cwd=src)
    e=[l for l in (r.stdout+r.stderr).splitlines() if not l.startswith(('WARN','OK'))]
    print(name,'CAUGHT' if r.returncode else 'MISSED','|',(e[:1] or [''])[0][:150])
