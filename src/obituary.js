// Obituary built from the whole life: career (incl. retired pro careers), titles/awards, everything owned, fame, wealth, family, cause.
import * as MT from './myteam.js';
import * as Fame from './fame.js';
import { fmtCompact } from './fmt.js';
const nm = (x) => (x && (x.name || x.label || x.title)) || null;
const list = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
const art = (w) => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
export function lifeFacts(s, e = {}) {
  const m = s.mt || null, py = (() => { try { return MT.playingYears(s); } catch (x) { return { pro: 0, college: 0 }; } })();
  const sportSeasons = m ? m.seasons.filter((x) => x.level === 'pro' || x.level === 'minor') : [];
  const sid = sportSeasons.length ? Object.entries(sportSeasons.reduce((a, x) => ((a[x.sid] = (a[x.sid] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1])[0][0] : (m && m.jobSport) || null;
  const sport = sid && MT.SPORTS[sid] ? MT.SPORTS[sid].name.toLowerCase() : null;
  const titles = m ? m.awards.filter((x) => x.id === 'champion').length : 0, awards = m ? m.awards.filter((x) => x.id !== 'champion') : [];
  const topAward = m && m.career.hof ? 'Hall of Fame' : awards.find((x) => x.id === 'mvp') ? 'League MVP' : titles ? `${titles}× champion` : awards[0] ? awards[0].label : null;
  const teams = [...new Set(sportSeasons.map((x) => x.team))];
  const proYrs = Math.max(py.pro || 0, sportSeasons.length);
  const curJob = e.job && e.job !== 'none' ? e.job : (s.sl && s.sl.job && s.sl.job.title) || null;
  const coach = s.coach && (s.coach.active || s.coach.years) ? 'coach' : null;
  let career = null;
  if (proYrs >= 3 && sport) career = { line: `${proYrs}-year pro ${sport} career${teams.length ? ` (${list(teams.slice(0, 3))})` : ''}`, headline: curJob && MT.jobIsAthlete(s) ? `Pro ${sport} player` : `Retired pro ${sport} player` };
  else if (curJob) career = { line: `worked as ${art(curJob.toLowerCase())}`, headline: curJob };
  else if (s.lastJob) career = { line: `worked as ${art(String(s.lastJob).toLowerCase())}`, headline: `Retired ${String(s.lastJob).toLowerCase()}` };
  const owned = [];
  for (const b of s.biz || []) owned.push(nm(b)); if (s.prod && s.prod.cos) for (const c of Object.values(s.prod.cos)) owned.push(nm(c));
  if (s.fr) for (const t of s.fr.teams || (s.fr.team ? [s.fr.team] : [])) owned.push(nm(t)); if (s.es && s.es.teams) for (const t of s.es.teams) owned.push(nm(t));
  if (s.rc && s.rc.team) owned.push(nm(s.rc.team)); if (s.brand) owned.push(nm(s.brand) || 'a clothing brand'); if (s.farm) owned.push(nm(s.farm) || 'a farm');
  const own = owned.filter(Boolean);
  const people = s.people || [], spouse = people.find((p) => p.rel === 'spouse' && p.alive), kids = people.filter((p) => p.rel === 'child'), grand = people.filter((p) => /grand(child|son|daughter)/.test(p.rel || ''));
  const nw = e.netWorth ? e.netWorth.total : 0, tier = Fame.tierOf(s.stats.fame || 0).name;
  return { rings: m ? m.awards.filter((x) => x.id === 'champion' && ['basketball', 'football', 'baseball', 'hockey'].includes(x.sid) && x.level !== 'school').length : 0, career, sport, proYrs, titles, awards: awards.length, topAward, owned: own, spouse: spouse ? spouse.name : null, kids: kids.length, kidsAlive: kids.filter((k) => k.alive).length, grand: grand.length, fame: tier, famous: (s.stats.fame || 0) >= 25, nw, coach, hof: !!(m && m.career.hof) };
}
const wealthTxt = (nw) => (nw >= 1e12 ? `one of the richest people who ever lived (worth ${fmtCompact(nw)})` : nw >= 1e9 ? `a billionaire (worth ${fmtCompact(nw)})` : nw >= 1e7 ? `a wealthy figure (worth ${fmtCompact(nw)})` : nw >= 1e6 ? `a millionaire` : null);
const causeTxt = (e, f) => { const fam = f.spouse || f.kidsAlive; const c = String(e.cause || '').toLowerCase();
  if (e.kind === 'old') return fam ? 'peacefully, surrounded by family' : 'peacefully in their sleep'; if (e.kind === 'disease') return `after a long battle with ${c}`; if (e.kind === 'accident') return `in ${c}`; if (e.kind === 'murder') return 'in a violent attack'; if (e.kind === 'overdose') return 'of an overdose'; if (e.kind === 'prison') return 'in prison'; if (e.kind === 'lightning') return 'after being struck by lightning'; if (e.kind === 'war') return 'in the war'; return c ? `of ${c}` : ''; };
export function write(s, e) {
  const f = lifeFacts(s, e), out = [];
  out.push(`${s.name} died at ${e.age}, ${causeTxt(e, f)}.`);
  const who = [f.famous ? art(f.fame) : null, wealthTxt(f.nw)].filter(Boolean);
  if (f.career) out.push(`${f.famous || f.nw >= 1e7 ? 'Remembered as' : 'They'} ${f.famous || f.nw >= 1e7 ? 'the ' + f.career.headline.toLowerCase() + ' behind a ' + f.career.line : f.career.line}.`);
  if (f.titles || f.awards || f.hof) out.push(`Honours: ${[f.titles ? `${f.titles} championship${f.titles > 1 ? 's' : ''}${f.rings ? ` (${f.rings} ring${f.rings > 1 ? 's' : ''})` : ''}` : null, f.awards ? `${f.awards} individual award${f.awards > 1 ? 's' : ''}` : null, f.hof ? 'Hall of Fame inductee' : null].filter(Boolean).join(', ')}.`);
  if (f.owned.length) out.push(`They built and owned ${list(f.owned.slice(0, 6))}${f.owned.length > 6 ? ` and ${f.owned.length - 6} more` : ''}.`);
  if (who.length) out.push(`They were ${list(who)}.`);
  const fam = [f.spouse ? `their spouse ${f.spouse}` : null, f.kids ? `${f.kidsAlive} of ${f.kids} children` : null, f.grand ? `${f.grand} grandchildren` : null].filter(Boolean);
  out.push(fam.length ? `They are survived by ${list(fam)}.` : f.kids ? 'They outlived all of their children.' : 'They had no children.');
  return { text: out.join(' '), headline: f.career ? f.career.headline : 'Private citizen', topAward: f.topAward, facts: f };
}
