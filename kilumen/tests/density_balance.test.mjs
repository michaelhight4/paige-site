// Gary on Aurelith (Oct 30 2026): "it feels crowded and empty" / "flower beds and parks instead of just open areas".
// tools/map_audit/density.py checks every balanced town: each 8x8 window inside the detail band, no crowded 3x3, no blank
// 5x5 of lawn, props grouped in scenes of 3-7, breathing room at doors and landmarks, few lone specks.
// The fixer is tools/towns/balance_pass.py (run after the town builder, before fix_live_flags.py).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const out = execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools/map_audit'); import density as D
print(json.dumps({n: D.audit(D.load(n)) for n in D.MAPS}))`], { cwd: ROOT, encoding: 'utf8' });
const R = JSON.parse(out);
for (const [map, r] of Object.entries(R)) {
  for (const c of ['B1_low', 'B1_high', 'B2', 'B3', 'B4', 'B5', 'B6']) {
    test(`${map}: density ${c} clear`, () => assert.deepEqual(r[c], [], JSON.stringify(r[c].slice(0, 6))));
  }
}
