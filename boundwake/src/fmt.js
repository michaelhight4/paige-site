// The one money formatter: thousands commas plus a short magnitude suffix for big amounts.
// fmtMoney(1250000) -> "$1,250,000 (1.25 mil)"; fmtMoney(8500) -> "$8,500"; fmtMoney(-42000) -> "-$42,000 (-42K)".
// Suffixes: K, mil, bill, trill, quad, quint, sext, sept, oct, non, dec; above dec the short form is scientific ("1.2e36").
// Above ~9e15 integers are not exact in JS numbers, so the full number is formatted from the float (no fake precision claims).
const SUF = [[1e33, 'dec'], [1e30, 'non'], [1e27, 'oct'], [1e24, 'sept'], [1e21, 'sext'], [1e18, 'quint'], [1e15, 'quad'], [1e12, 'trill'], [1e9, 'bill'], [1e6, 'mil']];
const trim = (x) => String(+x.toFixed(2));
export function short(n) {
  const a = Math.abs(n); if (!isFinite(a)) return '∞';
  if (a >= 1e36) { const [m, e] = a.toExponential(1).split('e+'); return `${+m}e${e}`; }
  for (const [v, s] of SUF) if (a >= v) { let x = trim(a / v); if (x === '1000' && v < 1e33) { const nx = SUF[SUF.findIndex((q) => q[0] === v) - 1]; return '1 ' + nx[1]; } return x + ' ' + s; }
  if (a >= 1e4) { const k = trim(a / 1e3); return k === '1000' ? '1 mil' : k + 'K'; } return '';
}
const commas = (a) => (a < 9e15 ? Math.round(a).toLocaleString('en-US') : BigInt(Math.round(a)).toLocaleString('en-US'));
export function fmtMoney(n, cur = '$') {
  if (n == null || isNaN(n)) return '—'; const neg = n < 0, a = Math.abs(n);
  if (!isFinite(a)) return (neg ? '-' : '') + cur + '∞';
  const sh = short(a);
  if (a >= 1e36) return (neg ? '-' : '') + cur + sh; // too long to print in full
  return (neg ? '-' : '') + cur + commas(a) + (sh ? ` (${neg ? '-' : ''}${sh})` : ''); // the compact part carries the sign too (7c6)
}
// compact form for tight spots (banner, chips): "$9 mil", "$1.25 bill"; under a million it is the full number with commas
export function fmtCompact(n, cur = '$') { if (n == null || isNaN(n)) return '—'; const a = Math.abs(n), neg = n < 0; return (neg ? '-' : '') + cur + (a >= 1e6 ? short(a) : Math.round(a).toLocaleString('en-US')); }
export const plain = (n) => fmtMoney(n).replace(/^(-?)\$/, '$1');

// Counts (followers, subs, likes): 950 -> "950", 12,345 -> "12.3K", 4.5e6 -> "4.5M", 8e9 -> "8B", 2e12 -> "2T"; beyond T it reuses the money names (quad, quint...).
const CSUF = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
export function fmtCount(n) {
  if (n == null || isNaN(n)) return '0'; const neg = n < 0, a = Math.abs(n); if (!isFinite(a)) return '∞';
  if (a >= 1e15) return (neg ? '-' : '') + short(a);
  for (let i = 0; i < CSUF.length; i++) { const [v, u] = CSUF[i]; if (a >= v) { const x = a / v, t = +(x >= 100 ? x.toFixed(0) : x.toFixed(1)); if (t >= 1000 && i > 0) return (neg ? '-' : '') + '1' + CSUF[i - 1][1]; if (t >= 1000) return (neg ? '-' : '') + short(a); return (neg ? '-' : '') + t + u; } }
  return (neg ? '-' : '') + String(Math.round(a));
}
// Realistic ceiling for one platform's audience: about the world population.
export const MAX_FOLLOWERS = 8e9;
// Action labels show their price exactly once: any price already written in the label is replaced by the real cost.
export function labelWithPrice(label, cost) { const base = String(label || '').replace(/\s*\(\$[\d,.]+\s*[A-Za-z]*\)/g, '').trim(); return cost ? `${base} ($${Math.round(cost).toLocaleString('en-US')})` : String(label || '').trim(); }
// Unit prices: keeps cents and sub-cent digits so cheap coins never read "$0": 0.45 -> "$0.45", 0.00012 -> "$0.00012", 1e-9 -> "<$0.000001".
export function fmtPrice(n, cur = '$') { if (n == null || isNaN(n)) return '—'; const a = Math.abs(n), neg = n < 0 ? '-' : ''; if (a === 0) return cur + '0'; if (a >= 100) return fmtMoney(n, cur);
  if (a >= 0.01) return neg + cur + a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); if (a < 1e-6) return neg + '<' + cur + '0.000001'; return neg + cur + a.toFixed(Math.min(8, 1 - Math.floor(Math.log10(a)))).replace(/0+$/, ''); }

// Signed money (7c6): sign and colour must agree, including the compact suffix. >= 1B shows compact only (full value via title/tap).
export function fmtSigned(n) { if (n == null || isNaN(n)) return '—'; const a = Math.abs(n), sg = n < 0 ? '-' : n > 0 ? '+' : ''; return sg + (a >= 1e9 ? fmtCompact(a) : '$' + Math.round(a).toLocaleString('en-US')); }
export const signCls = (n) => (n < 0 ? 'neg' : n > 0 ? 'pos' : '');
export function fmtPct(p) { if (p == null || !isFinite(p)) return ''; const a = Math.abs(p); const t = a >= 1e6 ? short(a) : a >= 100 ? Math.round(a).toLocaleString('en-US') : a >= 1 ? a.toFixed(1) : a.toFixed(2); return (p < 0 ? '-' : '+') + t + '%'; }
