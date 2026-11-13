p='/workspace/kilumen/text/build_overworld_lines.py'; s=open(p).read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:70],s.count(a)); s=s.replace(a,b)
# World 21:09 depth pass: tall furniture tops live in the overlay layer
rep('''            name = TN.get(Ly['decoration'][y][x]) or ''
            if e.get('needs_world_prop')''','''            name = TN.get(Ly['decoration'][y][x]) or ''
            if not name.startswith(e['tile'] or '\\0') and 'overlay' in Ly and e['tile']:   # World depth pass: tall furniture tops sit in the overlay layer
                name = TN.get(Ly['overlay'][y][x]) or name
            if e.get('needs_world_prop')''')
# anchors no longer needed (README 17.3: unplaced.props no longer read; GEOM_PROPS)
rep('''    unplaced["props"][_key] = {"anchor_only": True,''','''    if False: unplaced["props"][_key] = {"anchor_only": True,''')
# flags
rep('''PROPOSED_FLAGS = {
''','''PROPOSED_FLAGS = {
 "ron_in_party": "Ron is travelling with the player right now (only exists if Gary picks Ron co-op, ron_mode). pending_story_call.",
 "flg_missing_note_started": "The Firefly DJ has asked the player to find his old records (side story 'The Missing Note').",
 "flg_record_1": "Missing Note: first old record found (count, any order: a pickup sets the lowest unset flg_record_N).",
 "flg_record_2": "Missing Note: second old record found (count).", "flg_record_3": "Missing Note: third old record found (count).",
 "flg_record_4": "Missing Note: fourth old record found (count).",
 "flg_missing_note_done": "Missing Note: DJ has stitched the four records and given the firefly lantern.",
 "camp_restored_thornwood": "pending: the field team's Thornwood camp is restored (expected id; no World/Coder camp flag yet).",
 "camp_restored_greystone": "pending: the field team's Greystone camp is restored (expected id).",
 "camp_restored_frostspire": "pending: the field team's Frostspire camp is restored (expected id).",
 "camp_restored_mirefen": "pending: the field team's Mirefen camp is restored (expected id).",
''')
rep('STORY_OWNED = {"finale_done", "truth_revealed", "guardian_quest_done", "field_team_home"}',
    'STORY_OWNED = {"finale_done", "truth_revealed", "guardian_quest_done", "field_team_home", "ron_in_party", "camp_restored_thornwood", "camp_restored_greystone", "camp_restored_frostspire", "camp_restored_mirefen"}')
rep("'pending_gary_call', 'pending_story_call', 'min'}","'pending_gary_call', 'pending_story_call', 'min', 'sold_by', 'stock', 'area', 'pinned_under', 'regions', 'item', 'text_pending'}")
# Gary's juice-bar rule
rep('''BAN_C = re.compile(''','''# Gary, Oct 22: "no hints at drinking or drugs or smoking at all" (player text only; ids like rebel_bartender are not text)
BAN_DRINK = re.compile(r"\\b(bartenders?|tipsy|hangovers?|on the rocks|booze\\w*|beers?|wines?|cocktails?|tonics?|smok\\w*|haze|hazy|pills?|on the house|div(e|es|ed|ing))\\b", re.I)
BAN_C = re.compile(''')
rep('''        if BAN_I.search(o) or BAN_C.search(o): errs.append(f'banned term: {"/".join(map(str, path))}: {o}')''',
'''        if BAN_I.search(o) or BAN_C.search(o): errs.append(f'banned term: {"/".join(map(str, path))}: {o}')
        if BAN_DRINK.search(o): errs.append(f'juice-bar rule (no drink/drug/smoke hints): {"/".join(map(str, path))}: {o}')''')
# names are SKIP_KEYS for wrap, but still player text
rep('''_names = [e['name'].lower()''','''def _name_walk(o, path):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ('_meta', '_proposed_names'): continue
            if k == 'name' and isinstance(v, str) and (BAN_DRINK.search(v) or BAN_I.search(v)): errs.append(f'banned term in a name: {path}/{k}: {v}')
            else: _name_walk(v, f'{path}/{k}')
    elif isinstance(o, list):
        for i, v in enumerate(o): _name_walk(v, f'{path}/{i}')
_name_walk(doc, 'root')
# (h) v0.4.6 The Firefly: every unplaced NPC is checked; club text has no geometry until maps/club_int.json exists
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
_club_txt = json.dumps({k: v for k, v in unplaced_npcs.items() if k.startswith('rebel_')}) + json.dumps(unplaced['club_props'])
if re.search(r'\\bvane\\b|H\\.V\\.', _club_txt, re.I): errs.append('club text mentions Vane (the Vane memo is on hold for Gary)')
if 'TBD_rebel_backroom' in json.dumps(doc) or 'flg_firefly_backroom' in json.dumps(doc): errs.append('back room has no gate flag (Gary R2)')
for _d in ('pond_plum_juice', 'mossplum_shake', 'fern_mint_tea', 'firefly_shake'):
    if _d not in _CAT: errs.append(f'system_item_catalogue: club drink {_d} missing')
_names = [e['name'].lower()''')
# version
rep('meta["version"] = "0.4.5"\n','''meta["version"] = "0.4.6"
meta["status"] = "draft, awaiting Gary"
meta["club_fit_log"] = CLUB_FIT_LOG
meta["club_spec"] = {"_note": "The Firefly (Fernwick juice bar and music hangout, STORY_RULINGS_CLUB). No maps/club_int.json yet: NPC text in unplaced_npcs.rebel_*, back-room wall in unplaced.club_props, all map 'club_int', text_pending, no geometry. Ids under club_props are proposals for World.",
  "time_of_day": "Each club entry starts with when.phase 'day' and 'dawn' lines (DJ asleep, counter being wiped); everything after them is the Dusk/Night text.",
  "once": "when.once = per save, per line id.",
  "back_room": "Open from the first visit (Gary R2), no gate flag. Tier 0 flyers always; notes use active_when = beat_master_fernwick / beat_master_revival (x2) / beat_master_frostspire. Camp ticks use proposed camp_restored_* flags (pending). Post-game banner on finale_done (pending).",
  "not_written": "Vane inbox memo (on hold for Gary). Warmth-gain charm reward and the post-ending finished tune (not in the draft)."}
''')
rep('''meta["changelog"] = {"0.4.5": [''','''meta["changelog"] = {"0.4.6": [
  "The Firefly (Fernwick juice bar): rebel_bouncer, rebel_bartender (juice and snack counter keeper, id unchanged), rebel_dj, rebel_patron_1-3, rebel_paint_vendor in unplaced_npcs (map club_int, text_pending). Back-room MISSING wall + location notes in unplaced.club_props. Side story 'The Missing Note' on rebel_dj. Ron gag pending (ron_in_party, ron_mode).",
  "Items: pond_plum_juice, mossplum_shake, fern_mint_tea, firefly_shake in system_item_catalogue (effects pending, Coder); items.firefly_lantern (Missing Note reward).",
  "Gary's juice-bar rule: BAN_DRINK in the validator (player text and names). Existing lines changed to pass: Small/Big/Energy Tonic -> Small Remedy / Big Remedy / Pep Remedy (ids unchanged), shop clerk 'tonics' -> 'remedies', Care pocket help, blackout copay 'on the house'.",
  "World README 17.3: TV/bookcase anchors removed from unplaced.props (World reads map geometry now). Tile check also looks in the overlay layer (World depth pass, house_2f bed)."],
 "0.4.5": [''')
# lantern item + stale strings
rep('"Feeds, tonics, dominance crystals. What do you need?"])','"Feeds, remedies, dominance crystals. What do you need?"])')
rep('"Feeds, tonics, dominance crystals. What do you need?"], flags=["beat_master_frostspire"]','"Feeds, remedies, dominance crystals. What do you need?"], flags=["beat_master_frostspire"]')
rep('"help": ["Tonics and treatments for your team."]','"help": ["Remedies and treatments for your team."]')
open(p,'w').write(s)
