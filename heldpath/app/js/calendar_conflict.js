/**
 * Keep every plan and Group Run on a day. A new item never overwrites another.
 */

export function plansOnDate(plans, date) {
  return (plans || []).filter((p) => p && p.date === date);
}

export function isGroupItem(p) {
  return !!(p && p.groupRunId);
}

/** Short month-grid label. One item stays "Planned" or "Group"; two or more say how many. */
export function dayPlanLabel(dayPlans) {
  const n = (dayPlans || []).length;
  if (!n) return "";
  if (n === 1) return isGroupItem(dayPlans[0]) ? "Group" : "Planned";
  return `${n} planned`;
}

export function conflictCopy(existing) {
  const items = existing || [];
  if (!items.length) return "";
  const groups = items.filter(isGroupItem).length;
  const plans = items.length - groups;
  if (items.length === 1 && groups) {
    return "This day already has a Group Run. Both will stay on the calendar.";
  }
  if (items.length === 1 && plans) {
    return "This day already has a planned session. Both will stay on the calendar.";
  }
  return "This day already has more than one plan. Everything stays on the calendar.";
}

export function overlappingDates(sessionDates, plans) {
  return (sessionDates || []).filter((d) => plansOnDate(plans, d).length > 0);
}

export function overlapPlanCopy(dates) {
  const n = (dates || []).length;
  if (!n) return "";
  if (n === 1) {
    return "One session lands on a day that already has a plan or Group Run. Both will stay on the calendar.";
  }
  return `${n} sessions land on days that already have a plan or Group Run. Both will stay on the calendar.`;
}

function sameRow(a, b) {
  if (!a || !b) return false;
  if (a.id && a.id === b.id) return true;
  if (b.groupRunId && a.groupRunId === b.groupRunId) return true;
  if (b.sourcePlanId && a.sourcePlanId === b.sourcePlanId && a.sourceSessionDate === b.sourceSessionDate) return true;
  return false;
}

/**
 * Add or update rows without dropping a different plan or Group Run,
 * even when they share a date.
 */
export function mergeCalendarRows(plans, rows) {
  const next = Array.isArray(plans) ? plans.slice() : [];
  for (const row of rows || []) {
    if (!row || !row.id) continue;
    const idx = next.findIndex((p) => sameRow(p, row));
    if (idx >= 0) next[idx] = row;
    else next.push(row);
  }
  return next;
}

export function sortCalendarItems(plans) {
  return (plans || []).slice().sort((a, b) => {
    const da = a && a.date || "";
    const db = b && b.date || "";
    if (da !== db) return da < db ? -1 : 1;
    const ta = a && a.startAt || "";
    const tb = b && b.startAt || "";
    if (ta !== tb) return ta < tb ? -1 : 1;
    return String(a && a.id || "").localeCompare(String(b && b.id || ""));
  });
}
