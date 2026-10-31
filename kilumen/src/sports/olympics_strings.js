// PLACEHOLDER player text for the Olympics (dev/olympics, Oct 30 2026). Text Bot: please replace. Keys are stable.
// {venue} {event} {n} {of} {place} {pts} {prize} {merit} {missing} {creature}
export const OS = {
  menu: 'Olympics', title: '{venue} Olympics', leave: 'Leave',
  venue: { fernwick: 'Fernwick', saltmere: 'Saltmere', revival_heights: 'Revival Heights', frostspire: 'Frostspire', lanternport: 'Lanternport', cindervale: 'Cindervale', aurelith: 'Aurelith' },
  events: { sprint: 'Sprint', hurdles: 'Hurdles', lift: 'Weight Lift', marathon: 'Long Run', archery: 'Target Toss', swim: 'Harbour Swim',
    hop: 'Garden Hop', haul: 'Harbour Haul', relay: 'Signal Relay', slide: 'Ice Slide', catch: 'Lantern Catch', push: 'Forge Push' },
  stats: { speed: 'Speed', power: 'Power', stamina: 'Stamina', agility: 'Agility', focus: 'Focus' },
  intro: 'Three events in a row. Pick a different Kilu for each one. 1st scores 3, 2nd 2, 3rd 1.',
  assign_hint: 'Tap an event, then tap a Kilu to send it there.',
  start: 'Start', next: 'Next event', results: 'Results', final: 'Final standings', done: 'Done',
  event_n: 'Event {n} of {of}: {event}', board: 'Results: {event}', standings: 'Standings after {n} of {of}',
  col_place: '#', col_trainer: 'Trainer', col_kilu: 'Kilu', col_score: 'Score', col_pts: 'Pts', col_total: 'Total',
  you: 'You', champ: '{venue} Olympics Champion!', won: 'Champion! +{prize} gold, +{merit} merit.', placed: 'Finished {place}. +{merit} merit.',
  first_win: 'First {venue} title!',
  anim_go: 'GO!', anim_finish: 'FINISH!', anim_skip: 'Tap to skip',
  locked_town: 'The {venue} Olympics are for trainers who have won the {venue} Battle Hall.',
  locked_aurelith: 'The Aurelith Olympics are for champions of every town Olympics. Towns still to win: {missing}.',
  team: 'You need at least three Kilu ready to compete.', entered: 'You already competed here today. Come back tomorrow.',
};
export const ot = (s, v = {}) => String(s ?? '').replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');
// Winner-circle podium (olympics_podium.js). PLACEHOLDER, Text Bot please replace. {n} {of} {event} {venue} {kilu} {place} {trainer} {prize} {merit}
Object.assign(OS, {
  pod_title: 'Event {n} of {of}: {event}', pod_standings: 'Standings after {n} of {of}', pod_final: 'Final standings',
  pod_you_placed: 'Your {kilu} took {place}!', pod_you_missed: '{kilu} gave it everything!',
  pod_champ_title: '{venue} Olympics Champion', pod_champ_name: '{trainer} and {kilu}!',
  pod_you_champ: 'You are the champion!', pod_you_finished: 'You finished {place}.',
  pod_gold: '+{prize} gold', pod_merit: '+{merit} merit', pod_first: 'First {venue} title!',
  pod_win_event: '{event} winner!', pod_skip: 'Tap to skip', pod_continue: 'Tap to continue',
});
