// Battle mode switch (Oct 29 2026, Gary: "give players an option in the battle screen to change from the regular to a real
// time battle"). Shared by the turn battle screen (src/battle/ui_sd.js, wild only) and the real-time HUD (src/rtb/view.js):
// one clearly labelled button (>= 44 px touch target, R key), a short flash between modes and a few creature reactions.
const CSS = `
.rtb-mode{position:absolute;z-index:45;top:max(8px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);min-width:44px;min-height:44px;
  padding:6px 14px;border-radius:12px;border:2px solid #fff6;background:linear-gradient(#2b3f6bdd,#182746dd);color:#fff;font:700 15px/1.1 var(--ui-font,"Trebuchet MS",system-ui,sans-serif);
  display:flex;align-items:center;gap:8px;cursor:pointer;pointer-events:auto;box-shadow:0 3px 10px #0007;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.rtb-mode:hover,.rtb-mode:focus-visible{border-color:#ffd65a;outline:none;box-shadow:0 0 0 3px #ffd65a88,0 3px 10px #0007}
.rtb-mode:active{transform:translateX(-50%) scale(.96)}
.rtb-mode.queued{border-color:#ffd65a;animation:rtbQ .5s infinite alternate}
@keyframes rtbQ{to{box-shadow:0 0 0 4px #ffd65a99,0 3px 10px #0007}}
.rtb-mode[disabled]{opacity:.45;cursor:default}
.rtb-mode .ico{font-size:18px}
.rtb-mode kbd{font:600 11px/1 system-ui,sans-serif;padding:2px 5px;border-radius:4px;background:#fff2;border:1px solid #fff4}
body.rtb-touch .rtb-mode kbd,.rtb-mode.touch kbd{display:none}
.rtb-mode.in-rtb{position:fixed}
.rtb-flash{position:fixed;inset:0;z-index:9000;pointer-events:none;display:grid;place-items:center;background:radial-gradient(circle,#fff 0,#fff0 70%);animation:rtbFlash .55s ease-out forwards}
.rtb-flash b{font:900 clamp(26px,6vw,54px)/1 var(--ui-font,"Trebuchet MS",system-ui,sans-serif);color:#fff;letter-spacing:.04em;text-shadow:0 0 12px #3af,0 3px 0 #123a;animation:rtbFlashT .55s ease-out forwards}
.rtb-flash.turn{background:radial-gradient(circle,#fff 0,#fff0 70%)}
.rtb-flash.turn b{text-shadow:0 0 12px #fc6,0 3px 0 #321a}
@keyframes rtbFlash{0%{opacity:0}18%{opacity:1}100%{opacity:0}}
@keyframes rtbFlashT{0%{transform:scale(.6)}25%{transform:scale(1.08)}100%{transform:scale(1)}}
.rtb-flash.rm,.rtb-flash.rm b{animation-duration:.3s}
`;
let cssDone = false;
export function ensureModeCss() {
  if (cssDone || typeof document === 'undefined') return; cssDone = true;
  const s = document.createElement('style'); s.dataset.rtb = 'mode'; s.textContent = CSS; document.head.appendChild(s);
}
export const MODE_LABEL = { rt: 'Real-time', turn: 'Turn-based' };
/** a <button> that switches TO `to` ('rt' | 'turn') */
export function modeButton(to, { touch = false } = {}) {
  ensureModeCss();
  const b = document.createElement('button'); b.type = 'button'; b.className = 'rtb-mode' + (touch ? ' touch' : ''); b.dataset.rtbMode = to;
  b.setAttribute('aria-label', `Switch to ${MODE_LABEL[to].toLowerCase()} battle (R)`);
  b.title = `Switch to ${MODE_LABEL[to].toLowerCase()} battle (R)`;
  b.innerHTML = `<span class="ico" aria-hidden="true">${to === 'rt' ? '⚡' : '⏸'}</span><span>${MODE_LABEL[to]}</span><kbd>R</kbd>`;
  return b;
}
/** short full-screen flash with the new mode's name; resolves when it is gone */
export function modeFlash(to, { reduced = false } = {}) {
  ensureModeCss();
  const d = document.createElement('div'); d.className = `rtb-flash ${to}${reduced ? ' rm' : ''}`; d.setAttribute('aria-live', 'polite');
  d.innerHTML = `<b>${to === 'rt' ? 'Real-time!' : 'Turn-based'}</b>`;
  document.body.appendChild(d);
  return new Promise((r) => setTimeout(() => { d.remove(); r(); }, reduced ? 300 : 550));
}
// creature reactions when the mode changes (player-facing text: keep clear of the blocked-words list)
const TO_RT = ['{a} bounces on the spot, ready to move!', '{a} shakes out its legs. Go time!', '{a} lights up. Now we move!'];
const TO_TURN = ['{a} takes a breath and plants its feet.', '{a} settles in and waits for the call.', '{a} steadies itself. One move at a time.'];
const FOE_RT = ['{f} flinches at the sudden speed!', '{f} bristles and circles!', '{f} looks startled!'];
const FOE_TURN = ['{f} eyes you, waiting.', '{f} catches its breath too.', '{f} holds its ground.'];
const pick = (a, rng) => a[Math.floor(rng() * a.length) % a.length];
export function reactionLines(to, ally, foe, rng = Math.random) {
  const a = (to === 'rt' ? TO_RT : TO_TURN), f = (to === 'rt' ? FOE_RT : FOE_TURN);
  return { ally: pick(a, rng).replace('{a}', ally || 'Your partner'), foe: pick(f, rng).replace('{f}', foe || 'The wild creature') };
}
/** short shouts for over-the-head bubbles in the real-time view */
export const SHOUT = { ally: ['Let\'s go!', 'Ready!', 'Yes!'], foe: ['?!', 'Grr!', '!!'] };
