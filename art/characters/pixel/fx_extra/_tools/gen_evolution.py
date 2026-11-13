"""evolution (Animator DRAFT, IP redesign Oct 22 2026 CT): GENERIC overlay for any evolution (no redrawn creatures).
Crystal veins grow out of the creature's crystal across its body in its Warmth colour family (steady build), the new form is
revealed with an ordered-dither front spreading outward from the crystal point, and a ring burst limited to the sprite area
closes it. No silhouette swap, no white flicker, no full-screen flash. Every timed step is >= 167 ms (photosensitivity floor)."""
import sys, os, json, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fxx_lib import *
P = 'evolution'
FIELD = 256; C0 = FIELD // 2          # vein / reveal field: 256x256, crystal point at (128,128) -> covers any 128 sprite
SRC = VIO                             # authored in the Warmth source ramp; code recolours with the creature's family

def vein_field(seed=7):
    """branching vein tree from the centre; returns dist array (path length from centre, inf = no vein)."""
    R = random.Random(seed); d = np.full((FIELD, FIELD), np.inf)
    stack = [(C0, C0, a, 0.0, 0, R.uniform(70, 118)) for a in [k * 2 * math.pi / 7 + R.uniform(-0.3, 0.3) for k in range(7)]]
    while stack:
        x, y, a, s, depth, L = stack.pop()
        while s < L:
            a += R.uniform(-0.28, 0.28); x += math.cos(a); y += math.sin(a); s += 1
            ix, iy = int(round(x)), int(round(y))
            if not (0 <= ix < FIELD and 0 <= iy < FIELD): break
            d[iy, ix] = min(d[iy, ix], s)
            if depth < 3 and R.random() < 0.035:
                stack.append((x, y, a + R.choice((-1, 1)) * R.uniform(0.5, 1.0), s, depth + 1, s + (L - s) * R.uniform(0.4, 0.8)))
    return d
DIST = vein_field()
def veins(R, dim=0):
    """veins grown to path length R. Tip bright, older parts settle darker. dim shifts every tone one step darker."""
    cv = blank(FIELD, FIELD); age = R - DIST; on = age >= 0
    tone = np.where(age < 3, 5, np.where(age < 10, 4, np.where(age < 30, 3, 2))) - dim
    tone = np.clip(tone, 1, 5)
    for t in range(1, 6):
        m = on & (tone == t); cv[m] = H(SRC[t])
    return cv

GROW_R = [8, 18, 28, 40, 52, 64, 76, 88, 100, 118]
def grow(): return [veins(r) for r in GROW_R], [200] * len(GROW_R)
def hold(): return [veins(130), veins(130, dim=1)], [333, 333]

YY, XX = np.mgrid[0:FIELD, 0:FIELD]; RAD = np.hypot(XX - C0, YY - C0)
BAY = np.tile(BAYER, (FIELD // 4, FIELD // 4)) / 16.0
REVEAL_R = [16, 32, 48, 64, 80, 96, 112, 128, 144, 160]   # reveal radius in px from the crystal point per reveal frame
def reveal():
    """dithered light front at the reveal radius (code reveals the new sprite inside it; see hooks.reveal)."""
    fr = []
    for r in REVEAL_R:
        cv = blank(FIELD, FIELD); band = np.abs(RAD + (BAY - 0.5) * 12 - r)
        cv[(band < 5) & (BAY < 0.5)] = H(SRC[3]); cv[(band < 3) & (BAY < 0.75)] = H(SRC[4]); cv[band < 1.2] = H(SRC[5])
        v = veins(130, dim=1); m = (RAD > r + 4) & (v[..., 3] > 0); cv[m] = v[m]       # veins remain outside the front
        fr.append(cv)
    return fr, [167] * len(REVEAL_R)
def burst():
    """128x128, centre = crystal point; rings stay inside the sprite area (max r 40)."""
    fr = []; c = 64
    for i, r in enumerate([8, 16, 24, 32, 40]):
        g = blank(128, 128)
        ring(g, c, c, r, SRC[4] if i < 3 else SRC[3], step=2 if i < 2 else 3, gap=1 if i < 2 else 2, phase=i)
        if r > 10: ring(g, c, c, r - 5, SRC[3] if i < 3 else SRC[2], step=1, gap=3, phase=i)
        if i <= 3:
            for k in range(6):
                a = k * math.pi / 3 + i * 0.2; x, y = c + math.cos(a) * (r + 3), c + math.sin(a) * (r + 3)
                poly(g, [(x, y - 3), (x + 2, y), (x, y + 3), (x - 2, y)], SRC[3]); px(g, x, y, SRC[5])
        fr.append(outline(g, INK))
    return fr, [167, 167, 167, 200, 233]
def cancel():
    rs = [118, 90, 64, 40, 18, 0]
    return [veins(r, dim=min(2, k // 2)) if r else blank(FIELD, FIELD) for k, r in enumerate(rs)], [167] * 6
def reduced():
    return [veins(130, dim=1), veins(130, dim=1)], [600, 600]

def recolor_to(a, table):
    out = a.copy(); k = (a[..., 0].astype(int) << 16) | (a[..., 1].astype(int) << 8) | a[..., 2]
    for s, d in table.items():
        m = (k == int(s.lstrip('#'), 16)) & (a[..., 3] > 0); out[m, :3] = [int(d.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)]
    return out

def main():
    a = {}
    fan = dict(canvas_px=[C0, C0], meaning='crystal point of the CURRENT (old) sprite frame (warmth_stage_up/crystal_anchors.json centroid; sprite centre if null)')
    f, ms = grow(); a['grow'] = write_anim(P, 'evo_veins_grow', f, ms, anchor=fan,
        notes='Steady build: crystal veins grow out from the crystal point along a branching path (tip bright, older veins settle). CODE: recolour (hooks.family_recolour) and draw ONLY where the old sprite is opaque.')
    f, ms = hold(); a['hold'] = write_anim(P, 'evo_veins_hold', f, ms, anchor=fan, loop=True,
        notes='Full vein net, slow two-step glow (333 ms steps) while the text "{old} is changing..." waits. Masked + recoloured like evo_veins_grow.')
    f, ms = reveal(); a['reveal'] = write_anim(P, 'evo_reveal_front', f, ms, anchor=fan,
        notes='Ordered-dither light front spreading outward from the crystal point. CODE: inside the front show the NEW sprite (hooks.reveal), outside it the old sprite + veins. Mask the front to the union of both sprites.')
    f, ms = burst(); a['burst'] = write_anim(P, 'evo_ring_burst', f, ms, anchor=dict(canvas_px=[64, 64], meaning='crystal point of the NEW sprite'),
        notes='Ring burst around the new crystal, max radius 40 px: stays inside the sprite area (clip to the new sprite bbox + 8 px). Not full-screen.')
    f, ms = cancel(); a['cancel'] = write_anim(P, 'evo_cancel', f, ms, anchor=fan,
        notes='Player cancelled: veins recede back into the crystal and dim; the old sprite is untouched throughout.')
    f, ms = reduced(); a['rm'] = write_anim(P, 'evo_reduced_motion', f, ms, anchor=fan,
        notes='Reduced motion: no growth, no front, no burst. Show the full static vein net 1200 ms, then reveal the new sprite in 2 steps (Bayer 50% for 333 ms, then 100%).')
    hooks = dict(
        text=dict(start='{old} is changing...', end='{old} became {new}!', note='old evolution text line removed in this redesign'),
        sequence=['old sprite normal + text "{old} is changing..."', 'evo_veins_grow (masked to old sprite, family recolour)', 'evo_veins_hold loop until the text is dismissed (B cancels -> evo_cancel)',
                  'evo_reveal_front: new form revealed outward from the crystal point', 'evo_ring_burst at the new crystal point', 'new sprite normal + original jingle + text "{old} became {new}!"'],
        family_recolour=dict(table='art/characters/pixel/warmth/warmth_tints.json creatures.<old>.stages["3"] (the family colours, e.g. ember/tide/moss)', apply_to='every overlay pixel (exact #rrggbb match, authored in the source ramp 3a1e60..f4e2ff)', fallback='no Warmth entry -> keep violet'),
        mask='veins and the reveal front draw only where the old (or, for the front, old OR new) sprite is opaque; anchor both sprites by their battle bottom-centre anchor',
        reveal=dict(rule='new pixel shown where dist(p, crystal_point) + (bayer4(p)/16 - 0.5)*12 < REVEAL_R[frame]; else old pixel', REVEAL_R=REVEAL_R, stop_rule='play evo_reveal_front frames until REVEAL_R[frame] >= R_max + 6, then go to evo_ring_burst (R_max = max distance from the crystal point to any opaque pixel of either sprite)', bayer='4x4 ordered (fxx_lib.BAYER) keyed to the field (crystal point = field centre)'),
        cancel='B at any point before evo_reveal_front -> evo_cancel; after the reveal starts it cannot be cancelled',
        photosensitivity='Every timed step in every anim is >= 167 ms (<= 6 changes per second). No full-screen flash, no white silhouette, no alternation between the two forms. The burst stays inside the sprite area.',
        warmth_cosmic='after the swap the new sprite gets the same Warmth stage and Cosmic flag (apply palette swaps before the ToD grade)',
        reduced_motion='evo_reduced_motion replaces grow/hold/reveal/burst; text hooks unchanged',
        audio_note='The evolution jingle must be original; Audio checks it by ear.')
    bg = clean_battle_bg(None)
    def place(spr):
        h, w = spr.shape[:2]; return FOE_GROUND[0] - w // 2, FOE_GROUND[1] - (h - 3)
    old = creature_battle('cindrip', 'front'); new = creature_battle('emberlunx', 'front')
    anc = json.load(open(FXX + '/warmth_stage_up/crystal_anchors.json'))['creatures']
    co = anc['cindrip']['sprites']['battle/cindrip_front_128.png']['centroid']; cn = anc['emberlunx']['sprites']['battle/emberlunx_front_128.png']['centroid']
    fam = {k: v for k, v in warmth()['creatures']['cindrip']['stages']['3'].items()}
    ox, oy = place(old); nx, ny = place(new); cx, cy = ox + co[0], oy + co[1]
    so = np.zeros((240, 320), bool); so[oy:oy + 128, ox:ox + 128] = old[..., 3] > 0
    sn = np.zeros((240, 320), bool); sn[ny:ny + 128, nx:nx + 128] = new[..., 3] > 0
    def field_on_screen(f, mask):
        """recolour + place a 256 field at the crystal point + clip to mask -> 320x240 overlay."""
        f = recolor_to(f, fam); out = blank(320, 240); x0, y0 = cx - C0, cy - C0
        sx0, sy0 = max(0, -x0), max(0, -y0); dx0, dy0 = max(0, x0), max(0, y0)
        w = min(FIELD - sx0, 320 - dx0); h = min(FIELD - sy0, 240 - dy0)
        out[dy0:dy0 + h, dx0:dx0 + w] = f[sy0:sy0 + h, sx0:sx0 + w]; out[~mask] = 0; return out
    scr_old = comp(bg, old, ox, oy); scr_new = comp(bg, new, nx, ny)
    yy, xx = np.mgrid[0:240, 0:320]; dist = np.hypot(xx - cx, yy - cy); Rm = dist[so | sn].max()
    bay = np.tile(BAYER, (60, 80)) / 16.0
    def mixed(k):
        show_new = (dist + (bay - 0.5) * 12) < REVEAL_R[k]
        im = bg.copy(); o = comp(bg, old, ox, oy); n = comp(bg, new, nx, ny)
        im[~show_new] = o[~show_new]; im[show_new] = n[show_new]; return im
    seq, sms = [scr_old], [900]
    G = [field_on_screen(f, so) for f in a['grow']['_frames']]
    for i, g in enumerate(G): seq.append(comp(scr_old, g, 0, 0)); sms.append(a['grow']['ms_per_frame'][i])
    Hd = [field_on_screen(f, so) for f in a['hold']['_frames']]
    for r in range(2):
        for i, g in enumerate(Hd): seq.append(comp(scr_old, g, 0, 0)); sms.append(333)
    NREV = next((k for k, r in enumerate(REVEAL_R) if r >= Rm + 6), len(REVEAL_R) - 1) + 1; print("R_max", round(Rm), "reveal frames", NREV)
    Rv = [field_on_screen(f, so | sn) for f in a['reveal']['_frames'][:NREV]]
    for k, g in enumerate(Rv): seq.append(comp(mixed(k), g, 0, 0)); sms.append(167)
    bcx, bcy = nx + cn[0], ny + cn[1]
    for i, b in enumerate(a['burst']['_frames']):
        bb = recolor_to(b, fam); clip = blank(320, 240); clip = comp(clip, bb, bcx - 64, bcy - 64)
        y0, y1 = max(0, ny - 8), ny + 136; x0, x1 = max(0, nx - 8), nx + 136
        m = np.zeros((240, 320), bool); m[y0:y1, x0:x1] = True; clip[~m] = 0
        seq.append(comp(scr_new, clip, 0, 0)); sms.append(a['burst']['ms_per_frame'][i])
    seq.append(scr_new); sms.append(1400)
    preview_gif(P, 'evolution_cindrip_to_emberlunx', seq, sms)
    keys = [seq[k] for k in (0, 3, 7, 10, 13, 16, 18, len(seq) - 5, len(seq) - 1)]
    preview_png(P, 'evolution_keyframes', contact([[k[20:170, 150:310] for k in keys[:5]], [k[20:170, 150:310] for k in keys[5:]]]))
    Cn = [field_on_screen(f, so) for f in a['cancel']['_frames']]
    cseq = [comp(scr_old, Hd[0], 0, 0)] + [comp(scr_old, g, 0, 0) for g in Cn] + [scr_old]
    preview_gif(P, 'evolution_cancel_cindrip', cseq, [333] + a['cancel']['ms_per_frame'] + [900])
    Rm_ = [field_on_screen(f, so) for f in a['rm']['_frames']]
    rseq = [scr_old, comp(scr_old, Rm_[0], 0, 0), comp(scr_old, Rm_[1], 0, 0)]
    half = scr_old.copy(); hm = bay < 0.5; half[hm] = scr_new[hm]
    rseq += [half, scr_new]; preview_gif(P, 'evolution_reduced_motion_cindrip', rseq, [600, 600, 600, 333, 1400])
    # ToD checks on the real screen region, with the family recolour + mask (what the player sees)
    def meta(frames, ms, em=True): return dict(frames=len(frames), _frames=frames, _em=em, ms_per_frame=ms)
    Y0, X0 = 20, 150
    crop = lambda L: [g[Y0:Y0 + 150, X0:X0 + 160].copy() for g in L]
    tod = {}
    tod['veins_grow'] = tod_check(P, 'evo_veins_grow', scr_old[Y0:Y0 + 150, X0:X0 + 160].copy(), [(meta(crop(G), a['grow']['ms_per_frame']), 0, 0)])
    tod['veins_hold'] = tod_check(P, 'evo_veins_hold', scr_old[Y0:Y0 + 150, X0:X0 + 160].copy(), [(meta(crop(Hd), [333, 333]), 0, 0)])
    tod['reveal'] = tod_check(P, 'evo_reveal_front', mixed(3)[Y0:Y0 + 150, X0:X0 + 160].copy(), [(meta(crop(Rv), [167] * len(Rv)), 0, 0)])
    tod['cancel'] = tod_check(P, 'evo_cancel', scr_old[Y0:Y0 + 150, X0:X0 + 160].copy(), [(meta(crop(Cn[:-1]), [167] * 5), 0, 0)])
    tod['rm'] = tod_check(P, 'evo_reduced_motion', scr_old[Y0:Y0 + 150, X0:X0 + 160].copy(), [(meta(crop(Rm_), [600, 600]), 0, 0)])
    bur = [recolor_to(b, fam) for b in a['burst']['_frames']]
    tod['burst'] = tod_check(P, 'evo_ring_burst', scr_new[bcy - 64:bcy + 64, bcx - 64:bcx + 64].copy() if bcx >= 64 else scr_new[:128, :128].copy(), [(meta(bur, a['burst']['ms_per_frame']), 0, 0)])
    for k in tod: tod[k]['context'] = 'cindrip -> emberlunx on the pilot screen, overlay recoloured to the ember family and masked to the sprite (as the game would draw it)'
    about = ('Generic evolution overlay (MECHANICS_PARITY evolution), IP redesign Oct 22 2026: crystal veins grow from the creature\'s crystal across its body in its Warmth family colours, '
             'an ordered-dither front reveals the new form outward from the crystal point, and a ring burst stays inside the sprite area. No silhouette swap, no white flicker, no full-screen flash; every step >= 167 ms. '
             'Works for every creature: code masks/recolours the overlay with the existing sprites; nothing is redrawn per creature.')
    print(dump_piece(P, about, hooks, tod))
    for k, v in tod.items(): print(k, v['readable_fraction'], v['passed'])
if __name__ == '__main__': main()
