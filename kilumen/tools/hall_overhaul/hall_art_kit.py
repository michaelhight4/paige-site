"""Wire Character models' hall art (Oct 29 2026, DRAFT pending Gary) per kilumen_r56_creatures/hall_overhaul/REPOINT.md.
- 13 trainer sheets -> art/characters/pixel/npcs/tr_<hall>_hall_int_hN/, npc_sprite_map repointed off the Fernwick stand-ins.
- push tiles (4 dirs) + warp pads 1-4 on 4 floors -> tiles_{1,2,3}x/hall_art.png + tileset_hallart.json (ids 9981+, walk),
  hall maps' push/warp ground cells repointed to them; the stand-in anim cells on those squares are dropped.
- Text Bot's names/lines for the 13 (_meta.pending_hall_trainers in the main repo text file) replace the placeholders.
Idempotent.  python3 tools/hall_overhaul/hall_art_kit.py <kilumen> <art_dir> <main_text_json>"""
import json, os, re, shutil, sys, glob
from PIL import Image
root, art, pend_path = sys.argv[1:4]; os.chdir(root)
OW = 'art/world/overworld'; NP = 'art/characters/pixel/npcs'
L = lambda p: json.load(open(p))
def dump(p, d):
    raw = open(p).read(); ind = 2 if raw.startswith('{\n  "') else (1 if raw.startswith('{\n') else None)
    open(p, 'w').write(json.dumps(d, indent=ind, ensure_ascii=False, separators=None if ind else (',', ':')) + ('\n' if raw.endswith('\n') else ''))
rep = open(f'{art}/REPOINT.md').read()
ids = re.findall(r'^\| (\w+_hall_int_h\d+) \| \w+ \| trainers/(tr_\w+) \|', rep, re.M); assert len(ids) == 13, ids
# 1) trainers
smap = L(f'{NP}/npc_sprite_map.json')
for nid, d in ids:
    shutil.copytree(f'{art}/trainers/{d}', f'{NP}/{d}', dirs_exist_ok=True)
    hm = nid.rsplit('_h', 1)[0]; k = f'{hm}.{nid}'; e = smap['map'][k]
    e.update({'sprite_id': d, 'overworld_sheet': f'npcs/{d}/overworld/{d}_chibi_sheet.png', 'overworld_sheet_2x': f'npcs/{d}/overworld/{d}_chibi_sheet_2x.png',
              'overworld_sheet_3x': f'npcs/{d}/overworld/{d}_chibi_sheet_3x.png', 'overworld_frames_dir': f'npcs/{d}/overworld/{d}_chibi/',
              'trainer_64x128': f'npcs/{d}/trainer/{d}_trainer_64x128.png', 'portraits_stand_in': True,
              'note': 'hall art (Character models, Oct 29 2026, DRAFT pending Gary); portraits still the Fernwick stand-in'})
    for p in [e['overworld_sheet'], e['trainer_64x128']]: assert os.path.exists(f'{NP}/../{p}'.replace('npcs/../npcs', 'npcs')) or os.path.exists(f'art/characters/pixel/{p}'), p
dump(f'{NP}/npc_sprite_map.json', smap)
# 2) floor tiles
FLOORS = ['floor_stone', 'floor_tile', 'floor_wood', 'x_icehall_floor']; DIRS = ['up', 'down', 'left', 'right']
names = [f'ha_push_{d}__{f}' for f in FLOORS for d in DIRS] + [f'ha_warp_pad_{n}__{f}' for f in FLOORS for n in '1234']
for z in (1, 2, 3):
    s = 64 * z; sheet = Image.new('RGBA', (16 * s, ((len(names) + 15) // 16) * s), (0, 0, 0, 0))
    for i, n in enumerate(names):
        im = Image.open(f'{art}/floor_tiles/64px/{n}.png').convert('RGBA'); assert im.size == (64, 64), n
        sheet.paste(im.resize((s, s), Image.NEAREST), ((i % 16) * s, (i // 16) * s))
    sheet.save(f'{OW}/tiles_{z}x/hall_art.png', optimize=True)
tiles = [{'id': 9981 + i, 'name': n, 'category': 'hall_art', 'sheet': 'tiles_1x/hall_art.png', 'index': i, 'col': i % 16, 'row': i // 16,
          'walkable': True, 'collision': 'walk', 'collision_code': 0, 'encounter': False, 'interior': True} for i, n in enumerate(names)]
json.dump({'note': 'Hall push tiles + warp pads (Character models, Oct 29 2026, DRAFT pending Gary). Always loaded (src/progression/hall_anim.js withHallArt). '
           'Built by tools/hall_overhaul/hall_art_kit.py from kilumen_r56_creatures/hall_overhaul/floor_tiles/64px.', 'tiles': tiles}, open(f'{OW}/tileset_hallart.json', 'w'), indent=1)
byname = {t['name']: t['id'] for t in tiles}
alltiles = {t['id']: t['name'] for f in ['tileset.json', 'tileset_ix2.json'] for t in L(f'{OW}/{f}')['tiles']}
PUSH = {'^': 'up', 'v': 'down', '<': 'left', '>': 'right'}
for f in sorted(glob.glob(f'{OW}/maps/*_hall_int.json')):
    m = L(f); h = m.get('hall_v2'); n = 0
    if not h: continue
    from collections import Counter
    fl = Counter(alltiles.get(m['layers']['ground'][y][x]) for y, r in enumerate(h['grid']) for x, c in enumerate(r) if c == '.')
    base = next(b for b, _ in fl.most_common() if b in FLOORS)
    pairs = sorted(h.get('warps', {}), key=int); slot = {p: str(i % 4 + 1) for i, p in enumerate(pairs)}
    cells = set()
    for y, r in enumerate(h['grid']):
        for x, c in enumerate(r):
            nm = f'ha_push_{PUSH[c]}__{base}' if c in PUSH else (f'ha_warp_pad_{slot[c]}__{base}' if c in slot else None)
            if nm: m['layers']['ground'][y][x] = byname[nm]; m['layers']['collision'][y][x] = 0; cells.add((x, y)); n += 1
    if n:
        if 'anim' in h: h['anim']['cells'] = [a for a in h['anim']['cells'] if not ((a[0], a[1]) in cells and a[3] == 'ground')]
        h['stand_in_art'] = [s for s in h.get('stand_in_art', []) if not s.startswith(('push', 'warp'))]
        h['hall_art'] = f'push/warp cells use tileset_hallart.json on {base} (Character models, Oct 29 2026, DRAFT); warp pair -> pad colour {slot}'
        dump(f, m)
    print(os.path.basename(f), 'cells', n, 'base', base)
# 3) names
pend = L(pend_path)['_meta']['pending_hall_trainers']; T = L('text/overworld_lines.json'); M = L('data/masters.json')
for nid, _ in ids:
    hm = nid.rsplit('_h', 1)[0]; p = pend[hm][nid]; cur = T['maps'][hm].get(nid) or {}
    if cur.get('placeholder') or not cur.get('battle_lost'): T['maps'][hm][nid] = {**p, 'note': p.get('note', '') + ' | merged by hall_art_kit (Oct 29 2026)'}
    for hh in M['halls']:
        for t in hh['trainers']:
            if t['id'] == nid: t['name'] = p['name']
dump('text/overworld_lines.json', T); dump('data/masters.json', M)
print('names', [(n, pend[n.rsplit('_h', 1)[0]][n]['name']) for n, _ in ids])
