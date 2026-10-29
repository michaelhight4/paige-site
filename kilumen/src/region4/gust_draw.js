// Frostspire Hall "Gust lanes" overlay theme (v6 item 6, Oct 29 2026). Draw-only: the rules stay in progression/puzzles.js.
// Ice floor, frosted stone walls, vents as grates with animated wind streaks blowing the way they push (they follow the
// bell state, so ringing a bell visibly turns the lanes), bells on posts, windbreak pillars, a glowing ring at the goal.
const DIRV = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const VENT = (c, b) => { const i = (b ? 'nesw' : '^>v<').indexOf(c); return i < 0 ? null : 'URDL'[i]; };
const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

/** Draw the whole board. ms = animation clock; pos = {x, y} (fractional while sliding). */
export function drawGustBoard(c, def, rt, ts, ms, pos) {
  const g = rt.g, b = rt.st?.b || 0, px = (n) => Math.max(1, Math.round(n * ts / 64));
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const ch = g.at(x, y), X = x * ts, Y = y * ts, h = hash(x, y);
    if (ch === '#') { // frosted stone with a snow lip on top
      c.fillStyle = '#3d4658'; c.fillRect(X, Y, ts, ts);
      c.fillStyle = '#4b566c'; c.fillRect(X + px(4), Y + px(14), ts - px(8), px(20)); c.fillRect(X + px(4 + (h % 8)), Y + px(38), ts - px(16), px(18));
      if (g.at(x, y - 1) !== '#') { c.fillStyle = '#eef5fb'; c.fillRect(X, Y, ts, px(9)); c.fillStyle = '#c9dceb'; c.fillRect(X, Y + px(9), ts, px(3)); for (let i = 0; i < 3; i++) { const ix = X + px(10 + ((h >> i) % 40)); c.fillStyle = '#bfe0f2'; c.fillRect(ix, Y + px(12), px(3), px(6 + (h >> (i + 3)) % 8)); } }
      continue;
    }
    // ice floor: pale blue with cracks and a sheen that drifts
    c.fillStyle = (x + y) % 2 ? '#cfe6f2' : '#c6e0ef'; c.fillRect(X, Y, ts, ts);
    c.fillStyle = 'rgba(255,255,255,.55)'; const sh = ((ms / 40 + x * 20 + y * 13) % 120) / 120; c.fillRect(X + Math.round(sh * ts) - px(10), Y + px(8), px(10), px(2));
    if (h % 5 === 0) { c.strokeStyle = 'rgba(120,160,190,.6)'; c.lineWidth = px(1); c.beginPath(); c.moveTo(X + px(12), Y + px(50)); c.lineTo(X + px(28), Y + px(38)); c.lineTo(X + px(40), Y + px(44)); c.stroke(); }
    c.strokeStyle = 'rgba(80,110,140,.18)'; c.lineWidth = 1; c.strokeRect(X + 0.5, Y + 0.5, ts - 1, ts - 1);
    const v = VENT(ch, b);
    if ('^>v<nesw'.includes(ch)) { // grate + wind streaks
      c.fillStyle = v ? '#56657a' : '#7c8796'; c.fillRect(X + px(10), Y + px(10), ts - px(20), ts - px(20));
      c.fillStyle = v ? '#2b3443' : '#5d6776'; for (let i = 0; i < 4; i++) c.fillRect(X + px(14), Y + px(16 + i * 9), ts - px(28), px(4));
      if (v) {
        const [dx, dy] = DIRV[v];
        c.fillStyle = 'rgba(255,255,255,.9)';
        for (let i = 0; i < 4; i++) { const f = ((ms / 420) + i / 4 + (h % 7) / 7) % 1, o = (f - 0.5) * ts, side = (i - 1.5) * px(11);
          const sx = X + ts / 2 + dx * o + (dy ? side : 0), sy = Y + ts / 2 + dy * o + (dx ? side : 0), L = px(14) * (1 - Math.abs(f - 0.5));
          c.globalAlpha = 1 - Math.abs(f - 0.5) * 1.6; c.fillRect(Math.round(sx - (dx ? L / 2 : px(1))), Math.round(sy - (dy ? L / 2 : px(1))), dx ? Math.round(L) : px(2), dy ? Math.round(L) : px(2)); }
        c.globalAlpha = 1;
        c.fillStyle = '#ffffff'; c.beginPath(); const cx = X + ts / 2 + dx * ts * 0.3, cy = Y + ts / 2 + dy * ts * 0.3; // arrow tip
        c.moveTo(cx + dx * px(8), cy + dy * px(8)); c.lineTo(cx - dy * px(7) - dx * px(4), cy + dx * px(7) - dy * px(4)); c.lineTo(cx + dy * px(7) - dx * px(4), cy - dx * px(7) - dy * px(4)); c.fill();
      }
    } else if (ch === 'B') { // bell on a post; swings for a moment after it is rung
      c.fillStyle = '#6b4a2e'; c.fillRect(X + px(28), Y + px(8), px(8), px(50)); c.fillRect(X + px(14), Y + px(10), px(36), px(6));
      const sw = rt._rung && ms - rt._rung < 900 ? Math.sin((ms - rt._rung) / 60) * (1 - (ms - rt._rung) / 900) * 0.5 : 0;
      c.save(); c.translate(X + px(32), Y + px(16)); c.rotate(sw);
      c.fillStyle = b ? '#bfe6ff' : '#e9c46a'; c.beginPath(); c.moveTo(-px(13), px(28)); c.quadraticCurveTo(-px(12), px(4), 0, px(4)); c.quadraticCurveTo(px(12), px(4), px(13), px(28)); c.fill();
      c.fillStyle = b ? '#7fb6d8' : '#b08a35'; c.fillRect(-px(14), px(26), px(28), px(4)); c.fillRect(-px(2), px(30), px(4), px(4)); c.restore();
    } else if (ch === 'X') { // windbreak pillar of packed ice
      c.fillStyle = 'rgba(40,60,90,.25)'; c.fillRect(X + px(14), Y + px(50), px(40), px(8));
      c.fillStyle = '#8fb4cf'; c.fillRect(X + px(16), Y + px(10), px(32), px(46)); c.fillStyle = '#d6ecf8'; c.fillRect(X + px(16), Y + px(6), px(32), px(8)); c.fillStyle = '#6f93ad'; c.fillRect(X + px(40), Y + px(14), px(6), px(40));
    } else if (ch === 'G') { // the Master's ring: a circle of blue fire on the ice
      const k = 0.7 + 0.3 * Math.sin(ms / 300); c.strokeStyle = `rgba(120,200,255,${k})`; c.lineWidth = px(5); c.beginPath(); c.arc(X + ts / 2, Y + ts / 2, ts * 0.34, 0, 7); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = px(2); c.beginPath(); c.arc(X + ts / 2, Y + ts / 2, ts * 0.34, 0, 7); c.stroke();
    } else if (ch === 'R') { c.fillStyle = 'rgba(140,120,210,.55)'; c.beginPath(); c.arc(X + ts / 2, Y + ts / 2, ts * 0.3, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = `bold ${Math.floor(ts * 0.4)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('↺', X + ts / 2, Y + ts / 2); }
  }
  // drifting snow across the whole hall, pushed toward the active wind
  c.fillStyle = 'rgba(255,255,255,.75)';
  for (let i = 0; i < 26; i++) { const sx = ((i * 97 + ms * (0.03 + (i % 3) * 0.015)) % (g.w * ts)), sy = ((i * 53 + ms * 0.02) % (g.h * ts)); c.fillRect(Math.round(sx), Math.round(sy), px(3), px(3)); }
  // the player: a bundled-up token, with a speed streak while sliding
  const cx = pos.x * ts + ts / 2, cy = pos.y * ts + ts / 2;
  if (pos.sliding) { c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(cx - pos.dx * ts * 0.6 - px(10), cy - px(2), px(20), px(4)); }
  c.fillStyle = 'rgba(20,40,70,.25)'; c.beginPath(); c.ellipse(cx, cy + ts * 0.28, ts * 0.26, ts * 0.08, 0, 0, 7); c.fill();
  c.fillStyle = '#c0504d'; c.beginPath(); c.arc(cx, cy, ts * 0.3, 0, 7); c.fill(); c.strokeStyle = '#1c1622'; c.lineWidth = px(3); c.stroke();
  c.fillStyle = '#f4ead2'; c.fillRect(cx - ts * 0.3, cy - px(4), ts * 0.6, px(7)); // scarf band
}
