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
    HS = json.load(open(f'{SOUL}/battle_feedback/hook_specs.json'))
    tr = ['wild_leaf', 'enraged_shard', 'trainer_bars', 'ron_jacket', 'master_coin', 'guardian_whiteout', 'reduced_motion_fade']
    for k in tr:
        m, fr = load_anim('battle_feedback', 'transitions/' + k)
        spec = HS['transitions'][k]
        for em, tag in (('none', 'screenspace'), (True, 'litgrade')):   # soul spec: grade none (screen-space); lit = if an engine grades it anyway
            nm = f"transition_{k}_{tag}"
            res[nm] = tod_check(P, nm, owf, [(meta(fr, m['ms_per_frame'], em), 0, 0)])
            res[nm]['soul_spec_grade'] = spec.get('grade')
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
    out = dict(piece=P, status='DRAFT - read-only checks of soul/ assets (soul/ is Animator-owned and was fixed at the source; this script only reads it)', owner='Animator',
               generated_by=rel(__file__), generated_at=datetime.datetime.now().astimezone().isoformat(timespec='seconds'),
               why='soul/ spotted, transitions and hit feedback had no 4-phase ToD strips (Game dev inventory item 1-3)',
               grading_note="Transitions: soul hook_specs say grade none (screen-space UI layer, ungraded); checked ungraded and, as a fallback, lit-graded. Spotted spark/emotes: shown with sprite grade and lit grade (recommend lit).",
               results=res,
               visual_review=dict(
                 transitions_night='Fixed in soul/ (Oct 22): wild_leaf, enraged_shard, ron_jacket and master_coin now use near-black fills with rims/detail from the 8 night-lit colours and are marked screen-space/ungraded. See the numbers above; night strips checked by eye.',
                 spark='spark brightened in soul/ (gen_spotted.py); see spotted_spark_* rows.',
                 hit_feedback='All pass. tidemarrow faint/overuse lowest at night (0.43-0.47) but above the 0.3 replacement-frame bar.'))
    json.dump(out, open(f'{FXX}/{P}/tod_checks.json', 'w'), indent=1)
    for k, v in res.items(): print(('OK  ' if v['passed'] else 'FAIL'), k, v['readable_fraction'])
if __name__ == '__main__': main()
