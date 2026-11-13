// PC-unchanged proof for the mobile full screen pass: pixelmatch shots/mobile_fullscreen/before/pc* vs after/pc*.
// Usage: node tests/mobile_fullscreen_pcdiff.mjs [dirA] [dirB] -> prints diff pixels per shot, writes pc_diff.json
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const D = path.resolve('shots/mobile_fullscreen');
const A = path.join(D, process.argv[2] || 'before'), B = path.join(D, process.argv[3] || 'after');
const out = [];
for (const f of fs.readdirSync(A).filter((f) => f.startsWith('pc') && f.endsWith('.png')).sort()) {
  if (!fs.existsSync(path.join(B, f))) { out.push({ file: f, missing: true }); continue; }
  const a = PNG.sync.read(fs.readFileSync(path.join(A, f))), b = PNG.sync.read(fs.readFileSync(path.join(B, f)));
  const diff = new PNG({ width: a.width, height: a.height });
  const n = a.width === b.width && a.height === b.height ? pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0 }) : -1;
  if (n > 0) fs.writeFileSync(path.join(D, `pcdiff_${path.basename(B)}_${f}`), PNG.sync.write(diff));
  out.push({ file: f, size: `${a.width}x${a.height}`, diffPixels: n });
  console.log(`${f}: ${n} px differ`);
}
fs.writeFileSync(path.join(D, `pc_diff_${path.basename(A)}_vs_${path.basename(B)}.json`), JSON.stringify(out, null, 1));
