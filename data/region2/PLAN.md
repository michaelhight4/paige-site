# Region 2 plan + checkpoint (coder, Oct 23 2026; started 2:11 PM CT)

## Maps (all linked, no region gating; only story gates)
- route_east (6 trainers) -> aurelith (pass-through; arena gated by all_badges, unchanged) -> route_aurelith_saltmere (6 trainers)
  -> saltmere (Ron 2 outside office) -> saltmere_hall_int (h1 Lorna, h2 Ivo, h3 Sully, Master Nerys Bryde, water).
- saltmere_office_int (parcel -> Courier Bike + 3 Prime Crystals, src/systems/npc_gifts.js), station_int, home_saltmere_a (hobbyist).
- thornwood (from Fernwick, open; 5 trainers re-tuned; gate_thornwood_east opens on beat_master_saltmere = region 3).
- Story gates: gate_brookhollow_east (beat_master_fernwick, guard hands the Survey Parcel), gate_thornwood_east (Master 2), gate_aurelith_arena (all_badges).
- Shared interiors via $return: heal_brookhollow, shop_int, home_brookhollow_a, home_fernwick_c (Saltmere has no own clinic branch: blackout copay/respawn = Brookhollow branch; WD request).

## Story beats through Master 2
1. Beat Master 1 -> guard at Brookhollow east gives Survey Parcel (mq_saltmere_parcel s1). Thornwood camp quest (mq_thornwood_camp) opens too.
2. East road -> Aurelith -> Salt Road -> Saltmere (RITA area_new_saltmere).
3. Office clerk: parcel -> Courier Bike + office gift (has_bike; RITA quest_done Signed For).
4. Ron 2 (byStarter, counter-type). 5. Hall h1-h3 -> Master 2 (L20/21/23) -> RITA master_beaten_saltmere -> WIP notice (one time).

## Done (checkpoint)
- [x] Live data promotion: zones, teams, sign, office gift, station_int / home_saltmere_a / Thornwood NPCs.
- [x] Levels: no trainer creature below evo level; Thornwood fixed; trail axes rebuilt (no change); xpDivisor 7 / xpTrainerMult 1.5 kept.
- [x] Master 2 play-check (tools/region2/playcheck_master2.mjs, 20 seeds): nibbin 20/20, rillop 20/20, cindrip 11/20 (15/20 after grind to L27).
- [x] RT Benefits: region 2 via regionFlags (beat_master_fernwick), ID cap 6, Copay Coverage (wired heal.js), Crystal Grades (Fine Crystal stocked outside region 1 zones), Unit Training buyable (effect NOT wired), new nodes asset_logging_bonus + hall_hazard_pay, region 2 XP sources (Ron 2 70, Master 2 150, mq_saltmere_parcel / mq_thornwood_camp, Kilindex 20/25). Region 1 numbers unchanged (470/550).
- [x] RITA: maxRegion 2, Kilindex 25, quest aliases has_bike / camp_restored_thornwood; region 1 tests pinned to maxRegion 1.
- [x] WIP notice trigger beat_master_saltmere (test in tests/region2.test.mjs).

## Missing / deferred
- Region 2 cute creature set: 6 original cute creatures (not drawn now). Suggested habitats/elements: Salt Road dunes (sand/ground), Saltmere tide pools (water), salt pans (crystal/rock), Thornwood ferns (grass), Thornwood dusk (bug/fairy-like), Aurelith crystal lights (electric/light). Region 1 set designed separately (dev_notes/kilumen.md 'Later idea: cute creature set').
- NPC sprites missing (route_east + Salt Road trainers, aurelith, saltmere, hall, office, thornwood c/d/e): WD request.
- Saltmere own clinic interior/branch; hall sign post move.
- Text Bot keys (data/textbot_requests_region2.md); code uses fallbacks.
- Unit Training effect (creature XP boost) unwired: Gary question.
- RT UI copy for new nodes is fallback only.

## Checkpoint 2:33 PM CT
- [x] tests/region2.test.mjs (7 tests) added to npm test; full suite 469, 468 pass (known Ron failure only). run.py --check: 0 problems.
- [x] Shots: shots/region2_v1/ (8 + contact_sheet.png), page errors 0.
- [x] Requests: data/textbot_requests_region2.md (8), data/worlddesign_requests_region2.md (5).
