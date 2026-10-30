// Gary's five live-game flags (Oct 30 2026) on the maps GD has reworked: whole trees with staggered borders, no NPC under a
// canopy, no prop on a walkway and every prop collides, no cave mouth beside a house, no long flat forest corridor.
// The audit is tools/map_audit/live_flags.py (fixer: fix_live_flags.py); this runs it and wants zero of every flag.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const out = execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools/map_audit'); import live_flags as F
print(json.dumps({n: F.audit(F.load(n)) for n in F.MAPS}))`], { cwd: ROOT, encoding: 'utf8' });
const R = JSON.parse(out);
for (const [map, flags] of Object.entries(R)) {
  for (const [flag, hits] of Object.entries(flags)) {
    test(`${map}: live flag ${flag} clear`, () => assert.deepEqual(hits, [], JSON.stringify(hits.slice(0, 6))));
  }
}
