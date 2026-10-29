// rtb view (DEV ONLY prototype, Oct 29 2026): draws the fight on a canvas laid over the overworld canvas (same camera:
// screen = (world - cam) * zoom, as src/overworld/overworld.js view()), plus a small DOM HUD. All the "juice" lives here:
// hitstop, shake, white hit flash, knockback dust, damage numbers, element sparks, telegraph wedges, "!" alerts, faint poof,
// crystal pulses, level-up column, start/end banners. Reduced motion (?rm=1 / prefers-reduced-motion): no shake, no flashes, fewer particles.
import { displayName } from '../systems/creature.js?v=v0.2.68-alpha';
import { SHAPE_STATS } from './moves.js?v=v0.2.68-alpha';
import { RT } from './sim.js?v=v0.2.68-alpha';
import { loadFx } from '../ui/hit_fx.js?v=v0.2.68-alpha';
import { CT, ct, BAND_COLOR } from './capture.js?v=v0.2.68-alpha';
// crystal icon (inline, no asset): a faceted gem
export const GEM_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 9 12 22 4 9Z" fill="#bff6ff"/><path d="M12 2 16 9 12 22 8 9Z" fill="#7fe3ff"/><path d="M4 9h16L12 22Z" fill="#4fc7ef" opacity=".55"/><path d="M12 2 8 9h8Z" fill="#fff" opacity=".8"/></svg>';

export const EL_COLOR = { fire: '#ff7a2f', magma: '#ff5a1f', water: '#3fa9ff', freshwater: '#5cc3ff', sea: '#2f86ff', earth: '#c9935a', grass: '#62d65a',
  bug: '#a6d93d', wind: '#c6ecff', bird: '#d6e6ff', light: '#fff1a0', angelic: '#ffe6c2', god: '#ffe08a', dark: '#9a6bff', ghost: '#b796ff', demon: '#ff4f7a',
  devil: '#ff3b3b', mystic: '#ff86e6', spirit: '#93f3ff', dragos: '#7affc6', normal: '#f4f4f4' };
const col = (el) => EL_COLOR[el] || '#ffffff';
const TILE = 64;

const CSS = `
.rtb-hud{position:fixed;inset:0;pointer-events:none;z-index:40;font-family:var(--ui-font, "Trebuchet MS", system-ui, sans-serif);color:#fff;-webkit-user-select:none;user-select:none}
.rtb-hud *{box-sizing:border-box}
.rtb-plates{position:absolute;left:12px;top:12px;display:flex;flex-direction:column;gap:6px}
.rtb-plate{min-width:210px;background:rgba(14,18,30,.82);border:2px solid rgba(255,255,255,.18);border-radius:10px;padding:6px 10px;transition:opacity .3s,transform .3s}
.rtb-plate.gone{opacity:.25;transform:translateX(-8px)}
.rtb-plate.lock{border-color:#ffd25a;box-shadow:0 0 0 2px rgba(255,210,90,.35)}
.rtb-nm{display:flex;justify-content:space-between;gap:10px;font-size:15px;font-weight:700;text-shadow:0 1px 0 #000}
.rtb-bar{height:8px;background:rgba(0,0,0,.55);border-radius:4px;overflow:hidden;margin-top:4px;position:relative}
.rtb-bar>i{position:absolute;inset:0 auto 0 0;background:#5be37a;border-radius:4px;transition:width .18s}
.rtb-bar>b{position:absolute;inset:0 auto 0 0;background:#fff;opacity:.7;border-radius:4px;transition:width .6s .25s}
.rtb-bar.mid>i{background:#ffd34d}.rtb-bar.low>i{background:#ff5252}
.rtb-xp{height:4px;margin-top:3px}.rtb-xp>i{background:#6cc8ff}
.rtb-me{position:absolute;right:12px;bottom:12px;width:300px;background:rgba(14,18,30,.86);border:2px solid rgba(255,255,255,.2);border-radius:12px;padding:8px 10px;pointer-events:auto}
.rtb-me.low{animation:rtbLow 0.9s infinite}
@keyframes rtbLow{50%{border-color:#ff5252;box-shadow:0 0 18px rgba(255,60,60,.55)}}
.rtb-sk{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:7px}
.rtb-s{position:relative;min-height:44px;border-radius:8px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.12);padding:4px 7px 4px 10px;overflow:hidden;font-size:13px;line-height:1.15;cursor:pointer;touch-action:none}
.rtb-s .k{position:absolute;right:4px;top:3px;min-width:17px;height:17px;padding:0 3px;border-radius:4px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.4);font:700 11px/15px system-ui,sans-serif;text-align:center;z-index:2}
.rtb-s .k:empty{display:none}
.rtb-s .n{font-weight:700;display:block;padding-right:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rtb-s .e{font-size:11px;opacity:.8}
.rtb-s .el{position:absolute;left:0;top:0;bottom:0;width:4px}
.rtb-s .cd{position:absolute;inset:0;background:conic-gradient(rgba(0,0,0,.6) var(--sw,0deg),transparent 0);pointer-events:none;z-index:1}
.rtb-s.ready{animation:rtbReady .45s ease-out}
@keyframes rtbReady{0%{box-shadow:0 0 0 0 rgba(255,255,255,.9);border-color:#fff}100%{box-shadow:0 0 0 8px rgba(255,255,255,0)}}
.rtb-party{display:flex;gap:4px;margin-top:6px}
.rtb-pi{position:relative;width:38px;height:38px;border-radius:7px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.14);overflow:hidden;cursor:pointer;touch-action:none}
.rtb-pi canvas{position:absolute;left:1px;top:1px;width:32px;height:32px;image-rendering:pixelated}
.rtb-pi.on{border-color:#7dd3ff}.rtb-pi.ko{opacity:.35;filter:grayscale(1)}.rtb-pi.cd:after{content:"";position:absolute;inset:0;background:rgba(0,0,0,.45)}
.rtb-pi.no{animation:rtbNo .3s}@keyframes rtbNo{25%,75%{transform:translateX(-3px)}50%{transform:translateX(3px)}}
.rtb-pi .pk{position:absolute;right:1px;bottom:0;font:700 11px/1 system-ui,sans-serif;text-shadow:0 1px 0 #000,0 0 3px #000;z-index:2}
.rtb-pi .ph{position:absolute;left:2px;right:2px;bottom:2px;height:3px;background:#5be37a;border-radius:2px}
body.rtb-touch .rtb-pi{width:34px;height:34px}body.rtb-touch .rtb-pi .pk{display:none}
.rtb-s.sel{border-color:#ffd25a;background:rgba(255,210,90,.16)}
.rtb-s.empty .e{color:#ff8a8a}
.rtb-s.pop{animation:rtbPop .22s}
@keyframes rtbPop{40%{transform:scale(.93)}}
.rtb-act{position:absolute;right:12px;top:12px;display:flex;gap:6px;pointer-events:auto}
.rtb-b{min-width:64px;min-height:44px;border-radius:10px;background:rgba(14,18,30,.86);border:2px solid rgba(255,255,255,.22);color:#fff;font:inherit;font-size:13px;font-weight:700;padding:4px 10px;touch-action:none}
.rtb-b small{display:block;font-size:10px;opacity:.6;font-weight:400}
.rtb-b[disabled]{opacity:.4}
.rtb-b.hold{background:rgba(255,82,82,.4)}
.rtb-banner{position:absolute;left:50%;top:22%;transform:translate(-50%,-50%) scale(.6);opacity:0;font-size:30px;font-weight:900;letter-spacing:.02em;text-align:center;
  text-shadow:0 3px 0 #000,0 0 16px rgba(0,0,0,.6);transition:opacity .18s,transform .25s cubic-bezier(.2,1.6,.4,1);white-space:nowrap}
.rtb-banner.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
.rtb-banner small{display:block;font-size:16px;font-weight:700;opacity:.9}
.rtb-bars:before,.rtb-bars:after{content:"";position:absolute;left:0;right:0;height:7vh;background:#000;transition:transform .35s ease}
.rtb-bars:before{top:0;transform:translateY(-100%)}.rtb-bars:after{bottom:0;transform:translateY(100%)}
.rtb-bars.on:before,.rtb-bars.on:after{transform:none}
.rtb-vig{position:absolute;inset:0;box-shadow:inset 0 0 140px rgba(255,0,0,0);transition:box-shadow .3s}
.rtb-vig.hurt{box-shadow:inset 0 0 120px rgba(255,0,0,.45)}
.rtb-help{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);font-size:12px;opacity:.75;text-shadow:0 1px 0 #000;white-space:nowrap}
.rtb-fx{position:fixed;pointer-events:none;z-index:39;image-rendering:pixelated}
body.rtb-touch .rtb-me{right:auto;left:50%;transform:translateX(-50%);bottom:6px;width:min(330px,42vw);padding:5px 7px}
body.rtb-touch .rtb-plate{min-width:170px;padding:4px 8px}
body.rtb-touch .rtb-nm{font-size:13px}
body.rtb-touch .rtb-s{font-size:12px}
body.rtb-touch .rtb-help{display:none}
body.rtb-touch .rtb-banner{font-size:22px;top:30%}
.rtb-cap{display:flex;align-items:center;gap:7px;min-width:118px;border-color:#7fe3ff;background:linear-gradient(#1d4a66e6,#0f2a40e6);box-shadow:0 0 0 0 rgba(127,227,255,.6);animation:rtbCapGlow 1.8s ease-in-out infinite}
.rtb-cap .ci{width:22px;height:22px;display:inline-block;animation:rtbGem 1.8s ease-in-out infinite}.rtb-cap .ci svg{width:100%;height:100%}
.rtb-cap .cl{font-size:14px;font-weight:800;letter-spacing:.02em}
.rtb-cap kbd{font:700 11px/1 system-ui,sans-serif;padding:3px 6px;border-radius:5px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.45)}
.rtb-cap .cn{font-style:normal;font-size:11px;opacity:.85;margin-left:auto}
.rtb-cap.open{border-color:#ffd25a;background:linear-gradient(#5a4a1ae6,#3a2c0ae6)}
.rtb-cap[disabled]{animation:none;filter:grayscale(.7)}.rtb-cap[disabled] .ci{animation:none}
.rtb-cap[hidden]{display:none}
@keyframes rtbCapGlow{50%{box-shadow:0 0 14px 2px rgba(127,227,255,.55)}}
@keyframes rtbGem{0%,100%{transform:rotate(-8deg) scale(1)}50%{transform:rotate(8deg) scale(1.12)}}
body.rtb-touch .rtb-cap{position:fixed;right:max(14px,env(safe-area-inset-right));top:42%;width:82px;height:82px;min-width:0;border-radius:50%;flex-direction:column;justify-content:center;gap:2px;padding:4px;border-width:3px}
body.rtb-touch .rtb-cap .ci{width:34px;height:34px}body.rtb-touch .rtb-cap kbd{display:none}body.rtb-touch .rtb-cap .cl{font-size:13px}
body.rtb-touch .rtb-cap .cn{position:absolute;right:-4px;top:-4px;background:#0f2a40;border:2px solid #7fe3ff;border-radius:10px;padding:1px 5px;opacity:1;margin:0}
.rtb-captab{position:absolute;left:50%;bottom:150px;transform:translateX(-50%) scale(.85);opacity:0;width:330px;background:rgba(12,22,36,.93);border:2px solid #7fe3ff;border-radius:14px;padding:9px 10px 7px;pointer-events:auto;transition:opacity .14s,transform .2s cubic-bezier(.2,1.5,.4,1);box-shadow:0 8px 30px rgba(0,0,0,.5),0 0 22px rgba(127,227,255,.25)}
.rtb-captab.on{opacity:1;transform:translateX(-50%) scale(1)}
.rtb-captab h3{margin:0 0 4px;font-size:15px;display:flex;align-items:center;gap:6px}.rtb-captab h3 svg{width:18px;height:18px}
.rtb-captab h3 .sl{margin-left:auto;font-size:10px;font-weight:700;color:#ffd25a;letter-spacing:.05em;text-transform:uppercase;animation:rtbQ2 .8s infinite alternate}
@keyframes rtbQ2{to{opacity:.45}}
.rtb-cf{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}.rtb-cf span{font-size:11px;padding:1px 6px;border-radius:9px;background:rgba(255,255,255,.1)}
.rtb-cf .g{color:#8be37a}.rtb-cf .b{color:#ffa94d}
.rtb-cr{display:grid;grid-template-columns:22px 26px 1fr auto;align-items:center;gap:7px;min-height:44px;padding:4px 7px;margin-top:4px;border-radius:9px;background:rgba(255,255,255,.07);border:2px solid rgba(255,255,255,.1);cursor:pointer;touch-action:none}
.rtb-cr:hover,.rtb-cr.hi{border-color:#7fe3ff;background:rgba(127,227,255,.14)}
.rtb-cr .k{font:700 11px/17px system-ui,sans-serif;text-align:center;border-radius:4px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.4)}
.rtb-cr svg{width:24px;height:24px}.rtb-cr .nm{font-size:13px;font-weight:700;line-height:1.1}.rtb-cr .nm small{display:block;font-weight:400;opacity:.75}
.rtb-cr .od{min-width:70px;text-align:right;font-size:12px;font-weight:800}.rtb-cr .od i{display:block;height:5px;margin-top:3px;border-radius:3px;background:rgba(0,0,0,.5);overflow:hidden}.rtb-cr .od i b{display:block;height:100%;border-radius:3px}
.rtb-ch{font-size:11px;opacity:.7;text-align:center;margin-top:6px}
.rtb-cnone{font-size:13px;opacity:.85;padding:6px 2px}
body.rtb-touch .rtb-cr .k{visibility:hidden}
body.rtb-touch .rtb-captab{bottom:auto;top:50%;transform:translate(-50%,-50%) scale(.85);width:min(360px,60vw)}
body.rtb-touch .rtb-captab.on{transform:translate(-50%,-50%) scale(1)}
.rtb-hud.cap-open .rtb-vig{box-shadow:inset 0 0 160px rgba(60,170,255,.35)}
`;

const hpCls = (f) => (f < 0.25 ? 'low' : f < 0.5 ? 'mid' : '');

export class RtView {
  constructor({ scene, sim, touch, reduced, keyNames }) {
    this.scene = scene; this.sim = sim; this.touch = touch; this.reduced = reduced; this.keyNames = keyNames;
    this.world = scene.canvas || document.getElementById('world');
    this.cv = document.createElement('canvas'); this.cv.className = 'rtb-canvas';
    Object.assign(this.cv.style, { position: 'fixed', pointerEvents: 'none', zIndex: 38, imageRendering: 'pixelated' });
    document.body.appendChild(this.cv); this.ctx = this.cv.getContext('2d');
    if (!document.getElementById('rtb-css')) { const s = document.createElement('style'); s.id = 'rtb-css'; s.textContent = CSS; document.head.appendChild(s); }
    document.body.classList.toggle('rtb-touch', !!touch);
    this.hud = document.createElement('div'); this.hud.className = 'rtb-hud'; this.hud.dataset.rtb = 'hud';
    this.hud.innerHTML = `<div class="rtb-bars"></div><div class="rtb-vig"></div><div class="rtb-plates"></div>
      <div class="rtb-act"><button class="rtb-b" data-rtb="swap">Team<small>${keyNames.swap}</small></button><button class="rtb-b rtb-cap" data-rtb="crystal" aria-label="${CT.button} (${keyNames.crystal || 'tap'})"><span class="ci">${GEM_SVG}</span><span class="cl">${CT.button}</span>${keyNames.crystal ? `<kbd>${keyNames.crystal}</kbd>` : ''}<em class="cn"></em></button><button class="rtb-b" data-rtb="leave">Leave<small>${keyNames.leave}</small></button></div>
      <div class="rtb-me"><div class="rtb-nm"><span data-rtb="aname"></span><span data-rtb="alv"></span></div><div class="rtb-bar" data-rtb="ahp"><b></b><i></i></div>
      <div class="rtb-bar rtb-xp" data-rtb="axp"><i></i></div><div class="rtb-sk"></div><div class="rtb-party" data-rtb="party"></div></div>
      <div class="rtb-captab" data-rtb="captab" hidden></div><div class="rtb-banner"></div><div class="rtb-help">${keyNames.help}</div>`;
    document.body.appendChild(this.hud);
    this.$ = (s) => this.hud.querySelector(s);
    this.parts = []; this.nums = []; this.rings = []; this.trails = new WeakMap(); this.gone = new Map(); this.shake = 0; this.shakeX = 0; this.shakeY = 0;
    this.sheets = new Map(); this.flashC = document.createElement('canvas'); this.flashC.width = this.flashC.height = 64;
    this.bannerT = 0; this.bubbles = []; this.t = 0; this.allyKey = null;
    requestAnimationFrame(() => this.$('.rtb-bars').classList.add('on'));
  }
  sheet(sp) {
    if (!this.sheets.has(sp)) { const im = new Image(); im.src = `${this.scene.config?.pixelDir || 'art/characters/pixel/'}creatures/${sp}/overworld/${sp}_ow_sheet.png`; this.sheets.set(sp, im); }
    const im = this.sheets.get(sp); return im.complete && im.naturalWidth ? im : null;
  }
  banner(text, sub = '', ms = 1300) {
    const b = this.$('.rtb-banner'); b.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`; b.classList.add('on');
    clearTimeout(this._bt); this._bt = setTimeout(() => b.classList.remove('on'), ms);
  }
  num(x, y, text, color = '#fff', big = false) { this.nums.push({ x, y, text, color, big, t: 0, vx: (Math.random() - 0.5) * 30 }); }
  burst(x, y, color, n = 10, speed = 160, life = 0.45, size = 3) {
    if (this.reduced) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = speed * (0.35 + Math.random() * 0.65); this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, t: 0, life: life * (0.6 + Math.random() * 0.6), color, size }); }
  }
  kick(amount) { if (!this.reduced) this.shake = Math.max(this.shake, amount); }
  async impactArt(el, x, y) {
    const fx = await loadFx(el, 'impact').catch(() => null); if (!fx || !this.cv.isConnected) return;
    const { z, rect, k: css } = this.geom(), m = fx.meta, scale = (TILE * 1.7 * z * css) / m.frame_w;
    const img = document.createElement('img'); img.className = 'rtb-fx'; img.src = URL.createObjectURL(fx.blob);
    const sx = rect.left + (x - this.cam.x) * z * css, sy = rect.top + (y - 20 - this.cam.y) * z * css;
    Object.assign(img.style, { width: m.frame_w * scale + 'px', height: m.frame_h * scale + 'px', left: sx - m.anchor.x * scale + 'px', top: sy - m.anchor.y * scale + 'px' });
    document.body.appendChild(img); setTimeout(() => { img.remove(); URL.revokeObjectURL(img.src); }, m.total_ms);
  }
  geom() {
    const sc = this.scene, z = sc.zoom || 1, rect = this.world.getBoundingClientRect();
    return { z, rect, k: rect.width / (this.world.width || 1) };
  }

  /** sim events -> juice. Returns the hitstop (s) and time-scale request for the loop. */
  onEvents(evs) {
    let stop = 0, slow = null;
    const name = (f) => displayName(f.c);
    for (const e of evs) {
      const f = e.who;
      switch (e.type) {
        case 'alert': this.bubbles.push({ who: f, text: '!', t: 0, life: 0.8, color: '#ffdf4a' }); break;
        case 'telegraph': f.tele = { total: e.time, aim: e.aim, shape: e.shape, el: e.el }; break;
        case 'windup': this.burst(f.x, f.y - 10, col(e.el), 4, 60, 0.25, 2); break;
        case 'cast': f.tele = null; f.castT = 0.12; this.scene.audio?.sfx(f.side === 'ally' ? 'select' : 'cursor');
          if (e.shape === 'slam') this.rings.push({ x: f.x, y: f.y + 8, r0: 10, r1: SHAPE_STATS.slam.range, t: 0, life: 0.3, color: col(e.el) });
          if (e.shape === 'melee' || e.shape === 'cone') this.rings.push({ x: f.x, y: f.y - 8, arc: true, dir: e.dir, r0: 12, r1: SHAPE_STATS[e.shape].range, span: SHAPE_STATS[e.shape].arc, t: 0, life: 0.18, color: col(e.el) });
          if (e.shape === 'dash') this.burst(f.x, f.y + 14, '#d9c9a3', 6, 90, 0.35, 3);
          break;
        case 'hit': {
          const strong = e.mult > 1, weak = e.mult < 1;
          this.num(e.x, e.y - 46, String(e.dmg), strong ? '#ffb13b' : weak ? '#b8c4d6' : '#ffffff', strong || e.crit);
          if (e.mult === 0) this.num(e.x, e.y - 66, 'No effect', '#b8c4d6');
          else if (strong) this.num(e.x, e.y - 68, 'Strong!', '#ffb13b');
          else if (weak) this.num(e.x, e.y - 68, 'Weak...', '#b8c4d6');
          if (e.crit) this.num(e.x, e.y - 86, 'Clean strike!', '#fff38a', true);
          this.burst(e.x, e.y - 12, col(e.el), strong || e.crit ? 18 : 10, strong ? 240 : 170);
          this.impactArt(e.el, e.x, e.y);
          stop = Math.max(stop, e.crit || strong ? 0.11 : 0.065);
          this.kick(f.side === 'ally' ? 7 : e.crit || strong ? 6 : 3);
          if (f.side === 'ally') { this.$('.rtb-vig').classList.add('hurt'); clearTimeout(this._vt); this._vt = setTimeout(() => this.$('.rtb-vig').classList.remove('hurt'), 260); this.scene.audio?.sfx('back'); }
          if (e.flinch && f.side === 'foe') this.bubbles.push({ who: f, text: '!?', t: 0, life: 0.5, color: '#ffffff' });
          break;
        }
        case 'interrupt': f.tele = null; this.num(f.x, f.y - 80, 'Broken!', '#ffffff'); break;
        case 'dodge': this.burst(f.x, f.y + 16, '#e8dcc0', 6, 80, 0.3, 3); f.ghost = { t: 0, dx: e.dx, dy: e.dy }; break;
        case 'dodged': this.num(f.x, f.y - 60, 'Dodged', '#9ff0ff'); break;
        case 'nearmiss': this.num(f.x, f.y - 60, 'Close!', '#9ff0ff', true); stop = Math.max(stop, 0.05); break;
        case 'fizzle': this.burst(e.x, e.y, col(e.el), 5, 70, 0.25, 2); break;
        case 'splash': this.rings.push({ x: e.x, y: e.y, r0: 6, r1: e.r, t: 0, life: 0.3, color: col(e.el) }); this.burst(e.x, e.y, col(e.el), 10, 150); break;
        case 'heal': this.num(f.x, f.y - 50, `+${e.n}`, '#7dff9a', true); this.burst(f.x, f.y - 10, '#7dff9a', 12, 90, 0.7, 3); break;
        case 'boost': this.num(f.x, f.y - 60, Object.keys(e.boosts).map((k) => ({ atk: 'Might', def: 'Guard', spa: 'Focus', spd: 'Resolve', spe: 'Agility', evasion: 'Evasion' }[k] || k) + ' up').join(' '), '#9fd8ff'); break;
        case 'status': this.num(f.x, f.y - 64, e.status === 'drowsy' ? 'Drowsy' : 'Scorched', e.status === 'drowsy' ? '#c6b6ff' : '#ff9a5a'); break;
        case 'overuse': this.num(f.x, f.y - 70, 'No Energy, strained!', '#ff8a8a'); break;
        case 'faint':
          this.gone.set(f, { t: 0 }); this.burst(e.x, e.y - 10, '#ffffff', 22, 220, 0.7, 4); stop = Math.max(stop, 0.12); this.kick(8);
          if (f.side === 'foe') { this.banner(`${name(f)} fainted!`, '', 1100); if (!this.sim.living.length) slow = { scale: 0.35, time: 0.7 }; }
          else this.banner(`${name(f)} fainted...`, this.sim.party.some((c) => c.hp > 0) ? 'Next one up!' : '', 1400);
          break;
        case 'xp': this.num(f.x, f.y - 74, `+${e.n} XP`, '#6cc8ff'); break;
        case 'levelup': this.banner(`${name(f)} grew to Lv ${e.level}!`, '', 1500); this.rings.push({ x: f.x, y: f.y, column: true, t: 0, life: 0.9, color: '#ffe27a' }); this.burst(f.x, f.y - 20, '#ffe27a', 24, 140, 0.9, 3); break;
        case 'swap': this.banner(`Go, ${name(e.to)}!`, '', 900); this.burst(e.to.x, e.to.y - 10, '#ffffff', 16, 150, 0.5, 3); this.gone.delete(e.to); break;
        case 'crystalCast': this.num(f.x, f.y - 60, CT.launch, '#bff6ff'); this.burst(f.x, f.y - 14, '#e9fdff', 8, 110, 0.35, 2); this.scene.audio?.sfx('select'); break;
        case 'crystalMiss': this.burst(e.x, e.y, '#bff6ff', 8, 90, 0.4, 2); this.num(e.x, e.y - 20, CT.missed, '#bff6ff'); break;
        case 'crystalHit': this.rings.push({ x: f.x, y: f.y - 10, r0: 60, r1: 24, t: 0, life: 0.35, color: '#bff6ff' }); stop = Math.max(stop, 0.08);
          this.cap = { foe: f, x: f.x, y: f.y + 6, t: 0, wob: 0, dir: 1, n: 0, end: null }; this.burst(f.x, f.y - 10, '#ffffff', 12, 160, 0.4, 3); break;
        case 'pulse': if (this.cap) { this.cap.wob = 1; this.cap.dir = e.n % 2 ? 1 : -1; this.cap.n = e.n; }
          this.rings.push({ x: f.x, y: f.y - 4, r0: 14, r1: 40, t: 0, life: 0.35, color: '#bff6ff' }); this.kick(2); this.num(f.x, f.y - 50, '.'.repeat(e.n), '#bff6ff'); this.scene.audio?.sfx('cursor'); break;
        case 'caught': this.gone.set(f, { t: 0, caught: true }); this.sparkle(f.x, f.y - 4); this.scene.audio?.sfx('catch');
          if (this.cap) this.cap.end = { ok: true, t: 0 }; this.banner(CT.caught, ct(CT.caught_sub, { name: name(f) }), 1700); stop = 0.15; break;
        case 'breakFree': { if (this.cap) this.cap.end = { ok: false, t: 0 }; this.shards(this.cap?.x ?? f.x, (this.cap?.y ?? f.y) - 8); f.popT = 0.35;
          this.banner(ct(CT.broke, { name: name(f) }), CT.broke_sub, 1100);
          this.bubbles.push({ who: f, text: CT.react[Math.floor(Math.random() * CT.react.length)], t: 0, life: 1.1, color: '#ff6b6b' }); this.kick(6); stop = Math.max(stop, 0.07); this.scene.audio?.sfx('back'); break; }
        case 'select': { const s = this.hud.querySelectorAll('.rtb-s')[e.slot]; s?.classList.remove('pop'); void s?.offsetWidth; s?.classList.add('pop'); this.scene.audio?.sfx('cursor'); break; }
        case 'end':
          if (e.outcome === 'win') this.banner('Fight won!', this.sim.xpGained ? `+${this.sim.xpGained} XP` : '', 1500);
          if (e.outcome === 'retreat') this.banner('Got away safely.', '', 1000);
          break;
        default:
      }
    }
    return { stop, slow };
  }

  frame(dt) {
    this.t += dt;
    const sim = this.sim, { z, rect } = this.geom(), sc = this.scene;
    this.cam = sc._cam || { x: 0, y: 0 };
    const cv = this.cv;
    if (cv.width !== this.world.width || cv.height !== this.world.height) { cv.width = this.world.width; cv.height = this.world.height; }
    Object.assign(cv.style, { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px' });
    this.shake = Math.max(0, this.shake - dt * 30);
    const sx = this.shake ? (Math.random() - 0.5) * this.shake : 0, sy = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const tr = this.shake ? `translate(${sx}px,${sy}px)` : '';
    this.world.style.transform = tr; cv.style.transform = tr;
    const c = this.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    c.setTransform(z, 0, 0, z, -this.cam.x * z, -this.cam.y * z); c.imageSmoothingEnabled = false;
    // arena edge (soft)
    const a = sim.arena; c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 2 / z; c.setLineDash([10, 8]); c.strokeRect(a.x0, a.y0, a.x1 - a.x0, a.y1 - a.y0); c.setLineDash([]);
    // telegraphs under bodies
    for (const f of sim.foes) if (f.alive && f.act && f.tele) this.drawTele(c, f);
    // rings
    for (const r of this.rings) { r.t += dt; const p = Math.min(1, r.t / r.life); c.globalAlpha = 1 - p; c.strokeStyle = r.color; c.lineWidth = 4;
      if (r.column) { c.fillStyle = r.color; c.globalAlpha = 0.35 * (1 - p); c.fillRect(r.x - 20, r.y - 140, 40, 150); }
      else if (r.arc) { c.beginPath(); const ang = Math.atan2(r.dir.y, r.dir.x), rr = r.r0 + (r.r1 - r.r0) * p; c.arc(r.x, r.y, rr, ang - r.span, ang + r.span); c.lineWidth = 10 * (1 - p) + 2; c.stroke(); }
      else { c.beginPath(); c.arc(r.x, r.y, Math.max(1, r.r0 + (r.r1 - r.r0) * p), 0, Math.PI * 2); c.stroke(); } }
    c.globalAlpha = 1; this.rings = this.rings.filter((r) => r.t < r.life);
    // bodies, sorted by feet
    const bodies = [sim.ally, ...sim.foes].filter((f) => f.alive && !f.caught || this.gone.has(f));
    bodies.sort((p, q) => p.y - q.y);
    for (const f of bodies) this.drawBody(c, f, dt);
    // shots
    for (const s of sim.shots) this.drawShot(c, s, dt);
    this.drawCapture(c, dt);
    // particles
    for (const p of this.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.vx *= 0.96; c.globalAlpha = Math.max(0, 1 - p.t / p.life); c.fillStyle = p.color;
      if (p.star) { const r = p.size * (1 + 0.5 * Math.sin(p.t * 20)); p.vy -= 200 * dt; c.beginPath(); c.moveTo(p.x, p.y - r * 1.6); c.lineTo(p.x + r * 0.35, p.y - r * 0.35); c.lineTo(p.x + r * 1.6, p.y); c.lineTo(p.x + r * 0.35, p.y + r * 0.35); c.lineTo(p.x, p.y + r * 1.6); c.lineTo(p.x - r * 0.35, p.y + r * 0.35); c.lineTo(p.x - r * 1.6, p.y); c.lineTo(p.x - r * 0.35, p.y - r * 0.35); c.closePath(); c.fill(); }
      else if (p.shard != null) { c.save(); c.translate(p.x, p.y); c.rotate(p.shard + p.t * 12); c.beginPath(); c.moveTo(0, -p.size); c.lineTo(p.size * 0.5, 0); c.lineTo(0, p.size * 0.7); c.lineTo(-p.size * 0.5, 0); c.closePath(); c.fill(); c.restore(); }
      else c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
    c.globalAlpha = 1; this.parts = this.parts.filter((p) => p.t < p.life);
    // floating HP bars over foes
    for (const f of sim.foes) if (f.alive && !f.caught) { const w = 46, fr = f.c.hp / f.mhp; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(f.x - w / 2 - 1, f.y - 64, w + 2, 7); c.fillStyle = fr < 0.25 ? '#ff5252' : fr < 0.5 ? '#ffd34d' : '#5be37a'; c.fillRect(f.x - w / 2, f.y - 63, w * fr, 5); if (f === sim.target) { c.strokeStyle = '#ffd25a'; c.lineWidth = 2; const b = 4 + Math.sin(this.t * 8) * 2; c.strokeRect(f.x - 30 - b, f.y - 50 - b, 60 + 2 * b, 70 + 2 * b); } }
    // bubbles + numbers (text in screen-ish size)
    c.textAlign = 'center'; c.lineJoin = 'round';
    for (const b of this.bubbles) { b.t += dt; const f = b.who, pop = Math.min(1, b.t / 0.12); c.font = `900 ${Math.round(28 * pop)}px system-ui, sans-serif`; c.lineWidth = 6; c.strokeStyle = '#000'; c.strokeText(b.text, f.x, f.y - 72); c.fillStyle = b.color; c.fillText(b.text, f.x, f.y - 72); }
    this.bubbles = this.bubbles.filter((b) => b.t < b.life);
    for (const n of this.nums) { n.t += dt; const p = n.t / 0.9, pop = n.t < 0.08 ? 1.6 - n.t * 7 : 1; c.globalAlpha = Math.max(0, 1 - Math.max(0, p - 0.6) / 0.4); c.font = `900 ${Math.round((n.big ? 26 : 19) * pop)}px system-ui, sans-serif`; c.lineWidth = 5; c.strokeStyle = '#000'; const y = n.y - n.t * 46; c.strokeText(n.text, n.x + n.vx * n.t, y); c.fillStyle = n.color; c.fillText(n.text, n.x + n.vx * n.t, y); }
    c.globalAlpha = 1; this.nums = this.nums.filter((n) => n.t < 0.9);
    this.hudFrame();
  }
  drawTele(c, f) {
    const t = f.tele, p = 1 - Math.max(0, f.act.t) / (t.total || 1), S = SHAPE_STATS[t.shape] || {}, ang = Math.atan2(t.aim.y, t.aim.x);
    c.save(); c.translate(f.x, f.y); c.globalAlpha = 0.18 + 0.35 * p; c.fillStyle = '#ff3b3b'; c.strokeStyle = '#ff3b3b'; c.lineWidth = 2;
    if (t.shape === 'slam') { c.beginPath(); c.arc(0, 8, S.range * p, 0, Math.PI * 2); c.fill(); c.globalAlpha = 0.7; c.beginPath(); c.arc(0, 8, S.range, 0, Math.PI * 2); c.stroke(); }
    else if (t.shape === 'melee' || t.shape === 'cone') { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, S.range * p, ang - S.arc, ang + S.arc); c.closePath(); c.fill(); }
    else { const len = t.shape === 'dash' ? S.dist + 30 : Math.min(S.range, 320), w = t.shape === 'dash' ? 40 : (S.r || 10) * 2 + 6; c.rotate(ang); c.fillRect(0, -w / 2, len * p, w); c.globalAlpha = 0.6; c.strokeRect(0, -w / 2, len, w); }
    c.restore();
  }
  drawBody(c, f, dt) {
    const g = this.gone.get(f); let alpha = 1, scale = 1, spin = 0;
    if (g) { g.t += dt; const p = Math.min(1, g.t / 0.5); alpha = 1 - p; scale = g.caught ? 1 - p : 1 + p * 0.3; spin = g.caught ? 0 : p * 0.6; if (p >= 1) return; }
    if (f.ai?.state === 'alert') scale *= Math.min(1, 0.3 + (this.sim.t) / 0.25);
    if (f.held && !g) { const k = this.cap; const p = k ? Math.min(1, k.t / 0.25) : 1; scale *= 1 - 0.75 * p; alpha *= 1 - 0.7 * p; }
    if (f.popT > 0) { f.popT -= dt; scale *= 1 + f.popT * 1.4; }
    const im = this.sheet(f.c.species);
    const fx = f.face?.x || 0, fy = f.face?.y || 0, row = Math.abs(fx) > Math.abs(fy) ? (fx < 0 ? 1 : 2) : (fy < 0 ? 3 : 0);
    const moving = Math.hypot(f.vx, f.vy) > 20 || f.dash, colN = moving ? 1 + (Math.floor(this.t * (f.dash ? 16 : 9)) % 4) : 0;
    // shadow
    c.globalAlpha = 0.28 * alpha; c.fillStyle = '#000'; c.beginPath(); c.ellipse(f.x, f.y + 16, 20 * scale, 7 * scale, 0, 0, Math.PI * 2); c.fill();
    // afterimages on dodge / dash
    if (f.dash && !this.reduced) { c.globalAlpha = 0.25 * alpha; if (im) c.drawImage(im, colN * 64, row * 64, 64, 64, f.x - 32 - f.dash.vx * 0.03, f.y - 44 - f.dash.vy * 0.03, 64, 64); }
    c.globalAlpha = alpha;
    const telePulse = f.act && f.side === 'foe' ? Math.sin(this.t * 40) * 1.5 : 0;
    // squash on hit / stretch on cast
    const sq = f.flash > 0 ? 1 + f.flash * 1.2 : f.castT > 0 ? 1 - f.castT : 1; if (f.castT > 0) f.castT -= dt;
    c.save(); c.translate(f.x + telePulse, f.y + 18); c.rotate(spin); c.scale(scale * sq, scale / sq);
    if (f.held) { c.globalAlpha = alpha * 0.85; }
    if (im) {
      c.drawImage(im, colN * 64, row * 64, 64, 64, -32, -62, 64, 64);
      if (f.flash > 0 && !this.reduced) { const fc = this.flashC.getContext('2d'); fc.clearRect(0, 0, 64, 64); fc.globalCompositeOperation = 'source-over'; fc.drawImage(im, colN * 64, row * 64, 64, 64, 0, 0, 64, 64); fc.globalCompositeOperation = 'source-atop'; fc.fillStyle = '#fff'; fc.fillRect(0, 0, 64, 64); c.drawImage(this.flashC, -32, -62); }
      if (f.act && f.side === 'foe' && !this.reduced) { const fc = this.flashC.getContext('2d'); fc.clearRect(0, 0, 64, 64); fc.globalCompositeOperation = 'source-over'; fc.drawImage(im, colN * 64, row * 64, 64, 64, 0, 0, 64, 64); fc.globalCompositeOperation = 'source-atop'; fc.fillStyle = 'rgba(255,60,60,0.45)'; fc.fillRect(0, 0, 64, 64); c.drawImage(this.flashC, -32, -62); }
    } else { c.fillStyle = f.side === 'ally' ? '#7dd3ff' : '#ff9a7a'; c.beginPath(); c.arc(0, -22, 20, 0, Math.PI * 2); c.fill(); }
    c.restore();
    if (f.held && !this.cap) { c.strokeStyle = '#bff6ff'; c.lineWidth = 3; c.globalAlpha = 0.6 + 0.4 * Math.sin(this.t * 10); c.beginPath(); c.arc(f.x, f.y - 10, 34, 0, Math.PI * 2); c.stroke(); for (let i = 0; i < 4; i++) { const a = this.t * 3 + i * Math.PI / 2; c.fillStyle = '#bff6ff'; c.fillRect(f.x + Math.cos(a) * 36 - 3, f.y - 10 + Math.sin(a) * 36 - 3, 6, 6); } }
    if (f.drowsy > 0) { c.fillStyle = '#c6b6ff'; c.font = '700 16px system-ui'; c.fillText('z', f.x + 18 + Math.sin(this.t * 3) * 4, f.y - 46 - (this.t * 20) % 16); }
    c.globalAlpha = 1;
  }
  drawShot(c, s, dt) {
    let tr = this.trails.get(s); if (!tr) { tr = []; this.trails.set(s, tr); }
    tr.push({ x: s.x, y: s.y - (s.z || 0) }); if (tr.length > (this.reduced ? 3 : 8)) tr.shift();
    const color = s.crystal ? '#bff6ff' : col(s.el);
    for (let i = 0; i < tr.length; i++) { c.globalAlpha = (i / tr.length) * 0.5; c.fillStyle = color; const r = s.r * (0.4 + 0.6 * i / tr.length); c.beginPath(); c.arc(tr[i].x, tr[i].y, r, 0, Math.PI * 2); c.fill(); }
    c.globalAlpha = 1;
    if (s.z != null) { c.globalAlpha = 0.3; c.fillStyle = '#000'; c.beginPath(); c.ellipse(s.x, s.y + 12, s.r, s.r * 0.4, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
    const y = s.y - (s.z || 0), gr = c.createRadialGradient(s.x, y, 1, s.x, y, s.r * 1.8);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, color); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(s.x, y, s.r * 1.8, 0, Math.PI * 2); c.fill();
    if (s.crystal) { c.save(); c.translate(s.x, y); c.rotate(s.age * 14); c.fillStyle = '#e9fdff'; c.beginPath(); c.moveTo(0, -11); c.lineTo(7, 0); c.lineTo(0, 11); c.lineTo(-7, 0); c.closePath(); c.fill(); c.restore(); }
  }
  hudFrame() {
    const sim = this.sim, a = sim.ally, plates = this.$('.rtb-plates');
    const key = sim.foes.map((f) => f.c.uid).join();
    if (plates.dataset.k !== key) { plates.dataset.k = key; plates.innerHTML = sim.foes.map((f, i) => `<div class="rtb-plate" data-i="${i}"><div class="rtb-nm"><span>${displayName(f.c)}</span><span>Lv ${f.c.level}</span></div><div class="rtb-bar"><b></b><i></i></div></div>`).join(''); }
    sim.foes.forEach((f, i) => { const el = plates.children[i]; if (!el) return; const fr = Math.max(0, f.c.hp / f.mhp); el.classList.toggle('gone', !f.alive || !!f.caught); el.classList.toggle('lock', f === sim.target); const bar = el.querySelector('.rtb-bar'); bar.className = 'rtb-bar ' + hpCls(fr); bar.querySelector('i').style.width = fr * 100 + '%'; bar.querySelector('b').style.width = fr * 100 + '%'; });
    if (this.allyKey !== a.c.uid) {
      this.allyKey = a.c.uid; this.$('[data-rtb="aname"]').textContent = displayName(a.c);
      this.$('.rtb-sk').innerHTML = a.skills.map((id, i) => `<div class="rtb-s" data-slot="${i}" role="button" aria-label="Skill ${i + 1}"><span class="el"></span><span class="k">${this.keyNames.skills[i] || ''}</span><span class="n"></span><span class="e"></span><span class="cd"></span></div>`).join('');
      this.onSkillsBuilt?.();
    }
    this.$('[data-rtb="alv"]').textContent = `Lv ${a.c.level}`;
    const fr = Math.max(0, a.c.hp / a.mhp), hb = this.$('[data-rtb="ahp"]'); hb.className = 'rtb-bar ' + hpCls(fr); hb.querySelector('i').style.width = fr * 100 + '%'; hb.querySelector('b').style.width = fr * 100 + '%';
    this.$('.rtb-me').classList.toggle('low', fr > 0 && fr < 0.25);
    this.$('[data-rtb="ahp"]').title = `${a.c.hp}/${a.mhp}`;
    const xl = this.xpBar?.(a.c); if (xl != null) this.$('[data-rtb="axp"] i').style.width = xl * 100 + '%';
    const rows = this.hud.querySelectorAll('.rtb-s');
    a.skills.forEach((id, i) => {
      const r = rows[i]; if (!r) return; const sk = this.skillInfo(id), en = a.c.energy?.[i] ?? 0, mx = this.maxEn?.(a.c)?.[i] ?? en;
      r.querySelector('.n').textContent = sk?.name || id; r.querySelector('.e').textContent = `En ${en}/${mx}`; r.querySelector('.el').style.background = col(String(sk?.type || '').toLowerCase());
      const cd = sk ? Math.max(0, a.cds[i]) / (this.cdOf(sk) || 1) : 0; r.querySelector('.cd').style.setProperty('--sw', Math.round(Math.min(1, cd) * 360) + 'deg');
      if (r._cd > 0 && cd <= 0) { r.classList.remove('ready'); void r.offsetWidth; r.classList.add('ready'); } r._cd = cd; r.dataset.ready = cd <= 0 ? '1' : '0';
      r.classList.toggle('sel', i === sim.selected); r.classList.toggle('empty', en <= 0);
    });
    this.partyFrame();
    const cr = this.crystals?.() || 0, cb = this.$('[data-rtb="crystal"]'); cb.hidden = !!sim.trainer || globalThis.KILUMEN_RTB_CAPTURE_OFF === true; cb.disabled = !cr || !!sim.caught || !!sim.trainer || !!sim.capture; cb.querySelector('.cn').textContent = ct(CT.count, { n: cr }); cb.querySelector('.cl').textContent = cr ? CT.button : CT.button_none; cb.classList.toggle('open', !!this.capOpen);
    this.$('[data-rtb="swap"]').disabled = sim.party.filter((c) => c.hp > 0).length < 2 || sim.swapCd > 0;
    this.$('[data-rtb="leave"]').classList.toggle('hold', sim.retreatT > 0);
  }
  partyFrame() {
    const sim = this.sim, box = this.$('[data-rtb="party"]'); if (!box) return;
    const key = sim.party.map((c) => c.uid).join();
    if (box.dataset.k !== key) {
      box.dataset.k = key;
      box.innerHTML = sim.party.map((c, i) => `<div class="rtb-pi" data-i="${i}" role="button" aria-label="Switch to ${displayName(c)} (${i + 1})" title="${displayName(c)}"><canvas width="64" height="64"></canvas><span class="pk">${this.keyNames.party ? i + 1 : ''}</span><span class="ph"></span></div>`).join('');
      box._drawn = new Set();
    }
    sim.party.forEach((c, i) => {
      const el = box.children[i]; if (!el) return;
      if (!box._drawn.has(i)) { const im = this.sheet(c.species); if (im) { el.querySelector('canvas').getContext('2d').drawImage(im, 0, 0, 64, 64, 0, 0, 64, 64); box._drawn.add(i); } }
      el.classList.toggle('on', i === sim.active); el.classList.toggle('ko', !(c.hp > 0)); el.classList.toggle('cd', i !== sim.active && sim.swapCd > 0);
      el.querySelector('.ph').style.width = `calc(${Math.max(0, c.hp / (this.maxHpOf?.(c) || c.maxHp || c.hp || 1)) * 100}% - 4px)`;
    });
  }

  /** success: four-point stars that twinkle out + a soft ring */
  sparkle(x, y) {
    const n = this.reduced ? 6 : 18;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + Math.random() * 0.3, s = 70 + Math.random() * 120; this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, t: 0, life: 0.9 + Math.random() * 0.5, color: i % 3 ? '#e9fdff' : '#ffe27a', size: 5, star: true }); }
    this.rings.push({ x, y, r0: 8, r1: 70, t: 0, life: 0.5, color: '#ffe27a' });
  }
  /** break-out: crystal shards fly off, spinning */
  shards(x, y) {
    const n = this.reduced ? 4 : 12;
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 120 + Math.random() * 180; this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 90, t: 0, life: 0.6 + Math.random() * 0.3, color: i % 2 ? '#bff6ff' : '#7fe3ff', size: 6, shard: Math.random() * 6 }); }
  }
  /** the crystal on the ground: wobbles on each pulse, glows, then shines (caught) or cracks (broke free) */
  drawCapture(c, dt) {
    const k = this.cap; if (!k) return; k.t += dt; k.wob = Math.max(0, k.wob - dt * 2.4);
    if (k.end) { k.end.t += dt; if (k.end.t > (k.end.ok ? 1.1 : 0.05)) { this.cap = null; return; } }
    const drop = Math.min(1, k.t / 0.18), y = k.y - (1 - drop) * 30;
    const ang = this.reduced ? 0 : Math.sin(k.t * 22) * 0.45 * k.wob * k.dir;
    const glow = 0.35 + 0.25 * Math.sin(k.t * 6) + (k.end?.ok ? 0.5 : 0);
    c.save(); c.translate(k.x, y);
    c.globalAlpha = 0.3; c.fillStyle = '#000'; c.beginPath(); c.ellipse(0, 4, 12, 4, 0, 0, Math.PI * 2); c.fill();
    const gr = c.createRadialGradient(0, -10, 1, 0, -10, 30); gr.addColorStop(0, `rgba(191,246,255,${Math.min(1, glow)})`); gr.addColorStop(1, 'rgba(191,246,255,0)');
    c.globalAlpha = 1; c.fillStyle = gr; c.beginPath(); c.arc(0, -10, 30, 0, Math.PI * 2); c.fill();
    c.rotate(ang); c.translate(0, -12);
    const sq = k.wob > 0.6 && !this.reduced ? 1 + (k.wob - 0.6) * 0.5 : 1; c.scale(1 / sq, sq);
    c.fillStyle = '#4fc7ef'; c.beginPath(); c.moveTo(0, -14); c.lineTo(10, -3); c.lineTo(0, 13); c.lineTo(-10, -3); c.closePath(); c.fill();
    c.fillStyle = '#bff6ff'; c.beginPath(); c.moveTo(0, -14); c.lineTo(5, -3); c.lineTo(0, 13); c.lineTo(-5, -3); c.closePath(); c.fill();
    c.fillStyle = '#ffffff'; c.globalAlpha = 0.85; c.beginPath(); c.moveTo(0, -14); c.lineTo(-5, -3); c.lineTo(5, -3); c.closePath(); c.fill();
    if (k.end?.ok) { c.globalAlpha = Math.max(0, 1 - k.end.t); c.fillStyle = '#ffe27a'; c.beginPath(); c.arc(0, 0, 18 * (1 + k.end.t), 0, Math.PI * 2); c.fill(); }
    // pips for pulses done (1-4)
    c.restore(); c.globalAlpha = 1;
    for (let i = 0; i < 4; i++) { c.fillStyle = i < k.n ? '#bff6ff' : 'rgba(255,255,255,.18)'; c.fillRect(k.x - 15 + i * 8, k.y + 10, 6, 3); }
  }
  /** capture tab: st = {open, items:[{id,name,n,p,band}], foe, factors:[{k,good}], hl} */
  capTab(st) {
    const el = this.$('[data-rtb="captab"]'); if (!el) return;
    this.hud.classList.toggle('cap-open', !!st?.open);
    if (!st?.open) { if (el.classList.contains('on')) { el.classList.remove('on'); clearTimeout(this._ct); this._ct = setTimeout(() => { el.hidden = true; }, 160); } return; }
    clearTimeout(this._ct);
    if (el.hidden) { el.hidden = false; void el.offsetWidth; el.classList.add('on'); }
    const key = JSON.stringify([st.items.map((i) => [i.id, i.n, Math.round(i.p * 100)]), st.factors, st.hl, st.foe]);
    if (el.dataset.k === key) return; el.dataset.k = key;
    const rows = st.items.length ? st.items.map((it, i) => `<div class="rtb-cr${i === st.hl ? ' hi' : ''}" data-cap="${i}" role="button" aria-label="${it.name}"><span class="k">${i + 1}</span>${GEM_SVG}<span class="nm">${it.name}<small>${ct(CT.count, { n: it.n })}</small></span><span class="od" style="color:${BAND_COLOR[it.band]}">${CT['odds_' + it.band]}<i><b style="width:${Math.max(4, Math.round(it.p * 100))}%;background:${BAND_COLOR[it.band]}"></b></i></span></div>`).join('') : `<div class="rtb-cnone">${CT.none}</div>`;
    el.innerHTML = `<h3>${GEM_SVG}${CT.title}: ${st.foe}<span class="sl">${CT.slowed}</span></h3><div class="rtb-cf">${st.factors.map((f) => `<span class="${f.good ? 'g' : 'b'}">${CT[f.k]}</span>`).join('')}</div>${rows}<div class="rtb-ch">${this.touch ? CT.hint_touch : ct(CT.hint_pc, { n: Math.max(1, st.items.length) })}</div>`;
  }
  partyNo(i) { const el = this.$(`.rtb-pi[data-i="${i}"]`); if (!el) return; el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); }
  destroy() {
    this.$('.rtb-bars')?.classList.remove('on');
    this.world.style.transform = ''; this.cv.remove(); this.hud.remove(); document.body.classList.remove('rtb-touch');
    document.querySelectorAll('.rtb-fx').forEach((e) => e.remove());
  }
}
