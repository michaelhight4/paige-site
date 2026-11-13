"""Kilumen <-> LDtk map bridge (library).

Kilumen map JSON (art/world/overworld/maps/<name>.json, built and owned by World Design)
  <->  one LDtk 1.5.3 project (.ldtk, plain JSON) + a combined tile atlas PNG.

Export: every Kilumen map becomes one LDtk level. Tile layers ground/decoration/overlay/fog become LDtk "Tiles"
layers on ONE combined atlas (LDtk allows a single tileset per tile layer; Kilumen's 2744 tiles live on 22 sheets).
Each atlas slot carries the Kilumen tile NAME in the tileset's customData, so import resolves tiles by name and
maps them to whatever id World Design's current tileset.json gives that name (ids get renumbered; names do not).
collision / encounter become LDtk "IntGrid" layers (values = Kilumen collision codes / encounter codes).
warps, exits, npcs, signs, items, interact spots, encounter zones, ... become typed LDtk entities. The full
original object rides along in a hidden `_json` field, so keys the editor does not show survive the round trip.
Everything else on the map (story gates, ambient, tags, ...) is kept verbatim in the level field `kilumen_meta`.

Import never writes into art/world/overworld/ (World Design's folder): see assert_safe_out().
Pure python3 + Pillow. No LDtk code is used or shipped; the format follows LDtk's published JSON schema (MIT).
"""
import hashlib, json, os, re, uuid

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OVERWORLD = os.path.join(REPO, 'art', 'world', 'overworld')
MAPS_DIR = os.path.join(OVERWORLD, 'maps')
TILESET = os.path.join(OVERWORLD, 'tileset.json')
LDTK_VERSION = '1.5.3'
GRID = 64
ATLAS_COLS = 64
NS = uuid.UUID('5b0c6e8e-6a35-4c1e-9d49-6b696c756d65')   # fixed namespace -> deterministic iids (clean diffs on re-export)

TILE_LAYERS = ('ground', 'decoration', 'overlay', 'fog')
INT_LAYERS = ('collision', 'encounter')
COLLISION_NAMES = None  # filled from tileset.json collision_codes
ENCOUNTER_NAMES = {1: 'grass', 2: 'cave'}   # tools/world_data.py: "layer code 1 grass / 2 cave"
COLLISION_COLORS = {1: '#E43B44', 2: '#F77622', 3: '#2C7BE5', 4: '#FEE761', 5: '#8B6F47', 6: '#B55088', 7: '#3E8948',
                    8: '#5A6988', 9: '#C28569', 10: '#9BE3F2', 11: '#124E89'}
ENCOUNTER_COLORS = {1: '#63C74D', 2: '#A15CF0'}

# ---------- entity spec: (Entity identifier, map key(s), colour, size kind, typed fields [(key, type)]) ----------
# type: S string, T multi-line text, I int, B bool, P point [x,y], E:<Enum> enum. Keys not listed stay in `_json`.
ENTITIES = [
    dict(id='Warp', keys=['warps'], color='#FEE761', shape='cell',
         fields=[('to', 'S'), ('tx', 'I'), ('ty', 'I'), ('facing', 'E:Facing'), ('note', 'S')]),
    dict(id='LockedWarp', keys=['locked_warps'], color='#F77622', shape='cell',
         fields=[('to', 'S'), ('tx', 'I'), ('ty', 'I'), ('facing', 'E:Facing'), ('unlock_flag', 'S'), ('note', 'S')]),
    dict(id='Exit', keys=['exits'], color='#FFFFFF', shape='edge',
         fields=[('edge', 'E:Edge'), ('to', 'S'), ('offset', 'I'), ('note', 'S')]),
    dict(id='Npc', keys=['npcs', 'npcs_pending_text'], color='#0099DB', shape='cell',
         fields=[('id', 'S'), ('kind', 'S'), ('facing', 'E:Facing'), ('text_ref', 'S'), ('note', 'S')]),
    dict(id='Sign', keys=['signs', 'signs_pending_text'], color='#C28569', shape='cell',
         fields=[('id', 'S'), ('text', 'T'), ('text_ref', 'S')]),
    dict(id='Item', keys=['items'], color='#FF0044', shape='cell',
         fields=[('id', 'S'), ('item', 'S'), ('hidden', 'B'), ('flag', 'S'), ('note', 'S')]),
    dict(id='InteractSpot', keys=['interact_spots'], color='#A15CF0', shape='cell',
         fields=[('id', 'S'), ('kind', 'S'), ('stand', 'P'), ('face', 'E:Facing'), ('tile', 'S'), ('text', 'S'), ('note', 'S')]),
    dict(id='EncounterZone', keys=['encounter_zones'], color='#63C74D', shape='rect',
         fields=[('table', 'S'), ('note', 'S')]),
    dict(id='ForcedGrass', keys=['forced_grass'], color='#3E8948', shape='rect',
         fields=[('id', 'S'), ('kind', 'S')]),
    dict(id='FlagSwap', keys=['flag_swaps'], color='#B55088', shape='cell',
         fields=[('layer', 'S'), ('before', 'S'), ('after', 'S'), ('flag', 'S'), ('note', 'S')]),
    dict(id='FlyPoint', keys=['fly_point'], color='#2CE8F5', shape='cell', single=True,
         fields=[('facing', 'E:Facing'), ('visited_flag', 'S'), ('note', 'S')]),
    dict(id='PlayerStart', keys=['player_start'], color='#03CB7C', shape='cell', single=True,
         fields=[('facing', 'E:Facing'), ('when', 'S'), ('note', 'S')]),
]
ENT_BY_KEY = {k: e for e in ENTITIES for k in e['keys']}
ENT_BY_ID = {e['id']: e for e in ENTITIES}


def load_tileset(path=TILESET):
    ts = json.load(open(path))
    names = [t['name'] for t in ts['tiles']]
    assert len(names) == len(set(names)), 'tileset.json: tile names must be unique (the bridge matches tiles by name)'
    return ts


def iid(*parts):
    return str(uuid.uuid5(NS, '/'.join(str(p) for p in parts)))


def dump_kilumen(obj):
    """World Design's map byte format: compact separators, ASCII escapes, no trailing newline."""
    return json.dumps(obj, separators=(',', ':'))


def assert_safe_out(path):
    p = os.path.realpath(path)
    ow = os.path.realpath(OVERWORLD)
    if p == ow or p.startswith(ow + os.sep):
        raise SystemExit(f'refusing to write inside World Design\'s folder: {path} (art/world/overworld is read-only for the bridge)')


# ---------------------------------------------------------------- atlas
def build_atlas(ts, out_dir):
    """One PNG with every tileset entry (sorted by id) at 64px, ATLAS_COLS per row. Returns (relpath, slots, w, h)."""
    from PIL import Image
    tiles = sorted(ts['tiles'], key=lambda t: t['id'])
    T = ts['tile_size']
    rows = (len(tiles) + ATLAS_COLS - 1) // ATLAS_COLS
    atlas = Image.new('RGBA', (ATLAS_COLS * T, rows * T), (0, 0, 0, 0))
    sheets = {}
    for i, t in enumerate(tiles):
        sh = sheets.get(t['sheet']) or sheets.setdefault(t['sheet'], Image.open(os.path.join(OVERWORLD, t['sheet'])).convert('RGBA'))
        tile = sh.crop((t['col'] * T, t['row'] * T, t['col'] * T + T, t['row'] * T + T))
        atlas.paste(tile, ((i % ATLAS_COLS) * T, (i // ATLAS_COLS) * T))
    h = hashlib.sha1('\n'.join(t['name'] for t in tiles).encode() + atlas.tobytes()).hexdigest()[:10]
    rel = f'atlas/kilumen_atlas_{h}.png'   # content-hashed: an older .ldtk keeps pointing at the atlas it was painted with
    os.makedirs(os.path.join(out_dir, 'atlas'), exist_ok=True)
    full = os.path.join(out_dir, rel)
    if not os.path.exists(full):
        atlas.save(full, optimize=True)
    slots = {t['name']: i for i, t in enumerate(tiles)}
    return rel, slots, [t['name'] for t in tiles], [t.get('category', 'misc') for t in tiles], atlas.size


def ident(s):
    s = re.sub(r'[^A-Za-z0-9_]', '_', str(s))
    return s if re.match(r'[A-Za-z_]', s) else 'v_' + s


# ---------------------------------------------------------------- LDtk def builders (key sets follow LDtk 1.5.3 files)
def field_def(uid, key, typ, enums):
    base = dict(identifier=key, doc=None, __type=None, uid=uid, type=None, isArray=False, canBeNull=True, arrayMinLength=None,
                arrayMaxLength=None, editorDisplayMode='Hidden', editorDisplayScale=1, editorDisplayPos='Beneath',
                editorLinkStyle='StraightArrow', editorDisplayColor=None, editorAlwaysShow=False, editorShowInWorld=True,
                editorCutLongValues=True, editorTextSuffix=None, editorTextPrefix=None, useForSmartColor=False, exportToToc=False,
                searchable=False, min=None, max=None, regex=None, acceptFileTypes=None, defaultOverride=None, textLanguageMode=None,
                symmetricalRef=False, autoChainRef=False, allowOutOfLevelRef=True, allowedRefs='OnlySame', allowedRefsEntityUid=None,
                allowedRefTags=[], tilesetUid=None)
    if typ == 'S': base.update(__type='String', type='F_String')
    elif typ == 'T': base.update(__type='Multilines', type='F_Text')
    elif typ == 'I': base.update(__type='Int', type='F_Int')
    elif typ == 'B': base.update(__type='Bool', type='F_Bool', canBeNull=False)
    elif typ == 'P': base.update(__type='Point', type='F_Point', editorDisplayMode='PointStar', editorDisplayPos='Center')
    elif typ.startswith('E:'):
        e = enums[typ[2:]]; base.update(__type='LocalEnum.' + e['identifier'], type=f'F_Enum({e["uid"]})')
    if key == '_json':
        base.update(__type='Multilines', type='F_Text', editorDisplayMode='Hidden', doc='Original Kilumen object (keys not shown as fields). Bridge-owned: leave as is.')
    elif key in ('id', 'to', 'kind', 'table', 'edge', 'item'):
        base.update(editorDisplayMode='ValueOnly', editorDisplayPos='Above', editorAlwaysShow=True)
    # everything else stays Hidden on the canvas (still editable in the entity panel) so the map stays readable
    return base


def field_value(typ, v, fdef):
    """-> LDtk field instance for value v."""
    if v is None:
        rev, val = [], None
    elif typ in ('S', 'T') or typ.startswith('E:'):
        rev, val = [dict(id='V_String', params=[v])], v
    elif typ == 'I':
        rev, val = [dict(id='V_Int', params=[v])], v
    elif typ == 'B':
        rev, val = [dict(id='V_Bool', params=[bool(v)])], bool(v)
    elif typ == 'P':
        rev, val = [dict(id='V_String', params=[f'{v[0]},{v[1]}'])], dict(cx=v[0], cy=v[1])
    return {'__identifier': fdef['identifier'], '__type': fdef['__type'], '__value': val, '__tile': None, 'defUid': fdef['uid'], 'realEditorValues': rev}


def read_field(fi, typ):
    v = fi.get('__value')
    if v is None and fi.get('realEditorValues'):   # LDtk writes both; fall back to the editor values
        r = fi['realEditorValues'][0]
        v = r['params'][0] if r else None
        if typ == 'P' and isinstance(v, str):
            a, b = v.split(','); v = dict(cx=int(a), cy=int(b))
    if typ == 'P':
        return None if v is None else [v['cx'], v['cy']]
    if typ == 'I' and v is not None: return int(v)
    if typ == 'B': return bool(v)
    return v


def layer_def(uid, identifier, typ, tileset_uid=None, int_values=None, doc=None, opacity=1.0, color='#888888'):
    return {'__type': typ, 'identifier': identifier, 'type': typ, 'uid': uid, 'doc': doc, 'uiColor': color, 'gridSize': GRID,
            'guideGridWid': 0, 'guideGridHei': 0, 'displayOpacity': opacity, 'inactiveOpacity': 0.6 if typ != 'IntGrid' else 0.25,
            'hideInList': False, 'hideFieldsWhenInactive': True, 'canSelectWhenInactive': True, 'renderInWorldView': typ != 'IntGrid',
            'pxOffsetX': 0, 'pxOffsetY': 0, 'parallaxFactorX': 0, 'parallaxFactorY': 0, 'parallaxScaling': True, 'requiredTags': [],
            'excludedTags': [], 'autoTilesKilledByOtherLayerUid': None, 'uiFilterTags': [], 'useAsyncRender': False,
            'intGridValues': int_values or [], 'intGridValuesGroups': [], 'autoRuleGroups': [], 'autoSourceLayerDefUid': None,
            'tilesetDefUid': tileset_uid, 'tilePivotX': 0, 'tilePivotY': 0, 'biomeFieldUid': None}


def entity_def(uid, spec, fdefs):
    resizable = spec['shape'] in ('rect', 'edge')
    return {'identifier': spec['id'], 'uid': uid, 'tags': [spec['keys'][0]], 'exportToToc': False, 'allowOutOfBounds': False,
            'doc': 'Kilumen map key(s): ' + ', '.join(spec['keys']), 'width': GRID, 'height': GRID, 'resizableX': resizable,
            'resizableY': resizable, 'minWidth': None, 'maxWidth': None, 'minHeight': None, 'maxHeight': None, 'keepAspectRatio': False,
            'tileOpacity': 1, 'fillOpacity': 0.25 if resizable else 0.55, 'lineOpacity': 1, 'hollow': False, 'color': spec['color'],
            'renderMode': 'Rectangle', 'showName': True, 'tilesetId': None, 'tileRenderMode': 'FitInside', 'tileRect': None,
            'uiTileRect': None, 'nineSliceBorders': [], 'maxCount': 1 if spec.get('single') else 0, 'limitScope': 'PerLevel',
            'limitBehavior': 'MoveLastOne', 'pivotX': 0, 'pivotY': 0, 'fieldDefs': fdefs}


# ---------------------------------------------------------------- export
def gather_enum_values(maps):
    facing, edge = ['up', 'down', 'left', 'right'], ['north', 'south', 'east', 'west']
    lists = {}
    for m in maps.values():
        for k, v in m.items():
            spec = ENT_BY_KEY.get(k)
            if not spec: continue
            for o in (v if isinstance(v, list) else [v]):
                for key, typ in spec['fields']:
                    val = o.get(key)
                    if typ == 'E:Facing' and val is not None and val not in facing: facing.append(val)
                    if typ == 'E:Edge' and val is not None and val not in edge: edge.append(val)
            if len(spec['keys']) > 1: lists.setdefault(spec['id'], spec['keys'])
    return dict(Facing=facing, Edge=edge), lists


def check_type(typ, v):
    if v is None: return True
    if typ in ('S', 'T') or typ.startswith('E:'): return isinstance(v, str)
    if typ == 'I': return isinstance(v, int) and not isinstance(v, bool)
    if typ == 'B': return isinstance(v, bool)
    if typ == 'P': return isinstance(v, list) and len(v) == 2 and all(isinstance(a, int) for a in v)
    return False


def export_project(map_names, out_path, maps_dir=MAPS_DIR, tileset_path=TILESET):
    out_dir = os.path.dirname(os.path.abspath(out_path))
    assert_safe_out(out_dir)
    os.makedirs(out_dir, exist_ok=True)
    ts = load_tileset(tileset_path)
    by_id = {t['id']: t['name'] for t in ts['tiles']}
    raw = {n: open(os.path.join(maps_dir, n + '.json'), 'rb').read() for n in map_names}
    maps = {n: json.loads(raw[n]) for n in map_names}
    rel, slots, slot_names, cats, (aw, ah) = build_atlas(ts, out_dir)
    T = ts['tile_size']; assert T == GRID, f'tileset tile_size {T} != {GRID}'

    uid = [1]
    def nu():
        uid[0] += 1; return uid[0]
    TS_UID = 1
    # enums
    enum_vals, list_enums = gather_enum_values(maps)
    enums, enum_defs = {}, []
    for name, vals in list(enum_vals.items()) + [(f'{eid}List', keys) for eid, keys in list_enums.items()] + [('TileCategory', sorted(set(cats)))]:
        e = dict(identifier=name, uid=nu(), values=[dict(id=ident(v), tileRect=None, color=0x808080) for v in vals],
                 iconTilesetUid=None, externalRelPath=None, externalFileChecksum=None, tags=[])
        enums[name] = e; enum_defs.append(e)
    # tileset (customData = Kilumen tile name per slot; enumTags = tile category for palette filtering)
    cat_enum = enums['TileCategory']
    tileset = {'__cWid': aw // T, '__cHei': ah // T, 'identifier': 'Kilumen_tiles', 'uid': TS_UID, 'relPath': rel, 'embedAtlas': None,
               'pxWid': aw, 'pxHei': ah, 'tileGridSize': T, 'spacing': 0, 'padding': 0, 'tags': [], 'tagsSourceEnumUid': cat_enum['uid'],
               'enumTags': [dict(enumValueId=ident(c), tileIds=[i for i, cc in enumerate(cats) if cc == c]) for c in sorted(set(cats))],
               'customData': [dict(tileId=i, data=n) for i, n in enumerate(slot_names)], 'savedSelections': [], 'cachedPixelData': None}
    # layers: first = drawn on top (LDtk order)
    coll = {v: k for k, v in ts['collision_codes'].items()}
    L = {}
    L['entities'] = layer_def(nu(), 'Entities', 'Entities', color='#0099DB')
    L['collision'] = layer_def(nu(), 'Collision', 'IntGrid', TS_UID, opacity=0.45, color='#E43B44',
                               doc='Kilumen collision codes (empty = walk 0). Values: ' + ', '.join(f'{k}={v}' for k, v in sorted(coll.items())),
                               int_values=[dict(value=c, identifier=ident(coll[c]), color=COLLISION_COLORS.get(c, '#FFFFFF'), tile=None, groupUid=0) for c in sorted(coll) if c])
    L['encounter'] = layer_def(nu(), 'Encounter', 'IntGrid', TS_UID, opacity=0.45, color='#63C74D', doc='Encounter cells: 1 grass, 2 cave (tools/world_data.py)',
                               int_values=[dict(value=c, identifier=n, color=ENCOUNTER_COLORS[c], tile=None, groupUid=0) for c, n in ENCOUNTER_NAMES.items()])
    for lname, doc in (('fog', 'drawn last, above overlay (fog maps only)'), ('overlay', 'canopies, roofs, ysort tops: drawn over characters'),
                       ('decoration', 'props on the ground'), ('ground', 'base terrain')):
        L[lname] = layer_def(nu(), lname.capitalize(), 'Tiles', TS_UID, doc='Kilumen layers.' + lname + ': ' + doc)
    layer_order = ['entities', 'collision', 'encounter', 'fog', 'overlay', 'decoration', 'ground']
    # entities
    edefs, efields = [], {}
    for spec in ENTITIES:
        fds = {}
        for key, typ in spec['fields']:
            fds[key] = (typ, field_def(nu(), key, typ, enums))
        if len(spec['keys']) > 1:
            fds['list'] = ('E:' + spec['id'] + 'List', field_def(nu(), 'list', 'E:' + spec['id'] + 'List', enums))
            fds['list'][1].update(doc='Which Kilumen list this goes to')
        fds['_json'] = ('T', field_def(nu(), '_json', 'T', enums))
        efields[spec['id']] = fds
        edefs.append(entity_def(nu(), spec, [f for _, f in fds.values()]))
    edef_uid = {e['identifier']: e['uid'] for e in edefs}
    # level fields
    lf = {k: field_def(nu(), k, t, enums) for k, t in (('kilumen_name', 'S'), ('title', 'S'), ('kilumen_meta', 'T'), ('source_sha1', 'S'))}
    for k in ('kilumen_name', 'title'): lf[k].update(editorDisplayMode='NameAndValue', editorAlwaysShow=True)
    lf['kilumen_meta']['doc'] = 'Bridge-owned: map keys without an editor view (story gates, ambient, tags, ...), kept verbatim'
    lf['source_sha1']['doc'] = 'sha1 of the World Design map file this level was exported from (import warns when it has changed since)'

    levels, order = [], list(map_names)
    pos, x0 = {}, (maps[order[0]]['width'] + 4) * T     # main map at 0,0; the rest (interiors) shelf-packed to its right
    cx, cy, row_h = x0, 0, 0
    pos[order[0]] = (0, 0)
    for n in order[1:]:
        W, H = maps[n]['width'] * T, maps[n]['height'] * T
        if cx > x0 and cx + W > x0 + 48 * T: cx, cy, row_h = x0, cy + row_h + 3 * T, 0
        pos[n] = (cx, cy); cx += W + 3 * T; row_h = max(row_h, H)
    for li, n in enumerate(order):
        m = maps[n]; W, H = m['width'], m['height']; wx, wy = pos[n]
        level_iid = iid('level', n)
        lis = []
        for lk in layer_order:
            d = L[lk]
            inst = {'__identifier': d['identifier'], '__type': d['type'], '__cWid': W, '__cHei': H, '__gridSize': GRID, '__opacity': 1,
                    '__pxTotalOffsetX': 0, '__pxTotalOffsetY': 0, '__tilesetDefUid': d['tilesetDefUid'], '__tilesetRelPath': rel if d['tilesetDefUid'] else None,
                    'iid': iid('layer', n, lk), 'levelId': None, 'layerDefUid': d['uid'], 'pxOffsetX': 0, 'pxOffsetY': 0, 'visible': True,
                    'optionalRules': [], 'intGridCsv': [], 'autoLayerTiles': [], 'seed': int(hashlib.sha1(f'{n}/{lk}'.encode()).hexdigest()[:6], 16),
                    'overrideTilesetUid': None, 'gridTiles': [], 'entityInstances': []}
            g = m['layers'].get(lk)
            if lk in TILE_LAYERS and g is not None:
                for y, row in enumerate(g):
                    for x, tid in enumerate(row):
                        if not tid: continue
                        if tid not in by_id: raise SystemExit(f'{n}: layers.{lk}[{y}][{x}] tile id {tid} not in tileset.json')
                        s = slots[by_id[tid]]
                        inst['gridTiles'].append({'px': [x * T, y * T], 'src': [(s % ATLAS_COLS) * T, (s // ATLAS_COLS) * T], 'f': 0, 't': s, 'd': [y * W + x], 'a': 1})
            elif lk in INT_LAYERS:
                inst['intGridCsv'] = [v for row in g for v in row] if g is not None else [0] * (W * H)
                valid = {v['value'] for v in d['intGridValues']} | {0}
                bad = set(inst['intGridCsv']) - valid
                if bad: raise SystemExit(f'{n}: layers.{lk} has values {sorted(bad)} with no IntGrid definition')
            elif lk == 'entities':
                for key, val in m.items():
                    spec = ENT_BY_KEY.get(key)
                    if not spec: continue
                    for oi, o in enumerate(val if isinstance(val, list) else [val]):
                        inst['entityInstances'].append(entity_instance(n, key, oi, o, spec, efields[spec['id']], edef_uid[spec['id']], W, H, wx, wy))
            lis.append(inst)
        meta = dict(key_order=list(m.keys()), layer_keys=list(m['layers'].keys()),
                    data={k: v for k, v in m.items() if k not in ENT_BY_KEY and k not in ('layers', 'width', 'height', 'name', 'title')})
        fis = [field_value('S', n, lf['kilumen_name']), field_value('S', m['title'], lf['title']),
               field_value('T', json.dumps(meta, indent=1), lf['kilumen_meta']), field_value('S', hashlib.sha1(raw[n]).hexdigest(), lf['source_sha1'])]
        luid = nu()
        for inst in lis: inst['levelId'] = luid
        levels.append({'identifier': ident(n), 'iid': level_iid, 'uid': luid, 'worldX': wx, 'worldY': wy, 'worldDepth': 0, 'pxWid': W * T, 'pxHei': H * T,
                       '__bgColor': '#1B1B24', 'bgColor': None, 'useAutoIdentifier': False, 'bgRelPath': None, 'bgPos': None, 'bgPivotX': 0.5,
                       'bgPivotY': 0.5, '__smartColor': '#8C8C93', '__bgPos': None, 'externalRelPath': None, 'fieldInstances': fis,
                       'layerInstances': lis, '__neighbours': []})
    proj = {'__header__': {'fileType': 'LDtk Project JSON', 'app': 'LDtk', 'doc': 'https://ldtk.io/json', 'schema': 'https://ldtk.io/files/JSON_SCHEMA.json',
                           'appAuthor': "Sebastien 'deepnight' Benard", 'appVersion': LDTK_VERSION, 'url': 'https://ldtk.io'},
            'iid': iid('project', *order), 'jsonVersion': LDTK_VERSION, 'appBuildId': 473702, 'nextUid': uid[0] + 1, 'identifierStyle': 'Free',
            'toc': [], 'worldLayout': 'Free', 'worldGridWidth': GRID * 16, 'worldGridHeight': GRID * 16, 'defaultLevelWidth': GRID * 20,
            'defaultLevelHeight': GRID * 15, 'defaultPivotX': 0, 'defaultPivotY': 0, 'defaultGridSize': GRID, 'defaultEntityWidth': GRID,
            'defaultEntityHeight': GRID, 'bgColor': '#141522', 'defaultLevelBgColor': '#1B1B24', 'minifyJson': False, 'externalLevels': False,
            'exportTiled': False, 'simplifiedExport': False, 'imageExportMode': 'None', 'exportLevelBg': True, 'pngFilePattern': None,
            'backupOnSave': True, 'backupLimit': 10, 'backupRelPath': None, 'levelNamePattern': '%world_Level_%idx',
            'tutorialDesc': 'Kilumen maps exported by tools/map_bridge (World Design owns the maps: edits go back through '
                            'tools/map_bridge/map_bridge.py import, never straight into art/world/overworld/maps).',
            'customCommands': [], 'flags': ['UseMultilinesType'],
            'defs': {'layers': [L[k] for k in layer_order], 'entities': edefs, 'tilesets': [tileset], 'enums': enum_defs, 'externalEnums': [],
                     'levelFields': list(lf.values())},
            'levels': levels, 'worlds': [], 'dummyWorldIid': iid('world', *order)}
    with open(out_path, 'w') as f:
        json.dump(proj, f, indent=1)
    return proj


def entity_instance(n, key, oi, o, spec, fds, def_uid, W, H, lwx, lwy):
    T = GRID
    if spec['shape'] == 'rect':
        x, y, w, h = o['x0'], o['y0'], o['x1'] - o['x0'] + 1, o['y1'] - o['y0'] + 1    # x1/y1 inclusive (src/overworld/debug.js)
    elif spec['shape'] == 'edge':
        a, b = o['start'], o['end']
        x, y, w, h = {'north': (a, 0, b - a + 1, 1), 'south': (a, H - 1, b - a + 1, 1),
                      'west': (0, a, 1, b - a + 1), 'east': (W - 1, a, 1, b - a + 1)}[o['edge']]
    else:
        x, y, w, h = o['x'], o['y'], 1, 1
    fis = []
    for fk, (typ, fdef) in fds.items():
        if fk == '_json': v = json.dumps(o, indent=1)
        elif fk == 'list': v = key
        else:
            v = o.get(fk)
            if not check_type(typ, v):
                raise SystemExit(f'{n}.{key}[{oi}].{fk}={v!r} is not a {typ}: update ENTITIES in kilumen_ldtk.py')
        fis.append(field_value(typ, v, fdef))
    return {'__identifier': spec['id'], '__grid': [x, y], '__pivot': [0, 0], '__tags': [spec['keys'][0]], '__tile': None,
            '__smartColor': spec['color'], 'iid': iid('ent', n, key, oi), 'width': w * T, 'height': h * T, 'defUid': def_uid,
            'px': [x * T, y * T], 'fieldInstances': fis, '__worldX': lwx + x * T, '__worldY': lwy + y * T}


# ---------------------------------------------------------------- import
class ImportError_(Exception):
    pass


def import_project(ldtk_path, tileset_path=TILESET):
    """-> (maps {name: kilumen map dict}, warnings [str]). Raises ImportError_ on hard errors."""
    proj = json.load(open(ldtk_path))
    ts = load_tileset(tileset_path)
    name_to_id = {t['name']: t['id'] for t in ts['tiles']}
    errors, warns = [], []
    tsdefs = {t['uid']: t for t in proj['defs']['tilesets']}
    slot_name = {u: {c['tileId']: c['data'] for c in t.get('customData', [])} for u, t in tsdefs.items()}
    ldefs = {d['uid']: d for d in proj['defs']['layers']}
    edefs = {d['uid']: d for d in proj['defs']['entities']}
    lfdefs = {d['uid']: d for d in proj['defs']['levelFields']}
    out = {}
    for lv in proj['levels']:
        lfs = {lfdefs[f['defUid']]['identifier']: f for f in lv['fieldInstances'] if f['defUid'] in lfdefs}
        name = read_field(lfs['kilumen_name'], 'S') if 'kilumen_name' in lfs else lv['identifier']
        meta = json.loads(read_field(lfs['kilumen_meta'], 'T')) if 'kilumen_meta' in lfs and read_field(lfs['kilumen_meta'], 'T') else dict(key_order=[], layer_keys=[], data={})
        title = read_field(lfs['title'], 'S') if 'title' in lfs else name
        W, H = lv['pxWid'] // GRID, lv['pxHei'] // GRID
        if lv['pxWid'] % GRID or lv['pxHei'] % GRID: errors.append(f'{name}: level size {lv["pxWid"]}x{lv["pxHei"]} is not a multiple of {GRID}')
        layers, ents = {}, {}
        for inst in lv['layerInstances'] or []:
            d = ldefs[inst['layerDefUid']]; lk = d['identifier'].lower()
            if inst['__gridSize'] != GRID: errors.append(f'{name}: layer {d["identifier"]} grid {inst["__gridSize"]} != {GRID}')
            if d['type'] == 'Tiles':
                g = [[0] * W for _ in range(H)]; painted = False
                tsu = inst.get('overrideTilesetUid') or d['tilesetDefUid']
                for t in inst['gridTiles']:
                    cx, cy = t['px'][0] // GRID, t['px'][1] // GRID
                    if t['px'][0] % GRID or t['px'][1] % GRID: errors.append(f'{name}.{lk}: tile at px {t["px"]} is off the {GRID}px grid'); continue
                    if not (0 <= cx < W and 0 <= cy < H): errors.append(f'{name}.{lk}: tile outside the level at {cx},{cy}'); continue
                    if t.get('f'): warns.append(f'{name}.{lk} {cx},{cy}: flipped tile (f={t["f"]}) - Kilumen has no flips; flip ignored')
                    if t.get('a', 1) != 1: warns.append(f'{name}.{lk} {cx},{cy}: tile alpha {t["a"]} ignored')
                    nm = slot_name.get(tsu, {}).get(t['t'])
                    if nm is None: errors.append(f'{name}.{lk} {cx},{cy}: atlas slot {t["t"]} has no Kilumen tile name'); continue
                    if nm not in name_to_id: errors.append(f'{name}.{lk} {cx},{cy}: tile "{nm}" is not in the current tileset.json (renamed or removed?)'); continue
                    if g[cy][cx]: warns.append(f'{name}.{lk} {cx},{cy}: stacked tiles in one cell - the last one wins')
                    g[cy][cx] = name_to_id[nm]; painted = True
                if lk in meta['layer_keys'] or painted: layers[lk] = g
            elif d['type'] == 'IntGrid':
                csv = inst['intGridCsv']
                if len(csv) != W * H: errors.append(f'{name}.{lk}: intGridCsv has {len(csv)} cells, expected {W * H}'); continue
                layers[lk] = [csv[y * W:(y + 1) * W] for y in range(H)]
            elif d['type'] == 'Entities':
                for e in inst['entityInstances']:
                    ed = edefs[e['defUid']]; spec = ENT_BY_ID.get(ed['identifier'])
                    if not spec: warns.append(f'{name}: entity type {ed["identifier"]} unknown to the bridge - skipped'); continue
                    key, obj = entity_to_obj(name, e, ed, spec, W, H, errors)
                    if obj is not None: ents.setdefault(key, []).append(obj)
        # rebuild the map in the original key order
        m = {}
        order = list(meta['key_order']) or ['name', 'title', 'width', 'height', 'tile_size', 'tileset', 'layers']
        for k in ents:
            if k not in order: order.append(k)
        for k in order:
            if k == 'name': m[k] = name
            elif k == 'title': m[k] = title
            elif k == 'width': m[k] = W
            elif k == 'height': m[k] = H
            elif k == 'layers':
                lk_order = [k2 for k2 in meta['layer_keys'] if k2 in layers] + [k2 for k2 in ('ground', 'decoration', 'overlay', 'collision', 'encounter', 'fog') if k2 in layers and k2 not in meta['layer_keys']]
                m[k] = {k2: layers[k2] for k2 in lk_order}
            elif k in ENT_BY_KEY:
                spec = ENT_BY_KEY[k]
                if spec.get('single'):
                    got = ents.get(k, [])
                    if len(got) > 1: errors.append(f'{name}: more than one {spec["id"]}')
                    if got: m[k] = got[0]
                    else: warns.append(f'{name}: {k} removed in the editor')
                else:
                    m[k] = ents.get(k, [])
            elif k in meta['data']:
                m[k] = meta['data'][k]
            elif k == 'tile_size': m[k] = GRID
            elif k == 'tileset': m[k] = '../tileset.json'
        lint(name, m, warns, errors)
        out[name] = m
        if 'source_sha1' in lfs:
            src = os.path.join(MAPS_DIR, name + '.json')
            if os.path.exists(src) and hashlib.sha1(open(src, 'rb').read()).hexdigest() != read_field(lfs['source_sha1'], 'S'):
                warns.append(f'{name}: World Design\'s maps/{name}.json changed since this file was exported - review `map_bridge.py diff` before folding edits in')
    if errors:
        raise ImportError_('\n'.join(errors))
    return out, warns


def entity_to_obj(name, e, ed, spec, W, H, errors):
    fdefs = {f['uid']: f for f in ed['fieldDefs']}
    vals = {}
    types = dict(spec['fields']); types['_json'] = 'T'; types['list'] = 'S'
    for fi in e['fieldInstances']:
        fd = fdefs.get(fi['defUid'])
        if fd and fd['identifier'] in types: vals[fd['identifier']] = read_field(fi, types[fd['identifier']])
    base = json.loads(vals['_json']) if vals.get('_json') else None
    obj = dict(base) if base else {}
    key = vals.get('list') or spec['keys'][0]
    if key not in spec['keys']: errors.append(f'{name}: {spec["id"]} list "{key}" unknown'); return key, None
    x, y = e['px'][0] // GRID, e['px'][1] // GRID
    w, h = max(1, e['width'] // GRID), max(1, e['height'] // GRID)
    if e['px'][0] % GRID or e['px'][1] % GRID: errors.append(f'{name}: {spec["id"]} at px {e["px"]} is off the {GRID}px grid')
    if not (0 <= x < W and 0 <= y < H and x + w <= W and y + h <= H): errors.append(f'{name}: {spec["id"]} {vals.get("id", "")} at {x},{y} ({w}x{h}) is outside the {W}x{H} map')
    if spec['shape'] == 'rect':
        pos = dict(x0=x, y0=y, x1=x + w - 1, y1=y + h - 1)
    elif spec['shape'] == 'edge':
        edge = vals.get('edge') or obj.get('edge') or ('north' if y == 0 else 'south' if y + h == H else 'west' if x == 0 else 'east')
        on = {'north': y == 0, 'south': y + h == H, 'west': x == 0, 'east': x + w == W}[edge]
        if not on: errors.append(f'{name}: Exit to {vals.get("to")} has edge={edge} but is not on that edge')
        pos = dict(edge=edge, start=x if edge in ('north', 'south') else y, end=(x + w - 1) if edge in ('north', 'south') else (y + h - 1))
    else:
        pos = dict(x=x, y=y)
    # typed fields win over _json; new objects get a canonical key order (position first, as in World Design's files)
    canon = (['id'] if 'id' in types else []) + list(pos) + [k for k, _ in spec['fields'] if k != 'id']
    if not base:
        obj = {k: None for k in canon if k in pos or vals.get(k) is not None}
    obj.update(pos)
    for k, typ in spec['fields']:
        if k == 'edge': continue
        v = vals.get(k)
        if v is None and (typ in ('S', 'T')) and isinstance(obj.get(k), str): v = ''   # LDtk clears a text field to null
        if v is None and k not in obj: continue
        obj[k] = v
    return key, obj


REQUIRED_KEYS = {'warps': ('to', 'tx', 'ty'), 'locked_warps': ('to', 'tx', 'ty'), 'exits': ('to',),
                 'npcs': ('id',), 'npcs_pending_text': ('id',), 'signs': ('id',), 'signs_pending_text': ('id',),
                 'items': ('id', 'item'), 'interact_spots': ('id',), 'encounter_zones': ('table',)}


def lint(name, m, warns, errors):
    # ids must be unique within a list (a sign and its interact spot legitimately share one, e.g. brookhollow sign_bh_north)
    for k in ('npcs', 'npcs_pending_text', 'signs', 'signs_pending_text', 'items', 'interact_spots'):
        seen = set()
        for o in m.get(k, []) or []:
            if 'id' in o:
                if o['id'] in seen: errors.append(f'{name}: duplicate id "{o["id"]}" in {k}')
                seen.add(o['id'])
    # keys the game needs; an entity freshly placed in LDtk starts with empty fields (seen in a real LDtk 1.5.3 save, 2026-10-22)
    for k, need in REQUIRED_KEYS.items():
        for o in m.get(k) or []:
            miss = [r for r in need if o.get(r) in (None, '') and not (r in ('tx', 'ty') and o.get('to') == '$return')]  # $return warps: tx/ty null
            if miss: errors.append(f'{name}: {k} entry at {o.get("x", o.get("x0", "?"))},{o.get("y", o.get("y0", "?"))} is missing {", ".join(miss)} (fill the field in LDtk)')
    if errors: return
    col = m['layers'].get('collision')
    for w in m.get('warps', []):
        if col and 0 <= w['y'] < len(col) and 0 <= w['x'] < len(col[0]) and col[w['y']][w['x']] not in (0, 4):
            warns.append(f'{name}: warp to {w["to"]} at {w["x"]},{w["y"]} sits on collision code {col[w["y"]][w["x"]]}')
        if w['to'] != '$return' and not os.path.exists(os.path.join(MAPS_DIR, w['to'] + '.json')):
            warns.append(f'{name}: warp target map "{w["to"]}" does not exist (yet) in maps/')


# ---------------------------------------------------------------- diff (for World Design: what changed vs their current map)
def diff_maps(old, new, ts):
    id_name = {t['id']: t['name'] for t in ts['tiles']}
    lines = []
    for k in ('width', 'height', 'title'):
        if old.get(k) != new.get(k): lines.append(f'{k}: {old.get(k)!r} -> {new.get(k)!r}')
    for lk in sorted(set(old['layers']) | set(new['layers'])):
        a, b = old['layers'].get(lk), new['layers'].get(lk)
        if a == b: continue
        if a is None or b is None: lines.append(f'layers.{lk}: {"added" if a is None else "removed"}'); continue
        ch = []
        for y in range(max(len(a), len(b))):
            for x in range(max(len(a[0]) if a else 0, len(b[0]) if b else 0)):
                va = a[y][x] if y < len(a) and x < len(a[y]) else None
                vb = b[y][x] if y < len(b) and x < len(b[y]) else None
                if va != vb:
                    f = (lambda v: id_name.get(v, v) if v else '-') if lk in TILE_LAYERS else (lambda v: v)
                    ch.append(f'({x},{y}) {f(va)} -> {f(vb)}')
        lines.append(f'layers.{lk}: {len(ch)} cell(s) changed')
        lines += ['  ' + c for c in ch[:400]] + (['  ...'] if len(ch) > 400 else [])
    for k in sorted(set(old) | set(new)):
        if k in ('layers', 'width', 'height', 'title') or old.get(k) == new.get(k): continue
        a, b = old.get(k), new.get(k)
        if isinstance(a, list) and isinstance(b, list):
            key = lambda o: o.get('id') or json.dumps({kk: vv for kk, vv in o.items() if kk not in ('x', 'y', 'x0', 'y0', 'x1', 'y1', 'start', 'end')}, sort_keys=True)
            A, B = {key(o): o for o in a}, {key(o): o for o in b}
            for kk in A.keys() - B.keys(): lines.append(f'{k}: removed {json.dumps(A[kk])}')
            for kk in B.keys() - A.keys(): lines.append(f'{k}: added {json.dumps(B[kk])}')
            for kk in A.keys() & B.keys():
                if A[kk] != B[kk]:
                    d = {f: (A[kk].get(f), B[kk].get(f)) for f in set(A[kk]) | set(B[kk]) if A[kk].get(f) != B[kk].get(f)}
                    lines.append(f'{k}: {kk[:60]} changed ' + ', '.join(f'{f}: {va!r} -> {vb!r}' for f, (va, vb) in sorted(d.items())))
            if not (A.keys() ^ B.keys()) and all(A[x] == B[x] for x in A) and a != b: lines.append(f'{k}: order changed only')
        else:
            lines.append(f'{k}: {json.dumps(a)[:200]} -> {json.dumps(b)[:200]}')
    return lines


# ---------------------------------------------------------------- renders (PIL), used for the side-by-side proof
def render_kilumen(m, ts, layers=TILE_LAYERS):
    from PIL import Image
    T = ts['tile_size']; by_id = {t['id']: t for t in ts['tiles']}; sheets = {}
    img = Image.new('RGBA', (m['width'] * T, m['height'] * T), (27, 27, 36, 255))
    for lk in layers:
        g = m['layers'].get(lk)
        if not g: continue
        for y, row in enumerate(g):
            for x, tid in enumerate(row):
                if not tid: continue
                t = by_id[tid]
                sh = sheets.get(t['sheet']) or sheets.setdefault(t['sheet'], Image.open(os.path.join(OVERWORLD, t['sheet'])).convert('RGBA'))
                tile = sh.crop((t['col'] * T, t['row'] * T, t['col'] * T + T, t['row'] * T + T))
                img.alpha_composite(tile, (x * T, y * T))
    return img


def render_ldtk_level(proj, ldtk_dir, level_identifier):
    """Draw a level the way LDtk does: tile layers bottom-up (last layer in the list is the bottom one), from the atlas."""
    from PIL import Image
    lv = next(l for l in proj['levels'] if l['identifier'] == level_identifier)
    ts = {t['uid']: t for t in proj['defs']['tilesets']}; atl = {}
    img = Image.new('RGBA', (lv['pxWid'], lv['pxHei']), (27, 27, 36, 255))
    for inst in reversed(lv['layerInstances']):
        if inst['__type'] != 'Tiles' or not inst['visible']: continue
        u = inst.get('overrideTilesetUid') or inst['__tilesetDefUid']; t = ts[u]
        a = atl.get(u) or atl.setdefault(u, Image.open(os.path.join(ldtk_dir, t['relPath'])).convert('RGBA'))
        G = t['tileGridSize']
        for gt in inst['gridTiles']:
            img.alpha_composite(a.crop((gt['src'][0], gt['src'][1], gt['src'][0] + G, gt['src'][1] + G)), tuple(gt['px']))
    return img


def annotate_entities(img, m, scale=1.0):
    """Outline entities on a render (Kilumen map dict) so reviewers see where warps/NPCs/zones landed."""
    from PIL import ImageDraw
    d = ImageDraw.Draw(img); T = GRID * scale
    for k, v in m.items():
        spec = ENT_BY_KEY.get(k)
        if not spec: continue
        for o in (v if isinstance(v, list) else [v]):
            if spec['shape'] == 'rect': box = (o['x0'] * T, o['y0'] * T, (o['x1'] + 1) * T - 1, (o['y1'] + 1) * T - 1)
            elif spec['shape'] == 'edge':
                W, H = m['width'], m['height']; a, b = o['start'], o['end']
                x, y, w, h = {'north': (a, 0, b - a + 1, 1), 'south': (a, H - 1, b - a + 1, 1), 'west': (0, a, 1, b - a + 1), 'east': (W - 1, a, 1, b - a + 1)}[o['edge']]
                box = (x * T, y * T, (x + w) * T - 1, (y + h) * T - 1)
            else: box = (o['x'] * T + 3, o['y'] * T + 3, (o['x'] + 1) * T - 4, (o['y'] + 1) * T - 4)
            d.rectangle(box, outline=spec['color'], width=max(2, int(4 * scale)))
            d.text((box[0] + 4, box[1] + 2), spec['id'][:6], fill=spec['color'])
    return img
