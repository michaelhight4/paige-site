// Boundwake illustrated scenery (Nov 5, 2026 CT) — fantasy woodland/realm window (not Lifeline suburban cottage).
// SVG scene keyed by realm + time-of-day; canvas motes/fireflies. ?ambient=0 off; reduced-motion = static.
const Q = new URLSearchParams(location.search);
const OFF = Q.get('ambient') === '0';
const PHONE = Math.min(innerWidth, innerHeight) < 600 || matchMedia('(pointer:coarse)').matches;
const CAP = PHONE ? 16 : 28, FPS = PHONE ? 24 : 30;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function timeOfDay(d = new Date()) {
  if (Q.has('tod')) return Q.get('tod');
  const h = d.getHours();
  return h < 6 || h >= 21 ? 'night' : h < 9 ? 'dawn' : h < 18 ? 'day' : 'dusk';
}

// Per-realm sky / land / accent (fantasy, not suburban Lifeline)
const REALM = {
  hearthfold: {
    sky: { dawn: ['#f0c8a8', '#d8a0b0', '#6a7ab0'], day: ['#b8dcf0', '#7ab8d8', '#4a8ab8'], dusk: ['#e8a070', '#c86888', '#4a3a70'], night: ['#2a2858', '#1a1840', '#0c0c28'] },
    land: { dawn: ['#8ab878', '#5a9060', '#3a6848'], day: ['#78b868', '#4a9850', '#2e7038'], dusk: ['#887060', '#5a4850', '#382838'], night: ['#2e3858', '#1e2840', '#121828'] },
    water: '#5a98b8', accent: '#e0b14a', feel: 'vale',
  },
  glassmarket: {
    sky: { dawn: ['#f0d0b8', '#a8c0e0', '#6880b8'], day: ['#a8d8f0', '#68b8e0', '#3888c0'], dusk: ['#e89870', '#8868a0', '#384070'], night: ['#1e2850', '#141830', '#0a0c20'] },
    land: { dawn: ['#90a090', '#687878', '#486060'], day: ['#889890', '#587070', '#385858'], dusk: ['#786868', '#504850', '#302838'], night: ['#283048', '#1a2038', '#101828'] },
    water: '#3a88c0', accent: '#c8e0f0', feel: 'coast',
  },
  thornreed: {
    sky: { dawn: ['#d8c0a0', '#889878', '#4a6058'], day: ['#a8c0a8', '#689080', '#386858'], dusk: ['#c88868', '#586848', '#283838'], night: ['#1a2820', '#101818', '#080c0c'] },
    land: { dawn: ['#4a7850', '#2e5838', '#1e4028'], day: ['#3a6840', '#285030', '#183820'], dusk: ['#3a4838', '#283028', '#181c18'], night: ['#1a2820', '#101818', '#080c10'] },
    water: '#3a6870', accent: '#88a868', feel: 'wilds',
  },
  spireward: {
    sky: { dawn: ['#e0c8e0', '#a098c8', '#6860a0'], day: ['#c0d0f0', '#8898d0', '#5868b0'], dusk: ['#d090a8', '#6860a0', '#383060'], night: ['#222048', '#161430', '#0c0a20'] },
    land: { dawn: ['#9088a0', '#686080', '#484060'], day: ['#7880a0', '#586080', '#384060'], dusk: ['#685868', '#484050', '#302838'], night: ['#282840', '#1a1a30', '#101020'] },
    water: '#6878a8', accent: '#c8b8e8', feel: 'heights',
  },
  emberlight: {
    sky: { dawn: ['#f0b890', '#d07060', '#685070'], day: ['#e0c090', '#c88860', '#886048'], dusk: ['#e07040', '#883848', '#402030'], night: ['#301820', '#200c18', '#100810'] },
    land: { dawn: ['#a07050', '#785038', '#503028'], day: ['#987050', '#705038', '#483028'], dusk: ['#784030', '#502828', '#301818'], night: ['#302028', '#201018', '#100810'] },
    water: '#886050', accent: '#e07040', feel: 'marches',
  },
};
const FALLBACK = 'hearthfold';

function hills(c, w, y0 = 0.62) {
  return `<path d="M0 ${w * (y0 + 0.08)} Q ${w * 0.22} ${w * (y0 - 0.06)} ${w * 0.48} ${w * (y0 + 0.04)} T ${w} ${w * y0} V ${w * 1.4} H0Z" fill="${c[0]}"/>`
    + `<path d="M0 ${w * (y0 + 0.18)} Q ${w * 0.3} ${w * (y0 + 0.08)} ${w * 0.6} ${w * (y0 + 0.16)} T ${w} ${w * (y0 + 0.14)} V ${w * 1.4} H0Z" fill="${c[1]}"/>`
    + `<path d="M0 ${w * (y0 + 0.3)} Q ${w * 0.4} ${w * (y0 + 0.22)} ${w} ${w * (y0 + 0.28)} V ${w * 1.4} H0Z" fill="${c[2]}"/>`;
}
function peaks(c, w) {
  let s = '';
  const pts = [[0.05, 0.55], [0.22, 0.38], [0.4, 0.5], [0.58, 0.32], [0.75, 0.48], [0.92, 0.4]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const mid = (x0 + x1) / 2, tip = Math.min(y0, y1) - 0.08 - (i % 2) * 0.04;
    s += `<path d="M${w * x0} ${w * 0.72} L${w * mid} ${w * tip} L${w * x1} ${w * 0.72}Z" fill="${c[i % 2]}"/>`;
  }
  return s + `<rect y="${w * 0.7}" width="${w}" height="${w}" fill="${c[2]}"/>`;
}
function trees(c, w, n = 10, yBase = 0.7) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = ((i * 137 + 40) % (w - 40)) + 20;
    const r = w * (0.035 + (i % 4) * 0.012);
    const y = w * (yBase + (i % 3) * 0.025);
    s += `<rect x="${x - 3}" y="${y}" width="6" height="${r * 0.9}" fill="#1a120866"/>`
      + `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.15}" fill="${c[i % 2]}"/>`
      + `<ellipse cx="${x - r * 0.25}" cy="${y - r * 0.35}" rx="${r * 0.4}" ry="${r * 0.35}" fill="#ffffff14"/>`;
  }
  return s;
}
function oak(w, xFrac, yFrac, scale, canopy, trunk) {
  const x = w * xFrac, y = w * yFrac, s = w * scale;
  return `<g class="bw-oak">`
    + `<rect x="${x - s * 0.08}" y="${y}" width="${s * 0.16}" height="${s * 0.55}" rx="${s * 0.04}" fill="${trunk}"/>`
    + `<ellipse cx="${x}" cy="${y - s * 0.05}" rx="${s * 0.55}" ry="${s * 0.42}" fill="${canopy}"/>`
    + `<ellipse cx="${x - s * 0.28}" cy="${y + s * 0.08}" rx="${s * 0.32}" ry="${s * 0.28}" fill="${canopy}"/>`
    + `<ellipse cx="${x + s * 0.3}" cy="${y + s * 0.1}" rx="${s * 0.34}" ry="${s * 0.3}" fill="${canopy}"/>`
    + `<ellipse cx="${x - s * 0.12}" cy="${y - s * 0.22}" rx="${s * 0.22}" ry="${s * 0.18}" fill="#ffffff18"/>`
    + `</g>`;
}
function ferns(w, land) {
  let s = '';
  for (let i = 0; i < 9; i++) {
    const x = w * (0.08 + i * 0.1), y = w * (0.78 + (i % 3) * 0.02);
    s += `<path d="M${x} ${y} q ${w * 0.02} -${w * 0.04} ${w * 0.04} -${w * 0.01} q -${w * 0.015} ${w * 0.01} -${w * 0.04} ${w * 0.01}Z" fill="${land[i % 2]}" opacity=".85"/>`;
  }
  return s;
}
function pathThroughWoods(w, lit) {
  const fill = lit ? '#3a302888' : '#c8b89055';
  return `<path class="bw-path" d="M${w * 0.42} ${w * 0.92} Q ${w * 0.48} ${w * 0.82} ${w * 0.44} ${w * 0.74} Q ${w * 0.4} ${w * 0.66} ${w * 0.48} ${w * 0.6}" fill="none" stroke="${fill}" stroke-width="${w * 0.045}" stroke-linecap="round"/>`
    + `<path d="M${w * 0.42} ${w * 0.92} Q ${w * 0.48} ${w * 0.82} ${w * 0.44} ${w * 0.74} Q ${w * 0.4} ${w * 0.66} ${w * 0.48} ${w * 0.6}" fill="none" stroke="#ffffff18" stroke-width="${w * 0.012}" stroke-linecap="round"/>`;
}
function glowingGrove(w, accent, lit) {
  const cx = w * 0.52, cy = w * 0.62;
  return `<g class="bw-grove">`
    + `<ellipse cx="${cx}" cy="${cy + w * 0.04}" rx="${w * 0.14}" ry="${w * 0.04}" fill="${accent}" opacity="${lit ? 0.35 : 0.18}"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${w * 0.035}" fill="${accent}" opacity="${lit ? 0.85 : 0.45}" class="bw-grove-heart"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${w * 0.07}" fill="${accent}" opacity="${lit ? 0.22 : 0.1}"/>`
    + `</g>`;
}
function valeHills(c, w) {
  /* Deeper enclosed woodland bowl — not Lifeline's two rolling suburban hills */
  return `<path d="M0 ${w * 0.55} Q ${w * 0.18} ${w * 0.42} ${w * 0.38} ${w * 0.5} Q ${w * 0.55} ${w * 0.58} ${w * 0.72} ${w * 0.46} T ${w} ${w * 0.52} V ${w * 1.4} H0Z" fill="${c[0]}"/>`
    + `<path d="M0 ${w * 0.68} Q ${w * 0.25} ${w * 0.58} ${w * 0.5} ${w * 0.66} Q ${w * 0.72} ${w * 0.74} ${w} ${w * 0.64} V ${w * 1.4} H0Z" fill="${c[1]}"/>`
    + `<path d="M0 ${w * 0.82} Q ${w * 0.4} ${w * 0.76} ${w} ${w * 0.8} V ${w * 1.4} H0Z" fill="${c[2]}"/>`;
}
function treeline(c, w, yBase = 0.5) {
  let s = '';
  for (let i = 0; i < 18; i++) {
    const x = w * (0.02 + i * 0.055), h = w * (0.04 + (i % 5) * 0.012), r = w * (0.028 + (i % 3) * 0.01);
    s += `<rect x="${x - 2}" y="${w * yBase}" width="4" height="${h}" fill="#1a120855"/>`
      + `<ellipse cx="${x}" cy="${w * yBase}" rx="${r}" ry="${r * 1.2}" fill="${c[i % 2]}" opacity=".9"/>`;
  }
  return s;
}
function mistBank(x, y, s) {
  return `<g class="bw-cloud bw-mist" fill="#e8f0e8" opacity=".35"><ellipse cx="${x}" cy="${y}" rx="${50 * s}" ry="${10 * s}"/><ellipse cx="${x + 28 * s}" cy="${y - 4 * s}" rx="${30 * s}" ry="${12 * s}"/></g>`;
}
function pond(w, water) {
  return `<ellipse class="bw-pond" cx="${w * 0.22}" cy="${w * 0.76}" rx="${w * 0.11}" ry="${w * 0.032}" fill="${water}" opacity=".8"/>`
    + `<ellipse cx="${w * 0.2}" cy="${w * 0.755}" rx="${w * 0.04}" ry="${w * 0.008}" fill="#ffffff28"/>`;
}
function coast(w, land, water, lit) {
  let boats = '';
  for (let i = 0; i < 3; i++) {
    const x = w * (0.15 + i * 0.22), y = w * 0.72;
    boats += `<g class="bw-boat" style="--d:${i * 1.2}s"><path d="M${x} ${y} l${w * 0.08} 0 l-${w * 0.02} ${w * 0.025} h-${w * 0.04}Z" fill="#3a2a20"/>`
      + `<path d="M${x + w * 0.04} ${y} v-${w * 0.06} l${w * 0.05} ${w * 0.04}Z" fill="${lit ? '#f0e0c0' : '#d8c8a8'}"/></g>`;
  }
  return `<path d="M0 ${w * 0.7} Q ${w * 0.3} ${w * 0.66} ${w * 0.55} ${w * 0.72} T ${w} ${w * 0.68} V ${w} H0Z" fill="${land[1]}"/>`
    + `<path class="bw-wave" d="M0 ${w * 0.76} Q ${w * 0.25} ${w * 0.74} ${w * 0.5} ${w * 0.78} T ${w} ${w * 0.76} V ${w} H0Z" fill="${water}"/>`
    + boats;
}
function stones(w, c) {
  let s = '';
  for (let i = 0; i < 5; i++) {
    const x = w * (0.15 + i * 0.16), h = w * (0.06 + (i % 3) * 0.03);
    s += `<rect x="${x}" y="${w * 0.68 - h}" width="${w * 0.035}" height="${h}" rx="3" fill="${c[i % 2]}" opacity=".9"/>`;
  }
  return s;
}
function fort(w, land, accent, lit) {
  const x = w * 0.62, y = w * 0.52;
  return `<g><rect x="${x}" y="${y}" width="${w * 0.22}" height="${w * 0.18}" fill="${land[1]}"/>`
    + `<rect x="${x - w * 0.03}" y="${y - w * 0.08}" width="${w * 0.06}" height="${w * 0.26}" fill="${land[0]}"/>`
    + `<rect x="${x + w * 0.19}" y="${y - w * 0.08}" width="${w * 0.06}" height="${w * 0.26}" fill="${land[0]}"/>`
    + `<rect x="${x + w * 0.08}" y="${y + w * 0.05}" width="${w * 0.05}" height="${w * 0.08}" fill="${lit ? '#ffc060' : '#2a1810'}"/>`
    + `<circle cx="${x + w * 0.25}" cy="${y - w * 0.1}" r="4" fill="${accent}" opacity=".9"/></g>`;
}
function spires(w, land, accent) {
  let s = '';
  for (let i = 0; i < 4; i++) {
    const x = w * (0.2 + i * 0.18), h = w * (0.18 + (i % 2) * 0.08);
    s += `<rect x="${x}" y="${w * 0.7 - h}" width="${w * 0.05}" height="${h}" fill="${land[i % 2]}"/>`
      + `<path d="M${x - 4} ${w * 0.7 - h} L${x + w * 0.025} ${w * 0.7 - h - w * 0.05} L${x + w * 0.05 + 4} ${w * 0.7 - h}Z" fill="${accent}" opacity=".7"/>`;
  }
  return s;
}
function stars(w) {
  let s = '';
  for (let i = 0; i < 36; i++) s += `<circle cx="${(i * 97) % w}" cy="${(i * 53) % (w * 0.5)}" r="${i % 4 ? 1 : 1.7}" fill="#fff" opacity="${0.3 + (i % 3) * 0.18}"/>`;
  return s;
}
function cloud(x, y, s) {
  return `<g class="bw-cloud" fill="#fff" opacity=".7"><ellipse cx="${x}" cy="${y}" rx="${38 * s}" ry="${13 * s}"/><ellipse cx="${x + 18 * s}" cy="${y - 9 * s}" rx="${22 * s}" ry="${14 * s}"/><ellipse cx="${x - 16 * s}" cy="${y - 4 * s}" rx="${16 * s}" ry="${10 * s}"/></g>`;
}
function birds(w) {
  return `<g class="bw-birds" fill="none" stroke="#1a122688" stroke-width="1.6" stroke-linecap="round">`
    + `<path d="M${w * 0.2} ${w * 0.22} q 8 -6 16 0"/><path d="M${w * 0.28} ${w * 0.18} q 6 -5 12 0"/>`
    + `<path d="M${w * 0.55} ${w * 0.15} q 7 -5 14 0"/></g>`;
}

export function sceneSVG(realmId = 'hearthfold', tod = 'day') {
  const R = REALM[realmId] || REALM[FALLBACK];
  const W = 600, H = 1100, sky = R.sky[tod] || R.sky.day, land = R.land[tod] || R.land.day;
  const lit = tod === 'night' || tod === 'dusk';
  /* Orb left-of-center — not Lifeline's upper-right sun + house framing */
  const orb = tod === 'night'
    ? `<circle class="bw-orb" cx="${W * 0.22}" cy="${W * 0.18}" r="20" fill="#fff6d8"/><circle cx="${W * 0.24}" cy="${W * 0.16}" r="18" fill="${sky[1]}"/>`
    : `<circle class="bw-orb" cx="${W * 0.28}" cy="${W * 0.2}" r="52" fill="#fff4"/><circle cx="${W * 0.28}" cy="${W * 0.2}" r="26" fill="${tod === 'day' ? '#fff4b8' : '#ffd08a'}"/>`;
  let mid = '';
  if (R.feel === 'coast') mid = hills(land, W, 0.58) + coast(W, land, R.water, lit);
  else if (R.feel === 'wilds') mid = hills(land, W, 0.6) + trees([land[0], land[1]], W, 14, 0.66) + stones(W, land);
  else if (R.feel === 'heights') mid = peaks(land, W) + spires(W, land, R.accent) + trees([land[1], land[2]], W, 5, 0.72);
  else if (R.feel === 'marches') mid = hills(land, W, 0.6) + fort(W, land, R.accent, lit) + trees([land[1], land[2]], W, 4, 0.72);
  else {
    /* Hearthfold: woodland vale — canopy on the crest (visible in HUD peek), clearing below (no cottage) */
    const canopy = [land[0], land[1]];
    const trunk = '#2a1c14aa';
    mid = valeHills(land, W)
      + treeline(canopy, W, 0.44)
      + trees(canopy, W, 16, 0.48)
      + oak(W, 0.12, 0.52, 0.28, land[0], trunk)
      + oak(W, 0.88, 0.5, 0.32, land[1], trunk)
      + oak(W, 0.55, 0.56, 0.2, land[0], trunk)
      + oak(W, 0.35, 0.58, 0.16, land[1], trunk)
      + glowingGrove(W, R.accent, lit)
      + stones(W, ['#6a6870', '#4a4850'])
      + pathThroughWoods(W, lit)
      + pond(W, R.water)
      + ferns(W, land)
      + trees([land[1], land[2]], W, 8, 0.7);
  }

  const skyStuff = tod === 'night' ? stars(W)
    : mistBank(W * 0.62, 95, 1.2) + cloud(W * 0.12, 130, 0.7) + mistBank(W * 0.4, 55, 0.85);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
    <defs>
      <linearGradient id="bwSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${sky[2]}"/><stop offset=".22" stop-color="${sky[1]}"/><stop offset=".38" stop-color="${sky[0]}"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bwSky)"/>
    ${skyStuff}
    ${orb}
    ${tod === 'day' || tod === 'dawn' ? birds(W) : ''}
    <g transform="translate(0 -200)">${mid}</g>
    <rect y="${W * 0.48}" width="${W}" height="${H}" fill="${land[2]}"/>
  </svg>`;
}

let root, artHost, canvas, ctx, parts = [], last = 0, raf = 0, key = '';

function seed() {
  if (!canvas) return;
  const W = canvas.width, H = canvas.height, night = timeOfDay() === 'night';
  parts = Array.from({ length: CAP }, (_, i) => ({
    x: Math.random() * W, y: Math.random() * H,
    r: (night ? 1.5 : 1.05) + Math.random() * 2,
    vx: (Math.random() - 0.5) * 0.22, vy: -0.1 - Math.random() * 0.28,
    p: Math.random() * 6.28,
    c: night ? '255,220,130' : (i % 3 ? '255,245,210' : '224,177,74'),
  }));
}
function frame(t) {
  raf = requestAnimationFrame(frame);
  if (t - last < 1000 / FPS) return;
  last = t;
  if (!ctx || document.hidden) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  for (const q of parts) {
    q.x += q.vx; q.y += q.vy; q.p += 0.03;
    if (q.y < -8) { q.y = H + 8; q.x = Math.random() * W; }
    if (q.x < -8) q.x = W + 8;
    if (q.x > W + 8) q.x = -8;
    const a = 0.22 + 0.32 * (0.5 + 0.5 * Math.sin(q.p));
    ctx.fillStyle = `rgba(${q.c},${a * 0.3})`;
    ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 2.8, 0, 6.3); ctx.fill();
    ctx.fillStyle = `rgba(${q.c},${a})`;
    ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.3); ctx.fill();
  }
}
function size() {
  if (!canvas) return;
  const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.max(1, (r.width * d) | 0);
  canvas.height = Math.max(1, (r.height * d) | 0);
  seed();
}
function startFx() { if (raf || reduced() || OFF) return; raf = requestAnimationFrame(frame); }
function stopFx() { cancelAnimationFrame(raf); raf = 0; if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height); }

export function paintAmbient(realmId, tab) {
  if (OFF || !artHost) return;
  const tod = timeOfDay();
  const realm = realmId || FALLBACK;
  const k = `${realm}|${tod}|${tab || ''}`;
  document.documentElement.dataset.tod = tod;
  document.documentElement.dataset.realm = realm;
  if (key === k) return;
  key = k;
  const next = document.createElement('div');
  next.className = 'bw-amb-art';
  next.innerHTML = sceneSVG(realm, tod);
  artHost.prepend(next);
  requestAnimationFrame(() => next.classList.add('on'));
  [...artHost.querySelectorAll('.bw-amb-art')].slice(1).forEach((o) => {
    o.classList.remove('on');
    setTimeout(() => o.remove(), 650);
  });
}

export function mountAmbient(opts = {}) {
  if (OFF) return { paint: () => {}, stop: () => {}, start: () => {} };
  document.documentElement.classList.add('bw-amb');
  root = document.getElementById('bw-amb');
  if (!root) {
    root = document.createElement('div');
    root.id = 'bw-amb';
    root.setAttribute('aria-hidden', 'true');
    document.body.prepend(root);
  }
  artHost = root.querySelector('.bw-amb-arts') || (() => {
    const d = document.createElement('div'); d.className = 'bw-amb-arts'; root.append(d); return d;
  })();
  canvas = document.getElementById('motes') || (() => {
    const c = document.createElement('canvas'); c.id = 'motes'; c.setAttribute('aria-hidden', 'true'); root.append(c); return c;
  })();
  if (canvas.parentElement !== root) root.append(canvas);
  ctx = canvas.getContext('2d');
  paintAmbient(opts.realm || FALLBACK, opts.tab || 'life');
  size(); startFx();
  addEventListener('resize', size);
  document.addEventListener('visibilitychange', () => (document.hidden ? stopFx() : startFx()));
  setInterval(() => paintAmbient(document.documentElement.dataset.realm || FALLBACK, document.body.dataset.tab), 60000);
  window.__bwAmbient = { paint: paintAmbient, stop: stopFx, start: startFx, cap: CAP };
  return window.__bwAmbient;
}
