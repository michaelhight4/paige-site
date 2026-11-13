# Main-quest data for quests_draft.json (DRAFT). Built by build.py. Lines <= ~20 words per box.
MAIN = []
def S(qid, n, desc, map_, at=None, flag=None, cond=None):
    return {"id": f"{qid}_s{n}", "desc": desc, "map": map_, "at": at, "sets_flag": flag, "condition": cond}
def L(npc, ctx, text, step=None, existing=None):
    d = {"npc": npc, "context": ctx, "step": step, "text": text}
    if existing: d["existing"] = existing
    return d
def Q(**k):
    k.setdefault("type", "main"); k.setdefault("status", "DRAFT")
    MAIN.append(k)

# ---------------- 10 BROOKHOLLOW ----------------
q = "mq_brookhollow_promotion"
Q(id=q, title="Promoted (Apparently)", zone="brookhollow", order=10, map_status="built",
  giver={"npc": "manager", "map": "office_int"}, prerequisites=[],
  steps=[
    S(q,1,"Wake from the river dream. Check the bed and laptop if you like.","house_2f",{"x":2,"y":4}),
    S(q,2,"Talk to Ron downstairs: slow week, layoff rumours.","house_1f",{"x":6,"y":4}),
    S(q,3,"Walk to the Revival Tech field office. Reception sends you in.","office_int",{"x":7,"y":4}),
    S(q,4,"The manager promotes you and Ron to field researchers. Field team missing; start in Fernwick.","office_int",{"x":13,"y":5},"flg_promoted"),
    S(q,5,"Pick a partner at the Brookhollow lab: Tumbloam, Cindrip or Rillop (level 5).","lab_brookhollow",None,"got_starter"),
    S(q,6,"Optional: read the new company emails on the laptop (new_role, greystone_cancelled).","house_2f",None,None,"flg_promoted"),
  ],
  reward={"items":[{"id":"dominance_crystal","qty":5},{"id":"tonic_small","qty":2}],"money":0,"flags":["flg_promoted","got_starter"]},
  lines=[
    L("player_start","step",["...The river again. Cold water, and someone on the bank, watching.","Just a dream. Probably."],f"{q}_s1","maps.house_2f.player_start.default"),
    L("ron","step",["Morning. You look like you slept in the river.","Work's been dead all week. They cleared out three desks on Friday.","If layoffs are coming, I hope they wait till I've bought groceries."],f"{q}_s2","maps.house_1f.ron.default"),
    L("manager","start",["Sit down. Relax, this isn't that conversation.","Our field team stopped reporting in. As of today, you two are field researchers.","Their last check-in was from Greystone Caverns. Start in Fernwick."],f"{q}_s4","maps.office_int.manager.default"),
    L("lab_lead_varga","step",["Ines Varga, lab lead. Three partners ready, none of them catalogued yet.","Pick the one that looks back at you. Ron gets whoever's left."],f"{q}_s5"),
    L("lab_lead_varga","turn_in",["Good choice. Crystals and remedies are on the house. Just this once.","Fernwick's up Route 1. Bring it back in one piece."]),
    L("ron","after",["Field researchers. Us. I still think they mixed us up with someone else.","Fernwick's first. Try to keep up."],None,"maps.house_1f.ron.v_flg_promoted"),
  ],
  notes=["Design doc plot opening: river dream, Ron, layoff talk, both promoted. All pre-existing lines are mirrored word for word (see 'existing').",
         "OPEN: starter order. lab_brookhollow sets got_starter, but no line says whether the starter comes before or after the promotion. Draft puts it after (the company hands field kit to new field staff).",
         "OPEN: lab giver id. SOUL_PLAYBOOK names Lab Lead Ines Varga; no npc id exists in lab_brookhollow (no NPCs placed). Proposed id lab_lead_varga. Side quest sq_first_five uses lab_brookhollow_aide: one of them should be the other's assistant.",
         "Tutorial flags tut_lab_done / tut_first_battle / tut_first_catch / tut_phone (SOUL_PLAYBOOK) can hang off s5 and Route 1; not duplicated here.",
         "Starter reward items are a proposal (no starter kit is defined anywhere)."],
  new_ids=["lab_lead_varga (npc, proposed)"])

# ---------------- 20 ROUTE 1 ----------------
q = "mq_route1_benchmark"
Q(id=q, title="The Benchmark", zone="route1", order=20, map_status="built",
  giver={"npc": "ron_rival_1", "map": "fernwick"}, prerequisites=["flg_promoted","got_starter"],
  steps=[
    S(q,1,"Head north up Route 1. Three trainers on the trail (optional; see sq_fork_regulars).","route1"),
    S(q,2,"Squeeze through the forced grass under Fernwick.","route1"),
    S(q,3,"Ron is waiting in Fernwick. Battle him (Ron 1).","fernwick",{"x":12,"y":12},"beat_rival_ron_1"),
    S(q,4,"Ron hands over the Trail Runners.","fernwick",{"x":12,"y":12},"has_run_shoes"),
  ],
  reward={"items":[{"id":"trail_runners","qty":1}],"money":0,"flags":["beat_rival_ron_1","has_run_shoes"]},
  lines=[
    L("ron_rival_1","start",["There you are, {nick}. Bin day's tomorrow. It's fine.","The company says we're each other's benchmark. Let's see where you're at."],f"{q}_s3","maps.fernwick.ron_rival_1.default"),
    L("ron_rival_1","step",["Don't sweat it. I'll go easy next time. Probably."],f"{q}_s3","maps.fernwick.ron_rival_1.battle_won"),
    L("ron_rival_1","turn_in",["Here. Company Trail Runners. They gave me two pairs.","Don't ask why. I didn't ask why."],f"{q}_s4"),
    L("ron_rival_1","after",["The Master's Hall is on the east side. I'm getting a sandwich first."],None,"maps.fernwick.ron_rival_1.after"),
  ],
  notes=["CRITICAL_PATH: has_run_shoes comes from beat_rival_ron_1. The handover line (s4) is new; Text Bot owns Ron's voice, so it is listed under 'Lines for Text Bot to align'.",
         "Ron is cocky here (Ron arc: Fernwick). He never loses gracefully yet.",
         "OPEN: the design doc lets the player pick 'work together' or 'friendly rivals' with Ron. No flag exists for that choice; this draft assumes rivals (the intended game)."],
  new_ids=[])

# ---------------- 30 FERNWICK ----------------
q = "mq_fernwick_hall"
Q(id=q, title="Stand Your Ground", zone="fernwick", order=30, map_status="built",
  giver={"npc": "guide", "map": "fernwick_hall_int"}, prerequisites=["has_run_shoes"],
  steps=[
    S(q,1,"Enter the Master's Hall on the east side of Fernwick.","fernwick_hall_int",{"x":9,"y":14}),
    S(q,2,"Step on both corner plates to open the first gate.","fernwick_hall_int"),
    S(q,3,"Light all three crystals at once (each touch flips its neighbours).","fernwick_hall_int",None,"puzzle_fernwick_hall_solved"),
    S(q,4,"Beat the two hall helpers (optional order).","fernwick_hall_int",None),
    S(q,5,"Battle the Master of Fernwick (Earth).","fernwick_hall_int",{"x":7,"y":4},"beat_master_fernwick"),
    S(q,6,"Report the coin at the office. The manager points you at Greystone.","office_int",{"x":13,"y":5},None,"beat_master_fernwick"),
  ],
  reward={"items":[{"id":"tonic_large","qty":1}],"money":0,"flags":["beat_master_fernwick"]},
  lines=[
    L("guide","start",["Two plates, one in each corner. Step on both and the first gate opens.","Past that, the crystals. Each one you touch flips its neighbours.","The middle one starts lit. Leave it alone at first."],None,"maps.fernwick_hall_int.guide.default"),
    L("master_fernwick","in_progress",["Earth doesn't hurry, and neither do I. You took your time getting here.","Let's see if your team can stand its ground."],f"{q}_s5","maps.fernwick_hall_int.master_fernwick.default"),
    L("master_fernwick","turn_in",["That coin registers you as a trainer. Brookhollow's east road is open to you.","Looking for your missing crew? Miners heard voices down in Greystone."],f"{q}_s5","maps.fernwick_hall_int.master_fernwick.after"),
    L("manager","after",["A coin already. Good. Keep the reports coming.","And keep looking for the field team. Greystone first."],f"{q}_s6","maps.office_int.manager.manager_coin"),
  ],
  notes=["Coin 1. Opens gate_brookhollow_east (rt_guard_east hands over the survey_parcel; see mq_saltmere_parcel) and activates both camps (Thornwood, Greystone) plus the Firefly notes note_thornwood / note_greystone.",
         "Reward item is a proposal; the GD draft (design/overnight_gd/halls/fernwick.json) has its own coin reward, use that if it differs.",
         "GD draft suggests 'Oswin Marl' and 'Loam Coin'. Not used in lines (player text says 'coin')."],
  new_ids=[])

# ---------------- 40 THORNWOOD ----------------
q = "mq_thornwood_camp"
Q(id=q, title="Ferns Over the Tent", zone="thornwood", order=40, map_status="built",
  giver={"npc": "prop:camp_thornwood", "map": "thornwood"}, prerequisites=["beat_master_fernwick"],
  steps=[
    S(q,1,"Take the Thornwood trail east of Fernwick. The dissident at (23,7) has words for your company ID.","thornwood",{"x":23,"y":7}),
    S(q,2,"Find the empty tent under the ferns.","thornwood",{"x":6,"y":17}),
    S(q,3,"Clear the camp and light the stove.","thornwood",{"x":6,"y":17},"camp_restored_thornwood"),
    S(q,4,"Read the field log page tucked in the tent.","thornwood",{"x":6,"y":17},"read_log_thornwood"),
    S(q,5,"Rest at the stove with your team (first Warmth rest).","thornwood",{"x":6,"y":18},None,"camp_restored_thornwood"),
  ],
  reward={"items":[{"id":"trail_mix","qty":2}],"money":0,"flags":["camp_restored_thornwood","read_log_thornwood","read_drift_log"]},
  lines=[
    L("dissident_hint","step",["Revival Tech ID on your belt. Of course.","Ask your bosses what happens to the creatures they 'catalogue'.","Then ask why nobody comes back. The caves are right there."],f"{q}_s1","maps.thornwood.dissident_hint.default"),
    L("prop:camp_thornwood","in_progress",["An empty tent, ferns grown right over it.","Nobody's slept here in a long while."],f"{q}_s2","maps.thornwood.camp_thornwood.default"),
    L("prop:camp_thornwood","step",["You pull the ferns off the tent and sweep out the leaves.","The stove catches on the second try."],f"{q}_s3","maps.thornwood.camp_thornwood.use"),
    L("prop:log_thornwood","step",["A field log page, damp at the edges. Signed 'I.S.'","'Night two. Teo made a list of his lists. I hummed till he gave up.'","'My partner's crystal looks less violet by the fire. Probably just the light.'"],f"{q}_s4"),
    L("prop:camp_thornwood","after",["Your camp now. Stove's warm, tent's dry.","A good spot to sit a while with your team."],None,"maps.thornwood.camp_thornwood.camp_restored"),
  ],
  notes=["Camp restore text is Text Bot's (Story Bot tone check 10:08 PM CT); mirrored word for word. This quest only adds the log page (SOUL_PLAYBOOK 1.9: each camp holds that member's log page) and the rest hook.",
         "PROPOSAL (not canon): camp owners. Thornwood = Imke Sorrel (youngest, hums), Greystone = Teo Brack (lead, lists), Frostspire = Pell Ashby, Mirefen = Marta Quill. Text Bot noted no document ties a member to a camp. Gary to confirm before any initials ship.",
         "read_drift_log: SOUL_PLAYBOOK's flag for the first tint-drift log page (jingle swap + recalibration option). This is the first page a player can find. The line only implies drift ('less violet by the fire'); it never says why.",
         "The Firefly note_thornwood ticks on the same flag (Text Bot). sq_tell_the_counter step 2 is the follow-up."],
  new_ids=["read_log_thornwood (flag)","prop:log_thornwood (interact spot inside the tent; World to place)"])

# ---------------- 50 GREYSTONE ----------------
q = "mq_greystone_camp"
Q(id=q, title="Greystone First", zone="greystone_caverns", order=50, map_status="built",
  giver={"npc": "hiker", "map": "greystone_entrance"}, prerequisites=["beat_master_fernwick"],
  steps=[
    S(q,1,"Enter Greystone Caverns from Thornwood's north path. Talk to the hiker.","greystone_entrance",{"x":15,"y":10}),
    S(q,2,"Go down to B1. Push the boulder onto the hold plate to open the north gate.","greystone_b1",{"x":12,"y":7}),
    S(q,3,"Find the cold camp stove in the far north of B1.","greystone_b1",{"x":19,"y":2}),
    S(q,4,"Clear the camp and light the stove.","greystone_b1",{"x":19,"y":2},"camp_restored_greystone"),
    S(q,5,"Read the field log page under the bedroll.","greystone_b1",{"x":19,"y":3},"read_log_greystone"),
    S(q,6,"Optional: the tally marks scratched into the crystal by the west wall (E7).","greystone_b1",{"x":3,"y":9},"tally_marks_seen"),
    S(q,7,"File a field report at any company terminal. Read the reply.","heal_centre_int",{"x":11,"y":4},"mq_greystone_reported","camp_restored_greystone"),
  ],
  reward={"items":[{"id":"energy_tonic","qty":1},{"id":"feed_bag","qty":1}],"money":500,"flags":["camp_restored_greystone","read_log_greystone","mq_greystone_reported"]},
  lines=[
    L("hiker","start",["Those ferns glow when something walks through. Doesn't mean it's friendly.","A crew in Revival Tech jackets went down those stairs. Never saw them come up."],f"{q}_s1","maps.greystone_entrance.hiker.default (first two boxes)"),
    L("hiker_b1","step",["That plate hums when something heavy sits on it.","Standing on it yourself won't do it. You have to leave something there.","Line the boulder up before you push. It resets if you leave the floor."],f"{q}_s2","maps.greystone_b1.hiker_b1.default"),
    L("prop:camp_greystone","step",["You shake out the bedroll and brush off the dust.","The stove takes a few tries, then catches."],f"{q}_s4","maps.greystone_b1.camp_greystone.use"),
    L("prop:log_greystone","step",["A list in tidy capitals, signed 'T.B.'","'CHECK-IN, DAY 9. 1. Seam found. 2. Samples bagged. 3. Readings odd again.'","'4. Odd only on our own four. 5. Ask Head Office. In person.'"],f"{q}_s5"),
    L("prop:tally_crystal","step",["Tally marks scratched into the crystal. Twenty-three of them.","Four sets of initials underneath. One of them is just a doodle of a fern."],f"{q}_s6"),
    L("company_terminal","turn_in",["Report received. Thank you for your diligence.","The Greystone check-in was cancelled by the organiser. No further action is needed."],f"{q}_s7"),
    L("prop:camp_greystone","after",["Your camp now. Warm, for a cave.","A good spot to sit a while with your team."],None,"maps.greystone_b1.camp_greystone.camp_restored"),
  ],
  notes=["Follows the manager's 'Greystone first'. Camp text is Text Bot's, mirrored word for word. The crystal case in the far room (b1_item, dominance_crystal_plus) stays a normal pickup.",
         "Teo's list implies the field team's finding (odd readings only on their own bonded creatures) without saying it. 'Head Office. In person.' sets up the finale. Not canon until Gary approves the finale shape.",
         "E7 Tally Marks (SOUL_PLAYBOOK): 23 days, initials. Initials are not spelled out in the line, so the camp-owner mapping stays open. Per Gary's ruling, Dana's initials are cut from the Greystone camp (sq_dana step 3 removed).",
         "The terminal reply reuses the wording of the existing greystone_cancelled email ('cancelled by the organiser') so the two agree.",
         "OPEN: GD draft re-bands Greystone wild levels to 12-18 because it's open right after coin 1 (design/overnight_gd/INDEX.md). This quest assumes it is."],
  new_ids=["read_log_greystone (flag)","tally_marks_seen (flag)","mq_greystone_reported (flag)","prop:log_greystone, prop:tally_crystal (interact spots; World to place, tally at (3,9) per SOUL_PLAYBOOK E7)"])

# ---------------- 60 SALTMERE ----------------
q = "mq_saltmere_parcel"
Q(id=q, title="Signed For", zone="saltmere", order=60, map_status="map pending",
  giver={"npc": "rt_guard_east", "map": "brookhollow"}, prerequisites=["beat_master_fernwick"],
  steps=[
    S(q,1,"Show the coin at the east road. The guard hands you a survey parcel for Saltmere.","brookhollow",None,"has_survey_parcel"),
    S(q,2,"Take the east road to Aurelith (pass through; the arena is sealed), then south to Saltmere.","route_brookhollow_aurelith"),
    S(q,3,"Deliver the parcel to the Saltmere office clerk. She lends you a Courier Bike.","saltmere_office_int",None,"has_bike"),
    S(q,4,"Ron is outside the office, sore about your ID level. Battle him (Ron 2).","saltmere",None,"beat_rival_ron_2"),
    S(q,5,"Beat the Master of Saltmere.","saltmere_hall_int",None,"beat_master_saltmere"),
  ],
  reward={"items":[{"id":"courier_bike","qty":1},{"id":"coin_pouch_small","qty":1}],"money":0,"flags":["has_survey_parcel","has_bike","beat_master_saltmere"]},
  lines=[
    L("rt_guard_east","start",["You're registered now. Road east is open. Mind the bridge, it creaks.","Heading east? Drop this parcel at the Saltmere office. They'll pay you back."],f"{q}_s1","maps.brookhollow.rt_guard_east (beat_master_fernwick)"),
    L("rt_guard_east","in_progress",["Saltmere's past Aurelith. The parcel's not getting any lighter."],None,"maps.brookhollow.rt_guard_east (has_survey_parcel)"),
    L("saltmere_office_clerk","turn_in",["Survey parcel, signed for. They said it'd be a week. It's been a season.","Take the Courier Bike. The boardwalks here are bikes only."],f"{q}_s3"),
    L("ron","step",["Your ID says 'Field Researcher II'. Mine says 'Field Researcher'.","No numeral. Just vibes. Let's fix that, {nick}."],f"{q}_s4"),
    L("ron","step",["One bag by the bin now. It's fine, {nick}.","Tomorrow."],f"{q}_s4","ron_battle_openers.ron_rival_saltmere"),
  ],
  notes=["CRITICAL_PATH: has_survey_parcel (rt_guard_east) -> saltmere_office_clerk -> courier_bike / has_bike -> coin 2.",
         "'They'll pay you back' (guard line): coin_pouch_small is the payback. Proposal.",
         "Ron's ID-level jealousy (Ron arc: Saltmere) is new text; listed for Text Bot. The bin opener is Text Bot's.",
         "OPEN: GD draft suggests Master 'Nerys Bryde' (water). Lines here say only 'the Master'.",
         "Map pending: saltmere, saltmere_office_int, saltmere_hall_int, route_brookhollow_aurelith, aurelith."],
  new_ids=["saltmere_office_clerk (npc, CRITICAL_PATH name)","beat_rival_ron_2 (flag, GD draft)"])

# ---------------- 70 REVIVAL HEIGHTS ----------------
q = "mq_revival_heights"
Q(id=q, title="Head Office", zone="revival_heights", order=70, map_status="map pending",
  giver={"npc": "sign:gate_thornwood_east", "map": "thornwood"}, prerequisites=["beat_master_saltmere"],
  steps=[
    S(q,1,"With two coins, the fallen trunk on the Thornwood trail is cleared.","thornwood",None,"gate_thornwood_east_cleared"),
    S(q,2,"Follow the trail to Revival Heights (field staff use the long way round).","route_thornwood_revival"),
    S(q,3,"Ron catches up at the HQ plaza. Battle him (Ron 3).","revival_heights",None,"beat_rival_ron_3"),
    S(q,4,"Inside HQ reception, Ron opens a letter. Stay with him.","revival_hq_int",None,"ron_layoff_letter"),
    S(q,5,"Beat the Master of Revival Heights.","revival_hall_int",None,"beat_master_revival"),
    S(q,6,"The south gate guard opens the shortcut to Saltmere.","revival_heights",None,"gate_revival_checkpoint_open","beat_master_revival"),
    S(q,7,"Collect the Lumen Line rail pass at Central station.","revival_station_int",None,"has_rail_pass","beat_master_revival"),
  ],
  reward={"items":[{"id":"tonic_large","qty":2}],"money":0,"flags":["ron_layoff_letter","beat_master_revival","has_rail_pass"]},
  lines=[
    L("sign:gate_thornwood_east","after",["Only sawdust is left where the trunk was.","Someone carved 'FINALLY' into the stump."],f"{q}_s1","blockers.gate_thornwood_east.after"),
    L("ron","step",["Two bags. Maybe three. Doesn't matter.","Bin day's tomorrow. Let's go, {nick}."],f"{q}_s3","ron_battle_openers.ron_rival_revival_heights"),
    L("hq_receptionist","step",["Post for Ron? Hand delivered. Head Office likes paper."],f"{q}_s4"),
    L("ron","step",["...","It's fine. It's just a letter.","Go on, {nick}. The Master's waiting. I'll catch up."],f"{q}_s4"),
    L("gate_revival_checkpoint","turn_in",["You beat the Heights Master? Fine. I'll open it from this side.","Saltmere's straight down the hill. Saves you the long way."],f"{q}_s6","blockers.gate_revival_checkpoint.after"),
    L("station_clerk_central","turn_in",["Lumen Line pass, field grade. Every station that has one.","Skylift won't take you into the rail-only cities. Trains will."],f"{q}_s7"),
  ],
  notes=["Ron arc beat (Revival Heights): the layoff letter. STORY_RULINGS_SOUL #4: Ron's music turns minor only here. The scene is main-story owned; sq_ron_job step 4 now follows it (condition ron_layoff_letter).",
         "The letter's contents are never shown. Ron keeps travelling and battling anyway (he says why at Lanternport).",
         "Ron has no surname in any source; the receptionist just says 'Post for Ron?'",
         "OPEN: Director Hollis Vane cameo at HQ reception. His only existing line is '{rt_number}'; all his lines are pending a story call, so no cameo is written.",
         "Hooks that land around here (Text Bot emails): tint_drift ('Drift is a defect. Please don't get attached to it.') and tower_floors (floors 9-12 senior only). Both pay off in mq_finale.",
         "No Lumen Line Pass item id exists (has_rail_pass flag only). Proposed key item id rail_pass.",
         "GD draft suggests 'Cassia Lume' (light). Not used in lines.",
         "Map pending: route_thornwood_revival, revival_heights, revival_hq_int, revival_hall_int, revival_station_int."],
  new_ids=["ron_layoff_letter (flag)","gate_thornwood_east_cleared (flag, if the blocker doesn't already set one)","gate_revival_checkpoint_open (flag, ditto)","hq_receptionist (npc)","station_clerk_central (npc)","rail_pass (key item, proposed)","beat_rival_ron_3 (flag, GD draft)"])

# ---------------- 80 FROSTSPIRE ----------------
q = "mq_frostspire"
Q(id=q, title="Rated for One", zone="frostspire", order=80, map_status="map pending",
  giver={"npc": "rt_engineer_pass", "map": "route_greystone_frostspire"}, prerequisites=["beat_master_revival"],
  steps=[
    S(q,1,"Take the Greystone pass north. The engineer approves the bridge for a three-coin trainer.","route_greystone_frostspire",None,"gate_frostspire_bridge_open"),
    S(q,2,"Ron is at the rebuilt bridge. Battle him (Ron 4, optional per GD).","route_greystone_frostspire",None,"beat_rival_ron_4"),
    S(q,3,"Find the snowed-in camp below the shrine and restore it.","frostspire",None,"camp_restored_frostspire"),
    S(q,4,"Read the log page pinned under a rock.","frostspire",None,"read_log_frostspire"),
    S(q,5,"Beat the Master of Frostspire. Learn Skylift.","frostspire_hall_int",None,"beat_master_frostspire"),
    S(q,6,"The shrine is lit again. Down the mountain, three crystal walls go dim.","frostspire",None,"has_skylift","beat_master_frostspire"),
  ],
  reward={"items":[{"id":"calm_tea","qty":2},{"id":"vigor_seed","qty":1}],"money":0,"flags":["camp_restored_frostspire","read_log_frostspire","beat_master_frostspire","has_skylift"]},
  lines=[
    L("rt_engineer_pass","start",["The rope bridge has snapped. Both halves are hanging off the cliffs.","Engineer: Repairs get approved when someone with three coins asks."],f"{q}_s1","blockers.gate_frostspire_bridge.before"),
    L("rt_engineer_pass","turn_in",["The bridge has been rebuilt. New rope, new planks.","Engineer: Rated for one person at a time. So, one person at a time."],f"{q}_s1","blockers.gate_frostspire_bridge.after"),
    L("ron","step",["The bags froze to the bin last night.","That's basically storage. Ready, {nick}?"],f"{q}_s2","ron_battle_openers.ron_rival_frostspire"),
    L("prop:camp_frostspire","step",["You dig the tent out of the drift and knock the ice off the stove.","It lights. Barely. Then properly."],f"{q}_s3"),
    L("prop:log_frostspire","step",["A page in loopy handwriting, signed 'P.A.'","'Snowed in two nights. Went up to the shrine. It's gone quiet.'","'The crystals on the path hum instead. Teo wants it on the list.'"],f"{q}_s4"),
    L("system","step",["Far below, the violet walls flicker... and dim."],f"{q}_s6"),
  ],
  notes=["CRITICAL_PATH: beat_master_frostspire gives has_skylift and dims the Route 1 east wall, the Saltmere causeway wall and the Sunmeadow north slope wall. The cause stays vague in all text: the shrine is lit, the walls dim, nobody says why.",
         "Continuity: Route 1 trainer_r1_c says 'That crystal wall went up the night the Frostspire shrine went quiet.' Pell's page agrees with that (the shrine was quiet when the team got there) and doesn't explain it.",
         "Camp text for Frostspire doesn't exist yet. The two camp lines here are new and listed for Text Bot. The club note_frostspire 'FOUND THE CAMP. NOT THEM.' ticks on camp_restored_frostspire.",
         "Pell's page is the proposed camp mapping (open question).",
         "Text Bot email no_comment (Frostspire shrine) lands here.",
         "GD draft suggests 'Hale Corrie' (bird + wind). Not used in lines.",
         "Map pending: route_greystone_frostspire, frostspire, frostspire_hall_int."],
  new_ids=["read_log_frostspire (flag)","gate_frostspire_bridge_open (flag, if the blocker doesn't set one)","beat_rival_ron_4 (flag, GD draft)","prop:camp_frostspire, prop:log_frostspire (interact spots)"])

# ---------------- 90 SUNMEADOW ----------------
q = "mq_sunmeadow_crossing"
Q(id=q, title="Past the Shine", zone="sunmeadow_fields", order=90, map_status="map pending",
  giver={"npc": "system", "map": "route1"}, prerequisites=["beat_master_frostspire"],
  steps=[
    S(q,1,"The Route 1 east wall has dimmed. Walk through to Sunmeadow Fields.","route1",{"x":40,"y":3}),
    S(q,2,"Cross the meadow south-east toward Mirefen (or take the Saltmere causeway).","route_sunmeadow_mirefen",None,"reached_mirefen"),
  ],
  reward={"items":[],"money":0,"flags":["reached_mirefen"]},
  lines=[
    L("system","step",["The violet wall is just glass now. Dim, and cold, and easy to walk past."],f"{q}_s1"),
  ],
  notes=["Pass-through beat. The Croft intro is the side quest sq_past_the_shine (same title on purpose: it's the follow-up, giver is the Route 1 sign). Main doesn't duplicate Nan.",
         "OPEN: Nan Wexley says the team stayed at the Croft the night before Greystone (SOUL_PLAYBOOK 8.3). Sunmeadow was behind the crystal wall until coin 4, so they must have gone before the wall went up. That fits trainer_r1_c, but it needs a field-team timeline. Add a short Nan line here only if Gary wants it main.",
         "Map pending: sunmeadow_fields (only the route1 strip is built), route_sunmeadow_mirefen, route_saltmere_mirefen."],
  new_ids=["reached_mirefen (flag)"])

# ---------------- 100 MIREFEN ----------------
q = "mq_mirefen"
Q(id=q, title="Not a Fisher", zone="mirefen", order=100, map_status="built",
  giver={"npc": "mirefen_angler", "map": "mirefen_bog"}, prerequisites=["beat_master_frostspire"],
  steps=[
    S(q,1,"Ask the quiet angler on the boardwalk about the field notebook from the club flyer.","mirefen_bog",None,"has_field_notebook"),
    S(q,2,"Follow the notebook's sketch map to the camp on the reed island (bike boards).","mirefen_bog",None,None,"has_bike"),
    S(q,3,"Restore the camp.","mirefen_bog",None,"camp_restored_mirefen"),
    S(q,4,"Read the last page of the notebook at the stove.","mirefen_bog",None,"read_log_mirefen"),
    S(q,5,"Ron's here, ankle-deep. Battle him (optional, Text Bot opener).","mirefen_bog",None,"beat_rival_ron_mirefen"),
    S(q,6,"Beat the Master of Mirefen. Learn Tideglide. The storm season starts.","mirefen_hall_int",None,"beat_master_mirefen"),
  ],
  reward={"items":[{"id":"mossberry_shake","qty":1},{"id":"feed_bag","qty":2}],"money":0,"flags":["has_field_notebook","camp_restored_mirefen","read_log_mirefen","beat_master_mirefen","has_tideglide","storm_season"]},
  lines=[
    L("mirefen_angler","start",["Fish? In this bog? No. I just like the quiet.","Stay on the boards. The mud takes boots and doesn't give them back."],f"{q}_s1","maps.mirefen_bog.mirefen_angler (default)"),
    L("mirefen_angler","step",["The notebook? Didn't catch a fish. Caught that.","Someone drew a map in the back. Badly. Take it."],f"{q}_s1"),
    L("prop:camp_mirefen","step",["You haul the tent out of the reeds and wring it out.","The stove's dry inside. Someone wrapped it up properly."],f"{q}_s3"),
    L("prop:log_mirefen","step",["Neat handwriting, signed 'M.Q.' The last page is dated.","'Bog census done by hand. The scanners don't like our four.'","'Off to Head Office with Teo's list. Back by Friday.'"],f"{q}_s4"),
    L("ron","step",["This bog smells like bag five.","Bag five and I aren't speaking, {nick}."],f"{q}_s5","ron_battle_openers.ron_rival_mirefen"),
    L("mirefen_angler","after",["Storm's got the whole bog stirred up.","Even the frogs went home."],None,"maps.mirefen_bog.mirefen_angler (storm_season)"),
  ],
  notes=["MAIN OWNS THE NOTEBOOK (Gary): the angler hands it over in s1. Club note_mirefen ('A Mirefen fisher pulled a field notebook from the reeds') is kept true: the angler did pull it out, just not while fishing. sq_ask_nicely is rewritten as a follow-up (sit with the angler at dusk after the camp is restored).",
         "Marta's page says 'Back by Friday'. That ties to the cake_welcome email (Friday cake) at the end. 'Don't like our four' implies drift only touches bonded creatures. It doesn't explain it.",
         "Proposed camp mapping: Mirefen = Marta Quill (open question).",
         "CRITICAL_PATH: beat_master_mirefen -> has_tideglide, storm_season. Floods the coast road (gate_coast_road_flood).",
         "OPEN: Ron battle count. GD has 6 Ron battles (none in Mirefen, Tidewater or Cindervale). Text Bot has openers for all 7 zones. Mirefen/Tidewater/Cindervale Ron steps are optional until Gary picks.",
         "GD draft suggests 'Wenna Peat' (swamp). Not used in lines.",
         "Map pending: camp spot on mirefen_bog, mirefen_hall_int."],
  new_ids=["has_field_notebook (flag)","field_notebook (key item, also in sq_ask_nicely draft; now main)","read_log_mirefen (flag)","beat_rival_ron_mirefen (flag, only if the battle stays)","prop:camp_mirefen, prop:log_mirefen"])

# ---------------- 110 TIDEWATER ----------------
q = "mq_tidewater"
Q(id=q, title="Deep Enough to Lose a Boot", zone="tidewater_coast", order=110, map_status="map pending",
  giver={"npc": "sign:gate_coast_road_flood", "map": "route_brookhollow_tidewater"}, prerequisites=["beat_master_mirefen","storm_season"],
  steps=[
    S(q,1,"The storm has flooded the coast road south of Brookhollow. Cross it with Tideglide.","route_brookhollow_tidewater",None,None,"has_tideglide"),
    S(q,2,"Ron is on the sea wall. Battle him (optional, Text Bot opener).","tidewater_coast",None,"beat_rival_ron_tidewater"),
    S(q,3,"Beat the Master of Tidewater Coast.","tidewater_hall_int",None,"beat_master_tidewater"),
    S(q,4,"Take the sea lane north to Lanternport.","tidewater_coast",None,"reached_lanternport"),
  ],
  reward={"items":[{"id":"tonic_large","qty":2}],"money":0,"flags":["beat_master_tidewater","reached_lanternport"]},
  lines=[
    L("sign:gate_coast_road_flood","start",["The coast road is underwater. Deep enough to lose a boot. Maybe both."],f"{q}_s1","blockers.gate_coast_road_flood.before"),
    L("ron","step",["The flies have names now.","Don't ask me their names, {nick}."],f"{q}_s2","ron_battle_openers.ron_rival_tidewater"),
  ],
  notes=["Short on purpose. Thin zone; the side placeholder sq_sea_glass sits here.",
         "OPEN (GD): Tidewater to Lanternport has no route in world_layout. GD treats it as a sea lane inside tidewater_coast. This quest follows that.",
         "GD draft suggests 'Jory Swell' (sea). Not used in lines.",
         "Map pending: route_brookhollow_tidewater, tidewater_coast, tidewater_hall_int."],
  new_ids=["beat_rival_ron_tidewater (flag, only if the battle stays)","reached_lanternport (flag)"])

# ---------------- 120 LANTERNPORT ----------------
q = "mq_lanternport"
Q(id=q, title="The Page Ron Kept", zone="lanternport", order=120, map_status="map pending",
  giver={"npc": "ron", "map": "lanternport"}, prerequisites=["beat_master_tidewater"],
  steps=[
    S(q,1,"Ron is waiting on the harbour steps. Battle him (Ron 5).","lanternport",None,"beat_rival_ron_5"),
    S(q,2,"Afterwards Ron hands you a log page he found. He could have kept it.","lanternport",None,"read_log_lanternport"),
    S(q,3,"Beat the Master of Lanternport in the old lighthouse.","lanternport_hall_int",None,"beat_master_lanternport"),
    S(q,4,"The Master opens the tide-lock: a shortcut home to Fernwick.","lanternport",None,"tide_lock_open","beat_master_lanternport"),
    S(q,5,"The Master sounds the lighthouse horn. Far off, something big wakes up.","lanternport",None,"lighthouse_horn_sounded","beat_master_lanternport"),
  ],
  reward={"items":[{"id":"energy_tonic","qty":2}],"money":0,"flags":["read_log_lanternport","beat_master_lanternport","tide_lock_open","lighthouse_horn_sounded"]},
  lines=[
    L("ron","start",["The neighbour left a note about the bins.","I'm choosing to battle you instead, {nick}."],f"{q}_s1","ron_battle_openers.ron_rival_lanternport"),
    L("ron","step",["Found this in a lost-and-found box at the station. Revival Tech paper.","I read it. Then I thought about keeping it. Then I didn't."],f"{q}_s2"),
    L("prop:log_lanternport","step",["Tidy capitals again. 'T.B.' The last list.","'1. Head Office wants our four brought in. 2. Not leaving them.'","'3. Going anyway. All of us. With them.'"],f"{q}_s2"),
    L("ron","step",["No job, remember? So I'm not doing this for the company.","I'm doing it because they're ours. Same as you."],f"{q}_s2"),
    L("master_lanternport","turn_in",["The tide-lock's open. Fernwick's a short walk now.","And the horn... someone's been asleep on the Cindervale road too long."],f"{q}_s5"),
    L("system","step",["Far off, the Lanternport horn sounds."],f"{q}_s5"),
  ],
  notes=["Ron arc beat (Lanternport): Ron finds information and chooses to share it. The page is Teo's (lead, lists). It points at Head Office and sets up the finale without naming a motive.",
         "GARY RULING 7: the Lanternport Master must not be named Vane. Draft name: Delphine Orrin (original; not used by any GD trainer name, but not web-checked). It's not in any line yet. CONFLICT: design/overnight_gd/halls/lanternport.json and overnight_gd/INDEX.md still say 'Isolde Vane'. That's another worker's file, so it's not edited here. The GD owner needs to change it.",
         "CRITICAL_PATH: beat_master_lanternport -> tide-lock (route_fernwick_lanternport) and the horn that wakes the Cindervale giant (blockers.gate_cindervale_giant.wake mirrors 'Far off, the Lanternport horn sounds.').",
         "Text Bot email recal_full ('Please stop booking your own team in') lands near here. It fits Teo's list. Left as an implication only.",
         "Map pending: lanternport, lanternport_hall_int, lanternport station."],
  new_ids=["read_log_lanternport (flag)","beat_rival_ron_5 (flag, GD draft)","tide_lock_open (flag)","lighthouse_horn_sounded (flag; the giant blocker may already key off beat_master_lanternport)","master_lanternport display name 'Delphine Orrin' (proposed)"])

# ---------------- 130 CINDERVALE ----------------
q = "mq_cindervale"
Q(id=q, title="Something Louder", zone="cindervale", order=130, map_status="map pending",
  giver={"npc": "sign:gate_cindervale_giant", "map": "route_aurelith_cindervale"}, prerequisites=["beat_master_lanternport"],
  steps=[
    S(q,1,"Take the volcanic road from Aurelith. The giant has left a dent where it slept.","route_aurelith_cindervale",None,None,"lighthouse_horn_sounded"),
    S(q,2,"Ron is at the town gate (optional, Text Bot opener).","cindervale",None,"beat_rival_ron_cindervale"),
    S(q,3,"Beat the Master of Cindervale. Eight coins.","cindervale_hall_int",None,"beat_master_cindervale"),
    S(q,4,"Eight coins registered.","cindervale",None,"all_badges","beat_master_cindervale"),
  ],
  reward={"items":[{"id":"dominance_crystal_plus","qty":3}],"money":0,"flags":["beat_master_cindervale","all_badges"]},
  lines=[
    L("sign:gate_cindervale_giant","in_progress",["There's a giant dent in the road where it slept. The way to Cindervale is open."],f"{q}_s1","blockers.gate_cindervale_giant.after"),
    L("ron","step",["The bags have a smell now. Not ours. Their own.","Tomorrow, {nick}. I mean it this time."],f"{q}_s2","ron_battle_openers.ron_rival_cindervale"),
  ],
  notes=["all_badges is the existing flag name (internal only; player text says 'coin'). It triggers Text Bot's director_numbers email ('send your team's catalogue numbers by Friday') and rt_guard_east's 'Eight coins' line.",
         "GD draft suggests 'Brannock Fell' (fire + magma). Not used in lines.",
         "Map pending: route_aurelith_cindervale, cindervale, cindervale_hall_int."],
  new_ids=["beat_rival_ron_cindervale (flag, only if the battle stays)"])

# ---------------- 140 FINALE ----------------
q = "mq_finale"
Q(id=q, title="In Person", zone="revival_heights", order=140, map_status="map pending",
  giver={"npc": "ron", "map": "aurelith"}, prerequisites=["all_badges"],
  steps=[
    S(q,1,"Optional: read the director_numbers email (catalogue numbers by Friday).","house_2f",None,None,"all_badges"),
    S(q,2,"Ron is waiting on the Aurelith arena steps. The last battle with him (six creatures).","aurelith",None,"beat_rival_ron_6"),
    S(q,3,"Ron doesn't leave. He comes with you.","aurelith",None,"ron_in_party"),
    S(q,4,"Take the Lumen Line to Revival Heights. Eight coins get you a senior lanyard at HQ reception.","revival_hq_int",None,"has_senior_lanyard"),
    S(q,5,"Ride the lift past floor 9. Find the field team on the restricted floors.","revival_hq_upper",None,"found_field_team","has_senior_lanyard"),
    S(q,6,"[PENDING STORY CALL] The confrontation. Who is there and what happens is Gary's call.","revival_hq_upper",None,"truth_revealed"),
    S(q,7,"Everyone goes home.","revival_hq_upper",None,"finale_done"),
    S(q,8,"Home. Ron walks past you to the bin, picks up all the bags and takes them out.","brookhollow",{"x":7,"y":8},"bins_taken_out","finale_done"),
    S(q,9,"Credits.","brookhollow",None,None,"bins_taken_out"),
  ],
  reward={"items":[],"money":0,"flags":["beat_rival_ron_6","found_field_team","finale_done","bins_taken_out","!ron_in_party"]},
  lines=[
    L("ron","start",["Eight coins. Me too, nearly. Seven and a sandwich.","One more, {nick}. For old times. Then we go and get them."],f"{q}_s2"),
    L("ron","step",["Yeah. Okay. You were always going to win that one.","Head Office. In person. Like the list said. I'm coming."],f"{q}_s3"),
    L("hq_receptionist","step",["Eight coins? That's senior grade. Here's your lanyard.","The lift will stop wherever you like now. Please don't make me regret it."],f"{q}_s4"),
    L("ron","step",["My lanyard's green. Or it was. They took it back.","I'll just stand very close to you."],f"{q}_s4"),
    L("ft_teo","step",["Item one: you found us. Item two: we're all right.","Item three: is there food? That's the important one."],f"{q}_s5"),
    L("ft_marta","step",["We said back by Friday. We didn't say which Friday."],f"{q}_s5"),
    L("ft_pell","step",["Did anyone water my plants? Don't answer. I can tell."],f"{q}_s5"),
    L("ft_imke","step",["Imke is humming. Her partner hums along, a little off-key."],f"{q}_s5"),
    L("ron","step",["I'm not battling you, {nick}. I'm standing here. With you.","Big difference."],f"{q}_s6"),
    L("ron","turn_in",["Told you. Tomorrow."],f"{q}_s8","house_1f.ron ron_ending / STORY_RULINGS_SOUL #3"),
  ],
  notes=["Shape: Ron final battle (GD: ron_6 at the Aurelith arena steps, 'Ron stands beside you afterwards') -> Ron in party -> HQ restricted floors -> team found -> [pending] -> finale_done -> the bins -> credits.",
         "Hooks paid off: Greystone 'Ask Head Office. In person.', Mirefen 'Off to Head Office... Back by Friday', Lanternport 'Head Office wants our four brought in', the tower_floors email (floors 9-12 senior only; green lanyards), the director_numbers email (catalogue numbers by Friday).",
         "PENDING STORY CALL (step 6). It isn't written because these aren't canon: Vane's motive, the Vane memo, who the rebels are (the Riverbank Stranger's people?) and whether the ending releases the crystals. truth_revealed is the flag reserved for it. No line here says what the crystals do.",
         "ALTERNATIVE location: Greystone deep (B2, planned) instead of the HQ upper floors. The log pages work with both; only the lanyard step changes.",
         "ron_in_party is set from s3 until finale_done (reward flag '!ron_in_party' = clear it, same ! convention as prerequisites). The window allows: the Firefly DJ gag (STORY_RULINGS_CLUB), the sq_ron_job interview gags and Ron's bin quip (Gary ruling 1).",
         "Last beat: bins_taken_out plays the existing 'Told you. Tomorrow.' with no other dialogue (STORY_RULINGS_SOUL #3). sq_bin_day step 4 is now an after-credits look at the empty bin.",
         "finale_done triggers Text Bot's reopening email ('The Brookhollow office reopens Monday...').",
         "Field team lines are new and short. They show the voices from the brief: Teo lists, Imke hums, Marta's 'Friday', Pell plain. Text Bot to own them.",
         "Map pending: aurelith, revival_hq_int, revival_hq_upper (floors 9-12)."],
  new_ids=["has_senior_lanyard (flag) / senior_lanyard (key item, proposed)","found_field_team (flag)","bins_taken_out (flag)","beat_rival_ron_6 (flag, GD draft)","ft_teo, ft_marta, ft_pell, ft_imke (npc ids)","revival_hq_upper (map, pending)"])

# ---------------- 150 POST-GAME: WELCOME BACK ----------------
q = "mq_welcome_back"
Q(id=q, title="There Will Be Cake", zone="brookhollow", order=150, map_status="built",
  giver={"npc": "manager", "map": "office_int"}, prerequisites=["finale_done"],
  steps=[
    S(q,1,"Read the reopening email: the Brookhollow office opens Monday.","house_2f",None,None,"finale_done"),
    S(q,2,"Go to the office. The field team is back at their desks.","office_int",None,"field_team_home"),
    S(q,3,"Optional: the Firefly banner, the Lantern Rest blank stone and the Friday cake.","fernwick"),
  ],
  reward={"items":[{"id":"firefly_shake","qty":1}],"money":1000,"flags":["field_team_home"]},
  lines=[
    L("manager","start",["Sit down. Relax, this one really isn't that conversation.","Four desks. Four chairs. All full. I counted twice."],f"{q}_s2"),
    L("ft_teo","turn_in",["Item one: thank you. There's no item two.","...Fine. Item two: cake's Friday."],f"{q}_s2"),
    L("ron","after",["Bin day was yesterday. I was there. I'm a changed man, {nick}."]),
  ],
  notes=["field_team_home is the existing flag that switches on: the cake_welcome email, the Firefly 'FOUND. ALL FOUR.' banner, the Lantern Rest keeper's 'Didn't need it' line, the coworker and sq_tell_the_counter follow-ups. This quest only gives those a single trigger.",
         "Dana stays gone. She only appears in the post-game Frostspire fight (side sq_dana).",
         "Reward is a proposal."],
  new_ids=[])

# ---------------- 160 POST-GAME: AURELITH ARENA ----------------
q = "mq_aurelith_arena"
Q(id=q, title="No Breaks Between", zone="aurelith", order=160, map_status="map pending",
  giver={"npc": "arena_doorman", "map": "aurelith"}, prerequisites=["finale_done"],
  steps=[
    S(q,1,"Enter the Aurelith arena. Battle Masters back to back. No healing between battles.","aurelith_arena_int"),
    S(q,2,"Beat every Battle Master in one run.","aurelith_arena_int",None,"beat_aurelith_arena"),
  ],
  reward={"items":[{"id":"vigor_seed","qty":3}],"money":0,"flags":["beat_aurelith_arena"]},
  lines=[
    L("arena_doorman","start",["Battle Masters, one after another. No breaks, no healing.","If you need a breather, now's the time."]),
  ],
  notes=["Design doc: 8 Battle Masters, no healing. GD draft has 4 plus Ron, and asks 8 vs 15. Count is Gary's call.",
         "OPEN: prerequisite. Text Bot meta calls the arena post-game (finale_done), but the design doc opens it at all_badges. Draft uses finale_done.",
         "GD arena trainer name suggestions include 'Pell' (tr_aurelith_arena_2), which clashes with Pell Ashby. The GD owner should rename it.",
         "beat_aurelith_arena unlocks Text Bot's Dana-desk tier and sq_ticket_stub.",
         "Map pending: aurelith, aurelith_arena_int."],
  new_ids=["arena_doorman (npc, if Text Bot hasn't one)","aurelith_arena_int (map, pending)"])

NOTES_ONLY = [
  "Company task quests (design doc): repeatable catalogue jobs from the company terminal. These aren't main story, so none are drafted.",
  "Legendary Guardian quest (design doc; triggered by the company agenda; flag guardian_quest_done pending). Not main story, and it depends on the finale call. Not drafted.",
]
