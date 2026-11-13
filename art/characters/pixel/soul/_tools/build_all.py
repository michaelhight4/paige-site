"""Runs the whole soul pass: generators -> READMEs -> validator -> manifest. Stops on the first failure."""
import subprocess, sys, os, time
os.chdir(os.path.dirname(os.path.abspath(__file__)))
STEPS = ['gen_spotted.py', 'gen_battle_feedback.py', 'gen_trail_buddy.py', 'gen_ambient.py', 'gen_lap_nap.py',
         'write_readmes.py', 'validate_soul.py', 'write_manifest.py']
for s in STEPS:
    t = time.time(); print(f'== {s}', flush=True)
    r = subprocess.run([sys.executable, s])
    print(f'   exit {r.returncode} in {time.time() - t:.0f} s', flush=True)
    if r.returncode: sys.exit(r.returncode)
print('soul pass built')
