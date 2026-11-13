p='/workspace/kilumen/text/build_overworld_lines.py'; s=open(p).read()
def rep(a,b,n=1):
    global s; assert s.count(a)==n,(s.count(a),a[:80]); s=s.replace(a,b)
# 1. remove stale-path allowance
rep("""        if _t is None and isinstance(_own, dict) and f'{_r.group(1)} -> maps.{_mid}.{_d["id"]}' in CLUB_MOVED:   # v0.4.8: text moved on purpose; engine reads maps.<mid>.<id> first
            STALE_REFS.append(f'{_mid}.{_d["id"]}: text_ref {_r.group(1)} -> maps.{_mid}.{_d["id"]}'); continue
""","")
rep("STALE_REFS = []\n","")
rep("""if STALE_REFS: print(f'WARN {len(STALE_REFS)} World text_refs still name the old unplaced path (text moved to maps.<map>.<id>; World to update): ' + '; '.join(STALE_REFS))
meta['world_text_ref_handoff'] = {"_note": "World's maps still carry text_refs to the pre-v0.4.8 unplaced paths. The text now lives at maps.<map>.<id> (same id); World updates the text_ref on its next run.", "refs": STALE_REFS}
""","")
# 2. note_greystone ruling
rep('''  ("note_greystone", "beat_master_revival", "greystone",''','''  ("note_greystone", "beat_master_fernwick", "greystone",''')
rep('''if maps.get('club_int', {}).get('note_greystone', {}).get('active_when') != 'beat_master_revival': errs.append('note_greystone gate changed (waits on Story Bot)')''',
'''if maps.get('club_int', {}).get('note_greystone', {}).get('active_when') != 'beat_master_fernwick': errs.append('note_greystone must gate on beat_master_fernwick (Story Bot ruling, Oct 22 10:04 PM CT)')
for _k, _g in (('note_thornwood', 'beat_master_fernwick'), ('note_frostspire', 'beat_master_revival'), ('note_mirefen', 'beat_master_frostspire')):
    if maps.get('club_int', {}).get(_k, {}).get('active_when') != _g: errs.append(f'{_k} must gate on {_g}')''')
rep("notes use active_when = beat_master_fernwick / beat_master_revival (x2) / beat_master_frostspire. Camp ticks use proposed camp_restored_* flags (pending).",
    "notes use active_when = beat_master_fernwick (thornwood, greystone) / beat_master_revival (frostspire) / beat_master_frostspire (mirefen); greystone moved to tier 1 by Story Bot ruling (Oct 22, 10:04 PM CT: Greystone B1 has no flag gate). Camp ticks use World's camp_restored_* flags.")
open(p,'w').write(s)
