# POLISH LOG

Each stage: what changed, how it was tested, caveats. Tests: `node tests/smoke.mjs`, `sh tests/run_ui.sh`, `node tests/ui_main.mjs`, `node tests/premium.mjs`, plus new click tests `tests/dir_test.mjs` (stage 1), `tests/layout_test.mjs` (stage 2) etc. Click tests need puppeteer-core + google-chrome (found via `tests/_pp.mjs`: `PUPPETEER_DIR`, ../lifesim_ui3/tests, /workspace/tools).

## Stage 1: bugs
- **Accessories row**: it came from the research list (`ui/data/research_activities.json`), which only applied a stat nudge and showed the research flag `V` as subtitle. Now activities can carry `go` (adapter `GO_MAP`): Accessories -> Shopping, Gamble/Casino -> Casino, Exotic pets -> Zoo, Part-time -> Part-Time, *freelance -> Freelance. Row subtitle reads "Opens Shopping". The stray `V` tag is no longer shown anywhere.
- **Clothing**: new slice category `clothing` (24 recolorable templates from the art manifest `clothes`, 4 stores: Threadbare Basics, Velvet Row Boutique, Workwear & Uniform Depot, Hats/Shoes & Accessories). Shop sections "Clothing" and "Accessories" appear in Shopping. Tapping an item first opens a **color picker** (8 variants incl. rare colors that cost more), then buy. Owned clothes live in Belongings > Wardrobe, with "Dye / recolor ($25)". Old saves get an empty wardrobe automatically.
- **More menu** (`ui/js/screens/directory.js`): search box on top; 10 groups (Life, Work & School, Money & Assets, Shop, Businesses & Studios, Social, Activities, Skills, Legacy, Settings), built from live adapter data so new content appears automatically (136 entries at age 30). `tests/dir_test.mjs` opens every entry programmatically AND DOM-clicks every top-level row: no dead links, no error panels.
- Adapter now forwards any method the implementation exposes (Proxy), so new methods need no registration.

## Stage 2: layout
- Fixed bottom tab bar: Life, Skills, Assets, Work, Social, More (Age button stays in the centre). Panels stop above the bar; active tab highlighted; Life closes panels.
- **New badges**: `ui/data/unlocks.json` (id, tab, minAge); seen-state in the save (`s.seen`); tab badges + "New" chip on rows, cleared on open. Existing saves start with everything unlocked marked seen.
- **First-life tips** (`ui/data/tips.json`, `screens/tips.js`): dismissible banner on the home screen only, first generation only; on/off in Settings (localStorage `lifesim.tips.v1`).
- **Businesses & Studios** is now a hub tab inside Assets (and a More group): own/found/buy/hire/equip/advertise/sell for all shop types in the app (`src/adapter_biz.js`). Studios and sports teams keep their full editor, embedded as an iframe panel (`classic.html`) with save flush/reload, so the player never leaves the app.
- Tests: `tests/layout_test.mjs` (20 checks pass). `ui_main.mjs` updated for the new tab names.

## Stage 3: event frequency
- `events.draw` rewritten: events are split into **major** (cats crime, health, work, business, money, oldage, prison, fame; or `major:true` in data) and **minor** (childhood, school, family, friend, love, travel, random). Per year: major 34% chance, minor 10% (16% under 13). Rates live in `data/life.json -> eventRates` (optional override). Follow-up chains and prison events are unchanged. Plain years just log the year paragraph.
- Measured with `tools/sim_rates.mjs` / `tests/events_rate.mjs` (30 lives to 70): **0.41 popups/yr (was ~1.1)**, 59% of years completely quiet, majors 4.6x minors. `events_rate.mjs` asserts these bounds.
- `tests/ui_main.mjs` now ages up to 40 times to find an event sheet.
- Hook `Ev.hooks.passionBoost/passionRate` is used by stage 4.

## Stage 4: passions
- Data: `data/passions.json` (12 passions: music, sports, science, business, art, crime, cooking, writing, tech, acting, trades, leadership; slots 2, mastery cap 4, min age 6, benchmark 100) and `data/passion_events.json` (72 events, 6 per passion: mentor, contest, gig, rival, burnout, career; merged into `D.events` at load). Module `src/passions.js`.
- Pick/switch anytime (slots full -> choose which to replace; **switching resets that meter to 0**), practice once a year, yearly auto gain scaled by skills. Passion events only fire for an active passion and are weighted 2.6x plus +16%/yr minor-event rate per active passion (counted 92 passion events in 25 lives x 20 yrs, 0 without).
- Meter 100 => **permanent mastery** (title, +skills to >=70, happiness/fame, yearly perks: stat drift, salary %, upkeep %, bizMult etc.), frees the slot, max 4 per life (test hits the cap). Events can give `pm` (meter), `sk_<skill>`, `award`.
- Kids inherit a head start: `Passions.inherit(s, prev)` (+skills, active passion at meter 25) — hooked into the heir handoff in the inheritance stage.
- UI: Skills tab > Passions (meters, practice, drop, replace sheet). Tests: `tests/growth.mjs`, `tests/growth_ui.mjs`.

## Stage 5: skills
- `data/skills.json`, `src/skills.js`: Physical (strength, endurance, speed, flexibility, coordination), Mental (memory, intelligence, focus, creativity, problem solving), Emotional (composure, maturity, empathy, confidence, discipline), Practical (computer, people skills, literacy, math, driving & car repair, cooking, business, leadership, trades).
- Grow with use (diminishing returns), passion-matched skills x1.6 (x1.25 for mastered). Fade slowly when unused in a year (physical faster after 45). Fed yearly by school, college, job (sector keywords), sport, businesses, friends/partner/kids, owning a car, youth growth; by activities (regex map in data), interviews (job applications now roll an interview: 78% + skills), hires, promotions, raises, firing, sport wins, relationships.
- Effects: job performance (`workBonus`), health drift (`healthBonus`), sport skill growth, scholarship eligibility, interview odds.
- UI: Skills tab (4 categories, bars, ⚡ passion boost, trained-by). 

## Stage 6: scholarships
- `data/scholarships.json` (26 awards: academic, athletic, arts, need, service, talent; 10 clubs), `src/scholarships.js`. Windows: high schoolers from 16 (until 2 yrs after graduating if not enrolled) = college awards; graduates from 21 with a degree = grad-school awards.
- Requirements read GPA (yearly from smarts/discipline/focus), clubs (join up to 3; train skills, count as service), service hours (Volunteer once a year), awards (MVP, contest wins, masteries, scholarships), sport skill, skills, need (savings < $9k), passion meters. **Passion extras** (Conservatory, Stage & Screen, Studio Art, Young Scientists, Tech Pioneers, Young Entrepreneurs, Culinary, Writers', Sport, Trades, Civic) unlock only with that passion.
- Effects: engine college tuition is scaled by (1 - coverage) (20k -> 10.7k/yr with Merit in the test); slice schools (community college, university, grad/professional) refund pct of tuition against debt (cash if no debt) at enrol and yearly; a one-time grant also pays a little debt. Max 2 awards held, capped at 100%.
- UI: Work > Scholarships (application card, volunteer, clubs, awards with missing-requirements text).

## Stage 7 — Businesses (done)
- `data/businesses.json` (generated by `tools/build_businesses.py`, calibrated so each type starts at its target margin) adds 33 types and patches coffee/tech/grocery: accounting, law, real estate agency, insurance, dental, gym, salon/barber, cleaning, security, tutoring, fast-food franchise, restaurant, bakery, bar, liquor store, food truck, clothing, gun store, jewelry, pawn, car dealership, furniture, farm, brewery, gas station, hotel, apartment building, construction, auto repair + fleets (semi trucking, box-truck delivery, taxi/rideshare, moving). Each has startup cost, staff roles, margins, risks, 3-4 upgrades, age/degree/license/clean-record requirements.
- `src/bizplus.js`: requirements, upgrade modifiers (demand/margin/capacity/mitigation), yearly risk rolls, fleet model (vehicles, drivers, fuel index random walk, insurance, maintenance, condition, accidents/totaled vehicles, depot cap), license suspension when a convicted owner holds a clean-record license, trustee fee (40% of profit) for businesses held in trust.
- Tests: `tests/biz.mjs` (in smoke), `tests/biz_ui.mjs` (click test). Existing studios/sports untouched.
- Design guess: professional licenses are folded into the startup fee; only driver's license, degree, age and clean record are enforced.

## Inheritance stage (steering B) — done
- `legacy.js`: heirs = any living kin named in the will (child, spouse/partner, sibling, parent, other relatives); default order children → spouse/partner → siblings → parents → relatives. `continueAs(id)` works for any heir; the game ends with the legacy summary only when no kin is alive.
- Owned objects pass on as-is: `s.assets` entries and slice objects (tpl, art, vseed, condition, loans) via `slice_bridge.inventory/grant`; only investments/zoo are liquidated. Objects are auctioned only if cash cannot cover debts + estate tax. Minors keep everything (businesses and objects held in trust until 18; trustee fee 40% on business profit).
- Businesses and sports teams go to the heir the will assigns; other heirs' teams/businesses leave the save cleanly (`league.my` reset). Cash/stocks follow will shares; estate tax applies as before (waived by the tax_evasion pass).
- Family is recast around the new player (spouse heir: kids stay kids, in-laws become relatives; etc.). Kid heirs get the passion head start (`Passions.inherit`).
- Tests: `tests/inherit.mjs` (in smoke); `tests/life.mjs` updated (minors no longer auction). UI: "Play as X" rows show the relation.

## Creator pass (steering C) — done
12th pass 'The Creator' ($5.99, included in All Access): `src/creator.js`, Creator screen (More > Settings, Store row), free test toggle, `creatorUsed` flag shown in death/legacy summaries and graves; lives and their family line are excluded via `Creator.eligibleForRanking`. No challenge/leaderboard system exists yet; the helper is the hook. Tests: premium.mjs, creator_ui.mjs. DEVLOG.md updated.

## Stage 8 — Characters / art (done, placeholders)
- Layer system: `data/character_layers.json` (schema), `tools/build_character_layers.py` (615 placeholder 128x128 pixel SVG layers: 5 ages x 3 builds, 8 skin tones, 12 hairs, facial hair, glasses, hats, 14 tops, 4 bottoms, 4 shoes, jewelry), `src/character.js` (newChar/inherit/equip/compose/lookOf, unlocks from owned clothing/jewelry), `ui/js/character.js` (browser composer), Appearance & Wardrobe screen (More > Life), profile header uses the sprite. A character saves as parts+colors (~400 B); kids inherit hair/eye color; heirs take their own look on `continueAs`.
- Not replaced: the year panel and UI chrome; other panels still use the old avatar renderer except the profile header and the Appearance screen (swap `avatarEl` call sites to `composeSprite` to extend). Final sprites + prompts/counts documented in ASSET_FORMAT.md (the cars/houses generator in lifesim_art_ui was not reused: characters need per-age anchors).
- Tests: tests/character.mjs (in smoke), tests/character_ui.mjs. Contact sheet: `node tools/char_sheet.mjs`.

## Stage 9 — Balance (done)
- Lifespan: untreated chronic illnesses drained health forever and routine care did not exist. Changes: chronic health drain x0.3, disease death odds x0.5, onset rate 0.18 -> 0.07 (still rises with age), base hazard 6e-5 -> 4e-5, decay starts at 52, natural healing (`health.regen` 6/yr, fades after 50), and routine checkups (`health.autoCare`: with a job or strong public health, 40%/yr to get diagnosed and treated).
- Results (n=40-60 seeds): "safe" passive bot (never takes drug/crime options, never visits a doctor) median lifespan 75 (p10 52, p90 90); first-option bot (takes whatever is listed first, including drugs/crime) median 66, p10 41, p90 89 (was 45 / 24 / 54). Popups still 0.40/yr.
- Casino house edges (data/slice/assets.json): slots 6.3% (jackpot x50 -> x25; it had a PLAYER edge of +3.7%), blackjack 2.0%, roulette 2.7%, single number 2.8% (win_p .0263 -> .027), dice 1.4%, poker skill-based (-6% at smarts 50, +4% at smarts 100; bonus .0015 -> .001/pt).
- Prices: business startup/margins calibrated in stage 7 (start margins 3-25%, car dealer/gas thin by design); asset/shop prices left as is.
- Remaining design guesses: heir stat rerolls on continue (random, age-worn), trustee fee 40%, professional licenses folded into startup fee, fleet accident rates, rent for hotels is a plug number, estate exempt/rate unchanged, auction rate for debts. Tests: tests/balance.mjs (in smoke).

## Stage 10 — Style tab (accessibility palettes)
- ui/data/styles.json: palettes light, dark, dim (low-brightness), contrast, cb_rg, cb_by, pastel; text sizes normal/large/xl; motion auto/normal/reduced; `fantasy.palettes` override hook.
- ui/js/style.js: stored in localStorage `lifesim.style.v1` (separate from saves); applies inline CSS vars on <html> plus data-style/data-text/data-motion. Reduced motion kills CSS animation/transition and fame_fx particles/shake/flash.
- app.css hardcoded surfaces moved to vars (--surface*, --page, --link, --head). Large text uses CSS `zoom` on #app.
- Entry points: More → Settings → Style & accessibility; settings screen row.
- Test: tests/style_ui.mjs (WCAG contrast >=4.5 for white-on-navy2 per palette, click-test, persistence, reload, reset, reduced motion). PASS.
- Caveat: ~29 hardcoded hex colours remain in app.css (small badges/tints); screenshots checked for dark only. getBoundingClientRect under `zoom` reports odd sizes in Chrome 155, so the test uses computed style.
