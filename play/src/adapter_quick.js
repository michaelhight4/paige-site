// Quick actions for the in-menu bar (Train, Read, Practice, Work harder, relationship upkeep...). Thin wrappers over existing once-per-year actions,
// so nothing new is balanced here: each one maps to an existing activity/passion/interaction and shares its "already done this year" flag.
import * as E from './engine.js';
import { D } from './data.js';
import * as P from './people.js';
import * as Auto from './autopilot.js';

// which quick actions each menu context shows (order matters); 'upkeep' expands to the people who need attention most
export const CONTEXTS = {
  skills: ['train', 'read', 'study', 'practice', 'meditate', 'upkeep:1'],
  work: ['workharder', 'study', 'train', 'practice', 'upkeep:1'],
  activities: ['train', 'read', 'meditate', 'practice', 'workharder', 'upkeep:1'],
  social: ['upkeep:3'],
};
const DEF = {
  train: { icon: '🏋️', label: 'Train', world: 'gym', skill: 'Gym' },
  read: { icon: '📖', label: 'Read', world: 'library', skill: 'Library' },
  study: { icon: '📚', label: 'Study', life: 'study', skill: 'Study' },
  meditate: { icon: '🧘', label: 'Meditate', life: 'meditate', skill: 'Meditate' },
  workharder: { icon: '💼', label: 'Work harder', life: 'work', skill: 'Work' },
};
const worldAct = (id) => { for (const c of D.worldActs.categories) { const a = c.activities.find((x) => x.id === id); if (a) return a; } return null; };
export const quickApi = {
  getQuickActions(ctx) {
    const s = this.s, age = Math.floor(s.age), out = [], ids = CONTEXTS[ctx] || [];
    const push = (a) => out.push({ done: false, disabled: false, reason: '', ...a });
    for (const key of ids) {
      const [k, n] = key.split(':');
      if (k === 'upkeep') {
        const kin = P.living(s).filter((p) => p.rel !== 'ex' && P.interactionsFor(s, p).some((i) => i.id === 'spend')).sort((a, b) => a.bar - b.bar).slice(0, Number(n) || 1);
        for (const p of kin) { const done = !!s.acted['p' + p.id + 'spend']; push({ id: 'upkeep:' + p.id, icon: '💬', label: 'Spend time: ' + p.first, hint: p.rel, done, disabled: done || !!s.prison }); }
        continue;
      }
      if (k === 'practice') {
        const st = E.Passions.status(s);
        if (age < (st.minAge ?? 12) || st.locked) { push({ id: 'practice', icon: '🔥', label: 'Practice', disabled: true, reason: `Passions start at age ${st.minAge ?? 12}` }); continue; }
        const next = st.active.find((a) => !a.practiced);
        push(next ? { id: 'practice', icon: next.icon || '🔥', label: 'Practice', hint: next.name } : { id: 'practice', icon: '🔥', label: 'Practice', done: !!st.active.length, disabled: true, reason: st.active.length ? 'Practiced this year' : 'Pick a passion first' });
        continue;
      }
      const d = DEF[k]; if (!d) continue;
      let minAge = 0, done = false, reason = '';
      if (d.world) { const a = worldAct(d.world); minAge = (a && a.minAge) || 0; done = !!s.acted['w:' + d.world]; }
      else { const a = D.life.activities.find((x) => x.id === d.life); minAge = a ? a.min : 0; done = !!s.acted[d.life]; if (a && a.needsJob && !s.job) reason = 'Needs a job'; }
      if (age < minAge) reason = `Unlocks at age ${minAge}`; else if (s.prison) reason = 'Not in prison';
      push({ id: k, icon: d.icon, label: d.label, done, disabled: done || !!reason, reason });
    }
    const A = Auto.ensure(s); return { ctx, alive: s.alive, age, nextAge: age + 1, actions: out, auto: { unlocked: Auto.unlocked(), on: Auto.unlocked() && !!A.on } };
  },
  quickAction(id) {
    const s = this.s, n0 = this.mark();
    if (!s.alive) return this.res(false, 'Not available.', n0);
    const [k, arg] = String(id).split(':');
    if (k === 'upkeep') return this.interact(Number(arg), 'spend');
    if (k === 'practice') { const next = E.Passions.status(s).active.find((a) => !a.practiced); return next ? this.practicePassion(next.id) : this.res(false, 'Nothing to practice right now.', n0); }
    const d = DEF[k]; if (!d) return this.res(false, 'Unknown action.', n0);
    if (d.world) return this.doActivity('w:' + d.world, 0);
    E.Skills.fromActivity(s, d.skill); const r = E.doActivity(s, d.life); return this.res(!!r.ok, r.msg, n0);
  },
};
