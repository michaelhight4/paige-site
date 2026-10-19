// The one money formatter: thousands commas plus a short magnitude suffix (K, mil, bill, trill) for big amounts.
// fmtMoney(1250000) -> "$1,250,000 (1.25 mil)"; fmtMoney(8500) -> "$8,500"; fmtMoney(-42000) -> "-$42,000 (42K)".
const trim = (x) => String(+x.toFixed(2));
export function short(n) {
  const a = Math.abs(n);
  if (a >= 1e12) return trim(a / 1e12) + ' trill'; if (a >= 1e9) return trim(a / 1e9) + ' bill'; if (a >= 1e6) return trim(a / 1e6) + ' mil';
  if (a >= 1e4) return trim(a / 1e3) + 'K'; return '';
}
export function fmtMoney(n, cur = '$') {
  if (n == null || isNaN(n)) return '—'; const r = Math.round(n), a = Math.abs(r), sh = short(a);
  return (r < 0 ? '-' : '') + cur + a.toLocaleString('en-US') + (sh ? ` (${sh})` : '');
}
export const plain = (n) => fmtMoney(n).replace(/^(-?)\$/, '$1');
