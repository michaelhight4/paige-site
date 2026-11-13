#!/usr/bin/env python3
"""Kilumen <-> LDtk map bridge (CLI). Run from the kilumen repo root. See tools/map_bridge/README.md.

  export    maps -> build/map_editor/<project>.ldtk (+ atlas/)          python3 tools/map_bridge/map_bridge.py export brookhollow --with-interiors
  import    .ldtk -> build/maps_from_editor/<map>.json (never maps/)    python3 tools/map_bridge/map_bridge.py import build/map_editor/brookhollow.ldtk
  diff      imported map vs World Design's current map                   python3 tools/map_bridge/map_bridge.py diff build/maps_from_editor/brookhollow.json
  roundtrip export -> import, byte-compare with maps/<name>.json          python3 tools/map_bridge/map_bridge.py roundtrip --all
  render    PNG side-by-side: original | LDtk file (atlas) | imported    python3 tools/map_bridge/map_bridge.py render brookhollow
  validate  check a .ldtk against LDtk's JSON schema (vendor_staging)    python3 tools/map_bridge/map_bridge.py validate build/map_editor/brookhollow.ldtk
Only reads art/world/overworld/ (World Design's folder); every write goes under build/ or shots/.
"""
import argparse, hashlib, json, os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kilumen_ldtk as K

BUILD = os.path.join(K.REPO, 'build')
DEF_PROJECT_DIR = os.path.join(BUILD, 'map_editor')
DEF_IMPORT_DIR = os.path.join(BUILD, 'maps_from_editor')
SCHEMA = os.path.join(K.REPO, 'vendor_staging', 'ldtk', 'JSON_SCHEMA_v1.5.3.json')


def all_maps(maps_dir=K.MAPS_DIR):
    return sorted(f[:-5] for f in os.listdir(maps_dir) if f.endswith('.json'))


def with_interiors(names, maps_dir=K.MAPS_DIR):
    out = list(names)   # follows warps transitively (town -> house_1f -> house_2f); edge exits (routes) are not followed
    for n in out:
        m = json.load(open(os.path.join(maps_dir, n + '.json')))
        for w in m.get('warps', []) + m.get('locked_warps', []):
            if w['to'] not in out and os.path.exists(os.path.join(maps_dir, w['to'] + '.json')):
                out.append(w['to'])
    return out


def write_maps(maps, out_dir):
    K.assert_safe_out(out_dir)
    os.makedirs(out_dir, exist_ok=True)
    paths = []
    for n, m in maps.items():
        p = os.path.join(out_dir, n + '.json')
        with open(p, 'w') as f: f.write(K.dump_kilumen(m))
        paths.append(p)
    return paths


def cmd_export(a):
    names = all_maps() if a.all else a.maps
    if not names: sys.exit('export: name at least one map (or --all)')
    if a.with_interiors: names = with_interiors(names)
    out = a.out or os.path.join(DEF_PROJECT_DIR, (names[0] if not a.all else 'kilumen_all') + '.ldtk')
    proj = K.export_project(names, out)
    print(f'wrote {os.path.relpath(out, K.REPO)}  ({len(proj["levels"])} level(s): {", ".join(names)})')
    print(f'atlas {proj["defs"]["tilesets"][0]["relPath"]}  ({len(proj["defs"]["tilesets"][0]["customData"])} named tiles)')


def cmd_import(a):
    try:
        maps, warns = K.import_project(a.ldtk)
    except K.ImportError_ as e:
        print('IMPORT FAILED (nothing written):\n' + str(e), file=sys.stderr); sys.exit(2)
    for w in warns: print('warning:', w)
    if a.only: maps = {k: v for k, v in maps.items() if k in a.only}
    for p in write_maps(maps, a.out or DEF_IMPORT_DIR): print('wrote', os.path.relpath(p, K.REPO))


def cmd_diff(a):
    ts = K.load_tileset()
    new = json.load(open(a.imported)); name = new['name']
    old = json.load(open(os.path.join(K.MAPS_DIR, name + '.json')))
    lines = K.diff_maps(old, new, ts)
    print(f'{name}: {"no changes vs maps/" + name + ".json" if not lines else str(len(lines)) + " change line(s) vs maps/" + name + ".json"}')
    for l in lines: print('  ' + l)


def roundtrip(names, tmp):
    """export names -> import -> compare bytes with World Design's files. Returns list of (name, ok, detail)."""
    proj_path = os.path.join(tmp, 'rt.ldtk')
    K.export_project(names, proj_path)
    maps, warns = K.import_project(proj_path)
    res = []
    for n in names:
        orig = open(os.path.join(K.MAPS_DIR, n + '.json'), 'rb').read()
        got = K.dump_kilumen(maps[n]).encode()
        sem = json.loads(orig) == maps[n]
        res.append((n, got == orig, 'byte-identical' if got == orig else ('semantic match, bytes differ' if sem else 'DIFFERENT')))
    return res, proj_path


def cmd_roundtrip(a):
    names = all_maps() if a.all else (with_interiors(a.maps) if a.with_interiors else a.maps)
    tmp = tempfile.mkdtemp(prefix='kil_map_bridge_rt_')
    res, _ = roundtrip(names, tmp)
    bad = [r for r in res if not r[1]]
    for n, ok, d in res: print(f'{"OK  " if ok else "FAIL"} {n}: {d}')
    print(f'round-trip: {len(res) - len(bad)}/{len(res)} byte-identical  (scratch {tmp})')
    sys.exit(1 if bad else 0)


def cmd_render(a):
    from PIL import Image, ImageDraw, ImageChops
    ts = K.load_tileset()
    n = a.map
    tmp = tempfile.mkdtemp(prefix='kil_map_bridge_render_')
    proj_path = os.path.join(tmp, n + '.ldtk')
    proj = K.export_project([n], proj_path)
    maps, _ = K.import_project(proj_path)
    orig = json.load(open(os.path.join(K.MAPS_DIR, n + '.json')))
    if a.imported: maps[n] = json.load(open(a.imported))
    A = K.render_kilumen(orig, ts)
    B = K.render_ldtk_level(proj, tmp, K.ident(n))
    C = K.render_kilumen(maps[n], ts)
    diff_ab = ImageChops.difference(A, B).getbbox(); diff_ac = ImageChops.difference(A, C).getbbox()
    s = a.scale
    panels = [(A, 'ORIGINAL  art/world/overworld/maps/' + n + '.json'), (B, 'LDtk FILE  (atlas tiles, as the editor draws it)'),
              (C, 'IMPORTED  build/maps_from_editor/' + n + '.json' if a.imported else 'IMPORTED BACK  (export->import, in memory)')]
    panels = [(K.annotate_entities(p.resize((int(p.width * s), int(p.height * s)), Image.NEAREST), orig if i < 2 else maps[n], s) if a.entities else p.resize((int(p.width * s), int(p.height * s)), Image.NEAREST), t) for i, (p, t) in enumerate(panels)]
    pw, ph = panels[0][0].size
    sheet = Image.new('RGBA', (pw * 3 + 40, ph + 70), (16, 16, 22, 255)); d = ImageDraw.Draw(sheet)
    for i, (p, t) in enumerate(panels):
        sheet.paste(p, (10 + i * (pw + 10), 40)); d.text((10 + i * (pw + 10), 14), t, fill=(235, 235, 235))
    d.text((10, ph + 48), f'pixel diff original vs LDtk file: {"none (identical)" if diff_ab is None else diff_ab}   |   original vs imported: {"none (identical)" if diff_ac is None else diff_ac}', fill=(120, 230, 120) if not (diff_ab or diff_ac) else (255, 120, 120))
    out = a.out or os.path.join(K.REPO, 'shots', 'map_editor', f'{n}_side_by_side.png')
    K.assert_safe_out(os.path.dirname(out)); os.makedirs(os.path.dirname(out), exist_ok=True)
    sheet.convert('RGB').save(out)
    fmt = lambda b: 'pixel-identical' if b is None else f'differs in box {b}'
    print('wrote', os.path.relpath(out, K.REPO), '| original vs LDtk:', fmt(diff_ab), '| original vs imported:', fmt(diff_ac))


def cmd_validate(a):
    import jsonschema
    schema = json.load(open(SCHEMA))
    proj = json.load(open(a.ldtk))
    v = jsonschema.Draft7Validator(schema)
    errs = sorted(v.iter_errors(proj), key=lambda e: list(e.path))
    for e in errs[:30]: print('schema:', '/'.join(map(str, e.path)), '-', e.message[:200])
    print(f'{a.ldtk}: {"valid against LDtk " + K.LDTK_VERSION + " JSON schema" if not errs else str(len(errs)) + " schema error(s)"}')
    sys.exit(1 if errs else 0)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    p = sp.add_parser('export'); p.add_argument('maps', nargs='*'); p.add_argument('--all', action='store_true')
    p.add_argument('--with-interiors', action='store_true', help='also export every map the warps lead to'); p.add_argument('--out'); p.set_defaults(f=cmd_export)
    p = sp.add_parser('import'); p.add_argument('ldtk'); p.add_argument('--out'); p.add_argument('--only', nargs='*'); p.set_defaults(f=cmd_import)
    p = sp.add_parser('diff'); p.add_argument('imported'); p.set_defaults(f=cmd_diff)
    p = sp.add_parser('roundtrip'); p.add_argument('maps', nargs='*'); p.add_argument('--all', action='store_true'); p.add_argument('--with-interiors', action='store_true'); p.set_defaults(f=cmd_roundtrip)
    p = sp.add_parser('render'); p.add_argument('map'); p.add_argument('--imported'); p.add_argument('--out'); p.add_argument('--scale', type=float, default=0.5)
    p.add_argument('--entities', action='store_true'); p.set_defaults(f=cmd_render)
    p = sp.add_parser('validate'); p.add_argument('ldtk'); p.set_defaults(f=cmd_validate)
    a = ap.parse_args(); a.f(a)


if __name__ == '__main__':
    main()
