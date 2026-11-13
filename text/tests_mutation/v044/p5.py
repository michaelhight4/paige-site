p='/workspace/kilumen/text/build_overworld_lines.py'; s=open(p).read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:60],s.count(a)); s=s.replace(a,b)
# (a) adoption: text moves, a geometry-only anchor stays for World's text_spots() generator
rep('''    _e = unplaced["props"].pop(_key)
    _ls = [dict(l) for l in _e["lines"]]''','''    _e = unplaced["props"].pop(_key)
    # text moves word for word; World's tools/world_data.py text_spots() still builds these spots from unplaced.props proposed_spot,
    # so a geometry-only anchor (no lines) stays until World hard-codes them (like WINDOWS). Without it, run.py --check drops the spots.
    unplaced["props"][_key] = {"anchor_only": True, "proposed_spot": _e["proposed_spot"], "moved_to": f"maps.{_m}.{_sp}",
        "_note": "Geometry anchor only, no text. The text lives at moved_to. Remove once World's text_spots() lists this spot itself."}
    _ls = [dict(l) for l in _e["lines"]]''')
# (b) unplaced validation: anchors
rep('''    for _k, _e in unplaced[_sec].items():
        if _k.startswith('_'): continue
        check_lines(_e['lines'], f'unplaced.{_sec}.{_k}')''','''    for _k, _e in unplaced[_sec].items():
        if _k.startswith('_'): continue
        if _e.get('anchor_only'):
            _mm, _ms = _e['moved_to'].split('.')[1:]
            if 'lines' in _e or 'pages' in _e: errs.append(f'unplaced.{_sec}.{_k}: anchor must carry no text')
            if _ms not in maps.get(_mm, {}): errs.append(f'unplaced.{_sec}.{_k}: anchor moved_to {_e["moved_to"]} has no text')
            if (_e['proposed_spot']['map'], _e['proposed_spot']['proposed_id']) != (_mm, _ms): errs.append(f'unplaced.{_sec}.{_k}: anchor proposed_spot != moved_to')
            _sp_w = ISPOTS.get(_mm, {}).get(_ms)
            if _sp_w and (_sp_w['x'], _sp_w['y']) != (_e['proposed_spot']['x'], _e['proposed_spot']['y']): errs.append(f'unplaced.{_sec}.{_k}: anchor geometry differs from World spot')
            continue
        check_lines(_e['lines'], f'unplaced.{_sec}.{_k}')''')
# (c) colours: old/new branch colours, and branch maps get the room-colour rule too
rep("'black', 'teal', 'beige', 'cream', 'crimson', 'navy', 'violet', 'golden'}","'black', 'teal', 'beige', 'cream', 'crimson', 'navy', 'violet', 'golden', 'lilac', 'lavender', 'mauve', 'rose', 'wine', 'magenta', 'plum'}")
rep('''            if INDOOR_OR_CAVE(mid) and 'phase' in w''','''            if (mid.startswith('heal_') or mid.startswith('rt_branch')) and (COLOURS.search(pg) and SURFACE.search(pg) or re.search(r'\\b(lilac|pink)\\b', pg, re.I)):
                errs.append(f'{where}.{l["id"]}: branch interior names a tile/room colour (branch tiles were recoloured lilac -> pink): {pg}')
            if INDOOR_OR_CAVE(mid) and 'phase' in w''')
# (d) catalogue checks + global lilac ban, before _fit_walk
rep('''_fit_walk(doc, [])
if errs:''','''# (g) v0.4.5: World items (maps/*.json items[]) -> system_item_catalogue; no tile colour words anywhere
_CAT = SL.SYSTEM["system_item_catalogue"]; _POCKETS = set(doc["comfort"]["bag_pockets"])
_MAP_ITEMS = {}
for _mid, _mj in MAPJ.items():
    for _it in _mj.get('items', []): _MAP_ITEMS.setdefault(_it['item'], []).append(f"{_mid}.{_it['id']}")
for _iid, _where in sorted(_MAP_ITEMS.items()):
    if _iid not in _CAT and _iid not in SL.CATALOGUE_PENDING: errs.append(f'system_item_catalogue: World item id {_iid} ({", ".join(_where[:3])}) has no name/description')
for _iid, _e in _CAT.items():
    if _iid.startswith('_'): continue
    if len(_e['name']) > len(SL.SAMPLES['{item}']): errs.append(f'system_item_catalogue.{_iid}: name longer than the {{item}} sample')
    if re.search(r'\\bcoins?\\b', _e['name'] + ' '.join(_e['pages']), re.I): errs.append(f'system_item_catalogue.{_iid}: players only see "coin" for a Master token')
    if _e['pocket'] is not None and _e['pocket'] not in _POCKETS: errs.append(f'system_item_catalogue.{_iid}: unknown pocket {_e["pocket"]}')
_names = [e['name'].lower() for k, e in _CAT.items() if not k.startswith('_')]
if len(_names) != len(set(_names)): errs.append('system_item_catalogue: duplicate item names')
if re.search(r'\\blilac\\b', json.dumps({k: v for k, v in doc.items() if k != '_meta'}), re.I): errs.append('a line mentions lilac (old branch tile colour)')
_fit_walk(doc, [])
if errs:''')
# (e) version + changelog
rep('meta["version"] = "0.4.4"\n','''meta["version"] = "0.4.5"
meta["item_catalogue_spec"] = {"_note": "system_item_catalogue is keyed by World's item ids (items/ITEM_PLACEHOLDERS.json); {item} = name. Pocket = comfort.bag_pockets key; pocket null = money (system_items.picked_up_money, {amount}). Validator: every items[].item in maps/*.json has an entry or is in pending.",
  "pending": SL.CATALOGUE_PENDING, "world_pocket_hint_to_ours": SL.POCKET_HINT}
''')
rep('''meta["changelog"] = {"0.4.4": [''','''meta["changelog"] = {"0.4.5": [
  "World map pass (OVERWORLD_README 16-17): text checked for every new spot (TVs, bookcases, windows, lap_nap_seat at (2,4) facing up, cradle_1-3, aide at (10,6)). Geometry copied from interact_spots/text_pending.",
  "7 unplaced TV/bookcase texts moved word for word to their World spot ids (meta.world_adoption). Each keeps a geometry-only anchor in unplaced.props (no text) because World's text_spots() still builds the spots from it; drop the anchors once World hard-codes them.",
  "Cradles: after-starter lines stay pending_story_call; each has a neutral default. shop_int third shelf (goods) has no interact spot, so no line.",
  "New system_item_catalogue: names + bag text for all 12 named World item ids; TBD / TBD_backroom_reward wait on Story. system_items.picked_up_money + {amount}. coin_pouch_small shows as 'a small purse' (coin = Master token).",
  "Validator: catalogue covers every maps/*.json item id; names fit {item}; no 'coin' in item text; branch maps (heal_*, rt_branch_*) may not name a tile/room colour; 'lilac' banned file-wide (branch tiles are pink now).",
  "Tags shallow / crystal / firefly_zone / bird_perch are Animator effects with no interact; no text needed."],
 "0.4.4": [''')
open(p,'w').write(s)
