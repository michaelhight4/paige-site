// Pass 2 pocket trainers (Coder, Oct 30 2026): every Kilu on a pocket team is registered, has battle art and is at the
// evolution stage its level calls for (Lv63 pockets: past both PLACEHOLDER evo levels, so final stage of a 3-stage line).
import test from 'node:test'; import assert from 'node:assert';
import fs from 'node:fs';
import { CAVE_POCKET_TEAMS } from '../src/battle/data/cave_pocket_teams.js';
import { evoTable } from '../src/systems/evolution.js';
const SP = Object.fromEntries(fs.readFileSync(new URL('../src/ui/species_synced.gen.js', import.meta.url), 'utf8').split('\n')
  .filter((l) => l.startsWith('{')).map((l) => JSON.parse(l.replace(/\];?\s*$/, '').replace(/,\s*$/, ''))).map((s) => [s.id, s]));
const art = (id) => fs.existsSync(new URL(`../art/characters/pixel/creatures/${id}/battle`, import.meta.url));
test('pocket teams: registered, battle art, evolution-correct for their level', () => {
  const t = evoTable();
  for (const [k, team] of Object.entries(CAVE_POCKET_TEAMS)) for (const m of team) {
    const s = SP[m.species];
    assert.ok(s, `${k}: ${m.species} is not registered`);
    assert.ok(art(m.species), `${k}: ${m.species} has no battle art`);
    assert.ok(!(t[m.species] && m.level >= t[m.species].level), `${k}: ${m.species} Lv${m.level} should already be ${t[m.species]?.to}`);
    if (m.level >= 32) assert.strictEqual(s.stage, 2, `${k}: ${m.species} (stage ${s.stage}) is not a final stage for Lv${m.level}`);
  }
});
