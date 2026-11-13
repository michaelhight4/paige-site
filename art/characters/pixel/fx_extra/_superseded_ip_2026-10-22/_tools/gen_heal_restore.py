"""heal_restore (Animator DRAFT): heal-machine slot lights, screen pulse, recal ping, and the Warmth
crystal flash / Bayer seep-back schedule. Overlays only; machine tiles belong to World (read-only)."""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(__file__))
from fxx_lib import *
P = 'heal_restore'
SLOTS = [(20, 24), (33, 24), (46, 24), (20, 39), (33, 39), (46, 39)]   # centres on heal_machine_1_0 (11x11 circles)
EYE = (32, 51)                                                       # crystal eye centre on heal_machine_0_0
PARTY = ['cindrip', 'rillop', 'bastonox', 'halovy', 'gloamtick', 'sailquill']
STAGE = {'cindrip': 3, 'rillop': 2, 'bastonox': 3, 'halovy': 1, 'gloamtick': 3, 'sailquill': 2}

def glyph_crystal(cv, cx, cy, hi, mid, lo):
    """5x7 faceted crystal, 1px INK outline."""
    pts = {(0, -3): hi, (-1, -2): hi, (0, -2): hi, (1, -2): mid, (-2, -1): hi, (-1, -1): hi, (0, -1): mid, (1, -1): mid, (2, -1): lo,
           (-2, 0): hi, (-1, 0): mid, (0, 0): mid, (1, 0): lo, (2, 0): lo, (-1, 1): mid, (0, 1): lo, (1, 1): lo, (0, 2): lo, (0, 3): lo}
    g = blank(cv.shape[1], cv.shape[0])
    for (dx, dy), c in pts.items(): px(g, cx + dx, cy + dy, c)
    return paste(cv, outline(g, INK), 0, 0)

def slot_empty():
    cv = blank(11, 11); disc(cv, 5, 5, 5, '3a1e60')
    for y in range(11):
        for x in range(11):
            if cv[y, x, 3] and (x + y) % 2 == 0 and (x - 5) ** 2 + (y - 5) ** 2 <= 9: px(cv, x, y, '603096')
    return [cv]
def slot_place():
    fr = []
    a = blank(11, 11); disc(a, 5, 5, 5, WARM_HI); disc(a, 5, 5, 3, 'f4e2ff'); fr.append(a)
    b = blank(11, 11); disc(b, 5, 5, 5, 'd6acff'); b = glyph_crystal(b, 5, 4, 'f4e2ff', 'd6acff', 'b076ec'); fr.append(b)
    c = blank(11, 11); disc(c, 5, 5, 5, 'b076ec'); c = glyph_crystal(c, 5, 5, 'f4e2ff', 'd6acff', 'b076ec'); fr.append(c)
    d = blank(11, 11); disc(d, 5, 5, 5, '8a4ace'); d = glyph_crystal(d, 5, 5, 'd6acff', 'b076ec', '8a4ace'); fr.append(d)
    return fr, [60, 60, 80, 120]
def slot_flash():
    a = blank(11, 11); disc(a, 5, 5, 5, 'd6acff'); a = glyph_crystal(a, 5, 5, WARM_HI, 'f4e2ff', 'd6acff')
    b = blank(11, 11); disc(b, 5, 5, 5, '603096'); b = glyph_crystal(b, 5, 5, 'd6acff', 'b076ec', '8a4ace')
    return [a, b], [125, 125]
def screen_pulse():
    fr = []
    for i in range(2):
        cv = blank(64, 64)
        if i == 0:
            ring(cv, *EYE, 12, 'd6acff'); ring(cv, *EYE, 11, 'b076ec', step=2, gap=2)
            for dx, dy in ((0, -15), (-15, 0), (15, 0)): star4(cv, EYE[0] + dx, EYE[1] + dy, 1)
        else:
            ring(cv, *EYE, 12, 'd6acff', step=1, gap=2)
        fr.append(cv)
    return fr, [125, 125]
def recal_ping():
    fr = []
    for i in range(8):
        cv = blank(32, 32); c = 16
        if i <= 5: ring(cv, c, c, [3, 6, 9, 12, 14, 15][i], ['f4e2ff', 'd6acff', 'd6acff', 'b076ec', '8a4ace', '603096'][i], step=2 if i > 2 else 1, gap=0 if i <= 2 else 1, phase=i)
        s = [1, 3, 3, 2, 2, 1, 1, 0][i]; star4(cv, c, c, s, ink=INK if s else None)
        if 2 <= i <= 6:
            for k in range(4):
                a = k * math.pi / 2 + math.pi / 4 + i * 0.2; rr = 4 + i * 2
                star4(cv, c + math.cos(a) * rr, c + math.sin(a) * rr, 1 if i < 5 else 0, ink=INK if i < 5 else None)
        fr.append(cv)
    return fr, [50, 50, 60, 60, 70, 80, 90, 120]

def main():
    a = {}
    a['slot_empty'] = write_anim(P, 'heal_slot_empty', slot_empty(), [400], anchor=dict(canvas_px=[5, 5], meaning='slot centre; slot centres on heal_machine_1_0 = ' + str(SLOTS)), kind='state_frames', emissive=False,
        notes='Optional: covers an unused slot (party < 6) so only filled slots glow. Static.')
    f, ms = slot_place(); a['slot_place'] = write_anim(P, 'heal_slot_place', f, ms, anchor=dict(canvas_px=[5, 5], meaning='slot centre'),
        notes='One party crystal set into slot k: pop -> settle. Hold frame 3 until all slots are placed.')
    f, ms = slot_flash(); a['slot_flash'] = write_anim(P, 'heal_slot_flash', f, ms, anchor=dict(canvas_px=[5, 5], meaning='slot centre'), loop=True,
        notes='All filled slots alternate in company violet at 125 ms (4 cycles = 1 s). Same timing as the party crystal flash.')
    f, ms = screen_pulse(); a['screen_pulse'] = write_anim(P, 'heal_screen_pulse', f, ms, anchor=dict(canvas_px=[0, 0], meaning='top-left of heal_machine_0_0 tile'), loop=True,
        notes='Ring around the machine eye, in phase with heal_slot_flash.')
    f, ms = recal_ping(); a['recal_ping'] = write_anim(P, 'heal_recal_ping', f, ms, anchor=dict(canvas_px=[16, 16], meaning='centre on the machine eye (tile 0_0 px ' + str(list(EYE)) + ') at the end of the flash'),
        notes='"Recalibrated" ping when healing ends. Play the done jingle on frame 0.')
    # Bayer seep table (4x4, 16 levels -> 8 steps of 2 levels)
    seep = np.array(BAYER, 'uint8'); Image.fromarray((seep * 16).astype('uint8'), 'L').save(f'{FXX}/{P}/bayer4_seep.png')
    hooks = dict(
        sequence=[
            'nurse line ends -> for k in 0..party-1: heal_slot_place at SLOTS[k], 200 ms apart (place SFX each)',
            'unused slots: heal_slot_empty (optional)',
            'flash: heal_slot_flash on filled slots + heal_screen_pulse + party_crystal_flash, 8 x 125 ms = 1000 ms',
            'heal_recal_ping at the eye, then party_seep_back over 2000 ms (runs after the screen fades back in; can overlap the party menu)'],
        slot_centres_on_heal_machine_1_0=SLOTS, eye_centre_on_heal_machine_0_0=list(EYE),
        machine_tiles='heal_machine (1x2: heal_machine_0_0 top, heal_machine_1_0 bottom); i_heal_machine 2x2 variant needs its own offsets (not measured)',
        party_crystal_flash=dict(
            what='every party creature sprite/icon: crystal-mask pixels only (warmth/masks/<creature>/<same rel path>)',
            schedule_ms=[125] * 8, pattern=['company', 'bright'] * 4,
            company='draw the crystal pixels with Warmth stage 0 colours (the unswapped source ramp 3a1e60..f4e2ff)',
            bright="fill crystal pixels with 'd6acff' (pixels that are 'f4e2ff' in the source stay 'f4e2ff')",
            meaning='the company machine briefly re-asserts control: the light snaps back to company violet'),
        party_seep_back=dict(
            what='crystal pixels go from stage 0 back to the creature\'s CURRENT Warmth stage, ordered-dither, never a colour blend',
            steps=8, step_ms=250, total_ms=2000, table=rel(f'{FXX}/{P}/bayer4_seep.png') + ' (4x4, value/16 = Bayer level 0..15)',
            rule='at step s (1..8) a crystal pixel at sprite-local (x,y) shows the warm colour if BAYER[y%4][x%4] < 2*s, else stage 0. Key the pattern to sprite-local coordinates so it does not crawl when the sprite moves.',
            stage0_creatures='stage 0 creatures: skip the seep (nothing to return to)'),
        interiors='heal centres are interiors: they stay on the DAY grade (club_int is the only interior on the clock). ToD strips below grade them as outdoors anyway, as a worst case.',
        reduced_motion='replace the 125 ms alternation with one 1000 ms hold of the bright state; seep-back in 4 steps of 500 ms',
        photosensitivity='the flash is small (slots + crystal pixels), not full-screen; 4 Hz alternation is fine for small areas')
    # ---- previews: room + party strip
    room = ow_bg(['floor_tile_heal', 'heal_machine_0_0', 'floor_tile_heal', 'floor_tile_heal', 'heal_machine_1_0', 'floor_tile_heal'], 3, 2, under='floor_tile_heal')
    icons, masks = [], []
    for n in PARTY:
        ic = load(f'{PIX}/icons/{n}_icon_f0.png'); m = np.array(Image.open(f'{PIX}/warmth/masks/{n}/icons/{n}_icon_f0.png').convert('L')) > 0
        icons.append(ic); masks.append(m)
    def party(state, step=0):
        strip = blank(6 * 34, 34); strip[..., :3] = H('2a2638')[:3] if False else strip[..., :3]; strip[...] = H('2a2a3a') if False else strip
        strip[..., 3] = 255; strip[..., :3] = (42, 38, 56)
        for j, (n, ic, m) in enumerate(zip(PARTY, icons, masks)):
            st = STAGE[n]; warm = warmth_swap(ic, n, st, m)
            if state == 'warm': s = warm
            elif state == 'company': s = ic
            elif state == 'bright':
                s = ic.copy(); k = keys(ic); mm = m & (ic[..., 3] > 0) & (k != int('f4e2ff', 16)); s[mm] = H('d6acff')
            else:  # seep
                th = np.tile(BAYER, (9, 9))[:32, :32]; use = th < 2 * step
                s = ic.copy(); s[use] = warm[use]
            strip = comp(strip, s, j * 34 + 1, 1)
        return strip
    seq, sms = [], []
    def frame(slot_states, scr, ping, pstate, step=0):
        im = room.copy()
        for k, (st, fi) in enumerate(slot_states):
            if st is None: continue
            f = a[st]['_frames'][fi]; im = comp(im, f, 64 + SLOTS[k][0] - 5, 64 + SLOTS[k][1] - 5)
        if scr is not None: im = comp(im, a['screen_pulse']['_frames'][scr], 64, 0)
        if ping is not None: im = comp(im, a['recal_ping']['_frames'][ping], 64 + EYE[0] - 16, EYE[1] - 16)
        out = blank(192, 128 + 36); out[..., 3] = 255; out[..., :3] = (42, 38, 56); out[:128] = im
        out[130:164, :] = party(pstate, step)[:, :192] if True else 0
        return out
    states = [(None, 0)] * 6
    seq.append(frame(states, None, None, 'warm')); sms.append(400)
    for k in range(6):
        for fi in range(4):
            states[k] = ('slot_place', fi); seq.append(frame(states, None, None, 'warm')); sms.append(a['slot_place']['ms_per_frame'][fi])
        sms[-1] = 200 - sum(a['slot_place']['ms_per_frame'][:3]) if False else sms[-1]
    for c in range(8):
        st = [('slot_flash', c % 2)] * 6
        seq.append(frame(st, c % 2, None, 'bright' if c % 2 == 0 else 'company')); sms.append(125)
    final = [('slot_place', 3)] * 6
    for i in range(8): seq.append(frame(final, None, i, 'company')); sms.append(a['recal_ping']['ms_per_frame'][i])
    for s in range(1, 9): seq.append(frame(final, None, None, 'seep', s)); sms.append(250)
    seq.append(frame(final, None, None, 'warm')); sms.append(800)
    preview_gif(P, 'heal_full_sequence', seq, sms)
    # 2x still contact: party strip states
    rows = [[party('warm')], [party('bright')], [party('company')], [party('seep', 2)], [party('seep', 4)], [party('seep', 6)], [party('warm')]]
    preview_png(P, 'heal_party_flash_seep_steps', contact(rows))
    # ToD
    tod = {}
    tod['slots'] = tod_check(P, 'heal_slot_place', room[64:128, 64:128].copy(), [(a['slot_place'], SLOTS[k][0] - 5, SLOTS[k][1] - 5) for k in range(6)])
    tod['flash'] = tod_check(P, 'heal_slot_flash', room[64:128, 64:128].copy(), [(a['slot_flash'], SLOTS[k][0] - 5, SLOTS[k][1] - 5) for k in range(6)])
    tod['screen'] = tod_check(P, 'heal_screen_pulse', room[0:64, 64:128].copy(), [(a['screen_pulse'], 0, 0)])
    tod['ping'] = tod_check(P, 'heal_recal_ping', room[EYE[1] - 16:EYE[1] + 16, 64 + EYE[0] - 16:64 + EYE[0] + 16].copy(), [(a['recal_ping'], 0, 0)])
    tod['empty'] = tod_check(P, 'heal_slot_empty', room[64:128, 64:128].copy(), [(a['slot_empty'], SLOTS[k][0] - 5, SLOTS[k][1] - 5) for k in range(6)], min_frac=0.0)
    tod['empty']['note'] = 'slot_empty is a deliberate dark cover over a violet slot (low contrast by design); not held to the 50% rule'
    about = 'Heal-centre restore FX (SOUL_PLAYBOOK heal beat): party crystals set into the machine, a 1 s company-violet flash, a recalibration ping, then each creature\'s Warmth seeps back in ordered dither.'
    print(dump_piece(P, about, hooks, tod))
    for k, v in tod.items(): print(k, v['readable_fraction'], v['passed'])
if __name__ == '__main__': main()
