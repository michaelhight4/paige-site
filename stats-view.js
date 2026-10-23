// Shared Site stats renderer (stats.html + admin.html 'Site stats' tab). Pure DOM string building; data from admin_site_stats.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Number(n || 0).toLocaleString('en-US');
function bars(rows, label, val, emptyText) {
  if (!rows.length) return '<p class="empty">' + emptyText + '</p>';
  const max = Math.max(...rows.map((r) => r[val]), 1);
  return '<ul class="bars">' + rows.map((r) => '<li><span class="lb">' + esc(r[label]) + '</span><span class="n">' + fmt(r[val]) + '</span><span class="tr" aria-hidden="true"><i style="width:' + Math.max(2, (r[val] / max) * 100).toFixed(1) + '%"></i></span></li>').join('') + '</ul>';
}
// Multi-series line chart. series = [[key, label, color, dashed]].
function line(days, series, title) {
  const W = 640, H = 220, P = 30, n = days.length, max = Math.max(1, ...days.flatMap((d) => series.map((s) => d[s[0]] || 0)));
  const x = (i) => P + (n < 2 ? 0 : (i * (W - P * 2)) / (n - 1)), y = (v) => H - P - (v / max) * (H - P * 2);
  const path = (k) => days.map((d, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(d[k] || 0).toFixed(1)).join(' ');
  const grid = [0, 0.5, 1].map((f) => { const v = Math.round(max * f); return '<line x1="' + P + '" x2="' + (W - P) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="rgba(140,160,255,.18)"/><text x="' + (P - 6) + '" y="' + (y(v) + 4) + '" fill="#b5bbdb" font-size="11" text-anchor="end">' + v + '</text>'; }).join('');
  const lab = n ? [0, n - 1].map((i) => '<text x="' + x(i) + '" y="' + (H - 8) + '" fill="#b5bbdb" font-size="11" text-anchor="' + (i ? 'end' : 'start') + '">' + esc(days[i].day.slice(5)) + '</text>').join('') : '';
  const sums = series.map((s) => s[1] + ' ' + fmt(days.reduce((a, d) => a + (d[s[0]] || 0), 0)));
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(title + ' over ' + n + ' days: ' + sums.join(', ') + '; peak ' + fmt(max) + ' in a day') + '">' + grid + lab +
    (n ? '<path d="' + path(series[0][0]) + ' L' + x(n - 1) + ' ' + (H - P) + ' L' + x(0) + ' ' + (H - P) + 'Z" fill="rgba(122,162,255,.12)"/>' : '') +
    series.map((s, i) => '<path d="' + path(s[0]) + '" fill="none" stroke="' + s[2] + '" stroke-width="' + (i ? 2 : 3) + '"' + (s[3] ? ' stroke-dasharray="5 4"' : '') + ' stroke-linejoin="round"/>').join('') + '</svg>' +
    '<p class="legend">' + series.map((s) => '<span><i style="background:' + s[2] + '"></i>' + s[1] + '</span>').join('') + '</p>';
}
const TYPES = { page_view: 'Page / tab views', play: 'Game Play clicks', listen: 'Song Listen now', webtoon_open: 'Webtoon opens', gift_claim: 'Gift claims', wallet_open: 'Wallet opens', store_open: 'Store opens', social_out: 'Social link clicks' };
const card = (c) => '<div class="sc"><b>' + fmt(c[1]) + '</b><span>' + c[0] + '</span>' + (c[2] ? '<small>' + c[2] + '</small>' : '') + '</div>';
export function render(out, s) {
  const a = s.accounts || {}, dv = s.devices || {}, dt = Object.values(dv).reduce((x, y) => x + y, 0) || 1, it = s.interactions || {}, pd = s.per_day || [];
  const test = s.example || (s.sources || []).some((r) => /^test/.test(r.source)) ? '<p class="testnote">TEST / EXAMPLE DATA: sample numbers, not real traffic.</p>' : '';
  const legacy = s.legacy_visits ?? s.visits ?? 0;
  out.innerHTML = test + '<div class="cards">' +
    [['Daily visitors', s.daily_visitors, 'each visitor once per day'], ['Unique visitors', s.unique_visitors, 'distinct over the range'], ['Interactions', it.total, 'counted separately'],
     ['Sign-ups', s.signups, fmt(a.registered_in_range) + ' new accounts (auth)'], ['Logins', s.logins, fmt(a.signed_in_in_range) + ' accounts signed in'], ['Total accounts', a.registered, fmt(a.guests) + ' guests · ' + fmt(a.total) + ' total']]
      .map(card).join('') + '</div>' +
    '<div class="box chart" style="margin-bottom:12px"><h2>Daily visitors</h2>' + line(pd, [['daily_visitors', 'Visitors (once per day each)', '#7aa2ff']], 'Daily visitors') + '</div>' +
    '<h2 class="sec" id="interactions">Interactions</h2>' +
    '<div class="box chart" style="margin-bottom:12px"><h2>Interactions per day</h2>' + line(pd, [['interactions', 'Interactions', '#4fe3c1']], 'Interactions per day') + '</div>' +
    '<div class="grid2"><div class="box"><h2>Interactions by type</h2>' + bars((it.by_type || []).map((r) => ({ l: TYPES[r.type] || r.type, n: r.n })), 'l', 'n', 'No interactions yet.') + '</div>' +
    '<div class="box"><h2>Top targets</h2>' + bars((it.top_targets || []).map((r) => ({ l: (TYPES[r.type] || r.type) + ' · ' + r.target, n: r.n })), 'l', 'n', 'No interactions yet.') + '</div>' +
    '<div class="box"><h2>Top pages (views)</h2>' + bars((s.pages || []).map((r) => ({ path: r.path, n: r.views ?? r.visits })), 'path', 'n', 'No page views yet.') + '</div>' +
    '<div class="box"><h2>Visitors by source</h2>' + bars((s.sources || []).map((r) => ({ source: r.source, n: r.visitors })), 'source', 'n', 'No visitors yet.') + '</div>' +
    '<div class="box"><h2>Sign-ups by source</h2>' + bars(s.signup_sources || [], 'source', 'signups', 'No sign-ups yet.') + '</div>' +
    '<div class="box"><h2>Devices (daily visitors)</h2>' + bars(['phone', 'desktop', 'tablet'].map((k) => ({ d: k[0].toUpperCase() + k.slice(1) + ' · ' + Math.round(((dv[k] || 0) / dt) * 100) + '%', n: dv[k] || 0 })), 'd', 'n', '') + '</div></div>' +
    (legacy ? '<div class="box chart" style="margin-top:12px"><h2>Legacy visits</h2><p class="empty">Old counting (before the daily-visitor change): one per page per 30 min. Kept for history, not comparable. ' + fmt(legacy) + ' in range.</p>' + line(pd, [['legacy_visits', 'Legacy visits', '#f0c45c', true]], 'Legacy visits') + '</div>' : '');
}
export { esc, fmt };
