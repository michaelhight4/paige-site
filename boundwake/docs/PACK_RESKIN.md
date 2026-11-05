# Boundwake pack reskin map (Lifeline → fantasy)

**Date:** Nov 5, 2026 (CT)  
**Source of truth:** `/workspace/lifesim/data/` (read-only; never modify)  
**Destination:** `/workspace/boundwake/data_fantasy/`  
**World voice:** Hearthfold Vale and sibling realms (Glassmarket, Thornreed, Spireward, Emberlight). Original prose. No Bit Tensie / Mushoku / SDS chrome. No tobacco, drugs, or alcohol.

## Mapping table

| Lifeline file | Boundwake file | Status | Notes |
|---|---|---|---|
| `events.json` (203) | `events.json` (~89) | **Wired** | Expanded toward LL category breadth (childhood/school/love/family/friend/health/money/oldage/crime/prison/fame/business/travel/random). Still short of 203; more prose pass later. |
| `diseases.json` | `ailments.json` | **Wired** | Fantasy fevers, plagues, physical, aging, spirit, arcane. Year tick + healer visit. |
| `crimes.json` | `law.json` | **Wired** | Realm crimes, stockade/stonehold/deepkeep tiers, commit/arrest/serve. |
| `passions.json` | `passions.json` | **Wired** | Song, blade forms, herb lore, market craft, ink, cooking, loom, shadow, forge, beast, wards, rally voice. |
| `passion_events.json` | `passion_events.json` | **Wired** | Merged into event pool at load (`if.passion`). |
| `businesses.json` | `workshops.json` | **Wired (lean)** | 16 stalls/workshops (herb, bakery, inn kitchen/tea, smithy, loom, apothecary, scribe, stable, fisher, chandlery, watch contract, troupe, orchard, mill, glass booth, relic desk). No bars/liquor. |
| `social.json` + `online.json` | `notices.json` | **Wired (lean)** | Notice boards & criers instead of social apps / streaming. Post + patronage hooks. |
| `politics.json` | `court.json` | **Wired (lean)** | Commons Voice → Lord Judge. File / campaign / hold office. |
| `coaching.json` | `mentors.json` | **Wired (lean)** | Sword/spell/craft/hunt mentor paths (not modern sports). |
| `scholarships.json` | `patronage.json` | **Wired (lean)** | Clubs + academy patronage grants. |
| `world_activities.json` | `world_activities.json` | **Wired** | Body, mind, social, travel, presence, coin — Life tab activities. |
| `world_legacy.json` | `world_legacy.json` | **Partial** | Estate tax / charities data loaded; death already has reincarnate/heir. Charity bequest UI later. |
| `life.json` | *(engine + `slice/terms.json`)* | Adapted | Labels/causes live in terms; dating/people rules in `bw_engine.js`. |
| `skills.json` | `skills.json` | Done earlier | Fantasy skill tree. |
| `slice/occupations.json` | `slice/occupations.json` | Done earlier | Fantasy + ordinary jobs. |
| `slice/assets.json` | `gear.json` | **Wired** | Belongings gear shop (buy/equip/sell). |
| `slice/terms.json` | `slice/terms.json` | Done earlier | |
| `studio_data.json` / `prodco.json` / `franchise.json` | `docs/TOURNAMENT_TEAMS_AND_GUILDS.md` | **Redesigned** | Gary Nov 5: tournament teams (skill affinity) + adventure guild halls (fee→jobs→renown). Not sports/studio. Not built yet. |
| `franchise.json` | — | **Superseded** | See tournament teams + guild halls doc (not sports). |
| `hardware.json` | — | **Skipped** | Consumer electronics N/A. |
| `ads.json` / `ad_choices.json` / `premium.json` | — | **Skipped** | No store/ads work. |
| `art_manifest.json` / `art_map.json` / `palettes.json` / `character_layers.json` / `ribbons.json` / `voice.json` | Boundwake assets / ambient / flare | Separate track | Art/UI workers; not this pack pass. |
| `text/` | event `src` fields | Ongoing | |

## Playable this pass (engine hooks)

- **Year loop:** ailment onset/tick/death risk; workshop yearly P&L; passion passive gain; prison year; notice fame drift; court term pay.
- **Life tab:** world activities; pastimes (adopt/practice); ailments list + Visit Healer; soft law list (commit).
- **Work tab:** buy/run workshops; file for court seats; mentor path enroll.
- **Belongings tab:** gold, relics, owned workshops, notice-board posts.
- **Events:** passion events + expanded life categories draw through existing sheet.

## Remains (next passes)

1. Grow `events.json` toward ~160–200 with more work/fame/school coverage.
2. Full workshop staff/equip upgrade UI (data is ready; UI is summary-level).
3. Court campaign questions UI (data ready; currently file→auto resolve).
4. Patronage application flow from academy age window.
5. `slice/assets.json` fantasy shop (gear/homes/mounts).
6. Troupe/production deep loop if desired beyond workshop type.
7. Legacy charity bequest on death screen.
8. Prison actions (behave / appeal / escape) surfaced in UI when incarcerated.

## Constraints honored

- Did not modify `/workspace/lifesim` or Lifeline saves.
- No public index / TestFlight / store work.
- Additive UI only; avoided colliding rewrites of desktop/music/bonds/PRG/realms work.
