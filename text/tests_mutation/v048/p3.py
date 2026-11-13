p='/workspace/kilumen/text/build_overworld_lines.py'; s=open(p).read()
def rep(a,b,n=1):
    global s; assert s.count(a)==n,(s.count(a),a[:80]); s=s.replace(a,b)
# 5. camp flags: real World flags
rep('''        ls.append(L("camp_found", pg[:2] + ["A hand-drawn tick, and: FOUND THE CAMP. NOT THEM."], flags=[CAMP_FLAGS[camp]], pending=True,
                    note=f"camp-restored variant; no camp-restored flag exists yet in World/Coder, {CAMP_FLAGS[camp]} is the expected id"))''',
'''        ls.append(L("camp_found", pg[:2] + ["A hand-drawn tick, and: FOUND THE CAMP. NOT THEM."], flags=[CAMP_FLAGS[camp]],
                    note=f"camp-restored variant ({CAMP_FLAGS[camp]}, World flag; map flag_swaps club_note -> club_note_tick)"))''')
for c,txt in [("thornwood",'"pending: the field team\'s Thornwood camp is restored (expected id; no World/Coder camp flag yet).",'),
              ("greystone",'"pending: the field team\'s Greystone camp is restored (expected id).",'),
              ("frostspire",'"pending: the field team\'s Frostspire camp is restored (expected id).",'),
              ("mirefen",'"pending: the field team\'s Mirefen camp is restored (expected id).",')]:
    rep(f' "camp_restored_{c}": {txt}\n', '')
rep('WORLD_FLAGS = {   # proposed by World Design in the maps (OVERWORLD_README 14.1 / 14.4); accepted as known flags\n',
    'WORLD_FLAGS = {   # proposed by World Design in the maps (OVERWORLD_README 14.1 / 14.4); accepted as known flags\n'
    + ''.join(f' "camp_restored_{c}": "The field team\'s {c.title()} camp is restored (World flag, qa/club README; club_int flag_swaps note tick).",\n' for c in ("thornwood","greystone","frostspire","mirefen")))
rep(', "camp_restored_thornwood", "camp_restored_greystone", "camp_restored_frostspire", "camp_restored_mirefen"}', '}')
rep('Camp-restored flags are proposed, pending World/Coder ids.")}', 'Camp-restored flags are World flags.")}')
# drinks sold_by + lantern giver
s=s.replace('unplaced_npcs.rebel_dj (note_reward line)','maps.club_int.rebel_dj (note_reward line)')
# 3. display role
rep('''unplaced_npcs["rebel_bartender"] = {**CLUB, "npc": "rebel_bartender", "role": "juice and snack counter keeper (id unchanged)",''',
    '''unplaced_npcs["rebel_bartender"] = {**CLUB, "npc": "rebel_bartender", "role": "juice and snack counter keeper (id unchanged)", "display_role": "juice counter",''')
# 4. records
rep('''_CP["missing_note_records"] = {"map": None, "text_pending": True, "proposed_spot": None, "lines": None,
  "regions": {"flg_record_1..4 (count)": ["fernwick", "thornwood", "route_1", "lanternport"]}, "item": "old_record (proposed id)",
  "text_ref": "system_items.picked_up",
  "_note": "Four old records for 'The Missing Note'. World places them (map items[]). Pickup uses the normal 'You found {item}!' text, so no extra lines; the DJ reacts when you next talk to him."}''',
'''_CP["missing_note_records"] = {"map": "lanternport", "text_pending": True, "proposed_spot": None, "lines": None,
  "item": "old_record", "text_ref": "system_items.picked_up",
  "placed": {"fernwick.old_record": [27, 5], "thornwood.old_record": [5, 15], "route1.old_record": [20, 23]},
  "held": ["lanternport (record 4, held until that map exists)"],
  "_note": "Four old records for 'The Missing Note'. Three are placed by World as map items[] (id old_record, item old_record; pickup flags item_<map>_old_record). "
           "Pickup uses system_items.picked_up with {item} = system_item_catalogue.old_record, so no extra lines; any pickup sets the lowest unset flg_record_N (Coder). "
           "Only the Lanternport record stays unplaced here."}

# ---- v0.4.8: World built club_int (qa/club/README.md) with our ids: club text moves to maps.club_int.<same id> ----
CLUB_MOVED = []
def _to_map(e):
    e = {k: v for k, v in e.items() if k not in ("map", "text_pending", "proposed_spot", "npc", "area")}
    ls = e.pop("lines"); assert ls[-1]["id"] == "default" and not ls[-1]["flags"] and not ls[-1].get("when")
    return {**e, "pages": ls[-1]["pages"], "_soul_lines": ls[:-1]}
maps.setdefault("club_int", {})
for _k in [k for k in unplaced_npcs if k.startswith("rebel_")]:
    maps["club_int"][_k] = _to_map(unplaced_npcs.pop(_k)); CLUB_MOVED.append(f"unplaced_npcs.{_k} -> maps.club_int.{_k}")
for _k in [k for k in _CP if k.startswith("club_int.")]:
    _id = _k.split(".", 1)[1]; _e = _to_map(_CP.pop(_k))
    if "pinned_under" in _e: _e["pinned_under"] = _e["pinned_under"].split(".", 1)[1]
    maps["club_int"][_id] = _e; CLUB_MOVED.append(f"unplaced.club_props.{_k} -> maps.club_int.{_id}")
_CP["_note"] = "v0.4.8: the back-room wall moved to maps.club_int.<id> (World built club_int). Only the Lanternport old_record stays unplaced."
# 2. Fernwick club sign (Gary's wording)
maps["fernwick"]["sign_club"] = npc(["THE FIREFLY", "Juice, tunes, open late."], note="Gary's wording (adjusted from World's dev label)")''')
s=s.replace('"sold_by": "unplaced_npcs.rebel_bartender"','"sold_by": "maps.club_int.rebel_bartender"')
# validator (h)
rep('''# (h) v0.4.6 The Firefly: every unplaced NPC is checked; club text has no geometry until maps/club_int.json exists
for _k, _e in unplaced_npcs.items():
    if _k.startswith('_') or _k == 'lucky_crystal_seller': continue
    check_lines(_e['lines'], f'unplaced_npcs.{_k}')
    if _e.get('map') == 'club_int' and any(g in _e for g in ('x', 'y', 'stand', 'face')): errs.append(f'unplaced_npcs.{_k}: no geometry before World builds club_int')
for _k, _e in unplaced['club_props'].items():
    if _k.startswith('_') or _e.get('lines') is None: continue
    check_lines(_e['lines'], f'unplaced.club_props.{_k}')
    if _e.get('proposed_spot') is not None: errs.append(f'unplaced.club_props.{_k}: no geometry before World builds club_int')
    if _e.get('active_when') and _e['active_when'] not in FLAGS_OK: errs.append(f'unplaced.club_props.{_k}: unknown active_when flag')
    if _e['lines'][0]['flags'] != [POSTGAME_FLAG]: errs.append(f'unplaced.club_props.{_k}: post-game banner must come first')
if os.path.exists(f'{OW}/maps/club_int.json'): errs.append('maps/club_int.json now exists: move the club text onto its spot ids')
_club_txt = json.dumps({k: v for k, v in unplaced_npcs.items() if k.startswith('rebel_')}) + json.dumps(unplaced['club_props'])''',
'''# (h) v0.4.6/0.4.8 The Firefly: club text lives in maps.club_int (World built it); nothing club-side left in unplaced
for _k, _e in unplaced_npcs.items():
    if _k.startswith('_') or _k == 'lucky_crystal_seller': continue
    check_lines(_e['lines'], f'unplaced_npcs.{_k}')
    if _k.startswith('rebel_'): errs.append(f'unplaced_npcs.{_k}: club text must live in maps.club_int')
if [k for k in unplaced['club_props'] if k.startswith('club_int.')]: errs.append('unplaced.club_props: club_int.* entries must live in maps.club_int')
_CLUB_ISP = ISPOTS.get('club_int', {})
for _k, _e in maps.get('club_int', {}).items():
    if _k in _CLUB_ISP:
        if _e['lines'][0]['flags'] != [POSTGAME_FLAG]: errs.append(f'maps.club_int.{_k}: post-game banner must come first')
        if _e.get('active_when') != _CLUB_ISP[_k].get('active_when'): errs.append(f'maps.club_int.{_k}: active_when {_e.get("active_when")} != map {_CLUB_ISP[_k].get("active_when")}')
        if _e.get('active_when') and _e['active_when'] not in FLAGS_OK: errs.append(f'maps.club_int.{_k}: unknown active_when flag')
if maps.get('club_int', {}).get('note_greystone', {}).get('active_when') != 'beat_master_revival': errs.append('note_greystone gate changed (waits on Story Bot)')
if maps.get('club_int', {}).get('rebel_bartender', {}).get('display_role') != 'juice counter': errs.append('rebel_bartender display_role must be "juice counter" (Gary)')
for _cf in CAMP_FLAGS.values():
    if _cf not in WORLD_FLAGS or _cf in PROPOSED_FLAGS: errs.append(f'{_cf}: World flag, must not be marked proposed')
if 'old_record' not in _CAT: errs.append('system_item_catalogue: old_record missing')
_club_txt = json.dumps(maps.get('club_int', {})) + json.dumps(unplaced['club_props']) + json.dumps(maps.get('fernwick', {}).get('sign_club', {}))''')
# meta
rep('meta["version"] = "0.4.7"','meta["version"] = "0.4.8"\nmeta["club_moved"] = CLUB_MOVED')
rep('''meta["changelog"] = {"0.4.7": [''','''meta["changelog"] = {"0.4.8": [
  "World built club_int (qa/club/README.md, our ids exactly): every unplaced_npcs.rebel_* and unplaced.club_props.club_int.* entry moved to maps.club_int.<same id> word for word (meta.club_moved); geometry from the map's interact_spots / text_pending. Removed from unplaced.",
  "maps.fernwick.sign_club: 'THE FIREFLY' / 'Juice, tunes, open late.' (Gary's wording).",
  "rebel_bartender display_role 'juice counter' (Gary). Id unchanged.",
  "old_record: World placed fernwick (27,5), thornwood (5,15), route1 (20,23) as map items id old_record; catalogue entry added (Text Bot wording). Lanternport record stays unplaced (unplaced.club_props.missing_note_records).",
  "camp_restored_thornwood/greystone/frostspire/mirefen are World flags now: moved to world_flags, pending markers and proposal notes removed.",
  "note_greystone gate unchanged (beat_master_revival) while Story Bot decides on World's beat_master_fernwick question; validator pins it."],
 "0.4.7": [''')
open(p,'w').write(s)

q='/workspace/kilumen/text/system_lines.py'; t=open(q).read()
a=' "calm_tea": {'
assert t.count(a)==1
t=t.replace(a,''' "old_record": {"name": "Old Record", "pocket": "key", "pages": ["A scratched record in a paper sleeve.", "The DJ at The Firefly is looking for these."], "parity": "E4", "build": "partial",
                "note": "The Missing Note (World items[] id old_record in fernwick, thornwood, route1; Lanternport held). Text Bot wording; key pocket because it is a side-story item"},
'''+a)
open(q,'w').write(t)
