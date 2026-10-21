# QUEUE_PENDING (rebuilt Oct 21 2026, ~2:10 AM CT, after the box reset)
Base: live 7b1 (paige-site 902992d), restored repo commit cc8f335.

SOURCE CAVEAT: there is no ReadTranscript tool in this executor, so this list was NOT
re-read from Gary's transcript. It is rebuilt from the executor's own session notes of the
steering messages it received, plus a code check of live 7b1. The parent needs to read the
transcript (Oct 18 to Oct 21 ~2:04 AM CT, especially everything since Oct 20 12:37 PM CT)
and add any missing items. Times are CT; exact times are known only where marked.

Status key: LIVE = in 7b1 (checked in code) | REDO = built in 7c, lost in the reset | NEW = never built | ?? = ambiguous

## GARY SINCE OCT20 1237
1. REDO - Duplicate teams bug: franchise.ensure pushes the save/load copy of P.team every year (root cause is still live: includes() instead of an id match). Fix: dedupe by id, refund the doubled loss, check the 0-staff "Harbor Hawks" (a bare 'sports' biz that should become a franchise team, convertSportsBiz), add a test.
2. REDO - The premium perk team must be a real franchise team (grantTeam via Fr.buy).
3. REDO - Social management: count social/streaming hours correctly (3-6h per active account), add Talent cards on the social, platform, live and online screens, add a test.
4. REDO - Exactly two shared management firm slots, Corporate (companies and teams) and Talent (socials and streaming). Fee = base x (1 + 0.25 x (units - 1)). Firms only cut hours (to 25/20/15%) and take no actions. Migrate old per-line slots to the highest tier.
5. REDO - Work opens on a My Job tab first, with All Work second. The banner job title is tappable and opens My Job.
6. REDO - Header X close button top right (44px, aria 'Close to home'), not shown on home or mandatory popups; the back arrow stays top left. Test it 3 screens deep.
7. ?? / final - Bottom bar stays EXACTLY Life, Skills, Assets, AGE, Work, Social, More. No Job button, no Shop button or hub. (The Job and Shop requests were superseded by this.)
8. REDO - Global "Hire all" on the Businesses Owned list: tier choice, summary sheet, skip reasons, Autopilot keep-filled option, test. Also auto-hire on the franchise staff and roster tabs.
9. LIVE - Bankruptcy net ledger and loan cap (hotfix-bk, shipped as 7b1: bankruptcy.js has the net ledger and loanCap). Do not redo. ?? The hotfix test bk_sell ("item picker offers the small car") failed on the hotfix branch itself; re-check it.
10. ?? partial LIVE - Highest priority: Autopilot must reliably do train, work out, work harder and read, and anything it did that year shows greyed out. 7b1 has basicsDef defaults; the reliability and greyed-out fixes plus the autobasics test were 7c, so REDO.
11. REDO (Oct 21 01:37) - Formatted money input everywhere (company add-money like stocks): commas, live short total, cash available, 25%/50%/Max, no raw prompt. Test it.
12. REDO (Oct 21 01:37) - Autopilot 'Train employees' routine (+4 skill, once a year, cost 5% of payroll with a $2K minimum), with the manual button greyed out once done. Test both.
13. NEW (Oct 21 01:55) - One-time Terms/Privacy agreement popup on first launch, before play: [Required] ToS (View), [Required] Privacy (View), [Optional] news/notifications. AGREE TO ALL and START GAME buttons; START GAME stays disabled until both required boxes are checked. Store a versioned acceptance in localStorage, separate from saves, and re-ask only when the version is bumped. Add links under More/Settings. Write play/terms.html and play/privacy.html as templates (the privacy page doubles as the Google Play privacy URL), with the privacy policy matching the actual code. Use placeholders [OWNER NAME], [GOVERNING LAW STATE], [CONTACT EMAIL] and a lawyer-review note. 390px layout, contrast guard green, test first launch vs. returning player.
14. REDO - Earlier 7c items, all lost:
    - Obituary screen (src/obituary.js; the base obituary is live in legacy.js).
    - Competitive job offers that use the offer pay on switchjob.
    - Honors: trophy case, Hall of Fame card, HoF heir +5 fame.
    - Brand deals and sponsor swap (athlete_brand and sponsor_upgrade routines).
    - job_nurture and job_promo Autopilot routines.
    - The passion mastered double-push guard.
    - No growth mastery cap.
    - Job panel (src/jobpanel.js, adapter_job.js).

## MISSED NOTES (Oct 18 onward)
- The executor's earlier notes said the Oct 18 items were verified as built in 7c, not in 7b1. Without the transcript those items can't be listed here, so the parent needs to supply them.

## Standing rules
No pixel art/BitLife in public copy; no GitHub push; stat steps are 4/8/16/30; Autopilot has the same costs and risks as manual play; contrast guard green; 390px UI tests with screenshots in /workspace/lifesim_art128/feature_shots8/; small fast builds.
NOTE: the tests/, tools, DEVLOG and node_modules are gone, so the test harness must be rebuilt.
