# Pending queue (saved 2026-10-19 01:23 CT, after snapshot7a live at 6e6a174)
Executor stopped (usage). Everything below is NOT built yet. Resume executor sand-subagent-651863c9-... or brief a new one with this file.

## Priority bugs
- Coaching: count current/past pro + college years as playing experience ("Yes (10 yrs pro)"), Retire & start coaching button, optional player-coach, migrate from job history, fix bottom 'play a sport first' text, test.
- Work page Current job card for ALL athlete occupations (Franchise Player shows employer 'special' and no team access): team name, standing, buttons to My Team/Skills/Season/Teammates/Offers (ui/js/screens/sports.js tabs). Audit athlete detection across data/slice/occupations.json. New Teammates tab (rating, relationship, professionalism, interactions). Test with Franchise Player save.
- Investments screen layout (Gary screenshot 01:22): holding rows overlap cost text with value text on 390px; wrap/stack Cost, Value, P/L, last-year %. Sell/Buy prompts: use formatted input with commas, show units owned, price/unit and live dollar total ('Selling X units = $Y (Y trill)'), plus Sell All / Sell Half / Buy Max buttons. No raw window.prompt numbers.
- Known 7a gaps: bankruptcy popup UI test + screenshot, money formatter leftovers + screen test, 390px shots items 1-5 (feature_shots8), Assets-bought teams manager verify/test, passions page-lock text.

## Features (in order)
1 Social first screen layout (People, Family Tree, Legacy, Online Profiles, Social Media, Live Streaming; current accounts with breakdown; separate 'Platforms you don't have'); open-account test all platforms.
2 Auction item images. 3 Teams from Assets manager.
4 Fame tier words on banner + per-tier banner styling + 'Use your fame' screen (reuse meter).
5 Job panel: coworkers, relationships, professionalism, ask promotion/raise, promotion progress bar.
6 Creative growth (equipment tiers, per-genre XP bars) + writer career.
7 Investments: price charts, Market News hints, cost basis, P/L money+%, portfolio total, yearly history per holding + portfolio, Buy Max (no loans, confirm).
8 Competitive offers scaled to current sector income (90-150%+, 'vs your current +X%').
9 Sponsor drop/swap + Autopilot upgrades. 10 Fire crews, buy buildings for capacity.
11 Auto-hire tiers Budget/Standard/Skilled/Elite; Hire all staff / Fill roster / Hire full team; Autopilot keep filled.
12 Company Autopilot: train, create, strategies.
13 Time budget & stress (advisor = 0 hrs; jobs = schedule only, no commute) + management firms (Budget/Standard/Elite) for companies and social accounts; esports teams (RTS, shooter, MOBA, racing).
14 Casino: slots, blackjack, roulette, craps, baccarat, scratch, wheel, coin toss; NO poker; dice = point rule (roll till point wins or 7 loses).
15 Rentals. 16 Romance approach scenes + inheritance end-to-end test.
- Passions: mastering one (100) unlocks +2 passion slots; popup opens picker; 'Slots used/total'; migrate.
- Money formatter suffixes past trill: quad, quint, sext, sept, oct, non, dec, then scientific.
17 Final suite, DEVLOG, zip, PC deploy, snapshot7.
Next batch: fights/PFC, celebrity, government contracts, esports player/coach careers.
Rules: Autopilot same costs/risks; stat steps 4/8/16/30; contrast guard green; no package.json/node_modules in zip.
- Investments tap actions (Gary 01:25): tapping a HOLDING opens a sheet with Buy more / Sell / View history; history = performance while held (cost basis vs value over each held year, P/L %, chart). Tapping an asset in the Invest (market) list opens a detail page with a year-by-year price chart and a Buy option (with Buy Max).
- Management firms hours: managed entity uses at most 25% of unmanaged weekly hours (Budget 25%, Standard 20%, Elite 15%) for livestreams, social and companies; stress scales same; show 'Managed: Xh/wk (was Yh)'. (Gary 01:34)
- Naming: for businesses/companies/teams the hire option is 'Corporate management firm' (same tiers and hour cuts 25/20/15%); for social/streams it's 'Talent/social management'. (Gary 01:36)
- CORRECTION (Gary 01:36): management/corporate/talent firms ONLY cut time load (and stress). Player keeps full control; firms take no actions, no Autopilot, no mismanagement events. Just a yearly fee per tier.
- Time & Stress dashboard: NO commute row or commute hours anywhere (Gary 01:36).

## AFTER current patch (snapshot7b): Death screen / obituary rewrite (Gary 01:43, screenshot attachments/08fe87e2...png)
- Character: 35-yr pro soccer career, owned 3 sports teams, gaming studio, record label, ~$1.8 quintillion net worth, died 78. Screen said "Last occupation: None", "never held a job worth mentioning", "no children", nurses who never met them.
- Fix: obituary built from full life history: longest/most notable career (pro years, titles, awards, peak team), retirement status instead of 'None' (e.g. 'Retired pro soccer player'), every owned business/team/label/studio/farm/brand, fame tier, net worth rank, philanthropy, family (spouse, kids, grandkids), notable achievements, and the cause of death phrased to fit (e.g. 'surrounded by family' when they have family). Several template tiers so ordinary lives still read naturally.
- Headline 'Net worth ...' overflows/cut off: use the money formatter short form (e.g. '$1.81 quint') in the big headline, full commas in the detail line, and auto-shrink/wrap so it never overflows at 390px.
- Achievement/ribbon area shows '?': show the top earned award or title.
- Test: rich-life save produces an obituary mentioning career, owned companies and teams; headline fits at 390px.
- TOP PRIORITY (Gary 01:44): dark overlay stays after death -> New Life / heir (screenshot attachments/484f048c...png). Clear all backdrops; browser test.
- Pro athlete release system (Gary 01:47, like BitLife's age vs performance): each season, a release/cut chance from age curve vs performance rating (athletic/sport skills, season stats, injuries, contract value). Young + good = safe; prime ages per sport; past ~30-33 risk rises yearly unless stats stay elite; stars get extensions, declining vets get 'released' popup with options (sign elsewhere at lower offer, move to minor/sister team, retire -> coaching path). Show 'Roster security' meter on My Team + job card with the age and stats factors explained. Autopilot uses same odds. Test.
- Athlete skill aging (Gary 01:51): skills go UP each year the character trains them (school, college, pro; manual or Autopilot), and go DOWN when not trained. On top of that, a yearly decline chance per skill rises with age at thresholds 28, 32, 35, 38, 40, 42, 45 (each step higher, e.g. 10%, 20%, 30%, 40%, 50%, 60%, 70%+ and climbing after 45). Training offsets but cannot fully prevent age decline at older ages. Use stat steps 4/8/16/30 where applicable. Show the current decline risk on the Skills tab ('Age decline risk: X%'). Feeds Roster security / release system. Test the curve and train vs no-train behaviour.
- Autopilot sports skills (Gary 01:52): Autopilot must actually train sport skills each year (default 'train lowest 3', school/college/pro), runs right after AGE like the everyday chips, and the trained skills + cap show Done/greyed so they can't be trained twice manually. Test: autopilot on, age up, assert 3 skills trained, buttons disabled, used=cap.
- Time & Stress: also remove homework (HS) and Study/homework (college) lines; only class hours remain (Gary 01:55).
- AFTER current patch (Gary 01:59): Addictions (steroids, alcohol, drugs, like BitLife) each take 8 hrs/week on the Time & Stress page as an 'Addiction' line, adding stress, to incentivise getting clean; removed when clean (rehab/quit). Check existing addiction system in src first; Autopilot same rules. Test.
- Pregnancy (Gary 02:12): pregnancy possible with any consenting ADULT female partner (18+) the player is intimate with: spouse, girlfriend, fling/hookup, ex. No marriage required. Fertility cutoff: no pregnancy if she is over 40. Never any option with minors (both characters must be 18+). Chance per intimacy, optional protection lowers it; child support/custody events for unmarried. Check existing family/romance code; Autopilot same rules. Test incl. under-18 and over-40 exclusions.
- Hook up + fertility (Gary 02:13): add a 'Hook up' interaction (adults 18+ only, consent/acceptance roll based on relationship, looks, fame) with partners, dates, exes, romance approach scenes. Each hookup rolls pregnancy chance = f(his fertility meter, her fertility meter, protection). Every character (player + NPCs) gets a Fertility meter (0-100) shown on profiles/relationship cards; peaks in 20s, declines with age (women 0 after 40 per rule), affected by health, steroids/drugs/alcohol, and a fertility treatment option. Feeds pregnancy/child-support events. Test.
- Sports honors (Gary 02:16): league title = trophy/championship ring per sport (soccer trophy/medal, basketball/football/baseball/hockey rings), shown in a Trophy Case on My Team/Awards tab + profile + obituary; Hall of Fame induction after retirement based on career stats/titles/awards (popup + legacy entry, family bonus); athlete brand deals (shoes, drinks, apparel, games) scaled by fame + performance + sector income, yearly, droppable/swappable like sponsors, Autopilot same rules. Test.
- Releases system (Gary 02:18): research BitLife's Musician and Athlete programs (web) and model the good parts, then do better. Music, TV/film and video games each get a Releases tab: list of every release with year, quality, rating, sales/streams this year + lifetime, revenue. Releases keep earning over time with decay curve; random viral spikes (social/fame boosted) with a news popup. Certifications: Gold, Platinum, multi-Platinum, Diamond (music by units; games/films by sales/box office tiers). Yearly awards: Song/Album of the Year, Game of the Year, Movie/Show of the Year, nominations based on quality+sales+fame, trophies in Trophy Case + obituary. Hooks into creative genre XP bars. Autopilot same rules. Test.

## DONE in snapshot7b (commit 767d83e, 2026-10-19 02:19 CT)
Death overlay; coaching experience + Retire & coach; athlete job card + Teammates + roster security; release system (basic: age/perf roll, popup sign/minors/retire); athlete skill aging + Autopilot sport training default (runs after AGE, also after a deferred card); investments layout/sell-buy sheets/Buy Max/tap actions/charts/Market News/yearly history; time budget (no commute/homework, advisor 0h, job schedule hours, management firms hours-only 25/20/15%); passions page-lock text. Also previously: social tabs, auction images, fame, money formatter, bankruptcy UI test.
Still pending: everything else in Features list above + new items (sports honors, hookup/fertility, pregnancy rule, addictions, death screen rewrite). Management firm option on social/stream account pages not yet added (only time-budget rows + company cards).
- Store perk 'Own a sports team' team lacks full manager UI (Gary 02:24): create via same path as purchased team, migrate saves, test.
- Ask for a raise (Gary 02:25): on every job card (incl. athletes = 'Renegotiate contract'), once/year; success odds from performance, professionalism, tenure, boss relationship, fame; outcomes raise %, refusal, or annoyed boss/fired on bad roll. Part of job panel item in 7c.
- Social mgmt missing (Gary 02:38): time-budget 'social' line only if s.social.accounts; verify all account stores, raise per-account hours (3-6h by post plan), add Hire talent management card on Social tab, each account page, Live Streaming. Test via real UI flow.
- Mgmt restructure (Gary 02:39): ONE corporate firm for all companies, ONE talent firm for all socials/streams; fee = base x (1 + 0.25 x (units-1)); two group cards on Time & Stress; migrate per-line firms to group slot (highest tier).
- Dedicated My Job tab (Gary 02:40): sticky 'My Job | All Work' tabs on Work screen (default My Job when employed) + banner job title tappable; all current-job tools in one place incl. athlete sections, job2/part-time cards. Test.
- Bottom nav (Gary 02:41): replace 'Life' button with 'Job' (opens My Job); main life feed stays home via back arrows/start/after AGE; Work opens All Work tab. Update nav tests.
- Header X (Gary 02:42): every screen header: back arrow top-left (one level), X top-right exits to main life screen (close stack + sheets, no orphan backdrops); not on home or mandatory popups; 44px, aria-label, contrast guard. Test 3-deep.
- CORRECTION (Gary 02:44): NO Life->Job nav swap; bottom bar unchanged. Work opens with 'My Job' as first/default tab, 'All Work' second. Header X stays.
- FINAL NAV (Gary 02:44): bottom bar = Shop, Skills, Assets, AGE, Work, Social, More. 'Life' replaced by 'Shop' hub (tabs: Homes, Cars, Boats, Aircraft, Luxury, Clothing, Pets, Collectibles/Auction, Businesses & Teams). Home = life feed via back/X/after AGE. Work opens My Job tab first.
- CORRECTION (Gary 02:45): bottom bar UNCHANGED for now (no Shop/Job swap, no Shop hub). Keep My Job default tab in Work, banner job title tap, header X.
- Dup teams after AGE (Gary 02:48, attachments/504e31c8...png): esports 'freakshow' listed twice with different P/L; dedupe root cause (tick vs list), migrate/merge, refund double loss; check Harbor Hawks 0 staff. Test 3 age-ups.
- Global 'Hire all' (Gary 02:54): top of Businesses Owned list, fills all open spots across all companies/teams at a chosen tier, summary sheet with cost/payroll first; Autopilot keep-all-filled option. Test.
- HIGH: bankruptcy fires before yearly income (core.js:14 per-charge shortfall). Net-ledger settlement; loan cap scales with net worth (not flat 250K); Sell my things sells only enough w/ picker; header cash vs net worth label. Test. (Gary 02:56)

## DONE in snapshot7c (first cut, 2026-10-21 CT)
- Duplicate teams after AGE fixed at the root (franchise.ensure pushed a save/load copy of the active team every year). Saves are deduped by id and the doubled yearly loss is refunded. Bare 'sports' businesses (old perk or a bought offer, e.g. "Harbor Hawks · 0 staff") become full franchise teams with staff. Test: dupteams.
- Management is two shared slots: one Corporate firm covers every company/team line, one Talent firm covers every social account and streaming line. Fee = base × (1 + 0.25 × (units − 1)). 7b per-line firms migrate to the highest tier. Time & Stress shows two group cards; rows show "Managed: Xh (was Yh)".
- Social management can now be found: a "Hire talent management" card on the Social Media tab, every account page, Live Streaming, and the streamer/influencer pages, all opening the shared slot. Detection covers every opened account, at 3-6h each by post plan. Tests: socialmgmt_ui, timebudget.
- Work opens on a sticky "My Job | All Work" tab bar with My Job as the default (job, pay, years, Work harder, Quit, promotion bar, raise/promotion, boss, coworkers; athletes get team links, Renegotiate and the My Team tabs inline; part-time and second-job cards; "No job yet / Find a job"). The banner job title opens My Job. Bottom bar is unchanged. Test: myjob_ui.
- Header X close (top right, 44px, "Close to home") on every screen; the back arrow stays top left. It closes the stack plus non-mandatory sheets. The contrast guard covers headers in every palette and fame tier.
- Hire all on the Businesses Owned list: pick a tier, see a summary (X hires across Y companies, signing cost, payroll, per-company breakdown and skip reasons), plus "Keep filled yearly" (Autopilot hire_all). Per-team auto-hire tiers with Hire all staff / Fill roster / Hire full team. Tests: hireall, teamperk_ui.
- Also in this build: obituary/death screen rewrite, passion mastery +2 slots (no cap, double-push bug fixed), job panel, sponsor drop/swap, Sports Owner perk → real franchise team, sports honors (trophy case, rings, HoF, brand deals), competitive job offers, money suffixes.
- Merged hotfix-bk (bankruptcy net ledger, loan cap, sell picker).
- Autopilot basics verified: train, read and work harder run every year and show as done/greyed, and can't be repeated (test autobasics).

## GARY SINCE OCT20 1237
- NOT VERIFIED: this executor has no ReadTranscript tool, so it could not re-read Gary's chat. The parent needs to pull those messages and list them here. Items that reached me through steering are covered in the DONE list above.
## MISSED NOTES
- Oct 18 checks: the 5 posts/year cap (social.js POST_CAP) is built. The Social Online Profiles and Live Streaming tabs are built. "Autopilot this page" cards are on 12 screens. Autopilot sections are collapsible (accordion in auto.js). One major team per sport plus its minor affiliate is enforced (franchise.slotCheck). Education Clubs exists. Post plans with ban risk and appeal are built (social.js PLANS).
- (Gary Oct 21 01:37) Money inputs: askNumber (Add cash / fund / invest / withdraw, used on 18 screens) is now a formatted input with commas as you type, a live short total, cash available, and 25%/50%/Max buttons. There was no window.prompt left anywhere. Test moneyinput_ui. DONE.
- (Gary Oct 21 01:37) Train employees: a button on each business page (5% of payroll, min $2K, +4 skill for every employee, once a year, greyed once done) plus the Autopilot 'Train employees' routine in the Business section (same cost and effect, also trains untrained production crew). Test trainstaff. DONE.

## 7c1 item 11 (Gary, Oct 21 02:16 CT) - after items 1-10
- 11a NEW - Asset image accuracy audit (homes, cars, boats, aircraft, luxury, collectibles/auction, pets, clothing, businesses, teams): image must match the item's name and type. Write mismatches and missing images to IMAGE_AUDIT.csv, remap to a better existing image where one exists, and list the ones that need new art.
- 11b NEW - UI polish: 390px before/after shots of every main screen and sheet in ui_shots/. List the weak spots (overlaps, cramped text, inconsistent cards, empty states, missing icons, unclear buttons) and fix the clear ones within the existing style. Contrast guard stays green.
- 7c1 PWA (parent, Oct 21 02:23): DONE. Added manifest.webmanifest, sw.js (cache lifeline-7c1; HTML/JS/CSS/JSON network-first) and icons in assets/brand, linked from index.html, theme-color #1f3a5f everywhere, tests/pwa_ui.mjs.

## DONE in 7c1 (Oct 21)
1 Autopilot reliability DONE (soft-pause basics + deferred run fix) | 2 Dup teams DONE (restored 7c fix, dupteams PASS) | 3 bk_sell DONE (test updated to the two-step picker; game was correct)
4 Social mgmt + 2 firm slots DONE (restored) | 5 My Job/banner/X DONE (restored) | 6 Hire all/auto-hire DONE (restored) | 7 Money input DONE (restored WIP, committed)
8 Train employees DONE (restored WIP, committed) | 9 Terms/Privacy DONE (new) | 10 Perk team franchise DONE (restored) | 11a image audit DONE | 11b UI polish DONE (first pass) | PWA DONE
Still pending: the Oct 18-19 items (hook-up & fertility, pregnancy, addictions, the rest) and the new art listed in IMAGE_AUDIT.csv.
