// Dev tuning panel (UI tools pass, Oct 22, 2026; Gary: "use them and log them for later use").
// DEV ONLY: loaded lazily by mountUI when the URL has ?dev=1, or from Options > Screen previews > "Tuning panel (dev)"
// (that row only shows with ?dev=1 or ?debug=1). Normal play never imports this file or lil-gui.
// - Edits the ACTIVE platform profile in memory (platform.profile.ui: --ui-* vars + a few flags). PC and mobile stay
//   independent: nothing here writes pc.json / mobile.json; "Export" downloads <platform>.ui.json for you to paste in.
// - Depth: src/overworld/depth.json is SHARED by both platforms (no per-platform depth block exists). Edits rebuild the
//   live DepthPass (normalizeDepth + cache.clear()); "Export depth.json" downloads the whole file.
// lil-gui 0.21.0, MIT (src/vendor/lil-gui/LICENSE).
import GUI from '../vendor/lil-gui/lil-gui.esm.min.js';
import { normalizeDepth } from '../overworld/depth.js';

const PX = /^(-?\d+(?:\.\d+)?)px$/;
const clone = (o) => JSON.parse(JSON.stringify(o));

function download(name, obj) {
  const text = JSON.stringify(obj, null, 2) + '\n';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  navigator.clipboard?.writeText(text).catch(() => {});
  return text;
}

export async function openDevPanel(ui) {
  if (ui._devGui) { ui._devGui.show(); ui._devGui.open(); return ui._devGui; }
  const plat = ui.platform || {}, id = plat.id || 'pc';
  // The platform profile is deep-frozen (src/platform.js), so the panel edits a mutable copy and swaps it into ui.cfg,
  // which GameUI reads live. The frozen profile (and the other platform's file) are never touched.
  const orig = clone(ui.cfg || plat.profile?.ui || {});
  const cfg = ui.cfg = clone(orig); cfg.vars = cfg.vars || {};
  const body = ui.body, scene = ui.scene;

  const gui = new GUI({ title: `Kilumen dev tuning · ${id}`, width: 300 });
  gui.domElement.classList.add('kil-devpanel');
  gui.domElement.dataset.platform = id;
  // typing in the panel must not walk the player or open the menu
  for (const ev of ['keydown', 'keyup']) gui.domElement.addEventListener(ev, (e) => e.stopPropagation());
  gui.domElement.addEventListener('pointerdown', (e) => e.stopPropagation());
  ui._devGui = gui;

  // --- UI vars (active profile only) ---
  const fv = gui.addFolder(`UI vars (${id}.json "ui.vars")`);
  const proxy = {};
  for (const [k, v] of Object.entries(cfg.vars)) {
    const m = PX.exec(String(v));
    const apply = (val) => { cfg.vars[k] = m ? `${val}px` : String(val); body.style.setProperty(`--ui-${k}`, cfg.vars[k]); };
    if (m) {
      proxy[k] = +m[1]; const n = +m[1];
      fv.add(proxy, k, 0, Math.max(64, Math.ceil(n * 3)), 1).name(k).onChange(apply);
    } else if (/^\d+$/.test(String(v))) {
      proxy[k] = +v; fv.add(proxy, k, 1, 8, 1).name(k).onChange((val) => { apply(val); ui.top && !ui.top.full && ui.rerender(); });
    } else { proxy[k] = String(v); fv.add(proxy, k).name(k).onFinishChange(apply); }
  }
  // --- UI flags (some only apply on next load) ---
  const ff = gui.addFolder('UI flags');
  cfg.bannerMs ??= 2400; ff.add(cfg, 'bannerMs', 500, 6000, 100);
  for (const k of ['locationBanner', 'interactPrompt', 'haptics', 'titleOnBoot']) if (typeof cfg[k] === 'boolean') ff.add(cfg, k).name(k + (k === 'titleOnBoot' ? ' (reload)' : ''));
  ff.close();

  // --- Depth (shared depth.json) ---
  const fd = gui.addFolder('Depth shadows (depth.json, SHARED pc+mobile)');
  let raw = null;
  try { const url = scene?.config?.depth || 'src/overworld/depth.json'; raw = await (await fetch(url)).json(); } catch { raw = null; }
  if (raw?.depth && scene?.depth) {
    const d = raw.depth, live = { enabled: !!scene.depth.enabled, strength: scene.depth.cfg?.strength || d.strength || 'medium' };
    const rebuild = () => { const en = scene.depth.enabled; scene.depth.cfg = normalizeDepth(raw, live.strength); scene.depth.enabled = en; scene.depth.cache.clear(); };
    fd.add(live, 'enabled').name('enabled (this session)').onChange((v) => scene.depth.set(v, false));
    fd.add(live, 'strength', Object.keys(d.strengths || { medium: 1 })).onChange((v) => { d.strength = v; rebuild(); });
    for (const side of ['outdoor', 'indoor']) {
      const p = d[side]; if (!p) continue; const f = fd.addFolder(side);
      for (const [k, lo, hi, st] of [['alpha', 0, 255, 1], ['height', 0, 32, 1], ['min_height', 0, 32, 1], ['pad', 0, 8, 1], ['rim', 0, 6, 1], ['band', 0, 24, 1], ['above', 0, 1, 0.05]]) {
        if (typeof p[k] === 'number') f.add(p, k, lo, hi, st).onChange(rebuild);
      }
      if (typeof p.dither === 'boolean') f.add(p, 'dither').onChange(rebuild);
      f.close();
    }
    fd.add({ exportDepth: () => download('depth.json', raw) }, 'exportDepth').name('Export depth.json (shared)');
  } else fd.add({ note: 'depth.json not loaded' }, 'note').disable();

  // --- export / reset ---
  const exp = {
    exportUI: () => { const txt = download(`${id}.ui.json`, { ui: cfg }); ui.note?.(`Exported ${id}.ui.json (also copied)`, 1800); return txt; },
    reset: () => {
      for (const k of Object.keys(cfg)) delete cfg[k]; Object.assign(cfg, clone(orig));
      for (const [k, v] of Object.entries(cfg.vars || {})) body.style.setProperty(`--ui-${k}`, String(v));
      gui.destroy(); ui._devGui = null; openDevPanel(ui);
    },
    close: () => gui.hide(),
  };
  gui.add(exp, 'exportUI').name(`Export ${id}.ui.json`);
  gui.add(exp, 'reset').name('Reset to file values');
  gui.add(exp, 'close').name('Hide panel');
  ui.devExport = exp.exportUI; // for tests / console
  return gui;
}
