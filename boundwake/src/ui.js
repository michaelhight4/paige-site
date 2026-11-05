// Boundwake UI shell — studio standard pass (Nov 5, 2026 CT).
// Craft: Lifeline docked Age + per-menu hue bars; Boundwake parchment/realm identity.
import { loadPack } from './pack.js';
import * as E from './bw_engine.js';
import { ico, esc, flare, oddsChip, statLabel, infoChip, skillIco } from './flare.js';
import { mountInfoClicks, openInfo } from './info.js';
import { checkAdminAccess, gateHTML, isLocalHost } from './admingate.js';
import { mountAmbient, paintAmbient } from './ambient.js';
import { mountMusic, syncMusic, toggleMute, musicToggleHTML, unlockMusic } from './music.js';
const $ = (sel) => document.querySelector(sel), app = $('#app');
const KEY = 'bw.save.v1', META = 'bw.meta.v1', SEEN = 'bw.cold.v1';
const Q = new URLSearchParams(location.search);
let P, s, meta, tab = 'life', fate;
const T = (k) => P.terms.ui[k] || k;
const GRID = 'assets/sprites_192/grid/';
const ROSTER = 'assets/sprites_192/roster/';
const UIICO = 'assets/icons/ui/';
function ensureTourMotion() {
  if (document.getElementById('bw-tourney-motion')) return;
  const l = document.createElement('link'); l.id = 'bw-tourney-motion'; l.rel = 'stylesheet';
  l.href = 'assets/ui_motion/tournament_motion.css'; document.head.append(l);
}
function pauseMotionOnHide() {
  const apply = () => { document.documentElement.dataset.motion = document.hidden ? 'paused' : (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : ''); };
  if (!window.__bwMotionVis) { window.__bwMotionVis = 1; document.addEventListener('visibilitychange', apply); apply(); }
}
function rosterBust(m) {
  if (m?.isPlayer) return '';
  const n = Math.max(1, Math.min(4, m?.bust || ((parseInt(String(m?.id || '').replace(/\D/g, ''), 10) || 1) % 4) + 1));
  return `<img class="roster-bust" src="${ROSTER}adventurer_${n}.png" alt="" width="40" height="40" loading="lazy" onerror="this.remove()">`;
}
function markImg(kind) {
  // prefer icons/ui; guild/ mirror is fallback
  const file = kind === 'guild' ? 'guild_crest.png' : 'tournament_banner.png';
  return `<img class="bw-mark" src="${UIICO}${file}" alt="" width="28" height="28" loading="lazy" onerror="this.src='assets/guild/${file}';this.onerror=null">`;
}
function bannerHTML(variant, label) {
  ensureTourMotion(); pauseMotionOnHide();
  return `<div class="bw-banner bw-banner--${variant}"><div class="bw-banner-flag"><img src="assets/ui_motion/banner_pennant.svg" alt="" width="28" height="40">${esc(label)}</div></div>`;
}
function renownChip(label, val) {
  return `<span class="bw-renown-chip bar-renown" data-renown-host="1"><b>${esc(label)}</b> ${Math.round(val)}<span class="bw-renown-tick-up" aria-hidden="true"></span><i class="bw-renown-burst" aria-hidden="true"></i></span>`;
}
function victoryShell(inner) {
  return `<div class="bw-victory-sparkle" data-victory-host="1"><div class="bw-victory-burst" aria-hidden="true">${Array(8).fill('<span class="bw-victory-confetti"></span>').join('')}</div>${inner}</div>`;
}
function fireRenownTick(host, delta) {
  if (!host || !delta) return;
  let up = host.querySelector('.bw-renown-tick-up');
  if (!up) { up = document.createElement('span'); up.className = 'bw-renown-tick-up'; host.append(up); }
  up.textContent = (delta >= 0 ? '+' : '') + delta;
  host.classList.remove('is-ticking'); void host.offsetWidth; host.classList.add('is-ticking'); up.classList.add('is-ticking');
  const clear = () => { host.classList.remove('is-ticking'); up.classList.remove('is-ticking'); };
  host.addEventListener('animationend', clear, { once: true }); setTimeout(clear, 900);
}
function fireVictory(card) {
  if (!card) return;
  card.classList.remove('is-victorious'); void card.offsetWidth; card.classList.add('is-victorious');
  const clear = () => card.classList.remove('is-victorious');
  card.addEventListener('animationend', clear, { once: true }); setTimeout(clear, 1600);
}
function consumeMotionFlags() {
  if (!s?.flags) return;
  requestAnimationFrame(() => {
    if (s.flags.ui_renown_delta) {
      const host = document.querySelector('[data-renown-host]');
      if (host) fireRenownTick(host, s.flags.ui_renown_delta);
      s.flags.ui_renown_delta = 0;
    }
    if (s.flags.ui_victory) {
      const card = document.querySelector('[data-victory-host]');
      if (card) fireVictory(card);
      s.flags.ui_victory = 0;
    }
    if (s.flags.ui_twin_banners) { toast('Twin banners'); s.flags.ui_twin_banners = 0; }
  });
}

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
  work: 'Everyday chores and guild boards alike. Earn your keep — or leave the post.',
  adv: 'Roads remember feet that dare them. Pack light; come home heavier.',
  skills: 'First lesson sinks deep; later ones strain you. Pillars ask more of long lives.',
  bonds: 'Faces around the hearth. Party, housemates, and coworkers gain Passive Relationship Growth when temperaments match — Spend time still mends clashes.',
  realms: 'Five realms, one map. Visit places where you stand; travel to open new ground.',
  codex: 'What the world taught you stays — even when the body does not.',
  bel: 'Gold, relics, workshops, and the notice boards that carry your name. Gear shop: buy, equip, and sell.',
};
const HD = {
  life: `${ico('spirit')} Journal`,
  work: `${ico('work')} Work &amp; wages`,
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
  try { syncMusic('fate', document.documentElement.dataset.tod); } catch (_) {}
  if (!document.querySelector('.music-fab')) { const fab = document.createElement('div'); fab.className = 'music-fab'; fab.innerHTML = musicToggleHTML(); document.body.append(fab); }
  $('#go').onclick = () => { s = E.begin(fate, meta); tab = 'life'; save(); render(); };
  $('#rr').onclick = () => fateScreen(0);
}
function header() {
  const st = E.stage(s), r = E.race(s), j = s.job && P.occ.jobs[s.job.id];
  const mana = s.flags.mana_awakened
    ? bar('mana', (100 * (s.mana||0)) / Math.max(1, s.manaMax||1), 'magic bar-mana', `${Math.floor(s.mana||0)}/${Math.floor(Math.max(s.manaMax||0,1))}`)
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
  const h = E.hage(s); // portrait/life-stage feel
  const ca = E.cage(s); // calendar age for all player gates (matches Age N UI)
  const lead = (k) => `<p class="menu-lead">${LEAD[k] || ''}</p>`;
  if (tab === 'life') {
    const byAge = []; for (const l of s.log.slice(-80)) { const a = Math.floor(l.age); if (!byAge.length || byAge.at(-1)[0] !== a) byAge.push([a, []]); if (l.kind !== 'year') byAge.at(-1)[1].push(l.text); }
    const lifeShortcuts = `<div class="life-shortcuts" role="navigation" aria-label="Quick links">
      <button type="button" data-tab="skills">${ico('skill')} Skills</button>
      <button type="button" data-tab="adv">${ico('adventure')} Adventure</button>
      <button type="button" data-tab="realms">${ico('realm')} Realms</button>
      <button type="button" data-tab="bonds">${ico('bond')} Bonds</button>
      <button type="button" data-tab="work">${ico('work')} Work</button>
      <button type="button" data-a="rest" ${s.budget.act < 1 ? 'disabled' : ''}>${ico('spirit')} Rest</button>
    </div>`;
    const tourneyBanner = E.isTournamentYear(s)
      ? card('life', `${ico('adventure')} Tournament year`, `<p class="sub">Bracket <b>${esc(E.tourneyBracket(s)?.label || '')}</b> meets are open — enter from Adventure (1 action). Strong places draw academies, tutors, and blade halls.</p><div class="actions"><button data-tab="adv">Open Adventure</button></div>`)
      : (E.tournamentInvites(s).length
        ? card('life', `${ico('adventure')} Hall invitations`, `<p class="sub">${E.tournamentInvites(s).map((i) => esc(i.name)).join(', ')} await your answer on Adventure.</p><div class="actions"><button data-tab="adv">Open Adventure</button></div>`)
        : '');
    const route = !s.route && ca >= 8 ? card('life', `${ico('adventure')} Choose your path`, `<p class="sub">Primary skills grow +25% faster.</p><div class="actions">${['route_magic', 'route_sword', 'route_hybrid', 'route_craft'].map((r) => `<button data-a="route" data-v="${r}">${flare(r.replace('route_', ''))}</button>`).join('')}</div>`) : '';
    const journal = route + card('life', HD.life, `${lead('life')}<div class="journal" id="jr">${byAge.map(([a, ls]) => `<p class="y">${T('year_verb')} ${a}</p>${ls.map((t) => `<p>${flare(t)}</p>`).join('')}`).join('')}</div>
      <div class="actions"><button data-a="rest" class="ghost">Rest by the pond</button></div>`);
    // Pack panels (ailments / pastimes / activities / soft law) — additive
    const ailRows = (s.ailments || []).map((d) => {
      const def = E.ailmentDef(d.id); if (!def) return '';
      return `<div class="row"><div><b>${esc(def.name)}</b> <small>${esc(def.sev)}${d.dx ? '' : ' · undiagnosed'}${d.treated ? ' · treating' : ''}</small></div></div>`;
    }).join('') || '<div class="empty">No ailments right now.</div>';
    const ailCard = card('life', `${ico('health')} Ailments`, `${ailRows}<div class="actions"><button data-a="healer" ${s.budget.act < 1 ? 'disabled' : ''}>Visit a healer (12 gold)</button></div>`);
    const pl = E.passionList(s);
    const pastActive = (pl.active || []).map((p) => `<div class="row"><div><b>${esc(p.def?.name || p.id)}</b> <small>meter ${Math.floor(p.meter)}</small></div><button data-a="prac" data-v="${p.id}" ${s.budget.act < 1 ? 'disabled' : ''}>Practice</button></div>`).join('');
    const pastAvail = (pl.available || []).slice(0, 8).map((p) => `<button data-a="adopt" data-v="${p.id}" ${pl.free < 1 ? 'disabled' : ''}>${esc(p.name)}</button>`).join('');
    const pastCard = card('life', `${ico('spirit')} Pastimes`, `<p class="sub">${pl.free} free slot(s). Master two to open more (max 4).</p>${pastActive || '<div class="empty">No pastime yet.</div>'}<div class="actions">${pastAvail || ''}</div>`);
    const actCats = E.activityCategories(s).map((c) => {
      const acts = c.activities.filter((a) => h >= a.minAge).map((a) => {
        const ch0 = a.choices[0]; const cost = ch0?.cost || 0;
        return `<div class="row"><div><b>${esc(a.name)}</b> <small>${esc(a.sub)}${cost ? ` · ${cost} gold` : ''}</small></div><button data-a="actv" data-v="${a.id}" ${s.budget.act < 1 || s.gold < cost ? 'disabled' : ''}>Do</button></div>`;
      }).join('');
      return acts ? card('life', `${c.icon || ''} ${esc(c.name)}`, acts) : '';
    }).join('');
    const crimes = E.lawAvailable(s);
    const lawCard = crimes.length ? card('life', `${ico('strain')} Realm law (shadow)`, `<p class="sub">Quiet choices with loud consequences. Catch risk rises with a record.</p>${crimes.map((c) => `<div class="row"><div><b>${esc(c.name)}</b> <small>severity ${c.severity}</small></div><button data-a="crime" data-v="${c.id}" ${s.budget.act < 1 ? 'disabled' : ''}>Attempt</button></div>`).join('')}`) : '';
    const pa = E.prisonActions(s);
    const prisonCard = s.prison ? `<div class="pack-polish-prison">${card('life', `${ico('strain')} Imprisoned`, `<p class="sub">${esc(E.tierDef(s.prison.tier)?.name || s.prison.tier)} · ${s.prison.left.toFixed(1)} years left · conduct ${pa.conduct}. Age +1 advances the sentence.</p>
      <div class="row"><div><b>Behave</b> <small>build conduct; parole after half the term</small></div><button data-a="pbehave" ${pa.behave ? '' : 'disabled'}>Behave</button></div>
      <div class="row"><div><b>Appeal</b> <small>${ico('gold')}${pa.appealCost} · once per sentence${s.prison.appealed ? ' · heard' : ''}</small></div><button data-a="pappeal" ${pa.appeal ? '' : 'disabled'}>Appeal</button></div>
      <div class="row"><div><b>Escape</b> <small>~${Math.round(pa.escapeOdds * 100)}% base · failure adds years</small></div><button data-a="pescape" ${pa.escape ? '' : 'disabled'}>Escape</button></div>`)}</div>` : '';
    return journal + prisonCard + ailCard + pastCard + actCats + lawCard;
  }
  if (tab === 'work') {
    if (ca < 6 && !s.job) return card('work', HD.work, `${lead('work')}<div class="empty">Chores wait until you can reach the counter (age 6+).${s.school ? ' You attend Village lessons.' : ''}</div>`);
    const cur = s.job ? (() => { const j = P.occ.jobs[s.job.id], c = E.careerOf(j.id), nx = j.next && P.occ.jobs[j.next];
      return card('work', `${ico('work')} ${esc(j.title)}`, `${lead('work')}<p class="sub">${flare(c.blurb)}</p>
       <p>Wage <span class="gold-line">${ico('gold')}${j.wage} ${T('currency')}/yr</span> · Years ${s.job.years} · Performance ${Math.round(s.job.perf)}</p>
       ${nx ? `<p class="sub">Next rank: <b>${esc(nx.title)}</b> — ${nx.req.years} yrs${Object.entries(nx.req.skills).map(([k, v]) => `, ${flare(P.skills.skills.find((x) => x.id === k).name)} ${v}`).join('')}</p>` : '<p class="sub">Top of your craft.</p>'}
       <div class="actions"><button data-a="work" class="primary">Work hard (${esc(c.actions[0])}…)</button> <button data-a="quit" class="ghost">Leave post</button></div>`); })() : card('work', HD.work, lead('work'));
    const opens = E.openings(s);
    const row = ({ job, career: c, ok }) => {
      const tags = c.tags || [];
      const kind = (tags.includes('ordinary') || c.id === 'farmer' || c.id === 'merchant') ? 'Everyday' : (tags.includes('guild') || tags.includes('academy') || tags.includes('special') ? 'Guild track' : 'Trade');
      const why = ok ? '' : (E.jobLockReason(s, job) || 'Locked');
      return `<div class="row row-job${ok ? '' : ' locked'}"><div><b>${esc(job.title)}</b> <small>· ${esc(c.name)} · ${kind}</small><br><small>${flare(c.blurb)} · ${ico('gold')}${job.wage} ${T('currency')}/yr<br>${flare(c.unlock_text)}</small>${why ? `<br><small class="lock-why">${esc(why)}</small>` : ''}</div><button data-a="job" data-v="${job.id}" ${ok ? '' : 'disabled'} title="${esc(why)}">${ok ? 'Join' : 'Locked'}</button></div>`;
    };
    const everyday = opens.filter(({ career: c }) => (c.tags || []).includes('ordinary') || c.id === 'farmer' || c.id === 'merchant');
    const guild = opens.filter((o) => !everyday.includes(o));
    const boardEveryday = everyday.length ? everyday.map(row).join('') : '<div class="empty">No everyday openings.</div>';
    const boardGuild = guild.length ? guild.map(row).join('') : '<div class="empty">No guild tracks open.</div>';
    const openOpenings = !s.job; // looking for work → openings expanded; employed → collapsed so Workshops/Court/Mentors stay reachable
    const openSecondary = !!s.job; // when employed, surface workshops/court/mentors
    const acc = (id, title, body, open) => `<details class="work-acc panel-work"${open ? ' open' : ''} data-work-acc="${id}"><summary class="work-acc-hd">${title}</summary><div class="work-acc-body">${body}</div></details>`;
    const openingsAcc = acc('openings', `${ico('work')} Openings <small>${opens.length} listed${s.job ? ' · tap to browse' : ''}</small>`,
      `${everyday.length ? `<h3>${ico('work')} Everyday work</h3>${boardEveryday}` : ''}${guild.length ? `<h3>${ico('adventure')} Guild &amp; trained tracks</h3>${boardGuild}` : ''}${!opens.length ? '<div class="empty">No openings this year.</div>' : ''}`,
      openOpenings);
    const owned = (s.workshops || []).map((w) => {
      const t = P.workshops?.types?.[w.type] || {}; const st = w.staff || {}, ups = w.upgrades || [];
      const staffRows = (t.staffRoles || []).map((r) => `<div class="row"><div><small>${esc(r.name)} ${st[r.id] || 0}/${r.cap} · ${r.wage} gold/yr</small></div><span><button data-a="hire" data-w="${w.id}" data-v="${r.id}" ${(st[r.id] || 0) >= r.cap ? 'disabled' : ''}>Hire</button>${st[r.id] ? `<button data-a="fire" data-w="${w.id}" data-v="${r.id}">Let go</button>` : ''}</span></div>`).join('');
      const upRows = (t.upgrades || []).map((u) => `<div class="row"><div><small>${esc(u.name)} · ${ico('gold')}${u.cost}</small></div><button data-a="wup" data-w="${w.id}" data-v="${u.id}" ${ups.includes(u.id) || s.gold < u.cost ? 'disabled' : ''}>${ups.includes(u.id) ? 'Built' : 'Build'}</button></div>`).join('');
      return `<div class="row"><div><b>${esc(t.name || w.type)}</b> <small>yr ${w.years} · renown ${Math.round(w.renown)}</small></div></div>${staffRows ? `<h3>Staff</h3>${staffRows}` : ''}${upRows ? `<h3>Upgrades</h3>${upRows}` : ''}`;
    }).join('') || '<div class="empty">No workshop yet.</div>';
    const buy = E.workshopTypes(s).filter((t) => t.ok || ca >= t.minAge).slice(0, 12).map((t) => `<div class="row"><div><b>${esc(t.name)}</b> <small>${ico('gold')}${t.fee} · age ${t.minAge}+</small><br><small>${flare(t.blurb)}</small></div><button data-a="buybiz" data-v="${t.id}" ${t.ok ? '' : 'disabled'}>${t.ok ? 'Open' : 'Locked'}</button></div>`).join('');
    const bizAcc = acc('workshops', `${ico('gold')} Workshops &amp; stalls <small>${(s.workshops || []).length ? (s.workshops.length + ' owned') : 'start one'}</small>`,
      `${owned}<h3>Open a workshop</h3>${buy || '<div class="empty">None affordable yet.</div>'}`, openSecondary);
    const courtSeat = s.court?.seat ? `<p class="sub">Holding <b>${esc(s.court.name)}</b> · ${Math.ceil(s.court.termLeft)} yr left · tier ${s.court.tier}</p>` : (s.court?.tier ? `<p class="sub">Former officeholder · tier ${s.court.tier} kept.</p>` : '<p class="sub">No seat yet. File when you have age, coin, and renown.</p>');
    const seats = E.courtOpenings(s).map((x) => `<div class="row"><div><b>${esc(x.name)}</b> <small>tier ${x.tier} · file ${x.filing} gold · age ${x.minAge}+</small></div><button data-a="courtpick" data-v="${x.id}" ${s.budget.act < 1 || s.gold < x.filing ? 'disabled' : ''}>Campaign</button></div>`).join('');
    const cq = courtPick && E.campaignQuestion(s); const cseat = courtPick && (P.court?.slots || []).find((x) => x.id === courtPick);
    const campaign = cq && cseat ? `<div class="pack-polish-campaign"><h3>${ico('renown')} Campaign for ${esc(cseat.name)}</h3><p class="prompt">${flare(cq.text)}</p><div class="choices">${cq.choices.map((c, i) => `<button data-a="courtans" data-v="${i}">${flare(c.label)}</button>`).join('')}<button data-a="courtpick" data-v="">Withdraw</button></div></div>` : '';
    const courtAcc = acc('court', `${ico('renown')} Court &amp; moot <small>${s.court?.seat ? 'in office' : 'file'}</small>`,
      `${courtSeat}${campaign}${seats || '<div class="empty">No seats open for you this year.</div>'}`, openSecondary);
    const ment = s.mentor
      ? `<p class="sub">Path: <b>${esc(P.mentors?.paths?.[s.mentor.path]?.name || s.mentor.path)}</b> · role ${esc(s.mentor.role)} · ${s.mentor.years} yrs</p><div class="actions"><button data-a="mdrill" ${s.budget.act < 1 ? 'disabled' : ''}>Mentor drill</button></div>`
      : `<p class="sub">Enroll with a path mentor (sword, spell, craft, hunt).</p><div class="actions">${E.mentorPaths().map((m) => `<button data-a="mentor" data-v="${m.id}" ${s.budget.act < 1 || ca < 10 ? 'disabled' : ''}>${esc(m.name)}</button>`).join('')}</div>`;
    const mentAcc = acc('mentors', `${ico('adventure')} Mentors <small>${s.mentor ? 'enrolled' : 'paths'}</small>`, ment, openSecondary);
    const clubs = E.clubList(s).filter((c) => !(s.clubs || []).includes(c.id)).map((c) => `<button data-a="club" data-v="${c.id}">${esc(c.name)}</button>`).join('');
    const pWin = E.patronageWindow(s), pHeld = E.ensurePatronage(s).active;
    const pRows = pWin ? E.listPatronage(s).filter((g) => !g.held).map((g) => `<div class="row"><b>${esc(g.name)}</b> <small>${Math.round(g.pct * 100)}% · ${g.years}y · ~${g.worth}g/yr</small><br><span class="sub">${g.missing.length ? 'Needs: ' + esc(g.missing.join(', ')) : g.tried ? 'Applied this year.' : 'Odds ~' + g.odds + '%'}</span> <button data-a="patron" data-v="${g.id}"${g.eligible ? '' : ' disabled'}>Apply</button></div>`).join('') : '';
    const patronHtml = `<div class="pack-polish-inset"><h4>Patronage grants${pWin ? ' <small>' + (pWin === 'academy' ? 'Academy' : 'Primer') + ' window</small>' : ''}</h4>`
      + (pHeld.length ? `<p class="sub">Held: ${pHeld.map((g) => `${esc(g.name)} (${g.yearsLeft}y left)`).join(', ')}.</p>` : '')
      + (pWin ? pRows || '<span class="sub">No grants to apply for.</span>' : '<p class="sub">Open ages 11–16 (Primer) and 16–22 (Academy).</p>') + '</div>';
    const clubCard = (ca >= 9 && ca <= 22) ? acc('circles', `${ico('wits')} Circles &amp; patronage <small>${(s.clubs || []).length || 'join'}</small>`,
      `<p class="sub">Joined: ${(s.clubs || []).map(esc).join(', ') || 'none'}.</p><div class="actions">${clubs || '<span class="sub">No open circles.</span>'}</div>${patronHtml}`, false) : '';
    // Adventure guild hall (Game Dev balance · World Design venues)
    let guildBody = '';
    if (!s.guild) {
      const gate = E.canFoundGuild(s, s.region);
      const cost = gate.cost || 150;
      guildBody = `${bannerHTML('guild', 'Guild hall')}<p class="sub">${markImg('guild')} Own one hall. Adventurers take jobs for a yearly fee — higher fee means more jobs and stronger hires. Unlock age 18+. Clerk writs welcome.</p>
        <div class="actions"><button data-a="gfound" data-v="${esc(s.region)}" ${gate.ok ? '' : 'disabled'} title="${esc(gate.ok ? '' : (gate.msg || ''))}">Open hall here (${cost}g + 1 act)</button></div>
        ${gate.ok ? '' : `<p class="sub lock-why">${esc(gate.msg || '')}</p>`}`;
    } else {
      const g = s.guild;
      const fee = ['Low 20', 'Mid 50', 'High 100'][g.feeTier] || 'Mid';
      const roster = (g.roster || []).map((m) => `<div class="row roster-row"><div>${rosterBust(m)}<div><b>${esc(m.name)}</b> <small>power ${m.power}${m.injuredUntil > E.cage(s) ? ' · injured' : ''}</small></div></div>
        <button data-a="gfire" data-v="${m.id}">Release</button></div>`).join('') || '<div class="empty">No adventurers hired.</div>';
      const hireTier = E.guildHireTier(s);
      const hireCost = [30, 55, 90, 140][hireTier];
      const seizeRow = g.seized ? `<p class="sub">Rival hall-master holds the hall. Reclaim: <button data-a="greclaim" data-v="buyback">Buy-back</button> <button data-a="greclaim" data-v="challenge">Challenge meet</button></p>` : '';
      const handC = E.handoffCandidates(s, 'guild');
      const handRow = (!g.seized && (E.cage(s) >= 50 || handC.length)) ? `<div class="actions"><small>Handoff (heir→apprentice→captain):</small>${handC.map((c)=>`<button data-a="ghand" data-v="${c.id}">${esc(c.name)} (${esc(c.role)})</button>`).join('')}</div>` : '';
      const crossNote = E.crossActive(s) ? `<p class="sub">Cross banners on — team fame softens hire costs &amp; job odds.</p>` : '';
      guildBody = `${bannerHTML('guild', E.guildLabel(s))}${seizeRow}<p class="sub">${markImg('guild')}<b>${esc(E.guildLabel(s))}</b> · stage ${esc(g.stage || 'founding')} in ${esc((P.regions.find(r=>r.id===g.realmId)||{}).name || g.realmId)} · ${renownChip('renown', g.renown)} · coffer ${Math.floor(g.coffer)} gold · fee <b>${fee}</b>/adv/yr · jobs ok ${g.jobsDone || 0} / fail ${g.jobsFailed || 0}</p>${crossNote}
        <div class="actions">
          <button data-a="gfee" data-v="0" ${g.feeTier===0?'disabled':''}>Fee Low</button>
          <button data-a="gfee" data-v="1" ${g.feeTier===1?'disabled':''}>Fee Mid</button>
          <button data-a="gfee" data-v="2" ${g.feeTier===2?'disabled':''}>Fee High</button>
        </div>
        <h3>${ico('adventure')} Roster (${(g.roster||[]).length}/6)</h3>${roster}
        <div class="actions"><button data-a="ghire" ${(g.roster||[]).length>=6 || s.gold < hireCost ? 'disabled' : ''}>Hire (${hireCost}g · tier ${hireTier})</button>
          <button data-a="gwithdraw" ${!(g.coffer>0) || s.budget.act < 1 ? 'disabled' : ''}>Withdraw coffer (1 act)</button>
          <button data-a="gclose" class="ghost">Close hall</button></div>
        ${handRow}<p class="sub">Jobs resolve on Age +1. Fees from coffer first, then purse. Halls: Mossbeam / Tidebell / Reedlodge / Quillkey / Cinderhorn.</p>`;
    }
    const guildAcc = acc('guild', `${markImg('guild')} Adventure guild hall <small>${s.guild ? E.guildLabel(s) : (ca >= 18 ? 'open one' : 'age 18+')}</small>`, guildBody, !!s.guild || ca >= 18);
    return cur + openingsAcc + bizAcc + guildAcc + courtAcc + mentAcc + clubCard;
  }
  if (tab === 'adv') {
    const party = E.partyOf(s);
    const partyBlock = party.length
      ? `<div class="party-list"><p class="sub"><b>Traveling with you</b> (Passive Relationship Growth each year)</p>${party.map((p) => `<div class="row"><div><b>${esc(p.first)}</b> <small>${esc(p.rel)} · closeness ${Math.round(p.bar)}</small></div><button data-a="party" data-v="${p.id}">Leave party</button></div>`).join('')}</div>`
      : `<p class="sub">No companions yet. Add someone from Bonds — up to ${E.PARTY_CAP} in your party. Shared roads keep those bonds warm without spending Social.</p>`;
    const offers = E.tournamentOffers(s);
    const br = E.tourneyBracket(s);
    const inv = E.tournamentInvites(s);
    const tourneyCard = E.isTournamentYear(s)
      ? card('adv', `<img class="tourney-banner-ico" src="assets/icons/ui/tournament_banner.png" alt="" width="24" height="24" onerror="this.remove()"> Tournaments · bracket ${esc(br?.label || '—')}`,
          `${bannerHTML('tourney', 'Tournament year')}<p class="sub">Meets every 3 years. Entry costs <b>1 action</b>. Place for gold &amp; renown — strong finishes draw academies, tutors, and blade halls.</p>
           ${offers.length ? offers.map((o) => `<div class="row"><div><b>${esc(o.title)}</b> <small>${esc(o.skillName)} · ${esc(o.bracket)}</small><br><small>${esc(o.blurb)}</small></div>
             <button data-a="tourney" data-v="${o.id}" ${s.budget.act < 1 ? 'disabled' : ''}>Enter</button></div>`).join('')
             : '<div class="empty">Train a competing skill (blade, spark, cook, smith, marks…) then return.</div>'}
           ${inv.length ? `<h3>Invitations</h3>${inv.map((i) => `<div class="row"><div><b>${esc(i.name)}</b> <small>${esc(i.kind)}</small></div><button data-a="tinvite" data-v="${i.id}" ${s.budget.act < 1 ? 'disabled' : ''}>Answer</button></div>`).join('')}` : ''}`)
      : (inv.length
        ? card('adv', `${ico('adventure')} Invitations`, inv.map((i) => `<div class="row"><div><b>${esc(i.name)}</b> <small>${esc(i.kind)}</small></div><button data-a="tinvite" data-v="${i.id}" ${s.budget.act < 1 ? 'disabled' : ''}>Answer</button></div>`).join(''))
        : (E.cage(s) % 3 === 2
          ? card('adv', `${ico('adventure')} Tournaments`, `<p class="sub">Lists open next year (every 3 human-years). Train now — brackets 1–8 / 8–15 / 16+ (age 8 starts middle).</p>`)
          : ''));
    // Tournament team (Game Dev balance · World Design meet venues)
    let teamCard = '';
    if (ca >= 16 || s.team) {
      if (!s.team) {
        const rec = E.teamRecommendedAffinities();
        const picks = rec.map((id) => {
          const sk = P.skills.skills.find((x) => x.id === id);
          const v = s.skills[id] || 0;
          const ok = v >= 20 && s.gold >= 80 && s.budget.act >= 1;
          return `<button data-a="tfound" data-v="${id}" ${ok ? '' : 'disabled'}>${esc(sk?.name || id)} (${Math.floor(v)})${v < 20 ? ' · need 20' : ''}</button>`;
        }).join('');
        teamCard = card('adv', `${markImg('team')} Tournament team`,
          `${bannerHTML('team', 'Tournament team')}<p class="sub">Register with the Clerk of Meets — one skill affinity (80 gold + 1 act). Realm meets: Visit Ribbon Green / Saltpier Ring / Stakeline / Crestfall / Sparkfield. Grand <b>Teams</b> bracket every 3 years.</p>
           <div class="actions">${picks}</div>`);
      } else {
        const tm = s.team;
        const skName = P.skills.skills.find((x) => x.id === tm.affinitySkill)?.name || tm.affinitySkill;
        const roster = (tm.roster || []).map((m) => `<div class="row roster-row"><div>${rosterBust(m)}<div><b>${esc(m.name)}</b> <small>${m.isPlayer ? 'captain · ' : ''}power ${Math.floor(m.power)}</small></div></div>
          <button data-a="tfire" data-v="${m.id}">${m.isPlayer ? 'Step down' : 'Release'}</button></div>`).join('') || '<div class="empty">Empty roster — hire or captain.</div>';
        const meetGate = E.canEnterRealmMeet(s);
        const grandGate = E.canEnterTeamGrand(s);
        const hasCap = (tm.roster || []).some((m) => m.isPlayer);
        const tSeize = tm.seized ? `<p class="sub">Rival holds the team. <button data-a="treclaim" data-v="buyback">Buy-back</button> <button data-a="treclaim" data-v="challenge">Challenge meet</button></p>` : '';
        const tHand = E.handoffCandidates(s, 'team');
        const tHandRow = (!tm.seized && (ca >= 50 || tHand.length)) ? `<div class="actions"><small>Handoff (heir→apprentice→captain):</small>${tHand.map((c)=>`<button data-a="thand" data-v="${c.id}">${esc(c.name)} (${esc(c.role)})</button>`).join('')}</div>` : '';
        const crossT = E.crossActive(s) ? `<p class="sub">Cross banners on — hall renown steadies the lists (power +${E.guildToTeamPowerBonus(s, s.region)}).</p>` : '';
        teamCard = victoryShell(card('adv', `${markImg('team')} Team · ${esc(tm.name)}`,
          `${bannerHTML('team', tm.name)}${tSeize}<p class="sub">Affinity <b>${esc(skName)}</b> · stage ${esc(tm.stage || 'founding')} · ${renownChip('renown', tm.renown)} · power ${Math.round(E.teamPower(s))} · wins realm ${tm.wins?.realm || 0} / grand ${tm.wins?.grand || 0} · roster ${(tm.roster||[]).length}/4</p>${crossT}
           ${roster}
           <div class="actions">
             <button data-a="thire" ${(tm.roster||[]).length >= 4 || s.gold < 25 ? 'disabled' : ''}>Hire NPC (25g)</button>
             <button data-a="tcaptain" data-v="${hasCap ? '0' : '1'}" ${(!hasCap && ((s.skills[tm.affinitySkill]||0) < 20 || (tm.roster||[]).length >= 4)) ? 'disabled' : ''}>${hasCap ? 'Leave captain slot' : 'Join as captain'}</button>
             <button data-a="tdrill" ${s.flags.team_drill_year || s.budget.act < 1 ? 'disabled' : ''}>Team drill (1 act)</button>
             <button data-a="tdisband" class="ghost">Disband</button>
           </div>
           <h3>Realm meets</h3>
           <p class="sub">${s.flags.meet_venue_ready ? `Lists ready at <b>${esc(String(s.flags.meet_venue_ready))}</b>.` : (s.flags.notice_team_meet ? 'A notice-board invite is waiting.' : 'Visit a Tournament/Arena venue first (or notice invite). Max 2/year.')}</p>
           <div class="actions"><button data-a="tmeet" ${meetGate.ok ? '' : 'disabled'} title="${esc(meetGate.ok?'':meetGate.msg)}">Enter realm meet (10g + 1 act)</button></div>
           ${E.isTournamentYear(s) ? `<h3>Grand Teams bracket</h3>
             <p class="sub">Beside Blade/Spark/craft. Meet judges watch the lists. Need roster 2+, renown 5+ or a realm win.</p>
             <div class="actions"><button data-a="tgrand" class="primary" ${grandGate.ok ? '' : 'disabled'} title="${esc(grandGate.ok?'':grandGate.msg)}">Enter Teams (20g + 1 act)</button></div>` : ''}
           ${tHandRow}`));
      }
    }
    return tourneyCard + teamCard + card('adv', HD.adv, `${lead('adv')}<p class="sub">${ca < 10 ? 'The road is for older feet (age 10+).' : flare(`Take to the paths of ${E.regionOf(s).name}. Combat, ruins and rare delves. ${s.budget.adv} left this year.`)}</p>
    ${partyBlock}
    <div class="actions"><button data-a="adv" class="primary" ${E.canAdventure(s) ? '' : 'disabled'}>Set out</button></div>`);
  }
  if (tab === 'skills') {
    const why = (id) => E.trainLockReason(s, id);
    const manaCard = card('skills', `${ico('mana')} Mana &amp; craft`,
      s.flags.mana_awakened
        ? `<p class="sub">Mana <b>${Math.floor(s.mana)}</b> / <b>${Math.floor(Math.max(s.manaMax || 0, 1))}</b>. School: <b>${esc((P.styles||[]).find(x=>x.id===s.magicSchool)?.name || 'none yet')}</b>. Sword style: <b>${esc((P.styles||[]).find(x=>x.id===s.swordStyle)?.name || 'none yet')}</b>.</p>
           <div class="actions"><button data-a="cast" class="primary" ${s.budget.act < 1 || s.mana < 5 || !s.magicSchool ? 'disabled' : ''}>Practice magic (5 mana)</button>
           <button data-a="drill" ${s.budget.act < 1 || !s.swordStyle ? 'disabled' : ''}>Drill sword forms</button></div>`
        : `<p class="sub">Mana sleeps. From age 6: <b>Attempt awakening</b> here, or Visit an Academy in Realms. Spark-born wakes it at birth.</p>
           <div class="actions"><button data-a="awaken" class="primary" ${s.budget.act < 1 || ca < 6 ? 'disabled' : ''}>Attempt mana awakening${ca < 6 ? ' (age 6+)' : ''}</button></div>`);
    const stylePick = (!s.swordStyle && ca >= 8)
      ? card('skills', `${ico('swordsmanship')} Sword style`, `<p class="sub">Choose how you bind steel — shapes adventure odds. Need Swordsmanship ${(P.styles||[]).find(x=>x.type==='sword')?.unlock?.skills?.swordsmanship || 10}+.</p><div class="actions">${(P.styles || []).filter((x) => x.type === 'sword').map((st) => { const need = st.unlock?.skills?.swordsmanship || 10; const ok = (s.skills.swordsmanship||0) >= need; return `<button data-a="style" data-v="${st.id}" title="${esc(st.feel||'')}" ${ok?'':'disabled'}>${esc(st.name)}${ok?'':` (need ${need})`}</button>`; }).join('')}</div>`)
      : (s.swordStyle ? card('skills', `${ico('swordsmanship')} Sword style`, `<p class="sub">Active: <b>${esc((P.styles||[]).find(x=>x.id===s.swordStyle)?.name || s.swordStyle)}</b> — ${esc((P.styles||[]).find(x=>x.id===s.swordStyle)?.feel || '')}.</p>`) : '');
    const schoolPick = (s.flags.mana_awakened && !s.magicSchool)
      ? card('skills', `${ico('spellcraft')} Magic school`, `<p class="sub">Bind your spark to a Boundwake school.</p><div class="actions">${(P.styles || []).filter((x) => x.type === 'school').map((st) => `<button data-a="school" data-v="${st.id}">${esc(st.name)}</button>`).join('')}</div>`)
      : '';
    const routePick = (!s.route && ca >= 8)
      ? card('skills', `${ico('route')} Your path`, `<p class="sub">Primary skills grow faster.</p><div class="actions">
        <button data-a="route" data-v="route_sword">Sword</button>
        <button data-a="route" data-v="route_magic">Magic</button>
        <button data-a="route" data-v="route_hybrid">Hybrid</button>
        <button data-a="route" data-v="route_craft">Craft</button></div>`)
      : (s.route ? card('skills', `${ico('route')} Your path`, `<p class="sub">Walking the <b>${esc(s.route.replace('route_',''))}</b> road.</p>`) : '');
    // Accordion categories (Boundwake names) + dense skill rows with bars
    const openCats = new Set(['physical', 'craft', 'social', 'mental', 'wild']);
    if (s.flags.mana_awakened) openCats.add('arcane');
    if (ca >= 6) openCats.add('martial');
    const rows = P.skills.categories.map((c) => {
      const skills = P.skills.skills.filter((k) => k.cat === c.id);
      const trainable = skills.filter((k) => !why(k.id)).length;
      const body = skills.map((k) => {
        const v = s.skills[k.id] || 0, block = why(k.id);
        const pillar = E.PILLAR_SKILLS?.includes(k.id) && E.longevitySkillPace(s, k.id) > 1 ? ` · pace ×${E.longevitySkillPace(s, k.id).toFixed(1)}` : '';
        const pct = Math.max(0, Math.min(100, v));
        return `<div class="row row-skill dense${block ? ' locked' : ''}">
          <div class="skill-main">${skillIco(k.id)}<div class="skill-meta"><b>${esc(k.name)}</b>
            <small>${E.rankOf(v)}${s.talents.includes(k.id) && v > 10 ? ' · talent' : ''}${pillar}</small>
            <i class="skill-bar" aria-hidden="true"><b style="width:${pct}%"></b></i>
            ${block ? `<small class="lock-why">${esc(block)}</small>` : `<small class="muted">${flare(k.flavor || k.note || '')}</small>`}
          </div></div>
          <div class="skill-side"><span class="skill-val">${Math.floor(v)}</span>
            <button data-a="train" data-v="${k.id}" ${block || s.budget.act < 1 ? 'disabled' : ''}>${block ? 'Locked' : 'Train'}</button>
          </div></div>`;
      }).join('');
      const open = openCats.has(c.id) || trainable > 0 ? ' open' : '';
      return `<details class="skill-acc panel-skills"${open}><summary class="skill-acc-hd">${c.icon} ${esc(c.name)} <small>${trainable ? trainable + ' ready' : skills.length + ' skills'}</small></summary><div class="skill-acc-body">${body}</div></details>`;
    }).join('');
    return card('skills', HD.skills, lead('skills') + `<p class="sub tip-train">Soft skills from age ~2 · martial 6+ · styles &amp; path at 8 · arcane after mana awakens. Locked Train always shows why.</p>`) + manaCard + routePick + stylePick + schoolPick + rows;
  }
  if (tab === 'bonds') {
    const people = E.living(s);
    const bondCard = (p) => {
      E.ensurePersonSheet(s, p);
      const st = p.stats;
      const raceName = (P.races.find((r) => r.id === p.race) || {}).name || p.race;
      const inParty = !!p.inParty;
      const partyFull = E.partyOf(s).length >= E.PARTY_CAP && !inParty;
      const temper = (E.TEMPERAMENTS.find((x) => x.id === p.temperament) || {}).name || p.temperament || '—';
      const clash = E.temperamentsClash(E.playerTemperId(s), p.temperament);
      const home = E.livesWithPlayer(s, p);
      const work = E.isCoworker(s, p);
      const tags = [
        inParty ? '<span class="party-tag">In your party</span>' : '',
        home && !inParty ? '<span class="party-tag soft">Under one roof</span>' : '',
        work ? '<span class="party-tag soft">Coworker</span>' : '',
        clash ? '<span class="party-tag clash">Temperaments clash</span>' : '',
      ].filter(Boolean).join(' ');
      return `<div class="bond-card${inParty ? ' in-party' : ''}${clash ? ' temper-clash' : ''}">
        <div class="bond-hd"><b>${esc(p.first)}</b><small>${esc(p.rel)} · ${Math.floor(p.age)} · ${esc(raceName)}</small>
          <span class="bond-job">${ico('work')} ${esc(p.jobTitle || '—')}</span>
          <span class="bond-temper">${ico('spirit')} ${esc(temper)}</span>
          ${tags}</div>
        ${clash ? '<p class="temper-note sub">Your temperaments don’t sit easily together — Passive Relationship Growth won’t stick; Spend time still can.</p>' : ''}
        <div class="bars">${bar('health', st.health)}${bar('spirit', st.happiness)}${bar('wits', st.smarts)}${bar('presence', st.looks)}
          ${bar('strain', st.stress)}${bar('renown', st.fame)}</div>
        <div class="bond-close"><div class="bar bar-bond">${ico('bond')}Closeness<span class="val">${Math.round(p.bar)}</span><i><b style="width:${Math.max(0, Math.min(100, p.bar))}%"></b></i></div></div>
        <div class="actions">
          <button data-a="soc" data-v="${p.id}" ${s.budget.social ? '' : 'disabled'}>Spend time</button>
          <button data-a="party" data-v="${p.id}" ${partyFull ? 'disabled' : ''}>${inParty ? 'Leave party' : 'Add to party'}</button>
        </div>
      </div>`;
    };
    return card('bonds', HD.bonds, `${lead('bonds')}${people.map(bondCard).join('') || '<div class="empty">No one yet. Make a friend when you can.</div>'}
    <div class="actions"><button data-a="friend" ${s.budget.social && h >= 5 ? '' : 'disabled'}>Make a friend</button> <button data-a="love" ${s.budget.social && h >= 16 && !E.partnerOf(s) ? '' : 'disabled'}>${flare('Lantern Market')}</button></div>`);
  }
  if (tab === 'realms') {
    const here = s.region;
    const stack = P.regions.map((r) => {
      const found = s.regionsFound.includes(r.id);
      const at = here === r.id;
      if (!found) return card('realms', `${ico('realm')} ??? (undiscovered)`, `<p class="sub">Undiscovered. Keep living — maps widen with years and roads.</p>`);
      const locs = (r.locations || []).map((l) => {
        const seen = s.codex.includes(l.id);
        return `<div class="row row-loc"><div><b>${esc(l.name)}</b> <small>${esc(l.kind)}${seen ? ' · in Codex' : ''}</small><br><small>${flare(l.flavor)}</small></div>
          ${at ? `<button data-a="visit" data-v="${l.id}" ${s.budget.act < 1 ? 'disabled' : ''}>Visit</button>` : '<small class="muted">Travel here first</small>'}</div>`;
      }).join('');
      const foot = at
        ? `<p class="good">You are here. Visit a place (1 activity) to shape the year.</p>`
        : `<div class="actions"><button data-a="travel" data-v="${r.id}" ${ca >= 14 && s.budget.act > 0 ? '' : 'disabled'}>Travel here${ca < 14 ? ' (age 14+)' : ''}</button></div>`;
      return card('realms', `${ico('realm')} ${esc(r.name)}${at ? ' · here' : ''}`, `<p class="sub">${flare(r.feel)}</p>${locs}${foot}`);
    }).join('');
    return card('realms', HD.realms, `${lead('realms')}<p class="sub">Walk the places of your current realm, or travel when your boots are ready. Visits enter the Codex and color what finds you next.</p>`) + `<div class="realms-stack">${stack}</div>`;
  }
  if (tab === 'codex') {
    const evT = Object.fromEntries(P.events.map((e) => [e.id, e.title]));
    const rows = s.codex.map((c) => `<div class="row">${flare(evT[c] || P.regions.find((r) => r.id === c)?.name || P.regions.flatMap((r) => r.locations).find((l) => l.id === c)?.name || c.replace(/_/g, ' '))}</div>`).join('');
    return card('codex', `${HD.codex} <span class="hd-sub">${s.codex.length}</span>`, `${lead('codex')}<p class="sub">Kept across reincarnations.</p>${rows || '<div class="empty">Nothing recorded yet.</div>'}`);
  }
  if (tab === 'bel') {
    const biz = (s.workshops || []).map((w) => {
      const t = P.workshops?.types?.[w.type];
      return `<div class="row"><b>${esc(t?.name || w.type)}</b> <small>renown ${Math.round(w.renown)}</small></div>`;
    }).join('') || '<div class="empty">No workshops owned.</div>';
    const boards = E.noticeBoards(s).map((b) => `<div class="row"><div><b>${esc(b.name)}</b> <small>${esc(b.role)}</small></div>
      <button data-a="notice" data-v="${b.id}" data-post="boast" ${s.budget.act < 1 || h < (P.notices?.minAge || 10) ? 'disabled' : ''}>Post</button></div>`).join('');
    return card('bel', HD.bel, `${lead('bel')}<p class="gold-line" style="font-size:18px">${ico('gold')}<b>${Math.floor(s.gold)}</b> ${T('currency')}</p>
      <h3>${ico('echo')} Relics</h3>${s.relics.map((r) => `<div class="row">${flare(r.replace(/^relic_/, '').replace(/_/g, ' '))}</div>`).join('') || '<div class="empty">None yet. Relics are found in delves and at graves.</div>'}
      <h3>${ico('renown')} Tournament team</h3>${s.team
      ? `<div class="row"><b>${esc(s.team.name)}</b> <small>${esc((P.skills.skills.find(x=>x.id===s.team.affinitySkill)||{}).name || '')} · renown ${Math.round(s.team.renown)} · ${(s.team.roster||[]).length}/4</small></div>`
      : '<div class="empty">No team — found on Adventure (age 16+).</div>'}
      <h3>${ico('adventure')} Guild hall</h3>${s.guild
      ? `<div class="row"><b>${esc(E.guildLabel(s))}</b> <small>${esc((P.regions.find(r=>r.id===s.guild.realmId)||{}).name || '')} · renown ${Math.round(s.guild.renown)} · coffer ${Math.floor(s.guild.coffer)} · ${(s.guild.roster||[]).length}/6</small></div>`
      : '<div class="empty">No hall — open on Work (age 18+).</div>'}
      <h3>${ico('work')} Workshops</h3>${biz}
      <h3>${ico('codex')} Notice boards</h3><p class="sub">Readers: ${s.notices?.followers || 0} · posts ${s.notices?.posts || 0}</p>${boards || '<div class="empty">No boards yet.</div>'}
      ${gearHTML()}`);
  }
  return '';
}
function gearHTML() {
  const acc = (id, title, body, open) => `<details class="work-acc panel-work"${open ? ' open' : ''} data-work-acc="${id}"><summary class="work-acc-hd">${title}</summary><div class="work-acc-body">${body}</div></details>`;
  const items = E.gearShop(s); if (!items.length) return '<h3>Gear shop</h3><div class="empty">The gear stalls are still setting up.</div>';
  const gi = (g) => `<img class="gear-ico" src="assets/gear/${g.id}.png" alt="" width="28" height="28" loading="lazy" onerror="this.remove()">`;
  const bon = (g) => Object.entries(g.bonus || {}).map(([k, v]) => `${esc(k.replace(/_/g, ' '))} +${v}`).join(', ');
  const eqLabel = (g) => g.slot === 'home' ? (g.equipped ? 'Home' : 'Move in') : g.slot === 'mount' ? (g.equipped ? 'Dismount' : 'Ride') : (g.equipped ? 'Unequip' : 'Equip');
  const owned = items.filter((g) => g.owned).map((g) => `<div class="row"><div>${gi(g)}<b>${esc(g.name)}</b> <small>${g.slot}${g.equipped ? (g.slot === 'home' ? ' · living here' : ' · equipped') : ''}${g.rent ? ` · rent ${Math.ceil(g.price / 2)}/yr` : ''} · ${bon(g)}</small></div><span><button data-a="gequip" data-v="${g.id}" ${g.slot === 'home' && g.equipped ? 'disabled' : ''}>${eqLabel(g)}</button><button data-a="gsell" data-v="${g.id}">${g.rent ? 'End rent' : 'Sell ' + Math.floor(g.price * (P.gear?.sellRate ?? 0.5))}</button></span></div>`).join('');
  const slots = P.gear?.slots || [...new Set(items.map((g) => g.slot))];
  const shop = slots.map((sl) => {
    const rows = items.filter((g) => g.slot === sl && !g.owned).sort((a, b) => a.price - b.price).map((g) => `<div class="row"><div>${gi(g)}<b>${esc(g.name)}</b> <small>${ico('gold')}${g.price} · ${esc(g.realm || '')} · ${bon(g)}</small><br><small>${flare(g.desc || '')}</small></div><button data-a="gbuy" data-v="${g.id}" ${g.lock || s.gold < g.price ? 'disabled' : ''}>${g.lock ? esc(g.lock) : g.rent ? 'Rent' : 'Buy'}</button></div>`).join('');
    const SL = { home: 'Homes', mount: 'Mounts', armor: 'Armor' };
    const sico = `<img class="gear-slot-ico" src="assets/gear/slot_${sl}.png" alt="" width="20" height="20" onerror="this.remove()">`;
    return acc('gear_' + sl, `${sico}${esc(SL[sl] || sl[0].toUpperCase() + sl.slice(1) + 's')} <small>${items.filter((g) => g.slot === sl).length}</small>`, rows || '<div class="empty">All owned.</div>', false);
  }).join('');
  return `<h3>${ico('adventure')} Gear</h3>${owned || '<div class="empty">No gear yet.</div>'}<h3>Gear shop</h3>${shop}`;
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
      return `<div class="side-row"><span>${skillIco(id)} ${esc(sk?.name || id)}</span><b>${Math.floor(v)}</b></div>`;
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
      <div class="music-row">${musicToggleHTML()} <small>Music</small></div>
    </div>
  </aside>`;
}
let courtPick = null;
function render() {
  if (!s) return fateScreen();
  if (!s.alive) { save(); return deathScreen(); }
  setChrome(tab);
  const tabs = TABS.map(([k]) => {
    const m = TAB_META[k];
    return `<button data-tab="${k}" class="${tab === k ? 'on' : ''}" aria-label="${T(m.label)}">${ico(m.ico)}${T(m.label)}</button>`;
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
  try { syncMusic(tab, document.documentElement.dataset.tod); } catch (_) {}
  if (!document.querySelector('.music-fab')) {
    const fab = document.createElement('div'); fab.className = 'music-fab'; fab.innerHTML = musicToggleHTML(); document.body.append(fab);
  } else {
    document.querySelector('.music-fab').innerHTML = musicToggleHTML();
  }
}
app.addEventListener('click', (ev) => {
  const b = ev.target.closest('button'); if (!b || b.disabled) return; const a = b.dataset.a, v = b.dataset.v; let r;
  if (b.dataset.tab) tab = b.dataset.tab;
  else if (a === 'age') E.ageUp(s);
  else if (a === 'ch') { if (document.body.dataset.sheetBusy) return; document.body.dataset.sheetBusy = '1'; r = E.resolve(s, +v); if (r) toast((r.success === false ? '✗ ' : '') + r.msg); setTimeout(() => { delete document.body.dataset.sheetBusy; }, 400); }
  else if (a === 'train') r = E.train(s, v); else if (a === 'job') r = E.takeJob(s, v); else if (a === 'quit') E.quitJob(s); else if (a === 'work') r = E.workHard(s);
  else if (a === 'adv') r = E.adventure(s); else if (a === 'rest') r = E.rest(s); else if (a === 'route') { r = E.chooseRoute(s, v); }
  else if (a === 'soc') r = E.socialize(s, v); else if (a === 'friend') r = E.meetSomeone(s, false); else if (a === 'love') r = E.meetSomeone(s, true); else if (a === 'travel') r = E.travel(s, v); else if (a === 'visit') r = E.visitLocation(s, v);
  else if (a === 'reinc') { s = E.reincarnate(meta, s, v, (Math.random() * 2 ** 31) | 0); tab = 'life'; }
  else if (a === 'heir') { s = E.continueAsHeir(meta, s, v, (Math.random() * 2 ** 31) | 0); tab = 'life'; }
  else if (a === 'party') { r = E.toggleParty(s, v); }
  else if (a === 'awaken') { r = E.attemptManaAwaken(s); }
  else if (a === 'style') { r = E.chooseSwordStyle(s, v); }
  else if (a === 'school') { r = E.chooseMagicSchool(s, v); }
  else if (a === 'cast') { r = E.practiceMagic(s); }
  else if (a === 'drill') { r = E.drillSword(s); }
  else if (a === 'tourney') { r = E.enterTournament(s, v); }
  else if (a === 'tinvite') { r = E.acceptTournamentInvite(s, v); }
  else if (a === 'healer') r = E.visitHealer(s);
  else if (a === 'adopt') r = E.adoptPassion(s, v);
  else if (a === 'prac') r = E.practicePassion(s, v);
  else if (a === 'actv') r = E.doActivity(s, v, 0);
  else if (a === 'crime') r = E.commitCrime(s, v);
  else if (a === 'buybiz') r = E.buyWorkshop(s, v);
  else if (a === 'court') r = E.fileForOffice(s, v);
  else if (a === 'courtpick') { courtPick = v || null; }
  else if (a === 'courtans') { r = E.fileWithAnswer(s, courtPick, +v); courtPick = null; }
  else if (a === 'pbehave') r = E.prisonBehave(s);
  else if (a === 'pappeal') r = E.prisonAppeal(s);
  else if (a === 'pescape') r = E.prisonEscape(s);
  else if (a === 'hire') r = E.hireStaff(s, b.dataset.w, v);
  else if (a === 'fire') r = E.fireStaff(s, b.dataset.w, v);
  else if (a === 'wup') r = E.buyUpgrade(s, b.dataset.w, v);
  else if (a === 'gbuy') r = E.buyGear(s, v);
  else if (a === 'gequip') r = E.equipGear(s, v);
  else if (a === 'gsell') r = E.sellGear(s, v);
  else if (a === 'mentor') r = E.enrollMentor(s, v);
  else if (a === 'mdrill') r = E.mentorDrill(s);
  else if (a === 'club') r = E.joinClub(s, v);
  else if (a === 'patron') r = E.applyPatronage(s, v);
  else if (a === 'notice') r = E.postNotice(s, v, b.dataset.post || 'boast');
  else if (a === 'tfound') { r = E.foundTeam(s, (s.last || 'Vale') + ' Circle', v); }
  else if (a === 'thire') r = E.hireTeamNpc(s);
  else if (a === 'tfire') r = E.fireTeamNpc(s, v);
  else if (a === 'tcaptain') r = E.setTeamCaptain(s, v !== '0');
  else if (a === 'tdrill') r = E.drillTeam(s);
  else if (a === 'tdisband') r = E.disbandTeam(s);
  else if (a === 'tmeet') r = E.enterRealmMeet(s);
  else if (a === 'tgrand') r = E.enterTeamGrand(s);
  else if (a === 'gfound') r = E.foundGuild(s, v || s.region);
  else if (a === 'gfee') r = E.setGuildFee(s, +v);
  else if (a === 'ghire') r = E.hireGuildAdventurer(s);
  else if (a === 'gfire') r = E.fireGuildAdventurer(s, v);
  else if (a === 'gwithdraw') r = E.withdrawGuildCoffer(s, s.guild?.coffer || 0);
  else if (a === 'gclose') r = E.closeGuild(s);
  else if (a === 'treclaim') r = v === 'challenge' ? E.reclaimChallenge(s, 'team') : E.reclaimBuyback(s, 'team');
  else if (a === 'greclaim') r = v === 'challenge' ? E.reclaimChallenge(s, 'guild') : E.reclaimBuyback(s, 'guild');
  else if (a === 'thand') r = E.handoffOwnership(s, 'team', v);
  else if (a === 'ghand') r = E.handoffOwnership(s, 'guild', v);
  else if (a === 'music') { unlockMusic(); toggleMute(); return; }
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
  if (s) { if (s.team === undefined) s.team = null; if (s.guild === undefined) s.guild = null; if (!s.flags) s.flags = {}; }
  startAmbient(); mountInfoClicks(document); mountMusic();
  if (s) render(); else if (!localStorage.getItem(SEEN) && !Q.has('skipintro')) cold(); else fateScreen();
})();
