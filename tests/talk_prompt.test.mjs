// PC talk key + prompt (Gary 11:31 AM CT Oct 23, 2026: "need a f key prompt to talk to people on pc, talking to people
// doesnt work at all"). F is an A key on the keyboard (Z / Space / Enter still are); the bubble over the faced NPC / sign /
// object shows a keycap F + Talk / Read / Check on PC, A on a pad, and nothing on the phone or while a dialogue / menu is open.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.window ??= new EventTarget();
const { Input } = await import('../src/overworld/input.js');
const { GameUI } = await import('../src/ui/ui.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prof = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, 'src/platform', n + '.json'), 'utf8'));
const BLOCKED = /\b(PP|shiny|super effective|Pok[eé]dex|Pok[eé] ?Ball|Gotcha|nurse)\b/i;

const key = (t, code, type = 'keydown') => { const e = new Event(type); e.code = code; e.repeat = false; t.dispatchEvent(e); };

test('talk key: F is an A press on the keyboard; Z, Space and Enter still are; E / Q are not', () => {
  const t = new EventTarget(), inp = new Input(t); inp._pollPads = () => {}; // no gamepads in node
  for (const code of ['KeyF', 'KeyZ', 'Space', 'Enter']) {
    key(t, code); key(t, code, 'keyup');
    const s = inp.poll(); assert.equal(s.a, true, code); assert.equal(inp.lastDevice, 'keyboard', code);
    assert.equal(inp.poll().a, false, `${code} is an edge, consumed once`);
  }
  for (const code of ['KeyE', 'KeyQ']) { key(t, code); assert.equal(inp.poll().a, false, code); }
});

// a fake scene / prompt element so _promptTick runs without a DOM
function rig({ profile = prof('pc'), facing = 'up', npc = true, sign = false, spot = false, dialog = false, menu = false, last = 'keyboard', zoom = 1, sheet = 64, cam = { x: 0, y: 0 } } = {}) {
  const cls = new Set(), text = { g: '', t: '' };
  const prompt = { classList: { toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)), contains: (c) => cls.has(c) },
    querySelector: (s) => ({ set textContent(v) { text[s.slice(1)] = v; } }), style: {} };
  const map = { inBounds: () => true, code: () => 1, signs: sign ? [{ id: 's', x: 5, y: 4 }] : [], npcAt: (x, y) => (npc && x === 5 && y === 4 ? { def: { id: 'n' } } : null) };
  const scene = { player: { x: 5, y: 5, facing, moving: false }, map, spots: spot ? [{ kind: 'prop', x: 5, y: 4 }] : [], dialog: { active: dialog }, busy: false, fade: null,
    _cam: cam, zoom, tileset: { size: sheet }, canvas: { width: 1920, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1920 }) }, input: { lastDevice: last } };
  const ui = { scene, prompt, active: menu, cfg: profile.ui || {}, platform: { profile } };
  return { run: () => { if (ui.cfg.interactPrompt !== false) GameUI.prototype._promptTick.call(ui); return { shown: cls.has('show'), key: cls.has('key'), ...text }; }, prompt };
}

test('talk prompt: PC keyboard shows a keycap F + Talk / Read / Check over the faced thing', () => {
  assert.deepEqual(rig().run(), { shown: true, key: true, g: 'F', t: 'Talk' });
  assert.deepEqual(rig({ npc: false, sign: true }).run(), { shown: true, key: true, g: 'F', t: 'Read' });
  assert.deepEqual(rig({ npc: false, spot: true }).run(), { shown: true, key: true, g: 'F', t: 'Check' });
  assert.equal(rig({ facing: 'down' }).run().shown, false, 'not facing anything');
  const pad = rig({ last: 'controller' }).run(); assert.equal(pad.g, 'A'); assert.equal(pad.key, false, 'a pad keeps the round A');
});

test('talk prompt: placed over the faced tile at 2x zoom (the 2x tileset sheet is 128 px; camera units are 64 px tiles)', () => {
  // player (5,5) facing up at NPC (5,4); camera centred so tile (5,4) is mid-screen on a 1920 px canvas at zoom 2
  const r = rig({ zoom: 2, sheet: 128, cam: { x: 5.5 * 64 - 480, y: 4 * 64 - 270 } }); r.run();
  assert.equal(r.prompt.style.left, '960px'); assert.equal(r.prompt.style.top, `${540 - 64 - 4}px`, 'NPC bubble sits half a tile (64 px at 2x) above the tile top, clear of the head');
});

test('talk prompt: hidden while a dialogue or a menu is open, and never on the phone', () => {
  assert.equal(rig({ dialog: true }).run().shown, false, 'dialogue open');
  assert.equal(rig({ menu: true }).run().shown, false, 'menu open');
  assert.equal(prof('mobile').ui.interactPrompt, false, 'phone profile turns the bubble off');
  assert.equal(rig({ profile: prof('mobile') }).run().shown, false, 'phone');
  assert.equal(prof('pc').ui.interactPrompt, true);
});

test('talk prompt: PC words are short and clean', () => {
  const ui = prof('pc').ui; assert.equal(ui.interactKey, 'F');
  for (const w of Object.values(ui.interactVerbs)) { assert.ok(w.length <= 8, w); assert.doesNotMatch(w, BLOCKED); }
});
