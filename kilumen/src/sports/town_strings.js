// PLACEHOLDER player-facing text for the town practice events (Oct 29 2026). Text Bot: please replace;
// request in data/textbot_requests_overnight_1029.md. Keys are stable; {creature} {score} {unit} {best} fill in.
export const TS = {
  coach_name: 'Practice Coach',
  not_ready: 'The practice course is still being built. Come back once the way here is open.',
  pick: 'Who runs it?', start: 'Start', again: 'Again', back: 'Back', best: 'Best: {best} {unit}', none_yet: 'No best yet',
  result: '{creature}: {score} {unit}', new_best: 'New best!',
  grade_gold: 'Gold pace', grade_silver: 'Silver pace', grade_bronze: 'Bronze pace', grade_none: 'Keep at it',
  react_gold: ['{creature} is buzzing and wants another go.', '{creature} puffs up, very pleased with itself.'],
  react_silver: ['{creature} shakes off and looks at you. One more?', '{creature} nods. That felt good.'],
  react_bronze: ['{creature} is panting, but it kept going.', '{creature} looks back at the course, thinking.'],
  react_none: ['{creature} flops down. That was a lot.', '{creature} gives the course a dirty look.'],
  garden_hop: { title: 'Fernwick Garden Hop', hello: 'Lily pads and stepping stones! Jump as the pad rises. Only one pad of each pair holds. Watch for the flower.', how: '◀ / ▶ jump to the left or right pad' },
  tide_run: { title: 'Saltmere Tide Run', hello: 'Cross the causeway before the tide eats it. The waves will not wait for you.', how: '▲ / A step forward, ◀ ▶ sidestep, ▼ step back' },
  signal_relay: { title: 'Revival Heights Signal Relay', hello: 'The lab lamps flash a signal. Your team passes it along, one longer each leg. Three slips and the relay is done.', how: 'Repeat the lamps: ▲ ▶ ▼ ◀' },
  ice_slide: { title: 'Frostspire Ice Slide', hello: 'The ice does what it likes. Lean early, slide through the flags, keep off the cracks.', how: 'Hold ◀ / ▶ to lean' },
  lantern_catch: { title: 'Lanternport Lantern Catch', hello: 'Catch the lights as they drift down to the drum. Tap A on the beat for a perfect catch. Leave the soot alone!', how: '◀ ▶ or drag to move, A on the beat' },
  forge_push: { title: 'Cindervale Forge Push', hello: 'Push the ore cart up to the furnace. Hit A when the marker is in the hot zone. Stop pushing and it rolls back.', how: 'A when the marker is in the zone' },
  pop_perfect: 'Perfect!', pop_splash: 'Splash!', pop_sink: 'Too slow!', pop_washed: 'Washed back!', pop_fall: 'Whoa!', pop_soot: 'Soot!', pop_miss: 'Miss', pop_good: 'Good',
};
export const tt = (s, v = {}) => String(s ?? '').replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');
