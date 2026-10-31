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

// Gary's View staging (Oct 30 2026): "just when you click view it shows that image and then the text rolls until you get put into the battle"
const summit = async () => {
  const fs = await import('node:fs'); const json = JSON.parse(fs.readFileSync('art/world/overworld/maps/fin_lab1_now.json', 'utf8'));
  const s = mock(['fin_spire_floor_4']); s.map = { name: 'fin_lab1_now', json, width: json.width, height: json.height, inBounds: () => true, code: () => 0, npcAt: () => null };
  s.player = { x: 12, y: 13, facing: 'up', place(x, y, f) { this.x = x; this.y = y; this.facing = f; } };
  const ev = []; s.log.push = (e) => { ev.push(e.type === 'summit_view' ? (e.open ? 'view_open' : 'view_close') : e.type); return 0; };
  s.say = async (p) => { ev.push('say:' + p.join(' ')); }; const api = R9.attachRegion9(s, { systems: s.systems });
  s.hooks.onBattle = async (who) => { ev.push('battle'); s.battles.push(who); return false; };
  return { s, api, ev, json };
};
test('View: fin_dome has the View prompt (tap + F) and arriving on the summit no longer forces a walk or speech', async () => {
  const { s, api, ev, json } = await summit(); const sp = json.interact_spots.find((x) => x.id === 'fin_dome');
  assert.equal(sp.verb, 'View'); assert.equal(sp.prompt_tap, true);
  let ran = false; s.script = async () => { ran = true; }; api.tick?.();
  assert.equal(ran, false); assert.deepEqual([s.player.x, s.player.y], [12, 13]); assert.equal(ev.length, 0); assert.equal(s.battles.length, 0);
});
test('View starts the image scene; his text rolls over it; when it completes fight 1 starts (turn-based, scripted loss)', async () => {
  const { s, api, ev } = await summit(); await api.runSpot({ id: 'fin_dome' });
  const open = ev.indexOf('view_open'), close = ev.indexOf('view_close'), fight = ev.indexOf('battle');
  assert.equal(open, 0, 'the image opens first');
  const lines = ev.slice(open + 1, close); assert.ok(lines.length >= 1 && lines.every((l) => l.startsWith('say:'))); // text over the image
  assert.ok(lines.some((l) => /the one/i.test(l)));
  assert.ok(close < fight && ev.slice(close + 1, fight).length === 0, 'text done -> straight into the battle');
  const b = s.battles[0]; assert.deepEqual([b.id, b.scripted, b.turnOnly], ['fin_ondravel_summit', 'lose', true]);
  assert.equal(s.battles.length, 1);
});
test("fight 1's loss heals (no blackout / money), sets the timeslip and loads into the flashback lab", async () => {
  const { s, api } = await summit(); s.systems.wallet = { money: 500 }; await api.runSpot({ id: 'fin_dome' });
  assert.equal(s.blackouts, 0); assert.equal(s.systems.wallet.money, 500); assert.ok(s.healed >= 1);
  assert.ok(s.flags.has('fin_summit_lost') && s.flags.has('fin_timeslip'));
  const w = s.warps.at(-1); assert.equal(w.map, 'fin_past_station_m'); assert.equal(w.kind, 'ending');
});
test('View fit: the whole giant (head + antlers) fits PC 1280x800 and phone 844x390 at one uniform nearest-neighbour scale', async () => {
  const fs = await import('node:fs'); const { viewFit } = await import('../src/region9/summit_view.js');
  const m = JSON.parse(fs.readFileSync('art/fx/wellspire/ondravel_view/ondravel_view.json', 'utf8'));
  for (const [W, H] of [[1280, 800], [844, 390], [1920, 1080], [390, 844]]) {
    const f = viewFit(W, H, m); const g = m.giant;
    assert.ok(f.y + g.y * f.s >= -0.5 && f.y + (g.y + g.h) * f.s <= H + 0.5, `${W}x${H} vertical`);
    assert.ok(f.x + g.x * f.s >= -0.5 && f.x + (g.x + g.w) * f.s <= W + 0.5, `${W}x${H} horizontal`);
  }
  for (const n of ['view_bg', 'view_front', 'view_ledge']) assert.ok(fs.existsSync(`art/fx/wellspire/ondravel_view/${n}.png`));
});
