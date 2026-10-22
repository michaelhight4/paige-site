// Retirement (7c6, Gary): offered after 25 years of service at the CURRENT job (per-job tenure: s.job.yrs, or the mirrored slice job's years),
// not by age. Retiring ends that job and starts a yearly pension; you can take a new job afterwards and pensions stack (one per retired job).
// Pension = 2% of final salary per year of service, capped at 70% of salary. One-off lump sum = 3 months' salary.
export const SERVICE_YEARS = 25, RATE = 0.02, CAP = 0.7, LUMP_MONTHS = 3;
export const ensure = (s) => { if (!Array.isArray(s.pensions)) s.pensions = []; return s.pensions; };
export function quote(salary, years) {
  const y = Math.max(0, Math.floor(years || 0)), sal = Math.max(0, salary || 0), left = Math.max(0, SERVICE_YEARS - y);
  const pension = Math.round(sal * Math.min(CAP, RATE * y)), lump = Math.round((sal * LUMP_MONTHS) / 12);
  return { years: y, need: SERVICE_YEARS, left, eligible: left === 0 && sal > 0, salary: Math.round(sal), pension, lump, pct: Math.round(Math.min(CAP, RATE * y) * 100),
    countdown: left === 0 ? 'Retirement available now' : `Retirement in ${left} year${left === 1 ? '' : 's'}`, reason: left === 0 ? '' : `Needs ${SERVICE_YEARS} years of service at this job (${y} so far).` };
}
export const total = (s) => ensure(s).reduce((a, p) => a + (p.amount || 0), 0);
export function payYear(s, earn, dt = 1) { const t = total(s); if (t > 0) earn(s, t * dt); return t; }
