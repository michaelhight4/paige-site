// Kilumen visual regression helper: pixelmatch 8.0.0 (ISC) + pngjs 7.0.0 (MIT), dev-only. Oct 23, 2026.
// Library:  import { diffPng, compareDirs } from './tools/visual/visual_diff.mjs'
// CLI:      node tools/visual/visual_diff.mjs <baselineDir> <currentDir> [--out <diffDir>] [--threshold 0.1]
//                [--max-ratio 0.001] [--strict]
//           Compares same-named PNGs. Writes red-on-grey diff images for changed files into --out
//           (default /tmp/kilumen_visual_diff). Warn-only unless --strict (then exit 1 on any failure).
// Baselines: keep them OUT of shots/ (other workers re-take those); e.g. tests/visual_baselines/<suite>/.
// Animated scenes need a fixed seed/time (?timescale=0, ?hour=, ?weather=clear) or they will always differ.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const load = (src) => PNG.sync.read(Buffer.isBuffer(src) ? src : readFileSync(src));

/**
 * Diff two PNGs (paths or Buffers).
 * @returns {{width:number,height:number,diffPixels:number,ratio:number,sizeMismatch:boolean,diffPng:Buffer|null}}
 */
export function diffPng(a, b, { threshold = 0.1, includeAA = false, diffImage = true } = {}) {
  const A = load(a), B = load(b);
  if (A.width !== B.width || A.height !== B.height) {
    return { width: B.width, height: B.height, diffPixels: Math.max(A.width * A.height, B.width * B.height), ratio: 1, sizeMismatch: true, diffPng: null };
  }
  const { width, height } = A;
  const out = diffImage ? new PNG({ width, height }) : null;
  const diffPixels = pixelmatch(A.data, B.data, out ? out.data : null, width, height, { threshold, includeAA });
  return { width, height, diffPixels, ratio: diffPixels / (width * height), sizeMismatch: false, diffPng: out && diffPixels ? PNG.sync.write(out) : null };
}

/** Compare every PNG in baselineDir with the same name in currentDir. */
export function compareDirs(baselineDir, currentDir, { outDir = null, threshold = 0.1, maxRatio = 0.001 } = {}) {
  const rows = [];
  for (const f of readdirSync(baselineDir).filter((n) => n.toLowerCase().endsWith('.png')).sort()) {
    const cur = join(currentDir, f);
    if (!existsSync(cur)) { rows.push({ file: f, status: 'missing' }); continue; }
    const d = diffPng(join(baselineDir, f), cur, { threshold, diffImage: !!outDir });
    const status = d.sizeMismatch ? 'size' : d.ratio > maxRatio ? 'changed' : d.diffPixels ? 'within' : 'same';
    if (outDir && d.diffPng && status !== 'same') { mkdirSync(outDir, { recursive: true }); writeFileSync(join(outDir, basename(f, '.png') + '.diff.png'), d.diffPng); }
    rows.push({ file: f, status, diffPixels: d.diffPixels, ratio: d.ratio });
  }
  return rows;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2);
  const opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
  const [base, cur] = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--') && a[i - 1] !== '--strict'));
  if (!base || !cur) { console.log('usage: node tools/visual/visual_diff.mjs <baselineDir> <currentDir> [--out dir] [--threshold 0.1] [--max-ratio 0.001] [--strict]'); process.exit(2); }
  const outDir = opt('--out', '/tmp/kilumen_visual_diff');
  const rows = compareDirs(base, cur, { outDir, threshold: +opt('--threshold', 0.1), maxRatio: +opt('--max-ratio', 0.001) });
  for (const r of rows) console.log(`${r.status.padEnd(8)} ${r.file}${r.ratio != null ? `  ${r.diffPixels} px (${(r.ratio * 100).toFixed(3)}%)` : ''}`);
  const bad = rows.filter((r) => ['changed', 'size', 'missing'].includes(r.status));
  console.log(`${rows.length} compared, ${bad.length} changed/missing; diff images in ${outDir}`);
  if (a.includes('--strict') && bad.length) process.exit(1);
}
