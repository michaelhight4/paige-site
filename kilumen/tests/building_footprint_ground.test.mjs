// Gary, Oct 30 2026: buildings must not sit on a grey rectangle. Every building footprint cell whose art is not fully
// opaque (alpha) must have grass / path / plaza / street ground under it, on every outdoor map. The alpha is read from the
// real sheets by tools/towns/footprint_ground.py --check (PIL), which exits 1 and lists the cells otherwise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('no building footprint cell outside the art alpha sits on non-grass, non-path ground', () => {
  const r = spawnSync('python3', ['tools/towns/footprint_ground.py', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^0 cells/m);
});
