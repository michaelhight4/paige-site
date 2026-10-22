// School activities view for Work > Education: every school sport and club for the player's school level with status,
// tryout requirement and the join/leave route. Joins reuse joinSport / joinClub / joinClubWithAd (same code paths as the old screens).
import { D } from './data.js';
import * as E from './engine.js';
import * as SS from './schoolsports.js';

export const schApi = {
  getSchoolActivities() {
    const s = this.s, age = Math.floor(s.age), level = SS.levelOf(s), sch = E.Scholar.status(s);
    const ages = D.life.school.sportAges[level] || null, cur = s.sport || null;
    const meta = Object.fromEntries(this.cfg.sports.schoolSports.map((x) => [x.id, x])), FALL = { track: { minAge: 8, positions: ['Sprints', 'Distance', 'Jumps', 'Throws'] }, swimming: { minAge: 8, positions: ['Freestyle', 'Butterfly', 'Backstroke', 'Relay'] } };
    const sports = D.life.sports.list.map((d) => ({ id: d.id, label: (meta[d.id] || d).label || d.name, icon: (meta[d.id] || d).icon, minAge: (meta[d.id] || FALL[d.id] || { minAge: 10 }).minAge, positions: (meta[d.id] || FALL[d.id] || { positions: ['Starter'] }).positions })).map((x) => {
      const joined = !!cur && cur.id === x.id; let reason = '';
      if (!level) reason = 'Sports are for students'; else if (s.prison) reason = 'Not from prison'; else if (age < x.minAge) reason = `Tryouts open at age ${x.minAge}`; else if (cur && !joined) reason = `You are on the ${SS.sportDef(cur.id).name.toLowerCase()} team: leave it first`;
      return { id: x.id, label: x.label, icon: x.icon, minAge: x.minAge, positions: x.positions, joined, team: joined ? cur.team : '', position: joined ? cur.position || '' : '', skill: joined ? Math.round(cur.skill) : null, years: joined ? cur.yrs : 0, eligible: !reason, reason, tryout: `Tryout: be a student aged ${x.minAge}+ and not on another team` };
    });
    const clubs = !level ? [] : sch.clubsAvail.filter((c) => !ages || (c.minAge <= ages[1] + 4 && c.maxAge >= ages[0])).map((c) => ({ id: c.id, name: c.name, icon: c.icon, minAge: c.minAge, maxAge: c.maxAge, joined: c.joined, years: c.years, blocked: c.blocked, adJoin: !c.joined && !!c.blocked && !c.adBlocked, locked: !c.joined && !!c.blocked && !!c.adBlocked, skills: Object.keys(c.skills || {}) }));
    return { level, levelLabel: level ? SS.levelLabel(level) : '', inSchool: !!level, sports, clubs, maxClubs: sch.maxClubs, clubCount: clubs.filter((c) => c.joined).length, sport: cur ? { id: cur.id, level: cur.level } : null };
  },
};
