# Mid-life choices — 0.1.2-alpha / lifechoices1

## Where
- Desktop: **New Life** / **Give Up** beneath the character stats.
- Phone browser: **More → Settings**, beneath Music; targets at least 48px high.
- Both ask for confirmation. Cancel changes nothing. Stop Autopilot first; selecting either while it runs requests Stop and asks you to choose again after it stops.

## What is kept
- **New Life:** abandon the current life and open character creation. No new Echo, inheritance, cemetery entry, or end-of-life reward is awarded. Previously earned meta Legacy, goals, achievements and Echoes remain. Creation itself survives refresh.
- **Give Up:** exactly the existing natural-death path (`unknown` cause), with current age/skills/wealth unchanged. Select the usual earned Echo or eligible heir on the death screen to continue. No extra payout; no maturity/wealth/score boost.

## Save safety
A higher lifeEpoch boundary is saved for abandonment and Give Up, and again when starting/reincarnating. Never delete the save key. Lifecycle actions re-read the newest save both before and after confirmation; stale choices adopt the current save instead. Reincarnation/heir choices validate dead state and eligibility. A tab adopting an existing save does not write/broadcast it back (avoids save/render ping-pong). Remote adoption stops Autopilot; callbacks cannot save a replaced life. Autopilot and UI now use the same initialized engine module/cache version.

## Tests
- `node boundwake/tests/life_choices_engine.mjs`: exact parity with natural death, score/choice/payout parity, idempotence, one Echo/one cemetery entry.
- `node boundwake/tests/life_choices.mjs`: headless confirmation/cancel, persistent creation/reload, retained Legacy/Echoes, live multi-tab sync/no ping-pong, deliberately stale-tab guard, normal reincarnation/no repeated rewards, Autopilot engine initialization, touch-phone tap targets, no page errors.
- `BW_TEST_ROOT=/absolute/itch/stage node boundwake/tests/life_choices.mjs`: same runtime lifecycle checks plus itch policy (platform flag, no Passes entry, no ads/Stripe requests, existing alpha Autopilot availability unchanged (no entitlement grants)).
- Existing smoke/music/poor-start/adventure tests remain available.

## Scope / reuse
Existing engine death/reincarnation functions, native browser confirmation, existing ghost buttons and phone Settings styling reused. No new dependencies/art; no new game system or reward formula. Existing access gate is unchanged (baseline code labels the build public alpha). Only Boundwake files changed; Lifeline, Kilumen and boundwake_cap/mobile build outputs are out of scope.
