// Capture sequence (Oct 22, 2026; Gary 11:05 PM CT, SOUL_PLAYBOOK 5.3, MECHANICS_PARITY item 5 / B17).
// No throw, nothing summoned at the foe's feet: the trainer (back view, near side) slides in and HOLDS the dominance
// crystal up; a violet rune beam reaches the foe; the foe dissolves into light that streams into the held crystal;
// the crystal pulses in the trainer's hands 1-4 times (by catch odds) while the rune ring closes. Caught: the runes
// lock and the crystal blooms into facets with a Warmth ring + the original 'catch' chime (no click, no stars, no
// band, no shakes). Break-out: the runes break, the light bursts back out (tinted by element) and the foe re-forms.
//
// PLACEHOLDER ART (CSS/DOM). Swap points, one per step: replace a CAPTURE_STEPS entry (same signature:
// (c) => Promise) when the Animator's sheets land in art/characters/pixel/fx_extra/ and Character models' raised-arm
// pose exists (TRAINER_ART.raise). Every step uses anime.js (c.A); reduced motion never reaches these (end state only).
export const TRAINER_ART = { // Cal's overworld walk sheet, 'up' row (= back view), until a battle back / raised-arm pose exists
  sheet: 'art/characters/pixel/humans/cal/overworld/cal_chibi_sheet_3x.png', cols: 5, rows: 4, col: 0, row: 3, aspect: 64 / 96, raise: null,
};
export const CAPTURE_MS = { raise: 260, beam: 180, absorb: 360, pulse: 280, lock: 200, bloom: 360, breakout: 420, lower: 240 };
export const BURST_COL = (el = '') => (/fire|magma|flame|ember/i.test(el) ? '#ff8a3d' : /water|sea|fresh|swamp|rain/i.test(el) ? '#5cc0ff' : /wind|air|sky|gust/i.test(el) ? '#c8f7d8' : '#fff1b8');
const mk = (cls, parent, css = '') => { const e = document.createElement('i'); e.className = cls; if (css) e.style.cssText = css; parent.appendChild(e); return e; };

export const CAPTURE_STEPS = {
  // trainer slides in from the near-side edge and raises the crystal above their head
  async raise(c) { const { A, p, g, ms } = c; // c.tw(el, params) -> Promise (anime.js, never hangs on a lost frame)
    if (c.ally) A.animate(c.ally, { opacity: [1, 0.35], duration: ms.raise });
    A.animate(p.trainer, { translateX: [-g.tw * 1.4, 0], opacity: [0, 1], duration: ms.raise, ease: 'outCubic' });
    await c.tw(p.gem, { translateY: [g.th * 0.3, 0], scale: [0.4, 1], opacity: [0, 1], duration: ms.raise, delay: 90, ease: 'outBack(1.6)' }); },
  // a violet rune beam reaches from the held crystal to the foe
  async beam(c) { await c.tw(c.p.beam, { scaleX: [0, 1], opacity: [0, 1], duration: c.ms.beam, ease: 'outQuad' }); },
  // the foe dissolves into light that streams along the beam into the crystal
  async absorb(c) { const { A, p, ms } = c;
    if (c.foe) { c.foe.style.animation = 'none'; c.foe.classList.add('ax-lit'); A.animate(c.foe, { scale: [1, 0.25], opacity: [1, 0], duration: ms.absorb, ease: 'inQuad' }); }
    p.motes.forEach((m, i) => A.animate(m, { translateX: [+m.dataset.dx, 0], translateY: [+m.dataset.dy, 0], opacity: [{ to: 1, duration: 40 }, { to: 1, duration: 200 }, { to: 0, duration: 60 }],
      scale: [1, 0.5], duration: 300, delay: i * 6, ease: 'inQuad' }));
    A.animate(p.beam, { opacity: [1, 0], duration: 140, delay: ms.absorb - 140 });
    await c.tw(p.runes, { scale: [2.2, 1.8], opacity: [0, 1], rotate: [-30, 0], duration: ms.absorb, ease: 'outQuad' }); },
  // one pulse in the trainer's hands; the rune ring closes a step (k of n; a break-out stops short of closed)
  async pulse(c, k, n) { const { p, ms } = c, to = c.caught ? 1.8 - 0.8 * (k / n) : 1.8 - 0.55 * (k / Math.max(n, 2));
    c.A.animate(p.runes, { scale: to, rotate: k * 30, duration: ms.pulse * 0.6, ease: 'outBack(2)' });
    p.gem.classList.add('glow'); await c.tw(p.gem, { scale: [1, 1.2, 1], duration: ms.pulse, ease: 'inOutSine' }); p.gem.classList.remove('glow'); },
  // caught: the runes snap into a full ring around the crystal (original chime here, not a click)
  async lock(c) { c.p.runes.classList.add('lock'); c.sfx('catch');
    await c.tw(c.p.runes, { scale: [1.0, 0.86, 1], rotate: '+=45', duration: c.ms.lock, ease: 'outBack(2.4)' }); },
  // ...and the crystal blooms into facets with a Warmth-colour ring; the banner rises
  async bloom(c) { const { A, p, ms, g } = c;
    A.animate(p.ring, { scale: [0.3, 2.6], opacity: [0.95, 0], duration: ms.bloom + 60, ease: 'outQuad' });
    p.petals.forEach((f, i) => { const a = (i / p.petals.length) * Math.PI * 2;
      A.animate(f, { translateX: [0, Math.cos(a) * g.R * 0.42], translateY: [0, Math.sin(a) * g.R * 0.42], rotate: [(a * 180) / Math.PI + 90, (a * 180) / Math.PI + 90], scale: [0, 1], opacity: [0, 1, 0.85], duration: ms.bloom, ease: 'outBack(1.7)' }); });
    A.animate(c.ban, { scale: [0.6, 1], opacity: [0, 1], translateY: [12, 0], duration: 300, ease: 'outBack(1.8)' });
    await c.tw(p.gem, { scale: [1, 1.35, 1.15], duration: ms.bloom, ease: 'outBack(2)' }); },
  // break-out: the runes break apart, the light bursts back out of the crystal and the foe re-forms
  async breakout(c) { const { A, p, ms } = c;
    p.runes.querySelectorAll('.ax-rune').forEach((r, i) => A.animate(r, { translateY: [0, -c.g.R * 0.9], opacity: [1, 0], duration: 260, delay: i * 10, ease: 'outQuad' }));
    A.animate(p.gem, { scale: [1, 1.3, 0.9], duration: 240, ease: 'outQuad' });
    p.motes.forEach((m, i) => { m.style.background = c.burst; A.animate(m, { translateX: [0, +m.dataset.dx], translateY: [0, +m.dataset.dy], opacity: [1, 0], scale: [0.6, 1.2], duration: 320, delay: 60 + i * 6, ease: 'outCubic' }); });
    if (c.foe) { c.foe.classList.remove('ax-lit'); await c.tw(c.foe, { scale: [0.25, 1], opacity: [0, 1], duration: ms.breakout - 120, delay: 120, ease: 'outBack(1.4)' }); c.foe.style.animation = ''; } },
  // the trainer lowers the crystal and slides back out (not awaited by the battle: input is already free)
  async lower(c) { const { A, p, ms } = c;
    if (c.ally) A.animate(c.ally, { opacity: [0.35, 1], duration: ms.lower, onComplete: () => c.ally.style.removeProperty('opacity') }); // not revert(): that restored raise's inline .35 (ghosted ally)
    await c.tw(p.hold, { translateX: [0, -c.g.tw * 1.4], opacity: [1, 0], duration: ms.lower, ease: 'inCubic' }); p.hold.remove(); },
};

// Build the placeholder parts in host (the battle box). Geometry comes from the live sprites, so it works for both engines.
export function buildCapture(host, { foe, ally, name, banner, hold: holdPt }) { // hold: [x, y] pilot px (fx_art.js FX_CFG.hold) -> trainer stands under it
  const r0 = host.getBoundingClientRect(), rel = (el, fx, fy) => { const r = el?.getClientRects?.().length ? el.getBoundingClientRect() : null; return r && { x: r.left - r0.left + r.width * fx, y: r.top - r0.top + r.height * fy, r }; };
  const th = Math.max(110, Math.min(300, r0.height * 0.4)), tw = th * TRAINER_ART.aspect;
  const a = rel(ally, 0.5, 1) || { x: r0.width * 0.25, y: r0.height * 0.92 }, f = rel(foe, 0.5, 0.55) || { x: r0.width * 0.72, y: r0.height * 0.35 };
  const msg = host.querySelector('#b-msg')?.getBoundingClientRect(), floor = msg?.height ? msg.top - r0.top - 10 : r0.height - 4; // feet stay above the message box
  const hs = r0.height / 240, H0 = holdPt && { x: holdPt[0] * hs, y: holdPt[1] * hs }; // art path: the pilot HOLD point scaled to the box
  const tx = Math.max(6, H0 ? H0.x - tw * 0.62 : a.x - tw * 1.05), ty = Math.min(floor - th, H0 ? H0.y + th * 0.04 : a.y - th * 0.92);
  const R = Math.max(46, Math.min(120, r0.height * 0.17)), gx = tx + tw * 0.62, gy = Math.max(ty - th * 0.04, R * 0.72); // short landscape phones: keep the locked ring on screen
  const wrap = document.createElement('div'); wrap.className = 'ax-catch'; wrap.setAttribute('aria-hidden', 'true');
  const hold = mk('ax-hold', wrap), t = mk('ax-trainer', hold, `left:${tx}px;top:${ty}px;width:${tw}px;height:${th}px;background-image:url(${TRAINER_ART.raise || TRAINER_ART.sheet});`
    + `background-size:${TRAINER_ART.cols * 100}% ${TRAINER_ART.rows * 100}%;background-position:${(TRAINER_ART.col / (TRAINER_ART.cols - 1)) * 100}% ${(TRAINER_ART.row / (TRAINER_ART.rows - 1)) * 100}%`);
  const dx = f.x - gx, dy = f.y - gy, len = Math.hypot(dx, dy);
  const beam = mk('ax-beam', wrap, `left:${gx}px;top:${gy}px;width:${len}px;transform:rotate(${Math.atan2(dy, dx)}rad) scaleX(0);opacity:0`);
  const runes = mk('ax-runes', hold, `left:${gx}px;top:${gy}px;width:${R * 1.3}px;height:${R * 1.3}px;margin:${-R * 0.65}px 0 0 ${-R * 0.65}px;opacity:0`);
  for (let i = 0; i < 6; i++) mk('ax-rune', runes, `transform:rotate(${i * 60}deg) translateY(${-R * 0.65}px)`);
  const ring = mk('ax-ring', hold, `left:${gx}px;top:${gy}px`), petals = [];
  for (let i = 0; i < 6; i++) petals.push(mk('ax-petal', hold, `left:${gx}px;top:${gy}px;opacity:0`));
  const gem = mk('ax-gem', hold, `left:${gx}px;top:${gy}px;opacity:0`); mk('', gem);
  const motes = []; for (let i = 0; i < 10; i++) { const m = mk('ax-mote', wrap, `left:${gx}px;top:${gy}px;opacity:0`), j = (i % 3 - 1) * 10;
    m.dataset.dx = dx * (0.5 + (i % 5) * 0.12) + j; m.dataset.dy = dy * (0.5 + (i % 5) * 0.12) - j; motes.push(m); }
  const ban = document.createElement('div'); ban.className = 'ax-caught'; ban.setAttribute('role', 'status');
  ban.innerHTML = '<b></b><span></span>'; ban.firstChild.textContent = banner; ban.lastChild.textContent = name || '';
  host.append(wrap);
  return { parts: { wrap, hold, trainer: t, gem, beam, runes, ring, petals, motes }, ban, g: { tw, th, R, gx, gy, fx: f.x, fy: f.y, H: r0.height, drift: H0 ? Math.round(Math.hypot(gx - H0.x, gy - H0.y)) : 0 } };
}
