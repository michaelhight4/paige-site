P = '/workspace/kilumen/text/build_overworld_lines.py'
s = open(P).read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (s.count(old), old[:80])
    s = s.replace(old, new)

rep(''' "station_int": {
  "station_clerk": dict(rail_only["npcs"]["station_attendant"], note="same text as rail_only.npcs.station_attendant"),
  "station_traveller": dict(rail_only["npcs"]["commuter"], note="same text as rail_only.npcs.commuter"),
  "restricted_airspace": npc([RESTRICT], note="same text as rail_only.signs.sign_airspace"),
  "timetable": npc(["LUMEN LINE DEPARTURES\\nEvery 20 minutes, give or take.", "Stops: Saltmere, Lanternport, Revival Heights, Aurelith."],
                   note="stops = rail towns in progression.py TOWNS; confirm list with World"),
 },''',
''' "station_int": {   # v0.4.3: SPARE map (World, 8:20 PM CT). Text parked here; rail_only.<path> named by World's text_ref is the same entry
  "station_clerk": dict(rail_only["npcs"]["station_attendant"]),
  "station_traveller": dict(rail_only["npcs"]["commuter"]),
  "restricted_airspace": npc([RESTRICT]),
  "timetable": npc(["LUMEN LINE DEPARTURES\\nEvery 20 minutes, give or take.", "Stops: Saltmere, Lanternport, Revival Heights, Aurelith."],
                   note="stops = rail towns in progression.py TOWNS; confirm list with World. Replaces the old rail_only.signs.sign_platform text "
                        "('Government restricted airspace: arrivals by rail only.' / 'Lumen Line, platform 1.'), which the restricted_airspace board already says"),
 },''')

# after the lines pass: alias rail_only paths to the station_int entries, and make every rail_only sign/npc picker-readable
anchor = '''        lines.append(L("default", e["pages"]))
        e["lines"] = lines
'''
rep(anchor, anchor + '''
# ---- v0.4.3 issue 1: World's station_int text_refs name rail_only.* paths (tools/extra_merge.py PENDING_REF). Coder's engine reads
# maps.station_int.<id> first, then the text_ref. Both paths now hold the SAME entry, so either lookup shows the same words.
SPARE_MAPS = {
 "station_int": "World 8:20 PM CT: spare until a town needs a station (no door leads here). Text parked, kept valid; rail_only paths in its text_refs resolve to the same entries.",
 "home_saltmere_a": "World 8:20 PM CT: spare until Saltmere is built (no door leads here). Text parked, kept valid; its zone lines are not a wiring todo while spare.",
}
RAIL_REFS = {}
for _d in MAPJ["station_int"].get("npcs", []) + MAPJ["station_int"].get("signs", []) + MAPJ["station_int"].get("npcs_pending_text", []) \\
        + MAPJ["station_int"].get("signs_pending_text", []) + _tp(MAPJ["station_int"], "npcs") + _tp(MAPJ["station_int"], "signs"):
    _m = re.search(r'overworld_lines\\.json\\s+rail_only\\.(npcs|signs)\\.(\\w+)', _d.get("text_ref", ""))
    if _m: RAIL_REFS[_d["id"]] = (_m.group(1), _m.group(2))
for _sid, (_sec, _key) in RAIL_REFS.items():
    _e = copy.deepcopy(maps["station_int"][_sid])
    maps["station_int"][_sid]["note"] = f"spare map text (meta.spare_maps). Same entry as rail_only.{_sec}.{_key} (World's text_ref)."
    _e["note"] = f"Same entry as maps.station_int.{_sid} (World's station_int text_ref points here). Shared rail-station kit text."
    rail_only[_sec][_key] = _e
def _entry(v):
    if isinstance(v, list): return {"pages": v, "lines": [L("default", v)]}
    if isinstance(v, dict) and "lines" not in v: return {**v, "lines": [L("default", v["pages"])]}
    return v
for _sec in ("signs", "npcs"):
    for _key in list(rail_only[_sec]): rail_only[_sec][_key] = _entry(rail_only[_sec][_key])
# restricted_airspace_officer: sprite removed from npc_sprite_map (Character models, 8:20 PM CT) -> text goes to unplaced.
# World's world_layout fly/rail lists still name rail_only.npcs.airspace_officer, so that path keeps a copy marked unplaced.
AIRSPACE_OFFICER = copy.deepcopy(rail_only["npcs"]["airspace_officer"])
rail_only["npcs"]["airspace_officer"]["status"] = ("unplaced: no sprite (npc_sprite_map dropped station_int.restricted_airspace_officer). "
    "Kept because world_layout fly/rail lists name this path; same text as unplaced.npcs['station_int.restricted_airspace_officer'].")
''')

rep('''unplaced["npcs"]["house_int_a.cook"] = {''',
'''unplaced["npcs"]["station_int.restricted_airspace_officer"] = {
 "text_was": "rail_only.npcs.airspace_officer", "proposed_spot": None,
 "_note": "v0.4.3: Character models removed this sprite id from npc_sprite_map; station_int is a spare map and its restricted_airspace "
          "board already reads 'GOVERNMENT RESTRICTED AIRSPACE / Arrivals by rail only.' Kept word for word for a future rail-only city "
          "officer (revival_heights / aurelith). Id is the old sprite-map id, not a new one.",
 "lines": None}   # filled after the lines pass
unplaced["npcs"]["house_int_a.cook"] = {''')

# fill after alias block
rep('''rail_only["npcs"]["airspace_officer"]["status"] = (''', '''unplaced["npcs"]["station_int.restricted_airspace_officer"]["lines"] = AIRSPACE_OFFICER["lines"]
rail_only["npcs"]["airspace_officer"]["status"] = (''')
open(P, 'w').write(s); print("ok2")
