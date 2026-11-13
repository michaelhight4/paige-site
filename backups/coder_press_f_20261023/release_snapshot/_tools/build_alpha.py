#!/usr/bin/env python3
"""Kilumen ALPHA build (paigegames.net/kilumen/) from a read-only snapshot. Never touches the live repo.
usage: build_alpha.py stage|final   (stage: code + symlinked art/text for the asset trace; final: code + traced assets)"""
import json, os, re, shutil, sys
from pathlib import Path

SNAP = Path(os.environ.get('ALPHA_SNAP', '/workspace/kilumen_release_r1/_work/snap')).resolve()
HERE = Path('/workspace/kilumen_release_r1')
BDIR = Path(os.environ.get('ALPHA_B', str(HERE / 'build')))
OUT = BDIR / 'kilumen'
MODE = sys.argv[1] if len(sys.argv) > 1 else 'final'
# ---- ALPHA switches ----
BATTLE = os.environ.get('ALPHA_BATTLE', 'sd')   # 'sd' = engine battles, same as dev (Gary 12:39 AM CT Oct 23: "Put the new battles in the 2:30 alpha"); ?battle=shell stays a hidden fallback | 'shell' = force the old scripted shell
if BATTLE not in ('shell', 'sd'): raise SystemExit('ALPHA_BATTLE must be shell or sd')
POSES = os.environ.get('ALPHA_POSES', 'snapshot')  # 'snapshot' = keep the snapshot's FX_CFG.poses.on | 'off' = pin off
PAINTED = ['art/world/key_art_notext.png', 'art/world/battle_bg.png', 'art/world/world_map.png']  # shipped as .webp

def rd(p): return (SNAP / p).read_text(encoding='utf-8')
def wr(p, s):
    d = OUT / p; d.parent.mkdir(parents=True, exist_ok=True); d.write_text(s, encoding='utf-8')
def sub(s, old, new, count=1, what=''):
    n = s.count(old)
    if n != count: raise SystemExit(f'PATCH FAIL ({what}): expected {count} x {old[:90]!r}, found {n}')
    return s.replace(old, new)

if OUT.exists(): shutil.rmtree(OUT)
OUT.mkdir(parents=True)

# ---------- index.html ----------
s = rd('index.html')
s = sub(s, '<title>Kilumen: Start of a Journey (overworld dev)</title>',
  '<title>Kilumen: Start of a Journey (Alpha)</title>\n'
  '  <meta name="description" content="Kilumen is a free creature-raising adventure in your browser. Alpha: things will change.">\n'
  '  <link rel="canonical" href="https://paigegames.net/kilumen/">\n'
  '  <meta name="theme-color" content="#0b0d1a">', what='title')
s = sub(s, '<button data-btn="debug" class="small" aria-label="Toggle debug overlay">DBG</button>',
  '<button data-btn="debug" class="small" aria-label="Toggle debug overlay" hidden tabindex="-1">DBG</button>', what='dbg')
# axe (wcag2aa meta-viewport): allow browser zoom; pinch / double-tap on the game are still blocked by touch-action:none + input.js
s = sub(s, 'initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no', 'initial-scale=1, viewport-fit=cover', what='viewport')
# axe (region): the world canvas sits in a <main> landmark
s = sub(s, '<canvas id="world" aria-label="Kilumen overworld"></canvas>', '<main><canvas id="world" aria-label="Kilumen overworld"></canvas></main>', what='main')
# v0.1.1: the PWA is off by default in dev (?pwa=1 opts in); the alpha ships no service worker or PWA loader at all.
s, n = re.subn(r"\n  <script type=\"module\">/\* Kilumen PWA: off unless \?pwa=1.*?</script>", "", s, flags=re.S)
if n != 1: raise SystemExit('PATCH FAIL pwa loader')
# v0.1.2: the stats.js perf panel (?debug=perf -> src/debug_perf.js -> src/vendor/stats.js/) is dev only: drop its loader line
s, n = re.subn(r"\n *<script type=\"module\">/\* Kilumen perf panel:.*?</script>", "", s, flags=re.S)
if n > 1 or 'debug_perf' in s: raise SystemExit('PATCH FAIL debug_perf loader')
print('debug_perf loader removed:', n)
wr('index.html', s)

# ---------- style.css ----------
s = rd('style.css') + '\n/* ALPHA build: the debug overlay is off, so its touch button never shows. */\n#touchpad [data-btn=debug] { display: none !important; }\n'
wr('style.css', s)

# ---------- manifest ----------
m = json.loads(rd('manifest.webmanifest')); m['name'] = 'Kilumen: Start of a Journey (Alpha)'
wr('manifest.webmanifest', json.dumps(m, indent=2) + '\n')

# ---------- src ----------
for p in (SNAP / 'src').rglob('*'):
    if p.is_file(): (OUT / p.relative_to(SNAP)).parent.mkdir(parents=True, exist_ok=True); shutil.copy2(p, OUT / p.relative_to(SNAP))
shutil.copy2(HERE / '_tools' / 'alpha.js', OUT / 'src' / 'alpha.js')
VER = os.environ.get('ALPHA_VER')  # e.g. v0.1.2-alpha
if VER:
    a = (OUT / 'src' / 'alpha.js').read_text(); a2 = re.sub(r"ALPHA_VERSION = 'v[0-9.]+-alpha", f"ALPHA_VERSION = '{VER}", a); assert a2 != a; (OUT / 'src' / 'alpha.js').write_text(a2)

f = 'src/landscape.js'; s = rd(f)
s = sub(s, "import { startPlatform } from './platform.js';", "import './alpha.js'; // ALPHA build: strips URL flags before the platform is picked\nimport { startPlatform } from './platform.js';", what='landscape')
wr(f, s)

f = 'src/main.js'; s = rd(f)
s = sub(s, "import { CONFIG } from './config.js';", "// ALPHA build (src/alpha.js): none of the dev params above are read; only ?reset=1 (New game) is kept.\nimport { ALPHA_QUERY } from './alpha.js';\nimport { CONFIG } from './config.js';", what='main import')
s = sub(s, "const q = new URLSearchParams(location.search);", "const q = new URLSearchParams(ALPHA_QUERY);", what='main q')
# v0.1.1: ?ink=1 (draft ink dialogue) and ?online=1 (shelved) are not shipped: drop the hooks so their code is not in the build.
s, n = re.subn(r"\nif \(q\.get\('ink'\) === '1'\)[^\n]*\n", "\n", s)
if n != 1: raise SystemExit('PATCH FAIL ink hook')
s, n = re.subn(r"\n// Online play, stage 1 prototype.*?\nif \(q\.get\('online'\) === '1'\) \{\n.*?\n\}\n", "\n", s, flags=re.S)
if n != 1: raise SystemExit('PATCH FAIL online block')
wr(f, s)

f = 'src/ui/ui.js'; s = rd(f)
s = sub(s, "import { getNextFocus } from '../vendor/lrud-spatial/lrud.js';", "import { getNextFocus } from '../vendor/lrud-spatial/lrud.js';\nimport { ALPHA_VERSION, ALPHA_NOTICE, noticeSeen, markNoticeSeen } from '../alpha.js';", what='ui import')
s = sub(s, "      ['Screen previews (dev build)', '▶', () => this.open('previews')],\n", "", what='previews row')
s = sub(s, "onA: (i) => { rows()[i][2](); if (i < rows().length - 1) this.rerender(); },", "onA: (i) => { rows()[i][2](); this.rerender(); },", what='options rerender')
s = sub(s, ",\n      ...(this.q.get('dev') === '1' || this.q.get('debug') === '1' ? [['Tuning panel (dev)', () => import('./devpanel.js').then((m) => m.openDevPanel(this))]] : [])];", "];", what='previews devpanel')
s = sub(s, "<span class=\"sub\">Start of a Journey</span></div>", "<span class=\"sub\">Start of a Journey</span><span class=\"alpha-badge\" title=\"Alpha: early version\">Alpha</span></div>", what='badge')
s = sub(s, '<span class="foot">Dev build</span>', '<span class="foot">${esc(ALPHA_VERSION)}</span>', what='foot')
s = sub(s, "    return new Promise((resolve) => {\n      const wrap = document.createElement('div'); wrap.className = 'ui-modal';", "    return new Promise((resolve) => {\n      const wrap = document.createElement('div'); wrap.className = 'ui-modal'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-label', text[0] || 'Message');", what='ask role')
s = sub(s, "'kilumen.ui.motion'", "'kilumen_alpha_ui.motion'", count=2, what='motion key')
for p in PAINTED: s = sub(s, p, p[:-4] + '.webp', what=p)
if "  if (q.get('battle') === 'shell') scene.hooks.onBattle = " in s:  # pre-Oct-23 code: shell was opt-in, engine behind ?battle=sd
    if BATTLE != 'shell': raise SystemExit('ALPHA_BATTLE=sd needs the Oct 23 code (sd default)')
    s = sub(s, "  if (q.get('battle') === 'shell') scene.hooks.onBattle = ", "  // ALPHA build: trainer battles use the scripted battle shell (same as ?battle=shell in dev); the engine battle is not shipped.\n  scene.hooks.onBattle = ", what='shell battle')
    OLD_SD = True
else:  # Oct 23 code: engine (sd) is the default, ?battle=shell is the escape hatch -> one constant decides
    if BATTLE == 'shell': s = sub(s, "q.get('battle') === 'shell'", "ALPHA_SHELL", count=2, what='battle switch')
    else: assert s.count("q.get('battle') === 'shell'") == 2, 'battle switch text changed'
    if BATTLE == 'shell': s = sub(s, "export function mountUI(opts) {", f"// ALPHA build battle switch (tools/build_alpha.py ALPHA_BATTLE={BATTLE}): true = old scripted battle shell (?battle=shell), false = sd engine.\nconst ALPHA_SHELL = {'true' if BATTLE == 'shell' else 'false'};\nexport function mountUI(opts) {{", what='battle const')
    if BATTLE == 'shell':  # drop the engine wiring so src/battle/ui_sd.js is not reachable (not shipped)
        s, n = re.subn(r"\n  if \(!shell\) \{\n    // trainers resolve won/lost from the engine result\n.*?\n  \}\n", "\n", s, flags=re.S)
        if n != 1: raise SystemExit('PATCH FAIL sd wiring block')
    OLD_SD = False
s = sub(s, "  if (q.get('dev') === '1') import('./devpanel.js').then((m) => m.openDevPanel(ui)).catch((e) => console.warn('dev panel:', e.message)); // UI tools pass: dev only\n", "", what='devpanel')
if OLD_SD:
    s, n = re.subn(r"  if \(q\.get\('battle'\) === 'sd'\) \{\n.*?\n    if \(want === 'battle'\) \{[^\n]*\n  \}\n", "", s, flags=re.S)
    if n != 1: raise SystemExit('PATCH FAIL sd block')
s = sub(s, "(q.get('title') !== '0' && location.search === ''));", "(q.get('title') !== '0' && !q.has('reset')));", what='titleOnBoot')
s = sub(s, "this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true');", "this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true'); this.root.setAttribute('aria-label', 'Kilumen');", what='rootlabel')
s = sub(s, "  if (want === 'phone' || want === 'title' || titleOnBoot) ui.open(want === 'phone' ? 'phone' : 'title');",
  "  if (want === 'phone' || want === 'title' || titleOnBoot) ui.open(want === 'phone' ? 'phone' : 'title');\n"
  "  // ALPHA build: first-launch notice (remembered in localStorage kilumen_alpha_notice_seen.v1).\n"
  "  if (!noticeSeen()) setTimeout(() => ui.ask('title', [ALPHA_NOTICE], ['Got it'], { pat: 'sparkle' }).then(markNoticeSeen), 300);", what='notice')
s, n = re.subn(r"\n  scr_previews\(\) \{.*?\n  \}\n(?=  scr_tasks\(\))", "\n", s, flags=re.S)
if n != 1: raise SystemExit('PATCH FAIL previews')
wr(f, s)

f = 'src/ui/ui.css'; s = rd(f) + ('\n/* ALPHA build: title badge (dark plate, sun text: 12:1 contrast). Static, no animation. */\n'
  '.ui-logo .alpha-badge { display: inline-block; vertical-align: middle; margin: 10px 0 0 10px; padding: 3px 12px; border: 3px solid var(--outline); border-radius: var(--r-chip);\n'
  '  background: var(--night); color: var(--sun); font-weight: 800; letter-spacing: .14em; text-transform: uppercase; font-size: max(12px, calc(var(--ui-logo, 120px) * .15)); }\n')
wr(f, s)

for f, old, new, c in [
  ('src/audio/audio.js', "'kilumen.audio.'", "'kilumen_alpha_audio.'", 1),
  ('src/overworld/depth.js', "'kilumen.depth.v1'", "'kilumen_alpha_depth.v1'", 1),
  ('src/overworld/save_backend.js', "'kilumen.save.migrated'", "'kilumen_alpha_save.migrated'", 1),
  ('src/overworld/save.js', "'kilumen.save.v1'", "'kilumen_alpha_save.v1'", 1),
  ('src/overworld/living.js', "'kilumen.settings.v1'", "'kilumen_alpha_settings.v1'", 1),
  ('src/overworld/overworld.js', "    if (snap.debug) this.debug = !this.debug;", "    // ALPHA build: the debug overlay (F3 / ` / L3 / DBG) is off.", 1),
]:
    wr(f, sub(rd(f), old, new, c, what=f))

f = 'src/overworld/constants.js'; s = rd(f)
s = sub(s, "// blocked until a field skill (surf-style) exists; see FIELD_SKILLS.md (not written yet)", "// blocked until a water-crossing field skill exists", what='const1')
s = sub(s, "// EXTRA_TILES.md: needs Dive / strong Surf: blocked for now", "// needs a deep-water field skill: blocked for now", what='const2')
wr(f, s)

# capture poses: URL switches (?poses / ?posechar) ignored; on/off follows the snapshot (bone_v2 one-arm approved by Gary 12:00 AM CT Oct 23) unless ALPHA_POSES=off.
f = 'src/ui/fx_art.js'; s = rd(f)
s = sub(s, "new URLSearchParams(location.search).get('poses')", "null /* ALPHA build: ?poses ignored */", what='poses')
if "get('posechar')" in s: s = sub(s, "new URLSearchParams(location.search).get('posechar')", "null /* ALPHA build: ?posechar ignored */", what='posechar')
if POSES == 'off' and 'poses: { on: true' in s: s = sub(s, 'poses: { on: true', 'poses: { on: false', what='poses off')
print('capture poses:', 'ON' if 'poses: { on: true' in s else 'OFF')
wr(f, s)
# overnight systems (src/overnight/): keep the dev defaults; ?ov= is already dropped by alpha.js; pin stagedMaps (36 dev-preview interiors) off.
if (SNAP / 'src/overnight/flags.js').is_file():
    f = 'src/overnight/flags.js'; s = rd(f)
    s = sub(s, "  stagedMaps: false,", "  stagedMaps: false, // ALPHA build: pinned off", what='stagedMaps')
    s = sub(s, "const raw = query?.get?.('ov') || '';", "const raw = ''; // ALPHA build: ?ov= ignored", what='ov param')
    wr(f, s)

# strip internal "_notes" from the platform / depth JSON (code never reads "_" keys)
def strip(o):
    if isinstance(o, dict): return {k: strip(v) for k, v in o.items() if not k.startswith('_')}
    if isinstance(o, list): return [strip(v) for v in o]
    return o
for f in ['src/platform/pc.json', 'src/platform/mobile.json', 'src/overworld/depth.json']:
    wr(f, json.dumps(strip(json.loads(rd(f))), indent=1) + '\n')

# v0.1.2 blocked words (Gary's list): the engine's internal protocol tokens only (never shown; the UI says "That hit its weak spot!").
# Renamed consistently in the engine and its UI: "-supereffective" -> "-weakspot"; the unused set.shiny / ", shiny" detail -> glint.
if (OUT / 'src/battle/engine.js').is_file():
    e = (OUT / 'src/battle/engine.js').read_text(encoding='utf-8'); u = (OUT / 'src/battle/ui_sd.js').read_text(encoding='utf-8')
    if e.count('"-supereffective"') == 1 and u.count("'-supereffective'") == 1 and e.count('set.shiny?", shiny":""') == 1 and e.count('replace(", shiny","")') == 1 and e.count('shiny') == 3:
        e = e.replace('"-supereffective"', '"-weakspot"').replace('set.shiny?", shiny":""', 'set.glint?", glint":""').replace('replace(", shiny","")', 'replace(", glint","")')
        u = u.replace("'-supereffective'", "'-weakspot'")
        (OUT / 'src/battle/engine.js').write_text(e, encoding='utf-8'); (OUT / 'src/battle/ui_sd.js').write_text(u, encoding='utf-8'); print('engine tokens renamed (blocked words)')
    else: print('WARNING engine tokens changed; blocked-word rename skipped')
# progression (src/progression/): keep the dev defaults (masters on; masterTeamFernwick, masterGifts, hallPuzzles, quests off); ?pg= ignored.
if (SNAP / 'src/progression/flags.js').is_file():
    f = 'src/progression/flags.js'; s = (OUT / f).read_text(encoding='utf-8') if (OUT / f).is_file() else rd(f)
    s = sub(s, "const raw = query?.get?.('pg') || '';", "const raw = ''; // ALPHA build: ?pg= ignored", what='pg param')
    for k, v in [('masters', 'true'), ('masterTeamFernwick', 'false'), ('masterGifts', 'false'), ('hallPuzzles', 'false'), ('quests', 'false')]:
        if not re.search(rf"\n  {k}: +{v},", s): raise SystemExit(f'PATCH FAIL progression default {k} != {v}')
    wr(f, s)
print('battle mode:', BATTLE)
# ---------- v0.1.2: no save before the player picks Continue / New game on the first-launch title ----------
# Dev boot marks the scene dirty and autosaves within ~2 s, so a first-time player saw "Continue" on the title (gate check 3).
# store.hold blocks writes from boot until a title choice, only when there is no save at boot and the title opens.
def osub(p, old, new, what):
    t = (OUT / p).read_text(encoding='utf-8'); (OUT / p).write_text(sub(t, old, new, what=what), encoding='utf-8')
osub('src/overworld/save.js', "  save(state) {\n    if (!this.storage) return false;", "  save(state) {\n    if (!this.storage || this.hold) return false; // ALPHA: hold = first launch, title choice not made yet", 'save hold')
osub('src/main.js', "const saveData = store.load();\n", "const saveData = store.load();\nif (!saveData && !q.has('reset') && q.get('title') !== '0') store.hold = true; // ALPHA: first launch, nothing saved until Continue / New game\n", 'main hold')
osub('src/ui/ui.js', "        const it = items[i];\n        if (it === 'Continue') {", "        const it = items[i];\n        if (it !== 'Options' && this.scene.store) this.scene.store.hold = false; // ALPHA: saving starts with the first title choice\n        if (it === 'Continue') {", 'title hold release')
print('first-launch save hold: patched')
# ---------- keep only src reachable from the entry modules (static + literal dynamic imports) ----------
IMP = re.compile(r"""(?:import\s*(?:[\w*{}\s,]+from\s*)?|import\s*\(\s*|export\s*[\w*{}\s,]+from\s*)['"](\.{1,2}/[^'"]+)['"]""")
# v0.1.1: ui_tools2.js / ui.js lazy-load these through URL constants (not literal imports), so list them as roots
keep, todo = set(), ['src/landscape.js', 'src/main.js', 'src/vendor/auto-animate/auto-animate.min.js', 'src/vendor/floating-ui/floating-ui.dom.bundle.min.mjs', 'src/vendor/animejs/anime.ui.min.mjs', 'src/vendor/sortablejs/sortable.esm.min.js']
# v0.1.2: every <script src="src/..."> in the built index.html is a root too (src/fullscreen.js, mobile full-screen pass)
todo += [x for x in re.findall(r'<script[^>]*\ssrc="(src/[^"?#]+)"', (OUT / 'index.html').read_text(encoding='utf-8')) if x not in todo]
print('index.html script roots:', re.findall(r'<script[^>]*\ssrc="(src/[^"?#]+)"', (OUT / 'index.html').read_text(encoding='utf-8')))
while todo:
    f = todo.pop()
    if f in keep: continue
    keep.add(f)
    txt = (OUT / f).read_text(encoding='utf-8')
    for rel in IMP.findall(txt):
        t = os.path.normpath(os.path.join(os.path.dirname(f), rel))
        if not (OUT / t).exists(): raise SystemExit(f'missing import {t} from {f}')
        todo.append(t)
data_src = ['src/platform/pc.json', 'src/platform/mobile.json', 'src/overworld/depth.json', 'src/ui/theme.css', 'src/ui/ui.css', 'src/ui/ui_tools2.css', 'src/ui/systems_screens.css', 'src/systems/data/shops.json', 'src/systems/data/contacts.json', 'src/ui/rt_benefits.css']  # r5: rt_benefits.css is a <link> added at runtime by rt_benefits_screen.js  # r4: contacts data (fetched by contacts.js)  # v0.1.1: systems + UI tools CSS/data
for p in list((OUT / 'src').rglob('*')):
    r = str(p.relative_to(OUT))
    if p.is_file() and r not in keep and r not in data_src:
        lic = p.name.upper().startswith('LICENSE') and any(k.startswith(str(p.parent.relative_to(OUT)) + '/') for k in keep)
        if not lic: p.unlink()
for d in sorted((OUT / 'src').rglob('*'), key=lambda x: -len(str(x))):
    if d.is_dir() and not any(d.iterdir()): d.rmdir()
shutil.copy2(SNAP / 'THIRD_PARTY_LICENSES', OUT / 'THIRD_PARTY_LICENSES')

# ---------- assets ----------
if MODE == 'stage':
    from PIL import Image
    tmp = BDIR / 'painted'; tmp.mkdir(parents=True, exist_ok=True)
else:
    lst = [l.strip() for l in (BDIR / 'asset_list.txt').read_text().splitlines() if l.strip()]
    from PIL import Image
    for a in lst:
        if a[:-5] + '.png' in PAINTED and a.endswith('.webp'):
            continue
        (OUT / a).parent.mkdir(parents=True, exist_ok=True); shutil.copy2(SNAP / a, OUT / a)
    # licence for the CC0 placeholder icons ships with them
    for extra in (SNAP / 'art/ui/kenney_placeholder').glob('*'):
        if extra.suffix.lower() == '.txt' or extra.name.upper().startswith('LICENSE'):
            shutil.copy2(extra, OUT / 'art/ui/kenney_placeholder' / extra.name)
for p in PAINTED:
    dst = OUT / (p[:-4] + '.webp')
    if MODE == 'stage': dst = BDIR / 'painted' / Path(p[:-4] + '.webp').name
    im = Image.open(SNAP / p).convert('RGB'); dst.parent.mkdir(parents=True, exist_ok=True); im.save(dst, 'WEBP', quality=86, method=6)
# v0.1.1: maps with a puzzle block but no art/world/overworld/puzzles/<map>.runtime.json (greystone_b1) make the systems
# layer fetch a missing file (404 + console error) before it falls back to the map's own block. Ship that exact fallback
# ({...m.puzzle, solved_flag: 'puzzle_<map>_solved', initial_state: null}, src/systems/index.js puzzleFor) so behaviour is unchanged.
for mp in sorted((SNAP / 'art/world/overworld/maps').glob('*.json')):
    rel = f'art/world/overworld/maps/{mp.name}'
    if not (OUT / rel).is_file() and MODE == 'final': continue
    m = json.loads(mp.read_text(encoding='utf-8'))
    if not m.get('puzzle') or (SNAP / f'art/world/overworld/puzzles/{mp.stem}.runtime.json').is_file(): continue
    d = OUT / f'art/world/overworld/puzzles/{mp.stem}.runtime.json'; d.parent.mkdir(parents=True, exist_ok=True)
    d.write_text(json.dumps({**m['puzzle'], 'solved_flag': f'puzzle_{mp.stem}_solved', 'initial_state': None}, ensure_ascii=False) + '\n', encoding='utf-8')
    print('puzzle fallback runtime written:', d.relative_to(OUT))
if MODE == 'final':
    # scrub internal design notes from shipped JSON: runtime only reads exit/warp "note" values that start with "TO COME" (map.js isToCome)
    def scrub(o):
        if isinstance(o, dict):
            return {k: scrub(v) for k, v in o.items() if not (k.startswith('_') or k in ('notes', 'comment', 'todo', 'cleared_by') or (k == 'mood' and isinstance(v, dict))
                    or (k == 'note' and not (isinstance(v, str) and v.lstrip().upper().startswith('TO COME'))))}
        if isinstance(o, list): return [scrub(v) for v in o]
        if isinstance(o, str): return o.replace('A shiny new padlock.', 'A bright new padlock.')  # checklist: 'shiny' is a blocked player-text word
        return o
    for p in list(OUT.rglob('*.json')):
        if 'src/platform' in str(p) or p.name == 'manifest.webmanifest': continue
        p.write_text(json.dumps(scrub(json.loads(p.read_text(encoding='utf-8'))), ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print('built', MODE, OUT, 'src files kept:', len(keep))
