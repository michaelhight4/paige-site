# run.py helpers (Oct 22 2026, 8:39 PM request): a lock so two full runs never overlap, and a --check mode that writes nothing.
#   full run : exclusive flock on /tmp/kilumen_run.lock. A second full run waits (KILUMEN_LOCK_WAIT seconds, default 600) and then exits 75
#              with a message naming the holder. --no-wait exits at once if the lock is held.
#   --check  : shared lock (waits for a running full build to finish, so it never reads half-written files; several checks can run together).
#              Every file write is swallowed (open for write -> /dev/null, Image.save / os.remove / makedirs / rmtree / replace -> no-op),
#              so the whole build runs in memory and only its checks are printed. Nothing on disk changes, not even /tmp/report.json.
import atexit, builtins, fcntl, io, os, signal, sys, time, shutil
LOCK = '/tmp/kilumen_run.lock'
CHECK = '--check' in sys.argv
NO_WAIT = '--no-wait' in sys.argv
SUPPRESSED = []
_fh = None

def _holder():
    try: return open(LOCK).read().strip() or 'unknown holder'
    except OSError: return 'unknown holder'

def acquire():
    global _fh
    _fh = builtins.open(LOCK, 'a+')
    try: os.chmod(LOCK, 0o666)
    except OSError: pass
    mode = fcntl.LOCK_SH if CHECK else fcntl.LOCK_EX
    wait = 0 if NO_WAIT else float(os.environ.get('KILUMEN_LOCK_WAIT', '600'))
    t0 = time.time(); told = False
    while True:
        try: fcntl.flock(_fh, mode | fcntl.LOCK_NB); break
        except BlockingIOError:
            if not told:
                print(f'run.py: another run holds {LOCK} ({_holder()}); waiting up to {wait:.0f}s ...', flush=True); told = True
            if time.time() - t0 >= wait:
                print(f'run.py: GAVE UP: {LOCK} is still held by {_holder()}. Nothing was built or written. '
                      f'Re-run when it finishes (--check also waits, so it never reads half-written maps; raise KILUMEN_LOCK_WAIT to wait longer).', flush=True)
                sys.exit(75)
            time.sleep(2)
    if not CHECK:
        _fh.seek(0); _fh.truncate(); _fh.write(f'pid {os.getpid()} started {time.strftime("%Y-%m-%d %H:%M:%S %Z")} cmd {" ".join(sys.argv)}\n'); _fh.flush()
        atexit.register(release)
        signal.signal(signal.SIGTERM, lambda *_: sys.exit(143))   # so a kill/timeout still relabels the lock (SIGKILL can't; see README 17.4)

def release():
    """full run exit (8:53 PM): relabel the lock text so a FREE lock never looks held. The flock itself drops when the process ends."""
    try:
        _fh.seek(0); line = _fh.read().strip()
        _fh.seek(0); _fh.truncate()
        _fh.write(f'free (last holder: {line}; ended {time.strftime("%Y-%m-%d %H:%M:%S %Z")})\n'); _fh.flush()
    except (OSError, ValueError): pass

def _w(mode): return any(c in mode for c in 'wax+')
def sandbox():
    """--check: make every write a no-op (the lock file is already open)."""
    real_open = builtins.open
    def open_(file, mode='r', *a, **k):
        if _w(mode) and not (isinstance(file, int)):
            SUPPRESSED.append(str(file)); return real_open(os.devnull, mode.replace('x', 'w').replace('a', 'w').replace('+', ''), *a, **k)
        return real_open(file, mode, *a, **k)
    builtins.open = open_; io.open = open_
    def noop(name):
        def f(*a, **k): SUPPRESSED.append(f'{name} {a[0] if a else ""}')
        return f
    for mod, name in ((os, 'remove'), (os, 'unlink'), (os, 'makedirs'), (os, 'mkdir'), (os, 'replace'), (os, 'rename'), (shutil, 'rmtree'), (shutil, 'copy'), (shutil, 'copyfile'), (shutil, 'copy2')):
        setattr(mod, name, noop(f'{mod.__name__}.{name}'))
    from PIL import Image
    Image.Image.save = lambda self, fp, *a, **k: SUPPRESSED.append(f'Image.save {fp}')
    try:
        import numpy as np
        np.save = noop('np.save')
    except ImportError: pass

acquire()
if CHECK: sandbox()
