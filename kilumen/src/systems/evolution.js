// Kilumen evolution on level-up (Coder, Oct 23 2026). Before this file, nothing changed a creature's species: a creature
// that reached its evolution level after a battle stayed the same form (proof: tests/evolution.test.mjs "before").
// Flow (Pokémon-style structure, our own text/art): a won battle (outcome 'win' or 'caught') -> for each party creature that
// gained a level in it, is not fainted, and is now at/above its next form's level -> after the battle screen and any talk
// close, a script runs: "<Name> is changing!" + the Animator's evolution player (ui.fx.evolveFx), B stops it until the reveal
// -> species swaps (level, XP, nickname, skills, warmth, variant, HP proportion kept; stats are derived so they follow)
// -> "<Name> became <New>!" -> Kilindex registers the new form -> the script's normal save runs AFTER (save lock: the script
// and ui.fx._evolving both lock it, so there is no mid-evolution save).
// Data: the game's CURRENT evolution data (buildCreatures(): evos + evoLevel, PLACEHOLDER levels 16 / 32 from
// tools/sync_creatures.mjs), not DEX_450's levels (Gary has not picked game vs DEX yet). Time-of-day: honoured only if a dex
// entry carries evoTime ('day' | 'night' | 'dawn' | 'dusk'); none does today, so nothing is time-gated.
// Out of scope (not by level): shard / fossil / bond forms. Only one of them has a level in the game data (wavelin ->
// breakerfin, a Warmth/bond evolution in DEX_450), so it is held back here (NOT_BY_LEVEL).
// Hook: one line in src/main.js after attachOvernight. ?evo=0 turns it off.
import { buildCreatures } from '../battle/data/creatures.js?v=v0.2.72-alpha';
import { speciesName, displayName, maxHp, idOf } from './creature.js?v=v0.2.72-alpha';

export const NOT_BY_LEVEL = Object.freeze({ breakerfin: 'bond (DEX_450: Warmth, high bond)' });
export const EVOLVE_OUTCOMES = new Set(['win', 'caught']); // a catch also ends a battle the player won
export const FALLBACK = { // code fallbacks; Text Bot's system_evolution.* keys win when present (text/system_lines.py)
  start: ['{creature} is changing!'], done: ['{creature} became {new}!'], stopped: ['{creature} stayed as it is.'], kilindex: ['New Kilindex entry: {new}.'],
};

let _table = null;
/** id -> { to, level, time } for every creature whose next form is reached by level (excludes NOT_BY_LEVEL). */
export function evoTable(dex = null) {
  if (!dex && _table) return _table;
  const d = dex || buildCreatures(), byName = new Map(Object.entries(d).map(([id, e]) => [e.name, id])), t = {};
  for (const [id, e] of Object.entries(d)) {
    const to = e.evos?.length ? byName.get(e.evos[0]) : null, nx = to && d[to];
    if (!nx || !Number.isFinite(nx.evoLevel) || NOT_BY_LEVEL[to]) continue;
    t[id] = { to, level: nx.evoLevel, time: nx.evoTime || null };
  }
  if (!dex) _table = t;
  return t;
}

const PHASE_OK = { day: ['morning', 'day', 'noon', 'afternoon'], night: ['night', 'evening'], dawn: ['dawn', 'morning'], dusk: ['dusk', 'evening'] };
/** The next form `c` is ready for right now, or null. `phase` (scene.phase) only matters for entries with a time. */
export function nextEvolution(c, { phase = null, table = evoTable() } = {}) {
  const e = c && table[c.species];
  if (!e || !(c.level >= e.level)) return null;
  if (e.time && !(PHASE_OK[e.time] || [e.time]).includes(phase)) return null;
  return e;
}

/** Creatures that should evolve after a battle: gained a level in it, not fainted, at/above the next form's level. */
export function pendingEvolutions(party, before, outcome, opts = {}) {
  if (!EVOLVE_OUTCOMES.has(outcome)) return [];
  const out = [];
  for (const c of party || []) {
    const was = before?.get(idOf(c));
    if (was == null || !(c.level > was) || !(c.hp > 0)) continue;
    const e = nextEvolution(c, opts);
    if (e) out.push({ uid: idOf(c), from: c.species, to: e.to, level: c.level });
  }
  return out;
}

/** Swap species in place. Keeps uid / level / xp / nickname / skills / warmth / variant / status; HP keeps its proportion. */
export function evolveCreature(c, to) {
  const from = c.species, m0 = maxHp(c), hp0 = c.hp;
  c.species = to;
  const m1 = maxHp(c);
  c.hp = hp0 > 0 ? Math.max(1, Math.min(m1, Math.round((hp0 / m0) * m1))) : 0;
  return { from, to, hp: [hp0, c.hp], maxHp: [m0, m1] };
}

const STYLE = 'body.evo-open #touchpad { z-index: 61; } .ax-evo.evo-wait .ax-evo-msg::after { content: " \\25BC"; font-size: .8em; }';

/** Wire evolution into the overworld (call after attachSystems / attachOvernight). Returns the controller (tests, e2e). */
export function attachEvolution(scene, opts = {}) {
  const q = opts.query, sys = scene.systems;
  if (q?.get?.('evo') === '0' || !sys) return null;
  const ev = { queue: [], running: false, b: false, a: false, log: [], wait: opts.wait ?? true };
  scene.evolution = ev;

  const apply = sys.applyBattleResult.bind(sys);
  sys.applyBattleResult = (res) => {
    const before = new Map((scene.party || []).map((c) => [idOf(c), c.level]));
    const out = apply(res);
    try {
      for (const p of pendingEvolutions(scene.party, before, res?.outcome, { phase: scene.phase || null }))
        if (!ev.queue.some((j) => j.uid === p.uid)) ev.queue.push(p);
    } catch (e) { console.error('evolution:', e); }
    return out;
  };

  const step = scene.step.bind(scene);
  scene.step = (snap) => {
    if (ev.running) { if (snap?.b || snap?.bTap) ev.b = true; if (snap?.a) ev.a = true; }
    step(snap);
    const ui = globalThis.kilumen?.ui;
    if (ev.queue.length && !scene.busy && !scene.fade && !scene.dialog?.active && !ui?.active) scene.script(() => run());
  };

  const lines = (k, vars) => {
    const L = scene.lines?.system_evolution?.[k];
    return scene.fill([].concat(L?.pages || (Array.isArray(L) ? L : null) || FALLBACK[k]), { ...(scene.textVars?.() || {}), ...vars });
  };
  const waitA = (st) => new Promise((res) => {
    if (!ev.wait) { res(); return; }
    st.classList.add('evo-wait'); ev.a = false;
    const tap = () => { ev.a = true; };
    st.addEventListener('pointerdown', tap);
    const t = setInterval(() => { if (ev.a) { clearInterval(t); st.removeEventListener('pointerdown', tap); res(); } }, 50);
  });

  async function one(job) {
    const c = (scene.party || []).find((p) => idOf(p) === job.uid);
    if (!c || c.species !== job.from || (!job.force && !nextEvolution(c, { phase: scene.phase || null }))) return null; // job.force: dev console only (v0.2.26)
    const vars = { creature: displayName(c), new: speciesName(job.to) };
    const start = lines('start', vars), done = lines('done', vars), stopped = lines('stopped', vars);
    const fx = globalThis.kilumen?.ui?.fx;
    let r = null;
    ev.running = true; ev.b = false; ev.a = false;
    if (typeof document !== 'undefined') document.body.classList.add('evo-open');
    try {
      if (fx?.evolveFx) {
        if (typeof document !== 'undefined' && !document.getElementById('evo-style')) {
          const s = document.createElement('style'); s.id = 'evo-style'; s.textContent = STYLE; document.head.appendChild(s);
        }
        r = await fx.evolveFx({ from: job.from, to: job.to, cancel: () => ev.b, text: { start: start.join(' '), end: done.join(' ') }, hold: 2000 });
        if (r?.skipped) r = null;
      }
      if (!r) { // no player (?ui=0, node, art missing): the same flow in the dialogue box, no B window
        await scene.say(start);
        r = { cancelled: false, quiet: true };
      }
      if (r.cancelled && r.el) r.el.querySelector('.ax-evo-msg').textContent = stopped.join(' ');
      if (!r.cancelled) {
        const info = evolveCreature(c, job.to);
        scene._dirty = true;
        scene.log?.push({ tick: scene.tick, type: 'evolve', uid: job.uid, from: info.from, to: info.to, level: c.level });
        scene.onPartyChange?.(true); // follower + party sprites follow the new form
      }
      if (r.el) { await waitA(r.el); r.close(); }
      else await scene.say(r.cancelled ? stopped : done);
    } finally {
      ev.running = false;
      if (typeof document !== 'undefined') document.body.classList.remove('evo-open');
    }
    const result = { ...job, cancelled: !!r.cancelled };
    ev.log.push(result);
    if (!r.cancelled) {
      const k = sys.kilindex;
      const zone = scene.zone?.() || scene.map?.name || null;
      if (k?.markCaught(job.to, { zone, variant: c.variant || '', skills: c.skills })) await scene.say(lines('kilindex', vars));
    }
    return result;
  }

  async function run() {
    while (ev.queue.length) { const j = ev.queue.shift(); try { await one(j); } catch (e) { console.error('evolution:', e); } }
  }
  ev.run = run;
  // dev console (v0.2.26): evolve a party creature now through this same path (animation, nickname / skills / variant kept, Kilindex mark). Not used by normal play.
  ev.force = (c, to) => { if (!c || !to || ev.queue.some((j) => j.uid === idOf(c))) return false; ev.queue.push({ uid: idOf(c), from: c.species, to, level: c.level, force: true }); return true; };
  return ev;
}
