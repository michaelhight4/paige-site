// Shared headless scene for the Nibbin / auto-walk / story Ron tests (Oct 23 2026). Not a test file itself.
// pump(s, n): a minimal live loop (player tick, NPC tick, triggers off, intro tick, tick++), real timers in between,
// so automove.js / story_ron.js walks actually happen tile by tile.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Overworld } from '../src/overworld/overworld.js';
import { GridMover } from '../src/overworld/movement.js';
import { NpcSystem } from '../src/overworld/npcs.js';
import { indexTileset } from '../src/overworld/tileset.js';
import { CONFIG } from '../src/config.js';
import { HomeStart } from '../src/overworld/intro.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const LINES = readJson(CONFIG.textLines);
const TS = indexTileset(readJson('art/world/overworld/tileset.json'));
export const MAP = (n) => readJson(CONFIG.mapsDir + n + '.json');

globalThis.fetch = async (url) => {
  const p = path.join(ROOT, String(url).replace(/^https?:\/\/[^/]+\//, ''));
  return fs.existsSync(p) ? { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(p, 'utf8')) } : { ok: false, status: 404 };
};

export function fakeSystems() {
  const caught = {}, bag = {};
  return {
    cfg: { starterCradles: { cradle_1: 'nibbin', cradle_2: 'cindrip', cradle_3: 'rillop' } },
    party: { list: [], chooseStarter(sp) { this.list.unshift({ species: sp }); return { ok: true }; } },
    archive: { boxes: [[]] },
    bag: { add(id, n = 1) { bag[id] = (bag[id] || 0) + n; return { ok: true }; }, count: (id) => bag[id] || 0 },
    kilindex: { data: { caught }, markCaught(sp) { caught[sp] = (caught[sp] || 0) + 1; return true; } },
    catchWild(sp) { this.party.list.push({ species: sp }); this.kilindex.markCaught(sp); },
  };
}

export async function scene({ map = 'office_int', flags = [], answers = [], at = null, automove = true, party = [] } = {}) {
  const s = Object.create(Overworld.prototype);
  const said = [], toasts = [], asked = [], saves = [];
  Object.assign(s, {
    mapCache: new Map(), imgCache: new Map(), config: CONFIG, lines: LINES, tilesetIndex: TS, input: {},
    opts: { toast: (t) => toasts.push(t), automove },
    flags: new Set(flags), party: [], seen: {}, seenDay: {}, counters: {}, clock: { day: 0, min: 480 }, log: [], tick: 0,
    busy: false, fade: null, systems: fakeSystems(), timescale: 0, zoom: 2, stillSince: 0, healedAt: null, layout: null,
    rustles: new Map(), follower: null, spriteMap: {},
    store: { save: (d) => { saves.push({ tick: s.tick, busy: s.busy }); return true; } },
    dialog: { active: false, say: async (pages, sp) => { said.push({ pages, sp, ronAt: ronCell(s) }); }, ask: async (pages) => { asked.push(pages); return answers.length ? answers.shift() : 0; } },
  });
  s.img = async () => null; // no canvas images headless
  s.saveData = () => ({ map: s.map?.name, flags: [...s.flags] }); // store stub records when a save went through
  s.systems.party.list.push(...party.map((sp) => ({ species: sp })));
  s.npcs = new NpcSystem(s);
  await enter(s, map, at);
  s.intro = new HomeStart(s, { newGame: true });
  return { s, said, toasts, asked, saves };
}

function ronCell(s) { const n = s.npcs?.byId?.('ron_story'); return n ? { x: n.x, y: n.y, facing: n.mover.facing } : null; }

/** Enter a map the way loadMap + _onMapReady would for NPCs (no sprites, no warps fired). */
export async function enter(s, name, at = null) {
  s.map = await s.loadMap(name);
  s.npcs.build(s.map, s.spriteMap || {}, null);
  const d = at || { x: 1, y: 1 };
  s.player = s.player || new GridMover({ x: d.x, y: d.y, facing: d.facing || 'up' });
  s.player.place(d.x, d.y, d.facing || 'up');
  s.fade = null;
}

const settle = (ms = 1) => new Promise((r) => setTimeout(r, ms));
/** Live loop for n ticks (or until pred()). */
export async function pump(s, n = 600, pred = null) {
  for (let i = 0; i < n; i++) {
    s.player.tick({ dir: null }, s.worldApi());
    s.npcs.tick(!!s.fade);
    if (s.fade?.phase === 'in') { s.fade.t++; if (s.fade.t >= s.fade.len) s.fade = null; }
    s.intro.tick();
    s.tick++;
    await settle(i % 4 === 0 ? 2 : 0);
    if (pred && pred()) return true;
  }
  return pred ? !!pred() : true;
}
export async function idle(s, n = 3000) { return pump(s, n, () => !s.busy); }
export const text = (said) => said.flatMap((x) => x.pages).join('\n');
export const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
