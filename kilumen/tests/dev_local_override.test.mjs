// Local playtest override: dev console on localhost / 127.0.0.1 with ?dev=1 only, never on paigegames.net or any other host.
import test from 'node:test'; import assert from 'node:assert'; import fs from 'node:fs';
import { localDevOverride } from '../src/dev/devgate.js';
test('local override only for exact localhost / 127.0.0.1 with ?dev=1', () => {
  assert.equal(localDevOverride({ hostname: 'localhost' }, true), true);
  assert.equal(localDevOverride({ hostname: '127.0.0.1' }, true), true);
  for (const h of ['paigegames.net', 'www.paigegames.net', 'localhost.paigegames.net', '127.0.0.1.nip.io', 'evil.com', '', '10.0.0.5', 'mylocalhost'])
    assert.equal(localDevOverride({ hostname: h }, true), false, h);
  assert.equal(localDevOverride({ hostname: 'localhost' }, false), false);
  assert.equal(localDevOverride({ hostname: '127.0.0.1' }, 'yes'), false);
  assert.equal(localDevOverride(undefined, true), false);
});
test('main.js routes the override before the admin check', () => {
  const s = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(s, /g\.localDevOverride\(location, DEV_REQUESTED === true\) \? \{ ok: true[^}]*\} : g\.checkDevAccess/);
});
