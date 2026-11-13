// Contacts / phone book v1 (Coder, Oct 23 2026; Gary 12:24 PM CT: a contact system for named trainers). src/systems/contacts.js (+ contacts_save.js, data src/systems/data/contacts.json),
// dev only behind ?contacts=1. Node only; browser shots: tests/contacts_shots.mjs.
// Run: node --test tests/contacts.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Overworld } from '../src/overworld/overworld.js';
import { SaveStore, freshSave, normalise, SAVE_VERSION, SAVE_KEY, V2_BLOCKS } from '../src/overworld/save.js';
import { CONTACTS_V } from '../src/systems/contacts_save.js';
import {
  attachContacts, contactsEnabled, canBeContact, isNamedTrainer, rematchTeam, regionOf, pingWait, notePing, pickPing,
  rareSlot, contactText, ContactBook, contactsDefault, normaliseContacts, PH, rollOffer,
} from '../src/systems/contacts.js';
import { authoredTeam } from '../src/battle/data/trainer_teams.js';

const J = (p) => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url)));
const DATA = J('src/systems/data/contacts.json');
const LINES = J('text/overworld_lines.json');
const ENC = J('data/encounters_wired.json');
const P = Overworld.prototype;
const memStorage = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const NAMED = ['route1.trainer_r1_d', 'route1.trainer_r1_e', 'route1.trainer_r1_f', 'fernwick.trainer_fw_a', 'fernwick.ron_rival_1'];
const entry = (key) => { const [m, id] = key.split('.'); return LINES.maps?.[m]?.[id] || null; };
const BANNED = /pok[eé]gear|pok[eé]mon|\bPP\b|shiny|super[\s-]*effective|pok[eé]dex|pok[eé][\s-]*ball|gotcha|\bnurse\b|\bweed\b|\broutes?\b|\bthrow/i;
const tickAll = () => new Promise((r) => setTimeout(r, 0));

/** Scene stub with the REAL script / save-lock / save path (Overworld.prototype) and a real SaveStore. */
function stub({ map = 'route1', storage = memStorage(), answers = [], party = [{ species: 'tumbloam', level: 6 }] } = {}) {
  const store = new SaveStore(storage);
  const said = [], asked = [];
  const npcs = (LINES.maps[map] ? Object.keys(LINES.maps[map]) : []).map((id, i) => ({ id, x: 10 + i, y: 10 }));
  const s = {
    flags: new Set(['got_starter']), seen: {}, log: [], busy: false, fade: null, dialog: { active: false }, tick: 0, ms: 0, store,
    lines: LINES, _saveLocks: new Map(), saveGuards: [], _dirty: false, saves: 0, intro: null, clock: { day: 0, min: 9 * 60 }, phase: 'day',
    map: { name: map, title: map === 'route1' ? 'Trail 1 - Sunmeadow Fields' : 'Fernwick', npcs }, player: { x: 5, y: 5, locked: false, moving: false },
    config: { playerName: 'Cal' }, hooks: { onBattle: null }, said, asked, talked: [],
    systems: { party: { list: party }, wins: [], losses: [], bag: { items: {}, add(id, n) { this.items[id] = (this.items[id] || 0) + n; } },
      onTrainerWin(o) { this.wins.push(o); }, onTrainerLoss(o) { this.losses.push(o); } },
    saveData() { return { flags: [...this.flags], seen: this.seen }; },
    step() { this.tick++; },
    talk(n, def) { this.talked.push(def.id); },
    markerSpots() { return []; },
    _entryFor(m, def) { return LINES.maps?.[m]?.[def.id] || null; },
    speakerFor(n) { const e = n && this._entryFor(this.map.name, n.def); return { name: e?.name || (/^ron_/.test(n?.def?.id || '') ? 'Ron' : null) }; },
    pick(e) { return { pages: e.pages || [] }; },
    async say(pages, sp) { said.push({ pages: [...(pages || [])], who: sp?.name ?? null, busy: this.busy, lock: this.saveLockReason() }); },
    async ask(pages, choices, sp) { asked.push({ pages, choices, who: sp?.name ?? null }); return answers.length ? answers.shift() : 0; },
    text(k) { return null; },
  };
  for (const k of ['saveLockReason', 'lockSave', 'checkpoint', 'saveNow', 'script']) s[k] = P[k].bind(s);
  Object.defineProperty(s, 'saveLocked', { get: () => !!s.saveLockReason() });
  const save = s.saveNow; s.saveNow = () => { const ok = save(); if (ok) s.saves++; return ok; };
  return s;
}
const attach = (s, o = {}) => attachContacts(s, { data: DATA, encounters: ENC, rng: () => 0, areaName: (m) => (m === 'route1' ? 'Trail 1' : m[0].toUpperCase() + m.slice(1)), ...o });
const npc = (id) => ({ def: { id }, id });
async function walk(s, n) { const out = []; for (let i = 0; i < n; i++) { s.player.x += i % 2 ? -1 : 1; s.step({}); const busy = s.busy; await tickAll(); out.push(busy); } return out; }

// ---------------------------------------------------------------------------------------------------------------------
test('flag off: nothing attaches, no scene method changes, main.js only loads the module behind ?contacts=1', async () => {
  assert.equal(contactsEnabled(null), false);
  assert.equal(contactsEnabled(new URLSearchParams('')), false);
  assert.equal(contactsEnabled(new URLSearchParams('contacts=0')), false);
  assert.equal(contactsEnabled(new URLSearchParams('contacts=1')), true);
  const s = stub(); const before = { talk: s.talk, step: s.step, markerSpots: s.markerSpots, saveData: s.saveData, guards: s.saveGuards.length };
  assert.equal(await attachContacts(s, { query: new URLSearchParams('cv=1') }), null);
  assert.deepEqual({ talk: s.talk, step: s.step, markerSpots: s.markerSpots, saveData: s.saveData, guards: s.saveGuards.length }, before);
  const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const lines = main.split('\n').filter((l) => l.includes('contacts.js'));
  assert.equal(lines.length, 1, 'one hook line');
  assert.match(lines[0], /^if \(q\.get\('contacts'\) === '1'\)/);
  // the built-in placeholder Contacts screen is untouched (only replaced at runtime when the flag is on)
  assert.match(fs.readFileSync(new URL('../src/ui/ui.js', import.meta.url), 'utf8'), /scr_contacts\(\) \{ return this\._simple\('contacts'/);
  // flag off still talks / steps like before
  s.seen['defeated:route1.trainer_r1_d'] = true; s.talk(npc('trainer_r1_d'), { id: 'trainer_r1_d' });
  assert.deepEqual(s.talked, ['trainer_r1_d']);
});

test('who can be a contact: the 5 named region 1 trainers; generic trainers, hall helpers and Masters cannot', () => {
  for (const k of NAMED) assert.equal(canBeContact(DATA, k, entry(k)), true, k);
  for (const k of ['route1.trainer_r1_a', 'route1.trainer_r1_b', 'route1.trainer_r1_c', 'fernwick_hall_int.helper_1', 'fernwick_hall_int.helper_2', 'fernwick_hall_int.master_fernwick'])
    assert.equal(canBeContact(DATA, k, entry(k)), false, k);
  // a named trainer needs a data block; generic + contact:true is allowed; a hall helper with a name is still refused
  assert.equal(canBeContact({ trainers: {} }, 'route1.trainer_r1_d', entry('route1.trainer_r1_d')), false);
  assert.equal(canBeContact({ trainers: { 'route1.trainer_r1_a': { contact: true } } }, 'route1.trainer_r1_a', entry('route1.trainer_r1_a')), true);
  assert.equal(canBeContact({ trainers: { 'x_hall_int.helper_1': {} } }, 'x_hall_int.helper_1', { name: 'Pia' }), false);
  assert.equal(canBeContact({ trainers: {} }, 'route9.t', { name: 'Pia' }, { id: 't', contact: { offer: 'always' } }), true, 'map def.contact block');
  assert.equal(isNamedTrainer({ name: 'Young Trainer', trainer_class: 'Young Trainer' }, 'a.b'), false);
  assert.equal(isNamedTrainer({ name: 'Odette', trainer_class: 'Lab Intern' }, 'a.b'), true);
  assert.equal(rollOffer({ offer: 0.5 }, () => 0.7), false); assert.equal(rollOffer({ offer: 0.5 }, () => 0.2), true); assert.equal(rollOffer({ offer: 'always' }), true);
  // every keyed trainer exists on its map and has a battle team (Ron is starter-based)
  for (const k of Object.keys(DATA.trainers)) {
    const [m, id] = k.split('.'); const mj = J(`art/world/overworld/maps/${m}.json`);
    assert.ok((mj.npcs || []).some((d) => d.id === id), `${k} on map`);
    assert.ok(authoredTeam({ map: m, id }, [{ species: 'tumbloam', origin: { how: 'starter' } }])?.length, `${k} team`);
  }
});

test('swap offer: only after a win; yes adds the contact, no declines and asks again next time', async () => {
  const s = stub({ answers: [1] }); const c = await attach(s);
  s.talk(npc('trainer_r1_d'), { id: 'trainer_r1_d' }); // not beaten yet -> normal talk
  assert.deepEqual(s.talked, ['trainer_r1_d']);
  s.seen['defeated:route1.trainer_r1_d'] = true;
  s.talk(npc('trainer_r1_d'), { id: 'trainer_r1_d' }); await tickAll();
  assert.equal(c.book.has('route1.trainer_r1_d'), false, 'said no');
  assert.equal(s.asked.length, 1); assert.equal(s.asked[0].who, 'Odette');
  assert.ok(s.said[0].pages.join(' ').length, 'the usual after line comes first');
  assert.ok(s.said.every((x) => x.busy && x.lock), 'inside a script, save locked');
  s.talk(npc('trainer_r1_d'), { id: 'trainer_r1_d' }); await tickAll(); // asks again, default answer 0 = yes
  assert.equal(s.asked.length, 2);
  assert.equal(c.book.has('route1.trainer_r1_d'), true);
  const e = c.book.get('route1.trainer_r1_d');
  assert.equal(e.name, 'Odette'); assert.equal(e.cls, 'Lab Intern'); assert.equal(e.place, 'Trail 1');
  assert.ok(s.said.some((x) => x.who === null && /Odette was added to your Contacts/.test(x.pages.join(' '))));
  s.talk(npc('trainer_r1_d'), { id: 'trainer_r1_d' }); await tickAll(); // already a contact: no offer
  assert.equal(s.asked.length, 2);
  // generic trainers keep the normal flow even when beaten
  s.seen['defeated:route1.trainer_r1_a'] = true; s.talk(npc('trainer_r1_a'), { id: 'trainer_r1_a' });
  assert.equal(s.talked.at(-1), 'trainer_r1_a');
  // saved: the block rides in the save and loads back
  const back = new SaveStore(s.store.storage).load();
  assert.deepEqual(back.contacts.list.map((x) => x.key), ['route1.trainer_r1_d']);
});

test('contacts list: add / list / remove via the menu flow (Call + Remove), list cap', async () => {
  const s = stub(); const asks = [];
  const ui = { open: () => {}, note: (t) => asks.push(['note', t]), rerender: () => {}, hintText: () => '', stage: null, active: null,
    answers: [], ask(scr, text, choices) { asks.push([scr, text, choices]); return Promise.resolve(this.answers.shift() ?? -1); } };
  const c = await attach(s, { ui });
  for (const k of NAMED.slice(0, 3)) assert.equal(c.book.add(k, { name: entry(k).name }), true);
  assert.equal(c.book.add(NAMED[0]), false, 'no duplicates');
  assert.deepEqual(c.book.list().map((x) => x.name), ['Odette', 'Rowan', 'Dorian']);
  const scr = ui.scr_contacts(); assert.equal(scr.count(), 3);
  // Call
  ui.answers = [0, 0]; await c.menuPick(NAMED[1]);
  assert.deepEqual(asks[0][2], ['Call', 'Remove', 'Back']);
  assert.match(asks[1][1].join(' '), /^Rowan: "/);
  assert.equal(c.book.lastText(NAMED[1]).kind, 'call');
  // Remove: keep, then remove
  ui.answers = [1, 1]; await c.menuPick(NAMED[1]); assert.equal(c.book.has(NAMED[1]), true);
  ui.answers = [1, 0]; await c.menuPick(NAMED[1]); assert.equal(c.book.has(NAMED[1]), false);
  assert.ok(asks.some((a) => a[0] === 'note' && /Rowan was removed/.test(a[1])));
  assert.equal(scr.count(), 2);
  // the save guard is up while the Call / Remove modal is open
  let lockSeen = null; ui.answers = [0]; ui.ask = function (scr2, text, choices) { if (choices.length === 1) lockSeen = s.saveLockReason(); return Promise.resolve(this.answers.shift() ?? 0); };
  await c.menuPick(NAMED[0]); assert.equal(lockSeen, 'contacts_call');
  const b = new ContactBook(contactsDefault(), { max: 2, trainers: {} }); b.add('a.a'); b.add('b.b'); assert.equal(b.add('c.c'), false); assert.equal(b.full(), true);
});

test('pings: rate limited (steps, game minutes, per-day cap), never from the current map', async () => {
  const p = contactsDefault().ping, cfg = DATA.ping;
  assert.equal(pingWait(p, cfg, { gameMin: 0, day: 0 }), 'steps');
  p.steps = cfg.minSteps; assert.equal(pingWait(p, cfg, { gameMin: 0, day: 0 }), null);
  notePing(p, { gameMin: 600, day: 0 }); assert.equal(p.steps, 0); assert.equal(p.today, 1);
  p.steps = 999; assert.equal(pingWait(p, cfg, { gameMin: 600 + cfg.minGameMinutes - 1, day: 0 }), 'minutes');
  p.today = cfg.maxPerDay; assert.equal(pingWait(p, cfg, { gameMin: 9999, day: 0 }), 'day_cap');
  assert.equal(pingWait(p, cfg, { gameMin: 9999, day: 1 }), null, 'new day resets the cap');
  // live: rng 0 = every roll passes; pings still need minSteps steps between them
  const s = stub({ map: 'fernwick' }); const c = await attach(s);
  c.book.add('route1.trainer_r1_d', { name: 'Odette' }); c.book.add('fernwick.trainer_fw_a', { name: 'Sabine' });
  c.onStep(); s.tick = 1e9; for (let i = 0; i < 5; i++) { s.player.x++; c.onStep(); } c.state.ping.steps = 0; // settled on this map
  const pings = [];
  for (let i = 0; i < 2000; i++) {
    s.player.x += i % 2 ? -1 : 1; s.clock.min += 1; if (s.clock.min >= 1440) { s.clock.min -= 1440; s.clock.day++; }
    const r = c.onStep(); if (r) pings.push({ i, ...r, day: s.clock.day }); await tickAll();
    if (s.dialog.active) s.dialog.active = false;
  }
  assert.ok(pings.length >= 2, 'some pings');
  for (let k = 1; k < pings.length; k++) assert.ok(pings[k].i - pings[k - 1].i >= DATA.ping.minSteps, 'min steps apart');
  const perDay = {}; for (const x of pings) perDay[x.day] = (perDay[x.day] || 0) + 1;
  assert.ok(Object.values(perDay).every((n) => n <= DATA.ping.maxPerDay), JSON.stringify(perDay));
  assert.ok(pings.every((x) => x.key === 'route1.trainer_r1_d'), 'Sabine is on this map: never pings here');
  assert.equal(pickPing({ list: [{ key: 'fernwick.trainer_fw_a' }], ready: {}, declined: {} }, DATA, { map: 'fernwick', gameMin: 0 }), null);
  // rematch ping -> ready; while ready a contact only sends tips
  c.forcePing('rematch', 'route1.trainer_r1_d'); await tickAll();
  assert.ok(c.book.isReady('route1.trainer_r1_d'));
  assert.equal(pickPing(c.state, DATA, { map: 'fernwick', gameMin: 0, rng: () => 0.99 }).kind, 'tip');
  assert.ok(s.said.some((x) => x.who === null && /Odette/.test(x.pages.join(' '))), 'system ping line names the trainer');
  // Ron: tips only, never rematches
  for (let i = 0; i < 20; i++) assert.equal(pickPing({ list: [{ key: 'fernwick.ron_rival_1' }], ready: {}, declined: {} }, DATA, { map: 'route1', gameMin: 0, rng: () => i / 20 })?.kind, 'tip');
});

test('pings: never during battles, dialogue, scripts, cutscenes, menus, fades, or right after a map change', async () => {
  const s = stub({ map: 'fernwick' }); const ui = { open: () => {}, active: null, modal: null };
  const c = await attach(s, { ui }); c.book.add('route1.trainer_r1_d', { name: 'Odette' });
  c.state.ping.steps = 10000; s.tick = 10000;
  s.step({}); // first step on this map -> settle window starts
  const cases = [
    ['battle (save guard)', () => { s.saveGuards.push(() => 'battle'); }, () => { s.saveGuards.pop(); }],
    ['dialogue', () => { s.dialog.active = true; }, () => { s.dialog.active = false; }],
    ['script / cutscene', () => { s.busy = true; }, () => { s.busy = false; }],
    ['player locked (forced walk)', () => { s.player.locked = true; }, () => { s.player.locked = false; }],
    ['fade (map transition)', () => { s.fade = { t: 0 }; }, () => { s.fade = null; }],
    ['menu open', () => { ui.active = { scr: 'team' }; }, () => { ui.active = null; }],
    ['save lock', () => { s._saveLocks.set('evolution', 1); }, () => { s._saveLocks.delete('evolution'); }],
  ];
  s.tick = 0; // still settling after the map change
  for (let i = 0; i < 10; i++) { s.player.x++; assert.equal(c.onStep(), null, 'settling'); }
  assert.equal(c.blockReason(), 'settling');
  s.tick = 99999;
  for (const [name, on, off] of cases) {
    on();
    for (let i = 0; i < 20; i++) { s.player.x++; assert.equal(c.onStep(), null, name); }
    assert.ok(c.blockReason(), name);
    off();
  }
  s.player.x++; assert.ok(c.onStep(), 'fires once nothing blocks it'); await tickAll();
  // map change resets the settle window
  s.map = { name: 'route1', npcs: [] }; s.tick = 100000; s.player.x++; assert.equal(c.onStep(), null);
  assert.equal(c.blockReason(), 'settling');
});

test('rematch: ready contact waits at their spot (marker), team scales with progress, capped by the region cap; normal XP path', async () => {
  // scaling maths
  const base = authoredTeam({ map: 'route1', id: 'trainer_r1_f' });
  assert.deepEqual(rematchTeam(base, { wins: 0, playerTop: 5, step: 2, cap: 11 }).map((f) => f.level), [9, 10]);
  assert.deepEqual(rematchTeam(base, { wins: 0, playerTop: 11, step: 2, cap: 11 }).map((f) => f.level), [9, 10], 'top foe one below the player');
  assert.deepEqual(rematchTeam(base, { wins: 1, playerTop: 5, step: 2, cap: 11 }).map((f) => f.level), [11, 11], 'more wins lift more, capped');
  assert.deepEqual(rematchTeam(base, { wins: 5, playerTop: 40, step: 2, cap: 11 }).map((f) => f.level), [11, 11]);
  assert.deepEqual(rematchTeam([{ species: 'x', level: 14 }], { wins: 3, cap: 11 }).map((f) => f.level), [14], 'never below the base team');
  // region cap from data matches region 1 (region_pulls + Master 1)
  const reg = regionOf(DATA, 'route1'); const pulls = J('data/region_pulls.json'); const r1 = (pulls.regions || pulls).find((r) => r.id === 1);
  const masters = J('data/masters.json'); const m1 = masters.halls.find((h) => h.zone === 'fernwick').master;
  assert.ok(reg.cap < m1.ace_level, 'below the Master ace'); assert.ok(reg.cap <= r1.band.trainer[1]);
  for (const m of r1.maps) assert.ok(reg.maps.includes(m), `region 1 map ${m} capped`);
  for (const k of Object.keys(DATA.trainers)) assert.ok(regionOf(DATA, k.split('.')[0]), `${k} has a region cap`);
  // live: ready -> marker -> talk -> ask -> battle with injected foes -> win
  const s = stub({ map: 'route1', party: [{ species: 'tumbloam', level: 30 }] }); const opened = [];
  const ui = { open: (id, arg) => opened.push([id, arg]), active: null };
  const c = await attach(s, { ui });
  s.hooks.onBattle = async (who) => { ui.open('battle', { trainer: true, who }); return true; };
  c.book.add('route1.trainer_r1_f', { name: 'Dorian' }); s.seen['defeated:route1.trainer_r1_f'] = true;
  c.book.setReady('route1.trainer_r1_f', 0);
  const def = s.map.npcs.find((d) => d.id === 'trainer_r1_f');
  assert.deepEqual(s.markerSpots().map((m) => [m.x, m.y]), [[def.x, def.y]]);
  s.talk(npc('trainer_r1_f'), { id: 'trainer_r1_f' }); await tickAll(); await tickAll();
  const [id, arg] = opened[0];
  assert.equal(id, 'battle'); assert.equal(arg.trainer, true, 'trainer battle: normal XP + prize path');
  assert.equal(arg.who.id, 'trainer_r1_f~rematch'); assert.equal(arg.foeName, 'Dorian');
  assert.ok(arg.foes.every((f) => f.level <= reg.cap), JSON.stringify(arg.foes));
  assert.deepEqual(arg.foes.map((f) => f.level), [11, 11], 'player L30 -> capped at 11');
  assert.equal(c.book.isReady('route1.trainer_r1_f'), false); assert.equal(c.book.wins('route1.trainer_r1_f'), 1);
  assert.equal(s.systems.wins.length, 1, 'prize money hook (same as a first win)');
  assert.deepEqual(s.markerSpots(), [], 'marker gone');
  // gift every 2nd rematch win (Dorian), loss keeps them ready
  c.book.setReady('route1.trainer_r1_f'); s.talk(npc('trainer_r1_f'), { id: 'trainer_r1_f' }); await tickAll(); await tickAll();
  assert.equal(s.systems.bag.items.tonic_small, 1);
  s.hooks.onBattle = async () => false; c.book.setReady('route1.trainer_r1_f');
  s.talk(npc('trainer_r1_f'), { id: 'trainer_r1_f' }); await tickAll(); await tickAll();
  assert.equal(c.book.isReady('route1.trainer_r1_f'), true); assert.equal(s.systems.losses.length, 1);
  // Ron never gets a ready flag
  c.book.add('fernwick.ron_rival_1', { name: 'Ron' }); c.book.setReady('fernwick.ron_rival_1'); assert.equal(c.book.isReady('fernwick.ron_rival_1'), false);
  // XP rules untouched by this feature
  const src = fs.readFileSync(new URL('../src/systems/contacts.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /xpDivisor|xpTrainerMult/);
});

test('save: flag off is unchanged (no version bump, no block); the optional contacts block migrates, sanitises and round-trips', () => {
  assert.equal(SAVE_VERSION, 2, 'save file version not bumped by contacts');
  assert.ok(!V2_BLOCKS.includes('contacts')); assert.ok(!('contacts' in freshSave()), 'new games have no block');
  // flag off: a v1 / v2 save loads and saves with no contacts key at all
  const v2 = { v: 2, flags: ['got_starter'], party: [{ species: 'tumbloam', uid: 'a' }], saveId: 'kx', coins: 5 };
  assert.ok(!('contacts' in normalise(v2))); assert.ok(!('contacts' in normalise({ v: 1, flags: [] })));
  const st = memStorage(); st.setItem(SAVE_KEY, JSON.stringify(v2));
  const store = new SaveStore(st); const loaded = store.load(); assert.ok(loaded, store.lastError);
  assert.ok(store.save({ flags: loaded.flags })); assert.ok(!('contacts' in JSON.parse(st.getItem(SAVE_KEY))));
  // block migration: pre-release block without `v` -> v1; newer block -> clean default (rest of the save still loads)
  assert.equal(contactsDefault().v, CONTACTS_V);
  const old = normaliseContacts({ list: ['route1.trainer_r1_d'] }); assert.equal(old.v, CONTACTS_V); assert.equal(old.list[0].key, 'route1.trainer_r1_d');
  assert.deepEqual(normaliseContacts({ v: CONTACTS_V + 1, list: ['a.b'] }), contactsDefault());
  // junk shapes
  const n = normalise({ v: 2, flags: [], contacts: { v: 1, list: ['a.b', { key: 'a.b' }, { nope: 1 }, 7, { key: 'c.d', name: 'X', at: 'z' }], ready: { 'a.b': 5, bad: 'x' }, log: 'no', ping: { steps: 'many' } } });
  assert.deepEqual(n.contacts.list.map((x) => x.key), ['a.b', 'c.d']); assert.equal(n.contacts.list[1].at, 0);
  assert.deepEqual(n.contacts.ready, { 'a.b': 5 }); assert.deepEqual(n.contacts.log, []); assert.equal(n.contacts.ping.steps, 0);
  assert.deepEqual(normaliseContacts(null), contactsDefault()); assert.deepEqual(normalise({ v: 2, flags: [], contacts: [] }).contacts, contactsDefault());
  // a stored phone book is carried through flag-off saves untouched (and survives the backup copy)
  const st2 = memStorage(); const keep = { ...contactsDefault(), list: [{ key: 'route1.trainer_r1_d', name: 'Odette', cls: null, place: null, at: 0 }] };
  st2.setItem(SAVE_KEY, JSON.stringify({ v: 2, flags: [], contacts: keep }));
  const s2 = new SaveStore(st2); s2.load(); assert.ok(s2.save({ flags: ['x'] }));
  assert.deepEqual(JSON.parse(st2.getItem(SAVE_KEY)).contacts, keep);
  assert.deepEqual(new SaveStore(st2).load().contacts, keep);
});

test('save timing: pings and swap run in scene.script (checkpoint before, save after); nothing saves mid-dialogue', async () => {
  const s = stub({ map: 'fernwick' }); const c = await attach(s);
  c.book.add('route1.trainer_r1_d', { name: 'Odette' });
  const before = s.saves; c.forcePing('rematch', 'route1.trainer_r1_d', true); await tickAll(); await tickAll();
  assert.equal(s.saves - before, 2, 'checkpoint + after');
  assert.ok(s.said.length && s.said.every((x) => x.lock === 'script'));
  const saved = JSON.parse(s.store.storage.getItem(SAVE_KEY));
  assert.ok('route1.trainer_r1_d' in saved.contacts.ready); assert.equal(saved.contacts.ping.n, 1);
  assert.equal(saved.contacts.log.at(-1).kind, 'rematch');
});

test('text: Text Bot keys first, then the existing keys, then placeholders; no banned words; request file lists every key', () => {
  const lines = { system_contacts: { trainers: { route1: { trainer_r1_d: { call: [['A {trainer}']] } } }, generic: { call: [['G {trainer}']] } }, system_phone: { ping: { pages: ['L {trainer}'] } } };
  assert.equal(contactText(lines, 'route1.trainer_r1_d', 'call', { trainer: 'O' }).text, 'A O');
  assert.equal(contactText(lines, 'route1.trainer_r1_e', 'call', { trainer: 'R' }).text, 'G R');
  assert.equal(contactText(lines, 'route1.trainer_r1_e', 'ping', { trainer: 'R' }).text, 'L R');
  assert.equal(contactText({}, 'route1.trainer_r1_e', 'removed', { trainer: 'R' }).src, 'placeholder');
  const sw = contactText(LINES, 'route1.trainer_r1_d', 'swap_offer'); assert.equal(sw.choices.length, 2);
  const walkStr = (o, f) => (typeof o === 'string' ? f(o) : o && typeof o === 'object' ? Object.values(o).forEach((v) => walkStr(v, f)) : null);
  walkStr(PH, (t) => assert.doesNotMatch(t, BANNED, t));
  walkStr(DATA, (t) => assert.doesNotMatch(t.replace(/route1\w*/g, ''), /pok[eé]|\bPP\b|shiny|super effective|gotcha/i, t));
  // tip uses a real, non-placeholder rare slot from the wired table
  const rs = rareSlot(ENC, 'route1', 'dawn'); assert.ok(rs?.species); assert.notEqual(ENC.zones[rs.zone].slots.find((x) => x.species === rs.species).placeholder, true);
  const req = fs.readFileSync(new URL('../data/textbot_requests_contacts.md', import.meta.url), 'utf8');
  for (const f of Object.keys(PH)) assert.ok(req.includes('`' + f + '`'), `request lists ${f}`);
  for (const k of NAMED) assert.ok(req.includes(k.replace('.', '.')), `request covers ${k}`);
  assert.doesNotMatch(fs.readFileSync(new URL('../text/overworld_lines.json', import.meta.url), 'utf8'), /"system_contacts"\s*:\s*\{[^}]*"_coder/, 'JSON not hand-edited by Coder');
});
