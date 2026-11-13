"""Swap the staged transparent, effect-sized battle FX over the live full-scene *_battle_2x.gif files.
!! Only after Gary has approved the previews in _transparent_staging/_preview/. Not run by the Animator bot. !!

Default is a DRY RUN (prints the plan, changes nothing). Add --apply to do it.
  python3 swap_in_transparent.py                      # dry run, impacts only (23 files)
  python3 swap_in_transparent.py --apply              # back up + swap impacts
  python3 swap_in_transparent.py --apply --include-travel   # also travel_p2f / travel_f2p (46 more)
  python3 swap_in_transparent.py --apply --no-sidecars       # GIF only (default also copies sheet PNG, JSON, .aseprite)
  python3 swap_in_transparent.py --restore /workspace/backups/kilumen_effects_fullscene_<ts>   # put the backup back
Steps on --apply:
 1. runs validate_transparent.py on the staging set; aborts on any failure
 2. backs up every live file that will be replaced or created-over to
    /workspace/backups/kilumen_effects_fullscene_<YYYYmmdd_HHMMSS_CT>/<same relative path>, with manifest.json (sha256)
 3. verifies the backup (sha256), then copies staging -> live and verifies each copy (sha256)
Afterwards the game still needs Coder's ui.js change (natural aspect + JSON anchor) and HIT_EFFECTS_ENABLED=true."""
import os, sys, json, shutil, hashlib, subprocess, datetime
from zoneinfo import ZoneInfo
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                       # .../effects
STAGE = f'{ROOT}/_transparent_staging'
BACKUPS = os.environ.get('KFX_BACKUP_ROOT', '/workspace/backups')   # override only for tests
sys.path.insert(0, HERE)

def sha(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()

def plan(include_travel, sidecars):
    import elements as EL
    anims = ['impact'] + (['travel_p2f', 'travel_f2p'] if include_travel else [])
    items = []
    for el in EL.ELEMENTS:
        for an in anims:
            b = f'{el}_{an}_battle_2x'
            names = [f'{b}.gif'] + ([f'{b}_sheet.png', f'{b}.json', f'{b}_sheet_aseprite.json', f'{el}_{an}.aseprite'] if sidecars else [])
            for n in names:
                rel = f'{el}/{an}/{n}'; src = f'{STAGE}/{rel}'
                if not os.path.exists(src): sys.exit(f'missing staged file {src}')
                items.append((rel, src, f'{ROOT}/{rel}'))
    return anims, items

def restore(bdir):
    man = json.load(open(f'{bdir}/manifest.json'))
    print(f'restoring {len(man["files"])} files from {bdir}')
    for f in man['files']:
        live = f'{ROOT}/{f["rel"]}'
        if f['existed']:
            shutil.copy2(f'{bdir}/{f["rel"]}', live); assert sha(live) == f['sha256'], live
        elif os.path.exists(live):
            os.remove(live)                         # file did not exist before the swap
    print('restore done')

def main():
    a = sys.argv[1:]
    if '--restore' in a: return restore(a[a.index('--restore') + 1])
    apply, travel, sidecars = '--apply' in a, '--include-travel' in a, '--no-sidecars' not in a
    anims, items = plan(travel, sidecars)
    print(f'{"APPLY" if apply else "DRY RUN"}: {len(items)} files ({", ".join(anims)}; sidecars={sidecars})')
    for rel, src, live in items:
        print(f'  {rel}  {"replace" if os.path.exists(live) else "new"}')
    if not apply:
        print('dry run only: nothing changed. Re-run with --apply after Gary approves the previews.'); return
    v = subprocess.run([sys.executable, f'{HERE}/validate_transparent.py', '--anims', ','.join(anims)], capture_output=True, text=True)
    print(v.stdout.splitlines()[-1] if v.stdout else v.stderr)
    if v.returncode != 0: sys.exit('validator failed: not swapping')
    ts = datetime.datetime.now(ZoneInfo('America/Chicago')).strftime('%Y%m%d_%H%M%S_CT')
    bdir = f'{BACKUPS}/kilumen_effects_fullscene_{ts}'
    if os.path.exists(bdir): sys.exit(f'{bdir} exists')
    man = {'created': ts, 'root': ROOT, 'stage': STAGE, 'anims': anims, 'files': []}
    for rel, src, live in items:
        e = os.path.exists(live); rec = {'rel': rel, 'existed': e}
        if e:
            os.makedirs(os.path.dirname(f'{bdir}/{rel}'), exist_ok=True); shutil.copy2(live, f'{bdir}/{rel}')
            rec['sha256'] = sha(live); assert sha(f'{bdir}/{rel}') == rec['sha256'], rel
        man['files'].append(rec)
    os.makedirs(bdir, exist_ok=True); json.dump(man, open(f'{bdir}/manifest.json', 'w'), indent=1)
    print(f'backup: {bdir} ({sum(f["existed"] for f in man["files"])} files)')
    for rel, src, live in items:
        shutil.copy2(src, live); assert sha(live) == sha(src), rel
    print(f'swapped {len(items)} files. Undo: python3 {os.path.abspath(__file__)} --restore {bdir}')

if __name__ == '__main__':
    main()
