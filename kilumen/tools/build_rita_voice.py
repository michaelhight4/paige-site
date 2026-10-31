#!/usr/bin/env python3
"""RITA voice clips (coder, Oct 23 2026; Gary: "okay how hard to give her a real voice?", 12:33 PM CT steering:
"focus on voice lines that will actually be used in each section, realistic milestones").

Pre-renders RITA's company-voice lines (text/overworld_lines.json system_company_voice, Text Bot owns it, read-only here)
to small mono OGG/Opus clips (+ M4A/AAC fallback for old Safari) in assets/audio/rita/ with manifest.json, for
src/systems/rita_voice.js to stitch together at play time (Web Audio, small gaps).

  * Scope: data/rita_voice_scope.json. A line key with its own region tag is voiced iff the tag is in build_regions;
    an untagged key falls back to the region's base list (a base covers <base>_2.._9).
  * Pages are split into static fragments and {slots}. {employee_id} = digit clips 0-9, {count}/{level} = number clips,
    any other slot = name clips from the scope's names lists. Missing name clip -> runtime plays that page text-only.
  * TTS: Kokoro-82M v1.0 (Apache-2.0 weights + voices) via kokoro-onnx (MIT), CPU, offline. Model cache:
    /home/box/.cache/rita_tts (kokoro-v1.0.onnx + voices-v1.0.bin, ~340 MB, NOT in the repo, never shipped).
    phonemizer-fork / espeak-ng (GPL) are build-time tools only; the audio is ours.
  * Hash cache: raw TTS WAVs in <cache>/clips/<sha>.wav keyed by (text, voice, speed, lang, model); shipped files are
    named <kind>_<sha of raw+filter+codec>.ogg|m4a and only rendered when missing. Old files are never deleted
    (repo rule); the report lists orphans.
  * Filter (ffmpeg): comms band-pass + light bitcrush + subtle ring-mod + compression; see FILTER below. --nofilter
    renders the same clips dry (only used for the comparison sample).

Run with the venv: /workspace/rita_tts_venv/bin/python tools/build_rita_voice.py [--samples] [--dry-run]
"""
import argparse, hashlib, json, os, re, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LINES = ROOT / 'text/overworld_lines.json'
SCOPE = ROOT / 'data/rita_voice_scope.json'
CV_CFG = ROOT / 'data/company_voice.json'
OUT = ROOT / 'assets/audio/rita'
SAMPLES = ROOT / 'shots/rita_voice'
CACHE = Path(os.environ.get('RITA_TTS_CACHE', '/home/box/.cache/rita_tts'))
MODEL, VOICES = CACHE / 'kokoro-v1.0.onnx', CACHE / 'voices-v1.0.bin'
MODEL_TAG = 'kokoro-v1.0-fp32'  # bump when the model file changes (part of the clip hash)

VOICE = {'voice': 'af_heart', 'speed': 1.0, 'lang': 'en-us'}
# Comms filter, kept subtle: 300 Hz-3.6 kHz band (radio), soft 10-bit-ish crush mixed 25 %, 18 % ring-mod at 55 Hz
# (adds the faint "speaker grille" buzz without hiding words), compressor, limiter at -1 dBFS.
FILTER = ('highpass=f=300:poles=2,lowpass=f=3600:poles=2,'
          'acrusher=bits=9:mode=log:mix=0.22:aa=1,'
          "aeval='val(0)*(0.82+0.18*sin(2*PI*55*t))':c=same,"
          'acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=2,'
          'alimiter=limit=0.89')
DRY = 'alimiter=limit=0.89'
OPUS = ['-c:a', 'libopus', '-b:a', '24k', '-vbr', 'on', '-application', 'voip', '-ac', '1', '-ar', '24000']
AAC = ['-c:a', 'aac', '-b:a', '32k', '-ac', '1', '-ar', '24000']
GAPS = {'digit': 40, 'word': 70, 'comma': 150, 'colon': 220, 'stop': 300}
DIGIT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
NUM_WORDS = {1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
             11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen', 16: 'sixteen', 17: 'seventeen',
             18: 'eighteen', 19: 'nineteen', 20: 'twenty', 25: 'twenty-five', 30: 'thirty', 50: 'fifty', 100: 'one hundred', 150: 'one hundred fifty', 200: 'two hundred',
             250: 'two hundred fifty', 300: 'three hundred', 350: 'three hundred fifty', 400: 'four hundred', 450: 'four hundred fifty'}
NUMBER_SLOTS = {'count', 'level', 'rank'}
SLOT_RE = re.compile(r'\{(\w+)\}')

sha = lambda s: hashlib.sha256(s.encode()).hexdigest()
norm = lambda s: re.sub(r'\s+', ' ', str(s)).strip().lower()


def region_tags(entry, fields):
    if not isinstance(entry, dict): return None
    for f in fields:
        v = entry.get(f)
        if v is None: continue
        vs = v if isinstance(v, list) else [v]
        return {f'region_{x}' if isinstance(x, int) or str(x).isdigit() else str(x) for x in vs}
    return None


def base_of(key, bases):
    """The scope base this key belongs to (exact or <base>_<n>, n >= 2), else None."""
    if key in bases: return key
    m = re.match(r'^(.*)_(\d+)$', key)
    return m.group(1) if m and int(m.group(2)) >= 2 and m.group(1) in bases else None


def select_keys(section, scope):
    """-> {key: region} for every voiced key."""
    build = set(scope['build_regions']); fields = scope.get('region_tag_fields', ['region', 'regions'])
    out = {}
    excl = {k for r in scope['build_regions'] for k in scope['regions'][r].get('exclude_keys', [])}  # unreachable in the built regions
    for key, entry in section.items():
        if key.startswith('_') or key == 'speaker' or key in excl: continue
        pages = entry.get('pages') if isinstance(entry, dict) else entry
        if not isinstance(pages, list) or not pages: continue
        tags = region_tags(entry, fields)
        if tags is not None:
            hit = sorted(tags & build)
            if hit: out[key] = hit[0]
            continue
        for r in scope['build_regions']:
            if base_of(key, set(scope['regions'][r]['keys'])): out[key] = r; break
    return out


def split_page(text):
    """'{employee_id}: {area} logged.' -> [('slot','employee_id'), ('pause','colon'), ('slot','area'), ('text','logged.')]"""
    segs, pos = [], 0
    def add_text(t, before_slot):
        lead = re.match(r'^[\s,:;.!?\-–—]*', t).group(0)
        body = t[len(lead):]
        p = lead.strip()
        if segs and segs[-1][0] == 'slot' and p:
            segs.append(('pause', 'colon' if ':' in p else 'stop' if re.search(r'[.!?]', p) else 'comma'))
        if not body.strip(): return
        trail = re.search(r'[\s,:;\-–—]*$', body).group(0)
        say = body[: len(body) - len(trail)] if before_slot else body
        if say.strip(): segs.append(('text', say.strip()))
        if before_slot:
            tp = trail.strip()
            segs.append(('pause', 'colon' if ':' in tp else 'comma' if ',' in tp else 'word'))
    for m in SLOT_RE.finditer(text):
        add_text(text[pos:m.start()], True)
        if segs and segs[-1] == ('pause', 'word') and len(segs) == 1: segs.pop()
        segs.append(('slot', m.group(1))); pos = m.end()
    add_text(text[pos:], False)
    return segs


class Renderer:
    def __init__(self, dry_run=False):
        self.k = None; self.dry_run = dry_run; self.rendered = 0; self.encoded = 0
        (CACHE / 'clips').mkdir(parents=True, exist_ok=True)

    def tts(self, text):
        """Raw (trimmed, level-matched) 24 kHz WAV path for text; cached by hash."""
        key = sha(json.dumps([text, VOICE, MODEL_TAG]))
        p = CACHE / 'clips' / f'{key[:24]}.wav'
        if p.exists() or self.dry_run: return p, key
        import numpy as np, soundfile as sf
        if self.k is None:
            from kokoro_onnx import Kokoro
            self.k = Kokoro(str(MODEL), str(VOICES))
        a, sr = self.k.create(text, voice=VOICE['voice'], speed=VOICE['speed'], lang=VOICE['lang'])
        a = np.asarray(a, dtype='float32')
        env = np.abs(a) > (10 ** (-42 / 20)) * max(1e-6, float(np.abs(a).max()))
        idx = np.nonzero(env)[0]
        if len(idx): a = a[max(0, idx[0] - int(0.012 * sr)): min(len(a), idx[-1] + int(0.03 * sr))]
        rms = float(np.sqrt(np.mean(a ** 2))) or 1e-6
        a = np.clip(a * (10 ** (-19 / 20) / rms), -0.98, 0.98)
        fade = min(len(a) // 4, int(0.006 * sr))
        if fade: a[:fade] *= np.linspace(0, 1, fade); a[-fade:] *= np.linspace(1, 0, fade)
        sf.write(p, a, sr, subtype='PCM_16'); self.rendered += 1
        return p, key

    def ship(self, kind, text):
        """-> (stem, ms). Encodes filtered OGG + M4A into OUT when missing."""
        wav, key = self.tts(text)
        stem = f'{kind}_{sha(key + FILTER + " ".join(OPUS + AAC))[:12]}'
        ogg, m4a = OUT / f'{stem}.ogg', OUT / f'{stem}.m4a'
        if not self.dry_run and not (ogg.exists() and m4a.exists()):
            for dst, codec in ((ogg, OPUS), (m4a, AAC)):
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav), '-af', FILTER, *codec, str(dst)], check=True)
            self.encoded += 1
        ms = 0
        if wav.exists():
            import soundfile as sf
            info = sf.info(str(wav)); ms = round(info.frames * 1000 / info.samplerate)
        return stem, ms, wav


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--samples', action='store_true', help='also write the sample MP3s for Gary to shots/rita_voice/')
    ap.add_argument('--dry-run', action='store_true', help='plan only: keys, clips, nothing rendered')
    args = ap.parse_args()
    if not shutil.which('ffmpeg'): sys.exit('ffmpeg not found (needed for the filter and Opus encode)')
    lines = json.loads(LINES.read_text()); scope = json.loads(SCOPE.read_text()); cfg = json.loads(CV_CFG.read_text())
    section = lines[scope.get('line_section', 'system_company_voice')]
    # Code-default lines with no overworld_lines entry (e.g. rita_trainer1 = company_voice.js TRAINER1_INTRO), voiced like
    # a tagged key. scope.regions.<r>.extra_lines {key: [pages]}; never overrides a Text Bot key (Oct 27 2026).
    section = dict(section)
    for r_ in scope['build_regions']:
        for k_, pg_ in scope['regions'][r_].get('extra_lines', {}).items(): section.setdefault(k_, {'pages': pg_, 'region': r_})
    max_pages = cfg['timing']['max_pages']
    keys = select_keys(section, scope)
    OUT.mkdir(parents=True, exist_ok=True)
    R = Renderer(args.dry_run)
    clips, wavs = {}, {}

    core = scope['build_regions'][0]; at = {'r': core}; owner = {}  # per-region lazy parts: a clip belongs to the first region that needs it

    def clip(kind, text):
        stem, ms, wav = R.ship(kind, text)
        clips[stem] = {'ms': ms, 'say': text}; wavs[stem] = wav; owner.setdefault(stem, at['r'])
        return stem

    digits = {str(d): clip('d', DIGIT_WORDS[d].capitalize()) for d in range(10)}
    id_words = {'Trainer 1': clip('w', 'Trainer 1')}  # {employee_id} after RITA's Trainer 1 intro (Gary 3:31 PM CT Oct 23 2026)
    numbers, names, used_slots, line_out = {}, {}, set(), {}
    for key, region in sorted(keys.items(), key=lambda kv: (scope['build_regions'].index(kv[1]), kv[0])):
        at['r'] = region; entry = section[key]; pages = (entry.get('pages') if isinstance(entry, dict) else entry)[:max_pages]
        out_pages = []
        for text in pages:
            segs = []
            for kind, v in split_page(text):
                if kind == 'text': segs.append({'c': clip('f', v)})
                elif kind == 'pause': segs.append({'p': GAPS[v]})
                else: segs.append({'s': v}); used_slots.add(v)
            out_pages.append({'src': text, 'segs': segs})
        line_out[key] = {'region': region, 'pages': out_pages}
    for r in scope['build_regions']:
        reg = scope['regions'][r]; say = reg.get('say', {}); at['r'] = r
        for n in reg.get('numbers', []):
            if str(n) in numbers: continue
            numbers[str(n)] = clip('n', NUM_WORDS.get(int(n), str(n)).capitalize())
        for slot, vals in reg.get('names', {}).items():
            for v in vals:
                if norm(v) not in names.get(slot, {}): names.setdefault(slot, {})[norm(v)] = clip('w', say.get(v, v))
    missing_slots = sorted(s for s in used_slots if s != 'employee_id' and s not in NUMBER_SLOTS and s not in names)
    manifest = {
        '_note': 'Generated by tools/build_rita_voice.py (do not edit). Segments: c = clip stem, s = slot, p = pause ms. '
                 'A page whose current text differs from src, or with a slot that has no clip, plays text-only.',
        'version': 1, 'regions': scope['build_regions'], 'base': 'assets/audio/rita/', 'formats': ['ogg', 'm4a'],
        'tts': {'model': 'Kokoro-82M v1.0 (hexgrad, Apache-2.0) via kokoro-onnx (MIT)', **VOICE},
        'filter': FILTER, 'gaps': GAPS, 'digits': digits, 'id_words': id_words, 'numbers': numbers, 'names': names,
        'lines': line_out, 'clips': clips,
    }
    # Split: manifest.json = core region (loaded on the first tap); manifest_<region>.json = the rest, loaded by the runtime
    # only when a page has no plan in what is loaded so far (rita_voice.js loadParts). Parts merge lines/names/numbers/clips.
    parts = {}
    for r in scope['build_regions'][1:]:
        mine = {s for s, o in owner.items() if o == r}
        parts[r] = {'_note': f'Generated by tools/build_rita_voice.py: {r} part, merged into manifest.json at runtime.', 'region': r,
                    'lines': {k: v for k, v in line_out.items() if v['region'] == r},
                    'numbers': {k: v for k, v in numbers.items() if v in mine},
                    'names': {sl: {n: c for n, c in d.items() if c in mine} for sl, d in names.items() if any(c in mine for c in d.values())},
                    'clips': {s: clips[s] for s in mine}}
    if parts:
        rest = {s for p_ in parts.values() for s in p_['clips']}
        manifest = {**manifest, 'regions': [core], 'parts': {r: f'manifest_{r}.json' for r in parts},
                    'lines': {k: v for k, v in line_out.items() if v['region'] == core},
                    'numbers': {k: v for k, v in numbers.items() if v not in rest},
                    'names': {sl: {n: c for n, c in d.items() if c not in rest} for sl, d in names.items()},
                    'clips': {s: v for s, v in clips.items() if s not in rest}}
    if not args.dry_run:
        (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + '\n')
        for r, p_ in parts.items(): (OUT / f'manifest_{r}.json').write_text(json.dumps(p_, indent=1, ensure_ascii=False) + '\n')
        for r, p_ in parts.items(): print(f'part {r}: {len(p_["lines"])} keys, {len(p_["clips"])} clips')
    shipped = {f'{s}.{e}' for s in clips for e in ('ogg', 'm4a')}
    files = [p for p in OUT.iterdir() if p.suffix in ('.ogg', '.m4a')] if OUT.exists() else []
    size = lambda ext: sum(p.stat().st_size for p in files if p.name in shipped and p.suffix == ext)
    orphans = sorted(p.name for p in files if p.name not in shipped)
    print(f'keys voiced: {len(keys)}  ({", ".join(sorted(keys))})')
    print(f'clips: {len(clips)}  (tts rendered now: {R.rendered}, encoded now: {R.encoded})')
    print(f'slots used: {sorted(used_slots)}  name slots without a list: {missing_slots or "none"}')
    print(f'size: ogg {size(".ogg")/1e6:.2f} MB, m4a fallback {size(".m4a")/1e6:.2f} MB, manifest {((OUT/"manifest.json").stat().st_size if (OUT/"manifest.json").exists() else 0)/1e3:.1f} kB')
    if orphans: print(f'orphans (not deleted, repo rule): {len(orphans)}')
    if args.samples and not args.dry_run: write_samples({**manifest, 'lines': line_out, 'clips': clips, 'names': names, 'numbers': numbers}, wavs)


SAMPLE_ID = '001893'
SAMPLE_SET = [  # (file, key, page vars); Gary's model line first
    ('01_kilindex_new_gary_line', 'kilindex_new', {}),
    ('02_milestone_10', 'kilindex_milestone_10', {'count': 10}),
    ('03_master_beaten_fernwick', 'master_beaten', {'master': 'Fernwick'}),
    ('04_area_logged_trail1', 'area_new', {'area': 'Trail 1'}),
    ('05_quest_done', 'quest_done_2', {'quest': 'The Bean Thief'}),
    ('06_rival_ron', 'rival_beaten_3', {'trainer': 'Ron'}),
]


def seq_for(manifest, key, vars_):
    """Whole message (all pages) as [(stem | None, gap_ms)] - the same resolution the runtime does."""
    out = []
    for pi, page in enumerate(manifest['lines'][key]['pages']):
        if pi: out.append((None, 450))
        for seg in page['segs']:
            if 'c' in seg: out.append((seg['c'], 0))
            elif 'p' in seg: out.append((None, seg['p']))
            elif seg['s'] == 'employee_id':
                for i, ch in enumerate(vars_.get('employee_id', SAMPLE_ID)):
                    if i: out.append((None, manifest['gaps']['digit']))
                    out.append((manifest['digits'][ch], 0))
            elif seg['s'] in NUMBER_SLOTS: out.append((manifest['numbers'][str(vars_[seg['s']])], 0))
            else: out.append((manifest['names'][seg['s']][norm(vars_[seg['s']])], 0))
        # word gap between adjacent clips
    fixed = []
    for i, (s, g) in enumerate(out):
        if s and fixed and fixed[-1][0]: fixed.append((None, manifest['gaps']['word']))
        fixed.append((s, g))
    return fixed


def write_samples(manifest, wavs):
    import numpy as np, soundfile as sf
    SAMPLES.mkdir(parents=True, exist_ok=True)
    def build(name, key, vars_, filt):
        parts, sr = [], 24000
        for stem, gap in seq_for(manifest, key, vars_):
            if stem: a, sr = sf.read(str(wavs[stem]), dtype='float32'); parts.append(a)
            else: parts.append(np.zeros(int(sr * gap / 1000), dtype='float32'))
        tmp = Path(tempfile.mkstemp(suffix='.wav')[1]); sf.write(tmp, np.concatenate(parts), sr)
        dst = SAMPLES / f'{name}.mp3'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-af', f'apad=pad_dur=0.25,{filt}', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', str(dst)], check=True)
        tmp.unlink(); return dst
    made = [build(n, k, v, FILTER) for n, k, v in SAMPLE_SET]
    made.append(build('00_unfiltered_kilindex_new_gary_line', 'kilindex_new', {}, DRY))
    texts = {n: ' / '.join(p['src'] for p in manifest['lines'][k]['pages']) for n, k, v in SAMPLE_SET}
    (SAMPLES / 'README.md').write_text('# RITA voice samples (DRAFT, dev only, for Gary to hear before anything ships)\n\n'
        f'Employee number in every sample: {SAMPLE_ID} (read digit by digit). Voice: Kokoro-82M {VOICE["voice"]}. '
        'Samples are stitched exactly like the game does it (separate clips + small gaps). Filtered = comms filter; '
        '00_unfiltered = same clips, no filter.\n\n' + ''.join(f'- `{n}.mp3`: {t}\n' for n, t in texts.items())
        + '- `00_unfiltered_kilindex_new_gary_line.mp3`: Gary\'s line without the filter\n')
    for p in made: print('sample:', p.relative_to(ROOT), f'{p.stat().st_size/1e3:.0f} kB')


if __name__ == '__main__':
    main()
