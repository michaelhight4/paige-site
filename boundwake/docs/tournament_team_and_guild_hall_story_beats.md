# Boundwake — Story beats: Tournament Team & Adventure Guild Hall

**Status:** DRAFT — Gary-approved locks Nov 5, 2026 ~3:26 PM CT (Story Bot outline + Coder stamp)  
**Scope:** Optional whole-life ownership tracks only. Not career-guild membership (Watch / Merchants / Collegium / Freeblade / Healers / Chroniclers — those stay in `fantasy_lifesim/world/guilds_sects.md`).  
**Canon lock:** Aligns with `docs/TOURNAMENT_TEAMS_AND_GUILDS.md` (Gary locked Nov 5 ~3:18 PM CT). Engine/UI not built yet — this is narrative gates + flags for Text Bot / Coder.  
**Do not edit game code from this doc.**

---

## Content & tone (must keep)

| Rule | How it shows in these tracks |
|------|------------------------------|
| No tobacco / drugs / alcohol | Celebrations = feast tables, festival lamps, tea/juice, forge-glow toasts with words not cups of wine. Inns = food halls. |
| Original IP only | No Bit Tensie / Mushoku / SDS / sports-franchise chrome. Call buildings **hall** / **drill hall** / **training lawn** — never gym. Healer not nurse. |
| Life-sim, not main quest | Every beat is an **optional gate**. Player can ignore, soft-fail, walk away, lose to a rival, or hand off. No forced ownership arc. |
| Age gates (calendar) | Team unlock `cage` ≥ 16 + skill affinity ≥ 20. Guild hall unlock `cage` ≥ 18 + 150 gold + hall slot. Use `cage` for story gates; `hage` only for longevity/portrait flavor. |
| Tone | Warm, readable, a little wondrous; hard outcomes OK. Everyday wonder over dungeon spam. |
| Races | human / elf / dwarf / beastkin — NPCs may be any; extra elf/dwarf long-life beats **in v1** (Gary lock). |
| Realms | Hearthfold, Glassmarket, Thornreed, Spireward, Emberlight — place hooks below use existing location kinds (`tournament` / `arena` / `fair` Visit, notice boards, Ledger Hall contracts). |

**Mission line for Text Bot:** *Another life. Same stubborn heart — and a roster that still expects supper.*

---

## Shared design (both tracks)

### Arc shape (optional)
`Founding → First proof (win / contract) → Renown → Late-life legacy`

### Branch outcomes (every major gate offers ≥3)
1. **Success** — advance stage + flag  
2. **Soft fail** — stay / retry next year; stress/gold hit; no hard lockout  
3. **Walk away** — freeze or wind down ownership; keep Codex history  
4. **Rival takeover** — lose control; rival NPC owns the slot; optional reclaim later  
5. **Handoff** — priority **heir → apprentice → captain** (then other `world_legacy.heirTypes` if needed: spouse, sibling, parent, ward, friend)

### Replayable hooks
- Different **skill affinity** (team) or **hall realm + fee tier** (guild) each life  
- Rival personality roll (`rival_fair` / `rival_cutthroat` / `rival_mentor`)  
- First-proof can be early, mid, or never — renown track still opens via smaller meets / low jobs  
- Echo path: Codex remembers wins / contracts; heir path can inherit standing tier −1 (same language as career guilds)

### State fields (Coder — suggested)
```
bw.team   // { name, affinitySkill, roster[], wins, renown, stage, rivalId, heirId, flags{} }
bw.guild  // { name, realmId, hallLocId, roster[], feeTier, renown, stage, rivalId, heirId, coffer, flags{} }
```

Stages (shared ladder language, ownership-flavored):  
`none → founding → proven → renowned → legacy`  
(Disbanded / seized / handed_off are terminal tags, not stages.)

---

# TRACK A — Tournament Team ownership

**Systems reminder (locked):** Affinity for **one** of the 29 skills. Compete in smaller realm meets + every-3-years **Teams** bracket beside Blade / Spark / craft. Roster ≤4. Found 80 gold + 1 act.

## Beat table

| # | Beat id | Stage gate | When / where | Who | Emotion | Optional? | Outcomes | Suggested flags / choice points |
|---|---------|------------|--------------|-----|---------|-----------|----------|----------------------------------|
| A0 | `team_hook_notice` | none→tease | cage 14–18; notice board or Visit fair/arena | Crier / rival scout | Curious, competitive | Yes — ignore forever | Interest / dismiss / ask mentor | `team.teaseSeen`, `team.interest` |
| A1 | `team_founding` | →founding | cage≥16, affinity≥20, 80g, 1 act | Clerk of Meets (realm civic) | Nervous hope | Yes | Found / delay / refuse | `team.stage=founding`, `team.name`, `team.affinitySkill` |
| A2 | `team_first_hire` | founding | Same year or next | Hire NPC or invite bond into roster | Trust vs control | Yes | Hire / self-captain only / wait | `team.roster[]`, `team.playerCaptain` |
| A3 | `team_first_meet` | founding | Visit tournament/arena/fair OR notice invite; 10g+1act | Opposing captain + judge | Tension, pride | Yes | Enter / skip year | `team.meetsEntered++` |
| A4 | `team_first_win` | →proven | First place 1–3 at small meet **or** Teams bracket | Team + crowd | Triumph or grit | Yes — can soft-fail years | Place 1/2/3 / wash out / withdraw mid | `team.firstWinYear`, `team.stage=proven`, renown+ |
| A5 | `team_rival_named` | proven | After first public result | Rival captain (persistent) | Sparks | Yes | Respect / feud / ignore | `team.rivalId`, `team.rivalStance` |
| A6 | `team_roster_crisis` | proven | Injury / quit / better offer from rival | Afflicted member | Loyalty test | Yes | Pay retain / release / match rival offer | `team.crisisCount`, stress/gold |
| A7 | `team_realm_circuit` | proven→renowned | Multiple small meets across realms | Locals + sponsors | Ambition | Yes | Tour / stay local / decline sponsor | `team.circuitRealms[]`, patronage hook |
| A8 | `team_triennial` | proven+ | Every 3 calendar years Teams bracket; 20g+1act | Realm crowd | Prestige pressure | Yes | Enter / skip / send roster without PC | `team.triennialBest`, big renown |
| A9 | `team_renown_peak` | →renowned | Renown tier gate (interim shared ladder **0/25/50/75**; `renowned` at ≥50 — Game Dev) | Chronicler / festival | Recognition | Soft auto + choice | Accept banner / stay quiet / sell name rights (no IP brands — local stall only) | `team.stage=renowned`, Codex entry |
| A10 | `team_scandal_or_fair` | renowned | Judge challenge / disputed call / dirty rival | Judge + rival | Anger or grace | Yes | Protest / accept / walk | karma/renown swing; possible `team.suspendedYrs` |
| A11 | `team_walk_or_seize` | any≥founding | Debt, stress, or rival buyout offer | Rival / Ledger Hall | Bitterness or relief | Yes | Walk away / sell / fight claim; if seized, reclaim later via **buy-back** or **challenge meet** | `team.stage` tag `disbanded`\|`seized`, Codex keeps wins; `team.reclaimVia` |
| A12 | `team_legacy_handoff` | →legacy | Late life (soft: cage 50+ human-scale, or hage elder) OR death sheet | Heir → apprentice → captain (priority) | Pride, farewell | Yes | Name successor / dissolve / rival inherits vacuum | `team.heirId`, `team.stage=legacy`; heir standing −1 |
| A13 | `team_echo_memory` | meta | Reincarnate path only | Echo of Renown flavor | Bittersweet | Auto if Codex | — | Codex `team.wins` visible; no live roster |

### Track A — branching map (short)

```
[ignore A0] ─────────────────────────────────────────────► never own a team
     │
     ▼
[A1 found] ─refuse──► tease only
     │
     ▼
[A2–A3 practice meets] ─wash out years──► soft fail loop (A3)
     │
     ▼
[A4 first win] ─withdraw──► founding stuck / walk (A11)
     │
     ├─► rival feud (A5–A6–A10) ─seize──► rival owns slot (reclaim hook)
     ├─► circuit + triennial (A7–A8) ─► renowned (A9)
     └─► handoff / dissolve (A12) ─► legacy Codex
```

### Track A — suggested Coder choice-point ids
`cp_team_found`, `cp_team_name_affinity`, `cp_team_hire`, `cp_team_enter_meet`, `cp_team_first_result`, `cp_team_rival_stance`, `cp_team_retain_member`, `cp_team_sponsor`, `cp_team_triennial`, `cp_team_banner`, `cp_team_dispute`, `cp_team_exit`, `cp_team_handoff`

---

# TRACK B — Adventure Guild Hall ownership

**Systems reminder (locked):** Own **one** hall (v1). Adventurers on roster complete jobs on player's behalf; player pays fee (Low/Mid/High). Higher fee → better pool + more jobs. Success → guild renown → better hires/jobs. Unlock cage≥18, 150g, hall slot in current realm.

**Naming note:** This is a **player-owned adventure hall**, not joining Hearthfold Watch or Freeblade Compact as an employee. Display copy: “your hall,” “board contracts,” “roster fee” — avoid cloning other games’ guild chrome.

## Beat table

| # | Beat id | Stage gate | When / where | Who | Emotion | Optional? | Outcomes | Suggested flags / choice points |
|---|---------|------------|--------------|-----|---------|-----------|----------|----------------------------------|
| B0 | `guild_hook_contract` | none→tease | cage 16–20; notice / Ledger Hall / caravan yard | Broker or retired adventurer | Practical hunger | Yes | Interest / dismiss | `guild.teaseSeen`, `guild.interest` |
| B1 | `guild_founding` | →founding | cage≥18, 150g, hall slot, 1+ act | Realm clerk + landlord | Weight of keys | Yes | Found / delay / refuse | `guild.stage=founding`, `guild.name`, `guild.realmId`, `guild.hallLocId` |
| B2 | `guild_first_hire` | founding | Fee tier pick + hire 1–6 over time | Candidate adventurers | Judgment | Yes | Hire / wait / overpay Mid/High | `guild.feeTier`, `guild.roster[]` |
| B3 | `guild_board_open` | founding | First year board goes live | Townsfolk client | Hope / skepticism | Yes | Post open / stay dark a year | `guild.boardOpen` |
| B4 | `guild_first_contract` | →proven | First successful job payout | Client + roster lead | Relief, proof | Yes — failures allowed | Success / fail (−renown) / refuse job / walk | `guild.firstContractYear`, `guild.stage=proven` |
| B5 | `guild_fee_pressure` | proven | Yearly fee drain vs coffer | Roster (may threaten leave) | Squeeze | Yes | Raise fee / cut roster / dip purse | `guild.coffer`, stress |
| B6 | `guild_rival_hall` | proven | Another hall or compact poaches jobs | Rival hall-master | Competition | Yes | Undercut / specialize / ignore / merge talk | `guild.rivalId`, `guild.rivalStance` |
| B7 | `guild_hard_job` | proven | High-risk contract (wilds / marches) | Client + injured risk | Dread / duty | Yes | Take / refuse / send best only | injury on NPC, renown swing |
| B8 | `guild_renown_tiers` | →renowned | Renown hits 25/50/75 hire-pool unlocks | Broker | Growth | Soft auto + choice | Expand roster / keep small / open second **flavor** only (v1 still one hall — flavor banquet) | `guild.stage=renowned`, tier flags |
| B9 | `guild_ethics` | renowned | Job that hurts commons vs pays well | Client vs Lantern Vow flavor | Conscience | Yes | Take / refuse / renegotiate | karma, sect_lantern lean optional |
| B10 | `guild_scandal_or_seize` | any≥founding | Failed job harm / debt / rival buyout | Clerk / rival | Shame or steel | Yes | Make right / deny / sell / fold; if seized, reclaim via **buy-back** or **challenge meet** (standing/contract) | `guild` tag `disbanded`\|`seized`; `guild.reclaimVia` |
| B11 | `guild_legacy_handoff` | →legacy | Late life or death sheet | Heir → apprentice → captain/senior (priority) | Continuity | Yes | Hand hall / dissolve / charity share (`world_legacy.charities`) | `guild.heirId`, `guild.stage=legacy` |
| B12 | `guild_echo_memory` | meta | Reincarnate | Echo of Renown | Quiet pride | Auto | — | Codex contracts count |

### Track B — branching map (short)

```
[ignore B0] ─────────────────────────────────────────────► never own a hall
     │
     ▼
[B1 found] ─refuse──► tease only
     │
     ▼
[B2–B3 board] ─stay dark──► founding soft stall
     │
     ▼
[B4 first contract] ─fail loop──► retry / walk (B10)
     │
     ├─► fee & rivalry (B5–B6–B7) ─seize/fold──► rival or empty lot
     ├─► renown tiers + ethics (B8–B9) ─► renowned
     └─► handoff / charity / dissolve (B11) ─► legacy
```

### Track B — suggested Coder choice-point ids
`cp_guild_found`, `cp_guild_name_realm`, `cp_guild_fee`, `cp_guild_hire`, `cp_guild_board`, `cp_guild_first_job`, `cp_guild_hard_job`, `cp_guild_rival`, `cp_guild_ethics`, `cp_guild_expand_flavor`, `cp_guild_exit`, `cp_guild_handoff`, `cp_guild_charity`

---

## Cross-track notes (both allowed in one life — Gary lock)

- **Both tracks allowed in one life** if gold/actions allow — do not force synergy.  
- Soft link / cross team↔guild **bonuses ON for v1** (Gary lock Nov 5 ~3:26 PM CT). Flags `cross.teamFeedsGuild`, `cross.guildHealsTeam` = true. Numbers: `docs/CROSS_BONUSES.md`. Flavor beats + extra seeds: `docs/tournament_guild_longlife_and_crossbonus.md`.  
- Elf/dwarf **long-life beats IN v1** — same longlife doc; Text Bot dialogue in `docs/events_draft/tournament_guild_scene_dialogue.md`.  
- Career guild membership (warden etc.) can coexist; ownership tracks do not auto-promote career standing.

---

## Text Bot — scene seeds (handoff packet)

Enough for dialogue drafts; **not** full lines. Speakers use Boundwake-original roles. No alcohol beats. Celebrate with food halls, lamps, forge glow, tea.

### Seed format
`id | speakers | beat | tone | player choices (labels only)`

### Track A seeds
1. `seed_team_a0` \| **Quay Crier** (Glassmarket) or **Greenwell board-keeper** \| A0 tease \| Warm nudge, slightly teasing \| Ask about team meets / Not my path / Who wins around here?  
2. `seed_team_a1` \| **Clerk of Meets** (civic, parchment + wax) \| A1 founding \| Formal, practical \| Register the team / Need more coin first / Changed my mind  
3. `seed_team_a2` \| **Hire candidate** (affinity-matched NPC) + optional **bond friend** \| A2 first hire \| Hopeful / wary \| Hire them / Captain myself / Not yet  
4. `seed_team_a4` \| **Meet judge** + **opposing captain** \| A4 first win/placement \| Bright festival lamps, sweaty pride — food-stall cheers, not tavern drunk \| Accept the purse / Credit the roster / Stay humble  
5. `seed_team_a5` \| **Rival captain** (persistent name) \| A5 rival named \| Sharp, respectful or cutting (roll) \| Offer respect / Mark them a foe / Walk past  
6. `seed_team_a6` \| **Injured / tempted roster member** \| A6 crisis \| Tired, loyal or tempted \| Match the offer / Let them go / Ask them to stay for pride  
7. `seed_team_a8` \| **Triennial herald** \| A8 Teams bracket \| Grand but readable \| Enter Teams / Skip this cycle / Send the roster without me  
8. `seed_team_a10` \| **Judge** + rival \| A10 dispute \| Tense, civic \| Protest the call / Accept and train harder / Leave the circuit  
9. `seed_team_a11` \| **Rival** or **Ledger Hall broker** \| A11 walk/seize \| Cold coin \| Sell / Refuse buyout / Disband clean  
10. `seed_team_a12` \| **Heir / apprentice / trusted captain** \| A12 handoff \| Soft dusk, forge-glow or statue garden \| Name them successor / Dissolve with honors / Split credit in the Codex  

### Track B seeds
1. `seed_guild_b0` \| **Caravan broker** or **retired blade** \| B0 tease \| Dusty practical \| Ask about hall writs / Not for me / Tell me the costs  
2. `seed_guild_b1` \| **Realm clerk** + **hall landlord** \| B1 founding \| Keys-on-wood seriousness \| Take the hall / Delay a year / Walk away  
3. `seed_guild_b2` \| **Adventurer candidate** (tier 0 pool) \| B2 hire + fee \| Hungry, honest \| Hire on Low / Mid / High fee / Pass  
4. `seed_guild_b4` \| **Client** (herb-grower, caravan, watch post — everyday first) \| B4 first contract \| Relief when done \| Collect pay / Share bonus with roster / Ask for their name in the Codex  
5. `seed_guild_b5` \| **Senior roster voice** \| B5 fee pressure \| Frayed \| Raise fees / Cut a member / Pay from my purse  
6. `seed_guild_b6` \| **Rival hall-master** \| B6 rivalry \| Smiling competition \| Undercut / Specialize our board / Propose fair split of districts  
7. `seed_guild_b7` \| **Frontier client** (Emberlight / Thornreed) \| B7 hard job \| Wind-bitten urgency \| Take the risk / Refuse / Send only the best  
8. `seed_guild_b9` \| **Client** vs optional **Lantern Vow** acquaintance \| B9 ethics \| Quiet moral weight \| Take the gold / Refuse / Renegotiate terms  
9. `seed_guild_b10` \| **Civic clerk** / harmed local \| B10 fallout \| Stern \| Make restitution / Deny fault / Sell the hall  
10. `seed_guild_b11` \| **Heir / apprentice / senior** + optional **charity** (Hearthkeeper Shrine / Vale Primer / Low Watch Widows' Purse / Willowpond Healers) \| B11 legacy \| Warm ledger-close \| Hand over hall / Dissolve / Endow a charity share  

### Text Bot drafting rules for these seeds
- Keep BitLife-simple choice labels (short).  
- Journal lines: one breath, concrete, no lore dumps.  
- Injury / stress / gold deltas preferred over long combat prose.  
- Kids never run halls or adult Teams brackets; child individual Blade/Spark already exists separately.  
- Ban list: alcohol, tobacco, drugs, gym, nurse, berry, badge-as-gym, other-IP names.

---

## Gary-approved story locks (Nov 5, 2026 ~3:26 PM CT via Coder)

| # | Topic | Locked |
|---|--------|--------|
| 1 | Both tracks one life | **Allowed** (no mutual exclusion) |
| 2 | Renown tiers | **0 / 25 / 50 / 75**; stage `renowned` at ≥50 for both tracks |
| 3 | Rival reclaim | **Buy-back** *or* **challenge meet** (player picks when reclaiming a seized slot) |
| 4 | Handoff priority | **heir → apprentice → captain** (then other heirTypes if none) |
| 5 | Cross team↔guild bonuses | **ON** for v1 |
| 6 | Titles | **Clerk of Meets / Meet judge / hall-master OK** |
| 7 | Elf/dwarf long-life beats | **Include in v1** |

---

## Open questions for Gary

**Resolved** Nov 5, 2026 ~3:26 PM CT — see Gary-approved story locks above.

---

## Handoffs

| Owner | Action |
|-------|--------|
| **Gary** | Approve / amend this DRAFT |
| **Text Bot** | Draft full prompts from **Text Bot — scene seeds** section (this file = handoff packet) |
| **Coder** | Wire `bw.team` / `bw.guild` + choice-point ids when implementing `TOURNAMENT_TEAMS_AND_GUILDS.md` — do not treat this doc as code |
| **Game Dev** | Confirm balance numbers stay with interim defaults until revised |

---

*End DRAFT. File: `/workspace/boundwake/docs/tournament_team_and_guild_hall_story_beats.md`*
