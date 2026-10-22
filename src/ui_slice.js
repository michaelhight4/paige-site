// UI for Game dev's Job and Assets menus, plugged into the hub via registerHook('job'|'assets'). HTML strings + data-act delegation.
// Slice logic lives in src/slice/*; this file only renders and routes clicks (state sync via slice_bridge).
import * as B from './slice_bridge.js';
import { registerHook } from './ui_life.js';
import { money, esc, btn } from './ui_util.js';
const { H } = B;
let cur = { S: null, ui: null };
const V = (ui, k) => (ui.sl = ui.sl || { job: { view: 'home' }, as: { view: 'home' } })[k];
const d = () => B.sliceData();
const $ = (n) => money(n);
const say = (r) => { if (cur.ui && r && r.msg) cur.ui.toast = r.msg; return r; };
const run = (fn) => say(B.call(cur.S, fn));
const row = (title, sub, right, act, data) => `<div class="card row sp" ${act ? `data-act="${act}" ${data || ''} style="cursor:pointer"` : ''}><span><b>${esc(title)}</b>${sub ? `<br><span class="mut">${sub}</span>` : ''}</span><span>${right || ''}</span></div>`;
const back = (k) => `<div class="row sp"><button class="alt sm" data-act="sl_back" data-k="${k}">← Back</button></div>`;

// ---------- Job ----------
function jobView(S, ui) {
  const sl = B.pull(S), v = V(ui, 'job'), D_ = d(), out = [`<div class="card"><h3>Careers</h3>`];
  const j = sl.job;
  out.push(j ? `<p><b>${esc(j.title)}</b> · ${$(j.wage)}/yr · ${j.years}y ${btn('sl_quit', 'Quit', '', 'warn sm')}</p>` : `<p class="mut">Not employed${S.age < 16 ? ' (too young for full-time work)' : ''}.</p>`);
  if (sl.partTime) out.push(`<p>Part-time: <b>${esc(sl.partTime.title)}</b> ${btn('sl_quitpt', 'Quit', '', 'alt sm')}</p>`);
  if (sl.edu.inSchool) out.push(`<p>School: <b>${esc(sl.edu.inSchool.majorName || D_.occ.education.names[sl.edu.inSchool.id])}</b> (${sl.edu.inSchool.yearsLeft}y left) ${btn('sl_dropout', 'Drop out', '', 'alt sm')}</p>`);
  out.push('</div>');
  if (v.view === 'home') {
    out.push(`<div class="card"><div class="row">${[['industries', 'Careers'], ['pt', 'Part-time'], ['gig', 'Freelance'], ['mil', 'Military'], ['sp', 'Special'], ['edu', 'Education'], ['col', 'Collection']].map(([k, n]) => btn('sl_job_go', n, `data-k="${k}"`, 'alt sm')).join('')}</div></div>`);
  } else if (v.view === 'industries') {
    out.push(back('job'), ...H.listCareers(D_, sl).map((x) => row(x.name, `${x.open} open of ${x.entries} entry roles`, '›', 'sl_job_sector', `data-k="${x.id}"`)));
  } else if (v.view === 'sector') {
    out.push(back('job'), ...H.listCareers(D_, sl, { sector: v.sector }).filter((x) => x.level === 0 || x.current).map((x) => row(x.title, x.eligible ? `Ladder: ${esc(x.ladder.join(' → '))}` : `<span class="bad">${esc(x.reasons.join(' · '))}</span>`, `${$(x.wage)}/yr ${btn('sl_apply', 'Apply', `data-k="${x.id}"`, 'sm', !x.eligible)}`)));
  } else if (v.view === 'pt') {
    out.push(back('job'), ...H.listPartTime(D_, sl).map((x) => row(x.title, x.eligible ? `${x.weekly_hours}h/wk` : esc(x.reasons.join(' · ')), `${$(x.weekly_wage * 52)}/yr ${btn('sl_apply_pt', 'Take', `data-k="${x.id}"`, 'sm', !x.eligible)}`)));
  } else if (v.view === 'gig') {
    out.push(back('job'), ...H.listFreelance(D_, sl).map((x) => row(x.title, `${x.done}/${x.max_per_year} this year · $${x.min_hourly}-${x.max_hourly}/h`, btn('sl_gig', 'Do a gig', `data-k="${x.id}"`, 'sm', !x.eligible))));
  } else if (v.view === 'mil') {
    out.push(back('job'), ...H.listMilitary(D_, sl).map((x) => row(x.name, esc(x.desc), btn('sl_enlist', 'Enlist', `data-k="${x.id}"`, 'sm', x.eligible === false))));
  } else if (v.view === 'sp') {
    out.push(back('job'), ...H.listSpecial(D_, sl).map((x) => row(x.name, esc(x.desc) + (x.eligible === false ? ` <span class="bad">${esc((x.reasons || []).join(' · '))}</span>` : ''), btn('sl_joinsp', 'Start', `data-k="${x.id}"`, 'sm', x.eligible === false))));
  } else if (v.view === 'edu') {
    out.push(back('job'), ...H.listSchools(D_, sl).map((x) => row(x.name, `${x.years}y · ${$(x.tuition)}/yr · ${x.done ? '<b>done</b>' : x.eligible ? esc(x.desc) : `<span class="bad">${esc((x.reasons || []).join(' · '))}</span>`}`, btn('sl_enroll', x.inProgress ? 'Enrolled' : 'Enroll', `data-k="${x.id}"`, 'sm', !x.eligible || x.done || x.inProgress))));
  } else if (v.view === 'col') {
    const c = H.listCollection(D_, sl); out.push(back('job'), `<div class="card"><b>${c.collectedCount}/${c.total}</b> careers collected</div>`);
  }
  return out.join('');
}
// ---------- Assets ----------
const swatch = (a) => { const v = B.variantOf(a); if (!v) return ''; const svg = B.svgFor(a); const dots = Object.entries(v.colors).filter(([k]) => v.names[k]).map(([k, c]) => `<i title="${esc(k + ': ' + (v.names[k] || ''))}" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${c};border:1px solid #0003;margin-right:3px"></i>`).join(''); return `${svg ? `<div class="art" style="width:120px;max-width:40%;float:right">${svg}</div>` : ''}<span class="mut">${dots}${esc(v.label)}${v.rarity !== 'common' ? ` · <b>${v.rarity}</b> ×${v.valueMult}` : ''}</span><br>`; };
function assetsView(S, ui) {
  const sl = B.pull(S), v = V(ui, 'as'), D_ = d(), out = [], fc = H.financesCard(D_, sl);
  out.push(`<div class="card"><h3>Assets & shopping</h3><p>Assets <b>${$(fc.assets)}</b> · Investments <b>${$(fc.investments)}</b>${fc.loans ? ` · Loans <b class="bad">${$(fc.loans)}</b>` : ''}</p><div class="row">${[['inv', 'Owned'], ['shops', 'Shopping'], ['invest', 'Investments']].map(([k, n]) => btn('sl_as_go', n, `data-k="${k}"`, v.view === k ? 'sm' : 'alt sm')).join('')}</div></div>`);
  if (v.view === 'inv' || v.view === 'home') {
    const inv = H.listInventory(D_, sl); if (!inv.length) out.push('<p class="mut">You own nothing from the shops yet.</p>');
    for (const a of inv) out.push(`<div class="card">${swatch(a)}<b>${esc(a.address || a.name)}</b> <span class="mut">cond ${a.cond}${a.loan ? ` · loan ${$(a.loan.balance)}` : ''}</span><br>Worth <b>${$(a.value ?? H.assetValue(D_, a))}</b><div class="row">${btn('sl_sell', `Sell (${$(H.sellQuote(D_, sl, a.uid).net)})`, `data-k="${a.uid}"`, 'warn sm')}${H.listPlans(D_, a.cat).slice(0, 3).map((p) => btn('sl_restore', `${esc(p.name)}`, `data-k="${a.uid}" data-p="${p.id}"`, 'alt sm', a.cond >= 100)).join('')}</div></div>`);
  } else if (v.view === 'shops') {
    out.push(...H.listShops(D_).map((x) => row(x.name, esc(x.blurb), '›', 'sl_shop', `data-k="${x.id}"`)));
  } else if (v.view === 'shop') {
    const why = H.checkBuy(D_, sl, H.listShops(D_).find((x) => x.id === v.shop).category);
    out.push(`<div class="row sp"><button class="alt sm" data-act="sl_as_go" data-k="shops">← Shops</button>${btn('sl_refresh', 'Refresh stock', '', 'alt sm')}</div>${why.length ? `<p class="bad">${esc(why.join(' · '))}</p>` : ''}`);
    for (const a of H.listListings(D_, sl, v.shop)) out.push(`<div class="card">${swatch(a)}<b>${esc(a.address || a.name)}</b> <span class="mut">age ${a.age} · cond ${a.cond}</span><br>Asking <b>${$(a.price)}</b> <span class="mut">(worth ${$(a.value)})</span><div class="row">${btn('sl_buy', 'Buy', `data-k="${a.uid}" data-f="cash"`, 'sm', !!why.length || S.cash < a.price)}${btn('sl_buy', 'Finance', `data-k="${a.uid}" data-f="loan"`, 'alt sm', !!why.length)}</div></div>`);
  } else if (v.view === 'invest') {
    for (const i of H.listInvestments(D_, sl)) out.push(row(i.name, `${$(i.price)}/unit · you hold ${i.units} (${$(i.value)})`, `${btn('sl_ibuy', 'Buy $10k', `data-k="${i.id}"`, 'sm', S.cash < 10000)}${i.units ? btn('sl_isell', 'Sell all', `data-k="${i.id}"`, 'alt sm') : ''}`));
  }
  return out.join('');
}
const go = (tab, view, extra = {}) => { Object.assign(V(cur.ui, tab), { view }, extra); };
const A = {
  sl_back: (x) => go(x.k, 'home'), sl_job_go: (x) => go('job', x.k), sl_job_sector: (x) => go('job', 'sector', { sector: x.k }),
  sl_apply: (x) => { const r = run((D_, sl) => H.applyJob(D_, sl, x.k)); if (r.ok) go('job', 'home'); },
  sl_apply_pt: (x) => run((D_, sl) => H.applyPartTime(D_, sl, x.k)), sl_gig: (x) => run((D_, sl) => H.doGig(D_, sl, x.k)),
  sl_enlist: (x) => run((D_, sl) => H.enlist(D_, sl, x.k)), sl_joinsp: (x) => run((D_, sl) => H.joinSpecial(D_, sl, x.k)),
  sl_enroll: (x) => run((D_, sl) => H.enroll(D_, sl, x.k)), sl_dropout: () => run((D_, sl) => H.dropOut(D_, sl)),
  sl_quit: () => run((D_, sl) => H.quitJob(D_, sl)), sl_quitpt: () => run((D_, sl) => H.quitPartTime(D_, sl)),
  sl_as_go: (x) => go('as', x.k), sl_shop: (x) => go('as', 'shop', { shop: x.k }),
  sl_refresh: () => run((D_, sl) => H.refreshInventory(D_, sl, V(cur.ui, 'as').shop)),
  sl_buy: (x) => run((D_, sl) => H.buyAsset(D_, sl, V(cur.ui, 'as').shop, x.k, { financing: x.f })),
  sl_sell: (x) => run((D_, sl) => H.sellAsset(D_, sl, x.k)),
  sl_restore: (x) => run((D_, sl) => H.startRestoration(D_, sl, x.k, x.p)),
  sl_ibuy: (x) => run((D_, sl) => H.buyInvestment(D_, sl, x.k, 10000)), sl_isell: (x) => run((D_, sl) => H.sellInvestment(D_, sl, x.k, 'all')),
};
const wrapActs = (acts) => Object.fromEntries(Object.entries(acts).map(([k, f]) => [k, (x, el) => f(x, el)]));
export function install() {
  registerHook('job', { render: (S, api) => { cur = { S, ui: api.ui }; return jobView(S, api.ui); }, acts: wrapActs(A) });
  registerHook('assets', { render: (S, api) => { cur = { S, ui: api.ui }; return assetsView(S, api.ui); } });
}
export const _internal = { jobView, assetsView, A, setCur: (S, ui) => { cur = { S, ui }; } };
