"""Writes soul/<item>/README.md (asset tables generated from _meta.json + hook_specs.json, plus the hand-written notes
below) and soul/README.md. Re-run after the generators."""
import json, os, re, collections
from soul_lib import SOUL, rel, CREATURES

NOTES = {
'spotted': ('#2 Spotted!', '''Trainer notices the player: eye glint, violet crystal spark over the head, a small hop, then the trainer walks up.
Company (RT) trainers use `spark_rt` (tiny RT gem-shield logo inside the spark). An 8-emote set (heart, sweat, dots,
question, note, sparkle, anger, zzz) is shared with Trail Buddy, Lap Nap and the NPCs.

* `eye_points.json`: head_top + eye pixel positions for every human/NPC down-stand frame (glint + spark placement).
* Frame 01 of `spark` is the playbook's single "spark" frame; 00/02/03 are optional pop-in/afterglow.''',
'''* The hop is code-driven: offsets in `hook_specs.json` (no extra sprite frames).
* For left/right-facing trainers only one eye is visible: put one glint on the facing side (measured example in the generator).'''),
'battle_feedback': ('#5 Battle hit feedback and transitions', '''Code-driven: hit-stop, white flash, screen shake, HP drain (parameters in `hook_specs.json`; reference GIFs in previews/).
Drawn: per-creature solid flash silhouettes (`_flash`), the crystal-flicker faint (`_faint`, 7 flicker + 3 fade), the
crystal-overuse crack (`_overuse`), front (enemy) and back (player) views at the battle sprite sizes, and seven 320x240
battle-start transitions: wild_leaf, enraged_shard, trainer_bars, ron_jacket, master_coin, guardian_whiteout, reduced_motion_fade.''',
'''* Shake moves the world layer only. The HUD stays still.
* A critical hit freezes for 90 ms (the playbook only defines 60 ms).
* Company staff and opposition trainers use trainer_bars because the playbook lists no transition for them.
* The aggressive wild variant is called "Enraged" here.'''),
'trail_buddy': ('#6 Trail Buddy', '''Follower set for all 16 creatures (13 at 64x64, plus bastonox, forgeharrow and tidemarrow at 96x96), 4 directions each:
follow (walk) cycle, hop, flinch, happy, sniff, yawn, sit, uneasy (near crystal), plus specials: Sailquill flight and
flight_shadow, Rillop wade, Tumbloam bench, Gloamtick lantern flare, Cindrip rain shake-off.''',
'''* Generic sit is a squash, and yawn has no eye-closing (no per-creature eye edits).
* On a bike the buddy goes back into its ball.
* Some poses are subtle at 1x (Cindrip drops, a few trail poses).'''),
'ambient': ('#12 Ambient life', '''Fish jump (the tileset fish shadow and ripple are reused unchanged), Sailquill-coloured flock birds (peck/look/hop idle,
takeoff and fly) that scatter when the player runs or bikes but not when walking, emissive fireflies that fade to an orange
ember within 2 tiles of crystals, buddy paw prints (sand/snow/mud), wet prints (player and buddy) and splash/wade rings.''',
'''* Footprints follow the tileset rule: 3 frames x 1333 ms, about 4 s.
* Paw prints replace the human prints the tileset currently spawns for the follower.
* No shallow-water tile exists yet. Splash rings trigger on cells tagged shallow and on Rillop wade cells. The pond preview uses the route1 sand pond.
* The snow preview is a synthetic strip because no snow map exists yet.
* Previews are rendered from the live world tileset, which the world team regenerates on this shared box. If a preview looks corrupted, re-run `gen_ambient.py <preview>` (the names are contacts, fish, birds, fireflies, pond, snow).'''),
'lap_nap': ('#15 Lap nap', '''Heal-centre sofa (heal_centre_int, sofa at (1,7)). The player stands at (1,8) facing up and stays idle for 30 s after a heal.
The player sits on the sofa and the Trail Buddy hops into their lap, curls up and sleeps (zZz). The healer turns and says
"Don't move. Those are the rules." (text only, not art).

* Seated body: the run_bike `seated_upper` part placed on the seat, plus the bottom 10 rows of the walk-stand legs.
  The thighs are foreshortened toward the camera.
* The buddy curls facing the player (back view squashed by 32% of its height), with a 1-row breathing loop.
* The big creatures (bastonox, forgeharrow, tidemarrow) do not fit in a lap. They sleep at the player's feet on (2,8): `<c>_feet_sleep`.''',
'''* `<name>_sofa_sit_down` / `_stand_up` are 64x160 overlays with anchor (32,157) = the (1,8) foot point. The canvas top-left is at map (64, 7*64-32).
* `<name>_sofa_seated` is a normal 64x96 human frame drawn at the sofa tile (1,7).
* Draw order: sofa < player < buddy < emote.
* Warmth +2 is granted once per in-game day (a flag for Coder). The scene itself can replay.'''),
}

def pattern(name):
    base = name.split('/')
    for c in sorted(CREATURES, key=len, reverse=True):
        name = re.sub(rf'\b{c}\b', '<c>', name)
    return name, next((c for c in CREATURES if c in base), None)

def table(meta):
    groups = collections.OrderedDict()
    for n, m in meta.items():
        p, c = pattern(n)
        k = (p, m['kind'], tuple(m['size']), m['frames'], tuple(m['ms_per_frame']), tuple(m['anchor'] or ()), m['loop'])
        groups.setdefault(k, []).append(c)
    out = ['| animation (folder) | kind | size | frames | ms per frame | anchor | loop | creatures |', '|---|---|---|---|---|---|---|---|']
    for (p, kind, sz, fr, ms, an, lp), cs in groups.items():
        ms_s = str(ms[0]) if len(set(ms)) == 1 else ','.join(map(str, ms))
        cs = [c for c in cs if c]
        out.append(f'| `{p}` | {kind} | {sz[0]}x{sz[1]} | {fr} | {ms_s} | {an and list(an)} | {"yes" if lp else "no"} | {", ".join(cs) if cs else "-"} |')
    return '\n'.join(out)

def main():
    for it, (title, intro, hooks) in NOTES.items():
        d = f'{SOUL}/{it}'; meta = json.load(open(f'{d}/_meta.json'))
        specs = json.load(open(f'{d}/hook_specs.json')) if os.path.exists(f'{d}/hook_specs.json') else {}
        prev = sorted(os.listdir(f'{d}/previews')) if os.path.isdir(f'{d}/previews') else []
        notes = {n: m['notes'] for n, m in meta.items() if m.get('notes')}
        uniq = collections.OrderedDict()
        for n, t in notes.items(): uniq.setdefault(t, pattern(n)[0])
        md = [f'# Soul pass: {title}', '', intro, '',
              '## Layout', '',
              'Each animation folder holds `1x/<name>_NN.png` (transparent, hard pixels, palette-only), `2x/<name>_NN_2x.png` (exact nearest-neighbour), '
              '`<name>_sheet.png` + `<name>_sheet_2x.png` (frames left to right) and `<name>_2x.gif`. '
              'Timing, anchors and paths are in `_meta.json` and in the manifest key `soul.' + it + '`.', '',
              f'## Assets ({len(meta)} animations)', '', table(meta), '',
              '## Per-animation notes', ''] + [f'* `{p}`: {t}' for t, p in uniq.items()] + ['',
              '## Coder hook notes', '', hooks, '',
              'The full parameters are in `hook_specs.json`, embedded here:', '', '```json', json.dumps(specs, indent=1), '```', '',
              '## Previews', ''] + [f'* `previews/{p}`' for p in prev] + ['',
              '## Reproduce / validate', '', '```', f'cd art/characters/pixel/soul/_tools', f'python3 gen_{it}.py', 'python3 validate_soul.py ' + it, 'python3 write_manifest.py', '```', '']
        open(f'{d}/README.md', 'w').write('\n'.join(md))
    top = ['# Soul pass (SOUL_PLAYBOOK): animator deliverables', '',
           '| item | folder | readme |', '|---|---|---|'] + [f'| {t} | `{it}/` | `{it}/README.md` |' for it, (t, _, _) in NOTES.items()] + ['',
           'All art is 64px-grid pixel art on the shared 64-colour palette (`art/world/overworld/palette.png`), with alpha 0/255 only.',
           'Original designs, no external references. Nothing is wired into the game. Coder hooks are described in each README / `hook_specs.json`.', '',
           '## Tools (`_tools/`)', '',
           '* `soul_lib.py`: shared helpers (palette, loaders, write_anim, previews, world render via preview_util).',
           '* `gen_spotted.py`, `gen_battle_feedback.py`, `gen_trail_buddy.py`, `gen_ambient.py`, `gen_lap_nap.py`: generators.',
           '* `validate_soul.py`: palette/alpha, sizes per kind, frame counts, exact 2x, sheet = concatenated frames, no stray frames.',
           '* `write_manifest.py`: read-merge-write of `_parts/animator_manifest.json`. It replaces only the `soul` key.',
           '* `write_readmes.py`: these READMEs.',
           '* `build_all.py`: runs everything in order (about 15 min; previews read the live world tileset).', '']
    open(f'{SOUL}/README.md', 'w').write('\n'.join(top))
    print('readmes written')

if __name__ == '__main__':
    main()
