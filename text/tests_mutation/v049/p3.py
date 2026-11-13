p='/workspace/kilumen/text/build_overworld_lines.py'; s=open(p).read()
def rep(a,b,n=1):
    global s; assert s.count(a)==n,(s.count(a),a[:80]); s=s.replace(a,b)
rep('''  "pages": ["Your camp now. Stove's warm, tent's dry.", "A good spot to rest with your team."],
  "_soul_lines": [
    L("camp_restored_first", ["The camp's tidy again.", "Still no sign of them."], flags=["camp_restored_thornwood"], when={"once": True}, pending=True),
    L("camp_cold", ["An empty tent, ferns grown right over it.", "Nobody's slept here in a long while."], pending=True),
  ],
  "prompt": ["Clear the camp and light the stove?"], "choices": ["Yes", "No"],''',
'''  "pages": ["An empty tent, ferns grown right over it.", "Nobody's slept here in a long while."],
  "_soul_lines": [
    L("camp_restored_first", ["The camp's tidy again.", "Still no sign of them."], flags=["camp_restored_thornwood"], when={"once": True}, pending=True),
    L("camp_restored", ["Your camp now. Stove's warm, tent's dry.", "A good spot to rest with your team."], flags=["camp_restored_thornwood"], pending=True),
  ],
  "prompt": ["Clear the camp and light the stove?"], "choices": ["Yes", "No"], "prompt_after_line": "default",''')
rep('''            "Flow: camp_cold look line, then prompt; Yes plays use and sets camp_restored_thornwood (map sets_flag); No plays declined. "
            "After restore: camp_restored_first once, then the default. ''',
'''            "Flow before restore: the default line (cold camp look) plays, then the prompt (prompt_after_line = default, so the prompt never follows the restored lines); "
            "Yes plays use and sets camp_restored_thornwood (map sets_flag); No plays declined. After restore: camp_restored_first once, then camp_restored every time. ''')
rep('CAMP_LINE_IDS = ["camp_restored_first", "camp_cold", "default"]','CAMP_LINE_IDS = ["camp_restored_first", "camp_restored", "default"]')
rep("check_lines([{'id': 'camp_extra', 'flags': [], 'pages': _p}]","check_lines([{'id': 'default', 'flags': [], 'pages': _p}]")
rep("    if not _ct.get('pending_story_call'): errs.append('camp_thornwood: needs pending_story_call (Story Bot tone check)')",
    "    if not _ct.get('pending_story_call') or not all(l.get('pending_story_call') for l in _ct['lines'][:-1]): errs.append('camp_thornwood: needs pending_story_call (Story Bot tone check)')\n    if _ct.get('prompt_after_line') != 'default' or _ct['lines'][-1]['flags']: errs.append('camp_thornwood: prompt must follow the unflagged default (cold camp) line only')")
open(p,'w').write(s)
