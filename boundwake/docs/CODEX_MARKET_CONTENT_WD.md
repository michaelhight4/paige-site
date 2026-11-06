# Boundwake — Codex deepening + Yearly Market flavor (WD)

> **Game Dev · Nov 5, 2026 ~6:00 PM CT (America/Chicago)** — DATA/DOCS only. Sibling to `docs/LEGACY_CONTENT_WD.md`. Coder owns src/hotfixes. Lifeline untouched. No Page / messaging / git / deploy.

## Integration handoff (Coder)

| Item | Value |
|------|-------|
| **This doc** | `docs/CODEX_MARKET_CONTENT_WD.md` |
| **Related** | `docs/LEGACY_CONTENT_WD.md`, `docs/legacy_proposal_wd.json`, live `data_fantasy/market.json` (36 goods), `docs/YEARLY_MARKET.md`, `docs/MARKET_WIRED.md` |
| **Codex live today** | Filters: **All / Events / Places / Realms** + ??? locked rows + completion ratios (`ui.js` codex tab). Entries = event ids + location ids + realm ids in `s.codex` / `meta.codex` |
| **Market live today** | Mechanics wired; **no** yearly herald/notice flavor strings in `market.json` |
| **This proposal** | Codex **category deepening** (subcats + hooks) · **optional** small Yearly Market **flavor-only** notice pack |
| **New counters** | Listed below; mark `wire: new` — not pretend-implemented |
| **Priority** | P1 Codex subcats for Places/Realms/Skills/Guilds already backed by ids · P2 Gear/Law/Legacy shelves · P3 Market herald strings (flavor only) |

### Actual dependencies

- Discover: `discover(s, id)` pushes to `s.codex`; death merges to `meta.codex`.
- Places: `regions.json` location ids (45 sites across 5 realms).
- Realms: `hearthfold`, `glassmarket`, `thornreed`, `spireward`, `emberlight`.
- Events: pack events (`events` + expansion + passion) — titles only when unlocked.
- Skills: `skills.json` (29 playable skills + circles metadata).
- Gear: `gear.json` item ids (`gear_*`).
- Workshops: `workshops.json` types (`herb_stall` … `relic_desk`).
- Team/guild: `s.team` / `s.guild` + Codex history on disband (wins kept).
- Law: `law.json` crime ids.
- Passions: `passions.json` track ids.
- Affinities/routes: `s.route`, sword styles, elemental affinities as used by engine (do not invent unshipped systems).

### Proposed new counters (Codex / Market flavor)

| Counter | Purpose | wire |
|---------|---------|------|
| `meta.codexMeta.skillsSeen` | skill ids trained ≥1 once | new (or derive from save skills history) |
| `meta.codexMeta.gearSeen` | gear ids ever owned | new |
| `meta.codexMeta.crimesSeen` | crime ids attempted/known | new |
| `meta.codexMeta.workshopsSeen` | workshop type ids opened | new |
| `meta.codexMeta.passionsSeen` | passion ids taken/mastered | new |
| `s.market.heraldId` / year cache | which flavor notice shown this year | new (UI-only) |

---

## Codex — inspect gaps → deepen

### Live gaps (as of STATUS f56882ee)

1. **Only 3 content shelves** (Events / Places / Realms). Skills, gear, crafts, law, teams/guilds, passions, and legacy echoes are not browsable as Codex categories.
2. **All tab** lists raw discovered ids with weak subtitles (no realm/skill grouping).
3. **Spoiler surface:** Events filter correctly uses ???; All tab hides locked (good). Places/Realms show locked rows with realm name hints — OK if spoiler boundary respected (realm name on locked place is mild spoiler; prefer `??? · locked` without leaking unvisited realm feel-text).
4. **No discovery hooks** documented for guild halls / team banners beyond incidental `discover` on visit.
5. **Empty states** are one line; no per-shelf empty copy.

### Recommended menu categories (compact)

| Filter id | Label | Ratio counts | Locked label | Empty label |
|-----------|-------|--------------|--------------|-------------|
| `all` | All | discovered / catalog union | (hidden in All — keep live behavior) | `Nothing recorded yet.` |
| `events` | Events | known events / pack events | `???` · `Undiscovered event` | `No events recorded.` |
| `places` | Places | known locs / all locs | `???` · `{realm} · locked` **or** softer `??? · locked path` | `No places walked yet.` |
| `realms` | Realms | known realms / 5 | `???` · `Undiscovered realm` | `Only home dust so far.` |
| `skills` | Skills | seen skills / 29 | `???` · `Unpracticed` | `No skills inked.` |
| `craft` | Craft & stalls | workshops+market cats seen / types | `???` · `Unopened stall` | `No stalls recorded.` |
| `bonds` | Banners & halls | team/guild history entries | `???` · `No banner yet` | `No lists or halls remembered.` |
| `gear` | Gear | gear seen / gear items | `???` · `Unseen kit` | `Pack empty in memory.` |
| `law` | Law | crimes known / menu crimes | `???` · `Untried statute` | `No marks on the ledger.` |
| `legacy` | Echoes | cemetery + claimed ach titles (non-spoiler) | n/a list of known echoes | `No echoes yet.` |

**Ship order:** keep live four filters; add **Skills**, **Banners & halls**, **Craft & stalls** next (highest player value, real ids); Gear/Law/Echoes after counters exist.

Do **not** invent Codex pages for unshipped features (no auction house, no sports franchise shelf, no alcohol reagent codex).

### Subcategories linked to existing IDs

#### Places → by realm (existing location ids)

- **Hearthfold Vale** `hearthfold`: `hf_greenwell`, `hf_willowpond`, `hf_market_row`, `hf_stonebridge`, `hf_hearthstatue`, `hf_primer_yard`, `hf_cottage_lane`, `hf_watchpost`, `hf_mossbeam_hall`, `hf_ribbon_green`
- **Glassmarket Coast** `glassmarket`: `gm_lantern_quay`, `gm_mirror_stalls`, `gm_tide_pond`, `gm_envoy_statue`, `gm_caravan_yard`, `gm_ledger_hall`, `gm_coast_clinic`, `gm_tidebell_hall`, `gm_pier_ring`
- **Thornreed Wilds** `thornreed`: `tr_reedpath`, `tr_standing_ring`, `tr_forage_camp`, `tr_mirrorpond`, `tr_wayshrine`, `tr_ruin_gate`, `tr_reedlodge_hall`, `tr_stakeline_meet`
- **Spireward Heights** `spireward`: `sw_collegium`, `sw_statue_garden`, `sw_inkpond`, `sw_scribe_stalls`, `sw_dueling_lawn`, `sw_archive_steps`, `sw_quillkey_hall`, `sw_crest_terrace`, `sw_grand_tiers`
- **Emberlight Marches** `emberlight`: `em_forge_plaza`, `em_drill_hall`, `em_watch_fort`, `em_ash_park`, `em_ember_pond`, `em_hero_statue`, `em_deep_vault`, `em_cinderhorn_hall`, `em_sparkfield_arena`

Unlock hook: Visit / travel already calls `discover(s, loc.id)`. Realm id discover on travel.

#### Skills → by `skills.json` categories

- physical: `strength`, `endurance`, `agility`
- martial: `swordsmanship`, `archery`, `shieldwork`, `unarmed`
- arcane: `spellcraft`, `mana_control`, `elementalism`, `mending`, `warding` (gate display behind mana awakening spoiler: show shelf but lock rows until `mana_awakened` **or** skill>0)
- craft: `smithing`, `alchemy`, `enchanting`, `cooking`, `tailoring`
- social: `charm`, `bartering`, `performance`, `etiquette`
- wild: `stealth`, `tracking`, `husbandry`, `foraging`
- mental: `literacy`, `lore`, `focus`, `composure`

Unlock hook (**proposed**): first time `useSkill` raises a skill from 0→>0, `discover(s, 'sk_'+id)` **or** store in `codexMeta.skillsSeen`. Prefer prefix `sk_` to avoid colliding with event ids.

#### Craft & stalls

- Workshop types: `herb_stall`, `bakery`, `inn_kitchen`, `smithy`, `loom_shed`, `apothecary`, `scribe_desk`, `stable`, `fisher_shed`, `chandlery`, `guard_contract`, `troupe`, `orchard`, `mill_share`, `glass_booth`, `relic_desk`
- Market categories (not items): `staple`, `cloth`, `metal`, `reagent`, `provision`, `curio`

Unlock: on workshop open / first market checkout of a cat. Prefix `ws_`, `mcat_`.

*Note:* `troupe` workshop id still exists in data — Codex may list it as Traveling Troupe stall; do **not** reframe as modern franchise. Tournament team banners use separate Bonds shelf.

#### Banners & halls (team / guild)

Use real venue / ownership ids where possible:

| Entry id (proposed) | Title when open | Unlock hook |
|---------------------|-----------------|-------------|
| `team_banner` | `{team.name}` affinity `{skill}` | `foundTeam` |
| `team_win_realm` | Realm-list placement | first `team.wins.realm` |
| `team_win_grand` | Grand Teams placement | first `team.wins.grand` |
| `guild_hall_{realm}` | Hall in realm (Mossbeam / Tidebell / Reedlodge / Quillkey / Cinderhorn) | `foundGuild` in that realm |
| `guild_jobs_mark` | Contract chalk | `jobsDone >= 1` |

Spoiler: locked rows = `??? · No banner yet` — do not show rival team names.

#### Gear

Link `gear.json` ids (`gear_ash_staff` … mounts/homes/trinkets). Unlock when purchased/looted into `gear.owned`. Spoiler: slot only (`Weapon · locked`) without leaking unique names.

#### Law

Menu crimes from `law.json` (e.g. `pilfer_stall`, `cutpurse`, `break_cottage`, …). Unlock on attempt (success or caught). Spoiler: `??? · Untried statute`. No how-to text in Codex — title + one-line outcome memory only.

#### Legacy / Echoes

Cemetery rows + claimed achievement titles (already non-spoiler). Not a second Legacy tab — a read-only shelf pointing players to Legacy hub for claims.

### Spoiler boundaries

| Shelf | Show when locked | Never show when locked |
|-------|------------------|------------------------|
| Events | `???` | title, prompt, rewards |
| Places | `???` + realm name **only if realm discovered** | flavor paragraph, kind |
| Realms | `???` | `feel` blurb |
| Skills | `???` + category name OK | numeric tips / style unlocks |
| Arcane skills | hide entire arcane group until mana awakened **or** show locked with `Needs awakening` | circle names beyond circle_1 |
| Team/Guild | `???` | NPC roster names, fee numbers |
| Law | `???` | catch rates, loot ranges |
| Gear | slot label only | price, bonuses |

### Discovery / unlock hooks (summary)

1. Visit location → place + (if new) realm.
2. Resolve event → event id (live).
3. Train skill 0→1 → skill codex id (**new**).
4. Open workshop → `ws_*` (**new**).
5. Found team/guild / first win/job → banner entries (**new**).
6. Own gear → `gear_*` (**new**).
7. Attempt crime → crime id (**new**).
8. Take/master passion → `passion_*` (**new**, can live under Skills subcat).

---

## Yearly Market — flavor only (gaps exist)

### Gap check

- `market.json`: 36 goods, mark bands, barter math — **mechanics complete**.
- **Missing:** yearly crier / slate lines that make realms feel different when the Market panel opens.
- Notices boards (`notices.json`) are a **different** system (player posts). Do not overload them.
- Proposal: **flavor-only** `herald` strings. No price change, no stock change, unless Coder later opts into a mechanic (default **off**).

### Proposed data shape (add under market.json later — or sibling `market_heralds_wd.json`)

```json
{
  "heralds": [
    {
      "id": "her_hf_glut_grain",
      "realm": "hearthfold",
      "when": { "markBand": "glut", "itemCat": "staple" },
      "text": "Greenwell criers say Vale Grain Sacks are spilling off carts — bakers argue over who saw the glut first."
    }
  ]
}
```

`when` is a soft matcher for UI copy pick (seeded with year+realm). If no match, pick realm-generic.

### Small useful collection (16 original strings)

All original; no alcohol/drugs/tobacco; no modern sports/franchise/cottage-suburb voice. Keyed to real realms / goods / bands.

1. `her_hf_soft_honey` · hearthfold · soft · provision · “Market Row chalk reads soft on Hearthfold Honey Jars — wasps louder than brokers this winter.”
2. `her_hf_fair_reed` · hearthfold · fair · staple · “Pond Reed Baskets price fair by the willow shade; anglers trade gossip louder than coin.”
3. `her_hf_dear_wool` · hearthfold · dear · cloth · “Vale Loom Wool climbs dear after a wet shear; Cottage Lane fences wear fewer colors.”
4. `her_gm_glut_glass` · glassmarket · glut · curio · “Mirrorglass Stalls claim a glut of bright trays — Lantern Quay musicians quarrel over reflections.”
5. `her_gm_firm_dye` · glassmarket · firm · cloth · “Imported dyes sit firm on the quay boards; Ledger Hall clerks sharpen their quills.”
6. `her_gm_dear_scale` · glassmarket · dear · metal · “Envoy of Scales watches a dear mark on coast metal; oaths cost more than pans today.”
7. `her_tr_soft_forage` · thornreed · soft · reagent · “Foragers’ Camp lists soft marks on reed reagents; Standing Stone Ring stays quiet about why.”
8. `her_tr_fair_bowstave` · thornreed · fair · staple · “Reedpath packs carry fair-priced staves; Ashen Gate porters want tea, not stories.”
9. `her_tr_dear_mirror` · thornreed · dear · curio · “Black Mirror Pond finds keep a dear curio price — Wayshrine ribbons look thin.”
10. `her_sw_glut_ink` · spireward · glut · reagent · “Scribe Stalls drown in ink glut; Archive Steps smell like wet paper and ambition.”
11. `her_sw_firm_quill` · spireward · firm · curio · “Collegium runners say quill-kits are firm; Crest Terrace bets on who fails the first exam.”
12. `her_sw_fair_ward` · spireward · fair · reagent · “Fair ward-chalk on the dueling lawn board — tutors pretend not to notice.”
13. `her_em_firm_ore` · emberlight · firm · metal · “Forge Plaza rings firm ore marks; Watch Fort apprentices count sparks, not sleep.”
14. `her_em_dear_ember` · emberlight · dear · reagent · “Dear ember-sand jars near Sparkfield; Hero Statue gets fresh soot polish anyway.”
15. `her_em_glut_ration` · emberlight · glut · provision · “Ash Park cooks cheer a provision glut; Cinderhorn Hall boards rewrite supper tallies.”
16. `her_any_year_turn` · (any) · — · — · “Year-turn stalls reshuffle under new chalk. Bartering tongues wake before the sun does.”

**Explicitly flavor-only** unless a later brief asks marks to bias toward matching bands (not proposed now).

### UI suggestion (Coder, when free)

Under Yearly Market header: one italic herald line for `yearKey+realmId`. Refresh with listings. No act cost.

---

## Out of scope / do not invent as implemented

- Auction house, bound-gold, autopilot market buys
- Sports/esports franchise codex
- Alcohol / drug / tobacco goods or heralds
- Lifeline studio/prodco mirrors
- New realms beyond the five
- Claiming that `echoBoost` / `scoutBonus` already alter adventure odds (stored; apply TBD)

## Validation notes

- Herald ids unique (`her_*`).
- All realm/location/workshop/skill ids above checked against `data_fantasy/` on Nov 5, 2026.
- No edits to live `market.json` from this task (avoid Coder collision); merge heralds when ready.
