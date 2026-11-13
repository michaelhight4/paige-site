"""Rebuild every fx_extra piece, the READMEs, then validate. python3 build_all.py"""
import subprocess, sys, os, time
H = os.path.dirname(os.path.abspath(__file__))
for s in ['gen_capture', 'gen_heal_restore', 'gen_item_pickup', 'gen_grass_leaves', 'gen_warmth_stage_up', 'gen_cosmic_shimmer', 'gen_evolution', 'gen_tod_checks', 'gen_readmes']:
    t = time.time(); r = subprocess.run([sys.executable, f'{H}/{s}.py'], capture_output=True, text=True, cwd=H)
    print(f'{s}: exit {r.returncode} ({time.time() - t:.1f}s)')
    if r.returncode: print(r.stdout[-2000:], r.stderr[-3000:]); sys.exit(1)
sys.exit(subprocess.run([sys.executable, f'{H}/validate_fx_extra.py'], cwd=H).returncode)
