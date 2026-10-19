// The one money formatter: thousands commas plus a short magnitude suffix for big amounts.
// fmtMoney(1250000) -> "$1,250,000 (1.25 mil)"; fmtMoney(8500) -> "$8,500"; fmtMoney(-42000) -> "-$42,000 (42K)".
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
  return (neg ? '-' : '') + cur + commas(a) + (sh ? ` (${sh})` : '');
}
// compact form for tight spots (banner, chips): "$9 mil", "$1.25 bill"; under a million it is the full number with commas
export function fmtCompact(n, cur = '$') { if (n == null || isNaN(n)) return '—'; const a = Math.abs(n), neg = n < 0; return (neg ? '-' : '') + cur + (a >= 1e6 ? short(a) : Math.round(a).toLocaleString('en-US')); }
export const plain = (n) => fmtMoney(n).replace(/^(-?)\$/, '$1');
