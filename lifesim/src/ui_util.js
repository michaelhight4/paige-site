import { money } from './rng.js';
export { money };
export const $ = (id) => document.getElementById(id);
export const pct = (v) => `<div class="bar"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div>`;
export const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const sgn = (n) => `<span class="${n >= 0 ? 'good' : 'bad'}">${n >= 0 ? '+' : ''}${money(n)}</span>`;
export const btn = (act, label, data = '', cls = '', dis = false) => `<button class="${cls}" data-act="${act}" ${data} ${dis ? 'disabled' : ''}>${label}</button>`;
export function chart(vals, w = 300, h = 80, color = '#3b6df0') {
  if (vals.length < 2) return '<svg class="chart"></svg>';
  const mn = Math.min(...vals), mx = Math.max(...vals), r = mx - mn || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - 6 - ((v - mn) / r) * (h - 12)}`).join(' ');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline fill="none" stroke="${color}" stroke-width="2" points="${pts}"/></svg>`;
}
export function multiChart(series, w = 300, h = 90) { // [{color, vals}] on a shared 0..max scale
  const mx = Math.max(1, ...series.flatMap((s) => s.vals)), n = Math.max(...series.map((s) => s.vals.length));
  return `<svg class="chart" style="height:${h}px" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${series.map((s) => `<polyline fill="none" stroke="${s.color}" stroke-width="2" points="${s.vals.map((v, i) => `${(i / Math.max(1, n - 1)) * w},${h - 6 - (v / mx) * (h - 12)}`).join(' ')}"/>`).join('')}</svg>`;
}
