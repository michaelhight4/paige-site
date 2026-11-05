> **Game Dev · Nov 5, 2026** — Gary lock: cross **team ↔ guild** bonuses **ON for v1**. Modest edges only. Renown tiers **0 / 25 / 50 / 75**; **renowned ≥ 50**.

# Cross bonuses — tournament teams ↔ adventure guild halls

Applies when the player **owns both** a tournament team and a guild hall in the same life. Bonuses are **small**; they must not outpace pure fee/renown loops.

## Shared renown read
| Label | Threshold |
|-------|-----------|
| Local | 0–24 |
| Known | 25–49 |
| **Renowned** | **≥ 50** (50–74) |
| Famed | 75–100 |

Use **team.renown** and **guild.renown** separately; “renowned” checks that track’s own renown unless noted.

---

## Guild → Team (meet edge)

When entering a **realm meet** or **grand Teams** bracket:

| Condition | Effect |
|-----------|--------|
| Guild renown ≥ 25 | Team power **+2** |
| Guild renown ≥ 50 (renowned) | Team power **+4** (replaces +2, not stacks) |
| Guild renown ≥ 75 | Team power **+5**; realm entry gold **−2** (min 5) |
| Hall in same `realmId` as the meet | Extra team power **+1** |

Cap total guild→team power from this table at **+6**.

## Team → Guild (hire / jobs edge)

At year Advance / hire time:

| Condition | Effect |
|-----------|--------|
| Team renown ≥ 25 | Hire cost **−5%** (floor 1g) |
| Team renown ≥ 50 (renowned) | Hire cost **−10%**; job successChance **+0.02** |
| Team renown ≥ 75 | Hire cost **−12%**; job successChance **+0.03**; **+1** board job soft-cap once/year |
| Team has ≥ 1 grand place (top 3) this life | One free **tier-0 or tier-1** recruit re-roll per year (flavor: Meet-blooded hire) |

SuccessChance bonuses **cap at +0.03** from team; still clamped by guild formula max 0.92.

## Both renowned (≥50 each)
- Once per year: **+1 team renown** and **+1 guild renown** after any successful realm meet **or** any successful guild job batch (whichever comes first that year).  
- UI toast: “Twin banners” (Text Bot may rename).

## Explicitly not (v1)
- Shared gold vault auto-transfer.
- Merging rosters (adventurers ≠ tournament roster).
- Stacking unlimited power from dual ownership.
- Cross-life carry of these buffs (Echoes/heir may keep *names* only; renown resets per existing legacy rules).

## Wire hooks (Coder)
- `bw.team` + `bw.guild` both non-null → enable.
- Apply guild→team in meet resolve before `teamPower`.
- Apply team→guild in hire price + job success + board soft-cap.
