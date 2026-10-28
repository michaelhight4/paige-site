// Dev console: "Auto-complete battle" (v0.2.26). Only ever imported by battle/ui_sd.js while DEV.active (admin + ?dev=1).
// The computer picks the player's side each turn (best-damage picker; a forced switch when a creature faints), skipping all
// animations. It drives the ordinary engine (kb.choose / kb.drain) so rolls, accuracy, crits, status and AI are the game's own,
// then the screen's normal finish() runs (XP split, applyBattleResult, evolution queue, post-battle flow, the usual save).
// Nothing here saves; nothing is forced to win.
import { DEV } from './runtime.js?v=v0.2.34-alpha';

export const logs = []; // newest last, max 20
const MAX_LOGS = 20, MAX_STEPS = 600;
const SIDE = { p1: 'You', p2: 'Foe' };
const sideOf = (id) => (String(id || '').startsWith('p2') ? 'Foe' : 'You');
const nameOf = (id) => String(id || '').replace(/^p\d[a-z]?:\s*/, '');
const hpNum = (s) => { const m = /^(\d+)(?:\/(\d+))?/.exec(String(s || '')); return m ? { hp: +m[1], max: m[2] ? +m[2] : null } : null; };

export const options = { useCrystals: false }; // wild battles only; off by default (set from the console)

// ---- the picker -------------------------------------------------------------------------------------------------------
function moveScore(kb, m, me, foe, meHpFrac) {
  let mv; try { mv = kb.battle.dex.moves.get(m.id); } catch { return 1; }
  const bp = Number(mv.basePower) || 0;
  if (!bp) { if (mv.heal && meHpFrac < 0.4) return 60; return 1; } // status / support: only when nothing hits
  let mult = 1;
  try {
    if (foe && mv.type) {
      if (kb.battle.dex.getImmunity && kb.battle.dex.getImmunity(mv.type, foe) === false) return 0.01;
      const e = kb.battle.dex.getEffectiveness ? kb.battle.dex.getEffectiveness(mv.type, foe) : 0;
      mult = 2 ** Math.max(-3, Math.min(3, Number(e) || 0));
    }
  } catch { mult = 1; }
  let stab = 1;
  try { if (me?.getTypes?.().includes(mv.type)) stab = 1.5; } catch { stab = 1; }
  const acc = mv.accuracy === true ? 1 : Math.max(0.1, (Number(mv.accuracy) || 100) / 100);
  let s = bp * stab * mult * acc;
  if (m.pp != null && m.pp <= 0) s *= 0.05;
  return s;
}

/** The choice string for the player's side right now: "move N" | "switch N" | "crystal ID". null = nothing legal found. */
export function pickChoice(kb, tried = new Set()) {
  const r = kb.request();
  if (r.state === 'switch') {
    let best = -1, bi = -1;
    r.team.forEach((c, i) => { if (i > 0 && !c.fainted && !tried.has('switch ' + (i + 1))) { const v = c.hp * 1000 + c.level; if (v > best) { best = v; bi = i; } } });
    return bi >= 0 ? `switch ${bi + 1}` : null;
  }
  const me = kb.p1.active?.[0], foe = kb.p2.active?.[0];
  if (options.useCrystals && r.wild && foe && foe.maxhp && foe.hp / foe.maxhp <= 0.3) {
    const id = Object.keys(r.bag || {}).find((k) => /crystal/.test(k) && (r.bag[k]?.n ?? r.bag[k]) > 0 && !tried.has('crystal ' + k));
    if (id) return 'crystal ' + id;
  }
  const hpFrac = me && me.maxhp ? me.hp / me.maxhp : 1;
  let best = -1, bi = -1;
  r.moves.forEach((m, i) => { if (m.disabled || tried.has('move ' + (i + 1))) return; const s = moveScore(kb, m, me, foe, hpFrac); if (s > best) { best = s; bi = i; } });
  return bi >= 0 ? `move ${bi + 1}` : null;
}

// ---- the recorder -----------------------------------------------------------------------------------------------------
function makeRecorder(entry, party) {
  let turn = 0; const hp = {};
  const out = (t) => entry.lines.push(t);
  const who = (id) => `${sideOf(id)} ${nameOf(id)}`;
  return {
    feed(lines) {
      for (const ln of lines || []) {
        const [cmd, a, b, c, d] = Array.isArray(ln) ? ln : String(ln).split('|');
        switch (cmd) {
          case 'turn': turn = Number(a) || turn + 1; entry.turns = turn; out(`--- Turn ${turn} ---`); break;
          case 'switch': case 'drag': { const h = hpNum(c); if (h) hp[a] = h; out(`${turn ? '  ' : ''}${sideOf(a)} sends out ${b}${h ? ` (HP ${h.hp}${h.max ? '/' + h.max : ''})` : ''}`); if (turn) entry.switches++; break; }
          case 'move': out(`  ${who(a)} used ${b}`); break;
          case '-damage': { const h = hpNum(b); const prev = hp[a]; let t = `  ${who(a)} -${prev && h ? Math.max(0, prev.hp - h.hp) : '?'} HP`; if (h) { t += ` (now ${h.hp}${h.max ? '/' + h.max : ''})`; hp[a] = { hp: h.hp, max: h.max || prev?.max }; } if (c) t += ` [${String(c).replace(/^\[from\]\s*/, '')}]`; out(t); break; }
          case '-heal': { const h = hpNum(b); const prev = hp[a]; let t = `  ${who(a)} +${prev && h ? Math.max(0, h.hp - prev.hp) : '?'} HP`; if (h) { t += ` (now ${h.hp}${h.max ? '/' + h.max : ''})`; hp[a] = { hp: h.hp, max: h.max || prev?.max }; } out(t); break; }
          case '-status': out(`  ${who(a)} is now ${b}`); break;
          case '-curestatus': out(`  ${who(a)} recovered from ${b}`); break;
          case 'cant': out(`  ${who(a)} could not move (${b || '?'})`); break;
          case '-resisted': out(`    (not very effective on ${who(a)})`); break;
          case '-weakspot': out(`    (strong hit on ${who(a)})`); break;
          case '-crit': out(`  Critical hit on ${who(a)}`); break;
          case '-miss': out(`  ${who(a)}'s skill missed`); break;
          case '-immune': out(`  ${who(a)} is unaffected`); break;
          case '-fail': out(`  ${who(a)}: it failed`); break;
          case '-boost': out(`  ${who(a)} ${b} +${c}`); break;
          case '-unboost': out(`  ${who(a)} ${b} -${c}`); break;
          case 'faint': out(`  ${who(a)} fainted`); entry.faints++; break;
          case '-kxp': out(`  XP gained: ${b}${a ? ' (' + nameOf(a) + ')' : ''}`); break;
          case '-klevelup': out(`  LEVEL UP ${nameOf(a)} -> Lv.${b}`); entry.levelUps.push(`${nameOf(a)} Lv.${b}`); break;
          case '-kitem': out(`  Item used: ${b}${c ? ' ' + c : ''}`); break;
          case '-kcrystal': out(`  Crystal ${b || ''}: ${d || 'no catch'}${c != null && c !== '' ? ' (pulses ' + c + ')' : ''}`); if (d === 'caught') entry.caught = true; break;
          case 'win': out(`  Battle won by ${a}`); break;
          default: if (cmd && /^-k|^-|^[a-z]+$/.test(cmd) && !['', 'upkeep', 'player', 'teamsize', 'gametype', 'gen', 'tier', 'rule', 'start', 'split', 'clearpoke', 'poke', 'teampreview', 'inactive'].includes(cmd) && cmd !== 'turn') out(`  ${cmd}${a ? ' ' + [a, b, c, d].filter((x) => x != null && x !== '').join(' ') : ''}`);
        }
      }
    },
    out,
  };
}

const snapParty = (scene) => (scene?.party || []).map((c) => ({ uid: c.uid, name: c.nickname || c.species, species: c.species, level: c.level, xp: c.xp }));

/** Play the whole battle to its end through the engine. Returns the log entry (also stored). Never saves, never closes the screen. */
export function runAuto(kb, ctx = {}) {
  const scene = globalThis.kilumen?.scene;
  const entry = { id: Date.now(), at: new Date().toLocaleString(), title: ctx.trainer ? 'Trainer battle' : 'Wild battle', lines: [], turns: 0, switches: 0, faints: 0, levelUps: [], caught: false, outcome: 'unfinished', ready: false, before: snapParty(scene), _evStart: scene?.evolution?.log?.length ?? 0 };
  const rec = makeRecorder(entry, entry.before);
  entry.lines.push(`Auto-complete: ${entry.title} at ${entry.at}`);
  const mine = kb.p1.creature.map((c) => `${c.name} Lv.${c.level}`).join(', '), theirs = kb.p2.creature.map((c) => `${c.name} Lv.${c.level}`).join(', ');
  entry.lines.push(`Your team: ${mine}`, `Foe team: ${theirs}`, '');
  logs.push(entry); while (logs.length > MAX_LOGS) logs.shift();
  rec.feed(kb.drain());
  const tried = new Set(); let steps = 0, lastKey = '';
  while (!kb.ended && steps++ < MAX_STEPS) {
    const key = kb.request().state + kb.battle.turn;
    if (key !== lastKey) { tried.clear(); lastKey = key; }
    const choice = pickChoice(kb, tried);
    if (!choice) { entry.lines.push('  [auto] no legal choice found, stopping'); break; }
    const r = kb.choose(choice);
    if (r !== true) { tried.add(choice); if (tried.size > 12) { entry.lines.push(`  [auto] engine refused: ${r?.error || '?'}`); break; } continue; }
    rec.feed(kb.drain());
  }
  rec.feed(kb.drain());
  if (!kb.ended) { entry.lines.push('  [auto] stopped before the battle ended (step limit / no legal choice)'); entry.outcome = 'unfinished'; }
  else {
    const res = kb.result(); entry.outcome = res.outcome || 'ended'; entry.turns = res.turns || entry.turns; entry.seed = res.seed;
    entry.lines.push('', `=== Outcome: ${entry.outcome.toUpperCase()} after ${entry.turns} turn(s)${entry.caught ? ' (caught)' : ''} ===`);
  }
  entry.complete = kb.ended;
  return entry;
}

/** After finish(): wait until the normal post-battle flow (dialogue, evolutions) is idle, then add XP / level / evolution results and show the log. */
export async function afterFinish(entry) {
  const scene = globalThis.kilumen?.scene, ui = globalThis.kilumen?.ui;
  if (!scene) { entry.ready = true; return; }
  const evStart = entry._evStart ?? 0;
  const idle = () => { const ev = scene.evolution; return !scene.busy && !scene.fade && !scene.dialog?.active && !(ui?.active) && !ev?.running && !(ev?.queue?.length); };
  const t0 = performance.now(); await new Promise((r) => setTimeout(r, 400));
  while (!idle() && performance.now() - t0 < 120000) await new Promise((r) => setTimeout(r, 250));
  const after = snapParty(scene), L = entry.lines;
  L.push('', 'Party after the normal end-of-battle flow:');
  for (const b of entry.before) {
    const a = after.find((x) => x.uid === b.uid); if (!a) { L.push(`  ${b.name}: not in party`); continue; }
    L.push(`  ${b.name}: Lv.${b.level} -> Lv.${a.level}, XP +${Math.max(0, (a.xp || 0) - (b.xp || 0))}${a.species !== b.species ? `, evolved ${b.species} -> ${a.species}` : ''}`);
  }
  const evs = (scene.evolution?.log || []).slice(evStart);
  if (evs.length) L.push('Evolutions triggered:', ...evs.map((e) => '  ' + (typeof e === 'string' ? e : JSON.stringify(e))));
  else L.push('Evolutions triggered: none');
  entry.text = L.join('\n'); entry.ready = true;
  showLog(entry);
}

// ---- log viewer -------------------------------------------------------------------------------------------------------
let styled = false;
function css() {
  if (styled) return; styled = true;
  const s = document.createElement('style');
  s.textContent = `.kdev-log{position:fixed;inset:0;z-index:100001;background:rgba(8,10,16,.88);display:flex;align-items:center;justify-content:center;padding:10px;font:13px/1.35 system-ui,sans-serif;color:#e8ecf4}
.kdev-log .box{background:#141a26;border:1px solid #3a4560;border-radius:12px;width:min(720px,100%);max-height:100%;display:flex;flex-direction:column;overflow:hidden}
.kdev-log .hd{display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid #2a3348}.kdev-log .hd b{flex:1}
.kdev-log pre{margin:0;padding:10px 12px;overflow:auto;white-space:pre-wrap;word-break:break-word;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;flex:1;-webkit-overflow-scrolling:touch;touch-action:pan-y}
.kdev-log button{background:#27324a;color:#fff;border:1px solid #4a5a80;border-radius:8px;padding:9px 14px;font:inherit;min-height:40px}`;
  document.head.appendChild(s);
}
export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch { /* fallback */ }
  try { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch { return false; }
}
export function showLog(entry) {
  css(); document.querySelector('.kdev-log')?.remove();
  const text = entry.text || entry.lines.join('\n');
  const w = document.createElement('div'); w.className = 'kdev-log';
  w.innerHTML = '<div class="box"><div class="hd"><b></b><button data-c>Copy</button><button data-x>Close</button></div><pre></pre></div>';
  w.querySelector('b').textContent = `${entry.title}: ${String(entry.outcome).toUpperCase()}, ${entry.turns} turn(s)`;
  w.querySelector('pre').textContent = text;
  const close = () => { w.remove(); DEV.logOpen = false; document.removeEventListener('keydown', key, true); };
  const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } };
  document.addEventListener('keydown', key, true); DEV.logOpen = true;
  w.querySelector('[data-x]').onclick = close;
  w.querySelector('[data-c]').onclick = async (e) => { const ok = await copyText(text); e.target.textContent = ok ? 'Copied' : 'Copy failed'; setTimeout(() => { e.target.textContent = 'Copy'; }, 1500); };
  document.body.appendChild(w);
}
