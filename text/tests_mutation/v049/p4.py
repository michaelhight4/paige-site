p='/workspace/kilumen/text/build_overworld_lines.py'; s=open(p).read()
i=s.index('maps["thornwood"]["camp_thornwood"] = {'); j=s.index('CAMP_LINE_IDS = ')
new='''def camp(cid, flag, cold, restored, use, where_note):
    return {
      "pages": cold,
      "_soul_lines": [
        L("camp_restored_first", ["The camp's tidy again.", "Still no sign of them."], flags=[flag], when={"once": True}, pending=True),
        L("camp_restored", restored, flags=[flag], pending=True),
      ],
      "prompt": ["Clear the camp and light the stove?"], "choices": ["Yes", "No"], "prompt_after_line": "default",
      "use": use, "declined": ["You leave the camp as it is. For now."],
      "sets_flag": flag, "active_when": "beat_master_fernwick",
      "pending_story_call": True,
      "_note": (where_note + " Flow before restore: the default line (cold camp look) plays, then the prompt (prompt_after_line = default, so the prompt never follows the restored lines); "
                f"Yes plays use and sets {flag} (map sets_flag); No plays declined. After restore: camp_restored_first once, then camp_restored every time. "
                f"Ties to maps.club_int.note_{cid.split('_')[1]} (same flag ticks the note). "
                "SOUL_PLAYBOOK 1.9 also makes a restored camp a fast-travel point, a Warmth rest spot and a decor spot, and says each camp holds a field log page; "
                "none of those has an id or ruling yet, so no text names them and no reward/item is referenced. No team name: no document ties a member to this camp."),
    }
CAMPS = {
 ("thornwood", "camp_thornwood"): camp("camp_thornwood", "camp_restored_thornwood",
    ["An empty tent, ferns grown right over it.", "Nobody's slept here in a long while."],
    ["Your camp now. Stove's warm, tent's dry.", "A good spot to sit a while with your team."],
    ["You pull the ferns off the tent and sweep out the leaves.", "The stove catches on the second try."],
    "Thornwood field-team camp (World spot (6,17), stand (6,18), face up; flag_swaps camp_cold -> camp_restored on camp_restored_thornwood)."),
 ("greystone_b1", "camp_greystone"): camp("camp_greystone", "camp_restored_greystone",
    ["A cold camp stove, tucked out of the draught.", "A bedroll beside it, grey with cave dust."],
    ["Your camp now. Warm, for a cave.", "A good spot to sit a while with your team."],
    ["You shake out the bedroll and brush off the dust.", "The stove takes a few tries, then catches."],
    "Greystone field-team camp (World added the spot during v0.4.9 with 'key requested from Text Bot': (19,2), stand (19,3), face up; flag_swaps camp_cold -> camp_restored on camp_restored_greystone). "
    "Look line follows the club note ('cold camp stove'). Text Bot addition beyond the brief, same rules as Thornwood; Story Bot tone check."),
}
for (_m, _c), _e in CAMPS.items(): maps[_m][_c] = _e
'''
s=s[:i]+new+s[j:]
a="""_ct = maps.get('thornwood', {}).get('camp_thornwood')
_csp = ISPOTS.get('thornwood', {}).get('camp_thornwood', {})
if not _ct: errs.append('maps.thornwood.camp_thornwood missing')
else:"""
assert s.count(a)==1
s=s.replace(a,"""for (_cm, _cid) in list(CAMPS) + [(m, sid) for m, sp in ISPOTS.items() for sid in sp if sid.startswith('camp_') and (m, sid) not in CAMPS]:
  _ct = maps.get(_cm, {}).get(_cid); _csp = ISPOTS.get(_cm, {}).get(_cid, {})
  if not _ct: errs.append(f'maps.{_cm}.{_cid} missing'); continue
  if True:""")
# re-indent the old else-body by 2 extra? It used 4 spaces under else:, now under 'if True:' at 2 -> 4 works.
s=s.replace("f'camp_thornwood: line order","f'{_cid}: line order").replace("'camp_thornwood: needs pending_story_call","f'{_cid}: needs pending_story_call").replace("'camp_thornwood: prompt must follow","f'{_cid}: prompt must follow").replace("f'camp_thornwood: {_key}","f'{_cid}: {_key}").replace("f'camp_thornwood: text hits","f'{_cid}: text hits").replace("'maps.thornwood.camp_thornwood')","f'maps.{_cm}.{_cid}')")
s=s.replace('''  "maps.thornwood.camp_thornwood (World spot (6,17)): look line''','''  "maps.greystone_b1.camp_greystone: World added the spot mid-run (key requested from Text Bot), so it gets the same camp entry (Text Bot addition beyond the brief, pending_story_call). Look line echoes the club note's cold camp stove.",
  "maps.thornwood.camp_thornwood (World spot (6,17)): look line''')
open(p,'w').write(s)
