// Interim ending (v0.2.86, Gary Oct 29 2026): 8th coin -> all_badges; Ron 6 + 8 coins -> Ron/RITA, credits, finale_done +
// game_cleared, home to Brookhollow with a postgame note. No saving during the credits. No blocked player words.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = await import(path.join(root, 'src/progression/ending.js'));
const C = await import(path.join(root, 'src/ui/credits.js'));
const { normalise } = await import(path.join(root, 'src/overworld/save.js'));
const BANNED = /\b(PP|shiny|super effective|Pok[eé]dex|Pok[eé] Ball|Gotcha!|nurse|weed|routes?|berr(y|ies))\b/i;
const MASTERS = ['fernwick', 'saltmere', 'revival', 'frostspire', 'mirefen', 'tidewater', 'lanternport', 'cindervale'].map((z) => 'beat_master_' + z);

function fakeScene(flags) {
  const s = {
    flags: new Set(flags), said: [], log: [], tick: 0, busy: false, fade: null, clock: { day: 41 }, locks: new Map(), saves: 0,
    party: [{ species: 'emberkit', nickname: 'Pip', level: 61 }, { species: 'mossling', level: 58 }],
    setFlag(f) { this.flags.add(f); if (/^beat_master_/.test(f)) E.syncAllBadges(this); },
    text: () => null, say(p, sp) { this.said.push([sp?.name ?? null, p.join(' ')]); return Promise.resolve(); },
    async script(fn) { this.busy = true; try { await fn(); } finally { this.busy = false; } },
    lockSave(r) { this.locks.set(r, 1); return () => this.locks.delete(r); },
    get saveLocked() { return this.busy || this.locks.size > 0; },
    async _homeStart(outside) { assert.equal(outside, true); return { map: 'brookhollow', x: 10, y: 9, facing: 'down' }; },
    startWarp(spawn) { this.warpedTo = spawn; this.fade = { t: 0 }; },
  };
  return s;
}

test('the 8th coin sets all_badges (and only then); the arena gate keys on it', () => {
  const s = fakeScene(MASTERS.slice(0, 7));
  assert.equal(E.syncAllBadges(s), false);
  s.setFlag(MASTERS[7]);
  assert.ok(s.flags.has('all_badges'));
  const au = JSON.parse(fs.readFileSync(path.join(root, 'art/world/overworld/maps/aurelith.json'), 'utf8'));
  assert.equal(au.story_gates.find((g) => g.id === 'gate_aurelith_arena').flag, E.ENDING.badges);
});

test('old save with 8 Master flags: all_badges on load (wired in overworld.js init + setFlag)', () => {
  const s = fakeScene(MASTERS);
  assert.equal(E.syncAllBadges(s), true);
  assert.equal(E.syncAllBadges(s), false);
  const ow = fs.readFileSync(path.join(root, 'src/overworld/overworld.js'), 'utf8');
  assert.match(ow, /syncAllBadges\(this\); \/\/ interim ending: old saves/);
  assert.match(ow, /endingDue\(this\.flags\)\) await runInterimEnding\(this\)/);
});

test('ending is due only with Ron 6 + all 8 coins, never twice', () => {
  assert.equal(E.endingDue(new Set(['beat_rival_ron_6'])), false);
  assert.equal(E.endingDue(new Set(['all_badges'])), false);
  assert.equal(E.endingDue(new Set(['all_badges', 'beat_rival_ron_6'])), true);
  assert.equal(E.endingDue(new Set(['all_badges', 'beat_rival_ron_6', 'finale_done'])), false);
});

test('full ending: Ron + RITA, credits under the save lock, finale_done + game_cleared, home with a postgame note', async () => {
  const s = fakeScene([...MASTERS, 'all_badges', 'beat_rival_ron_6']);
  let lockedInCredits = null;
  const ok = await E.runInterimEnding(s, {
    credits: async (sc, rec) => { lockedInCredits = sc.saveLocked; assert.equal(rec.team[0].nickname, 'Pip'); assert.ok(!sc.flags.has('finale_done')); },
    wait: async () => { s.fade = null; },
  });
  assert.equal(ok, true);
  assert.equal(lockedInCredits, true);
  assert.deepEqual(s.said.map((x) => x[0]), ['Ron', 'RITA', 'Ron', null]);
  assert.match(s.said[3][1], /GAME CLEARED/);
  assert.ok(s.flags.has('finale_done'));
  assert.equal(s.warpedTo.map, 'brookhollow');
  assert.equal(s.gameCleared.day, 41);
  assert.equal(s.gameCleared.team.length, 2);
  assert.equal(s.locks.size, 0);
  assert.equal(await E.runInterimEnding(s, { credits: async () => assert.fail('replayed') }), false);
});

test('game_cleared survives a save round trip; junk is dropped', () => {
  const rec = { at: 1793300000000, day: 41, team: [{ species: 'emberkit', nickname: 'Pip', level: 61 }] };
  const s = normalise({ v: 2, flags: ['finale_done'], game_cleared: rec });
  assert.deepEqual(E.normClear(s.game_cleared), rec);
  assert.equal(normalise({ v: 2, flags: [], game_cleared: 'yes' }).game_cleared, undefined);
  assert.equal(E.normClear(null), null);
});

test('credits: team, eight towns, crew, skip control; no blocked player words anywhere', () => {
  const t = C.creditText({ textVars: () => ({ player: 'Cal' }) });
  const html = C.creditsHtml(t, { team: [{ species: 'emberkit', nickname: 'Pip', level: 61 }] });
  assert.match(html, /You did it, Cal\./);
  assert.match(html, /Pip/);
  for (const town of C.TOWNS) assert.ok(html.includes(town), town);
  const words = JSON.stringify([C.CREDIT_FALLBACK, E.ENDING_FALLBACK]);
  assert.doesNotMatch(words, BANNED);
  assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), BANNED);
  assert.match(fs.readFileSync(path.join(root, 'src/ui/credits.js'), 'utf8'), /Skip ›/);
});
