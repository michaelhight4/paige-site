import re
P = '/workspace/kilumen/text/build_overworld_lines.py'
s = open(P).read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (s.count(old), old[:80])
    s = s.replace(old, new)

rep("import json, glob, os, re, textwrap, sys, ast", "import json, glob, os, re, textwrap, sys, ast, copy, itertools")

# ---- issue 4: bin lines keyed on the shown stage (coin COUNT), not on single coin flags ----
old_bin = s[s.index("BIN_LINES = [   # bin_stage"):s.index("BIN_DEFAULT = [")]
new_bin = '''BIN_LINES = [   # v0.4.3: keyed on the bin_stages stage the tile shows (= coin COUNT, Coder overworld.js binStage()), never on single coin flags
 # Coder's picker (src/overworld/lines.js pickLine) skips a line whose bin_stage != env.binStage, and binStage is coinCount(flags)
 # (number of beat_master_* flags, 8 with all_badges, 'empty' with finale_done). So coins won out of order still pick the right line.
 L("bin_empty", ["Empty. Scrubbed clean. Not a single fly.", "Ron took the bags out. Bin day finally came."],
   flags=["finale_done"], item="3", story_ruling="STORY_RULINGS_SOUL #3", bin_stage="empty",
   note="tile bin_ron_empty, no flies overlay; E5 is missable on purpose"),
 L("bin_creature", ["Something in the bags moves.", "A Mirewump climbs out. It looks like it's been living here a while."],
   when={"count_gte": {"counter": "bin_inspects_after_8", "n": 8}, "once": True}, item="3", bin_stage="8",
   note="E5 Bin Monument pop-out: only at stage 8 before finale_done (bin_stages.e5_bin_monument); starts an encounter. Coder bumps bin_inspects_after_8 only while all_badges and not finale_done"),
 L("bin_8", ["Eight bags and a cloud of flies.", "This is no longer a bin. It's a monument."], item="3", bin_stage="8"),
 L("bin_7", ["Seven bags. The flies have invited friends.", "A neighbour left a polite note. It's in the bin."], item="3", bin_stage="7"),
 L("bin_6", ["Six bags, plus a small cloud of flies.", "The flies seem happy, at least."], item="3", bin_stage="6",
   note="bin_flies overlay starts here"),
 L("bin_5", ["Five bags. The lid gave up a while ago."], item="3", bin_stage="5"),
 L("bin_4", ["Four bags. One of them is leaking something blue."], item="3", bin_stage="4"),
 L("bin_3", ["Three bags. Ron's labelled one 'NOT MINE'.", "It's his."], item="3", bin_stage="3"),
 L("bin_2", ["Two bags now. The lid doesn't quite shut."], item="3", bin_stage="2"),
 L("bin_1", ["One bag beside the bin.", "Ron says it's going out tomorrow."], item="3", bin_stage="1"),
]
'''
s = s.replace(old_bin, new_bin)
rep('''note="stateful tile from map bin_stages; each line's bin_stage matches the tile shown"''',
    '''note="stateful tile from map bin_stages; each line's bin_stage matches the tile shown. Stage = coin count (Coder binStage()), so lines carry no coin flags (v0.4.3)"''')

# ---- issue 2: weekday ----
rep('''  L("kid_school", ["Where was I earlier? School. Obviously."], when={"phase": "dusk", "weekday": "mon-fri"}, item="8",
    needs="1.4 weekday clock (next tier, not approved); kid is absent on weekday Day phase"),''',
'''  L("kid_school", ["Where was I earlier? School. Obviously."], when={"phase": "dusk", "weekday": "mon-fri"}, item="8",
    needs="1.4 weekday clock (next tier, not approved); kid is absent on weekday Day phase",
    disabled_until="weekday (1.4 weekday clock). Coder's picker has no weekday case, so this line never matches until then; kid_dusk covers dusk meanwhile"),
  L("kid_dusk", ["Homework's done. Mostly.", "Don't tell my mom about the 'mostly'."], when={"phase": "dusk"}, item="8",
    fallback_for="kid_school", note="v0.4.3 stand-in for kid_school using supported keys only (phase); claims no weekday"),''')

# ---- issue 3: {rt_number} spec ----
rep(''' "{rt_number}": "full catalogue number, e.g. RT-0147. Only Vane and the catch flow use it.",''',
''' "{rt_number}": "Catalogue number of the lead creature, shown as 'RT-' + 4 digits (RT-0001 to RT-9999). Only Vane and the catch flow use it. Spec for Coder: _meta.placeholder_specs.rt_number.",''')

# ---- issue 1: rail_only entries readable by the picker (they were bare page lists) ----
rep('''  "sign_platform": ["Government restricted airspace: arrivals by rail only.", "Lumen Line, platform 1."],''',
    '''  "sign_platform": None,   # v0.4.3: filled after the lines pass with the station_int timetable entry (World's text_ref for station_int.timetable)''')

open(P, 'w').write(s)
print("ok part1")
