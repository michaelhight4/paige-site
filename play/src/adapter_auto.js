// Autopilot adapter methods (mixed into EngineAdapter). Logic lives in src/autopilot.js.
import * as Auto from './autopilot.js';
import { log } from './core.js';

export const autoApi = {
  getAutopilot() { return Auto.status(this); },
  getAutoPage(id) { const pg = Auto.pageStatus(this).find((x) => x.id === id); return pg ? { ...pg, unlocked: Auto.unlocked() } : null; },
  setAutoPage(id, on) { const n0 = this.mark(); if (!Auto.unlocked()) return this.res(false, 'Needs the Autopilot Pack ($5.99) or All Access.', n0); const r = Auto.setPage(this, id, on); return this.res(!!r.ok, r.msg, n0); },
  setAutopilot(o = {}) {
    if (!Auto.unlocked()) return { ok: false, message: 'Needs the Autopilot Pack ($5.99) or All Access.', ...Auto.status(this) };
    Auto.configure(this.s, o); return { ok: true, message: '', ...Auto.status(this) };
  },
  // Skip ahead: play up to `years` years with `routines` (default: saved selection). Stops on the same safety conditions as Autopilot.
  async skipAhead({ years = 1, routines, floor } = {}) {
    const s = this.s, A = Auto.ensure(s), n0 = this.mark();
    if (!Auto.unlocked()) return { ok: false, message: 'Needs the Autopilot Pack ($5.99) or All Access.', years: [], done: 0, requested: 0, entries: [] };
    const want = Math.max(1, Math.min(Auto.MAX_SKIP, Math.floor(Number(years)) || 1)), ids = routines || A.routines, fl = floor ?? A.floor;
    const out = { ok: true, message: '', requested: want, done: 0, years: [], stop: null, event: null, died: false, death: null, remaining: 0, routines: ids, floor: fl };
    for (let i = 0; i < want; i++) {
      const stopB = Auto.safetyBefore(s, fl);
      if (stopB) { out.stop = stopB; break; }
      const r = await this.age({ routines: ids, floor: fl, skip: true }); const sm = r.auto;
      if (sm) out.years.push(sm); out.done++;
      if (r.died) { out.died = true; out.death = r.death; out.stop = { kind: 'dead', reason: 'You died.' }; break; }
      if (r.event) { out.event = r.event; out.stop = { kind: 'event', reason: 'A big event or choice came up.' }; break; }
      if (sm && sm.stops.length) { out.stop = sm.stops[0]; break; }
      if (r.blocked) { out.stop = { kind: 'event', reason: 'Something needs your attention.' }; break; }
    }
    out.remaining = out.stop && !out.died && out.stop.kind !== 'floor' ? want - out.done : 0; A.skipRemaining = out.stop && out.stop.kind === 'event' ? want - out.done : 0;
    const a0 = out.years.length ? out.years[0].fromAge : Math.floor(s.age);
    log(s, `I skipped ahead ${out.done} year${out.done === 1 ? '' : 's'} on autopilot (age ${a0} to ${Math.floor(s.age)})${out.stop ? ': stopped, ' + out.stop.reason.toLowerCase() : '.'}`, 'act');
    out.entries = this.entriesSince(n0); out.state = this.getState(); out.adPrompt = this.getAdPrompt(); out.message = `Skipped ${out.done} of ${want} year${want === 1 ? '' : 's'}.` + (out.stop ? ' Stopped: ' + out.stop.reason : '');
    return out;
  },
};
