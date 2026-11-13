// rtb gate (DEV ONLY, Oct 29 2026). Real-time battles are an OPTIONAL mode, off by default.
//   ?rtb=1  turn the setting on (remembered in localStorage on this dev machine)
//   ?rtb=0  kill switch: off now and forgets the setting
// Only on a dev host (localhost / 127.x / ::1 / *.local). The public alpha build strips every unknown query flag
// (src/alpha.js), and runs on a public host, so it can never turn on there.
export const RTB_KEY = 'kilumen_dev_rtb';
export function devHost(loc = globalThis.location) {
  const h = String(loc?.hostname || '');
  return h === 'localhost' || h === '::1' || h === '[::1]' || /^127\./.test(h) || /\.local$/.test(h) || h === '0.0.0.0';
}
export function rtbEnabled(q, { store = globalThis.localStorage, loc = globalThis.location } = {}) {
  const v = q?.get?.('rtb');
  if (v === '0') { try { store?.removeItem(RTB_KEY); } catch { /* ignore */ } return false; }
  if (!devHost(loc)) return false;
  if (v === '1') { try { store?.setItem(RTB_KEY, '1'); } catch { /* ignore */ } return true; }
  try { return store?.getItem(RTB_KEY) === '1'; } catch { return false; }
}
