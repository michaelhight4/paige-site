// WCAG contrast of an element's text vs its first opaque background ancestor (page context)
export const contrastOf = (page, sel) => page.$eval(sel, (el) => {
  const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number); const L = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const fg = rgb(getComputedStyle(el).color); let n = el, bg = null; while (n && n.nodeType === 1) { const c = rgb(getComputedStyle(n).backgroundColor); if (c.length >= 3 && (c.length < 4 || c[3] > 0.9)) { bg = c; break; } n = n.parentElement; } bg = bg || [255, 255, 255];
  const a = L(fg), b = L(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); });
