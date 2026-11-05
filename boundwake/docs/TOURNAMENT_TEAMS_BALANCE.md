> **Game Dev · Nov 5, 2026 · for Coder implement today**  
> Expands Gary’s lock in `TOURNAMENT_TEAMS_AND_GUILDS.md`. Original Boundwake names only. No sports franchise / Bit Tensie / MT / SDS chrome.

# Tournament teams — numbers & rules

## State shape (suggested `bw.team`)
```js
{
  name: string,
  affinitySkill: string,   // one of skills.json ids
  foundedYear: number,
  roster: [{ id, name, power, hired, isPlayer }], // max 4
  renown: number,          // team renown 0–100 soft
  wins: { realm: number, grand: number },
  history: []              // Codex hooks
}
```

## Unlock & founding
| Rule | Value |
|------|-------|
| Min calendar age `cage` | 16 |
| Min skill in chosen affinity | 20 |
| Found cost | **80 gold** + **1 act** |
| Affinity pick | Exactly **one** skill id at founding; **immutable** for that team life |
| Rename | Free once; then 15 gold |
| Disband | Free; keep `wins` + `history` in Codex; clear roster |

**Recommended affinities (UI hint, not hard lock):** martial/arcane/craft pillars — `swordsmanship`, `archery`, `shieldwork`, `spellcraft`, `elementalism`, `smithing`, `alchemy`, `performance`, `bartering`, `tracking`. All 29 skills remain valid.

## Roster
| Rule | Value |
|------|-------|
| Max size | **4** |
| Player as captain | Allowed if player’s affinity skill ≥ 20 and matches team affinity; counts as 1 slot; power = player skill |
| Hire NPC | **25 gold**, no act (or 1 act if done on Visit day — Coder pick one; draft: **no act**) |
| NPC power | `clamp(affinitySkill ± randInt(-10,10), 5, 95)` at hire; +1 power per 3 team renown (cap +10) while on roster |
| Fire NPC | Free |
| Replace mid-meet | Not allowed once entered |

**Team power** (for match rolls):
```
teamPower = average(member.power) + 0.15 * max(member.power) + floor(team.renown / 20)
```

## Realm meets (small)
**When:** Visit a location tagged `tournament` / `arena` / `fair`, **or** accept a notice-board invite (`notice_team_meet`).  
**Limit:** max **2 realm meets per calendar year** (prevent spam).

| | |
|--|--|
| Entry | **10 gold** + **1 act** |
| Opponents | 3 AI teams; power = `18 + cage*0.4 + rand(0,15)` scaled by realm tier (Hearthfold 1.0 → Emberlight 1.25) |
| Resolve | Single elimination or 3-round Swiss; draft: **3 matches**, place by wins then power |

### Place payouts (realm)
| Place | Gold | Team renown | Affinity XP (player) | Notes |
|-------|------|-------------|----------------------|-------|
| 1st | 40 | +5 | +3 | Recruit hook roll 15% |
| 2nd | 25 | +3 | +2 | |
| 3rd | 15 | +2 | +1 | |
| 4th+ | 0 | +0 | 0 | Consolation: +1 composure chance only — skip for v1 |

**Affinity XP:** add to player’s `skills[affinitySkill]` only (not whole roster). Cap skill 100.

## Grand Teams bracket (every 3 years)
**When:** same calendar beat as existing Blade / Spark / craft tournament; Adventure shows a **Teams** section.  
**Years:** `year % 3 === 0` (align with existing grand tournament year; if engine uses different phase, match that).

| | |
|--|--|
| Entry | **20 gold** + **1 act** |
| Requirement | Team exists; roster ≥ 2; team renown ≥ 5 **or** ≥1 realm win this life |
| Field | 8 teams (player + 7 AI); AI power `30 + cage*0.5 + rand(0,20)` × realm |

### Place payouts (grand)
| Place | Gold | Team renown | Affinity XP | Recruit hook |
|-------|------|-------------|-------------|--------------|
| 1st | 120 | +12 | +8 | 40% |
| 2nd | 70 | +7 | +5 | 20% |
| 3rd | 40 | +4 | +3 | 10% |
| 4–8 | 10 | +1 | +1 | 0% |

## Affinity growth (summary)
| Source | Player affinity skill XP |
|--------|--------------------------|
| Realm place 1/2/3 | +3 / +2 / +1 |
| Grand place 1/2/3/else | +8 / +5 / +3 / +1 |
| Practice drill (optional Work action) | +1, cost 1 act, once/year, requires team |

No passive yearly affinity drain.

## Soft caps
- Team renown soft cap **100** (gains ×0.5 above 80).
- Max affinity XP from tournaments in one year: **12** (remainder discarded).

## Explicitly not
- Franchise / stadium / merch / sports leagues.
- Multi-affinity teams.
- Betting UI in v1.
