// Opening v2 scripted battle (opening_v2.js): the wild cute Kilu on the far pad, the player's back on the near pad of the
// grass battle backdrop (art/world/battle_bg.webp, pads drawn in the art), one move "Offer company feed" that always works.
// Stage = the 16:9 backdrop scaled to cover and anchored to the bottom (sky crops first), so both pads stay on screen on PC
// (16:9) and phone (20:9); sprites are placed in stage % so their feet sit on the pads. Rain layer + grey tint on top
// (it is raining in the scene). Input: Enter / Space / Z, or a short tap (tap_guard: a drag never fires).
import { onTap } from '../shared/tap_guard.js?v=v0.2.113-alpha';

export const FEED_PADS = Object.freeze({ near: { x: 26.5, y: 77 }, far: { x: 74, y: 67.5 } }); // % of the 2560x1440 backdrop
const BACK = { male: 'art/characters/pixel/capture_poses/player/cal_back_capture_lowered.png', female: 'art/characters/pixel/npcs/vil_commuter_f/vil_commuter_f_back_battle.png' }; // female: vil_commuter_f back view, 64x96 like Cal's (fix1)

const CSS = `.open2-feed{position:fixed;inset:0;z-index:55;overflow:hidden;background:#000;touch-action:pan-y;font-family:var(--ui-font,inherit);color:#1b2233}
.open2-feed .stage{position:absolute;left:50%;bottom:0;width:max(100vw,calc(100vh*16/9));aspect-ratio:16/9;transform:translateX(-50%);background:url(art/world/battle_bg.webp) center/100% 100% no-repeat}
.open2-feed .tint{position:absolute;inset:0;background:rgb(30,40,64);opacity:.28}
.open2-feed > .wx{position:absolute}
.open2-feed .mon{position:absolute;transform:translate(-50%,-100%);image-rendering:pixelated;transform-origin:50% 100%}
.open2-feed .foe{height:27%;animation:o2in .6s ease-out both}
.open2-feed .ally{height:33%;animation:o2inL .6s ease-out both}
.open2-feed .foe.happy{animation:o2hop .45s ease-in-out 3}
@keyframes o2in{from{transform:translate(40%,-100%);opacity:0}}
@keyframes o2inL{from{transform:translate(-160%,-100%);opacity:0}}
@keyframes o2hop{50%{transform:translate(-50%,-112%)}}
.open2-feed .heart{position:absolute;transform:translate(-50%,-100%);color:#ff6f9c;font-size:clamp(20px,4vh,40px);animation:o2heart 1.2s ease-out forwards;text-shadow:0 2px 0 #7a2340}
@keyframes o2heart{to{transform:translate(-50%,-260%);opacity:0}}
.open2-feed .plate{position:absolute;left:3vw;top:4vh;min-width:min(42vw,340px);background:#f6f1e3;border:3px solid #2c3550;border-radius:12px;padding:8px 14px;box-shadow:0 4px 0 #0005}
.open2-feed .plate .nm{display:flex;justify-content:space-between;gap:12px;font-size:clamp(15px,2.6vh,22px);font-weight:700}
.open2-feed .plate .hp{height:8px;margin-top:6px;border-radius:4px;background:#2c3550;overflow:hidden}.open2-feed .plate .hp i{display:block;height:100%;width:100%;background:#58c46a}
.open2-feed .box{position:absolute;left:2vw;right:2vw;bottom:2vh;min-height:16vh;background:#f6f1e3;border:3px solid #2c3550;border-radius:14px;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:16px;box-shadow:0 4px 0 #0006}
.open2-feed .txt{font-size:clamp(16px,3vh,26px);line-height:1.3}
.open2-feed .move{font:inherit;font-size:clamp(16px,2.8vh,24px);padding:10px 20px;border-radius:12px;border:3px solid #2c3550;background:#ffd66b;color:#1b2233;cursor:pointer;white-space:nowrap}
.open2-feed .move:focus-visible,.open2-feed .move.sel{box-shadow:0 0 0 4px #4692ce}
.open2-feed .more{font-size:clamp(14px,2.4vh,20px);opacity:.7;animation:o2b 1s steps(2) infinite}@keyframes o2b{50%{opacity:0}}`;

/** Resolves once the feed lands and the last line is read. lines: { appear[], move, used[], success[] }. */
export function runFeedBattle({ scene, species, level = 3, name, model = 'male', lines }) {
  const doc = document;
  if (!doc.getElementById('open2-feed-css')) { const st = doc.createElement('style'); st.id = 'open2-feed-css'; st.textContent = CSS; doc.head.appendChild(st); }
  const root = doc.createElement('div'); root.className = 'open2-feed'; root.dataset.engine = 'sd'; root.dataset.step = 'appear';
  const foeSrc = `art/characters/pixel/creatures/${species}/battle/${species}_front_128_2x.png`;
  const P = FEED_PADS;
  root.innerHTML = `<div class="stage"><img class="mon foe" alt="${name}" src="${foeSrc}" style="left:${P.far.x}%;top:${P.far.y + 2}%"><img class="mon ally" alt="" src="${BACK[model] || BACK.male}" style="left:${P.near.x}%;top:${P.near.y + 3}%"><div class="tint"></div></div>
    <div class="plate"><div class="nm"><span>${name}</span><span>Lv${level}</span></div><div class="hp"><i></i></div></div>
    <div class="box"><div class="txt"></div><div class="act"></div></div>`;
  doc.body.appendChild(root);
  import('../region56/weather_lite.js?v=v0.2.113-alpha').then((m) => { if (root.isConnected) root._wx = m.mountWeather(root, { before: root.querySelector('.plate'), weather: 'rain' }); }).catch(() => {});
  const txt = root.querySelector('.txt'), act = root.querySelector('.act'), stage = root.querySelector('.stage');
  const ui = globalThis.kilumen?.ui; if (ui) ui._open2 = true;
  scene?.audio?.sfx?.('encounter');
  return new Promise((resolve) => {
    let queue = [], onDone = null, armed = false;
    const arm = () => { armed = false; setTimeout(() => { armed = true; }, 220); };
    const show = (pages, then) => { queue = [...pages]; onDone = then; next(); };
    function next() {
      if (!queue.length) { const f = onDone; onDone = null; f?.(); return; }
      txt.textContent = queue.shift(); act.innerHTML = '<span class="more">&#9660;</span>'; arm();
    }
    const menu = () => {
      root.dataset.step = 'menu'; txt.textContent = `What will ${scene?.config?.playerName || 'you'} do?`;
      act.innerHTML = `<button class="move sel">${lines.move}</button>`; onDone = null; queue = []; arm();
    };
    const feed = () => {
      root.dataset.step = 'feed';
      show(lines.used, () => {
        const foe = stage.querySelector('.foe'); foe.classList.add('happy');
        for (let i = 0; i < 3; i++) setTimeout(() => { const h = doc.createElement('div'); h.className = 'heart'; h.textContent = '\u2665';
          h.style.left = `${P.far.x - 3 + i * 3}%`; h.style.top = `${P.far.y - 22}%`; stage.appendChild(h); }, i * 220);
        scene?.audio?.sfx?.('heal');
        root.dataset.step = 'success';
        show(lines.success, close);
      });
    };
    const close = () => { offs.forEach((f) => f()); root._wx?.destroy?.(); root.remove(); if (ui) ui._open2 = false; resolve(true); };
    const press = () => {
      if (!armed) return;
      if (root.dataset.step === 'menu') { feed(); return; }
      next();
    };
    const key = (e) => { e.stopPropagation(); if (/^(Enter| |z|Z)$/.test(e.key)) { e.preventDefault(); if (!e.repeat) press(); } }; // the game never sees keys here
    window.addEventListener('keydown', key, true);
    const offs = [onTap(root, null, () => press()), () => window.removeEventListener('keydown', key, true)];
    show(lines.appear, menu);
  });
}
