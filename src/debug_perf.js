// ?debug=perf FPS / frame-time / memory panel (stats.js 0.17.0, MIT). Free tools pass, Oct 23, 2026.
// index.html only imports this file when the URL has debug=perf, so normal players download nothing extra.
// stats.min.js is a UMD script (sets window.Stats), so it is loaded as a classic <script>, not an ES import.
export function startPerfPanel({ doc = document, win = window } = {}) {
  return new Promise((resolve, reject) => {
    const s = doc.createElement('script');
    s.src = new URL('./vendor/stats.js/stats.min.js', import.meta.url).href;
    s.onerror = () => reject(new Error('debug_perf: stats.min.js failed to load'));
    s.onload = () => {
      const stats = new win.Stats();
      stats.showPanel(0); // 0 fps, 1 ms, 2 MB (Chrome only); click the panel to cycle
      Object.assign(stats.dom.style, { left: 'auto', right: '0px', top: '0px', zIndex: '99999', pointerEvents: 'auto' });
      stats.dom.title = 'debug=perf: click to cycle FPS / ms / MB';
      doc.body.appendChild(stats.dom);
      const loop = () => { stats.update(); win.requestAnimationFrame(loop); };
      win.requestAnimationFrame(loop);
      resolve(stats);
    };
    doc.head.appendChild(s);
  });
}

if (typeof location !== 'undefined' && /[?&]debug=perf\b/.test(location.search)) startPerfPanel().catch((e) => console.warn(e));
