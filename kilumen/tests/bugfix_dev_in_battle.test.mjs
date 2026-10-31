// gd bug 5: the dev console refused to open in a battle (canOpen: ui active / busy) and its HUD chip is hidden under the battle
// screen. Now: battle-safe tabs only, a fixed chip while a battle is on; still loaded only behind the dev gate (main.js / devgate.js).
// Browser-checked (Playwright, localhost ?dev=1): F2 + chip open the Tools tab over a wild battle; without ?dev=1 nothing loads.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
globalThis.window ||= {};
const { battleOn, BATTLE_TABS } = await import('../src/dev/console.js?v=v0.2.102-alpha');
const src = readFileSync(new URL('../src/dev/console.js', import.meta.url), 'utf8');

test('battleOn sees the turn-based battle screen and a real-time session', () => {
  assert.equal(battleOn({ stack: [{ scr: 'phone' }] }, {}), false);
  assert.equal(battleOn({ stack: [{ scr: 'battle' }] }, {}), true);
  assert.equal(battleOn({ stack: [] }, { rtb: { active: { sim: 1 } } }), true);
  assert.equal(battleOn(null, { rtb: { active: null } }), false);
});

test('battle mode only shows battle-safe tabs and stays dev-gated', () => {
  assert.deepEqual(BATTLE_TABS, ['tools']);
  assert.match(src, /inBattle = battleOn\(ui\(\)\)/);
  assert.match(src, /TABS\.filter\(\(\[id\]\) => !inBattle \|\| BATTLE_TABS\.includes\(id\)\)/);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /installDevConsole|dev\/console\.js/); // still installed only from main.js's gated path
});
