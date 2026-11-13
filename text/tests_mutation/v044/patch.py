p='/workspace/kilumen/text/build_overworld_lines.py'
s=open(p).read()
A='# ---------- validation ----------\nerrs = []; warns = []'
assert s.count(A)==1
B='''# ---------- v0.4.4 system text (coverage audit vs design/MECHANICS_PARITY.md) ----------
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import system_lines as SL
doc.update(SL.SYSTEM)
EXTRA_PLACEHOLDERS.update(SL.NEW_PLACEHOLDERS)
meta["version"] = "0.4.4"
meta["sources"] += ["design/MECHANICS_PARITY.md (Game dev, Oct 22 2026 ~8:30 PM CT): master list for the coverage audit",
                    "design/POKEMON_SKILL_STRUCTURE_RESEARCH.md (skill structure)", "text/system_lines.py (system_* sections, Text Bot)"]
meta["coverage_audit"] = {"_note": "Text coverage per MECHANICS_PARITY.md system id. parity_status = that doc's build status; text = covered (already in this file) | written_now (v0.4.4 system_* sections) | needs_mechanic (see mechanics_gap). Rows not listed have no player-facing text (formulas, AI, audio, etc.).",
                          "rows": [{"id": i, "system": n, "parity_status": ps, "text": t, "where": w} for i, n, ps, t, w in SL.COVERAGE]}
meta["mechanics_gap"] = {"_note": "Systems with no text yet because the mechanic is not built or not specified. World Design's built/specced/missing table was not on disk (8:30 PM CT); ids follow design/MECHANICS_PARITY.md instead.",
                         "items": SL.MECHANICS_GAP}
meta["pending_gary_calls"] = {"_note": "Lines that depend on an open design call carry pending_gary_call (and variants per option where wording differs). Text Bot picks nothing until Gary rules.", **SL.GARY_CALLS}
meta["system_text_spec"] = {"entry": "system_<area>.<key> = {pages | labels | tiers, parity (MECHANICS_PARITY id), build (built|partial|designed|different|missing), choices?, variants?, pending_gary_call?, pending_story_call?, note?}",
                            "tiers": "pick the last tier whose min <= value (Kilindex caught count, Croft Warmth)",
                            "placeholders": "every page is width-checked with the longest sample of each placeholder (system_lines.SAMPLES)"}
meta["changelog"] = {"0.4.4": [
  "Coverage audit against design/MECHANICS_PARITY.md (109 systems): new top-level sections system_items, system_heal, system_shop, system_trainers, system_wild, system_blackout, system_save, system_skills, system_evolution, system_kilindex, system_cosmic, system_party, system_croft, system_trade, system_garden, system_field, system_phone (data in text/system_lines.py).",
  "meta.coverage_audit (by parity id), meta.mechanics_gap, meta.pending_gary_calls, meta.system_text_spec.",
  "Validator: system entries need a real parity id + build status, 1-3 pages, 2x40 wrap with worst-case placeholder values, short labels/choices, variants only with pending_gary_call, gender-neutral player lines, and a scan for lifted franchise phrasings.",
  "NAME_CHECK.md: web clash check of proposed names from the design doc and MECHANICS_PARITY.md."],
 **meta["changelog"]}
meta["rules_applied"].update({
  "Mirror structure only, never wording": "System lines follow the flow of the studied games (pickup, heal, shop, skills) in our own words; the validator bans lifted phrasings.",
  "Only write text for mechanics Kilumen has or plans": "Unbuilt, unspecified systems go to meta.mechanics_gap, not into text.",
  "Pending Gary calls": "Lines that hang on potions/rest, paid travel, phone/PC storage, player gender or Ron's mode are neutral or carry per-option variants plus pending_gary_call.",
})
doc["_proposed_names"]["system_v0.4.4"] = {
  "Skill Memory / Field Archive / Training Reel / Transfer to Revival Tech / File today's report / Variant Ledger / supply satchel": "see text/NAME_CHECK.md (web-checked Oct 22 2026)."}

'''
s=s.replace(A, B+A)
s=s.replace("'disabled_until', 'fallback_for'}", "'disabled_until', 'fallback_for', '_section', 'parity', 'build', 'pending_gary_call', 'pending_story_call', 'min'}")
C="if errs:\n    print('\\n'.join(errs)); sys.exit(1)\njson.dump(doc"
assert s.count(C)==1
D='''# (e) v0.4.4 system sections
PARITY_IDS = set(re.findall(r'^\\| ([BCPFEGM]\\d+) \\|', open(ROOT + '/design/MECHANICS_PARITY.md').read(), re.M))
BUILD_OK = {'built', 'partial', 'designed', 'different', 'missing'}
LIFTED = re.compile(r"wild \\w+ appeared|got away safely|whited out|blacked out|is evolving|congratulations|wants to battle|would like to battle|1, 2,? and|\\bpoof\\b|obtained|put away the|we hope to see you|is out of usable|can't learn more than", re.I)
def _wrap_ok(t):
    n = 0
    for part in t.split('\\n'): n += len(textwrap.wrap(part, 40) or [''])
    return n <= 2
def _msg(pages, where):
    if not isinstance(pages, list) or not 1 <= len(pages) <= 3: errs.append(f'{where}: needs 1-3 pages'); return
    for i, pg in enumerate(pages):
        x = pg
        for ph in re.findall(r'\\{\\w+\\}', pg):
            if ph not in SL.SAMPLES: errs.append(f'{where}[{i}]: no worst-case sample for {ph}')
            else: x = x.replace(ph, SL.SAMPLES[ph])
        if not _wrap_ok(x): errs.append(f'{where}[{i}]: too long with worst-case placeholders: {x}')
        if LIFTED.search(pg): errs.append(f'{where}[{i}]: lifted franchise phrasing: {pg}')
        if '{player}' in pg and re.search(r'\\b(he|she|his|her|him|hers)\\b', pg, re.I): errs.append(f'{where}[{i}]: player line must be gender-neutral')
for sec in SL.SYSTEM:
    if not sec.startswith('system_'): errs.append(f'{sec}: system sections must be named system_*')
    for key, e in SL.SYSTEM[sec].items():
        if key.startswith('_'): continue
        w = f'{sec}.{key}'
        if not isinstance(e, dict): errs.append(f'{w}: entry must be a dict'); continue
        if e.get('parity') not in PARITY_IDS: errs.append(f'{w}: parity id {e.get("parity")} not in MECHANICS_PARITY.md')
        if e.get('build') not in BUILD_OK: errs.append(f'{w}: bad build status {e.get("build")}')
        bodies = [k for k in ('pages', 'labels', 'tiers') if k in e] + (['phases'] if all(p in e for p in PHASES) else [])
        if not bodies: errs.append(f'{w}: no pages/labels/tiers')
        if 'pages' in e: _msg(e['pages'], w)
        for k, v in e.get('variants', {}).items(): _msg(v, f'{w}.variants.{k}')
        for i, t in enumerate(e.get('tiers', [])):
            _msg(t['pages'], f'{w}.tiers[{i}]')
            if i and t['min'] <= e['tiers'][i - 1]['min']: errs.append(f'{w}: tiers must rise')
        if 'tiers' in e and e['tiers'][0]['min'] != 0: errs.append(f'{w}: first tier must start at 0')
        for p in PHASES:
            if p in e: _msg(e[p], f'{w}.{p}')
        for k, v in e.get('labels', {}).items():
            if len(v) > 24 or LIFTED.search(v): errs.append(f'{w}.labels.{k}: label too long or lifted')
        for c in e.get('choices', []):
            if len(c) > 18: errs.append(f'{w}: choice too long: {c}')
        if 'variants' in e and e.get('pending_gary_call') not in SL.GARY_CALLS: errs.append(f'{w}: variants need a pending_gary_call')
        if 'pending_gary_call' in e and e['pending_gary_call'] not in SL.GARY_CALLS: errs.append(f'{w}: unknown gary call')
for i, n, ps, t, wh in SL.COVERAGE:
    for part in re.findall(r'[BCPFEGM]\\d+', i):
        if part not in PARITY_IDS: errs.append(f'coverage row {i}: not a MECHANICS_PARITY id')
for g in SL.MECHANICS_GAP:
    for part in re.findall(r'[BCPFEGM]\\d+', g['parity']):
        if part not in PARITY_IDS: errs.append(f'mechanics_gap {g["category"]}: bad parity id {part}')
'''
s=s.replace(C, D+C)
open(p,'w').write(s)
