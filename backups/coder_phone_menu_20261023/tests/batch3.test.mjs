// Batch 3 (Oct 22, 2026): text_pending NPCs spawn through the real map loader; dialogue prompts come from the platform
// profile; "pin short maps" camera option; mobile toast / battle-image offsets. Run: node --test tests/batch3.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Overworld } from '../src/overworld/overworld.js';
import { NpcSystem } from '../src/overworld/npcs.js';
import { indexTileset } from '../src/overworld/tileset.js';
import { cameraFor, DEFAULT_CAMERA } from '../src/overworld/camera.js';
import { TILE, Col } from '../src/overworld/constants.js';
import { isIndoor } from '../src/overworld/clock.js';
import { CONFIG } from '../src/config.js';
import { promptScheme, promptVars, cssVarsFor, hudOffsetFor } from '../src/platform.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const PC = readJson('src/platform/pc.json'), MOBILE = readJson('src/platform/mobile.json');
const LINES = readJson(CONFIG.textLines);
const SPRITES = readJson(CONFIG.npcSpriteMap).map;
const TS = indexTileset(readJson('art/world/overworld/tileset.json'));

// fetch stub: the loader asks for repo-relative map URLs
globalThis.fetch = async (url) => {
  const p = path.join(ROOT, String(url).replace(/^https?:\/\/[^/]+\//, ''));
  return fs.existsSync(p) ? { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(p, 'utf8')) } : { ok: false, status: 404 };
};

function scene({ profile = null, lastDevice = null } = {}) {
  const s = Object.create(Overworld.prototype);
  Object.assign(s, { mapCache: new Map(), config: CONFIG, lines: LINES, tilesetIndex: TS, opts: { platform: profile && { id: profile.id, profile } },
    input: { lastDevice }, flags: new Set(), party: [] });
  return s;
}

// text_pending NPCs per map (World Design's interiors, positions as given; Oct 22, 2026)
const PENDING = {
  heal_brookhollow: ['heal_brookhollow_carer', 'heal_brookhollow_technician', 'heal_brookhollow_storage_user'],
  heal_fernwick: ['heal_fernwick_carer', 'heal_fernwick_technician', 'heal_fernwick_storage_user'],
  home_brookhollow_a: ['home_brookhollow_a_owner'],
  home_brookhollow_b: ['home_brookhollow_b_parent', 'scholar'],
  home_brookhollow_b_2f: ['home_brookhollow_b_kid'],
  home_fernwick_a: ['home_fernwick_a_parent'],
  home_fernwick_a_2f: ['home_fernwick_a_kid'],
  home_fernwick_c: ['home_fernwick_c_hobbyist'],
  home_lanternport_c: ['home_lanternport_c_parent'],
  home_lanternport_c_2f: ['home_lanternport_c_kid'],
  home_saltmere_a: ['home_saltmere_a_hobbyist'],
  lab_brookhollow: ['lab_brookhollow_researcher', 'lab_brookhollow_aide'],
  rt_branch_backroom: ['rt_backroom_manager'],
};

test('text_pending NPCs: spawn count per map through the real loadMap (19 on 13 maps), each with sprite + lines', async () => {
  const s = scene();
  let total = 0;
  for (const [name, ids] of Object.entries(PENDING)) {
    const m = await s.loadMap(name);
    const raw = readJson(CONFIG.mapsDir + name + '.json');
    const before = (raw.npcs || []).filter((d) => d.kind !== 'spawn' && Number.isInteger(d.x)).length;
    const list = new NpcSystem({}).build(m, SPRITES);
    assert.equal(list.length, before + ids.length, `${name}: spawn count`);
    for (const id of ids) {
      const n = list.find((x) => x.id === id);
      assert.ok(n, `${name}.${id} spawned`);
      assert.ok(n.sprite?.overworld_sheet, `${name}.${id} has a sprite`);
      assert.ok(fs.existsSync(path.join(ROOT, CONFIG.pixelDir, n.sprite.overworld_sheet)), `${name}.${id} sheet file`);
      assert.ok(s._entryFor(name, n.def), `${name}.${id} has lines`);
      assert.equal(m.code(n.x, n.y), Col.WALK, `${name}.${id} stands on floor`);
      assert.ok(!(raw.warps || []).some((w) => w.x === n.x && w.y === n.y), `${name}.${id} not on a warp`);
      const def = raw.text_pending.npcs.find((d) => d.id === id);
      assert.deepEqual([n.x, n.y], [def.x, def.y], `${name}.${id} at the data position`);
      total++;
    }
    // the text_pending signs are wired the same way (only when they have lines)
    for (const sg of raw.text_pending.signs || []) assert.ok(m.signs.some((x) => x.id === sg.id), `${name} sign ${sg.id}`);
  }
  assert.equal(total, 19);
});

test('text_pending: no double spawn if an id is also in npcs; interact_spots stay unwired (Gary\'s call)', async () => {
  const s = scene();
  const m = await s.loadMap('lab_brookhollow');
  const ids = m.npcs.map((d) => d.id);
  assert.equal(ids.length, new Set(ids).size);
  assert.equal(s._spotsFor(m).some((sp) => /^cradle_/.test(sp.id)), false, 'cradles are pending_story_call');
});

test('prompts: textVars words come from the active profile (pc keyboard/controller, mobile touch), CONFIG.buttonNames fallback', () => {
  assert.equal(promptScheme(PC), 'keyboard');
  assert.equal(promptScheme(PC, 'controller'), 'controller');
  assert.equal(promptScheme(PC, 'mouse'), 'keyboard', 'mouse has no run/bike words');
  assert.equal(promptScheme(MOBILE), 'touch');
  assert.equal(promptScheme(MOBILE, 'controller'), 'touch', 'mobile has no controller set: touch words');
  assert.equal(promptScheme(null), null);
  const fb = CONFIG.buttonNames;
  assert.deepEqual(promptVars(null, null, fb), { ...fb }, 'no profile: old words');
  const kb = promptVars(PC, 'keyboard', fb);
  assert.equal(kb.run_button, 'the X key'); assert.equal(kb.bike_button, 'the C key'); assert.equal(kb.confirm_button, 'the Z key');
  assert.equal(kb.run_button_glyph, 'key_x');
  assert.equal(promptVars(PC, 'controller', fb).bike_button, 'Select');
  const t = promptVars(MOBILE, 'touch', fb);
  assert.equal(t.run_button, 'the B button'); assert.equal(t.bike_button, 'the SEL button'); assert.equal(t.bike_button_glyph, 'btn_select');
  // a profile set missing a word falls back to CONFIG.buttonNames
  const partial = { controls: { prompts: { keyboard: { run_button: { glyph: 'key_x', label: 'the X key' } } } } };
  assert.equal(promptVars(partial, 'keyboard', fb).bike_button, fb.bike_button);
  // through the scene: the real textVars + fill
  const line = 'Hold {run_button} to run. Use {bike_button} to get on or off.';
  assert.equal(scene({ profile: PC }).fill([line])[0], 'Hold the X key to run. Use the C key to get on or off.');
  assert.equal(scene({ profile: PC, lastDevice: 'controller' }).fill([line])[0], 'Hold the B button to run. Use Select to get on or off.');
  assert.equal(scene({ profile: MOBILE, lastDevice: 'touch' }).fill([line])[0], 'Hold the B button to run. Use the SEL button to get on or off.');
  assert.equal(scene().fill([line])[0], `Hold ${fb.run_button} to run. Use ${fb.bike_button} to get on or off.`);
});

test('pin short maps: on in both profiles; interiors that overflow <= 1.6 tiles pin to the bottom; outdoors unchanged', () => {
  // pc turned it off (Oct 23, 2026 clinic camera fix: the bottom pin cropped the heal cradle on row 1); mobile keeps it
  assert.equal(PC.camera.pinShortMaps.enabled, false); assert.equal(MOBILE.camera.pinShortMaps.enabled, true);
  for (const p of [PC, MOBILE]) assert.equal(p.camera.pinShortMaps.slackTiles, 1.6, p.id);
  // centre camera (Oct 23, 2026) is on in both profiles and skips the pin; these check the rules it falls back to when flipped off
  const PCc = { ...PC.camera, alwaysCentre: false }, MOBc = { ...MOBILE.camera, alwaysCentre: false };
  const viewH = 8.4 * TILE; // 1080p / 2340x1080 at zoom 2
  // 10x9 room: overflow 0.6 tile -> pinned to the bottom wherever the player stands (mobile)
  for (const fy of [1.5 * TILE, 4.5 * TILE, 8.5 * TILE]) assert.equal(cameraFor(5 * TILE, fy, 10, 9, 15 * TILE, viewH, MOBc, null, { indoor: true }).y, Math.floor(9 * TILE - viewH));
  // pc: 14x10 heal room at 1920x1080 (view 540 px): follow clamped to the map, never above its top edge; at the counter row 1 is fully on screen
  const heal = (fy) => cameraFor(6.5 * TILE, fy, 14, 10, 960, 540, PCc, null, { indoor: true }).y;
  assert.equal(heal(3.5 * TILE), 0); assert.ok(92 - heal(3.5 * TILE) >= 0); assert.equal(heal(8.5 * TILE), 640 - 540); // cradle at map px (383,92)
  for (let fy = 0; fy <= 10 * TILE; fy += 16) { const y = heal(fy); assert.ok(y >= 0 && y <= 100, `pc heal cam y ${y}`); }
  // without the indoor flag (outdoors) or without the option it follows as before
  assert.deepEqual(cameraFor(5 * TILE, 1.5 * TILE, 10, 9, 15 * TILE, viewH, PCc, null, { indoor: false }), cameraFor(5 * TILE, 1.5 * TILE, 10, 9, 15 * TILE, viewH));
  assert.deepEqual(cameraFor(5 * TILE, 1.5 * TILE, 10, 9, 15 * TILE, viewH, DEFAULT_CAMERA, null, { indoor: true }), cameraFor(5 * TILE, 1.5 * TILE, 10, 9, 15 * TILE, viewH));
  // a big overflow (fernwick_hall_int 16x18) still scrolls; a room that fits is still centred
  const hall = (fy) => cameraFor(8 * TILE, fy, 16, 18, 19.5 * TILE, viewH, MOBc, null, { indoor: true }).y;
  assert.equal(hall(2 * TILE), 0); assert.ok(hall(16.5 * TILE) > hall(9 * TILE));
  assert.equal(cameraFor(5 * TILE, 4 * TILE, 10, 8, 15 * TILE, viewH, PCc, null, { indoor: true }).y, Math.round((8 * TILE - viewH) / 2));
  assert.equal(isIndoor('home_brookhollow_a'), true); assert.equal(isIndoor('brookhollow'), false);
});

test('mobile toast + battle image: own offsets lined up with the dialogue box (200px, 180px at max-height 340px); pc unchanged', () => {
  const short = (m) => m === '(max-height: 340px)';
  const mob = cssVarsFor(MOBILE), mobShort = cssVarsFor(MOBILE, short);
  for (const k of ['--toast-bottom', '--dlg-battle-bottom']) {
    assert.equal(mob[k], mob['--dlg-bottom'], k); assert.equal(mobShort[k], mobShort['--dlg-bottom'], k + ' short');
  }
  assert.equal(mob['--toast-bottom'], 'calc(200px + var(--safe-bottom))');
  assert.equal(mobShort['--dlg-battle-bottom'], 'calc(180px + var(--safe-bottom))');
  // clears the touch controls: d-pad top = 18 + 174 = 192, A/B top = 30 + 76 = 106
  const t = MOBILE.controls.touchLayout;
  assert.ok(200 > t.dpad.bottom + t.dpad.size && 180 > t.buttons.bottom + t.ab.size);
  const pc = cssVarsFor(PC);
  assert.equal(pc['--toast-bottom'], '6vh');
  assert.equal(pc['--dlg-battle-bottom'], 'calc(var(--dlg-portrait-bottom, 4vh) + 7.5em)', 'pc battle image where it always was');
  assert.equal(hudOffsetFor({}, 'toastBottom', 'x'), 'x');
});

test('layout fix (Oct 22, 2026): mobile portrait / battle image / toast-during-dialogue come from the profile; PC portrait unchanged', () => {
  const mob = cssVarsFor(MOBILE), pc = cssVarsFor(PC);
  // mobile portrait stands on the box bottom (above the d-pad top 192) and is sized to the room above it
  assert.equal(mob['--dlg-portrait-bottom'], 'calc(200px + var(--safe-bottom))');
  assert.equal(cssVarsFor(MOBILE, (m) => m === '(max-height: 340px)')['--dlg-portrait-bottom'], 'calc(200px + var(--safe-bottom))', 'no short-screen drop: the 180px box overlaps the up arrow');
  // dialogue v3 (Gary, Oct 22, 2026): full-size portrait again; dialog.js places it with the box (hud.dialogFull), these are the fallback
  assert.equal(mob['--dlg-portrait-height'], 'clamp(200px, 56vh, 260px)');
  assert.equal(mob['--dlg-portrait-max-w'], '180px');
  // PC: no portrait / toast-style vars, so style.css fallbacks (= old layout) apply
  for (const k of ['--dlg-portrait-height', '--dlg-portrait-max-w', '--toast-dlg-font', '--toast-dlg-pad', '--dlg-pad-left', '--tp-fade']) assert.equal(pc[k], undefined, k);
  assert.equal(pc['--dlg-portrait-bottom'], '4vh');
  // battle image: integer-scaled above the box on mobile only; PC keeps its zoom path
  const bi = MOBILE.hud.battleImage;
  assert.equal(bi.fit, 'aboveDialog');
  assert.ok(Number.isInteger(bi.minScale) && Number.isInteger(bi.maxScale) && bi.minScale >= 1 && bi.maxScale >= bi.minScale);
  assert.equal(PC.hud.battleImage, undefined);
  // toast during dialogue: both profiles opt in
  for (const p of [PC, MOBILE]) assert.ok(p.hud.toastDuringDialog && p.hud.toastDuringDialog.gapPx >= 0);
  const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  assert.match(css, /body\.dlg-toast-lift #toast\s*\{[^}]*z-index:\s*5/);
  assert.match(css, /\.dlg-wrap\s*\{[^}]*z-index:\s*4/);
});

test('dialogue v3 (Gary, Oct 22, 2026): phones hide the d-pad / SEL / DBG during dialogue, A/B stay, lists bring up/down back; pc untouched', async () => {
  const { touchControlsFor, dialogBoxCandidates } = await import('../src/overworld/dialog.js');
  const C = MOBILE.controls;
  assert.deepEqual(C.hideDuringDialog, ['dpad', 'sel', 'dbg']);
  assert.ok(C.showDpadForLists && C.tapDialog);
  // say: d-pad, SEL, DBG hidden; A/B never listed
  assert.deepEqual(touchControlsFor(C, { open: true, list: false }), { hide: ['dpad', 'sel', 'dbg'], listDpad: false });
  // a choice / inbox list: d-pad up/down come back
  assert.deepEqual(touchControlsFor(C, { open: true, list: true }), { hide: ['dpad', 'sel', 'dbg'], listDpad: true });
  // closed: everything back
  assert.deepEqual(touchControlsFor(C, { open: false, list: false }), { hide: [], listDpad: false });
  for (const n of ['a', 'b']) assert.ok(!C.hideDuringDialog.includes(n), n + ' stays visible');
  // pc sets none of it
  for (const k of ['hideDuringDialog', 'showDpadForLists', 'tapDialog', 'dialogFadeMs']) assert.equal(PC.controls[k], undefined, k);
  assert.equal(PC.hud.dialogFull, undefined);
  assert.deepEqual(touchControlsFor(PC.controls, { open: true, list: true }), { hide: [], listDpad: false });
  assert.equal(cssVarsFor(MOBILE)['--tp-fade'], `${C.dialogFadeMs}ms`);
  // box geometry at 844x390 from the touch layout numbers: B left = 844 - 22 - 76 - 14 - 76 = 656; up/down column right = 18 + 116 = 134
  const F = MOBILE.hud.dialogFull, t = C.touchLayout, W = 844, H = 390;
  const bLeft = W - t.buttons.right - 2 * t.ab.size - t.buttons.gap, abTop = H - t.buttons.bottom - t.ab.size;
  const right = [{ left: bLeft, right: W - t.buttons.right, top: abTop }];
  const say = dialogBoxCandidates(F, { W, H, right });
  assert.equal(say.prefer, 'beside');
  assert.deepEqual([say.beside.left, say.beside.left + say.beside.width, say.beside.bottom], [F.marginPx, bLeft - F.gapPx, F.marginPx]);
  const upDown = [{ left: t.dpad.left + t.dpad.size / 3, right: t.dpad.left + (2 * t.dpad.size) / 3, top: H - t.dpad.bottom - t.dpad.size }];
  const list = dialogBoxCandidates(F, { W, H, right, left: upDown, list: true });
  assert.equal(list.prefer, 'beside');
  assert.ok(list.beside.left >= upDown[0].right + F.gapPx, 'list box clears the d-pad up/down');
  // a narrow phone falls back to full width above A/B
  const narrow = dialogBoxCandidates(F, { W: 700, H, right: [{ left: 700 - 188, right: 678, top: abTop }] });
  assert.equal(narrow.prefer, 'above');
  assert.equal(narrow.above.bottom, H - abTop + F.gapPx);
  // battle image readable: at least 2 device px per art px
  assert.ok(MOBILE.hud.battleImage.minScale >= 2);
  const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  assert.match(css, /body\.tp-hide-dpad #touchpad \.dpad button/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{ #touchpad \.dpad button/);
});

// ---- club_int support (Oct 22, 2026): flag_swaps chains, active_when, by_phase, club follows the clock, lit greens ----
import { resolveFlagSwaps, isActive, npcForPhase } from '../src/overworld/props.js';
import { gradeFor as gradeFor2, followsOutdoorClock } from '../src/overworld/clock.js';
import { wantsLitGreens, litGreensGrade, LIT_GREENS } from '../src/overworld/lighting.js';

test('club flyer wall: slot -> note (tier flag) -> tick (camp flag, requires tier); banner wins; lantern_rest still swaps', async () => {
  const s = scene(), m = await s.loadMap('club_int');
  s.map = m;
  const name = (x, y) => TS.byId.get(m.tile('decoration', x, y))?.name;
  const wall = () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((x) => name(x, 2));
  s.applyProps();
  const base = wall();
  assert.deepEqual(base.slice(6, 10), ['club_note_slot', 'club_note_slot', 'club_note_slot', 'club_note_slot'], 'empty pins on a new game');
  s.flags.add('camp_restored_thornwood'); s.applyProps();
  assert.equal(name(7, 2), 'club_note_slot', 'no tick without the tier flag (requires)');
  s.flags.add('beat_master_fernwick'); s.applyProps();
  assert.equal(name(7, 2), 'club_note_tick');
  assert.equal(name(8, 2), 'club_note', 'greystone note pins at tier 1 too (Story Bot ruling Oct 22 10:04 PM CT)');
  s.flags.delete('camp_restored_thornwood'); s.applyProps();
  assert.equal(name(7, 2), 'club_note', 'cells re-resolve from the map tile (dev flag cleared)');
  s.flags.add('field_team_home'); s.applyProps();
  assert.deepEqual(wall(), [...Array(12).keys()].map((i) => 'club_banner_' + i), 'banner over every swap');
  s.flags.clear(); s.applyProps();
  assert.deepEqual(wall(), base, 'back to the start state');
  // lantern_rest (one plain swap) keeps working
  const s2 = scene(), lr = await s2.loadMap('lantern_rest'); s2.map = lr;
  const fs0 = lr.json.flag_swaps[0], at = () => TS.byId.get(lr.tile(fs0.layer || 'decoration', fs0.x, fs0.y))?.name;
  s2.applyProps(); assert.equal(at(), fs0.before);
  s2.flags.add(fs0.flag); s2.applyProps(); assert.equal(at(), fs0.after);
});

test('resolveFlagSwaps / active_when / by_phase (pure)', () => {
  const sw = [{ x: 0, y: 0, before: 'a', after: 'b', flag: 'f1' }, { x: 0, y: 0, before: 'b', after: 'c', flag: 'f2', requires: 'f1' }, { x: 0, y: 0, before: 'any', after: 'z', flag: 'f3' }];
  const r = (...f) => resolveFlagSwaps(sw, new Set(f), () => null)[0].tile;
  assert.equal(r(), 'a'); assert.equal(r('f1'), 'b'); assert.equal(r('f2'), 'a'); assert.equal(r('f1', 'f2'), 'c'); assert.equal(r('f3'), 'z'); assert.equal(r('f1', 'f2', 'f3'), 'z');
  assert.equal(isActive({}, new Set()), true);
  assert.equal(isActive({ active_when: 'x' }, new Set()), false);
  assert.equal(isActive({ active_when: ['x', 'y'] }, new Set(['x', 'y'])), true);
  const dj = readJson('art/world/overworld/maps/club_int.json').text_pending.npcs.find((n) => n.id === 'rebel_dj');
  assert.deepEqual(['x', 'y', 'facing'].map((k) => npcForPhase(dj, 'day')[k]), [10, 12, 'right']);
  assert.deepEqual(['x', 'y', 'facing'].map((k) => npcForPhase(dj, 'night')[k]), [11, 9, 'down']);
  assert.equal(dj.x, 11, 'def not mutated');
  // a by_phase NPC is built at its phase position; an inactive one is not built
  const m = { name: 't', storyGates: [], npcs: [{ ...dj }, { id: 'later', x: 3, y: 3, kind: 'villager', active_when: 'nope' }], resetOccupancy() {} };
  const list = new NpcSystem({ flags: new Set() }).build(m, {}, 'dawn');
  assert.deepEqual(list.map((n) => [n.id, n.x, n.y]), [['rebel_dj', 10, 12]]);
});

test('active_when spots: no spot (no text, no stand cell) until the flag', async () => {
  const s = scene(), m = await s.loadMap('club_int');
  m.json.interact_spots = [{ id: 'a', x: 7, y: 2, stand: [7, 3] }, { id: 'b', x: 8, y: 2, stand: [8, 3], active_when: 'beat_master_revival' }];
  assert.deepEqual(s._spotsFor(m).map((sp) => sp.id), ['a']);
  s.flags.add('beat_master_revival');
  assert.deepEqual(s._spotsFor(m).map((sp) => sp.id), ['a', 'b']);
});

test('The Firefly follows the outdoor clock grade but stays indoor everywhere else; lit greens default OFF', () => {
  assert.equal(followsOutdoorClock('club_int'), true);
  assert.equal(isIndoor('club_int'), true, 'depth profile / camera / living keep it indoor');
  for (const ph of ['dawn', 'day', 'dusk', 'night']) assert.equal(gradeFor2('club_int', ph), ph);
  assert.equal(gradeFor2('fernwick_hall_int', 'night'), 'day');
  assert.equal(CONFIG.litGreensAtNight, false);
  assert.equal(wantsLitGreens(CONFIG.litGreensAtNight, 'club_int', 'night'), false);
  assert.equal(wantsLitGreens(true, 'club_int', 'night'), true);
  assert.equal(wantsLitGreens(true, 'club_int', 'day'), false);
  assert.equal(wantsLitGreens(true, 'heal_brookhollow', 'night'), false);
  const g = { name: 'night', litMap: new Map([[0xa6d460, 0x546d93], [0xfcd668, 0xfcc551]]), map: new Map(), cache: new WeakMap() };
  const v = litGreensGrade(g);
  assert.equal(v.litMap.get(0xa6d460), 0xa6d460); assert.equal(v.litMap.get(0xfcd668), 0xfcc551);
  assert.equal(g.litMap.get(0xa6d460), 0x546d93, 'base grade untouched');
  assert.equal(litGreensGrade(g), v, 'cached'); assert.equal(LIT_GREENS.length, 12);
});
