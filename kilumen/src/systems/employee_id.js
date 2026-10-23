// Employee ID number (Gary, Oct 23 2026 12:20 + 12:21 PM CT): the company voice always calls the player by an employee
// number, never by name. Format (Gary's example "Good job 001893!"): 6 digits, zero-padded, no prefix, shown bare.
// Stable per save: derived from the save's saveId (random per new game, deterministic for migrated v1 saves), and stored
// in the save as company.employeeId (src/overworld/save.js). Old saves without it get the same derived number on load.
// Text var: {employee_id} (Overworld.textVars), so any Text Bot line can use it.

/** FNV-1a 32-bit. */
function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

export const EMPLOYEE_ID_RE = /^\d{6}$/;

/** saveId -> '001893'-style number. Never '000000' (reads like a blank). */
export function employeeIdFor(saveId) {
  const n = fnv('rt-employee:' + String(saveId || 'k0')) % 999999;
  return String(n + 1).padStart(6, '0');
}

/** The current player's number: the saved one when valid, else derived from the save id. */
export function employeeIdOf(scene) {
  const saved = scene?.systems?.company?.employeeId || scene?.store?.extra?.company?.employeeId;
  if (EMPLOYEE_ID_RE.test(saved || '')) return saved;
  return employeeIdFor(scene?.store?.extra?.saveId || scene?.saveId);
}
