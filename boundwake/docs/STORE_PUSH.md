# Boundwake store push plan

Prepared Nov 5, 2026 ~6:49 PM CT (America/Chicago). Live web: https://paigegames.net/boundwake/ (alpha).
Source: `/workspace/boundwake` · Deploy: `/workspace/paige-site-pages/boundwake` · Cap: `/workspace/boundwake_cap`

**Never overwrite Lifeline** (`com.pagegames.lifeline`, ASC `6831020656`, repo `michaelhight4/lifeline-ios`).

## Inventory (what already exists)

| Item | Status |
|------|--------|
| Boundwake Cap / android / ios before this prep | **None** |
| `/workspace/boundwake_cap` | **Created lean** (~76MB): www + android + ios + npm deps; **no** full SDK / no AdMob. Pushed private repo **`michaelhight4/boundwake-ios`**. |
| Bundle / package ID | **`com.pagegames.boundwake`** (Lifeline = `com.pagegames.lifeline`; Kilumen = `net.paigegames.kilumen`) |
| ASC Boundwake app | **Bundle ID registered** (`com.pagegames.boundwake`, resource `7ZMAN2Y59A`). **App record CREATE forbidden** for API key role — Gary must create app in ASC UI. |
| Play Console Boundwake | **Not created** |
| itch.io page / butler | **Zip ready; butler not installed / not logged in** |
| Codemagic | Personal free tier (500 Mac M2 min/mo); reuse ASC key name `kilumen_asc` |
| Lifeline iOS template | `github.com/michaelhight4/lifeline-ios` + Codemagic + ASC 6831020656 |
| Releases stash | `/workspace/releases/boundwake/{site,art,itch}` + `/workspace/releases/mobile/boundwake/` |

## Recommended order

1. **itch.io HTML5** (fastest, no Apple/Google review)
2. **TestFlight** (Codemagic → ASC)
3. **Play Console** closed testing (AAB from Cap Android / Codemagic later)

---

## 1. itch.io (HTML5) — READY TO UPLOAD after Gary login

**Zip:** `/workspace/releases/boundwake/itch/boundwake-itch-20261105-legacyacc2.zip` (~13 MB)
**Listing draft:** `/workspace/releases/boundwake/itch/LISTING.md` (+ README inside zip)

Excludes: `tests/`, `music_src/`, `node_modules/`, `quality_sample/`, `*/_raw/`, card source JPG.

### Gary must
1. Confirm itch account / create game page **Boundwake**.
2. Either:
   - Browser: Upload Files → this zip → Launch as HTML → `index.html`, **or**
   - CLI: install [butler](https://itch.io/docs/butler/), then on this box:
     ```bash
     butler login
     butler push /workspace/releases/boundwake/itch/boundwake-itch-20261105-legacyacc2.zip \
       <itch-user>/boundwake:html5 --userversion 0.1.0-alpha
     ```
3. Cover 630×500 + screenshots; confirm 16+ content warnings; go-ahead to make **public**.

**Stop before public publish** until Gary confirms listing art + visibility.

---

## 2. iOS (Capacitor + Codemagic → TestFlight)

### Recipe
Mirror Lifeline: static `www/` + `npx cap sync ios` on Codemagic Mac M2. Project already scaffolded at `/workspace/boundwake_cap` (do **not** copy Lifeline tree).

### Exact next commands (Coder / Gary)

```bash
# Refresh www after Boundwake web changes
python3 /workspace/boundwake/tools/sync_cap_www.py
cd /workspace/boundwake_cap && npx cap sync

# Create private GitHub repo (gh already auth'd as michaelhight4)
cd /workspace/boundwake_cap
git init
git add package.json package-lock.json capacitor.config.json codemagic.yaml \
  CODEMAGIC_SETUP.md README.md .gitignore android ios www
# Prefer: omit copying node_modules (gitignore). Commit + create repo:
gh repo create michaelhight4/boundwake-ios --private --source=. --remote=origin --push
```

Then Codemagic:
1. Add app → `boundwake-ios` → Ionic/Capacitor.
2. Reuse integration **`kilumen_asc`**.
3. Create ASC app **Boundwake**, bundle `com.pagegames.boundwake`, SKU `boundwake`.
4. Create profile **`boundwake_appstore`**.
5. Put numeric ASC Apple ID into `codemagic.yaml` → `APP_STORE_APP_ID`.
6. Start workflow **Boundwake iOS App Store** (TestFlight upload on; App Store submit off).

### Gary must (Apple)
- Approve / complete ASC app create if API blocked.
- Age rating questionnaire, privacy URL (reuse https://michaelhight4.github.io/paige-site/play/privacy.html or Boundwake-specific), screenshots, icon.
- TestFlight export compliance (plist already `ITSAppUsesNonExemptEncryption=false`).
- Explicit go-ahead before **App Store** public submit.

---

## 3. Android (Cap + Play Console)

### Local / CI
```bash
python3 /workspace/boundwake/tools/sync_cap_www.py
cd /workspace/boundwake_cap
npm ci
npx cap sync android
# Build AAB needs Android SDK + upload keystore (Lifeline/Kilumen keys are SEPARATE — create Boundwake keystore or ask Gary which to reuse carefully)
```

Package: **`com.pagegames.boundwake`** · versionCode `1` · versionName `0.1.0`.

Prefer Codemagic Android workflow later (or Gary builds on PC). **Do not** copy `/workspace/lifeline_android` or `/workspace/kilumen_android` trees (disk).

### Gary must (Play)
1. Play Console → Create app **Boundwake** under Paige Industries / Paige Games.
2. Closed testing track + tester list (can mirror Lifeline list).
3. Store listing: short/full description, icon 512, feature graphic, phone screenshots, content rating (IARC — draft similar to Lifeline but **no** casino/gambling unless Boundwake adds it; fantasy violence / alcohol / mild romance).
4. Privacy policy URL.
5. Upload AAB when signed artifact ready; **public production** needs explicit go-ahead.

Upload keystore: create new `boundwake-upload.jks` (do not reuse Lifeline keystore casually — different package OK but cleaner separate). Gary confirms.

---

## Blockers needing Gary

| Blocker | Why |
|---------|-----|
| itch account + butler login / browser upload | No butler on box; cannot publish |
| ASC app create in **App Store Connect UI** | API key can GET/UPDATE apps only (403 CREATE). Bundle ID already registered. Then rating, screenshots, privacy |
| Codemagic app link + first build minutes | Free tier OK; needs repo push + profile |
| Play Console app create + listing art | Browser / Gary account |
| Icons / splash / itch cover | Still Capacitor defaults on mobile |
| Age rating answers | Confirm Boundwake questionnaire (16+) |
| Public / paid submit go-ahead | Prep authorized; public store submit needs listing details OK |

## Pointers

- Cap setup detail: `/workspace/boundwake_cap/CODEMAGIC_SETUP.md`
- itch listing: `/workspace/releases/boundwake/itch/LISTING.md`
- Releases overview: `/workspace/releases/README.md`
- Mobile stub: `/workspace/releases/mobile/boundwake/README.md`


---

## Ads + gamepasses scaffolding (Nov 5 ~7:40 PM CT)

Prep only — **do not** create ASC/Play products or upload builds until Gary clicks through consoles.

### Code (live web OK for catalog UI)
- Catalog: `data_fantasy/premium.json`, `data_fantasy/ads.json`
- Modules: `src/premium.js`, `premium_fx.js`, `ads.js`, `adapter_ads.js`, `payments.js`, `native_bridge.js`
- UI: Passes tab + Autopilot gate + No Ads suppresses forced ads
- Docs: `docs/PASS_MAP.md`, `docs/ITCH_DLC.md`

### Stub vs live
| Piece | Status |
|-------|--------|
| Pass catalog + Passes UI rows | **Live** (web alpha) |
| Autopilot gate | **Live** (web still free via alpha.webFreePasses) |
| No Ads → suppress forced ads | **Live** policy; forced ads only android/ios platform flag |
| Web placeholder ads adapter | **Live** stub (web platform has forced:false) |
| AdMob Cap plug points | **Stub** (`native_bridge.js` TODOs) |
| Play Billing / Apple IAP | **Stub** (`payments.js` TODOs) |
| itch DLC entitlement check | **Stub** + plan doc |
| Stripe-on-itch | **Never** (Gary lock) |
| Website Stripe store | **Not this pass** (approval separate) |

### Gary console checklist (create products — do not ask Coder to invent live IDs)

**Play Console** (app Boundwake / `com.pagegames.boundwake` — create app first if missing):
1. One-time products ($5.99) with **exact** ids: `archsage`, `dragonhoard`, `heralds_favor`, `banner_champion`, `keep_keys`, `banner_lord`, `shadowcloak`, `eternal_bloom`, `kinblessed`, `tollbreaker`, `no_ads`, `fateweaver`, `autopilot`
2. `tester_pack` at $9.99
3. Subscription `all_access` with base plans `monthly` ($7.99) and `yearly` ($79.99)
4. AdMob Android app + rewarded + interstitial unit ids → put in Cap native config (not web)

**App Store Connect** (create Boundwake app record in UI — API key cannot CREATE):
1. Non-consumable IAPs — confirm Apple product ids (can mirror Play ids or use `boundwake.*`; update `appleProductId` in premium.json after create)
2. Auto-renewable sub Realm Pass / `all_access`
3. AdMob iOS app + unit ids

**itch.io**
1. Boundwake HTML5 page
2. One DLC per pass (skus in `docs/ITCH_DLC.md`)
3. Pick entitlement Option A/B; API key to vault when ready

**After Gary creates products:** tell Coder the exact ids + AdMob unit ids so stubs can be wired — still no public store submit without go-ahead.
