> **Game Dev · Nov 5, 2026** — data + rules for Coder. Do **not** edit `src/` / `style.css` / `index.html` from this task (Coder owns those; autopilot + playtest fixes in flight). Lifeline untouched.

# Yearly Market — make Bartering matter

## Goal
Each **cage year** the Market lists buyable **trade goods** with a **% vs normal** mark. Higher **Bartering** softens cart buy prices and lifts sell payouts. Cart → checkout; sell from Market inventory. Marks re-roll yearly (seeded RNG).

Gear (weapons/armor/homes/mounts) stays on **Belongings → Gear shop** at fixed list / `sellRate 0.5`. Market is the **flip / trade** loop.

## Data
| File | Role |
|------|------|
| [`data_fantasy/market.json`](../data_fantasy/market.json) | Mark bands, barter constants, 36 goods, formulas |
| This doc | Wire contract + UX + examples |

## Unlock / cadence
- **minAge 10** (Stall Hand floor).
- **1 turn = 1 year**: regenerate listings when `Math.floor(cage(s))` changes (or on first Market open that year).
- Browse / checkout / sell: **0 act** (see `act` in JSON). Visit market/stall locations keep their existing crowd-work gold + bartering XP.

## Listings (seeded)
1. Build a pool: items with `minAge` OK; weight by realm (`home` 3 / other unlocked 1 / locked 0).
2. Pick `listingsPerYear` count (9–14).
3. For each pick: assign a **mark band** by weight → `markPct` uniform in `[pctMin, pctMax]`; `stock` in 1–6.
4. Seed from `runSeed + yearFloor + realmId` so the year is stable and realms differ.

### Mark bands (shown as **% vs normal**)
| Band | % range | Weight |
|------|---------|--------|
| Glut | −25…−12 | 1 |
| Soft | −11…−4 | 2 |
| Fair | −3…+3 | 3 |
| Firm | +4…+12 | 2 |
| Dear | +13…+28 | 1 |

UI shows `markPct` (e.g. `−8%`, `+15%`) **before** personal Bartering. Effective gold sits under it.

## Bartering formulas
Constants live in `market.json` → `barter` / `formulas`.

```
listPrice   = max(1, round(basePrice * (1 + markPct/100)))
buyDiscount = min(0.20, floor(bartering/10) * 0.02)      // 0% … 20% at 100
buyPrice    = max(1, floor(listPrice * (1 - buyDiscount)))

sellRate    = min(0.95, 0.55 + min(0.25, floor(bartering/10) * 0.025))
sellMarkPct = listing mark this year if listed in current realm, else 0
sellPayout  = max(1, floor(basePrice * (1 + sellMarkPct/100) * sellRate))
```

### Example (base 40g, mark +10%, Bartering 40)
- listPrice = 44; buyDiscount = 8%; **buyPrice = 40**
- sellRate = 0.55 + 0.10 = 0.65; if same mark still up: **sell ≈ 28** (vs ~22 at barter 0 / fair)

Bartering XP: +1.0 on checkout, +0.8 on sell; **cap +4.0 / year** from Market actions.

## Cart → checkout
State sketch:

```js
bw.market = {
  yearKey: 0,                 // Math.floor(cage)
  realmId: 'hearthfold',
  listings: [{ id, markPct, stock }],
  cart: [{ id, qty }],        // ≤ cartMaxLines; qty ≤ cartMaxQtyPerLine & stock
  inv: [{ id, qty }],         // held trade goods; ≤ inventoryMaxKinds kinds
  xpUsed: 0                   // Market barter XP spent this year
}
```

- Add to cart only from current listings; clamp qty to remaining stock.
- Checkout: sum `buyPrice * qty`; if gold OK, debit gold, move lines to `inv`, reduce listing stock, clear cart, grant checkout XP (capped).
- Sell: pick from `inv`; payout via formula; remove qty; grant sell XP (capped). Selling does **not** require the good to be listed (uses fair mark 0 if absent).

## Explicitly not (v1)
- Homes / mounts / equipped gear on Market (gear shop unchanged).
- Tobacco, drugs, alcohol.
- Bound-gold / auction-house fees (Riftward pattern — not Boundwake).
- Auto-buy on Advance / Autopilot (Autopilot may skip Market; player-driven).

## Pack load (Coder patch — do not apply from Game Dev while src is hot)
In `src/pack.js` OPTIONAL map, add:

```js
market: 'market.json',
```

Empty-safe like `gear`. Engine reads `D.market`.

## Wire hooks (Coder)
- UI: Belongings (or Adventure) **Yearly Market** panel — listings + cart + inventory sell.
- Regen on year change; keep `inv` across years.
- Merchant career already gates on Bartering — Market is the practice loop that makes those thresholds feel earned.
- Smoke: age 10+, open Market, cart 1 staple, checkout, sell next year; assert buy < list when bartering ≥ 10.

## Economy fit
- Goods **6–110g** vs Stall Hand **40**/yr → Trade Magnate **700**/yr.
- Modest marks (±28% cap) + barter caps so dual-realm flipping helps but does not mint infinite gold vs wages / hall fees.

## Shared packs
Trade-good ids/names are Boundwake-original; Dynasty Trader / Mercenary Guild may mirror later via fantasy_lifesim shared notes — not required for this ship.
