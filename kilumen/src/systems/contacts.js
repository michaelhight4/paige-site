// Kilumen: Contacts (phone book) v1. DEFAULT ON since Gary's 12:42 PM CT ok (ship in region 1); ?contacts=0 turns off (Coder, Oct 23 2026).
// Gary, Oct 23 2026 12:24 PM CT: a contact system for named trainers (verbatim quote in quality/dev_notes/kilumen.md).
// Structure only (numbers swapped after a win, a contact list you can call / remove from, occasional incoming texts
// that are either a rematch offer or a tip). No names, data, art or text from the reference game.
//
// - Who: only trainers with a block in src/systems/data/contacts.json (or def.contact on the map NPC) AND a personal
//   name (not a generic class name), never hall helpers / Masters, unless the block says contact: true.
// - Swap offer: talk to a contact-capable trainer you already beat -> their usual `after` line, then the offer (yes / no).
// - Contacts screen (phone > Contacts): pick a contact -> Call (they reply) / Remove (confirm) / Back.
// - Pings: on a fresh tile step only, never during battles / dialogue / scripts / cutscenes / menus / fades, not right
//   after a map change; steps + game minutes since the last one, per-step chance, max per in-game day; contacts on
//   the current map never ping. A ping is a rematch offer (trainer waits at their usual spot, gold marker) or a tip.
// - Rematch: same trainer, same spot; team levels lift with wins and with the player's top level, capped by the
//   trainer's region cap. Normal XP / prize money (trainer:true battle, unchanged rules).
// - Save: block `contacts` (save v3; v2 saves migrate to the empty default). Every interaction runs in scene.script,
//   which checkpoints before it starts and saves after it ends; the Call / Remove modals add a save guard.
// - Text: Text Bot keys under system_contacts.* (data/textbot_requests_contacts.md); existing system_trainers /
//   system_phone keys next; then the placeholders below (PH, plain sentences).
// Pure logic first (node-testable), then attachContacts(scene, opts) for the browser.
import { authoredTeam } from '../battle/data/trainer_teams.js?v=v0.2.46-alpha';
import { areaName } from '../overworld/area_sign.js?v=v0.2.46-alpha';
import { contactsDefault, normaliseContacts } from './contacts_save.js?v=v0.2.46-alpha';

export const CONTACTS_DATA_URL = 'src/systems/data/contacts.json';
export const contactsEnabled = (query) => !!query && typeof query.get === 'function' && query.get('contacts') !== '0';

export { contactsDefault, normaliseContacts }; // save block shape lives in contacts_save.js (save.js imports it without the runtime)
const DAY_MIN = 24 * 60;

// ---- who can be a contact --------------------------------------------------------------------------------------------
const GENERIC_NAME = /\b(trainer|helper|hopeful|recruit|guard|clerk|nurse|staff)\b$/i;
export const isHallNpc = (key) => { const [map, id] = String(key).split('.'); return /_hall_int$/.test(map || '') || /^(helper_|master_)/.test(id || ''); };
export const isRon = (key) => /^ron(_|$)/.test(String(key).split('.')[1] || '');
/** A personal name (Odette), not a class used as a name (Young Trainer) or a missing name. */
export function isNamedTrainer(entry, key) {
  if (isRon(key)) return true;
  const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
  if (!name) return false;
  if (entry.trainer_class && name.toLowerCase() === String(entry.trainer_class).trim().toLowerCase()) return false;
  return !GENERIC_NAME.test(name);
}
export function contactBlock(data, key, def = null) {
  const own = def?.contact && typeof def.contact === 'object' ? def.contact : null;
  return own || data?.trainers?.[key] || null;
}
/** -> true when this trainer may become a contact. */
export function canBeContact(data, key, entry, def = null) {
  const b = contactBlock(data, key, def) || (def?.contact === true ? { contact: true } : null);
  if (!b) return false;
  if (b.contact === true) return true;
  if (b.contact === false || isHallNpc(key)) return false;
  return isNamedTrainer(entry, key);
}
/** Offer roll: 'always' | number (0..1 chance per talk) | missing = always. */
export function rollOffer(block, rng = Math.random) {
  const o = block?.offer;
  if (o === 'never' || o === false) return false;
  if (typeof o === 'number') return rng() < o;
  return true;
}

// ---- region cap + rematch scaling ---------------------------------------------------------------------------------
export function regionOf(data, map) {
  for (const [id, r] of Object.entries(data?.regions || {})) if ((r.maps || []).includes(map)) return { id, ...r };
  return null;
}
/** base: [{species, level}], -> new team. lift = max(step x (wins + 1), playerTop - 1 - baseTop); each level clamped to [base, cap]. */
export function rematchTeam(base, { wins = 0, playerTop = 0, step = 2, cap = null } = {}) {
  const team = (base || []).filter((f) => f && f.species).map((f) => ({ ...f, level: Math.max(1, f.level | 0) }));
  if (!team.length) return team;
  const top = Math.max(...team.map((f) => f.level));
  const lift = Math.max(step * (wins + 1), (playerTop | 0) - 1 - top, 0);
  const hi = Number.isFinite(cap) ? cap : Infinity;
  return team.map((f) => ({ ...f, level: Math.max(f.level, Math.min(f.level + lift, hi)) }));
}

// ---- tips: the rarest slot on a map's grass table (encounters_wired.json) ---------------------------------------------
export function rareSlot(enc, map, phase = null) {
  const zones = enc?.zones || {};
  const zid = Object.keys(zones).find((k) => (zones[k].maps || []).includes(map) && !/^water/.test(zones[k].method || ''));
  if (!zid) return null;
  const slots = (zones[zid].slots || []).filter((s) => s.species && s.weight > 0 && !s.placeholder && !s.weather && !s.flood);
  if (!slots.length) return null;
  const min = Math.min(...slots.map((s) => s.weight));
  const rare = slots.filter((s) => s.weight === min);
  const now = phase ? rare.filter((s) => !s.time || s.time.includes(phase)) : [];
  const s = (now.length ? now : rare)[0];
  return { zone: zid, species: s.species, time: s.time || null };
}

// ---- ping scheduling (pure) ---------------------------------------------------------------------------------------
/** p = state.ping, cfg = data.ping, now = {gameMin (absolute), day}. -> null (may roll) | reason string. */
export function pingWait(p, cfg, now) {
  const c = { minSteps: 120, minGameMinutes: 360, maxPerDay: 3, ...(cfg || {}) };
  if (p.day === now.day && p.today >= c.maxPerDay) return 'day_cap';
  if (p.steps < c.minSteps) return 'steps';
  if (p.lastAt >= 0 && now.gameMin - p.lastAt < c.minGameMinutes) return 'minutes';
  return null;
}
export function notePing(p, now) {
  if (p.day !== now.day) { p.day = now.day; p.today = 0; }
  p.today++; p.n++; p.steps = 0; p.lastAt = now.gameMin;
}
/** Which contact pings and how. -> {key, kind: 'rematch'|'tip'} | null. Contacts on `map` are skipped. */
export function pickPing(state, data, { map, gameMin, rng = Math.random } = {}) {
  const cfg = { rematchCooldownGameMinutes: DAY_MIN, tipShare: 0.35, ...(data?.ping || {}) };
  const pool = state.list.map((c) => c.key).filter((k) => k.split('.')[0] !== map && contactBlock(data, k));
  if (!pool.length) return null;
  const key = pool[Math.floor(rng() * pool.length) % pool.length];
  const b = contactBlock(data, key);
  const canRematch = !!b.rematch && !(key in state.ready)
    && !(Number.isFinite(state.declined['rematch:' + key]) && gameMin - state.declined['rematch:' + key] < cfg.rematchCooldownGameMinutes);
  const canTip = (b.tips || []).length > 0;
  if (canRematch && (!canTip || rng() >= cfg.tipShare)) return { key, kind: 'rematch' };
  if (canTip) return { key, kind: 'tip' };
  return null;
}

// ---- text ---------------------------------------------------------------------------------------------------------
const get = (o, path) => String(path).split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const fill = (t, vars) => String(t).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
/** Older keys that already cover a field (Text Bot, SP 1.11 / G4). */
export const LEGACY = {
  swap_offer: 'system_trainers.contact_ask', added: 'system_trainers.contact_added', rematch_ask: 'system_trainers.rematch_ask',
  ping: 'system_phone.ping', rematch_text: 'system_phone.rematch_text', title: 'system_phone.menu.labels.contacts',
};
/** Placeholders (PH, Coder). Neutral, no banned words; Text Bot replaces them via system_contacts.*. */
export const PH = {
  swap_offer: { pages: ['Want to swap numbers? I can text you when I want a rematch.'], choices: ['Yes', 'No'] },
  swap_yes: ['Great. I will be in touch.'],
  added: ['{trainer} was added to your Contacts.'],
  swap_no: ['No problem. Ask me again some time.'],
  full: ['Your Contacts list is full.'],
  call: [['{trainer}: "Hey, {player}. Still training hard out here."'], ['{trainer}: "Good timing. I was just thinking about our battle."']],
  call_ready: ['{trainer}: "I am waiting at my usual spot. Come and find me!"'],
  ping: ['Your phone buzzes. A text from {trainer}.'],
  rematch_text: ['{trainer}: "I have been training. Same spot as before?"'],
  tip_text: ['{trainer}: "Heard a rare {species} shows up on {place}{time}. Worth a look!"'],
  rematch_ask: { pages: ['Ready for our rematch?'], choices: ['Yes', 'Not now'] },
  rematch_not_now: ['Okay. I will be right here.'],
  rematch_beaten: ['You beat me again. I will keep training.'],
  rematch_won: ['That one was mine! Come back any time.'],
  gift: ['Here, take this. It helps on long walks.'],
  gift_received: ['You got {item}.'],
  remove_confirm: { pages: ['Remove {trainer} from your Contacts?'], choices: ['Remove', 'Keep'] },
  removed: ['{trainer} was removed from your Contacts.'],
  title: 'Contacts', call_label: 'Call', remove_label: 'Remove', back_label: 'Back', ok_label: 'OK',
  ready_chip: 'Rematch', empty: 'No contacts yet. Swap numbers with trainers you beat.', last_text: 'Last text', no_text: 'No texts yet.',
  where: 'Usually at', time_dawn: ' at dawn', time_day: ' by day', time_dusk: ' at dusk', time_night: ' at night',
};

/**
 * Text lookup: system_contacts.trainers.<map>.<id>.<field> -> system_contacts.generic.<field> -> LEGACY -> PH.
 * Pages fields return {pages, choices?, src}; string fields return {text, src}. Variant pools (array of arrays) pick one.
 */
export function contactText(lines, key, field, vars = {}, rng = Math.random) {
  const [map, id] = String(key || '').split('.');
  const cands = [[`system_contacts.trainers.${map}.${id}.${field}`, 'trainer'], [`system_contacts.generic.${field}`, 'generic']];
  if (LEGACY[field]) cands.push([LEGACY[field], 'legacy']);
  let v = null, src = 'placeholder';
  for (const [p, s] of cands) { const x = map || s !== 'trainer' ? get(lines, p) : null; if (x != null) { v = x; src = s; break; } }
  if (v == null) v = PH[field];
  if (v == null) return { pages: [], text: '', src: 'missing' };
  if (typeof v === 'string') return { text: fill(v, vars), pages: [fill(v, vars)], src };
  let pages = Array.isArray(v) ? v : v.pages || v.variants || [];
  if (!Array.isArray(v) && Array.isArray(v.variants_pool) && v.variants_pool.length) { const pool = (pages.length ? [pages] : []).concat(v.variants_pool); pages = pool[Math.floor(rng() * pool.length) % pool.length]; } // Text Bot call format {pages, variants_pool}
  if (pages.length && Array.isArray(pages[0])) pages = pages[Math.floor(rng() * pages.length) % pages.length];
  const out = { pages: pages.map((t) => fill(t, vars)), src };
  if (!Array.isArray(v) && Array.isArray(v.choices)) out.choices = v.choices.map((t) => fill(t, vars));
  out.text = out.pages.join(' ');
  return out;
}

// ---- the book ---------------------------------------------------------------------------------------------------------
export class ContactBook {
  constructor(state, data) { this.state = state; this.data = data || {}; }
  get max() { return this.data.max || 20; }
  has(key) { return this.state.list.some((c) => c.key === key); }
  get(key) { return this.state.list.find((c) => c.key === key) || null; }
  list() { return this.state.list.slice(); }
  full() { return this.state.list.length >= this.max; }
  add(key, meta = {}) {
    if (this.has(key) || this.full()) return false;
    this.state.list.push({ key, name: meta.name || null, cls: meta.cls || null, place: meta.place || null, at: meta.at || 0 });
    delete this.state.declined[key];
    return true;
  }
  remove(key) {
    const n = this.state.list.length;
    this.state.list = this.state.list.filter((c) => c.key !== key);
    delete this.state.ready[key];
    return this.state.list.length < n;
  }
  decline(key, at = 0) { this.state.declined[key] = at; }
  isReady(key) { return key in this.state.ready; }
  setReady(key, at = 0) { if (this.has(key) && contactBlock(this.data, key)?.rematch) this.state.ready[key] = at; }
  rematchDone(key) { delete this.state.ready[key]; this.state.wins[key] = (this.state.wins[key] || 0) + 1; return this.state.wins[key]; }
  wins(key) { return this.state.wins[key] || 0; }
  note(key, kind, text, at = 0) {
    this.state.log.push({ key, kind, text, at });
    const max = this.data.ping?.logMax || 20;
    if (this.state.log.length > max) this.state.log.splice(0, this.state.log.length - max);
  }
  lastText(key) { for (let i = this.state.log.length - 1; i >= 0; i--) if (this.state.log[i].key === key) return this.state.log[i]; return null; }
}

// ---- runtime (browser; also driven by tests with a fake scene) ----------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Wire contacts into a live scene. opts: { query, data, encounters, ui: () => GameUI | GameUI, rng, speciesName, areaName }.
 * Returns the API (window.kilumen.contacts) or null when the flag is off and no data was passed.
 */
export async function attachContacts(scene, opts = {}) {
  if (!opts.data && !contactsEnabled(opts.query)) return null;
  const rng = opts.rng || Math.random;
  const fetchJson = async (u) => { try { const r = await fetch(u); return r.ok ? await r.json() : null; } catch { return null; } };
  const data = opts.data || await fetchJson(CONTACTS_DATA_URL) || { trainers: {} };
  const enc = opts.encounters !== undefined ? opts.encounters : await fetchJson('data/encounters_wired.json');
  const store = scene.store?.extra;
  const state = normaliseContacts(store?.contacts);
  if (store) store.contacts = state;
  const book = new ContactBook(state, data);
  const cfg = { minSteps: 120, minGameMinutes: 360, chancePerStep: 0.05, maxPerDay: 3, settleTicks: 240, settleSteps: 4, ...(data.ping || {}) };
  const getUi = () => (typeof opts.ui === 'function' ? opts.ui() : opts.ui) || null;
  const missing = new Set();
  const T = (key, field, vars = {}) => {
    const t = contactText(scene.lines, key, field, { player: scene.config?.playerName || 'Cal', ...vars }, rng);
    if (t.src === 'placeholder' || t.src === 'missing') missing.add(`system_contacts.*.${field}`);
    return t;
  };
  const speciesName = opts.speciesName || ((id) => (id ? id[0].toUpperCase() + id.slice(1) : '?'));
  const gameMin = () => (scene.clock?.day || 0) * DAY_MIN + (scene.clock?.min || 0);
  const now = () => ({ gameMin: gameMin(), day: scene.clock?.day || 0 });
  // place names: the area sign's own rule (Text Bot line, else the map title); titles of the maps in the data are preloaded
  const titles = {};
  const titleFrom = (name, json) => areaName({ name, json }, (k) => scene.text?.(k) ?? null).title;
  if (!opts.areaName && typeof scene.mapUrl === 'function') {
    const maps = new Set(Object.keys(data.trainers || {}).map((k) => k.split('.')[0]));
    for (const b of Object.values(data.trainers || {})) for (const t of b.tips || []) if (t.map) maps.add(t.map);
    await Promise.all([...maps].map(async (m) => { const j = await fetchJson(scene.mapUrl(m)); if (j) titles[m] = titleFrom(m, j); }));
  }
  const placeOf = (map) => {
    if (opts.areaName) return opts.areaName(map);
    if (titles[map]) return titles[map];
    if (scene.map?.name === map) return titleFrom(map, scene.map?.json || { title: scene.map?.title });
    return null;
  };
  const metaFor = (key, entry) => ({ name: entry?.name || (isRon(key) ? 'Ron' : key.split('.')[1]), cls: entry?.trainer_class || null, place: placeOf(key.split('.')[0]), at: gameMin() });
  const nameOf = (key) => book.get(key)?.name || (isRon(key) ? 'Ron' : key.split('.')[1]);

  // save: the block rides in saveData (and store.extra), so flag-off saves keep whatever was stored untouched
  if (typeof scene.saveData === 'function') { const sd = scene.saveData.bind(scene); scene.saveData = (...a) => ({ ...sd(...a), contacts: state }); }
  let modalOpen = null;
  (scene.saveGuards ||= []).push(() => (modalOpen ? `contacts_${modalOpen}` : null));

  // ---- talk: swap offer + rematch ----------------------------------------------------------------------------------
  let pendingFoes = null;
  const sys = (pages) => scene.say(pages, { name: null, portrait: null, battle: null });
  const runRematch = async (n, def, map, key, e, sp) => {
    const party = scene.systems?.party?.list || scene.party || [];
    const base = authoredTeam({ map, id: def.id }, party) || [];
    const reg = regionOf(data, map), b = contactBlock(data, key, def) || {};
    const playerTop = Math.max(0, ...party.map((c) => c.level || 0));
    const foes = rematchTeam(base, { wins: book.wins(key), playerTop, step: b.rematch?.step ?? 2, cap: reg?.cap ?? null });
    if (!foes.length) return false;
    pendingFoes = { foes, foeName: nameOf(key) };
    let won = true;
    try { won = scene.hooks?.onBattle ? await scene.hooks.onBattle({ map, id: `${def.id}~rematch`, rematch: def.id }) : true; } finally { pendingFoes = null; }
    scene.log?.push({ tick: scene.tick, type: 'battle', npc: def.id, won, rematch: true, levels: foes.map((f) => f.level) });
    if (won !== false) {
      const w = book.rematchDone(key);
      await scene.say(T(key, 'rematch_beaten').pages, sp);
      await scene.systems?.onTrainerWin?.({ map, def, speaker: sp });
      const g = b.gift;
      if (g?.item && w % (g.everyWins || 1) === 0 && scene.systems?.bag?.add) {
        scene.systems.bag.add(g.item, g.n || 1);
        await scene.say(T(key, 'gift').pages, sp);
        await sys(T(key, 'gift_received', { item: opts.itemName?.(g.item) || g.item }).pages);
      }
    } else {
      await scene.say(T(key, 'rematch_won').pages, sp);
      await scene.systems?.onTrainerLoss?.({ map, def });
    }
    return true;
  };
  const contactTalk = async (n, def, map, key, e) => {
    const sp = scene.speakerFor ? scene.speakerFor(n) : { name: nameOf(key) };
    const b = contactBlock(data, key, def) || {};
    if (book.has(key) && book.isReady(key) && b.rematch) {
      const a = T(key, 'rematch_ask', { trainer: sp?.name || nameOf(key) });
      const yes = (await scene.ask(a.pages, a.choices || PH.rematch_ask.choices, sp)) === 0;
      if (yes) { await runRematch(n, def, map, key, e, sp); return; }
      state.declined['rematch:' + key] = gameMin();
      await scene.say(T(key, 'rematch_not_now').pages, sp);
      return;
    }
    await scene.say(e.after || scene.pick?.(e, `maps.${map}.${def.id}`)?.pages, sp);
    if (book.has(key) || !rollOffer(b, rng)) return;
    if (book.full()) { await sys(T(key, 'full').pages); return; }
    const o = T(key, 'swap_offer', { trainer: sp?.name || nameOf(key) });
    const yes = (await scene.ask(o.pages, o.choices || PH.swap_offer.choices, sp)) === 0;
    if (!yes) { book.decline(key, gameMin()); await scene.say(T(key, 'swap_no').pages, sp); return; }
    book.add(key, metaFor(key, e));
    scene.log?.push({ tick: scene.tick, type: 'contactAdded', npc: def.id });
    await scene.say(T(key, 'swap_yes').pages, sp);
    scene.audio?.sfx?.('select');
    await sys(T(key, 'added', { trainer: nameOf(key) }).pages);
  };
  const talk = scene.talk.bind(scene);
  scene.talk = (n, def) => {
    const map = scene.map?.name, key = `${map}.${def?.id}`;
    const e = def && map && scene._entryFor ? scene._entryFor(map, def) : null;
    if (!e?.battle_lost || !scene.seen?.[`defeated:${key}`] || !canBeContact(data, key, e, def)) return talk(n, def);
    if (!(scene.systems?.party?.list || scene.party || []).length) return talk(n, def);
    scene.log?.push({ tick: scene.tick, type: 'talk', npc: def.id, contacts: true });
    scene.script(async () => {
      if (n) scene.npcs?.beginTalk?.(n);
      try { await contactTalk(n, def, map, key, e); } finally { if (n) scene.npcs?.endTalk?.(n); }
    });
  };

  // ---- pings -------------------------------------------------------------------------------------------------------
  const watch = { map: null, settleAt: 0, stepsOnMap: 0, x: null, y: null, delivering: false };
  const blockReason = () => {
    const ui = getUi();
    if (!state.list.length) return 'no_contacts';
    if (watch.delivering) return 'delivering';
    if (scene.saveLockReason?.()) return 'save_lock:' + scene.saveLockReason();
    if (scene.busy) return 'script';
    if (scene.dialog?.active) return 'dialogue';
    if (scene.fade) return 'fade';
    if (scene.player?.locked) return 'locked';
    if (scene.intro?.picker?.active) return 'starter_pick';
    if (ui?.active || ui?.modal) return 'menu';
    if (scene.companyVoice?.current || globalThis.window?.kilumen?.companyVoice?.current) return 'company_voice';
    if ((scene.tick || 0) < watch.settleAt || watch.stepsOnMap < cfg.settleSteps) return 'settling';
    return null;
  };
  const deliver = (pick) => {
    const key = pick.key, trainer = nameOf(key);
    let msg;
    if (pick.kind === 'rematch') msg = T(key, 'rematch_text', { trainer });
    else {
      const tip = (contactBlock(data, key)?.tips || [])[0] || {};
      const rs = rareSlot(enc, tip.map || key.split('.')[0], scene.phase || null);
      const time = rs?.time?.length === 1 ? (PH['time_' + rs.time[0]] || '') : '';
      msg = rs ? T(key, 'tip_text', { trainer, species: speciesName(rs.species), place: placeOf(tip.map) || 'the Trail', time })
        : T(key, 'call', { trainer });
    }
    scene.log?.push({ tick: scene.tick, type: 'contactPing', npc: key, kind: pick.kind });
    scene.script(async () => {
      watch.delivering = true;
      try {
        notePing(state.ping, now()); // after script()'s checkpoint: the pre-ping state is on disk, the end-of-script save has this
        if (pick.kind === 'rematch') book.setReady(key, gameMin());
        book.note(key, pick.kind, msg.pages, gameMin());
        scene.audio?.sfx?.('select');
        await sys(T(key, 'ping', { trainer }).pages);
        await scene.say(msg.pages, { name: trainer, portrait: null, battle: null });
      } finally { watch.delivering = false; }
    });
    return { ...pick, text: msg.pages };
  };
  const onStep = () => {
    const p = scene.player, m = scene.map?.name;
    if (!p || !m) return null;
    if (m !== watch.map) { watch.map = m; watch.settleAt = (scene.tick || 0) + cfg.settleTicks; watch.stepsOnMap = 0; watch.x = p.x; watch.y = p.y; return null; }
    if (p.x === watch.x && p.y === watch.y) return null;
    watch.x = p.x; watch.y = p.y; watch.stepsOnMap++;
    if (!state.list.length) return null;
    state.ping.steps++;
    if (blockReason() || pingWait(state.ping, cfg, now())) return null;
    if (rng() >= cfg.chancePerStep) return null;
    const pick = pickPing(state, data, { map: m, gameMin: gameMin(), rng });
    return pick ? deliver(pick) : null;
  };
  if (typeof scene.step === 'function') {
    const step = scene.step.bind(scene);
    scene.step = (...a) => { const r = step(...a); try { onStep(); } catch (err) { console.error('contacts ping:', err); } return r; };
  }

  // ---- markers: rematch-ready contacts on this map get the gold arrow ------------------------------------------------
  if (typeof scene.markerSpots === 'function') {
    const spots = scene.markerSpots.bind(scene);
    scene.markerSpots = (...a) => {
      const out = spots(...a) || [], m = scene.map?.name;
      for (const k of Object.keys(state.ready)) {
        const [km, id] = k.split('.');
        if (km !== m || !book.has(k)) continue;
        const live = scene.npcs?.list?.find?.((x) => x.def?.id === id || x.id === id);
        const d = live || (scene.map?.npcs || []).find((x) => x.id === id);
        if (d) out.push({ x: live ? live.x : d.x, y: live ? live.y : d.y, up: 1, id: `contact:${k}` });
      }
      return out;
    };
  }

  // ---- UI: battle foes injection + the Contacts screen ----------------------------------------------------------------
  const installUi = (ui) => {
    if (!ui || ui._contactsInstalled) return;
    ui._contactsInstalled = true;
    const open = ui.open.bind(ui);
    ui.open = (id, arg) => open(id, id === 'battle' && pendingFoes ? { ...(arg || {}), foes: pendingFoes.foes, foeName: pendingFoes.foeName } : arg);
    ui.scr_contacts = function () {
      const rows = () => book.list();
      const info = (c) => {
        if (!c) return `<p class="soft">${esc(T('', 'empty').text)}</p>`;
        const last = book.lastText(c.key), ready = book.isReady(c.key);
        return `<b>${esc(c.name)}</b>${c.cls ? `<p class="soft">${esc(c.cls)}</p>` : ''}${c.place ? `<p class="soft">${esc(T(c.key, 'where').text)}: ${esc(c.place)}</p>` : ''}
          ${ready ? `<p><b>${esc(T(c.key, 'ready_chip').text)}</b></p>` : ''}
          <p class="soft" style="margin-top:6px">${esc(T(c.key, 'last_text').text)}</p><p>${esc(last ? last.text.join(' ') : T(c.key, 'no_text').text)}</p>`;
      };
      const scr = { scr: 'contacts', pat: 'dots', title: T('', 'title').text || 'Contacts', glyph: 'contacts', sel: 0, cols: 1, count: () => rows().length,
        render: () => { const l = rows();
          if (scr.sel >= l.length) scr.sel = Math.max(0, l.length - 1);
          return `<div class="ui-body sys-split"><div class="ui-panel ui-pad ui-grow ui-scroll" data-scr="contacts" data-pat="dots" data-scroll>
            ${l.length ? `<ul class="ui-list" data-aa="contacts">${l.map((c, i) => `<li class="ui-row" data-i="${i}" data-k="${esc(c.key)}"><span class="grow">${esc(c.name)}${c.cls ? ` <span class="soft">· ${esc(c.cls)}</span>` : ''}</span>${book.isReady(c.key) ? `<span class="chip">${esc(T(c.key, 'ready_chip').text)}</span>` : ''}</li>`).join('')}</ul>`
              : `<div class="plate ui-empty">${esc(T('', 'empty').text)}</div>`}</div>
            <div class="plate ui-pad sys-side" id="ctinfo">${info(l[scr.sel])}</div></div>`; },
        onSel: (i) => { const el = ui.stage?.querySelector('#ctinfo'); if (el) el.innerHTML = info(rows()[i]); },
        hint: () => ui.hintText?.([['A', T('', 'call_label').text + ' / ' + T('', 'remove_label').text], ['B', T('', 'back_label').text]]) || '',
        onA: (i) => { const c = rows()[i]; if (c) api.menuPick(c.key); },
      };
      return scr;
    };
  };
  let uiTries = 0; // the UI mounts after the scene: poll briefly (max ~60 s), never forever
  const tryUi = () => { const ui = getUi(); if (ui?.open) installUi(ui); else if (++uiTries < 240 && typeof setTimeout === 'function') { const t = setTimeout(tryUi, 250); t?.unref?.(); } };
  tryUi();

  const withModal = async (what, fn) => {
    scene.checkpoint?.(`contacts_${what}`); // save right before the interaction starts
    modalOpen = what;
    try { return await fn(); } finally { modalOpen = null; scene._dirty = true; }
  };
  const api = {
    data, state, book, missing, cfg,
    enabled: true,
    blockReason, onStep, deliver, pickPing: (o = {}) => pickPing(state, data, { map: scene.map?.name, gameMin: gameMin(), rng, ...o }),
    /** Call a contact (menu). Returns the reply pages. */
    call(key) {
      const f = book.isReady(key) ? 'call_ready' : 'call';
      const t = T(key, f, { trainer: nameOf(key) });
      book.note(key, 'call', t.pages, gameMin());
      return t.pages;
    },
    async menuPick(key) {
      const ui = getUi(); if (!ui) return;
      const name = nameOf(key);
      const i = await ui.ask('contacts', [name], [T(key, 'call_label').text, T(key, 'remove_label').text, T(key, 'back_label').text], { pat: 'dots' });
      if (i === 0) await withModal('call', () => ui.ask('contacts', api.call(key), [T(key, 'ok_label').text], { pat: 'dots' }));
      else if (i === 1) {
        const c = T(key, 'remove_confirm', { trainer: name });
        const y = await withModal('remove', () => ui.ask('contacts', c.pages, c.choices || PH.remove_confirm.choices, { pat: 'dots' }));
        if (y === 0) { book.remove(key); scene.log?.push({ tick: scene.tick, type: 'contactRemoved', npc: key }); ui.note?.(T(key, 'removed', { trainer: name }).text); scene.saveNow?.(); }
      }
      ui.rerender?.();
    },
    /** Dev / shots: force a ping now (ignores timers, not the lock rules unless force === 'hard'). */
    forcePing(kind = 'rematch', key = state.list[0]?.key, force = false) {
      if (!key) return null;
      if (!force && blockReason() && blockReason() !== 'settling') return { blocked: blockReason() };
      return deliver({ key, kind });
    },
    addDev(key) { const [m, id] = key.split('.'); const e = scene.lines?.maps?.[m]?.[id]; return book.add(key, metaFor(key, e)); },
    installUi,
  };
  return api;
}
