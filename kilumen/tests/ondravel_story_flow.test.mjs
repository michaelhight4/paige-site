// Ondravel story flow (Gary, Oct 30 2026): summit = scripted LOSS (no blackout, no money, no game over) -> flashback lab via
// fin_timeslip + the 'ending' loading screen -> release fight is winnable, last phase catchable -> same ending either way.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const R9 = await import('../src/region9/index.js');
const { WELLSPIRE_TEAMS } = await import('../src/region9/teams.js');

function mock(flags = []) {
  const s = { flags: new Set(flags), seen: {}, lines: {}, log: [], map: { name: 'fin_lab1_now' }, player: { x: 12, y: 5 }, warps: [], battles: [], blackouts: 0,
    setFlag(f, on = true) { on ? this.flags.add(f) : this.flags.delete(f); }, say: async () => {}, ask: async () => 0,
    startWarp(sp, kind) { s.warps.push({ ...sp, kind }); s.map = { name: sp.map }; }, script: async (fn) => fn(), hooks: {},
    systems: { party: { list: [1], healAll() { s.healed = (s.healed || 0) + 1; } }, onPartyFainted() { s.blackouts++; }, onTrainerLoss() { s.blackouts++; return true; } } };
  return s;
}

for (const result of [false, true]) test(`summit fight is a scripted loss whatever the battle returns (${result})`, async () => {
  const s = mock(['fin_spire_floor_4']); const api = R9.attachRegion9(s, { systems: s.systems });
  s.hooks.onBattle = async (who) => { s.battles.push(who); return result; };
  await api.runSpot({ id: 'fin_dome' });
  assert.deepEqual(s.battles.map((b) => [b.id, b.scripted, b.turnOnly]), [['fin_ondravel_summit', 'lose', true]]);
  assert.ok(WELLSPIRE_TEAMS['fin_lab1_now.fin_ondravel_summit']);
  assert.equal(s.blackouts, 0); assert.ok(s.healed >= 1);
  assert.ok(s.flags.has('fin_summit_lost') && s.flags.has('fin_timeslip') && !s.flags.has('fin_guardian_beaten'));
  assert.deepEqual([s.warps.at(-1).map, s.warps.at(-1).kind], ['fin_past_station_m', 'ending']); // existing flashback + loading screen
});

const release = async (last) => {
  const s = mock(['fin_timeslip', 'fin_spire_floor_4', 'fin_summit_lost']); const api = R9.attachRegion9(s, { systems: s.systems });
  s.hooks.onBattle = async (who) => { s.battles.push(who); return who.catchable ? last : true; };
  assert.equal(await api.guardian(), true); return s;
};
test('release fight: only the last phase is catchable; defeating him runs the ending', async () => {
  const s = await release(true);
  assert.deepEqual(s.battles.map((b) => !!b.catchable), [false, false, true]); assert.ok(s.battles.every((b) => b.turnOnly));
  assert.ok(s.flags.has('fin_released') && s.flags.has('fin_guardian_beaten') && s.flags.has('fin_woke_home'));
  assert.ok(!s.flags.has('fin_ondravel_caught'));
  assert.equal(s.warps.at(-1).map, 'house_2f');
});
test('release fight: catching him sets fin_ondravel_caught and the same ending runs', async () => {
  const s = await release('caught');
  assert.ok(s.flags.has('fin_ondravel_caught') && s.flags.has('fin_guardian_beaten') && s.flags.has('fin_woke_home'));
  assert.equal(s.warps.at(-1).map, 'house_2f');
});

test('staging: arriving on the summit walks the player out to the platform end, he names them the one, the fight starts', async () => {
  const fs = await import('node:fs'); const json = JSON.parse(fs.readFileSync('art/world/overworld/maps/fin_lab1_now.json', 'utf8'));
  const s = mock(['fin_spire_floor_4']); s.map = { name: 'fin_lab1_now', json, width: json.width, height: json.height, inBounds: () => true, code: () => 0, npcAt: () => null };
  const said = []; s.say = async (p) => { said.push(...p); };
  s.player = { x: 12, y: 13, facing: 'up', place(x, y, f) { this.x = x; this.y = y; this.facing = f; } };
  const api = R9.attachRegion9(s, { systems: s.systems }); s.hooks.onBattle = async (who) => { s.battles.push(who); return false; };
  let run = null; s.script = (fn) => (run = fn()); api.tick(); await run;
  assert.deepEqual([s.player.x, s.player.y, s.player.facing], json.staging.stop.concat(json.staging.face));
  assert.ok(said.some((l) => /the one/i.test(l)));
  assert.equal(s.battles[0].id, 'fin_ondravel_summit'); assert.ok(s.flags.has('fin_timeslip'));
  api.tick(); assert.equal(s.battles.length, 1); // once
});

test('loss teleport: the summit loss heals (no blackout / money), sets the timeslip flag and loads into the flashback lab', async () => {
  const s = mock(['fin_spire_floor_4']); s.systems.wallet = { money: 500 }; const api = R9.attachRegion9(s, { systems: s.systems });
  s.hooks.onBattle = async (who) => { s.battles.push(who); return false; };
  let run = null; s.map = { ...s.map, json: { staging: { stop: [12, 5], face: 'up' } } }; s.script = (fn) => (run = fn()); api.tick(); await run;
  assert.equal(s.battles[0].scripted, 'lose'); assert.equal(s.blackouts, 0); assert.equal(s.systems.wallet.money, 500); assert.ok(s.healed >= 1);
  assert.ok(s.flags.has('fin_summit_lost') && s.flags.has('fin_timeslip'));
  const w = s.warps.at(-1); assert.equal(w.map, 'fin_past_station_m'); assert.equal(w.kind, 'ending'); // the existing flashback loading screen
});
