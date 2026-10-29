// Region 4 (Frostspire) runtime, dev/region4-station, Oct 29 2026.
// - Skylift-only access (Gary Oct 29 2026 2:52 AM CT, pt1814u: NO train station). The pass<->town edge exits carry
//   ride:'skylift'; walking into one plays the cable-lift ride, then the normal edge warp. Operators at both ends.
// - Daily Bonus: once per in-game day (clock.day), RT pays the Benefits node daily_bonus value (50 / 150 / 300 gold).
// - Promotion ceremonies: company XP pauses just under ID 10 and ID 12 until the special quest is done and the RT
//   supervisor holds the ceremony; XP earned while paused is banked (company.xpClaims.r4_banked) and paid in after.
// - Cold Hands side quest (sq_cold_hands) and reactive NPC lines.
// Saving: ride / ceremony push saveGuards; everything else runs inside scene.script (busy = save locked). Never saves itself.
// Every player string is a PLACEHOLDER from data/region4/region4.json until Text Bot keys land (region4.* in overworld_lines).
import { xpToReach, regionCap } from '../systems/rt_benefits.js?v=v0.2.73-alpha';
import { attachSoul } from './soul.js?v=v0.2.73-alpha';

export const R4 = { pass: 'frostspire_pass', town: 'frostspire', openFlag: 'beat_master_revival', visited: 'visited_frostspire', bankKey: 'r4_banked', bonusKey: 'r4#daily_bonus' };

/** Pure: Daily Bonus amount for a Benefits rank (0 = none). */
export function dailyBonusFor(data, rank) { const n = (data?.nodes || []).find((x) => x.id === 'daily_bonus'); return rank > 0 ? Number(n?.ranks?.[rank - 1]?.value) || 0 : 0; }
/** Pure: is a bonus due today? */
export const bonusDue = (seenDay, day, amount) => amount > 0 && seenDay?.[R4.bonusKey] !== day;
/** Pure: the next promotion still to do, or null. */
export function nextPromotion(promos, flags) { return [...(promos || [])].sort((a, b) => a.idLevel - b.idLevel).find((p) => !flags.has(p.done_flag)) || null; }
/** Pure: XP hold point (max company XP allowed) for a promotion, or Infinity. */
export const holdXp = (rtData, promo) => (promo ? xpToReach(rtData, promo.idLevel) - 1 : Infinity);
/** Pure: are a promotion's special-quest needs met? */
export function needsMet(promo, flags) {
  const n = promo?.needs || {};
  if (n.flags_all && !n.flags_all.every((f) => flags.has(f))) return false;
  if (n.flags_any_n && n.flags_any_n.of.filter((f) => flags.has(f)).length < n.flags_any_n.n) return false;
  return true;
}
/** Pure: clamp company XP to the hold; -> {xp, banked} */
export function clampXp(xp, banked, hold) { return xp > hold ? { xp: hold, banked: banked + (xp - hold) } : { xp, banked }; }

export function attachRegion4(scene, { systems, data } = {}) {
  const sys = () => systems || scene.systems;
  const D = data, st = { riding: false, ceremony: false, paid: [] };
  (scene.saveGuards ||= []).push(() => (st.riding ? 'skylift_ride' : st.ceremony ? 'promotion_ceremony' : null));
  const flags = scene.flags, has = (f) => flags.has(f) || !!scene.seen?.[f];
  const set = (f) => (scene.setFlag ? scene.setFlag(f, true) : flags.add(f));
  const say = (pages, vars = {}, sp) => scene.say([].concat(pages).map((p) => fill(p, vars)), sp);
  const ask = (pages, choices, vars = {}, sp) => scene.ask([].concat(pages).map((p) => fill(p, vars)), choices, sp);
  const vars0 = () => ({ employee_id: scene.textVars?.().employee_id ?? '' });
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (v[k] ?? vars0()[k] ?? m));
  const L = (path, fb) => { let v = scene.lines?.region4; for (const k of path.split('.')) v = v?.[k]; return v ?? fb; };
  const N = (id, k) => L(`npcs.${id}.${k}`, D.npcs?.[id]?.[k]);
  const rt = () => sys()?.rtBenefits;
  const cv = () => (typeof window !== 'undefined' ? window.kilumen?.companyVoice : scene.companyVoice);

  // ---- RITA: placeholder lines with 4 variants each, only where Text Bot has no key yet ------------------------------
  function seedRita() {
    const lines = (scene.lines ||= {}), C = (lines.system_company_voice ||= {});
    for (const [k, v] of Object.entries(D.rita?.lines || {})) if (C[k] == null) C[k] = { pages: v, region: 4, placeholder: true };
    const c = cv(); if (c?.cfg?.events) {
      for (const [n, pr] of [['r4_daily_bonus', 40], ['r4_promotion_hold', 70], ['r4_promotion', 95], ['r4_skylift', 50]]) c.cfg.events[n] ||= { line: n, tier: n === 'r4_promotion' ? 'milestone' : 'full', priority: pr, once: n === 'r4_skylift' ? 'event' : null, cooldown_ms: 0, direct: true };
      if ((c.maxRegion ?? 0) < 4) c.maxRegion = 4;
    }
  }
  const rita = (name, ctx) => { try { cv()?.emit?.(name, ctx); } catch (e) { console.error('region4 rita:', e); } };

  // ---- promotions: XP pause --------------------------------------------------------------------------------------
  let hooked = false;
  function hookRt() {
    const r = rt(); if (!r?.data || hooked) return !!hooked; hooked = true;
    const orig = r.syncLevel.bind(r);
    r.syncLevel = () => { clamp(); return orig(); };
    clamp(); return true;
  }
  function clamp() {
    const r = rt(); if (!r?.data) return;
    const p = nextPromotion(D.promotions, { has }), co = r.company, claims = (co.xpClaims ||= {});
    const out = clampXp(co.xp, Number(claims[R4.bankKey]) || 0, holdXp(r.data, p));
    if (out.xp !== co.xp) {
      co.xp = out.xp; claims[R4.bankKey] = out.banked; scene._dirty = true;
      if (!flags.has(p.hold_flag)) { set(p.hold_flag); rita('r4_promotion_hold', { key: p.id, title: p.title }); scene.log?.push({ tick: scene.tick, type: 'quest', id: p.quest, step: 'start' }); }
    }
  }
  /** Ceremony: pays the bank back in, sets the done flag, ceremony bonus. Runs inside a talk script (save locked). */
  async function ceremony(p, sp) {
    st.ceremony = true;
    try {
      await say(N('rt_supervisor', 'ready'), {}, sp);
      await promoFx();
      await say(N('rt_supervisor', 'ceremony'), { title: p.title }, sp);
      const r = rt(), co = r.company, claims = co.xpClaims, bank = Number(claims[R4.bankKey]) || 0;
      set(p.done_flag); if (scene.setFlag) scene.setFlag(p.hold_flag, false); else flags.delete(p.hold_flag);
      claims[R4.bankKey] = 0;
      const cap = regionCap(r.data, r.region), max = cap ? xpToReach(r.data, cap) : Infinity;
      co.xp = Math.min(max, co.xp + bank + 1); // +1 = step over the hold to the new ID
      r.syncLevel();
      const bonus = r.effect?.('ceremony_bonus') || 0;
      if (bonus > 0) { sys().wallet.add(bonus); await say([fill(N('rt_supervisor', 'bonus'), { amount: bonus })]); }
      scene.log?.push({ tick: scene.tick, type: 'promotion', id: p.id, idLevel: co.idLevel, banked: bank });
      rita('r4_promotion', { key: p.id, title: p.title });
      scene._dirty = true;
    } finally { st.ceremony = false; }
  }

  // ---- Daily Bonus ---------------------------------------------------------------------------------------------
  function tick() {
    hookRt();
    const r = rt(); if (!r?.data || !flags.has(R4.openFlag) || scene.saveLocked || scene.busy) return 0;
    const amt = dailyBonusFor(r.data, Number(r.company.board?.daily_bonus) || 0), day = scene.clock?.day ?? 0;
    if (!bonusDue(scene.seenDay, day, amt)) return 0;
    (scene.seenDay ||= {})[R4.bonusKey] = day;
    sys().wallet.add(amt); st.paid.push({ day, amt }); scene._dirty = true;
    scene.log?.push({ tick: scene.tick, type: 'dailyBonus', day, amount: amt });
    rita('r4_daily_bonus', { key: day, amount: amt });
    if (!cv()) scene.toast?.(`Daily Bonus: ${amt} gold`);
    return amt;
  }

  // ---- Skylift ride ----------------------------------------------------------------------------------------------
  function liftFx(ms = D.access?.lift?.ride_ms || 2600, up = true) {
    if (typeof document === 'undefined') return Promise.resolve();
    const wrap = document.createElement('div'); wrap.style.cssText = 'position:fixed;inset:0;z-index:9001;background:#0b1424;display:flex;align-items:center;justify-content:center';
    const cv2 = document.createElement('canvas'); cv2.width = 640; cv2.height = 360; cv2.style.cssText = 'width:min(100vw,calc(100vh*16/9));aspect-ratio:16/9;image-rendering:pixelated'; wrap.appendChild(cv2); document.body.appendChild(wrap);
    const g = cv2.getContext('2d'); g.imageSmoothingEnabled = false;
    const im = (n) => Object.assign(new Image(), { src: `art/fx/region4/${n}.png` });
    const snow = im('frost_snow_sheet'), far = im('skylift/lift_far'), mid = im('skylift/lift_mid_loop'), cab = im('skylift/lift_cabin');
    const hr = scene.clock?.hour ?? scene.hour ?? 12, night = hr >= 19 || hr < 6;
    const ok = (i) => i.complete && i.naturalWidth;
    scene.audio?.sfx?.('door');
    return new Promise((res) => {
      const t0 = performance.now(); let end = false;
      const stop = () => { if (end) return; end = true; wrap.remove(); res(); };
      wrap.addEventListener('pointerdown', stop);
      const frame = (now) => {
        if (end) return; const t = Math.min(1, (now - t0) / ms), k = up ? t : 1 - t;
        // far peaks: slow pan + sink as we climb
        if (ok(far)) g.drawImage(far, -40 * k, -22 + 22 * k, 680, 382); else { g.fillStyle = '#7fb4e8'; g.fillRect(0, 0, 640, 360); }
        if (night) { g.fillStyle = 'rgba(10,16,48,0.62)'; g.fillRect(0, 0, 640, 360); for (let i = 0; i < 3; i++) { g.fillStyle = ['#7affc8', '#5fd6c4', '#b48cff'][i]; g.globalAlpha = 0.16; for (let x = 0; x < 640; x += 4) g.fillRect(x, 34 + i * 9 + Math.round(Math.sin(x / 70 + now / 900 + i) * 12), 4, 14 - i * 3); } g.globalAlpha = 1; }
        // mid ridge + pylons: scroll down-left along the cable slope (parallax x1)
        const mx = -((k * 900) % 1280), my = 30 + k * 80;
        if (ok(mid)) { if (night) g.filter = 'brightness(0.5) saturate(0.8)'; g.drawImage(mid, mx, my); g.drawImage(mid, mx + 1280, my); g.filter = 'none'; }
        // cable through the trolley, slope ~ -0.32
        const cx = 320, cy = 112 + Math.round(Math.sin(now / 420) * 2);
        g.strokeStyle = '#20232c'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, cy + 6 + 320 * 0.32); g.lineTo(640, cy + 6 - 320 * 0.32); g.stroke();
        if (ok(cab)) { g.save(); g.translate(cx, cy); g.rotate(Math.sin(now / 520) * 0.025); if (night) g.filter = 'brightness(0.7)'; g.drawImage(cab, -39, 0); g.filter = 'none'; if (night) { g.globalAlpha = 0.35 + 0.1 * Math.sin(now / 200); g.fillStyle = '#ffd77a'; g.fillRect(-30, 64, 44, 22); g.globalAlpha = 1; } g.restore(); }
        // snow FX: two depths
        if (ok(snow)) for (let i = 0; i < 26; i++) { const f = (Math.floor(now / 90) + i) % 8, s = i % 3 ? 16 : 32, sp = i % 3 ? 14 : 7; g.drawImage(snow, f * 32, 0, 32, 32, (((i * 97 - now / sp) % 680) + 680) % 680 - 20, (i * 53 + now / (sp - 3)) % 380 - 20, s, s); }
        g.fillStyle = '#ffd77a'; g.font = 'bold 20px monospace'; g.textAlign = 'center'; g.fillText('SKYLIFT', 320, 36);
        if (t >= 1) stop(); else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }
  function promoFx(ms = 1800) {
    if (typeof document === 'undefined') return Promise.resolve();
    const sh = Object.assign(new Image(), { src: 'art/fx/region4/promotion_burst_sheet.png' });
    const c = document.createElement('canvas'); c.width = c.height = 192; c.style.cssText = 'position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);z-index:9002;width:288px;height:288px;image-rendering:pixelated;pointer-events:none'; document.body.appendChild(c);
    const g = c.getContext('2d'); scene.audio?.sfx?.('levelup');
    return new Promise((res) => { const t0 = performance.now(); const fr = (now) => { const t = (now - t0) / ms; g.clearRect(0, 0, 192, 192); if (sh.complete && sh.naturalWidth) { const n = Math.max(1, Math.floor(sh.naturalWidth / sh.naturalHeight)), f = Math.min(n - 1, Math.floor(t * n)); g.drawImage(sh, f * sh.naturalHeight, 0, sh.naturalHeight, sh.naturalHeight, 0, 0, 192, 192); } if (t >= 1) { c.remove(); res(); } else requestAnimationFrame(fr); }; requestAnimationFrame(fr); });
  }
  async function ride(spawn, kind, orig) {
    const up = spawn.exit.to === R4.town;
    st.riding = true; if (scene.player) scene.player.locked = true;
    try { await liftFx(undefined, up); } finally { st.riding = false; }
    if (up && !flags.has(R4.visited)) { set(R4.visited); rita('r4_skylift', { key: 'first' }); }
    scene.log?.push({ tick: scene.tick, type: 'skylift', to: spawn.exit.to });
    return orig(spawn, kind);
  }
  const origWarp = scene.startWarp?.bind(scene);
  if (origWarp && !scene._r4Warp) {
    scene._r4Warp = true;
    scene.startWarp = (spawn, kind) => (kind === 'edge' && spawn?.exit?.ride === 'skylift' && !st.riding ? (ride(spawn, kind, origWarp), undefined) : origWarp(spawn, kind));
  }

  // ---- NPC talk ---------------------------------------------------------------------------------------------------
  const night = () => { const h = scene.clock?.hour ?? 12; return h >= 20 || h < 5; };
  async function talk(o) {
    const id = o.def?.id, sp = o.speaker;
    if (id === 'frostspire_pass_skylift_operator') {
      if (!flags.has(R4.openFlag)) { await say(N('skylift_operator_pass', 'closed'), {}, sp); return true; }
      await say(N('skylift_operator_pass', 'open'), {}, sp);
      if (await ask([N('skylift_operator_pass', 'ask')], ['Yes', 'No'], {}, sp) === 0) { const ex = (scene.map?.json?.exits || scene.map?.exits || []).find((e) => e.to === R4.town) || { to: R4.town, edge: 'north', start: 24, end: 25, offset: 2, ride: 'skylift' }; setTimeout(() => scene.startWarp({ exit: ex, fromX: ex.start, fromY: 0 }, 'edge'), 0); }
      return true;
    }
    if (id === 'frostspire_skylift_operator') {
      await say(night() ? N('skylift_operator', 'night') : N('skylift_operator', 'open'), {}, sp);
      if (await ask([N('skylift_operator', 'ask')], ['Yes', 'No'], {}, sp) === 0) { const ex = (scene.map?.json?.exits || scene.map?.exits || []).find((e) => e.to === R4.pass) || { to: R4.pass, edge: 'south', start: 26, end: 27, offset: -2, ride: 'skylift' }; setTimeout(() => scene.startWarp({ exit: ex, fromX: ex.start, fromY: 45 }, 'edge'), 0); }
      return true;
    }
    if (id === 'frostspire_climber') return coldHands(sp);
    if (id === 'frostspire_rt_supervisor') {
      hookRt();
      const p = nextPromotion(D.promotions, { has });
      if (p && flags.has(p.hold_flag)) {
        if (!needsMet(p, { has })) { await say(N('rt_supervisor', 'hold'), { task: p.quest_desc }, sp); return true; }
        await ceremony(p, sp); await say(N('rt_supervisor', 'after'), {}, sp); return true;
      }
      await say(N('rt_supervisor', 'idle'), {}, sp); return true;
    }
    if (id === 'frostspire_kid_sledder') { await say(N('kid_sledder', flags.has('beat_master_frostspire') ? 'after_master' : 'default'), {}, sp); return true; }
    if (id === 'frostspire_hut_keeper') {
      await say(N('hut_keeper', flags.has('beat_master_frostspire') ? 'after_master' : night() ? 'night' : 'default'), {}, sp);
      // v6 soul: the keeper offers tea (placeholder lines; Text Bot request in data/textbot_requests_region4.md)
      if (await ask([N('hut_keeper', 'tea_offer')], ['Yes', 'No'], {}, sp) === 0) { scene.audio?.sfx?.('select'); await say(N('hut_keeper', 'tea_yes'), {}, sp); set('r4_had_tea'); }
      else await say(N('hut_keeper', 'tea_no'), {}, sp);
      return true;
    }
    return false;
  }
  async function coldHands(sp) {
    const bag = sys()?.bag;
    if (flags.has('sq_cold_done')) { await say(N('climber', 'after'), {}, sp); return true; }
    if (!flags.has('sq_cold_start')) { await say(N('climber', 'start'), {}, sp); set('sq_cold_start'); return true; }
    if (bag?.has?.('fern_mint_tea')) {
      bag.remove('fern_mint_tea', 1); set('sq_cold_tea');
      await say(N('climber', 'give'), {}, sp);
      bag.add('tonic_large', 1); await say([N('climber', 'received')]);
      set('sq_cold_done'); return true;
    }
    await say(N('climber', 'waiting'), {}, sp); return true;
  }
  const S = sys();
  if (S && !S._r4Hooked && S.onTalk) {
    S._r4Hooked = true;
    const prev = S.onTalk.bind(S);
    S.onTalk = async (o) => (o?.mapName === R4.town || o?.mapName === R4.pass) && await talk(o) ? true : prev(o);
  }
  seedRita(); hookRt();
  const iv = typeof setInterval !== 'undefined' && typeof window !== 'undefined' ? setInterval(() => { try { seedRita(); tick(); } catch (e) { console.error('region4 tick:', e); } }, 1000) : null;
  const soul = typeof scene.view === 'function' && typeof setInterval === 'function' && typeof document !== 'undefined' ? attachSoul(scene, { mobile: scene.opts?.platform?.id === 'mobile' }) : null; // v6 item 7
  const api = { state: st, tick, talk, ceremony, clamp, hookRt, liftFx, soul, stop: () => { if (iv) clearInterval(iv); soul?.stop(); }, data: D };
  scene.region4 = api;
  return api;
}

export async function loadRegion4Data(url = new URL('../../data/region4/region4.json', import.meta.url)) {
  if (typeof fetch !== 'undefined' && !String(url).startsWith('file:')) return (await fetch(url)).json();
  const fs = await import('node:fs'); return JSON.parse(fs.readFileSync(new URL(url), 'utf8'));
}
