// Room starter Kilu (v0.2.115, Gary Nov 1 2026): solid in the bedroom, talk = ONE shared Kilu cry + existing text, and before
// flg_promoted the companion never follows / never leads from the party (pre-promotion saves).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { OPEN2, OpeningV2 } from '../src/overworld/opening_v2.js';
import { SFX_FILES, SFX, SFX_USES } from '../src/audio/audio.js';

const lines = JSON.parse(readFileSync(new URL('../text/overworld_lines.json', import.meta.url))).opening_v2;

test('one shared Kilu cry file for every species (ogg + m4a) with a ZzFX fallback', () => {
  assert.deepEqual(SFX_FILES, { kilu_cry: 'sfx/kilu_cry' });
  for (const ext of ['ogg', 'm4a']) { const u = new URL(`../audio/sfx/kilu_cry.${ext}`, import.meta.url); assert.ok(existsSync(u) && statSync(u).size > 1000, ext); }
  assert.ok(SFX.kilu_cry && SFX_USES.kilu_cry);
});

test('roomTalk plays kilu_cry (same id for any species) and says opening_v2.room_companion', async () => {
  assert.ok(lines.room_companion, 'existing text line');
  for (const species of ['mossmote', 'lumoris']) {
    const played = [], said = [];
    const s = { flags: new Set([OPEN2.active, OPEN2.done]), seen: {}, map: { name: 'house_2f' }, log: [], tick: 0, lines: null,
      audio: { sfx: (id) => played.push(id) }, say: async (l) => { said.push(l); }, script: (fn) => fn(), worldApi: () => ({}) };
    const o = new OpeningV2(s); Object.defineProperty(o, 'companion', { value: { species, nickname: 'Pip' } });
    await o.roomTalk();
    assert.deepEqual(played, ['kilu_cry']);
    assert.equal(said.length, 1);
    assert.ok(s.log.some((e) => e.type === 'open2' && e.step === 'roomTalk' && e.species === species));
  }
});

const src = readFileSync(new URL('../src/overworld/overworld.js', import.meta.url), 'utf8');
test('static follower is solid and talkable (overworld.js wiring)', () => {
  assert.match(src, /f\?\.static && q && \(q\.type === 'walk' \|\| q\.type === 'ledge'\) && q\.x === f\.x && q\.y === f\.y \? \{ type: 'block'/);
  assert.match(src, /this\.follower\?\.static && this\.follower\.x === fx && this\.follower\.y === fy && this\.opening2\?\.roomTalk/);
  assert.ok(src.indexOf('opening2.roomTalk()') < src.indexOf('this.systems?.onInteract(fx, fy)'), 'room talk before systems.onInteract');
});

test('before got_starter (lab pick) the companion never leads (pre-promotion save with it in the party)', () => {
  const body = /_followLead\(\) \{([\s\S]*?)\n  \}/.exec(src)[1];
  const followLead = new Function(body.replace(/^\s*/, ''));
  const comp = { species: 'mossmote', origin: { how: 'companion' } }, ghost = { species: 'mossmote', x: 3, y: 4, static: true };
  const mk = (flags, party) => ({ flags: new Set(flags), party, opening2: { ghostLead: () => ghost } });
  assert.equal(followLead.call(mk([OPEN2.active], [comp])), ghost, 'old save: companion in party -> only the static room ghost');
  assert.equal(followLead.call(mk([OPEN2.active], [])), ghost);
  assert.equal(followLead.call(mk([OPEN2.active, 'flg_promoted'], [comp])), ghost, 'v0.2.116: promoted but no lab starter yet -> still no companion follower');
  assert.equal(followLead.call(mk([OPEN2.active, 'flg_promoted', 'got_starter'], [comp])), comp, 'after the lab starter pick it follows');
  const other = { species: 'nibbin', origin: { how: 'gift' } };
  assert.equal(followLead.call(mk([OPEN2.active], [comp, other])), other);
  assert.equal(src.match(/this\._followLead\(\)/g).length, 2, 'both follower sites use the gate');
});
