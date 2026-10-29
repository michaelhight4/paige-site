// Kilumen achievements engine (Badges tab, dev/badges-tab, Oct 29 2026). Pure logic, no DOM.
// Adapted from ntatoud/achievements-manager (MIT, https://github.com/ntatoud/achievements-manager, credit in
// THIRD_PARTY_LICENSES "Badges tab"): definitions once, progress per id, auto-unlock when progress reaches maxProgress,
// plus a "seen" marker for the new-item shine. Kilumen additions: stacking (Gary Oct 29 2026: the same sport/event
// won again stacks into ONE slot with a count, first and latest dates) and comingSoon entries that never unlock.
// Save shape (systems.state.achievements): { v: 1, e: { <id>: { count, first, last, seen } } }  dates = 'YYYY-MM-DD'.

export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function achState(holder) {
  const s = (holder.achievements ||= { v: 1, e: {} });
  s.e ||= {}; return s;
}

/** Reads the live value of each definition from ctx and records new earns. -> list of ids whose count went up. */
export function sync(defs, holder, ctx, now = today()) {
  const s = achState(holder), up = [];
  for (const d of defs) {
    if (d.comingSoon) continue;
    let n = 0;
    try { n = Math.max(0, Math.floor(Number(d.value(ctx)) || 0)); } catch { n = 0; }
    const earned = d.stack ? n : (n >= (d.max || 1) ? 1 : 0); // stack: one slot, count = times won
    const cur = s.e[d.id];
    if (earned > (cur?.count || 0)) {
      const r = (s.e[d.id] ||= { count: 0, first: now, last: now, seen: 0 });
      r.count = earned; r.last = now; r.first ||= now; up.push(d.id);
    }
  }
  return up;
}

/** View rows for the screen: earned / locked / soon, progress, stack count, dates, and isNew / bumped for the animations. */
export function view(defs, holder, ctx) {
  const s = achState(holder);
  return defs.map((d) => {
    const r = s.e[d.id]; let prog = 0;
    if (!d.comingSoon) { try { prog = Math.max(0, Math.floor(Number(d.value(ctx)) || 0)); } catch { prog = 0; } }
    const count = r?.count || 0;
    return { ...d, earned: count > 0, soon: !!d.comingSoon, count, first: r?.first || null, last: r?.last || null,
      prog: d.max ? Math.min(prog, d.max) : prog, isNew: count > 0 && !r.seen, bumped: count > 1 && r.seen > 0 && r.seen < count };
  });
}

/** After the tab has shown its shine / bump: mark every earned entry as seen. */
export function markSeen(holder) {
  const s = achState(holder);
  for (const r of Object.values(s.e)) r.seen = r.count;
}
