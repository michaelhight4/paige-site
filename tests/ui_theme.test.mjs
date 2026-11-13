// UI theme contrast (UI pass, Oct 22, 2026): every text/background token pair in src/ui/theme.css must be >= 4.5:1 (WCAG AA).
// Text in the UI always sits on a solid plate (--plate, --plate-2, --night, a screen's --sc-sel, or an element colour), never
// directly on a pattern, so checking these pairs covers the player-facing text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(ROOT, 'src/ui/theme.css'), 'utf8');
const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
const tok = Object.fromEntries([...root.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const check = (fg, bg, label) => { const r = ratio(fg, bg); assert.ok(r >= 4.5, `${label}: ${fg} on ${bg} = ${r.toFixed(2)}:1 (< 4.5)`); };

test('theme: base text pairs are >= 4.5:1', () => {
  for (const [f, b] of [['ink', 'plate'], ['ink', 'plate-2'], ['ink-soft', 'plate'], ['ink-soft', 'plate-2'], ['on-night', 'night'],
    ['on-night', 'night-2'], ['on-night-soft', 'night'], ['ink', 'sun'], ['ink', 'warn'], ['ink', 'good'], ['ink', 'xp']]) {
    assert.ok(tok[f] && tok[b], `missing token --${f} or --${b}`);
    check(tok[f], tok[b], `--${f} on --${b}`);
  }
});

test('theme: --ink on every element colour (move buttons, chips) is >= 4.5:1', () => {
  const els = Object.keys(tok).filter((k) => k.startsWith('el-'));
  assert.ok(els.length >= 40, `expected element tokens, got ${els.length}`);
  for (const k of els) check(tok.ink, tok[k], `--ink on --${k}`);
});

test('theme: --ink on every screen selection plate (--sc-sel) is >= 4.5:1', () => {
  const sels = [...css.matchAll(/\[data-scr(?:=(\w+))?\][^{]*\{[^}]*--sc-sel:\s*(#[0-9a-fA-F]{6})/g)];
  assert.ok(sels.length >= 8, `expected screen colourways, got ${sels.length}`);
  for (const m of sels) check(tok.ink, m[2], `--ink on ${m[1] || 'default'} --sc-sel`);
});

test('theme: reduced motion turns idle motion and scrolling patterns off', () => {
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /ui-reduce/);
});
