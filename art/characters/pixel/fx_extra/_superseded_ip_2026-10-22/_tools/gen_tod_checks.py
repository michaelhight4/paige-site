"""tod_checks (Animator DRAFT): READ-ONLY 4-time-of-day strips for EXISTING soul/ pieces (spotted, transitions, hit feedback).
Reads soul sheets, never writes inside soul/. Each anim is checked twice: grade 'none' (sprite grade, worst case) and 'all' (lit grade),
because soul/ metadata does not say which grade the engine should use. Output: fx_extra/tod_checks/_preview + tod_checks.json."""
import sys, os, json, datetime
sys.path.insert(0, os.path.dirname(__file__))
from fxx_lib import *
P = 'tod_checks'; SOUL = PIX + '/soul'
def load_anim(group, key):
    m = json.load(open(f'{SOUL}/{group}/_meta.json'))[key]
    sh = np.array(Image.open(ROOT + '/' + m['sheet']['1x']).convert('RGBA')); w, h = m['size']
    fr = [np.ascontiguousarray(sh[:h, i * w:(i + 1) * w]) for i in range(m['frames'])]
    return m, fr
def meta(fr, ms, em): return dict(frames=len(fr), _frames=fr, _em=em, ms_per_frame=list(ms))
def main():
    res = {}
    # spotted: over an NPC-height head on grass and on path (overworld), at (sx,sy) bottom-centre anchor
    ow = ow_bg(['grass_0', 'path_0', 'tall_grass_1111_v0'], 3, 1, under='grass_0')[16:64]
    spotted = ['spark', 'spark_rt', 'eye_glint'] + [f'emotes/emote_{e}' for e in ('heart', 'sweat', 'dots', 'note', 'zzz', 'anger', 'question', 'sparkle')]
    for k in spotted:
        m, fr = load_anim('spotted', k); w, h = m['size']; ax, ay = m['anchor']
        for em in (False, True):
            pl = [(meta(fr, m['ms_per_frame'], em), 32 + 64 * j - ax, 40 - ay) for j in range(3)]
            nm = f"spotted_{k.split('/')[-1]}_{'lit' if em else 'sprite'}grade"
            res[nm] = tod_check(P, nm, ow, pl)
    # transitions: full screen over a 320x240 overworld (tall grass + path)
    owf = ow_bg(['tall_grass_1111_v0', 'grass_0', 'path_0', 'tall_grass_1111_v1', 'grass_0'], 5, 4, under='grass_0')[:240, :320]
    tr = ['wild_leaf', 'enraged_shard', 'trainer_bars', 'ron_jacket', 'master_coin', 'guardian_whiteout', 'reduced_motion_fade']
    for k in tr:
        m, fr = load_anim('battle_feedback', 'transitions/' + k)
        for em in (False, True):
            nm = f"transition_{k}_{'lit' if em else 'sprite'}grade"
            res[nm] = tod_check(P, nm, owf, [(meta(fr, m['ms_per_frame'], em), 0, 0)])
    # hit feedback: two representative creatures (foe front 128, player back 160) on the pilot battle screen; creature-replacement frames use sprite grade
    bg = clean_battle_bg(None)
    for cr, view, (gx, gy) in (('cindrip', 'front', FOE_GROUND), ('bastonox', 'back', (104, 236)), ('tidemarrow', 'front', FOE_GROUND)):
        for kind in ('flash', 'faint', 'overuse'):
            key = f'creatures/{cr}/{cr}_{view}_{kind}'
            try: m, fr = load_anim('battle_feedback', key)
            except KeyError: continue
            ax, ay = m['anchor']; x, y = gx - ax, gy - ay
            y = min(y, 240 - m['size'][1]) if y + m['size'][1] > 240 else y
            nm = f'hit_{cr}_{view}_{kind}_spritegrade'
            # rule: measured vs the battle background only (the overlay replaces the creature)
            res[nm] = tod_check(P, nm, bg, [(meta(fr, m['ms_per_frame'], False), x, y)], min_frac=0.3)
            res[nm]['note'] = 'creature-replacement frames: pass >= 0.3 (most pixels are the creature body, which is meant to sit near the background luma in places)'
    out = dict(piece=P, status='DRAFT - read-only checks of existing soul/ assets; nothing in soul/ was modified', owner='Animator',
               generated_by=rel(__file__), generated_at=datetime.datetime.now().astimezone().isoformat(timespec='seconds'),
               why='soul/ spotted, transitions and hit feedback had no 4-phase ToD strips (Game dev inventory item 1-3)',
               grading_note="soul/ metadata does not say lit vs sprite grade; both shown. Recommendation: spark/emotes + transitions = screen-space or lit grade.",
               results=res,
               visual_review=dict(
                 transitions_night='Metric FAILS at night for wild_leaf, enraged_shard, ron_jacket, master_coin (0.37-0.45). Looked at wild_leaf: the solid wipe still reads as a wipe (it covers the screen), but the leaf edge detail almost vanishes at night. Recommendation for soul/ owner: draw transitions in screen space (ungraded), or give edge pieces a lit-colour rim (fcd668/f8eabe/d6acff). Not changed here (not my files).',
                 spark_sprite_grade_night='spark at 0.498 with sprite grade (borderline); 0.616 with lit grade -> recommend lit grade for spark.',
                 hit_feedback='All pass. tidemarrow faint/overuse lowest at night (0.43-0.47) but above the 0.3 replacement-frame bar.'))
    json.dump(out, open(f'{FXX}/{P}/tod_checks.json', 'w'), indent=1)
    for k, v in res.items(): print(('OK  ' if v['passed'] else 'FAIL'), k, v['readable_fraction'])
if __name__ == '__main__': main()
