// occupations.js - Jobs, Part-Time, Freelance, Military, Special, Education, Careers Collection hooks.
import { clamp, slug, rand, randRange, ok, fail, log, spend } from './core.js';

const EDU_ORDER = ['none', 'high_school', 'community_college', 'university'];
export const eduLevelLabel = (data, id) => data.occ.education.names[id] || id;

export function hasDegree(state, id) { return !!state.edu.degrees[id]; }
export function totalWorkYears(state) { return Object.values(state.careerYears).reduce((a, b) => a + b, 0); }

// meetsReq(data,state,req) -> {ok, reasons[]}. req shape: {edu, prev, years, licenses[], looks, smarts, car, major, health}
export function meetsReq(data, state, req = {}) {
  const reasons = [];
  const e = req.edu || 'none';
  if (e === 'in_university') { if (!state.edu.inSchool || state.edu.inSchool.id !== 'university') reasons.push('Must be enrolled in university'); }
  else if (e === 'high_school') { if (EDU_ORDER.indexOf(state.edu.level) < 1) reasons.push('Needs High School diploma'); }
  else if (e !== 'none' && !hasDegree(state, e)) reasons.push('Needs ' + eduLevelLabel(data, e));
  if (req.major && hasDegree(state, 'university') && state.edu.degrees.university.major !== req.major) reasons.push(`Needs ${req.major} major`);
  if (req.major && !hasDegree(state, 'university')) reasons.push(`Needs ${req.major} major`);
  if (req.years && totalWorkYears(state) < req.years) reasons.push(`Needs ${req.years} years work experience`);
  for (const l of req.licenses || []) if (!state.licenses.includes(l)) reasons.push('Needs ' + l + ' license');
  if (req.car && !state.assets.car.length) reasons.push('Needs a car');
  if (req.looks && state.stats.looks < req.looks) reasons.push(`Needs Looks ${req.looks}+`);
  if (req.smarts && state.stats.smarts < req.smarts) reasons.push(`Needs Smarts ${req.smarts}+`);
  if (req.health && state.stats.health < req.health) reasons.push(`Needs Health ${req.health}+`);
  return { ok: reasons.length === 0, reasons };
}

export function ladderOf(data, jobId) {
  const out = []; let j = data.occ.jobs[jobId];
  while (j) { out.push(j); j = j.next ? data.occ.jobs[j.next] : null; }
  return out;
}

// ---- Jobs -------------------------------------------------------------
// listCareers(data,state,{sector}) -> without sector: industry rows; with sector: entry-level job rows.
export function listCareers(data, state, filter = {}) {
  const MINAGE = 16;
  if (!filter.sector) {
    return data.occ.job_sectors.map(s => {
      const entries = s.jobs.map(id => data.occ.jobs[id]).filter(j => j.entry);
      const open = entries.filter(j => state.age >= MINAGE && meetsReq(data, state, j.req).ok).length;
      return { id: s.id, name: s.name, jobs: s.jobs.length, entries: entries.length, open };
    });
  }
  const s = data.occ.job_sectors.find(x => x.id === filter.sector);
  if (!s) return [];
  return s.jobs.map(id => data.occ.jobs[id]).filter(j => j.entry || filter.all).map(j => {
    const m = meetsReq(data, state, j.req);
    const reasons = state.age < MINAGE ? ['Must be ' + MINAGE + '+'].concat(m.reasons) : m.reasons;
    return { id: j.id, title: j.title, sector: j.sector, wage: j.wage, level: j.level, ladder: ladderOf(data, j.id).map(x => x.title),
      eligible: reasons.length === 0, reasons, current: !!(state.job && state.job.id === j.id) };
  });
}

function setOccupation(state, o) { state.job = o; state.military = o.kind === 'military' ? { branch: o.branch } : null; }

export function applyJob(data, state, jobId, opts = {}) {
  const j = data.occ.jobs[jobId];
  if (!j) return fail('Unknown job');
  if (state.age < 16) return fail('Too young to work full-time');
  if (!j.entry) return fail('Promotion only: rise through the ladder');
  const m = meetsReq(data, state, j.req);
  if (!m.ok) return fail('Not qualified: ' + m.reasons.join(', '), { reasons: m.reasons });
  const p = clamp(0.55 + (state.stats.smarts - 50) / 150 + (state.stats.looks - 50) / 400, 0.25, 0.97);
  if (!opts.noRoll && rand(state) > p) return fail(`Interview failed for ${j.title}. Try again.`, { rejected: true });
  setOccupation(state, { kind: 'job', id: j.id, title: j.title, wage: j.wage, years: 0, yearsInLevel: 0, sector: j.sector });
  log(state, `Hired as ${j.title}`);
  return ok(`You are now a ${j.title}!`, { job: state.job });
}
export function quitJob(data, state) {
  if (!state.job) return fail('No job');
  const t = state.job.title; state.job = null; state.military = null; log(state, `Quit ${t}`); return ok('You quit ' + t);
}

// ---- Part-time & freelance --------------------------------------------
export function listPartTime(data, state) {
  return data.occ.part_time.map(p => {
    const reasons = []; if (state.age < p.min_age) reasons.push('Must be ' + p.min_age + '+');
    reasons.push(...meetsReq(data, state, p.req).reasons);
    return { ...p, eligible: !reasons.length, reasons, current: !!(state.partTime && state.partTime.id === p.id) };
  });
}
export function applyPartTime(data, state, id) {
  const p = data.occ.part_time.find(x => x.id === id); if (!p) return fail('Unknown job');
  const row = listPartTime(data, state).find(x => x.id === id);
  if (!row.eligible) return fail(row.reasons.join(', '));
  state.partTime = { id: p.id, title: p.title, weekly_wage: p.weekly_wage, hours: p.weekly_hours };
  log(state, 'Started part-time: ' + p.title); return ok(`You work part-time as ${p.title} ($${p.weekly_wage}/wk).`);
}
export function quitPartTime(data, state) { state.partTime = null; return ok('Quit part-time job'); }
export function listFreelance(data, state) {
  return data.occ.freelance.map(g => {
    const done = state.gigsThisYear[g.id] || 0;
    const reasons = []; if (state.age < g.min_age) reasons.push('Must be ' + g.min_age + '+');
    if (done >= g.max_per_year) reasons.push('Max gigs this year');
    return { ...g, done, eligible: !reasons.length, reasons };
  });
}
export function doGig(data, state, id) {
  const g = listFreelance(data, state).find(x => x.id === id); if (!g) return fail('Unknown gig');
  if (!g.eligible) return fail(g.reasons.join(', '));
  const rate = randRange(state, g.min_hourly, g.max_hourly);
  const pay = Math.round(rate * g.hours * 100) / 100;
  state.cash += pay; state.gigsThisYear[id] = g.done + 1; state.gigs[id] = (state.gigs[id] || 0) + 1;
  return ok(`${g.title} gig: earned $${pay.toFixed(2)} (${g.hours}h @ $${rate.toFixed(2)})`, { pay });
}

// ---- Military & special -----------------------------------------------
export function listMilitary(data, state) {
  return data.occ.military.map(b => {
    const reasons = [];
    if (state.age < b.min_age) reasons.push('Must be ' + b.min_age + '+');
    if (state.age > b.max_age) reasons.push('Max age ' + b.max_age);
    reasons.push(...meetsReq(data, state, b.req).reasons);
    if (state.job && state.job.kind === 'military') reasons.push('Already serving');
    const ladder = ladderOf(data, b.entry);
    return { ...b, ranks: ladder.map(x => ({ title: x.title, wage: x.wage })), eligible: !reasons.length, reasons };
  });
}
export function enlist(data, state, branchId) {
  const b = listMilitary(data, state).find(x => x.id === branchId); if (!b) return fail('Unknown branch');
  if (!b.eligible) return fail(b.reasons.join(', '));
  const j = data.occ.jobs[b.entry];
  setOccupation(state, { kind: 'military', id: j.id, title: j.title, wage: j.wage, years: 0, yearsInLevel: 0, branch: b.id, branchName: b.name, sector: j.sector });
  log(state, 'Joined ' + b.name); return ok(`Welcome to the ${b.name}. Rank: ${j.title}.`);
}
export function listSpecial(data, state) {
  return data.occ.special.map(s => {
    const reasons = [];
    if (state.age < s.min_age) reasons.push('Must be ' + s.min_age + '+');
    const r = s.req || {};
    reasons.push(...meetsReq(data, state, { edu: r.edu, looks: r.looks, health: r.health, smarts: r.smarts }).reasons);
    return { id: s.id, name: s.name, desc: s.desc, steps: s.steps, adult: !!s.adult, illegal: !!s.illegal, fame: !!s.fame, min_age: s.min_age,
      eligible: !reasons.length, reasons, current: !!(state.job && state.job.special === s.id) };
  });
}
export function joinSpecial(data, state, id) {
  const s = listSpecial(data, state).find(x => x.id === id); if (!s) return fail('Unknown career');
  if (!s.eligible) return fail(s.reasons.join(', '));
  const st = s.steps[0];
  setOccupation(state, { kind: 'special', special: id, id: st.id, title: st.title, wage: st.wage, years: 0, yearsInLevel: 0, step: 0, sector: 'special' });
  log(state, 'Started career: ' + s.name); return ok(`You begin as ${st.title}.`);
}

// ---- Education ---------------------------------------------------------
export function listMajors(data, state) { return data.occ.education.majors.map(m => ({ ...m, current: !!(state.edu.inSchool && state.edu.inSchool.major === m.id), degree: state.edu.degrees.university?.major === m.name })); }
export function listSchools(data, state) {
  const majorName = state.edu.degrees.university?.major;
  const mj = data.occ.education.majors.find(m => m.name === majorName);
  return data.occ.education.schools.map(s => {
    const reasons = [];
    if (state.age < s.min_age) reasons.push('Must be ' + s.min_age + '+');
    if (state.edu.inSchool) reasons.push('Already enrolled');
    if (s.requires === 'high_school' && EDU_ORDER.indexOf(state.edu.level) < 1) reasons.push('Needs High School diploma');
    if (s.requires === 'university' && !hasDegree(state, 'university')) reasons.push('Needs University degree');
    if (s.postgrad && mj && !mj.postgrad.includes(s.postgrad)) reasons.push(`${majorName} is not eligible`);
    if (state.stats.smarts < s.min_smarts) reasons.push(`Needs Smarts ${s.min_smarts}+`);
    if (hasDegree(state, s.id)) reasons.push('Already completed');
    return { ...s, eligible: !reasons.length, reasons, done: hasDegree(state, s.id),
      inProgress: !!(state.edu.inSchool && state.edu.inSchool.id === s.id) };
  });
}
export const listGradSchools = (data, state) => listSchools(data, state).filter(s => s.requires === 'university');
// educationTree: nodes with status for a tree UI: done | active | available | locked
export function educationTree(data, state) {
  const rows = listSchools(data, state);
  const hs = { id: 'high_school', name: 'High School', status: EDU_ORDER.indexOf(state.edu.level) >= 1 ? 'done' : 'available', parent: null };
  return [hs, ...rows.map(r => ({ id: r.id, name: r.name, years: r.years, tuition: r.tuition, parent: r.requires,
    status: r.done ? 'done' : r.inProgress ? 'active' : r.eligible ? 'available' : 'locked', reasons: r.reasons }))];
}
export function enroll(data, state, schoolId, majorId) {
  const s = listSchools(data, state).find(x => x.id === schoolId); if (!s) return fail('Unknown school');
  if (!s.eligible) return fail(s.reasons.join(', '));
  let major = null;
  if (s.major) { major = data.occ.education.majors.find(m => m.id === majorId); if (!major) return fail('Pick a major'); }
  const toDebt = spend(state, s.tuition);   // tuition per year charged up front for year 1; rest charged yearly
  state.edu.inSchool = { id: s.id, major: major ? major.id : null, majorName: major ? major.name : null, yearsLeft: s.years, tuition: s.tuition };
  log(state, `Enrolled in ${s.name}${major ? ' (' + major.name + ')' : ''}`);
  return ok(`Enrolled in ${s.name}${major ? ' - ' + major.name : ''}.`, { toDebt });
}
export function dropOut(data, state) { if (!state.edu.inSchool) return fail('Not enrolled'); state.edu.inSchool = null; return ok('Dropped out'); }

// ---- Careers collection (164-style) ------------------------------------
// Rows = data.occ.collections plus special/military careers not already listed. A career is collected after
// `years` consecutive years in it (state.careerYears is per collection id, reset when you switch).
export function collectionKeyFor(data, occ) {
  if (!occ) return [];
  const keys = new Set();
  if (occ.kind === 'military') keys.add(slug(occ.branchName || occ.branch));
  else if (occ.kind === 'special') { const s = data.occ.special.find(x => x.id === occ.special); if (s) keys.add(slug(s.name)); }
  else for (const j of ladderBack(data, occ.id)) keys.add(slug(j.title));
  return [...keys];
}
function ladderBack(data, jobId) {
  const out = []; let id = jobId;
  while (id) { const j = data.occ.jobs[id]; if (!j) break; out.push(j); id = Object.values(data.occ.jobs).find(x => x.next === id)?.id; }
  return out;
}
export function collectionRows(data) {
  const rows = [...data.occ.collections];
  const have = new Set(rows.map(r => r.id));
  for (const s of data.occ.special) if (!have.has(slug(s.name))) { rows.push({ id: slug(s.name), name: s.name, edu_text: s.req && s.req.edu ? 'University' : 'none', other: s.desc, years: 20, adult: !!s.adult }); have.add(slug(s.name)); }
  return rows;
}
export function listCollection(data, state, filter = {}) {
  const rows = collectionRows(data).filter(r => state.age >= 18 || !r.adult);
  const all = rows.map(r => ({ ...r, collected: state.collected.includes(r.id), progress: state.careerYears[r.id] || 0 }));
  const out = filter.status === 'collected' ? all.filter(r => r.collected) : filter.status === 'locked' ? all.filter(r => !r.collected) : all;
  return Object.assign(out, { total: all.length, collectedCount: all.filter(r => r.collected).length });
}
export function grantCollection(data, state, id) {
  if (!state.collected.includes(id)) { state.collected.push(id); return true; } return false;
}

// ---- yearly occupation tick (called by sim.yearTick) -------------------
export function occupationYear(data, state) {
  const out = [];
  state.gigsThisYear = {};
  if (state.job) {
    const j = state.job; j.years++; j.yearsInLevel++;
    state.cash += j.wage;
    const keys = collectionKeyFor(data, j);
    for (const k of Object.keys(state.careerYears)) if (!keys.includes(k)) delete state.careerYears[k];
    for (const k of keys) {
      state.careerYears[k] = (state.careerYears[k] || 0) + 1;
      const row = collectionRows(data).find(r => r.id === k);
      if (row && state.careerYears[k] >= row.years && grantCollection(data, state, k)) out.push(`Collected career: ${row.name}!`);
    }
    // promotion
    const perf = clamp(0.25 + (state.stats.smarts - 50) / 200 + (state.stats.happiness - 50) / 300, 0.05, 0.6);
    if (j.kind === 'special') {
      const sp = data.occ.special.find(x => x.id === j.special), nx = sp.steps[j.step + 1];
      if (nx && j.yearsInLevel >= nx.years && rand(state) < perf) { j.step++; j.id = nx.id; j.title = nx.title; j.wage = nx.wage; j.yearsInLevel = 0; out.push(`Promoted to ${nx.title}!`); }
    } else {
      const cur = data.occ.jobs[j.id], nx = cur && cur.next ? data.occ.jobs[cur.next] : null;
      if (nx && j.yearsInLevel >= 1 && meetsReq(data, state, { ...nx.req, edu: nx.req.edu === 'none' ? 'none' : nx.req.edu, licenses: [], prev: false }).ok && rand(state) < perf) {
        j.id = nx.id; j.title = nx.title; j.wage = nx.wage; j.yearsInLevel = 0; out.push(`Promoted to ${nx.title}!`);
      } else if (cur && !nx) j.wage = Math.round(j.wage * 1.02);
    }
  }
  if (state.partTime) { state.cash += state.partTime.weekly_wage * 52; }
  // school
  const sc = state.edu.inSchool;
  if (sc) {
    sc.yearsLeft--;
    state.stats.smarts = clamp(state.stats.smarts + 1.5, 0, 100);
    if (sc.yearsLeft > 0) { spend(state, sc.tuition); }
    else {
      state.edu.degrees[sc.id] = { major: sc.majorName, age: state.age };
      if (sc.id === 'community_college' || sc.id === 'university') state.edu.level = sc.id;
      out.push(`Graduated: ${data.occ.education.names[sc.id] || sc.id}${sc.majorName ? ' (' + sc.majorName + ')' : ''}`);
      state.edu.inSchool = null;
    }
  }
  return out;
}
