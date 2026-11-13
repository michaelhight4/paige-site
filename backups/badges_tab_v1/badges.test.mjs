import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACH_DEFS } from '../src/achievements/defs.js';
import { sync, view, markSeen } from '../src/achievements/engine.js';
const ctx = (o = {}) => ({ flags: new Set(o.flags || []), kilindex: { caughtCount: o.caught || 0 }, sports: { wins: o.wins || 0 } });
test('coins + milestones unlock with dates', () => {
  const h = {};
  sync(ACH_DEFS, h, ctx({ flags: ['beat_master_fernwick'], caught: 12 }), '2026-10-29');
  const v = Object.fromEntries(view(ACH_DEFS, h, ctx()).map((r) => [r.id, r]));
  assert.equal(v.coin_fernwick.earned, true); assert.equal(v.coin_fernwick.first, '2026-10-29');
  assert.equal(v.coin_saltmere.earned, false); assert.equal(v.ms_masters_1.earned, true); assert.equal(v.ms_kilindex_10.earned, true); assert.equal(v.ms_kilindex_50.earned, false);
  assert.equal(v.coin_fernwick.isNew, true); markSeen(h);
  assert.equal(view(ACH_DEFS, h, ctx()).find((r) => r.id === 'coin_fernwick').isNew, false);
});
test('tournament wins stack in one slot with first/latest dates and a bump', () => {
  const h = {};
  sync(ACH_DEFS, h, ctx({ wins: 1 }), '2026-10-20'); markSeen(h);
  sync(ACH_DEFS, h, ctx({ wins: 3 }), '2026-10-29');
  const r = view(ACH_DEFS, h, ctx({ wins: 3 })).find((x) => x.id === 'title_brookhollow_dash');
  assert.deepEqual([r.count, r.first, r.last, r.bumped, r.isNew], [3, '2026-10-20', '2026-10-29', true, false]);
  assert.equal(h.achievements.e.title_brookhollow_dash.count, 3);
});
test('Olympics-style events are data-driven coming-soon placeholders that never unlock', () => {
  const soon = ACH_DEFS.filter((d) => d.comingSoon);
  assert.ok(soon.length >= 8 && soon.some((d) => d.major && d.town === 'aurelith'));
  const h = {}; sync(ACH_DEFS, h, ctx({ wins: 9 }));
  for (const d of soon) assert.equal(h.achievements.e[d.id], undefined);
});
test('no blocked words in badges code', () => {
  for (const f of ['defs.js', 'screen.js', 'engine.js']) {
    const s = readFileSync(new URL('../src/achievements/' + f, import.meta.url), 'utf8');
    for (const w of [/\bPP\b/, /shiny/i, /pok[eé]dex/i, /pok[eé] ?ball/i, /\broute\b/i, /berry/i, /\bweed/i, /\bnurse/i, /super effective/i]) assert.ok(!w.test(s), `${f}: ${w}`);
  }
});
