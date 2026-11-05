> **Game Dev · Nov 5, 2026 · for Coder implement today**  
> Expands Gary’s lock in `TOURNAMENT_TEAMS_AND_GUILDS.md`. Original Boundwake names only.

# Adventure guild halls — numbers & rules

## State shape (suggested `bw.guild`)
```js
{
  realmId: string,          // hall location realm
  foundedYear: number,
  renown: number,           // 0–100 soft
  coffer: number,           // gold held at hall
  feeTier: 0|1|2,           // Low/Mid/High
  roster: [{ id, name, tier, power, wagePaid }], // 1–6
  jobsDone: number,
  jobsFailed: number
}
```
**v1:** one hall total per life.

## Unlock & build / buy
| Realm id | Display | Buy/build cost (gold) | Act cost | Notes |
|----------|---------|----------------------|----------|-------|
| `hearthfold` | Hearthfold Vale | **150** | 1 | Starter; unlock `cage` ≥ 18 |
| `glassmarket` | Glassmarket | **220** | 1 | Need renown ≥ 10 **or** bartering 25 |
| `thornreed` | Thornreed Marches | **180** | 1 | Riskier jobs (+10% fail, +15% payout) |
| `spireward` | Spireward | **260** | 1 | Need renown ≥ 25 **or** etiquette 30 |
| `emberlight` | Emberlight Frontier | **300** | 1 | Need renown ≥ 40; best job table |

Unlock gate (all realms): `cage` ≥ **18**, and either pay table cost **or** convert a owned workshop slot tagged `hall` (if that exists — else gold path only).

Relocate hall: pay new realm cost × **0.6**, keep renown, lose 1 roster slot of player’s choice (quitters).

## Fee tiers (per adventurer per year)
Paid at year-start (or when hired mid-year, pro-rate 50% if hired after mid-year).

| Tier | `feeTier` | Gold / adventurer / year | Jobs that adventurer may take / year |
|------|-----------|---------------------------|--------------------------------------|
| Low | 0 | **20** | **1** |
| Mid | 1 | **50** | **2** |
| High | 2 | **100** | **3** |

Fee may come from `coffer` first, then purse. If unpaid, that adventurer takes **0** jobs that year and has **25%** chance to leave.

## Jobs / year formula
```
feeBonus     = feeTier                    // 0,1,2
renownBonus  = floor(renown / 25)         // 0..4
rawSlots     = rosterSize * (1 + feeTier) // each member’s personal cap from table above
             // equivalent: sum over roster of jobsAllowed(feeTier)
boardJobs    = min(rawSlots, rosterSize * (1 + feeTier), 1 + feeBonus + renownBonus + rosterSize)
```
**Implement simply:**
```
jobsThisYear = min(
  sum(jobsAllowed per member),
  rosterSize + feeTier * rosterSize,      // same as sum of per-member caps
  3 + feeTier * 2 + floor(renown / 20)     // board availability soft cap
)
```
Draft board soft cap examples: Low+0 renown ≈ few jobs; High+75 renown ≈ busy board.

Each resolved job consumes 1 slot; resolve at **year Advance** (batch) or one-by-one in Adventure UI (Coder pick; draft: **batch on Advance** with a results sheet).

## Job payout & success
```
tierMult     = 1 + renown/100
basePayout   = randInt(15, 60) * tierMult * realmJobMult
successChance = clamp(0.45 + power/200 + feeTier*0.05 + renown/200, 0.25, 0.92)
// Thornreed: successChance -= 0.05; basePayout *= 1.15
// Emberlight: basePayout *= 1.25
```
On success: `coffer += floor(basePayout)`; renown `+ randInt(1,4)`.  
On failure: renown `−1` (not below 0); 10% chance injured hire (unavailable 1 year).

**Net year** ≈ sum(payouts) − sum(fees). Low fee + low renown can lose gold — intentional.

## Renown curve
| Renown | Hire pool tier | Job quality | UI label |
|--------|----------------|-------------|----------|
| 0–24 | 0 | Copper | Local hall |
| 25–49 | 1 | Iron | Known hall |
| 50–74 | 2 | Silver | Renowned hall |
| 75–100 | 3 | Gold | Famed hall |

Soft cap: gains ×0.5 above 80; hard display cap 100.

## Adventurer hire costs & quality
| Hire pool tier | Hire cost | Power range | Example titles (Text Bot may rename) |
|----------------|-----------|-------------|--------------------------------------|
| 0 | 30 | 15–35 | Runner, Blade-hand |
| 1 | 55 | 30–50 | Pathfinder, Ward |
| 2 | 90 | 45–70 | Vault-seeker, Hexblade |
| 3 | 140 | 60–90 | Realmward, Ashwalker |

- Max roster **6**.
- Fire: free; rehire same id blocked 2 years.
- Power drifts +1 / 5 successful jobs (cap 95).

## Realm job multipliers
| Realm | `realmJobMult` |
|-------|----------------|
| hearthfold | 1.00 |
| glassmarket | 1.10 |
| thornreed | 1.15 (and −5% success) |
| spireward | 1.20 |
| emberlight | 1.25 |

## Yearly loop (summary)
1. Collect / pay fees (tier × roster).
2. Roll `jobsThisYear` assignments (power-weighted).
3. Resolve success/fail → coffer + renown.
4. Optional: withdraw coffer to purse (1 act) or deposit.

## Explicitly not
- Lifeline studio / prodco / franchise.
- Player personally adventuring inside guild job resolve (they already have Adventure).
- Tobacco / drugs / alcohol job flavor.
