# LifeSim prototype (life sim with business ownership as the hook)

Zero-build static HTML/JS/CSS (native ES modules + two vendored UMD scripts). No dependencies, no package install.

## Run
```
cd /workspace/lifesim
python3 -m http.server 8080      # or any static server
# open http://localhost:8080/
```
(ES modules + JSON fetch need http://, not file://.) Start screen: tick **Sandbox** (age 25, $50M) to reach studios / sports immediately.
Mobile-friendly; saves to `localStorage` (auto-saves after every click). `?seed=N` on the URL makes "Start new life" reproducible.

## Play the new stuff
* **Studio creator**: Business -> found Game / Movie / TV Studio -> Overview: hire the 5 roles -> tab **Create** (City Game Studio layout: left = project/sequel, name+🎲, size/budget, engine, studio, specialists;
  right = genre, theme (with trend heat/arrows), audience, console/platform (share %, hardware power), effort sliders; bottom bar = required points, forecast, monthly costs, marketing, Start).
  Other tabs: **Team** (hire/dismiss named specialists, fame-gated), **Market** (4 consoles share chart, genre/theme trends), **History** (releases, sensations, TV shows/seasons).
* **TV**: found a TV Studio; pick format (live action / animation / anime) and 6/10/13/22 episodes; after release a show is *renewed* or *cancelled*; renewed shows unlock "Next season" (ratings carry over).
* **Sports**: buy a team (Business -> offers). Games tab -> **Replay** any game (event-log v1 replay: scrub, speeds, next/prev event). When your team makes the finals an overlay opens: play proceeds until each
  **play call**, hover an option to preview routes, click to choose; the sim is advanced and the replay continues with the result.
* Release day opens a result sheet with a fame_fx burst (bigger for hits / sensations); title wins burst too.

## Tests
```
node tests/smoke.mjs     # headless seeded smoke test (Node 18+), ~6 s: all systems incl. consoles, sensation, TV seasons, event-log/replay
sh tests/run_ui.sh       # serves the repo + drives tests/ui.html in headless Chrome (clicks every creator control, tabs, replay, finals); prints JSON, exit 0 on PASS
```
`tests/shot.html?view=create|market|team|history|sheet|replay|finals` is a screenshot helper (headless note: call `canvas.toDataURL()` before `--screenshot`, otherwise headless Chrome may capture an unflushed canvas).
Headless Chrome with `--virtual-time-budget` does not run rAF frames, so the UI test steps the replay with `rp.tick(ms)`.

## Layout
```
index.html, style.css
data/studio_data.json     ALL studio content: genres, themes, compat matrix, trends, media tiers/engines/roles/platforms, 4 consoles, specialists, audiences, TV formats, name generator, fame tiers, balance weights
data/world.js             sectors, macro events, careers, assets, business types, NPC stocks, life events, sports play-call data (plays), team colours, names
tools/build_studio_data.py  regenerates studio_data.json from Game dev's original + our extensions (the JSON is the source of truth afterwards; editing it directly is fine)
src/rng.js core.js data.js engine.js market.js(sectors, stocks, consoles) business.js studio.js(calculator + hooks) sports.js(league, sim, event-log emitter, live finals)
src/ui_util.js ui_studio.js(creator/team/market/history) replay_ui.js(overlay) main.js(app shell)
src/vendor/replay.js fame_fx.js   Animator's engine (UMD) - replay.js has two small patches, see below
tests/smoke.mjs ui.html run_ui.sh shot.html
DESIGN.md
```

## Pass 3 (life sim layer + merges)
Run: `python3 -m http.server 8000` in this folder → open `/` · tests: `node tests/smoke.mjs` (includes `tests/life.mjs`) and `sh tests/run_ui.sh` (headless Chrome).

**Data (all content; edit for the isekai reskin):** `data/life.json` (countries/names, interactions, health, death/obit text, estate, school sports, activities, bar bands), `events.json` (172 events), `diseases.json` (103), `crimes.json`, `ribbons.json` (40), `palettes.json` (recolor), `slice/*.json` (careers/education/shops/assets), `art_map.json` + `art_manifest.json` + `assets/art/` (Animator base art). Generators: `tools/build_life_data.py` (+`tools/ev/*.py`), `tools/build_palettes.py`.

**Modules:** `people, health, events, legacy, ribbons, crime, schoolsports, journal, recolor` (see DESIGN.md), `ui_life.js` (hub/people/activities/legacy/cemetery), `slice_bridge.js` + `ui_slice.js` (merged Job/Assets menus), `src/slice/*` (Game dev's logic; two marked patches in `assets.js`: `data.decorate` hook in makeAsset and `asset.cmult` in assetValue).

**Hook API:** `registerHook('job'|'assets'|'relationships'|'activities', {render(S, api)->html, acts:{name(dataset)}})`. Job + Assets are registered by `ui_slice.js`; Relationships/Activities still use the built-in views.

**Merge of lifesim_assets_ui:** slice state lives in `s.sl`; `slice_bridge` pulls/pushes cash, debt, age, health/happiness/smarts/looks, education around every slice call. A slice job is mirrored as a one-level synthetic career (`sl:<id>`) in `D.careers`, so lifesim pay/tax/layoff/obits work (the slice's own wage credit is reversed). Restoration progresses each tick (`progressProjects(12*dt)`), `occupationYear`/`assetsYear` run on year boundaries. Slice assets/investments count in net worth and are auctioned into the estate on death (`continueAs` resets `s.sl`). Recolor: every shop listing gets `art`, `vseed`, `cmult` (rare color = higher price/value); the variant regenerates from `(art, vseed)`. See `ASSET_FORMAT.md`.

**Known gaps:** Slice screens for zoo, race garage, casino, luxury, auctions, amenities, instruments are not surfaced in the UI (logic present in `src/slice`). Slice yearly messages are logged near-verbatim (not rewritten into first-person journal voice). Slice part-time pay is pre-tax and yearly. Lifesim's old 8 basic careers/assets menus are no longer reachable from the Job/Assets tabs (code kept as `workL/assetsL`). Slice assets are not inherited as objects (liquidated into estate cash at the auction rate). Raster recolor is unit-tested on pixel buffers only. Economy/event balance is rough (passive-bot lifespan median ~71). Only basketball has a pro draft path.

## Pass 4: merged UI (ui3 hub + art kit + world UI + premium)
**Main UI is now `index.html`** (Game dev's hub, `ui/`), running on the real engine through `src/engine_adapter.js`. The previous UI is kept as `classic.html` (and still drives `tests/ui.html`).
- Run: `python3 -m http.server 8080` then open `http://localhost:8080/` (query: `?fresh=1` new save, `?nosave=1`, `?seed=N`, `?age=30&cash=3000000` jump for demos, `?adapter=./x.js` to swap the adapter).
- Tests: `node tests/smoke.mjs` (runs life, premium and adapter tests too), `sh tests/run_ui.sh` (classic UI), `node tests/ui_main.mjs` (main UI, headless Chrome through puppeteer-core found in `../lifesim_ui3/tests/node_modules`; screenshots land in `tests/shots/`).
- **Adapter** (`src/engine_adapter.js` = class; `src/adapter_life.js` people/occupation/sports/activities/will/profile/legacy; `src/adapter_assets.js` assets, casino, auctions, zoo, garage, restoration, shopping). Contract: `ui/ADAPTER.md` methods plus additions listed in `ui/js/adapter.js` METHODS (blackjackAction, buildEnclosure, getActivityChoices, instantDegree, getFamilyTree, getCemetery, premium/settings). Every mutating call saves the game.
- **Art kit** (`art/`): avatars (player, relatives, heirs, tombstone), `icon()` for emoji menu icons (table `EMO` in `ui/js/ui.js`), ribbons, tombstone on death, cemetery, family tree, FX (age pop, death fade), sfx with mute (Settings), fantasy theme toggle (Settings).
- **Gap fixes by surfacing slice logic**: casino tables with merchants (blackjack is a real hit/stand hand, roulette picks a colour, slots show reels), live auctions (rival raises, up to 3 rounds), zoo with enclosures, race garage (move owned cars in, tune, race), restoration plans, amenities, instruments (Play), luxury, consign at auction.
- **World UI reconciliation**: activities content (choices/outcomes) and charities from `world_ui` are data (`data/world_activities.json`, `data/world_legacy.json`) running on our own engine; our people/legacy systems are kept. Will supports shares per kin plus charity; unallocated goes to the state. Relationships/Activities use tab chips to fit mobile; Legacy is reachable from Relationships and Profile.
- **Premium** (`data/premium.json`, `src/premium.js`, `src/premium_fx.js`, `src/payments.js` stub, `src/ads.js`): 13 passes at $5.99 (incl. Autopilot Pack) + All Access ($8/mo, $80/yr). Store screen (⭐ in the top bar) has TEST TOGGLES; flags live in localStorage `lifesim.premium.v1`, separate from saves. Effects are checked at call time (einstein: Education 'Instant …' rows; midas/nepo/free_realestate/sports_owner: granted once per life at birth/continue, or via 'Apply start perks now' for the current life; baller: Sports; golden_gun: Crime and person menus; fountain: health onset; rabbit: children; tax_evasion: salary and estate tax; no_ads: Settings > Ads hook). Locked premium rows are gold with a lock.
- **Journal voice**: `data/voice.json` + `src/voice.js` rewrite slice messages ("You…", "Bought…") into first person.
- **Text Bot merge point**: `src/textpack.js` loads `data/text/manifest.json` at boot. `node tools/import_text.mjs /workspace/lifesim_text --complete` converts the Text Bot event schema (README there) into `data/text/events.json` and flips `complete`. Currently a placeholder manifest with `complete:false` (the Text Bot pack had 60 events and was still being written; not merged).

## New in this build
- **Autopilot Pack** (premium): yearly routines, safety stops, skip-ahead. `src/autopilot.js`, More > Autopilot.
- **Ads and rewards**: `data/ads.json` (platform flag android/steam), `src/adapter_ads.js` (placeholder 5 s ad screen; AdMob goes here). URL `?platform=steam&steamsub=1` to test Steam.
- **College scholarships**: yearly applications and renewals with odds.
- **Live streamer and influencer careers**: Work menu and More directory.

## Social media, politics, coaching
Social tab > Social Media (platforms, posting, sponsors, verification, calendar, team, gear). Work > Politics (campaigns, offices, judges, royalty) and Work > Coaching (coach a team, transfers, interactive seasons). Each is also in the More directory.

## Production companies
Work > Production Companies (also in More): own a record label, film studio, TV studio or game studio that produces by itself every year, or back other companies' projects for a revenue cut. The Autopilot pack can post on social media, stream and greenlight projects each year.
