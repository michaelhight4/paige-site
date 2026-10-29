// Lumen Line (rail) for real (region 4 pass, Oct 29 2026). Stations: every town with a door into the shared station_int
// (world_layout.rail.stops: Saltmere, Lanternport, Revival Heights, Aurelith). Self-contained like src/sports: it wraps
// systems.onTalk / systems.onInteract, so overworld.js is untouched.
//  - station_int.station_clerk -> travel menu (DOM overlay: line diagram, "you are here", locked stops say why).
//  - Unlock = region 3 story quest (mq_revival_heights s7 "Collect the Lumen Line rail pass"): after Master 3 the Revival
//    Heights pass clerk says the line is shut, a frightened Kilumen has nested in the platform signal relay. Check the
//    relay at any station platform (station_int 1,3, faced from 1,4) -> it is calmed by your lead creature -> back to the
//    clerk -> Lumen Line Pass (has_rail_pass). Flags: rail_line_closed_told, rail_relay_cleared, has_rail_pass.
//  - Ride: the talk runs inside scene.script(), so the game saves right BEFORE (checkpoint) and never during: the menu and
//    the ride carry saveGuards. Ride = canvas overlay (Aseprite train + steam sheets, art/fx/region4/), tap to skip; then
//    lastDoor = the destination's station door and a warp to that station's platform; the arrival saves after landing.
// Words: text/overworld_lines.json (Text Bot) where they exist; the FB strings below are fallbacks with requested keys in
// data/textbot_requests_region4.md.
import { railStops } from '../overnight/region_map.js?v=v0.2.84-alpha';

export const RAIL = {
  interior: 'station_int', clerk: 'station_clerk', passClerk: { map: 'revival_heights', id: 'revival_heights_pass_clerk' },
  relay: { x: 1, y: 3 }, arrive: { x: 9, y: 5, facing: 'down' },
  flags: { told: 'rail_line_closed_told', relay: 'rail_relay_cleared', pass: 'has_rail_pass', master3: 'beat_master_revival' },
};
const FB = {
  closed_pre: ['The Lumen Line is closed to field staff until you hold three Master coins.', "Company policy. Don't look at me like that."],
  closed: ['The line is shut. The signal relay on the platform went dark this morning.', 'Something small and scared crawled in there to get warm. No train moves past a dark signal.', "You're field staff. Can you coax it out? Gently. It bit the last engineer."],
  closed_again: ["Still dark. The relay's at the far left of the platform. Any station, they're all wired together."],
  relay_idle: ['A signal relay box. Its lamp is green. It hums like a kettle.'],
  relay_dark: ['The relay lamp is dark. Something inside is shivering.'],
  relay_calm: ['{creature} pads up to the box and sits very still.', 'Two little eyes blink out. Then a cold, frightened Kilumen tumbles into the light...', '...and curls up against {creature}, just for a second, before it scampers off down the line.', 'Click. The signal lamp turns green.'],
  relay_no_team: ["Something inside hisses. You'd better bring a creature it might trust."],
  pass_give: ['Green signal! You did it. The line reopens on the hour.', 'One Lumen Line pass for field staff. Revival Tech covers it.', "Don't get used to it."],
  received: ['{player} received the Lumen Line Pass!'],
  tip: ["Show it at any station to ride to towns you've already visited."],
  menu_title: 'Lumen Line', here: 'You are here', go: 'Board', cancel: 'Not now',
  why: { no_pass: 'Pass needed', not_visited: 'Visit on foot first', not_built: 'Line under construction' },
  confirm: ['Next train to {city} leaves in a minute. Go on.'],
  arrive: '{city} Central',
};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CSS = `
#rail-ov{position:fixed;inset:0;z-index:9000;background:#0d1320d9;display:flex;align-items:center;justify-content:center;font:15px/1.35 monospace;color:#f3ead2;user-select:none;touch-action:manipulation}
#rail-ov .box{width:min(94vw,640px);max-height:92vh;overflow:auto;background:linear-gradient(180deg,#26324e,#1a2236);border:4px solid #e8c26a;border-radius:10px;box-shadow:0 0 0 4px #1b1f2a,0 8px 0 4px #0008;padding:12px 14px;animation:rpop .3s cubic-bezier(.3,1.6,.5,1) both}
@keyframes rpop{from{transform:scale(.8) translateY(20px);opacity:0}}
#rail-ov h2{margin:0 0 2px;color:#ffd77a;font-size:22px;text-shadow:2px 2px 0 #1b1f2a}#rail-ov .sub{opacity:.75;margin-bottom:10px;font-size:13px}
#rail-ov ol{list-style:none;margin:0;padding:0 0 0 26px;position:relative}
#rail-ov ol::before{content:"";position:absolute;left:10px;top:14px;bottom:14px;width:6px;background:repeating-linear-gradient(180deg,#e8c26a 0 10px,#8a6a2a 10px 14px);border-radius:3px}
#rail-ov li{position:relative;margin:6px 0;padding:10px 12px;border:3px solid #44506b;border-radius:8px;background:#2d3549;cursor:pointer;display:flex;justify-content:space-between;gap:8px;min-height:44px;align-items:center}
#rail-ov li::before{content:"";position:absolute;left:-23px;top:50%;width:14px;height:14px;margin-top:-7px;border-radius:50%;background:#1b1f2a;border:3px solid #e8c26a}
#rail-ov li.sel{border-color:#ffd77a;box-shadow:0 0 14px #ffd77a66;transform:translateX(4px)}
#rail-ov li.here{background:#2a4a3a;border-color:#7ad25a;cursor:default}#rail-ov li.here::before{background:#7ad25a}
#rail-ov li.off{opacity:.5;cursor:default}#rail-ov .tag{font-size:12px;color:#9ad1ff}#rail-ov li.here .tag{color:#a8f08a}
#rail-ov .row{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}
#rail-ov button{font:inherit;font-weight:bold;min-height:44px;padding:8px 16px;border:3px solid #1b1f2a;border-radius:8px;background:linear-gradient(180deg,#ffe08a,#ffc928);box-shadow:0 4px 0 #8a5a08;cursor:pointer}
#rail-ov button.alt{background:#3a4560;color:#f3ead2;box-shadow:0 4px 0 #1b1f2a}#rail-ov button:disabled{opacity:.45}
#rail-ride{position:fixed;inset:0;z-index:9001;background:#000;display:flex;align-items:center;justify-content:center}
#rail-ride canvas{width:min(100vw,calc(100vh*16/9));aspect-ratio:16/9;image-rendering:pixelated}
@media (prefers-reduced-motion:reduce){#rail-ov *{animation:none!important}}`;

const imgCache = {};
function sheet(name) { if (typeof Image === 'undefined') return null; return (imgCache[name] ||= Object.assign(new Image(), { src: `art/fx/region4/${name}_sheet.png` })); }

/** Pure: which state the unlock quest is in. */
export function railQuestState(flags) {
  const F = RAIL.flags;
  if (flags.has(F.pass)) return 'open';
  if (!flags.has(F.master3)) return 'locked';
  if (flags.has(F.relay)) return 'relay_cleared';
  return flags.has(F.told) ? 'relay_dark' : 'closed';
}

/** Pure: travel menu rows. here = the town whose door the player came in by. */
export function menuRows(layout, flags, here, built) {
  return railStops(layout, flags, built).map((s) => ({ ...s, here: s.id === here, ok: s.ok && s.id !== here }));
}

export function attachRail(scene, { systems } = {}) {
  const sys = () => systems || scene.systems;
  const st = { open: false, riding: false };
  (scene.saveGuards ||= []).push(() => (st.riding ? 'rail_ride' : st.open ? 'rail_menu' : null));
  if (typeof document !== 'undefined') { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
  const T = (path, fb) => { let v = scene.lines; for (const k of path.split('.')) v = v?.[k]; return v ?? fb; };
  const say = (pages, vars, sp) => (sys()?.say ? sys().say([].concat(pages), vars || {}, sp) : scene.say([].concat(pages), sp));
  const set = (f) => (scene.setFlag ? scene.setFlag(f, true) : scene.flags.add(f));
  const lead = () => ([].concat(scene.party?.length ? scene.party : scene.systems?.party?.list || [])).find((c) => c && c.hp !== 0) || null;
  const cname = (c) => c ? (c.nickname || c.species[0].toUpperCase() + c.species.slice(1)) : '';
  const here = () => (scene.map?.name === RAIL.interior ? scene.lastDoor?.map : null);
  const zoneName = (id) => (scene.layout?.zones || []).find((z) => z.id === id)?.name || id;

  async function passClerkTalk(entry, line, sp) {
    const q = railQuestState(scene.flags), K = 'maps.revival_heights.revival_heights_pass_clerk.';
    if (q === 'open') return false; // normal lines
    if (q === 'locked') { await say(T(K + 'closed_pre', FB.closed_pre), {}, sp); return true; }
    if (q === 'closed') { await say(T(K + 'closed', FB.closed), {}, sp); set(RAIL.flags.told); scene.log?.push({ tick: scene.tick, type: 'quest', id: 'rail_relay', step: 'told' }); return true; }
    if (q === 'relay_dark') { await say(T(K + 'closed_again', FB.closed_again), {}, sp); return true; }
    await say(T(K + 'pass_give', FB.pass_give), {}, sp);
    await say(entry?.received || FB.received);
    set(RAIL.flags.pass);
    await say(entry?.tip || FB.tip);
    scene._dirty = true;
    return true;
  }

  async function relay() {
    const q = railQuestState(scene.flags), K = 'maps.station_int.signal_relay.';
    if (q !== 'relay_dark' && q !== 'closed') { await say(T(K + 'idle', FB.relay_idle)); return; }
    await say(T(K + 'dark', FB.relay_dark));
    if (q === 'closed') return; // nobody asked yet: just a dark lamp
    const c = lead();
    if (!c) { await say(T(K + 'no_team', FB.relay_no_team)); return; }
    await say(T(K + 'calm', FB.relay_calm), { creature: cname(c) });
    set(RAIL.flags.relay); scene._dirty = true;
  }

  async function clerkTalk(entry, line, sp) {
    const K = 'maps.station_int.station_clerk.';
    if (!scene.flags.has(RAIL.flags.pass)) { await say(entry?.no_pass || T('rail_only.npcs.station_attendant.no_pass', ['You need a pass.']), {}, sp); return true; }
    await say(line?.pages || entry?.pages || ['Welcome to the Lumen Line. Where are you headed?'], {}, sp);
    const to = await openMenu();
    if (!to) { await say(entry?.after || [], {}, sp); return true; }
    await say(entry?.confirm || T(K + 'confirm', FB.confirm), { city: zoneName(to) }, sp);
    await ride(to);
    return true;
  }

  function openMenu() {
    if (typeof document === 'undefined') return Promise.resolve(scene._railPick || null); // tests
    const rows = menuRows(scene.layout, scene.flags, here(), scene.knownMaps || undefined);
    st.open = true;
    let sel = Math.max(0, rows.findIndex((r) => r.ok));
    const ov = document.createElement('div'); ov.id = 'rail-ov'; document.body.appendChild(ov);
    return new Promise((resolve) => {
      const done = (v) => { window.removeEventListener('keydown', key, true); ov.remove(); st.open = false; resolve(v); };
      const draw = () => {
        ov.innerHTML = `<div class="box"><h2>${esc(FB.menu_title)}</h2><div class="sub">Every 20 minutes, give or take. Pass holders ride free.</div><ol>${rows.map((r, i) => `<li data-i="${i}" class="${r.here ? 'here' : r.ok ? '' : 'off'} ${i === sel && r.ok ? 'sel' : ''}"><span>${esc(r.name)}</span><span class="tag">${esc(r.here ? FB.here : r.ok ? '' : FB.why[r.why] || '')}</span></li>`).join('')}</ol><div class="row"><button class="alt" data-a="x">${esc(FB.cancel)}</button><button data-a="go" ${rows[sel]?.ok ? '' : 'disabled'}>${esc(FB.go)}</button></div></div>`;
        ov.querySelectorAll('li').forEach((li) => li.addEventListener('click', () => { const i = +li.dataset.i; if (!rows[i].ok) return; if (i === sel) done(rows[i].id); else { sel = i; draw(); } }));
        ov.querySelector('[data-a=x]').addEventListener('click', () => done(null));
        ov.querySelector('[data-a=go]').addEventListener('click', () => rows[sel]?.ok && done(rows[sel].id));
      };
      const move = (d) => { for (let k = 1; k <= rows.length; k++) { const i = (sel + d * k + rows.length * 9) % rows.length; if (rows[i].ok) { sel = i; break; } } draw(); };
      const key = (e) => { e.stopPropagation(); e.preventDefault();
        if (['ArrowUp', 'w', 'W'].includes(e.key)) move(-1); else if (['ArrowDown', 's', 'S'].includes(e.key)) move(1);
        else if ([' ', 'Enter', 'z', 'Z', 'f', 'F'].includes(e.key)) { if (rows[sel]?.ok) done(rows[sel].id); }
        else if (['Escape', 'x', 'X', 'Backspace'].includes(e.key)) done(null); };
      window.addEventListener('keydown', key, true);
      draw();
    });
  }

  function rideFx(ms = 3200) {
    if (typeof document === 'undefined') return Promise.resolve();
    st.riding = true;
    const wrap = document.createElement('div'); wrap.id = 'rail-ride'; const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360; wrap.appendChild(cv); document.body.appendChild(wrap);
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const train = sheet('lumen_train'), steam = sheet('station_steam'), night = (scene.clock?.hour ?? 12) >= 19 || (scene.clock?.hour ?? 12) < 6;
    scene.audio?.sfx?.('door');
    return new Promise((resolve) => {
      const t0 = performance.now(); let end = false;
      const stop = () => { if (end) return; end = true; wrap.remove(); st.riding = false; resolve(); };
      wrap.addEventListener('pointerdown', stop); const kh = (e) => { if (['Enter', ' ', 'Escape', 'z', 'x'].includes(e.key)) { e.stopPropagation(); stop(); } };
      window.addEventListener('keydown', kh, true);
      const frame = (now) => {
        if (end) { window.removeEventListener('keydown', kh, true); return; }
        const t = (now - t0) / ms, sc = (now - t0) * 0.12;
        const sky = g.createLinearGradient(0, 0, 0, 360); sky.addColorStop(0, night ? '#0b1430' : '#7fb8e8'); sky.addColorStop(1, night ? '#2a2850' : '#e8d8b8'); g.fillStyle = sky; g.fillRect(0, 0, 640, 360);
        for (const [sp, y, h, col] of [[0.2, 190, 70, night ? '#1d2448' : '#8aa0c8'], [0.5, 230, 60, night ? '#15203a' : '#6f9a6a'], [1.2, 270, 90, night ? '#101a2c' : '#4f7a4a']]) {
          g.fillStyle = col; g.beginPath(); g.moveTo(0, 360);
          for (let x = 0; x <= 640; x += 16) { const wx = x + sc * sp; g.lineTo(x, y - Math.abs(Math.sin(wx / 90) * h * 0.6 + Math.sin(wx / 37) * h * 0.2)); }
          g.lineTo(640, 360); g.fill();
        }
        g.fillStyle = '#463c34'; g.fillRect(0, 300, 640, 6); g.fillStyle = '#786e60'; for (let x = -(sc * 3 % 24); x < 640; x += 24) g.fillRect(x, 306, 14, 4);
        const tx = -400 + Math.min(1, t * 1.25) * 620 + Math.max(0, t - 0.8) * 1800, f = Math.floor(now / 90) % 4;
        if (train?.complete && train.naturalWidth) g.drawImage(train, f * 192, 0, 192, 64, tx, 240, 384, 128); else { g.fillStyle = '#3a5c94'; g.fillRect(tx, 260, 360, 60); }
        if (steam?.complete && steam.naturalWidth) for (let k = 0; k < 4; k++) { const sf = (Math.floor(now / 80) + k * 2) % 8; g.globalAlpha = 0.9; g.drawImage(steam, sf * 32, 0, 32, 32, tx + 340 - k * 40 - (sf * 6), 200 - sf * 6, 64, 64); g.globalAlpha = 1; }
        g.fillStyle = '#ffd77a'; g.font = 'bold 20px monospace'; g.textAlign = 'center'; g.fillText(FB.menu_title, 320, 40);
        if (t >= 1) stop(); else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }

  async function ride(to) {
    const town = await scene.loadMap(to);
    const door = (town?.warps || town?.json?.warps || []).find((w) => w.to === RAIL.interior);
    if (!door) { await say([`${zoneName(to)}: the platform is closed today.`]); return false; }
    await rideFx();
    scene.lastDoor = { map: to, x: door.x, y: door.y };
    if (scene.player && scene.player.mode !== 'walk') scene.player.mode = 'walk';
    scene.log?.push({ tick: scene.tick, type: 'rail', to });
    scene.startWarp({ map: RAIL.interior, x: RAIL.arrive.x, y: RAIL.arrive.y, facing: RAIL.arrive.facing }, 'rail');
    const city = zoneName(to);
    setTimeout(() => scene.toast?.(fill(FB.arrive, city)), 700);
    return true;
  }
  const fill = (s, city) => s.replace('{city}', city);

  // ---- hooks -------------------------------------------------------------------------------------------
  const S = sys();
  if (S && !S._railHooked) {
    S._railHooked = true;
    const prevTalk = S.onTalk.bind(S), prevInt = S.onInteract.bind(S);
    S.onTalk = async (o) => {
      if (o.mapName === RAIL.interior && o.def.id === RAIL.clerk) return clerkTalk(o.entry, o.line, o.speaker);
      if (o.mapName === RAIL.passClerk.map && o.def.id === RAIL.passClerk.id && await passClerkTalk(o.entry, o.line, o.speaker)) return true;
      return prevTalk(o);
    };
    S.onInteract = (fx, fy) => {
      if (scene.map?.name === RAIL.interior && fx === RAIL.relay.x && fy === RAIL.relay.y) { scene.script(relay); return true; }
      return prevInt(fx, fy);
    };
  }
  const api = { state: st, rows: () => menuRows(scene.layout, scene.flags, here(), scene.knownMaps || undefined), ride, openMenu, rideFx, questState: () => railQuestState(scene.flags) };
  scene.rail = api;
  return api;
}
