"""Old asset name (base, without _r_c) -> redrawn archetype + params. Town / room-set colours come from the suffix."""
import re
from pieces import *
from kitlib import shade
TOWN = {'brook': (WOOD['oak'], CLOTH['purple']), 'fern': (WOOD['light'], CLOTH['green']), 'salt': (WOOD['drift'], CLOTH['blue']),
        'lantern': (WOOD['red'], CLOTH['orange']), 'cinder': (WOOD['dark'], CLOTH['red'])}
def town(base):
    for t, v in TOWN.items():
        if base.endswith('_'+t) or ('_'+t+'_') in base: return v
    return TOWN['brook']
COLOURS = {'red': 'red', 'blue': 'blue', 'green': 'green', 'teal': 'teal', 'purple': 'purple', 'navy': 'navy', 'orange': 'orange'}
def spec(base):
    sp = _spec(base)
    m = re.match(r'kit_.*_(worn|normal|fancy)_([a-z]+)(_[lr])?$', base)
    if not sp or not m: return sp
    fn, kw = sp; cond, col, side = m.group(1), m.group(2), (m.group(3) or '')[1:]
    kw = dict(kw)
    if col in CLOTH:
        for k in ('cloth', 'cushion', 'blanket'):
            if k in kw or fn.__name__ in ('sofa',) and k == 'cloth': kw[k] = CLOTH[col]
        if fn.__name__ == 'kitchen' and kw.get('part') != 'fridge': kw['body'] = CLOTH[col]
        if fn.__name__ == 'kitchen' and kw.get('part') == 'fridge': kw['body'] = CLOTH[col]
        if fn.__name__ == 'screen' and kw.get('kind') == 'radio': kw['body'] = CLOTH[col]
        if fn.__name__ == 'table' and 'cloth' not in kw: kw['cloth'] = CLOTH[col]
    if side and fn.__name__ == 'sofa': kw = dict(facing=side, cloth=kw.get('cloth', CLOTH['teal']), wood=WOOD['dark'])
    w = kw.get('wood', WOOD['oak'])
    if cond == 'worn': kw['worn'] = True; kw['wood'] = shade(w, .85, .7)
    if cond == 'fancy': kw['wood'] = WOOD['red'] if fn.__name__ != 'kitchen' else w
    return fn, kw
def _spec(base):
    """-> (fn, kwargs) or None (keep: floors, rugs, wall art, windows, puzzle and outdoor pieces)."""
    w, c = town(base); b = base
    R = [
        (r'(^|_)bed($|_)', lambda: (bed, dict(wood=w, blanket=c))),
        (r'kit_chair3.*_l$', lambda: (chair, dict(facing='l', wood=WOOD['oak']))), (r'kit_chair3.*_r$', lambda: (chair, dict(facing='r', wood=WOOD['oak']))),
        (r'club_stool', lambda: (chair, dict(stool=True, wood=STEEL, cushion=CLOTH['pink']))), (r'log_stool', lambda: (chair, dict(stool=True, wood=WOOD['dark'], cushion=WOOD['light']))),
        (r'(^|_)chair($|_)', lambda: (chair, dict(wood=w, cushion=c))),
        (r'table_toast', lambda: (table, dict(food='toast', wood=WOOD['oak'], cloth=CLOTH['red']))), (r'club_booth_table', lambda: (table, dict(wood=WOOD['dark'], food='cups'))),
        (r'kit_table3', lambda: (table, dict(wood=WOOD['oak'], cloth=CLOTH['teal']))), (r'table_small', lambda: (table, dict(wood=w, food=None))),
        (r'(^|_)table($|_)', lambda: (table, dict(wood=w, cloth=c))),
        (r'kit_couch_low', lambda: (sofa, dict(cloth=CLOTH['navy'], facing='up'))), (r'club_booth_[lr]', lambda: (sofa, dict(cloth=CLOTH['pink']))),
        (r'couch_low', lambda: (sofa, dict(cloth=CLOTH['navy'], facing='up'))), (r'couch', lambda: (sofa, dict(cloth=CLOTH['sand']))), (r'cork', lambda: (bookcase, dict(wood=WOOD['light'], stock='goods'))),
        (r'(^|_)sofa($|_)', lambda: (sofa, dict(cloth=c if b != 'sofa' else CLOTH['teal']))), (r'armchair', lambda: (sofa, dict(cloth=CLOTH['red']))),
        (r'bookcase|bookshelf', lambda: (bookcase, dict(wood=w, worn='kit_' in b))),
        (r'^goods$', lambda: (bookcase, dict(wood=WOOD['white'], stock='goods'))), (r'(^|_)shelf($|_)', lambda: (bookcase, dict(wood=w, stock='goods' if b.startswith('i_shelf') else 'books'))),
        (r'cupboard', lambda: (cabinet, dict(wood=w, kind='doors'))), (r'dresser|kit_side3', lambda: (cabinet, dict(wood=w, kind='drawers'))),
        (r'filing|locker', lambda: (cabinet, dict(wood=hx('8c9aa8'), kind='metal' if 'filing' in b else 'doors'))), (r'kcounter', lambda: (counter, dict(seg='m', items='papers'))),
        (r'fridge|cooler', lambda: (kitchen, dict(part='fridge', body=hx('3f9e9a') if 'cooler' not in b else hx('5ec8f0')))),
        (r'sink', lambda: (kitchen, dict(part='sink'))), (r'stove', lambda: (kitchen, dict(part='stove'))), (r'kitchen_counter', lambda: (kitchen, dict(part='counter'))),
        (r'tv_back', lambda: (screen, dict(kind='tv_back'))), (r'(^|_)tv$', lambda: (screen, dict(kind='tv'))),
        (r'desk_pc|lab_desk', lambda: (screen, dict(kind='pc', wood=WOOD['white'] if 'lab' in b else WOOD['oak']))), (r'(^|_)pc$', lambda: (screen, dict(kind='pc'))),
        (r'terminal', lambda: (screen, dict(kind='terminal'))), (r'radio', lambda: (screen, dict(kind='radio', body=CLOTH['red']))),
        (r'specimen_tank', lambda: (lab, dict(kind='tank'))), (r'server_rack', lambda: (lab, dict(kind='rack'))), (r'heal_machine', lambda: (lab, dict(kind='heal'))),
        (r'lab_machine', lambda: (lab, dict(kind='machine'))), (r'crystal_display', lambda: (lab, dict(kind='display'))), (r'crystal_polisher', lambda: (lab, dict(kind='polisher'))),
        (r'counter_heal_([lmr])', lambda: (counter, dict(seg=b[-1], body=hx('e9a0b8'), top=hx('fbf3f6'), items='bell' if b[-1] == 'm' else None))),
        (r'counter_shop_([lmr])', lambda: (counter, dict(seg=b[-1], body=hx('5f8fd0'), top=hx('f3e7c9'), items='register' if b[-1] == 'm' else None))),
        (r'counter_rt_([lmr])', lambda: (counter, dict(seg=b[-1], body=hx('3f9e9a'), top=hx('eef3f2'), items='papers' if b[-1] == 'm' else None))),
        (r'ticket_counter_([lmr])', lambda: (counter, dict(seg=b[-1], body=hx('8e3b2e'), top=hx('efe4cc'), items='papers' if b[-1] == 'm' else None))),
        (r'club_counter_(\w+)', lambda: (counter, dict(seg='m', body=hx('d86a9a'), top=hx('f6e7ef'), items={'cups': 'cups', 'fruit': 'fruit', 'case': 'case', 'blender': 'blender'}.get(b.split('_')[-1])))),
        (r'club_paint_counter|club_dj_desk', lambda: (counter, dict(seg='m', body=hx('6a4a8a'), top=hx('e8e0f0'), items='papers'))),
        (r'fireplace', lambda: (fireplace, dict())),
        (r'plant_palm|plant_tall', lambda: (plant, dict())), (r'plant_flower', lambda: (plant, dict(kind='flower'))), (r'plant_mushroom', lambda: (plant, dict(kind='mushroom'))),
        (r'plant_coral', lambda: (plant, dict(kind='flower', leaf=hx('e88ab0')))), (r'plant_fern|^plant$', lambda: (plant, dict())),
        (r'crates', lambda: (crates, dict())), (r'barrel', lambda: (crates, dict(kind='barrel'))), (r'crystal_crate', lambda: (crates, dict(wood=WOOD['oak']))),
        (r'luggage', lambda: (small, dict(kind='luggage'))), (r'globe', lambda: (small, dict(kind='globe'))), (r'fishing_rods|kit_rods', lambda: (small, dict(kind='rods'))),
        (r'river_stones', lambda: (small, dict(kind='stones'))), (r'salt_jars', lambda: (small, dict(kind='jars'))), (r'i_net$', lambda: (small, dict(kind='net'))),
        (r'kit_basket', lambda: (small, dict(kind='basket'))), (r'book_stack', lambda: (small, dict(kind='books'))), (r'kit_shoes', lambda: (small, dict(kind='shoes'))),
        (r'coat_rack', lambda: (coatrack, dict())), (r'x_bench', lambda: (sofa, dict(cloth=WOOD['oak']))),
    ]
    for pat, mk in R:
        if re.search(pat, b): return mk()
    return None
ANIM = {kitchen: lambda kw: kw.get('part') in ('sink', 'stove'), screen: lambda kw: kw.get('kind') in ('tv', 'tv_back', 'pc', 'terminal'),
        lab: lambda kw: kw.get('kind') in ('tank', 'rack', 'heal', 'machine', 'polisher'), fireplace: lambda kw: True, table: lambda kw: kw.get('food') == 'toast'}
def animated(fn, kw): return ANIM.get(fn, lambda kw: False)(kw)
