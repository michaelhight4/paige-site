// NPC gifts (coder, region 2, Oct 23 2026): the Survey Parcel -> Courier Bike chain (CRITICAL_PATH saltmere_office_clerk,
// data/quests.json mq_saltmere_parcel) had text but no code. Hooked from systems.onTalk (src/systems/index.js), so the
// overworld talk() flow (src/overworld/overworld.js) is untouched. All words come from text/overworld_lines.json (Text Bot);
// the strings below are FALLBACKS only, each with its requested key in data/textbot_requests_region2.md.
//  - brookhollow.rt_guard_east: after beat_master_fernwick, the first talk hands over the Survey Parcel (blockers.
//    gate_brookhollow_east.gives) and sets has_survey_parcel. Later talks use the normal lines (v_has_survey_parcel).
//  - saltmere_office_int.saltmere_office_int_clerk: with the parcel (and no bike) gives the Courier Bike (sets has_bike)
//    plus the office gift, 3x Prime Crystal (was floor item saltmere_item_4 at Saltmere 37,21, GD sm_office_gift); without
//    the parcel a "deliveries only" line. With the bike: normal lines (v_has_bike).
// No gates are added: nothing here blocks a road (Gary: areas stay open).

export const OFFICE_GIFT = { item: 'dominance_crystal_plus', qty: 3, flag: 'got_office_gift_saltmere' };
const FB = {
  parcel_received: ['{player} received the Survey Parcel!'],
  no_parcel: ['Revival Tech, Saltmere office. Deliveries only.', "No parcel? Then there's nothing here for you. Yet."],
  office_gift: ['{player} also received 3 Prime Crystals!'],
};

/** Which gift (if any) this talk is: 'parcel' | 'bike' | 'no_parcel' | null. Pure (flags = Set). */
export function giftFor(mapName, id, flags) {
  if (mapName === 'brookhollow' && id === 'rt_guard_east') {
    return flags.has('beat_master_fernwick') && !flags.has('has_survey_parcel') && !flags.has('has_bike') ? 'parcel' : null;
  }
  if (mapName === 'saltmere_office_int' && id === 'saltmere_office_int_clerk') {
    if (flags.has('has_bike')) return null;
    return flags.has('has_survey_parcel') ? 'bike' : 'no_parcel';
  }
  return null;
}

/** systems.onTalk hook. Returns true when it handled the talk. */
export async function giftTalk(sys, { mapName, def, entry, line, speaker }) {
  const sc = sys.scene, flags = sc.flags || new Set();
  const kind = giftFor(mapName, def.id, flags);
  if (!kind) return false;
  const set = (f) => (sc.setFlag ? sc.setFlag(f, true) : flags.add(f));
  if (kind === 'parcel') {
    await sys.say(line?.pages || entry.pages, {}, speaker);
    const g = sys.text('blockers.gate_brookhollow_east.gives', null);
    await sys.say(g?.received || FB.parcel_received);
    set(g?.sets_flag || 'has_survey_parcel');
    return true;
  }
  if (kind === 'no_parcel') {
    const l = (entry.lines || []).find((x) => x.id === 'v_no_parcel');
    await sys.say(l?.pages || entry.no_parcel || FB.no_parcel, {}, speaker);
    return true;
  }
  // bike: the default line is the hand-over line
  const bike = sys.text('items.bike', {}) || {};
  await sys.say(entry.pages || bike.giver_pages, {}, speaker);
  await sys.say(entry.received || bike.received || ['{player} received the Courier Bike!']);
  set('has_bike');
  if (!flags.has(OFFICE_GIFT.flag)) {
    sys.bag?.add?.(OFFICE_GIFT.item, OFFICE_GIFT.qty);
    await sys.say(entry.office_gift || FB.office_gift);
    set(OFFICE_GIFT.flag);
  }
  await sys.say(entry.tip || bike.tip || []);
  if (sc) sc._dirty = true;
  return true;
}
