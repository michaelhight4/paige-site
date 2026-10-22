// Registry for screens added by later stages (skills, passions, scholarships, businesses). Each *Entries() returns [{id,label,sub,icon,open(nav),kw}].
export const lifeEntries = () => [{ id: 'life:passions', label: 'Passions', sub: 'Pick, practice and master a passion', icon: '🔥', open: (n) => n.open('Passions', passionsScreen), kw: 'hobby mastery music sports science' }];
export const workEntries = () => [];
export const businessEntries = () => [{ id: 'biz:hub', label: 'Businesses & Studios', sub: 'Your companies, studios and sports teams', icon: '🏢', open: (n) => n.open('Businesses & Studios', businessesScreen), kw: 'company studio team own' },
  { id: 'biz:found', label: 'Start a business', sub: 'Shops, services, fleets, farms, hotels…', icon: '🏪', open: (n) => n.open('Start a business', foundScreen), kw: 'found open startup' },
  { id: 'biz:buy', label: 'Buy an established business', sub: 'Running businesses for sale', icon: '💰', open: (n) => n.open('Businesses for sale', offersScreen), kw: 'acquire offers' }];
export const skillEntries = () => [{ id: 'skill:passions', label: 'Passions', sub: 'Meters, masteries, switching', icon: '🔥', open: (n) => n.open('Passions', passionsScreen), kw: 'passion' }, { id: 'skill:main', label: 'Skills', sub: 'Physical, mental, emotional, practical', icon: '📈', open: (n) => n.open('Skills', skillsScreen), kw: 'strength memory focus' }];
import { colorName } from '../colorname.js';
import { adapter } from '../adapter.js';
import { autoPageCard } from './autopage.js';
import { store, h, row, section, kv, btn, empty, chip, bar, money, sheet, confirmSheet, act, askNumber, toast } from '../ui.js';

export async function businessesScreen(body, { nav, refresh }) {
  const b = await adapter.getBusinesses();
  body.append(h('div', { class: 'card', 'data-el': 'biz-summary' }, h('h3', { text: 'Your businesses' }), kv('Cash', money(b.cash)), kv('Owned', String(b.owned.length)), (() => { const t = b.owned.reduce((a, x) => a + x.profit, 0); return kv('Total profit / yr', money(t), t < 0 ? 'neg' : t > 0 ? 'pos' : ''); })(), (() => { const w = b.owned.filter((x) => x.profit < 0).sort((x, y) => x.profit - y.profit)[0]; return w ? kv('Biggest loser', `${w.name}: ${money(w.profit)}`, 'neg') : null; })()));
  body.append(h('div', { class: 'btns', style: { padding: '8px 12px 0' } }, btn('🏪 Start a business', () => nav.open('Start a business', foundScreen), 'go sm', { 'data-el': 'biz-found' }), btn('💰 Buy one', () => nav.open('Businesses for sale', offersScreen), 'alt sm', { 'data-el': 'biz-buy' })));
  // every venture type can be started or bought right here (same screens and state as the Work menu)
  body.append(section('Start or buy more'), ...[
    ['start:team', '🏟️', 'Own a sports team', 'Buy or found a club (team page, staff, facilities)', async () => { const { franchiseScreen } = await import('./franchise.js'); nav.open('Own a Team', franchiseScreen); }],
    ['start:esports', '🎮', 'Esports team', 'Own a gaming org', async () => { const { franchiseScreen } = await import('./franchise.js'); nav.open('Esports Teams', (bd, c) => franchiseScreen(bd, c, 'esports')); }],
    ['start:racing', '🏁', 'Racing team', 'Own a racing team', async () => { const { racingScreen } = await import('./racing.js'); nav.open('Racing team', (bd, c) => racingScreen(bd, c, 'team')); }],
    ['start:prod', '🎬', 'Production company', 'Record label, film, TV or game studio', async () => { const { prodcoScreen } = await import('./prodco.js'); nav.open('Production companies', prodcoScreen); }],
    ['start:brand', '👗', 'Clothing brand', 'Launch your own label', async () => { const { brandScreen } = await import('./venture.js'); nav.open('Clothing brand', brandScreen); }],
    ['start:farm', '🚜', 'Farm or ranch', 'Crops or livestock', async () => { const { farmScreen } = await import('./venture.js'); nav.open('Farm', farmScreen); }],
  ].map(([id, icon, title, sub, onClick]) => row({ id, icon, title, sub, onClick })));
  if (!b.owned.length) body.append(empty(b.age < 18 ? 'You can start a business at 18 (some need more).' : 'You own no businesses yet.'));
  else body.append(section('Owned'), hireAllCard(refresh), ...b.owned.map((x) => row({ id: 'b' + x.id, icon: x.icon, title: x.name, sub: `${x.typeName} · ${x.staff} staff · rep ${x.rep}${x.trust ? ' · in trust' : ''}`, right: money(x.profit) + '/yr', onClick: x.brand ? async () => { const { brandScreen } = await import('./venture.js'); nav.open(x.name, brandScreen); } : x.farm ? async () => { const { farmScreen } = await import('./venture.js'); nav.open(x.name, farmScreen); } : x.advisor ? async () => { const { advisorScreen } = await import('./venture.js'); nav.open(x.name, advisorScreen); } : x.racing ? async () => { const { racingScreen } = await import('./racing.js'); nav.open(x.name, (bd, c) => racingScreen(bd, c, 'team')); } : x.franchise ? async () => { const { franchiseScreen } = await import('./franchise.js'); await adapter.frAction('switch', x.teamId); nav.open(x.name, x.esports ? (bd, c) => franchiseScreen(bd, c, 'esports') : franchiseScreen); } : x.prodco ? async () => { const { companyScreen } = await import('./prodco.js'); nav.open(x.name, (bd, c) => companyScreen(bd, c, x.prodco)); } : () => nav.open(x.name, (bd, c) => businessDetail(bd, c, x.id)) })));
}
// Every start path (Assets, Work, More, Businesses) lands the same way: on the Your-businesses list with the new business opened on its manage screen.
const settle = (ms = 60) => new Promise((r) => setTimeout(r, ms));
async function landOnNew(nav, before) {
  nav.back(); await settle(120);
  if (!document.querySelector('.panel.top [data-el=biz-summary]')) { nav.open('Businesses & Studios', businessesScreen); await settle(200); }
  const now = await adapter.getBusinesses(); const nu = now.owned.find((x) => !before.has(x.id)) || now.owned[now.owned.length - 1]; if (!nu) return;
  for (let i = 0; i < 12; i++) { const el = document.querySelector(`.panel.top [data-id="b${nu.id}"]`); if (el) { el.click(); return; } await settle(100); }
}
export async function foundScreen(body, { nav }) {
  const b = await adapter.getBusinesses(); let cur = null; const before = new Set(b.owned.map((x) => x.id));
  for (const t of b.types) { if (t.group !== cur) { cur = t.group; body.append(section(cur)); } body.append(row({ id: 'found:' + t.id, icon: t.icon, title: t.name, sub: t.locked ? t.reason : (t.blurb || 'Startup ' + money(t.fee)) + (t.license ? ' · license: ' + t.license : ''), right: money(t.fee), disabled: t.locked, onClick: async () => { const r = await act(adapter.foundBusiness({ type: t.id })); if (r.ok) await landOnNew(nav, before); } })); }
}
export async function offersScreen(body, { nav }) {
  const b = await adapter.getBusinesses();
  if (!b.offers.length) return body.append(empty('Nothing for sale right now.'));
  // sports clubs are bought through the same managed-club flow as Work > Own a Team (team page, staff, facilities); other offers buy directly and land on their manage screen
  const before = new Set(b.owned.map((x) => x.id));
  body.append(...b.offers.map((o) => row({ id: 'offer:' + o.idx, icon: o.icon, title: o.name, sub: o.type === 'sports' ? 'Sports club · opens the club market (same as Work > Own a Team)' : `${o.typeName} · ${o.desc}`, right: money(o.price), disabled: o.type !== 'sports' && o.price > b.cash, onClick: async () => { if (o.type === 'sports') { const { franchiseScreen } = await import('./franchise.js'); nav.open('Own a Team', franchiseScreen); return; } if (await confirmSheet(o.name, `Buy for ${money(o.price)}?`, 'Buy', 'go')) { const r = await act(adapter.buyBusinessOffer(o.idx)); if (r.ok) await landOnNew(nav, before); } } })));
}
export async function businessDetail(body, ctx, id) {
  const d = await adapter.getBusiness(id); if (!d) return body.append(empty('This business is gone.'));
  const f = d.finance;
  body.append(h('div', { class: 'card', 'data-el': 'biz-card' }, h('h3', { text: d.name }), h('div', { class: 'hint', text: d.typeName + (d.blurb ? ' · ' + d.blurb : '') }), bar('Reputation', d.rep, { thin: true }), kv('Valuation', money(d.valuation)),
    kv('Revenue / yr', money(f.revenue || 0)), kv('Wages', '-' + money(f.wages || 0), 'neg'), kv('Rent', '-' + money(f.rent || 0), 'neg'), f.cogs ? kv('Cost of goods', '-' + money(f.cogs), 'neg') : null, d.extraCosts ? d.extraCosts.map((c) => kv(c.label, '-' + money(c.amount), 'neg')) : null, kv('Profit / yr (pre-tax)', money(f.profit), f.profit >= 0 ? 'pos' : 'neg'), f.units ? kv('Sales', `${Math.round(f.units).toLocaleString('en-US')} ${d.unit} of ${Math.round(f.demand).toLocaleString('en-US')} demand`) : null));
  if (d.editor) {
    body.append(h('div', { class: 'card' }, h('p', { class: 'hint', text: 'Studio projects, releases, sports games and replays use the full editor, embedded here.' }), btn('Open full editor', () => ctx.nav.open(d.name + ' editor', editorScreen), 'go block', { 'data-el': 'open-editor' })));
  }
  if (d.fleet) body.append(...fleetBlock(d, ctx));
  if (d.risks && d.risks.length) body.append(h('div', { class: 'card' }, h('h3', { text: 'Risks' }), ...d.risks.map((r) => h('div', { class: 'hint', text: `• ${r.label}${r.pct ? ' (~' + r.pct + '%/yr)' : ''}` }))));
  { const { bizOpsCard } = await import('./bizops.js'); const c = await bizOpsCard('biz', id); if (c) body.append(c); }
  if (d.upgrades && d.upgrades.length) body.append(section('Upgrades'), ...d.upgrades.map((u) => row({ id: 'up:' + u.id, icon: u.owned ? '✅' : '⬆️', title: u.name, sub: u.owned ? 'Installed' : u.desc, right: u.owned ? null : money(u.cost), disabled: u.owned || u.cost > d.cash, onClick: () => act(adapter.businessUpgrade(id, u.id)) })));
  if (!d.editor) {
    if (d.train && d.train.n) body.append(h('div', { class: 'btns', style: { padding: '4px 12px' } }, btn(d.train.done ? '🎓 Trained this year' : `🎓 Train employees (${money(d.train.cost)})`, async () => { await act(adapter.trainBizStaff(id)); ctx.refresh && ctx.refresh(); }, 'alt sm', { 'data-act': 'train-staff', disabled: d.train.done })));
    body.append(section('Staff'), ...d.staffList.map((p) => row({ icon: '🧑‍💼', title: p.name, sub: `${p.role} · skill ${p.skill}`, right: money(p.salary), onClick: async () => { if (await confirmSheet('Let ' + p.name + ' go?', 'Severance is 15% of annual salary.', 'Fire', 'danger')) act(adapter.fireStaff(id, p.id)); } })));
    body.append(btn('➕ Hire', async () => { const i = await sheet({ title: 'Hire a role', options: d.roles.map((r) => ({ label: r.name, sub: `${money(r.base)}/yr base · ${r.count} now` })) }); if (i == null) return; const j = await sheet({ title: 'Experience level', options: d.tiers.map((x) => ({ label: x.name })) }); if (j != null) act(adapter.hireStaff(id, d.roles[i].id, d.tiers[j].id)); }, 'alt block', { 'data-el': 'biz-hire' }));
    if (d.equip.length) body.append(section('Equipment'), ...d.equip.map((e) => row({ icon: '🛠️', title: e.name, sub: `Owned: ${e.count}`, right: money(e.cost), disabled: e.cost > d.cash, onClick: () => act(adapter.buyBusinessEquip(id, e.id)) })));
    body.append(btn(`📣 Advertise (${money(d.adCost)})`, () => act(adapter.advertiseBusiness(id)), 'alt block', { 'data-el': 'biz-ad' }));
  }
  body.append(btn(`Sell business (${money(d.sellValue)})`, async () => { if (await confirmSheet('Sell ' + d.name + '?', `You receive about ${money(d.sellValue)}.`, 'Sell', 'danger')) { const r = await act(adapter.sellBusiness(id)); if (r.ok) ctx.nav.back(); } }, 'danger block', { 'data-el': 'biz-sell' }));
}
function fleetBlock(d, ctx) {
  const F = d.fleet, id = d.id;
  return [h('div', { class: 'card', 'data-el': 'fleet-card' }, h('h3', { text: 'Fleet' }), kv('Vehicles', `${F.vehicles} / ${F.maxVehicles}`), kv('Drivers', `${F.drivers} (need ${F.vehicles})`, F.drivers < F.vehicles ? 'neg' : ''), kv('Fuel cost / yr', money(F.fuel)), kv('Accidents (lifetime)', String(F.accidents)), kv('Insurance / yr', money(F.insurance)), kv('Avg. vehicle condition', F.condition + '%')),
    h('div', { class: 'btns', style: { padding: '0 12px' } }, btn(`Buy ${F.vehicleName} (${money(F.vehicleCost)})`, () => act(adapter.fleetAction(id, 'buy')), 'go sm'), btn('Sell one', () => act(adapter.fleetAction(id, 'sell')), 'alt sm'), btn(`Hire driver`, () => act(adapter.fleetAction(id, 'driver')), 'alt sm'), btn('Service fleet', () => act(adapter.fleetAction(id, 'service')), 'alt sm'))];
}
export async function editorScreen(body) {
  await adapter.prepareEditor();
  const fr = h('iframe', { src: 'classic.html', title: 'Full studio and sports editor', style: { width: '100%', height: '100%', border: '0', minHeight: '70vh' }, 'data-el': 'editor-frame' });
  body.style.padding = '0'; body.append(fr);
  document.addEventListener('panelchange', async function once() { if (!document.body.contains(fr)) { document.removeEventListener('panelchange', once); await adapter.reloadFromSave(); const { refreshState } = await import('../ui.js'); await refreshState(); } });
}

// ---------- skills ----------
export async function skillsScreen(body, { nav }) {
  adapter.markSeen('skills'); const k = await adapter.getSkills();
  body.append(h('div', { class: 'tabs-inline', 'data-el': 'skills-tabs' }, h('button', { class: 'on', text: 'Skills' }), h('button', { 'data-el': 'passions-link', text: '🔥 Passions', onclick: () => nav.open('Passions', passionsScreen) }), h('button', { text: '🎓 Scholarships', onclick: () => nav.open('Scholarships', scholarshipsScreen) })));
  body.append(row({ id: 'passions', icon: '🔥', title: 'Passions', sub: 'Pick what you love: it trains matching skills faster', onClick: () => nav.open('Passions', passionsScreen) }));
  for (const c of k.categories) {
    body.append(section(`${c.icon} ${c.name} · avg ${c.avg}`));
    body.append(...c.skills.map((s) => h('div', { class: 'card skill', 'data-skill': s.id, style: { padding: '8px 12px', margin: '4px 12px' } }, bar(s.name + (s.boosted ? ' ⚡' : ''), Math.round(s.value), { thin: true, key: s.id }), s.trainedBy.length ? h('div', { class: 'hint', text: 'Trained by: ' + s.trainedBy.join(', ') }) : null)));
  }
  body.append(h('div', { class: 'hint', style: { padding: '8px 14px' }, text: 'Skills grow with use, fade slowly when unused, and are fed by school, work, sport, relationships and activities. ⚡ = boosted by a passion.' }));
}
// ---------- passions ----------
export async function passionsScreen(body, { nav, refresh }) {
  await autoPageCard(body, 'passions');
  const p = await adapter.getPassions(); adapter.markSeen('passions');
  if (p.locked) return body.append(empty(`Passions start at age ${p.minAge}.`));
  body.append(h('div', { class: 'card', 'data-el': 'passion-rules' }, h('h3', { 'data-el': 'passion-slots', text: `Slots: ${p.used}/${p.slots}` }), ...p.rules.map((r) => h('div', { class: 'hint', text: '• ' + r })), kv('Masteries', `${p.mastered.length} of ${p.maxTotal}`), p.heritage.length ? h('div', { class: 'hint', text: '🧬 Head start from your parent: ' + p.heritage.join(', ') }) : null));
  if (p.active.length) body.append(section('Active'), ...p.active.map((a) => h('div', { class: 'card', 'data-passion': a.id }, h('div', { class: 'nm', style: { fontWeight: 800 }, text: `${a.icon} ${a.name}` }), bar('Mastery meter', a.meter, { thin: true, key: 'meter_' + a.id }), h('div', { class: 'hint', text: 'Trains: ' + Object.keys(a.skills).map((x) => x.replace('_', ' ')).join(', ') }),
    a.full ? h('div', { class: 'hint', 'data-el': 'cap-note', text: `Meter full at 100, but the mastery cap (${p.masteryCap}) is reached, so it can't become a new mastery. Drop it to free the slot.` }) : null,
    h('div', { class: 'btns' }, btn(a.full ? 'Meter full' : a.practiced ? 'Done this year' : 'Practice', async () => { await act(adapter.practicePassion(a.id)); }, 'go sm', { 'data-act': 'practice', disabled: a.practiced || a.full ? true : null }), btn('Drop (resets meter)', async () => { if (await confirmSheet('Drop ' + a.name + '?', 'Its meter resets to zero.', 'Drop', 'danger')) act(adapter.dropPassion(a.id)); }, 'alt sm', { 'data-act': 'drop' })))));
  if (p.mastered.length) body.append(section('Mastered'), ...p.mastered.map((m) => row({ icon: '🏆', title: `${m.title}`, sub: `${m.name} · mastered at age ${m.age}`, chevron: false })));
  if (p.lockedSlots && p.lockedSlots.length) body.append(section('Locked slots'), ...p.lockedSlots.map((x) => row({ id: 'locked-slot:' + x.n, icon: '🔒', title: `Slot ${x.n}`, sub: x.reason, chevron: false, disabled: true })));
  if (p.slots === 0 || (p.used >= p.slots && !p.active.length)) return body.append(empty(p.lockReason || 'No passion slot free.'));
  body.append(section(p.used >= p.slots ? 'Switch to…' : 'Choose a passion'), ...p.available.map((a) => row({ id: 'pick:' + a.id, icon: a.icon, title: a.name, sub: 'Trains ' + a.skills.slice(0, 3).map((x) => x.replace('_', ' ')).join(', '), onClick: async () => {
    let rep = null;
    if (p.used >= p.slots) { const i = await sheet({ title: `Replace which passion with ${a.name}?`, body: 'The replaced passion\'s meter resets to zero.', options: p.active.map((x) => ({ label: `${x.icon} ${x.name} (meter ${x.meter})` })) }); if (i == null) return; rep = p.active[i].id; }
    await act(adapter.pickPassion(a.id, rep));
  } })));
}
// ---------- scholarships ----------
export async function scholarshipsScreen(body, { nav, refresh }) {
  const s = await adapter.getScholarships(); adapter.markSeen('scholarships');
  body.append(h('div', { class: 'card', 'data-el': 'sch-card' }, h('h3', { text: 'Your application' }), kv('GPA', s.gpa.toFixed(2)), kv('Clubs', s.clubs.length ? s.clubs.map((c) => c.name).join(', ') : 'none'), kv('Service hours', String(s.service)), kv('Awards', String(s.awards)), kv('Window', s.enrolled ? `Enrolled (${s.enrolled}): new awards and renewals open every year` : s.window === 'college' ? 'College applications open' : s.window === 'grad' ? 'Grad-school applications open' : 'Closed (high school seniors and grads)'), s.enrolled ? kv('Scholarships worth', money(s.yearlyWorth) + '/yr of ' + money(s.tuition) + ' tuition', 'pos') : null, s.enrolled ? kv('Years of study left', String(s.studyYearsLeft)) : null));
  if (s.active.length) body.append(section('Awards you hold'), ...s.active.map((a) => { const r = a.renew; if (!r) return row({ id: 'held:' + a.id, icon: '🎓', title: a.name, sub: `${Math.round(a.pct * 100)}% of tuition · ${a.yearsLeft} yr left`, chevron: false });
    const why = r.done ? 'Renewal reviewed this year' : r.missing.length ? 'To renew: ' + r.missing.join(' · ') : r.atCap && !r.extendOk ? 'At the maximum' : `Renew to ${Math.round(r.raiseTo * 100)}% (${r.odds}% odds)`;
    return row({ id: 'renew:' + a.id, icon: a.probation ? '⚠️' : '🎓', title: a.name, sub: `${Math.round(a.pct * 100)}% of tuition = ${money(a.worth)}/yr · ${a.yearsLeft} yr left${a.probation ? ' · ON PROBATION' : ''}${a.renewals ? ' · renewed ' + a.renewals + 'x' : ''} · ${why}`, right: r.eligible ? 'Renew' : '', disabled: !r.eligible, onClick: async () => { await act(adapter.renewScholarship(a.id)); } }); }));
  if (s.enrolled) body.append(h('div', { class: 'card', 'data-el': 'sch-odds' }, h('div', { class: 'hint', text: `Odds come from your grades (GPA ${s.gpa.toFixed(2)}), skills, sports and family finances (${s.familyScore >= 55 ? 'comfortable' : s.familyScore >= 30 ? 'modest' : 'tight'} family). Renewal needs you to keep your grades and performance up; two slipping years lose the award.` })));
  body.append(section('Build your application'), h('div', { class: 'btns', style: { padding: '0 12px' } }, btn('🤝 Volunteer', () => act(adapter.volunteerHours()), 'alt sm', { 'data-act': 'volunteer' })));
  body.append(...s.clubsAvail.map((c) => {
    const adJoin = !c.joined && c.blocked && !c.adBlocked; // blocked the normal way (age window / club cap) but a rewarded ad can still get you in
    return row({ id: 'club:' + c.id, icon: c.icon, title: c.name, sub: c.joined ? `Member · ${c.years} yr` : adJoin ? c.blocked + ' Watch an ad to join anyway.' : c.blocked || `Ages ${c.minAge}-${c.maxAge}`, right: c.joined ? 'Leave' : adJoin ? '📺 Join' : 'Join', disabled: !c.joined && !!c.blocked && !!c.adBlocked,
      onClick: () => (adJoin ? act(adapter.joinClubWithAd(c.id)) : act(adapter.joinClub(c.id))) });
  }));
  body.append(section(s.enrolled ? 'Apply for new scholarships this year' : s.window ? 'Apply' : 'Scholarships (not open yet)'));
  const L = s.list.length ? s.list : [];
  if (!L.length) return body.append(empty('Applications open for high-school students from 16 and for graduates heading to grad school.'));
  body.append(...L.map((x) => row({ id: 'sch:' + x.id, icon: { academic: '📚', athletic: '🏅', arts: '🎨', need: '🏠', service: '🤝', talent: '⭐' }[x.kind] || '🎓', title: (x.extra ? '🔥 ' : '') + x.name, sub: x.held ? 'You hold this' : x.passionLocked ? `Unlocked by the ${x.passion} passion` : x.missing.length ? 'Needs: ' + x.missing.join(' · ') : x.desc + (x.eligible ? ` · ${x.odds}% odds · ${money(x.worth)}/yr` : ''), right: Math.round(x.pct * 100) + '%', disabled: !x.eligible, onClick: async () => { await act(adapter.applyScholarship(x.id)); } })));
}

// ---------- The Creator (premium) ----------
export async function creatorScreen(body, { nav }) {
  const c = await adapter.getCreator();
  if (!c.unlocked) { body.append(h('div', { class: 'card gold', 'data-el': 'creator-locked' }, h('h3', { text: '🛠️ The Creator' }), h('p', { class: 'hint', text: 'Edit the stats and age of any character, including your own. Needs the Creator pass ($5.99) or All Access.' }), btn('Open the Premium store', async () => { const { storeScreen } = await import('./store.js'); nav.open('Premium', storeScreen); }, 'go block', { 'data-el': 'creator-store' }))); return; }
  body.append(h('div', { class: 'card gold' }, h('h3', { text: '🛠️ The Creator' }), h('p', { class: 'hint', text: 'Any edit marks this life "Creator used": it stays out of challenges and leaderboards.' + (c.used ? ' (Already marked.)' : '') })));
  body.append(section('Characters'), ...c.people.map((p) => row({ id: 'cr:' + p.id, icon: p.id === 'me' ? '🧑' : '👤', title: `${p.name}${p.id === 'me' ? ' (you)' : ''}`, sub: `${p.rel} · age ${p.age}`, onClick: () => nav.open(p.name, (b, ctx) => creatorEditor(b, ctx, p.id)) })));
}
async function creatorEditor(body, { nav }, id) {
  const c = await adapter.getCreator(), p = c.people.find((x) => x.id === id); if (!p) return body.append(empty('Gone.'));
  const fields = [{ id: 'age', name: 'Age', v: p.age, max: 120 }, ...(id === 'me' ? c.selfStats : c.otherStats).map((f) => ({ id: f.id, name: f.name, v: p.stats[f.id], max: 100 }))];
  body.append(h('div', { class: 'card', 'data-el': 'creator-card' }, h('h3', { text: p.name }), h('div', { class: 'hint', text: p.rel })));
  for (const f of fields) {
    const set = async (d) => { const nv = Math.max(0, Math.min(f.max, f.v + d)); const patch = f.id === 'age' ? { age: nv } : { stats: { [f.id]: nv } }; const r = await adapter.creatorEdit(id, patch); if (r.ok) { f.v = nv; val.textContent = String(nv); } else toast(r.message || 'Failed'); };
    const val = h('b', { 'data-val': f.id, text: String(f.v), style: { minWidth: '34px', textAlign: 'center' } });
    body.append(h('div', { class: 'row', 'data-field': f.id }, h('span', { class: 'tx' }, h('span', { class: 't', text: f.name })), h('span', { class: 'btns' }, btn('−10', () => set(-10), 'alt sm', { 'data-step': '-10' }), btn('−1', () => set(-1), 'alt sm', { 'data-step': '-1' }), val, btn('+1', () => set(1), 'alt sm', { 'data-step': '1' }), btn('+10', () => set(10), 'alt sm', { 'data-step': '10' }))));
  }
}

// ---------- Appearance & wardrobe (layered pixel character) ----------
import { composeSprite } from '../character.js';
export async function appearanceScreen(body, ctx) {
  const A = await adapter.getAppearance(); const prev = h('div', { 'data-el': 'char-preview', style: { display: 'flex', justifyContent: 'center', padding: '6px 0', background: 'linear-gradient(#cfe3f0,#eaf3f9)', borderRadius: '12px', margin: '8px 12px' } });
  const paint = async () => { const a = await adapter.getAppearance(); prev.innerHTML = await composeSprite(a, { size: 192 }); }; await paint();
  const swatches = (colors, cur, onPick, tag) => h('div', { class: 'chips', style: { padding: '2px 12px 8px', display: 'flex', flexWrap: 'wrap', gap: '6px' } }, ...colors.map((c) => h('button', { 'data-swatch': tag + ':' + c, title: colorName(c), 'aria-label': colorName(c), style: { width: '26px', height: '26px', borderRadius: '6px', border: c === cur ? '3px solid #1b1b2a' : '2px solid #fff', background: c, boxShadow: '0 0 0 1px #0003' }, onclick: async () => { await onPick(c); await refresh(); } })));
  const root = h('div'); body.append(prev, root);
  async function refresh() {
    const a = await adapter.getAppearance(); await paint(); root.replaceChildren();
    root.append(section('Body'), h('div', { class: 'hint', style: { padding: '0 12px' }, text: 'Skin tone' }), swatches(a.skins, a.char.skin, (c) => adapter.setLookColor('body', 'skin', c), 'skin'),
      h('div', { class: 'hint', style: { padding: '0 12px' }, text: 'Eye color' }), swatches(a.eyeColors, a.char.eye, (c) => adapter.setLookColor('body', 'eye', c), 'eye'),
      h('div', { class: 'btns', style: { padding: '4px 12px' } }, ...a.builds.map((b) => btn(b, async () => { await adapter.setLookColor('body', 'build', b); await refresh(); }, (a.char.build === b ? 'go' : 'alt') + ' sm', { 'data-build': b }))));
    for (const sl of a.slots) {
      const cur = sl.options.find((o) => o.id === sl.current);
      root.append(row({ id: 'slot:' + sl.slot, icon: '🎨', title: sl.label, sub: cur ? cur.name : 'None', onClick: async () => {
        const i = await sheet({ title: sl.label, options: [{ label: 'None' }, ...sl.options.map((o) => ({ label: o.name + (o.locked ? ' 🔒' : ''), sub: o.locked ? o.reason : '' }))] }); if (i == null) return;
        if (i === 0) await adapter.setLookPart(sl.slot, null); else { const r = await adapter.setLookPart(sl.slot, sl.options[i - 1].id); if (!r.ok) toast(r.message || 'Locked'); } await refresh(); } }));
      if (sl.current && sl.colors) { const key = sl.colorKey, pal = key === 'hair' ? a.hairColors : a.clothColors; root.append(swatches(pal, sl.colors[key], (c) => adapter.setLookColor(sl.slot, key, c), sl.slot)); }
    }
  }
  await refresh();
}

// ---------- Style & accessibility ----------
import * as Style from '../style.js';
export async function styleScreen(body) {
  const C = Style.config(), root = h('div'); body.append(root);
  const paint = () => {
    const s = Style.load(); root.replaceChildren();
    root.append(h('div', { class: 'card' }, h('h3', { text: '🎨 Style & accessibility' }), h('p', { class: 'hint', text: 'Colors, text size and motion. Saved on this device, separate from your saves.' })));
    root.append(section('Colors'), ...C.palettes.map((p) => row({ id: 'pal:' + p.id, icon: s.palette === p.id ? '✅' : '🎨', title: p.name, sub: p.blurb, right: s.palette === p.id ? 'On' : '', onClick: () => { Style.set({ palette: p.id }); paint(); } })));
    root.append(section('Text size'), h('div', { class: 'btns', style: { padding: '6px 12px' } }, ...C.text.map((t) => btn(t.name, () => { Style.set({ text: t.id }); paint(); }, (s.text === t.id ? 'go' : 'alt') + ' sm', { 'data-text': t.id }))));
    root.append(section('Motion'), ...C.motion.map((m) => row({ id: 'mot:' + m.id, icon: s.motion === m.id ? '✅' : '🎞️', title: m.name, onClick: () => { Style.set({ motion: m.id }); paint(); } })));
    root.append(btn('Reset style', () => { Style.reset(); paint(); }, 'alt block', { 'data-el': 'style-reset' }));
  };
  paint();
}

let haTier = 'standard';
function hireAllCard(refresh) {
  return h('div', { class: 'card', 'data-el': 'hire-all' }, h('div', { class: 'btns', style: { flexWrap: 'wrap', alignItems: 'center' } },
    btn('🧑‍💼 Hire all', async () => {
      const tiers = await adapter.hireAllTiers(); const ti = await sheet({ title: 'Hire all: pick a tier', body: 'Fills every open staff, crew and roster spot across all your companies and teams.', options: tiers.map((t) => ({ label: t.name })) }); if (ti == null) return; haTier = tiers[ti].id;
      const p = await adapter.hireAllPlan(haTier);
      const body = h('div', {}, h('p', { 'data-el': 'ha-sum', text: `${p.hires} hires across ${p.companies} ${p.companies === 1 ? 'company' : 'companies'} · signing ${money(p.cost)} · +${money(p.payroll)}/yr payroll` }),
        ...p.rows.map((r) => h('div', { class: 'kv', 'data-ha': r.key }, h('span', { text: `${r.name} (${r.kind})` }), h('b', { class: r.skip ? 'neg' : '', text: r.skip ? `Skipped: ${r.skip}` : `${r.hires} · ${money(r.cost)} + ${money(r.payroll)}/yr` }))));
      const k = await sheet({ title: `Hire all (${p.tier})`, body, buttons: [{ id: 'no', label: 'Cancel', cls: 'alt' }, { id: 'keep', label: 'Keep filled yearly', cls: 'alt' }, { id: 'yes', label: 'Hire', cls: 'go' }] });
      if (k === 'yes' && p.hires) { await act(adapter.hireAll(haTier)); refresh && refresh(); } else if (k === 'keep') { await act(adapter.setHireAllKeep(haTier)); }
    }, 'go sm', { 'data-act': 'hire-all' }), h('span', { class: 'hint', text: 'Fill every open spot at one tier' })));
}
