// Fruit feeds v2 "picnic" feed screen: the creature big and centre, hand-feeding with a reaction (Gary Oct 29 2026:
// "engaging feeling and soul"). Coder, Oct 29 2026. Structure only from studied games (no assets or text copied):
// - Pokemon-Amie / Refresh hand-feeding: the treat goes straight to ONE creature and it reacts right there, up close.
// - Pokemon Camp curry: its weak point was opaque results, so every gain is shown before AND as it lands.
// - Slime Rancher: squash-and-stretch chewing, crumbs and a squeak; reward visible instantly.
// - Stardew Valley: tactile item pickup pop, little heart/sparkle bursts, a fanfare on a milestone.
// Art: our own placeholder SVG (ui_art.js) until Animator's fruit art lands (/workspace/kilumen_fruit_art/); sound: in-house
// ZzFX (src/vendor/zzfx, MIT) with feeds-only presets below, gated on the player's audio settings.
import * as L from './logic.js?v=v0.2.66-alpha';
import { FS, ft } from './strings.js?v=v0.2.66-alpha';
import { fruitSvg, fruitColor } from './ui_art.js?v=v0.2.66-alpha';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms * (globalThis.KILUMEN_FEEDS_SLOWMO || 1)));
const reduced = () => !!globalThis.document?.querySelector?.('.ui-reduce') || !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];

// ---- Sound (ZzFX presets, PLACEHOLDER: Audio can retune) -----------------------------------------------------------
export const FEED_SFX = {
  hover: [0.25, 0.05, 1200, 0, 0.01, 0.03, 1, 1.5, 0, 0, 200, 0.01],
  pick: [0.4, 0.05, 700, 0, 0.02, 0.06, 1, 1, 0, 0, 300, 0.02],
  whoosh: [0.35, 0.1, 300, 0.05, 0.08, 0.15, 4, 0.5, 6, 0, 0, 0, 0, 0.8],
  munch: [0.45, 0.3, 180, 0, 0.02, 0.06, 4, 2, 0, 0, 0, 0, 0, 2.5],
  yay: [0.5, 0, 523, 0.01, 0.12, 0.25, 0, 1.6, 0, 0, 262, 0.07, 0.06],
  meh: [0.35, 0, 392, 0.01, 0.08, 0.15, 0, 1.2, 0, 0, 0, 0, 0.05],
  grump: [0.45, 0.05, 160, 0.01, 0.1, 0.2, 2, 1.5, -2, 0, -40, 0.05],
  nope: [0.45, 0, 220, 0.01, 0.06, 0.12, 2, 1, 0, 0, -60, 0.06, 0.05],
  pop: [0.35, 0.05, 900, 0, 0.01, 0.05, 0, 2, 0, 0, 400, 0.01],
  fanfare: [0.55, 0, 659, 0.02, 0.25, 0.4, 0, 1.4, 0, 0, 330, 0.08, 0.1, 0, 0, 0, 0.05],
};
let zz = null;
export function feedSfx(id) {
  try {
    const a = globalThis.kilumen?.audio, s = a?.state?.();
    if (!s || !s.unlocked || s.muted || !(s.sfx > 0) || !FEED_SFX[id]) return false;
    const go = (Z) => { Z.volume = 0.3 * (s.master ?? 1) * (s.sfx ?? 1); Z.play(...FEED_SFX[id]); };
    if (zz) go(zz); else import('../vendor/zzfx/ZzFX.js?v=v0.2.66-alpha').then((m) => { zz = m.ZZFX; go(zz); });
    return true;
  } catch { return false; }
}

// ---- Quips (placeholder text keys; Text Bot writes the final lines) -------------------------------------------------
export const QUIPS = { idle: 3, look: 2, like: 3, neutral: 2, dislike: 2, refuse: 1, full: 1, maxed: 1 };
const quip = (kind, name, seed = Date.now()) => ft(`feeds.quip.${kind}.${1 + (Math.abs(seed) % QUIPS[kind])}`, { creature: name });

// ---- Markup ------------------------------------------------------------------------------------------------------
/** v: {mons, sel, c, name(c), img(sp), fs, bag, fruitId, pv, body, tasteChips, quipText, ritaText} */
export function feedTabHtml(v) {
  const { c, fs, bag } = v;
  const u = c && (c.uid || c.id), b = c ? L.buildOf(fs, u) : {}, full = c ? L.fullOf(fs, u) : 0, pv = v.pv;
  const nf = pv?.ok ? Math.min(100, full + pv.full) : full;
  const fruits = L.FRUIT_IDS.filter((id) => L.fruitCount(bag, id) > 0);
  const team = `<div class="fx-team">${v.mons.map((m, i) => `<button class="fx-av ${i === v.sel ? 'on' : ''}" data-mon="${i}" aria-label="${esc(v.name(m))}"><img src="${v.img(m.species)}" alt=""></button>`).join('')}</div>`;
  const stage = c ? `<div class="fx-stage">
      <div class="fx-sun"></div><div class="fx-blanket"></div>
      <div class="fx-quip ${v.quipText ? 'show' : ''}">${esc(v.quipText || '')}</div>
      <div class="fx-monwrap"><div class="fx-shadow"></div><img class="fx-mon" src="${v.img(c.species)}" alt=""><div class="fx-mouth"></div></div>
      <div class="fx-belly" title="${esc(FS['feeds.fullness'])}">${bellySvg(full, nf)}<b class="fx-bn">${Math.round(nf)}</b><span>${esc(FS['feeds.fullness'])}</span></div>
      <div class="fx-tag"><b>${esc(v.name(c))}</b>${v.tasteChips}</div>
    </div>` : '<div class="fx-stage"></div>';
  const bars = c ? `<div class="fx-bars">${L.PARTS.map((p) => barHtml(p, b[p] || 0, L.partCap(p, v.body), pv?.ok ? pv.delta[p] || 0 : 0)).join('')}
      <div class="fx-total">${esc(ft('feeds.build_total', { n: Math.floor(L.totalBuild(b)), max: L.TOTAL_CAP }))}</div></div>` : '';
  const msg = v.msg || (pv && !pv.ok ? ft('feeds.refuse_' + (pv.reason === 'full' ? 'full' : pv.reason === 'misfit' ? 'misfit' : 'capped'), { creature: c ? v.name(c) : '' }) : '');
  const basket = `<div class="fx-basket"><h3>${esc(FS['feeds.pick_fruit'])}</h3><div class="fx-fruits">
      ${fruits.length ? fruits.map((id, i) => `<button class="fx-fruit ${v.fruitId === id ? 'on' : ''}" data-fruit="${id}" style="--d:${i * 40}ms;--fc:${fruitColor(id)}">${fruitSvg(id)}<span class="nm">${esc(FS[`feeds.fruit.${id}.name`])}</span><span class="ct">${L.fruitCount(bag, id)}</span><span class="tg">${esc(FS['feeds.taste.' + L.FRUITS[id].taste])}</span></button>`).join('') : `<div class="fx-empty">${esc(FS['feeds.none_left'])}</div>`}
    </div><div class="fx-msg ${pv && !pv.ok ? 'warn' : ''}">${esc(msg)}</div>
    <button class="fx-go" data-a="feed" ${v.fruitId && fruits.includes(v.fruitId) ? '' : 'disabled'}>${esc(FS['feeds.give'])}</button>
    ${v.ritaText ? `<div class="fx-rita"><i>R</i><span>${esc(v.ritaText)}</span></div>` : ''}</div>`;
  return `<div class="fx-wrap">${team}${stage}${bars}${basket}</div>`;
}
function barHtml(p, v, cap, d) {
  const nv = Math.max(0, v + d), pc = (x) => (x / L.PART_CAP) * 100;
  return `<div class="fx-row ${cap <= 0 ? 'misfit' : ''} ${v >= cap && cap > 0 ? 'maxed' : ''}" data-part="${p}"><span class="fx-part">${esc(FS['feeds.part.' + p])}</span>
    <span class="fx-bar">${cap < L.PART_CAP ? `<i class="lock" style="left:${pc(cap)}%"></i>` : ''}<i class="cur" style="width:${pc(Math.min(v, nv))}%"></i>${d > 0 ? `<i class="up" style="left:${pc(v)}%;width:${pc(d)}%"></i>` : ''}${d < 0 ? `<i class="down" style="left:${pc(nv)}%;width:${pc(-d)}%"></i>` : ''}<s style="left:25%"></s><s style="left:50%"></s><s style="left:75%"></s></span>
    <span class="fx-val">${Math.floor(v)}${d ? `<b class="${d > 0 ? 'pos' : 'neg'}">${d > 0 ? '+' : ''}${d}</b>` : ''}</span><span class="fx-stg s${L.stageOf(nv)}">${esc(FS['feeds.stage.' + L.stageOf(nv)])}</span></div>`;
}
function bellySvg(was, now) {
  // a round little bowl: was = solid soup, now = the lighter "after this feed" top
  const y = (f) => 44 - (f / 100) * 26;
  return `<svg class="fx-bowl" viewBox="0 0 64 52" aria-hidden="true"><defs><clipPath id="fxbc"><path d="M6 18h52q0 28-26 28T6 18z"/></clipPath></defs>
    <g clip-path="url(#fxbc)"><rect x="0" y="0" width="64" height="52" fill="#fff6e4"/><rect class="fx-soup-next" x="0" y="${y(now)}" width="64" height="52" fill="#f7c27a"/><rect class="fx-soup" x="0" y="${y(was)}" width="64" height="52" fill="#e98a3a"/>
    <path class="fx-wave" d="M0 ${y(was)}q8-3 16 0t16 0t16 0t16 0v4H0z" fill="#e98a3a"/></g>
    <path d="M6 18h52q0 28-26 28T6 18z" fill="none" stroke="#5a3424" stroke-width="3" stroke-linejoin="round"/><path d="M4 18h56" stroke="#5a3424" stroke-width="4" stroke-linecap="round"/>
    <path d="M14 26q2 8 8 12" stroke="#fff" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/><path d="M24 50h16" stroke="#5a3424" stroke-width="3" stroke-linecap="round"/></svg>`;
}

// ---- The feed moment ---------------------------------------------------------------------------------------------
/** Runs the animation around one feed. apply() does the real feed (logic) and returns its result. -> result */
export async function playFeed(root, { fruitId, name, apply, after, seed = Date.now() }) {
  const mon = root.querySelector('.fx-mon'), wrap = root.querySelector('.fx-monwrap'), mouth = root.querySelector('.fx-mouth'), src = root.querySelector(`.fx-fruit[data-fruit="${fruitId}"] .fd-ico`);
  root.querySelector('.fx-wrap')?.classList.add('busy');
  const say = (t) => { const q = root.querySelector('.fx-quip'); if (!q) return; q.textContent = t; q.classList.remove('show'); void q.offsetWidth; q.classList.add('show'); };
  const fast = reduced();
  const anim = (el, k, o) => (el && !fast ? el.animate(k, o).finished.catch(() => {}) : Promise.resolve());
  // 1) look at the fruit
  say(quip('look', name, seed)); feedSfx('pick');
  await anim(wrap, [{ transform: 'none' }, { transform: 'translateX(10px) rotate(7deg)' }], { duration: 260, easing: 'cubic-bezier(.3,1.6,.6,1)', fill: 'forwards' });
  // 2) the fruit arcs over to the mouth
  const fly = flyFruit(src, mouth, fruitId); feedSfx('whoosh');
  const res = apply();
  if (!res?.ok) { // refused: grumpy turn-away, fruit bounces back to the basket
    await sleep(260); mon.classList.add('turn'); feedSfx('nope'); fly?.bounce();
    say(res?.reason === 'full' ? quip('full', name, seed) : res?.reason === 'misfit' ? ft('feeds.refuse_misfit', { creature: name }) : quip('refuse', name, seed));
    puff(wrap, '#9a9a8a', 6);
    await anim(wrap, [{ transform: 'translateX(10px) rotate(7deg)' }, { transform: 'translateX(-6px) rotate(-4deg)' }, { transform: 'none' }], { duration: 500, easing: 'ease-out', fill: 'forwards' });
    await sleep(900); mon.classList.remove('turn'); root.querySelector('.fx-wrap')?.classList.remove('busy'); after?.(res, { refused: true }); return res;
  }
  await fly?.done;
  // 3) lean in and chew with crumbs
  await anim(wrap, [{ transform: 'translateX(10px) rotate(7deg)' }, { transform: 'translateY(4px) scale(1.06)' }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
  for (let i = 0; i < 3; i++) {
    feedSfx('munch'); crumbs(mouth, fruitColor(fruitId), 5);
    await anim(mon, [{ transform: 'scale(1,1)' }, { transform: 'scale(1.12,.86)' }, { transform: 'scale(.94,1.08)' }, { transform: 'scale(1,1)' }], { duration: 260, easing: 'ease-in-out' });
  }
  await anim(wrap, [{ transform: 'translateY(4px) scale(1.06)' }, { transform: 'none' }], { duration: 140, fill: 'forwards' });
  // 4) reaction
  const r = res.reaction;
  say(quip(r, name, seed));
  if (r === 'like') { feedSfx('yay'); root.__fxbg?.burst(); sparkles(wrap, 10); hearts(wrap, 3); await anim(wrap, [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-26px) scale(.95,1.05)', offset: 0.4 }, { transform: 'translateY(0) scale(1.1,.9)', offset: 0.75 }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.3,1.5,.5,1)', iterations: 2 }); }
  else if (r === 'dislike') { feedSfx('grump'); mon.classList.add('turn'); puff(wrap, '#8f9a6a', 7); await anim(wrap, [{ transform: 'none' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' }, { transform: 'none' }], { duration: 520 }); await sleep(450); mon.classList.remove('turn'); }
  else { feedSfx('meh'); await anim(wrap, [{ transform: 'none' }, { transform: 'translateY(-8px)' }, { transform: 'none' }], { duration: 360, easing: 'ease-out' }); }
  root.querySelector('.fx-wrap')?.classList.remove('busy');
  after?.(res, {}); return res;
}
/** After the re-render: bars fill from the old widths with an overshoot pop; cap -> fanfare. */
export function growBars(root, before, res, caps, name) {
  let maxed = null;
  for (const [p, d] of Object.entries(res.delta || {})) {
    const row = root.querySelector(`.fx-row[data-part="${p}"]`), cur = row?.querySelector('.cur'); if (!cur) continue;
    const to = cur.style.width; cur.style.transition = 'none'; cur.style.width = ((before[p] || 0) / L.PART_CAP) * 100 + '%'; void cur.offsetWidth;
    cur.style.transition = 'width .7s cubic-bezier(.34,1.56,.64,1)'; cur.style.width = to;
    row.classList.add(d > 0 ? 'popup' : 'popdown');
    const fl = document.createElement('em'); fl.className = 'fx-float ' + (d > 0 ? 'pos' : 'neg'); fl.textContent = (d > 0 ? '+' : '') + d; row.appendChild(fl);
    if (d > 0) setTimeout(() => feedSfx('pop'), 250);
    if (d > 0 && (before[p] || 0) < caps[p] && (before[p] || 0) + d >= caps[p] - 0.001) maxed = p;
  }
  const bowl = root.querySelector('.fx-belly'); bowl?.classList.add('slosh');
  if (maxed) setTimeout(() => {
    feedSfx('fanfare'); const row = root.querySelector(`.fx-row[data-part="${maxed}"]`); row?.classList.add('fanfare'); stars(row, 12);
    const q = root.querySelector('.fx-quip'); if (q) { q.textContent = ft('feeds.quip.maxed.1', { creature: name, part: FS['feeds.part.' + maxed] }); q.classList.add('show'); }
  }, 700);
  return maxed;
}

// ---- particles ---------------------------------------------------------------------------------------------------
function flyFruit(src, dst, id) {
  if (!src || !dst || reduced()) return { done: Promise.resolve(), bounce() {} };
  const a = src.getBoundingClientRect(), b = dst.getBoundingClientRect();
  const el = document.createElement('div'); el.className = 'fx-flyer'; el.innerHTML = fruitSvg(id);
  Object.assign(el.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' }); document.body.appendChild(el);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2), lift = Math.min(160, 60 + Math.abs(dx) * 0.25);
  const k = [{ transform: 'translate(0,0) scale(1) rotate(0)' }, { transform: `translate(${dx * 0.5}px,${dy * 0.5 - lift}px) scale(1.5) rotate(200deg)`, offset: 0.5 }, { transform: `translate(${dx}px,${dy}px) scale(.55) rotate(360deg)` }];
  const an = el.animate(k, { duration: 620, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' });
  return {
    done: an.finished.then(() => el.remove()).catch(() => el.remove()),
    bounce() { an.pause(); const t = getComputedStyle(el).transform; an.cancel(); el.animate([{ transform: t }, { transform: `translate(${dx * 0.3}px,${dy * 0.3 - lift * 0.8}px) rotate(-90deg)`, offset: 0.4 }, { transform: 'translate(0,0) rotate(0)' }], { duration: 560, easing: 'cubic-bezier(.3,1.4,.6,1)' }).finished.then(() => el.remove()).catch(() => el.remove()); },
  };
}
function burst(host, n, make) {
  if (!host || reduced()) return;
  for (let i = 0; i < n; i++) { const s = make(i); host.appendChild(s); s.addEventListener('animationend', () => s.remove()); setTimeout(() => s.remove(), 2500); }
}
const R = (a, b) => a + Math.random() * (b - a);
function crumbs(host, col, n) { burst(host, n, () => { const s = document.createElement('i'); s.className = 'fx-crumb'; s.style.cssText = `--x:${R(-34, 34)}px;--y:${R(20, 60)}px;--r:${R(-200, 200)}deg;background:${col}`; return s; }); }
function sparkles(host, n) { burst(host, n, (i) => { const s = document.createElement('i'); s.className = 'fx-spark'; const a = (i / n) * 6.28; s.style.cssText = `--x:${Math.cos(a) * R(60, 95)}px;--y:${Math.sin(a) * R(50, 80) - 20}px;animation-delay:${R(0, 120)}ms`; s.textContent = '✦'; return s; }); }
function hearts(host, n) { burst(host, n, (i) => { const s = document.createElement('i'); s.className = 'fx-heart'; s.style.cssText = `--x:${(i - 1) * 34}px;animation-delay:${i * 130}ms`; s.textContent = '♥'; return s; }); }
function puff(host, col, n) { burst(host, n, () => { const s = document.createElement('i'); s.className = 'fx-puff'; s.style.cssText = `--x:${R(-50, 50)}px;--y:${R(-60, -20)}px;background:${col}`; return s; }); }
function stars(host, n) { burst(host, n, (i) => { const s = document.createElement('i'); s.className = 'fx-star'; s.style.cssText = `--x:${R(-20, 120)}px;--y:${R(-40, 10)}px;animation-delay:${i * 30}ms`; s.textContent = '★'; return s; }); }

// ---- Style: warm hand-made frame matching Kilumen's dark-plum UI with cream paper and stitched borders ---------------
export const CSS2 = `
#feeds-ov{background:radial-gradient(ellipse at center,rgba(40,22,36,.55),rgba(14,8,16,.82));font-family:var(--ui-font,"Trebuchet MS",system-ui,sans-serif)}
#feeds-ov .fd-box{position:relative;width:min(1040px,96vw);background:#3a2433;border:3px solid #1a1226;border-radius:22px;padding:12px;box-shadow:0 0 0 3px #f4ead2 inset,0 14px 40px rgba(0,0,0,.55);color:#2a1d18;overflow:visible}
#feeds-ov .fd-box::before{content:"";position:absolute;inset:7px;border:2px dashed rgba(244,234,210,.45);border-radius:16px;pointer-events:none}
#feeds-ov .fd-box>*{position:relative}
.fd-tabs button{font-family:inherit;border:2px solid #1a1226;background:#f4ead2;color:#3a2433;border-radius:999px;box-shadow:0 3px 0 #1a1226;transition:transform .12s}
.fd-tabs button:active{transform:translateY(2px);box-shadow:0 1px 0 #1a1226}.fd-tabs button.on{background:#f2b94a;color:#3a2433}
.fd-tabs .fd-title{margin:0 auto 0 8px;color:#f4ead2;font-weight:800;letter-spacing:.5px;align-self:center;font-size:18px}
.fx-wrap{display:grid;grid-template-columns:76px minmax(0,1.25fr) minmax(0,1fr);grid-template-rows:auto auto;gap:10px;background:#fbf1da;border-radius:16px;padding:10px;
  background-image:radial-gradient(rgba(160,110,60,.08) 1px,transparent 1.5px);background-size:9px 9px;box-shadow:inset 0 0 0 2px #d9bf8c}
.fx-team{grid-row:1/3;display:flex;flex-direction:column;gap:8px;overflow:auto}
.fx-av{width:64px;height:64px;border-radius:50%;border:3px solid #d9bf8c;background:#fff8ea;padding:0;transition:transform .2s cubic-bezier(.3,1.6,.6,1)}
.fx-av img{width:56px;height:56px;image-rendering:pixelated}.fx-av:hover{transform:scale(1.08)}.fx-av.on{border-color:#e0743a;background:#ffe3c2;transform:scale(1.1);box-shadow:0 0 0 3px #fff3d6}
.fx-stage{position:relative;min-height:250px;border-radius:14px;overflow:hidden;background:linear-gradient(#bfe3f0 0,#e2f2df 58%,#cfe6a8 58%)}
.fx-sun{position:absolute;right:18px;top:14px;width:46px;height:46px;border-radius:50%;background:#ffe08a;box-shadow:0 0 0 8px rgba(255,224,138,.35);animation:fxsun 6s ease-in-out infinite}
.fx-blanket{position:absolute;left:12%;right:12%;bottom:10px;height:34%;border-radius:50%;background:repeating-linear-gradient(90deg,rgba(224,90,90,.75) 0 14px,transparent 14px 28px),repeating-linear-gradient(0deg,rgba(224,90,90,.75) 0 14px,#fff1e2 14px 28px);transform:perspective(160px) rotateX(48deg);box-shadow:0 4px 0 #b84a4a}
.fx-monwrap{position:absolute;left:50%;bottom:22%;width:176px;height:176px;margin-left:-88px;transform-origin:50% 100%}
.fx-mon{position:absolute;inset:0;width:176px;height:176px;image-rendering:pixelated;transform-origin:50% 100%;animation:fxbreathe 2.4s ease-in-out infinite;transition:transform .25s}
.fx-wrap.busy .fx-mon{animation:none}.fx-mon.turn{transform:scaleX(-1) rotate(-4deg);filter:saturate(.8)}
.fx-shadow{position:absolute;left:30px;right:30px;bottom:-6px;height:18px;border-radius:50%;background:rgba(60,30,20,.25)}
.fx-mouth{position:absolute;left:50%;top:52%;width:12px;height:12px;margin-left:-6px}
.fx-quip{position:absolute;left:50%;top:12px;transform:translateX(-50%) scale(.6);max-width:78%;background:#fff;border:3px solid #3a2433;border-radius:16px;padding:6px 12px;font-weight:700;font-size:15px;color:#3a2433;opacity:0;text-align:center;z-index:3}
.fx-quip::after{content:"";position:absolute;left:50%;bottom:-11px;margin-left:-8px;border:8px solid transparent;border-top-color:#3a2433}
.fx-quip.show{animation:fxpopin .35s cubic-bezier(.3,1.6,.5,1) forwards}
.fx-belly{position:absolute;right:10px;bottom:10px;width:84px;text-align:center;color:#3a2433;font-size:12px;font-weight:700;z-index:2}
.fx-bowl{width:84px;height:68px;display:block;filter:drop-shadow(0 3px 0 rgba(58,36,51,.25))}.fx-bn{position:absolute;left:0;right:0;top:30px;font-size:16px;color:#fff;text-shadow:0 1px 0 #5a3424,0 0 4px #5a3424}
.fx-belly .fx-soup,.fx-belly .fx-soup-next,.fx-belly .fx-wave{transition:y .8s cubic-bezier(.34,1.56,.64,1)}
.fx-belly.slosh .fx-bowl{animation:fxslosh .7s ease}.fx-wave{animation:fxwave 1.6s linear infinite}
.fx-tag{position:absolute;left:10px;bottom:10px;z-index:2;display:flex;flex-direction:column;gap:3px;align-items:flex-start}
.fx-tag b{background:#3a2433;color:#f4ead2;padding:3px 10px;border-radius:999px;font-size:15px}
.fx-chip{background:#fff8ea;border:2px solid #d9bf8c;border-radius:999px;padding:1px 8px;font-size:12px;font-weight:700;color:#5a3a20}.fx-chip.like{border-color:#e0743a;color:#b24a20}.fx-chip.dislike{border-color:#8f9a6a;color:#5a6a3a}
.fx-bars{grid-column:2;background:#fff8ea;border:2px solid #d9bf8c;border-radius:14px;padding:8px 10px}
.fx-row{position:relative;display:grid;grid-template-columns:56px 1fr 58px 58px;gap:8px;align-items:center;margin:4px 0;font-size:13px;font-weight:700;color:#3a2433}
.fx-bar{position:relative;height:14px;border-radius:999px;background:#ecdcb8;box-shadow:inset 0 2px 0 rgba(0,0,0,.08);overflow:hidden}
.fx-bar i{position:absolute;top:0;bottom:0;left:0;border-radius:999px}.fx-bar .cur{background:linear-gradient(#8fc25a,#5f9a35);box-shadow:inset 0 -3px 0 rgba(0,0,0,.12),inset 0 3px 0 rgba(255,255,255,.35)}
.fx-bar .up{background:repeating-linear-gradient(45deg,#c8ee8a 0 5px,#b2e070 5px 10px);border-radius:0 999px 999px 0;animation:fxblink 1s ease-in-out infinite}.fx-bar .down{background:#ef8f7a}
.fx-bar s{position:absolute;top:3px;bottom:3px;width:2px;background:rgba(58,36,51,.12)}.fx-bar .lock{right:0;background:repeating-linear-gradient(45deg,#d8c8a8 0 4px,#c8b898 4px 8px);border-radius:0}
.fx-row.misfit{opacity:.5}.fx-row.maxed .cur{background:linear-gradient(#ffd56a,#f0a830)}
.fx-val b{margin-left:4px;font-size:12px}.pos{color:#3f7a2a}.neg{color:#c0402a}
.fx-stg{font-size:11px;padding:2px 6px;border-radius:999px;text-align:center;background:#efe1c4}.fx-stg.s1{background:#dbeec0}.fx-stg.s2{background:#b8e090}.fx-stg.s3{background:#ffd56a}
.fx-total{font-size:12px;color:#7a5a3a;text-align:right;font-weight:700}
.fx-row.popup .fx-bar{animation:fxpop .45s cubic-bezier(.3,1.8,.5,1)}.fx-row.popdown .fx-bar{animation:fxshake .35s}
.fx-float{position:absolute;right:62px;top:-6px;font-style:normal;font-weight:900;font-size:16px;animation:fxfloat 1.1s ease-out forwards;pointer-events:none}
.fx-row.fanfare{animation:fxglow 1.2s ease 2}.fx-row.fanfare .fx-stg{animation:fxpop .5s cubic-bezier(.3,1.8,.5,1) 3}
.fx-basket{grid-column:3;grid-row:1/3;display:flex;flex-direction:column;gap:8px;min-height:0}
.fx-basket h3{margin:0;font-size:16px;color:#3a2433}
.fx-fruits{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;overflow:auto;padding:3px;align-content:start;
  background:#e9c995;border-radius:14px;box-shadow:inset 0 0 0 3px #b98a50;background-image:repeating-linear-gradient(45deg,rgba(150,100,50,.18) 0 6px,transparent 6px 12px)}
.fx-fruit{position:relative;display:grid;grid-template-columns:40px 1fr auto;grid-template-rows:auto auto;column-gap:4px;text-align:left;border:2px solid #b98a50;border-radius:12px;background:#fff8ea;padding:4px 7px;font-family:inherit;color:#3a2433;
  animation:fxin .4s cubic-bezier(.3,1.6,.5,1) both;animation-delay:var(--d);transition:transform .15s,box-shadow .15s}
.fx-fruit .fd-ico{grid-row:span 2;width:40px;height:40px;transform-origin:50% 90%}.fx-fruit:hover .fd-ico,.fx-fruit:focus-visible .fd-ico{animation:fxjiggle .5s ease}
.fx-fruit:hover{transform:translateY(-2px);box-shadow:0 4px 0 #b98a50}.fx-fruit.on{border-color:#e0743a;background:#ffe9cc;box-shadow:0 0 0 3px #fff3d6,0 4px 0 #e0743a;transform:translateY(-2px)}
.fx-fruit.on .fd-ico{animation:fxbob 1.2s ease-in-out infinite}.fx-fruit .nm{font-weight:800;font-size:13px;align-self:end}.fx-fruit .tg{font-size:11px;color:#7a5a3a}
.fx-fruit .ct{grid-row:span 2;align-self:center;background:#3a2433;color:#f4ead2;border-radius:999px;font-size:12px;font-weight:800;padding:1px 7px}
.fx-msg{min-height:20px;font-size:13px;font-weight:700;color:#5a3a20}.fx-msg.warn{color:#b0402a}
.fx-go{padding:12px;font:800 18px inherit;font-family:inherit;border-radius:999px;border:3px solid #1a1226;background:#f2b94a;color:#3a2433;box-shadow:0 4px 0 #1a1226;transition:transform .1s}
.fx-go:not(:disabled):hover{transform:translateY(-1px) scale(1.02)}.fx-go:active{transform:translateY(3px);box-shadow:0 1px 0 #1a1226}.fx-go:disabled{opacity:.45}
.fx-wrap.busy .fx-go,.fx-wrap.busy .fx-fruit,.fx-wrap.busy .fx-av{pointer-events:none}
.fx-rita{display:flex;gap:6px;align-items:center;font-size:12px;color:#3a2433;background:#e8f1ff;border:2px dashed #7aa0d0;border-radius:12px;padding:4px 8px}.fx-rita i{font-style:normal;font-weight:900;background:#7aa0d0;color:#fff;border-radius:50%;width:20px;height:20px;display:grid;place-items:center;flex:none}
.fx-empty{grid-column:1/-1;padding:16px;text-align:center;font-weight:700}
.fx-flyer{position:fixed;z-index:200;pointer-events:none}.fx-flyer .fd-ico{width:100%;height:100%}
.fx-crumb{position:absolute;left:0;top:0;width:6px;height:6px;border-radius:2px;animation:fxcrumb .7s cubic-bezier(.2,.6,.4,1) forwards}
.fx-spark,.fx-heart,.fx-puff,.fx-star{position:absolute;left:50%;top:40%;font-style:normal;pointer-events:none;z-index:4}
.fx-spark{color:#ffd23a;font-size:20px;text-shadow:0 0 6px #fff;animation:fxspark .8s ease-out both}
.fx-heart{color:#ef5a7a;font-size:28px;top:10%;animation:fxheart 1.2s ease-out both}
.fx-puff{width:22px;height:22px;border-radius:50%;opacity:.7;top:30%;animation:fxpuff .9s ease-out both}
.fx-star{color:#f0a830;font-size:16px;left:60px;top:0;animation:fxspark .9s ease-out both}
@keyframes fxbreathe{50%{transform:scale(1.03,.97)}}@keyframes fxsun{50%{transform:scale(1.08)}}
@keyframes fxpopin{from{opacity:0;transform:translateX(-50%) scale(.5)}to{opacity:1;transform:translateX(-50%) scale(1)}}
@keyframes fxjiggle{20%{transform:rotate(-12deg) scale(1.1)}45%{transform:rotate(10deg) scale(1.05)}70%{transform:rotate(-5deg)}100%{transform:none}}
@keyframes fxbob{50%{transform:translateY(-4px) rotate(4deg)}}@keyframes fxin{from{opacity:0;transform:scale(.6)}}
@keyframes fxblink{50%{opacity:.55}}@keyframes fxpop{40%{transform:scaleY(1.6)}70%{transform:scaleY(.85)}}@keyframes fxshake{25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
@keyframes fxfloat{from{opacity:0;transform:translateY(6px) scale(.6)}25%{opacity:1;transform:translateY(-4px) scale(1.25)}to{opacity:0;transform:translateY(-22px)}}
@keyframes fxglow{50%{background:#fff1c0;box-shadow:0 0 0 4px #ffd56a;border-radius:8px}}
@keyframes fxslosh{30%{transform:rotate(-6deg) scale(1.06)}60%{transform:rotate(4deg)}}@keyframes fxwave{to{transform:translateX(-32px)}}
@keyframes fxcrumb{from{transform:translate(0,0)}to{transform:translate(var(--x),var(--y)) rotate(var(--r));opacity:0}}
@keyframes fxspark{from{transform:translate(0,0) scale(.2);opacity:0}30%{opacity:1}to{transform:translate(var(--x),var(--y)) scale(1);opacity:0}}
@keyframes fxheart{from{transform:translate(var(--x),20px) scale(.3);opacity:0}30%{opacity:1;transform:translate(var(--x),0) scale(1.2)}to{transform:translate(var(--x),-50px) scale(1);opacity:0}}
@keyframes fxpuff{from{transform:translate(0,0) scale(.4)}to{transform:translate(var(--x),var(--y)) scale(1.6);opacity:0}}
@media (max-height:500px){
  #feeds-ov .fd-box{width:98vw;max-height:98vh;padding:6px;border-radius:16px}#feeds-ov .fd-box::before{inset:4px}
  .fd-tabs{margin-bottom:4px}.fd-tabs button{padding:3px 12px;font-size:13px}.fd-tabs .fd-title{font-size:14px}
  .fx-wrap{grid-template-columns:44px minmax(0,1.15fr) minmax(0,1fr);gap:6px;padding:6px}
  .fx-av{width:40px;height:40px;border-width:2px}.fx-av img{width:34px;height:34px}
  .fx-stage{min-height:150px}.fx-monwrap,.fx-mon{width:112px;height:112px}.fx-monwrap{margin-left:-56px;bottom:14%}
  .fx-sun{width:28px;height:28px;right:8px;top:8px}.fx-quip{font-size:12px;padding:3px 8px;top:6px;border-width:2px}
  .fx-belly{width:58px;right:4px;bottom:4px;font-size:10px}.fx-bowl{width:58px;height:47px}.fx-bn{top:19px;font-size:13px}
  .fx-tag{left:6px;bottom:6px}.fx-tag b{font-size:12px;padding:2px 8px}.fx-chip{font-size:10px}
  .fx-bars{padding:4px 6px;display:grid;grid-template-columns:1fr 1fr;column-gap:10px}.fx-total{grid-column:1/-1}
  .fx-row{grid-template-columns:40px 1fr 30px;gap:4px;margin:2px 0;font-size:11px}.fx-row .fx-stg{display:none}.fx-val b{display:none}.fx-float{right:30px;font-size:13px}
  .fx-basket{gap:4px}.fx-basket h3{font-size:13px}.fx-fruits{gap:4px;max-height:150px}.fx-fruit{grid-template-columns:30px 1fr auto;padding:2px 5px}.fx-fruit .fd-ico{width:30px;height:30px}
  .fx-fruit .nm{font-size:11px}.fx-fruit .tg{font-size:10px}.fx-msg{font-size:11px;min-height:14px}.fx-go{padding:7px;font-size:15px}.fx-rita{font-size:10px;padding:2px 6px}
}
@media (max-width:640px) and (min-height:501px){.fx-wrap{grid-template-columns:1fr}.fx-team{grid-row:auto;flex-direction:row}.fx-bars,.fx-basket{grid-column:auto;grid-row:auto}}
@media (prefers-reduced-motion:reduce){#feeds-ov *{animation:none!important;transition:none!important}}`;
