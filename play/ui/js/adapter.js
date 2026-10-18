// adapter.js — the ONLY interface the UI uses to touch game state.
// By default it uses the real engine (src/engine_adapter.js). To wire the real engine:
//   (a) call setAdapter(myEngineAdapter) before ui boot, or
//   (b) load index.html?adapter=./my_engine_adapter.js  (module must `export default` an object/class instance
//       or class implementing the methods listed in ADAPTER.md).
// Each method below forwards to the current implementation and logs the call (see adapter.calls) for tests.


export const METHODS = [
  // core
  'init', 'getConfig', 'getState', 'age', 'resolveEvent', 'getJournal', 'newLife',
  // occupation
  'getOccupationMenu', 'getEducation', 'enroll', 'dropOut', 'getJobs', 'applyJob', 'quitJob',
  'getFreelanceGigs', 'doGig', 'getPartTimeJobs', 'applyPartTime', 'quitPartTime', 'getFight', 'fight',
  'getCareerCollections', 'collectCareer',
  // sports
  'getSportsCareer', 'joinSport', 'sportsAction',
  // assets
  'getAssetsMenu', 'getFinances', 'payDebt', 'takeLoan', 'getInvestments', 'invest', 'divest', 'getLuxury',
  'getAuctionHouses', 'bid', 'buildEnclosure', 'blackjackAction', 'getCasino', 'gamble', 'getGarage', 'buyRaceCar', 'upgradeRaceCar', 'race',
  'getZoo', 'buyZoo', 'buyAnimal', 'sellAnimal', 'getBelongings', 'getProperties', 'getShops', 'getShopInventory',
  'refreshInventory', 'buy', 'sellAsset', 'assetAction', 'getRestorationProjects', 'restoreCar',
  // relationships
  'getRelationships', 'getRelationshipActions', 'interact', 'haveChild', 'findPartner',
  // activities / will / surrender
  'getActivities', 'getActivityChoices', 'doActivity', 'instantDegree', 'getFamilyTree', 'getCemetery',
  'getPremium', 'setPremiumFlag', 'setSubscription', 'applyPremiumNow', 'resetPremium', 'getSettings', 'getWill', 'saveWill', 'surrender',
  // profile / legacy
  'getProfile', 'getLegacy', 'continueAsHeir', 'getDeathSummary'
];

let impl = null;
export const calls = [];
const base = { calls, get impl() { return impl; } };
// any method the implementation exposes is forwarded (METHODS documents the contract; additions need no registration)
export const adapter = new Proxy(base, { get(t, k) { if (k in t) return t[k]; if (typeof k !== 'string' || k === 'then') return undefined; return async (...args) => { if (!impl || typeof impl[k] !== 'function') throw new Error(`Adapter method not implemented: ${k}`); calls.push({ m: k, args }); return impl[k](...args); }; } });
for (const m of METHODS) {
  base[m] = async (...args) => {
    if (typeof impl[m] !== 'function') throw new Error(`Adapter method not implemented: ${m}`);
    calls.push({ m, args });
    return impl[m](...args);
  };
}
export function setAdapter(a) { impl = a; return adapter; }

export async function bootAdapter() {
  const q = new URLSearchParams(location.search);
  if (q.get('adapter')) {
    const mod = await import(q.get('adapter'));
    const X = mod.default; setAdapter(typeof X === 'function' ? new X() : X);
  } else {
    const { EngineAdapter } = await import('../../src/engine_adapter.js');
    setAdapter(new EngineAdapter({ seed: q.get('seed') ? Number(q.get('seed')) : undefined, fresh: q.get('fresh') === '1', noSave: q.get('nosave') === '1', platform: q.get('platform') || undefined, steamSub: q.get('steamsub') != null ? q.get('steamsub') === '1' : undefined, startFlow: q.get('fresh') !== '1' && q.get('age') == null }));
  }
  await adapter.init();
  // mock-only convenience: ?age=18 jumps to a populated life so every screen has data
  if (q.get('age') && typeof impl.debugSetup === 'function') await impl.debugSetup({ age: Number(q.get('age')), cash: Number(q.get('cash') || 250000), rich: q.get('rich') !== '0' });
  return adapter;
}
export default adapter;
