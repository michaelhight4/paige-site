// Kilumen sports UI v2 "flair" (dev/sports-ui-v2, Oct 29 2026). Gary: "the ui is bland, spice it up!" -> life, spirit and soul.
// Pure presentation for the town events, cups, the Aurelith Games and Harbour Haul: nothing here changes a score or a result.
// Phone budget: CSS animates transform/opacity only; one confetti canvas (<=140 bits, PC; <=70 phone) that removes itself;
// crowd wave = 12 drawImage slices of the pre-rendered strip. Reduced motion (prefers-reduced-motion or ?rm=1): no shake,
// no wave, no confetti, no slide-ins; the count-ups jump straight to the final number.
// Count-ups and the medal reveal reuse the vendored anime.js 4.5.0 (MIT, already in THIRD_PARTY_LICENSES), lazy-loaded,
// with a requestAnimationFrame fallback. The pixel-corner bevel frame adapts the box-shadow pixel-border idea from
// NES.css (MIT, credited in THIRD_PARTY_LICENSES). Confetti / fireworks are original code.
import { TS } from './town_strings.js?v=v0.2.85-alpha';

/** Town colour per event (frame, banner, buttons). [main, dark, light] */
export const TOWN_THEME = {
  fernwick: ['#5fbf6a', '#235a2c', '#c8f5b0'], saltmere: ['#3fa8c8', '#16405f', '#bfeaff'], revival_heights: ['#9a7cff', '#3a2a7a', '#e0d4ff'],
  frostspire: ['#8fd0ff', '#2c5a86', '#f0fbff'], lanternport: ['#ffb347', '#7a4210', '#ffe7b8'], cindervale: ['#ff6a2a', '#6e1f0a', '#ffd0a8'],
  aurelith: ['#d23a4c', '#5a1220', '#ffd9a0'],
};
export const EVENT_TOWN = { garden_hop: 'fernwick', tide_run: 'saltmere', tug_of_war: 'saltmere', signal_relay: 'revival_heights', ice_slide: 'frostspire', lantern_catch: 'lanternport', forge_push: 'cindervale' };
export const themeOf = (evId, major = false) => (major ? 'aurelith' : EVENT_TOWN[evId] || 'saltmere');
export const MEDAL = { 1: ['#fff3a0', '#ffc928', '#a8660a'], 2: ['#ffffff', '#cfd8e6', '#6c7a93'], 3: ['#ffd2a8', '#e0904a', '#7a3a10'] };
export const medalFor = (place) => (place >= 1 && place <= 3 ? place : 0);
export const gradePlace = (g) => ({ gold: 1, silver: 2, bronze: 3 }[g] || 0);
/** Rank-change arrows between two orderings of ids (pure, tested): +n moved up n places, -n down, 0 same, null new. */
export function rankMoves(prevIds, ids) { return ids.map((id, i) => { const p = prevIds ? prevIds.indexOf(id) : -1; return p < 0 ? null : p - i; }); }
/** Count-up value at progress u (0..1), ease-out, integer, ends exactly on the target (pure, tested). */
export const countAt = (to, u, from = 0) => (u >= 1 ? to : Math.round(from + (to - from) * (1 - (1 - Math.max(0, u)) ** 3)));
/** Screen shake offset that decays; 0 when reduced motion (pure, tested). */
export const shakeAt = (amp, t, rm) => (rm || amp <= 0.05 ? [0, 0] : [Math.round(Math.sin(t * 91) * amp), Math.round(Math.cos(t * 77) * amp * 0.6)]);

const px = (c, d) => `0 -3px 0 0 ${c},0 3px 0 0 ${c},-3px 0 0 0 ${c},3px 0 0 0 ${c}${d ? ',' + d : ''}`; // pixel corners (NES.css idea)
export const FLAIR_CSS = `
#town-ev{--tc:#3fa8c8;--td:#16405f;--tl:#bfeaff;--gold:#ffd25a;background:radial-gradient(ellipse at 50% 30%,#1d2740ee,#0a0e18f4)}
${Object.entries(TOWN_THEME).map(([k, [a, b, c]]) => `#town-ev[data-town=${k}]{--tc:${a};--td:${b};--tl:${c}}`).join('')}
#town-ev .box{position:relative;border:0;border-radius:0;margin:6px;padding:12px 12px 10px;
 background:linear-gradient(180deg,color-mix(in srgb,var(--td) 55%,#1b2133) 0,#1b2133 46px),repeating-linear-gradient(45deg,#ffffff05 0 2px,transparent 2px 6px) #1b2133;
 box-shadow:${px('var(--tc)', 'inset 3px 3px 0 0 #ffffff26,inset -3px -3px 0 0 #00000066,0 0 0 6px #0b0f1a,0 8px 0 4px #0006')};animation:tevIn .32s cubic-bezier(.3,1.6,.5,1) both}
#town-ev.major .box{box-shadow:${px('var(--gold)', 'inset 0 0 0 3px var(--tc),inset 6px 6px 0 0 #ffffff22,inset -6px -6px 0 0 #0007,0 0 0 6px #2a0a10,0 0 0 9px var(--gold),0 8px 0 8px #0006')}}
#town-ev .box::before,#town-ev .box::after{content:"";position:absolute;top:6px;width:6px;height:6px;background:var(--tl);box-shadow:0 0 0 2px var(--td)}#town-ev .box::before{left:6px}#town-ev .box::after{right:6px}
#town-ev h2{position:relative;display:inline-block;margin:2px 14px 8px;padding:3px 14px 4px;color:#fff;font-size:16px;letter-spacing:1px;text-shadow:2px 2px 0 var(--td),-1px -1px 0 #0006;
 background:linear-gradient(100deg,transparent 30%,#ffffff55 45%,transparent 60%) -150% 0/250% 100% no-repeat,var(--tc);box-shadow:${px('var(--td)')};animation:tevBan .5s .05s cubic-bezier(.3,1.7,.5,1) both,tevShine 3.2s 1s linear infinite}
#town-ev h2::before,#town-ev h2::after{content:"";position:absolute;top:5px;width:10px;height:100%;background:var(--td);z-index:-1}#town-ev h2::before{left:-12px;clip-path:polygon(0 0,100% 0,100% 100%,0 100%,40% 50%)}#town-ev h2::after{right:-12px;clip-path:polygon(0 0,100% 0,60% 50%,100% 100%,0 100%)}
#town-ev.major h2{background-color:var(--tc);color:var(--gold)}
#town-ev button{position:relative;font:bold 14px monospace;background:var(--td);color:#fff;border:0;border-radius:0;padding:7px 14px;margin:6px 5px;
 box-shadow:${px('var(--tc)', 'inset 0 -4px 0 0 #0007,inset 0 3px 0 0 #ffffff33')};transition:transform .06s,filter .1s;cursor:pointer}
#town-ev button:hover:not(:disabled){filter:brightness(1.25)}#town-ev button:focus-visible{outline:2px dashed var(--gold);outline-offset:5px}
#town-ev button:active:not(:disabled),#town-ev button.prs{transform:translateY(3px) scale(.96);box-shadow:${px('var(--tl)', 'inset 0 3px 0 0 #0007')};filter:brightness(1.35)}
#town-ev button[data-a=go],#town-ev button[data-a=enter],#town-ev button[data-a=next]{background:var(--tc);color:#10131c;animation:tevNudge 1.6s .8s ease-in-out infinite}
#town-ev .pad button{min-width:52px;min-height:44px;font-size:18px;animation:none}
#town-ev .mon{border:0;border-radius:0;background:#0b0f1a88;box-shadow:${px('#384260')};transition:transform .12s}#town-ev .mon.sel{box-shadow:${px('var(--gold)', '0 0 10px 2px var(--tc)')};}#town-ev .mon.sel img{animation:tevBob 1s ease-in-out infinite}
#town-ev .rv{border:0;border-radius:0;background:#0b0f1a99;box-shadow:${px('var(--tc)')};animation:tevUp .4s both}#town-ev .rv:nth-child(2){animation-delay:.1s}#town-ev .rv:nth-child(3){animation-delay:.2s}#town-ev .rv:nth-child(4){animation-delay:.3s}
#town-ev canvas{box-shadow:${px('var(--tc)', '0 0 0 6px #0b0f1a')};border-radius:0;margin:4px auto}
#town-ev .react{position:relative;margin:10px 6px;padding:6px 10px;background:#f3ead2;color:#23202a;font-style:normal;box-shadow:${px('#23202a')};animation:tevUp .35s .35s both}
#town-ev .react::after{content:"";position:absolute;left:22px;top:-8px;border:6px solid transparent;border-bottom:4px solid #f3ead2;border-top:0}
#town-ev .cupline{color:var(--tl)}
#town-ev .board{margin:8px auto;border-collapse:separate;border-spacing:0 3px;padding:6px 8px;background:linear-gradient(#2a1d0a,#120c04);box-shadow:${px('var(--gold)', 'inset 0 0 0 2px #7a5410,0 0 0 6px #120c04')}}
#town-ev .board td{padding:3px 8px;background:#ffffff0d}#town-ev .board tr{animation:tevRow .45s cubic-bezier(.3,1.5,.5,1) both;animation-delay:calc(var(--i,0)*.12s + .2s)}
#town-ev .board tr.mv{animation:tevRank .9s cubic-bezier(.3,1.3,.5,1) both;animation-delay:calc(.5s + var(--i,0)*.05s)}
#town-ev .board tr.me td{background:color-mix(in srgb,var(--gold) 28%,transparent);color:#fff6c8}#town-ev .board tr.me td:first-child{box-shadow:inset 3px 0 0 var(--gold)}
#town-ev .board td.pl{color:var(--gold);font-weight:bold}#town-ev .board .up{color:#7dff8a}#town-ev .board .dn{color:#ff8a8a}#town-ev .board .arr{display:inline-block;min-width:22px;animation:tevPop .5s 1.3s both}
#town-ev .medal{display:inline-block;width:40px;height:40px;margin:2px 6px -10px;position:relative;animation:tevMedal 1s .3s cubic-bezier(.3,1.5,.5,1) both}
#town-ev .medal i{position:absolute;inset:8px 6px 0;background:var(--m1);box-shadow:${px('var(--m2)', 'inset -3px -3px 0 var(--m2),inset 3px 3px 0 #fff8')}}
#town-ev .medal b{position:absolute;left:12px;top:0;width:16px;height:10px;background:linear-gradient(90deg,var(--tc) 50%,var(--td) 50%)}
#town-ev .medal em{position:absolute;inset:13px 0 0;font:bold 13px monospace;color:var(--m3);font-style:normal}
#town-ev .score{display:inline-block;font-size:22px;color:var(--gold);text-shadow:2px 2px 0 #000;animation:tevScore .6s .2s cubic-bezier(.3,2,.5,1) both}
#town-ev .stamp{display:block;font:bold 30px monospace;color:var(--gold);text-shadow:3px 3px 0 var(--td),-2px -2px 0 #000;margin:4px 0;animation:tevStamp .55s cubic-bezier(.3,1.6,.5,1) both}
#town-ev .wipe{position:fixed;inset:0;z-index:2;pointer-events:none;background:repeating-linear-gradient(90deg,var(--tc) 0 24px,var(--td) 24px 48px);animation:tevWipe .6s steps(8) both}
#town-ev canvas.fx{position:fixed;inset:0;width:100vw;height:100vh;aspect-ratio:auto;margin:0;background:transparent;box-shadow:none;pointer-events:none;z-index:3;image-rendering:pixelated}
@keyframes tevIn{from{transform:scale(.86) translateY(14px);opacity:0}}@keyframes tevBan{from{transform:scaleX(.2) rotate(-4deg);opacity:0}}@keyframes tevShine{0%,70%{background-position:-150% 0,0 0}100%{background-position:250% 0,0 0}}
@keyframes tevNudge{50%{filter:brightness(1.3)}}@keyframes tevBob{50%{transform:translateY(-6px)}}@keyframes tevUp{from{transform:translateY(12px);opacity:0}}
@keyframes tevRow{from{transform:translateX(-30px);opacity:0}}@keyframes tevRank{from{transform:translateY(calc(var(--from,0)*100%));filter:brightness(1.8)}}
@keyframes tevPop{0%{transform:scale(0)}60%{transform:scale(1.6)}}@keyframes tevMedal{0%{transform:translateY(-40px) rotateY(0) scale(.3);opacity:0}70%{transform:translateY(4px) rotateY(540deg) scale(1.2)}100%{transform:rotateY(720deg)}}
@keyframes tevScore{0%{transform:scale(.2)}60%{transform:scale(1.4)}100%{transform:scale(1)}}@keyframes tevStamp{0%{transform:scale(3) rotate(-10deg);opacity:0}100%{transform:none}}
@keyframes tevWipe{0%{clip-path:inset(0 100% 0 0)}45%,55%{clip-path:inset(0 0 0 0)}100%{clip-path:inset(0 0 0 100%)}}
@keyframes tevShake{20%{transform:translate(-3px,1px)}40%{transform:translate(3px,-1px)}60%{transform:translate(-2px,0)}80%{transform:translate(2px,1px)}}
#town-ev.shk .box{animation:tevShake .25s linear}
@media (prefers-reduced-motion:reduce){#town-ev *,#town-ev .box,#town-ev h2{animation:none!important;transition:none!important}}
#town-ev.rm *,#town-ev.rm .box{animation:none!important;transition:none!important}`;

export const medalHtml = (place) => { const m = MEDAL[place]; return m ? `<span class="medal" style="--m1:${m[1]};--m2:${m[2]};--m3:${m[0] === '#ffffff' ? '#3a4458' : '#5a3006'}" aria-hidden="true"><b></b><i></i><em>${place}</em></span>` : ''; };
export const arrowHtml = (mv) => (mv > 0 ? `<span class="arr up">▲${mv}</span>` : mv < 0 ? `<span class="arr dn">▼${-mv}</span>` : `<span class="arr"></span>`);

let anime = null, animeLoad = null;
const loadAnime = () => (animeLoad ||= import('../vendor/animejs/anime.ui.min.mjs?v=v0.2.85-alpha').then((m) => (anime = m)).catch(() => null));
/** Count every [data-count] element in root up from 0 (or data-from) to its number; text after the number is kept. */
export function countUps(root, rm) {
  const els = [...root.querySelectorAll('[data-count]')]; if (!els.length) return;
  for (const el of els) {
    const to = +el.dataset.count, from = +(el.dataset.from || 0), suf = el.dataset.suf || '', dur = Math.min(1400, 500 + Math.abs(to - from) * 12);
    const set = (v) => (el.textContent = v + suf);
    if (rm || !Number.isFinite(to)) { set(to); continue; }
    set(from); const o = { v: from };
    const go = () => { if (anime?.animate) anime.animate(o, { v: to, duration: dur, delay: 250, ease: 'outCubic', onUpdate: () => set(Math.round(o.v)), onComplete: () => set(to) });
      else { const t0 = performance.now() + 250; const f = (n) => { const u = (n - t0) / dur; set(countAt(to, u, from)); if (u < 1 && el.isConnected) requestAnimationFrame(f); }; requestAnimationFrame(f); } };
    if (anime) go(); else loadAnime().then(go);
  }
}
/** Button press feedback: a press class + a soft click (game audio settings decide if it plays). */
export function pressFx(root) {
  root.querySelectorAll('button').forEach((b) => b.addEventListener('pointerdown', () => { b.classList.add('prs'); setTimeout(() => b.classList.remove('prs'), 140);
    try { window.kilumen?.audio?.sfx?.('cursor'); } catch (e) { /* no audio */ } }));
}
/** Flash the matching on-screen pad button when a key is used (keyboard players see feedback too). */
export function padFlash(root, k) { const b = root?.querySelector(`.pad button[data-k=${k}]`); if (!b) return; b.classList.add('prs'); setTimeout(() => b.classList.remove('prs'), 110); }
/** Full-screen striped wipe in the town colours between rounds. */
export function wipe(ov, rm) { if (rm || !ov) return; const w = document.createElement('div'); w.className = 'wipe'; ov.appendChild(w); setTimeout(() => w.remove(), 650); }
export function shakeBox(ov, rm) { if (rm || !ov) return; ov.classList.remove('shk'); void ov.offsetWidth; ov.classList.add('shk'); setTimeout(() => ov?.classList.remove('shk'), 260); }

/** Confetti ('confetti') or firework ('fire') burst on its own canvas; stops and removes itself. */
export function burst(ov, kind = 'confetti', cols = ['#ffd25a', '#ff6a8a', '#7dff8a', '#8fd0ff', '#fff'], rm = false) {
  if (rm || !ov) return null;
  const phone = Math.min(innerWidth, innerHeight) < 500 || matchMedia?.('(pointer:coarse)').matches, N = phone ? 70 : 140, S = 3;
  const cv = document.createElement('canvas'); cv.className = 'fx'; cv.width = Math.ceil(innerWidth / S); cv.height = Math.ceil(innerHeight / S); ov.appendChild(cv);
  const g = cv.getContext('2d'), Wd = cv.width, Hd = cv.height, P = [];
  const add = (x, y, n, sp, up) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = sp * (0.4 + Math.random());
    P.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, c: cols[i % cols.length], s: 1 + (Math.random() * 2 | 0), l: 1.4 + Math.random() * 0.8, w: Math.random() * 6 }); } };
  if (kind === 'fire') { [[0.25, 0.3], [0.75, 0.25], [0.5, 0.18]].forEach(([fx, fy], k) => setTimeout(() => add(Wd * fx, Hd * fy, N / 3 | 0, 55, 0), k * 280)); }
  else { add(Wd * 0.2, Hd * 0.75, N / 2 | 0, 60, 70); add(Wd * 0.8, Hd * 0.75, N / 2 | 0, 60, 70); }
  let last = performance.now(), life = 0;
  const f = (n) => { const dt = Math.min(0.05, (n - last) / 1000); last = n; life += dt; g.clearRect(0, 0, Wd, Hd);
    for (const p of P) { p.l -= dt; if (p.l <= 0) continue; p.vy += (kind === 'fire' ? 40 : 90) * dt; p.vx *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt; p.w += dt * 9;
      g.globalAlpha = Math.min(1, p.l * 2); g.fillStyle = p.c; const sw = kind === 'fire' ? p.s : Math.max(1, Math.round(p.s * Math.abs(Math.cos(p.w)) * 2)); g.fillRect(p.x | 0, p.y | 0, sw, p.s); }
    if (life < 3 && cv.isConnected) requestAnimationFrame(f); else cv.remove(); };
  requestAnimationFrame(f); return cv;
}

// ---------------- canvas side (play screen) ----------------
/** Crowd wave: the pre-rendered strip drawn in 12 slices; a wave rolls across when the crowd is hyped. */
export function drawCrowdWave(g, cv, y, W, t, hype, rm) {
  const n = 12, sw = W / n, wave = !rm && hype > 0.55;
  for (let i = 0; i < n; i++) { const ph = (t * 1.6 - i / n) % 1, lift = wave ? Math.max(0, Math.sin(ph * Math.PI * 2)) * (3 + hype * 5) : 0, bob = rm ? 0 : Math.abs(Math.sin(t * (4 + hype * 8) + i)) * (1 + hype * 2);
    g.drawImage(cv, i * sw, 0, sw, cv.height, i * sw, Math.round(y - bob - lift), sw, cv.height); }
}
const EMO = ['♥', '!', '★', '♪'];
/** Crowd reaction bubbles above heads: cheer -> hearts/stars/notes, gasp -> '!' . */
export function addReact(cr, kind, W, n = 3) { cr.rx ||= []; for (let i = 0; i < n; i++) cr.rx.push({ x: 12 + Math.random() * (W - 24), t: 1, e: kind === 'gasp' ? '!' : EMO[[0, 2, 3][i % 3]], gasp: kind === 'gasp' }); if (cr.rx.length > 12) cr.rx.splice(0, cr.rx.length - 12); }
export function drawReacts(g, cr, y, dt) {
  if (!cr.rx?.length) return; g.font = 'bold 11px monospace'; g.textAlign = 'center';
  for (const r of cr.rx) { r.t -= dt * 0.9; if (r.t <= 0) continue; const yy = Math.round(y - 4 - (1 - r.t) * 14);
    g.globalAlpha = Math.min(1, r.t * 2); g.fillStyle = '#0b0f1a'; g.fillRect(r.x - 7, yy - 10, 14, 13); g.fillStyle = r.gasp ? '#fff' : r.e === '♥' ? '#ff6a8a' : '#ffe58a'; g.fillText(r.e, r.x, yy); }
  g.globalAlpha = 1; cr.rx = cr.rx.filter((r) => r.t > 0);
}
/** Framed HUD in the town colour with a bouncy, counting score. hs = {shown, bump}. */
export function drawHud(g, W, theme, left, score, unit, extra, hs, dt) {
  const [a, b] = TOWN_THEME[theme] || TOWN_THEME.saltmere;
  if (score > hs.shown) { hs.shown = Math.min(score, hs.shown + Math.max(1, Math.ceil((score - hs.shown) * dt * 12))); hs.bump = 1; } else hs.shown = score;
  hs.bump = Math.max(0, (hs.bump || 0) - dt * 4);
  g.fillStyle = b; g.fillRect(0, 0, W, 26); g.fillStyle = a; g.fillRect(0, 23, W, 3); g.fillStyle = '#ffffff22'; g.fillRect(0, 0, W, 2);
  g.fillStyle = '#0b0f1a'; g.fillRect(4, 4, 44, 18); g.fillStyle = left <= 5 ? (Math.floor(left * 4) % 2 ? '#ff6a6a' : '#fff') : '#f3ead2';
  g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.fillText(`${Math.max(0, Math.ceil(left))}s`, 26, 18);
  const sc = 1 + Math.sin(Math.min(1, hs.bump) * Math.PI) * 0.45; g.save(); g.translate(96, 13); g.scale(sc, sc); g.fillStyle = hs.bump > 0.1 ? '#fff6a0' : '#ffd25a';
  g.font = 'bold 15px monospace'; g.fillText(String(hs.shown), 0, 5); g.restore();
  g.fillStyle = '#f3ead2'; g.font = '12px monospace'; g.textAlign = 'left'; g.fillText(`${unit}  ${extra}`, 124, 18);
}
/** "GO!" title card over the first moments of play (presentation only; the event runs underneath). */
export function drawGo(g, W, H, el, theme) {
  if (el > 0.9) return; const [a, b] = TOWN_THEME[theme] || TOWN_THEME.saltmere, u = el / 0.9, s = u < 0.25 ? 3 - 8 * u : 1;
  g.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1; g.fillStyle = b + 'cc'; g.fillRect(0, H / 2 - 30, W, 52); g.fillStyle = a; g.fillRect(0, H / 2 - 30, W, 3); g.fillRect(0, H / 2 + 19, W, 3);
  g.save(); g.translate(W / 2, H / 2 + 8); g.scale(s, s); g.font = 'bold 34px monospace'; g.textAlign = 'center'; g.fillStyle = '#000'; g.fillText(TS.ui_go, 3, 3); g.fillStyle = '#ffd25a'; g.fillText(TS.ui_go, 0, 0); g.restore(); g.globalAlpha = 1;
}
/** Harbour Haul spray when the rope jerks (pooled, max 24). */
export function spray(s, x, y, n = 10) { s.spray ||= []; for (let i = 0; i < n && s.spray.length < 24; i++) s.spray.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 90, t: 0.6 }); }
export function drawSpray(g, s, dt) { if (!s.spray?.length) return; g.fillStyle = '#d8f4ff'; for (const p of s.spray) { p.t -= dt; p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t > 0) g.fillRect(p.x | 0, p.y | 0, 3, 3); } s.spray = s.spray.filter((p) => p.t > 0); }
