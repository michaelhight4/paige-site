import { adapter } from '../adapter.js';
import { store, h, row, section, kv, btn, empty, chip, bar, money, sheet, confirmSheet, act, toast } from '../ui.js';
import { sportsScreen } from './sports.js';
import { scholarshipsScreen } from './extra.js';
import { prodcoScreen } from './prodco.js';
import { franchiseScreen } from './franchise.js';
import { coachingScreen } from './coaching.js';
import { politicsScreen } from './politics.js';
import { streamerScreen, influencerScreen } from './online.js';


export async function occupationMenu(body, { nav }) {
  const items = await adapter.getOccupationMenu(); const st = store.state;
  if (st.job) body.append(h('div', { class: 'card', 'data-el': 'current-job' }, h('h3', { text: 'Current job' }), kv('Title', st.job.title), kv('Employer', st.job.employer), kv('Salary', money(st.job.salary) + '/yr', 'pos'), kv('Years', String(st.job.years)), h('div', { class: 'btns' }, btn('Quit job', async () => { if (await confirmSheet('Quit job?', `Quit your job as ${st.job.title}?`, 'Quit', 'danger')) act(adapter.quitJob()); }, 'danger sm'))));
  const screens = { education: educationScreen, fight: fightScreen, freelance: freelanceScreen, jobs: (b, c) => jobsScreen(b, c, 'jobs'), parttime: partTimeScreen, military: militaryScreen, special: (b, c) => jobsScreen(b, c, 'special'), sports: sportsScreen, collections: collectionsScreen, scholarships: scholarshipsScreen, streamer: streamerScreen, influencer: influencerScreen, politics: politicsScreen, coaching: coachingScreen, franchise: franchiseScreen, prodco: prodcoScreen };
  body.append(...items.map(m => row({ id: m.id, icon: m.icon, title: m.label, sub: m.locked ? m.lockReason : m.sub, disabled: m.locked, onClick: () => nav.open(m.label === 'Sports Career' ? 'Sports Career' : m.label, screens[m.id]) })));
}

export async function educationScreen(body, { nav }) {
  const e = await adapter.getEducation();
  if (e.current) {
    const pct = e.current.years ? Math.round(e.current.year / e.current.years * 100) : 0;
    body.append(h('div', { class: 'card', 'data-el': 'edu-current' }, h('h3', { text: 'Current education' }), kv('Level', e.current.label), kv('Major', e.current.major || '—'), kv('Status', e.current.inSchool ? `Year ${e.current.year} of ${e.current.years}` : 'Not enrolled'), kv('GPA', String(e.current.gpa)), e.current.inSchool ? h('div', { class: 'prog' }, h('i', { style: { width: pct + '%' } })) : null,
      e.current.inSchool ? h('div', { class: 'btns' }, btn('Drop out', async () => { if (await confirmSheet('Drop out?', 'You will leave school without finishing.', 'Drop out', 'danger')) act(adapter.dropOut()); }, 'danger sm')) : null));
  } else body.append(empty('You are not in school yet. School starts at age 5.'));
  if (e.current && e.current.inSchool) { const sc = await adapter.getScholarships(); if (sc.enrolled) body.append(h('div', { class: 'card', 'data-el': 'edu-scholarships' }, h('h3', { text: '🎓 Scholarships' }), kv('Awards held', String(sc.active.length)), kv('Worth', money(sc.yearlyWorth) + '/yr', 'pos'), sc.active.map((a) => h('div', { class: 'hint', text: `${a.name}: ${Math.round(a.pct * 100)}%${a.probation ? ' ⚠ probation' : ''}${a.renew && a.renew.eligible ? ' · renewal open' : ''}` })), h('div', { class: 'btns' }, btn('Open Scholarships', () => nav.open('Scholarships', scholarshipsScreen), 'go sm', { 'data-el': 'edu-sch-open' })))); }
  if (e.completed.length) body.append(section('Completed'), ...e.completed.map(c => row({ icon: '✅', title: c.replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase()), chevron: false })));
  body.append(section('Enroll'));
  body.append(...e.options.map(o => row({ id: o.id, icon: '🎓', title: o.label, sub: o.eligible ? `${o.years} yrs · ${o.notes || 'Tap to enroll'}` : o.reason, disabled: !o.eligible, onClick: async () => {
    let major = null;
    if (o.needsMajor) { const i = await sheet({ title: 'Pick a major', options: e.majors.slice(0, 40).map(m => ({ label: m })) }); if (i == null) return; major = e.majors[i]; }
    act(adapter.enroll({ levelId: o.id, major }));
  } })));
  if (e.premium !== false) body.append(section('Premium'), ...e.options.filter(o => o.years > 0 && !o.reason?.startsWith('Already')).slice(0, 8).map(o => row({ id: 'einstein:' + o.id, premium: 'einstein', icon: '🎓', title: (e.einstein ? '⭐ ' : '🔒 ') + 'Instant ' + o.label, sub: e.einstein ? 'Einstein pass: graduate right now' : 'Premium: Einstein pass', disabled: !e.einstein, onClick: async () => { let major = null; if (o.needsMajor) { const i = await sheet({ title: 'Pick a major', options: e.majors.slice(0, 40).map(m => ({ label: m })) }); if (i == null) return; major = e.majors[i]; } act(adapter.instantDegree({ levelId: o.id, major })); } })));
}

function jobRow(j, ctx) {
  return row({ id: j.id, icon: '💼', title: j.title, sub: j.eligible ? `Requires ${String(j.educationReq).split('+')[0].replace(/_/g, ' ')}${j.promotesTo ? ' · → ' + j.promotesTo : ''}` : j.reason, right: money(j.salary) + '/yr', disabled: !j.eligible,
    onClick: async () => { if (await confirmSheet(j.title, `Apply for a job as ${j.title} (${money(j.salary)}/yr)?`, 'Apply', 'go')) { await act(adapter.applyJob(j.id)); } } });
}
export async function jobsScreen(body, ctx, group = 'jobs') {
  const g = await adapter.getJobs({ group });
  if (g.current) body.append(h('div', { class: 'card' }, h('b', { text: 'Employed: ' }), g.current.title));
  if (!g.groups.length) return body.append(empty('No openings available.'));
  body.append(section(group === 'special' ? 'Special careers' : 'Industries'));
  body.append(...g.groups.map(s => row({ id: s.id, icon: group === 'special' ? '🎭' : '🏢', title: s.label, sub: `${s.jobs.length} positions · ${s.jobs.filter(j => j.eligible).length} you qualify for`, onClick: () => ctx.nav.open(s.label, (b, c) => sectorScreen(b, c, group, s.id)) })));
}
async function sectorScreen(body, ctx, group, sector) {
  const g = await adapter.getJobs({ group, sector }); const s = g.groups[0]; if (!s) return body.append(empty('Nothing here.'));
  body.append(...s.jobs.map(j => jobRow(j, ctx)));
}
export async function militaryScreen(body, ctx) {
  const g = await adapter.getJobs({ group: 'military' });
  body.append(section('Branches & ranks'), ...g.groups.map(s => row({ id: s.id, icon: s.id.includes('officer') ? '🎖️' : '🪖', title: s.label, sub: `${s.jobs.length} ranks`, onClick: () => ctx.nav.open(s.label, (b, c) => sectorScreen(b, c, 'military', s.id)) })));
}
export async function freelanceScreen(body) {
  const { gigs } = await adapter.getFreelanceGigs();
  body.append(section('Available gigs'), ...gigs.map(g => row({ id: g.id, icon: '🧰', title: g.label, sub: g.eligible ? `${money(g.minHourly)}–${money(g.maxHourly)}/hr · ${g.doneThisYear}/${g.maxPerYear} this year` : g.reason, disabled: !g.eligible || g.doneThisYear >= g.maxPerYear, onClick: () => act(adapter.doGig(g.id)) })));
}
export async function partTimeScreen(body) {
  const r = await adapter.getPartTimeJobs();
  if (r.current) body.append(h('div', { class: 'card' }, h('h3', { text: 'Current part-time job' }), kv('Job', r.current.title), kv('Weekly pay', money(r.current.weeklyPay), 'pos'), h('div', { class: 'btns' }, btn('Quit', () => act(adapter.quitPartTime()), 'danger sm'))));
  body.append(section('Openings'), ...r.jobs.map(j => row({ id: j.id, icon: '🕑', title: j.title, sub: j.eligible ? `${j.weeklyHours} hrs/wk · ${money(j.hourly)}/hr` : j.reason, right: money(j.weeklyPay) + '/wk', disabled: !j.eligible, onClick: () => act(adapter.applyPartTime(j.id)) })));
}
export async function fightScreen(body) {
  const f = await adapter.getFight();
  body.append(h('div', { class: 'card' }, h('h3', { text: 'Fight record' }), kv('Wins', String(f.record.wins), 'pos'), kv('Losses', String(f.record.losses), 'neg'), bar('Health', f.health, { thin: true })));
  body.append(section('Opponents'), ...f.rivals.map(r => row({ id: r.id, icon: '🥊', title: r.name, sub: r.eligible ? `Level ${r.level}` : r.reason, disabled: !r.eligible, onClick: async () => { if (await confirmSheet('Fight ' + r.name + '?', 'You could get hurt.', 'Fight', 'danger')) act(adapter.fight(r.id)); } })));
}
export async function collectionsScreen(body) {
  const r = await adapter.getCareerCollections();
  body.append(h('div', { class: 'card' }, h('h3', { text: 'Career collection' }), kv('Mastered', `${r.collectedCount} / ${r.collections.length}`)));
  const sorted = [...r.collections].sort((a, b) => (b.collectible - a.collectible) || (b.yearsWorked - a.yearsWorked) || a.career.localeCompare(b.career));
  body.append(h('div', { class: 'grid', 'data-el': 'collection-grid' }, ...sorted.map(c => h('div', { class: 'tile ' + (c.collected ? 'on' : c.yearsWorked ? '' : 'off'), 'data-career': c.career },
    h('div', { class: 'ic', text: c.collected ? '🏆' : '🗂️' }), h('div', { class: 't', text: c.career }), h('div', { class: 's', text: `${c.yearsWorked}/${c.requiredYears} yrs · ${String(c.educationReq).replace(/_/g, ' ')}` }),
    h('div', { class: 'prog' }, h('i', { style: { width: Math.min(100, c.yearsWorked / c.requiredYears * 100) + '%' } })),
    c.collectible ? h('div', { class: 'btns' }, btn('Collect', () => act(adapter.collectCareer(c.career)), 'go sm')) : null))));
}
