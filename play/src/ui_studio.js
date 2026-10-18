// Studio screens (City Game Studio-style creator + team/market/history), data-driven from data/studio_data.json.
// Hooks used: Studio.getTrends, calcScore (preview), saveRelease (via tick), getConsoleShare, setEffort, getHistory, hire, fire.
import { D } from './data.js';
import * as Studio from './studio.js';
import * as Market from './market.js';
import { $, money, pct, esc, btn, chart, multiChart } from './ui_util.js';

const ST = () => D.studio;
export const STUDIO_TABS = [['overview', 'Overview'], ['create', 'Create'], ['team', 'Team'], ['market', 'Market'], ['history', 'History']];
const heatTag = (t) => `<div class="heat ${t.state}">${t.state === 'hot' ? '🔥' : t.state === 'cold' ? '❄️' : '•'} ${t.heat} <span class="${t.perTurn >= 0 ? 'up' : 'dn'}">${t.perTurn >= 0 ? '▲' : '▼'}${Math.abs(t.perTurn)}/mo</span> <span class="${t.perYear >= 0 ? 'up' : 'dn'}">${t.perYear >= 0 ? '+' : ''}${t.perYear}/y</span></div>`;
const tags = (sp, prof) => Object.entries(sp.areaBonus).map(([a, v]) => `<span class="tag">+${v} ${esc((prof.areas.find((x) => x.id === a) || { label: a }).label)}</span>`).join('') + sp.traits.map((t) => `<span class="tag trait">${esc(t)}</span>`).join('');

export function studioTabs(ui) { return `<div class="tabs">${STUDIO_TABS.map(([k, n]) => btn('studiotab', n, `data-k="${k}"`, ui.stTab === k ? 'sm' : 'sm alt')).join('')}</div>`; }

// ---------- Create ----------
export function createView(S, ui, b) {
  const st = ST(), medium = D.bizTypes[b.type].medium, d = Studio.getDraft(S, b), prof = Studio.profile(medium, d.format), tr = Studio.getTrends(S);
  const plats = Studio.platforms(medium, d.format), shares = Studio.getConsoleShare(S), seq = Studio.sequelOptions(b), eng = prof.engines;
  const sameMedium = S.biz.filter((x) => x.kind === 'studio' && D.bizTypes[x.type].medium === medium);
  const gtile = (list, key, labels, trk) => list.map((x) => `<div class="opt ${d[key] === x.id ? 'on' : ''}" data-act="sd" data-f="${key}" data-v="${x.id}"><div class="ic">${x.icon}</div><div class="nm">${esc(labels[x.id])}</div>${heatTag(tr[trk][x.id])}</div>`).join('');
  const hired = (b.specialists || []).map((id) => Studio.specialistById(id));
  const left = `
  <div class="card"><h3>Project</h3><div class="row">${btn('sd', 'New IP', `data-f="sequelOf" data-v=""`, !d.sequelOf ? 'sm' : 'sm alt')}${btn('sd', medium === 'tv' ? 'Next season' : 'Sequel', `data-f="sequelOf" data-v="${seq[0] ? seq[0].id : ''}"`, d.sequelOf ? 'sm' : 'sm alt', !seq.length)}</div>
    ${d.sequelOf ? `<label>Continue<br><select data-sd="sequelOf">${seq.map((o) => `<option value="${o.id}" ${o.id === d.sequelOf ? 'selected' : ''}>${esc(o.title)}</option>`).join('')}</select></label><p class="mut">Sequels inherit genre/theme, carry hype and fan score${medium === 'tv' ? ' (ratings carry over; renewal needs good ratings)' : ''}.</p>` : (medium === 'tv' && !seq.length ? '<p class="mut">No renewed shows yet - a new IP starts Season 1.</p>' : '')}
    <label>Name<br><span class="row"><input type="text" id="sdName" data-sd-name="1" value="${esc(d.title)}" placeholder="Title of your ${esc(prof.unitName.toLowerCase())}…" ${d.sequelOf ? 'disabled' : ''}>${btn('dice', '🎲', '', 'alt sm')}</span></label></div>
  <div class="card"><h3>Size / budget</h3><div class="tiles3">${prof.tiers.map((t) => `<div class="opt ${d.tier === t.id ? 'on' : ''}" data-act="sd" data-f="tier" data-v="${t.id}"><div class="ic">${t.icon}</div><b>${esc(t.label)}</b><div class="sub">${money(t.cost * prof.costMult * (medium === 'tv' ? (d.episodes || 10) / 10 : 1))}</div><div class="sub">👥 ${t.teamSize} · ⏱ ${t.baseYears}y base</div><div class="sub">⚠ ${Math.round(t.risk * 100)}%</div></div>`).join('')}</div>
    ${medium === 'tv' ? `<label>Episodes (per-season budget scales with count)<br><select data-sd="episodes">${st.mediaTypes.tv.episodeOptions.map((n) => `<option value="${n}" ${n === d.episodes ? 'selected' : ''}>${n} episodes</option>`).join('')}</select></label>` : ''}</div>
  <div class="card"><h3>${esc(prof.engineLabel)}</h3>${eng.map((e) => { const lock = (b.fame || 0) < e.minFame; return `<div class="row sp optrow ${d.engine === e.id ? 'on' : ''}" data-act="${lock ? '' : 'sd'}" data-f="engine" data-v="${e.id}"><span>${lock ? '🔒 ' : ''}<b>${esc(e.name)}</b><br><span class="mut">quality +${e.qualityBonus} · speed ×${(1 / e.speedMult).toFixed(2)} · ${money(e.cost)}${lock ? ' · needs fame ' + e.minFame : ''}</span></span><span>${d.engine === e.id ? '✔' : ''}</span></div>`; }).join('')}</div>
  <div class="card"><h3>Studio</h3>${sameMedium.length > 1 ? `<select data-sd="studio">${sameMedium.map((x) => `<option value="${x.id}" ${x.id === b.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : `<b>${esc(b.name)}</b>`}
    <p class="mut">${b.staff.length} staff · rep ${Math.round(b.rep)} · fame ${Math.round(b.fame || 0)} (${Studio.fameTier(b).label}, revenue deals ×${Studio.fameTier(b).dealMult})</p></div>
  <div class="card"><h3>Specialists (${hired.length}/${st.balance.specialistCap})</h3>${hired.map((sp) => `<div class="spec"><span class="avatar">${sp.icon}</span><span><b>${esc(sp.name)}</b> <span class="mut">${esc(sp.role)} · ${money(sp.salaryPerTurn)}/mo</span><br>${tags(sp, prof)}</span></div>`).join('') || '<p class="mut">No specialists hired. Their area bonuses and traits improve score, speed and risk.</p>'}
    ${btn('studiotab', 'Manage team ›', 'data-k="team"', 'alt sm')}</div>`;
  const right = `
  ${medium === 'tv' ? `<div class="card"><h3>Format</h3><div class="row">${Object.entries(st.mediaTypes.tv.formats).map(([k, f]) => btn('sd', esc(f.label), `data-f="format" data-v="${k}"`, d.format === k ? 'sm' : 'sm alt', !!d.sequelOf && d.format !== k)).join('')}</div></div>` : ''}
  <div class="card"><h3>Genre</h3><div class="tiles4">${gtile(st.genres, 'genre', prof.genreLabels, 'genres')}</div>
    <h3>Theme</h3><div class="tiles4">${gtile(st.themes, 'theme', prof.themeLabels, 'themes')}</div><div id="matchbox"></div></div>
  <div class="card"><h3>Audience</h3><div class="row">${st.audiences.map((a) => btn('sd', `${a.icon} ${a.name}`, `data-f="audience" data-v="${a.id}"`, d.audience === a.id ? 'sm' : 'sm alt')).join('')}</div>
    <h3>${esc(prof.platformLabel)}</h3><div class="row">${plats.map((p) => { const cs = p.console ? Studio.consoleState(S, p.id) : null; return btn('sd', `${p.icon || '📺'} ${esc(p.name)}${p.console ? ` · ${shares[p.id]}% · ⚡${Math.round(cs.power)}` : ` · reach ×${p.reach}`}`, `data-f="platform" data-v="${p.id}"`, d.platform === p.id ? 'sm' : 'sm alt'); }).join('')}</div></div>
  <div class="card"><h3>Development focus <span class="mut" id="effortTotal"></span></h3>${prof.areas.map((a) => `<div class="slider2"><label><span>${a.icon} ${esc(a.label)}</span><b id="sv-${a.id}"></b></label><input type="range" min="0" max="100" step="${st.balance.effortStep}" value="${d.split[a.id]}" data-effort="${a.id}" id="sl-${a.id}"><div class="ideal"><i id="id-${a.id}"></i></div></div>`).join('')}
    <div class="row"><button class="alt sm" data-act="autobalance">Auto-balance to genre</button><span class="mut">green tick = genre sweet spot</span></div><div id="warnbox"></div></div>`;
  return `<div class="cols"><div>${left}</div><div>${right}</div></div><div class="startbar" id="startbar"></div>`;
}

// Update live numbers (sliders, match meter, forecast bar) without re-rendering the whole screen.
export function refreshCreator(S, b) {
  if (!$('startbar')) return;
  const st = ST(), medium = D.bizTypes[b.type].medium, d = Studio.getDraft(S, b), prof = Studio.profile(medium, d.format), r = Studio.calcScore(S, b, d, { expected: true }), ideal = st.genres.find((g) => g.id === d.genre).idealSplit;
  for (const a of prof.areas) { const v = d.split[a.id]; $('sl-' + a.id).value = v; $('sv-' + a.id).textContent = v + '%'; $('id-' + a.id).style.left = `calc(${ideal[a.id]}% - 1px)`; }
  $('effortTotal').textContent = Object.values(d.split).reduce((x, y) => x + y, 0) + '/' + st.balance.effortTotal;
  const cmpPct = Math.round(((r.compat - 0.6) / 0.8) * 100);
  $('matchbox').innerHTML = `<div class="row sp"><span>Genre × Theme match</span><b>${r.compat.toFixed(1)}×</b></div><div class="bar"><i style="width:${cmpPct}%;background:${r.compat >= 1.2 ? '#2e9e5b' : r.compat >= 0.9 ? '#e0a020' : '#d64545'}"></i></div><div class="mut">${r.compat >= 1.2 ? 'Great combination!' : r.compat >= 0.9 ? 'Works okay.' : 'Awkward mix - expect weaker reviews.'}</div>`;
  $('warnbox').innerHTML = (r.warnings.length ? r.warnings.map((w) => `<div class="warn">⚠ ${esc(w)}</div>`).join('') : '<div class="ok">✔ Well balanced</div>');
  const eps = st.mediaTypes.tv.episodeOptions;
  $('startbar').innerHTML = `<div class="sb-grid">
    <div><div class="mut">Required points</div><b>${r.requiredPts.toLocaleString()}</b><div class="mut">team ${r.teamPts}/mo → ${r.durationMonths} mo (${r.durationYears.toFixed(1)}y)</div></div>
    <div><div class="mut">Forecast score</div><b class="${r.score >= 7 ? 'good' : r.score < 5 ? 'bad' : ''}">${r.score}/10</b> <span class="mut">${esc(r.label)}</span><div class="mut">sales ${r.sales.toLocaleString()} · ✨ ${(r.sensChance * 100).toFixed(0)}% sensation</div></div>
    <div><div class="mut">Monthly costs</div><b>${money(r.monthlyCost)}</b><div class="mut">budget ${money(r.budget)} · profit ${money(r.profit)}</div></div>
    <div><label class="mut">Marketing <select data-sd="marketing">${st.marketing.map((m) => `<option value="${m.id}" ${m.id === d.marketing ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></label>
      ${btn('startproject', '🚀 Start', '', '', !!b.project)}</div></div>
    ${r.missing.length ? `<div class="warn">No staff for: ${esc(r.missing.join(', '))} (skill counts as ${Studio.DEFAULT_SKILL}). Hire them in Overview.</div>` : ''}${b.project ? '<div class="warn">A project is already in development.</div>' : ''}<div class="mut" id="sderr">${esc(S.uiMsg || '')}</div>`;
}

// ---------- Team ----------
export function teamView(S, ui, b) {
  const st = ST(), medium = D.bizTypes[b.type].medium, prof = Studio.profile(medium, (b.draft || {}).format), list = Studio.availableSpecialists(b, medium), hired = b.specialists || [];
  const payroll = Studio.specialistWages(b);
  return `<div class="card"><div class="row sp"><b>Specialists ${hired.length}/${st.balance.specialistCap}</b><span>payroll ${money(payroll / 12)}/mo</span></div><p class="mut">Fame ${Math.round(b.fame || 0)} unlocks stars (${esc(Studio.fameTier(b).label)}). Hiring costs one month of salary.</p></div>` +
    list.map((sp) => { const on = hired.includes(sp.id), lock = (b.fame || 0) < sp.minFame;
      return `<div class="card spec"><span class="avatar">${sp.icon}</span><div style="flex:1"><b>${esc(sp.name)}</b> <span class="mut">${esc(sp.role)} · ${money(sp.salaryPerTurn)}/mo</span><br><span class="mut">${esc(sp.bio)}</span><br>${tags(sp, prof)}${lock ? `<br><span class="bad">🔒 needs fame ${sp.minFame}</span>` : ''}</div>${on ? btn('fire', 'Dismiss', `data-k="${sp.id}"`, 'sm alt') : btn('hirespec', 'Hire', `data-k="${sp.id}"`, 'sm', lock || hired.length >= st.balance.specialistCap || S.cash < sp.salaryPerTurn)}</div>`; }).join('');
}

// ---------- Market ----------
export function marketView(S, ui, b) {
  const st = ST(), medium = D.bizTypes[b.type].medium, d = Studio.getDraft(S, b), prof = Studio.profile(medium, d.format), tr = Studio.getTrends(S), shares = Studio.getConsoleShare(S);
  let h = '';
  if (medium === 'game') {
    const cs = st.consoles.map((c) => ({ ...c, st: Studio.consoleState(S, c.id) })).sort((a, b2) => shares[b2.id] - shares[a.id]);
    h += `<div class="card"><h3>Console market · ${Studio.yearOf(S)}</h3><div class="stack">${cs.map((c) => `<div style="width:${shares[c.id]}%;background:${c.color}" title="${esc(c.name)} ${shares[c.id]}%"></div>`).join('')}</div>
      ${cs.map((c) => { const hist = c.st.hist, dlt = hist.length > 1 ? shares[c.id] - hist.at(-2) : 0; return `<div class="row sp optrow"><span>${c.icon} <b>${esc(c.name)}</b> <span class="mut">${esc(c.maker)} · ${esc(c.blurb)}</span></span><span><b>${shares[c.id]}%</b> <span class="${dlt >= 0 ? 'up' : 'dn'}">${dlt >= 0 ? '▲' : '▼'}${Math.abs(dlt).toFixed(1)}</span> ⚡${Math.round(c.st.power)} <span class="mut">${c.st.age}y</span></span></div>`; }).join('')}
      <h3>Share history (yearly)</h3>${multiChart(cs.map((c) => ({ color: c.color, vals: [...c.st.hist] })))}<p class="mut">Share (market momentum) and hardware power ⚡ shift every year; refreshes boost both. Share lifts game sales; power lifts graphics-heavy games.</p></div>`;
  } else {
    h += `<div class="card"><h3>${esc(prof.platformLabel)}</h3>${Studio.platforms(medium, d.format).map((p) => `<div class="row sp"><span>${esc(p.name)}</span><span class="mut">reach ×${p.reach} · fee ${Math.round((p.feeFrac || 0) * 100)}%</span></div>`).join('')}</div>`;
  }
  const row = (kind, list, labels) => list.map((x) => `<div class="row sp"><span>${x.icon} ${esc(labels[x.id])}</span>${heatTag(tr[kind][x.id])}</div>`).join('');
  h += `<div class="card"><h3>Genre trends</h3>${row('genres', st.genres, prof.genreLabels)}</div><div class="card"><h3>Theme trends</h3>${row('themes', st.themes, prof.themeLabels)}</div>`;
  return h;
}

// ---------- History ----------
export function historyView(S, ui, b) {
  const medium = D.bizTypes[b.type].medium, prof = Studio.profile(medium, null), hist = Studio.getHistory(b), n = hist.length;
  const avg = n ? hist.reduce((a, r) => a + r.score, 0) / n : 0, tot = hist.reduce((a, r) => a + r.profit, 0);
  const shows = (b.shows || []).map((sh) => `<div class="card"><div class="row sp"><b>${esc(sh.title)}</b><span class="pill">${esc(sh.status)} · ratings ${sh.ratings.toFixed(1)}</span></div><div class="mut">${sh.seasons.map((x) => `S${x.n} ${x.score}/10${x.sensation ? '✨' : ''}`).join(' · ')}</div></div>`).join('');
  return `<div class="card"><div class="row sp"><span><b>${n}</b> releases</span><span>avg score <b>${avg.toFixed(1)}</b></span><span>total profit <b class="${tot >= 0 ? 'good' : 'bad'}">${money(tot)}</b></span><span>✨ ${b.sensations || 0} sensations</span></div></div>` +
    (medium === 'tv' ? `<h3>Shows</h3>${shows || '<p class="mut">No shows yet.</p>'}` : '') + '<h3>Releases</h3>' +
    (hist.map((r) => `<div class="card hist ${r.sensation ? 'sens' : ''}"><div class="row sp"><b>${esc(r.title)}</b><span class="score">${r.score}<span class="mut">/10</span></span></div>
      <div class="mut">${esc((Studio.profile(r.media, r.format).genreLabels || {})[r.genre] || r.genre)} / ${esc((Studio.profile(r.media, r.format).themeLabels || {})[r.theme] || r.theme)} · ${r.year} · ${esc(r.label)}${r.sensation ? ` · <b class="sensation">✨ SENSATION ×${r.sensMult}</b>` : ''}${r.renewal ? ' · ' + esc(r.renewal) : ''}</div>
      <div class="row sp"><span>sales ${r.sales.toLocaleString()}</span><span>rev ${money(r.revenue)}</span><span class="${r.profit >= 0 ? 'good' : 'bad'}">${money(r.profit)}</span></div></div>`).join('') || '<p class="mut">No releases yet.</p>');
}
