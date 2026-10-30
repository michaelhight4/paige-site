// Oct 30 2026: good/super rod slots never exceed the map's region cap + 2 (tools/level_curve/rod_caps.json); Arena rooms titled "Aurelith Arena · Room N".
import test from 'node:test'; import assert from 'node:assert'; import fs from 'node:fs';
const J = (p) => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
test('rod tables per region: every slot <= region cap + 2 (and <= 68)', () => {
  const caps = J('tools/level_curve/rod_caps.json'), maps = J('data/fishing_tables.json').maps;
  for (const [m, v] of Object.entries(maps)) { assert.ok(caps[m], `no cap for ${m}`);
    for (const [tier, t] of Object.entries(v)) for (const s of t?.slots || []) if (Array.isArray(s.level)) for (const l of s.level) assert.ok(l <= caps[m] && l <= 68, `${m} ${tier} L${l} > ${caps[m]}`); }
  assert.equal(caps.brookhollow, 14); assert.equal(caps.saltmere, 22);
});
test('Arena rooms 1-8 are titled "Aurelith Arena · Room N"', () => {
  for (let n = 1; n <= 8; n++) assert.equal(J(`art/world/overworld/maps/aurelith_arena_room_${n}.json`).title, `Aurelith Arena · Room ${n}`);
});
