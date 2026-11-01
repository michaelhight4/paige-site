// Lab props must not swap to another model: the crystal tube (7288 top / 7289 base) stays still, the button server
// (7286 top / 7287 base) keeps its red/green blink but never shows the vent-top variant (cells 364/367).
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { anim } = JSON.parse(readFileSync(new URL('../art/world/overworld/furniture_v3_anim.json', import.meta.url)));
assert.ok(!anim['7288'] && !anim['7289'], 'crystal tube 7288/7289 must not animate (fish-tank frames)');
const banned = new Set([364, 367, 377, 378, 379, 380, 381, 382]);
for (const [id, a] of Object.entries(anim)) for (const f of a.frames) assert.ok(!banned.has(f), `tile ${id} uses swap cell ${f}`);
const u = (id) => [...new Set(anim[id].frames)].sort((x, y) => x - y);
assert.deepEqual(u('7286'), [175, 362, 363]);
assert.deepEqual(u('7287'), [176, 365, 366]);
assert.equal(anim['7286'].frames.length, anim['7287'].frames.length, 'top and base frames stay in step');
console.log('lab_anim_no_swap ok');
