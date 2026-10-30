import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/overworld/overworld.js', import.meta.url), 'utf8');

test('visitor PC spots route to the visitor menu', () => {
  assert.match(src, /_visitor_pc\$\/\.test\(sp\.id \|\| ''\)\) \{ await this\.openVisitorPC\(line\)/);
});

test('openVisitorPC menu: read, inbox, storage (terminal), log off', async () => {
  const m = /async openVisitorPC\(line\) \{([\s\S]*?)\n  \}\n/.exec(src);
  assert.ok(m, 'openVisitorPC defined');
  const fn = new Function('line', `return (async () => {${m[1]}})();`);
  const calls = [], picks = [0, 1, 2, 3];
  const self = { ask: async (q, opts) => { calls.push(opts.join('|')); return picks.shift(); },
    say: async (p) => calls.push('say:' + p[0]), openInbox: async () => calls.push('inbox'), openTerminal: async () => calls.push('terminal') };
  await fn.call(self, { pages: ['River photo'] });
  assert.deepEqual(calls.filter((c) => !c.includes('|')), ['say:River photo', 'inbox', 'terminal']);
  assert.equal(calls[0], 'Read page|Inbox|Storage|Log off');
});
