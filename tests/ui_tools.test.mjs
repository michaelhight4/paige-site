// UI tools pass (Oct 22, 2026): static checks for the four wired-in pieces. Browser checks + clips: tests/ui_tools_e2e.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('focus ring: white inner ring + --outline outer ring, each >= 3:1 against the other (WCAG 2.4.11/1.4.11)', () => {
  const css = rd('src/ui/ui.css'), theme = rd('src/ui/theme.css');
  assert.match(css, /\.ui-stage \[data-i\]\.sel \{[^}]*box-shadow: 0 0 0 3px #fff, 0 0 0 6px var\(--outline\)/);
  const outline = theme.match(/--outline:\s*(#[0-9a-fA-F]{6})/)[1];
  const r = ratio('#ffffff', outline);
  assert.ok(r >= 3, `ring ${r.toFixed(2)}:1`);
  // one of the two rings is >= 3:1 against ANY background: max(ratio(bg, white), ratio(bg, outline)) >= 3 for every grey step
  for (let v = 0; v < 256; v += 5) { const h = '#' + v.toString(16).padStart(2, '0').repeat(3); assert.ok(Math.max(ratio(h, '#ffffff'), ratio(h, outline)) >= 3, h); }
});

test('vendored UI libs ship with their LICENSE files', () => {
  for (const [dir, id] of [['lil-gui', /MIT/], ['lrud-spatial', /Apache License/], ['sortablejs', /MIT/]]) {
    const lic = rd(`src/vendor/${dir}/LICENSE`); assert.match(lic, id, dir);
  }
  assert.match(rd('art/ui/kenney_placeholder/License_input-prompts.txt'), /CC0|Creative Commons Zero/i);
  assert.match(rd('art/ui/kenney_placeholder/License_game-icons.txt'), /CC0|Creative Commons Zero/i);
  const tpl = rd('THIRD_PARTY_LICENSES');
  for (const n of ['lil-gui', 'lrud-spatial', 'SortableJS', 'Kenney']) assert.ok(tpl.includes(n), `THIRD_PARTY_LICENSES lists ${n}`);
});

test('dev panel is never statically imported (ships only behind ?dev=1)', () => {
  const ui = rd('src/ui/ui.js'), main = rd('src/main.js');
  assert.doesNotMatch(ui, /^import[^\n]*(devpanel|lil-gui)/m);
  assert.doesNotMatch(main, /^import[^\n]*(devpanel|lil-gui)/m);
  assert.match(ui, /q\.get\('dev'\) === '1'[^\n]*import\('\.\/devpanel\.js'\)/);
  assert.doesNotMatch(rd('index.html'), /lil-gui|devpanel/);
});

test('every Kenney placeholder used by ui.js exists and is marked as a placeholder', () => {
  const ui = rd('src/ui/ui.js');
  const used = new Set([...ui.matchAll(/kph\('([\w]+)'/g), ...ui.matchAll(/'((?:keyboard|xbox)_[\w]+)'/g)].map((m) => m[1]));
  assert.ok(used.size >= 10, `found ${used.size}`);
  for (const f of used) assert.ok(fs.existsSync(path.join(ROOT, 'art/ui/kenney_placeholder', f + '.png')), f);
  assert.match(ui, /data-placeholder="kenney"/);
  assert.match(rd('art/ui/kenney_placeholder/README.md'), /placeholder/i);
});

test('drag targets keep >= 44 px hit areas', () => {
  const css = rd('src/ui/ui.css');
  assert.match(css, /\.ui-slot \{ box-sizing: border-box; min-width: var\(--ui-hit, 44px\); min-height: var\(--ui-hit, 44px\); \}/);
});

// ---- UI tools 2 (Oct 22, 2026): auto-animate, floating-ui, pixelarticons, Kenney UI packs, anime.js ----
test('UI tools 2: vendored libs ship their LICENSE text, THIRD_PARTY_LICENSES lists them', () => {
  for (const [dir, who] of [['auto-animate', /FormKit/], ['floating-ui', /Floating UI contributors/], ['animejs', /Julian Garnier/], ['pixelarticons', /Gerrit Halfmann/]]) {
    const lic = rd(`src/vendor/${dir}/LICENSE`); assert.match(lic, /MIT License|Permission is hereby granted, free of charge/, dir); assert.match(lic, who, dir);
  }
  for (const f of ['License_ui_pack.txt', 'License_ui_pack_pixel_adventure.txt']) assert.match(rd(`art/ui/kenney_ui_placeholder/${f}`), /CC0|Creative Commons Zero/i, f);
  const tpl = rd('THIRD_PARTY_LICENSES');
  for (const n of ['AutoAnimate', 'Floating UI', 'anime.js', 'pixelarticons', 'UI Pack 2.0', 'Pixel Adventure']) assert.ok(tpl.includes(n), `THIRD_PARTY_LICENSES lists ${n}`);
  const man = rd('vendor_staging/MANIFEST.md');
  for (const n of ['auto-animate', 'floating-ui', 'animejs', 'pixelarticons', 'kenney']) assert.match(man, new RegExp(n, 'i'));
});

test('UI tools 2: motion libs + tooltip lib are lazy (dynamic import only), never in the boot path', () => {
  const ui = rd('src/ui/ui.js'), fx = rd('src/ui/ui_tools2.js'), main = rd('src/main.js'), html = rd('index.html');
  for (const src of [ui, fx, main]) assert.doesNotMatch(src, /^import[^\n]*(auto-animate|floating-ui|animejs|anime\.)/m);
  assert.doesNotMatch(html, /auto-animate|floating-ui|animejs/);
  assert.match(fx, /import\(/); // load() → dynamic import
  for (const f of ['auto-animate/auto-animate.min.js', 'floating-ui/floating-ui.dom.bundle.min.mjs', 'animejs/anime.ui.min.mjs']) {
    assert.ok(fx.includes(f), f); assert.ok(fs.existsSync(path.join(ROOT, 'src/vendor', f)), f);
  }
  // reduced motion gates both motion libs (prefers-reduced-motion + the game's own ui-reduce switch)
  assert.match(fx, /prefers-reduced-motion: reduce/); assert.match(fx, /ui-reduce/);
  assert.match(rd('src/ui/ui_tools2.css'), /prefers-reduced-motion: reduce/);
});

test('UI tools 2: pixelarticons subset is small, has no alcohol / smoking / drug icons, covers every mapped name', async () => {
  const { PXI } = await import('../src/vendor/pixelarticons/icons.js');
  const names = Object.keys(PXI);
  assert.ok(names.length >= 20 && names.length <= 60, `icons ${names.length}`);
  for (const n of names) assert.doesNotMatch(n, /wine|beer|cocktail|cigar|smok|drug|pill|syringe|bottle|glass|pipe/, n);
  assert.ok(fs.statSync(path.join(ROOT, 'src/vendor/pixelarticons/icons.js')).size < 12000, 'subset stays lean');
  const m = await import('../src/ui/ui_tools2.js');
  const used = [m.MENU_ICONS, m.POCKET_ICONS, m.EMPTY_ICONS, m.OPTION_ICONS].flatMap((o) => Object.values(o));
  assert.deepEqual(used.filter((n) => !PXI[n]), []);
});

test('UI tools 2: tooltip text contrast on the cream Kenney panel >= 4.5:1', () => {
  const theme = rd('src/ui/theme.css'), css = rd('src/ui/ui_tools2.css');
  const ink = theme.match(/--ink:\s*(#[0-9a-fA-F]{6})/)[1], bg = css.match(/\.ui-tip \{[^}]*background: (#[0-9a-fA-F]{6})/)[1];
  assert.ok(ratio(ink, bg) >= 4.5, `${ink} on ${bg}: ${ratio(ink, bg).toFixed(2)}:1`);
});

test('UI tools 2: catch celebration + menu motion (Oct 22, 2026) stay short, lazy and reduced-motion safe', () => {
  const fx = rd('src/ui/ui_tools2.js'), ui = rd('src/ui/ui.js'), sd = rd('src/battle/ui_sd.js'), css = rd('src/ui/ui_tools2.css');
  const cap = rd('src/ui/capture_fx.js');
  assert.match(fx, /async catchFx\(host, o = \{\}\)/); assert.match(ui, /fx\?\.catchFx\(/); assert.match(sd, /fx\?\.catchFx\(/);
  assert.match(fx, /_A\(\) \{ return this\.reduced\(\) \? null/); // every motion path goes through _A(): reduced -> null
  for (const k of ['raise', 'beam', 'absorb', 'pulse', 'lock', 'bloom', 'breakout', 'lower']) assert.match(cap, new RegExp(`\\b${k}[:(]`), `capture step ${k}`); // one swap point per step (held-crystal design)
  assert.doesNotMatch(cap + fx + css, /ax-star|wobble|throw\(/i); // no throw, no 3 wobbles, no star bursts
  assert.doesNotMatch(css, /\.ax-gem[^{]*\{[^}]*(border-top|linear-gradient\(to bottom[^)]*50%)/); // no middle band on the crystal
  for (const ms of [...fx.matchAll(/ms = back \? (\d+) : (\d+)/g)].flatMap((m) => [+m[1], +m[2]])) assert.ok(ms >= 120 && ms <= 220, `menu ${ms} ms`);
  assert.doesNotMatch(css, /smoke|puff|cloud/i); // crisp motes only (no smoke-like particles)
  assert.match(css, /\.ax-out, \.ax-out \* \{ pointer-events: none/); // closing clones never take input
});

const css2 = () => rd('src/ui/ui_tools2.css');
test('Animator FX art (Oct 22, 2026, Gary approved): capture / evolution / heal wired ON with a rollback flag, lazy, configurable anchors', () => {
  const art = rd('src/ui/fx_art.js'), fx = rd('src/ui/ui_tools2.js'), heal = rd('src/systems/heal.js'), ui = rd('src/ui/ui.js');
  assert.match(art, /export const FX_ART = \{ capture: true, evolution: true, heal: true \}/); // ON by default; false = rollback
  assert.match(art, /hold: \[64, 128\]/); assert.match(art, /\['i_heal_machine', \[63, 28\]\]/); // single config values
  assert.doesNotMatch(fx, /from '\.\/fx_art\.js'/); assert.match(fx, /import\('\.\/fx_art\.js'\)/); // lazy: not in the boot bundle
  assert.match(fx, /fxart'\) === '0'/); // ?fxart=0 runtime rollback
  assert.match(art, /poses: \{ on: false,/); assert.match(css2(), /\.ax-catch \.fxa \{ z-index: 2/); // draft poses off; crystal over the sprite
  assert.match(heal, /fx\?\.healFx\?\.\(sc,/); assert.match(ui, /want === 'evolve'/);
  assert.match(css2(), /body\.ui-reduce \.ui-root \.b-bars, body\.ui-reduce \.ui-root \.b-flash \{ display: none; \}/); // reduced: no frozen intro bars / exit flash
  const cap = JSON.parse(rd('art/characters/pixel/fx_extra/capture/capture.json'));
  for (const k of ['raise', 'beam', 'absorb', 'pulse_1', 'pulse_4', 'lock_bloom', 'breakout_generic', 'breakout_fire', 'breakout_water', 'breakout_wind']) assert.ok(cap.anims[k], `capture art ${k}`);
  assert.ok(cap.hooks.breakout_type_by_element, 'breakout types');
});
