#!/usr/bin/env python3
"""Kilumen interiors kit generator (tileset + interior maps + previews + checks).
Usage: python3 tools/interiors_new.py [tiles|maps|previews|check|all]
Writes only into interiors_new/. Imports tools/pixel.py read-only. Code lives in interiors_new/gen/."""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'interiors_new', 'gen'))
sys.dont_write_bytecode = True

def main(argv):
    what = argv[1] if len(argv) > 1 else 'all'
    import ix_tileset_build as tileset_build
    if what in ('tiles', 'all'):
        tiles, sheets, multi = tileset_build.build()
        rep = tileset_build.seam_check(tiles, sheets)
        json.dump(rep, open(os.path.join(tileset_build.OUT, 'seam_report.json'), 'w'), indent=1)
        print('tiles', len(tiles), 'ids %d-%d' % (tiles[0]['id'], tiles[-1]['id']))
        bad = {k: v for k, v in rep.items() if not v['seam_free']}
        print('floor families', len(rep), 'seams', bad)
    if what in ('maps', 'all'):
        import ix_build_maps as build_maps; build_maps.main()
    if what in ('previews', 'all'):
        import ix_render as render; render.main()
    if what in ('check', 'all'):
        import ix_checks as checks; ok = checks.main()
        if what == 'all' or ok:
            import ix_doc; ix_doc.main()
        if not ok: sys.exit(1)
    if what == 'doc':
        import ix_doc; ix_doc.main()

if __name__ == '__main__':
    main(sys.argv)
