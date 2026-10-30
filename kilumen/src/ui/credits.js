// Kilumen: credits scroll for the interim ending (src/progression/ending.js). DOM over the canvas, no save while it
// runs (the ending holds the scene script + lockSave('ending')). Skippable: Skip button, Escape / B / Enter, or a
// pad B. Holding A / Space / a touch speeds it up. Reduced motion: no fireflies, no bobbing, same text.
// Text: system_ending.credits_* in text/overworld_lines.json when Text Bot adds it; else CREDIT_FALLBACK (requests in
// data/textbot_requests_interim_ending.md). Player words only: no blocked words (see tests/interim_ending.test.mjs).
import { speciesById, battleSpriteRel } from './data.js?v=v0.2.100-alpha';

const PIX = 'art/characters/pixel/';
const HINT = 'Hold to speed up · Esc twice to skip';
export const TOWNS = ['Fernwick', 'Saltmere', 'Revival Heights', 'Frostspire', 'Mirefen', 'Tidewater Coast', 'Lanternport', 'Cindervale'];

export const CREDIT_FALLBACK = {
  open: ['You did it, {name}.', 'Eight coins. One Ron. A very long week.'],
  team_head: 'The team that got you here',
  coins_head: 'Eight halls, eight coins',
  ron: ['Ron', 'Who lost six times', 'and came along anyway.'],
  rita: ['RITA', 'Who logged every step.', 'Lunch break: still pending.'],
  bin: ['The bin', 'Still waiting.', 'Ron says tomorrow.'],
  crew_head: 'Made with care by',
  crew: [['Dev team', 'Gary Hight']], // Gary, Oct 29 2026: dev team is just Gary Hight, no bot role names
  crew_note: ['Grok Bot was used in the production of this game.'],
  thanks: ['And you.', 'Thank you for playing Kilumen.'],
  end: ['To be continued...', 'Head Office is still up there.'],
};

// Ending 2 (Wellspire, story_beats.md §F7): same roll, own words. Keys system_ending2.credits_*; anything missing falls back
// to CREDIT_FALLBACK2, then to the base CREDIT_FALLBACK (crew + Grok Bot note stay identical: Gary Hight is the dev team).
export const CREDIT_FALLBACK2 = {
  open: ['You did it, {name}.', 'The spring runs again. The field team came home.'],
  coins_head: 'Eight halls, eight coins, one well',
  ron: ['Ron', 'Who kept the thermos warm', 'and asked no questions.'],
  rita: ['RITA', 'Who logged every step.', 'Employee found.'],
  bin: ['Ondravel', 'Who waited a very long time', 'and is not waiting any more.'],
  end: ['The End.', 'The river takes its time. So can you.'],
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

/** Credit text: Text Bot keys first, else fallbacks; {name} etc. filled by the scene. */
export function creditText(scene, variant = null) {
  const out = {}, two = variant === 'ending2';
  for (const [k, fb0] of Object.entries(CREDIT_FALLBACK)) {
    const fb = two && CREDIT_FALLBACK2[k] ? CREDIT_FALLBACK2[k] : fb0;
    const t = two && k !== 'crew' && k !== 'crew_note' ? scene?.text?.(`system_ending2.credits_${k}`) : scene?.text?.(`system_ending.credits_${k}`);
    const v = t == null ? fb : (Array.isArray(t) ? t : t.pages || fb);
    out[k] = typeof v === 'string' ? fill(scene, v) : v.map((x) => (Array.isArray(x) ? x.map((y) => fill(scene, y)) : fill(scene, x)));
  }
  return out;
}
function fill(scene, s) {
  const vars = scene?.textVars?.() || {};
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (k === 'name' ? (vars.player || vars.name || 'you') : vars[k] ?? m)).replace(/, you\./, '.');
}

/** The credits as HTML sections (pure, testable). record = clearRecord() from ending.js. */
export function creditsHtml(t, record) {
  const team = (record?.team || []).map((c, i) => {
    const sp = speciesById(c.species), name = c.nickname || sp.name || cap(c.species);
    return `<figure class="cr-mon" style="--d:${i * 0.35}s"><img alt="" src="${PIX + battleSpriteRel(c.species, 'front', false)}" onerror="this.remove()"><figcaption>${esc(name)}${c.nickname ? `<small>${esc(sp.name)}</small>` : ''}${c.level ? `<small>Lv ${c.level}</small>` : ''}</figcaption></figure>`;
  }).join('');
  const block = (arr, cls = '') => `<section class="cr-sec ${cls}"><h3>${esc(arr[0])}</h3>${arr.slice(1).map((l) => `<p>${esc(l)}</p>`).join('')}</section>`;
  return [
    `<section class="cr-sec cr-title"><h1>KILUMEN</h1>${t.open.map((l) => `<p>${esc(l)}</p>`).join('')}</section>`,
    team ? `<section class="cr-sec"><h2>${esc(t.team_head)}</h2><div class="cr-team">${team}</div></section>` : '',
    `<section class="cr-sec"><h2>${esc(t.coins_head)}</h2><ol class="cr-coins">${TOWNS.map((n, i) => `<li style="--d:${i * 0.2}s"><span class="cr-coin">${i + 1}</span>${esc(n)}</li>`).join('')}</ol></section>`,
    block(t.ron), block(t.rita), block(t.bin, 'cr-small'),
    `<section class="cr-sec"><h2>${esc(t.crew_head)}</h2><dl class="cr-crew">${t.crew.map(([r, n]) => `<dt>${esc(r)}</dt><dd>${esc(n)}</dd>`).join('')}</dl>${(t.crew_note || []).map((l) => `<p class="cr-note">${esc(l)}</p>`).join('')}</section>`,
    `<section class="cr-sec cr-thanks">${t.thanks.map((l, i) => (i ? `<p>${esc(l)}</p>` : `<h2>${esc(l)}</h2>`)).join('')}</section>`,
    `<section class="cr-sec cr-end">${t.end.map((l, i) => (i ? `<p>${esc(l)}</p>` : `<h2>${esc(l)}</h2>`)).join('')}</section>`,
  ].join('');
}

const CSS = `
.cr-wrap{position:fixed;inset:0;z-index:9000;overflow:hidden;background:radial-gradient(ellipse at 50% 120%,#1d3b3a 0%,#0c1420 55%,#05070c 100%);color:#f3ecd8;font-family:inherit;opacity:0;transition:opacity .9s;touch-action:none;user-select:none}
.cr-wrap.on{opacity:1}
.cr-roll{position:absolute;left:50%;top:0;width:min(560px,90vw);transform:translate(-50%,100vh);text-align:center;will-change:transform}
.cr-sec{margin:0 0 22vh}.cr-sec h1{font-size:clamp(40px,9vw,76px);letter-spacing:.18em;margin:0 0 .4em;color:#ffe9a8;text-shadow:0 0 18px #ffcf5a88}
.cr-sec h2{font-size:clamp(20px,4.4vw,30px);color:#ffe2a0;margin:0 0 .7em}.cr-sec h3{font-size:clamp(22px,5vw,32px);margin:0 0 .3em;color:#bfe8ff}
.cr-sec p{font-size:clamp(16px,3.6vw,21px);margin:.25em 0;opacity:.92}.cr-small p{font-size:clamp(14px,3vw,18px);opacity:.75}
.cr-team{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 18px}
.cr-mon{margin:0;width:120px;animation:cr-bob 2.4s ease-in-out infinite;animation-delay:var(--d)}
.cr-mon img{width:112px;height:112px;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(0 6px 6px #0008)}
.cr-mon figcaption{font-size:17px}.cr-mon small{display:block;font-size:13px;opacity:.7}
.cr-coins{list-style:none;padding:0;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;width:fit-content;text-align:left}
.cr-coins li{font-size:clamp(15px,3.4vw,19px);display:flex;align-items:center;gap:10px}
.cr-coin{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff4c2,#e2a93a 60%,#9a6a14);color:#4a2f00;font-weight:700;font-size:14px;box-shadow:0 0 10px #ffcf5a66;animation:cr-glint 3s ease-in-out infinite;animation-delay:var(--d)}
.cr-crew{display:grid;grid-template-columns:auto auto;gap:6px 18px;justify-content:center;margin:0}.cr-crew dt{text-align:right;opacity:.7}.cr-crew dd{margin:0;text-align:left}.cr-note{margin-top:1.2em!important;font-size:clamp(13px,2.8vw,16px)!important;opacity:.7!important}
.cr-end{margin-bottom:45vh}.cr-end h2{font-size:clamp(24px,5vw,36px)}
.cr-skip{position:absolute;right:max(14px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));z-index:2;background:#ffffff1a;color:#f3ecd8;border:1px solid #ffffff40;border-radius:999px;padding:8px 16px;font:inherit;font-size:15px;cursor:pointer}
.cr-hint.arm{opacity:.95;color:#ffe2a0}.cr-hint{position:absolute;left:max(12px,env(safe-area-inset-left));bottom:max(10px,env(safe-area-inset-bottom));font-size:12px;opacity:.45;padding:4px 10px;border-radius:999px;background:rgba(0,0,0,.35)}
.cr-fly{position:absolute;width:5px;height:5px;border-radius:50%;background:#fff6a6;box-shadow:0 0 10px 3px #ffe66d99;opacity:0;animation:cr-fly var(--t) ease-in-out infinite;animation-delay:var(--d)}
@keyframes cr-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes cr-glint{0%,100%{filter:brightness(1)}50%{filter:brightness(1.35)}}
@keyframes cr-fly{0%{opacity:0;transform:translate(0,0)}20%{opacity:.9}50%{opacity:.35;transform:translate(var(--x),-40px)}80%{opacity:.9}100%{opacity:0;transform:translate(calc(var(--x) * -.5),-90px)}}
.ui-reduce .cr-mon,.ui-reduce .cr-coin{animation:none}.ui-reduce .cr-fly{display:none}
`;

/**
 * Show the credits; resolves when they finish or are skipped. opts: {speed px/s (default 46), doc, raf, now}.
 * -> {skipped: boolean}
 */
export function runCredits(scene, record, opts = {}) {
  const doc = opts.doc || globalThis.document;
  if (!doc?.body) return Promise.resolve({ skipped: false, headless: true });
  const q = new URLSearchParams(globalThis.location?.search || '');
  const speed = opts.speed || Number(q.get('creditsSpeed')) || 46;
  if (!doc.getElementById('cr-css')) { const st = doc.createElement('style'); st.id = 'cr-css'; st.textContent = CSS; doc.head.appendChild(st); }
  const wrap = doc.createElement('div'); wrap.className = 'cr-wrap'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-label', 'Credits');
  const reduced = !!doc.body.classList.contains('ui-reduce') || !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) for (let i = 0; i < 26; i++) {
    const f = doc.createElement('i'); f.className = 'cr-fly';
    f.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;top:${(20 + Math.random() * 78).toFixed(1)}%;--t:${(5 + Math.random() * 6).toFixed(1)}s;--d:${(-Math.random() * 8).toFixed(1)}s;--x:${Math.round(Math.random() * 60 - 30)}px`;
    wrap.appendChild(f);
  }
  const roll = doc.createElement('div'); roll.className = 'cr-roll'; roll.innerHTML = creditsHtml(creditText(scene, opts.variant || null), record); wrap.appendChild(roll);
  const skip = doc.createElement('button'); skip.className = 'cr-skip'; skip.textContent = 'Skip ›'; wrap.appendChild(skip);
  const hintTxt = globalThis.matchMedia?.('(pointer: coarse)').matches ? 'Touch and hold to speed up' : HINT;
  const hint = doc.createElement('div'); hint.className = 'cr-hint'; hint.textContent = hintTxt; wrap.appendChild(hint);
  doc.body.appendChild(wrap);
  const raf = opts.raf || globalThis.requestAnimationFrame?.bind(globalThis) || ((f) => setTimeout(() => f(Date.now()), 16));
  scene?.audio?.music?.('title');
  return new Promise((resolve) => {
    let y = 0, last = 0, fast = false, done = false, prevB = false;
    const vh = () => globalThis.innerHeight || 800;
    const finish = (skipped) => {
      if (done) return; done = true;
      removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKeyUp, true);
      wrap.style.opacity = '0';
      setTimeout(() => { wrap.remove(); resolve({ skipped }); }, 700);
      scene?.log?.push({ tick: scene.tick, type: 'credits', skipped });
    };
    // skip needs two presses (a player mashing A / B through Ron's lines must not lose the credits); the button is one tap
    const t0 = Date.now(); let armed = 0;
    const trySkip = () => {
      if (Date.now() - t0 < 1200) return;
      if (armed && Date.now() - armed < 2500) return finish(true);
      armed = Date.now(); hint.textContent = 'Press again to skip'; hint.classList.add('arm');
      setTimeout(() => { if (Date.now() - armed >= 2400) { armed = 0; hint.textContent = hintTxt; hint.classList.remove('arm'); } }, 2500);
    };
    const onKey = (e) => {
      if (e.repeat) { e.preventDefault(); e.stopPropagation(); return; }
      if (['Escape', 'Backspace', 'KeyX', 'Enter'].includes(e.code)) { e.preventDefault(); e.stopPropagation(); trySkip(); }
      else if (['Space', 'KeyZ', 'ArrowDown'].includes(e.code)) { e.preventDefault(); e.stopPropagation(); fast = true; }
    };
    const onKeyUp = (e) => { if (['Space', 'KeyZ', 'ArrowDown'].includes(e.code)) fast = false; };
    addEventListener('keydown', onKey, true); addEventListener('keyup', onKeyUp, true);
    skip.addEventListener('click', (e) => { e.stopPropagation(); finish(true); }); // touch-ok: click handler; document drag guard (installDragGuard, tap_guard.js) swallows the click after a drag / hold; keeps keyboard Enter
    wrap.addEventListener('pointerdown', (e) => { if (e.target !== skip) fast = true; }); // touch-ok: hold to fast-forward the credits; no activation
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) wrap.addEventListener(ev, () => { fast = false; }); // touch-ok: release / cancel bookkeeping or game control, never opens a menu item
    raf(() => wrap.classList.add('on'));
    const tick = (now) => {
      if (done) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
      const pad = globalThis.navigator?.getGamepads?.()?.find?.((g) => g);
      const b = !!pad?.buttons?.[1]?.pressed; if (b && !prevB) trySkip(); prevB = b;
      const a = !!pad?.buttons?.[0]?.pressed;
      y += dt * speed * (fast || a ? 5 : 1);
      roll.style.transform = `translate(-50%, ${(vh() - y).toFixed(1)}px)`;
      if (y > vh() + roll.offsetHeight - vh() * 0.55) { setTimeout(() => finish(false), opts.holdMs ?? 2600); return; } // the last card rests mid-screen, then fades
      raf(tick);
    };
    raf(tick);
  });
}
