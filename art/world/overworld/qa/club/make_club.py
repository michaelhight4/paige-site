# The Firefly (club_int) previews, Oct 22 2026. Read-only on maps/tileset; writes ONLY qa/club/*.png + framing.json.
# Flag staging is simulated from club_int.json flag_swaps (what the engine should do); night/phases use time_of_day grades
# + emissive masks. NOTE: engine indoor rule keeps *_int on the day grade; the phase panels show the Coder ask
# "club_int follows the outdoor clock" (like lantern_rest).
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); OW = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(OW, 'tools')); import time_of_day as TOD
PRE = '/tmp/bk_club/pre'                       # pre-club backup (exterior BEFORE)
T = 64; TB = TOD.tables()
FONT = ImageFont.load_default()

def ctx(ow):
    ts = json.load(open(f'{ow}/tileset.json')); names = {t['name'] for t in ts['tiles']}
    keep = TOD.EMISSIVE; TOD.EMISSIVE = {k: v for k, v in keep.items() if k in names}   # BEFORE tree predates the club tiles
    try: masks = TOD.emissive_masks(ow)
    finally: TOD.EMISSIVE = keep
    return dict(ow=ow, by={t['id']: t for t in ts['tiles']}, name={t['name']: t['id'] for t in ts['tiles']},
                                                          cols=ts.get('columns_per_sheet', 16), masks=masks, sheets={})
def sheet(c, sh, grade):
    k = (sh, grade)
    if k not in c['sheets']:
        raw = Image.open(f"{c['ow']}/{sh}")
        c['sheets'][k] = raw.convert('RGBA') if grade == 'day' else TOD.apply(raw, dict(TB[grade], _name=grade), c['masks'].get(sh))
    return c['sheets'][k]
def render(c, mname, grade='day', over=None, box=None):
    m = json.load(open(f"{c['ow']}/maps/{mname}.json")); x0, y0, x1, y1 = box or (0, 0, m['width'], m['height'])
    im = Image.new('RGBA', ((x1 - x0) * T, (y1 - y0) * T), (26, 18, 38, 255))
    for ln in ('ground', 'decoration', 'overlay'):
        for y in range(y0, y1):
            for x in range(x0, x1):
                tid = m['layers'][ln][y][x]
                if over and ln == 'decoration' and (x, y) in over: tid = c['name'].get(over[(x, y)], 0) if over[(x, y)] else 0
                t = c['by'].get(tid)
                if not t: continue
                s = sheet(c, t['sheet'], grade); i = t['index']; cl = c['cols']
                im.alpha_composite(s.crop(((i % cl) * T, (i // cl) * T, (i % cl + 1) * T, (i // cl + 1) * T)), ((x - x0) * T, (y - y0) * T))
    return im
def tag(im, text, h=22):
    out = Image.new('RGBA', (im.width, im.height + h), (20, 16, 30, 255)); out.alpha_composite(im, (0, h))
    ImageDraw.Draw(out).text((6, 5), text, fill=(244, 226, 255), font=FONT); return out
def grid(rows, gap=10, bg=(20, 16, 30, 255)):
    W = max(sum(i.width for i in r) + gap * (len(r) + 1) for r in rows); H = sum(max(i.height for i in r) for r in rows) + gap * (len(rows) + 1)
    out = Image.new('RGBA', (W, H), bg); y = gap
    for r in rows:
        x = gap
        for i in r: out.alpha_composite(i, (x, y)); x += i.width + gap
        y += max(i.height for i in r) + gap
    return out
def half(im): return im.resize((im.width // 2, im.height // 2), Image.NEAREST)

NEW = ctx(OW); club = json.load(open(f'{OW}/maps/club_int.json')); SW = club['flag_swaps']
def state(flags):
    """decoration overrides for a set of flags (engine order: notes, ticks, then field_team_home wins)"""
    o = {}
    for s in SW:
        xy = (s['x'], s['y'])
        if s['flag'] not in flags or (s.get('requires') and s['requires'] not in flags): continue
        cur = o.get(xy, s['before'])
        if s['before'] in ('any', cur): o[xy] = s['after']
    return o
STAGES = [('tier 0 (first visit)', set()), ('+ beat_master_fernwick', {'beat_master_fernwick'}),
          ('+ beat_master_revival', {'beat_master_fernwick', 'beat_master_revival'}),
          ('+ beat_master_frostspire, 2 camps restored', {'beat_master_fernwick', 'beat_master_revival', 'beat_master_frostspire', 'camp_restored_thornwood', 'camp_restored_greystone'}),
          ('field_team_home (post-game)', {'beat_master_fernwick', 'beat_master_revival', 'beat_master_frostspire', 'field_team_home'})]

# NPC + spot annotation layer (markers, not sprites)
def annotate(im, ox=0, oy=0):
    a = im.copy(); d = ImageDraw.Draw(a); tp = club['text_pending']
    for n in tp['npcs']:
        cx, cy = n['x'] * T + 32 - ox, n['y'] * T + 32 - oy; d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=(240, 120, 60, 230), outline=(25, 18, 16))
        d.text((cx - 28, cy + 16), n['id'].replace('rebel_', ''), fill=(255, 255, 255), font=FONT)
        if 'talk_from' in n:
            tx, ty = n['talk_from']; d.rectangle([tx * T + 4 - ox, ty * T + 4 - oy, tx * T + 59 - ox, ty * T + 59 - oy], outline=(255, 214, 104), width=3)
    for s in tp['interact_spots']:
        sx, sy = s['stand']; d.rectangle([sx * T + 22 - ox, sy * T + 22 - oy, sx * T + 41 - ox, sy * T + 41 - oy], outline=(120, 220, 120), width=2)
    for w in club['warps']: d.rectangle([w['x'] * T + 2 - ox, w['y'] * T + 2 - oy, w['x'] * T + 61 - ox, w['y'] * T + 61 - oy], outline=(90, 200, 255), width=3)
    return a

# ---------- preview.png: day / night, phases, flyer stages, layout ----------
day = render(NEW, 'club_int', 'day', state(set())); night = render(NEW, 'club_int', 'night', state(set()))
phases = [tag(half(render(NEW, 'club_int', g, state(set()))), g) for g in ('dawn', 'day', 'dusk', 'night')]
wall = [tag(render(NEW, 'club_int', 'day', state(f), box=(0, 0, 14, 4)).resize((14 * 32, 4 * 32), Image.NEAREST), t) for t, f in STAGES]
lay = annotate(day)
top = [tag(day, 'club_int DAY (engine today: interiors stay on the day grade)'), tag(night, 'club_int NIGHT grade + emissive (dance floor amber/green, Coder ask: follow outdoor clock)')]
rows = [top, [tag(lay, 'layout: orange = NPC (id), yellow box = talk cell, green = interact stand, blue = exit door')], phases[:2], phases[2:], wall[:3], wall[3:]]
grid(rows).convert('RGB').save(f'{HERE}/preview.png', optimize=True)

# ---------- exterior compare: Fernwick side yard ----------
OLD = ctx(PRE); BOX = (18, 0, 30, 9)
ext = [[tag(render(OLD, 'fernwick', g, box=BOX), f'BEFORE fernwick {g}'), tag(render(NEW, 'fernwick', g, box=BOX), f'AFTER fernwick {g} (The Firefly + sign_club, old_record at 27,5)')] for g in ('day', 'night')]
grid(ext).convert('RGB').save(f'{HERE}/exterior_compare.png', optimize=True)

# ---------- framing: PC 1920x1080, mobile 844x390 @3, phone 2340x1080; touch zones (same model as qa/interior_scale_audit/audit.py, copied) ----------
VIEWS = [('PC 1920x1080', 1920, 1080, 1), ('Phone 844x390 @3', 844, 390, 3), ('Phone 2340x1080 (851x393 @2.75)', 851, 393, 2.75)]
def zoom_for(h): return 1 if h < 600 else max(2, h // 480)
DPAD = dict(left=18, bottom=18, w=174, h=174); BTNS = dict(right=22, bottom=30, w=56 + 14 + 56 + 14 + 76 + 14 + 76, h=76)
def cam_axis(f, mp, v):
    if mp <= v: return round((mp - v) / 2)
    return min(int(mp - v), max(0, round(f - v / 2)))
FOCI = {'arrival (7,13)': (7, 13), 'juice counter talk (2,11)': (2, 11), 'DJ talk (11,11)': (11, 11), 'flyer wall (7,3)': (7, 3), 'paint vendor talk (11,4)': (11, 4)}
full = annotate(day); fr = []; rep = {}
MW, MH = club['width'], club['height']
cells_need = {tuple(n['talk_from']) for n in club['text_pending']['npcs'] if 'talk_from' in n} | {tuple(s['stand']) for s in club['text_pending']['interact_spots']}
for name, cw, ch, dpr in VIEWS:
    W, H = round(cw * dpr), round(ch * dpr); z = zoom_for(H); vw, vh = W / z, H / z; k = z / dpr; rep[name] = {}
    for fn, (fx, fy) in FOCI.items():
        cx, cy = cam_axis(fx * T + 32, MW * T, vw), cam_axis(fy * T + 32, MH * T, vh)
        rects = [(DPAD['left'], ch - DPAD['bottom'] - DPAD['h'], DPAD['left'] + DPAD['w'], ch - DPAD['bottom']),
                 (cw - BTNS['right'] - BTNS['w'], ch - BTNS['bottom'] - BTNS['h'], cw - BTNS['right'], ch - BTNS['bottom'])] if dpr > 1 else []
        cov = sorted((x, y) for y in range(MH) for x in range(MW) for (a, b, c2, d) in rects if a <= (x * T + 32 - cx) * k <= c2 and b <= (y * T + 32 - cy) * k <= d)
        rep[name][fn] = dict(zoom=z, view_tiles=[round(vw / T, 2), round(vh / T, 2)], camera=[cx, cy], focus_under_touch=(fx, fy) in cov,
                             needed_cells_under_touch=sorted(set(cov) & cells_need))
        if fn in ('arrival (7,13)', 'juice counter talk (2,11)'):
            v = Image.new('RGBA', (int(vw), int(vh)), (0, 0, 0, 255)); v.alpha_composite(full.crop((max(cx, 0), max(cy, 0), max(cx, 0) + min(int(vw), MW * T), max(cy, 0) + min(int(vh), MH * T))), (max(-cx, 0), max(-cy, 0)))
            dd = ImageDraw.Draw(v)
            for (a, b, c2, d) in rects: dd.rectangle([a / k, b / k, c2 / k, d / k], outline=(255, 80, 80), width=3)
            sc = 0.5 if dpr == 1 else 1
            fr.append(tag(v.resize((int(v.width * sc), int(v.height * sc)), Image.NEAREST), f'{name} zoom {z}, focus {fn} (red = touch controls)'))
grid([fr[:2], fr[2:4], fr[4:]]).convert('RGB').save(f'{HERE}/framing.png', optimize=True)
json.dump(rep, open(f'{HERE}/framing.json', 'w'), indent=1)
print(json.dumps({v: {f: (r['focus_under_touch'], r['needed_cells_under_touch']) for f, r in d.items()} for v, d in rep.items()}, indent=0))
