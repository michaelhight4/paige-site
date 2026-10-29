// Badges tab definitions (data only). Text Bot owns every string: each entry has a key under system_badges.<id>.{name,desc};
// the screen falls back to the placeholder name below until Text Bot fills it. Players see "coin", never "badge", in text.
// kinds: coin (Master coins, the display case), title (tournaments; stack), event (town signature events; stack),
// milestone (counts). comingSoon: shows locked with a "coming soon" plate and never unlocks (Olympics-style competition is
// parked: dev_notes/kilumen.md "Sports / Olympics", each town has a signature event, Aurelith hosts the major).

const flag = (f) => (c) => (c.flags?.has?.(f) ? 1 : 0);

export const COIN_MASTERS = [ // RON_PUNCH_LIST order (src/overworld/ron_whereabouts.js)
  ['fernwick', 'beat_master_fernwick'], ['saltmere', 'beat_master_saltmere'], ['revival_heights', 'beat_master_revival'],
  ['frostspire', 'beat_master_frostspire'], ['mirefen', 'beat_master_mirefen'], ['tidewater_coast', 'beat_master_tidewater'],
  ['lanternport', 'beat_master_lanternport'], ['cindervale', 'beat_master_cindervale'],
];

// town signature events (src/sports/town_events.js EVENTS + Brookhollow Dash). Local cups: src/sports/town_cup.js (every 3 days, staggered per town).
export const TOWN_EVENTS = [
  ['brookhollow_dash', 'brookhollow'], ['garden_hop', 'fernwick'], ['tide_run', 'saltmere'], ['signal_relay', 'revival_heights'],
  ['ice_slide', 'frostspire'], ['lantern_catch', 'lanternport'], ['forge_push', 'cindervale'],
];

const masters = (c) => COIN_MASTERS.filter(([, f]) => c.flags?.has?.(f)).length;
const caught = (c) => c.kilindex?.caughtCount ?? 0;

export const ACH_DEFS = [
  ...COIN_MASTERS.map(([town, f], i) => ({ id: `coin_${town}`, kind: 'coin', town, slot: i + 1, art: 'master_coin', value: flag(f), ph: `Master coin ${i + 1}` })),
  { id: 'title_brookhollow_dash', kind: 'title', town: 'brookhollow', art: 'master_coin', ribbon: 'gold', stack: true, value: (c) => c.sports?.wins || 0, ph: 'Brookhollow Dash champion' },
  // town cups are live (dev/sports-events): each badge counts that town's cup wins (Dash: its tournament wins), stacking
  ...TOWN_EVENTS.map(([ev, town]) => ({ id: `event_${ev}`, kind: 'event', town, art: 'medal_silver', stack: true, ph: `Local ${ev.replace(/_/g, ' ')} cup`,
    value: ev === 'brookhollow_dash' ? (c) => c.sports?.wins || 0 : (c) => c.sports?.town?.[ev]?.cups || 0 })),
  { id: 'games_aurelith_major', kind: 'event', town: 'aurelith', art: 'master_coin', ribbon: 'gold', stack: true, comingSoon: true, major: true, ph: 'Aurelith Games champion' },
  { id: 'ms_masters_1', kind: 'milestone', art: 'medal_bronze', max: 1, value: masters, ph: 'First Master beaten' },
  { id: 'ms_masters_4', kind: 'milestone', art: 'medal_silver', max: 4, value: masters, ph: 'Four Masters beaten' },
  { id: 'ms_masters_8', kind: 'milestone', art: 'master_coin', max: 8, value: masters, ph: 'All eight Masters beaten' },
  { id: 'ms_kilindex_10', kind: 'milestone', art: 'medal_bronze', max: 10, value: caught, ph: 'Kilindex: 10 caught' },
  { id: 'ms_kilindex_50', kind: 'milestone', art: 'medal_silver', max: 50, value: caught, ph: 'Kilindex: 50 caught' },
  { id: 'ms_kilindex_100', kind: 'milestone', art: 'master_coin', max: 100, value: caught, ph: 'Kilindex: 100 caught' },
];
