// Kilumen heal counter + blackout. systems-gd pass, Oct 22, 2026.
// Carers: heal_brookhollow_carer / heal_fernwick_carer (and the shared heal_centre_int healer): full HP, status
// and energy, free (map text: "Staff rest for free"). Resting sets the last-heal point. Losing with the whole
// party out cold (the engine reports a loss) -> onPartyFainted(): flat regional copay, warp to the last heal
// point, everyone rested. Warmth is never touched.
import { getShops, regionOf } from './shop.js?v=v0.2.102-alpha';
import { fmtMoney } from './config.js?v=v0.2.102-alpha';
import { RON_FINAL } from '../battle/data/ron_team.js?v=v0.2.102-alpha';

let active = null; // the attached Systems (index.js) so the battle code can call onPartyFainted() with no args
export function setActiveSystems(sys) { active = sys; }

export function branchByMap(mapName, shops = getShops()) { return shops.branches[mapName] ? { id: mapName, ...shops.branches[mapName] } : null; }
export function branchByCarer(defId, shops = getShops()) {
  const e = Object.entries(shops.branches).find(([, b]) => b.carer === defId);
  return e ? { id: e[0], ...e[1] } : null;
}
export function branchByZone(zone, shops = getShops()) {
  const e = Object.entries(shops.branches).find(([, b]) => b.zone === zone);
  return e ? { id: e[0], ...e[1] } : { id: shops.defaultBranch, ...shops.branches[shops.defaultBranch] };
}
/** Last-heal warp point for a branch (stored in save.systems.lastHeal). */
export const healPoint = (b) => ({ branch: b.id, map: b.id, x: b.stand.x, y: b.stand.y, facing: b.stand.facing || 'up', zone: b.zone, returnDoor: b.returnDoor || null });

/** The heal point as the player actually used it. Mirefen / Tidewater (and old Aurelith saves) reuse the heal_brookhollow
 *  interior, so the branch's own returnDoor would walk a blacked-out player out into Brookhollow: take the town door
 *  they came in through (scene.lastDoor) and that town's zone instead (bug fix Oct 30 2026). */
export function visitPoint(b, sc) {
  const p = healPoint(b), from = sc?.lastDoor;
  if (sc?.map?.name === b.id && from?.map && from.map !== p.returnDoor?.map && from.map !== b.id) {
    return { ...p, zone: sc.zone?.() || from.map, returnDoor: { map: from.map, x: from.x, y: from.y } };
  }
  return p;
}

/** No heal point yet: the branch in the current zone, else the closest one on the world map (world_layout map_pos),
 *  else the default branch (Brookhollow). */
export function nearestBranch(zone, layout, shops = getShops(), reached = null) {
  // Playtest fix Oct 30 2026: only branches the player has reached (`reached(b)`), so an early route1 loss no longer
  // picks the endgame Cairnfold branch just because Wellspire is closest on the world map.
  const all = Object.entries(shops.branches).map(([id, b]) => ({ id, ...b })).filter((b) => !reached || b.id === shops.defaultBranch || reached(b));
  const here = zone && all.find((b) => b.zone === zone);
  if (here) return here;
  const zs = layout?.zones || [], pos = (id) => zs.find((z) => z.id === id)?.map_pos;
  const at = pos(zone);
  if (at) {
    let best = null, bd = Infinity;
    for (const b of all) { const q = pos(b.zone); if (!q) continue; const d = (q.x - at.x) ** 2 + (q.y - at.y) ** 2; if (d < bd) { bd = d; best = b; } }
    if (best) return best;
  }
  return { id: shops.defaultBranch, ...shops.branches[shops.defaultBranch] };
}

/** Copay for a blackout at this heal point: flat regional fee, capped at what you have. `cover` = RT Employee Benefits
 * Copay Coverage share (0..1, region 2 build Oct 23 2026: sys.rtBenefits.effect('copay_coverage')). */
export function copayFor(point, coins, shops = getShops(), cover = 0) {
  const c = Math.min(1, Math.max(0, Number(cover) || 0)), fee = Math.round(regionOf(point?.zone, shops).copay * (1 - c));
  const paid = Math.min(fee, Math.max(0, coins));
  return { fee, paid, short: paid < fee };
}

/** Final Ron gate (ron_team.js RON_FINAL): a heal after the last tower battle (tower floor 8 flag, final Ron not beaten yet) sets
 *  tower_healed (RON_FINAL.requires), which brings Ron to the tower bottom. Replaces Ron's free heal at the tower top (ron.roof_heal). */
export function markTowerHeal(sc) {
  const f = sc?.flags;
  const [done, healed] = RON_FINAL.requires;
  if (f?.has?.(done) && !f.has(RON_FINAL.winFlag) && !f.has(healed)) f.add(healed);
}

export class Heal {
  /** sys: Systems (index.js) {scene, party, wallet, state, cfg, lines} */
  constructor(sys) { this.sys = sys; }
  get state() { return this.sys.state; }
  /** Last heal centre visited / rested at; none yet -> the nearest branch; nothing known -> Brookhollow. */
  /** Has the player reached this branch's town (walked into the town / its heal centre)? */
  reached(b) {
    const sc = this.sys.scene, town = b.returnDoor?.map;
    let zone = null; try { zone = sc?.zone?.() || null; } catch { zone = null; }
    return (this.state.reachedBranches || []).includes(b.id) || (!!zone && b.zone === zone) || !!(town && sc?.flags?.has?.(`visited_${town}`));
  }
  /** Entering a town map (or its branch) marks the branch reached. */
  markReached(mapName) {
    if (!mapName) return;
    let shops; try { shops = getShops(); } catch { return; }
    const list = (this.state.reachedBranches ||= []);
    for (const [id, b] of Object.entries(shops.branches)) if ((id === mapName || b.returnDoor?.map === mapName) && !list.includes(id)) list.push(id);
  }
  lastHeal() {
    const sc = this.sys.scene;
    let lh = this.state.lastHeal;
    // Old saves: a blackout before this fix could have stored an unreached branch (heal_cairnfold): drop it.
    if (lh && lh.branch) { let b = null; try { b = branchByMap(lh.branch); } catch { b = null; } if (b && b.id !== getShops().defaultBranch && !this.reached(b)) lh = null; }
    if (lh) {
      // Old saves: a town that borrowed another branch's interior (Cairnfold -> heal_brookhollow before Oct 30 2026) and has its
      // own branch now: respawn in that town's branch, not the borrowed one.
      const own = lh.returnDoor?.map && Object.entries(getShops().branches).find(([id, b]) => b.returnDoor?.map === lh.returnDoor.map && id !== lh.map);
      return own ? healPoint({ id: own[0], ...own[1] }) : lh;
    }
    let zone = null; try { zone = sc?.zone?.() || null; } catch { zone = null; }
    return healPoint(nearestBranch(zone, sc?.layout, undefined, (b) => this.reached(b)));
  }
  setLastHeal(b) { this.state.lastHeal = visitPoint(b, this.sys.scene); }
  /** Walking into a heal centre counts as using it (the blackout comes back here). */
  onEnterMap(m) { this.markReached(m?.name); const b = m?.name && branchByMap(m.name); if (b) { this.setLastHeal(b); return true; } return false; }

  /** Full rest: party + last heal point. */
  restAt(b) {
    this.sys.party.healAll();
    markTowerHeal(this.sys.scene);
    this.setLastHeal(b);
    this.state.heals = (this.state.heals || 0) + 1;
    const sc = this.sys.scene;
    if (sc) { sc.healedAt = sc.ms; sc.log?.push({ tick: sc.tick, type: 'heal', branch: b.id }); sc._dirty = true; }
  }

  /** The carer talk script. Returns true when handled (overworld.js talk hook). */
  async carerTalk({ mapName, def, entry, line, speaker }) {
    const sc = this.sys.scene, T = this.sys.lines?.system_heal || {};
    const b = branchByCarer(def.id) || branchByMap(mapName) || (entry?.after_heal ? branchByZone(sc?.zone?.()) : null);
    if (!b) return false;
    const L = T.choices?.labels || { rest: 'Rest my team', rest_go: 'Rest and go', skip_recal: 'Heal only, skip retune', no: 'Not now' };
    const opts = ['rest'];
    if ((this.state.heals || 0) > 0) opts.push('rest_go');
    if (sc?.flags?.has('read_drift_log')) opts.push('skip_recal');
    opts.push('no');
    const pick = opts[await sc.ask(line?.pages || entry.pages, opts.map((k) => L[k]), speaker)] || 'no';
    if (pick === 'no') { await sc.say(entry.declined || ["Okay. They'll still be tired later, just so you know."], speaker); return true; }
    if (pick === 'rest') {
      await sc.say(T.taking?.pages || ['Hand them over. Quick recalibrate and polish...'], speaker);
      await sc.say(T.machine?.pages || ['Whirr... click... ding.'], speaker);
      await this.sys.ui?.fx?.healFx?.(sc, this.sys.party?.size ?? this.sys.party?.list?.length); // Animator heal_restore at the machine cradle (ui_tools2.js; skipped when motion is reduced)
    }
    this.restAt(b);
    // Heal board (src/ui/systems_screens.js): the rested team on screen before the carer's closing line.
    if (this.sys.ui && this.sys.cfg.healBoard) await new Promise((res) => this.sys.ui.open('sys_heal', { branch: b, done: true, onClose: res }));
    if (pick === 'skip_recal') sc.bump?.('skip_recal');
    const after = pick === 'rest' ? entry.after_heal || T.returning?.pages : T[pick]?.pages;
    await sc.say(after || ['Here you go. Health, energy, the lot.', 'Come back whenever. We never close.'], speaker);
    return true;
  }

  /**
   * Whole party out cold (battle reported a loss). Copay, warp to the last heal point, rest everyone.
   * Safe to call inside a running dialogue script (scene.busy) or on its own. -> {fee, paid, short, to}
   */
  async blackout() {
    const sc = this.sys.scene, T = this.sys.lines?.system_blackout || {};
    const run = async () => {
      const to = this.lastHeal();
      const r = copayFor(to, this.sys.wallet.coins, undefined, this.sys.rtBenefits?.effect?.('copay_coverage') || 0);
      await sc.say(T.lost?.pages || ['Your whole team is out cold.', 'Time to get them to a branch. Fast.']);
      this.sys.wallet.take(r.paid);
      this.sys.party.healAll();
      markTowerHeal(sc);
      if (to.returnDoor) sc.lastDoor = { ...to.returnDoor };
      await warpAndWait(sc, { map: to.map, x: to.x, y: to.y, facing: to.facing }, 'blackout');
      const city = regionOf(to.zone).city;
      await this.sys.say(T.carried?.pages || ['You hurry back to the {city} branch...'], { city });
      // Gary 2:42 PM CT Oct 23 2026: the blackout rest plays the heal_restore machine animation too (map loaded + player placed by
      // now, so fx_art.js findMachine sees the cradle). Branch with no machine / reduced motion -> ui.fx.motion.heal.skipped says why.
      await this.sys.ui?.fx?.healFx?.(sc, this.sys.party?.size ?? this.sys.party?.list?.length);
      await this.sys.say(T.copay?.pages || ['Company health plan covers the rest.', 'Your copay is {fee}.'], { fee: fmtMoney(r.fee) });
      if (r.short) await sc.say(T.copay_short?.pages || ["Can't cover the copay? We'll take what you've got.", "We'll cover the rest. This once."]);
      await sc.say(T.carer?.pages || ["Rest, then try again. They'll be fine."]);
      sc.healedAt = sc.ms; sc.log?.push({ tick: sc.tick, type: 'blackout', fee: r.fee, paid: r.paid, to: to.map });
      this.sys.state.blackouts = (this.sys.state.blackouts || 0) + 1;
      return { ...r, to };
    };
    if (sc.busy) return run();
    let out = null;
    await sc.script(async () => { out = await run(); });
    return out;
  }
}

/** startWarp, then wait until the fade has finished (the map is loaded and the player placed). */
export async function warpAndWait(sc, spawn, kind) {
  sc.startWarp(spawn, kind);
  const t0 = Date.now();
  while (sc.fade && Date.now() - t0 < 8000) await new Promise((r) => setTimeout(r, 16));
}

/**
 * Battle code entry point: the engine reported a loss with the whole party out cold.
 * Uses the systems attached to the running scene (attachSystems). -> Promise<{fee, paid, short, to}|null>
 */
export function onPartyFainted(sys = active) {
  return sys ? sys.heal.blackout() : Promise.resolve(null);
}
