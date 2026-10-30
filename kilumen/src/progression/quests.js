// Data-driven quests (Oct 23, 2026, overnight coder). Data: data/quests.json = Story Bot's FINAL 50-quest draft
// (design/overnight_quests/quests_draft.json) converted per SCHEMA.md by tools/build_progression_data.mjs.
// Pure state machine (no DOM, no scene); ./index.js wires it to talk / steps / rewards / UI.
//
// Status: locked -> available (prerequisite flags met) -> active (q_<id>_on) -> ready (npc turn-in: every required
// step but the last is done) -> done (q_<id>_done).
//  - start 'auto': starts by itself once available (main quests, props / signs as givers).
//  - start 'npc' : starts when the player talks to giver.npc on giver.map; turn_in 'npc' finishes there and sets the
//    last step's flag (when the quest owns that flag, i.e. it is listed in new_ids).
//  - a step is done when its flag is set; a flagless step when the player reaches its map (its `at` tile +-1 if given)
//    while it is the current step, or when any later step is done. A quest-owned step flag with an `at` tile is set by
//    reaching that tile. Steps marked optional never block. `condition` = flag needed before the step counts.
//  - main quests never set story flags (the game does); rewards: side quests only (items only when the id exists).
export const QFLAG = { on: (id) => `q_${id}_on`, done: (id) => `q_${id}_done` };

export class QuestBook {
  constructor(data, saved = null) {
    this.data = data; this.quests = data.quests.slice().sort((a, b) => a.order - b.order);
    this.byId = new Map(this.quests.map((q) => [q.id, q]));
    this.state = { steps: {}, tracked: null, seenLines: {}, ...(saved || {}) };
  }
  toJSON() { return JSON.parse(JSON.stringify(this.state)); }
  owns(q, flag) { return !!flag && (q.new_ids || []).includes(flag); }

  status(q, flags) {
    if (flags.has(QFLAG.done(q.id))) return 'done';
    if (this.superseded(q, flags)) return 'done';
    if (flags.has(QFLAG.on(q.id))) return this.required(q).slice(0, -1).every((s) => this.stepDone(q, s, flags)) && q.turn_in === 'npc' ? 'ready' : 'active';
    return (q.prerequisites || []).every((f) => flags.has(f)) ? 'available' : 'locked';
  }
  /** Main quests behind the story: a later main quest is done or one of its step flags is set (e.g. a Travel jump or an
   *  imported save that skipped early flags). Fixes the HUD showing 'The Benchmark 0/4' on a Master 2 save (Oct 29 2026). */
  superseded(q, flags) {
    if (q.type !== 'main') return false;
    return this.quests.some((o) => o.type === 'main' && o.order > q.order && (flags.has(QFLAG.done(o.id)) || o.steps.some((s) => s.flag && !this.owns(o, s.flag) && flags.has(s.flag))));
  }
  required(q) { return q.steps.filter((s) => !s.optional); }
  stepDone(q, s, flags) {
    if (s.flag ? flags.has(s.flag) : (this.state.steps[q.id] || []).includes(s.id)) return true;
    const i = q.steps.indexOf(s); // a later required step done => this one is behind us
    return !s.optional && q.steps.slice(i + 1).some((t) => !t.optional && (t.flag ? flags.has(t.flag) : (this.state.steps[q.id] || []).includes(t.id)));
  }
  current(q, flags) { return this.required(q).find((s) => !this.stepDone(q, s, flags)) || null; }
  progress(q, flags) { const r = this.required(q); return { done: r.filter((s) => this.stepDone(q, s, flags)).length, total: r.length }; }
  lines(q, context, step = null) { return (q.lines || []).filter((l) => l.context === context && (step == null || l.step === step)); }

  /** One tick. env = {flags:Set, map, x, y}. Returns actions for the caller: {type:'set'|'start'|'step'|'complete', q, step?, flag?}. */
  update(env) {
    const out = [], { flags } = env;
    for (const q of this.quests) {
      let st = this.status(q, flags);
      if (st === 'available' && q.start === 'auto') { out.push({ type: 'start', q }); continue; }
      if (st !== 'active' && st !== 'ready') continue;
      const cur = this.current(q, flags);
      if (cur && (!cur.condition || flags.has(cur.condition)) && cur.map && cur.map === env.map) {
        const near = !cur.at || (Math.abs(cur.at.x - env.x) <= 1 && Math.abs(cur.at.y - env.y) <= 1);
        const isLastNpc = q.turn_in === 'npc' && cur === this.required(q).at(-1);
        if (near && !isLastNpc) {
          if (!cur.flag) { (this.state.steps[q.id] ||= []).push(cur.id); out.push({ type: 'step', q, step: cur }); }
          else if (this.owns(q, cur.flag) && cur.at) { out.push({ type: 'set', q, step: cur, flag: cur.flag }); out.push({ type: 'step', q, step: cur }); }
        }
      }
      if (q.turn_in !== 'npc' && this.required(q).every((s) => this.stepDone(q, s, flags))) out.push({ type: 'complete', q });
    }
    return out;
  }

  /** Talking to (map, npcId): -> {type:'give'|'turn_in'|'nudge', q} | null */
  talkAction(map, npcId, flags) {
    for (const q of this.quests) {
      if (q.giver?.npc !== npcId || q.giver?.map !== map) continue;
      const st = this.status(q, flags);
      if (st === 'available' && q.start === 'npc') return { type: 'give', q };
      if (st === 'ready') return { type: 'turn_in', q };
      if (st === 'active' && this.lines(q, 'in_progress').length) return { type: 'nudge', q };
    }
    return null;
  }

  /** Rewards for a finished quest. -> {items:[{id,qty}], money, flags:[]} (side quests only; main = story-driven) */
  rewards(q) {
    if (q.type !== 'side') return { items: [], money: 0, flags: [] };
    return { items: q.reward.items_placeholder || [], money: q.reward.money_placeholder || 0, flags: (q.reward.flags || []).filter((f) => this.owns(q, f)) };
  }

  /** The quest the HUD tracks: the chosen one if still open, else the first active main, else the first active side. */
  tracked(flags) {
    const open = (q) => q && ['active', 'ready'].includes(this.status(q, flags));
    const t = this.byId.get(this.state.tracked);
    if (open(t)) return t;
    return this.quests.find((q) => q.type === 'main' && open(q)) || this.quests.find((q) => open(q)) || null;
  }
  /** Quest log rows: open quests first (ready, then active), then done. */
  log(flags) {
    const rank = { ready: 0, active: 1, done: 2 };
    return this.quests.map((q) => ({ q, status: this.status(q, flags) })).filter((r) => r.status in rank)
      .sort((a, b) => rank[a.status] - rank[b.status] || (a.q.type === b.q.type ? a.q.order - b.q.order : a.q.type === 'main' ? -1 : 1));
  }
}
