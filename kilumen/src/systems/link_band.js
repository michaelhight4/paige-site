// Team Link Band grant (Oct 29 2026, task C). Region 2, Saltmere: the fisher on the pier notices your team has grown and
// hands over the band once (needs Master 1 beaten and 3+ team members, so it lands partway through region 2).
// PLACEHOLDER lines (Text Bot owns overworld_lines.json): data/textbot_requests_overnight_1029.md asks for the real ones.
export const LINK_BAND = { item: 'team_link_band', map: 'saltmere', npcId: 'saltmere_fisher', flag: 'got_team_link_band', needFlag: 'beat_master_fernwick', minTeam: 3 };
export const LINK_LINES_PH = {
  give: ['Big team you\'ve got. Half of them just sit on the bench, eh?', 'Here. A Team Link Band. Whoever holds it learns from watching, even if they never step in.', 'You got the Team Link Band!', 'Give it to someone in your Pack, gear pocket.'],
  after: ['The band works best on the little ones. They watch everything.'],
};
export function canGrant({ flags, party }) {
  return !flags.has(LINK_BAND.flag) && flags.has(LINK_BAND.needFlag) && (party || []).filter(Boolean).length >= LINK_BAND.minTeam;
}
export function attachLinkBand(scene, sys) {
  if (!sys || sys._linkBandHooked) return; sys._linkBandHooked = true;
  const at = (fx, fy) => {
    if (scene.map?.name !== LINK_BAND.map) return false;
    const live = scene.npcs?.list?.find?.((n) => (n.def?.id || n.id) === LINK_BAND.npcId);
    return !!live && live.x === fx && live.y === fy;
  };
  const prev = sys.onInteract.bind(sys);
  sys.onInteract = (fx, fy) => {
    if (at(fx, fy) && canGrant({ flags: scene.flags, party: scene.party })) {
      scene.script(async () => {
        await scene.say?.(LINK_LINES_PH.give, { name: 'Fisher' });
        sys.bag.add(LINK_BAND.item, 1);
        scene.setFlag ? scene.setFlag(LINK_BAND.flag, true) : scene.flags.add(LINK_BAND.flag);
        scene._dirty = true;
      });
      return true;
    }
    return prev(fx, fy);
  };
}
