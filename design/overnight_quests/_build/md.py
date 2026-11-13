import json
d=json.load(open('../quests_draft.json')); Qs=d['quests']
main=[q for q in Qs if q['type']=='main']; side=[q for q in Qs if q['type']=='side']
o=[]
o.append("# Kilumen quests: DRAFT for Gary\n")
o.append("**Status: DRAFT. Not signed off, not wired into the game, nothing published or pushed.** Written overnight 2026-10-23 (CT). Data: `quests_draft.json` (format: `SCHEMA.md`). Side-quest source files `side_quests_draft.json` / `SIDE_QUESTS.md` are untouched; Gary's rulings are applied only in the merged copy (`quests_draft.json`).\n")
o.append("## Summary\n")
o.append(f"- **{len(main)} main quests + {len(side)} side quests = {len(Qs)}.** Main orders are 10, 20, ... 160 in play order. Side quests sort after their zone's main quest (main order + 1..9).")
o.append("- **Main story:** Brookhollow promotion -> Route 1 / Ron 1 -> coin 1 Fernwick -> the four camps (Thornwood, Greystone, Frostspire, Mirefen), each with one field-log page -> Saltmere parcel / bike -> Revival Heights (Ron's layoff letter, rail pass) -> Frostspire (Skylift, walls dim) -> Sunmeadow crossing -> Mirefen (notebook, Tideglide, storm) -> Tidewater -> Lanternport (Ron shares the last page; tide-lock; horn) -> Cindervale (eight coins) -> finale (Ron's last battle, then he comes with you; HQ restricted floors; the team is found; the bins) -> post-game: welcome back, then the Aurelith arena.")
o.append("- **The thread:** five log pages (Imke, Teo, Pell, Marta, Teo again) imply that something is off only with the team's own bonded creatures, and that they went to Head Office in person. Nothing says why. Vane's motive, the memo, the rebels and the crystal ending appear in notes only. The confrontation (finale step 6) is left as **PENDING STORY CALL**.")
o.append("- **Existing lines:** every quest line that reuses a shipped Text Bot line (overworld_lines.json v0.4.9) is word for word and tagged `existing` with its key. A script checked all of them against the file. Untagged lines are new and Text Bot owns the final wording.")
o.append("- **Gary's rulings 1-8 are applied in the merged copy.** Each changed side quest has a `MERGE (...)` note. Main/side overlaps: the main quest owns the Mirefen notebook, Ron's letter scene and 'Told you. Tomorrow.' sq_ask_nicely, sq_ron_job s4 and sq_bin_day s4 are now follow-ups.")
o.append("- **Checks run:** the JSON parses, ids are unique, step refs are valid, every text box is 20 words or fewer, and the banned-word / alcohol / smoke / fog / 'badge' grep is clean on titles, steps and lines. The only grep hit is the existing internal npc id `rebel_bartender` (an id, never shown to the player; see Lines for Text Bot #10).\n")
o.append("## Quests by zone (play order)\n")
zone_order=[]
for q in Qs:
    if q['zone'] not in zone_order: zone_order.append(q['zone'])
def fl(x): return ", ".join(f"`{f}`" for f in x) or "-"
for z in zone_order:
    o.append(f"### {z}\n")
    for q in [q for q in Qs if q['zone']==z]:
        tag="MAIN" if q['type']=='main' else "side"
        o.append(f"#### [{tag} {q['order']}] {q['title']} (`{q['id']}`)")
        o.append(f"- Giver: `{q['giver']['npc']}` @ `{q['giver']['map']}` | map: {q.get('map_status','')} | needs: {fl(q['prerequisites'])}")
        for s in q['steps']:
            extra=(f" -> sets `{s['sets_flag']}`" if s['sets_flag'] else "")+(f" (if `{s['condition']}`)" if s['condition'] else "")
            o.append(f"  {s['id'].rsplit('_',1)[1]}. {s['desc']} [`{s['map']}`]{extra}")
        r=q['reward']; items=", ".join(f"{i['id']} x{i['qty']}" for i in r['items']) or "-"
        o.append(f"- Reward: {items}; money {r['money']}; flags {fl(r['flags'])}")
        if q['type']=='main':
            for l in q['lines']:
                t=" / ".join(l['text']); ex=" *(existing)*" if l.get('existing') else ""
                o.append(f"  - **{l['npc']}** ({l['context']}): \"{t}\"{ex}")
            for n in q['notes']: o.append(f"  - _Note:_ {n}")
        else:
            mn=[n for n in q['notes'] if n.startswith('MERGE')]
            for n in mn: o.append(f"  - _{n}_")
        o.append("")
o.append("Company task quests and the Legendary Guardian quest are not main story, so they aren't drafted (see the notes in the design doc).\n")
# new ids
o.append("## New ids to add\n")
o.append("Proposals only. Coder/World/Text to confirm. The side-quest flags (`sq_*`) are listed per quest in `new_ids` in the JSON and aren't repeated here.\n")
o.append("**Main-quest flags:** `read_log_thornwood`, `read_log_greystone`, `read_log_frostspire`, `read_log_mirefen`, `read_log_lanternport`, `read_drift_log` (SOUL_PLAYBOOK name; set by the first page), `tally_marks_seen`, `mq_greystone_reported`, `ron_layoff_letter`, `has_field_notebook`, `reached_mirefen`, `reached_lanternport`, `tide_lock_open`, `lighthouse_horn_sounded`, `has_senior_lanyard`, `found_field_team`, `bins_taken_out`, `sq_bin_ron_quip`. Gate flags only if the blockers don't already set them: `gate_thornwood_east_cleared`, `gate_revival_checkpoint_open`, `gate_frostspire_bridge_open`.\n")
o.append("**Ron battle flags (GD draft names):** `beat_rival_ron_2`..`beat_rival_ron_6`. Only if Gary keeps the extra battles: `beat_rival_ron_mirefen`, `beat_rival_ron_tidewater`, `beat_rival_ron_cindervale`.\n")
o.append("**Existing flags this draft relies on but no code sets yet:** `truth_revealed` (finale step 6 placeholder), `ron_in_party` (set in mq_finale s3, cleared at finale_done), `field_team_home`, `finale_done`, `camp_restored_frostspire`, `camp_restored_mirefen`, `beat_aurelith_arena`, `has_rail_pass`, `has_skylift`, `has_tideglide`, `storm_season`.\n")
o.append("**Items (key, proposed):** `field_notebook` (now main), `rail_pass` (no Lumen Line Pass id exists), `senior_lanyard`. The side merge also uses `dana_team_card`, `ron_croft_apron` and `rehire_form`. There's still no coin item id; coins are flags (`beat_master_*`), and only art `master_coin` exists.\n")
o.append("**NPCs:** `lab_lead_varga`, `saltmere_office_clerk`, `hq_receptionist`, `station_clerk_central`, `ft_teo`, `ft_marta`, `ft_pell`, `ft_imke`, `master_saltmere` .. `master_cindervale` (GD ids), `brookhollow_kid_dad` (ruling 3), `lune_hartley` (ruling 5), plus the side npcs listed per quest. `arena_doorman` already exists.\n")
o.append("**Props / interact spots:** `prop:log_thornwood`, `prop:log_greystone`, `prop:tally_crystal` (greystone_b1 3,9), `prop:camp_frostspire`, `prop:log_frostspire`, `prop:camp_mirefen`, `prop:log_mirefen`, `prop:log_lanternport`.\n")
o.append("**Maps (pending):** saltmere, saltmere_office_int, saltmere_hall_int, route_brookhollow_aurelith, aurelith, aurelith_arena_int, route_thornwood_revival, revival_heights, revival_hq_int, **revival_hq_upper** (floors 9-12, finale), revival_hall_int, revival_station_int, route_greystone_frostspire, frostspire, frostspire_hall_int, sunmeadow_fields, route_sunmeadow_mirefen, mirefen_hall_int, route_brookhollow_tidewater, tidewater_coast, tidewater_hall_int, lanternport, lanternport_hall_int, route_aurelith_cindervale, cindervale, cindervale_hall_int, lab_brookhollow NPC placement, **brookhollow_kid_home** (ruling 3).\n")
o.append("**Names (proposed):** Lanternport Master **Delphine Orrin** (ruling 7; not Vane). Trader **Lune Hartley** (ruling 5). Ron's nickname for the player's lead: **Crumb** (ruling 2).\n")
# text bot
o.append("## Lines for Text Bot to align\n")
o.append("Text Bot's files were only read, never written. These are the alignments needed:\n")
o.append("1. **Biscuit -> Crumb (ruling 2).** `maps.house_1f.ron` line `ron_unnamed`: \"I'm calling it Biscuit. Don't fight me on this, {nick}.\" -> 'Crumb'. 'Biscuit' now belongs only to Prue Hollin's Tumbloam (lost flyer = T5 trade).")
o.append("2. **Mom -> Dad (ruling 3).** `maps.brookhollow.kid`: default (\"My mom says Revival Tech is laying people off.\"), `v_flg_promoted`, `kid_coin`, `kid_tower`, `kid_8` (\"My mom says ...\") and `kid_dusk` (\"Don't tell my mom about the 'mostly'.\"). The kid's parent is now `brookhollow_kid_dad` in a Brookhollow home.")
o.append("3. **Ron's bin payoff.** `house_1f.ron ron_ending` \"Told you. Tomorrow.\" now plays in main `mq_finale` s8 (flag `bins_taken_out`), the last beat before the credits. sq_bin_day s4 is now the after-credits empty bin (`bin_empty`). New Ron bin quip while `ron_in_party` is set (sq_bin_day s3b): \"Don't look at it, {nick}. It can tell when you look at it.\"")
o.append("4. **Lanternport Master name (ruling 7).** Not Vane. Draft: Delphine Orrin. `masters.lanternport` text should use it (or Gary's pick). The GD files still say Isolde Vane (see the open questions).")
o.append("5. **Camp text for Frostspire and Mirefen** doesn't exist yet. Draft restore lines are in mq_frostspire s3 and mq_mirefen s3, written to match the Thornwood/Greystone tone. The existing `camp_restored` / `camp_restored_first` text should apply to both.")
o.append("6. **New Ron lines** (Ron's voice is Text Bot's): the Trail Runners handover (mq_route1_benchmark s4), the ID jealousy at Saltmere, the letter at Revival Heights, the Lanternport 'chose to share it' lines, and the finale (arena-steps opener and the 'standing here with you' line). The final battle needs a **bin line 8** opener; this draft uses \"Eight coins. Me too, nearly. Seven and a sandwich.\" as a stand-in.")
o.append("7. **Mirefen angler** gets one new conditional line (hands over the notebook). It keeps 'Fish? No.' true: \"The notebook? Didn't catch a fish. Caught that.\" Club `note_mirefen` ('A Mirefen fisher...') reads fine next to it. Text Bot may want to change 'fisher' to 'someone'.")
o.append("8. **sq_ron_job s4** keeps only \"Thanks for not saying anything. That helps, {nick}.\" because the main letter scene already says \"It's fine. It's just a letter.\"")
o.append("9. **Log pages, field-team voices and new NPCs** (lab lead, Saltmere clerk, HQ receptionist, station clerk, Lanternport Master turn-in): all new and short, for Text Bot to own.")
o.append("10. **Existing-text wording to check against house rules (not my files):** `home_lanternport_c_kid` \"When the fog comes in...\" and `gate_saltmere_causeway` \"fades into mist\" (the brief bans fog/haze wording). The internal npc id `rebel_bartender` (club_int) is never shown to players, but quest lines use it as a speaker id.\n")
# open q
o.append("## Open questions for Gary\n")
qs=[
"**Finale confrontation (mq_finale s6): PENDING.** Who is on the restricted floors, and what happens? These stay out of the lines until you rule: Vane's motive, the Vane memo, the rebels being the Riverbank Stranger's people, and the crystal-release ending. `truth_revealed` is reserved for it.",
"**Finale location:** HQ restricted floors 9-12 (`revival_hq_upper`; draft, ties into the tower_floors email and 'Head Office. In person.') or Greystone deep (B2)?",
"**Camp owners (proposal):** Thornwood = Imke, Greystone = Teo, Frostspire = Pell, Mirefen = Marta (plus a last Teo page at Lanternport). The log pages sign only initials. Confirm before they ship.",
"**Field-team timeline:** Croft night (before Greystone) -> Thornwood -> Greystone (23 tally marks; check-in cancelled) -> Frostspire (shrine already quiet) -> Mirefen ('Back by Friday') -> Head Office. Sunmeadow sat behind the crystal wall until coin 4, so the team must have passed before the wall went up. That fits Route 1's 'wall went up the night the shrine went quiet'. OK?",
"**Lanternport Master name:** draft Delphine Orrin (ruling 7). `design/overnight_gd/halls/lanternport.json` and `overnight_gd/INDEX.md` still say **Isolde Vane**. That's another worker's file and wasn't edited. Ask the GD owner to rename it.",
"**GD name clashes found in passing:** GD trainer name suggestions include Pell (arena Battle Master 2), Teo, Quill, Sorrel (the field team), Hollis (Vane's first name), Ines (Lab Lead Varga), Ferris and Nell (Lantern Rest stone). Rename in GD?",
"**Ron battle count:** GD has 6 (Fernwick, Saltmere, Revival, Frostspire pass, Lanternport, Aurelith final). Text Bot has openers for Mirefen, Tidewater and Cindervale too. The draft marks those three optional.",
"**Ron's layoff:** the letter is never read on screen, and Ron keeps travelling. At Lanternport he says he's doing it 'because they're ours'. OK that he's laid off but still battling? Or should the letter be a demotion?",
"**Starter order:** promotion first, then the lab starter (draft)? And the lab giver is `lab_lead_varga` vs the side quest's `lab_brookhollow_aide`.",
"**Work-together vs rivals choice** (design doc): no flag exists. The draft assumes rivals.",
"**Senior lanyard:** eight coins get the player senior access at HQ reception (finale s4). OK as the key? Or should it be a separate quest?",
"**Arena:** opens at finale_done (draft, matches Text Bot meta 'post-game') or at all_badges (design doc)? 8 Battle Masters (design doc) vs 4 + Ron (GD) vs 15?",
"**read_drift_log** is set by the first log page (Thornwood). It switches on the jingle swap and the recalibration option. Too early? It could move to the Greystone page instead.",
"**Coins as items:** no coin item id exists. Flags only, or add `coin_<zone>` items?",
"**Lumen Line pass:** add a `rail_pass` key item, or keep the flag `has_rail_pass` only?",
"**Nan Wexley in main:** her memory of the team's night before Greystone is left to the Croft side quest. Should a line move into main mq_sunmeadow_crossing?",
"**Tidewater -> Lanternport:** sea lane inside tidewater_coast (GD) or a real route?",
"**Director Vane cameo** at HQ (Revival Heights) is not written. All his lines are pending.",
]
for i,x in enumerate(qs,1): o.append(f"{i}. {x}")
o.append("\n## Missing from the sources\n")
o.append("- There's no quest loader or schema in the code, so `SCHEMA.md` here is our own format.\n- `text/drafts/overnight/` doesn't exist; this draft used `text/overworld_lines.json` v0.4.9 (read only).\n- Most later maps are unbuilt (all marked `map pending`).\n- There's no item id for coins or the Lumen Line Pass.\n- No canon gives master names or elements beyond Fernwick (Earth). The GD suggestions are noted per quest but kept out of the lines.\n- No camp text exists for Frostspire or Mirefen, and no camp-to-member mapping exists anywhere.\n- The 'Isolde Vane' clash is in design/overnight_gd.")
open('../QUESTS.md','w').write("\n".join(o)+"\n")
print(len(o))
