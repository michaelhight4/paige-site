// Boundwake UI shell — studio standard pass (Nov 5, 2026 CT).
// Craft: Lifeline docked Age + per-menu hue bars; Boundwake parchment/realm identity.
import { loadPack } from './pack.js';
import * as E from './bw_engine.js';
import { ico, esc, flare, oddsChip, statLabel, infoChip } from './flare.js';
import { mountInfoClicks, openInfo } from './info.js';
import { checkAdminAccess, gateHTML, isLocalHost } from './admingate.js';
import { mountAmbient, paintAmbient } from './ambient.js';
const $ = (sel) => document.querySelector(sel), app = $('#app');
const KEY = 'bw.save.v1', META = 'bw.meta.v1', SEEN = 'bw.cold.v1';
const Q = new URLSearchParams(location.search);
let P, s, meta, tab = 'life', fate;
const T = (k) => P.terms.ui[k] || k;
const GRID = 'assets/sprites_192/grid/';
function initials(name) {
  return String(name || '').trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}
function portrait(st, raceId, career, big, name, sex) {
  const sx = sex || (s && s.sex) || (fate && fate.sex) || 'm';
  const file = `${raceId}_${st}_${sx}.png`;
  const cls = 'portrait' + (big ? ' big' : '');
  const mono = initials(name);
  return `<div class="${cls}" data-spr="${file}"><img alt="" src="${GRID}${file}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'mono-fallback',textContent:'${mono}'}))"></div>`;
}
const career = () => (s.job ? E.careerOf(s.job.id).id : null);
const save = () => { if (!Q.has('nosave')) { localStorage.setItem(KEY, JSON.stringify(s)); localStorage.setItem(META, JSON.stringify(meta)); } };
const toast = (m) => {
  if (!m) return; document.querySelectorAll('.toast').forEach((t) => t.remove());
  const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = flare(m); document.body.append(d); setTimeout(() => d.remove(), 2400);
};
const bar = (key, v, cls = '', valHtml = null) => {
  const lbl = statLabel(key);
  const extra = cls || (key === 'health' ? 'bar-health' : key === 'spirit' || key === 'happiness' ? 'bar-spirit' : key === 'wits' || key === 'smarts' ? 'bar-wits'
    : key === 'presence' || key === 'looks' ? 'bar-presence' : key === 'strain' || key === 'stress' ? 'bad bar-strain' : key === 'renown' || key === 'fame' ? 'bar-renown' : key === 'mana' ? 'magic bar-mana' : '');
  const val = valHtml != null ? valHtml : Math.round(v);
  const pct = Math.max(0, Math.min(100, typeof v === 'number' ? v : 0));
  return `<div class="bar ${extra}">${lbl}<span class="val">${val}</span><i><b style="width:${pct}%"></b></i></div>`;
};
const setChrome = (t) => {
  document.body.dataset.tab = t;
  const realm = (s && s.region) || (typeof fate !== 'undefined' && fate && fate.region) || 'hearthfold';
  try { paintAmbient(realm, t); } catch (_) { /* ambient optional */ }
};
const card = (panel, hd, body, extra = '') =>
  `<div class="card panel-${panel} ${extra}"><div class="card-hd">${hd}</div><div class="card-body">${body}</div></div>`;

const TAB_META = {
  life: { ico: 'spirit', label: 'Life' },
  work: { ico: 'work', label: 'occupation_menu' },
  adv: { ico: 'adventure', label: 'adventure_menu' },
  skills: { ico: 'skill', label: 'skills_menu' },
  bonds: { ico: 'bond', label: 'people_menu' },
  realms: { ico: 'realm', label: 'map_menu' },
  codex: { ico: 'codex', label: 'codex_menu' },
  bel: { ico: 'belong', label: 'assets_menu' },
};
const TABS = Object.keys(TAB_META).map((k) => [k, TAB_META[k].label]);
const LEAD = {
  life: 'The year turns soft as pondwater. Rest, remember, choose what matters.',
  work: 'Guild boards smell of ink and forge-smoke. Earn your keep — or leave the post.',
  adv: 'Roads remember feet that dare them. Pack light; come home heavier.',
  skills: 'First lesson sinks deep; later ones strain you. Pillars ask more of long lives.',
  bonds: 'Faces around the hearth. Time spent is never wasted twice.',
  realms: 'Five realms, one map in the mind. Travel when your boots are ready.',
  codex: 'What the world taught you stays — even when the body does not.',
  bel: 'Gold, relics, the small weights of a life. A shop for later.',
};
const HD = {
  life: `${ico('spirit')} Journal`,
  work: `${ico('work')} Guild boards`,
  adv: `${ico('adventure')} Adventure`,
  skills: `${ico('skill')} Skills`,
  bonds: `${ico('bond')} Bonds`,
  realms: `${ico('realm')} Realms`,
  codex: `${ico('codex')} Codex`,
  bel: `${ico('belong')} Belongings`,
};

function cold(step = 0) {
  document.body.classList.remove('has-sheet');
  setChrome('fate');
  const lines = [T('cold_1'), T('cold_2'), T('cold_3')];
  app.innerHTML = `<div class="cold"><p>${esc(lines[step])}</p><p><button class="primary" id="n">${step < 2 ? 'Continue' : T('start_life')}</button> <button class="ghost" id="sk">${T('skip_intro')}</button></p></div>`;
  $('#n').onclick = () => (step < 2 ? cold(step + 1) : (localStorage.setItem(SEEN, 1), fateScreen()));
  $('#sk').onclick = () => { localStorage.setItem(SEEN, 1); fateScreen(); };
}
function fateScreen(rr = 1) {
  document.body.classList.remove('has-sheet');
  setChrome('fate');
  fate = E.rollFate(+Q.get('seed') || (Math.random() * 2 ** 31) | 0, meta, Q.get('race') ? { race: Q.get('race') } : {}); fate.rerolls = rr;
  const r = P.races.find((x) => x.id === fate.race), tr = P.traits.rare.find((x) => x.id === fate.trait);
  const body = `${portrait('baby', fate.race, null, true, fate.first + ' ' + fate.last, fate.sex)}
   <div class="name">${esc(fate.first)} ${esc(fate.last)}</div>
   <div class="sub">${esc(r.name)} · ${fate.sex === 'm' ? 'boy' : 'girl'} · ${flare(fate.wealth)} family</div>
   <div class="pills" style="justify-content:center;margin:10px 0">${infoChip(fate.affinity, `${ico(fate.affinity)} Affinity: ${esc(fate.affinity)}`)}
   ${infoChip(tr.id, `${flare(tr.name)}: ${esc(tr.up)} · <span class="bad">${esc(tr.down)}</span>`)}</div>
   <p class="sub">Hidden talents: 3 (revealed as you train)${meta.echoes ? ' · ' + flare('Echoes') + ': ' + Object.entries(meta.echoes).map(([k, n]) => flare(k.replace('echo_', '')) + '×' + n).join(', ') : ''}</p>
   <div class="actions" style="justify-content:center"><button id="go" class="primary">${T('start_life')}</button> <button id="rr" class="ghost" ${rr ? '' : 'disabled'}>${T('fate_reroll')}</button></div>`;
  app.innerHTML = card('fate', `${ico('echo')} ${T('fate_title')}`, body);
  $('#go').onclick = () => { s = E.begin(fate, meta); tab = 'life'; save(); render(); };
  $('#rr').onclick = () => fateScreen(0);
}
function header() {
  const st = E.stage(s), r = E.race(s), j = s.job && P.occ.jobs[s.job.id];
  const mana = s.flags.mana_awakened
    ? bar('mana', (100 * s.mana) / Math.max(1, s.manaMax), 'magic bar-mana', `${Math.floor(s.mana)}/${Math.floor(s.manaMax)}`)
    : '';
  const body = `<div class="hdr">${portrait(st, s.race, career(), false, s.first + ' ' + s.last)}
    <div style="flex:1;min-width:0"><div class="name">${esc(s.first)} ${esc(s.last)}</div>
    <div class="sub">${esc(r.name)} · ${T('year_verb')} ${Math.floor(s.age)} · ${esc(E.regionOf(s).name)}</div>
    <div class="sub">${j ? esc(j.title) : s.school ? 'Student' : st === 'baby' || st === 'child' ? 'Child' : 'No work'} · <span class="gold-line">${ico('gold')}${Math.floor(s.gold)} ${T('currency')}</span></div></div></div>
   <div class="bars">${bar('health', s.stats.health, s.stats.health < 30 ? 'bad bar-health' : 'bar-health')}${bar('spirit', s.stats.happiness)}${bar('wits', s.stats.smarts)}${bar('presence', s.stats.looks)}
   ${bar('strain', s.stats.stress, 'bad bar-strain')}${bar('renown', s.stats.fame)}${mana}</div>
   <div class="pills"><span class="pill">${ico('act')}Actions ${s.budget.act}/4</span><span class="pill">${ico('social')}Social ${s.budget.social}/3</span><span class="pill">${ico('adventure')}Adventure ${s.budget.adv}/5</span>${s.injuries.length ? `<span class="pill bad">${ico('strain')}Injuries ${s.injuries.length}</span>` : ''}</div>`;
  return `<div class="card hub panel-${tab}"><div class="card-body">${body}</div></div>`;
}
function body() {
  const h = E.hage(s);
  const lead = (k) => `<p class="menu-lead">${LEAD[k] || ''}</p>`;
  if (tab === 'life') {
    const byAge = []; for (const l of s.log.slice(-80)) { const a = Math.floor(l.age); if (!byAge.length || byAge.at(-1)[0] !== a) byAge.push([a, []]); if (l.kind !== 'year') byAge.at(-1)[1].push(l.text); }
    const route = !s.route && h >= 8 ? card('life', `${ico('adventure')} Choose your path`, `<p class="sub">Primary skills grow +25% faster.</p><div class="actions">${['route_magic', 'route_sword', 'route_hybrid', 'route_craft'].map((r) => `<button data-a="route" data-v="${r}">${flare(r.replace('route_', ''))}</button>`).join('')}</div>`) : '';
    return route + card('life', HD.life, `${lead('life')}<div class="journal" id="jr">${byAge.map(([a, ls]) => `<p class="y">${T('year_verb')} ${a}</p>${ls.map((t) => `<p>${flare(t)}</p>`).join('')}`).join('')}</div>
      <div class="actions"><button data-a="rest" class="ghost">Rest by the pond</button></div>`);
  }
  if (tab === 'work') {
    if (h < 12 && !s.job) return card('work', HD.work, `${lead('work')}<div class="empty">Too young for guild work.${s.school ? ' You attend Village lessons.' : ''}</div>`);
    const cur = s.job ? (() => { const j = P.occ.jobs[s.job.id], c = E.careerOf(j.id), nx = j.next && P.occ.jobs[j.next];
      return card('work', `${ico('work')} ${esc(j.title)}`, `${lead('work')}<p class="sub">${flare(c.blurb)}</p>
       <p>Wage <span class="gold-line">${ico('gold')}${j.wage} ${T('currency')}/yr</span> · Years ${s.job.years} · Performance ${Math.round(s.job.perf)}</p>
       ${nx ? `<p class="sub">Next rank: <b>${esc(nx.title)}</b> — ${nx.req.years} yrs${Object.entries(nx.req.skills).map(([k, v]) => `, ${flare(P.skills.skills.find((x) => x.id === k).name)} ${v}`).join('')}</p>` : '<p class="sub">Top of your craft.</p>'}
       <div class="actions"><button data-a="work" class="primary">Work hard (${esc(c.actions[0])}…)</button> <button data-a="quit" class="ghost">Leave post</button></div>`); })() : card('work', HD.work, lead('work'));
    const board = E.openings(s).map(({ job, career: c, ok }) => `<div class="row"><div><b>${esc(c.name)}</b><br><small>${flare(c.blurb)} · ${ico('gold')}${job.wage} ${T('currency')}/yr<br>${flare(c.unlock_text)}</small></div><button data-a="job" data-v="${job.id}" ${ok ? '' : 'disabled'}>Join</button></div>`).join('');
    return cur + card('work', `${ico('work')} Openings`, board || `<div class="empty">No openings this year.</div>`);
  }
  if (tab === 'adv') return card('adv', HD.adv, `${lead('adv')}<p class="sub">${h < 10 ? 'The road is for older feet (age 10+).' : flare(`Take to the paths of ${E.regionOf(s).name}. Combat, ruins and rare delves. ${s.budget.adv} left this year.`)}</p>
    <div class="actions"><button data-a="adv" class="primary" ${E.canAdventure(s) ? '' : 'disabled'}>Set out</button></div>`);
  if (tab === 'skills') {
    return card('skills', HD.skills, lead('skills')) + P.skills.categories.map((c) => card('skills', `${c.icon} ${esc(c.name)}`, P.skills.skills.filter((k) => k.cat === c.id).map((k) => { const v = s.skills[k.id], lk = E.skillLocked(s, k.id);
      const pillar = E.PILLAR_SKILLS?.includes(k.id) && E.longevitySkillPace(s, k.id) > 1 ? ` · <small class="muted">long-life pace ×${E.longevitySkillPace(s, k.id).toFixed(1)}</small>` : '';
      return `<div class="row"><div><b>${flare(k.name)}</b> <small>${E.rankOf(v)}${s.talents.includes(k.id) && v > 10 ? ' · talent!' : ''}${pillar}</small><br><small>${flare(k.flavor || k.note)}</small></div><div style="text-align:right;min-width:96px">${Math.floor(v)}<br><button data-a="train" data-v="${k.id}" ${lk || s.budget.act < 1 || h < 4 ? 'disabled' : ''}>${lk ? 'locked' : 'Train'}</button></div></div>`; }).join(''))).join('');
  }
  if (tab === 'bonds') {
    const people = E.living(s);
    return card('bonds', HD.bonds, `${lead('bonds')}${people.map((p) => `<div class="row"><div><b>${esc(p.first)}</b> <small>${esc(p.rel)} · ${Math.floor(p.age)} · ${esc(p.race)}</small>${bar('spirit', p.bar)}</div><button data-a="soc" data-v="${p.id}" ${s.budget.social ? '' : 'disabled'}>Spend time</button></div>`).join('') || '<div class="empty">No one yet. Make a friend when you can.</div>'}
    <div class="actions"><button data-a="friend" ${s.budget.social && h >= 5 ? '' : 'disabled'}>Make a friend</button> <button data-a="love" ${s.budget.social && h >= 16 && !E.partnerOf(s) ? '' : 'disabled'}>${flare('Lantern Market')}</button></div>`);
  }
  if (tab === 'realms') return card('realms', HD.realms, lead('realms')) + P.regions.map((r) => { const f = s.regionsFound.includes(r.id); return card('realms', `${ico('realm')} ${f ? esc(r.name) : '??? (undiscovered)'}`, `<p class="sub">${f ? flare(r.feel) : 'Undiscovered.'}</p>
    ${f ? r.locations.map((l) => `<div class="row"><div><b>${esc(l.name)}</b> <small>${esc(l.kind)}</small><br><small>${flare(l.flavor)}</small></div></div>`).join('') + (s.region !== r.id ? `<div class="actions"><button data-a="travel" data-v="${r.id}" ${h >= 14 ? '' : 'disabled'}>Travel here</button></div>` : '<p class="good">You are here.</p>') : ''}`); }).join('');
  if (tab === 'codex') {
    const evT = Object.fromEntries(P.events.map((e) => [e.id, e.title]));
    const rows = s.codex.map((c) => `<div class="row">${flare(evT[c] || P.regions.find((r) => r.id === c)?.name || P.regions.flatMap((r) => r.locations).find((l) => l.id === c)?.name || c.replace(/_/g, ' '))}</div>`).join('');
    return card('codex', `${HD.codex} <span class="hd-sub">${s.codex.length}</span>`, `${lead('codex')}<p class="sub">Kept across reincarnations.</p>${rows || '<div class="empty">Nothing recorded yet.</div>'}`);
  }
  if (tab === 'bel') return card('bel', HD.bel, `${lead('bel')}<p class="gold-line" style="font-size:18px">${ico('gold')}<b>${Math.floor(s.gold)}</b> ${T('currency')}</p>
    <h3>${ico('echo')} Relics</h3>${s.relics.map((r) => `<div class="row">${flare(r.replace(/^relic_/, '').replace(/_/g, ' '))}</div>`).join('') || '<div class="empty">None yet. Relics are found in delves and at graves.</div>'}
    <p class="sub">Shop for weapons, armor, foci, mounts, homes, workshops — stub for later.</p>`);
  return '';
}
function eventSheet() {
  const c = E.pendingCard(s); if (!c) return '';
  return `<div class="sheet"><div class="card"><div class="card-hd">${ico('adventure')} ${flare(c.title)}</div><div class="card-body"><p class="prompt">${flare(c.prompt)}</p><div class="choices">${c.choices.map((x, i) => `<button data-a="ch" data-v="${i}" ${x.locked ? 'disabled' : ''}>${flare(x.label)}${oddsChip(x.odds)}</button>`).join('')}</div></div></div></div>`;
}
function ageDock() {
  if (!s || !s.alive) return '';
  return `<div class="dock"><button class="age" data-a="age" ${s.pending.length ? 'disabled' : ''}>${T('year_verb')} +${E.turnYears(s)}</button></div>`;
}
function deathScreen() {
  document.body.classList.remove('has-sheet');
  setChrome('death');
  const hs = E.heirs(s), ech = E.echoChoices(s), d = P.terms.death;
  app.innerHTML = card('death', `${ico('echo')} ${T('death_title')}`, `<div style="text-align:center">${portrait(E.stage(s), s.race, career(), true, s.first + ' ' + s.last)}<div class="name">${esc(s.first)} ${esc(s.last)}</div>
   <p class="sub">Age ${Math.floor(s.age)}. ${flare(P.terms.causes[s.cause] || '')}</p><p>Legacy score <b>${E.legacyScore(s)}</b> · ${ico('gold')}${Math.floor(s.gold)} ${flare('gold')} · ${hs.length} living ${flare(hs.length === 1 ? 'heir' : 'heirs')}</p></div>`)
   + card('death', `${ico('echo')} ${T('path_reincarnate_title')}`, `<p class="sub">${flare(T('path_reincarnate_body'))}</p><p>${flare(d.echo_prompt || T('echo_pick'))}</p><div class="choices">${ech.map((id) => { const e = P.terms.echoes.find((x) => x.id === id); return `<button data-a="reinc" data-v="${id}"><b>${flare(e.name)}</b> — ${flare(e.text)}${meta.echoes?.[id] ? ' (repeat: halved)' : ''}</button>`; }).join('')}</div>`)
   + card('death', T('path_heir_title'), `<p class="sub">${flare(hs.length ? T('path_heir_body') : T('path_heir_locked') + '. ' + (d.locked_hint || ''))}</p><div class="actions">${hs.map((p) => `<button data-a="heir" data-v="${p.id}">Continue as ${esc(p.first)} (${Math.floor(p.age)})</button>`).join('') || ''}</div>`)
   + card('death', T('cemetery_title'), (meta.cemetery || []).slice(-8).reverse().map((c) => `<div class="row"><small>${esc(c.name)}, ${esc(c.race)}, age ${c.age} — ${esc(c.cause)}${c.link ? ` · ${c.link === 'soul' ? 'Reincarnation' : 'Heir'} of ${esc(c.prior)}` : ''}</small><small>${c.score}</small></div>`).join('') || `<div class="empty">${esc(d.empty || '')}</div>`);
}

function sidePeek() {
  if (!s) return '';
  const tr = P.traits.rare.find((x) => x.id === s.trait);
  const reg = E.regionOf(s);
  const top = Object.entries(s.skills || {}).sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([id, v]) => {
      const sk = P.skills.skills.find((x) => x.id === id);
      return `<div class="side-row"><span>${flare(sk?.name || id)}</span><b>${Math.floor(v)}</b></div>`;
    }).join('');
  const bonds = (s.people || []).filter((p) => p.alive !== false).length;
  return `<aside class="play-side card panel-side" aria-label="At a glance">
    <div class="card-hd">${ico('realm')} At a glance</div>
    <div class="card-body">
      <p class="side-label">Affinity</p>
      <div class="pills">${infoChip(s.affinity, `${ico(s.affinity)} ${esc(s.affinity)}`)}</div>
      <p class="side-label">Trait</p>
      <div class="pills">${tr ? infoChip(tr.id, `${flare(tr.name)}`) : '<span class="sub">—</span>'}</div>
      <p class="side-label">Realm</p>
      <p class="side-realm"><b>${esc(reg?.name || 'Hearthfold Vale')}</b><br><small>${flare(reg?.feel || 'A quiet woodland vale.')}</small></p>
      <p class="side-label">Top skills</p>
      <div class="side-skills">${top || '<div class="empty">None trained yet.</div>'}</div>
      <p class="side-meta">${ico('bond')} ${bonds} bond${bonds === 1 ? '' : 's'} · ${ico('act')}${s.budget?.act ?? 0}/4 · ${ico('adventure')}${s.budget?.adv ?? 0}/5</p>
      <p class="side-hint sub">Tap affinity or trait chips for what they do.</p>
    </div>
  </aside>`;
}
function render() {
  if (!s) return fateScreen();
  if (!s.alive) { save(); return deathScreen(); }
  setChrome(tab);
  const tabs = TABS.map(([k]) => {
    const m = TAB_META[k];
    return `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${ico(m.ico)}${T(m.label)}</button>`;
  }).join('');
  const sheet = eventSheet();
  document.body.classList.toggle('has-sheet', !!sheet);
  app.innerHTML = `<div class="play-layout">
    <div class="play-hub">${header()}${ageDock()}</div>
    <div class="play-main"><div class="tabs">${tabs}</div><div class="play-body">${body()}</div></div>
    ${sidePeek()}
  </div><div class="end-pad" aria-hidden="true"></div>${sheet}`;
  const j = $('#jr'); if (j) j.scrollTop = j.scrollHeight; save();
  paintAmbient(s.region || 'hearthfold', tab);
}
app.addEventListener('click', (ev) => {
  const b = ev.target.closest('button'); if (!b || b.disabled) return; const a = b.dataset.a, v = b.dataset.v; let r;
  if (b.dataset.tab) tab = b.dataset.tab;
  else if (a === 'age') E.ageUp(s);
  else if (a === 'ch') { r = E.resolve(s, +v); if (r) toast((r.success === false ? '✗ ' : '') + r.msg); }
  else if (a === 'train') r = E.train(s, v); else if (a === 'job') r = E.takeJob(s, v); else if (a === 'quit') E.quitJob(s); else if (a === 'work') r = E.workHard(s);
  else if (a === 'adv') r = E.adventure(s); else if (a === 'rest') r = E.rest(s); else if (a === 'route') E.chooseRoute(s, v);
  else if (a === 'soc') r = E.socialize(s, v); else if (a === 'friend') r = E.meetSomeone(s, false); else if (a === 'love') r = E.meetSomeone(s, true); else if (a === 'travel') r = E.travel(s, v);
  else if (a === 'reinc') { s = E.reincarnate(meta, s, v, (Math.random() * 2 ** 31) | 0); tab = 'life'; }
  else if (a === 'heir') { s = E.continueAsHeir(meta, s, v, (Math.random() * 2 ** 31) | 0); tab = 'life'; }
  if (r && r.ok === false) toast(r.msg); else if (r && a !== 'ch' && r.msg && a !== 'adv') toast(r.msg);
  render();
});
function startAmbient() {
  mountAmbient({ realm: (s && s.region) || 'hearthfold', tab: document.body.dataset.tab || 'life' });
}
(async () => {
  setChrome('gate');
  app.innerHTML = `<div class="card panel-gate"><div class="card-body"><p class="sub">Checking access…</p></div></div>`;
  const acc = await checkAdminAccess();
  if (!acc.ok) { setChrome('gate'); app.innerHTML = gateHTML(acc.reason); return; }
  P = await loadPack(); E.setPack(P); meta = JSON.parse(localStorage.getItem(META) || '{}');
  if (!Q.has('fresh')) try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { s = null; }
  startAmbient(); mountInfoClicks(document);
  if (s) render(); else if (!localStorage.getItem(SEEN) && !Q.has('skipintro')) cold(); else fateScreen();
})();
