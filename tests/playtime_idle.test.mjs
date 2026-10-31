import { readFileSync } from 'node:fs'; import assert from 'node:assert';
const src = readFileSync(new URL('../playtime.js', import.meta.url), 'utf8');
assert.match(src, /IDLE_MS = 60 \* 60e3/); assert.match(src, /visibilityState === 'visible'/);
console.log('ok');
