// Kilumen overworld: debug overlay (toggle F3 / ` / pad L3 / ?debug=1).
// Colours match World Design's previews/<map>_debug.png where they overlap (block red, water blue, door green).
import { TILE, Col } from './constants.js?v=v0.2.51-alpha';
import { isToCome } from './map.js?v=v0.2.51-alpha';

export const DEBUG_COLORS = {
  [Col.BLOCK]: 'rgba(255,0,0,0.38)',
  [Col.LEDGE_S]: 'rgba(255,150,0,0.50)',
  [Col.WATER]: 'rgba(0,90,255,0.42)',
  [Col.DOOR]: 'rgba(0,230,0,0.55)',
  [Col.BOULDER]: 'rgba(150,90,30,0.60)',
  [Col.GATE]: 'rgba(170,60,255,0.60)',
  [Col.PLATE]: 'rgba(255,230,0,0.55)',
  [Col.BIKE_ONLY]: 'rgba(0,220,220,0.50)',
  [Col.RAMP]: 'rgba(255,0,200,0.50)',
};
const LEGEND = [['block', Col.BLOCK], ['ledge (south only)', Col.LEDGE_S], ['water', Col.WATER], ['door/warp', Col.DOOR],
  ['boulder', Col.BOULDER], ['gate', Col.GATE], ['plate', Col.PLATE],
  ['bike-only boardwalk', Col.BIKE_ONLY], ['bike ramp (one-way hop)', Col.RAMP]];

export function drawDebug(ctx, v, r) {
  const z = v.zoom, m = v.map, cam = v.cam, T = TILE * z;
  const sx = (x) => (x * TILE - cam.x) * z, sy = (y) => (y * TILE - cam.y) * z;
  for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
    const c = m.code(x, y);
    if (DEBUG_COLORS[c]) { ctx.fillStyle = DEBUG_COLORS[c]; ctx.fillRect(sx(x), sy(y), T, T); }
    if (c === Col.LEDGE_S) arrowDown(ctx, sx(x) + T / 2, sy(y) + T / 2, T * 0.3);
    if (m.encounter(x, y)) { // encounter cell: black-edged lime square, top-left
      ctx.fillStyle = '#000'; ctx.fillRect(sx(x) + 2 * z, sy(y) + 2 * z, 8 * z, 8 * z);
      ctx.fillStyle = '#b6ff3a'; ctx.fillRect(sx(x) + 3 * z, sy(y) + 3 * z, 6 * z, 6 * z);
    }
  }
  // grid
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = r.x0; x <= r.x1 + 1; x++) { ctx.moveTo(sx(x) + 0.5, sy(r.y0)); ctx.lineTo(sx(x) + 0.5, sy(r.y1 + 1)); }
  for (let y = r.y0; y <= r.y1 + 1; y++) { ctx.moveTo(sx(r.x0), sy(y) + 0.5); ctx.lineTo(sx(r.x1 + 1), sy(y) + 0.5); }
  ctx.stroke();

  const font = Math.max(11, 7 * z);
  ctx.font = `bold ${font}px ui-monospace, Menlo, Consolas, monospace`;
  ctx.textBaseline = 'top';
  for (const w of m.warps) {
    ctx.strokeStyle = '#00ff66'; ctx.lineWidth = Math.max(2, z);
    ctx.strokeRect(sx(w.x) + 1, sy(w.y) + 1, T - 2, T - 2);
    label(ctx, w.to === '$return' ? '\u2192 $return' : `\u2192 ${w.to} (${w.tx},${w.ty})`, sx(w.x), sy(w.y) - font - 4, '#00ff66');
  }
  for (const e of m.exits) {
    const closed = isToCome(e);
    ctx.fillStyle = closed ? 'rgba(255,60,60,0.75)' : 'rgba(0,240,255,0.75)';
    for (let i = e.start; i <= e.end; i++) {
      const [x, y] = e.edge === 'north' ? [i, 0] : e.edge === 'south' ? [i, m.height - 1] : e.edge === 'west' ? [0, i] : [m.width - 1, i];
      const bar = 6 * z;
      const rx = e.edge === 'east' ? sx(x) + T - bar : sx(x), ry = e.edge === 'south' ? sy(y) + T - bar : sy(y);
      const vertical = e.edge === 'east' || e.edge === 'west';
      ctx.fillRect(rx, ry, vertical ? bar : T, vertical ? T : bar);
    }
    const [lx, ly] = e.edge === 'north' ? [e.start, 0] : e.edge === 'south' ? [e.start, m.height - 1] : e.edge === 'west' ? [0, e.start] : [m.width - 1, e.start];
    label(ctx, `${e.edge} \u2192 ${e.to}${closed ? ' (closed)' : ` off ${e.offset || 0}`}`, Math.min(sx(lx), (m.width * TILE - cam.x) * z - 260), sy(ly) + 8 * z, closed ? '#ff6b6b' : '#00f0ff');
  }
  for (const g of m.storyGates) { // story gates: purple outline, gate id + flag; dashed once cleared
    const cleared = m.gateCleared(g);
    ctx.strokeStyle = cleared ? '#9a8cff' : '#c14bff'; ctx.lineWidth = Math.max(2, z);
    ctx.setLineDash(cleared ? [4 * z, 3 * z] : []);
    for (const c of g.cells || []) ctx.strokeRect(sx(c.x) + 3, sy(c.y) + 3, T - 6, T - 6);
    ctx.setLineDash([]);
    const c0 = g.cells?.[0];
    if (c0) label(ctx, `${g.id} [${g.flag}]${cleared ? ' cleared' : ''}`, Math.min(sx(c0.x), (m.width * TILE - cam.x) * z - 340), sy(c0.y) + T + 2, '#d9a3ff');
  }
  for (const [k] of m._noDismount) { const [x, y] = k.split(',').map(Number); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(sx(x) + T / 2 - 3 * z, sy(y) + T / 2 - 3 * z, 6 * z, 6 * z); }
  for (const n of m.npcs) marker(ctx, sx(n.x), sy(n.y), T, '#ffffff', 'NPC ' + n.id);
  for (const s of m.signs) marker(ctx, sx(s.x), sy(s.y), T, '#ffd84a', 'sign');
  for (const it of m.items) marker(ctx, sx(it.x), sy(it.y), T, '#ff4ad8', it.hidden ? 'hidden item' : 'item');

  // HUD panel
  const p = v.player;
  const lines = [
    `${m.title} [${m.name}] ${m.width}x${m.height}`,
    `tile ${p.x},${p.y}  facing ${p.facing}  ${p.state}  code ${m.code(p.x, p.y)}`,
    `mode ${p.mode} x${p.speedMultiplier}  ${Math.round(p.ticksPerTile() * 1000 / 60)}ms/tile  zoom x${z}  set ${v.tileset.size}px  ${v.fps} fps`,
    `flags ${v.flags?.length ? v.flags.join(' ') : '-'}`,
    `last door ${v.lastDoor ? `${v.lastDoor.map} ${v.lastDoor.x},${v.lastDoor.y}` : '-'}`,
    ...(v.life ? [v.life.status()] : []),
    ...(v.depth ? [v.depth.status(v)] : []),
  ];
  const lf = Math.max(15, 8 * z), sf = Math.round(lf * 0.85), pad = 10, gap = 4;
  ctx.font = `${lf}px ui-monospace, Menlo, Consolas, monospace`;
  const wText = Math.max(...lines.map((l) => ctx.measureText(l).width));
  // legend: two columns of swatches under the text lines, inside the same panel
  ctx.font = `${sf}px ui-monospace, Menlo, Consolas, monospace`;
  const colW = Math.max(...LEGEND.map(([n]) => ctx.measureText(n).width)) + sf + 16;
  const legRows = Math.ceil(LEGEND.length / 2);
  const wPanel = Math.max(wText, colW * 2) + pad * 2;
  const hPanel = lines.length * (lf + gap) + 6 + legRows * (sf + gap) + pad * 2;
  // bottom-right so it never covers the warp labels along the top of the map
  const ox = ctx.canvas.width - wPanel - 8, oy = ctx.canvas.height - hPanel - 8;
  ctx.fillStyle = 'rgba(10,8,20,0.88)'; ctx.fillRect(ox, oy, wPanel, hPanel);
  ctx.font = `${lf}px ui-monospace, Menlo, Consolas, monospace`;
  ctx.fillStyle = '#ffffff';
  lines.forEach((l, i) => ctx.fillText(l, ox + pad, oy + pad + i * (lf + gap)));
  const ly0 = oy + pad + lines.length * (lf + gap) + 6;
  ctx.font = `${sf}px ui-monospace, Menlo, Consolas, monospace`;
  LEGEND.forEach(([name, code], i) => {
    const lx = ox + pad + (i % 2) * colW, ly = ly0 + Math.floor(i / 2) * (sf + gap);
    ctx.fillStyle = DEBUG_COLORS[code]; ctx.fillRect(lx, ly, sf, sf);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(lx + 0.5, ly + 0.5, sf - 1, sf - 1);
    ctx.fillStyle = '#ffffff'; ctx.fillText(name, lx + sf + 6, ly);
  });
}

function label(ctx, text, x, y, color) {
  const w = ctx.measureText(text).width, h = parseInt(ctx.font.match(/(\d+)px/)[1], 10);
  x = Math.max(4, Math.min(x, ctx.canvas.width - w - 6)); // keep labels on screen
  ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(x - 3, y - 2, w + 6, h + 4);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

function marker(ctx, x, y, T, color, text) {
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x + T / 2, y + T / 2, T * 0.22, 0, Math.PI * 2); ctx.stroke();
  const f = ctx.font; ctx.font = f.replace(/\d+px/, (s) => Math.round(parseInt(s, 10) * 0.8) + 'px');
  label(ctx, text, x + 2, y + T - 16, color);
  ctx.font = f;
}

function arrowDown(ctx, cx, cy, s) {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.beginPath(); ctx.moveTo(cx - s, cy - s / 2); ctx.lineTo(cx + s, cy - s / 2); ctx.lineTo(cx, cy + s / 2); ctx.closePath(); ctx.fill();
}
