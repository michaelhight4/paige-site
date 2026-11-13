# Revival Tech branch kit (heal centres are company branches). Original art: the RT "crystal mark" is a tall
# faceted violet shard rising out of two upward chevrons (the "revival" lift) - no circles/split-ball motifs.
# Tiles live on their own sheet (i_brand) so earlier ids stay stable.
import numpy as np
from ix_canvas import Cv, C, T
import ix_floors as F
from ix_furniture import obj, box, foot_shadow, _hm

def crystal_mark(cv, cx, top, hgt, light=True):
    """RT crystal mark: faceted shard + two chevrons underneath. cx centre, top y, total height hgt (>=16)."""
    sh = int(hgt * 0.62); w = max(3, hgt // 5)
    mid = top + sh * 2 // 5
    for y in range(top, top + sh):
        if y < mid: half = int(round(w * (y - top) / max(1, mid - top)))
        else: half = int(round(w * (top + sh - 1 - y) / max(1, top + sh - 1 - mid)))
        if half < 1: half = 1 if y < top + sh - 1 else 0
        cv.rect(cx - half, y, cx, y + 1, C['mviolet'] if light else C['violet'])
        cv.rect(cx, y, cx + half + 1, y + 1, C['lav'] if light else C['mviolet'])
    cv.vline(cx, top + 1, top + sh - 1, C['pviolet'])
    cv.px(cx - 1, top + 2, C['paper'])
    gap = max(2, hgt // 10)
    for k in range(2):
        y = top + sh + gap + k * (gap + 2)
        for i in range(w + 2):
            cv.px(cx - i, y + i // 2, C['lav'] if k == 0 else C['mviolet']); cv.px(cx + i, y + i // 2, C['lav'] if k == 0 else C['mviolet'])
            cv.px(cx - i, y + 1 + i // 2, C['dviolet']); cv.px(cx + i, y + 1 + i // 2, C['dviolet'])

def letters_rt(cv, x, y, col):
    R = ["111.", "1..1", "111.", "1.1.", "1..1"]; Tt = ["111", ".1.", ".1.", ".1.", ".1."]
    for gl, ox in ((R, 0), (Tt, 5)):
        for j, row in enumerate(gl):
            for i, ch in enumerate(row):
                if ch == '1': cv.rect(x + (ox + i) * 2, y + j * 2, x + (ox + i) * 2 + 2, y + j * 2 + 2, col)

def build_ground(g):
    for v, s in enumerate('abc'):
        g('i_floor_rtbranch_' + s, F.tiles_sq([C['grey2'], C['grey3'], C['paper']], [C['lviolet'], C['lav'], C['pviolet']], C['greyv'], C['paper'], 61, v, speck=C['grey3']),
          notes='Revival Tech branch floor (pearl grey / lilac checker)')
    st = dict(ceil=[C['ink2'], C['dviolet']], trim=[C['dviolet'], C['violet'], C['lav']], wall=[C['grey3'], C['cream'], C['paper']], paper='panel',
              accent=C['mviolet'], wains=[C['dviolet'], C['violet'], C['mviolet']], window='ribbon', frame=[C['char'], C['slate']])
    for part, cv in F.wall_set(st, 77).items():
        g('i_wall_%s_rtbranch' % part, cv, coll=1, cat='wall', notes='Revival Tech branch wall (%s)' % part)

@obj('i_rt_logo_panel', 2, 1, coll=0, cat='prop', notes='Revival Tech crystal-mark logo panel, back wall row 1 (wall keeps collision 1)')
def _logo(cv):
    cv.rect(6, 6, 122, 58, C['char']); cv.rect(8, 8, 120, 56, C['ink2']); cv.vgrad(10, 10, 118, 54, C['dviolet'], C['ink2'])
    cv.hline(10, 118, 10, C['violet'])
    crystal_mark(cv, 30, 13, 40)
    letters_rt(cv, 48, 20, C['lav'])
    for i, y in enumerate((36, 42)): cv.rect(48, y, 48 + (64 if i == 0 else 48), y + 2, C['mviolet'] if i == 0 else C['violet'])
    cv.rect(12, 56, 116, 58, C['slate'])

for nm, sign in (('l', 0), ('m', 1), ('r', 0)):
    def mk(part, sign):
        def fn(cv):
            x0 = 6 if part == 'l' else 0; x1 = 58 if part == 'r' else 64
            box(cv, x0, 14, x1, 60, 12, [C['grey3'], C['paper']], [C['dviolet'], C['violet']], hl=C['paper'])
            cv.rect(x0, 26, x1, 29, C['lav']); cv.rect(x0, 50, x1, 53, C['mviolet'])   # uniform piping
            if sign: crystal_mark(cv, 32, 31, 18, light=True)
            else: cv.rect(x0 + (8 if part == 'l' else 0), 36, x1 - (8 if part == 'r' else 0), 38, C['violet'])
        return fn
    obj('i_counter_rt_' + nm, notes='Revival Tech uniformed branch counter (violet livery): talk across it')(mk(nm, sign))

@obj('i_crystal_polisher', 2, 2, notes='crystal-polishing station (replaces the heal machine): ONE crystal cradle (centre px [63,28] of the 128 px canvas) + scanner slit, no slot tray (IP rule, Oct 22 2026)')
def _pol(cv):
    # Same single-cradle console as i_heal_machine (Gary, Oct 22 2026, 11:26 PM CT: all crystals float into ONE cradle, one
    # scanner sweep; no 6-slot tray). Cradle centre = canvas px (63, 28) = Animator heal_restore anchor [30,30].
    # Revival Tech branch livery: violet stripe on the counter front. No baked shadow (engine casts it).
    _hm(cv)
    cv.rect(8, 98, 121, 102, C['mviolet']); cv.hline(8, 121, 101, C['violet'])

@obj('i_rt_poster_care', coll=0, cat='prop', notes='company poster (wall, rows 1-2): crystal mark + care slogan bars')
def _pa(cv):
    cv.rect(10, 6, 54, 60, C['paper']); cv.frame(10, 6, 54, 60, C['char']); cv.rect(12, 8, 52, 34, C['dviolet'])
    crystal_mark(cv, 32, 10, 22)
    for i, (y, w) in enumerate(((40, 34), (46, 26), (52, 30))): cv.rect(16, y, 16 + w, y + 3, C['violet'] if i == 0 else C['greyv'])
@obj('i_rt_poster_safety', coll=0, cat='prop', notes='company poster (wall): handle crystals with care - shield + shard pictogram')
def _pb(cv):
    cv.rect(10, 6, 54, 60, C['lav']); cv.frame(10, 6, 54, 60, C['char']); cv.rect(12, 8, 52, 12, C['dviolet'])
    pts = [(22, 18), (42, 18), (42, 34), (32, 44), (22, 34)]
    m = cv.mask_rect(22, 18, 43, 35) | (cv.mask_rect(24, 34, 41, 40) & (np.abs(cv.X - 32) < (44 - cv.Y)))
    cv.fill(m, C['paper']); cv.rect(30, 22, 34, 36, C['mviolet']); cv.rect(32, 22, 34, 36, C['violet'])
    for y, w in ((48, 30), (53, 22)): cv.rect(17, y, 17 + w, y + 3, C['dviolet'])
@obj('i_rt_poster_join', coll=0, cat='prop', notes='company poster (wall): "join the field team" - rising chevrons over a route line')
def _pc(cv):
    cv.rect(10, 6, 54, 60, C['dviolet']); cv.frame(10, 6, 54, 60, C['char'])
    for k in range(3):
        y = 30 - k * 7
        for i in range(12): cv.px(32 - i, y + i // 2, C['lav']); cv.px(32 + i, y + i // 2, C['lav']); cv.px(32 - i, y + 1 + i // 2, C['mviolet']); cv.px(32 + i, y + 1 + i // 2, C['mviolet'])
    cv.line(14, 52, 26, 44, C['amber']); cv.line(26, 44, 38, 48, C['amber']); cv.line(38, 48, 50, 40, C['amber'])

@obj('i_suggestion_box', notes='suggestion box on a post (readable: staff feedback slips)')
def _sb(cv):
    foot_shadow(cv, 18, 46, 58, 4)
    cv.rect(29, 34, 35, 60, C['slate'])
    box(cv, 14, 10, 50, 38, 6, [C['violet'], C['mviolet']], [C['dviolet'], C['violet']])
    cv.rect(24, 13, 40, 15, C['ink']); cv.rect(30, 6, 38, 13, C['paper']); cv.hline(31, 37, 9, C['greyv'])
    cv.rect(20, 22, 44, 32, C['lav']); crystal_mark(cv, 32, 22, 10)
@obj('i_newsletter_rack', notes='wire rack of Revival Tech newsletters (readable)')
def _nr(cv):
    foot_shadow(cv, 10, 54, 58, 4)
    cv.rect(10, 10, 12, 60, C['slate']); cv.rect(52, 10, 54, 60, C['slate'])
    for k, y in enumerate((14, 30, 46)):
        cv.rect(12, y + 10, 52, y + 12, C['slate2'])
        for j in range(3):
            x = 14 + j * 13
            cv.rect(x, y, x + 11, y + 11, C['paper'] if (j + k) % 2 else C['pale'])
            cv.rect(x, y, x + 11, y + 3, C['violet'] if (j + k) % 3 else C['dviolet']); cv.hline(x + 2, x + 9, y + 6, C['greyv']); cv.hline(x + 2, x + 7, y + 8, C['greyv'])
@obj('i_staffdoor_locked', 1, 2, coll=1, cat='door', notes='STAFF ONLY door, locked (blocks). Planned warp to rt_branch_backroom when unlocked - see the map field locked_warps')
def _sd(cv):
    cv.rect(6, 8, 58, 128, C['char']); cv.rect(10, 12, 54, 128, C['slate']); cv.vgrad(12, 14, 52, 128, C['grey'], C['greyv'])
    cv.rect(12, 40, 52, 46, C['violet']); cv.rect(12, 46, 52, 48, C['dviolet'])
    cv.rect(18, 20, 46, 32, C['paper']); cv.frame(18, 20, 46, 32, C['char'])
    for i, x in enumerate(range(21, 44, 5)): cv.rect(x, 24, x + 3, 28, C['dviolet'])
    cv.rect(42, 70, 50, 86, C['char']); cv.rect(44, 72, 48, 76, C['redor']); cv.rect(44, 79, 48, 84, C['greyv'])
    cv.rect(14, 76, 20, 80, C['grey3'])
@obj('i_locker', 1, 2, notes='staff lockers (back wall rows 1-2)')
def _lk(cv):
    cv.rect(4, 8, 60, 126, C['char']); 
    for x0 in (6, 33):
        cv.rect(x0, 10, x0 + 25, 124, C['greyv']); cv.vgrad(x0 + 1, 11, x0 + 24, 123, C['grey2'], C['grey'])
        for y in (18, 22, 26): cv.hline(x0 + 6, x0 + 19, y, C['slate'])
        cv.rect(x0 + 18, 62, x0 + 21, 72, C['char']); cv.rect(x0 + 4, 100, x0 + 21, 103, C['violet'])
@obj('i_crystal_crate', notes='crate of raw crystals waiting for polishing')
def _cc(cv):
    foot_shadow(cv, 8, 56, 56, 5)
    box(cv, 8, 26, 56, 58, 6, [C['mbrown'], C['tan']], [C['brown'], C['mbrown']])
    cv.rect(8, 40, 56, 43, C['bark'])
    for k, (x, h) in enumerate(((16, 18), (26, 24), (36, 16), (46, 20))):
        cv.rect(x - 3, 30 - h, x + 3, 30, C['mviolet']); cv.rect(x, 30 - h, x + 3, 30, C['lav']); cv.px(x - 1, 32 - h, C['paper'])
    cv.rect(24, 46, 40, 54, C['paper']); crystal_mark(cv, 32, 46, 8)
obj('i_mat_rtbranch', coll=4, cat='door', notes='exit mat: collision 4, needs a warp', outline=False)(
    (lambda c1, c2, c3: (lambda cv: (cv.rect(4, 14, 60, 60, c1), cv.rect(7, 17, 57, 57, c2), crystal_mark(cv, 32, 20, 32), cv.hline(6, 58, 61, C['ink']))))(C['ink2'], C['dviolet'], C['lav']))
