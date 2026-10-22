// UI: renders views as HTML strings, delegated click/change/input handlers.
import * as E from './engine.js';
import * as Biz from './business.js';
import * as Studio from './studio.js';
import * as Market from './market.js';
import * as Sports from './sports.js';
import { $, money, pct, esc, sgn, btn, chart } from './ui_util.js';
import * as SU from './ui_studio.js';
import * as RU from './replay_ui.js';
import * as UL from './ui_life.js';
import * as USl from './ui_slice.js';
USl.install();
import * as Legacy from './legacy.js';
const { D } = E;

let S = null, tab = 'life', toast = '';
const ui = { person: null, surrender: false, toast: '', biz: null, stTab: 'overview', sports: 'standings', give: [], get: null, getTeam: null, stock: null, msg: '', openFinals: false, fxSeen: null };
// ---------- views ----------
const header = () => UL.header(S);
const views = {
  life() { return UL.hub(S, ui); },
  people() { return UL.peopleView(S, ui); },
  act() { return UL.activitiesView(S, ui); },
  legacy() { return UL.legacyView(S); },
  cemetery() { return UL.cemeteryView(); },
  work() { return UL.hookOrLegacy(S, ui, 'job', this.workL()); },
  workL() {
    const j = S.job, c = j && D.careers.find((x) => x.id === j.id), stage = E.stageOf(S);
    let h = `<div class="card"><h2>School</h2><p>${stage === 'primary' ? 'Primary school (auto)' : stage === 'high' ? 'High school (auto) — smarts grow each year' : stage === 'college' ? `College: year ${(S.college.yrs).toFixed(1)} / 4 · tuition $20k/yr added to debt` : S.edu === 2 ? 'College graduate' : S.edu === 1 ? 'High school graduate' : 'Too young'}</p>
      ${S.school === null && S.edu === 1 && S.age < 30 ? btn('college', 'Enroll in college (4 yrs, student loan)') : ''}
      ${S.debt > 0 ? `<div class="row">${btn('repay', 'Repay $10k', 'data-n="10000"', 'alt sm', S.cash < 1)} ${btn('repay', 'Repay all possible', 'data-n="1e12"', 'alt sm', S.cash < 1)} <span class="mut">${(E.DEBT_RATE * 100).toFixed(0)}% interest; 25% of cash auto-pays</span></div>` : ''}</div>`;
    if (j) {
      const lv = c.levels;
      h += `<div class="card"><h2>${esc(lv[j.level][0])} — ${c.name}</h2><p>Salary <b>${money(E.salaryNow(S))}</b>/yr (taxed ${E.TAX * 100}%) · Performance ${Math.round(j.perf)}${pct(j.perf)}</p>
        <p class="mut">Ladder: ${lv.map((l, i) => `<span class="pill" style="${i === j.level ? 'background:#cfe0ff' : ''}">${l[0]} ${money(l[1])}</span>`).join('')}</p>
        <p class="mut">Promotion odds depend on performance (smarts, mood, health, "work extra hard") and sector health (${c.sector || 'n/a'}). Layoffs happen in deep slumps.</p>${btn('quit', 'Quit job', '', 'warn sm')}</div>`;
    } else {
      const el = E.eligibleCareers(S);
      h += `<div class="card"><h2>Find a job</h2>${el.length ? el.map((x) => `<div class="row sp"><span><b>${x.name}</b> <span class="mut">from ${money(x.levels[0][1])}, tops ${money(x.levels.at(-1)[1])}${x.edu ? ' · needs ' + (x.edu === 2 ? 'college' : 'HS') : ''}</span></span>${btn('job', 'Apply', `data-k="${x.id}"`, 'sm')}</div>`).join('') : '<p class="mut">No eligible jobs yet (age 16+ for entry jobs).</p>'}</div>`;
    }
    return h;
  },
  assets() { return UL.hookOrLegacy(S, ui, 'assets', this.assetsL()); },
  assetsL() {
    const own = S.assets.map((a) => `<tr><td>${a.name}</td><td>${money(a.value)}</td><td>${money(a.upkeep)}/yr</td><td>${btn('sell', 'Sell', `data-k="${a.uid}"`, 'sm alt')}</td></tr>`).join('');
    const kinds = ['car', 'house', 'boat', 'plane'];
    return `<div class="card"><h2>Your assets</h2>${own ? `<table>${own}</table>` : '<p class="mut">None. Owning a house removes rent. Houses track real-estate sector health; others depreciate.</p>'}</div>` +
      kinds.map((k) => `<div class="card"><h3>${k[0].toUpperCase() + k.slice(1)}s</h3>${D.assetCatalog.filter((a) => a.kind === k).map((a) => `<div class="row sp"><span>${a.name} <span class="mut">${money(a.price)} · upkeep ${money(a.upkeep)}/yr · ${a.dep < 0 ? 'appreciates' : '-' + a.dep * 100 + '%/yr'}</span></span><span>${btn('buy', 'Buy', `data-k="${a.id}"`, 'sm', S.cash < a.price || S.age < 18)} ${btn('buy', '20% down', `data-k="${a.id}" data-f="1"`, 'sm alt', S.cash < a.price * 0.2 || S.age < 18)}</span></div>`).join('')}</div>`).join('');
  },
  stocks() {
    const m = S.market, t = ui.stock || m.cos[0].tkr, st = m.stocks[t], co = m.cos.find((c) => c.tkr === t), h = S.hold[t];
    const rows = m.cos.map((c) => { const s2 = m.stocks[c.tkr], prev = s2.hist.at(-2) || s2.p, hh = S.hold[c.tkr]; return `<tr data-act="pick" data-k="${c.tkr}" style="cursor:pointer;${c.tkr === t ? 'background:#eef3ff' : ''}"><td><b>${c.tkr}</b> <span class="mut">${c.sector}</span></td><td>$${s2.p.toFixed(2)}</td><td class="${s2.p >= prev ? 'good' : 'bad'}">${((s2.p / prev - 1) * 100).toFixed(1)}%</td><td>${hh ? hh.sh : ''}</td></tr>`; }).join('');
    return `<div class="card"><h2>${co.name} (${t})</h2><p>$${st.p.toFixed(2)} · sector health ${Math.round(m.sectors[co.sector].h)} ${h ? `· you hold ${h.sh} (${sgn(h.sh * st.p - h.cost)})` : ''}</p>${chart(st.hist)}
      <div class="row">${[1, 10, 100].map((n) => btn('buys', 'Buy ' + n, `data-n="${n}"`, 'sm', st.p * n > S.cash)).join('')}${[1, 10, 100].map((n) => btn('sells', 'Sell ' + n, `data-n="${n}"`, 'sm alt', !h || h.sh < n)).join('')}${btn('sells', 'Sell all', `data-n="1e9"`, 'sm alt', !h)}</div></div>
      <div class="card"><h2>Market</h2><table><tr><th>Stock</th><th>Price</th><th>Δ</th><th>Held</th></tr>${rows}</table></div>
      <div class="card"><h2>Sector health</h2>${D.sectors.map((x) => `<div class="row"><span style="width:110px">${x.name}</span>${chart(m.sectors[x.id].hist, 200, 30)}<b>${Math.round(m.sectors[x.id].h)}</b></div>`).join('')}</div>
      <div class="card"><h2>News</h2><div class="log">${[...m.news].reverse().map((n) => `<div class="news">${Math.floor(n.age)}: ${esc(n.text)}</div>`).join('') || '<span class="mut">Quiet so far.</span>'}</div></div>`;
  },
  worth() {
    const nw = E.netWorth(S);
    return `<div class="card"><h2>Net worth: ${money(nw.total)}</h2>${chart(S.history.map((x) => x[1]))}<table>
      <tr><td>Cash</td><td>${money(nw.cash)}</td></tr><tr><td>Assets</td><td>${money(nw.assets)}</td></tr><tr><td>Stocks</td><td>${money(nw.stocks)}</td></tr>
      <tr><td>Businesses</td><td>${money(nw.biz)}</td></tr><tr><td>Debt</td><td class="bad">-${money(nw.debt)}</td></tr></table></div>
      <div class="card"><h3>Businesses</h3>${S.biz.map((b) => `<div class="row sp"><span>${esc(b.name)}</span><span>${money(b.valuation)}</span></div>`).join('') || '<span class="mut">none</span>'}</div>`;
  },
  biz() {
    if (ui.biz != null) { const b = S.biz.find((x) => x.id === ui.biz); if (b) return bizDetail(b); ui.biz = null; }
    const own = S.biz.map((b) => { const f = Biz.annualFinance(S, b); return `<div class="card row sp" data-act="open" data-k="${b.id}" style="cursor:pointer"><span><b>${esc(b.name)}</b> <span class="pill">${D.bizTypes[b.type].name}</span><br><span class="mut">rep ${Math.round(b.rep)} · ${b.staff.length || ''} staff · est. profit ${money(f.profit)}/yr</span></span><b>${money(b.valuation)}</b></div>`; }).join('');
    const founding = Object.entries(D.bizTypes).filter(([, t]) => t.kind !== 'sports').map(([id, t]) => { const c = t.fee + t.equip.reduce((a, e) => a + (e.starter || 0) * e.cost, 0); return `<div class="row sp"><span>${t.name} <span class="mut">LLC + starter kit ${money(c)}</span></span>${btn('found', 'Found', `data-k="${id}"`, 'sm', S.cash < c)}</div>`; }).join('');
    const offers = S.offers.map((o, i) => `<div class="row sp"><span>${esc(o.name || o.biz.name)} <span class="pill">${D.bizTypes[o.type].name}</span><br><span class="mut">${o.desc}</span></span>${btn('buyoffer', money(o.price), `data-k="${i}"`, 'sm', S.cash < o.price)}</div>`).join('');
    return `<div class="card"><h2>Your businesses</h2>${own || '<p class="mut">None yet. Found an LLC from scratch or buy a running business. Profit (taxed 20%) flows into cash each turn.</p>'}</div>
      <div class="card"><h2>Found a new LLC</h2>${founding}<p class="mut">Sports teams can only be bought. Buy more equipment and hire staff afterwards.</p></div>
      <div class="card"><h2>Businesses for sale</h2>${offers}</div>`;
  },
};

function bizDetail(b) {
  const t = D.bizTypes[b.type], f = Biz.annualFinance(S, b), roles = Biz.rolesOf(b);
  let h = `<div class="row sp"><button class="alt sm" data-act="back">← Back</button><span class="mut">${t.name}${b.tkr ? ' · ticker ' + b.tkr : ''}${b.fame != null && t.kind !== 'shop' ? ` · fame ${Math.round(b.fame)}` : ''}</span></div>`;
  if (t.kind === 'studio' && ui.stTab !== 'overview') return h + `<h2 style="margin:6px 0">${esc(b.name)} <span class="pill">${esc(Studio.fameTier(b).label)}</span></h2>` + SU.studioTabs(ui) + ({ create: SU.createView, team: SU.teamView, market: SU.marketView, history: SU.historyView }[ui.stTab] || SU.historyView)(S, ui, b);
  if (t.kind === 'studio') h += SU.studioTabs(ui);
  h += `<div class="card"><h2>${esc(b.name)}</h2><p>Reputation ${Math.round(b.rep)}${pct(b.rep)}${t.kind === 'studio' || t.kind === 'sports' ? `Fame ${Math.round(b.fame || 0)} <span class="pill">${esc(Studio.fameTier(b).label)}</span>${pct(b.fame || 0)}` : ''}</p>
    <table><tr><td>Revenue/yr</td><td>${money(f.revenue)}</td></tr>${f.cogs ? `<tr><td>Cost of goods</td><td>-${money(f.cogs)}</td></tr>` : ''}<tr><td>Wages</td><td>-${money(f.wages)}</td></tr><tr><td>Rent/arena</td><td>-${money(f.rent)}</td></tr><tr><td>Equipment upkeep</td><td>-${money(f.upkeep)}</td></tr>
    <tr><td><b>Profit/yr</b></td><td><b>${sgn(f.profit)}</b></td></tr>${t.kind === 'shop' ? `<tr><td>Demand / capacity</td><td>${Math.round(f.demand)} / ${Math.round(f.cap)} ${t.unit}/yr ${f.cap < f.demand ? '<span class="bad">(capacity-limited: add equipment/staff)</span>' : '<span class="good">(demand-limited: advertise)</span>'}</td></tr>` : ''}
    ${b.tail > 0 ? `<tr><td>Royalty tail</td><td>${money(b.tail)}</td></tr>` : ''}<tr><td>Valuation</td><td>${money(b.valuation)}</td></tr></table>
    <div class="row">${btn('advertise', 'Advertise (+4 rep)', `data-k="${b.id}"`, 'sm alt')}${btn('sellbiz', 'Sell (90% of value)', `data-k="${b.id}"`, 'sm warn')}</div></div>`;
  if (t.kind === 'sports') return h + sportsView(b);
  if (t.equip) h += `<div class="card"><h3>Equipment</h3>${t.equip.map((e) => `<div class="row sp"><span>${e.name} ×${b.equip[e.id] || 0} <span class="mut">${e.cap ? '+' + e.cap + ' ' + t.unit + '/yr' : '+' + e.seats + ' seats'}</span></span>${btn('equip', 'Buy ' + money(e.cost), `data-k="${b.id}" data-e="${e.id}"`, 'sm', S.cash < e.cost)}</div>`).join('')}</div>`;
  h += `<div class="card"><h3>Staff (${b.staff.length})</h3><table>${b.staff.map((p) => `<tr><td>${esc(p.name)}</td><td>${roles.find((r) => r.id === p.role).name}</td><td>skill ${Math.round(p.skill)}</td><td>${money(p.salary)}</td><td>${btn('fire', 'Fire', `data-k="${b.id}" data-p="${p.id}"`, 'sm alt')}</td></tr>`).join('')}</table>
    <h3>Hire</h3>${roles.map((r) => `<div class="row sp"><span>${r.name}</span><span>${Biz.TIERS.map((ti) => btn('hire', ti.name, `data-k="${b.id}" data-r="${r.id}" data-t="${ti.id}"`, 'sm alt')).join('')}</span></div>`).join('')}</div>`;
  if (t.kind === 'studio') {
    const p = b.project, last = b.lastRelease;
    h += `<div class="card"><h2>Development</h2>${p ? `<p><b>${esc(p.name)}</b> — ${(p.progress * 12).toFixed(0)} / ${(p.duration * 12).toFixed(0)} months ${pct((p.progress / p.duration) * 100)}</p><p class="mut">forecast score ~${p.score} · hype ${Math.round(p.hype)} · risk ${(p.risk * 100).toFixed(0)}%${p.troubled ? ' · troubled production' : ''} · budget ${money(p.budget)}</p>` : '<p class="mut">Nothing in development.</p>'}
      ${btn('studiotab', p ? 'Open creator' : '＋ Create new ' + esc(Studio.profile(t.medium, null).unitName.toLowerCase()), 'data-k="create"')}</div>
      <div class="card"><h3>Latest releases (${b.released.length})</h3>${b.released.slice(-5).reverse().map((r) => `<div class="row sp"><span>${esc(r.title)}${r.sensation ? ' ✨' : ''} <span class="mut">${r.year}</span></span><span><b>${r.score}</b>/10 · ${money(r.revenue)}</span></div>`).join('') || '<span class="mut">Nothing yet.</span>'}</div>`;
  }
  return h;
}

function sportsView(b) {
  const L = S.league, me = L.teams[L.my], tabs = ['standings', 'roster', 'trades', 'games', 'history'];
  let h = `<div class="tabs">${tabs.map((t) => btn('stab', t, `data-k="${t}"`, ui.sports === t ? 'sm' : 'sm alt')).join('')}</div>`;
  const row = (p, extra = '') => `<tr><td>${p.pos}</td><td>${esc(p.name)}</td><td><b>${Sports.ovr(p)}</b></td><td>${p.age}</td><td>${p.pot}</td><td>${money(p.sal)}</td><td class="mut">${Object.keys(Sports.RNAME).map((k) => p.r[k]).join('/')}</td>${extra}</tr>`;
  const head = '<tr><th>Pos</th><th>Name</th><th>OVR</th><th>Age</th><th>Pot</th><th>Salary</th><th title="SH/PA/DE/RE/AT/IQ">Ratings</th><th></th></tr>';
  if (L.finals && !L.finals.done) h += `<div class="card"><b>Finals!</b> ${btn('finals', 'Play the finals')}</div>`;
  if (ui.sports === 'standings') h += `<div class="card"><h3>Season ${L.season} — round ${L.round}/${Sports.ROUNDS}</h3><table><tr><th>#</th><th>Team</th><th>W-L</th><th>PF-PA</th><th>Str</th></tr>${Sports.standings(S).map((t, i) => `<tr style="${t.id === L.my ? 'background:#eef3ff' : ''}"><td>${i + 1}${i < 4 ? '*' : ''}</td><td>${t.name}</td><td>${t.w}-${t.l}</td><td>${t.pf}-${t.pa}</td><td>${Sports.strength(t).toFixed(0)}</td></tr>`).join('')}</table><p class="mut">* top 4 make the playoffs; semis auto-sim, you play the finals.</p></div>`;
  if (ui.sports === 'roster') h += `<div class="card"><h3>${me.name} roster (starters = top 5 OVR)</h3><table>${head}${[...me.roster].sort((a, b2) => Sports.ovr(b2) - Sports.ovr(a)).map((p) => row(p, `<td>${btn('release', 'Cut', `data-k="${p.id}"`, 'sm alt')}</td>`)).join('')}</table></div>
    <div class="card"><h3>Free agents</h3><table>${head}${L.fa.map((p) => row(p, `<td>${btn('signfa', 'Sign', `data-k="${p.id}"`, 'sm')}</td>`)).join('')}</table></div>`;
  if (ui.sports === 'trades') {
    const ti = ui.getTeam ?? L.teams.findIndex((t) => t.id !== L.my), th = L.teams[ti];
    h += `<div class="card"><h3>Trade market</h3><p class="mut">Pick one or more of your players, then one target. AI accepts if it values your side ≥ 105% of theirs (young/high-potential and high OVR count more).</p>
      <select data-ch="tradeteam">${L.teams.filter((t) => t.id !== L.my).map((t) => `<option value="${t.id}" ${t.id === ti ? 'selected' : ''}>${t.name} (${t.w}-${t.l})</option>`).join('')}</select>
      <h3>Give</h3><table>${head}${me.roster.map((p) => row(p, `<td>${btn('tgive', ui.give.includes(p.id) ? '✓' : '+', `data-k="${p.id}"`, ui.give.includes(p.id) ? 'sm' : 'sm alt')}</td>`)).join('')}</table>
      <h3>Get</h3><table>${head}${th.roster.map((p) => row(p, `<td>${btn('tget', ui.get === p.id ? '✓' : '+', `data-k="${p.id}"`, ui.get === p.id ? 'sm' : 'sm alt')}</td>`)).join('')}</table>
      <div class="row">${btn('trade', 'Propose trade', `data-t="${ti}"`, '', !ui.give.length || ui.get == null)}<span class="mut">${esc(ui.msg)}</span></div></div>`;
  }
  if (ui.sports === 'games') {
    const gs = [...L.games].reverse(), lf = L.lastFinals;
    h += `<div class="card"><h3>Recent games (replay)</h3>${lf ? `<div class="row sp"><span>🏆 S${lf.season} Finals: ${lf.home} <b>${lf.hs}</b> – <b>${lf.as}</b> ${lf.away}</span>${btn('replayfinals', 'Replay', '', 'sm')}</div>` : ''}${gs.map((g, i) => `<div class="row sp"><span>S${g.season} R${g.round}: ${g.home} <b>${g.hs}</b> – <b>${g.as}</b> ${g.away}</span>${btn('replay', 'Replay', `data-k="${L.games.length - 1 - i}"`, 'sm')}</div>`).join('') || '<span class="mut">No games yet — advance time.</span>'}</div>`;
  }
  if (ui.sports === 'history') h += `<div class="card"><h3>Champions</h3>${[...L.history].reverse().map((x) => `<div>S${x.season}: <b>${x.champion}</b> <span class="mut">over ${x.finalists.filter((n) => n !== x.champion)[0]}</span></div>`).join('') || '<span class="mut">None yet.</span>'}</div>`;
  return h;
}

// ---------- modals ----------
function fxIntensity(rel) { return rel.sensation ? (rel.sensMult >= 4 ? 5 : 4) : rel.score >= 8 ? 3 : rel.score >= 6.5 ? 2 : rel.score >= 5 ? 1 : 0; }
function modal() {
  const m = $('modal');
  if (!S) { m.innerHTML = ''; return; }
  if (!S.alive) { m.innerHTML = ui.hideEnd ? '' : UL.deathModal(S, ui); return; }
  const card = E.pendingCard(S);
  if (card) {
    m.innerHTML = UL.eventModal(S, card);
    return;
  }
  const fx = S.fx[0];
  if (fx) { // release-day / title sheet (+ fame_fx burst once per entry)
    const b = S.biz.find((x) => x.id === fx.biz), rel = b && b.released.find((r) => r.id === fx.rel);
    const key = fx.biz + ':' + (fx.rel || 'title') + ':' + S.turns;
    if (ui.fxSeen !== key) { ui.fxSeen = key; setTimeout(() => RU.burst(rel ? { intensity: fxIntensity(rel) || 1, label: rel.sensation ? 'SENSATION!' : rel.score >= 8 ? 'HIT!' : 'RELEASED', sub: `${rel.title} · ${rel.score}/10` } : { intensity: 4, label: 'CHAMPIONS!', sub: b ? b.name : '' }), 30); }
    m.innerHTML = rel ? `<div class="ov"><div class="box sheet ${rel.sensation ? 'sens' : ''}" id="sheet"><div class="mut">${esc(b.name)} · ${rel.year}</div><h2>${esc(rel.title)}</h2>
      ${rel.sensation ? `<div class="sensation">✨ SENSATION! ×${rel.sensMult} sales · fame +${rel.fameGain}</div>` : ''}<div class="bigscore ${rel.score >= 7 ? 'good' : rel.score < 5 ? 'bad' : ''}">${rel.score}<span class="mut">/10</span></div><p><b>${esc(rel.label)}</b></p>
      <table><tr><td>Sales</td><td>${rel.sales.toLocaleString()}</td></tr><tr><td>Revenue (studio share)</td><td>${money(rel.revenue)}</td></tr><tr><td>Profit</td><td>${sgn(rel.profit)}</td></tr><tr><td>Fame</td><td>${Math.round(b.fame)} (${esc(Studio.fameTier(b).label)})</td></tr>
      ${rel.renewal ? `<tr><td>Network</td><td><b>${rel.renewal === 'renewed' ? '✅ Renewed for another season' : '❌ Cancelled'}</b></td></tr>` : ''}</table>
      <div class="row">${btn('sheet', S.fx.length > 1 ? `Next (${S.fx.length - 1} more)` : 'Continue')}</div></div></div>`
      : `<div class="ov"><div class="box sheet sens" id="sheet"><h2>🏆 Champions!</h2><p>Your team won the title. Fame and stock rise.</p><div class="row">${btn('sheet', 'Continue')}</div></div></div>`;
    return;
  }
  m.innerHTML = '';
}

// ---------- replay / finals overlays ----------
function openGame(i) { const g = S.league.games[i]; if (!g) return; RU.openReplay({ log: Sports.buildEventLog(g), title: `S${g.season} R${g.round}: ${g.home} ${g.hs}–${g.as} ${g.away}`, note: 'Seeded replay: possession records + seeds regenerate the same event log every time.' }); }
function openFinalsLive() {
  const f = S.league.finals; if (!f || f.done) return;
  const me = S.league.teams[S.league.my], opp = S.league.teams[f.a === S.league.my ? f.b : f.a];
  RU.openReplay({ log: Sports.finalsLog(S), title: `Finals: ${me.name} vs ${opp.name}`, interactive: true, note: 'Pick a play for each of your possessions (hover to preview the routes).',
    onChoose: (id) => { const r = Sports.finalsPlay(S, id); persist(); if (r == null) return null; if (S.league.finals === null || S.league.finals.done) finalsFinished(); return Sports.finalsLog(S); },
    onClose: () => { render(); } });
}
function finalsFinished() { const l = S.league.lastFinals; if (l) { const t = $('rp-note'); if (t) t.textContent = `Final: ${l.home} ${l.hs}–${l.as} ${l.away}${l.hs > l.as ? ' — CHAMPIONS! 🏆' : ''}`; if (l.hs > l.as) setTimeout(() => RU.burst({ intensity: 4, label: 'CHAMPIONS!', sub: l.home }), 400); } }
function syncOverlays() {
  if (!S) return;
  const f = S.league.finals;
  if (ui.openFinals && f && !f.done && !RU.active()) { ui.openFinals = false; openFinalsLive(); } else if (!f || f.done) ui.openFinals = false;
}

// ---------- render & events ----------
function render() {
  if (!S) { $('app').innerHTML = menu(); modal(); return; }
  const body = views[tab] ? views[tab]() : views.life();
  $('app').innerHTML = header() + (['life', 'legacy', 'cemetery'].includes(tab) ? '' : UL.chips(tab)) + body + UL.bottomNav(S, tab);
  const jr = $('journal'); if (jr) jr.scrollTop = jr.scrollHeight;
  $('app').classList.toggle('wide', tab === 'biz' && ui.biz != null && ui.stTab === 'create');
  modal();
  if (tab === 'biz' && ui.biz != null && ui.stTab === 'create') { const b = S.biz.find((x) => x.id === ui.biz); if (b) SU.refreshCreator(S, b); }
  syncOverlays();
}
function menu() {
  return `<div class="card" style="margin-top:30px"><h2>LifeSim prototype</h2><p class="mut">Live a life, then own a studio, a team and a stock portfolio.</p>
    <label>Name<br><input type="text" id="nm" value="Alex"></label><p><label><input type="checkbox" id="sb"> Sandbox: start at 25 with $50M (try the business hook right away)</label></p>
    <div class="row">${btn('start', 'Start new life')}${E.load() ? btn('continue', 'Continue saved game', '', 'alt') : ''}</div></div>`;
}
function persist() { E.save(S); }
function say(t) { toast = t; ui.toast = t; }
const curBiz = () => S.biz.find((x) => x.id === ui.biz);

const act = {
  ...UL.makeActs(() => S, ui),
  tab: (d) => { tab = d.k; ui.msg = ''; ui.person = null; },
  start: () => { S = E.newGame({ name: $('nm').value || 'You', sandbox: $('sb').checked, seed: +new URLSearchParams(location.search).get('seed') || undefined }); tab = 'life'; ui.biz = null; ui.stTab = 'overview'; persist(); },
  continue: () => { S = E.load(); },
  newgame: () => { if (!S || !S.alive || confirm('Abandon this life?')) { S = null; ui.hideEnd = false; RU.closeReplay(); } },
  close: () => { ui.hideEnd = true; },
  save: () => { say(E.save(S) ? 'Saved.' : 'Save failed'); },
  step: (d) => E.setStep(S, d.k),
  turn: () => { E.takeTurn(S); ui.hideEnd = false; if (S.league.finals && !S.league.finals.done) ui.openFinals = true; },
  action: (d) => E.doAction(S, d.k),
  choice: (d) => { E.resolveCard(S, +d.k); },
  sheet: () => { S.fx.shift(); },
  college: () => E.enrollCollege(S), job: (d) => E.applyJob(S, d.k), quit: () => E.quitJob(S), repay: (d) => E.repay(S, +d.n),
  buy: (d) => E.buyAsset(S, d.k, !!d.f), sell: (d) => E.sellAsset(S, +d.k),
  pick: (d) => { ui.stock = d.k; }, buys: (d) => Market.buyStock(S, ui.stock || S.market.cos[0].tkr, +d.n), sells: (d) => { const t = ui.stock || S.market.cos[0].tkr; Market.sellStock(S, t, Math.min(+d.n, S.hold[t]?.sh || 0)); },
  open: (d) => { ui.biz = +d.k; ui.stTab = 'overview'; }, back: () => { ui.biz = null; },
  found: (d) => { const r = Biz.found(S, d.k); if (r.ok) { ui.biz = r.biz.id; ui.stTab = 'overview'; } else say(r.err); },
  buyoffer: (d) => { const r = Biz.buyOffer(S, +d.k); if (r.ok) { ui.biz = r.biz.id; ui.stTab = 'overview'; } },
  hire: (d) => Biz.hire(S, S.biz.find((b) => b.id === +d.k), d.r, d.t), fire: (d) => { const b = curBiz(); if (d.p) Biz.fire(S, S.biz.find((x) => x.id === +d.k), +d.p); else Studio.fire(S, b, d.k); },
  hirespec: (d) => { const b = curBiz(); if (!Studio.hire(S, b, d.k)) ui.msg = 'Cannot hire'; },
  equip: (d) => Biz.buyEquip(S, S.biz.find((b) => b.id === +d.k), d.e), advertise: (d) => Biz.advertise(S, S.biz.find((b) => b.id === +d.k)),
  sellbiz: (d) => { if (confirm('Sell this business?')) { Biz.sell(S, S.biz.find((b) => b.id === +d.k)); ui.biz = null; } },
  // ---- studio creator ----
  studiotab: (d) => { ui.stTab = d.k; S.uiMsg = ''; },
  sd: (d) => { const b = curBiz(); if (!b) return; setDraft(b, d.f, d.v); },
  dice: () => { const b = curBiz(), dr = Studio.getDraft(S, b); dr.title = Studio.genName(S, dr); },
  autobalance: () => { const b = curBiz(), dr = Studio.getDraft(S, b); dr.split = Studio.idealSplit(dr.genre); return 'soft'; },
  startproject: () => { const b = curBiz(), dr = Studio.getDraft(S, b), r = Studio.startProject(S, b, dr); S.uiMsg = r.ok ? '' : r.err; if (r.ok) ui.stTab = 'overview'; },
  stab: (d) => { ui.sports = d.k; ui.msg = ''; },
  release: (d) => Sports.releasePlayer(S, +d.k), signfa: (d) => Sports.signFA(S, +d.k),
  tgive: (d) => { const id = +d.k, i = ui.give.indexOf(id); i < 0 ? ui.give.push(id) : ui.give.splice(i, 1); }, tget: (d) => { ui.get = ui.get === +d.k ? null : +d.k; },
  trade: (d) => { const r = Sports.proposeTrade(S, ui.give, +d.t, [ui.get]); ui.msg = r.msg; if (r.ok) { ui.give = []; ui.get = null; } },
  replay: (d) => { openGame(+d.k); return 'norender'; },
  replayfinals: () => { const l = S.league.lastFinals; if (l) RU.openReplay({ log: Sports.finalsLog(S), title: `S${l.season} Finals: ${l.home} ${l.hs}–${l.as} ${l.away}`, note: 'Your finals, recreated from the stored possessions.' }); return 'norender'; },
  finals: () => { ui.openFinals = true; },
};
// Apply a draft field change with the cascading fixes a real creator needs (format -> platform/engine/tier; genre -> ideal split; sequel -> inherit).
function setDraft(b, f, v) {
  const d = Studio.getDraft(S, b), medium = D.bizTypes[b.type].medium;
  if (f === 'sequelOf') {
    d.sequelOf = v || null;
    if (v) { const o = Studio.sequelOptions(b).find((x) => x.id === v); if (o) { d.genre = o.genre; d.theme = o.theme; if (o.platform) d.platform = o.platform; if (o.format) d.format = o.format; d.split = Studio.idealSplit(d.genre); fixDraft(b, medium); } }
    return;
  }
  d[f] = f === 'episodes' ? +v : v;
  if (f === 'genre') d.split = Studio.idealSplit(v);
  if (f === 'format') { fixDraft(b, medium, true); }
}
function fixDraft(b, medium, reset) {
  const d = Studio.getDraft(S, b), prof = Studio.profile(medium, d.format);
  if (!prof.tiers.some((t) => t.id === d.tier)) d.tier = prof.tiers[0].id;
  if (!prof.engines.some((e) => e.id === d.engine)) d.engine = prof.engines[0].id;
  const pl = Studio.platforms(medium, d.format); if (!pl.some((p) => p.id === d.platform)) d.platform = pl[0].id;
  if (reset) d.sequelOf = null;
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled || !el.dataset.act) return;
  const fn = act[el.dataset.act] || UL.hookActs[el.dataset.act]; if (!fn) return;
  const r = fn(el.dataset, el); if (r === 'norender') return;
  if (S && S.alive !== undefined) persist();
  if (r === 'soft' && $('startbar')) { const b = curBiz(); render(); return; }
  render();
});
document.addEventListener('change', (e) => {
  const t = e.target; if (t.dataset.ch === 'tradeteam') { ui.getTeam = +t.value; ui.get = null; render(); return; }
  const k = t.dataset.sd; if (!k) return; const b = curBiz();
  if (k === 'studio') { ui.biz = +t.value; render(); return; }
  if (k === 'sequelOf') setDraft(b, 'sequelOf', t.value); else Studio.getDraft(S, b)[k] = k === 'episodes' ? +t.value : t.value;
  render();
});
document.addEventListener('input', (e) => {
  const t = e.target; if (!S) return;
  if (t.dataset.effort) { const b = curBiz(); Studio.setEffort(S, b, t.dataset.effort, +t.value); SU.refreshCreator(S, b); }
  else if (t.dataset.sdName) { Studio.getDraft(S, curBiz()).title = t.value; }
});

(async function boot() {
  await E.loadData(); S = null; render();
  window.__lifesim = { get state() { return S; }, E, UL, registerHook: UL.registerHook, Legacy, Biz, Studio, Market, Sports, RU, SU, ui, render }; // debug / test hook
})();
