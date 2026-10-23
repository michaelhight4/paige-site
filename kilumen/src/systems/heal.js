// Kilumen heal counter + blackout. systems-gd pass, Oct 22, 2026.
// Carers: heal_brookhollow_carer / heal_fernwick_carer (and the shared heal_centre_int healer): full HP, status
// and energy, free (map text: "Staff rest for free"). Resting sets the last-heal point. Losing with the whole
// party out cold (the engine reports a loss) -> onPartyFainted(): flat regional copay, warp to the last heal
// point, everyone rested. Warmth is never touched.
import { getShops, regionOf } from './shop.js?v=v0.2.1-alpha';
import { fmtMoney } from './config.js?v=v0.2.1-alpha';

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

/** Copay for a blackout at this heal point: flat regional fee, capped at what you have. */
export function copayFor(point, coins, shops = getShops()) {
  const fee = regionOf(point?.zone, shops).copay;
  const paid = Math.min(fee, Math.max(0, coins));
  return { fee, paid, short: paid < fee };
}

export class Heal {
  /** sys: Systems (index.js) {scene, party, wallet, state, cfg, lines} */
  constructor(sys) { this.sys = sys; }
  get state() { return this.sys.state; }
  lastHeal() { return this.state.lastHeal || healPoint(branchByZone(null)); }
  setLastHeal(b) { this.state.lastHeal = healPoint(b); }

  /** Full rest: party + last heal point. */
  restAt(b) {
    this.sys.party.healAll();
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
      const r = copayFor(to, this.sys.wallet.coins);
      await sc.say(T.lost?.pages || ['Your whole team is out cold.', 'Time to get them to a branch. Fast.']);
      this.sys.wallet.take(r.paid);
      this.sys.party.healAll();
      if (to.returnDoor) sc.lastDoor = { ...to.returnDoor };
      await warpAndWait(sc, { map: to.map, x: to.x, y: to.y, facing: to.facing }, 'blackout');
      const city = regionOf(to.zone).city;
      await this.sys.say(T.carried?.pages || ['You hurry back to the {city} branch...'], { city });
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
