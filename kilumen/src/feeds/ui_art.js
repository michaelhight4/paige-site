// Fruit feeds: our own placeholder art (simple SVG shapes drawn here, no outside assets) + overlay CSS. Coder, Oct 29 2026.
// Shapes follow the look column of design/SPORTS_FEEDS.md section 3. Replace with World Design pixel art when it exists.
const LOOK = {
  rumblemelon: ['melon', '#5fae4a', '#2f6e2a'], dashfig: ['tear', '#7a3f9e', '#e8c04a'], padgourd: ['pad', '#7fbf5a', '#4a7f33'],
  mossplum: ['round', '#6f9f5a', '#a8d08a'], saltlime: ['lime', '#9fd3e6', '#ffffff'], tidepod: ['pod', '#7a5a33', '#c9a46a'],
  sparkcitron: ['lime', '#f2d64a', '#fff7b0'], frostquince: ['round', '#eef4fa', '#9fc4e6'], glidepod: ['wing', '#f0e2b0', '#c8b070'],
  glowmelon: ['melon', '#c9e87a', '#fff4a0'], embergourd: ['gourd', '#c8452f', '#f08a4a'], cinderapricot: ['round', '#f0903a', '#7a6a60'],
  sunheart_fig: ['tear', '#f2c23a', '#fff1a0'], hollowpith: ['gourd', '#8a8f96', '#c4c8cc'],
};
const SHAPE = {
  melon: (a, b) => `<ellipse cx="16" cy="18" rx="12" ry="10" fill="${a}"/><path d="M8 12q8 10 0 13M16 8v20M24 12q-8 10 0 13" stroke="${b}" stroke-width="2" fill="none"/>`,
  tear: (a, b) => `<path d="M16 4q10 12 8 20a8 8 0 0 1-16 0q-2-8 8-20z" fill="${a}"/><circle cx="14" cy="22" r="1.5" fill="${b}"/><circle cx="18" cy="20" r="1.5" fill="${b}"/>`,
  pad: (a, b) => `<path d="M16 18m-12 0a12 7 0 1 0 24 0a12 7 0 1 0-24 0" fill="${a}"/><path d="M16 18L27 15" stroke="${b}" stroke-width="2"/>`,
  round: (a, b) => `<circle cx="16" cy="18" r="10" fill="${a}"/><path d="M16 8q2-4 6-4" stroke="#5a3a20" stroke-width="2" fill="none"/><circle cx="12" cy="15" r="3" fill="${b}" opacity=".6"/>`,
  lime: (a, b) => `<ellipse cx="16" cy="17" rx="11" ry="9" fill="${a}"/><circle cx="7" cy="17" r="2" fill="${a}"/><circle cx="25" cy="17" r="2" fill="${a}"/><circle cx="13" cy="14" r="2.5" fill="${b}" opacity=".8"/>`,
  pod: (a, b) => `<path d="M5 22q11-18 22-14q-4 16-22 14z" fill="${a}"/><circle cx="12" cy="18" r="1.6" fill="${b}"/><circle cx="17" cy="15" r="1.6" fill="${b}"/><circle cx="22" cy="12" r="1.6" fill="${b}"/>`,
  wing: (a, b) => `<ellipse cx="16" cy="18" rx="4" ry="6" fill="${b}"/><path d="M12 16q-10-8-9 4q4 2 9-1zM20 16q10-8 9 4q-4 2-9-1z" fill="${a}"/>`,
  gourd: (a, b) => `<circle cx="16" cy="22" r="8" fill="${a}"/><circle cx="16" cy="11" r="5" fill="${a}"/><path d="M12 22v-4M16 23v-6M20 22v-4" stroke="${b}" stroke-width="1.5"/><path d="M16 6v-3" stroke="#5a3a20" stroke-width="2"/>`,
};
/** stage: null (a fruit) or a plot stage ('sprout'|'leaf'|'flower'|'fruit'). */
export function fruitSvg(id, stage = null) {
  const [sh, a, b] = LOOK[id] || ['round', '#999', '#ccc'];
  if (stage && stage !== 'fruit') {
    const leaf = '<path d="M16 28V16" stroke="#3f7a2a" stroke-width="2"/><path d="M16 20q-7-1-8-7q7 0 8 7z" fill="#5fae4a"/>';
    const more = stage === 'sprout' ? '' : '<path d="M16 17q7-1 8-7q-7 0-8 7z" fill="#5fae4a"/>';
    const fl = stage === 'flower' ? `<circle cx="16" cy="12" r="3.5" fill="${b}"/><circle cx="16" cy="12" r="1.5" fill="${a}"/>` : '';
    return `<svg class="fd-ico" viewBox="0 0 32 32" aria-hidden="true">${leaf}${more}${fl}</svg>`;
  }
  return `<svg class="fd-ico" viewBox="0 0 32 32" aria-hidden="true">${SHAPE[sh](a, b)}</svg>`;
}
export const CSS = `
#feeds-btn{position:fixed;right:10px;top:54px;z-index:40;font:600 13px system-ui;padding:6px 12px;border-radius:14px;border:2px solid #f3e6b8;background:#3b5d2e;color:#fff6d8}
#feeds-ov{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;background:rgba(10,14,8,.6);font:14px system-ui;color:#2a2418}
#feeds-ov .fd-box{width:min(920px,96vw);max-height:94vh;overflow:auto;background:#fbf3dc;border:3px solid #6b4f2a;border-radius:14px;padding:10px;box-shadow:0 8px 30px #0008}
.fd-tabs{display:flex;gap:6px;margin-bottom:8px}.fd-tabs button{flex:0 0 auto;padding:6px 16px;border-radius:10px;border:2px solid #6b4f2a;background:#efe1b8;font-weight:700}
.fd-tabs button.on{background:#6b8f3a;color:#fff}.fd-tabs .x{margin-left:auto}
.fd-mons{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px}.fd-pick{display:flex;flex-direction:column;align-items:center;min-width:72px;border:2px solid #c9b07a;border-radius:10px;background:#fff8e6;padding:3px}
.fd-pick.on{border-color:#6b8f3a;background:#e6f2cf}.fd-pick img{width:48px;height:48px;image-rendering:pixelated}.fd-pick span{font-size:11px}
.fd-main{display:grid;grid-template-columns:1.1fr 1fr;gap:10px;margin-top:6px}
.fd-card{position:relative;background:#fff8e6;border:2px solid #c9b07a;border-radius:12px;padding:8px}
.fd-head{display:flex;gap:8px;align-items:center;margin-bottom:6px}.fd-mon{width:72px;height:72px;image-rendering:pixelated}
.fd-taste,.fd-total{font-size:12px;color:#6b5a3a}
.fd-bowl{margin-left:auto;text-align:center;font-size:11px}.bowl{position:relative;width:46px;height:30px;margin:2px auto;border:2px solid #6b4f2a;border-top:none;border-radius:0 0 24px 24px;overflow:hidden;background:#fff}
.bowl i{position:absolute;left:0;right:0;bottom:0;background:#f0a95a}.bowl i.was{background:#d9782f}
.fd-row{display:grid;grid-template-columns:48px 1fr 54px 52px;gap:6px;align-items:center;margin:3px 0;font-size:12px}
.fd-row.misfit .fd-part{opacity:.55}.fd-bar{position:relative;height:12px;background:#e8dcc0;border-radius:6px;overflow:hidden}
.fd-bar i{position:absolute;top:0;bottom:0;left:0}.fd-bar .cap{background:#f6efdc}.fd-row.misfit .fd-bar .cap{background:repeating-linear-gradient(45deg,#f6efdc 0 4px,#e0d4b8 4px 8px)}
.fd-bar .cur{background:#6b8f3a}.fd-bar .up{background:#b7e07a}.fd-bar .down{background:#e07a6a}
.fd-val b{margin-left:3px;font-size:11px}.pos{color:#3f7a2a}.neg{color:#b0402a}
.fd-stage{font-size:11px;padding:1px 4px;border-radius:6px;text-align:center;background:#eee2c4}.fd-stage.s1{background:#dbeec0}.fd-stage.s2{background:#b8e090}.fd-stage.s3{background:#f2c23a}
.fd-fruits{display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start}.fd-fruits h3{width:100%;margin:0;font-size:14px}
.fd-fruit{display:grid;grid-template-columns:32px 1fr auto;grid-template-rows:auto auto;column-gap:4px;text-align:left;width:calc(50% - 3px);border:2px solid #c9b07a;border-radius:10px;background:#fff8e6;padding:3px 6px}
.fd-fruit.on{border-color:#6b8f3a;background:#e6f2cf}.fd-fruit .fd-ico{grid-row:span 2}.fd-fruit .nm{font-weight:700;font-size:12px}.fd-fruit .ct{font-size:12px}.fd-fruit .tg{font-size:11px;color:#6b5a3a}
.fd-ico{width:32px;height:32px}
.fd-msg{width:100%;min-height:18px;font-style:italic;color:#5a3a20}.fd-go{width:100%;padding:10px;font:700 16px system-ui;border-radius:10px;border:2px solid #3f5a22;background:#6b8f3a;color:#fff}.fd-go:disabled{opacity:.45}
.fd-mon.r-like{animation:fdhop .45s ease 3}.fd-mon.r-dislike{animation:fdshake .3s ease 3}.fd-mon.r-neutral{animation:fdhop .6s ease 1}
.fd-heart{position:absolute;left:52px;top:4px;font-size:26px;animation:fdpuff 1.2s ease forwards}.fd-heart.r-like{color:#e0506a}.fd-heart.r-dislike{color:#7a8a5a}
@keyframes fdhop{50%{transform:translateY(-12px)}}@keyframes fdshake{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}@keyframes fdpuff{from{transform:translateY(10px) scale(.5);opacity:0}30%{opacity:1}to{transform:translateY(-14px) scale(1.2);opacity:0}}
.fd-hint{font-size:12px;color:#6b5a3a;margin-bottom:6px}.fd-plots{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.fd-plot{display:flex;flex-direction:column;gap:4px;align-items:center;background:#fff8e6;border:2px solid #c9b07a;border-radius:12px;padding:8px;font-size:12px;text-align:center}
.fd-plot .soil{width:64px;height:56px;border-radius:50% 50% 12px 12px;background:radial-gradient(#8a5a33,#5a3a20);display:flex;align-items:flex-end;justify-content:center}.fd-plot .soil .fd-ico{width:48px;height:48px}
.fd-plot button{font-size:11px;padding:4px 6px;border-radius:8px;border:2px solid #6b4f2a;background:#efe1b8}.fd-grow{width:100%;height:8px;background:#e8dcc0;border-radius:4px;overflow:hidden}.fd-grow i{display:block;height:100%;background:#6b8f3a}
@media (max-width:700px),(max-height:500px){.fd-main{grid-template-columns:1fr}.fd-plots{grid-template-columns:repeat(2,1fr)}.fd-fruit{width:calc(50% - 3px)}#feeds-ov .fd-box{padding:6px}}
@media (max-height:500px) and (min-width:600px){.fd-main{grid-template-columns:1.1fr 1fr}}
@media (prefers-reduced-motion:reduce){#feeds-ov *{animation:none!important}}`;
