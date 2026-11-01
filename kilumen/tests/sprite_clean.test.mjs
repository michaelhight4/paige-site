// Cute-pool battle sprites (region-1 starters) must be clean cutouts: binary alpha, one silhouette (no stray specks),
// no light 1-px fringe spurs, and a solid dark outline (>=90% of boundary pixels dark). Guards the lumoris cutout repair (0.2.116).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { CUTE_R1 } = await import(path.join(root, 'src/overworld/opening_v2.js'));

function readPng(file) {
  const b = fs.readFileSync(file); let o = 8, w = 0, h = 0, ct = 0, bd = 0; const idat = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o), type = b.toString('ascii', o + 4, o + 8), d = b.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; }
    if (type === 'IDAT') idat.push(d);
    o += 12 + len;
  }
  assert.equal(bd, 8, `${file}: 8-bit`); assert.equal(ct, 6, `${file}: RGBA`);
  const raw = zlib.inflateSync(Buffer.concat(idat)), bpp = 4, stride = w * bpp, px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0, up = y ? px[(y - 1) * stride + x] : 0, c = y && x >= bpp ? px[(y - 1) * stride + x - bpp] : 0;
      let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      px[y * stride + x] = v & 255;
    }
  }
  return { w, h, px };
}

for (const { species } of CUTE_R1) for (const view of ['front', 'back']) {
  test(`${species} ${view} battle sprite is a clean cutout`, () => {
    const { w, h, px } = readPng(path.join(root, `art/characters/pixel/creatures/${species}/battle/${species}_${view}_128.png`));
    const A = (x, y) => x >= 0 && y >= 0 && x < w && y < h && px[(y * w + x) * 4 + 3] > 0;
    let partial = 0, spurs = 0, edge = 0, dark = 0;
    const seen = new Uint8Array(w * h); let comps = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, al = px[i + 3];
      if (al > 0 && al < 255) partial++;
      if (!al) continue;
      const n4 = A(x - 1, y) + A(x + 1, y) + A(x, y - 1) + A(x, y + 1);
      const isDark = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255 < 0.22;
      if (n4 <= 1 && !isDark) spurs++; // light 1-px spur = cutout fringe (dark outline tips are drawn points)
      if (n4 < 4) { edge++; if (isDark) dark++; }
      if (!seen[y * w + x]) {
        comps++; const st = [[x, y]]; seen[y * w + x] = 1;
        while (st.length) { const [cx, cy] = st.pop(); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = cx + dx, ny = cy + dy; if (A(nx, ny) && !seen[ny * w + nx]) { seen[ny * w + nx] = 1; st.push([nx, ny]); } } }
      }
    }
    assert.equal(partial, 0, 'binary alpha');
    assert.equal(comps, 1, 'one silhouette, no stray specks');
    assert.equal(spurs, 0, 'no light 1-px fringe spurs');
    assert.ok(dark / edge >= 0.9, `solid dark outline (${(dark / edge * 100).toFixed(1)}% dark)`);
  });
}
