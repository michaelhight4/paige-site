p='/workspace/kilumen/text/build_overworld_lines.py'; s=open(p).read()
def rep(a,b,n=1):
    global s; assert s.count(a)==n,(s.count(a),a[:80]); s=s.replace(a,b)
GS = '''GREYSTONE_RULING = "Story Bot ruling, Oct 22 2026 10:04 PM CT (STORY_RULINGS_CLUB 'Camp placement' correction): Greystone B1 has no flag gate, so note_greystone moves to tier 1, beat_master_fernwick. Wording unchanged."
'''
rep('for _k, _tier, _camp, _t in [\n  ("note_thornwood"', GS+'for _k, _tier, _camp, _t in [\n  ("note_thornwood"')
rep('''    _CP[f"club_int.{_k}"]["pinned_under"] = "club_int.missing_team_flyer"\n''',
    '''    _CP[f"club_int.{_k}"]["pinned_under"] = "club_int.missing_team_flyer"\n_CP["club_int.note_greystone"]["story_ruling"] = GREYSTONE_RULING\n''')
CAMP = '''
# ---- v0.4.9: Thornwood field camp (SOUL_PLAYBOOK 1.9 "clear it, light the stove"; 6.4/6.6; STORY_RULINGS_CLUB camp placement + "FOUND THE CAMP. NOT THEM.") ----
CAMP_TONE = "Story Bot tone check (pending_story_call): field-camp text, v0.4.9"
maps["thornwood"]["camp_thornwood"] = {
  "pages": ["Your camp now. Stove's warm, tent's dry.", "A good spot to rest with your team."],
  "_soul_lines": [
    L("camp_restored_first", ["The camp's tidy again.", "Still no sign of them."], flags=["camp_restored_thornwood"], when={"once": True}, pending=True),
    L("camp_cold", ["An empty tent, ferns grown right over it.", "Nobody's slept here in a long while."], pending=True),
  ],
  "prompt": ["Clear the camp and light the stove?"], "choices": ["Yes", "No"],
  "use": ["You pull the ferns off the tent and sweep out the leaves.", "The stove catches on the second try."],
  "declined": ["You leave the camp as it is. For now."],
  "sets_flag": "camp_restored_thornwood", "active_when": "beat_master_fernwick",
  "pending_story_call": True, "tone_check": CAMP_TONE,
  "_note": ("Thornwood field-team camp (World interact spot (6,17), stand (6,18), face up; flag_swaps camp_cold -> camp_restored on camp_restored_thornwood). "
            "Flow: camp_cold look line, then prompt; Yes plays use and sets camp_restored_thornwood (map sets_flag); No plays declined. "
            "After restore: camp_restored_first once, then the default. Ties to maps.club_int.note_thornwood (same flag ticks the note). "
            "SOUL_PLAYBOOK 1.9 also makes a restored camp a fast-travel point, a Warmth rest spot and a decor spot, and says each camp holds a field log page; "
            "none of those has an id or ruling yet, so no text names them and no reward/item is referenced. No team name: no document ties a member to this camp."),
}
CAMP_LINE_IDS = ["camp_restored_first", "camp_cold", "default"]
'''
rep('''maps["fernwick"]["sign_club"] = npc(["THE FIREFLY", "Juice, tunes, open late."], note="Gary's wording (adjusted from World's dev label)")\n''',
    '''maps["fernwick"]["sign_club"] = npc(["THE FIREFLY", "Juice, tunes, open late."], note="Gary's wording (adjusted from World's dev label)")\n'''+CAMP)
# map active_when check: allow the ruled greystone change while World's map still says revival; record a World handoff
rep('''        if _e.get('active_when') != _CLUB_ISP[_k].get('active_when'): errs.append(''',
'''        if _k == 'note_greystone' and _e.get('active_when') == 'beat_master_fernwick' and _CLUB_ISP[_k].get('active_when') == 'beat_master_revival':
            WORLD_HANDOFF.append("maps/club_int.json note_greystone active_when beat_master_revival -> beat_master_fernwick (" + GREYSTONE_RULING + ")")
        elif _e.get('active_when') != _CLUB_ISP[_k].get('active_when'): errs.append(''')
rep("_CLUB_ISP = ISPOTS.get('club_int', {})\n", "_CLUB_ISP = ISPOTS.get('club_int', {})\nWORLD_HANDOFF = []\n")
# camp validator
rep("if 'old_record' not in _CAT: errs.append('system_item_catalogue: old_record missing')\n",
"""if 'old_record' not in _CAT: errs.append('system_item_catalogue: old_record missing')
_ct = maps.get('thornwood', {}).get('camp_thornwood')
_csp = ISPOTS.get('thornwood', {}).get('camp_thornwood', {})
if not _ct: errs.append('maps.thornwood.camp_thornwood missing')
else:
    if [l['id'] for l in _ct['lines']] != CAMP_LINE_IDS: errs.append(f'camp_thornwood: line order {[l["id"] for l in _ct["lines"]]}')
    if not _ct.get('pending_story_call'): errs.append('camp_thornwood: needs pending_story_call (Story Bot tone check)')
    for _key in ('sets_flag', 'active_when', 'x', 'y', 'stand', 'face'):
        if _ct.get(_key) != _csp.get(_key): errs.append(f'camp_thornwood: {_key} {_ct.get(_key)} != map {_csp.get(_key)}')
    _camp_txt = ' '.join(' '.join(x) for x in [l['pages'] for l in _ct['lines']] + [_ct['prompt'], _ct['use'], _ct['declined']] + [_ct['choices']])
    for _bad in (r'\\bvane\\b', r'h\\.v\\.', r'\\bcrystals?\\b', r'\\b(pell|marta|teo|imke|ashby|quill|brack|sorrel)\\b', r'\\bwhy\\b', r'\\bfound\\b', r'\\bdrift', r'\\blog\\b', r'\\breward'):
        if re.search(_bad, _camp_txt, re.I): errs.append(f'camp_thornwood: text hits story guard {_bad}')
    for _p in (_ct['prompt'], _ct['use'], _ct['declined']): check_lines([{'id': 'camp_extra', 'flags': [], 'pages': _p}], 'maps.thornwood.camp_thornwood')
if WORLD_HANDOFF: meta['world_handoff'] = {"_note": "Changes our text follows that World's map files haven't picked up yet (World's files are not ours to edit).", "items": WORLD_HANDOFF}
""")
# version + changelog
rep('meta["changelog"] = {"0.4.8": [', '''meta["version"] = "0.4.9"
meta["changelog"] = {"0.4.9": [
  "World repointed every club text_ref (maps.club_int.<id>, maps.fernwick.sign_club; old records to system_items.picked_up / system_item_catalogue.old_record): the v0.4.8 stale-path allowance and world_text_ref_handoff are gone, stale text_refs are errors again. meta.club_moved stays as history.",
  "note_greystone now gates on beat_master_fernwick (" + GREYSTONE_RULING + "). note_thornwood stays beat_master_fernwick, note_frostspire beat_master_revival, note_mirefen beat_master_frostspire; the validator pins all four.",
  "maps.thornwood.camp_thornwood (World spot (6,17)): look line, Yes/No restore prompt (SOUL_PLAYBOOK 1.9 'clear it, light the stove'), restored-once line, default. Sets camp_restored_thornwood via the map's sets_flag. pending_story_call for Story Bot's tone check. No reward, item, log page or team name (none defined for this camp)."],
 "0.4.8": [''')
open(p,'w').write(s)
