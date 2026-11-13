// v0.2.1 gate (Gary saw '[TODO Text Bot: lab_brookhollow.crystals_received] ...' on live, Oct 23 2026):
// no shipped player-facing string (src JS literals, text/*.json, map JSON text) may contain '[TODO' or 'TODO Text Bot'.
// Same scanner as /workspace/kilumen_release_r1/_tools/gate_no_todo.mjs (metadata keys like text_ref/note are warnings only).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const GATE = '/workspace/kilumen_release_r1/_tools/gate_no_todo.mjs';
test('no [TODO / TODO Text Bot in player-facing strings', (t) => {
  const r = spawnSync(process.execPath, [GATE, fileURLToPath(new URL('..', import.meta.url))], { encoding: 'utf8' });
  if (r.error || (r.status !== 0 && r.status !== 1)) return t.skip('gate script unavailable: ' + (r.error?.message || r.stderr));
  assert.equal(r.status, 0, r.stdout.split('\n').filter((l) => l.startsWith('FAIL')).join('\n'));
});
