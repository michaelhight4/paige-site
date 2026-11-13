"""Writes fx_extra/README.md and one README.md per piece from the piece JSON + hand-written weak spots."""
import os, json, glob, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); FXX = os.path.dirname(HERE)
WEAK = {
 'capture': ['Code-drawn crystal: needs an artist pass on facets and the clasp band at 1x.',
             'Fire break-out reads well only because of the INK outline + lit embers; water/wind are flatter.',
             'Breakout-by-element table is a guess for the new elements; Game dev/Story should confirm.'],
 'heal_restore': ['Slot offsets are measured on heal_machine (1x2) only; the i_heal_machine 2x2 variant is NOT measured.',
                  'party_crystal_flash / party_seep_back are code hooks (described in JSON), not drawn sheets; the PNG shows the steps.',
                  'heal_slot_empty is a dark cover by design and is below the 50% readability bar (noted).'],
 'item_pickup': ['The satchel reads a bit like a briefcase; needs an artist pass (softer flap, strap curve).',
                 'The satchel is a map prop: World Design may own it. This is a reference, not a claim on the prop.'],
 'grass_leaves': ['First version passed the readability number but was invisible by eye; leaves were enlarged and outlined. Re-check on a real device.',
                  'Only two leaf variants; a third (seed-head) would cut repetition.'],
 'warmth_stage_up': ['Rings are one shared shape recoloured per family; a per-family motif (flame tongue, droplet, leaf) would be nicer.',
                     'crystal_anchors.json centroids are computed from masks; odd-shaped crystals (split crystals) get a centroid between parts.'],
 'cosmic_shimmer': ['Starfield on very light creature bellies is low contrast (still passes); an artist may want a darker star tip there.',
                    'Chime timing is a suggestion only (audio not made here).'],
 'evolution': ['Silhouettes are code-made (fill + outline): fine as a generic overlay, but the motes and burst are simple shapes.',
               'Alternation reaches 60 ms steps (~8 Hz) on a sprite-sized area; full-screen flash is used once only. If Gary wants a stricter photosensitivity rule, clamp steps to >= 167 ms.',
               'evo_flash is fcf6e8 (not a lit colour) so it dims at night under a grade: draw it in screen space (ungraded) if possible.'],
 'tod_checks': ['Read-only checks of soul/ assets; nothing in soul/ was changed.',
                'Transitions wild_leaf, enraged_shard, ron_jacket, master_coin FAIL the night metric (0.37-0.45). The wipe still reads by eye, but edge detail fades. Owner of soul/ should decide: screen-space draw, or lit-colour rims.',
                'soul/ metadata does not say lit vs sprite grade; both variants were rendered.'],
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
         '| capture/ | dominance-crystal throw, pull, drop, wobble, success, 4 break-outs, odds ring |',
         '| heal_restore/ | heal-machine slot place/flash, screen pulse, recal ping + party flash/seep hooks |',
         '| item_pickup/ | supply satchel idle, pickup open (dither-out), hidden-item sparkle |',
         '| grass_leaves/ | tall-grass step leaves (2 variants + reduced motion) |',
         '| warmth_stage_up/ | stage-up ring per ramp family (10), stage pips, crystal anchors |',
         '| cosmic_shimmer/ | starfield tile, encounter aura, icon twinkle, summary sparkle |',
         '| evolution/ | generic evolution overlay: motes, flash, burst, cancel, reduced motion + silhouette schedule |',
         '| tod_checks/ | read-only ToD strips for existing soul/ spotted, transitions, hit feedback |', '',
         'Tools: `_tools/fxx_lib.py` (shared), `_tools/gen_<piece>.py`, `_tools/build_all.py`, `_tools/validate_fx_extra.py`, `_tools/gen_readmes.py`.',
         'Readability metric: fraction of FX pixels with |dLuma| >= 28 against the graded background, per phase (pass >= 0.5). The number can be fooled (tiny particles) - always look at the strip too.', '']
    open(FXX + '/README.md', 'w').write('\n'.join(T)); print('READMEs:', pieces)
if __name__ == '__main__': main()
