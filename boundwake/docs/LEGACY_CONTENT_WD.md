# Boundwake — Legacy content proposal (WD)

> **Game Dev · Nov 5, 2026 ~6:00 PM CT (America/Chicago)** — DATA/DOCS only. Coder owns `src/`, Autopilot Skip hotfix, and live `data_fantasy/legacy.json` wiring. Lifeline untouched. No Page, no messaging, no git/deploy from this task.

## Integration handoff (Coder)

| Item | Value |
|------|-------|
| **This doc** | `docs/LEGACY_CONTENT_WD.md` |
| **Optional JSON** | `docs/legacy_proposal_wd.json` (proposal only — **do not** load as pack until Coder merges) |
| **Live today** | `data_fantasy/legacy.json` — **34** Life Goals + **20** Achievements (STATUS f56882ee) |
| **Proposed counts** | **30** Life Goals + **20** Achievements (within Gary’s 20–40 / 15–25 ranges; trims redundant age ladder + fills cozy/study/craft gaps) |
| **IDs** | All `lg_*` / `ach_*` listed below; uniqueness validated in JSON |
| **Persistence** | Life Goals: once per life (`s.goals.claimed`). Achievements: once account-wide (`meta.legacy.claimed`) |
| **Reward stance** | All numbers **PROPOSED** (not Gary locks). Modest, capped, no endless farm, no start-gold runaway |
| **Collision policy** | Do not overwrite concurrent Coder/Text Bot edits to `legacy.json` / `src`. Merge from this WD when ready |
| **Priority** | P0 wire new progress types + keep working live goals · P1 replace/retire listed · P2 long-life + cozy fillers |

### Actual state dependencies (implementable now)

Progress types already evaluated in `bw_engine.js` `progressValue` / `syncLegacyMeta` / `tickLegacyLifeFlags`:

`age`, `gold`, `hasJob`, `jobYears`, `flag`, `career`, `skill`, `bestSkill`, `hasRoute`, `friends`, `partner`, `party`, `tally` (`adventures`, `marketBuys`, `marketSells`, …), `realms`, `notHome`, `hasTeam`, `hasGuild`, `stat`, `workshops`, `metaLives`, `metaFlag`, `metaBestAge`, `metaBestGold`, `metaRegions`, `metaCodex`, `metaPoints`, `goalsClaimedLife`.

Known life flags/tallies already set by engine: `goal_promoted`, `goal_adventured`, `goal_tourney`, `tour_team_entered`, `mana_awakened`, `everMerchantMid`, `has_home`, `has_mount`, `longLife120`, tallies `adventures` / `marketBuys` / `marketSells`.

Meta flags already synced on death: `longLife120`, `everTeam`, `everGuild`, `everMerchantMid`, `tourneyFirst`, `everJailed`, `manaAwakenLives`, `everFriends6`, `marketBuysTotal`, `reincCount`, `heirCount`.

### Proposed new counters / progress types (need wiring — do **not** pretend live)

| Proposed type / flag | Reads | Notes |
|----------------------|-------|-------|
| `guildJobs` | `s.guild.jobsDone` | Exists on guild object; **no** progressValue case yet |
| `teamWins` | `(s.team.wins.realm\|\|0)+(s.team.wins.grand\|\|0)` | Exists; needs progress case |
| `teamRenown` / `guildRenown` | `s.team.renown` / `s.guild.renown` | Soft-capped ~100 |
| `passionMastered` | `s.passions.mastered.length` | Exists |
| `notices` | `s.notices.posts` | Exists |
| `gearOwned` | `(s.gear.owned\|\|[]).length` | Exists |
| `places` | count of location ids in `s.codex` this life | Derive from regions locations ∩ codex; or new `tally.visits` |
| `skillCat` | best skill among `skills.json` cat | Needs cat lookup |
| `metaFlag longLife200` | set on death if `age>=200` and race elf/dwarf | **New** sync line |
| `metaFlag everPassionMaster` | mastered ≥1 passion any life | **New** |
| `metaFlag everHome` | `has_home` any life | **New** |
| `metaFlag everCraft40` | any craft-cat skill ≥40 any life | **New** |
| `metaFlag guildJobsTotal` | cumulative `jobsDone` across lives | **New** accum |
| `echoBoost` / `scoutBonus` | stored on mods | **Stored but not applied** mid-loop yet — treat as flavor until Coder hooks |

### Reward safeguards (PROPOSED caps)

| Mod / reward | Cap / stacking rule |
|--------------|---------------------|
| Life-goal gold (sum claimable / life) | Soft budget **≤ ~900g** across all 30 if every goal claimed (current live ~900+; this set ≈ **780g**) |
| Single life-goal gold | **≤ 80** |
| Happiness / fame crumbs per goal | **≤ 12** / **≤ 5** |
| Skill crumb | **≤ +2** to one skill; no recursive claim loops |
| Achievement `startGold` sum | Soft **≤ 80** total across all claimed (use **max** on pct mods; **sum** on seeds but Coder should clamp applied birth gold to **+80**) |
| `rareTraitBonus` | **max** stack, hard cap **0.10** |
| `marketBuyBonus` | **max** stack, hard cap **0.05** |
| `actBonus` / `socialBonus` | sum then clamp **≤ 2** each |
| `healthSeed` / `happinessSeed` / `fameSeed` | sum then birth clamp into 0–100 stats |
| No per-year repeating goals | Claim once; no reset mid-life; goals wipe on new life / reincarnate / heir as today |

### Menu categories (compact)

**Life Goals filters:** All · Age & Seasons · Work & Craft · Skills & Study · Bonds & Hearth · Roads & Realms · Market & Trade · Lists & Halls · Purse & Renown

**Achievements filters:** All · Echoes · Roads · Craft & Study · Bonds · Lists & Halls · Law & Ledger

**Row labels:** `Locked` (0 progress) · `In progress` · `Ready` · `Claimed`. Empty hub: `No goals in this filter.` Locked filter with zero discovered cats: still list cats; rows use Locked.

### Relation to live `legacy.json`

| Action | IDs |
|--------|-----|
| **KEEP** (still in proposed 30/20, same id) | `lg_job_first`, `lg_job_promo`, `lg_merchant`, `lg_mana_awake`, `lg_route`, `lg_friend`, `lg_partner`, `lg_party`, `lg_adv_1`, `lg_travel`, `lg_market_buy`, `lg_market_sell`, `lg_team_found`, `lg_guild`, `lg_tourney`, `lg_workshop` · `ach_first_life`, `ach_lives_3`, `ach_reinc_1`, `ach_heir_1`, `ach_all_realms`, `ach_team_owner`, `ach_guild_owner`, `ach_merchant_line`, `ach_tourney_win`, `ach_mana_line`, `ach_jailbird`, `ach_goals_10` |
| **RETIRE from hub** (absorb / replace — leave in JSON only if Coder wants legacy save compat stubs) | `lg_age_10/16/30/50/80` → replaced by inclusive season set · `lg_job_years_5` · `lg_sk_sword_15` · `lg_sk_spell_15` · `lg_sk_barter_20` · `lg_sk_any_40` · `lg_friends_3` · `lg_adv_5` · `lg_realm_2` · `lg_realm_4` · `lg_team_meet` · `lg_gold_200` · `lg_gold_1000` · `lg_fame_20` · `ach_lives_8` · `ach_age_100_life` · `ach_codex_40` · `ach_market_flip` · `ach_gold_5k` · `ach_friends_many` · `ach_points_50` · `ach_elf_or_dwarf` |
| **NEW** | See tables below (`lg_seasons_*`, craft/study/cozy, `ach_craft_line`, etc.) |

---

## Life Goals (30) — once per life

Each entry: **id · title · desc · cat · condition · prereq · reward (PROPOSED) · scope · wire**

`wire: live` = progress type already works. `wire: extend` = state exists, needs progressValue case or flag sync. `wire: new` = needs new counter.

### Age & Seasons (4) — inclusive; calendar winters lived, not “must be elderly human”

| id | title | desc | cat | completion | prereq | reward PROPOSED | scope | wire |
|----|-------|------|-----|------------|--------|-----------------|-------|------|
| `lg_seasons_10` | First decade of winters | Live through 10 calendar winters in this waking. | age | `age >= 10` | — | gold 12, happiness 3 | life | live |
| `lg_seasons_25` | Quarter-mark | Live through 25 calendar winters. | age | `age >= 25` | — | gold 28, happiness 5, fame 1 | life | live |
| `lg_seasons_60` | Sixty winters kept | Live through 60 calendar winters (any race). | age | `age >= 60` | — | gold 55, happiness 8, fame 2 | life | live |
| `lg_long_blood_100` | Second-century lantern | As elf or dwarf, reach calendar age 100 in this life. | age | `age >= 100` AND race in {elf,dwarf} | race elf\|dwarf | gold 70, happiness 10, fame 3 | life | live + race gate in claim/list |

*Note:* No fixed “die at 80” or human-only elder gates. Long-life glory is optional race-gated, not required for short-lived races.

### Work & Craft (5)

| id | title | desc | cat | completion | prereq | reward PROPOSED | scope | wire |
|----|-------|------|-----|------------|--------|-----------------|-------|------|
| `lg_job_first` | First wage | Take any job. | work | `hasJob` | cage gates as jobs | gold 20, happiness 3 | life | live KEEP |
| `lg_job_promo` | One rung up | Earn a promotion. | work | flag `goal_promoted` | has job | gold 40, fame 3, happiness 5 | life | live KEEP |
| `lg_merchant` | Market blood | Hold a Merchant-track job. | work | career merchant | — | gold 30, skill bartering +2 | life | live KEEP |
| `lg_workshop` | Own a stall | Open any workshop (`herb_stall`…`relic_desk`). | work | `workshops >= 1` | — | gold 40, fame 2 | life | live KEEP |
| `lg_craft_skill_25` | Hands that remember | Raise any craft-category skill (smithing, alchemy, enchanting, cooking, tailoring) to 25. | work | `skillCat craft >= 25` | — | gold 35, happiness 4, skillBump 1 | life | **extend** `skillCat` |

### Skills & Study (5)

| id | title | desc | cat | completion | prereq | reward PROPOSED | scope | wire |
|----|-------|------|-----|------------|--------|-----------------|-------|------|
| `lg_literacy_20` | Letters held | Train Literacy to 20. | skills | skill `literacy` ≥ 20 | — | gold 22, skill literacy +1 | life | live |
| `lg_lore_20` | Shelf-reader | Train Lore to 20. | skills | skill `lore` ≥ 20 | — | gold 22, skill lore +1 | life | live |
| `lg_mana_awake` | Mana answers | Awaken mana. | skills | flag `mana_awakened` | — | gold 25, happiness 6 | life | live KEEP |
| `lg_route` | Choose a path | Pick sword, magic, hybrid, or craft route. | skills | `hasRoute` | — | gold 20, happiness 4 | life | live KEEP |
| `lg_passion_one` | Pastime kept | Master one passion track (move to `passions.mastered`). | skills | `passionMastered >= 1` | passions minAge | gold 30, happiness 6 | life | **extend** |

### Bonds & Hearth (5) — cozy / social; no forced home vs travel conflict

| id | title | desc | cat | completion | prereq | reward PROPOSED | scope | wire |
|----|-------|------|-----|------------|--------|-----------------|-------|------|
| `lg_friend` | First friend | Make a friend (rel≥30, non-parent). | bonds | `friends >= 1` | — | happiness 8, gold 10 | life | live KEEP |
| `lg_partner` | Lantern vow | Find a partner. | bonds | `partner >= 1` | — | happiness 12, gold 25 | life | live KEEP |
| `lg_party` | Road company | Fill a party of 2+. | bonds | `party >= 2` | — | gold 20, happiness 5 | life | live KEEP |
| `lg_hearth_visit` | Greenwell afternoon | Discover / visit `hf_greenwell` (Codex place). | bonds | place `hf_greenwell` in `s.codex` | — | happiness 6, gold 8 | life | **extend** `places`/codex-id check |
| `lg_notice_post` | Slate voice | Post once on any notice board (`notices.posts >= 1`). | bonds | `notices >= 1` | notices minAge 10 | fame 2, happiness 3, gold 10 | life | **extend** |

*Optional home* is a separate achievement path — never required here, so travelers are not blocked.

### Roads & Realms (4)

| id | title | desc | cat | completion | prereq | reward PROPOSED | scope | wire |
|----|-------|------|-----|------------|--------|-----------------|-------|------|
| `lg_adv_1` | First road | Set out on Adventure once. | adventure | flag `goal_adventured` | cage≥10 | gold 15, fame 1 | life | live KEEP |
| `lg_travel` | Leave the Vale | Travel to a realm that is not Hearthfold. | travel | `notHome` | — | gold 25, happiness 4 | life | live KEEP |
| `lg_realms_3` | Three horizons | Discover 3 realms this life. | travel | `realms >= 3` | — | gold 45, fame 3 | life | live |
| `lg_places_8` | Footpaths known | Record 8 place ids in this life’s Codex. | travel | places ≥ 8 | — | gold 35, fame 2, happiness 3 | life | **extend** |

### Market & Trade (2)

| id | title | desc | cat | completion | prereq | reward PROPOSED | scope | wire |
|----|-------|------|-----|------------|--------|-----------------|-------|------|
| `lg_market_buy` | First stall buy | Checkout once at the Yearly Market. | market | tally `marketBuys` ≥ 1 | market minAge 10 | gold 15, skill bartering +1 | life | live KEEP |
| `lg_market_sell` | Pack flip | Sell a trade good at market. | market | tally `marketSells` ≥ 1 | — | gold 15, skill bartering +1 | life | live KEEP |

### Lists & Halls (4) — team and guild are **independent** paths (no mutual exclusive force)

| id | title | desc | cat | completion | prereq | reward PROPOSED | scope | wire |
|----|-------|------|-----|------------|--------|-----------------|-------|------|
| `lg_team_found` | Clerk's stamp | Found a tournament team. | team | `hasTeam` | cage≥16, affinity per live rules | gold 40, fame 3 | life | live KEEP |
| `lg_team_win_1` | Ribbon claimed | Win 1 team meet (realm or grand). | team | `teamWins >= 1` | has team | gold 45, fame 4 | life | **extend** |
| `lg_guild` | Hall keys | Open an adventure guild hall. | guild | `hasGuild` | cage≥18 + live founding rules | gold 50, fame 4 | life | live KEEP |
| `lg_guild_jobs_3` | Board cleared | Complete 3 guild jobs (`guild.jobsDone`). | guild | `guildJobs >= 3` | has guild | gold 40, fame 3 | life | **extend** |

### Purse & Renown (1) + Tournament bridge already in Lists

| id | title | desc | cat | completion | prereq | reward PROPOSED | scope | wire |
|----|-------|------|-----|------------|--------|-----------------|-------|------|
| `lg_tourney` | Enter the lists | Enter any Blade/Spark/craft meet. | tournament | flag `goal_tourney` | — | gold 25, fame 3 | life | live KEEP |

*Wealth goals trimmed* (no gold-200/1000 life goals) to avoid purse-chasing; wealth remains a meta achievement.

**Count check:** 4+5+5+5+4+2+4+1 = **30**.

---

## Achievements (20) — once account-wide + meta mods

| id | title | desc | cat | completion | reward PROPOSED | wire |
|----|-------|------|-----|------------|-----------------|------|
| `ach_first_life` | First waking | Begin or finish your first life in this save. | meta | `metaLives >= 1` | points 5, mods `{ startGold: 8 }` | live KEEP |
| `ach_lives_3` | Three souls | Record 3 lives in the cemetery. | meta | `metaLives >= 3` | points 8, mods `{ startGold: 10, rareTraitBonus: 0.03 }` | live KEEP |
| `ach_reinc_1` | Soul road | Reincarnate once. | meta | metaFlag `reincCount` ≥ 1 | points 6, mods `{ echoBoost: 0.1 }` | live KEEP (mod apply TBD) |
| `ach_heir_1` | Blood continues | Continue as an heir once. | meta | metaFlag `heirCount` ≥ 1 | points 6, mods `{ startGold: 12 }` | live KEEP |
| `ach_all_realms` | Map-keeper | Discover all five realms across lives. | travel | `metaRegions >= 5` | points 10, mods `{ scoutBonus: 0.05 }` | live KEEP |
| `ach_codex_60` | Deep shelf | Hold 60 codex entries in meta. | codex | `metaCodex >= 60` | points 9, mods `{ loreSeed: 2 }` | live type (target raised vs old 40) |
| `ach_team_owner` | Banner house | Found a tournament team in any life. | team | metaFlag `everTeam` | points 7, mods `{ teamRenownSeed: 2 }` | live KEEP |
| `ach_guild_owner` | Hall founder | Open a guild hall in any life. | guild | metaFlag `everGuild` | points 7, mods `{ guildCofferSeed: 20 }` | live KEEP |
| `ach_guild_board_20` | Contract ledger | Accumulate 20 guild jobs done across lives. | guild | metaFlag `guildJobsTotal` ≥ 20 | points 8, mods `{ startGold: 8, socialBonus: 1 }` | **new** accum |
| `ach_merchant_line` | Ledger blood | Reach Peddler+ on Merchant track any life. | work | metaFlag `everMerchantMid` | points 6, mods `{ barterSeed: 2 }` | live KEEP |
| `ach_market_season` | Yearly trader | Complete 8 market checkouts across lives. | market | metaFlag `marketBuysTotal` ≥ 8 | points 7, mods `{ marketBuyBonus: 0.02 }` | live (threshold tweak) |
| `ach_tourney_win` | Lists champion | Place 1st in any meet. | tournament | metaFlag `tourneyFirst` | points 10, mods `{ fameSeed: 3 }` | live KEEP |
| `ach_mana_line` | Spark lineage | Awaken mana in three different lives. | magic | metaFlag `manaAwakenLives` ≥ 3 | points 9, mods `{ manaMaxSeed: 4, rareTraitBonus: 0.02 }` | live KEEP |
| `ach_craft_line` | Anvil echo | Raise any craft skill to 40 in any life. | work | metaFlag `everCraft40` | points 8, mods `{ startGold: 10 }` | **new** flag |
| `ach_passion_line` | Pastime lineage | Master a passion in any life. | skills | metaFlag `everPassionMaster` | points 6, mods `{ happinessSeed: 3 }` | **new** flag |
| `ach_hearth_key` | Threshold kept | Live in a home (gear home) in any life. | bonds | metaFlag `everHome` | points 5, mods `{ happinessSeed: 2 }` | **new** flag |
| `ach_friends_circle` | Wide hearth | Have 6 living friends at once any life. | bonds | metaFlag `everFriends6` | points 6, mods `{ socialBonus: 1 }` | live (rename from friends_many) |
| `ach_jailbird` | Stone lesson | Survive imprisonment and release. | law | metaFlag `everJailed` | points 5, mods `{ stealthSeed: 2 }` | live KEEP |
| `ach_long_echo` | Long-lived blood | Reach calendar age 120+ as elf or dwarf (any life). | age | metaFlag `longLife120` | points 14, mods `{ healthSeed: 4 }` | live KEEP (retire impossible dual-race wording) |
| `ach_goals_10` | Purpose tenfold | Claim 10 Life Goals in a single life. | goals | `goalsClaimedLife >= 10` | points 8, mods `{ happinessSeed: 3 }` | live KEEP |

**Count:** **20** achievements (lives_12 deferred to backlog so cozy `ach_hearth_key` fits).

### Inclusive long-life note

- `ach_long_echo` uses existing `longLife120` (calendar), reachable by elf/dwarf without asking humans for age 120.
- Optional later (not in the 20): `ach_long_echo_200` via **new** `longLife200` — mark as backlog only.

---

## UI copy crumbs (original)

- Hub blurb (keep/adapt): “Life Goals are this waking. Achievements and their modifiers endure across reincarnations.”
- Ready button: `Claim`
- Claimed: `Claimed` + winter claimed
- Locked age/race gate: `Needs long-lived blood` / `Not yet`

---

## Coder merge checklist

1. Diff this set vs live `legacy.json`; keep save-safe: unknown claimed ids should no-op.
2. Add progress cases for `guildJobs`, `teamWins`, `passionMastered`, `notices`, `places` (or `codexId`), `skillCat`.
3. On `syncLegacyMeta`: set `everHome`, `everPassionMaster`, `everCraft40`, accumulate `guildJobsTotal`.
4. Race-gate `lg_long_blood_100` in list/claim (hide or lock with reason for human/beastkin).
5. Clamp birth `startGold` application ≤ 80 cumulative.
6. Do not load `docs/legacy_proposal_wd.json` via pack until merged into `data_fantasy/legacy.json`.
