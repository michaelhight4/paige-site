// pixelmatch visual-diff helper (tools/visual/visual_diff.mjs). Free tools pass, Oct 23, 2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { diffPng, compareDirs } from '../tools/visual/visual_diff.mjs';

const img = (w, h, paint = () => [40, 80, 120, 255]) => {
  const p = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.data.set(paint(x, y), (y * w + x) * 4);
  return PNG.sync.write(p);
};

test('visual diff: identical images -> 0 px; one changed 4x4 block -> 16 px and a diff image', () => {
  const a = img(32, 32);
  assert.equal(diffPng(a, img(32, 32)).diffPixels, 0);
  const b = img(32, 32, (x, y) => (x >= 8 && x < 12 && y >= 8 && y < 12 ? [255, 0, 0, 255] : [40, 80, 120, 255]));
  const d = diffPng(a, b, { includeAA: true });
  assert.equal(d.diffPixels, 16);
  assert.ok(d.diffPng && PNG.sync.read(d.diffPng).width === 32);
});

test('visual diff: tiny colour shifts stay under the threshold; size changes are flagged', () => {
  assert.equal(diffPng(img(16, 16), img(16, 16, () => [41, 80, 120, 255])).diffPixels, 0);
  assert.equal(diffPng(img(16, 16), img(16, 17)).sizeMismatch, true);
});

test('visual diff: compareDirs reports same / changed / missing', () => {
  const base = mkdtempSync(join(tmpdir(), 'vd-base-')), cur = mkdtempSync(join(tmpdir(), 'vd-cur-'));
  writeFileSync(join(base, 'a.png'), img(8, 8)); writeFileSync(join(cur, 'a.png'), img(8, 8));
  writeFileSync(join(base, 'b.png'), img(8, 8)); writeFileSync(join(cur, 'b.png'), img(8, 8, () => [0, 0, 0, 255]));
  writeFileSync(join(base, 'c.png'), img(8, 8));
  const rows = Object.fromEntries(compareDirs(base, cur).map((r) => [r.file, r.status]));
  assert.deepEqual(rows, { 'a.png': 'same', 'b.png': 'changed', 'c.png': 'missing' });
});
