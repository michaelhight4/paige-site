# Design

## Core loop
Pick time step (yearly dt=1, 6 months 0.5, quarterly 0.25) -> **Advance**. Each turn, in order:
age += dt -> market tick -> life tick (school, job pay/promotion, living costs, asset upkeep/value, debt interest, stat drift)
-> business tick for each business (profit, projects, rep) -> sports league rounds -> offers refresh yearly -> random event
card (prob 0.5+0.5dt, must be answered before next turn) -> death check -> net-worth snapshot.
Per-turn quantities are annual values x dt (noise scaled by sqrt(dt)). One-per-turn actions: gym, study, socialize, doctor, cosmetic, work hard.
RNG is seeded (mulberry32, state stored in the save) so runs are reproducible.

## Stats (0-100)
health, happiness, smarts, looks (+ money, debt). Happiness mean-reverts to 55; health decays after 35; looks after 30.
Death hazard/yr = 0.0003*exp(0.088*age)*(1.5-health/100); forced at 100 or health 0. Ending screen: net worth, legacy score
= NW/10k + happiness + 50*businesses + 100*titles.

## School & career
Primary 5-11, high school 12-17 (smarts grow), at 18 a college card: 4 yrs, $20k/yr tuition added to debt, smarts +1.5/yr, edu=2.
Debt 7%/yr, 25% of cash auto-repays (manual repay too). 8 careers (data/world.js), each with requirements (edu, smarts, looks, age)
and 4-5 levels. Performance `perf` drifts with (smarts-50)/40 + (happy-50)/60 + (health-50)/80 + noise; "work hard" +8.
Promotion chance/yr = clamp((perf-55)/100, 0, .45)*(0.6+sectorHealth/100), needs >=1 yr in level. Layoff 12%/yr if the career's sector health < 25.
Salary = level pay x (0.9+0.2*perf/100), 22% tax. Living cost $16k/yr (half is rent, waived if you own a house).

## Assets
Catalog of cars, houses, boats, planes: price, upkeep/yr, depreciation. Value *= (1-dep*dt); houses instead *= 1+(0.03+0.08*(realestateHealth-50)/50)*dt.
Buy cash or 20% down (rest to debt). Sell at 95% of value. Owning assets adds a little happiness.

## Market
Sector health h in [3,97]: h += (50-h)(1-e^-0.25dt) + N(0,5)sqrt(dt) + macro delta. Macro events (boom, recession, tech bubble/crash, housing, fuel, scandals...) last 2-4 turns.
`sectorMult = 0.6+0.8*h/100` scales demand for businesses, release revenue and stocks.
Stocks: price moves toward target = base*(0.6+0.8h/100)*1.04^age by 1-e^-1.2dt, times lognormal noise (vol per stock). NPC studios (PXLF, RLHS) jump exp(0.1*(score-6.5)) on random releases.
Your studios are listed (ticker = name+id): target = valuation/100k shares, and each release shocks the price by the same factor.

## Businesses (data/world.js `bizTypes`)
* **Shop** (coffee, tech store, grocery): demand = baseDemand*(0.4+1.2*rep/100)*sectorMult; capacity = min(sum equipment cap, sum staff cap*(0.6+0.8*skill/100));
  units = min(demand, capacity); revenue = units*ticket; profit = revenue*(1-cogs) - wages - rent - 6% equipment upkeep. Rep drifts to 30+0.45*avgSkill+staff bonus +-8 (capacity vs demand); advertise +4.
  Being capacity-limited means a downturn doesn't hurt until demand falls below capacity.
* **Studio** (game, film, tv): contract income per staff * sectorMult * (0.5+rep/100) minus wages/rent/upkeep, plus projects. One project at a time.
  Equipment gives seats; staff beyond seats slow development.
* **Sports team**: revenue = (20M+30M*winPct)*(0.7+0.6rep/100)*mediaMult; costs roster salaries + 14M arena. Buy only (price ~25M + strength/titles).
* Found = LLC fee + starter equipment + starter staff; or buy an established one (price = valuation x 1.1-1.4, generated rep/staff/tail).
* Profit is taxed 20% when positive; losses hit cash (then debt). Valuation = 3x blended profit + 50% equipment + 90% royalty tail (net worth counts it).

## Content/engine split (isekai reskin)
Everything a player reads lives in data: `data/studio_data.json` (genres, themes, compatibility matrix, trends, tiers, engines, roles, platforms/consoles, specialists, audiences, TV formats, name generator, fame tiers,
marketing, all balance weights) and `data/world.js` (sectors, careers, assets, business types/labels, NPC companies, events, play calls, team colours, names). Code only reads ids and numbers from those files.
**A fantasy-isekai reskin = swap those two files** (e.g. genres -> Quest/Dungeon/Guild/..., themes -> Demon King/Academy/..., consoles -> four guild-halls or magic-engines, specialists -> named heroes, TV formats ->
"stage play / illustrated saga / anime", plays -> formations) keeping the same ids/shape (or keeping ids and only changing `name/label/icon` strings). No code change is needed; `tools/build_studio_data.py` shows the shape.

## Studio projects (src/studio.js; one calculator for game, film and TV, ProjectDef = a `draft` JSON on the business)
Hooks (signature includes state `s` and business `b`; they are the Game-dev names): `getTrends(s[,turn])`, `calcScore(s,b,draft[,opts])` (alias `preview`), `saveRelease(s,b)` (alias of `release`), `getConsoleShare(s)`, `setEffort(s,b,area,val)`, `getHistory(b[,medium])`, `hire(s,b,id)`, `fire(s,b,id)`.
Draft = {title, genre, theme, tier(size/budget), platform, audience, engine, marketing, format (TV), episodes (TV), sequelOf, split{area: %}}. The per-phase sliders of pass 1 were replaced by the single 100-point **effort split** over 5 areas (labels per medium: film = Script/Cast/VFX/Music/Marketing).
* **score (1-10)** = sum of parts: tier base quality + (genre x theme compat - 1)*4 + (balance - .7)*4 + (team skill - .4)*5 + specialist area bonuses weighted by effort + (trend - 1)*4 + engine bonus + audience fit + console hardware (graphics-heavy games x power) + sequel bonus + trait bonus + noise. `balance` = 1 - sum|split - ideal(genre)|/200 and drives the warnings (starved/bloated/too much/too little).
* **Trends**: heat(kind,id,month) = base + slow per-id sine (period years in data) + monthly jitter; deterministic from the month index, so UI and sim agree; `trendMod` scales score and sales.
* **Duration** = tier.baseYears(*TV season factor) * genre.difficulty * medium difficulty * (1+0.8*quality) / experience, clamp 0.5-20y (TV 0.25). **Required points** = base*difficulty*12*10 vs team points/month = experience*10 (the bottom bar shows both and the months).
* **Money**: budget = tier cost*medium mult (*episodes/10 for TV) + engine cost; 10% up front, rest spread over the duration; marketing + platform fee at release; monthly costs shown = wages+rent+budget/month.
* **Sales/revenue** = tier units * score^2.5 curve * trend * consoleShareFactor * audience * sector * (0.6+0.8*hype) * sensation multiplier * lognormal noise; revenue = sales*price*studioShare(game .7, film .5, tv .6)*fame dealMult.
* **Skills** grow on release for staff (harder/bigger => faster; diminishing). **Specialists** (named talent): area bonuses, traits (Fast/Slow/Perfectionist/Trendy/...: duration/quality/risk/trend), salary, `minFame` gate, cap 6, signing fee = 1 month.
* **Sequels/franchise**: `sequelOf` inherits genre/theme/platform, adds hype and a score bonus from the previous entry, fatigue after 2 entries. Release records carry `franchise`.

## Consoles (4 fictional, game platform)
`state.market.consoles[{id, mind, power, age, drift, hist}]`. Each year (`tickConsolesYear`): drift = persist*drift + noise; mind *= exp(drift + noise); hardware power -6/yr; 12%/yr refresh (power 90, mind x1.3, news item).
Share% = mind/sum (`getConsoleShare`). The creator picks a console per release; `shareFactor` multiplies sales (a dominant console sells more games; a hot niche console reaches fewer) and `power` feeds graphics-heavy genres. Share history is backfilled 5 years so the Market chart has data on day one.
Film/TV use `platforms` with `reach` and fee fractions instead (theatrical/streaming/network ...).

## Sensation & fame
At release, `sensationChance` = base + f(quality above ref) + hype + trend heat + console share (+5% if the sequel's parent was a sensation), clamped (typical hit studio ~6-7% of releases, ~0.5% for poor games).
A sensation multiplies sales by 2.5-5x, gives fame +8+4*mult, stock jump exp(.25), news, `rel.sensation`. Normal good releases give small fame (score-7)*1.5. Fame decays 2/yr, has tiers (data/fameTiers: deal multiplier, labels), unlocks
specialists (`minFame`), engines (`minFame`), better contract deals (revenue x dealMult), +fame*20k valuation. `state.fx[]` receives {biz, rel, sensation}; the UI shows a result sheet and fires a `fame_fx` burst (intensity 5 for x4+ sensations, 4 sensations, 3 score>=8, 2 >=6.5, 1 >=5). Sports titles add fame and a title burst.

## TV as the third medium
Same creator/draft. Formats live/animation/anime (own cost/difficulty multipliers, labels, platforms); episodes 6/10/13/22 scale budget, revenue and duration. A *show* ({id,title,seasons[],ratings,status}) is created at the first season;
each release appends a season; `ratings = carryRatings*old + (1-carry)*new` (carryHype adds hype next season); status = renewed if score >= renewScore (6.5), a coin flip between 5 and 6.5, or always if a sensation, else cancelled (cancelled shows cannot continue).
Sequels for TV are "Next season" of renewed shows. Seasons appear in History.

## Sports (src/sports.js) and event-log v1
8 teams x 9 players, 14-round season, 40-possession games (as before). Every possession is stored compactly `{o, k, sh, pts, oreb, seed}` plus a roster snapshot; **`buildEventLog(game)` regenerates the Animator's event-log v1 JSON on demand**
(meta/teams/players/events: pass, shot, goal, steal, rebound, turnover, period_end, play_call...) using the possession seed so a game replays identically every time (tested: valid shape, coordinates 0-1, replayed score == sim score, deterministic).
Your finals are **live**: `finalsLog(s)` returns the log so far with one pending `play_call` (3-4 options from `data/world.js plays`, each with routes/arrows for the preview); the replay (`pauseOnPlayCall`) halts there,
`choosePlay` emits `play_choice` -> `Sports.finalsPlay(s, id)` advances 1 possession each side -> the log is rebuilt, `rp.load` + `seek(callT)`: seamless. The finished finals log is kept as `league.lastFinals`.
Vendored `replay.js` patches (for the "fast-runner" known limitation): per-sport `vmax` (field widths/s) stretches the key<->formation blend windows (`W = max(W, dist/vmax)`) and sends too-fast key->key hops through formation; the ball-following formation drift uses a 3 s time-smoothed ball.
Measured on generated logs: soccer sample peak speed 0.20 -> 0.13 fw/s; our basketball logs <= 0.25 fw/s (limit asserted: 1.6 x vmax).

## Stubbed / simplified
* Studio balance uses Game dev's data + our extensions; per-phase sliders were dropped for the single effort split.
* No relationships, crime, children, marriage, insurance, multiple projects at once, dividends, shorting, contracts/salary cap, draft, injuries, AI-vs-player business competition.
* Studio "stocks": you can trade your own listed studio; no ownership dilution/IPO mechanics. NPC studios are only price jumps.
* Replay positions are interpolated (no collisions, no per-player stats); football is not wired in. Basketball only for our sim.
* Sandbox economy is too lucrative (a 3-studio sandbox run earns ~$1B in 40 years); balance is rough.
* Balance is rough; art is flat placeholder CSS; no sound; no accessibility pass.

## Pass 4 notes
- **One engine, two UIs.** `classic.html` (ui_life/ui_slice) and `index.html` (ui3) both read the same engine state. The ui3 UI never touches the engine directly: `ui/js/adapter.js` forwards to `EngineAdapter`, which returns plain JSON and persists after mutating calls. Slice state still lives in `s.sl` and is pulled/pushed by `slice_bridge.js` around each call (`EngineAdapter.sl()`).
- **Economy.** The slice's own yearly living cost/interest is switched off (`hostEconomy`) because the host engine charges them; otherwise they were double counted.
- **Restoration mapping.** ui3 expects staged restoration; the slice has monthly-progress plans. Each plan is shown as a "stage"; a car in progress cannot be sold or raced.
- **Premium is data + call-time checks.** No pass is hard-coded in UI; rows carry `premium` and `locked`. Subscriptions are a timestamp (`until`); expired or cancelled means `isUnlocked` is false for everything not individually owned.
- **Text packs** overlay events by id (replace) and append new ids; chain targets must resolve or the whole pack is rejected.
- **Known gaps:** see README report below / final merge notes: not click-tested on a real phone; fantasy theme only recolors UI (avatars stay modern until the fantasy pack applies, no un-apply); payments and ads are stubs; the sports-owner perk depends on a sports offer being available at birth; some ui3 contract items (hauntedness bars, staged restoration visuals) are approximations.
