// Ambient "relight" layer (dev/ui-modern, Oct 30 2026): illustrated backdrop per area + time of day, soft glows,
// and a light pooled particle canvas (motes by day, fireflies at night). ?ambient=0 turns it off; reduced motion = no particles.
const Q = new URLSearchParams(location.search);
const OFF = Q.get('ambient') === '0';
const PHONE = Math.min(innerWidth, innerHeight) < 600 || matchMedia('(pointer:coarse)').matches;
const CAP = PHONE ? 16 : 32, FPS = PHONE ? 24 : 30;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || ['off', 'reduced'].includes(document.documentElement.dataset.motion);
export function timeOfDay(d = new Date()) { const h = Q.has('tod') ? null : d.getHours(); if (Q.has('tod')) return Q.get('tod'); return h < 6 || h >= 21 ? 'night' : h < 9 ? 'dawn' : h < 18 ? 'day' : 'dusk'; }
const SKY = { dawn: ['#ffd9b8', '#f7a9a8', '#9db8e8'], day: ['#bfe6ff', '#8fd0f5', '#5aa9e6'], dusk: ['#ffb36b', '#e8738a', '#5b4b8a'], night: ['#2b3266', '#1a1f45', '#0d1030'] };
const LAND = { dawn: ['#9cc59a', '#6fa37b', '#4f7f63'], day: ['#a8d88e', '#78bf6e', '#4f9a5c'], dusk: ['#a77d8f', '#7a5a7d', '#4c3a62'], night: ['#34406b', '#262f55', '#1a2042'] };
function hills(c, w) { return `<path d="M0 ${w*.70} Q ${w*.25} ${w*.58} ${w*.5} ${w*.68} T ${w} ${w*.62} V ${w} H0Z" fill="${c[0]}"/><path d="M0 ${w*.80} Q ${w*.3} ${w*.70} ${w*.62} ${w*.80} T ${w} ${w*.76} V ${w} H0Z" fill="${c[1]}"/><path d="M0 ${w*.9} Q ${w*.4} ${w*.82} ${w} ${w*.9} V ${w} H0Z" fill="${c[2]}"/>`; }
function skyline(c, w, lit) { let s = '', x = 0, i = 0; const hs = [.38, .5, .3, .58, .44, .34, .52, .4, .28, .47]; while (x < w) { const bw = w * (.07 + (i % 3) * .025), bh = w * hs[i % hs.length] * .55; s += `<rect x="${x}" y="${w*.78-bh}" width="${bw-3}" height="${bh+w}" rx="3" fill="${c[i%2]}"/>`; for (let wy = w*.78-bh+8; wy < w*.76; wy += 14) for (let wx = x+6; wx < x+bw-10; wx += 11) if ((wx*7+wy*3+i)%5 < 2) s += `<rect x="${wx}" y="${wy}" width="5" height="7" rx="1" fill="${lit ? '#ffe39a' : '#ffffff55'}"/>`; x += bw; i++; } return s + `<rect y="${w*.78}" width="${w}" height="${w}" fill="${c[2]}"/>`; }
function trees(c, w) { let s = ''; for (let i = 0; i < 9; i++) { const x = (i * 137) % w, r = w * (.05 + (i % 3) * .02), y = w * (.74 + (i % 2) * .05); s += `<rect x="${x-3}" y="${y}" width="6" height="${r}" fill="#00000033"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c[i%2]}"/><circle cx="${x-r*.3}" cy="${y-r*.3}" r="${r*.45}" fill="#ffffff1a"/>`; } return s; }
function house(w, lit) { const x = w * .62, y = w * .6; return `<g><rect x="${x}" y="${y}" width="${w*.16}" height="${w*.11}" rx="3" fill="#f3e2c7"/><path d="M${x-8} ${y} L${x+w*.08} ${y-w*.08} L${x+w*.16+8} ${y}Z" fill="#c4614a"/><rect x="${x+w*.03}" y="${y+w*.03}" width="${w*.035}" height="${w*.035}" rx="2" fill="${lit?'#ffd36b':'#8fc6e8'}"/><rect x="${x+w*.1}" y="${y+w*.045}" width="${w*.03}" height="${w*.065}" rx="2" fill="#7a4b33"/></g>`; }
function stars(w) { let s = ''; for (let i = 0; i < 40; i++) s += `<circle cx="${(i*97)%w}" cy="${(i*53)%(w*.55)}" r="${i%4?1:1.8}" fill="#fff" opacity="${.35+(i%3)*.2}"/>`; return s; }
export function sceneSVG(area = 'life', tod = 'day') {
  const W = 600, sky = SKY[tod] || SKY.day, land = LAND[tod] || LAND.day, lit = tod === 'night' || tod === 'dusk';
  const orb = tod === 'night' ? `<circle cx="${W*.78}" cy="${W*.16}" r="26" fill="#fff6d8"/><circle cx="${W*.79+9}" cy="${W*.16-6}" r="24" fill="${sky[1]}"/>` : `<circle cx="${W*.78}" cy="${W*.2}" r="70" fill="#fff4" /><circle cx="${W*.78}" cy="${W*.2}" r="34" fill="${tod==='day'?'#fff7c2':'#ffd28a'}"/>`;
  const cloud = (x, y, s) => `<g opacity=".75" fill="#fff"><ellipse cx="${x}" cy="${y}" rx="${40*s}" ry="${14*s}"/><ellipse cx="${x+20*s}" cy="${y-10*s}" rx="${24*s}" ry="${16*s}"/></g>`;
  let mid = '';
  if (area === 'occupation' || area === 'assets') mid = skyline([land[1], land[2], land[2]], W, lit);
  else if (area === 'relationships') mid = hills(land, W) + trees(['#3f8a5a', '#5aa86c'].map((c) => lit ? '#2b3a5c' : c), W);
  else if (area === 'store') mid = hills(['#7d4bb3', '#5e3593', '#3f2370'], W);
  else mid = hills(land, W) + house(W, lit);
  const T = -140, H = 1000; // tall layout: horizon sits in the top ~20% window above the journal
  const orb2 = orb.replace(/cy="([\d.]+)"/g, (m, v) => `cy="${(+v * .7).toFixed(1)}"`).replace(/cx="([\d.]+)"/g, (m, v) => `cx="${(+v * .78).toFixed(1)}"`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin slice"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[2]}"/><stop offset=".2" stop-color="${sky[1]}"/><stop offset=".32" stop-color="${sky[0]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>${tod==='night'||area==='store'?stars(W).replace(/cy="([\d.]+)"/g,(m,v)=>`cy="${(+v*.5).toFixed(1)}"`):''}${orb2}${tod!=='night'?cloud(W*.2,60,1)+cloud(W*.55,120,.7):''}<g transform="translate(0 ${T})">${mid}</g><rect y="${W+T-2}" width="${W}" height="${H}" fill="${area==='store'?'#3f2370':(area==='occupation'||area==='assets')?land[2]:land[2]}"/></svg>`;
}
let layer, canvas, ctx, parts = [], last = 0, raf = 0;
function paint() { if (!layer) return; const area = document.documentElement.dataset.area || 'life', tod = timeOfDay(); const key = area + tod; document.documentElement.dataset.tod = tod; if (layer.dataset.key === key) return; layer.dataset.key = key; const next = document.createElement('div'); next.className = 'amb-art'; next.innerHTML = sceneSVG(area, tod); layer.prepend(next); requestAnimationFrame(() => next.classList.add('on')); [...layer.querySelectorAll('.amb-art')].slice(1).forEach((o) => { o.classList.remove('on'); setTimeout(() => o.remove(), 700); }); }
function seed() { const W = canvas.width, H = canvas.height, night = timeOfDay() === 'night'; parts = Array.from({ length: CAP }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, r: (night ? 1.6 : 1.1) + Math.random() * 2.2, vx: (Math.random() - .5) * .25, vy: -.12 - Math.random() * .3, p: Math.random() * 6.28, c: night ? '255,236,140' : i % 4 ? '255,255,255' : '255,214,120' })); }
function frame(t) { raf = requestAnimationFrame(frame); if (t - last < 1000 / FPS) return; last = t; const W = canvas.width, H = canvas.height; ctx.clearRect(0, 0, W, H); for (const q of parts) { q.x += q.vx; q.y += q.vy; q.p += .03; if (q.y < -6) { q.y = H + 6; q.x = Math.random() * W; } if (q.x < -6) q.x = W + 6; if (q.x > W + 6) q.x = -6; const a = .25 + .35 * (.5 + .5 * Math.sin(q.p)); ctx.fillStyle = `rgba(${q.c},${a * .35})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 3, 0, 6.29); ctx.fill(); ctx.fillStyle = `rgba(${q.c},${a})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.29); ctx.fill(); } }
function size() { const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 1.5); canvas.width = Math.max(1, r.width * d | 0); canvas.height = Math.max(1, r.height * d | 0); seed(); }
function start() { if (raf || reduced()) return; raf = requestAnimationFrame(frame); }
function stop() { cancelAnimationFrame(raf); raf = 0; ctx && ctx.clearRect(0, 0, canvas.width, canvas.height); }
export function mountAmbient(root = document.getElementById('app')) {
  if (OFF || !root || layer) return; document.documentElement.classList.add('amb');
  layer = document.createElement('div'); layer.className = 'amb-layer'; layer.setAttribute('aria-hidden', 'true');
  canvas = document.createElement('canvas'); canvas.className = 'amb-fx'; ctx = canvas.getContext('2d'); layer.append(canvas); root.prepend(layer);
  paint(); size(); start();
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-area'] });
  new MutationObserver(() => reduced() ? stop() : start()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  setInterval(paint, 60000); addEventListener('resize', size);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  window.__ambient = { stop, start, parts: () => parts.length, cap: CAP };
}
