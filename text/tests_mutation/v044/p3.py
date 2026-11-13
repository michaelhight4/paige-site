p='/workspace/kilumen/text/build_overworld_lines.py'
s=open(p).read()
old_start='# ---- v0.4.4: World adopted these proposals'
old_end='# lap nap: World/Animator made it a tile trigger'
i=s.index(old_start); j=s.index(old_end)
new='''# ---- v0.4.4: World adopts proposals by putting the spot id in maps/*.json (interact_spots or text_pending). ----
# Data-driven: only spots World has actually placed move over (word for word); the rest stay in unplaced. Never invents ids.
def _world_spot_ids(m):
    try: _j = json.load(open(f"{OW}/maps/{m}.json"))
    except FileNotFoundError: return set()
    return {s.get("id") for s in _j.get("interact_spots", []) + _j.get("text_pending", {}).get("interact_spots", [])}
ADOPTED = []
for _key in ["home_brookhollow_b.tv", "home_lanternport_c.tv", "home_brookhollow_a.bookcase", "home_fernwick_c.bookcase",
             "home_lanternport_c.bookcase", "home_saltmere_a.bookcase", "home_fernwick_a.bookcase"]:
    _m, _sp = _key.split(".")
    if _sp not in _world_spot_ids(_m) or _sp in SOUL_PROPS.get(_m, {}): continue
    _e = unplaced["props"].pop(_key)
    _ls = [dict(l) for l in _e["lines"]]
    for _l in _ls: _l.setdefault("soul_item", "1")
    SOUL_PROPS.setdefault(_m, {})[_sp] = prop("1", [l for l in _ls if l["id"] != "default"], _ls[-1]["pages"], text_was=f"unplaced.props.{_key}")
    ADOPTED.append(f"unplaced.props.{_key} -> maps.{_m}.{_sp}")
for (_om, _ow), (_nm, _nw) in {("house_int_b", "window_1"): ("home_brookhollow_b", "window_1"), ("house_int_b", "window_2"): ("home_brookhollow_b", "window_2"),
                               ("house_int_a", "window_1"): ("home_brookhollow_b", "window_kitchen"),
                               ("house_int_c", "window_1"): ("home_fernwick_a", "window_1"), ("house_int_c", "window_2"): ("home_fernwick_a", "window_2")}.items():
    if _nw not in _world_spot_ids(_nm): continue
    unplaced["windows"].pop(f"{_om}.{_ow}")
    _lines, _default = RETIRED_WINDOWS[(_om, _ow)]
    SOUL_PROPS.setdefault(_nm, {})[_nw] = prop("1", _lines, _default, text_was=f"unplaced.windows.{_om}.{_ow} (was maps.{_om}.{_ow})")
    ADOPTED.append(f"unplaced.windows.{_om}.{_ow} -> maps.{_nm}.{_nw}")
if not [k for k in unplaced["windows"] if not k.startswith("_")]:
    unplaced["windows"] = {"_note": "v0.4.4: all 5 retired windows now have World spots (home_brookhollow_b, home_fernwick_a). Nothing left here."}
'''
s=s[:i]+new+s[j:]
s=s.replace('''for _hm in ("heal_brookhollow", "heal_fernwick"):
    SOUL_PROPS[_hm]["sofa"]["_soul_lines"] = []''','''for _hm in ("heal_brookhollow", "heal_fernwick"):
    if "lap_nap_seat" not in _world_spot_ids(_hm): continue
    ADOPTED.append(f"maps.{_hm}.sofa (e10_lap_nap line) -> maps.{_hm}.lap_nap_seat")
    SOUL_PROPS[_hm]["sofa"]["_soul_lines"] = []''')
open(p,'w').write(s)
