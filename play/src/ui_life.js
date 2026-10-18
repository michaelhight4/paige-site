// BitLife-style hub UI: stat bars, journal, people/relationships, activities, doctor, school sports, crime/prison, legacy, cemetery, tombstone.
// Game dev's menus plug in through registerHook('job'|'assets'|'relationships'|'activities', { render(S, api) -> html, acts: { name(dataset) } }).
import * as E from './engine.js';
import * as P from './people.js';
import * as Health from './health.js';
import * as Legacy from './legacy.js';
import * as Crime from './crime.js';
import * as SS from './schoolsports.js';
import { money, esc, btn, chart } from './ui_util.js';
const { D } = E;

export const hooks = { job: null, assets: null, relationships: null, activities: null };
export const hookActs = {};
export function registerHook(tab, def) { if (!(tab in hooks)) throw new Error('unknown hook tab ' + tab); hooks[tab] = def; Object.assign(hookActs, def.acts || {}); }
const LBL = () => D.life.labels;
export const band = (v, inverted) => { const x = inverted ? 100 - v : v, b = D.life.bars.bands; return x >= b.green ? 'g' : x >= b.orange ? 'o' : 'r'; };
export const statBar = (k, v, big = true) => {
  const inv = D.life.bars.inverted.includes(k), b = band(v, inv);
  return `<div class="sbar ${big ? '' : 'small'}" data-stat="${k}"><span class="sl">${esc(LBL()[k] || k)}</span><div class="bar ${b}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div><b class="${b}">${Math.round(v)}</b></div>`;
};
export function header(S) {
  const st = S.stats, B = D.life.bars, c = P.country(S);
  return `<header class="top"><div class="row sp"><b>${esc(S.name)} · ${LBL().age} ${Math.floor(S.age)}${S.age % 1 ? ` <span class="mut">+${Math.round((S.age % 1) * 12)}mo</span>` : ''} <span class="mut">${S.birthYear + Math.floor(S.age)} · ${esc(c.name)}</span></b>
    <span>Cash <b>${money(S.cash)}</b>${S.debt > 0 ? ` · <span class="bad">Debt ${money(S.debt)}</span>` : ''}</span></div>
    <div class="bars">${B.main.map((k) => statBar(k, st[k])).join('')}${B.extra.map((k) => statBar(k, st[k])).join('')}</div>
    <div class="bars hidden">${B.hidden.map((k) => statBar(k, st[k], false)).join('')}</div></header>`;
}
export function chips(tab) {
  const items = { life: 'Life', biz: 'Business', stocks: 'Stocks', worth: 'Worth', legacy: 'Legacy', cemetery: 'Cemetery' };
  return `<div class="chips">${Object.entries(items).map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-act="tab" data-k="${k}">${n}</button>`).join('')}</div>`;
}
export function bottomNav(S, tab) {
  const blocked = !S.alive || S.pending.length || (S.league.finals && !S.league.finals.done);
  const b = (k, n, ic) => `<button class="${tab === k ? 'on' : ''}" data-act="tab" data-k="${k}"><span class="ic">${ic}</span>${n}</button>`;
  return `<nav class="bottom hub">${b('work', LBL().job, '💼')}${b('assets', LBL().assets, '🏠')}<button class="agebtn" data-act="turn" ${blocked ? 'disabled' : ''}><span>${LBL().age}</span><small>+1</small></button>${b('people', 'People', '❤️')}${b('act', LBL().activities, '🎯')}</nav>`;
}
// ---------- journal ----------
export function journal(S) {
  let h = '', last = null;
  for (const l of S.log.slice(-400)) {
    const a = Math.floor(l.age);
    if (a !== last) { last = a; h += `<div class="jh">${esc(D.life.journal.ageHeader.replace('{age}', a).replace('{year}', S.birthYear + a))}</div>`; }
    h += `<div class="jl ${l.kind}">${esc(l.text)}</div>`;
  }
  return `<div class="card"><h2>${LBL().journal}</h2><div class="log journal" id="journal">${h}</div></div>`;
}
function statusLine(S) {
  const bits = [], j = S.job && D.careers.find((x) => x.id === S.job.id);
  if (S.prison) bits.push(`🔒 In ${esc(Crime.tierDef(S.prison.tier).name)}: ${S.prison.left.toFixed(1)} yrs left`);
  if (S.fugitive) bits.push('🚨 Fugitive');
  if (S.flags.pregnant) bits.push('🤰 Baby on the way');
  if (S.sport) bits.push(`${SS.sportDef(S.sport.id).icon} ${SS.levelLabel(S.sport.level)} ${SS.sportDef(S.sport.id).name}`);
  if (S.pro) bits.push('🏀 Pro athlete');
  if (j) bits.push(`💼 ${esc(j.levels[S.job.level][0])}`);
  if (S.diseases.some((d) => d.dx)) bits.push(`🩺 ${S.diseases.filter((d) => d.dx).length} condition(s)`);
  return bits.length ? `<div class="status mut">${bits.join(' · ')}</div>` : '';
}
export function profileCard(prof) {
  return `<table class="prof">${Object.entries({ Gender: prof.gender, Age: prof.age, 'Marital status': prof.marital, Children: prof.children, Education: prof.education, Occupation: prof.occupation, Location: prof.location }).map(([k, v]) => `<tr><td>${k}</td><td><b>${esc(v)}</b></td></tr>`).join('')}</table>`;
}
export function hub(S, ui, E2) {
  const sec = D.sectors.map((x) => { const h = S.market.sectors[x.id].h; return `<span class="pill" title="${x.name}">${x.name.split(' ')[0]} <b class="${h > 55 ? 'good' : h < 45 ? 'bad' : ''}">${Math.round(h)}</b></span>`; }).join('');
  const fin = S.league.finals && !S.league.finals.done;
  return `${chips('life')}${journal(S)}<div class="card"><div class="row sp"><span>${Object.entries({ yearly: 'Yearly', half: '6 months', quarter: 'Quarterly' }).map(([k, n]) => btn('step', n, `data-k="${k}"`, E.STEPS[k] === S.step ? 'sm' : 'alt sm')).join(' ')}</span><span class="mut">${S.alive ? '' : 'Game over'}</span></div>
    ${statusLine(S)}${fin ? '<p class="bad">Your team is in the finals — play it from the Business tab.</p>' : ''}<p class="mut">Sector health: ${sec}${S.market.macro ? `<br>Macro: <b>${S.market.macro.name}</b> (${S.market.macro.left} turns)` : ''}</p></div>
    <div class="card"><h3>Profile</h3>${profileCard(P.myProfile(S))}</div>
    <div class="card row sp">${btn('save', 'Save', '', 'alt sm')}${btn('newgame', 'New game…', '', 'alt sm')}${ui.surrender ? `<span>Really give up? ${btn('surrender2', 'Yes, surrender', '', 'warn sm')} ${btn('surrender0', 'No', '', 'alt sm')}</span>` : btn('surrender1', LBL().surrender, '', 'warn sm')}<span class="mut">${esc(ui.toast || '')}</span></div>`;
}
// ---------- placeholders for Game dev's menus ----------
export function hookOrLegacy(S, ui, tab, legacyHtml) {
  const h = hooks[tab];
  if (h) return h.render(S, api(S, ui));
  return `<div class="card placeholder" data-hook="${tab}"><b>${esc({ job: 'Careers', assets: 'Assets & shopping', relationships: 'Relationships', activities: 'Activities' }[tab])} menu</b> <span class="mut">— placeholder: the dedicated menu plugs in here via <code>registerHook('${tab}', …)</code>. The basic built-in version is shown below.</span></div>${legacyHtml || ''}`;
}
export const api = (S, ui) => ({ E, P, Health, Legacy, Crime, SS, money, esc, btn, statBar, band, state: S, ui });
// ---------- relationships ----------
const REL_ORDER = ['spouse', 'partner', 'mother', 'father', 'sibling', 'child', 'friend', 'coworker', 'ex'];
const relName = (p) => ({ ...D.life.relTypes, sibling: p.gender === 'm' ? 'Brother' : 'Sister', child: p.gender === 'm' ? 'Son' : 'Daughter', spouse: p.gender === 'm' ? 'Husband' : 'Wife' })[p.rel];
export const barHtml = (v) => `<div class="bar ${band(v)}"><i style="width:${v}%"></i></div>`;
function personRow(p) {
  return `<div class="prow ${p.alive ? '' : 'dead'}" data-act="person" data-k="${p.id}"><span class="av">${p.gender === 'm' ? '👨' : '👩'}</span><span class="pn"><b>${esc(p.name)}</b><br><span class="mut">${relName(p)} · ${Math.floor(p.age)}${p.alive ? '' : ' · deceased'}</span></span>${p.alive ? `<span class="pb">${barHtml(Math.round(p.bar))}<small>${Math.round(p.bar)}</small></span>` : '<span class="pb mut">†</span>'}</div>`;
}
export function peopleView(S, ui) {
  if (ui.person != null) { const p = P.byId(S, ui.person); if (p) return personView(S, ui, p); ui.person = null; }
  const groups = REL_ORDER.map((r) => [r, S.people.filter((p) => p.rel === r && !(r === 'ex' && p.wasFriend))]).filter(([, l]) => l.length);
  const fam = groups.map(([r, l]) => `<h3>${{ spouse: 'Spouse', partner: 'Partner', mother: 'Parents', father: '', sibling: 'Siblings', child: 'Children', friend: 'Friends', coworker: 'Coworkers', ex: 'Exes' }[r]}</h3>${l.map(personRow).join('')}`).join('').replace(/<h3><\/h3>/g, '');
  const kids = P.children(S), cand = S.cand.length && !P.partnerOf(S) && S.age >= D.life.dating.minAge;
  const html = `${msgCard(ui)}<div class="card"><h2>Relationships</h2>${fam || '<p class="mut">Nobody yet.</p>'}</div>
    ${cand ? `<div class="card"><h2>Find love</h2><p class="mut">Singles around your age. A new batch shows up every year.</p>${S.cand.map((c, i) => `<div class="prow"><span class="av">${c.gender === 'm' ? '👨' : '👩'}</span><span class="pn"><b>${esc(c.name)}</b><br><span class="mut">${Math.floor(c.age)} · ${esc(c.occ)} · ${esc(c.city)}</span></span>${btn('date', 'Ask out', `data-k="${i}"`, 'sm')}</div>`).join('')}</div>` : ''}
    ${willCard(S, kids)}`;
  return hookOrLegacy(S, ui, 'relationships', html);
}
const msgCard = (ui) => (ui.msg ? `<div class="card notice" id="notice">${esc(ui.msg)}</div>` : '');
export function willCard(S, kids) {
  const w = S.will;
  return `<div class="card"><h2>${LBL().will}</h2><p class="mut">Cash, assets, businesses and teams pass to your children when you die. Estate tax: ${Math.round(D.life.estate.rate * 100)}% above ${money(D.life.estate.exempt)}. Heirs under ${D.life.estate.minOwnerAge} get cars/houses auctioned; businesses go into a trust.</p>
    <div class="row">${btn('will', 'Split evenly', 'data-mode="even"', w.mode === 'even' ? 'sm' : 'alt sm')}${kids.map((k) => btn('will', `All to ${esc(k.first)}`, `data-mode="one" data-k="${k.id}"`, w.mode === 'one' && w.heir === k.id ? 'sm' : 'alt sm')).join('')}${kids.length ? '' : '<span class="mut">No children yet — without an heir the line ends.</span>'}</div></div>`;
}
export function personView(S, ui, p) {
  const prof = P.profile(S, p), acts = P.interactionsFor(S, p);
  return `${msgCard(ui)}<div class="row sp"><button class="alt sm" data-act="personback">← Back</button><span class="mut">${relName(p)}</span></div>
    <div class="card"><h2>${p.gender === 'm' ? '👨' : '👩'} ${esc(p.name)}</h2>${p.alive ? `<div class="sbar"><span class="sl">Relationship</span>${barHtml(Math.round(p.bar))}<b class="${band(p.bar)}">${Math.round(p.bar)}</b></div>` : '<p class="mut">Deceased</p>'}${profileCard(prof)}</div>
    ${p.alive ? `<div class="card"><h3>Interact</h3><div class="row">${acts.map((a) => btn('interact', esc(a.label), `data-k="${p.id}" data-a="${a.id}"`, `alt sm${S.acted['p' + p.id + a.id] || (a.cost && S.cash < a.cost) ? '' : ''}`, !!S.acted['p' + p.id + a.id] || !!(a.cost && S.cash < a.cost))).join('')}</div></div>` : ''}`;
}
// ---------- activities ----------
export function activitiesView(S, ui) {
  const acts = D.life.activities, dis = S.diseases.filter((d) => d.dx);
  const list = acts.map((a) => btn(a.special === 'doctor' ? 'doctor' : 'activity', esc(a.name), `data-k="${a.id}"`, 'alt sm', S.age < a.min || !!S.acted[a.id] || (a.cost && S.cash < a.cost) || (a.needsJob && !S.job) || !!S.prison)).join('');
  const html = `${msgCard(ui)}<div class="card"><h2>${LBL().activities}</h2><div class="row">${list}</div><p class="mut">Each one once per turn. Gym builds lasting fitness; the doctor starts affordable treatment for what it finds.</p></div>
    ${doctorCard(S, dis)}${sportCard(S)}${crimeCard(S)}${prisonCard(S)}`;
  return hookOrLegacy(S, ui, 'activities', html);
}
function doctorCard(S, dis) {
  return `<div class="card"><h2>${LBL().doctor}</h2>${dis.length ? dis.map((d) => { const def = Health.diseaseDef(d.id), c = Health.treatCost(S, def); return `<div class="row sp"><span><b>${esc(def.name)}</b> <span class="pill">${def.sev.replace(/_/g, ' ')}</span>${d.treated ? ' <span class="pill">in treatment</span>' : ''}</span>${def.cost ? btn('treat', `Treat ${money(c)}`, `data-k="${d.id}"`, 'sm', S.cash < c) : '<span class="mut">harmless</span>'}</div>`; }).join('') : '<p class="mut">No known conditions. Undiagnosed ones only show up at a checkup.</p>'}</div>`;
}
function sportCard(S) {
  const cfg = D.life.sports, sp = S.sport;
  let h = `<div class="card"><h2>School sports</h2>`;
  if (sp) {
    const def = SS.sportDef(sp.id);
    h += `<p>${def.icon} <b>${SS.levelLabel(sp.level)} ${def.name}</b> — the ${esc(sp.team)} · skill <b>${Math.round(sp.skill)}</b>${sp.scholarship ? ' · 🎓 scholarship' : ''} ${btn('quitsport', 'Quit', '', 'alt sm')}</p>
      <table><tr><th>Age</th><th>Level</th><th>W-L</th>${def.stats.map((k) => `<th>${k}</th>`).join('')}</tr>${sp.seasons.slice(-6).map((r) => `<tr><td>${r.age}</td><td>${SS.levelLabel(r.level)}</td><td>${r.w}-${r.l}</td>${def.stats.map((k) => `<td>${k === 'avg' ? r.stats[k].toFixed(3).slice(1) : Number.isInteger(r.stats[k]) ? r.stats[k] : r.stats[k].toFixed(1)}</td>`).join('')}</tr>`).join('')}</table>
      ${def.pro ? `<p class="mut">College seniors with skill ${cfg.draft.minSkill}+ are drafted into the pro league (round 1 at ${cfg.draft.round1}+).</p>` : '<p class="mut">No pro league for this sport.</p>'}`;
  } else if (S.pro) {
    const l = SS.proSeasonLine(S); h += l ? `<p>🏀 <b>Pro</b> — ${esc(l.team)} · OVR ${l.ovr} · ${money(l.salary)}/yr · ${l.ppg} ppg, ${l.rpg} rpg, ${l.apg} apg</p>` : '<p class="mut">Retired.</p>';
  } else if (SS.canJoin(S)) h += `<div class="row">${cfg.list.map((x) => btn('joinsport', `${x.icon} ${x.name}`, `data-k="${x.id}"`, 'alt sm')).join('')}</div>`;
  else h += '<p class="mut">Sports are available while you are in school (ages 6+).</p>';
  return h + '</div>';
}
function crimeCard(S) {
  if (S.prison) return '';
  const list = Crime.available(S); if (S.age < 8) return '';
  return `<div class="card"><h2>Crime</h2><p class="mut">Repeat offenders get doubled sentences. Odds depend on your smarts${S.record.sentences ? ` — you have ${S.record.sentences} prior sentence(s)` : ''}.</p><div class="row">${list.map((c) => btn('crime', `${esc(c.name)} <span class="mut">(${Math.round(Crime.catchChance(S, c) * 100)}% caught)</span>`, `data-k="${c.id}"`, 'warn sm')).join('')}</div></div>`;
}
function prisonCard(S) {
  const pr = S.prison; if (!pr) return S.fugitive ? '<div class="card"><h2>Fugitive</h2><p class="bad">The law is looking for you. Each year there is a chance you are caught.</p></div>' : '';
  const t = Crime.tierDef(pr.tier), c = Crime.crimeDef(pr.crime), R = D.crimes.rules;
  return `<div class="card prison"><h2>🔒 ${LBL().prison}: ${esc(t.name)}</h2><p>${esc(c.name)} · ${pr.total >= R.lifeSentence ? 'life' : pr.total.toFixed(1) + ' yrs'} · ${pr.left.toFixed(1)} left · behavior ${pr.beh}</p>
    <div class="row">${btn('behave', 'Behave', '', 'sm', !!S.acted.behave)}${btn('escape', `Escape (${Math.round(t.escape * 100)}%)`, '', 'warn sm', !!S.acted.escape)}${btn('parole', 'Parole hearing', '', 'sm', pr.served < pr.total * R.paroleFraction || !!S.acted.parole)}
    ${[0, 1, 2].map((i) => btn('appeal', `Lawyer ${['★', '★★', '★★★'][i]} ${money(R.appealCost[i])}`, `data-k="${i}"`, 'alt sm', pr.appeals >= 1 || S.cash < R.appealCost[i])).join('')}</div></div>`;
}
// ---------- legacy / cemetery ----------
export function legacyView(S) {
  const sm = Legacy.legacySummary(S), est = Legacy.estateSummary(S);
  return `${chips('legacy')}<div class="card"><h2>${LBL().legacy}: the ${esc(sm.lastName)} family</h2><table><tr><td>Generations</td><td><b>${sm.generations}</b></td></tr><tr><td>Years lived (all generations)</td><td><b>${sm.years}</b></td></tr><tr><td>Accumulated wealth</td><td><b>${money(sm.wealth)}</b></td></tr>${sm.best ? `<tr><td>Richest ancestor</td><td>${esc(sm.best.name)} (${money(sm.best.nw)})</td></tr>` : ''}</table></div>
    <div class="card"><h3>Ancestors</h3>${sm.gens.map((g) => `<div class="row sp"><span><b>Gen ${g.gen}: ${esc(g.name)}</b> <span class="mut">${g.born}${g.current ? ' – now' : '–' + (g.born + g.age)} · age ${g.age}${g.cause ? ' · ' + esc(g.cause) : ''}</span></span><span>${g.ribbonName ? `<span class="pill">${esc(g.ribbonName)}</span> ` : ''}${money(g.nw)}</span></div>`).join('')}</div>
    ${S.alive ? `<div class="card"><h3>If you died today</h3>${estateHtml(est)}</div>${willCard(S, P.children(S))}` : ''}`;
}
export function estateHtml(est) {
  return `<table><tr><td>Estate value</td><td>${money(est.estateVal)}</td></tr><tr><td>Estate tax (${Math.round(est.rate * 100)}% over ${money(est.exempt)})</td><td class="bad">-${money(est.tax)}</td></tr><tr><td>Passed on (${est.mode === 'one' ? 'all to one heir' : 'even split'})</td><td><b>${money(est.net)}</b></td></tr></table>
    ${est.heirs.map((h) => `<div class="mut">• ${esc(h.name)} (${h.age}): ${money(h.cash)} cash${h.assets.length ? ', ' + h.assets.length + ' asset(s)' : ''}${h.biz.length ? ', ' + h.biz.map(esc).join(', ') : ''}${h.auctioned ? `, ${money(h.auctioned)} from auctioned cars/houses (under ${D.life.estate.minOwnerAge})` : ''}${h.trust ? ' — business held in trust' : ''}</div>`).join('') || '<div class="mut">No heirs: the line ends.</div>'}`;
}
export function cemeteryView() {
  const m = Legacy.metaGet(), have = m.ribbons;
  return `${chips('cemetery')}<div class="card"><h2>${LBL().cemetery}</h2><p class="mut">${m.lives} lives lived · longest ${m.longest} · best net worth ${money(m.bestNW)}</p>
    <div class="ribbons">${D.ribbons.map((r) => `<div class="rib ${have[r.id] ? 'got' : ''} ${r.locked ? 'locked' : ''}" title="${esc(r.desc)}${r.locked ? ' (' + esc(r.locked) + ')' : ''}"><span class="ri">${r.icon}</span><b>${esc(r.name)}</b>${have[r.id] ? `<small>×${have[r.id]}</small>` : `<small class="mut">${r.locked ? 'locked' : '—'}</small>`}</div>`).join('')}</div></div>
    <div class="card"><h3>Graves</h3>${m.graves.length ? [...m.graves].reverse().map((g) => `<div class="grave"><span class="stone">🪦</span><span><b>${esc(g.name)}</b> <span class="mut">${g.born}–${g.died} (${g.age}) · ${esc(g.cause)}</span><br><span class="pill">${(D.ribbons.find((r) => r.id === g.ribbon) || {}).icon || ''} ${esc((D.ribbons.find((r) => r.id === g.ribbon) || {}).name || g.ribbon)}</span> ${money(g.nw)}</span></div>`).join('') : '<p class="mut">No graves yet. Everyone is still alive, for now.</p>'}</div>`;
}
// ---------- modals ----------
export function eventModal(S, card) {
  const afford = (c) => !(c.req && S.cash < c.req);
  return `<div class="ov"><div class="box ev"><div class="mut evcat">${esc(card.cat || '')}</div><h2>${esc(card.title)}</h2><p>${esc(card.text)}</p>${card.choices.map((c, i) => `<button class="choice ${afford(c) ? '' : 'alt'}" data-act="choice" data-k="${i}" ${afford(c) ? '' : 'disabled'}>${esc(c.label)}${c.p != null ? ` <span style="opacity:.7">(${Math.round(c.p * 100)}% chance)</span>` : ''}</button>`).join('')}</div></div>`;
}
export function deathModal(S, ui) {
  const e = S.ending, nw = e.netWorth, t = e.tombstone, est = Legacy.estateSummary(S), kids = Legacy.heirsOf(S), over = !kids.length;
  const sm = Legacy.legacySummary(S);
  return `<div class="ov"><div class="box death"><div class="tomb"><div class="rip">R.I.P.</div><h2>${esc(t.name)}</h2><div>${t.born} – ${t.died}</div><div class="epi">“${esc(t.epitaph)}”</div></div>
    <p class="obit">${esc(e.obituary)}</p><div class="ribbon"><span class="ri">${e.ribbon.icon}</span> <b>${esc(e.ribbon.name)}</b> <span class="mut">${esc(e.ribbon.desc)}</span></div>
    <table><tr><td>Died at</td><td>${e.age} (${esc(e.cause)})</td></tr><tr><td>Net worth</td><td>${money(nw.total)}</td></tr><tr><td>Last job</td><td>${esc(e.job)}</td></tr><tr><td>Businesses</td><td>${e.biz.map(esc).join(', ') || 'none'}</td></tr><tr><td>Studio releases</td><td>${e.releases}</td></tr><tr><td>Team titles</td><td>${e.titles}</td></tr><tr><td><b>Legacy score</b></td><td><b>${e.score}</b></td></tr></table>
    ${chart(S.history.map((x) => x[1]))}
    <h3>Estate</h3>${estateHtml(est)}
    ${over ? `<div class="card gameover"><h3>Game over — the ${esc(sm.lastName)} line ends</h3><p>${sm.generations} generation(s) · ${sm.years} years · ${money(sm.wealth)} accumulated wealth.</p>${sm.gens.map((g) => `<div class="mut">Gen ${g.gen}: ${esc(g.name)} (${g.age}) — ${esc(g.ribbonName || '')}</div>`).join('')}</div>`
      : `<h3>Continue as…</h3><div class="row">${kids.map((k) => btn('continueas', `${k.gender === 'm' ? '👦' : '👧'} ${esc(k.name)}, ${Math.floor(k.age)}`, `data-k="${k.id}"`, '')).join('')}</div>`}
    <div class="row" style="margin-top:8px">${btn('newgame', 'New game', '', over ? '' : 'alt')}${btn('close', 'View journal', '', 'alt')}${btn('tab', 'Cemetery', 'data-k="cemetery"', 'alt')}</div></div></div>`;
}
// ---------- handlers ----------
export function makeActs(getS, ui, rerenderModalHide) {
  const S = () => getS();
  return {
    person: (d) => { ui.person = +d.k; ui.msg = ''; }, personback: () => { ui.person = null; ui.msg = ''; },
    interact: (d) => { const r = P.interact(S(), +d.k, d.a); ui.msg = r.msg; },
    date: (d) => { const r = P.dateCandidate(S(), +d.k); ui.msg = r.msg; },
    activity: (d) => { const r = E.doActivity(S(), d.k); ui.msg = r.msg || ''; },
    doctor: () => { const r = Health.doctorVisit(S()); ui.msg = r.msg; },
    treat: (d) => { const r = Health.treat(S(), d.k); ui.msg = r.msg; },
    joinsport: (d) => { SS.join(S(), d.k); ui.msg = ''; }, quitsport: () => SS.quit(S(), 'left'),
    crime: (d) => { const r = Crime.commit(S(), d.k); ui.msg = r.msg; },
    behave: () => { ui.msg = Crime.behave(S()).msg; }, escape: () => { ui.msg = Crime.escape(S()).msg; }, parole: () => { ui.msg = Crime.parole(S()).msg; }, appeal: (d) => { ui.msg = Crime.appeal(S(), +d.k).msg; },
    surrender1: () => { ui.surrender = true; }, surrender0: () => { ui.surrender = false; }, surrender2: () => { ui.surrender = false; Legacy.surrender(S()); ui.hideEnd = false; },
    will: (d) => { Legacy.setWill(S(), d.mode, d.k ? +d.k : null); },
    continueas: (d) => { if (Legacy.continueAs(S(), +d.k)) { ui.hideEnd = false; ui.person = null; ui.msg = ''; } },
  };
}
