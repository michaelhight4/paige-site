"""fx_extra/capture: HOLD-UP / ABSORB capture (Gary, Oct 22 2026 11:05 PM CT: "just have the trainer hold the crystal up and it absorbs the kilumen").
No throw, no drop, no wobble, no click, no stars. Beats: raise + glow -> violet runes/beam reach the foe -> the foe dissolves into
light motes that stream into the held crystal -> the crystal pulses 1-4 times in the trainer's hands while the runes close in ->
success (runes lock, crystal blooms into facets) OR break-out (light bursts back out and re-forms the creature, per element).
Overlay FX + hook points only: trainer sprites are NOT redrawn (Character models owns them). DRAFT."""
import sys, os, math, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fxx_lib import *
P = 'capture'

# ---- the dominance crystal: tall faceted gem held by three warm-gold top prongs (pendant setting). NO middle band. ----
FILL = ["...p.p...",
        "..pp5pp..",
        "..p543p..",
        "..55c32..",
        ".54c4321.",
        ".4c44321.",
        ".44c3321.",
        ".4433221.",
        "..43321..",
        "..43211..",
        "...321...",
        "...21....",
        "....1...."]
LEVELS = {
    'mid':    dict(zip('54321cp', ['d6acff', 'b076ec', '8a4ace', '603096', '3a1e60', 'd6acff', 'e8ce92'])),
    'bright': dict(zip('54321cp', ['f4e2ff', 'd6acff', 'b076ec', '8a4ace', '603096', WARM_HI, 'fcd668'])),
    'dim':    dict(zip('54321cp', ['b076ec', '8a4ace', '603096', '603096', '3a1e60', '8a4ace', 'e8ce92'])),
    'crack':  dict(zip('54321cp', ['f4e2ff', 'd6acff', 'b076ec', '8a4ace', '603096', WARM_HI, 'fcd668'])),
}
def crystal(level='mid'):
    g = glyph(FILL, LEVELS[level]); g2 = blank(g.shape[1] + 2, g.shape[0] + 2); paste(g2, g, 1, 1)
    return outline(g2, INK)
def put_c(cv, c, cx, cy):
    """centre the crystal sprite on (cx, cy)."""
    b = bbox(c); return paste(cv, c, int(cx) - (b[0] + b[2]) // 2, int(cy) - (b[1] + b[3]) // 2)

# ---- original angular runes (5x5), light violet, INK outline added per frame ----
RUNES = [["..x..", ".x.x.", "x.x.x", ".x.x.", "..x.."],
         ["xxx..", "..x..", "..xxx", "..x..", "xxx.."],
         ["x.x.x", "x.x.x", ".xxx.", "..x..", "..x.."],
         ["xx.xx", "x...x", "..x..", "x...x", "xx.xx"]]
def rune(k, col='d6acff'):
    return glyph(RUNES[k % 4], {'x': col})
def put_rune(cv, k, x, y, col='d6acff'):
    r = rune(k, col); paste(cv, r, int(round(x)) - 2, int(round(y)) - 2)

def diamond(cv, x, y, r, col, core=None):
    poly(cv, [(x, y - r), (x + r * 0.7, y), (x, y + r), (x - r * 0.7, y)], col)
    if core: px(cv, x, y, core)

# ---- layout (pilot 320x240). Travel canvas 240x176 drawn at TRAVEL_OFF (40,40), same as effects/. ----
HOLD = (64, 128)          # crystal centre at the trainer's raised hands (player back sprite, pilot placement; see hooks)
TW, TH = 240, 176
def tc(p): return (p[0] - TRAVEL_OFF[0], p[1] - TRAVEL_OFF[1])
HC, FC = tc(HOLD), tc(FOE_CENTER)
CTRL = ((HC[0] + FC[0]) / 2, min(HC[1], FC[1]) - 40)
def bez(t, a=HC, b=FC, c=CTRL):
    u = 1 - t; return (u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1])
RING_RX, RING_RY = 34, 30   # rune ring around the foe (sprite area)

def beam(cv, t0, t1, core='d6acff', edge='8a4ace', dotted=False):
    n = 160; pts = [bez(t0 + (t1 - t0) * k / n) for k in range(n + 1)]
    for k, (x, y) in enumerate(pts):
        if dotted and (k // 6) % 2: continue
        px(cv, x, y - 1, edge); px(cv, x, y + 1, edge)
    for k, (x, y) in enumerate(pts):
        if dotted and (k // 6) % 2: continue
        px(cv, x, y, core)
def foe_ring(cv, nrunes, rot=0.0, col='d6acff'):
    for k in range(nrunes):
        a = -math.pi / 2 + k * 2 * math.pi / 6 + rot
        put_rune(cv, k, FC[0] + math.cos(a) * RING_RX, FC[1] + math.sin(a) * RING_RY, col)
def finish(cv):
    return outline(cv, INK)

# ---------------- anims ----------------
def raise_glow():
    """64x64 at the hold point: crystal appears in the hands (dither-in), then glows up. Steps >= 100 ms."""
    fr = []; c = 32
    for i in range(7):
        cv = blank(64, 64)
        lvl = 'mid' if i < 4 else 'bright'
        cr = crystal(lvl)
        if i < 3: cr = bayer_fade(cr, [0.75, 0.5, 0.25][i])
        put_c(cv, cr, c, c)
        if i >= 4:
            r = [7, 9, 10][i - 4]
            ring(cv, c, c, r + 1, '603096', step=2, gap=2, phase=i)
            ring(cv, c, c, r, 'd6acff' if i == 5 else 'b076ec', step=3, gap=1, phase=i)
            for k in range(4):   # four facet glints at the diagonals (diamonds, not stars)
                a = math.pi / 4 + k * math.pi / 2
                diamond(cv, c + math.cos(a) * (r + 3), c + math.sin(a) * (r + 3), 2, 'd6acff', WARM_HI)
        fr.append(finish(cv) if i >= 4 else cv)
    return fr, [100, 100, 100, 133, 133, 167, 200]

def reach():
    """travel canvas: beam + runes grow from the crystal to the foe; rune ring forms round the foe; last 2 frames loop."""
    fr = []; n = 10
    for i in range(n):
        cv = blank(TW, TH)
        t1 = min(1.0, (i + 1) / 6)
        beam(cv, 0.0, t1)
        nr = int(t1 * 5)
        for k in range(nr):   # runes riding the beam, drifting toward the foe
            s = (k + 0.5) / 5 + (0.03 * (i % 2) if i >= 6 else 0)
            if s <= t1: x, y = bez(min(0.97, s)); put_rune(cv, k, x, y - 6)
        if i >= 5: foe_ring(cv, min(6, (i - 4) * 2), rot=0.08 * (i - 5))
        put_c(cv, crystal('bright'), *HC)
        fr.append(finish(cv))
    return fr, [100, 100, 100, 100, 100, 133, 133, 133, 167, 167]

ABS_N = 10
DISSOLVE = [0.0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 1.0, 1.0]   # fraction of the foe removed (Bayer 4x4) per absorb frame
def absorb():
    """travel canvas: foe-side motes stream along the beam into the crystal; rune ring follows the light to the crystal."""
    R = __import__('random').Random(11); fr = []
    starts = [(FC[0] + R.uniform(-1, 1) * 30, FC[1] + R.uniform(-1, 1) * 36) for _ in range(20)]
    delay = [k / 20 * 0.55 for k in range(20)]
    for i in range(ABS_N):
        cv = blank(TW, TH); T = i / (ABS_N - 1)
        if i < ABS_N - 2: beam(cv, 0.0, 1.0, core='b076ec', edge='603096', dotted=True)
        for k, (sx, sy) in enumerate(starts):
            s = (T - delay[k]) / 0.45
            if s < 0 or s > 1.0: continue
            u = 1 - s; bx, by = bez(u)          # u goes 1 (foe) -> 0 (crystal)
            x = bx + (sx - FC[0]) * (u ** 3); y = by + (sy - FC[1]) * (u ** 3)
            tx, ty = bez(min(1, u + 0.06)); tx += (sx - FC[0]) * (min(1, u + 0.06) ** 3); ty += (sy - FC[1]) * (min(1, u + 0.06) ** 3)
            line(cv, tx, ty, x, y, 'b076ec')
            px(cv, x, y, WARM_HI); px(cv, x + 1, y, 'd6acff'); px(cv, x, y + 1, 'd6acff'); px(cv, x + 1, y + 1, 'fcd668')
        # rune ring: shrinks round the foe, then rides the beam to the crystal
        rt = min(1.0, T * 1.25)
        for k in range(6):
            a = -math.pi / 2 + k * 2 * math.pi / 6 + 0.3 * T
            cx, cy = bez(1 - rt); rx = RING_RX * (1 - rt) + 20 * rt; ry = RING_RY * (1 - rt) + 20 * rt
            put_rune(cv, k, cx + math.cos(a) * rx, cy + math.sin(a) * ry)
        lv = 'bright' if i % 3 != 2 else 'mid'
        put_c(cv, crystal(lv), *HC)
        if i >= 6: ring(cv, HC[0], HC[1], 9, 'd6acff', step=2, gap=2, phase=i)
        fr.append(finish(cv))
    return fr, [100] * 8 + [133, 167]

PULSE_MS = [167, 167, 133, 133]          # one pulse = 600 ms; every brightness step >= 133 ms
RUNE_R = [20, 16, 13, 10, 8]             # rune ring radius at the start of pulse k (closes in each pulse)
def pulses(npulse=4):
    fr = []; c = 32
    for k in range(npulse):
        for j in range(4):
            cv = blank(64, 64); t = j / 4
            r = RUNE_R[k] + (RUNE_R[k + 1] - RUNE_R[k]) * t
            for q in range(6):
                a = -math.pi / 2 + q * 2 * math.pi / 6 + 0.25 * (k * 4 + j)
                put_rune(cv, q, c + math.cos(a) * r, c + math.sin(a) * r, 'd6acff' if j < 2 else 'b076ec')
            put_c(cv, crystal('bright' if j < 2 else 'mid'), c, c)
            if j == 0: ring(cv, c, c, 8, 'b076ec', step=2, gap=1)
            if j == 1: ring(cv, c, c, 9, 'd6acff', step=3, gap=1, phase=k); ring(cv, c, c, 10, '603096', step=2, gap=2)
            if j == 2: ring(cv, c, c, 10, '8a4ace', step=1, gap=3, phase=k)
            fr.append(finish(cv))
    return fr, PULSE_MS * npulse

def success():
    """64x64: runes lock onto the crystal (f0-1), crystal blooms into facet petals (f2-4), settles bound (f5 hold)."""
    fr = []; c = 32
    for i in range(6):
        cv = blank(64, 64)
        if i <= 1:
            r = [7, 6][i]
            for q in range(6):
                a = -math.pi / 2 + q * 2 * math.pi / 6
                put_rune(cv, q, c + math.cos(a) * (r + 2), c + math.sin(a) * (r + 2), WARM_HI if i == 1 else 'd6acff')
        if i >= 2:
            L = [5, 9, 11, 9][i - 2]
            for q in range(6):   # facet petals open outward from the crystal
                a = -math.pi / 2 + q * 2 * math.pi / 6 + math.pi / 6
                x, y = c + math.cos(a) * L, c + math.sin(a) * L
                diamond(cv, x, y, 4 if i in (3, 4) else 3, 'b076ec' if q % 2 else '8a4ace', 'd6acff')
                px(cv, (x + c) / 2, (y + c) / 2, 'd6acff')
            if i in (3, 4): ring(cv, c, c, L + 5, 'd6acff' if i == 3 else '8a4ace', step=2, gap=2, phase=i)
        put_c(cv, crystal('bright' if i < 5 else 'mid'), c, c)
        if i == 1: ring(cv, c, c, 11, 'fcd668', step=1, gap=2)
        fr.append(finish(cv))
    return fr, [133, 167, 133, 167, 200, 600]

def _release(cv, kind, j, cx, cy):
    """element release at the foe centre, j = 0..3 (no smoke/haze for fire)."""
    r = [8, 16, 24, 30][j]
    if kind == 'generic':
        ring(cv, cx, cy, r, 'd6acff', step=3, gap=1, phase=j); ring(cv, cx, cy, max(2, r - 4), '8a4ace', step=1, gap=3)
        for k in range(6):
            a = k * math.pi / 3 + 0.3
            diamond(cv, cx + math.cos(a) * (r + 3), cy + math.sin(a) * (r + 3) * 0.9, 2, 'b076ec', WARM_HI)
    elif kind == 'fire':
        if j <= 2:
            s = [0.8, 1.2, 1.0][j]
            for k in range(5):
                a = -math.pi / 2 + (k - 2) * 0.55; L = (12 + 5 * (k % 2)) * s
                tip = (cx + math.cos(a) * L, cy + math.sin(a) * L)
                b0 = (cx + math.cos(a + 1.3) * 4, cy + math.sin(a + 1.3) * 4); b1 = (cx + math.cos(a - 1.3) * 4, cy + math.sin(a - 1.3) * 4)
                poly(cv, [b0, tip, b1], 'd46616')
                poly(cv, [((b0[0] + cx) / 2, (b0[1] + cy) / 2), ((tip[0] + cx * 2) / 3, (tip[1] + cy * 2) / 3), ((b1[0] + cx) / 2, (b1[1] + cy) / 2)], 'fcd668')
            disc(cv, cx, cy, 2, WARM_HI)
        for k in range(10):   # ember sparks (lit gold), no smoke/haze
            a = -math.pi / 2 + (k - 4.5) * 0.36; v = 0.9 + 0.2 * (k % 3)
            x = cx + math.cos(a) * r * v; y = cy + math.sin(a) * r * v - 3 * j * (k % 2)
            px(cv, x, y, 'fcd668'); px(cv, x + 1, y, 'fcd668' if j < 3 else 'eea23c')
    elif kind == 'water':
        for k in range(10):
            a = -math.pi / 2 + (k - 4.5) * 0.34; v = 0.85 + 0.2 * (k % 3)
            x = cx + math.cos(a) * r * v * 1.2; y = cy + math.sin(a) * r * v + 1.2 * j * j
            px(cv, x, y - 1, 'c6ecfa'); px(cv, x, y, '7ac2e8'); px(cv, x + 1, y, '4692ce'); px(cv, x, y + 1, '2c64a8')
        if j <= 2:
            ring(cv, cx, cy, r * 0.8, '7ac2e8', step=3, gap=2, phase=j); ring(cv, cx, cy, r * 0.8 + 1, 'c6ecfa', step=1, gap=4, phase=j)
    elif kind == 'wind':
        for k in range(3):
            a0 = k * 2 * math.pi / 3 + j * 0.8
            for q in range(16):
                a = a0 + q * 0.13; rr = r * 0.5 + q * 1.0
                col = 'fcf6e8' if q > 11 else 'ecdec4' if q > 5 else 'ccc6c2'
                px(cv, cx + math.cos(a) * rr, cy + math.sin(a) * rr * 0.8, col)
    for k in range(6):   # violet light bits returning into the body
        a = k * math.pi / 3 + j * 0.5; rr = max(3, 22 - j * 6)
        px(cv, cx + math.cos(a) * rr, cy + math.sin(a) * rr, 'd6acff')

REFORM = [1.0, 0.66, 0.33, 0.0]   # fraction of the foe still hidden on break-out frames 6-9 (Bayer reveal)
def breakout(kind):
    """travel canvas: crystal cracks with light (f0), light bursts out (f1), streams back along the arc (f2-5), re-forms the foe with the element release (f6-9)."""
    fr = []
    for i in range(10):
        cv = blank(TW, TH)
        if i == 0:
            put_c(cv, crystal('crack'), *HC)
            line(cv, HC[0] - 2, HC[1] - 4, HC[0] + 1, HC[1], INK); line(cv, HC[0] + 1, HC[1], HC[0] - 1, HC[1] + 4, INK)
        else:
            put_c(cv, crystal('dim'), *HC)
        if i == 1:
            for k in range(8):
                a = k * math.pi / 4
                line(cv, HC[0] + math.cos(a) * 8, HC[1] + math.sin(a) * 8, HC[0] + math.cos(a) * 14, HC[1] + math.sin(a) * 14, 'd6acff')
                px(cv, HC[0] + math.cos(a) * 15, HC[1] + math.sin(a) * 15, WARM_HI)
        if 2 <= i <= 5:
            t = (i - 1) / 4
            for k in range(12):
                s = max(0.0, min(1.0, t - k * 0.03))
                x, y = bez(s); x += math.sin(k * 1.7) * 6 * s; y += math.cos(k * 2.3) * 6 * s
                tx, ty = bez(max(0, s - 0.07))
                line(cv, tx, ty, x, y, 'b076ec'); px(cv, x, y, WARM_HI); px(cv, x + 1, y, 'd6acff')
            beam(cv, max(0.0, t - 0.3), t, core='d6acff', edge='603096', dotted=True)
        if i >= 5:
            _release(cv, kind, min(3, i - 6) if i >= 6 else 0, *FC) if i >= 6 else None
        fr.append(finish(cv))
    return fr, [133, 100, 90, 90, 90, 90, 100, 100, 120, 200]

def write_battle_jsons(a, hooks, step_map):
    """one <name>_battle_2x.json beside each sheet, in the style of the live effects/<el>/<anim>/<el>_<anim>_battle_2x.json."""
    import datetime
    for m in a.values():
        name = os.path.basename(m['frames_1x_dir'].rstrip('/').rsplit('/', 1)[0]); d = os.path.dirname(ROOT + '/' + m['sheet'])
        w, h = m['frame_size']; an = m['anchor']; travel = 'canvas_top_left_on_screen' in an
        if travel:
            tl = an['canvas_top_left_on_screen']
            anchor = dict(type='screen_canvas', x=0, y=0, native=[0, 0], canvas_top_left_on_screen_native=tl,
                          hold_in_canvas_native=[HOLD[0] - tl[0], HOLD[1] - tl[1]], foe_in_canvas_native=[FOE_CENTER[0] - tl[0], FOE_CENTER[1] - tl[1]],
                          usage='authored for the pilot 320x240 layout: draw the frame top-left at canvas_top_left_on_screen (x k). Other layouts: the arc runs HOLD -> foe centre with control point ' + str([round(CTRL[0] + 40), round(CTRL[1] + 40)]))
        else:
            ax, ay = an['canvas_px']
            anchor = dict(type='crystal_hold_centre', x=ax * 2, y=ay * 2, native=[ax, ay],
                          usage='draw the frame at (hold_x - anchor.x*k, hold_y - anchor.y*k), k = display px per 2x px; hold = the trainer raised-hands point for the current pose frame')
        out = {'element': 'capture', 'anim': name, 'coder_step': step_map.get(name, name), 'description': m.get('notes', ''),
               'status': 'DRAFT - not approved by Gary, NOT wired into game code', 'generated_by': 'art/characters/pixel/fx_extra/_tools/gen_capture.py',
               'generated_at': datetime.datetime.now().astimezone().isoformat(timespec='seconds'), 'scale': 2, 'filter': 'nearest',
               'background': 'fully transparent (1-bit alpha), palette-only opaque pixels', 'gif': f'{name}_2x.gif', 'gif_disposal': 2,
               'loop': 'loop the last 2 frames while waiting' if name == 'beam' else 'play ONCE in game (hold the last frame)' if name == 'lock_bloom' else 'play ONCE in game (remove after total_ms)',
               'sheet': f'{name}_sheet_2x.png', 'sheet_native': f'{name}_sheet.png', 'sheet_layout': 'horizontal strip, frame i at x=i*frame_w',
               'frame_w': w * 2, 'frame_h': h * 2, 'frame_count': m['frames'],
               'frames': [dict(i=i, x=i * w * 2, y=0, w=w * 2, h=h * 2, ms=ms) for i, ms in enumerate(m['ms_per_frame'])],
               'total_ms': m['total_ms'], 'native_frame_w': w, 'native_frame_h': h, 'anchor': anchor,
               'emissive': m['emissive'] + ' (all = draw with the ToD lit grade)',
               'hooks': dict(hand_anchor=hooks['anchors']['crystal_hold_player_back'] | dict(trainer_front=hooks['anchors']['crystal_hold_trainer_front']),
                             foe_anchor=hooks['anchors']['foe'])}
        if name == 'absorb': out['hooks']['foe_dissolve'] = hooks['foe_dissolve']
        if name.startswith('breakout'): out['hooks']['foe_reform'] = hooks['foe_reform']; out['hooks']['breakout_type_by_element'] = hooks['breakout_type_by_element']
        if name.startswith('pulse'): out['hooks']['pulse_variants'] = hooks['pulse_variants']
        if name == 'lock_bloom': out['hooks']['sfx'] = hooks['sfx_cues']['lock_bloom']
        json.dump(out, open(f'{d}/{name}_battle_2x.json', 'w'), indent=1)

def main():
    import elements as EL
    ELS = list(EL.ELEMENTS)
    fire = {'fire', 'magma', 'dragos', 'devil', 'demon'}; water = {'water', 'sea', 'freshwater', 'swamp', 'rain'}; wind = {'wind', 'bird'}
    bmap = {e: ('fire' if e in fire else 'water' if e in water else 'wind' if e in wind else 'generic') for e in ELS}
    a = {}
    hold_anchor = dict(canvas_px=[32, 32], meaning='crystal centre = the trainer HOLD point (raised hands); follow it per pose frame')
    travel_anchor = dict(canvas_top_left_on_screen=list(TRAVEL_OFF), hold_screen=list(HOLD), foe_centre_screen=list(FOE_CENTER),
                         meaning='authored for the pilot layout: crystal at HOLD, foe at FOE_CENTER, arc control point ' + str([round(CTRL[0] + 40), round(CTRL[1] + 40)]))
    f, ms = raise_glow(); a['raise'] = write_anim(P, 'raise', f, ms, anchor=hold_anchor,
        notes='Crystal appears in the raised hands (Bayer dither-in f0-2, no pop), then glows up (f4-6) with four facet glints. Play while the trainer pose goes to arms-raised; keep the crystal on the per-frame hold point.')
    f, ms = reach(); a['reach'] = write_anim(P, 'beam', f, ms, anchor=travel_anchor, kind='travel',
        notes='Violet beam + 5 runes reach from the crystal to the foe (f0-5), a ring of 6 runes forms round the foe (f5-9). Frames 8-9 may loop while waiting.')
    f, ms = absorb(); a['absorb'] = write_anim(P, 'absorb', f, ms, anchor=travel_anchor, kind='travel',
        notes='20 light motes stream from the foe along the arc into the crystal; the rune ring shrinks and follows the light to the crystal. CODE: dissolve the foe sprite with the 4x4 Bayer schedule hooks.foe_dissolve (pixels removed this frame are drawn d6acff for one frame); foe hidden from frame 8.')
    f4, ms4 = pulses(4)
    for n in (1, 2, 3, 4):
        a[f'pulse_{n}'] = write_anim(P, f'pulse_{n}', f4[:4 * n], ms4[:4 * n], anchor=hold_anchor,
            notes=f'{n} pulse(s) of the crystal in the trainer\'s hands (600 ms each); the 6 runes close in each pulse (radius 20 -> {RUNE_R[n]}). Variant {n} == first {4 * n} frames of variant 4.')
    f, ms = success(); a['success'] = write_anim(P, 'lock_bloom', f, ms, anchor=hold_anchor,
        notes='Runes lock onto the crystal (f0-1, gold lock ring on f1), then the crystal blooms into 6 facet petals (f2-4) and settles bound (f5 hold). Chime cues f1 + f4. No click, no stars.')
    for kind in ('generic', 'fire', 'water', 'wind'):
        f, ms = breakout(kind); a['break_' + kind] = write_anim(P, f'breakout_{kind}', f, ms, anchor=travel_anchor, kind='travel',
            notes=f'Crystal cracks with light (f0), the light bursts out (f1), streams back along the arc (f2-5), the creature re-forms with a {kind} release (f6-9). CODE: reveal the foe with hooks.foe_reform on f6-9; crystal stays in the hands, dim. ' + ('Fire = flame tongues + ember sparks only, no smoke/haze.' if kind == 'fire' else ''))
    CODER_STEP = {'raise': 'raise', 'beam': 'beam', 'absorb': 'absorb', 'pulse_1': 'pulse(1)', 'pulse_2': 'pulse(2)', 'pulse_3': 'pulse(3)', 'pulse_4': 'pulse(4)', 'lock_bloom': 'lock/bloom',
                  'breakout_generic': 'breakout', 'breakout_fire': 'breakout (fire elements)', 'breakout_water': 'breakout (water elements)', 'breakout_wind': 'breakout (wind elements)'}
    hooks = dict(
        sequence=['raise @ HOLD', 'beam (travel canvas)', 'absorb (travel canvas) + foe_dissolve', 'pulse_<N> @ HOLD (N = 1..4 by catch odds)', 'lock_bloom @ HOLD OR breakout_<type> (travel canvas) + foe_reform'],
        pulse_variants=dict(names=['pulse_1', 'pulse_2', 'pulse_3', 'pulse_4'], pulses=[1, 2, 3, 4], ms_per_pulse=600,
                            prefix_rule='variant N is exactly the first 4N frames of variant 4, so code may also play pulse_4 and stop after pulse N',
                            choose_by_odds='each pulse is one capture check: pulse k plays only if checks 1..k passed. Fail after pulse N -> breakout_<type>; pass all 4 -> lock_bloom. Game dev may instead pick N straight from the odds tier (low 1, mid 2-3, high 4) if the formula changes.'),
        anchors=dict(
            crystal_hold_player_back=dict(screen_pilot=list(HOLD), sprite_px='TBD by Character models: the raised-hands point in each player back-sprite raise frame (x, y in sprite px)', note='No player back sprite exists yet; HOLD (64,128) is a pilot placeholder above a bottom-left trainer.'),
            crystal_hold_trainer_front=dict(sprite_px_64x128_provisional=[32, 4], note='For NPC trainers (64x128 front sprites, head top at y~2): hands meet above the head; crystal centre ~10 px above the hands. Replace with the per-frame point from the raise frames.'),
            foe=dict(screen_pilot=list(FOE_CENTER), rule='foe sprite visual centre; rune ring radii 34 x 30 px around it')),
        foe_dissolve=dict(anim='absorb', frames=list(range(ABS_N)), removed_fraction=DISSOLVE, method='4x4 Bayer (fxx_lib.bayer_fade) keyed to the sprite top-left; draw pixels removed THIS frame as d6acff for one frame (turning into light)'),
        foe_reform=dict(anim='breakout_<type>', frames=[6, 7, 8, 9], hidden_fraction=REFORM, method='reverse Bayer; play the cry on frame 6; battle shake (soul/battle_feedback shake strong_hit) optional on frame 6'),
        breakout_type_by_element=bmap,
        guardian_note='Guardians have very low odds: usually 1 pulse then the generic or element break-out.',
        reduced_motion=dict(raise_glow='frames 0,4,6 (200 ms each)', reach='frames 5,9 (300 ms)', absorb='frames 0,4,8 (250 ms) with the foe dissolve at the same steps', pulse='keep the pulse count but show only frames 1 and 3 of each pulse (300 ms each)', success='frames 1,5', breakout='frames 0,5,9'),
        sfx_cues={'raise': 4, 'beam': 0, 'absorb': [0, 8], 'pulse_N': [0, 4, 8, 12], 'lock_bloom': dict(lock=1, bloom_chime=4), 'breakout_<type>': 1},
        coder_step_map=CODER_STEP,
        per_anim_json='capture/<name>/<name>_battle_2x.json (same style as the live effects/*_battle_2x.json: 2x frame rects, ms, total_ms, anchor + hand/foe anchor hooks)',
        audio_note='Pulse + chime sounds must be original and checked by ear by Audio (no click-lock or familiar jingle).',
        trainer_pose_request='Character models: supply raised-arm frames (see README) - this piece does NOT redraw trainers.',
        layering='capture sprites draw above both trainer and foe, below the HP boxes/UI')
    write_battle_jsons(a, hooks, CODER_STEP)
    # ---------- previews on the pilot screen ----------
    bg = clean_battle_bg(None); foe = creature_battle('emberlunx', 'front'); fh, fw = foe.shape[:2]
    fx0, fy0 = FOE_GROUND[0] - fw // 2, FOE_GROUND[1] - (fh - 3)
    def hands(im):   # PREVIEW-ONLY placeholder for the trainer's raised hands (grey mitts, not art)
        im = im.copy(); h = blank(24, 14)
        for dx in (0, 14):
            disc(h, 4 + dx, 6, 4, 'a8a0a4'); line(h, 2 + dx, 10, 2 + dx, 13, '827a84'); line(h, 6 + dx, 10, 6 + dx, 13, '827a84')
        h = outline(h, INK); return comp(im, h, HOLD[0] - 12, HOLD[1] + 4)
    base = hands(bg)
    def with_foe(im, hidden=0.0, prev_hidden=None):
        f = bayer_fade(foe, hidden) if hidden > 0 else foe.copy()
        if prev_hidden is not None and hidden > prev_hidden:
            was = bayer_fade(foe, prev_hidden); edge = (was[..., 3] > 0) & (f[..., 3] == 0); f[edge] = H('d6acff')
        return comp(im, f, fx0, fy0)
    def on_hold(im, fr): return comp(im, fr, HOLD[0] - 32, HOLD[1] - 32)
    def on_travel(im, fr): return comp(im, fr, *TRAVEL_OFF)
    seq, sms = [], []
    for i, fr in enumerate(a['raise']['_frames']): seq.append(on_hold(with_foe(base), fr)); sms.append(a['raise']['ms_per_frame'][i])
    for i, fr in enumerate(a['reach']['_frames']): seq.append(on_travel(with_foe(base), fr)); sms.append(a['reach']['ms_per_frame'][i])
    for i, fr in enumerate(a['absorb']['_frames']):
        seq.append(on_travel(with_foe(base, DISSOLVE[i], DISSOLVE[i - 1] if i else None), fr)); sms.append(a['absorb']['ms_per_frame'][i])
    pre = list(seq), list(sms)
    succ, ss = list(seq), list(sms)
    for i, fr in enumerate(a['pulse_4']['_frames']): succ.append(on_hold(base, fr)); ss.append(a['pulse_4']['ms_per_frame'][i])
    for i, fr in enumerate(a['success']['_frames']): succ.append(on_hold(base, fr)); ss.append(a['success']['ms_per_frame'][i])
    preview_gif(P, 'capture_full_success', succ, ss)
    for kind in ('generic', 'fire', 'water', 'wind'):
        br, bms = list(pre[0]), list(pre[1])
        for i, fr in enumerate(a['pulse_2']['_frames']): br.append(on_hold(base, fr)); bms.append(a['pulse_2']['ms_per_frame'][i])
        m = a['break_' + kind]
        for i, fr in enumerate(m['_frames']):
            hid = 1.0 if i < 6 else REFORM[i - 6]
            br.append(on_travel(with_foe(base, hid) if hid < 1 else base, fr)); bms.append(m['ms_per_frame'][i])
        br += [with_foe(base)] * 2; bms += [300, 300]
        preview_gif(P, f'capture_full_breakout_{kind}', br, bms)
    # key-frame strip of the full success sequence + contact of hold-point anims
    keys = [succ[k] for k in (4, len(a['raise']['_frames']) + 5, len(a['raise']['_frames']) + 10 + 4, len(pre[0]) - 1, len(pre[0]) + 5, len(succ) - 3, len(succ) - 1)]
    preview_png(P, 'capture_success_keyframes', contact([keys[:4], keys[4:]]))
    grass = bg[150:214, 20:84]
    rows = [[comp(grass, f, 0, 0) for f in a[k]['_frames']] for k in ('raise', 'pulse_4', 'success')]
    preview_png(P, 'capture_contact', contact(rows))
    # ---------- ToD checks ----------
    tod = {}
    hold_bg = base[HOLD[1] - 32:HOLD[1] + 32, HOLD[0] - 32:HOLD[0] + 32].copy()
    tod['raise'] = tod_check(P, 'raise', hold_bg, [(a['raise'], 0, 0)])
    bgf = with_foe(base)
    tod['reach'] = tod_check(P, 'beam', bgf[40:216, 40:280].copy(), [(a['reach'], 0, 0)])
    tod['absorb'] = tod_check(P, 'absorb', bgf[40:216, 40:280].copy(), [(a['absorb'], 0, 0)])
    tod['pulse_4'] = tod_check(P, 'pulse_4', hold_bg, [(a['pulse_4'], 0, 0)])
    tod['success'] = tod_check(P, 'lock_bloom', hold_bg, [(a['success'], 0, 0)])
    for kind in ('generic', 'fire', 'water', 'wind'):
        tod['break_' + kind] = tod_check(P, f'breakout_{kind}', base[40:216, 40:280].copy(), [(a['break_' + kind], 0, 0)])
    about = ('Hold-up / absorb capture for the dominance crystal (SOUL_PLAYBOOK 5.3 as updated Oct 22 2026; MECHANICS_PARITY item 5, B17). '
             'The trainer raises the crystal overhead, it glows, violet runes and a beam reach the foe, the foe dissolves into light motes that stream into the held crystal, '
             'the crystal pulses 1-4 times in the hands while the runes close in, then the runes lock and the crystal blooms (success) or the light bursts back out and re-forms the creature (break-out). '
             'No throw, no drop, no wobble, no click, no stars. New crystal shape: tall gem in a three-prong top setting, no middle band. Overlay FX + hook points only; trainer sprites are not redrawn.')
    print(dump_piece(P, about, hooks, tod))
    for k, v in tod.items(): print(k, v['readable_fraction'], v['passed'])
if __name__ == '__main__':
    sys.path.insert(0, PIX + '/effects/_tools'); main()
