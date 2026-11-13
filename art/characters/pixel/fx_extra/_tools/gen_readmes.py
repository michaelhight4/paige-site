"""Writes fx_extra/README.md and one README.md per piece from the piece JSON + hand-written weak spots."""
import os, json, glob, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); FXX = os.path.dirname(HERE)
WEAK = {
 'capture': ['The crystal is small at 1x and its three prongs read faintly; needs an artist pass on facets at 1x.',
             'HOLD (64,128) is a pilot placeholder: there is no player back sprite yet, and the trainer-front hold point [32,4] is provisional.',
             'Fire break-out is the weakest at night (0.71, passes): the inner flame was brightened to fcd668/f8eabe; water/wind are flatter shapes.',
             'Break-out type by element is a guess for the newer elements; Game dev/Story should confirm.'],
 'heal_restore': ['The cradle sits on the heal_machine eye; on i_heal_machine (2x2) the cradle point [63,28] is proposed from the measured panel, not tested in a room preview.',
                  'Both machine arts still paint 6 round slots (2x3) and i_heal_machine a row of 6 lights - the motif the IP check flagged. World Design owns the machine art and may want to repaint them.',
                  'party_crystal_glow / party_seep_back are code hooks (described in JSON), not drawn sheets; the PNG shows the steps.',
                  'The done jingle is not made here: it must be original and checked by ear by Audio.'],
 'item_pickup': ['Soft drawstring bag (replaces the earlier briefcase-like satchel); the open-neck frame is a bit flat and wants an artist pass.',
                 'World Design may own the final bag prop (it is a solid map object). This is the Animator reference, not a claim on the prop.'],
 'grass_leaves': ['First version passed the readability number but was invisible by eye; leaves were enlarged and outlined. Re-check on a real device.',
                  'Only two leaf variants; a third (seed-head) would cut repetition.'],
 'warmth_stage_up': ['Rings are one shared shape recoloured per family; a per-family motif (flame tongue, droplet, leaf) would be nicer.',
                     'crystal_anchors.json centroids are computed from masks; odd-shaped crystals (split crystals) get a centroid between parts.'],
 'cosmic_shimmer': ['Starfield on very light creature bellies is low contrast (still passes); an artist may want a darker star tip there.',
                    'Chime timing is a suggestion only (audio not made here).'],
 'evolution': ['Veins on creatures whose body already has warm cracks (e.g. cindrip) read more subtly than on plain bodies; the reveal front carries the beat.',
               'The reveal front is authored in absolute px (REVEAL_R 16..160); code stops it at R_max + 6 per sprite pair.',
               'Ring burst stays inside the sprite area; there is no full-screen flash any more.'],
 'tod_checks': ['Read-only checks of soul/ assets (soul/ is Animator-owned; it was fixed at the source, these are the checks).',
                'Transitions wild_leaf, enraged_shard, ron_jacket and master_coin are now screen-space (ungraded) with night-lit rims; spotted spark brightened.',
                'soul/ metadata now marks transitions grade none; other soul/ pieces are rendered both lit and sprite-graded.'],
}
EXTRA = {
 'capture': ['## Names = code steps', '',
             'Coder\'s placeholder steps map 1:1 to the anim folders here. Each folder has `<name>_battle_2x.json` beside its sheet (same style as the live effects `*_battle_2x.json`: 2x frame rects, ms, total_ms, anchor, hand + foe anchor hooks).', '',
             '| code step | anim |', '|---|---|', '| raise | `raise` |', '| beam | `beam` |', '| absorb | `absorb` |', '| pulse(n) | `pulse_1` .. `pulse_4` (pulse_n = first 4n frames of pulse_4) |',
             '| lock/bloom | `lock_bloom` |', '| breakout | `breakout_generic`, `breakout_fire`, `breakout_water`, `breakout_wind`; other elements use `hooks.breakout_type_by_element` in capture.json |', '',
             '## Needed from Character models (trainer sprites are NOT redrawn here)', '',
             '- **Player back sprite**: a raised-arms "hold the crystal up" pose, 3 frames (arms rising, arms up, arms up + small lean back for the break-out), plus a lowered return frame. Give a per-frame `hold_px` (x, y in sprite px) for the point between the hands.',
             '- **Each NPC trainer front sprite (64x128)**: the same raise pose, 2 frames (rising, up), with per-frame `hold_px`. The current provisional point is [32, 4] (hands above the head).',
             '- Until then code uses HOLD (64,128) on the 320x240 battle screen for the player and [32,4] on the trainer front sprite.', ''],
}
def rel(p): return os.path.relpath(p, FXX)
def piece_readme(path):
    d = json.load(open(path)); piece = os.path.basename(os.path.dirname(path)); L = []
    L += [f'# fx_extra / {piece}', '', '**DRAFT - not approved by Gary. NOT wired into game code.** Owner: Animator.', '']
    if 'anims' not in d:
        L += [d.get('why', ''), '', d.get('grading_note', ''), '', '## Results (fraction of FX pixels with |dLuma| >= 28 vs graded background; pass >= 0.5, creature-replacement >= 0.3)', '',
              '| check | dawn | day | dusk | night | pass |', '|---|---|---|---|---|---|']
        for k, v in d['results'].items():
            r = v['readable_fraction']; L.append(f"| {k} | {r['dawn']} | {r['day']} | {r['dusk']} | {r['night']} | {'yes' if v['passed'] else '**NO**'} |")
        L += ['', '## Visual review', ''] + [f'- **{k}**: {v}' for k, v in d.get('visual_review', {}).items()]
        L += ['', 'Strips: `_preview/<check>_tod_2x.png` (key frames x dawn|day|dusk|night) and `_tod_2x.gif` (animated).']
    else:
        L += [d['about'], '', '## Anims', '', 'Sheets are horizontal strips; frame i rect = [i*w, 0, w, h]. 1x is the source; *_2x is exact nearest-neighbour.', '',
              '| anim | size | frames | total ms | loop | emissive | anchor |', '|---|---|---|---|---|---|---|']
        for k, v in d['anims'].items():
            an = v['anchor']; a = an.get('canvas_px', an.get('canvas_top_left_on_screen'))
            L.append(f"| `{k}` | {v['frame_size'][0]}x{v['frame_size'][1]} | {v['frames']} | {v['total_ms']} | {v['loop']} | {v['emissive']} | {a} - {an.get('meaning', '')[:70]} |")
        L += ['', 'Per-frame ms, rects and full anchor text are in `' + piece + '.json`.', '', '## Hooks (code side)', '', '```json', json.dumps(d['hooks'], indent=1), '```', '',
              '## Time-of-day check', '', '| check | dawn | day | dusk | night | pass |', '|---|---|---|---|---|---|']
        for k, v in d['tod_check'].items():
            r = v['readable_fraction']; L.append(f"| {k} | {r['dawn']} | {r['day']} | {r['dusk']} | {r['night']} | {'yes' if v['passed'] else 'no'}{' (note)' if 'note' in v else ''} |")
        L += ['', 'Grading: emissive `all` -> lit grade, `none` -> sprite grade, `mask` -> per pixel. Order: palette swaps (cosmic -> Warmth) -> ToD grade.']
    pv = sorted(glob.glob(os.path.dirname(path) + '/_preview/*'))
    L += ['', '## Previews', ''] + [f'- `{rel(p)}`' for p in pv if '_tod_' not in p] + [f'- ToD strips: {sum(1 for p in pv if "_tod_" in p)} files in `{piece}/_preview/*_tod_2x.*`']
    L += [''] + EXTRA.get(piece, [])
    L += ['', '## Weak spots / needs artist polish', ''] + [f'- {w}' for w in WEAK.get(piece, [])] + ['- All art here is code-generated: it is a timing/placement draft and needs an artist polish pass before approval.']
    L += ['', '## Rebuild', '', f'`python3 _tools/gen_{piece}.py` (or `python3 _tools/build_all.py`), then `python3 _tools/validate_fx_extra.py`.', '']
    open(os.path.dirname(path) + '/README.md', 'w').write('\n'.join(L))
def main():
    pieces = []
    for p in sorted(glob.glob(FXX + '/*/*.json')):
        if p.endswith('crystal_anchors.json'): continue
        piece_readme(p); pieces.append(os.path.basename(os.path.dirname(p)))
    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M CT')
    T = ['# fx_extra (Animator)', '', f'**DRAFT - not approved by Gary. NOT wired into game code.** Last build: {now}.', '',
         'Extra FX the Game dev inventory found missing or partial. Original art, 64-colour palette (`art/world/overworld/palette.hex`), alpha 0/255, drawn at 1x; previews 2x nearest.',
         'No smoke/haze anywhere. Every piece has 4-phase (dawn/day/dusk/night) check strips in `<piece>/_preview/*_tod_2x.*`.', '',
         '| piece | what |', '|---|---|',
         '| capture/ | hold-up/absorb capture: raise, beam, absorb, pulse_1..4, lock_bloom, breakout_generic/fire/water/wind (names match the code steps) |',
         '| heal_restore/ | one cradle ring, whole team floats in together, one scanner sweep, glow, done ping + party glow/seep hooks |',
         '| item_pickup/ | soft supply bag idle, pickup open (dither-out), hidden-item sparkle |',
         '| grass_leaves/ | tall-grass step leaves (2 variants + reduced motion) |',
         '| warmth_stage_up/ | stage-up ring per ramp family (10), stage pips, crystal anchors |',
         '| cosmic_shimmer/ | starfield tile, encounter aura, icon twinkle, summary sparkle |',
         '| evolution/ | generic evolution overlay: Warmth veins, dither reveal from the crystal point, local ring burst, cancel, reduced motion |',
         '| tod_checks/ | read-only ToD strips for existing soul/ spotted, transitions, hit feedback |', '',
         'Older versions (before the Oct 22 IP check) are kept for reference in `_superseded_ip_2026-10-22/` - do not use them.',
         'Tools: `_tools/fxx_lib.py` (shared), `_tools/gen_<piece>.py`, `_tools/build_all.py`, `_tools/validate_fx_extra.py`, `_tools/gen_readmes.py`.',
         'Readability metric: fraction of FX pixels with |dLuma| >= 28 against the graded background, per phase (pass >= 0.5). The number can be fooled (tiny particles) - always look at the strip too.', '']
    open(FXX + '/README.md', 'w').write('\n'.join(T)); print('READMEs:', pieces)
if __name__ == '__main__': main()
