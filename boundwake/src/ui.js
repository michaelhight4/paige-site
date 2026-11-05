// Boundwake UI shell — studio standard pass (Nov 5, 2026 CT).
// Craft: Lifeline docked Age + per-menu hue bars; Boundwake parchment/realm identity.
import { loadPack } from './pack.js';
import * as E from './bw_engine.js';
import { ico, esc, flare, oddsChip, statLabel, infoChip, skillIco } from './flare.js';
import { mountInfoClicks, openInfo } from './info.js';
import { checkAdminAccess, gateHTML, isLocalHost } from './admingate.js';
import { mountAmbient, paintAmbient } from './ambient.js';
import { mountMusic, syncMusic, toggleMute, musicToggleHTML, unlockMusic } from './music.js';
import { skipYears, requestStop, isRunning as autoRunning, SKIP_PRESETS, MAX_SKIP } from './autopilot.js';
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
  const d = document.createElement('div'); d.className = 'toast'; d.style.pointerEvents = 'none';
  d.innerHTML = flare(m); document.body.append(d);
  setTimeout(() => { d.style.opacity = '0'; }, 2000);
  setTimeout(() => d.remove(), 2400);
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
  const lines = [
    T('cold_1') === 'You died.' ? 'You died in one world.' : T('cold_1'),
    T('cold_2'),
    T('cold_3'),
  ];
  app.innerHTML = `<div class="cold"><p>${esc(lines[step])}</p><p class="sub" style="opacity:.85;font-size:14px;margin-top:8px">Boundwake — a new life awaits.</p><p><button class="primary" id="n">${step < 2 ? 'Continue' : T('start_life')}</button> <button class="ghost" id="sk">${T('skip_intro')}</button></p></div>`;
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
   <p class="sub">Hidden talents: 3 (review later on Skills / Codex)${meta.echoes && Object.keys(meta.echoes).length ? ' · ' + flare('Echoes') + ': ' + Object.entries(meta.echoes).map(([k, n]) => flare(k.replace('echo_', '')) + '×' + n).join(', ') : ''}</p>
   <div class="actions" style="justify-content:center"><button id="go" class="primary">${T('start_life')}</button> <button id="rr" class="ghost" ${rr ? '' : 'disabled'}>${T('fate_reroll')}</button></div>`;
  app.innerHTML = card('fate', `${ico('echo')} ${T('fate_title')}`, body);
  try { syncMusic('fate', document.documentElement.dataset.tod); } catch (_) {}
  if (!document.querySelector('.music-fab')) { const fab = document.createElement('div'); fab.className = 'music-fab'; fab.innerHTML = musicToggleHTML(); document.body.append(fab); }
  $('#go').onclick = () => { s = E.begin(fate, meta); tab = 'life'; save(); render(); };
  $('#rr').onclick = () => fateScreen(0);
}
function header() {
  const st = E.stage(s), r = E.race(s), j = s.job && P.occ.jobs[s.job.id];
  const ca = E.cage(s);
  const stageLbl = E.stageLabel(s);
  const occ = j ? j.title : (s.school && ca >= 6 && ca < 16 ? 'Student' : (ca < 6 ? 'Child' : (ca < 16 ? 'Youth' : 'No work')));
  const mana = s.flags.mana_awakened
    ? bar('mana', (100 * (s.mana||0)) / Math.max(1, s.manaMax||1), 'magic bar-mana', `${Math.floor(s.mana||0)}/${Math.floor(Math.max(s.manaMax||0,1))}`)
    : '';
  const body = `<div class="hdr">${portrait(st, s.race, career(), false, s.first + ' ' + s.last)}
    <div style="flex:1;min-width:0"><div class="name">${esc(s.first)} ${esc(s.last)}</div>
    <div class="sub">${esc(r.name)} · ${T('year_verb')} ${Math.floor(s.age)} · ${esc(stageLbl)} · ${esc(E.regionOf(s).name)}</div>
    <div class="sub">${esc(occ)} · <span class="gold-line">${ico('gold')}${Math.floor(s.gold)} ${T('currency')}</span></div></div></div>
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
    const autoBusy = autoRunning();
    const autoCard = card('life', `${ico('act')} Autopilot / Skip`, `<p class="sub">Advance <b>cage</b> years one at a time (1 turn = 1 year). Safe event picks; pauses on death, jail, romance/family, ownership, tournaments, or Stop. Leftover actions: Rest if strained → Work if employed → Train lowest skill.</p>
      <div class="actions auto-actions">
        ${SKIP_PRESETS.map((n) => `<button type="button" data-a="skip" data-v="${n}" ${autoBusy || s.pending.length ? 'disabled' : ''}>Skip ${n}y</button>`).join('')}
        <button type="button" data-a="skip" data-v="custom" ${autoBusy || s.pending.length ? 'disabled' : ''}>Custom…</button>
        ${autoBusy ? `<button type="button" class="primary" data-a="autostop">Stop</button>` : ''}
      </div>
      ${s.pending.length ? `<p class="sub lock-why">Resolve the open event first (or Autopilot will pause on important ones).</p>` : ''}`);
    const tourneyBanner = E.isTournamentYear(s)
      ? card('life', `${ico('adventure')} Tournament year`, `<p class="sub">Bracket <b>${esc(E.tourneyBracket(s)?.label || '')}</b> meets are open — enter from the Adventure tab (1 action). Strong places draw academies, tutors, and blade halls.</p><div class="actions"><button type="button" class="primary" data-tab="adv">${ico('adventure')} Open Adventure</button></div>`)
      : (E.tournamentInvites(s).length
        ? card('life', `${ico('adventure')} Hall invitations`, `<p class="sub">${E.tournamentInvites(s).map((i) => esc(i.name)).join(', ')} await your answer on Adventure.</p><div class="actions"><button data-tab="adv">Open Adventure</button></div>`)
        : '');
    const pathOpen = !s.route && ca >= 8 && ca <= 16;
    const pathUrgent = pathOpen && ca >= 10 && ca <= 13;
    const route = pathOpen ? card('life', `${ico('adventure')} Choose your path${pathUrgent ? ' · age ' + ca : ''}`, `<p class="sub">${pathUrgent ? '<b>Now is a good year to choose.</b> ' : ''}Sword, magic, hybrid, or craft — primary skills grow <b>+25%</b> faster. Also on Skills. Opens at age 8; clearest around 11.</p><div class="actions">${[['route_sword','Sword'],['route_magic','Magic'],['route_hybrid','Hybrid'],['route_craft','Craft']].map(([id,lab]) => `<button type="button" class="primary" data-a="route" data-v="${id}">${esc(lab)}</button>`).join('')}</div>`) : (s.route ? '' : '');
    const journal = route + card('life journal-host', HD.life, `${lead('life')}<div class="journal" id="jr">${byAge.map(([a, ls]) => `<p class="y">${T('year_verb')} ${a}</p>${ls.map((t) => `<p>${flare(t)}</p>`).join('')}`).join('')}</div>
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
      const acts = c.activities.filter((a) => h >= a.minAge && a.id !== 'healer').map((a) => {
        const ch0 = a.choices[0]; const cost = ch0?.cost || 0;
        return `<div class="row"><div><b>${esc(a.name)}</b> <small>${esc(a.sub)}${cost ? ` · ${cost} gold` : ''}</small></div><button data-a="actv" data-v="${a.id}" ${s.budget.act < 1 || s.gold < cost ? 'disabled' : ''}>Do</button></div>`;
      }).join('');
      return acts ? card('life', `${c.icon || ''} ${esc(c.name)}`, acts) : '';
    }).join('');
    const crimes = E.lawMenuCrimes(s);
    const lawCard = crimes.length ? card('life', `${ico('strain')} Realm law (shadow)`, `<p class="sub">Quiet choices with loud consequences. Catch risk rises with a record. Attempts from age ${E.CRIME_MENU_MIN_AGE}+.</p>${crimes.map((c) => {
      const locked = !c.ok || s.budget.act < 1;
      const why = !c.ok ? c.why : (s.budget.act < 1 ? 'No actions left' : '');
      return `<div class="row"><div><b>${esc(c.name)}</b> <small>severity ${c.severity}</small>${why ? `<br><small class="lock-why">${esc(why)}</small>` : ''}</div><button data-a="crime" data-v="${c.id}" ${locked ? 'disabled' : ''} title="${esc(why || 'Spend 1 action')}">Attempt</button></div>`;
    }).join('')}`) : '';
    const pa = E.prisonActions(s);
    const prisonCard = s.prison ? `<div class="pack-polish-prison">${card('life', `${ico('strain')} Imprisoned`, `<p class="sub">${esc(E.tierDef(s.prison.tier)?.name || s.prison.tier)} · ${esc(E.fmtSentence(s.prison.left))} left · conduct ${pa.conduct}. Age +1 advances the sentence.</p>
      <div class="row"><div><b>Behave</b> <small>build conduct; parole after half the term</small></div><button data-a="pbehave" ${pa.behave ? '' : 'disabled'}>Behave</button></div>
      <div class="row"><div><b>Appeal</b> <small>${ico('gold')}${pa.appealCost} · once per sentence${s.prison.appealed ? ' · heard' : ''}</small></div><button data-a="pappeal" ${pa.appeal ? '' : 'disabled'}>Appeal</button></div>
      <div class="row"><div><b>Escape</b> <small>~${Math.round(pa.escapeOdds * 100)}% base · failure adds years</small></div><button data-a="pescape" ${pa.escape ? '' : 'disabled'}>Escape</button></div>`)}</div>` : '';
    return lifeShortcuts + autoCard + (tourneyBanner || '') + journal + prisonCard + ailCard + pastCard + actCats + lawCard;
  }
  if (tab === 'work') {
    if (s.prison) return card('work', HD.work, `${lead('work')}<div class="empty">Work is closed while you are held (${esc(E.tierDef(s.prison.tier)?.name || 'prison')}). Use Life → Imprisoned actions.</div>`);
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
      const unlock = E.humanizeUnlock(c.unlock_text || '');
      const joinFee = E.jobJoinFee(job);
      const feeWhy = (ok && joinFee > 0 && s.gold < joinFee) ? `Need ${joinFee} gold apron/kit bond` : '';
      const canJoin = ok && !feeWhy;
      const feeBit = joinFee > 0 ? ` · join ${ico('gold')}${joinFee} apron/kit` : ' · no join fee';
      return `<div class="row row-job${canJoin ? '' : ' locked'}"><div><b>${esc(job.title)}</b> <small>· ${esc(c.name)} · ${kind}</small><br><small>${flare(c.blurb)} · ${ico('gold')}${job.wage} ${T('currency')}/yr${feeBit}${unlock ? `<br>${esc(unlock)}` : ''}</small>${(why || feeWhy) ? `<br><small class="lock-why">${esc(why || feeWhy)}</small>` : ''}</div><button data-a="job" data-v="${job.id}" ${canJoin ? '' : 'disabled'} title="${esc(why || feeWhy || (joinFee ? `Join (−${joinFee}g bond)` : 'Join'))}">${canJoin ? (joinFee ? `Join (−${joinFee}g)` : 'Join') : 'Locked'}</button></div>`;
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
      `${owned}<h3>Open a workshop</h3>${buy || '<div class="empty">None affordable yet.</div>'}`, !!(s.workshops || []).length || openSecondary);
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
      const handRow = (!g.seized && E.cage(s) >= 50 && handC.length) ? `<div class="actions"><small>Handoff (heir→apprentice→captain):</small>${handC.map((c)=>`<button data-a="ghand" data-v="${c.id}">${esc(c.name)} (${esc(c.role)})</button>`).join('')}</div>` : '';
      const crossNote = E.crossActive(s) ? `<p class="sub">Cross banners on — team fame softens hire costs &amp; job odds.</p>` : '';
      const ly = g.lastYear || {};
      guildBody = `${seizeRow}<p class="sub">${markImg('guild')}<b>${esc(E.guildLabel(s))}</b> · stage ${esc(g.stage || 'founding')} · ${esc((P.regions.find(r=>r.id===g.realmId)||{}).name || g.realmId)} · ${renownChip('renown', g.renown)} · coffer ${Math.floor(g.coffer)} gold · fee <b>${fee}</b>/adv/yr</p>
        <p class="sub">Last year: <b>${ly.success ?? '—'}</b> jobs ok / <b>${ly.fail ?? '—'}</b> failed${ly.gained != null ? ` · coffer +${ly.gained}g` : ''}. Lifetime: ${g.jobsDone || 0} ok / ${g.jobsFailed || 0} failed.</p>${crossNote}
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
    const enteredIds = s.flags.tour_entered || [];
    const enteredNote = enteredIds.length
      ? `<p class="sub">Entered this year: <b>${enteredIds.map((id) => esc(E.tourneyMeetTitle?.(id) || id.replace(/^meet_/, '').replace(/_/g, ' '))).join(', ')}</b>.</p>`
      : '';
    const tourneyEmpty = enteredIds.length
      ? `<div class="empty">No further meets open for your skills this year — you already entered ${enteredIds.length === 1 ? 'a list' : 'your lists'}. Train other meet skills (blade, cook, smith, marks…) if you want another entry before the year ends.</div>`
      : `<div class="empty">Bracket ${esc(br?.label || '')} is open, but no meet matches your trained skills yet. Train blade, spark, cook, smith, marks… on Skills (use Train so the skill counts), then return this year.</div>`;
    const teamMeetGate = E.canEnterTeamMeet(s);
    const teamMeetRow = `<h3>Teams meet</h3>
      <p class="sub">${teamMeetGate.ok
        ? (teamMeetGate.mode === 'party' ? 'Enter with your <b>party bonds</b> (scratch side) or a founded team.' : 'Grand Teams / team lists are open.')
        : esc(teamMeetGate.msg || 'Teams gate not met.')}</p>
      <div class="actions"><button data-a="tmeetall" class="primary" ${teamMeetGate.ok ? '' : 'disabled'} title="${esc(teamMeetGate.ok ? '20g + 1 act' : (teamMeetGate.msg || ''))}">Enter Teams (20g + 1 act)</button></div>`;
    const tourneyCard = E.isTournamentYear(s)
      ? card('adv', `<img class="tourney-banner-ico" src="assets/icons/ui/tournament_banner.png" alt="" width="24" height="24" onerror="this.remove()"> Tournaments · bracket ${esc(br?.label || '—')}`,
          `${bannerHTML('tourney', 'Tournament year')}<p class="sub">Meets every 3 years. Entry costs <b>1 action</b>. Place for gold &amp; renown — strong finishes draw academies, tutors, and blade halls.</p>${enteredNote}
           ${offers.length ? offers.map((o) => `<div class="row"><div><b>${esc(o.title)}</b> <small>${esc(o.skillName)} · ${esc(o.bracket)}</small><br><small>${esc(o.blurb)}</small></div>
             <button data-a="tourney" data-v="${o.id}" ${s.budget.act < 1 ? 'disabled' : ''}>Enter</button></div>`).join('')
             : tourneyEmpty}
           ${teamMeetRow}
           ${inv.length ? `<h3>Invitations</h3>${inv.map((i) => `<div class="row"><div><b>${esc(i.name)}</b> <small>${esc(i.kind)}</small></div><button data-a="tinvite" data-v="${i.id}" ${s.budget.act < 1 ? 'disabled' : ''}>Answer</button></div>`).join('')}` : ''}`)
      : (inv.length
        ? card('adv', `${ico('adventure')} Invitations`, inv.map((i) => `<div class="row"><div><b>${esc(i.name)}</b> <small>${esc(i.kind)}</small></div><button data-a="tinvite" data-v="${i.id}" ${s.budget.act < 1 ? 'disabled' : ''}>Answer</button></div>`).join(''))
        : card('adv', `${ico('adventure')} Tournaments`, `<p class="sub">Not a tournament year (meets at ages 3, 6, 9…). Your bracket when open: <b>${esc(E.tourneyBracket(s)?.label || '—')}</b>. ${E.cage(s) % 3 === 2 ? 'Lists open next year — train now.' : 'Train a meet skill so entries appear when lists open.'}</p>`));
    // Tournament team (Game Dev balance · World Design meet venues)
    let teamCard = '';
    if (ca >= 16 || s.team) {
      if (!s.team) {
        const rec = E.teamRecommendedAffinities();
        const picks = rec.map((id) => {
          const sk = P.skills.skills.find((x) => x.id === id);
          const v = s.skills[id] || 0;
          const need = 15;
          const why = v < need ? `Train ${sk?.name || id} to ${need}+ on Skills` : (s.gold < 80 ? 'Need 80 gold' : (s.budget.act < 1 ? 'Need 1 action' : ''));
          const ok = v >= need && s.gold >= 80 && s.budget.act >= 1;
          return `<button data-a="tfound" data-v="${id}" ${ok ? '' : 'disabled'} title="${esc(why)}">${esc(sk?.name || id)} (${Math.floor(v)})${why ? ' · ' + esc(why) : ''}</button>`;
        }).join('');
        teamCard = card('adv', `${markImg('team')} Tournament team`,
          `${bannerHTML('team', 'Tournament team')}<p class="sub">Register with the Clerk of Meets — pick one skill affinity at <b>15+</b> (80 gold + 1 act, age 16+). Realm meets: Visit Ribbon Green / Saltpier Ring / Stakeline / Crestfall / Sparkfield. Grand <b>Teams</b> bracket every 3 years.</p>
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
    if (s.prison) return card('adv', HD.adv, `${lead('adv')}<div class="empty">Adventure is locked while you are imprisoned. Age +1 advances the sentence; Behave / Appeal / Escape are on Life.</div>`);
    const advWhy = s.prison ? 'Imprisoned' : (ca < 10 ? 'Age 10+' : (!s.budget.adv ? 'No adventures left this year' : (!s.budget.act ? 'No actions left' : '')));
    return tourneyCard + teamCard + card('adv', HD.adv, `${lead('adv')}<p class="sub">${ca < 10 ? 'The road is for older feet (age 10+).' : flare(`Take to the paths of ${E.regionOf(s).name}. Combat, ruins and rare delves. ${s.budget.adv} left this year.`)}</p>
    ${partyBlock}
    <div class="actions"><button data-a="adv" class="primary" ${E.canAdventure(s) ? '' : 'disabled'} title="${esc(advWhy)}">Set out</button></div>${advWhy && !E.canAdventure(s) ? `<p class="sub lock-why">${esc(advWhy)}</p>` : ''}`);
  }
  if (tab === 'skills') {
    const why = (id) => E.trainLockReason(s, id);
    const manaCard = card('skills', `${ico('mana')} Mana &amp; craft`,
      s.flags.mana_awakened
        ? `<p class="sub">Mana <b>${Math.floor(s.mana)}</b> / <b>${Math.floor(Math.max(s.manaMax || 0, 1))}</b>. School: <b>${esc((P.styles||[]).find(x=>x.id===s.magicSchool)?.name || 'none yet')}</b>. Sword style: <b>${esc((P.styles||[]).find(x=>x.id===s.swordStyle)?.name || 'none yet')}</b>.</p>
           <div class="actions"><button data-a="cast" class="primary" ${s.budget.act < 1 || s.mana < 5 || !s.magicSchool || ca < 6 ? 'disabled' : ''} title="${esc(ca < 6 ? 'Age 6+ (same as Train)' : (!s.magicSchool ? 'Choose a school first' : (s.mana < 5 ? 'Need 5 mana' : 'Spend 1 action')))}">Practice magic (5 mana)${ca < 6 ? ' · age 6+' : ''}</button>
           <button data-a="drill" ${s.budget.act < 1 || !s.swordStyle ? 'disabled' : ''}>Drill sword forms</button></div>`
        : `<p class="sub">Mana sleeps. From age 6: <b>Attempt awakening</b> here, or Visit an Academy in Realms. Spark-born wakes it at birth.</p>
           <div class="actions"><button data-a="awaken" class="primary" ${s.budget.act < 1 || ca < 6 ? 'disabled' : ''}>Attempt mana awakening${ca < 6 ? ' (age 6+)' : ''}</button></div>`);
    const stylePick = (!s.swordStyle && ca >= 8)
      ? card('skills', `${ico('swordsmanship')} Sword style`, `<p class="sub">Choose how you bind steel — shapes adventure odds. Need Swordsmanship ${(P.styles||[]).find(x=>x.type==='sword')?.unlock?.skills?.swordsmanship || 10}+.</p><div class="actions">${(P.styles || []).filter((x) => x.type === 'sword').map((st) => { const need = st.unlock?.skills?.swordsmanship || 10; const ok = (s.skills.swordsmanship||0) >= need; return `<button data-a="style" data-v="${st.id}" title="${esc(st.feel||'')}" ${ok?'':'disabled'}>${esc(st.name)}${ok?'':` (need ${need})`}</button>`; }).join('')}</div>`)
      : (s.swordStyle ? card('skills', `${ico('swordsmanship')} Sword style`, `<p class="sub">Active: <b>${esc((P.styles||[]).find(x=>x.id===s.swordStyle)?.name || s.swordStyle)}</b> — ${esc((P.styles||[]).find(x=>x.id===s.swordStyle)?.feel || '')}.</p>`) : '');
    const schoolPick = (s.flags.mana_awakened && !s.magicSchool && ca >= 6)
      ? card('skills', `${ico('spellcraft')} Magic school`, `<p class="sub">Bind your spark to a Boundwake school (age 6+).</p><div class="actions">${(P.styles || []).filter((x) => x.type === 'school').map((st) => `<button data-a="school" data-v="${st.id}">${esc(st.name)}</button>`).join('')}</div>`)
      : (s.flags.mana_awakened && !s.magicSchool && ca < 6
        ? card('skills', `${ico('spellcraft')} Magic school`, `<p class="sub">Mana answers early (spark-born), but schools open at age <b>6+</b> — same gate as Train.</p>`)
        : '');
    const routePick = (!s.route && ca >= 8 && ca <= 16)
      ? card('skills', `${ico('route')} Your path${ca >= 10 && ca <= 13 ? ' · choose soon' : ''}`, `<p class="sub">Primary skills +25%. Clearest choice window around age 11.</p><div class="actions">
        <button type="button" class="primary" data-a="route" data-v="route_sword">Sword</button>
        <button type="button" class="primary" data-a="route" data-v="route_magic">Magic</button>
        <button type="button" class="primary" data-a="route" data-v="route_hybrid">Hybrid</button>
        <button type="button" class="primary" data-a="route" data-v="route_craft">Craft</button></div>`)
      : (s.route ? card('skills', `${ico('route')} Your path`, `<p class="sub">Walking the <b>${esc(s.route.replace('route_',''))}</b> road.</p>`) : (!s.route && ca > 16 ? card('skills', `${ico('route')} Your path`, `<p class="sub">No path chosen — you can still pick one.</p><div class="actions"><button data-a="route" data-v="route_sword">Sword</button><button data-a="route" data-v="route_magic">Magic</button><button data-a="route" data-v="route_hybrid">Hybrid</button><button data-a="route" data-v="route_craft">Craft</button></div>`) : ''));
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
    const talentChips = (s.talents || []).map((id) => {
      const sk = P.skills.skills.find((x) => x.id === id);
      return `<span class="pill">${skillIco(id)} ${esc(sk?.name || id)}</span>`;
    }).join('');
    const talentCard = talentChips ? card('skills', `${ico('echo')} Hidden talents`, `<p class="sub">Drawn at fate — grow faster when trained.</p><div class="pills">${talentChips}</div>`) : '';
    return card('skills', HD.skills, lead('skills') + `<p class="sub tip-train">Soft skills from age ~2 · martial 6+ · styles &amp; path at 8 · arcane after mana awakens. Locked Train always shows why.</p>`) + talentCard + manaCard + routePick + stylePick + schoolPick + rows;
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
    const friendWhy = s.prison ? 'Imprisoned' : (!s.budget.social ? 'No social left this year' : (E.cage(s) < 5 ? 'Age 5+' : ''));
    const loveWhy = s.prison ? 'Imprisoned' : (!s.budget.social ? 'No social left this year' : (E.cage(s) < 16 ? 'Age 16+' : (E.partnerOf(s) ? 'Already partnered' : '')));
    const friendTip = friendWhy || 'Spend 1 Social · age 5+';
    const loveTip = loveWhy || 'Spend 1 Social · age 16+';
    const gateNote = `<p class="sub${friendWhy || loveWhy ? ' lock-why' : ''}">${esc([`Make a friend: ${friendTip}`, `Lantern Market: ${loveTip}`].join(' · '))}</p>`;
    return card('bonds', HD.bonds, `${lead('bonds')}${people.map(bondCard).join('') || '<div class="empty">No one yet. Make a friend when you can.</div>'}
    <div class="actions"><button data-a="friend" ${!friendWhy ? '' : 'disabled'} title="${esc(friendTip)}" aria-label="Make a friend — ${esc(friendTip)}">Make a friend</button> <button data-a="love" ${!loveWhy ? '' : 'disabled'} title="${esc(loveTip)}" aria-label="Lantern Market — ${esc(loveTip)}">${flare('Lantern Market')}</button></div>${gateNote}`);
  }
  if (tab === 'realms') {
    if (s.prison) return card('realms', HD.realms, `${lead('realms')}<div class="empty">Realms travel is locked while you are imprisoned.</div>`);
    const here = s.region;
    const stack = P.regions.map((r) => {
      const found = s.regionsFound.includes(r.id);
      const at = here === r.id;
      if (!found) {
        const scoutWhy = ca < 14 ? 'Scouting opens at age 14' : (s.budget.act < 1 ? 'No actions left this year' : '');
        return card('realms', `${ico('realm')} ??? (undiscovered)`, `<p class="sub">Undiscovered. Scout the roads (1 action, age 14+) to put a realm on your map — or accept a travel writ if one finds you.</p>
          <div class="actions"><button data-a="scout" data-v="${r.id}" ${scoutWhy ? 'disabled' : ''} title="${esc(scoutWhy)}">Scout toward ${esc(r.name)}</button></div>
          ${scoutWhy ? `<p class="sub lock-why">${esc(scoutWhy)}</p>` : ''}`);
      }
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
    const tal = (s.talents || []).map((id) => {
      const sk = P.skills.skills.find((x) => x.id === id);
      return `<span class="pill">${skillIco(id)} ${esc(sk?.name || id)}</span>`;
    }).join('');
    return card('codex', `${HD.codex} <span class="hd-sub">${s.codex.length}</span>`, `${lead('codex')}<p class="sub">Kept across reincarnations.</p>
      ${tal ? `<h3>${ico('echo')} This life's talents</h3><div class="pills" style="margin-bottom:10px">${tal}</div>` : ''}
      ${rows || '<div class="empty">Nothing recorded yet.</div>'}`);
  }
  if (tab === 'bel') {
    const biz = (s.workshops || []).map((w) => {
      const t = P.workshops?.types?.[w.type];
      return `<div class="row"><b>${esc(t?.name || w.type)}</b> <small>renown ${Math.round(w.renown)}</small></div>`;
    }).join('') || '<div class="empty">No workshops owned.</div>';
    const boards = E.noticeBoards(s).map((b) => {
      const needAge = Math.max(b.minAge || 0, P.notices?.minAge || 10);
      const postWhy = s.prison ? 'Imprisoned' : (s.budget.act < 1 ? 'No actions left' : (ca < needAge ? `Age ${needAge}+` : ''));
      return `<div class="row"><div><b>${esc(b.name)}</b> <small>${esc(b.role)}</small>${postWhy ? `<br><small class="lock-why">${esc(postWhy)}</small>` : ''}</div>
      <button data-a="notice" data-v="${b.id}" data-post="boast" ${postWhy ? 'disabled' : ''} title="${esc(postWhy || 'Spend 1 action')}">Post</button></div>`;
    }).join('');
    return card('bel', HD.bel, `${lead('bel')}<p class="gold-line" style="font-size:18px">${ico('gold')}<b>${Math.floor(s.gold)}</b> ${T('currency')}</p>
      <h3>${ico('echo')} Relics</h3>${s.relics.map((r) => `<div class="row">${flare(r.replace(/^relic_/, '').replace(/_/g, ' '))}</div>`).join('') || '<div class="empty">None yet. Relics are found in delves and at graves.</div>'}
      <h3>${ico('renown')} Tournament team</h3>${s.team
      ? `<div class="row"><b>${esc(s.team.name)}</b> <small>${esc((P.skills.skills.find(x=>x.id===s.team.affinitySkill)||{}).name || '')} · renown ${Math.round(s.team.renown)} · ${(s.team.roster||[]).length}/4</small></div>`
      : '<div class="empty">No team — found on Adventure (founding age 16+, affinity skill 15+, 80g + 1 act).</div>'}
      <h3>${ico('adventure')} Guild hall</h3>${s.guild
      ? `<div class="row"><b>${esc(E.guildLabel(s))}</b> <small>${esc((P.regions.find(r=>r.id===s.guild.realmId)||{}).name || '')} · renown ${Math.round(s.guild.renown)} · coffer ${Math.floor(s.guild.coffer)} · ${(s.guild.roster||[]).length}/6</small></div>`
      : `<div class="empty">No hall yet.${E.cage(s) >= 18 ? ' Open one from <b>Work → Adventure guild hall</b>.' : ' Unlocks at age 18.'}</div><div class="actions"><button data-tab="work">Go to Work</button></div>`}
      <h3>${ico('work')} Workshops</h3>${biz}
      <h3>${ico('codex')} Notice boards</h3><p class="sub">Readers: ${s.notices?.followers || 0} · posts ${s.notices?.posts || 0}</p>${boards || '<div class="empty">No boards yet.</div>'}
      ${marketHTML()}
      ${gearHTML()}`);
  }
  return '';
}

function marketHTML() {
  const ca = E.cage(s);
  const minAge = P.market?.unlock?.minAge ?? 10;
  if (ca < minAge) return `<h3>${ico('gold')} Yearly market</h3><div class="empty">Stalls open at age ${minAge}+.</div>`;
  const listings = E.marketListings(s);
  const cart = E.marketCart(s);
  const inv = E.marketInv(s);
  const tot = E.marketCartTotal(s);
  const disc = Math.round((E.barterBuyDiscount?.(s) || 0) * 100);
  const sellR = Math.round((E.barterSellRate?.(s) || E.barterSellMult(s) || 0.55) * 100);
  const bart = Math.floor(s.skills?.bartering || 0);
  const markLbl = (pct) => {
    if (pct <= -12) return `<span class="mkt-good">${pct}%</span>`;
    if (pct < 0) return `<span class="mkt-ok">${pct}%</span>`;
    if (pct <= 3) return `<span class="mkt-fair">${pct === 0 ? 'fair' : (pct > 0 ? '+' : '') + pct + '%'}</span>`;
    if (pct <= 12) return `<span class="mkt-hi">+${pct}%</span>`;
    return `<span class="mkt-bad">+${pct}%</span>`;
  };
  const catName = (id) => (P.market?.categories || []).find((c) => c.id === id)?.name || id;
  const rows = listings.map((row) => {
    const sold = row.stock <= 0;
    return `<div class="row"><div><b>${esc(row.name)}</b> <small>${esc(catName(row.cat))} · ${esc(row.realm || '')}</small><br>
      <small>normal ${row.basePrice}g · <b>${markLbl(row.markPct)}</b> vs normal → list ${row.listPrice}g · you <b>${row.buyPrice}g</b> · stock ${row.stock}</small><br>
      <small>${flare(row.desc || '')}</small></div>
      <button data-a="mktadd" data-v="${row.id}" ${sold ? 'disabled' : ''}>${sold ? 'Sold out' : 'Add'}</button></div>`;
  }).join('') || '<div class="empty">No stalls this year.</div>';
  const cartRows = cart.map((c) => {
    const row = listings.find((x) => x.id === c.id);
    const name = row?.name || c.id;
    const unit = row ? row.buyPrice : 0;
    return `<div class="row"><div><b>${esc(name)}</b> <small>×${c.qty} · ${unit * c.qty}g after barter</small></div>
      <span><button data-a="mktrem" data-v="${c.id}">Remove</button></span></div>`;
  }).join('') || '<div class="empty">Cart empty.</div>';
  const invRows = inv.map((c) => {
    const def = (P.market?.items || []).find((x) => x.id === c.id);
    const pay = E.marketSellPayout(s, c.id);
    return `<div class="row"><div><b>${esc(def?.name || c.id)}</b> <small>×${c.qty} · sell ${pay}g each</small></div>
      <button data-a="mktsell" data-v="${c.id}">Sell 1</button></div>`;
  }).join('') || '<div class="empty">No trade packs yet — checkout to fill your packs.</div>';
  return `<h3>${ico('gold')} Yearly market</h3>
    <p class="sub">${flare(P.market?.notes || 'Trade goods with yearly marks. Gear/homes/mounts stay in the Gear shop below.')} Bartering <b>${bart}</b> · buy −${disc}% · sell rate ${sellR}%.</p>
    <div class="mkt-board">${rows}</div>
    <h3>Cart</h3>${cartRows}
    <div class="actions"><button data-a="mktout" class="primary" ${!cart.length || s.gold < tot.pay ? 'disabled' : ''}>Checkout ${tot.pay}g${tot.saved ? ` (save ${tot.saved}g)` : ''}</button></div>
    <h3>Market packs (sell)</h3>${invRows}`;
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
  return `<div class="sheet" data-sheet="1"><div class="card"><div class="card-hd">${ico('adventure')} ${flare(c.title)}</div><div class="card-body"><p class="prompt">${flare(c.prompt)}</p><div class="choices">${c.choices.map((x, i) => `<button type="button" data-a="ch" data-v="${i}" ${x.locked ? 'disabled aria-disabled="true"' : ''} title="${esc(x.lockWhy || '')}">${flare(x.label)}${x.locked && x.lockWhy ? ` <small class="lock-why">(${esc(x.lockWhy)})</small>` : ''}${oddsChip(x.odds)}</button>`).join('')}</div></div></div></div>`;
}
function ageDock() {
  if (!s || !s.alive) return '';
  const busy = autoRunning();
  const skipBtns = SKIP_PRESETS.map((n) => `<button type="button" class="auto-skip" data-a="skip" data-v="${n}" ${busy || s.pending.length ? 'disabled' : ''} title="Skip ${n} year${n > 1 ? 's' : ''} (safe auto)">+${n}</button>`).join('');
  return `<div class="dock dock-auto">
    <div class="auto-row" role="group" aria-label="Autopilot skip">
      <span class="auto-label">Skip</span>${skipBtns}
      <button type="button" class="auto-skip" data-a="skip" data-v="custom" ${busy || s.pending.length ? 'disabled' : ''} title="Custom skip">…</button>
      ${busy ? `<button type="button" class="auto-stop" data-a="autostop">Stop</button>` : ''}
    </div>
    <button class="age" data-a="age" ${busy || s.pending.length ? 'disabled' : ''}>${T('year_verb')} +${E.turnYears(s)}</button>
  </div>`;
}
function deathScreen() {
  document.body.classList.remove('has-sheet');
  setChrome('death');
  const hs = E.heirs(s), ech = E.echoChoices(s), d = P.terms.death;
  const cause = flare(P.terms.causes[s.cause] || d.unknown || 'The story ends.');
  app.innerHTML = card('death', `${ico('echo')} ${T('death_title')}`, `<div style="text-align:center">${portrait(E.stage(s), s.race, career(), true, s.first + ' ' + s.last)}<div class="name">${esc(s.first)} ${esc(s.last)}</div>
   <p class="sub">Age ${Math.floor(s.age)}. ${cause}</p><p>Legacy score <b>${E.legacyScore(s)}</b> · ${ico('gold')}${Math.floor(s.gold)} ${flare('gold')} · ${hs.length} living ${flare(hs.length === 1 ? 'heir' : 'heirs')}</p>
   <p class="sub">Continue this legacy (Echo or heir), or begin an unrelated new life. Saves are kept until you choose.</p></div>`)
   + card('death', `${ico('echo')} ${T('path_reincarnate_title')}`, `<p class="sub">${flare(T('path_reincarnate_body'))}</p><p>${flare(d.echo_prompt || T('echo_pick'))}</p><div class="choices">${ech.map((id) => { const e = P.terms.echoes.find((x) => x.id === id); return `<button data-a="reinc" data-v="${id}"><b>${flare(e.name)}</b> — ${flare(e.text)}${meta.echoes?.[id] ? ' (repeat: halved)' : ''}</button>`; }).join('')}</div>`)
   + card('death', T('path_heir_title'), `<p class="sub">${flare(hs.length ? T('path_heir_body') : T('path_heir_locked') + '. ' + (d.locked_hint || ''))}</p><div class="actions">${hs.map((p) => `<button data-a="heir" data-v="${p.id}">Continue as ${esc(p.first)} (${Math.floor(p.age)})</button>`).join('') || ''}</div>`)
   + card('death', 'New life', `<p class="sub">Start fresh in this world. Cemetery and Codex from past lives remain.</p><div class="actions"><button data-a="newlife" class="primary">Begin a new life</button></div>`)
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
  // Tab switches win for any [data-tab] (journal Adventure flare chips, Life shortcuts, main tabs)
  const tabEl = ev.target.closest('[data-tab]');
  if (tabEl && tabEl.dataset.tab) {
    if (tabEl.tagName === 'BUTTON' && (tabEl.disabled || tabEl.getAttribute('aria-disabled') === 'true')) {
      ev.preventDefault(); ev.stopPropagation(); return;
    }
    ev.preventDefault();
    tab = tabEl.dataset.tab;
    render();
    return;
  }
  const b = ev.target.closest('button'); if (!b) return;
  // Real disabled: attribute or aria (Playwright/DOM greyed choices must not fire)
  if (b.disabled || b.getAttribute('aria-disabled') === 'true') { ev.preventDefault(); ev.stopPropagation(); return; }
  const a = b.dataset.a, v = b.dataset.v; let r;
  if (a === 'age') {
    if (s?.pending?.length) return;
    const prevAge = E.cage(s);
    E.ageUp(s);
    const now = E.cage(s);
    if (s.alive && !s.route && now >= 11 && prevAge < 11) toast('Age 11 — choose your path on Life or Skills (sword / magic / hybrid / craft).');
    else if (s.alive && !s.route && now === 8) toast('Path choice unlocked — pick sword, magic, hybrid, or craft.');
  }
  else if (a === 'ch') {
    if (document.body.dataset.sheetBusy) return;
    document.body.dataset.sheetBusy = '1';
    r = E.resolve(s, +v);
    if (r && r.ok === false) toast(r.msg);
    else if (r) toast((r.success === false ? '✗ ' : '') + r.msg);
    // Drop sheet hit-target quickly so stale modal clicks cannot double-fire
    const sheet = document.querySelector('.sheet'); if (sheet) sheet.style.pointerEvents = 'none';
    setTimeout(() => { delete document.body.dataset.sheetBusy; }, 280);
  }
  else if (a === 'newlife') { s = null; localStorage.removeItem(KEY); tab = 'life'; fateScreen(); return; }
  else if (a === 'train') r = E.train(s, v); else if (a === 'job') r = E.takeJob(s, v); else if (a === 'quit') E.quitJob(s); else if (a === 'work') r = E.workHard(s);
  else if (a === 'adv') r = E.adventure(s); else if (a === 'rest') r = E.rest(s); else if (a === 'route') { r = E.chooseRoute(s, v); }
  else if (a === 'soc') r = E.socialize(s, v); else if (a === 'friend') r = E.meetSomeone(s, false); else if (a === 'love') r = E.meetSomeone(s, true); else if (a === 'travel') r = E.travel(s, v); else if (a === 'scout') r = E.scoutRealm(s, v); else if (a === 'visit') r = E.visitLocation(s, v);
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
  else if (a === 'mktadd') r = E.marketCartAdd(s, v);
  else if (a === 'mktrem') r = E.marketCartRemove(s, v);
  else if (a === 'mktout') r = E.marketCheckout(s);
  else if (a === 'mktsell') r = E.marketSell(s, v);
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
  else if (a === 'tmeetall') r = E.enterTeamMeet(s);
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
  else if (a === 'autostop') { requestStop(); toast('Stopping autopilot…'); return; }
  else if (a === 'skip') {
    if (autoRunning()) return;
    if (s.pending?.length) { toast('Resolve the open event first.'); return; }
    let n = v === 'custom' ? parseInt(prompt(`Skip how many years? (1–${MAX_SKIP})`, '10') || '0', 10) : parseInt(v, 10);
    if (!Number.isFinite(n) || n < 1) return;
    n = Math.min(MAX_SKIP, n);
    toast(`Autopilot: skipping ${n} year${n > 1 ? 's' : ''}…`);
    render(); // show Stop button
    skipYears(s, n, {
      waitMs: 30,
      onYear: (y, i, total) => {
        if (i === 1 || i === total || i % 5 === 0) toast(`Autopilot ${i}/${total} · age ${E.cage(s)}`);
      },
      onPause: (p) => { toast(p?.reason || 'Autopilot paused.'); },
    }).then((res) => {
      if (res.ok) toast(`Skipped ${res.done} year${res.done > 1 ? 's' : ''} · age ${E.cage(s)}.`);
      else if (res.paused?.kind === 'stop') toast('Autopilot stopped.');
      save(); render();
    });
    return;
  }
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
