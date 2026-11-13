// WebP / AVIF variants of big art (sharp 0.35.5, Apache-2.0; bundles libvips LGPL-3.0). OFFLINE ONLY, Oct 23, 2026.
// sharp is a Node native module: it must never be imported by game code or shipped. It writes NEW files into --out;
// originals are never touched. Pixel art should use --lossless (or stay PNG); painted key art can be lossy.
//   node tools/assets/webp_variants.mjs <file>... [--out /tmp/kilumen_img_variants] [--quality 82] [--lossless] [--avif] [--width 1920]
import { createRequire } from 'node:module';
import { statSync, mkdirSync } from 'node:fs';
import { join, basename, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(join(ROOT, 'tools/free_tools/package.json'));

export async function variants(files, { out = '/tmp/kilumen_img_variants', quality = 82, lossless = false, avif = false, width = 0 } = {}) {
  const sharp = require('sharp');
  mkdirSync(out, { recursive: true });
  const rows = [];
  for (const f of files) {
    const stem = basename(f, extname(f)), before = statSync(f).size;
    const base = () => { const s = sharp(f); return width ? s.resize({ width, withoutEnlargement: true, kernel: lossless ? 'nearest' : 'lanczos3' }) : s; };
    const webp = join(out, `${stem}${width ? '_' + width : ''}.webp`);
    await base().webp(lossless ? { lossless: true, effort: 6 } : { quality, effort: 6 }).toFile(webp);
    rows.push({ file: f, format: 'webp', out: webp, before, after: statSync(webp).size });
    if (avif) {
      const p = join(out, `${stem}${width ? '_' + width : ''}.avif`);
      await base().avif(lossless ? { lossless: true } : { quality: Math.max(30, quality - 30), effort: 4 }).toFile(p);
      rows.push({ file: f, format: 'avif', out: p, before, after: statSync(p).size });
    }
  }
  return rows;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2);
  const opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a.splice(i, 2)[1] : d; };
  const o = { out: opt('--out', '/tmp/kilumen_img_variants'), quality: +opt('--quality', 82), width: +opt('--width', 0), lossless: a.includes('--lossless'), avif: a.includes('--avif') };
  const files = a.filter((x) => !x.startsWith('--'));
  if (!files.length) { console.log('usage: node tools/assets/webp_variants.mjs <file>... [--out dir] [--quality 82] [--lossless] [--avif] [--width 1920]'); process.exit(2); }
  const kb = (n) => (n / 1024).toFixed(0) + ' KB';
  for (const r of await variants(files, o)) console.log(`${r.format.padEnd(4)} ${r.file}: ${kb(r.before)} -> ${kb(r.after)} (${((1 - r.after / r.before) * 100).toFixed(0)}% smaller)  ${r.out}`);
}
