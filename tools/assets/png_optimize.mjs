// Lossless PNG optimiser (oxipng 10.2.1, MIT; binary at tools/free_tools/bin/oxipng). OFFLINE ONLY. Oct 23, 2026.
// NEVER rewrites art in place: copies each PNG into --out, optimises the copy, then proves the decoded RGBA
// pixels are identical (pngjs) before reporting. Copy files back by hand only after review.
//   node tools/assets/png_optimize.mjs <file-or-dir>... [--out /tmp/kilumen_png_opt] [--level 2] [--json]
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, readdirSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const OXIPNG = join(ROOT, 'tools/free_tools/bin/oxipng');

const walk = (p) => statSync(p).isDirectory() ? readdirSync(p).flatMap((n) => walk(join(p, n))) : p.toLowerCase().endsWith('.png') ? [p] : [];
const samePixels = (a, b) => { const A = PNG.sync.read(readFileSync(a)), B = PNG.sync.read(readFileSync(b)); return A.width === B.width && A.height === B.height && Buffer.compare(A.data, B.data) === 0; };

export function optimise(inputs, { out = '/tmp/kilumen_png_opt', level = 2 } = {}) {
  if (!existsSync(OXIPNG)) throw new Error('oxipng missing: see tools/free_tools (bin/oxipng)');
  const rows = [];
  for (const src of inputs.flatMap(walk)) {
    const rel = relative(ROOT, resolve(src)).replace(/^(\.\.\/)+/, '');
    const dst = join(out, rel);
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
    // --strip safe keeps colour/gamma chunks; no lossy options exist in oxipng.
    execFileSync(OXIPNG, ['-o', String(level), '--strip', 'safe', '-q', dst]);
    const before = statSync(src).size, after = statSync(dst).size, identical = samePixels(src, dst);
    rows.push({ file: rel, before, after, saved: before - after, identical });
  }
  return rows;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2);
  const opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a.splice(i, 2)[1] : d; };
  const out = opt('--out', '/tmp/kilumen_png_opt'), level = +opt('--level', 2), json = a.includes('--json');
  const inputs = a.filter((x) => !x.startsWith('--'));
  if (!inputs.length) { console.log('usage: node tools/assets/png_optimize.mjs <file-or-dir>... [--out /tmp/kilumen_png_opt] [--level 2] [--json]'); process.exit(2); }
  const rows = optimise(inputs, { out, level });
  if (json) { console.log(JSON.stringify(rows, null, 2)); process.exit(0); }
  const kb = (n) => (n / 1024).toFixed(1) + ' KB';
  for (const r of rows) console.log(`${r.identical ? 'ok  ' : 'DIFF'} ${r.file}  ${kb(r.before)} -> ${kb(r.after)}`);
  const b = rows.reduce((s, r) => s + r.before, 0), f = rows.reduce((s, r) => s + r.after, 0);
  console.log(`${rows.length} PNGs: ${kb(b)} -> ${kb(f)} (saved ${kb(b - f)}, ${b ? ((1 - f / b) * 100).toFixed(1) : 0}%). Copies in ${out}; originals untouched.`);
  if (rows.some((r) => !r.identical)) { console.error('pixel mismatch: do not use these copies'); process.exit(1); }
}
