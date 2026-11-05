# Boundwake — Tournament teams & adventure guilds

**Locked by Gary · Nov 5, 2026 ~3:18 PM CT**

Replaces the old “full troupe / sports franchise” leftover from Lifeline. Not modern sports. Not Bit Tensie IP.

## Tournament teams
- Player can **own a tournament team**.
- Team is built around an **affinity for one select skill** (e.g. swordsmanship, spellcraft, a craft skill).
- Compete in:
  1. **Smaller tournaments around the realm** (ongoing / Visit / notice meets).
  2. The **teams section of the every-3-years tournament** (alongside Blade / Spark / craft brackets already live).
- Rewards: gold, renown, skill-affinity growth, recruitment hooks (details TBD in implement pass).

## Adventure guild halls
- Player can **own a guild hall**.
- **Adventurers on roster complete jobs on the player’s behalf**.
- Player **pays them a fee**.
  - **Higher fee → better adventurers + more jobs done**.
- Successful jobs raise **guild renown**.
- Higher renown unlocks **stronger adventurers** and **better jobs** (positive loop).

## Explicitly not
- Owning sports / esports franchises.
- Lifeline `studio_data` / `prodco` / `franchise` ports.
- Copying any other game’s guild chrome or names.

## Status
Design locked. Engine/UI not built yet (pack map still listed “troupe deep loop” as remains — superseded by this doc).


## Balance sheets (Game Dev · Nov 5, 2026)
- Cross team↔guild bonuses (ON v1): [`CROSS_BONUSES.md`](./CROSS_BONUSES.md)

- Tournament numbers: [`TOURNAMENT_TEAMS_BALANCE.md`](./TOURNAMENT_TEAMS_BALANCE.md)
- Guild hall numbers: [`GUILD_HALLS_BALANCE.md`](./GUILD_HALLS_BALANCE.md)
These supersede the interim defaults below where they conflict.

Venues per realm (guild halls, meet venues, grand tournament site): see `docs/TOURNAMENT_GUILD_VENUES.md` (DRAFT).

## Interim balance (Coder defaults until Game Dev revises · Nov 5 ~3:20 PM CT)

### Tournament teams
- Unlock: calendar age `cage` ≥ 16, and skill affinity ≥ 20 in the chosen skill.
- Found cost: 80 gold + 1 act. Name + skill affinity (one of the 29 skills; recommend pillar or combat/craft).
- Roster: up to 4 members (player may enter as captain if skill matches affinity; else hire NPCs).
- Hire NPC: 25 gold; power ≈ affinity skill ±10.
- Small realm meets: when Visit a `tournament`/`arena`/`fair` location OR notice-board invite; entry 10 gold + 1 act; place 1/2/3 → 40/25/15 gold + 5/3/2 renown + slight affinity skill XP.
- Every 3 calendar years: Adventure shows **Teams** bracket beside Blade/Spark/craft; entry 20 gold + 1 act; bigger purses 120/70/40 + 12/7/4 renown.
- Disband: free; keeps historical wins in Codex.

### Adventure guild halls
- Unlock: cage ≥ 18, 150 gold, own/rent a hall slot in current realm (one hall total for v1).
- Adventurers: roster 1–6. Hire costs scale with renown tier.
- Fee slider (paid yearly from purse, or from hall coffer): Low 20 / Mid 50 / High 100 gold per adventurer-year.
- Jobs/year ≈ `1 + floor(feeTier) + floor(renown/25)` capped by roster size (each adventurer can take 1 job/year at Low, 2 at Mid, 3 at High).
- Job payout ≈ 15–60 gold × (1 + renown/100), minus fee; net can be negative on Low fee with weak renown.
- Renown: +1–4 per successful job; −1 on failure; soft cap 100 for v1.
- Higher renown unlocks better hire pools (tiers 0/25/50/75).

Wire into `bw_engine.js` + Adventure/Work/Belongings UI. Saves under `bw.*` state fields `team`, `guild`.
