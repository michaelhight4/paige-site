#!/usr/bin/env python3
"""Builds overworld_lines.json (Kilumen overworld text, draft). Re-run to regenerate + validate."""
import json, glob, os, re, textwrap, sys, ast, copy, itertools
OW = '/workspace/kilumen/art/world/overworld'
ROOT = OW
OUT = '/workspace/kilumen/text/overworld_lines.json'

def npc(pages, **kw):
    d = {"pages": pages}; d.update(kw); return d

# ---- story gate text (single source; used by maps.* guard entry and blockers.*) ----
G_BROOK_BEFORE = ["Survey in progress. East road's closed to unregistered trainers.",
                  "Bring me the Fernwick Master's coin. Yes, even if you work here."]
G_BROOK_AFTER = ["You're registered now. Road east is open. Mind the bridge, it creaks.",
                 "Heading east? Drop this parcel at the Saltmere office. They'll pay you back."]
G_BROOK_AFTER2 = ["Saltmere's past Aurelith. The parcel's not getting any lighter."]

maps = {
 "brookhollow": {
  "villager_garden": npc(["Something keeps eating my beans at night. Neat little bites. Very polite.",
                          "Probably a Tumbloam up from the river. Hard to stay mad at it."]),
  "fisher": npc(["Twenty years I've fished this river. Never seen it run this low.",
                 "Your company sent surveyors up north last spring. They never came back."]),
  "kid": npc(["My dad says Revival Tech is laying people off.",
              "Are you getting laid off? You look like you're getting laid off."],
             variants=[{"flag": "flg_promoted", "pages": [
              "You got promoted? Huh.",
              "My dad says that's what they do right before they lay you off."]}]),
  "rt_guard_east": npc(G_BROOK_BEFORE, kind="guard",
             variants=[{"flag": "beat_master_fernwick", "pages": G_BROOK_AFTER},
                       {"flag": "has_survey_parcel", "pages": G_BROOK_AFTER2}],
             gate="gate_brookhollow_east",
             note="speaks blockers.gate_brookhollow_east; first cleared talk hands over the Survey Parcel (bike quest)"),
  "sign_town": npc(["BROOKHOLLOW\nWhere the river begins.", "North: Route 1 to Fernwick. East: the bridge road."]),
  "sign_office": npc(["REVIVAL TECH\nBrookhollow Field Office", "Staff entrance. Visitors, please check in at reception."]),
  "sign_home": npc(["Your house. Ron's name is on the lease too.", "Somehow he still never takes the bins out."]),
 },
 "house_2f": {
  "player_start": npc(["...The river again. Cold water, and someone on the bank, watching.",
                       "Just a dream. Probably."], kind="spawn", note="wake-up text on new game, not an NPC")
 },
 "house_1f": {
  "ron": npc(["Morning. You look like you slept in the river.",
              "Work's been dead all week. They cleared out three desks on Friday.",
              "If layoffs are coming, I hope they wait till I've bought groceries."],
             variants=[{"flag": "flg_promoted", "pages": [
              "Field researchers. Us. I still think they mixed us up with someone else.",
              "Fernwick's first. Try to keep up."]}])
 },
 "office_int": {
  "receptionist": npc(["Morning. The manager's been asking for you two.",
                       "That's either very good or very bad. Go on in."],
                      variants=[{"flag": "flg_promoted", "pages": [
                       "Fill in your field reports on any company terminal. They do get read.",
                       "Eventually."]}]),
  "manager": npc(["Sit down. Relax, this isn't that conversation.",
                  "Our field team stopped reporting in. As of today, you two are field researchers.",
                  "Their last check-in was from Greystone Caverns. Start in Fernwick."],
                 variants=[{"flag": "flg_promoted", "pages": [
                  "Our own checkpoints only pass registered trainers. Win a Master's coin.",
                  "Fernwick's Master is the closest. Straight up Route 1."]}]),
  "coworker": npc(["They cleared out Dana's desk Friday. Nobody's said why."],
                  variants=[{"flag": "flg_promoted", "pages": [
                   "Field work, huh? The last team got a nice send-off too.",
                   "Cake and everything. Anyway. Good luck."]}]),
 },
 # heal_centre_int (healer, company_terminal) -> heal_brookhollow / heal_fernwick: see the v0.4.2 interiors block
 "shop_int": {
  "clerk": npc(["Welcome to RT Supply. Same prices as last year. Same as next year.",
                "Feeds, remedies, dominance crystals. What do you need?"])
 },
 # house_int_a/b/c are retired (OVERWORLD_README 15): scholar -> home_brookhollow_b, parent_c/kid_c -> home_fernwick_a(_2f),
 # cook -> unplaced (see the v0.4.2 interiors block)
 "route1": {
  "trainer_r1_a": npc(["You walked right into my line of sight. That's on you."],
                      battle_lost=["Okay. Fair."],
                      after=["Fernwick's straight north. Ledges only go one way, so look first."]),
  "trainer_r1_b": npc(["I've been standing here all day waiting for someone. Finally."],
                      battle_lost=["Great. All day for that."],
                      after=["Team worn out? Brookhollow's Revival Tech is south. So is Fernwick's."]),
  "trainer_r1_c": npc(["Sunmeadow's walled off, so you're getting me instead."],
                      battle_lost=["Should've stayed home."],
                      after=["That crystal wall went up the night the Frostspire shrine went quiet.",
                             "Nobody's been through since. Not even your company."]),
  "sign_r1_s": npc(["ROUTE 1 - Sunmeadow Fields", "North: Fernwick. South: Brookhollow. Northeast: Sunmeadow."]),
  "sign_r1_fork": npc(["FORK\nNorth: Fernwick. East: Sunmeadow Fields."]),
  "sign_r1_ne": npc(["SUNMEADOW FIELDS\nMeadows ahead."]),
 },
 "fernwick": {
  "ron_rival_1": npc(["There you are. I figured you'd stop to look at every bug on the way.",
                      "The company says we're each other's benchmark. Let's see where you're at."],
                     battle_lost=["Yeah, okay. You've been practicing."],
                     battle_won=["Don't sweat it. I'll go easy next time. Probably."],
                     after=["The Master's Hall is on the east side. I'm getting a sandwich first."],
                     note="rival battle 1 on first entry; after either result he gives the Trail Runners (items.running_shoes)"),
  "villager_f1": npc(["Revival Tech cut the courier routes. Mine was the last one.",
                      "Now they make field staff do the deliveries. Good luck with that."]),
  "elder": npc(["The fireflies have been dim this year.",
                "Old folks say that happens when someone digs crystals out of the hills.",
                "Thornwood's east. Stay on the trail. Folks who don't end up sleeping in it."]),
  "sign_fern": npc(["FERNWICK\nA quiet town of ferns and fireflies.", "East: Thornwood. South: Route 1."]),
  "sign_hall": npc(["MASTER'S HALL\nMaster of Fernwick (Earth)", "Challengers welcome. Wipe your feet."]),
 },
 "fernwick_hall_int": {
  "helper_1": npc(["Got through the first gate, huh? The crystals are worse."],
                  battle_lost=["The Master's tougher than me. Just saying."],
                  after=["Touch a crystal and its neighbours flip too. Don't start in the middle."]),
  "helper_2": npc(["The Master watches every fight from up there. Make it look good."],
                  battle_lost=["I'm going to hear about that later."],
                  after=["All three crystals have to glow at once. Count before you touch."]),
  "master_fernwick": npc(["Earth doesn't hurry, and neither do I. You took your time getting here.",
                          "Let's see if your team can stand its ground."],
                         battle_lost=["You held your ground. Take the Fernwick challenge coin. You earned it."],
                         after=["That coin registers you as a trainer. Brookhollow's east road is open to you.",
                                "Looking for your missing crew? Miners heard voices down in Greystone."],
                         note="sets beat_master_fernwick"),
  "guide": npc(["Two plates, one in each corner. Step on both and the first gate opens.",
                "Past that, the crystals. Each one you touch flips its neighbours.",
                "The middle one starts lit. Leave it alone at first."]),
 },
 "thornwood": {
  "trainer_tw_bug": npc(["Shh! You'll scare the Burlbeetles. They look like stumps till you step on one."],
                        battle_lost=["Fine. I wasn't catching anything anyway."],
                        after=["These paths loop back on themselves. Dead end? Look for gaps in the trees."]),
  "trainer_tw_b": npc(["The east trail's blocked, so you're stuck with me."],
                      battle_lost=["Yeah. Long day."],
                      after=["Your company says it'll move that trunk once someone important asks.",
                             "Two coins makes you important, apparently."]),
  "dissident_hint": npc(["Revival Tech ID on your belt. Of course.",
                         "Ask your bosses what happens to the creatures they 'catalogue'.",
                         "Then ask why nobody comes back. The caves are right there."],
                        note="opposition group foreshadowing; implies, never states, the testing"),
  "sign_tw": npc(["THORNWOOD\nThe trail winds.", "North: Greystone Caverns. West: Fernwick."]),
 },
 "greystone_entrance": {
  "hiker": npc(["Those ferns glow when something walks through. Doesn't mean it's friendly.",
                "A crew in Revival Tech jackets went down those stairs. Never saw them come up.",
                "North tunnel's sealed with rock. If you're going on, it's the lower floor."])
 },
 "greystone_b1": {
  "hiker_b1": npc(["That plate hums when something heavy sits on it.",
                   "Standing on it yourself won't do it. You have to leave something there.",
                   "Line the boulder up before you push. It resets if you leave the floor."],
                  after_gate=["Someone dropped a crystal case in the far room. Revival Tech label on it."])
 },
}

closed_exits = {
 "_note": "Map-edge exits marked TO COME in maps/*.json. Shown as the 'path ahead is closed' message once the story gate on that exit is cleared, until the zone is built.",
 "brookhollow": {"route_east": {"after_gate": "gate_brookhollow_east",
                 "pages": ["Road crews are still working on the bridge road.", "It's closed for now."]}},
 "route1": {"sunmeadow_fields": {"after_gate": "gate_route1_east",
                 "pages": ["Tall grass and loose crystal shards block the meadow path.", "It's not safe to go on yet."]}},
 "thornwood": {"route_revival": {"after_gate": "gate_thornwood_east",
                 "pages": ["The trail ahead is washed out.", "It's closed for now."]}},
 "greystone_b1": {"frostspire_pass": {"after_gate": None,
                 "pages": ["Cold air blows down the tunnel. Loose rock and ice block the way.", "It's not safe to go on yet."]}},
}

blockers = {
 "_note": "Ids starting gate_ that exist in maps/*.json story_gates are used as-is. Ids for unbuilt zones are proposals, named to match, from tools/progression.py ZONE_EDGES. Map 'lines.blocked/cleared' PLACEHOLDERs are replaced by before/after here.",
 "gate_brookhollow_east": {
  "role": "Revival Tech checkpoint guard", "status": "in map", "map": "brookhollow", "npc": "rt_guard_east",
  "flag": "beat_master_fernwick", "tiles": ["rt_barricade"],
  "before": G_BROOK_BEFORE, "after": G_BROOK_AFTER, "after_parcel": G_BROOK_AFTER2,
  "gives": {"item_id": "survey_parcel", "name": "Survey Parcel", "sets_flag": "has_survey_parcel",
            "received": ["{player} received the Survey Parcel!", "It's heavier than it looks. It's also taped shut. Very shut."]}
 },
 "gate_thornwood_east": {
  "role": "fallen tree", "status": "in map", "map": "thornwood", "flag": "beat_master_saltmere",
  "tiles": ["fallen_log_t", "fallen_log_m", "fallen_log_b"],
  "before": ["A huge trunk lies across the trail. A Revival Tech notice is nailed to it.",
             "REMOVAL SCHEDULED\nRequests from two-coin trainers only."],
  "after": ["Only sawdust is left where the trunk was.", "Someone carved 'FINALLY' into the stump."]
 },
 "gate_route1_east": {
  "role": "crystal barrier", "status": "in map", "map": "route1", "flag": "beat_master_frostspire",
  "tiles": ["crystal_barrier_lit", "crystal_barrier_dim"],
  "before": ["A wall of violet crystal hums across the path. It's warm to the touch.",
             "Somewhere north, something is keeping it lit."],
  "after": ["The crystals have gone dim and quiet. The way east is clear."]
 },
 "gate_frostspire_bridge": {
  "role": "collapsed bridge", "status": "proposed id (unbuilt: frostspire_pass)", "flag": "beat_master_revival",
  "proposed_npc": "rt_engineer_pass",
  "before": ["The rope bridge has snapped. Both halves are hanging off the cliffs.",
             "Engineer: Repairs get approved when someone with three coins asks."],
  "after": ["The bridge has been rebuilt. New rope, new planks.",
            "Engineer: Rated for one person at a time. So, one person at a time."]
 },
 "gate_coast_road_flood": {
  "role": "flooded path", "status": "proposed id (unbuilt: brookhollow_south_road to tidewater_coast)",
  "type": "field_skill", "skill": "tideglide", "flag": "has_tideglide", "active_when": "storm_season",
  "before": ["The coast road is underwater. Deep enough to lose a boot. Maybe both."],
  "prompt": ["The water's calm enough to cross. Use {skill}?"], "choices": ["Yes", "No"],
  "use": ["{creature} puts {skill} to work!", "Hold on. It's faster than it looks."],
  "cant_use_yet": ["A strong swimmer could carry you across, but you need {skill} first."],
  "no_creature": ["The water's too deep to wade. None of your creatures knows {skill}."],
  "after": ["You reach the far side. Mostly dry."]
 },
 "gate_cindervale_giant": {
  "role": "sleeping giant creature", "status": "proposed id (unbuilt: aurelith to cindervale)", "flag": "beat_master_lanternport",
  "species": "TBD by Gary (no giant species in characters/NOTES.md yet)",
  "before": ["A creature the size of a house is asleep on the road. It snores like a rockslide.",
             "Pushing it does nothing. Yelling does nothing. It'll take something louder."],
  "hint": ["Lanternport's lighthouse horn can be heard three towns over. Just saying."],
  "wake": ["Far off, the Lanternport horn sounds. The giant opens one eye...", "It gets up, grumbling, and lumbers off the road."],
  "after": ["There's a giant dent in the road where it slept. The way to Cindervale is open."]
 },
 "gate_saltmere_causeway": {
  "role": "flooded causeway (story, drains with the Frostspire thaw)", "status": "planned (unbuilt: saltmere to mirefen)",
  "flag": "beat_master_frostspire", "proposed_npc": "causeway_local",
  "before": ["The causeway is under knee-deep meltwater. The far end is out of sight.",
             "Local: Frostspire snowmelt. Drains when the thaw stops. Whenever that is."],
  "after": ["The water's gone down. The causeway is muddy, but you can walk it.",
            "Local: Told you. Smells like a pond that gave up, though."]
 },
 "gate_sunmeadow_north": {
  "role": "crystal field (same source as gate_route1_east)", "status": "planned (unbuilt: revival_heights to sunmeadow_fields)",
  "flag": "beat_master_frostspire",
  "before": ["Violet crystal spikes cover the slope. They hum like the Route 1 wall.",
             "There's no way down without shredding your boots. And your legs."],
  "after": ["The crystals have gone dim and quiet. You can pick your way down to Sunmeadow."]
 },
 "gate_revival_checkpoint": {
  "role": "Revival Tech security checkpoint (Heights south gate, opened from inside)", "status": "planned (unbuilt: revival_heights to saltmere)",
  "flag": "beat_master_revival", "proposed_npc": "rt_guard_heights", "opened_from": "revival_heights side",
  "sign": ["REVIVAL HEIGHTS SOUTH GATE\nResidents and senior staff only."],
  "before": ["Heights south gate. Residents and senior staff only.",
             "Field staff come in through the Thornwood trail. Long way round, I know."],
  "after": ["You beat the Heights Master? Fine. I'll open it from this side.",
            "Saltmere's straight down the hill. Saves you the long way."],
  "after_repeat": ["Gate's open for you now. Don't tell the other field staff."]
 },
 "gate_lanternport_tidelock": {
  "role": "flooded tide-lock (shortcut home, opened from the Lanternport side)", "status": "planned (unbuilt: fernwick_west_road to fernwick_west_exit)",
  "flag": "beat_master_lanternport", "proposed_npc": "lock_keeper", "opened_from": "lanternport side",
  "interaction": "lock wheel (mechanism; not a field skill or item)",
  "before": ["The tide-lock is shut. Seawater sits high against the gates.",
             "The wheel that opens it is on the far side. Of course it is."],
  "keeper_before": ["Lock stays shut till the Lanternport Master says so. Tides are no joke."],
  "keeper_after": ["Our Master's coin? Then you can work the wheel. Turn it till it clunks."],
  "prompt": ["Turn the lock wheel?"], "choices": ["Yes", "No"],
  "use": ["You put your back into it. Clunk. The water drains out of the lock."],
  "declined": ["You leave the wheel alone. The sea doesn't mind."],
  "after": ["The tide-lock is open. Fernwick is a short walk east."]
 },
 "gate_aurelith_arena": {
  "role": "sealed arena doors", "status": "planned (unbuilt: aurelith to aurelith_arena)",
  "flag": "all_badges", "proposed_npc": "arena_doorman",
  "sign": ["AURELITH ARENA\nChallengers need all eight coins."],
  "before": ["The doors are sealed. Eight empty coin slots run down the middle."],
  "doorman_before": ["You've got {coins} coins. Come back with eight.",
                     "No, I can't make an exception. Nobody gets an exception."],
  "doorman_after": ["Eight coins. Huh. Most people stop at five and blame the weather.",
                    "Go on in. Good luck. You'll need it."],
  "after": ["The doors swing open. Eight Battle Masters are waiting inside."]
 },
}

RESTRICT = "GOVERNMENT RESTRICTED AIRSPACE\nArrivals by rail only."
rail_only = {
 "_rule": "From tools/progression.py: revival_heights and aurelith are fly=False, rail=True ('Government restricted airspace: arrivals by rail only.'). Skylift can't land in or take off from these cities. Lumen Line pass flag: has_rail_pass (Revival Heights Central station).",
 "zones": ["revival_heights", "aurelith"],
 "signs": {
  "sign_airspace": [RESTRICT],
  "sign_airspace_rules": ["No riding flying creatures inside city limits.", "Violations will be fined. Repeat violations will be fined more."],
  "sign_station": ["{city} CENTRAL STATION\nLumen Line: arrivals and departures"],
  "sign_platform": None,   # v0.4.3: filled after the lines pass with the station_int timetable entry (World's text_ref for station_int.timetable)
  "sign_fares": ["Pass holders, board at any platform.", "Lost passes are not refunded. Please stop asking."],
 },
 "npcs": {
  "station_attendant": npc(["Welcome to the Lumen Line. Where are you headed?"],
                           no_pass=["You'll need a Lumen Line pass. We sell them at Revival Heights Central."],
                           confirm=["Next train to {city} leaves in a minute. Go on."],
                           after=["Mind the gap. And the guy selling 'lucky crystals'. He's not licensed."]),
  "pass_clerk": npc(["One Lumen Line pass for field staff. Revival Tech covers it.",
                     "Don't get used to it."],
                    received=["{player} received the Lumen Line Pass!"],
                    tip=["Show it at any station to ride to towns you've already visited."],
                    note="proposed giver at Revival Heights Central; sets has_rail_pass"),
  "airspace_officer": npc(["Can't fly in here. Government restricted airspace: arrivals by rail only.",
                           "Take the train like everyone else. It's honestly pretty nice."]),
  "commuter": npc(["You used to be able to just fly in.",
                   "Then somebody landed on the Council roof. Now we all take the train."]),
 },
 "skylift_blocked": {
  "take_off_here": ["{creature} won't take off here.", "Government restricted airspace: arrivals by rail only."],
  "destination_restricted": ["{city}: Government restricted airspace. Arrivals by rail only.",
                             "Head to {nearest_station} instead and take the train in."],
  "skylift_menu": ["{city}", "Government restricted airspace: arrivals by rail only."],
 },
}

def skill(what, flag, inspect, prompt, use, cant, extra=None, status="proposed"):
    d = {"status": status, "what": what, "requires_flag": flag, "inspect": inspect, "prompt": prompt,
         "choices": ["Yes", "No"], "use": use, "cant_use_yet": cant, "no_creature": ["None of your creatures knows {skill}."]}
    if extra: d.update(extra)
    return d

field_skills = {
 "_note": "Skylift and Tideglide come from tools/progression.py (marked PROPOSAL there). Brushbreak, Stonebreak and Glowcall are new proposals; no built map uses them yet.",
 "tideglide": skill("water creature carries the player across water / floodwater", "has_tideglide",
   ["The water's deep here. Too deep to wade."], ["The water's calm. Use {skill} to cross?"],
   ["{creature} puts {skill} to work. Climb on."],
   ["A strong swimmer could carry you, but you need {skill} first. Try Mirefen."],
   status="from progression.py (PROPOSAL)"),
 "brushbreak": skill("clear thick_brush tiles in optional areas (never story gates)", "TBD",
   ["Thick brush. You could get through, if you didn't mind losing a sleeve."],
   ["The brush looks dry and brittle. Use {skill}?"], ["{creature} puts {skill} to work!", "The brush snaps apart."],
   ["A creature could clear this, but you need the {coin} for field work."]),
 "stonebreak": skill("break cracked_rock tiles in optional areas (pushable boulders need no skill)", "TBD",
   ["A cracked rock. One good hit would do it."], ["The rock is cracked through. Use {skill}?"],
   ["{creature} puts {skill} to work!", "The rock crumbles into gravel."],
   ["A creature could break this, but you need the {coin} for field work."]),
 "glowcall": skill("a creature's crystal lights up a dark cave (darkness is only a vignette; never blocks the critical path)", "TBD",
   ["It's dark in here. You can barely see a few steps ahead."], ["It's too dark to see. Use {skill}?"],
   ["{creature} puts {skill} to work!", "Its crystal glows and lights up the cave."],
   ["A creature's crystal could light this place, but you need the {coin} first."]),
 "skylift": skill("flying creature carries the player to a visited town's landing spot (fly_point)", "has_skylift",
   ["Wide open sky. A flying creature could carry you from here."], ["Use {skill}? Where to?"],
   ["{creature} puts {skill} to work!"],
   ["You need {skill} first. The Frostspire Master teaches it."],
   {"indoors": ["There's a ceiling. {creature} looks at you like you've lost it."],
    "cave": ["Solid rock overhead. {creature} isn't going anywhere."],
    "on_bike_only_cell": ["Not here. Ride off the boards first."],
    "confirm": ["Head to {city}?"],
    "not_visited": ["{creature} doesn't know the way to {city}. Walk there once first."],
    "rail_only": rail_only["skylift_blocked"]["take_off_here"],
    "rail_only_destination": rail_only["skylift_blocked"]["destination_restricted"]},
   status="from progression.py and map fly_point (PROPOSAL)"),
}

items = {
 "running_shoes": {"item_id": "trail_runners", "name": "Trail Runners", "flag": "has_run_shoes",
  "giver": "fernwick.ron_rival_1", "condition": "after rival battle 1, win or lose",
  "giver_pages": ["Here. My old runners. I got new ones.",
                  "Don't make it weird. They just make me look slow."],
  "received": ["{player} received the Trail Runners!"],
  "tip": ["Hold {run_button} to run. Works everywhere, even indoors.",
          "Running through grass still stirs up wild creatures. Speed won't help."]},
 "bike": {"item_id": "courier_bike", "name": "Courier Bike", "flag": "has_bike",
  "giver": "saltmere office clerk (unbuilt; proposed id saltmere_office_clerk)",
  "condition": "deliver the Survey Parcel from rt_guard_east (has_survey_parcel)",
  "giver_pages": ["That's the parcel from Brookhollow? Finally. Thanks.",
                  "We cut the couriers, so the courier bike's just sitting here. It's yours."],
  "received": ["{player} received the Courier Bike!"],
  "tip": ["Use {bike_button} to get on or off. Bikes stay outdoors.",
          "Narrow boardwalks and jump ramps are bike only. You can't get off halfway."],
  "giver_after": ["How's the bike? Still squeaking? Yeah. It does that."],
  "indoors": ["No riding indoors. Somebody would yell at you."],
  "cave": ["Too dark and too many rocks. Walk it."],
  "boardwalk_on_foot": ["The boards are too narrow to walk on. Tyres would fit, though."],
  "ramp_on_foot": ["It's a ramp. You'd need wheels."],
  "no_dismount": ["You can't get off here. You'd end up in the marsh."]},
}
# =====================================================================================
# ---------- v0.4.0 SOUL PASS (SOUL_PLAYBOOK.md items #1, #3, #8, #10, #11, #15) ----------
# Format: every map spot gets "lines": an ordered list, most specific first, "default" last.
# The engine shows the FIRST entry whose flags are all set and whose "when" (if any) matches.
# =====================================================================================
def L(id, pages, flags=(), when=None, item=None, pending=False, **kw):
    d = {"id": id, "flags": list(flags)}
    if when: d["when"] = when
    if item: d["soul_item"] = item
    if pending: d["pending_story_call"] = True
    d["pages"] = pages; d.update(kw); return d

def prop(item, lines, default, **kw):
    """Text side of a named interact spot. kind/x/y/stand/face/tile (+ trigger_when, opens, counter, states...) are copied
    from the map's interact_spots list at merge time: World's maps are the source of truth for geometry."""
    d = {"soul_item": item, "pages": default, "_soul_lines": lines}
    d.update(kw); return d
GEOM_KEYS = ("kind", "x", "y", "stand", "face", "tile", "trigger_when", "opens", "counter", "states", "states_by_phase", "world_prop")

# ---- #1 / #15 props placed on map spots (x,y = the cell the player faces; stand = where the player stands) ----
TV_LINES = [
 L("e2_test_card", ["The static's gone. A plain test card fills the screen.", "It says THANK YOU. Nothing else."],
   flags=["guardian_quest_done"], when={"phase": "night", "hour": 3}, item="15:E2", pending=True),
 L("e2_static", ["Static. Just static.", "...The static sounds like water."], when={"phase": "night", "hour": 3}, item="15:E2"),
 L("tv_ending", ["A cooking show. A man is very upset about soup.", "Nobody's in trouble. Just the soup."],
   flags=["finale_done"], item="1", pending=True),
 L("tv_arena", ["Sports news: Aurelith's arena has a new challenger.", "The photo's blurry. It's definitely you, though."],
   flags=["all_badges"], item="1"),
 L("tv_storm", ["Storm warning for the coast road. Stay indoors.", "Two hikers missing near Frostspire. Revival Tech declined to comment."],
   flags=["storm_season"], item="1"),
 L("tv_hiring", ["Revival Tech ad: 'Now hiring field researchers!'", "'No experience needed.' Well. That explains a lot."],
   flags=["beat_master_revival"], item="1"),
]
TV_DEFAULT = ["Revival Tech ad: 'Restructuring for a brighter tomorrow.'", "You change the channel. It's the same ad."]

KID_TV_LINES = [
 L("e2_static", ["Static. Just static.", "...The static sounds like water."], when={"phase": "night", "hour": 3}, item="15:E2"),
 L("tv_storm", ["The news. Storm on the coast road, hikers missing up north.", "Upstairs, the kid groans. They wanted the cartoon."],
   flags=["storm_season"], item="1"),
]
KID_TV_DEFAULT = ["A cartoon. Two creatures are arguing over a sandwich.", "Upstairs, the kid is saying every line along with it."]

BIN_LINES = [   # v0.4.3: keyed on the bin_stages stage the tile shows (= coin COUNT, Coder overworld.js binStage()), never on single coin flags
 # Coder's picker (src/overworld/lines.js pickLine) skips a line whose bin_stage != env.binStage, and binStage is coinCount(flags)
 # (number of beat_master_* flags, 8 with all_badges, 'empty' with finale_done). So coins won out of order still pick the right line.
 L("bin_empty", ["Empty. Scrubbed clean. Not a single fly.", "Ron took the bags out. Bin day finally came."],
   flags=["finale_done"], item="3", story_ruling="STORY_RULINGS_SOUL #3", bin_stage="empty",
   note="tile bin_ron_empty, no flies overlay; E5 is missable on purpose"),
 L("bin_creature", ["Something in the bags moves.", "A Mirewump climbs out. It looks like it's been living here a while."],
   when={"count_gte": {"counter": "bin_inspects_after_8", "n": 8}, "once": True}, item="3", bin_stage="8",
   note="E5 Bin Monument pop-out: only at stage 8 before finale_done (bin_stages.e5_bin_monument); starts an encounter. Coder bumps bin_inspects_after_8 only while all_badges and not finale_done"),
 L("bin_8", ["Eight bags and a cloud of flies.", "This is no longer a bin. It's a monument."], item="3", bin_stage="8"),
 L("bin_7", ["Seven bags. The flies have invited friends.", "A neighbour left a polite note. It's in the bin."], item="3", bin_stage="7"),
 L("bin_6", ["Six bags, plus a small cloud of flies.", "The flies seem happy, at least."], item="3", bin_stage="6",
   note="bin_flies overlay starts here"),
 L("bin_5", ["Five bags. The lid gave up a while ago."], item="3", bin_stage="5"),
 L("bin_4", ["Four bags. One of them is leaking something blue."], item="3", bin_stage="4"),
 L("bin_3", ["Three bags. Ron's labelled one 'NOT MINE'.", "It's his."], item="3", bin_stage="3"),
 L("bin_2", ["Two bags now. The lid doesn't quite shut."], item="3", bin_stage="2"),
 L("bin_1", ["One bag beside the bin.", "Ron says it's going out tomorrow."], item="3", bin_stage="1"),
]
BIN_DEFAULT = ["Your bin. Ron says bin day is tomorrow.", "It's been tomorrow since spring."]

BRIDGE_LINES = [
 L("e4_driftwood", ["{lead} stares upstream.", "A driftwood staff floats past under the bridge."],
   flags=["finale_done"], item="15:E4", pending=True),
]
BRIDGE_DEFAULT = ["{lead} stares upstream for a long moment.", "Somewhere, very faintly, the river hums."]

PC_LINES = [
 L("pc_ending", ["Company inbox. One new message, and it's about cake.", "Some things never change."],
   flags=["finale_done"], item="1", pending=True),
]
PC_DEFAULT = ["Your work laptop. Company inbox, logging in..."]

BED_LINES = [
 L("dream_8", ["The river again. This time you're on the bank.", "The stranger looks at you. Nods once. That's all."],
   flags=["all_badges"], when={"dream_unseen": True}, item="15:E14"),
 L("dream_7", ["The river again. Stones under your feet now.", "The bank is close enough to touch."],
   flags=["beat_master_lanternport"], when={"dream_unseen": True}, item="15:E14"),
 L("dream_6", ["The river again. The current's weaker.", "The stranger takes one step closer."],
   flags=["beat_master_tidewater"], when={"dream_unseen": True}, item="15:E14"),
 L("dream_5", ["The river again. You grab a root.", "It holds this time. For a moment."],
   flags=["beat_master_mirefen"], when={"dream_unseen": True}, item="15:E14"),
 L("dream_4", ["The river again. Colder.", "The stranger hasn't moved. Still watching."],
   flags=["beat_master_frostspire"], when={"dream_unseen": True}, item="15:E14"),
 L("dream_3", ["The river again. Halfway to the bank now."],
   flags=["beat_master_revival"], when={"dream_unseen": True}, item="15:E14"),
 L("dream_2", ["The river again. A little closer to the bank than last time."],
   flags=["beat_master_saltmere"], when={"dream_unseen": True}, item="15:E14"),
 L("dream_1", ["The river again. Same cold water.", "Same figure on the bank."],
   flags=["beat_master_fernwick"], when={"dream_unseen": True}, item="15:E14"),
 L("nap", ["You doze off for a bit. No dreams.", "Just a really good nap."], when={"slept": True}, item="15:E14"),
]
BED_DEFAULT = ["Your bed. Unmade. It's fine. Nobody's checking."]

OFFICE_BOOK_LINES = [
 L("book_truth", ["The binders are gone. Just dust and a price sticker."], flags=["truth_revealed"], item="1", pending=True),
 L("book_handbook", ["'Employee Handbook, 9th Edition.'", "Chapter 4 is just the words 'Be Flexible.'"], flags=["beat_master_revival"], item="1"),
 L("book_field", ["'Field Safety for Beginners.' Tip one: bring a friend.", "Tip two has been torn out."], flags=["flg_promoted"], item="1"),
]
OFFICE_BOOK_DEFAULT = ["'A Short History of Crystal Binding'", "'(Abridged, Revised, Revised Again).' It gets shorter each time."]

HOUSE_B_BOOK_L = [
 L("book_shrines", ["'Shrines of the North.' Someone's underlined one line:", "'The Frostspire shrine keeps the cold honest.'"], flags=["beat_master_frostspire"], item="1"),
]
HOUSE_B_BOOK_L_DEFAULT = ["'Old River Tales.' One story is just a stranger on a riverbank, waiting.", "The last page is missing. Of course it is."]
HOUSE_B_BOOK_R = [
 L("book_bog", ["'Bog Lights and Other Nonsense.' The lights are 'just gas'.", "The author underlined 'just' three times."], flags=["beat_master_mirefen"], item="1"),
]
HOUSE_B_BOOK_R_DEFAULT = ["'Feeds and Feeding, Volume 2.'", "Volume 1 was apparently a disaster."]

COOLER_LINES = [
 L("cooler_ending", ["Glug.", "Overheard: 'So is the office open Monday or not?'"], flags=["finale_done"], item="1", pending=True),
 L("cooler_8", ["Glug.", "Overheard: 'Eight coins? From Brookhollow? Our Brookhollow?'"], flags=["all_badges"], item="1"),
 L("cooler_storm", ["Glug.", "Overheard: 'Coast office flooded again.' 'And the reports?' 'Dry. Sadly.'"], flags=["storm_season"], item="1"),
 L("cooler_tower", ["Glug.", "Overheard: 'Floors 9 to 12? Don't ask. Seriously. Don't.'"], flags=["beat_master_revival"], item="1"),
 L("cooler_coin", ["Glug.", "Overheard: 'Our two got a coin already? I owe someone lunch.'"], flags=["beat_master_fernwick"], item="1"),
 L("cooler_promoted", ["Glug.", "Overheard: 'Field researchers. That's brave. Or cheap. Probably cheap.'"], flags=["flg_promoted"], item="1"),
]
COOLER_DEFAULT = ["Glug.", "Overheard: 'Three desks cleared Friday.' 'Four, counting Dana's.'"]

DISPLAY_LINES = [
 L("e9_whose", ["The label's been changed by hand.", "It just says: '...whose was this?'"],
   flags=["truth_revealed"], when={"count_gte": {"counter": "office_display_taps", "n": 25}}, item="15:E9", pending=True),
 L("e9_stop", ["A new label: 'Please stop tapping the glass.'"],
   when={"count_gte": {"counter": "office_display_taps", "n": 25}}, item="15:E9"),
 L("e9_smudge", ["'Bonded Specimen Crystal - Property of RT.'", "There's a smudge where you keep tapping."],
   when={"count_gte": {"counter": "office_display_taps", "n": 10}}, item="15:E9"),
]
DISPLAY_DEFAULT = ["'Bonded Specimen Crystal - Property of RT.'", "It's violet and very, very still."]

DANA_LINES = [
 L("dana_gone_climbing", ["The 'Back in 5' sign has a new note under it.", "'Gone climbing. Frostspire. - D.'"], flags=["beat_aurelith_arena"], item="3",
   note="post-game: Dana is a top trainer on Frostspire (SOUL_PLAYBOOK 2.3)"),
 L("dana_photo", ["Plants, a mug, a 'Back in 5' sign.", "And now a framed photo of a mountain."], flags=["beat_master_lanternport"], item="3"),
 L("dana_watered", ["Somebody's watering Dana's plants.", "Nobody will admit to it."], flags=["beat_master_mirefen"], item="3"),
 L("dana_sign", ["A 'Back in 5' sign has appeared on Dana's desk.", "It's dusty."], flags=["beat_master_revival"], item="3"),
 L("dana_plant", ["A plant on Dana's desk now. And a mug that says 'NOT YOURS'."], flags=["beat_master_fernwick"], item="3"),
]
DANA_DEFAULT = ["Dana's desk. Cleared out.", "Just a pen and a sticky note that says 'soon'."]

BUFFER_LINES = [
 L("e8_never", ["It was never going anywhere."], flags=["beat_aurelith_arena"], item="15:E8"),
 L("e8_oiled", ["Someone's oiled the hinges.", "It's still locked."], flags=["beat_master_lanternport"], item="15:E8"),
 L("e8_padlock", ["A brand-new padlock. Same old handcar."], flags=["beat_master_frostspire"], item="15:E8"),
 L("e8_still", ["Still locked."], flags=["has_rail_pass"], item="15:E8"),
]
BUFFER_DEFAULT = ["An old handcar, chained to the buffer stop.", "It's locked."]

SOFA_LINES = [
 L("e10_lap_nap", ["You sit for a moment. {lead} climbs into your lap and falls asleep.", "Carer: Don't move. Those are the rules."],
   when={"idle_after_heal_s": 30, "once_per_day": True}, item="15:E10", effect="lead +2 Warmth, once per day"),
]
SOFA_DEFAULT = ["A soft sofa. Somebody's left a feeds magazine open on it."]

SOUL_PROPS = {
 "house_1f": {"tv": prop("1,15:E2", TV_LINES, TV_DEFAULT)},
 "home_fernwick_a": {"tv": prop("1,15:E2", KID_TV_LINES, KID_TV_DEFAULT, text_was="maps.house_int_c.tv")},
 "house_2f": {"pc": prop("1", PC_LINES, PC_DEFAULT),
              "bed": prop("15:E14", BED_LINES, BED_DEFAULT, prompt=["Lie down for a bit?"], choices=["Yes", "No"],
                          note="Yes = sleep; a new dream plays once per coin (dream_unseen), otherwise 'nap'")},
 "office_int": {"bookcase": prop("1", OFFICE_BOOK_LINES, OFFICE_BOOK_DEFAULT),
                "water_cooler": prop("1", COOLER_LINES, COOLER_DEFAULT),
                "crystal_display": prop("15:E9", DISPLAY_LINES, DISPLAY_DEFAULT),
                "dana_desk": prop("3", DANA_LINES, DANA_DEFAULT, note="Dana's desk: the desk_pc World confirmed at (12,8); clutter sprites per stage are optional")},
 "home_brookhollow_b": {"bookcase": prop("1", HOUSE_B_BOOK_L, HOUSE_B_BOOK_L_DEFAULT, text_was="maps.house_int_b.bookcase_left")},
 "home_brookhollow_b_2f": {"shelf": prop("1", HOUSE_B_BOOK_R, HOUSE_B_BOOK_R_DEFAULT, text_was="maps.house_int_b.bookcase_right")},
 "heal_brookhollow": {"sofa": prop("15:E10", SOFA_LINES, SOFA_DEFAULT, text_was="maps.heal_centre_int.sofa")},
 "heal_fernwick": {"sofa": prop("15:E10", SOFA_LINES, SOFA_DEFAULT, text_was="maps.heal_centre_int.sofa")},
 "station_int": {"rail_buffer": prop("15:E8", BUFFER_LINES, BUFFER_DEFAULT, note="handcar_locked at (18,3); handcar_new_padlock after beat_master_frostspire (world_prop)")},
 "brookhollow": {"bin_ron": prop("1,3", BIN_LINES, BIN_DEFAULT, bin_stage_default="0",
                                 note="stateful tile from map bin_stages; each line's bin_stage matches the tile shown. Stage = coin count (Coder binStage()), so lines carry no coin flags (v0.4.3)"),
                 "bridge_mid": prop("15:E4", BRIDGE_LINES, BRIDGE_DEFAULT, note="tile trigger, not an inspect; fires once per dusk")},
}

# ---- #1 wall windows (OVERWORLD_README 14.5): phase = dawn/day/dusk/night; glass art swaps per phase, text follows ----
WINDOWS = {
 ("house_1f", "window_1"): ([   # street + river side, by the front door
   L("win_storm_night", ["Rain on the glass, and the river roaring somewhere in the dark."], flags=["storm_season"], when={"phase": "night"}),
   L("win_storm", ["The street's a stream today.", "The actual stream is having a much worse day."], flags=["storm_season"]),
   L("win_3am", ["Three in the morning. The street is empty.", "Even the river sounds like it's whispering."], when={"phase": "night", "hour": 3}),
   L("win_night", ["Dark out. A few windows across the way are still lit."], when={"phase": "night"}),
   L("win_dusk", ["The street lamps flicker on, one by one.", "Somebody's calling a creature in for dinner."], when={"phase": "dusk"}),
   L("win_dawn", ["First light on the river. A heron's already at work.", "More than Ron, anyway."], when={"phase": "dawn"}),
   L("win_kids", ["Two kids across the street are playing Masters.", "One of them is pretending to be you."], flags=["beat_master_fernwick"], when={"phase": "day"}),
  ], ["Clear skies. Someone's out walking a creature.", "It very clearly wants to go home."]),
 ("house_1f", "window_2"): ([   # looks out on Ron's bin (brookhollow 7,8)
   L("win_bin_gone", ["You can't see a bin pile from here any more.", "Huh. You'd got used to it."], flags=["finale_done"], story_ruling="STORY_RULINGS_SOUL #3"),
   L("win_bin_moon", ["Moonlight on the bin pile.", "From here it almost looks like a monument. Almost."], flags=["all_badges"], when={"phase": "night"}),
   L("win_bin_flies", ["You can see the bin from here. And the flies.", "The flies can probably see you too."], flags=["beat_master_tidewater"]),
   L("win_bin_bag", ["You can see the bin from here, and the bag beside it.", "Going out tomorrow. Apparently."], flags=["beat_master_fernwick"]),
   L("win_night", ["Dark out. The street lamp buzzes like it's trying to remember a song."], when={"phase": "night"}),
   L("win_dusk", ["Dusk. Ron's bin catches the last of the light.", "It's having a nicer evening than you."], when={"phase": "dusk"}),
   L("win_dawn", ["Dawn. A bird lands on the bin lid, thinks better of it, and leaves."], when={"phase": "dawn"}),
  ], ["The bin, the lane, a bit of river.", "Prime Brookhollow view."]),
 ("house_2f", "window_1"): ([   # your room: sky
   L("win_storm", ["Rain on the roof all night.", "Ron's bucket under the leak is nearly full again."], flags=["storm_season"]),
   L("win_3am", ["Three a.m. You can hear the river from up here.", "You should probably not be awake."], when={"phase": "night", "hour": 3}),
   L("win_night", ["Stars and a thin moon.", "The kind of night that makes the room feel bigger."], when={"phase": "night"}),
   L("win_dusk", ["The sun's going down behind the field office.", "It looks almost nice. Don't tell anyone."], when={"phase": "dusk"}),
   L("win_dawn", ["The sky's going pink over the hills.", "Your alarm hasn't gone off yet. Small win."], when={"phase": "dawn"}),
  ], ["Blue sky, one cloud.", "The cloud looks like it's also avoiding work."]),
 ("house_2f", "window_2"): ([   # your room: town + field office
   L("win_office_late", ["The field office lights are still on.", "Someone's working late. Or forgot to leave."], flags=["beat_master_revival"], when={"phase": "night"}),
   L("win_night", ["Most of Brookhollow's asleep.", "The Revival Tech sign glows anyway. It always glows."], when={"phase": "night"}),
   L("win_dusk", ["Swallows dart over the rooftops, eating bugs.", "Honest work, at least."], when={"phase": "dusk"}),
   L("win_dawn", ["Dawn. Somebody two streets over is baking.", "You can smell it from here. Rude."], when={"phase": "dawn"}),
   L("win_frostspire", ["On a clear day you can just see snow on Frostspire.", "You were up there. Wild."], flags=["beat_master_frostspire"]),
  ], ["Rooftops, the office sign, the hills.", "Home. For better or worse."]),
 ("house_int_a", "window_1"): ([   # the cook's house (shared interior)
   L("win_note", ["A note is taped to the glass:", "'WELL DONE {player}! NOW EAT SOMETHING.'"], flags=["all_badges"]),
   L("win_storm", ["Rain on the glass. The cook says storms are for stew.", "Everything's for stew."], flags=["storm_season"]),
   L("win_night", ["The glass is warm from the stove.", "Someone's drawn a smiley face in it."], when={"phase": "night"}),
   L("win_dusk", ["Dusk. The window smells faintly of onions.", "Everything in here does."], when={"phase": "dusk"}),
   L("win_dawn", ["Dawn. A pot's already on behind you.", "This house runs on soup."], when={"phase": "dawn"}),
  ], ["Steam on the glass. Outside, someone's following the smell of cooking. Fair."]),
 ("house_int_b", "window_1"): ([   # the scholar's house: notes and crystals
   L("win_blind_open", ["The blind's open now.", "The scholar says there's nothing left to hide from."], flags=["truth_revealed"], pending_story_call=True),
   L("win_night", ["A star chart is pinned beside the glass.", "Half of it's crossed out. In two colours."], when={"phase": "night"}),
   L("win_dusk", ["Dusk. A street crystal's violet glow hits the glass.", "The scholar pulls the blind down."], when={"phase": "dusk"}),
   L("win_dawn", ["Dawn light falls on a stack of notes.", "They're all about crystals. Every single one."], when={"phase": "dawn"}),
  ], ["A plain view of the street.", "A sticky note on the frame says 'LOOK CLOSER'. You do. Nothing."]),
 ("house_int_b", "window_2"): ([
   L("win_bog_jar", ["A jar of bog water sits on the sill, labelled 'LIGHTS??'.", "Nothing glows. Yet."], flags=["beat_master_mirefen"]),
   L("win_storm", ["Rain. A notebook on the sill says 'STORM DATA'.", "It's damp. The data, presumably, is also damp."], flags=["storm_season"]),
   L("win_3am", ["3 a.m. and the scholar's lamp is still on.", "Window, lamp, scholar. All very awake."], when={"phase": "night", "hour": 3}),
   L("win_night", ["Night. Your reflection looks tired.", "The books behind it look smug."], when={"phase": "night"}),
  ], ["Ivy creeps round the frame.", "Someone's labelled every leaf. That's a lot of labels."]),
 ("house_int_c", "window_1"): ([   # the family house: kid, parent, TV
   L("win_drawing_8", ["The drawing on the glass has been updated.", "Eight coins now. Your head's even bigger."], flags=["all_badges"]),
   L("win_drawing_1", ["A crayon drawing is taped to the glass:", "you, holding a coin. Your head's bigger than the town."], flags=["beat_master_fernwick"]),
   L("win_night", ["Glow stars are stuck to the glass.", "Somebody ran out halfway through the moon."], when={"phase": "night"}),
   L("win_dusk", ["Dusk. Nose prints all over the glass, at kid height.", "Someone's been watching for dinner."], when={"phase": "dusk"}),
   L("win_dawn", ["Dawn. A school bag is already by the window.", "Packed. Ish."], when={"phase": "dawn"}),
  ], ["Handprints on the glass at kid height.", "Very small handprints. Very many."]),
 ("house_int_c", "window_2"): ([
   L("win_storm", ["Rain. The kid has drawn a sad face on the wet glass.", "The weather agrees."], flags=["storm_season"]),
   L("win_night", ["Across the street, a TV flickers.", "Same cartoon. Different sandwich."], when={"phase": "night"}),
   L("win_dusk", ["Dusk. Someone outside is calling a kid in for dinner.", "Not this one. Yet."], when={"phase": "dusk"}),
   L("win_dawn", ["Dawn. A small creature squeezes out the pet door.", "Off to work, apparently."], when={"phase": "dawn"}),
  ], ["A tidy garden. Well, half of it.", "The other half clearly lost a fight with a ball."]),
}
RETIRED_WINDOWS = {k: WINDOWS.pop(k) for k in [k for k in WINDOWS if k[0].startswith("house_int_")]}   # v0.4.2: -> unplaced
for (_m, _w), (_lines, _default) in list(WINDOWS.items()) + list(RETIRED_WINDOWS.items()):
    for _l in _lines: _l.setdefault("soul_item", "1")
for (_m, _w), (_lines, _default) in WINDOWS.items():
    SOUL_PROPS.setdefault(_m, {})[_w] = prop("1", _lines, _default)

# ---- 3. new signs World placed without an id yet (OVERWORLD_README "pending Text Bot ids") ----
# Keyed by map + cell. proposed_id is a PROPOSAL for World; Text Bot never assigns ids. As soon as a map has a sign,
# pending sign or interact spot at that cell, the build moves the text to maps.<map>.<world id> automatically.
SIGNS_AWAITING_ID = {
 "route1": {"22,17": dict(proposed_id="sign_r1_ledge", next_to="below the y16 south-only ledge (x18-22), beside the gap north to the pond meadow; trail bend apron (23-25,18-20)",
   lines=[L("default", ["FERNWICK: north past the pond, then west.", "Ledges only go one way: down. Plan ahead."])])},
 "thornwood": {
  "21,8": dict(proposed_id="sign_tw_junction", next_to="trail apron below the Greystone warp (17,5); shortcut row y7 runs west to the y8 ledges (one way back to Fernwick); east and south via x28-29 to the east trail",
   lines=[L("default", ["NORTH: Greystone Caverns.\nWEST: Fernwick, by the ledges (one way).", "SOUTH-EAST: the trail to Revival Heights."])]),
  "19,24": dict(proposed_id="sign_tw_east", next_to="south clearing apron; corridor x20 up to rows 21-22, east to the fallen log gate_thornwood_east (33,21-23) and the Revival Heights exit",
   lines=[L("open", ["EAST: Revival Heights.\nNORTH: back toward Fernwick.", "Someone has crossed out 'CLOSED' and written 'about time'."], flags=["beat_master_saltmere"]),
          L("default", ["EAST: Revival Heights.\nNORTH: back toward Fernwick.", "Trail closed past the bend. Fallen tree. Removal 'scheduled'."])])},
 "brookhollow": {
  "12,2": dict(proposed_id="sign_bh_north", next_to="north exit to Route 1 (x10-11, y0)",
   lines=[L("default", ["NORTH: Route 1 and Sunmeadow Fields.", "Fernwick is past the fields. Stay on the trail."])]),
  "29,11": dict(proposed_id="sign_bh_barricade", next_to="Revival Tech barricade gate_brookhollow_east (32,12-13), guard rt_guard_east at (31,11)",
   lines=[L("open", ["ROAD EAST OPEN\nMind the bridge.", "Under it, in pen: 'it creaks'."], flags=["beat_master_fernwick"]),
          L("default", ["ROAD EAST CLOSED\nRevival Tech survey in progress.", "Registered trainers only. Ask the guard."])])},
}

# ---- pending-text spots requested by World Design (mirefen_bog, station_int) ----
SOUL_PENDING_SPOTS = {
 "mirefen_bog": {
  "mirefen_angler": npc(["Fish? In this bog? No. I just like the quiet.",
                         "Stay on the boards. The mud takes boots and doesn't give them back."],
                        _soul_lines=[L("angler_glide", ["Saw you crossing on {lead}. The frogs were furious."], flags=["has_tideglide"], item="8"),
                                     L("angler_storm", ["Storm's got the whole bog stirred up.", "Even the frogs went home."], flags=["storm_season"], item="8")]),
  "mirefen_sign": npc(["MIREFEN BOG\nStay on the boardwalk.", "Narrow boards are bikes only. Lights over the water are not a path."]),
 },
 "station_int": {   # v0.4.3: SPARE map (World, 8:20 PM CT). Text parked here; rail_only.<path> named by World's text_ref is the same entry
  "station_clerk": dict(rail_only["npcs"]["station_attendant"]),
  "station_traveller": dict(rail_only["npcs"]["commuter"]),
  "restricted_airspace": npc([RESTRICT]),
  "timetable": npc(["LUMEN LINE DEPARTURES\nEvery 20 minutes, give or take.", "Stops: Saltmere, Lanternport, Revival Heights, Aurelith."],
                   note="stops = rail towns in progression.py TOWNS; confirm list with World. Replaces the old rail_only.signs.sign_platform text "
                        "('Government restricted airspace: arrivals by rail only.' / 'Lumen Line, platform 1.'), which the restricted_airspace board already says"),
 },
}

SOUL_PENDING_SPOTS["lantern_rest"] = {
 "keeper": npc(["This lantern holds the spark of my old friend.", "Folk come here to sit. You can too. No rush.",
                "The blank stone? That's for the field team. Until they come home."],
               _soul_lines=[L("keeper_home", ["Didn't need it. Best kind of stone to lose."], flags=["field_team_home"], item="14",
                              story_ruling="STORY_RULINGS_SOUL #14")],
               status="draft: Story Bot tone check (STORY_RULINGS_SOUL #14)"),
 "stone_1": npc(["MARTA OLLEN & PIP\nWalked every morning. Both of them."]),
 "stone_2": npc(["TOMAS REED & SORREL\nHe fished. She ate the fish. Fair trade."]),
 "stone_3": npc(["AUNTIE BEA & DUMPLING\nKept the kettle on for the whole street."]),
 "stone_4": npc(["JONAH WEST & MOSS\nLost every race. Never once minded."]),
 "stone_5": npc(["IRIS KANE & TALLOW\nShe read aloud. He pretended to listen."]),
 "stone_6": npc(["OLD HAL & CINDER\nFixed every roof in Fernwick.", "Cinder supervised."]),
 "stone_7": npc(["NELL ASHBY & BRAMBLE\nTaught half the town to swim.", "Bramble taught the other half."]),
 "stone_8": npc(["DESMOND PRICE & OTTO\nSang off-key at every wedding.", "Otto howled along."]),
 "stone_blank": npc(["An uncarved stone. Someone keeps the moss off it."],
                    _soul_lines=[L("bench", ["A small bench where the blank stone used to be.", "It's warm from the sun."], flags=["field_team_home"], item="14",
                                   story_ruling="STORY_RULINGS_SOUL #14", note="map flag_swaps: memorial_stone_blank -> memorial_bench")]),
}
for k in SOUL_PENDING_SPOTS["lantern_rest"]:
    if k.startswith("stone_") and k != "stone_blank":
        SOUL_PENDING_SPOTS["lantern_rest"][k].update(soul_item="14", status="draft: Story Bot tone check (STORY_RULINGS_SOUL #14)")

# ---- #3 / #8 / #10 flag lines added to existing NPC spots (prepended before the converted old variants) ----
SOUL_NPC_LINES = {
 ("house_1f", "ron"): [
  L("ron_ending", ["Told you. Tomorrow."], flags=["bins_taken_out"], item="3", story_ruling="STORY_RULINGS_SOUL #3; QUESTS.md ruling 1 (Story Bot, Oct 23 12:31 AM)",
    note="the only line in the bin payoff beat; plays in main mq_finale s8, the last beat before the credits (bins_taken_out)"),
  L("ron_bin_quip", ["Don't look at it, {nick}. It can tell when you look at it."], flags=["ron_in_party"], item="3", story_ruling="QUESTS.md sq_bin_day s3b (Story Bot, Oct 23 12:31 AM)",
    note="sq_bin_day s3b: Ron's one bin quip while he travels with you (all_badges to finale). Story Bot draft line, kept as written."),
  L("ron_8", ["Eight coins, {nick}. I'll do the bins tomorrow.", "To celebrate."], flags=["all_badges"], item="3"),
  L("ron_storm", ["Rain got into the bin bags. The whole street smells like soup.", "Not my fault, {nick}. Weather's not my department."], flags=["storm_season"], item="3"),
  L("ron_three", ["Three coins, three bags. We're basically even, {nick}.", "Bins go out tomorrow. Probably."], flags=["beat_master_revival"], item="3"),
  L("ron_unnamed", ["You still haven't named {lead}? Fine.", "I'm calling it Crumb. Don't fight me on this, {nick}."],
    flags=["beat_master_fernwick"], when={"lead_has_nickname": False}, item="10"),
  L("ron_named", ["How's {lead} doing? Good name, by the way. Better than mine."],
    flags=["beat_master_fernwick"], when={"lead_has_nickname": True}, item="10"),
 ],
 ("fernwick", "ron_rival_1"): [],
 ("brookhollow", "fisher"): [
  L("fisher_glide", ["Saw you riding that river. Show-off.", "{lead} looked like it was having fun, at least."], flags=["has_tideglide"], item="8"),
  L("fisher_coins", ["Coins so far: {coins}? Not bad for a desk worker."], flags=["beat_master_fernwick"], item="8"),
  L("fisher_dusk", ["Fish bite better off the bridge at dusk.", "Don't tell anyone."], when={"phase": "dusk"}, item="8",
    note="fisher stands on the bridge at Dusk (SOUL_PLAYBOOK 2.2); position is World/Coder's"),
 ],
 ("brookhollow", "kid"): [
  L("kid_ending", ["I had a really good laid-off joke for today.", "...I forgot it. I think I'm out of material."], flags=["finale_done"], item="8", pending=True),
  L("kid_8", ["Eight coins and they still haven't laid you off? Weird.", "My dad says it's a 'retention strategy'."], flags=["all_badges"], item="8"),
  L("kid_tower", ["My dad says your company has floors nobody's allowed on.", "Bet that's where they keep the layoffs."], flags=["beat_master_revival"], item="8"),
  L("kid_coin", ["You got a coin? Does that mean you can't get laid off?", "My dad says nobody's that safe."], flags=["beat_master_fernwick"], item="8"),
  L("kid_school", ["Where was I earlier? School. Obviously."], when={"phase": "dusk", "weekday": "mon-fri"}, item="8",
    needs="1.4 weekday clock (next tier, not approved); kid is absent on weekday Day phase",
    disabled_until="weekday (1.4 weekday clock). Coder's picker has no weekday case, so this line never matches until then; kid_dusk covers dusk meanwhile"),
  L("kid_dusk", ["Homework's done. Mostly.", "Don't tell my dad about the 'mostly'."], when={"phase": "dusk"}, item="8",
    fallback_for="kid_school", note="v0.4.3 stand-in for kid_school using supported keys only (phase); claims no weekday"),
 ],
 ("brookhollow", "villager_garden"): [
  L("garden_lead", ["Is that {lead}? It's eyeing my beans.", "I'm watching you, {lead}."], flags=["beat_master_fernwick"], item="8"),
 ],
 ("brookhollow", "rt_guard_east"): [
  L("guard_8", ["Eight coins. I'm supposed to salute you now.", "I'm not going to. But I'm supposed to."], flags=["all_badges"], item="8"),
 ],
 ("office_int", "receptionist"): [
  L("recep_8", ["Eight coins! I put it in the newsletter. Nobody reads the newsletter.", "Say hi to {lead} for me."], flags=["all_badges"], item="8"),
  L("recep_lead", ["Morning, {player}. And good morning, {lead}.", "I keep a list of everyone's partners. It's not weird. It's admin."],
    flags=["beat_master_fernwick"], item="8"),
 ],
 ("office_int", "manager"): [
  L("manager_coin", ["A coin already. Good. Keep the reports coming.", "And keep looking for the field team. Greystone first."], flags=["beat_master_fernwick"], item="8"),
 ],
 ("office_int", "coworker"): [
  L("coworker_still", ["You again. Still not let go? Good for you.", "Genuinely. Cake's on Friday, by the way. No idea whose."], flags=["beat_master_saltmere"], item="3"),
 ],
 ("heal_brookhollow", "heal_brookhollow_carer"): [
  L("healer_lead", ["Welcome back. {lead} again?", "It always looks a bit smug after a rest. Want me to rest your team?"],
    flags=["beat_master_fernwick"], when={"lead_has_nickname": True}, item="8"),
 ],
 ("shop_int", "clerk"): [
  L("clerk_regular", ["Back again. Same prices. I like that about us.", "Feeds, remedies, dominance crystals. What do you need?"], flags=["beat_master_frostspire"], item="8"),
 ],
 ("home_fernwick_a", "home_fernwick_a_parent"): [
  L("parent_coin", ["He saw your coin and hasn't stopped talking about it.", "Thanks for that. Really."], flags=["beat_master_fernwick"], item="8"),
 ],
 ("home_fernwick_a_2f", "home_fernwick_a_kid"): [
  L("kidc_8", ["You got all eight?! Okay. New plan.", "I'm beating YOU."], flags=["all_badges"], item="8"),
 ],
 ("fernwick", "elder"): [
  L("elder_ending_night", ["I've lost count. There's too many tonight.", "Isn't that something?"], flags=["finale_done"], when={"phase": "night"}, item="8", pending=True),
  L("elder_night_31", ["Shh. Counting fireflies.", "Thirty-one tonight. Used to be over a hundred."], flags=["beat_master_lanternport"], when={"phase": "night"}, item="8"),
  L("elder_night_58", ["Shh. Counting fireflies.", "Fifty-eight tonight. Fewer than last time."], flags=["beat_master_revival"], when={"phase": "night"}, item="8"),
  L("elder_night", ["Shh. I'm counting. Seventy-four... seventy-five..."], when={"phase": "night"}, item="8"),
  L("elder_lead", ["You've got {lead} with you. Good. Creatures notice things.", "If it ever won't go near a hillside, listen to it."], flags=["beat_master_fernwick"], item="8"),
 ],
 ("fernwick", "villager_f1"): [
  L("courier_bike", ["That's the old courier bike! Mine had a basket.", "Somebody stole the basket. I have my suspicions."], flags=["has_bike"], item="8"),
 ],
}
# Ron's battle opener carries the bin gag (SOUL_PLAYBOOK 6.1 / 2.3) and {nick}.
maps["fernwick"]["ron_rival_1"]["pages"] = ["There you are, {nick}. Bin day's tomorrow. It's fine.",
                                            "The company says we're each other's benchmark. Let's see where you're at."]
maps["fernwick"]["ron_rival_1"]["soul_item"] = "3,10"

# ---- v0.4.2 interiors (OVERWORLD_README 15/15.1, qa/interiors_hookup/DOOR_TABLE.md) ----
# World keeps the placed ids of every new interior in maps/<map>.json text_pending {npcs, signs, interact_spots};
# the validator treats them exactly like npcs/signs/interact_spots. Rules (GAME_QUALITY_CHECKLIST, "Time of day, recolours
# and interior reuse"): shared designs (heal chain, H1-H4 homes) must read right in any town and never name a wall, floor
# or rug colour (recolours are per door); town flavour only through when.zone lines; interiors stay on the day grade, so
# phase lines indoors talk about people and sounds, never the room's light.
HEAL_AFTER = ["All rested. Energy's back to full.", "Try not to run them on empty this time."]
HEAL_DECLINED = ["Okay. They'll still be tired later, just so you know."]
TERMINAL_DEFAULT = ["Revival Tech terminal. Logging in with your employee ID...",
                    "Storage, company tasks and sell orders. Your Kilindex syncs here too."]
STAFF_DOOR_LINES = [
 L("door_card", ["STAFF ONLY", "Your Branch Access Card blinks green. Click."], flags=["has_branch_card"],
   note="door is a normal warp once has_branch_card is set (locked_warps); this line only shows if the sign is still read"),
]
STAFF_DOOR_DEFAULT = ["STAFF ONLY\nBranch Access Card required.", "Under it, in biro: 'Knock. We won't answer.'"]
SUGGESTION_LINES = [
 L("box_crystal", ["A suggestion's been pinned up: 'Why are the crystals violet?'", "Reply, in neat pen: 'Great question!'"],
   flags=["beat_master_revival"], item="8.2e"),
]
SUGGESTION_DEFAULT = ["SUGGESTION BOX\n'Tell us how we did!'", "Pinned beside it: 'More chairs.' Reply: 'Noted!'"]
BULLETIN_LINES = [   # World: "The Revival Tech Bulletin, issue rotates with story progress"
 L("bulletin_final", ["THE REVIVAL TECH BULLETIN, final issue:", "'Under New Management: Us.'"], flags=["finale_done"], pending=True),
 L("bulletin_eight", ["THE REVIVAL TECH BULLETIN:", "'Field staff earns all eight coins. HR asks: how?'"], flags=["all_badges"]),
 L("bulletin_hq", ["THE REVIVAL TECH BULLETIN:", "'HQ thanks field staff for record catalogue numbers.'"], flags=["beat_master_revival"]),
 L("bulletin_coin", ["THE REVIVAL TECH BULLETIN:", "'One of our own wins a coin! Parking space pending.'"], flags=["beat_master_fernwick"]),
 L("bulletin_field", ["THE REVIVAL TECH BULLETIN:", "'Two of our own head into the field. Wish them luck!'"], flags=["flg_promoted"]),
]
BULLETIN_DEFAULT = ["THE REVIVAL TECH BULLETIN:", "'Welcome, new lab techs!' Page two is a soup recipe."]
LEAD_LINE = SOUL_NPC_LINES.pop(("heal_brookhollow", "heal_brookhollow_carer"))[0]

def heal_signs():
    return {"staff_door_locked": npc(STAFF_DOOR_DEFAULT, _soul_lines=[dict(l) for l in STAFF_DOOR_LINES]),
            "suggestion_box": npc(SUGGESTION_DEFAULT, _soul_lines=[dict(l) for l in SUGGESTION_LINES]),
            "newsletter": npc(BULLETIN_DEFAULT, _soul_lines=[dict(l) for l in BULLETIN_LINES])}

maps["heal_brookhollow"] = {   # SHARED heal chain: default must work in any town; town lines via when.zone
 "heal_brookhollow_carer": npc(["Welcome to Revival Tech. Want me to rest your team?", "Staff rest for free. Company policy."],
   _soul_lines=[dict(LEAD_LINE),
                L("carer_field_brookhollow", ["Brookhollow branch. Field team? Sit, sit.", "You look like weather. Want me to rest your team?"],
                  flags=["flg_promoted"], when={"zone": "brookhollow"}),
                L("carer_field", ["Field team? Sit, sit. You look like weather.", "Want me to rest your team?"], flags=["flg_promoted"]),
                L("carer_brookhollow", ["Welcome to Revival Tech, Brookhollow branch.", "Lab ID? Staff rest is free. Want me to rest your team?"],
                  when={"zone": "brookhollow"})],
   after_heal=HEAL_AFTER, declined=HEAL_DECLINED, text_was="maps.heal_centre_int.healer"),
 "heal_brookhollow_technician": npc(["Recalibrate and polish. Every crystal comes out the same shade.", "Company standard. I don't make the rules. I polish."],
   _soul_lines=[L("tech_night", ["Late shift. Just me, the polisher and the hum.", "It hums in a key. I've checked."], when={"phase": "night"}),
                L("tech_brookhollow", ["River damp gets into the polisher here.", "Brookhollow's the only branch that issues towels."], when={"zone": "brookhollow"})]),
 "heal_brookhollow_storage_user": npc(["Box three is all Tumbloams. I don't know how it happened.", "I do know. I just don't like to talk about it."]),
 **heal_signs(),
}
maps["heal_fernwick"] = {   # UNIQUE (8.5-E: the Fernwick branch needs its own state), so the town is named in the default
 "heal_fernwick_carer": npc(["Welcome to Revival Tech, Fernwick branch.", "Quiet today. It's always quiet. Want me to rest your team?"],
   _soul_lines=[dict(LEAD_LINE),
                L("carer_coin", ["Fernwick's own coin on a field researcher. Look at you.", "Want me to rest your team?"], flags=["beat_master_fernwick"])],
   after_heal=HEAL_AFTER, declined=HEAL_DECLINED, text_was="maps.heal_centre_int.healer",
   note="8.5-E: after the side story the parent from home_fernwick_a also works here (Story/World to add the NPC)"),
 "heal_fernwick_technician": npc(["Polishing crystals. Fernwick folk ask me to go gentle.", "I go the same speed for everyone. Gently, though."],
   _soul_lines=[L("tech_night", ["Late shift. The elder's out by the pond again.", "Counting. She always waves when she loses count."], when={"phase": "night"})]),
 "heal_fernwick_storage_user": npc(["I'm renaming all my creatures after cheeses.", "Brie's doing great. Cheddar bites."]),
 **heal_signs(),
}
for _hm in ("heal_brookhollow", "heal_fernwick"):
    SOUL_PROPS[_hm]["company_terminal"] = prop("1", [], TERMINAL_DEFAULT, text_was="maps.heal_centre_int.company_terminal",
                                                note="opens storage / company tasks; the company inbox is shared with maps.house_2f.pc")

maps["home_brookhollow_a"] = {   # SHARED design H1 (hearth cottage)
 "home_brookhollow_a_owner": npc(["Sit by the fire if you like. Everyone does.", "The kettle's always on. The fire's mostly for show."],
   _soul_lines=[L("owner_ron", ["You live with Ron? From the field office?", "I'm so sorry. Have a biscuit."], flags=["flg_promoted"], when={"zone": "brookhollow"}),
                L("owner_storm", ["Storm weather. Best seat in town is right here.", "By the fire. Not by the window. Trust me."], flags=["storm_season"]),
                L("owner_brookhollow", ["Brookhollow folk keep a fire going even in summer.", "Habit. River damp gets into everything."], when={"zone": "brookhollow"})]),
}
maps["home_brookhollow_b"] = {   # UNIQUE (E13 The Fireside Book: the scholar + his bookcase)
 "scholar": npc(["A dominance crystal doesn't catch a creature. It binds your soul to it.",
                 "That's why they fight for you. The brochure leaves that part out."], text_was="maps.house_int_b.scholar",
                note="E13: gives the Fireside Book after the Kilindex reaches 150 (needs a Coder counter/when key; text not written yet)"),
 "home_brookhollow_b_parent": npc(["Don't get him started on crystals. Oh, too late? Sorry.", "Dinner's at six. He'll be late. He's always 'nearly done'."],
   _soul_lines=[L("parent_shrines", ["He's reading the shrine book again. Out loud.", "At dinner. Every night. Pass the salt."], flags=["beat_master_frostspire"], item="1")]),
}
maps["home_brookhollow_b_2f"] = {
 "home_brookhollow_b_kid": npc(["Dad says don't touch the top shelf.", "So obviously I've read all of it."],
   _soul_lines=[L("kid_bog", ["The bog book's the best one. It's mostly about gas.", "Dad says it's 'not the point'. It's a bit the point."], flags=["beat_master_mirefen"], item="1")]),
}
maps["home_fernwick_a"] = {   # UNIQUE (8.5-E The Kid's Last Joke)
 "home_fernwick_a_parent": npc(["He can't beat his sister at cards, but sure.",
                                "Each town Master gives out a coin. Get all eight and Aurelith lets you in."], text_was="maps.house_int_c.parent_c",
   note="the kid's 'beat all eight' line is upstairs now (home_fernwick_a_2f)"),
}
maps["home_fernwick_a_2f"] = {
 "home_fernwick_a_kid": npc(["When I grow up I'm beating all eight Battle Masters in Aurelith. In a row."], text_was="maps.house_int_c.kid_c"),
}
maps["home_fernwick_c"] = {   # SHARED design H2 (lodge, fishing corner)
 "home_fernwick_c_hobbyist": npc(["Tying flies. The fishing kind.", "Twelve years at it. I've caught one fish. It was very small."],
   _soul_lines=[L("hobby_glide", ["You ride the river now? Wave at the fish for me.", "They never wave back. Rude, fish."], flags=["has_tideglide"]),
                L("hobby_fernwick", ["Best fishing near Fernwick is the pond.", "The elder says I scare the fireflies. I'm very quiet."], when={"zone": "fernwick"})]),
}
maps["home_lanternport_c"] = {   # SHARED design H3 (family home); first door is in Fernwick
 "home_lanternport_c_parent": npc(["Sorry about the mess. We have a kid.", "That's the whole explanation."],
   _soul_lines=[L("parent_fernwick", ["We moved to Fernwick for the quiet.", "Then we had a kid. So much for that."], when={"zone": "fernwick"}),
                L("parent_lanternport", ["You can hear the harbour bell from here.", "Every hour. Even the ones you'd rather sleep through."], when={"zone": "lanternport"})]),
}
maps["home_lanternport_c_2f"] = {
 "home_lanternport_c_kid": npc(["I'm building a fort. You can't come in.", "...The password's 'please'. Okay, you can come in."],
   _soul_lines=[L("kid_coin", ["You've got a coin? Can I hold it?", "I won't run off with it. Probably."], flags=["beat_master_fernwick"]),
                L("kid_fernwick", ["I'm going to be the Fernwick Master one day.", "I've already got the frown. Look."], when={"zone": "fernwick"}),
                L("kid_lanternport", ["When the storms come in I pretend the house is a ship.", "Captain's orders: no bedtime."], when={"zone": "lanternport"})]),
}
maps["home_saltmere_a"] = {   # SHARED design H4 (seaside); no doors yet
 "home_saltmere_a_hobbyist": npc(["Ship in a bottle. Forty-third attempt.", "The first forty-two are in the shed. Don't open the shed."],
   _soul_lines=[L("hobby_saltmere", ["Saltmere salt gets into everything. Even the glue.", "Especially the glue."], when={"zone": "saltmere"})]),
}
maps["lab_brookhollow"] = {   # UNIQUE: starter choice (got_starter) + 8.1 onboarding; the choice scene itself is Story/Coder's
 "lab_brookhollow_researcher": npc(["Morning. The three cradles are ready when you are.", "Take your time. You'll be together a long while."],
   _soul_lines=[L("res_field", ["Field researcher now? Bring {lead} by sometimes.", "The lab's too quiet without the noise."], flags=["flg_promoted", "got_starter"],
                      note="needs both: the line names {lead}. World lists got_starter as a side flag, so starter-vs-promotion order is Story's; either order reads right"),
                L("res_starter", ["How's {lead} settling in? Good appetite?", "Keep it fed and it'll keep you out of trouble. Mostly."], flags=["got_starter"])]),
 "lab_brookhollow_aide": npc(["Tip: the Kilindex logs every creature you meet, not just the ones you catch.", "Meet everything. Write it down. That's the job."],
   _soul_lines=[L("aide_field", ["Send us notes from the road!", "Your Kilindex syncs at any branch terminal."], flags=["flg_promoted"])]),
 "terminal": npc(["LUMEN LAB RESEARCH TERMINAL\nLogged in: Lead Researcher.", "Open tab: 'Cradle temperature log.' Very boring. Very important."]),
}
for _i in (1, 2, 3):
    maps["lab_brookhollow"][f"cradle_{_i}"] = npc([f"A crystal cradle, humming softly.", f"The label says 'Batch 3, unit {_i}'."],
        _soul_lines=[L("cradle_after", ["A crystal cradle, humming softly.", "The lab keeps every cradle warm, full or not."], flags=["got_starter"], pending=True,
                       note="which cradle is empty after the choice is Story/Coder's; neutral until then")],
        note="story-gated: the starter choice scene owns the real interaction")
maps["rt_branch_backroom"] = {   # UNIQUE: story hook behind STAFF ONLY (has_branch_card); story contents stay with Story Bot
 "rt_backroom_manager": npc(["This is my break. Fifteen minutes.", "I've been on it since Tuesday."],
   _soul_lines=[L("manager_card", ["A Branch Access Card? Then you saw nothing.", "And neither did I. Want a biscuit?"], flags=["has_branch_card"])]),
 "roster": npc(["SHIFT ROSTER\nEarly, late, late, early, late.", "Someone wrote 'ASK DANA' in every empty slot."]),
}

# ---- v0.4.2 lines with no home yet (old window spots, the cook's gift) + new text for TVs/bookcases that have no spot ----
def _with_default(lines, default): return [dict(l) for l in lines] + [L("default", default)]
unplaced = {"_note": "Text with no map spot yet. Nothing here is shown in game until World adds the spot (proposed_spot = Text Bot's suggestion only; "
                     "ids are World's). 'text_was' = where the text used to live. Older unplaced NPC text stays in unplaced_npcs.",
            "windows": {"_note": "The new interiors have no window tiles, so the 5 window spots on the retired house_int_a/b/c have no home. "
                                 "Kept word for word. If World adds wall windows to the unique homes, house_int_b -> home_brookhollow_b and "
                                 "house_int_c -> home_fernwick_a fit as they are; house_int_a follows the cook."},
            "npcs": {}, "props": {}}
for (_m, _w), (_lines, _default) in RETIRED_WINDOWS.items():
    unplaced["windows"][f"{_m}.{_w}"] = {"text_was": f"maps.{_m}.{_w}", "soul_item": "1", "proposed_spot": None, "lines": _with_default(_lines, _default)}
unplaced["npcs"]["station_int.restricted_airspace_officer"] = {
 "text_was": "rail_only.npcs.airspace_officer", "proposed_spot": None,
 "_note": "v0.4.3: Character models removed this sprite id from npc_sprite_map; station_int is a spare map and its restricted_airspace "
          "board already reads 'GOVERNMENT RESTRICTED AIRSPACE / Arrivals by rail only.' Kept word for word for a future rail-only city "
          "officer (revival_heights / aurelith). Id is the old sprite-map id, not a new one.",
 "lines": None}   # filled after the lines pass
unplaced["npcs"]["house_int_a.cook"] = {
 "text_was": "maps.house_int_a.cook", "gives": "Berry Snack", "gift": "once",
 "_note": "Gives a Berry Snack once. Proposed home: home_brookhollow_b_parent, who stands at that kitchen (unique house, so a one-time gift "
          "is unambiguous), as a first once-only line. Second choice: home_brookhollow_a_owner by the hearth (shared H1).",
 "proposed_spot": {"map": "home_brookhollow_b", "npc": "home_brookhollow_b_parent"},
 "lines": [L("default", ["I made way too much. Here, take a Berry Snack before it goes to waste."])],
 "after": ["That was the last one. I'm not made of berries."]}
_P = lambda m, x, y, stand, face, tile, pid: {"map": m, "proposed_id": pid, "x": x, "y": y, "stand": stand, "face": face, "tile": tile}
unplaced["props"].update({
 "home_brookhollow_b.tv": {"proposed_spot": _P("home_brookhollow_b", 3, 3, [3, 4], "up", "i_tv", "tv"),
   "lines": [L("default", ["A nature programme about crystals.", "The scholar has paused it to argue with it."])]},
 "home_lanternport_c.tv": {"proposed_spot": _P("home_lanternport_c", 3, 3, [3, 4], "up", "i_tv", "tv"), "_note": "shared H3: works in any town",
   "lines": [L("tv_night", ["A late film, sound down low.", "Someone fell asleep on the remote."], when={"phase": "night"}),
             L("default", ["A cooking show. Someone is burning onions with total confidence."])]},
 "home_brookhollow_a.bookcase": {"proposed_spot": _P("home_brookhollow_a", 2, 2, [2, 3], "up", "i_bookcase", "bookcase"), "_note": "shared H1",
   "lines": [L("default", ["'The Hearth Cookbook.' Every recipe starts:", "'First, light the fire.' Every one ends: 'Now sit down.'"])]},
 "home_fernwick_c.bookcase": {"proposed_spot": _P("home_fernwick_c", 9, 2, [9, 3], "up", "i_bookcase", "bookcase"), "_note": "shared H2",
   "lines": [L("default", ["'Knots for Anglers.' Every page is bent at the same knot.", "It's the easy one."])]},
 "home_lanternport_c.bookcase": {"proposed_spot": _P("home_lanternport_c", 5, 2, [5, 3], "up", "i_bookcase", "bookcase"), "_note": "shared H3",
   "lines": [L("default", ["Picture books, a board game and one tax form.", "The tax form is hiding. Understandable."])]},
 "home_saltmere_a.bookcase": {"proposed_spot": _P("home_saltmere_a", 2, 2, [2, 3], "up", "i_bookcase", "bookcase"), "_note": "shared H4",
   "lines": [L("default", ["'Tides and Times.' A tide table forty years out of date.", "Someone still checks it every morning."])]},
 "home_fernwick_a.bookcase": {"proposed_spot": _P("home_fernwick_a", 6, 2, [6, 3], "up", "i_bookcase", "bookcase"),
   "lines": [L("default", ["Cookbooks, a road atlas and a folder marked", "'BILLS (OPEN LATER)'. It's a thick folder."])]},
})

# ---- v0.4.4: World adopts proposals by putting the spot id in maps/*.json (interact_spots or text_pending). ----
# Data-driven: only spots World has actually placed move over (word for word); the rest stay in unplaced. Never invents ids.
def _world_spot_ids(m):
    try: _j = json.load(open(f"{OW}/maps/{m}.json"))
    except FileNotFoundError: return set()
    return {s.get("id") for s in _j.get("interact_spots", []) + _j.get("text_pending", {}).get("interact_spots", [])}
ADOPTED = []
for _key in ["home_brookhollow_b.tv", "home_lanternport_c.tv", "home_brookhollow_a.bookcase", "home_fernwick_c.bookcase",
             "home_lanternport_c.bookcase", "home_saltmere_a.bookcase", "home_fernwick_a.bookcase"]:
    _m, _sp = _key.split(".")
    if _sp not in _world_spot_ids(_m) or _sp in SOUL_PROPS.get(_m, {}): continue
    _e = unplaced["props"].pop(_key)
    # text moves word for word; World's tools/world_data.py text_spots() still builds these spots from unplaced.props proposed_spot,
    # so a geometry-only anchor (no lines) stays until World hard-codes them (like WINDOWS). Without it, run.py --check drops the spots.
    if False: unplaced["props"][_key] = {"anchor_only": True, "proposed_spot": _e["proposed_spot"], "moved_to": f"maps.{_m}.{_sp}",
        "_note": "Geometry anchor only, no text. The text lives at moved_to. Remove once World's text_spots() lists this spot itself."}
    _ls = [dict(l) for l in _e["lines"]]
    for _l in _ls: _l.setdefault("soul_item", "1")
    SOUL_PROPS.setdefault(_m, {})[_sp] = prop("1", [l for l in _ls if l["id"] != "default"], _ls[-1]["pages"], text_was=f"unplaced.props.{_key}")
    ADOPTED.append(f"unplaced.props.{_key} -> maps.{_m}.{_sp}")
for (_om, _ow), (_nm, _nw) in {("house_int_b", "window_1"): ("home_brookhollow_b", "window_1"), ("house_int_b", "window_2"): ("home_brookhollow_b", "window_2"),
                               ("house_int_a", "window_1"): ("home_brookhollow_b", "window_kitchen"),
                               ("house_int_c", "window_1"): ("home_fernwick_a", "window_1"), ("house_int_c", "window_2"): ("home_fernwick_a", "window_2")}.items():
    if _nw not in _world_spot_ids(_nm): continue
    unplaced["windows"].pop(f"{_om}.{_ow}")
    _lines, _default = RETIRED_WINDOWS[(_om, _ow)]
    SOUL_PROPS.setdefault(_nm, {})[_nw] = prop("1", _lines, _default, text_was=f"unplaced.windows.{_om}.{_ow} (was maps.{_om}.{_ow})")
    ADOPTED.append(f"unplaced.windows.{_om}.{_ow} -> maps.{_nm}.{_nw}")
if not [k for k in unplaced["windows"] if not k.startswith("_")]:
    unplaced["windows"] = {"_note": "v0.4.4: all 5 retired windows now have World spots (home_brookhollow_b, home_fernwick_a). Nothing left here."}
# lap nap: World/Animator made it a tile trigger (idle 30 s on the seat after a heal, Trail Buddy out). The line moves off the sofa inspect.
for _hm in ("heal_brookhollow", "heal_fernwick"):
    if "lap_nap_seat" not in _world_spot_ids(_hm): continue
    ADOPTED.append(f"maps.{_hm}.sofa (e10_lap_nap line) -> maps.{_hm}.lap_nap_seat")
    SOUL_PROPS[_hm]["sofa"]["_soul_lines"] = []
    SOUL_PROPS[_hm]["lap_nap_seat"] = prop("15:E10", [], SOFA_LINES[0]["pages"], effect="lead +2 Warmth, once per day",
        text_was=f"maps.{_hm}.sofa.e10_lap_nap",
        note="tile trigger, not an inspect. Fires only when Animator's lap_nap hook runs (after a heal this visit, Trail Buddy out, once per day); the Carer says page 2")

# ---- top-level sections for lines with no map spot ----
company_inbox = {
 "_note": "Shared by maps.house_2f.pc, maps.heal_brookhollow.company_terminal and maps.heal_fernwick.company_terminal. Show every email whose flags are all set, newest (highest index) first. pending_story_call emails stay neutral.",
 "emails": [
  L("fridge_friday", ["Anything left in the breakroom fridge by Friday goes in the bin.", "This includes the soup. You know whose soup."], frm="Facilities", subject="Fridge clean-out Friday"),
  L("restructure_1", ["We are restructuring for a brighter tomorrow.", "No action is needed from you at this time."], frm="HR", subject="An update on restructuring"),
  L("cake_1", ["Cake in the breakroom, Friday at 3.", "If you know who's leaving, please let us know."], frm="Facilities", subject="Cake on Friday"),
  L("printer", ["The printer is not broken. It is 'pending maintenance'.", "Please stop kicking it. It knows."], frm="IT", subject="Re: printer (floor 1)"),
  L("new_role", ["Congratulations on your new role, Field Researcher!", "Your pay will be reviewed at a later date."], flags=["flg_promoted"], frm="HR", subject="Your new role"),
  L("greystone_cancelled", ["This event has been cancelled by the organiser."], flags=["flg_promoted"], frm="Calendar", subject="Cancelled: Field team check-in (Greystone)"),
  L("restructure_2", ["Earlier we said 'restructuring'. We meant 'rightsizing'.", "No action is needed from you at this time."], flags=["beat_master_fernwick"], frm="HR", subject="An update on our update"),
  L("coin_on_file", ["Your Fernwick coin is on file. Company checkpoints will let you through.", "Please don't lose it. We don't have a form for that."], flags=["beat_master_fernwick"], frm="Field Ops", subject="Coin registered"),
  L("ron_sandwich", ["you near a shop? bring me a sandwich", "not a joke. starving. thanks {nick}"], flags=["beat_master_fernwick"], frm="Ron", subject="lunch??", item="3,10"),
  L("parcel_chase", ["Is the parcel on its way? It's been 'on its way' for a while."], flags=["has_survey_parcel"], frm="Saltmere Office", subject="Re: that parcel"),
  L("lucky_phish", ["Dear valued employee. You have won one (1) lucky crystal!", "Reply with your employee ID and a small handling fee."], flags=["beat_master_saltmere"], frm="Revival Tech Payroll (?)", subject="URGENT: claim your bonus crystal", item="3"),
  L("phish_warning", ["That 'bonus crystal' email was not from Payroll.", "Payroll does not give out bonuses. We checked."], flags=["beat_master_saltmere"], frm="IT", subject="Do NOT reply to the bonus crystal email"),
  L("cake_2", ["Cake in the breakroom Friday at 3.", "We still don't know who's leaving. It's a nice cake, though."], flags=["beat_master_saltmere"], frm="Facilities", subject="Cake on Friday (again)", item="3"),
  L("bike_terms", ["The Courier Bike is company property.", "Please return it in the condition received. Squeak included."], flags=["has_bike"], frm="Saltmere Office", subject="Courier bike: terms of use"),
  L("restructure_3", ["We're no longer 'rightsizing'. We're 'refocusing talent'.", "Some talent will be refocused elsewhere."], flags=["beat_master_revival"], frm="HR", subject="An update on our update on our update"),
  L("tower_floors", ["Floors 9 to 12 are for senior staff only.", "If your lanyard is green, the lift won't stop there. Please stop trying."], flags=["beat_master_revival"], frm="Revival Heights Security", subject="Reminder: restricted floors"),
  L("tint_drift", ["Units showing tint drift must be booked in for recalibration.", "Drift is a defect. Please don't get attached to it."], flags=["beat_master_revival"], frm="Field Ops", subject="Tint drift: recalibration", story_ruling="STORY_RULINGS_SOUL #7"),
  L("rail_receipts", ["Your pass works on every Lumen Line service.", "Receipts must be filed within 3 days. Nobody has ever done this."], flags=["has_rail_pass"], frm="Travel Desk", subject="Your Lumen Line Pass"),
  L("no_comment", ["If asked about the Frostspire shrine, say 'no comment'.", "If asked why, also say 'no comment'."], flags=["beat_master_frostspire"], frm="Field Ops", subject="Media enquiries"),
  L("yoghurt", ["To whoever keeps taking my labelled yoghurt:", "It has my name on it. That's what the label is for. - M."], flags=["beat_master_frostspire"], frm="Breakroom", subject="MY yoghurt"),
  L("cake_3", ["Cake Friday. Lemon this time.", "If it's your send-off, please tell someone. It's getting weird."], flags=["beat_master_frostspire"], frm="Facilities", subject="Cake on Friday (sorry)", item="3"),
  L("storm_protocol", ["Field staff on the coast should shelter during storms.", "Field reports are still due on time."], flags=["storm_season"], frm="Field Ops", subject="Storm protocol"),
  L("bog_census", ["Mirefen census numbers are down again this month.", "Please count more carefully. - Data Team"], flags=["beat_master_mirefen"], frm="Data Team", subject="Low counts, Mirefen"),
  L("water_safety", ["Please confirm you've read the water safety guide.", "There is no water safety guide yet. It's being written."], flags=["has_tideglide"], frm="HR", subject="Water safety form"),
  L("recal_full", ["Recalibration slots are full until further notice.", "Please stop booking your own team in. You know who you are."], flags=["beat_master_lanternport"], frm="Field Ops", subject="Re: Tint drift: recalibration", story_ruling="STORY_RULINGS_SOUL #7"),
  L("dana_ooo", ["I'm out of the office. I'll reply when I'm back.", "If it's urgent, it can probably wait. - Dana"], flags=["beat_master_tidewater"], frm="Dana (auto-reply)", subject="Out of office", item="3"),
  L("fog_thursday", ["The lighthouse keeper says rain on Thursday. He's always right.", "We're ignoring him, as usual."], flags=["beat_master_lanternport"], frm="Lanternport Office", subject="Weather note"),
  L("disregard", ["Please disregard the previous memo.", "There was no previous memo. Please disregard this one too."], flags=["beat_master_cindervale"], frm="HR", subject="Please disregard"),
  L("director_numbers", ["The Director's office congratulates you on eight coins.", "Please send your team's catalogue numbers by Friday."], flags=["all_badges"], frm="Office of the Director", subject="Congratulations", pending=True),
  L("cake_welcome", ["Cake Friday. It says WELCOME BACK.", "First one in a long time that isn't a goodbye."], flags=["field_team_home"], frm="Facilities", subject="Cake on Friday (a good one)", item="3", story_ruling="STORY_RULINGS_SOUL #3"),
  L("reopening", ["The Brookhollow office reopens Monday. There will be cake.", "We know who's leaving this time. Nobody."], flags=["finale_done"], frm="All Staff", subject="Monday", item="3", pending=True),
 ],
}
for e in company_inbox["emails"]:
    e["from"] = e.pop("frm"); e.setdefault("soul_item", "1")

ron_nicknames = {
 "_note": "Fills {nick}. First entry whose flags are all set wins; pick one of 'nicks' at random per conversation.",
 "lines": [
  L("nick_ending", None, flags=["finale_done"], pending=True, nicks=["{player}"], note="payoff: Ron finally uses your real name"),
  L("nick_8", None, flags=["all_badges"], nicks=["Champ", "Coin Hoarder"]),
  L("nick_late", None, flags=["beat_master_lanternport"], nicks=["Partner"]),
  L("nick_mid", None, flags=["beat_master_revival"], nicks=["Big Shot", "Fancy Lanyard"]),
  L("nick_coin", None, flags=["beat_master_fernwick"], nicks=["Hotshot", "Coin Kid"]),
  L("nick_promoted", None, flags=["flg_promoted"], nicks=["Rookie", "Field Agent"]),
  L("default", None, nicks=["Roomie", "Sleepyhead"]),
 ],
}
for e in ron_nicknames["lines"]:
    e.pop("pages"); e["soul_item"] = "10"

ron_battle_openers = {
 "_note": "8 escalating bin openers, one per Ron battle (STORY_RULINGS_SOUL #3). #1 is maps.fernwick.ron_rival_1 page 1. #2-#8 are unplaced future battles with proposed ids; Story Bot owns the battle beats.",
 "ron_rival_saltmere": [L("default", ["One bag by the bin now. It's fine, {nick}.", "Tomorrow."])],
 "ron_rival_revival_heights": [L("default", ["Two bags. Maybe three. Doesn't matter.", "Bin day's tomorrow. Let's go, {nick}."])],
 "ron_rival_frostspire": [L("default", ["The bags froze to the bin last night.", "That's basically storage. Ready, {nick}?"])],
 "ron_rival_mirefen": [L("default", ["This bog smells like bag five.", "Bag five and I aren't speaking, {nick}."])],
 "ron_rival_tidewater": [L("default", ["The flies have names now.", "Don't ask me their names, {nick}."])],
 "ron_rival_lanternport": [L("default", ["The neighbour left a note about the bins.", "I'm choosing to battle you instead, {nick}."])],
 "ron_rival_cindervale": [L("default", ["The bags have a smell now. Not ours. Their own.", "Tomorrow, {nick}. I mean it this time."])],
}
for k, v in ron_battle_openers.items():
    if not k.startswith("_"):
        for e in v: e["soul_item"] = "3,10"

vane = {
 "_note": "Director Hollis Vane only ever says the catalogue number ({rt_number}), never a nickname. All lines neutral: motive and ending are Story Bot's call. Proposed npc id: director_vane (unplaced).",
 "lines": [
  L("vane_rt0000", ["A creature logged under the name 'RT-0000'. Very funny.", "Its number is {rt_number}. Use it."], when={"party_nickname": "RT-0000"}, pending=True, note="myth seed (SOUL_PLAYBOOK 1.3)"),
  L("vane_8", ["Eight coins. {rt_number} did most of the work, I imagine."], flags=["all_badges"], pending=True),
  L("vane_named", ["You've given {rt_number} a name. That's your business.", "The catalogue only needs the number."], when={"lead_has_nickname": True}, pending=True),
  L("default", ["The Brookhollow hire. And this is {rt_number}.", "Keep it healthy. Keep it logged."], pending=True),
 ],
}
for e in vane["lines"]: e["soul_item"] = "10"

catalogue = {
 "_note": "Catch flow and Kilindex labels (SOUL_PLAYBOOK 1.3). {rt_number} = full catalogue number, e.g. RT-0147.",
 "nickname_prompt": ["Log it as {rt_number}, or give it a name?"],
 "choices": ["Log it", "Name it"],
 "logged": ["Logged as {rt_number}."],
 "named": ["{name} it is. Logged as {rt_number}."],
 "kilindex_labels": {"catalogue_id": "Catalogue ID", "called": "Called"},
 "soul_item": "10",
}

comfort = {
 "_note": "SOUL_PLAYBOOK item #11 (7.x / 5.6). Labels are short UI strings; help/prompt texts are pages.",
 "soul_item": "11",
 "run_mode": {"label": "Running", "options": ["Hold to run", "Always run"],
              "help_hold": ["Hold {run_button} to run."],
              "help_always": ["You run by default. Hold {run_button} to walk."],
              "locked": ["You'll need the Trail Runners first."]},
 "hush_spray": {"used": ["You used a Hush Spray.", "Wild creatures will keep their distance for a while."],
                "wore_off_prompt": ["The Hush Spray wore off. Use another? ({spray_left} left)"],
                "choices": ["Yes", "No"], "default_choice": "Yes",
                "wore_off_last": ["The Hush Spray wore off. That was your last one."]},
 "text_speed": {"label": "Text speed", "options": ["Slow", "Normal", "Fast", "Instant"],
                "help": ["Hold {confirm_button} to show the whole page at once."]},
 "bag_pockets": {"care": {"label": "Care", "help": ["Remedies and treatments for your team."]},
                 "feeds": {"label": "Feeds", "help": ["Snacks and meals. Some creatures are picky."]},
                 "gear": {"label": "Gear", "help": ["Things your creatures can hold."]},
                 "crystals": {"label": "Crystals", "help": ["Dominance crystals for new team members."]},
                 "key": {"label": "Key Items", "help": ["Important things. You can't sell these."]},
                 "logs": {"label": "Mail & Logs", "help": ["Letters, notes and pages you've found."]}},
 "bag_sort": {"label": "Sort", "options": ["Recent", "Name", "Type"]},
 "hotkeys": {"register_prompt": ["Put {item} in a quick slot?"], "choices": ["Quick slot 1", "Quick slot 2", "Cancel"],
             "assigned": ["{item} is now on {hotkey}."], "replaced": ["{item} replaced {old_item} on {hotkey}."],
             "not_allowed": ["{item} can't go in a quick slot."], "empty": ["Nothing on {hotkey} yet. Pick an item from your bag."],
             "hint": ["Tip: field gear you use a lot, like the Courier Bike, fits in a quick slot."]},
}

unplaced_npcs = {
 "lucky_crystal_seller": {"soul_item": "3", "proposed_npc": "lucky_crystal_seller",
  "_note": "Appears in each city; product gets worse each time (SOUL_PLAYBOOK 2.3). His crystals are plain glass (STORY_RULINGS_SOUL #3): never imply they do anything. 'zone' = the zone he stands in.",
  "lines": [
   L("seller_ending", ["Clear crystals. 100% nothing.", "Finally honest."], flags=["finale_done"], story_ruling="STORY_RULINGS_SOUL #3"),
   L("seller_aurelith", ["Last one. Signed. By me.", "Collector's item. Very lucky. Probably."], when={"zone": "aurelith"}),
   L("seller_cindervale", ["Fireproof lucky crystal! Tested in my kitchen.", "Once."], when={"zone": "cindervale"}),
   L("seller_lanternport", ["Glow-in-the-dark lucky crystal. Glows for a bit.", "Then it's a rock. Still lucky, though."], when={"zone": "lanternport"}),
   L("seller_revival", ["Lucky crystal, now pocket-sized!", "Same one as before. I filed it down."], when={"zone": "revival_heights"}),
   L("seller_saltmere", ["Lucky crystal, now with 30% more luck.", "Don't ask 30% of what."], when={"zone": "saltmere"}),
   L("default", ["Lucky crystal! Brings luck. Pretty much guaranteed.", "Looks a lot like glass. That's how you know it's lucky."]),
  ],
  "declined": ["Your loss. Literally. Of luck."]},
}

# =====================================================================================
# ---------- v0.4.6 THE FIREFLY (Fernwick juice bar + music hangout) ----------
# Sources: drafts/club_front_room_v0.2.md (Story tone check passed), drafts/club_back_room_v0.1.md (tone check passed),
# design/STORY_RULINGS_CLUB.md (incl. 'R2 DECIDED BY GARY': back room open from the first visit, no gate flag).
# maps/club_int.json does not exist yet (World is building it), so everything sits in unplaced_npcs / unplaced.club_props
# with map 'club_int', text_pending, and NO geometry. Gary's juice-bar rule: no drink/drug/smoke hints (validator BAN_DRINK).
# Time of day: the club's daytime lines carry when.phase 'day' (+ a 'dawn' copy) and go first, so the lines after them
# are the Dusk/Night lines (phases are dawn|day|dusk|night). 'first' lines use when.once.
# Every draft line is kept word for word; a line too long for one page is split across pages at a sentence break (CLUB_FIT_LOG).
# =====================================================================================
CLUB_FIT_LOG = []
def _fits(t): return len(textwrap.wrap(t, 40)) <= 2
def club_pages(where, *texts):
    out = []
    for t in texts:
        if _fits(t): out.append(t); continue
        parts = re.split(r'(?<=[.!?])\s+', t); cur = ''; got = []
        for p in parts:
            if cur and not _fits(cur + ' ' + p): got.append(cur); cur = p
            else: cur = (cur + ' ' + p).strip()
        got.append(cur); out += got
        CLUB_FIT_LOG.append({"where": where, "draft": t, "pages": got})
    return out
def CL(where, id, texts, **kw): return L(id, club_pages(f"{where}.{id}", *texts), **kw)
def _daytime(where, texts):
    return [CL(where, "day", texts, when={"phase": "day"}), CL(where, "dawn", texts, when={"phase": "dawn"})]
CLUB = {"map": "club_int", "text_pending": True, "proposed_spot": None}
POSTGAME_FLAG = "field_team_home"   # Story Bot ruling (9:14 PM CT): the reunion is post-game, after finale_done
FINALE_FLAG = "finale_done"   # finished tune (Story Bot ruling)
CLUB_RULING = "Story Bot club calls, Oct 22 2026 9:14 PM CT"
CAMP_FLAGS = {"thornwood": "camp_restored_thornwood", "greystone": "camp_restored_greystone",
              "frostspire": "camp_restored_frostspire", "mirefen": "camp_restored_mirefen"}

W = "unplaced_npcs.rebel_bouncer"
unplaced_npcs["rebel_bouncer"] = {**CLUB, "npc": "rebel_bouncer", "role": "door, front room",
  "_note": "First line = back-room draft fix (Gary R2: back room open from the first visit). The front-room draft's 'Back room isn't. In you go.' is dropped.",
  "lines": _daytime(W, ["We're open. Nobody's dancing yet, though. Give it till dusk."]) + [
   CL(W, "first", ["Revival Tech lanyard. Huh. Fine.", "Dance floor's for dancing, back room's for looking. Be decent."], when={"once": True}),
   CL(W, "default", ["Mind the step. And the DJ."])]}

W = "unplaced_npcs.rebel_bartender"
unplaced_npcs["rebel_bartender"] = {**CLUB, "npc": "rebel_bartender", "role": "juice and snack counter keeper (id unchanged)", "display_role": "juice counter",
  "_note": "Runs the place. Sells juices, teas and shakes only (system_item_catalogue: pond_berry_juice, mossberry_shake, fern_mint_tea, firefly_shake). Somebody's aunt.",
  "lines": _daytime(W, ["Wiping down the juice counter. Come back at dusk, or grab a cloth."]) + [
   CL(W, "first", ["Welcome to The Firefly, love. No violet in here. Just juice and music."], when={"once": True}),
   CL(W, "default", ["Your {lead} looks thirsty. Pond Berry Juice should sort that out."])],
  "shop_greeting": club_pages(f"{W}.shop_greeting", "Juices, teas and shakes. I'm somebody's aunt."),
  "stock": ["pond_berry_juice", "mossberry_shake", "fern_mint_tea", "firefly_shake"]}

W = "unplaced_npcs.rebel_dj"
_dj_night = []
for _st in ("dusk", "night"): pass
unplaced_npcs["rebel_dj"] = {**CLUB, "npc": "rebel_dj", "role": "DJ; owns the side story 'The Missing Note'",
  "_note": ("Side story 'The Missing Note' (STORY_RULINGS_CLUB, approved). flg_record_1..4 count records found, in any order: picking up an old record sets "
            "the lowest unset flg_record_N (Coder), so 'That's one!' always means the first one found. Records sit in Fernwick, Thornwood, Route 1 and Lanternport "
            "(World placed fernwick, thornwood and route1 as map items old_record; Lanternport held in unplaced.club_props.missing_note_records). The DJ's line follows the highest record count found, so finding two before a visit never plays them out of order. "
            "The tune stays unresolved until finale_done, then tune_finished plays. No Warmth charm (Story Bot ruling): the firefly lantern is the only reward."),
  "lines": _daytime(W, ["Zzz... da, da, dum, da...", "He's asleep in the booth, still humming."]) + [
   CL(W, "tune_finished", ["Last note turned up. Turns out the tune was always meant to end there."], flags=[FINALE_FLAG], story_ruling=CLUB_RULING,
      note="finished tune after the ending; first Dusk/Night line (below day/dawn, so the DJ is still asleep by day after the ending)"),
   CL(W, "ron_gag", ["Ron: Don't look at me, {nick}. I'm protesting too.", "DJ: Little toy-piano number. This one's for your mate there."],
      flags=["ron_in_party"], when={"once": True}, story_ruling=CLUB_RULING,
      note="Optional gag: Ron dances once, badly; the DJ plays the toy-piano Ron motif. ron_in_party approved by Story Bot; Coder sets the flag (true while Ron travels with the player). Speaker tags added because two people talk."),
   CL(W, "note_close", ["Still missing one. It'll turn up."], flags=["flg_missing_note_started", "flg_missing_note_done"]),
   CL(W, "note_reward", ["Four. That's all of them. Let me stitch it together...", "Take this firefly lantern. Warms up a room. Warms up a camp, too."],
      flags=["flg_missing_note_started", "flg_record_4"], gives="firefly_lantern", sets_flag="flg_missing_note_done"),
   CL(W, "note_record_3", ["Three. Someone hummed this exact bit to me once. Odd."], flags=["flg_missing_note_started", "flg_record_3"]),
   CL(W, "note_record_2", ["Two. Strings now. Starting to sound like a river."], flags=["flg_missing_note_started", "flg_record_2"]),
   CL(W, "note_record_1", ["That's one! Hear that bassline? Always meant to be there."], flags=["flg_missing_note_started", "flg_record_1"]),
   CL(W, "note_intro", ["Dreamed this tune years back. Five notes. I only ever get four.",
                        "Five notes, and the last one's gone. Reckon it's on an old record.", "Four of mine went missing years back. Find them?"],
      when={"once": True}, sets_flag="flg_missing_note_started", note="first Dusk/Night talk: the draft's dream line, then the side-story intro"),
   CL(W, "default", ["Hum along if you know the ending. Nobody ever does."])]}
del _dj_night

for _pid, _role, _day, _first, _default in [
  ("rebel_patron_1", "protest-poster artist (painted crystal)", "Getting posters done before the crowd. Don't tell the landlord.",
   "Painted my Cindrip's crystal to match her scales. Still a crystal. Feels more like hers now.", "New poster's drying. 'Names, not numbers.' Catchy, right?"),
  ("rebel_patron_2", "greenhouse guy (sees both sides)", "Here for the tea. And the quiet, before that lot turns up.",
   "A wild one wrecked my greenhouse last spring. Tomatoes everywhere.", "I'm with this lot on most things. But wild creatures can still be dangerous. Both true."),
  ("rebel_patron_3", "bad dancer ('it's a protest')", "Practising. The protest needs work.",
   "This isn't bad dancing. It's a protest.", "Against what? Rhythm, mostly.")]:
    W = f"unplaced_npcs.{_pid}"
    _fin = [CL(W, "tune_finished", ["Now THAT I can dance to. Badly."], flags=[FINALE_FLAG], story_ruling=CLUB_RULING,
               note="finished tune after the ending; first Dusk/Night line (below day/dawn, which still show by day after the ending)")] if _pid == "rebel_patron_3" else []
    unplaced_npcs[_pid] = {**CLUB, "npc": _pid, "role": _role, "lines": _daytime(W, [_day]) + _fin + [
        CL(W, "first", [_first], when={"once": True}), CL(W, "default", [_default])]}

W = "unplaced_npcs.rebel_paint_vendor"
unplaced_npcs["rebel_paint_vendor"] = {**CLUB, "npc": "rebel_paint_vendor", "role": "crystal-paint vendor, back room. Cosmetic only: no stats, no Warmth, the crystal stays on",
  "lines": _daytime(W, ["Pots are drying. Come back later, or don't touch anything wet."]) + [
   CL(W, "first", ["Your creature, your colour. Still a crystal, sure. Doesn't have to look like theirs."], when={"once": True}),
   CL(W, "evening", ["Every pot's mixed by hand. Took me three weeks to get a Cindrip's shade right."], when={"once_per_day": True}),
   CL(W, "default", ["Paint's cosmetic. Won't make anyone stronger. Just makes them look like themselves."])],
  "shop_prompt": club_pages(f"{W}.shop_prompt", "Paint {lead}'s crystal?"), "choices": ["Paint it", "Not now"],
  "after_paint": club_pages(f"{W}.after_paint", "There. Suits {lead} far better. Mind the paint, it's still drying."),
  "note": "Shop open at Dusk/Night (daytime line says the pots are drying); Coder decides if the prompt also runs by day. Choice 'Paint it' = cosmetic recolour only."}

# ---- back room: MISSING wall (club_back_room_v0.1.md; R2 staging) ----
_BANNER = ["A banner: FOUND. ALL FOUR.", "Scrawled under it: \"Party's on. Juice is free.\""]
def _wall(where, texts, active_when=None, camp=None):
    ls = [L("postgame", _BANNER, flags=[POSTGAME_FLAG], story_ruling=CLUB_RULING,
            note="post-game reunion (after finale_done): every flyer and note is replaced by the banner (World: one banner tile over the wall). field_team_home is a proposed flag (World/Coder to confirm).")]
    pg = club_pages(f"{where}.default", *texts)
    if camp:
        ls.append(L("camp_found", pg[:2] + ["A hand-drawn tick, and: FOUND THE CAMP. NOT THEM."], flags=[CAMP_FLAGS[camp]],
                    note=f"camp-restored variant ({CAMP_FLAGS[camp]}, World flag; map flag_swaps club_note -> club_note_tick)"))
    ls.append(L("default", pg))
    d = {**CLUB, "area": "back room", "lines": ls}
    if active_when: d["active_when"] = active_when
    return d
unplaced["club_props"] = {"_note": ("The Firefly back room (Gary R2: open from the first visit, no gate flag). No club_int map yet: ids here are proposals for World, no geometry. "
    "Tier 0 is always on the wall. Location notes appear with active_when (tier flag) so they never name a place too early. "
    f"Post-game banner uses {POSTGAME_FLAG} (Story Bot ruling: the reunion comes after finale_done; proposed flag). Camp-restored flags are World flags.")}
_CP = unplaced["club_props"]
for _k, _t in [("missing_team_flyer", ["MISSING: Revival Tech field team. Four of them.", "Last check-in: Greystone. Seen them? Tell the juice counter."]),
               ("missing_pell", ["MISSING: Pell Ashby. Probably drawing something. Please interrupt him."]),
               ("missing_marta", ["MISSING: Marta Quill. Will rate your lunch out of ten. Be ready."]),
               ("missing_teo", ["MISSING: Teo Brack. Has a list. You're probably on it."]),
               ("missing_imke", ["MISSING: Imke Sorrel. If you hear humming, that's her. Follow it."]),
               ("flyer_lost_creature", ["LOST: one Tumbloam. Answers to Biscuit. Rolls away when called. Do not chase downhill."]),
               ("flyer_open_mic", ["Open-mic night, every week. Bring a song. Bring earplugs if Dov signs up."]),
               ("poster_names", ["NAMES, NOT NUMBERS.", "Underneath, smaller: \"(Seriously. Ask them their names.)\""])]:
    _CP[f"club_int.{_k}"] = _wall(f"unplaced.club_props.club_int.{_k}", _t)
GREYSTONE_RULING = "Story Bot ruling, Oct 22 2026 10:04 PM CT (STORY_RULINGS_CLUB 'Camp placement' correction): Greystone B1 has no flag gate, so note_greystone moves to tier 1, beat_master_fernwick. Wording unchanged."
for _k, _tier, _camp, _t in [
  ("note_thornwood", "beat_master_fernwick", "thornwood", "Someone saw an empty tent off the Thornwood path. Ferns grown right over it."),
  ("note_greystone", "beat_master_fernwick", "greystone", "A courier swears there's a cold camp stove somewhere in the Greystone dark."),
  ("note_frostspire", "beat_master_revival", "frostspire", "Lights seen up by Frostspire, past the old rope bridge. Nobody's gone to look."),
  ("note_mirefen", "beat_master_frostspire", "mirefen", "A Mirefen fisher pulled a field notebook from the reeds. Says their camp can't be far.")]:
    _CP[f"club_int.{_k}"] = _wall(f"unplaced.club_props.club_int.{_k}", [_t], active_when=_tier, camp=_camp)
    _CP[f"club_int.{_k}"]["pinned_under"] = "club_int.missing_team_flyer"
_CP["club_int.note_greystone"]["story_ruling"] = GREYSTONE_RULING
items["firefly_lantern"] = {"item_id": "firefly_lantern", "name": "Firefly Lantern", "flag": "flg_missing_note_done",
  "giver": "maps.club_int.rebel_dj (note_reward line)", "condition": "side story 'The Missing Note': all four old records found",
  "giver_pages": club_pages("items.firefly_lantern.giver_pages", "Take this firefly lantern. Warms up a room. Warms up a camp, too."),
  "received": ["{player} received the Firefly Lantern!"],
  "note": "Cosmetic reward for the player's room / camp (STORY_RULINGS_CLUB). proposed item id. giver_pages mirror the DJ's line word for word; 'received' follows the bike/runners pattern."}
_CP["missing_note_records"] = {"map": "lanternport", "text_pending": True, "proposed_spot": None, "lines": None,
  "item": "old_record", "text_ref": "system_items.picked_up",
  "placed": {"fernwick.old_record": [27, 5], "thornwood.old_record": [5, 15], "route1.old_record": [20, 23]},
  "held": ["lanternport (record 4, held until that map exists)"],
  "_note": "Four old records for 'The Missing Note'. Three are placed by World as map items[] (id old_record, item old_record; pickup flags item_<map>_old_record). "
           "Pickup uses system_items.picked_up with {item} = system_item_catalogue.old_record, so no extra lines; any pickup sets the lowest unset flg_record_N (Coder). "
           "Only the Lanternport record stays unplaced here."}

# ---- v0.4.8: World built club_int (qa/club/README.md) with our ids: club text moves to maps.club_int.<same id> ----
CLUB_MOVED = []
def _to_map(e):
    e = {k: v for k, v in e.items() if k not in ("map", "text_pending", "proposed_spot", "npc", "area")}
    ls = e.pop("lines"); assert ls[-1]["id"] == "default" and not ls[-1]["flags"] and not ls[-1].get("when")
    return {**e, "pages": ls[-1]["pages"], "_soul_lines": ls[:-1]}
maps.setdefault("club_int", {})
for _k in [k for k in unplaced_npcs if k.startswith("rebel_")]:
    maps["club_int"][_k] = _to_map(unplaced_npcs.pop(_k)); CLUB_MOVED.append(f"unplaced_npcs.{_k} -> maps.club_int.{_k}")
for _k in [k for k in _CP if k.startswith("club_int.")]:
    _id = _k.split(".", 1)[1]; _e = _to_map(_CP.pop(_k))
    if "pinned_under" in _e: _e["pinned_under"] = _e["pinned_under"].split(".", 1)[1]
    maps["club_int"][_id] = _e; CLUB_MOVED.append(f"unplaced.club_props.{_k} -> maps.club_int.{_id}")
_CP["_note"] = "v0.4.8: the back-room wall moved to maps.club_int.<id> (World built club_int). Only the Lanternport old_record stays unplaced."
# 2. Fernwick club sign (Gary's wording)
maps["fernwick"]["sign_club"] = npc(["THE FIREFLY", "Juice, tunes, open late."], note="Gary's wording (adjusted from World's dev label)")

# ---- v0.4.9: Thornwood field camp (SOUL_PLAYBOOK 1.9 "clear it, light the stove"; 6.4/6.6; STORY_RULINGS_CLUB camp placement + "FOUND THE CAMP. NOT THEM.") ----
CAMP_TONE = "Story Bot tone check (pending_story_call): field-camp text, v0.4.9"
CAMP_TONE_RULING = "Story Bot camp tone check, Oct 22 2026 10:08 PM CT"
def camp(cid, flag, cold, restored, use, where_note):
    return {
      "pages": cold,
      "_soul_lines": [
        L("camp_restored_first", ["The camp's tidy again.", "Still no sign of them."], flags=[flag], when={"once": True}, story_ruling=CAMP_TONE_RULING),
        L("camp_restored", restored, flags=[flag], story_ruling=CAMP_TONE_RULING),
      ],
      "prompt": ["Clear the camp and light the stove?"], "choices": ["Yes", "No"], "prompt_after_line": "default",
      "use": use, "declined": ["You leave the camp as it is. For now."],
      "sets_flag": flag, "active_when": "beat_master_fernwick",
      "story_ruling": CAMP_TONE_RULING,
      "note": "Add log-page, fast-travel and rest hooks once those ids exist (SOUL_PLAYBOOK 1.9).",
      "_note": (where_note + " Flow before restore: the default line (cold camp look) plays, then the prompt (prompt_after_line = default, so the prompt never follows the restored lines); "
                f"Yes plays use and sets {flag} (map sets_flag); No plays declined. After restore: camp_restored_first once, then camp_restored every time. "
                f"Ties to maps.club_int.note_{cid.split('_')[1]} (same flag ticks the note). "
                "SOUL_PLAYBOOK 1.9 also makes a restored camp a fast-travel point, a Warmth rest spot and a decor spot, and says each camp holds a field log page; "
                "none of those has an id or ruling yet, so no text names them and no reward/item is referenced. No team name: no document ties a member to this camp."),
    }
CAMPS = {
 ("thornwood", "camp_thornwood"): camp("camp_thornwood", "camp_restored_thornwood",
    ["An empty tent, ferns grown right over it.", "Nobody's slept here in a long while."],
    ["Your camp now. Stove's warm, tent's dry.", "A good spot to sit a while with your team."],
    ["You pull the ferns off the tent and sweep out the leaves.", "The stove catches on the second try."],
    "Thornwood field-team camp (World spot (6,17), stand (6,18), face up; flag_swaps camp_cold -> camp_restored on camp_restored_thornwood)."),
 ("greystone_b1", "camp_greystone"): camp("camp_greystone", "camp_restored_greystone",
    ["A cold camp stove, tucked out of the draught.", "A bedroll beside it, grey with cave dust."],
    ["Your camp now. Warm, for a cave.", "A good spot to sit a while with your team."],
    ["You shake out the bedroll and brush off the dust.", "The stove takes a few tries, then catches."],
    "Greystone field-team camp (World added the spot during v0.4.9 with 'key requested from Text Bot': (19,2), stand (19,3), face up; flag_swaps camp_cold -> camp_restored on camp_restored_greystone). "
    "Look line follows the club note ('cold camp stove'). Text Bot addition beyond the brief, same rules as Thornwood; tone passed by Story Bot (10:08 PM CT)."),
}
for (_m, _c), _e in CAMPS.items(): maps[_m][_c] = _e
CAMP_LINE_IDS = ["camp_restored_first", "camp_restored", "default"]

# ==== v0.4.11 OVERNIGHT MERGE (drafts/overnight, World Design SPOTS_from_world_design.md) ====
# World integrated 28 new maps (61 total) and listed 170 pending-text spots. Draft lines go in word for word (DRAFT, pending Gary);
# speakers whose words already exist (gate guards, rail_only, the lucky crystal seller, the bike clerk) reuse those entries, never copies.
def _speaker(pages, tag): return [p[len(tag):] for p in pages if p.startswith(tag)]
def _seller(zone):
    _ls = unplaced_npcs["lucky_crystal_seller"]["lines"]
    keep = [copy.deepcopy(l) for l in _ls if l["id"] == "seller_ending" or l.get("when", {}).get("zone") == zone]
    return npc(list(_ls[-1]["pages"]), kind="clerk", _soul_lines=keep, declined=unplaced_npcs["lucky_crystal_seller"]["declined"],
               note=f"same words as unplaced_npcs.lucky_crystal_seller (zone {zone}); his crystals are plain glass (STORY_RULINGS_SOUL #3)")
# -- v0.4.11 map route_east (drafts/overnight/route_brookhollow_aurelith.md) --
assert not set(maps.get("route_east", {})) & {'route_east_trainer_1', 'route_east_trainer_2', 'route_east_trainer_3', 'route_east_trainer_4', 'route_east_trainer_5', 'route_east_trainer_6', 'route_east_sign'}
maps.setdefault("route_east", {}).update({
 "route_east_trainer_1": npc(["I've got a parcel due in Aurelith and five minutes. Quick one?"], battle_lost=['Late now. Thanks for that.'], after=["Aurelith's past the bluff. Rail only, so don't try flying in."], trainer_class='Courier', name='Penrose', note='overnight draft (drafts/overnight/route_brookhollow_aurelith.md), DRAFT pending Gary'),
 "route_east_trainer_2": npc(["You walked right through my cast. Round here that's a battle."], battle_lost=['And now the fish are gone too.'], after=['Ditchsnaps bite near the bridge. Literally. Mind your fingers.'], trainer_class='Angler', name='Rue', note='overnight draft (drafts/overnight/route_brookhollow_aurelith.md), DRAFT pending Gary'),
 "route_east_trainer_3": npc(["I found two creatures in this grass. Want to see them? You're seeing them."], battle_lost=["That's okay. They're still my favourites."], after=["Wade through the tall bit and you'll find more. And ticks."], trainer_class='Trail Kid', name='Bram', note='overnight draft (drafts/overnight/route_brookhollow_aurelith.md), DRAFT pending Gary'),
 "route_east_trainer_4": npc(["This slope's perfect for wheels. Shame I've only got feet today."], battle_lost=["Fine. I'll go back to falling off things."], after=['With a bike you could take those ramps. Probably. Wear a helmet.'], trainer_class='Skater', name='Tilly', note='overnight draft (drafts/overnight/route_brookhollow_aurelith.md), DRAFT pending Gary'),
 "route_east_trainer_5": npc(["Road's closed for works. Well. I'm on break. Battle?"], battle_lost=["Break's over, then."], after=["We're widening it for Revival Tech trucks. Nobody's said why."], trainer_class='Field Worker', name='Cass', note='overnight draft (drafts/overnight/route_brookhollow_aurelith.md), DRAFT pending Gary'),
 "route_east_trainer_6": npc(["Shh. I've watched a Crowkin nest for an hour. Now you're here."], battle_lost=['It flew off anyway. Great.'], after=['You only get back here off the ledge. Nobody checks back here.'], trainer_class='Birdwatcher', name='Juno', note='overnight draft (drafts/overnight/route_brookhollow_aurelith.md), DRAFT pending Gary'),
 "route_east_sign": npc(['EAST ROAD\nAhead: Aurelith (arrivals by rail only).', 'South: the coast road to Tidewater.']),
})
# -- v0.4.11 map aurelith (drafts/overnight/aurelith.md) --
assert not set(maps.get("aurelith", {})) & {'aurelith_ron_6', 'aurelith_sign', 'aurelith_arena_sign', 'aurelith_arena_doorman', 'aurelith_airspace_officer', 'aurelith_lucky_crystal_seller', 'aurelith_villager_1', 'aurelith_villager_2'}
maps.setdefault("aurelith", {}).update({
 "aurelith_ron_6": npc(['Eight coins. Me too, nearly. Seven and a sandwich.', 'One more, {nick}. For old times. Then we go and get them.'], battle_lost=['Yeah. Okay. You were always going to win that one.', "Head Office. In person. Like the list said. I'm coming."], battle_won=["Huh. Didn't see that coming. Doesn't change anything.", "Head Office. In person. I'm coming."], after=["Lead the way. I'll try to look like I belong."], opener='ron_battle_openers.ron_rival_cindervale', note='Ron battle (GD ron_6); the existing opener ron_rival_cindervale plays first, then these pages. DRAFT, pending Gary'),
 "aurelith_sign": npc(['AURELITH\nArrivals by rail only.', 'Skylift landings not permitted. By order.']),
 "aurelith_arena_sign": npc(['AURELITH ARENA\nChallengers must hold eight coins.', 'No healing between Battle Masters.']),
 "aurelith_arena_doorman": npc(blockers["gate_aurelith_arena"]["doorman_before"], kind="guard", gate="gate_aurelith_arena",
             variants=[{"flag": "all_badges", "pages": blockers["gate_aurelith_arena"]["doorman_after"]}],
             note="speaks blockers.gate_aurelith_arena (proposed arena_doorman); same words"),
 "aurelith_airspace_officer": npc(list(rail_only["npcs"]["airspace_officer"]["pages"]), kind="guard", note="same words as rail_only.npcs.airspace_officer"),
 "aurelith_lucky_crystal_seller": _seller("aurelith"),
 "aurelith_villager_1": npc(["The arena's been shut since spring.", 'They open it for people with eight coins. So, nobody.'], kind='villager'),
 "aurelith_villager_2": npc(['Everyone here came in on the train. Even the pigeons, I reckon.'], kind='villager'),
})
# -- v0.4.11 map route_aurelith_saltmere (drafts/overnight/route_saltmere_aurelith.md) --
assert not set(maps.get("route_aurelith_saltmere", {})) & {'route_aurelith_saltmere_trainer_1', 'route_aurelith_saltmere_trainer_2', 'route_aurelith_saltmere_trainer_3', 'route_aurelith_saltmere_trainer_4', 'route_aurelith_saltmere_trainer_5', 'route_aurelith_saltmere_trainer_6', 'route_aurelith_saltmere_sign'}
maps.setdefault("route_aurelith_saltmere", {}).update({
 "route_aurelith_saltmere_trainer_1": npc(['Salt in my boots, salt in my hair. Might as well battle.'], battle_lost=['Salt in the wound, now.'], after=["Saltmere's down the long road. The harbour smells like work."], trainer_class='Harbour Hand', name='Dunstan', note='overnight draft (drafts/overnight/route_saltmere_aurelith.md), DRAFT pending Gary'),
 "route_aurelith_saltmere_trainer_2": npc(['From up here I see everyone coming. I saw you an hour ago.'], battle_lost=["Should've used that hour to get ready."], after=['Brinepipits nest in the dune grass. Step light.'], trainer_class='Birdwatcher', name='Gil', note='overnight draft (drafts/overnight/route_saltmere_aurelith.md), DRAFT pending Gary'),
 "route_aurelith_saltmere_trainer_3": npc(["Hang on, my line's caught. Battle while I wait?"], battle_lost=['Still caught. Brilliant.'], after=["The creek fills at high tide. The footbridge doesn't care either way."], trainer_class='Angler', name='Hana', note='overnight draft (drafts/overnight/route_saltmere_aurelith.md), DRAFT pending Gary'),
 "route_aurelith_saltmere_trainer_4": npc(['My tent blew over twice today. I need a win.'], battle_lost=['Third time, then.'], after=['Camping past the dunes? Bring pegs. Lots of pegs.'], trainer_class='Camper', name='Iska', note='overnight draft (drafts/overnight/route_saltmere_aurelith.md), DRAFT pending Gary'),
 "route_aurelith_saltmere_trainer_5": npc(["Last stretch before Saltmere. I've run it a hundred times. Battle me."], battle_lost=['My route times are going to be awful this week.'], after=['Revival Tech cut half the courier routes. The rest of us run faster.'], trainer_class='Courier', name='Jem', note='overnight draft (drafts/overnight/route_saltmere_aurelith.md), DRAFT pending Gary'),
 "route_aurelith_saltmere_trainer_6": npc(['Not many find this cove. Fewer leave it happy.'], battle_lost=["You'll leave happy, then. Fair enough."], after=["Whatever's washed up in here, take it. I've no use for it."], trainer_class='Veteran', name='Kerr', note='overnight draft (drafts/overnight/route_saltmere_aurelith.md), DRAFT pending Gary'),
 "route_aurelith_saltmere_sign": npc(['SALT ROAD\nWest: Aurelith. East: Saltmere.', "Mind the salt pans. They're slippery."]),
})
# -- v0.4.11 map saltmere (drafts/overnight/saltmere.md) --
assert not set(maps.get("saltmere", {})) & {'saltmere_ron_2', 'saltmere_sign', 'saltmere_hall_sign', 'saltmere_causeway_local', 'saltmere_fisher', 'saltmere_villager_1'}
maps.setdefault("saltmere", {}).update({
 "saltmere_ron_2": npc(["Your ID says 'Field Researcher II'. Mine says 'Field Researcher'.", "No numeral. Just vibes. Let's fix that, {nick}."], battle_lost=['Still no numeral. Love that for me.'], battle_won=['Ha. Put THAT on my ID.'], after=["The hall's past the fish market. Follow your nose. Sorry about your nose."], opener='ron_battle_openers.ron_rival_saltmere', note='Ron battle (GD ron_2); the existing opener ron_rival_saltmere plays first, then these pages. DRAFT, pending Gary'),
 "saltmere_sign": npc(['SALTMERE\nHarbour town.', 'Fish market mornings. Revival Tech office south side.']),
 "saltmere_hall_sign": npc(["SALTMERE MASTER'S HALL\nCoin holders and challengers welcome.", "Please wipe your feet. It's a harbour."]),
 "saltmere_causeway_local": npc(_speaker(blockers["gate_saltmere_causeway"]["before"], "Local: "), gate="gate_saltmere_causeway",
             variants=[{"flag": "beat_master_frostspire", "pages": _speaker(blockers["gate_saltmere_causeway"]["after"], "Local: ")}],
             note="speaks blockers.gate_saltmere_causeway (proposed causeway_local); the Local: pages, same words"),
 "saltmere_fisher": npc(['Nets were full every morning, once.', "Now I bring them in and count. It doesn't take long."], kind='villager'),
 "saltmere_villager_1": npc(["The harbour bell rings at six. Then at seven, because Jory's late."], kind='villager'),
})
# -- v0.4.11 map saltmere_office_int (drafts/overnight/saltmere.md) --
assert not set(maps.get("saltmere_office_int", {})) & {'saltmere_office_int_clerk', 'saltmere_office_int_coworker'}
maps.setdefault("saltmere_office_int", {}).update({
 "saltmere_office_int_clerk": npc(items["bike"]["giver_pages"], kind="clerk", received=items["bike"]["received"], tip=items["bike"]["tip"],
             variants=[{"flag": "has_bike", "pages": items["bike"]["giver_after"]}],
             note="items.bike giver (CRITICAL_PATH saltmere_office_clerk): needs has_survey_parcel, gives the Courier Bike, sets has_bike; same words"),
 "saltmere_office_int_coworker": npc(["I've been 'temporary' here for four years.", "Don't let them hand you a desk. You'll never leave."], kind='villager'),
})
# -- v0.4.11 map saltmere_hall_int (drafts/overnight/halls_saltmere.md) --
assert not set(maps.get("saltmere_hall_int", {})) & {'saltmere_hall_int_master', 'saltmere_hall_int_h1', 'saltmere_hall_int_h2', 'saltmere_hall_int_h3', 'saltmere_hall_int_guide'}
maps.setdefault("saltmere_hall_int", {}).update({
 "saltmere_hall_int_master": npc(['Saltmere runs on tides and paperwork. I handle the tides.', "You crossed my pans dry. Let's see how you do in deep water."], battle_lost=["Well. That's the tide gone out on me."], battle_won=["The sea doesn't hold a grudge, and neither do I.", 'Dry off and come back.'], coin_handover=["Take the Brine Coin. That's two.", 'Salt gets into it. Give it a rub now and then.'], gift=["And these crystals. Better than the shop ones. Don't tell the shop."], after=['That trunk on the Thornwood trail? Two coins and the crew will clear it.', 'Revival Heights is up that way. Mind how you go.'], kind='master', name='Nerys Bryde', coin_name='Brine Coin', name_status='DRAFT, pending Gary (name + coin name)', note='Master Nerys Bryde (master_saltmere); win sets beat_master_saltmere. Overnight hall draft (drafts/overnight/halls_saltmere.md)'),
 "saltmere_hall_int_h1": npc(["Careful, the floor's half salt and half sea.", 'Mostly sea right now.'], battle_lost=['I slipped. Not on the floor. In the battle.'], after=['Watch what each wheel does to the pan next door, not just its own.'], name='Nell', trainer_class='Hall Helper', note='hall trainer tr_hall_saltmere_h1 (masters.json order h1); overnight hall draft, DRAFT pending Gary'),
 "saltmere_hall_int_h2": npc(['I turn these wheels all day. My arms are huge.', "My team's even bigger. Let's go."], battle_lost=['Okay. My arms are still huge, though.'], after=['Pan went under? Turn the same wheel back. Nothing in here is stuck for good.'], name='Ivo', trainer_class='Hall Helper', note='hall trainer tr_hall_saltmere_h2 (masters.json order h2); overnight hall draft, DRAFT pending Gary'),
 "saltmere_hall_int_h3": npc(["Last wheel's mine. You want the dais, you go through me."], battle_lost=["Fine. The dais is yours. The wheel's still mine."], after=["The stripes on the drying rack aren't decoration. Just saying."], name='Sully', trainer_class='Hall Helper', note='hall trainer tr_hall_saltmere_h3 (masters.json order h3); overnight hall draft, DRAFT pending Gary'),
 "saltmere_hall_int_guide": npc(['Three wheels, three pans. Each wheel lifts one pan and drops its neighbour.', 'Turn one, then look at all three. Not just the one you turned.', "The drying rack by the door knows the order. It just won't say it out loud."], note='stationary hall guide; overnight hall draft'),
})
# -- v0.4.11 map route_revival (drafts/overnight/route_thornwood_revival.md) --
assert not set(maps.get("route_revival", {})) & {'route_revival_trainer_1', 'route_revival_trainer_2', 'route_revival_trainer_3', 'route_revival_trainer_4', 'route_revival_trainer_5', 'route_revival_trainer_6', 'route_revival_trainer_7', 'route_revival_sign'}
maps.setdefault("route_revival", {}).update({
 "route_revival_trainer_1": npc(["That log took the council a month to move. I'll take less."], battle_lost=['Took less, all right.'], after=["Revival Heights is east. You'll see the HQ before you see the town."], trainer_class='Ranger', name='Lark', note='overnight draft (drafts/overnight/route_thornwood_revival.md), DRAFT pending Gary'),
 "route_revival_trainer_2": npc(['Careful, those stakes are measured to the centimetre. Stand still.'], battle_lost=["And now one's moved. Lovely."], after=["Revival Tech's surveying this whole field. Nobody's said what for."], trainer_class='Field Researcher', name='Mabry', note='overnight draft (drafts/overnight/route_thornwood_revival.md), DRAFT pending Gary'),
 "route_revival_trainer_3": npc(['Three beetles, one jar of patience. Ready?'], battle_lost=['Patience: gone. Beetles: tired.'], after=['Chiselbugs chew through fence posts. The farmers love me.'], trainer_class='Beetle Keeper', name='Nico', note='overnight draft (drafts/overnight/route_thornwood_revival.md), DRAFT pending Gary'),
 "route_revival_trainer_4": npc(['No standing on the Lumen Line. Battle off the track, please.'], battle_lost=['Good. Now stay off the track.'], after=["Trains run every half hour. You'll hear them before you see them."], trainer_class='Rail Worker', name='Orla', note='overnight draft (drafts/overnight/route_thornwood_revival.md), DRAFT pending Gary'),
 "route_revival_trainer_5": npc(["This is the bike lane. You're on foot. Let's settle it."], battle_lost=['Fine. Walk where you like.'], after=['With a bike this road takes ten minutes. Without, an hour.'], trainer_class='Courier', name='Penn', note='overnight draft (drafts/overnight/route_thornwood_revival.md), DRAFT pending Gary'),
 "route_revival_trainer_6": npc(['These stones are older than the company. Older than the town.'], battle_lost=["The stones won't remember this. I will."], after=["People say the circle hums at night. It's the wind. Mostly."], trainer_class='Scholar', name='Ambrose', name_status='proposed, pending Gary', note='overnight draft (drafts/overnight/route_thornwood_revival.md), DRAFT; name approved by Gary Oct 23 9:05 AM CT'),
 "route_revival_trainer_7": npc(["Survey gate. I'm meant to check IDs. Battle instead?"], battle_lost=["You're through. Don't tell my supervisor."], after=['Revival Heights is just past here. Smile for the cameras.'], trainer_class='Field Worker', name='Rhea', note='overnight draft (drafts/overnight/route_thornwood_revival.md), DRAFT pending Gary'),
 "route_revival_sign": npc(['HEIGHTS ROAD\nEast: Revival Heights.', 'West: Thornwood. Keep off the Lumen Line.']),
})
# -- v0.4.11 map revival_heights (drafts/overnight/revival_heights.md) --
assert not set(maps.get("revival_heights", {})) & {'revival_heights_ron_3', 'revival_heights_trainer_1', 'revival_heights_sign', 'revival_heights_rt_guard', 'revival_heights_pass_clerk', 'revival_heights_airspace_officer', 'revival_heights_lucky_crystal_seller'}
maps.setdefault("revival_heights", {}).update({
 "revival_heights_ron_3": npc(["Head Office is right there. Let's give the windows a show."], battle_lost=["Ha! Ha. Yeah. No, that's fine. That's totally fine."], battle_won=["Don't tell the plaza. They'll put it in the bulletin."], after=["Reception's got post for me, apparently. Nobody sends me post."], opener='ron_battle_openers.ron_rival_revival_heights', note='Ron battle (GD ron_3); the existing opener ron_rival_revival_heights plays first, then these pages. DRAFT, pending Gary'),
 "revival_heights_trainer_1": npc(["I'm on lunch. Lunch is also when I test new teams."], battle_lost=['Back to the lab, then.'], after=["Head Office sends memos by hand here. Real paper. It's a whole thing."], trainer_class='Field Researcher', name='Lyle', name_status='proposed, pending Gary', note='overnight draft (drafts/overnight/revival_heights.md), DRAFT; name approved by Gary Oct 23 9:05 AM CT'),
 "revival_heights_sign": npc(['REVIVAL HEIGHTS\nHome of Revival Tech.', 'Visitors report to the checkpoint.']),
 "revival_heights_rt_guard": npc(blockers["gate_revival_checkpoint"]["before"], kind="guard", gate="gate_revival_checkpoint",
             variants=[{"flag": "beat_master_revival", "pages": blockers["gate_revival_checkpoint"]["after"]}],
             after_repeat=blockers["gate_revival_checkpoint"]["after_repeat"], note="speaks blockers.gate_revival_checkpoint (proposed rt_guard_heights); same words"),
 "revival_heights_pass_clerk": npc(list(rail_only["npcs"]["pass_clerk"]["pages"]), received=rail_only["npcs"]["pass_clerk"]["received"], tip=rail_only["npcs"]["pass_clerk"]["tip"],
             note="same words as rail_only.npcs.pass_clerk; sets has_rail_pass (after beat_master_revival)"),
 "revival_heights_airspace_officer": npc(list(rail_only["npcs"]["airspace_officer"]["pages"]), kind="guard", note="same words as rail_only.npcs.airspace_officer"),
 "revival_heights_lucky_crystal_seller": _seller("revival_heights"),
})
# -- v0.4.11 map revival_hall_int (drafts/overnight/halls_revival_heights.md) --
assert not set(maps.get("revival_hall_int", {})) & {'revival_hall_int_master', 'revival_hall_int_h1', 'revival_hall_int_h2', 'revival_hall_int_h3', 'revival_hall_int_h4', 'revival_hall_int_guide'}
maps.setdefault("revival_hall_int", {}).update({
 "revival_hall_int_master": npc(['Everything in this city is polished. The floors, the windows, the smiles.', "My team's the one thing here that glows on its own. Ready?"], battle_lost=["Bright work. And I don't say that to everyone up here."], battle_won=['Too much light at once. It happens.', 'Rest your eyes and come back.'], coin_handover=["Take the Prism Coin. That's three.", 'Hold it up to a window. It casts a little rainbow. Everyone checks.'], gift=['Two Pep Remedies as well. Head Office hands them out like mints.'], after=["Frostspire pass bridge repairs need a three-coin trainer. That's you.", "And the south gate opens for you now. Saltmere's straight down the hill."], kind='master', name='Cassia Lume', coin_name='Prism Coin', name_status='DRAFT, pending Gary (name + coin name)', note='Master Cassia Lume (master_revival_heights); win sets beat_master_revival. Overnight hall draft (drafts/overnight/halls_revival_heights.md)'),
 "revival_hall_int_h1": npc(['Mind your eyes. The light in here bounces off everything.'], battle_lost=["I'm seeing spots. That one's on me."], after=['Turn a prism, then trace the beam with your finger. Looks daft. Works.'], name='Mags', trainer_class='Hall Helper', note='hall trainer tr_hall_revival_heights_h1 (masters.json order h1); overnight hall draft, DRAFT pending Gary'),
 "revival_hall_int_h2": npc(['My Glimmerlamb glows in the dark. Does yours do anything fun?'], battle_lost=['Okay, that was fun. Just not for me.'], after=['Beam hitting a wall? The last prism you turned is usually the problem.'], name='Dov', trainer_class='Hall Helper', note='hall trainer tr_hall_revival_heights_h2 (masters.json order h2); overnight hall draft, DRAFT pending Gary'),
 "revival_hall_int_h3": npc(['I work at Head Office on weekdays. This is my weekend.'], battle_lost=['Back to the weekdays, then.'], after=["Room two's easier if you start from the door and work back to the beam."], name='Fen', trainer_class='Hall Helper', note='hall trainer tr_hall_revival_heights_h3 (masters.json order h3); overnight hall draft, DRAFT pending Gary'),
 "revival_hall_int_h4": npc(["Last prism's behind me. So's the Master. No pressure."], battle_lost=["Go on. She's been watching the whole time."], after=['Room three wants the beam through both crystals. One after the other.'], name='Corwin', trainer_class='Hall Helper', note='hall trainer tr_hall_revival_heights_h4 (masters.json order h4); overnight hall draft, DRAFT pending Gary'),
 "revival_hall_int_guide": npc(['The beam comes in through the ceiling. Prisms bounce it.', 'Check a prism to turn it. Four ways it can face.', "Light the crystal by a door and the door opens. That's the whole trick. Mostly."], note='stationary hall guide; overnight hall draft'),
})
# -- v0.4.11 map route_revival_saltmere (drafts/overnight/route_revival_saltmere.md) --
assert not set(maps.get("route_revival_saltmere", {})) & {'route_revival_saltmere_trainer_1', 'route_revival_saltmere_trainer_2', 'route_revival_saltmere_trainer_3', 'route_revival_saltmere_trainer_4', 'route_revival_saltmere_sign'}
maps.setdefault("route_revival_saltmere", {}).update({
 "route_revival_saltmere_trainer_1": npc(['Checkpoint road. I check things. Let me check you.'], battle_lost=['Checked. You pass.'], after=["Saltmere's south. The air gets saltier every step."], trainer_class='Field Worker', name='Garrick', name_status='proposed, pending Gary', note='overnight draft (drafts/overnight/route_revival_saltmere.md), DRAFT; name approved by Gary Oct 23 9:05 AM CT'),
 "route_revival_saltmere_trainer_2": npc(['Three letters, two parcels, no time. Make it quick.'], battle_lost=['Quick. Just not how I wanted.'], after=["The bike lane runs the whole way. Lucky you, if you've got wheels."], trainer_class='Courier', name='Una', note='overnight draft (drafts/overnight/route_revival_saltmere.md), DRAFT pending Gary'),
 "route_revival_saltmere_trainer_3": npc(["Out on the flats there's nowhere to hide. Good for battling."], battle_lost=['Nowhere to hide from that either.'], after=['The salt crust cracks if you stamp. Things turn up under it.'], trainer_class='Harbour Hand', name='Vale', note='overnight draft (drafts/overnight/route_revival_saltmere.md), DRAFT pending Gary'),
 "route_revival_saltmere_trainer_4": npc(["Thirty years I've battled on this road. Show me something new."], battle_lost=['That was new. Thank you.'], after=["Keep your team rested. Pride doesn't heal anything."], trainer_class='Veteran', name='Wynn', note='overnight draft (drafts/overnight/route_revival_saltmere.md), DRAFT pending Gary'),
 "route_revival_saltmere_sign": npc(['CHECKPOINT ROAD\nNorth: Revival Heights. South: Saltmere.', 'Bike lane on the left. Walkers, stay right.']),
})
# -- v0.4.11 map frostspire_pass (drafts/overnight/route_greystone_frostspire.md) --
assert not set(maps.get("frostspire_pass", {})) & {'frostspire_pass_ron_4', 'frostspire_pass_trainer_1', 'frostspire_pass_trainer_2', 'frostspire_pass_trainer_3', 'frostspire_pass_trainer_4', 'frostspire_pass_trainer_5', 'frostspire_pass_sign', 'frostspire_pass_rt_engineer'}
maps.setdefault("frostspire_pass", {}).update({
 "frostspire_pass_ron_4": npc(["I came up here without a coat. On purpose. Don't look at me like that."], battle_lost=['My hands are too cold to be upset about it.'], battle_won=['Huh. Cold weather suits me.'], after=["I'm not going back for a coat. I've committed to this now."], opener='ron_battle_openers.ron_rival_frostspire', note='Ron battle (GD ron_4); the existing opener ron_rival_frostspire plays first, then these pages. DRAFT, pending Gary'),
 "frostspire_pass_trainer_1": npc(["Halfway up and my legs have quit. My team hasn't."], battle_lost=["Now we've all quit."], after=["Switchbacks look slow. Cutting across looks fast. It isn't."], trainer_class='Climber', name='Yara', note='overnight draft (drafts/overnight/route_greystone_frostspire.md), DRAFT pending Gary'),
 "frostspire_pass_trainer_2": npc(["You came out of Greystone? Then you've earned a proper battle."], battle_lost=["And you've earned the view."], after=['The bridge was out for weeks. They fixed it the day the company needed it.'], trainer_class='Hillwalker', name='Zev', note='overnight draft (drafts/overnight/route_greystone_frostspire.md), DRAFT pending Gary'),
 "frostspire_pass_trainer_3": npc(["Skyrenders ride the updraft here. Let me show you why that's scary."], battle_lost=['Okay. Less scary than I thought.'], after=['On a clear day you can see the Frostspire shrine from here.'], trainer_class='Birdwatcher', name='Ada', note='overnight draft (drafts/overnight/route_greystone_frostspire.md), DRAFT pending Gary'),
 "frostspire_pass_trainer_4": npc(['The ferns glow when things move in them. Something moved. It was me.'], battle_lost=['Right. Back into the ferns.'], after=["There's no way round this band. Through the ferns or nothing."], trainer_class='Ranger', name='Bryn', note='overnight draft (drafts/overnight/route_greystone_frostspire.md), DRAFT pending Gary'),
 "frostspire_pass_trainer_5": npc(['Last climb before town. Last battle before soup.'], battle_lost=['Soup it is.'], after=["Frostspire's over the rise. Get your team looked at in the branch."], trainer_class='Climber', name='Cole', note='overnight draft (drafts/overnight/route_greystone_frostspire.md), DRAFT pending Gary'),
 "frostspire_pass_sign": npc(['FROSTSPIRE PASS\nBridge out. Engineers on site.', 'North: Frostspire. South: Greystone Caverns.']),
 "frostspire_pass_rt_engineer": npc(_speaker(blockers["gate_frostspire_bridge"]["before"], "Engineer: "), kind="guard", gate="gate_frostspire_bridge",
             variants=[{"flag": "beat_master_revival", "pages": _speaker(blockers["gate_frostspire_bridge"]["after"], "Engineer: ")}],
             note="speaks blockers.gate_frostspire_bridge (proposed rt_engineer_pass); the Engineer: pages, same words"),
})
# -- v0.4.11 map frostspire (drafts/overnight/frostspire.md) --
assert not set(maps.get("frostspire", {})) & {'frostspire_trainer_1', 'frostspire_trainer_2', 'frostspire_trainer_3', 'frostspire_trainer_4', 'frostspire_sign', 'frostspire_villager_1', 'frostspire_skylift_tutor'}
maps.setdefault("frostspire", {}).update({
 "frostspire_trainer_1": npc(["Lower slope's for practice. Let's practise."], battle_lost=['Back to practice for me.'], after=['Up top the wind pushes you sideways. Lean into it.'], trainer_class='Climber', name='Dara', note='overnight draft (drafts/overnight/frostspire.md), DRAFT pending Gary'),
 "frostspire_trainer_2": npc(['The sled run only goes one way. So does this battle.'], battle_lost=['Down I go, then.'], after=["The run ends at the bottom of town. There's no climbing back up it."], trainer_class='Skater', name='Elm', note='overnight draft (drafts/overnight/frostspire.md), DRAFT pending Gary'),
 "frostspire_trainer_3": npc(["The shrine's been quiet since the walls went up. Let's not be."], battle_lost=['Loud enough. Thank you.'], after=['Old books say the shrine keeps the north in balance. Old books say a lot.'], trainer_class='Scholar', name='Flint', note='overnight draft (drafts/overnight/frostspire.md), DRAFT pending Gary'),
 "frostspire_trainer_4": npc(['Made it to the hut? Then you can manage one more battle.'], battle_lost=['You can. Sit by the stove a minute.'], after=["Snowgrouses don't fly in this wind. You shouldn't either."], trainer_class='Veteran', name='Greer', note='overnight draft (drafts/overnight/frostspire.md), DRAFT pending Gary'),
 "frostspire_sign": npc(['FROSTSPIRE\nMountain town. Elevation: high.', 'The shrine is open. Mind the ice.']),
 "frostspire_villager_1": npc(['The walls went dim the week you showed up.', "I'm not saying it was you. I'm just saying."], kind='villager'),
 "frostspire_skylift_tutor": npc(["With that coin, a strong flyer can carry you to towns you've been to.", "That's Skylift. Not Aurelith, mind. Rail only there."], kind='villager_scholar'),
})
# -- v0.4.11 map frostspire_hall_int (drafts/overnight/halls_frostspire.md) --
assert not set(maps.get("frostspire_hall_int", {})) & {'frostspire_hall_int_master', 'frostspire_hall_int_h1', 'frostspire_hall_int_h2', 'frostspire_hall_int_h3', 'frostspire_hall_int_guide'}
maps.setdefault("frostspire_hall_int", {}).update({
 "frostspire_hall_int_master": npc(['People climb the peak for the view. I stayed for the wind.', "My team was born in it. Let's see if yours can keep up."], battle_lost=['Hah. You flew through that.'], battle_won=['Grounded. Happens to all of us.', 'Catch your breath and try again.'], coin_handover=["Take the Aerie Coin. Four now, isn't it?", 'Light as a feather. Near enough.'], gift=["Three Big Remedies. It's a long way down, even when you fly."], after=['With that coin, a bird partner can carry you between towns. Skylift, we call it.', "Not into the rail-only cities, mind. They're fussy about their sky."], skill_learned=['You can now use Skylift outside battle.'], kind='master', name='Hale Corrie', coin_name='Aerie Coin', name_status='DRAFT, pending Gary (name + coin name)', note='Master Hale Corrie (master_frostspire); win sets beat_master_frostspire. Overnight hall draft (drafts/overnight/halls_frostspire.md)'),
 "frostspire_hall_int_h1": npc(['Wind took my hat on day one. I stayed anyway.'], battle_lost=['Wind took that one too.'], after=['The feathers point the way the vents blow. Look down before you step.'], name='Rue', trainer_class='Hall Helper', note='hall trainer tr_hall_frostspire_h1 (masters.json order h1); overnight hall draft, DRAFT pending Gary'),
 "frostspire_hall_int_h2": npc(['Up here you battle and lean at the same time.'], battle_lost=['I leaned the wrong way.'], after=['One bell rope swaps every vent in the room. Think before you pull.'], name='Bram', trainer_class='Hall Helper', note='hall trainer tr_hall_frostspire_h2 (masters.json order h2); overnight hall draft, DRAFT pending Gary'),
 "frostspire_hall_int_h3": npc(['You made the top ledge? Most people end up back on the floor.'], battle_lost=["Well, you're not on the floor. I nearly am."], after=["The eyrie's just past me. Hale's been watching since you walked in."], name='Tilly', trainer_class='Hall Helper', note='hall trainer tr_hall_frostspire_h3 (masters.json order h3); overnight hall draft, DRAFT pending Gary'),
 "frostspire_hall_int_guide": npc(["The vents carry you. You don't get a say until a banner stops you.", 'Bell ropes swap which vents are blowing. Every vent, not just one.', 'Fall off a lane and you land below. Only your pride gets hurt.'], note='stationary hall guide; overnight hall draft'),
})
# -- v0.4.11 map sunmeadow_fields (drafts/overnight/sunmeadow_fields.md) --
assert not set(maps.get("sunmeadow_fields", {})) & {'sunmeadow_fields_trainer_1', 'sunmeadow_fields_trainer_2', 'sunmeadow_fields_trainer_3', 'sunmeadow_fields_trainer_4', 'sunmeadow_fields_trainer_5', 'sunmeadow_fields_trainer_6', 'sunmeadow_fields_sign'}
maps.setdefault("sunmeadow_fields", {}).update({
 "sunmeadow_fields_trainer_1": npc(["The crystal wall's gone dim. First visitor in months, and we battle."], battle_lost=['Still nice to have company.'], after=["The meadow's coming back. Slowly. Like my knees."], trainer_class='Gardener', name='Hux', note='overnight draft (drafts/overnight/sunmeadow_fields.md), DRAFT pending Gary'),
 "sunmeadow_fields_trainer_2": npc(["Sunquails only sing when it's quiet. Let's not be quiet."], battle_lost=["Now they won't sing at all."], after=["Cross the footbridge one at a time. It's older than it looks."], trainer_class='Birdwatcher', name='Ione', note='overnight draft (drafts/overnight/sunmeadow_fields.md), DRAFT pending Gary'),
 "sunmeadow_fields_trainer_3": npc(['Nan Wexley says I can battle anyone who looks lost. You look lost.'], battle_lost=["Okay, you're not lost. Just good."], after=["The Croft's over there. Nan feeds anyone who helps with the gate."], trainer_class='Trail Kid', name='Jory', note='overnight draft (drafts/overnight/sunmeadow_fields.md), DRAFT pending Gary'),
 "sunmeadow_fields_trainer_4": npc(["The bike loop's my turf. Well. My gravel."], battle_lost=["The gravel's yours now."], after=["Loop it twice and you'll spot the island path. Wet feet guaranteed."], trainer_class='Skater', name='Kaz', note='overnight draft (drafts/overnight/sunmeadow_fields.md), DRAFT pending Gary'),
 "sunmeadow_fields_trainer_5": npc(["I'm counting flowers. You've just stepped on forty."], battle_lost=['Thirty-nine. One bounced back.'], after=['The flowers came back the week the wall went dim. Make of that what you like.'], trainer_class='Field Researcher', name='Lomond', note='overnight draft (drafts/overnight/sunmeadow_fields.md), DRAFT pending Gary'),
 "sunmeadow_fields_trainer_6": npc(["Folks don't come north much. Spinemonitors do."], battle_lost=["You'll do fine up here."], after=['Popgophers dig up the whole north meadow. Watch your ankles.'], trainer_class='Veteran', name='Mira', note='overnight draft (drafts/overnight/sunmeadow_fields.md), DRAFT pending Gary'),
 "sunmeadow_fields_sign": npc(['SUNMEADOW FIELDS\nWest: Route 1. East: Reed Road.', 'South: Revival Heights. Close the gates.']),
})
# -- v0.4.11 map route_revival_sunmeadow (drafts/overnight/route_revival_sunmeadow.md) --
assert not set(maps.get("route_revival_sunmeadow", {})) & {'route_revival_sunmeadow_trainer_1', 'route_revival_sunmeadow_trainer_2', 'route_revival_sunmeadow_trainer_3', 'route_revival_sunmeadow_sign'}
maps.setdefault("route_revival_sunmeadow", {}).update({
 "route_revival_sunmeadow_trainer_1": npc(['These crystals were humming last year. Now they barely glow.'], battle_lost=['Neither do I, after that.'], after=['The company logs this field every week. Same numbers, only lower.'], trainer_class='Field Researcher', name='Nash', note='overnight draft (drafts/overnight/route_revival_sunmeadow.md), DRAFT pending Gary'),
 "route_revival_sunmeadow_trainer_2": npc(['This rig cost more than my house. Battle away from it, please.'], battle_lost=["Rig's fine. My pride isn't."], after=['The readings go to Head Office. Nobody tells us what they mean.'], trainer_class='Field Worker', name='Oona', note='overnight draft (drafts/overnight/route_revival_sunmeadow.md), DRAFT pending Gary'),
 "route_revival_sunmeadow_trainer_3": npc(["I'm writing a paper on Shardharts. You can be a footnote."], battle_lost=["You're a whole chapter now."], after=["Quartzhoppers hop toward light. Bring a lamp and they'll follow you."], trainer_class='Scholar', name='Piers', note='overnight draft (drafts/overnight/route_revival_sunmeadow.md), DRAFT pending Gary'),
 "route_revival_sunmeadow_sign": npc(['NORTH ROAD\nNorth: Sunmeadow Fields.', 'South: Revival Heights.']),
})
# -- v0.4.11 map route_sunmeadow_mirefen (drafts/overnight/route_sunmeadow_mirefen.md) --
assert not set(maps.get("route_sunmeadow_mirefen", {})) & {'route_sunmeadow_mirefen_trainer_1', 'route_sunmeadow_mirefen_trainer_2', 'route_sunmeadow_mirefen_trainer_3', 'route_sunmeadow_mirefen_trainer_4', 'route_sunmeadow_mirefen_trainer_5', 'route_sunmeadow_mirefen_sign'}
maps.setdefault("route_sunmeadow_mirefen", {}).update({
 "route_sunmeadow_mirefen_trainer_1": npc(["Nothing's biting. Maybe you will."], battle_lost=['You bit. Hard.'], after=['This pond drains into the bog. Everything ends up in Mirefen.'], trainer_class='Angler', name='Ross', note='overnight draft (drafts/overnight/route_sunmeadow_mirefen.md), DRAFT pending Gary'),
 "route_sunmeadow_mirefen_trainer_2": npc(['Out here the reeds hide everything. Except you.'], battle_lost=['Back into the reeds for me.'], after=['Stick to the boardwalk past here. The ground lies about being ground.'], trainer_class='Bog Walker', name='Saffi', note='overnight draft (drafts/overnight/route_sunmeadow_mirefen.md), DRAFT pending Gary'),
 "route_sunmeadow_mirefen_trainer_3": npc(["This fence is mostly beetles now. I'm proud of it."], battle_lost=['The fence still stands. So do I. Just.'], after=['Sunspeckles only come out at noon. Bring patience.'], trainer_class='Beetle Keeper', name='Tobin', note='overnight draft (drafts/overnight/route_sunmeadow_mirefen.md), DRAFT pending Gary'),
 "route_sunmeadow_mirefen_trainer_4": npc(['The boardwalk starts here. So does my patrol. Ready?'], battle_lost=["Patrol's going well, then."], after=["Planks marked red are rotten. I painted them. You're welcome."], trainer_class='Ranger', name='Ulla', note='overnight draft (drafts/overnight/route_sunmeadow_mirefen.md), DRAFT pending Gary'),
 "route_sunmeadow_mirefen_trainer_5": npc(["Camping next to a bog. My friends said it'd be fun."], battle_lost=["It's not. Neither was that."], after=['Frogs at night? Fine. No frogs at night? Worry.'], trainer_class='Camper', name='Vic', note='overnight draft (drafts/overnight/route_sunmeadow_mirefen.md), DRAFT pending Gary'),
 "route_sunmeadow_mirefen_sign": npc(['REED ROAD\nEast: Mirefen. West: Sunmeadow Fields.', 'Boardwalk ahead. Red planks are rotten.']),
})
# -- v0.4.11 map route_saltmere_mirefen (drafts/overnight/route_saltmere_mirefen.md) --
assert not set(maps.get("route_saltmere_mirefen", {})) & {'route_saltmere_mirefen_trainer_1', 'route_saltmere_mirefen_trainer_2', 'route_saltmere_mirefen_trainer_3', 'route_saltmere_mirefen_sign'}
maps.setdefault("route_saltmere_mirefen", {}).update({
 "route_saltmere_mirefen_trainer_1": npc(["They drained the causeway for the thaw. I'm stuck out here till Tuesday."], battle_lost=['Still Tuesday. Still stuck.'], after=["Mirefen's north. Keep to the stones. The mud's deeper than it looks."], trainer_class='Harbour Hand', name='Wilde', note='overnight draft (drafts/overnight/route_saltmere_mirefen.md), DRAFT pending Gary'),
 "route_saltmere_mirefen_trainer_2": npc(["The sluice opens on the hour. You've got till then."], battle_lost=['Plenty of time to spare.'], after=['When the sluice opens, everything downstream gets wet. You included.'], trainer_class='Angler', name='Yves', note='overnight draft (drafts/overnight/route_saltmere_mirefen.md), DRAFT pending Gary'),
 "route_saltmere_mirefen_trainer_3": npc(["Marsh end. Last dry spot for a mile. I'm keeping it."], battle_lost=["Keep it, then. I'm off."], after=['Gloamticks get everywhere out here. Check your socks.'], trainer_class='Bog Walker', name='Ansel', note='overnight draft (drafts/overnight/route_saltmere_mirefen.md), DRAFT pending Gary'),
 "route_saltmere_mirefen_sign": npc(['CAUSEWAY\nFlooded until the thaw ends.', 'West: Saltmere. North: Mirefen.']),
})
# -- v0.4.11 map mirefen (drafts/overnight/mirefen.md) --
assert not set(maps.get("mirefen", {})) & {'mirefen_trainer_1', 'mirefen_trainer_2', 'mirefen_trainer_3', 'mirefen_trainer_4', 'mirefen_trainer_5', 'mirefen_sign', 'mirefen_tideglide_giver', 'mirefen_villager_1'}
maps.setdefault("mirefen", {}).update({
 "mirefen_trainer_1": npc(['Welcome to Mirefen. Boots on? Good. Battle.'], battle_lost=["You'll fit in here."], after=["The town's on stilts. Don't ask about the stairs."], trainer_class='Bog Walker', name='Briar', note='overnight draft (drafts/overnight/mirefen.md), DRAFT pending Gary'),
 "mirefen_trainer_2": npc(['Three hours on this jetty. One bite. It was a Mirewump. It bit me.'], battle_lost=['Two bites today, then.'], after=['Mirejaws come up at dusk. Keep your fingers out of the water.'], trainer_class='Angler', name='Corin', note='overnight draft (drafts/overnight/mirefen.md), DRAFT pending Gary'),
 "mirefen_trainer_3": npc(["Here about the bog lights? Everyone's here about the bog lights."], battle_lost=['Fine. You can stay.'], after=['Gas, or creatures, or both. My book calls it nonsense. Good book.'], trainer_class='Scholar', name='Dilys', note='overnight draft (drafts/overnight/mirefen.md), DRAFT pending Gary'),
 "mirefen_trainer_4": npc(["This reed line's the only dry path. I'm on it. Battle me or swim."], battle_lost=["You'd not have liked swimming anyway."], after=['Burlbeetles float. Did you know that? Neither did they.'], trainer_class='Beetle Keeper', name='Esk', note='overnight draft (drafts/overnight/mirefen.md), DRAFT pending Gary'),
 "mirefen_trainer_5": npc(["Came down the spur on wheels? Brave. Let's see the rest of you."], battle_lost=['Brave and good. Annoying.'], after=["The spur ends at nothing. Except whatever's lying at the end of it."], trainer_class='Veteran', name='Hedda', name_status='proposed, pending Gary', note='overnight draft (drafts/overnight/mirefen.md), DRAFT; name approved by Gary Oct 23 9:05 AM CT'),
 "mirefen_sign": npc(['MIREFEN\nMarsh town. Built on stilts.', 'Stay on the boardwalks. Really.']),
 "mirefen_tideglide_giver": npc(["Storm's coming in. The causeway won't hold.", 'Your water creatures can carry you across. Call it Tideglide.'], kind='villager_scholar'),
 "mirefen_villager_1": npc(["Mirefen's built on stilts. Grandad built ours. It leans left.", 'So do we, now.'], kind='villager'),
})
# -- v0.4.11 map mirefen_hall_int (drafts/overnight/halls_mirefen.md) --
assert not set(maps.get("mirefen_hall_int", {})) & {'mirefen_hall_int_master', 'mirefen_hall_int_h1', 'mirefen_hall_int_h2', 'mirefen_hall_int_h3', 'mirefen_hall_int_guide'}
maps.setdefault("mirefen_hall_int", {}).update({
 "mirefen_hall_int_master": npc(["Folk call the bog dirty. It's honest. Everything in it is busy.", 'Same as my team. Come on, then.'], battle_lost=['Muddy work. Good work.'], battle_won=['The bog takes boots, not grudges.', 'Dry off and come back.'], coin_handover=["Take the Reed Coin. That's five.", "It's been in the bog. It's been cleaned. Twice."], gift=['A couple of seeds too. Feed them to your team, not the garden.'], after=["Storm's coming in off the sea. You'll feel it by tonight.", "When it hits, come and find me. I'll teach your team to glide the water."], after_storm=["There it is. The coast road's under water now.", "Let's teach your team Tideglide. Stay on its back and let it do the work."], skill_learned=['You can now use Tideglide outside battle.'], kind='master', name='Wenna Peat', coin_name='Reed Coin', name_status='DRAFT, pending Gary (name + coin name)', note='Master Wenna Peat (master_mirefen); win sets beat_master_mirefen. Overnight hall draft (drafts/overnight/halls_mirefen.md)'),
 "mirefen_hall_int_h1": npc(["The planks you can't see are still there. Probably."], battle_lost=["Probably I should've trained more."], after=['A sinking plank comes back up. Count two, then go.'], name='Cass', trainer_class='Hall Helper', note='hall trainer tr_hall_mirefen_h1 (masters.json order h1); overnight hall draft, DRAFT pending Gary'),
 "mirefen_hall_int_h2": npc(["It's dark in here on purpose. Wenna says it builds character."], battle_lost=["My character's fine. My team, less so."], after=['The frogs croak in an order. Light the lamps the same way.'], name='Juno', trainer_class='Hall Helper', note='hall trainer tr_hall_mirefen_h2 (masters.json order h2); overnight hall draft, DRAFT pending Gary'),
 "mirefen_hall_int_h3": npc(['Last stretch of boards. My Mirejaw sleeps under this one.'], battle_lost=["Now he's awake. Thanks for that."], after=["Can't hear the frogs? Watch for ripples. Each one starts by a lamp."], name='Arlo', trainer_class='Hall Helper', note='hall trainer tr_hall_mirefen_h3 (masters.json order h3); overnight hall draft, DRAFT pending Gary'),
 "mirefen_hall_int_guide": npc(["It's dark on the water. Light a reed lamp and you'll see the planks near it.", 'The frogs croak in an order. Light the lamps in that same order.', "Can't hear them? Watch the water. Every croak leaves a ripple by its lamp."], note='stationary hall guide; overnight hall draft'),
})
# -- v0.4.11 map route_coast (drafts/overnight/route_brookhollow_tidewater.md) --
assert not set(maps.get("route_coast", {})) & {'route_coast_trainer_1', 'route_coast_trainer_2', 'route_coast_trainer_3', 'route_coast_trainer_4', 'route_coast_trainer_5', 'route_coast_trainer_6', 'route_coast_sign'}
maps.setdefault("route_coast", {}).update({
 "route_coast_trainer_1": npc(["Floodwater's warmer than you'd think. Battle in it?"], battle_lost=['Back in the water for me.'], after=["The coast road floods every spring. This year it didn't stop."], trainer_class='Reef Swimmer', name='Gwen', note='overnight draft (drafts/overnight/route_brookhollow_tidewater.md), DRAFT pending Gary'),
 "route_coast_trainer_2": npc(["This seawall's mine till six. Then it's the sea's."], battle_lost=["It's yours till six, then."], after=['When the tide comes over, get off the wall. I mean it.'], trainer_class='Harbour Hand', name='Heath', note='overnight draft (drafts/overnight/route_brookhollow_tidewater.md), DRAFT pending Gary'),
 "route_coast_trainer_3": npc(['Cliff path, cliff birds, cliff battle. Mind the edge.'], battle_lost=["I should've minded my own edge."], after=["Cranes nest under the overhang. Look, don't touch."], trainer_class='Birdwatcher', name='Ines', note='overnight draft (drafts/overnight/route_brookhollow_tidewater.md), DRAFT pending Gary'),
 "route_coast_trainer_4": npc(["This jetty's got three good spots. I'm using all of them."], battle_lost=['Have one. Have two.'], after=['Surfskippers jump the waves at high tide. Fun to watch. Hard to catch.'], trainer_class='Angler', name='Jarrah', note='overnight draft (drafts/overnight/route_brookhollow_tidewater.md), DRAFT pending Gary'),
 "route_coast_trainer_5": npc(["I've ridden this seawall rail a hundred times. Fallen off ninety."], battle_lost=['Ninety-one.'], after=["The rail's quicker than the wall path. Wetter, too."], trainer_class='Skater', name='Kestrel', note='overnight draft (drafts/overnight/route_brookhollow_tidewater.md), DRAFT pending Gary'),
 "route_coast_trainer_6": npc(['You swam all the way out here? Then you can battle.'], battle_lost=['And swim back. Good luck.'], after=["There's a hut roof past the reeds. Someone left something on it."], trainer_class='Reef Swimmer', name='Linnet', note='overnight draft (drafts/overnight/route_brookhollow_tidewater.md), DRAFT pending Gary'),
 "route_coast_sign": npc(['COAST ROAD\nFloods in storm season.', 'North: East Road. South: Tidewater Coast.']),
})
# -- v0.4.11 map tidewater_coast (drafts/overnight/tidewater_coast.md) --
assert not set(maps.get("tidewater_coast", {})) & {'tidewater_coast_trainer_1', 'tidewater_coast_trainer_2', 'tidewater_coast_trainer_3', 'tidewater_coast_trainer_4', 'tidewater_coast_trainer_5', 'tidewater_coast_trainer_6', 'tidewater_coast_sign', 'tidewater_coast_villager_1', 'tidewater_coast_lifeguard'}
maps.setdefault("tidewater_coast", {}).update({
 "tidewater_coast_trainer_1": npc(["Busy sea lane today. Two of us. Let's make it one."], battle_lost=['Your lane, then.'], after=["Lanternport's down the lane. Lose the shore? Follow the lighthouse."], trainer_class='Reef Swimmer', name='Merrow', note='overnight draft (drafts/overnight/tidewater_coast.md), DRAFT pending Gary'),
 "tidewater_coast_trainer_2": npc(["Don't step in the pools. Lurelamps live there and they've got opinions."], battle_lost=['Fine. Step where you want.'], after=['The pools refill twice a day. Something new turns up every time.'], trainer_class='Harbour Hand', name='Neve', note='overnight draft (drafts/overnight/tidewater_coast.md), DRAFT pending Gary'),
 "tidewater_coast_trainer_3": npc(['Fish swim under the arch. So do challengers.'], battle_lost=['And the challengers win, apparently.'], after=["At low tide you can walk right through the arch. At high tide, don't."], trainer_class='Angler', name='Osric', note='overnight draft (drafts/overnight/tidewater_coast.md), DRAFT pending Gary'),
 "tidewater_coast_trainer_4": npc(['Got out to the stack, did you? Not many bother.'], battle_lost=['Worth the trip, for you.'], after=["Cliffpuffs nest up top. They don't like visitors. Neither do I, usually."], trainer_class='Birdwatcher', name='Petra', note='overnight draft (drafts/overnight/tidewater_coast.md), DRAFT pending Gary'),
 "tidewater_coast_trainer_5": npc(["Last stretch before Lanternport. I've been waiting all day."], battle_lost=['Worth the wait. For you.'], after=["The harbour lights come on at dusk. You'll see them from here."], trainer_class='Reef Swimmer', name='Rook', note='overnight draft (drafts/overnight/tidewater_coast.md), DRAFT pending Gary'),
 "tidewater_coast_trainer_6": npc(['You found the grotto. Took me forty years.'], battle_lost=['Took you about a minute to beat me, too.'], after=["The back of the grotto's dry. Someone's left something there."], trainer_class='Veteran', name='Signe', note='overnight draft (drafts/overnight/tidewater_coast.md), DRAFT pending Gary'),
 "tidewater_coast_sign": npc(['TIDEWATER COAST\nWest: Lanternport. North: Coast Road.', 'Check the tide board before you swim.']),
 "tidewater_coast_villager_1": npc(["The coast road's under water half the year.", 'We get our post by boat. When the boat feels like it.'], kind='villager'),
 "tidewater_coast_lifeguard": npc(['Swim between the flags. And not in the grotto. And not at dusk.', 'Honestly, just paddle.'], kind='villager'),
})
# -- v0.4.11 map tidewater_hall_int (drafts/overnight/halls_tidewater_coast.md) --
assert not set(maps.get("tidewater_hall_int", {})) & {'tidewater_hall_int_master', 'tidewater_hall_int_h1', 'tidewater_hall_int_h2', 'tidewater_hall_int_h3', 'tidewater_hall_int_h4', 'tidewater_hall_int_guide'}
maps.setdefault("tidewater_hall_int", {}).update({
 "tidewater_hall_int_master": npc(["Calm water lies. Down here, the pull's always going somewhere.", "Let's see if your team keeps its footing."], battle_lost=["That's me pulled under. Fair enough."], battle_won=['The sea wins some. Not every one, though.', 'Try again.'], coin_handover=["Take the Undertow Coin. That's six.", "Feels heavier than it is. That's the point."], gift=['Two Pep Remedies. The swim out is longer than the swim in.'], after=["Lanternport's north up the coast. Take the sea lane. The road's long gone.", 'Their Master keeps the old lighthouse. Bring a warm jumper.'], kind='master', name='Jory Swell', coin_name='Undertow Coin', name_status='DRAFT, pending Gary (name + coin name)', note='Master Jory Swell (master_tidewater_coast); win sets beat_master_tidewater. Overnight hall draft (drafts/overnight/halls_tidewater_coast.md)'),
 "tidewater_hall_int_h1": npc(["Don't mind me, I'm checking the ledges.", "Fancy a battle while you're down here?"], battle_lost=['Right. Back under I go.'], after=['High tide opens the glide lanes. Low tide opens the floor. Mix them.'], name='Marlow', trainer_class='Hall Helper', note='hall trainer tr_hall_tidewater_coast_h1 (masters.json order h1); overnight hall draft, DRAFT pending Gary', name_status='placeholder name, pending Gary'),
 "tidewater_hall_int_h2": npc(["Tide's coming in. You've got about one battle."], battle_lost=["And now the tide's coming in on me."], after=['Stop it at high for a lane. Stop it at low when you need the floor.'], name='Moss', trainer_class='Hall Helper', note='hall trainer tr_hall_tidewater_coast_h2 (masters.json order h2); overnight hall draft, DRAFT pending Gary'),
 "tidewater_hall_int_h3": npc(['The water moves every few steps. I counted. I had time.'], battle_lost=["I'll go count something else."], after=["We move with the tide too. If I'm on a different ledge later, that's why."], name='Edda', trainer_class='Hall Helper', note='hall trainer tr_hall_tidewater_coast_h3 (masters.json order h3); overnight hall draft, DRAFT pending Gary'),
 "tidewater_hall_int_h4": npc(["Last ledge. Jory's past me, on the dry rock."], battle_lost=['Go on, before the water changes its mind.'], after=['Jory likes the tide halfway. Not my problem anymore.'], name='Wendell', trainer_class='Hall Helper', note='hall trainer tr_hall_tidewater_coast_h4 (masters.json order h4); overnight hall draft, DRAFT pending Gary'),
 "tidewater_hall_int_guide": npc(["The water moves with your steps. The big shell clock shows where it's at.", 'Two shell switches. One holds it high, one holds it low.', "You'll need both tides to reach Jory. Walk a bit, glide a bit."], note='stationary hall guide; overnight hall draft'),
})
# -- v0.4.11 map lanternport (drafts/overnight/lanternport.md) --
assert not set(maps.get("lanternport", {})) & {'lanternport_ron_5', 'lanternport_trainer_1', 'lanternport_sign', 'lanternport_lighthouse_keeper', 'lanternport_villager_1'}
maps.setdefault("lanternport", {}).update({
 "lanternport_ron_5": npc(['The neighbour left a note about the bins.', "I'm choosing to battle you instead, {nick}."], battle_lost=["Yeah. You'd have won with or without this.", 'Hang on. Before you go.'], battle_won=["Don't read into it.", "I'll be around, {nick}. I've got something for you."], after=['Found this in a lost-and-found box at the station. Revival Tech paper.', "I read it. Then I thought about keeping it. Then I didn't."], after_2=["No job, remember? So I'm not doing this for the company.", "I'm doing it because they're ours. Same as you."], opener='ron_battle_openers.ron_rival_lanternport', note='Ron battle (GD ron_5); the existing opener ron_rival_lanternport plays first, then these pages. DRAFT, pending Gary'),
 "lanternport_trainer_1": npc(["End of the pier's my office. Today it's a battlefield."], battle_lost=['Back to the office.'], after=['The lighthouse keeper knows everyone. Ask about the horn.'], trainer_class='Harbour Hand', name='Tamsin', note='overnight draft (drafts/overnight/lanternport.md), DRAFT pending Gary'),
 "lanternport_sign": npc(['LANTERNPORT\nLighthouse town.', 'East: Tidewater Coast. North: Tide-lock Road.']),
 "lanternport_lighthouse_keeper": npc(["The horn hasn't sounded in years. Loud enough to wake a giant.", "That's not a figure of speech, by the way."], kind='villager_scholar'),
 "lanternport_villager_1": npc(['The lighthouse keeps the boats off the rocks.', 'Keeps me up at night, too. Swings right past my window.'], kind='villager'),
})
# -- v0.4.11 map lanternport_hall_int (drafts/overnight/halls_lanternport.md) --
assert not set(maps.get("lanternport_hall_int", {})) & {'lanternport_hall_int_master', 'lanternport_hall_int_h1', 'lanternport_hall_int_h2', 'lanternport_hall_int_h3', 'lanternport_hall_int_guide'}
maps.setdefault("lanternport_hall_int", {}).update({
 "lanternport_hall_int_master": npc(["This light's been out for years. Ships still find the harbour anyway.", "I'd like to think it's my team. Shall we see?"], battle_lost=['Well. You found your way just fine.'], battle_won=['Even lighthouses go dark sometimes.', 'Rest, then climb back up.'], coin_handover=["Take the Beacon Coin. That's seven.", "It glows a little at night. Don't ask me how."], gift=['Five crystals as well. Good ones. The harbour has plenty.'], after=["The tide-lock's open. Fernwick's a short walk now.", "And the horn... someone's been asleep on the Cindervale road too long."], horn=['Far off, the Lanternport horn sounds.'], kind='master', name='Delphine Orrin', coin_name='Beacon Coin', name_status='DRAFT, pending Gary (name + coin name)', note='Master Delphine Orrin (name approved by Gary Oct 23 9:05 AM CT) (master_lanternport); win sets beat_master_lanternport. Overnight hall draft (drafts/overnight/halls_lanternport.md)'),
 "lanternport_hall_int_h1": npc(['Lit every lamp in this town for thirty years. Never this one.'], battle_lost=['Still never lit it.'], after=['Long beam, short beam. Write it down if you need to. I did.'], name='Gil', trainer_class='Hall Helper', note='hall trainer tr_hall_lanternport_h1 (masters.json order h1); overnight hall draft, DRAFT pending Gary'),
 "lanternport_hall_int_h2": npc(["People say this place is haunted. It is. They're friendly."], battle_lost=['Friendly, not strong. Noted.'], after=['Each floor uses the same four colours. The order changes.'], name='Hana', trainer_class='Hall Helper', note='hall trainer tr_hall_lanternport_h2 (masters.json order h2); overnight hall draft, DRAFT pending Gary'),
 "lanternport_hall_int_h3": npc(["Top floor's the darkest. You'll want to look at the sea."], battle_lost=['Go on, then. Look at the sea.'], after=["The code's in the water. The reflection, not the waves."], name='Iska', trainer_class='Hall Helper', note='hall trainer tr_hall_lanternport_h3 (masters.json order h3); overnight hall draft, DRAFT pending Gary'),
 "lanternport_hall_int_guide": npc(['The lens flashes long and short beams through four coloured panes.', 'Each floor has four lamps in those colours. Light them in that order.', 'Get it wrong and they go out. No harm done. The ghosts find it funny.'], note='stationary hall guide; overnight hall draft'),
})
# -- v0.4.11 map route_fernwick_lanternport (drafts/overnight/route_fernwick_lanternport.md) --
assert not set(maps.get("route_fernwick_lanternport", {})) & {'route_fernwick_lanternport_trainer_1', 'route_fernwick_lanternport_trainer_2', 'route_fernwick_lanternport_trainer_3', 'route_fernwick_lanternport_trainer_4', 'route_fernwick_lanternport_sign', 'route_fernwick_lanternport_lock_keeper'}
maps.setdefault("route_fernwick_lanternport", {}).update({
 "route_fernwick_lanternport_trainer_1": npc(['The lock fills slowly. Plenty of time for a battle.'], battle_lost=["Lock's full. My luck's empty."], after=['The keeper only opens the tide-lock for people the town trusts.'], trainer_class='Angler', name='Umber', note='overnight draft (drafts/overnight/route_fernwick_lanternport.md), DRAFT pending Gary'),
 "route_fernwick_lanternport_trainer_2": npc(["I light these lamps every evening. You're in my way."], battle_lost=["Fine. I'll light around you."], after=["Same poles as my grandad's day. Crystal in them now, not flame."], trainer_class='Lamplighter', name='Viggo', note='overnight draft (drafts/overnight/route_fernwick_lanternport.md), DRAFT pending Gary'),
 "route_fernwick_lanternport_trainer_3": npc(['Forest edge. Fernwick that way, canal this way, me in the middle.'], battle_lost=['You can have the middle.'], after=["Fernwick's back through the trees. The path's clear now."], trainer_class='Ranger', name='Wyn', note='overnight draft (drafts/overnight/route_fernwick_lanternport.md), DRAFT pending Gary'),
 "route_fernwick_lanternport_trainer_4": npc(["You walk like someone who's won a few coins. Show me."], battle_lost=['More than a few, then.'], after=["Rest up before Cindervale. It's hot there, and rude about it."], trainer_class='Veteran', name='Xan', note='overnight draft (drafts/overnight/route_fernwick_lanternport.md), DRAFT pending Gary'),
 "route_fernwick_lanternport_sign": npc(['TIDE-LOCK ROAD\nEast: Fernwick. South: Lanternport.', "The lock opens on the keeper's say-so."]),
 "route_fernwick_lanternport_lock_keeper": npc(blockers["gate_lanternport_tidelock"]["keeper_before"], kind="guard", gate="gate_lanternport_tidelock",
             variants=[{"flag": "beat_master_lanternport", "pages": blockers["gate_lanternport_tidelock"]["keeper_after"]}],
             note="speaks blockers.gate_lanternport_tidelock (proposed lock_keeper); same words"),
})
# -- v0.4.11 map route_cindervale (drafts/overnight/route_aurelith_cindervale.md) --
assert not set(maps.get("route_cindervale", {})) & {'route_cindervale_trainer_1', 'route_cindervale_trainer_2', 'route_cindervale_trainer_3', 'route_cindervale_trainer_4', 'route_cindervale_trainer_5', 'route_cindervale_trainer_6', 'route_cindervale_sign'}
maps.setdefault("route_cindervale", {}).update({
 "route_cindervale_trainer_1": npc(['A giant slept here for years. Left a dent the size of a house.'], battle_lost=["Now there's a dent in me, too."], after=["The horn woke it. Nobody's sure where it went. Nobody's asking."], trainer_class='Smith', name='Yolo', note='overnight draft (drafts/overnight/route_aurelith_cindervale.md), DRAFT pending Gary'),
 "route_cindervale_trainer_2": npc(['Ash in my boots, ash in my lunch. Battle me before I give up.'], battle_lost=['I give up. On today.'], after=['Geysirox vents go off without warning. Stand upwind.'], trainer_class='Hillwalker', name='Zinnia', note='overnight draft (drafts/overnight/route_aurelith_cindervale.md), DRAFT pending Gary'),
 "route_cindervale_trainer_3": npc(["I'm measuring the vents. Let's see if you measure up."], battle_lost=['You measure up fine.'], after=["The vents run hotter every month. The company says that's normal."], trainer_class='Field Researcher', name='Pip', note='overnight draft (drafts/overnight/route_aurelith_cindervale.md), DRAFT pending Gary'),
 "route_cindervale_trainer_4": npc(["Lava made these steps, not people. They're uneven. So am I."], battle_lost=['Very uneven, apparently.'], after=["Cindervale's at the bottom. Hold the rail on the way down."], trainer_class='Climber', name='Tam', note='overnight draft (drafts/overnight/route_aurelith_cindervale.md), DRAFT pending Gary'),
 "route_cindervale_trainer_5": npc(["Outpost forge. I make tools and lose battles. Let's test the second one."], battle_lost=["Test passed. Or failed. Depends who's asking."], after=['The forges in town have run for three hundred years. Never this busy.'], trainer_class='Smith', name='Wren', note='overnight draft (drafts/overnight/route_aurelith_cindervale.md), DRAFT pending Gary'),
 "route_cindervale_trainer_6": npc(["The tube's cooler than outside. That's not saying much."], battle_lost=['Cool enough to lose in, anyway.'], after=["There's a ledge at the end of the tube. Something's glinting on it."], trainer_class='Veteran', name='Odo', note='overnight draft (drafts/overnight/route_aurelith_cindervale.md), DRAFT pending Gary'),
 "route_cindervale_sign": npc(['EMBER ROAD\nNorth: Aurelith. South: Cindervale.', "Vents are hot. Don't stand on them."]),
})
# -- v0.4.11 map cindervale (drafts/overnight/cindervale.md) --
assert not set(maps.get("cindervale", {})) & {'cindervale_trainer_1', 'cindervale_sign', 'cindervale_smith', 'cindervale_villager_1'}
maps.setdefault("cindervale", {}).update({
 "cindervale_trainer_1": npc(["The forge square's for working. And for this."], battle_lost=['Back to working, then.'], after=["The Master's hall is past the anvils. It's warm in there. Very."], trainer_class='Smith', name='Bea', note='overnight draft (drafts/overnight/cindervale.md), DRAFT pending Gary'),
 "cindervale_sign": npc(['CINDERVALE\nForge town.', 'Mind the sparks. Mind the anvils.']),
 "cindervale_smith": npc(['Three hundred years this forge has run.', 'Revival Tech wants it running faster. The forge has opinions.'], kind='villager'),
 "cindervale_villager_1": npc(["Cindervale's warm all year. We don't own coats. We own sunburns."], kind='villager'),
})
# -- v0.4.11 map cindervale_hall_int (drafts/overnight/halls_cindervale.md) --
assert not set(maps.get("cindervale_hall_int", {})) & {'cindervale_hall_int_master', 'cindervale_hall_int_h1', 'cindervale_hall_int_h2', 'cindervale_hall_int_h3', 'cindervale_hall_int_h4', 'cindervale_hall_int_guide'}
maps.setdefault("cindervale_hall_int", {}).update({
 "cindervale_hall_int_master": npc(["Seven coins. The road's hammered you into shape on the way here.", "Last one's mine. Let's see what you're made of."], battle_lost=["Ha! Tempered. That's what you are."], battle_won=['Not yet. Cool off and come back hotter.'], coin_handover=["Take the Forge Coin. That's eight. That's all of them.", "Made it myself. It'll outlast both of us."], gift=["Three seeds for your team. The last stop's earned them."], after=['Eight coins. Folk in Aurelith will want to know your name now.', 'Go home for a bit. You look like you need it.'], kind='master', name='Brannock Fell', coin_name='Forge Coin', name_status='DRAFT, pending Gary (name + coin name)', note='Master Brannock Fell (master_cindervale); win sets beat_master_cindervale. Overnight hall draft (drafts/overnight/halls_cindervale.md)'),
 "cindervale_hall_int_h1": npc(["Mind the apron. It's my good one."], battle_lost=['Still a good apron.'], after=['Springs are few. Count the tiles you need before you pour.'], name='Jem', trainer_class='Hall Helper', note='hall trainer tr_hall_cindervale_h1 (masters.json order h1); overnight hall draft, DRAFT pending Gary'),
 "cindervale_hall_int_h2": npc(["It's warm in here. That's not a joke, I'm just telling you."], battle_lost=["Now I'm warm and I've lost."], after=["Cooled tiles near a bellows won't stay cool. Pick a line away from them."], name='Kerr', trainer_class='Hall Helper', note='hall trainer tr_hall_cindervale_h2 (masters.json order h2); overnight hall draft, DRAFT pending Gary'),
 "cindervale_hall_int_h3": npc(["My Ingotitan's been at this forge longer than me. Show it some respect."], battle_lost=['It respected you back. Annoying.'], after=['The lever by the door starts the floor over. Use it. Nobody counts.'], name='Lark', trainer_class='Hall Helper', note='hall trainer tr_hall_cindervale_h3 (masters.json order h3); overnight hall draft, DRAFT pending Gary'),
 "cindervale_hall_int_h4": npc(["Seven coins? That's why your hands look so steady."], battle_lost=["Mine don't. Go on, the anvil's yours."], after=["Brannock talks a lot before he battles. Let him. It's the only break you'll get."], name='Mabry', trainer_class='Hall Helper', note='hall trainer tr_hall_cindervale_h4 (masters.json order h4); overnight hall draft, DRAFT pending Gary'),
 "cindervale_hall_int_guide": npc(["Springs fill your bucket. Three pours a bucket. Springs are few.", 'Pour on lava and it cools to stone for good. Unless a bellows gets at it.', 'Count the tiles you need before your first pour. Then count again.'], note='stationary hall guide; overnight hall draft'),
})
# ==== end v0.4.11 overnight merge ====
# ==== v0.4.12 BATCH 2 MERGE (World Design SPOTS_from_world_design.md, Batch 2) ====
# 92 new spot ids (+ trainers.thornwood.c/d/e, trainers.greystone.c on those spots; ron.battle_1 = existing fernwick.ron_rival_1, not duplicated).
# Aurelith arena (8) and Greystone B2 (6) lines stay in drafts: no maps yet. Hint spots sit on the pickup cell; clerk variants share shop_int.clerk (2,3).
# -- v0.4.12 map aurelith (drafts/overnight/aurelith.md) --
assert not set(maps.get("aurelith", {})) & {'aurelith_au_fountain_hint'}
maps.setdefault("aurelith", {}).update({
 'aurelith_au_fountain_hint': npc(['Something glints on the fountain rim.'], note='overnight draft (drafts/overnight/aurelith.md), DRAFT pending Gary; Batch 2; pickup hint (a small purse)'),
})
# -- v0.4.12 map cindervale (drafts/overnight/cindervale.md, drafts/overnight/halls_cindervale.md) --
assert not set(maps.get("cindervale", {})) & {'cindervale_cv_hidden_anvil_hint', 'cindervale_hall_int_sign_hall_outside'}
maps.setdefault("cindervale", {}).update({
 'cindervale_cv_hidden_anvil_hint': npc(['Something glints by the old anvil.'], note='overnight draft (drafts/overnight/cindervale.md), DRAFT pending Gary; Batch 2; pickup hint (a small purse)'),
 'cindervale_hall_int_sign_hall_outside': npc(["CINDERVALE MASTER'S HALL\nThe Forge. Master: Brannock Fell (fire)", "Floor's hot. Shoes are your problem."], note='overnight draft (drafts/overnight/halls_cindervale.md), DRAFT pending Gary; Batch 2'),
})
# -- v0.4.12 map cindervale_hall_int (drafts/overnight/halls_cindervale.md) --
assert not set(maps.get("cindervale_hall_int", {})) & {'cindervale_hall_int_bellows', 'cindervale_hall_int_pour', 'cindervale_hall_int_poured', 'cindervale_hall_int_spring_tap', 'cindervale_hall_int_spring_tap_dry', 'cindervale_hall_int_sign_reset_lever', 'cindervale_hall_int_remelt', 'cindervale_hall_int_sign_quench'}
maps.setdefault("cindervale_hall_int", {}).update({
 'cindervale_hall_int_bellows': npc(['A bellows. It huffs heat at the tiles around it.'], note='overnight draft (drafts/overnight/halls_cindervale.md), DRAFT pending Gary; Batch 2'),
 'cindervale_hall_int_pour': npc(['Pour water on the lava?'], note='overnight draft (drafts/overnight/halls_cindervale.md), DRAFT pending Gary; Batch 2'),
 'cindervale_hall_int_poured': npc(['It hisses and goes dark. Stone now.'], note='overnight draft (drafts/overnight/halls_cindervale.md), DRAFT pending Gary; Batch 2'),
 'cindervale_hall_int_remelt': npc(['The bellows huffs. The stone nearby glows red again.'], note='overnight draft (drafts/overnight/halls_cindervale.md), DRAFT pending Gary; Batch 2'),
 'cindervale_hall_int_sign_quench': npc(['QUENCH CHANNELS\nSpring spouts fill the bucket.', 'Pour on lava to cool it to stone. Bellows heat it back up.'], note='overnight draft (drafts/overnight/halls_cindervale.md), DRAFT pending Gary; Batch 2'),
 'cindervale_hall_int_sign_reset_lever': npc(["RESET LEVER\nPull to start over. Nobody's counting."], note='overnight draft (drafts/overnight/halls_cindervale.md), DRAFT pending Gary; Batch 2'),
 'cindervale_hall_int_spring_tap': npc(['A spring spout. Your bucket fills up. Three pours.'], note='overnight draft (drafts/overnight/halls_cindervale.md), DRAFT pending Gary; Batch 2'),
 'cindervale_hall_int_spring_tap_dry': npc(["The spout's dry. That's all this one had."], note='overnight draft (drafts/overnight/halls_cindervale.md), DRAFT pending Gary; Batch 2'),
})
# -- v0.4.12 map frostspire (drafts/overnight/frostspire.md, drafts/overnight/halls_frostspire.md) --
assert not set(maps.get("frostspire", {})) & {'frostspire_hall_int_sign_hall_outside', 'frostspire_fs_hidden_cairn_hint', 'frostspire_sled_run_top', 'frostspire_fs_shrine_hint'}
maps.setdefault("frostspire", {}).update({
 'frostspire_fs_hidden_cairn_hint': npc(['Something glints by the cairn.'], note='overnight draft (drafts/overnight/frostspire.md), DRAFT pending Gary; Batch 2; pickup hint (a small purse)'),
 'frostspire_fs_shrine_hint': npc(['Something glints by the shrine offering stone.'], note='overnight draft (drafts/overnight/frostspire.md), DRAFT pending Gary; Batch 2; pickup hint (Calm Tea)'),
 'frostspire_hall_int_sign_hall_outside': npc(["FROSTSPIRE MASTER'S HALL\nMaster: Hale Corrie (wind)", 'The roof is open. Hold onto your hat.'], note='overnight draft (drafts/overnight/halls_frostspire.md), DRAFT pending Gary; Batch 2'),
 'frostspire_sled_run_top': npc(['SLED RUN: one way only.', "Once you're down, you walk back round."], note='overnight draft (drafts/overnight/frostspire.md), DRAFT pending Gary; Batch 2'),
})
# -- v0.4.12 map frostspire_hall_int (drafts/overnight/halls_frostspire.md) --
assert not set(maps.get("frostspire_hall_int", {})) & {'frostspire_hall_int_feathers', 'frostspire_hall_int_sign_gusts', 'frostspire_hall_int_bell_rope_pulled', 'frostspire_hall_int_bell_rope'}
maps.setdefault("frostspire_hall_int", {}).update({
 'frostspire_hall_int_bell_rope': npc(['A bell rope. Pull it?'], note='overnight draft (drafts/overnight/halls_frostspire.md), DRAFT pending Gary; Batch 2'),
 'frostspire_hall_int_bell_rope_pulled': npc(['The bell rings. All the vents change direction at once.'], note='overnight draft (drafts/overnight/halls_frostspire.md), DRAFT pending Gary; Batch 2'),
 'frostspire_hall_int_feathers': npc(["Feathers on the floor, all pointing the same way. That's where the wind's going."], note='overnight draft (drafts/overnight/halls_frostspire.md), DRAFT pending Gary; Batch 2'),
 'frostspire_hall_int_sign_gusts': npc(['GUST LANES\nVents push you to the next banner.', 'Pull a bell rope to swap the vents. Check the feathers first.'], note='overnight draft (drafts/overnight/halls_frostspire.md), DRAFT pending Gary; Batch 2'),
})
# -- v0.4.12 map frostspire_pass (drafts/overnight/route_greystone_frostspire.md) --
assert not set(maps.get("frostspire_pass", {})) & {'frostspire_pass_fp_bridge_hint', 'frostspire_pass_fp_camp_hint'}
maps.setdefault("frostspire_pass", {}).update({
 'frostspire_pass_fp_bridge_hint': npc(['Something glints by the bridge anchor post.'], note='overnight draft (drafts/overnight/route_greystone_frostspire.md), DRAFT pending Gary; Batch 2; pickup hint (Big Remedy)'),
 'frostspire_pass_fp_camp_hint': npc(["Something glints under the camp's spare tarp."], note='overnight draft (drafts/overnight/route_greystone_frostspire.md), DRAFT pending Gary; Batch 2; pickup hint (Feed Bag)'),
})
# -- v0.4.12 map greystone_b1 (drafts/overnight/greystone_caverns.md) --
assert not set(maps.get("greystone_b1", {})) & {'greystone_caverns_c_researcher'}
maps.setdefault("greystone_b1", {}).update({
 'greystone_caverns_c_researcher': npc(["I was meant to meet a field team down here. You're not them."], battle_lost=["You're not them. But you're not bad."], after=["Their camp's still set up. Bedrolls out, maps pinned.", 'Like they meant to come back.'], trainer_class='Field Researcher', name='Mags', note='overnight draft (drafts/overnight/greystone_caverns.md), DRAFT pending Gary; Batch 2; trainer tr_greystone_c'),
})
# -- v0.4.12 map lanternport (drafts/overnight/halls_lanternport.md, drafts/overnight/lanternport.md) --
assert not set(maps.get("lanternport", {})) & {'lanternport_hall_int_sign_hall_outside', 'lanternport_lp_hidden_crate_hint'}
maps.setdefault("lanternport", {}).update({
 'lanternport_hall_int_sign_hall_outside': npc(['THE OLD LIGHTHOUSE\nMaster: Delphine Orrin (spirit)', 'The stairs open floor by floor. Watch the lens.'], note='overnight draft (drafts/overnight/halls_lanternport.md), DRAFT; name approved by Gary Oct 23 9:05 AM CT; Batch 2'),
 'lanternport_lp_hidden_crate_hint': npc(['Something glints by the warehouse crate.'], note='overnight draft (drafts/overnight/lanternport.md), DRAFT pending Gary; Batch 2; pickup hint (a small purse)'),
})
# -- v0.4.12 map lanternport_hall_int (drafts/overnight/halls_lanternport.md) --
assert not set(maps.get("lanternport_hall_int", {})) & {'lanternport_hall_int_sign_lens', 'lanternport_hall_int_lamps_out', 'lanternport_hall_int_sign_top_floor', 'lanternport_hall_int_window_top', 'lanternport_hall_int_lamp_post', 'lanternport_hall_int_lens'}
maps.setdefault("lanternport_hall_int", {}).update({
 'lanternport_hall_int_lamp_post': npc(['A lamp post with a coloured pane. Light it?'], note='overnight draft (drafts/overnight/halls_lanternport.md), DRAFT pending Gary; Batch 2'),
 'lanternport_hall_int_lamps_out': npc(['The lamps on this floor go out together. Back to the start.'], note='overnight draft (drafts/overnight/halls_lanternport.md), DRAFT pending Gary; Batch 2'),
 'lanternport_hall_int_lens': npc(['The lens flashes. Long, short, short, long... in four colours.'], note='overnight draft (drafts/overnight/halls_lanternport.md), DRAFT pending Gary; Batch 2'),
 'lanternport_hall_int_sign_lens': npc(['LENS SIGNAL\nThe lens flashes a code in four colours.', 'Light the lamps in that order. Wrong order? They go out. Try again.'], note='overnight draft (drafts/overnight/halls_lanternport.md), DRAFT pending Gary; Batch 2'),
 'lanternport_hall_int_sign_top_floor': npc(['TOP FLOOR\nNo lens up here. Look out the window.'], note='overnight draft (drafts/overnight/halls_lanternport.md), DRAFT pending Gary; Batch 2'),
 'lanternport_hall_int_window_top': npc(["Out on the dark sea, a reflection of the lens. It's flashing a code."], note='overnight draft (drafts/overnight/halls_lanternport.md), DRAFT pending Gary; Batch 2'),
})
# -- v0.4.12 map mirefen (drafts/overnight/halls_mirefen.md, drafts/overnight/mirefen.md) --
assert not set(maps.get("mirefen", {})) & {'mirefen_bog_lights', 'mirefen_mf_hidden_lights_hint', 'mirefen_hall_int_sign_hall_outside'}
maps.setdefault("mirefen", {}).update({
 'mirefen_bog_lights': npc(['Little lights hang over the bog. They drift when you walk.', 'They seem to gather in one spot.'], note='overnight draft (drafts/overnight/mirefen.md), DRAFT pending Gary; Batch 2'),
 'mirefen_hall_int_sign_hall_outside': npc(["MIREFEN MASTER'S HALL\nMaster: Wenna Peat (swamp)", 'Stilts checked every spring. Mostly.'], note='overnight draft (drafts/overnight/halls_mirefen.md), DRAFT pending Gary; Batch 2'),
 'mirefen_mf_hidden_lights_hint': npc(['Something glints where the bog lights gather.'], note='overnight draft (drafts/overnight/mirefen.md), DRAFT pending Gary; Batch 2; pickup hint (Pep Remedy)'),
})
# -- v0.4.12 map mirefen_hall_int (drafts/overnight/halls_mirefen.md) --
assert not set(maps.get("mirefen_hall_int", {})) & {'mirefen_hall_int_reed_lamp', 'mirefen_hall_int_reed_lamp_lit', 'mirefen_hall_int_reed_lamp_wrong', 'mirefen_hall_int_sinking_plank', 'mirefen_hall_int_sign_boardwalk'}
maps.setdefault("mirefen_hall_int", {}).update({
 'mirefen_hall_int_reed_lamp': npc(['A reed lamp. Light it?'], note='overnight draft (drafts/overnight/halls_mirefen.md), DRAFT pending Gary; Batch 2'),
 'mirefen_hall_int_reed_lamp_lit': npc(['The lamp catches. Planks show up on the water nearby.'], note='overnight draft (drafts/overnight/halls_mirefen.md), DRAFT pending Gary; Batch 2'),
 'mirefen_hall_int_reed_lamp_wrong': npc(['The lamps flicker out. The frogs go quiet, then start again.'], note='overnight draft (drafts/overnight/halls_mirefen.md), DRAFT pending Gary; Batch 2'),
 'mirefen_hall_int_sign_boardwalk': npc(['BOG-LIGHT BOARDWALK\nLit reed lamps show nearby planks.', 'Some planks sink. Wait and they come back up. Listen to the frogs.'], note='overnight draft (drafts/overnight/halls_mirefen.md), DRAFT pending Gary; Batch 2'),
 'mirefen_hall_int_sinking_plank': npc(['This plank is sinking. Give it a moment.'], note='overnight draft (drafts/overnight/halls_mirefen.md), DRAFT pending Gary; Batch 2'),
})
# -- v0.4.12 map revival_hall_int (drafts/overnight/halls_revival_heights.md) --
assert not set(maps.get("revival_hall_int", {})) & {'revival_hall_int_sign_prisms', 'revival_hall_int_violet_note', 'revival_hall_int_receiver_dim', 'revival_hall_int_receiver_lit'}
maps.setdefault("revival_hall_int", {}).update({
 'revival_hall_int_receiver_dim': npc(['A crystal set in the wall. Dark for now.'], note='overnight draft (drafts/overnight/halls_revival_heights.md), DRAFT pending Gary; Batch 2'),
 'revival_hall_int_receiver_lit': npc(['The crystal glows violet. The door beside it slides open.'], note='overnight draft (drafts/overnight/halls_revival_heights.md), DRAFT pending Gary; Batch 2'),
 'revival_hall_int_sign_prisms': npc(['PRISM RELAY\nTurn prisms. A lit crystal opens a door.', 'Room three: one beam, two crystals, in a row. Plan ahead.'], note='overnight draft (drafts/overnight/halls_revival_heights.md), DRAFT pending Gary; Batch 2'),
 'revival_hall_int_violet_note': npc(['Same violet as the crystal at your branch office.', 'Must be a company colour.'], note='overnight draft (drafts/overnight/halls_revival_heights.md), DRAFT pending Gary; Batch 2'),
})
# -- v0.4.12 map revival_heights (drafts/overnight/halls_revival_heights.md, drafts/overnight/revival_heights.md) --
assert not set(maps.get("revival_heights", {})) & {'revival_hall_int_sign_hall_outside', 'revival_heights_rh_plaza_hint'}
maps.setdefault("revival_heights", {}).update({
 'revival_hall_int_sign_hall_outside': npc(["REVIVAL HEIGHTS MASTER'S HALL\nMaster: Cassia Lume (light)", 'Hall upkeep kindly paid for by Revival Tech.'], note='overnight draft (drafts/overnight/halls_revival_heights.md), DRAFT pending Gary; Batch 2'),
 'revival_heights_rh_plaza_hint': npc(['Something glints by the plaza planter.'], note='overnight draft (drafts/overnight/revival_heights.md), DRAFT pending Gary; Batch 2; pickup hint (Big Remedy)'),
})
# -- v0.4.12 map route_aurelith_saltmere (drafts/overnight/route_saltmere_aurelith.md) --
assert not set(maps.get("route_aurelith_saltmere", {})) & {'route_aurelith_saltmere_sa_hidden_post_hint', 'route_aurelith_saltmere_sa_salt_pan_hint'}
maps.setdefault("route_aurelith_saltmere", {}).update({
 'route_aurelith_saltmere_sa_hidden_post_hint': npc(['Something glints by the old signpost.'], note='overnight draft (drafts/overnight/route_saltmere_aurelith.md), DRAFT pending Gary; Batch 2; pickup hint (Feed Bag)'),
 'route_aurelith_saltmere_sa_salt_pan_hint': npc(['Something glints under the salt crust.'], note='overnight draft (drafts/overnight/route_saltmere_aurelith.md), DRAFT pending Gary; Batch 2; pickup hint (Crystal Dust)'),
})
# -- v0.4.12 map route_cindervale (drafts/overnight/route_aurelith_cindervale.md) --
assert not set(maps.get("route_cindervale", {})) & {'route_cindervale_ac_hidden_vent_hint', 'route_aurelith_cindervale_giant_hollow', 'route_cindervale_ac_slope_hint'}
maps.setdefault("route_cindervale", {}).update({
 'route_aurelith_cindervale_giant_hollow': npc(['A dent in the ground the size of a house.', "It's still warm."], note='overnight draft (drafts/overnight/route_aurelith_cindervale.md), DRAFT pending Gary; Batch 2'),
 'route_cindervale_ac_hidden_vent_hint': npc(['Something glints by the cold vent.'], note='overnight draft (drafts/overnight/route_aurelith_cindervale.md), DRAFT pending Gary; Batch 2; pickup hint (a small purse)'),
 'route_cindervale_ac_slope_hint': npc(['Something glints by the ash slope.'], note='overnight draft (drafts/overnight/route_aurelith_cindervale.md), DRAFT pending Gary; Batch 2; pickup hint (Big Remedy)'),
})
# -- v0.4.12 map route_coast (drafts/overnight/route_brookhollow_tidewater.md) --
assert not set(maps.get("route_coast", {})) & {'route_coast_ct_hidden_dune_hint', 'route_coast_ct_hidden_buoy_hint'}
maps.setdefault("route_coast", {}).update({
 'route_coast_ct_hidden_buoy_hint': npc(['Something glints by the beached buoy.'], note='overnight draft (drafts/overnight/route_brookhollow_tidewater.md), DRAFT pending Gary; Batch 2; pickup hint (a small purse)'),
 'route_coast_ct_hidden_dune_hint': npc(['Something glints by the dune grass.'], note='overnight draft (drafts/overnight/route_brookhollow_tidewater.md), DRAFT pending Gary; Batch 2; pickup hint (Pep Remedy)'),
})
# -- v0.4.12 map route_east (drafts/overnight/route_brookhollow_aurelith.md) --
assert not set(maps.get("route_east", {})) & {'route_east_re_hidden_post_hint', 'route_east_re_hidden_grass_hint'}
maps.setdefault("route_east", {}).update({
 'route_east_re_hidden_grass_hint': npc(['Something glints at the far end of the grass.'], note='overnight draft (drafts/overnight/route_brookhollow_aurelith.md), DRAFT pending Gary; Batch 2; pickup hint (Calm Tea)'),
 'route_east_re_hidden_post_hint': npc(['Something glints by the mile post.'], note='overnight draft (drafts/overnight/route_brookhollow_aurelith.md), DRAFT pending Gary; Batch 2; pickup hint (a small purse)'),
})
# -- v0.4.12 map route_fernwick_lanternport (drafts/overnight/route_fernwick_lanternport.md) --
assert not set(maps.get("route_fernwick_lanternport", {})) & {'route_fernwick_lanternport_lock_board', 'route_fernwick_lanternport_fl_hidden_hint'}
maps.setdefault("route_fernwick_lanternport", {}).update({
 'route_fernwick_lanternport_fl_hidden_hint': npc(['Something glints by the canal bollard.'], note='overnight draft (drafts/overnight/route_fernwick_lanternport.md), DRAFT pending Gary; Batch 2; pickup hint (Vigor Seed)'),
 'route_fernwick_lanternport_lock_board': npc(['TIDE-LOCK\nOpened by the keeper.', 'Lock times posted on the hut door.'], note='overnight draft (drafts/overnight/route_fernwick_lanternport.md), DRAFT pending Gary; Batch 2'),
})
# -- v0.4.12 map route_revival (drafts/overnight/route_thornwood_revival.md) --
assert not set(maps.get("route_revival", {})) & {'route_revival_tr_circle_hint', 'route_revival_tr_stakes_hint', 'route_revival_tr_hidden_tree_hint'}
maps.setdefault("route_revival", {}).update({
 'route_revival_tr_circle_hint': npc(['Something glints in the middle of the stones.'], note='overnight draft (drafts/overnight/route_thornwood_revival.md), DRAFT pending Gary; Batch 2; pickup hint (Vigor Seed)'),
 'route_revival_tr_hidden_tree_hint': npc(['Something glints by the lone tree.'], note='overnight draft (drafts/overnight/route_thornwood_revival.md), DRAFT pending Gary; Batch 2; pickup hint (a small purse)'),
 'route_revival_tr_stakes_hint': npc(['Something glints by the survey stake.'], note='overnight draft (drafts/overnight/route_thornwood_revival.md), DRAFT pending Gary; Batch 2; pickup hint (Crystal Dust)'),
})
# -- v0.4.12 map route_revival_saltmere (drafts/overnight/route_revival_saltmere.md) --
assert not set(maps.get("route_revival_saltmere", {})) & {'route_revival_saltmere_rs_flats_hint', 'route_revival_saltmere_rs_hidden_hint'}
maps.setdefault("route_revival_saltmere", {}).update({
 'route_revival_saltmere_rs_flats_hint': npc(['Something glints by the salt flat.'], note='overnight draft (drafts/overnight/route_revival_saltmere.md), DRAFT pending Gary; Batch 2; pickup hint (Crystal Dust)'),
 'route_revival_saltmere_rs_hidden_hint': npc(['Something glints by the lone post.'], note='overnight draft (drafts/overnight/route_revival_saltmere.md), DRAFT pending Gary; Batch 2; pickup hint (Vigor Seed)'),
})
# -- v0.4.12 map route_revival_sunmeadow (drafts/overnight/route_revival_sunmeadow.md) --
assert not set(maps.get("route_revival_sunmeadow", {})) & {'route_revival_sunmeadow_rsf_hidden_hint'}
maps.setdefault("route_revival_sunmeadow", {}).update({
 'route_revival_sunmeadow_rsf_hidden_hint': npc(['Something glints by the dim crystal stub.'], note='overnight draft (drafts/overnight/route_revival_sunmeadow.md), DRAFT pending Gary; Batch 2; pickup hint (Crystal Dust)'),
})
# -- v0.4.12 map route_saltmere_mirefen (drafts/overnight/route_saltmere_mirefen.md) --
assert not set(maps.get("route_saltmere_mirefen", {})) & {'route_saltmere_mirefen_sme_hidden_hint'}
maps.setdefault("route_saltmere_mirefen", {}).update({
 'route_saltmere_mirefen_sme_hidden_hint': npc(['Something glints by the causeway stone.'], note='overnight draft (drafts/overnight/route_saltmere_mirefen.md), DRAFT pending Gary; Batch 2; pickup hint (Crystal Dust)'),
})
# -- v0.4.12 map route_sunmeadow_mirefen (drafts/overnight/route_sunmeadow_mirefen.md) --
assert not set(maps.get("route_sunmeadow_mirefen", {})) & {'route_sunmeadow_mirefen_smm_fence_hint', 'route_sunmeadow_mirefen_smm_hidden_hint'}
maps.setdefault("route_sunmeadow_mirefen", {}).update({
 'route_sunmeadow_mirefen_smm_fence_hint': npc(['Something glints by the fence post.'], note='overnight draft (drafts/overnight/route_sunmeadow_mirefen.md), DRAFT pending Gary; Batch 2; pickup hint (Big Remedy)'),
 'route_sunmeadow_mirefen_smm_hidden_hint': npc(['Something glints by the reed tuft.'], note='overnight draft (drafts/overnight/route_sunmeadow_mirefen.md), DRAFT pending Gary; Batch 2; pickup hint (Vigor Seed)'),
})
# -- v0.4.12 map saltmere (drafts/overnight/halls_saltmere.md, drafts/overnight/saltmere.md) --
assert not set(maps.get("saltmere", {})) & {'saltmere_sm_islet_hint', 'saltmere_sm_hidden_crate_hint', 'saltmere_hall_int_sign_hall_outside'}
maps.setdefault("saltmere", {}).update({
 'saltmere_hall_int_sign_hall_outside': npc(["SALTMERE MASTER'S HALL\nMaster: Nerys Bryde (water)", 'Wipe your boots. The pans are wet. All of them.'], note='overnight draft (drafts/overnight/halls_saltmere.md), DRAFT pending Gary; Batch 2'),
 'saltmere_sm_hidden_crate_hint': npc(['Something glints by the fish crates.'], note='overnight draft (drafts/overnight/saltmere.md), DRAFT pending Gary; Batch 2; pickup hint (a small purse)'),
 'saltmere_sm_islet_hint': npc(['Something glints out on the lighthouse islet.'], note='overnight draft (drafts/overnight/saltmere.md), DRAFT pending Gary; Batch 2; pickup hint (Gold Token)'),
})
# -- v0.4.12 map saltmere_hall_int (drafts/overnight/halls_saltmere.md) --
assert not set(maps.get("saltmere_hall_int", {})) & {'saltmere_hall_int_reset_tile', 'saltmere_hall_int_drying_rack', 'saltmere_hall_int_sign_sluices'}
maps.setdefault("saltmere_hall_int", {}).update({
 'saltmere_hall_int_drying_rack': npc(['A drying rack. Salt has dried on the cloth in stripes.', 'Some stripes are wide, some are thin. Like someone counting.'], note='overnight draft (drafts/overnight/halls_saltmere.md), DRAFT pending Gary; Batch 2'),
 'saltmere_hall_int_reset_tile': npc(['Reset tile. The pans slosh back to how they started.'], note='overnight draft (drafts/overnight/halls_saltmere.md), DRAFT pending Gary; Batch 2'),
 'saltmere_hall_int_sign_sluices': npc(['SLUICE WHEELS\nEach wheel lifts a pan, drops the next.', 'Lost your dry line? Step on the tile by the door to reset.'], note='overnight draft (drafts/overnight/halls_saltmere.md), DRAFT pending Gary; Batch 2'),
})
# -- v0.4.12 map shop_int (drafts/overnight/aurelith.md, drafts/overnight/cindervale.md, drafts/overnight/frostspire.md, drafts/overnight/lanternport.md, drafts/overnight/mirefen.md, drafts/overnight/revival_heights.md, drafts/overnight/saltmere.md, drafts/overnight/tidewater_coast.md) --
assert not set(maps.get("shop_int", {})) & {'shop_int_clerk_saltmere', 'shop_int_clerk_frostspire', 'shop_int_clerk_mirefen', 'shop_int_clerk_aurelith', 'shop_int_clerk_cindervale', 'shop_int_clerk_tidewater_coast', 'shop_int_clerk_revival_heights', 'shop_int_clerk_lanternport'}
maps.setdefault("shop_int", {}).update({
 'shop_int_clerk_aurelith': npc(["RT Supply, Aurelith. We're the only shop the train stops for.", 'Feeds, remedies, crystals. What do you need?'], kind="clerk", variant_of="clerk", region='aurelith', regular=["Eight coins! I'd salute, but I'm holding a box."], note='overnight draft (drafts/overnight/aurelith.md), DRAFT pending Gary; Batch 2; region variant of shop_int.clerk, same cell (2,3)'),
 'shop_int_clerk_cindervale': npc(["Forge-side counter. Everything here's hard-wearing.", 'Remedies, crystals, feeds. What do you need?'], kind="clerk", variant_of="clerk", region='cindervale', regular=['Back from the vents? You look cooked. Remedies?'], note='overnight draft (drafts/overnight/cindervale.md), DRAFT pending Gary; Batch 2; region variant of shop_int.clerk, same cell (2,3)'),
 'shop_int_clerk_frostspire': npc(['Lodge stall. Warm hands, warm prices.', 'Remedies and feeds mostly. What do you need?'], kind="clerk", variant_of="clerk", region='frostspire', regular=["You again. Shut the door, the heat's getting out."], note='overnight draft (drafts/overnight/frostspire.md), DRAFT pending Gary; Batch 2; region variant of shop_int.clerk, same cell (2,3)'),
 'shop_int_clerk_lanternport': npc(['RT Supply, Lanternport. Biggest shelf on the coast.', 'Feeds, remedies, crystals. What do you need?'], kind="clerk", variant_of="clerk", region='lanternport', regular=["Seven coins? The back shelf's open to you now."], note='overnight draft (drafts/overnight/lanternport.md), DRAFT pending Gary; Batch 2; region variant of shop_int.clerk, same cell (2,3)'),
 'shop_int_clerk_mirefen': npc(['Stilt stall. Mind the gap in the floor.', 'Remedies, teas, Hush Spray. What do you need?'], kind="clerk", variant_of="clerk", region='mirefen', regular=['Still dry? Good. What can I get you?'], note='overnight draft (drafts/overnight/mirefen.md), DRAFT pending Gary; Batch 2; region variant of shop_int.clerk, same cell (2,3)'),
 'shop_int_clerk_revival_heights': npc(['RT Supply, head office branch. Staff prices on a staff ID.', 'Feeds, remedies, crystals. What do you need?'], kind="clerk", variant_of="clerk", region='revival_heights', regular=['Three coins? Then you can have the good shelf.'], note='overnight draft (drafts/overnight/revival_heights.md), DRAFT pending Gary; Batch 2; region variant of shop_int.clerk, same cell (2,3)'),
 'shop_int_clerk_saltmere': npc(['RT Supply, Saltmere branch. Everything smells of fish. Not the stock.', 'Feeds, remedies, crystals. What do you need?'], kind="clerk", variant_of="clerk", region='saltmere', regular=["Back again? The fish market's quieter than us today."], note='overnight draft (drafts/overnight/saltmere.md), DRAFT pending Gary; Batch 2; region variant of shop_int.clerk, same cell (2,3)'),
 'shop_int_clerk_tidewater_coast': npc(['Beach hut. We sell what the boat brings.', "Today that's remedies and crystals. What do you need?"], kind="clerk", variant_of="clerk", region='tidewater_coast', regular=['Boat came in. Same stuff, slightly sandier.'], note='overnight draft (drafts/overnight/tidewater_coast.md), DRAFT pending Gary; Batch 2; region variant of shop_int.clerk, same cell (2,3)'),
})
# -- v0.4.12 map sunmeadow_fields (drafts/overnight/sunmeadow_fields.md) --
assert not set(maps.get("sunmeadow_fields", {})) & {'sunmeadow_fields_smf_hidden_flowers_hint', 'sunmeadow_fields_smf_hidden_stile_hint'}
maps.setdefault("sunmeadow_fields", {}).update({
 'sunmeadow_fields_smf_hidden_flowers_hint': npc(['Something glints by the flower ring.'], note='overnight draft (drafts/overnight/sunmeadow_fields.md), DRAFT pending Gary; Batch 2; pickup hint (Big Remedy)'),
 'sunmeadow_fields_smf_hidden_stile_hint': npc(['Something glints by the stile.'], note='overnight draft (drafts/overnight/sunmeadow_fields.md), DRAFT pending Gary; Batch 2; pickup hint (a small purse)'),
})
# -- v0.4.12 map thornwood (drafts/overnight/thornwood.md) --
assert not set(maps.get("thornwood", {})) & {'thornwood_e_researcher', 'thornwood_d_kid', 'thornwood_c_gardener'}
maps.setdefault("thornwood", {}).update({
 'thornwood_c_gardener': npc(['I tidy this clearing every Sunday. Nobody asked me to.'], battle_lost=['Well. The brambles are winning today too.'], after=['Briarlets like the pond edge. Mind the thorns if you pick one up.'], trainer_class='Gardener', name='Kit', note='overnight draft (drafts/overnight/thornwood.md), DRAFT pending Gary; Batch 2; trainer tr_thornwood_c'),
 'thornwood_d_kid': npc(["Don't look at my boots. Look at my Gloamtick."], battle_lost=["My mum's going to ask about the mud AND this."], after=["Gloamticks come out more after dark. That's when I'm not allowed out."], trainer_class='Trail Kid', name='Lio', note='overnight draft (drafts/overnight/thornwood.md), DRAFT pending Gary; Batch 2; trainer tr_thornwood_d'),
 'thornwood_e_researcher': npc(["Revival Tech jacket? Field team? You're a bit late, aren't you?"], battle_lost=["Fine. You're not late. You're just new."], after=["The old camp's down the path. Nobody's lit that stove in weeks."], trainer_class='Field Researcher', name='Nell', note='overnight draft (drafts/overnight/thornwood.md), DRAFT pending Gary; Batch 2; trainer tr_thornwood_e'),
})
# -- v0.4.12 map tidewater_coast (drafts/overnight/halls_tidewater_coast.md, drafts/overnight/tidewater_coast.md) --
assert not set(maps.get("tidewater_coast", {})) & {'tidewater_coast_tc_hidden_wreck_hint', 'tidewater_coast_tide_board', 'tidewater_coast_tc_pools_hint', 'tidewater_hall_int_sign_hall_outside'}
maps.setdefault("tidewater_coast", {}).update({
 'tidewater_coast_tc_hidden_wreck_hint': npc(['Something glints by the wreck.'], note='overnight draft (drafts/overnight/tidewater_coast.md), DRAFT pending Gary; Batch 2; pickup hint (a small purse)'),
 'tidewater_coast_tc_pools_hint': npc(['Something glints by the tide pool.'], note='overnight draft (drafts/overnight/tidewater_coast.md), DRAFT pending Gary; Batch 2; pickup hint (Big Remedy)'),
 'tidewater_coast_tide_board': npc(['TIDE BOARD\nLow tide: morning. High tide: dusk.', 'The arch floods at high tide.'], note='overnight draft (drafts/overnight/tidewater_coast.md), DRAFT pending Gary; Batch 2'),
 'tidewater_hall_int_sign_hall_outside': npc(["TIDEWATER MASTER'S HALL\nMaster: Jory Swell (sea)", 'Check the shell clock before you go in. Then check it again.'], note='overnight draft (drafts/overnight/halls_tidewater_coast.md), DRAFT pending Gary; Batch 2'),
})
# -- v0.4.12 map tidewater_hall_int (drafts/overnight/halls_tidewater_coast.md) --
assert not set(maps.get("tidewater_hall_int", {})) & {'tidewater_hall_int_shell_switch_off', 'tidewater_hall_int_shell_switch_low', 'tidewater_hall_int_shell_clock', 'tidewater_hall_int_shell_switch_high', 'tidewater_hall_int_sign_tide_clock'}
maps.setdefault("tidewater_hall_int", {}).update({
 'tidewater_hall_int_shell_clock': npc(['A huge shell clock. The hand points at the tide right now.'], note='overnight draft (drafts/overnight/halls_tidewater_coast.md), DRAFT pending Gary; Batch 2'),
 'tidewater_hall_int_shell_switch_high': npc(['Shell switch. The clock stops at high tide.'], note='overnight draft (drafts/overnight/halls_tidewater_coast.md), DRAFT pending Gary; Batch 2'),
 'tidewater_hall_int_shell_switch_low': npc(['Shell switch. The clock stops at low tide.'], note='overnight draft (drafts/overnight/halls_tidewater_coast.md), DRAFT pending Gary; Batch 2'),
 'tidewater_hall_int_shell_switch_off': npc(['The clock starts ticking again. The water starts moving.'], note='overnight draft (drafts/overnight/halls_tidewater_coast.md), DRAFT pending Gary; Batch 2'),
 'tidewater_hall_int_sign_tide_clock': npc(['TIDE CLOCK\nLow tide: walk. High tide: glide.', 'A shell switch stops the clock right where it is.'], note='overnight draft (drafts/overnight/halls_tidewater_coast.md), DRAFT pending Gary; Batch 2'),
})

# ---- merge: convert every spot to the new "lines" format ----
MAPJ = {os.path.basename(f)[:-5]: json.load(open(f)) for f in glob.glob(OW + '/maps/*.json')}
def _tp(mj, key): return mj.get('text_pending', {}).get(key, []) if isinstance(mj.get('text_pending'), dict) else []
# v0.4.2: new interiors keep their ids under text_pending; the engine treats those exactly like the top-level lists
ISPOTS = {mid: {sp['id']: sp for sp in mj.get('interact_spots', []) + _tp(mj, 'interact_spots')} for mid, mj in MAPJ.items()}
for mid, spots in SOUL_PROPS.items():
    for sid, e in spots.items():
        assert sid not in maps.setdefault(mid, {}), (mid, sid)
        sp = ISPOTS.get(mid, {}).get(sid)
        if sp:   # World's interact_spots entry is the source of truth for geometry
            geo = {k: (list(sp[k]) if k == 'stand' else sp[k]) for k in GEOM_KEYS if k in sp}
            e = {**geo, **e}
        maps[mid][sid] = e
signs_awaiting_world_id = {"_note": "New signs World placed with no id yet (OVERWORLD_README: 'pending Text Bot ids'). Keyed map -> 'x,y'. "
                           "proposed_id is only a suggestion for World. When a map gets a sign / pending sign / interact spot at that cell, "
                           "the build moves the text to maps.<map>.<that id>."}
PROMOTED_SIGNS = []
for mid, cells in SIGNS_AWAITING_ID.items():
    mj = MAPJ[mid]
    at = {(o['x'], o['y']): o['id'] for o in mj.get('signs', []) + mj.get('signs_pending_text', []) + mj.get('interact_spots', []) + _tp(mj, 'signs') + _tp(mj, 'interact_spots')}
    for xy, e in cells.items():
        x, y = map(int, xy.split(','))
        if (x, y) in at:
            wid = at[(x, y)]; assert wid not in maps.setdefault(mid, {}), (mid, wid)
            maps[mid][wid] = {"pages": e["lines"][-1]["pages"], "_soul_lines": e["lines"][:-1], "next_to": e["next_to"]}
            PROMOTED_SIGNS.append(f"{mid}.{wid} ({xy})")
        else:
            signs_awaiting_world_id.setdefault(mid, {})[xy] = e
for mid, spots in SOUL_PENDING_SPOTS.items():
    for sid, e in spots.items():
        assert sid not in maps.setdefault(mid, {}), (mid, sid); maps[mid][sid] = e
# v0.4.2 (same effect as World's sign-id patch): any text entry whose id is a World interact spot gets that spot's
# geometry (kind/x/y/stand/face/tile...). Text keys win; World's spot stays the source of truth for geometry.
for mid, spots in maps.items():
    for sid, e in spots.items():
        sp = ISPOTS.get(mid, {}).get(sid)
        if sp:
            for k in GEOM_KEYS:
                if k in sp and k not in e: e[k] = list(sp[k]) if k == 'stand' else sp[k]
for (mid, sid) in SOUL_NPC_LINES:
    assert sid in maps[mid], (mid, sid)
for mid, spots in maps.items():
    for sid, e in spots.items():
        lines = list(e.pop("_soul_lines", [])) + list(SOUL_NPC_LINES.get((mid, sid), []))
        for v in reversed(e.pop("variants", [])):   # old rule was "last set wins" -> reverse for first-match
            lines.append(L("v_" + v["flag"], v["pages"], flags=[v["flag"]]))
        lines.append(L("default", e["pages"]))
        e["lines"] = lines

# ---- v0.4.3 issue 1: World's station_int text_refs name rail_only.* paths (tools/extra_merge.py PENDING_REF). Coder's engine reads
# maps.station_int.<id> first, then the text_ref. Both paths now hold the SAME entry, so either lookup shows the same words.
SPARE_MAPS = {
 "station_int": "World 8:20 PM CT: spare until a town needs a station (no door leads here). Text parked, kept valid; rail_only paths in its text_refs resolve to the same entries.",
 "home_saltmere_a": "World 8:20 PM CT: spare until Saltmere is built (no door leads here). Text parked, kept valid; its zone lines are not a wiring todo while spare.",
}
RAIL_REFS = {}
for _d in MAPJ["station_int"].get("npcs", []) + MAPJ["station_int"].get("signs", []) + MAPJ["station_int"].get("npcs_pending_text", []) \
        + MAPJ["station_int"].get("signs_pending_text", []) + _tp(MAPJ["station_int"], "npcs") + _tp(MAPJ["station_int"], "signs"):
    _m = re.search(r'overworld_lines\.json\s+rail_only\.(npcs|signs)\.(\w+)', _d.get("text_ref", ""))
    if _m: RAIL_REFS[_d["id"]] = (_m.group(1), _m.group(2))
for _sid, (_sec, _key) in RAIL_REFS.items():
    _e = copy.deepcopy(maps["station_int"][_sid])
    maps["station_int"][_sid]["note"] = f"spare map text (meta.spare_maps). Same entry as rail_only.{_sec}.{_key} (World's text_ref)."
    _e["note"] = f"Same entry as maps.station_int.{_sid} (World's station_int text_ref points here). Shared rail-station kit text."
    rail_only[_sec][_key] = _e
def _entry(v):
    if isinstance(v, list): return {"pages": v, "lines": [L("default", v)]}
    if isinstance(v, dict) and "lines" not in v: return {**v, "lines": [L("default", v["pages"])]}
    return v
for _sec in ("signs", "npcs"):
    for _key in list(rail_only[_sec]): rail_only[_sec][_key] = _entry(rail_only[_sec][_key])
# restricted_airspace_officer: sprite removed from npc_sprite_map (Character models, 8:20 PM CT) -> text goes to unplaced.
# World's world_layout fly/rail lists still name rail_only.npcs.airspace_officer, so that path keeps a copy marked unplaced.
AIRSPACE_OFFICER = copy.deepcopy(rail_only["npcs"]["airspace_officer"])
unplaced["npcs"]["station_int.restricted_airspace_officer"]["lines"] = AIRSPACE_OFFICER["lines"]
rail_only["npcs"]["airspace_officer"]["status"] = ("unplaced: no sprite (npc_sprite_map dropped station_int.restricted_airspace_officer). "
    "Kept because world_layout fly/rail lists name this path; same text as unplaced.npcs['station_int.restricted_airspace_officer'].")

meta = {
 "version": "0.3.0",
 "date": "2026-10-22",
 "status": "draft, awaiting Gary approval",
 "game": "Kilumen: Start of a Journey",
 "format": "Every player-facing text value is an array of pages. Each page fits 2 lines of 40 chars after word wrap; '\\n' forces a break. NPC/sign entries: 'pages' holds the default lines. Optional: battle_lost (player wins), battle_won (player loses), after (talking again after the battle) and variants [{flag, pages}]. The last variant whose flag is set replaces 'pages'.",
 "maps_snapshot": "maps/*.json as of Oct 22 2026, 7:08 PM CT",
 "sources": [
  "art/world/overworld/CRITICAL_PATH.md, FIELD_SKILLS.md, MOVEMENT.md (Oct 22 2026, 7:06-7:07 PM CT)",
  "art/world/overworld/maps/*.json (15 maps, incl. story_gates / fly_point / bike / movement)",
  "art/world/overworld/tools/progression.py (FLAGS critical path, ZONE_EDGES unbuilt gates, rail-only TOWNS, Skylift/Tideglide/Lumen Line names)",
  "art/world/overworld/tools/maps.py, build.py (gate tiles and placeholder lines)",
  "art/world/overworld/OVERWORLD_README.md, PUZZLE_PROGRESSION.md, world_layout.json",
  "art/characters/NOTES.md, art/world/README.md",
  "Kilumen_design_doc.pdf",
  "/workspace/quality/GAME_QUALITY_CHECKLIST.md, /workspace/quality/STORY_ART_LESSONS.md"
 ],
 "missing_sources": [],
 "changelog": {
  "0.3.0": ["Added 5 planned gates: gate_saltmere_causeway, gate_sunmeadow_north, gate_revival_checkpoint, gate_lanternport_tidelock, gate_aurelith_arena (ids/flags from CRITICAL_PATH.md + world_layout.json).",
            "Restricted-airspace text now carries the exact government reason everywhere; added rail_only.skylift_blocked.skylift_menu and signs.sign_platform (world_layout fly.destinations placeholders).",
            "Skylift: added cave, on_bike_only_cell, confirm lines. Bike: added cave line (MOVEMENT.md).",
            "Glowcall inspect softened: darkness is a vignette, never a block (FIELD_SKILLS.md 4). Brushbreak/Stonebreak 'what' notes point at thick_brush / cracked_rock.",
            "Placeholder {coins} added (arena doorman). Validator also checks blocker flags against world_layout.json gates."],
  "0.2.0": ["Rebuilt on map story_gates, progression.py flags and names."]
 },
 "assumptions": [
  "Critical path from progression.py: Fernwick coin > east road > Aurelith > Saltmere coin + bike > Thornwood east > Revival Heights coin + rail pass > Frostspire pass > Frostspire coin + Skylift > Route 1 east > Mirefen > Tidewater > Lanternport > Cindervale > Aurelith arena.",
  "Greystone (built) is an early dead end until gate_frostspire_bridge opens (confirmed by CRITICAL_PATH.md step 6). Lines point there as the missing team's last check-in.",
  "The tide-lock wheel prompt is a mechanism interaction, not a field skill or item; it gets a Yes/No prompt because it is a player action.",
  "Gary-owned decisions kept neutral: giant species (gate_cindervale_giant), unlock coins for Brushbreak/Stonebreak/Glowcall ({coin}, requires_flag TBD).",
  "The brief's 'badge' equivalent is the design doc's 'challenge coin'. Map placeholder lines and progression.py comments say 'badge'; player text says coin. Flag ids are unchanged.",
  "Blockers for unbuilt zones use proposed ids (gate_frostspire_bridge, gate_coast_road_flood, gate_cindervale_giant) taken from progression.py ZONE_EDGES descriptions.",
  "The fallen tree is a story gate (beat_master_saltmere) in the map, not a field skill. Brushbreak is kept as an optional-area proposal only.",
  "Bike chain: rt_guard_east gives a Survey Parcel after the gate clears (has_survey_parcel, proposed flag); the Saltmere office gives the Courier Bike (has_bike).",
  "Proposed flags not in progression.py: flg_promoted, has_survey_parcel.",
  "The giant on the Cindervale road has no species yet; the text avoids naming one.",
  "Shared interiors (heal chain heal_brookhollow, homes H1-H4, shop_int; 2F floors of shared homes too) are written to work in any town: no town names outside when.zone lines and no wall/floor/rug colours (recolours are per door). Unique interiors (heal_fernwick, home_brookhollow_b, home_fernwick_a, lab_brookhollow, rt_branch_backroom) may name their town.",
  "Map sign text is kept and split into pages. sign_r1_ne drops '(to come)' because it is an internal note."
 ],
 "placeholders": {
  "{player}": "player name", "{creature}": "party creature using the skill", "{skill}": "field skill display name",
  "{coin}": "challenge coin that unlocks the skill (TBD per skill)", "{coins}": "number of challenge coins held", "{city}": "town/city name",
  "{nearest_station}": "nearest Lumen Line station outside the restricted city",
  "{run_button}": "run control, resolved per input device (see input_hints)", "{bike_button}": "bike control, resolved per input device (see input_hints)"
 },
 "rules_applied": {
  "GQC-3.2": "No placeholder labels in player text: all map 'PLACEHOLDER' gate lines replaced.",
  "GQC-3.3": "Text follows game state: variants keyed to real flags (beat_master_*, has_*).",
  "GQC-3.4": "Ids unchanged: every key copied from maps/*.json; the build script fails on any missing or unknown id.",
  "GQC-3.5": "No spoilers: inhumane testing only implied.",
  "GQC-3.6": "Every page wraps to 2 lines of 40 chars or fewer (checked by script).",
  "GQC-3.7": "Grounded tone with light humour, per Gary's tone rule.",
  "GQC-3.8": "Map sign text kept; new signs only for blockers and rail-only, all marked as proposals.",
  "GQC-3.9": "Rating-safe.",
  "GQC-3.10": "Lore delivered in-world.",
  "GQC-7.5 / 7.7": "Inspiration only; original names; banned-term scan (franchise terms, 'badge', HM-style skill names).",
  "GQC-9.5 / 9.6": "Backup in /workspace/backups/kilumen_text/.",
  "GQC-9.12": "Unbuilt exits get closed messages (closed_exits).",
  "GQC Round 6 (no internal notes in player text)": "Removed '(to come)' and 'PLACEHOLDER'.",
  "SAL Kilumen (web-check names early)": "Proposed names web-checked."
 }
}

doc = {"_meta": meta,
       "_proposed_names": {
        "_note": "Gary to approve or rename. 'source' shows where each name came from.",
        "field_skills": {"water_carry": {"name": "Tideglide", "source": "progression.py PROPOSAL"},
                         "flying": {"name": "Skylift", "source": "progression.py / maps fly_point PROPOSAL"},
                         "brush": {"name": "Brushbreak", "source": "this file"},
                         "rock": {"name": "Stonebreak", "source": "this file"},
                         "light": {"name": "Glowcall", "source": "this file"}},
        "items": {"running_shoes": "Trail Runners", "bike": "Courier Bike", "bike_quest": "Survey Parcel", "rail_pass": "Lumen Line Pass"},
        "services": {"rail": "Lumen Line (progression.py)"}},
       "maps": maps, "closed_exits": closed_exits, "blockers": blockers, "rail_only": rail_only,
       "field_skills": field_skills, "items": items}

# ---------- v0.4.0 meta + top-level soul sections ----------
PROPOSED_FLAGS = {
 "bins_taken_out": "Ron finally takes the bins out: main mq_finale s8, the last beat before the credits (Story Bot QUESTS.md draft, Oct 23 2026). Coder/quests set it.",
 "ron_in_party": "Ron is travelling with the player right now. Approved by Story Bot (9:14 PM CT); Coder sets the flag.",
 "flg_missing_note_started": "The Firefly DJ has asked the player to find his old records (side story 'The Missing Note').",
 "flg_record_1": "Missing Note: first old record found (count, any order: a pickup sets the lowest unset flg_record_N).",
 "flg_record_2": "Missing Note: second old record found (count).", "flg_record_3": "Missing Note: third old record found (count).",
 "flg_record_4": "Missing Note: fourth old record found (count).",
 "flg_missing_note_done": "Missing Note: DJ has stitched the four records and given the firefly lantern.",
  "truth_revealed": "The player has learned what the dominance crystals really do. pending_story_call: Story Bot owns the reveal beat.",
 "guardian_quest_done": "The Legendary Guardian quest is resolved (E2 test card). pending_story_call: Story Bot owns the quest outcome.",
 "beat_aurelith_arena": "Post-game: the player has won the Aurelith arena run after all_badges (Dana note, handcar line).",
}
EXTRA_PLACEHOLDERS = {
 "{creature}": "party creature using the skill", "{skill}": "field skill display name",
 "{coin}": "challenge coin that unlocks the skill (TBD per skill)", "{city}": "town/city name",
 "{nearest_station}": "nearest Lumen Line station outside the restricted city",
 "{run_button}": "run control as a noun phrase, per input device (meta.input_hints)", "{bike_button}": "bike control as a noun phrase, per input device (meta.input_hints)",
 "{confirm_button}": "confirm/advance control as a noun phrase, per input device (meta.input_hints)",
 "{spray_left}": "Hush Sprays left in the bag", "{item}": "bag item being put in a quick slot",
 "{old_item}": "item that was in that quick slot before", "{hotkey}": "quick slot plus its control, per input device (meta.input_hints), e.g. 'slot 1 (the 1 key)'",
 "{name}": "nickname just typed in the catch flow",
}
WORLD_FLAGS = {   # proposed by World Design in the maps (OVERWORLD_README 14.1 / 14.4); accepted as known flags
 "camp_restored_thornwood": "The field team's Thornwood camp is restored (World flag, qa/club README; club_int flag_swaps note tick).",
 "camp_restored_greystone": "The field team's Greystone camp is restored (World flag, qa/club README; club_int flag_swaps note tick).",
 "camp_restored_frostspire": "The field team's Frostspire camp is restored (World flag, qa/club README; club_int flag_swaps note tick).",
 "camp_restored_mirefen": "The field team's Mirefen camp is restored (World flag, qa/club README; club_int flag_swaps note tick).",
 "finale_done": "The finale is over (World: brookhollow bin_stages.empty_flag -> bin_ron_empty). Replaces Text Bot's proposed story_ending_seen (same meaning, merged onto World's id in v0.4.1).",
 "field_team_home": "Post-game: the missing field team is back alive (STORY_RULINGS_SOUL #14; World: lantern_rest flag_swaps stone_blank -> memorial_bench).",
 "has_branch_card": "Player holds the Branch Access Card (SOUL_PLAYBOOK 8.2d). World: heal maps locked_warps.unlock_flag ('Gary, Oct 22; overrides rt_backroom_open'). Not yet in world_layout progression_flags (World todo).",
 "got_starter": "Player has chosen a starter in lab_brookhollow (world_layout unique_interiors note). Not yet in progression_flags (World todo); which cradle empties is Story/Coder's.",
}
STORY_OWNED = {"finale_done", "truth_revealed", "guardian_quest_done", "field_team_home", "ron_in_party"}   # lines need pending_story_call or story_ruling
FLAG_ALIASES = {"story_ending_seen": "finale_done"}
CORE_PLACEHOLDERS = {
 "{player}": "player name", "{coins}": "number of challenge coins held (digits)",
 "{lead}": "lead creature's nickname, or its species name if it has none",
 "{nick}": "Ron's nickname for the player, from ron_nicknames (first matching entry)",
 "{rt_number}": "Catalogue number of the lead creature, shown as 'RT-' + 4 digits (RT-0001 to RT-9999). Only Vane and the catch flow use it. Spec for Coder: _meta.placeholder_specs.rt_number.",
}
WHEN_KEYS = {
 "phase": "time-of-day phase (item #9, time_of_day/grades.json): 'dawn' | 'day' | 'dusk' | 'night'. Interiors keep the day grade, but text still follows the clock.",
 "hour": "in-game hour 0-23, exact match (E2 uses 3 = 03:00-03:59)",
 "weekday": "'mon-fri' etc. NOT SUPPORTED by Coder's picker (never matches) until the 1.4 weekday clock ships. Lines using it carry disabled_until and a fallback_for line on supported keys (meta.when_key_audit).",
 "count_gte": "{counter, n}: a per-save counter is at least n",
 "once": "show only once per save", "once_per_day": "show at most once per in-game day",
 "lead_has_nickname": "true/false: the lead creature has a player-given nickname",
 "lead_type": "lead creature's element, e.g. 'water'", "party_nickname": "any party creature has this exact nickname",
 "idle_after_heal_s": "player has stood still this many seconds after a Revival Tech heal",
 "standing_still_s": "player has stood still this many seconds on the trigger tile",
 "facing": "player facing direction", "zone": "zone id the NPC is currently placed in. Shared interiors (heal chain, H1-H4 homes): the town the player entered from (overworld.js zone(): the zone whose maps list holds lastDoor.map). Needs every interior map in world_layout zones[*].maps (World todo, meta.zone_wiring_todo); 2F maps need zone() to follow $return to the outdoor map (Coder todo).",
 "dream_unseen": "the dream for this line's coin has not played yet", "slept": "the player chose Yes at the bed prompt",
}
COUNTERS = {"office_display_taps": "inspects of maps.office_int.crystal_display (E9)",
            "bin_inspects_after_8": "inspects of maps.brookhollow.bin_ron after all_badges (E5 pop-out)"}
meta["version"] = "0.4.1"
meta["status"] = "draft, awaiting Gary approval (soul pass on approved playbook items)"
meta["format"] = ("Every player-facing text value is an array of pages; each page fits 2 lines of 40 chars after word wrap ('\\n' forces a break). "
  "Map spots are keyed maps.<map_id>.<spot_id>. Each spot has 'lines': an ordered list, most specific first, ending with id 'default' "
  "(flags [] and no 'when'). The engine shows the FIRST line whose 'flags' are all set (AND) and whose optional 'when' matches. "
  "'pages' is kept as a mirror of the default line for older readers. battle_lost / battle_won / after / after_heal etc. are unchanged. "
  "Props: kind 'prop' (inspect) or 'trigger' (tile trigger); x,y = the cell the player faces, stand = where the player stands. "
  "Props/triggers: geometry (kind, x, y, stand, face, tile, trigger_when, opens, counter, states...) is copied from the map's interact_spots, which is the source of truth. "
  "Lines with no map spot live in top-level sections: company_inbox, ron_nicknames, ron_battle_openers, vane, catalogue, comfort, unplaced_npcs, unplaced (v0.4.2: text whose map spot is gone or not built yet), signs_awaiting_world_id. "
  "'soul_item' = SOUL_PLAYBOOK item number (15:E# = easter egg). 'pending_story_call': true = neutral until Story Bot/Gary decide. 'story_ruling' = line follows a ruling in design/STORY_RULINGS_SOUL.md.")
meta["maps_snapshot"] = "maps/*.json as of Oct 22 2026, 7:41 PM CT (18 maps incl. mirefen_bog, station_int, lantern_rest; interact_spots, bin_stages)"
meta["sources"] += ["art/world/overworld/OVERWORLD_README.md section 14 (soul-pass art, interact_spots, bin_stages, windows; Oct 22 2026)","design/SOUL_PLAYBOOK.md (Oct 22 2026; Gary approved top 15 items, 7:28 PM CT)",
                    "design/STORY_RULINGS_SOUL.md (Story Bot, 7:30 PM CT: #3 bins/seller/cake, #7 tint drift, #14 Lantern Rest; Vane motive + ending are recommendations only)"]
meta["changelog"] = {"0.4.1": [
  "World soul-pass art (OVERWORLD_README 14): 9 window spots written (window_1/2 on house_1f, house_2f, house_int_b, house_int_c; window_1 on house_int_a), varied by phase dawn/day/dusk/night, hour 3 and story flags; prop_templates.window removed.",
  "Props now take kind/x/y/stand/face/tile/trigger_when/opens/counter/states from each map's interact_spots; the validator fails on any mismatch, on a prop without an interact_spots entry and on an interact_spots entry without text.",
  "bin_ron: needs_world_prop dropped; every line has bin_stage matching brookhollow bin_stages (0-8 + empty). Flies are mentioned from stage 6, never before; new 'bin_empty' line for finale_done.",
  "5 new signs World placed without ids: text in signs_awaiting_world_id keyed by map + cell, with proposed ids; the build moves them to maps.<map>.<id> once World adds the ids.",
  "Flags: World's finale_done and field_team_home are known flags (world_flags). story_ending_seen merged onto finale_done (same meaning); validator rejects the old id.",
  "'phase' now allows 'dawn'; phase and hour values are validated."],
 "0.4.0": [
  "Soul pass (SOUL_PLAYBOOK #1, #3, #8, #10, #11, #15 E2/E4/E8/E9/E10/E14) written into this file, per Coder's format change.",
  "Format change: every spot now has a first-match 'lines' list (most specific first, default last). Old 'variants' converted and reversed (old rule was last-set-wins).",
  "New prop spots: house_1f.tv, house_int_c.tv, house_2f.pc, house_2f.bed, office_int.bookcase/water_cooler/crystal_display/dana_desk, house_int_b.bookcase_left/right, heal_centre_int.sofa, station_int.rail_buffer, brookhollow.bin_ron (needs world prop), brookhollow.bridge_mid (trigger).",
  "Filled World's pending-text spots: mirefen_bog.mirefen_angler/mirefen_sign, station_int.station_clerk/station_traveller/restricted_airspace/timetable.",
  "New top-level sections: company_inbox (31 emails), ron_nicknames, ron_battle_openers, vane (all pending_story_call), catalogue, comfort, prop_templates.window, unplaced_npcs.lucky_crystal_seller.",
  "Story Bot rulings applied (STORY_RULINGS_SOUL.md, 7:30 PM CT): bin day is always 'tomorrow', 8 escalating Ron bin openers, ending beat 'Told you. Tomorrow.', glass lucky crystals + 'Finally honest.', WELCOME BACK cake (field_team_home), tint-drift memos.",
  "Lantern Rest (#14, World-requested keys): keeper, stone_1..8, stone_blank drafted for Story Bot's tone check.",
  "Placeholders: {player}, {coins}, {lead}, {nick}; {rt_number} for Vane/catalogue only; extras listed in placeholders_extra.",
  "Validator: flags must be known or proposed; 'when' keys whitelisted; default last; no unreachable lines; rank order; placeholders whitelisted; props in bounds, tile and stand cell checked; pending-text ids accepted."],
 **meta["changelog"]}
meta["placeholders"] = CORE_PLACEHOLDERS
meta["placeholders_extra"] = EXTRA_PLACEHOLDERS
meta["proposed_flags"] = PROPOSED_FLAGS
meta["world_flags"] = WORLD_FLAGS
meta["flag_aliases"] = {"story_ending_seen": "merged into finale_done (World's id) in v0.4.1; do not use"}
meta["conditions_when"] = WHEN_KEYS
meta["counters"] = COUNTERS
meta["assumptions"] += [
  "Coin number to flag (bins, dreams, Ron): 1 fernwick, 2 saltmere, 3 revival, 4 frostspire, 5 mirefen, 6 tidewater, 7 lanternport, 8 all_badges.",
  "The elder's firefly count drops on coin flags as a stand-in for the crystal-dig beats (Story Bot has no dig flags yet); recovers on finale_done.",
  "Dana's desk is the desk_pc at office_int (12,8) (World confirmed, v0.4.1). Bin and windows are built by World (OVERWORLD_README 14).",
  "Act boundaries for the TV: default = Act 1, beat_master_revival = Act 2, storm_season = Act 3, finale_done = ending.",
  "Hush Spray: playbook name kept; a real tattoo-numbing spray is sold as 'Hush', so Gary may want a rename.",
]
meta["version"] = "0.4.2"
meta["maps_snapshot"] = "maps/*.json as of Oct 22 2026, 8:08 PM CT (31 maps: Brookhollow/Fernwick interiors hooked up; house_int_a/b/c and heal_centre_int retired)"
meta["sources"] += ["art/world/overworld/OVERWORLD_README.md section 15/15.1 (interiors hook-up, text_pending; Oct 22 2026)",
                    "art/world/overworld/qa/interiors_hookup/DOOR_TABLE.md", "quality/GAME_QUALITY_CHECKLIST.md, 'Time of day, recolours and interior reuse' (Oct 22 2026)",
                    "art/world/overworld/time_of_day/grades.json (phases)", "art/world/overworld/tools/progression.py INDOOR_OR_CAVE, tools/interiors_merge.py RETIRED"]
meta["changelog"] = {"0.4.2": [
  "Sign ids: World's sign-id patch applied as a generic merge pass: every text entry whose id is an interact spot (incl. text_pending) copies its geometry; kind 'sign' gets the prop checks (stand walkable, stand+face reaches x,y, tile). 5 signs promoted (route1.sign_r1_ledge, thornwood.sign_tw_junction/sign_tw_east, brookhollow.sign_bh_north/sign_bh_barricade).",
  "Remapped off retired maps: heal_centre_int.healer -> heal_brookhollow.heal_brookhollow_carer + heal_fernwick.heal_fernwick_carer; sofa + company_terminal -> both heal maps; house_int_b.bookcase_left/right -> home_brookhollow_b.bookcase / home_brookhollow_b_2f.shelf; house_int_b.scholar -> home_brookhollow_b.scholar; house_int_c.tv/parent_c/kid_c -> home_fernwick_a.tv / home_fernwick_a_parent / home_fernwick_a_2f.home_fernwick_a_kid. Every entry carries text_was.",
  "World's text_pending ids written (heal x2, homes H1-H4 + uniques, lab_brookhollow, rt_branch_backroom): World's drafts adopted where they fit (Bulletin, suggestion box, 'Field team? Sit, sit.'), the rest rewritten to page size, house tone and the shared-interior rules.",
  "Shared designs get per-town lines with when.zone (carer, technician, H1 owner, H2 hobbyist, H3 parent + kid, H4 hobbyist); defaults stay town-neutral.",
  "New top-level 'unplaced': 5 window spots from retired maps, house_int_a.cook (Berry Snack, proposed for home_brookhollow_b_parent) and 7 TV/bookcase texts with proposed spots (geometry validated).",
  "Wording: Heal Centre -> Revival Tech (route1 trainer, sofa 'Carer:', when-key note); KID_TV lines point upstairs (kid moved to 2F).",
  "Flags: has_branch_card and got_starter accepted as World flags (not in progression_flags yet).",
  "Validator: phases from grades.json; retired maps must carry no text; text_pending ids need text; shared interiors: no town names outside zone lines, no recolour names, no room colours; indoor phase lines (progression.INDOOR_OR_CAVE) must not talk about light; zone lines on maps not listed in world_layout zones -> warning + meta.zone_wiring_todo; unplaced proposals checked. All new checks mutation-tested."],
 **meta["changelog"]}
meta["rules_applied"].update({
  "GQC Time of day / One time-of-day grade": "Phase values come only from time_of_day/grades.json; interiors stay on the day grade, so indoor phase lines talk about people and sounds, never the room's light (validator).",
  "GQC Time of day / House recolours are exact swap tables": "Recolours are per door, so shared-home text never names a recolour scheme or a wall/floor/rug colour (validator).",
  "GQC Time of day / Interior reuse": "Shared heal chain and H1-H4 homes read right in any town; town flavour only via when.zone; unique interiors keep their story reason in a note.",
  "GQC Time of day / New interior name prefixes + One indoor rule": "Indoor test uses the full progression.INDOOR_OR_CAVE (parsed from the source), never a shorter regex.",
  "GQC Time of day / Keep the rules current": "Rules named in the report to Gary.",
})
meta["version"] = "0.4.3"
meta["maps_snapshot"] = "maps/*.json as of Oct 22 2026, 8:20 PM CT (station_int + home_saltmere_a spare; house_int_a/b/c + heal_centre_int retired)"
meta["sources"] += ["src/overworld/lines.js, overworld.js, save.js on dev/overworld-v1 (HEAD 3b537d6 + local edits; read only, Oct 22 2026 8:20 PM CT)",
                    "shots/soul_pass_v1 (Coder's soul-pass captures)", "art/world/overworld/tools/extra_merge.py PENDING_REF (station_int text_refs)"]
meta["placeholder_specs"] = {"rt_number": {
 "shows": "RT-<4 digits>, zero-padded: RT-0001 .. RT-9999. Always exactly 7 characters, so every page is width-checked with RT-0000 / RT-9999 (validator).",
 "source": "creature.rt: an integer 1-9999 stored on each party creature in the save (save.js already keeps party[i].rt). Assigned once, at registration, never changed.",
 "registration": "The starter is registered when the player gets it in lab_brookhollow (got_starter). Every later creature is registered when it joins (catch flow, a later pass).",
 "numbering": "Save-level integer rt_next, set ONCE at new game to a random value 1000-8999 and saved (not recomputed). Each registration takes rt_next, then rt_next += 1; after 9999 it wraps to 1000, skipping numbers already in the save. Releasing a creature does not free its number.",
 "why_not_player_id": "There is no player id in the save, and a number derived from the player's name would change if the name changed. A saved counter is stable and cheap.",
 "format_in_engine": "textVars(): rt_number = lead && lead.rt != null ? 'RT-' + String(lead.rt).padStart(4, '0') : null. Today it returns lead.rt raw (would print '147', not 'RT-0147') or the config placeholder 'RT-0147'.",
 "no_number_yet": "When the lead has no rt (or there is no lead), skip lines that use {rt_number}, the same way pickLine already skips {lead} lines. Then remove config.rtNumberPlaceholder.",
 "used_in": "vane.* and catalogue.* only (validator). Vane's 'RT-0000' line is the nickname joke (when.party_nickname), not a catalogue number.",
}}
meta["changelog"] = {"0.4.3": [
  "Coder soul-pass issue 1 (station_int text_ref): World's station_int text_refs (tools/extra_merge.py PENDING_REF) name rail_only.npcs.station_attendant/commuter and rail_only.signs.sign_airspace/sign_platform. Those paths existed but the signs were bare page lists the picker can't read, and sign_platform held different words from our timetable. Both paths now hold the same entry (pages + lines), built from World's text_refs at build time. No World edit needed.",
  "station_int and home_saltmere_a parked as spare-map text (meta.spare_maps): kept under maps.<map>, fully checked, no door expected; home_saltmere_a zone lines are no longer a wiring todo while spare.",
  "rail_only signs/npcs are all picker-readable entries now (pages + default line). sign_platform = the station timetable text (the old airspace wording lives on sign_airspace).",
  "restricted_airspace_officer (sprite dropped from npc_sprite_map): text moved to unplaced.npcs['station_int.restricted_airspace_officer']; rail_only.npcs.airspace_officer keeps a copy marked unplaced because world_layout fly/rail lists still name that path.",
  "Issue 2 (weekday): kid_school kept, disabled_until weekday ships (the picker has no weekday case). New kid_dusk (phase dusk, fallback_for kid_school) says nothing about school days.",
  "Issue 3 ({rt_number}): spec written to meta.placeholder_specs.rt_number (saved per-creature number, RT- + 4 digits). Validator re-wraps every {rt_number} page with RT-0000/RT-9999/RT-1111/RT-0147 and bans hard-coded numbers in vane/catalogue.",
  "Issue 4 (Ron's bin): lines key on bin_stage only (the coin COUNT Coder's binStage() puts on the tile); coin flags removed, so coins won in any order show the matching line. count_gte can't do this: it reads save counters and there is no coins counter.",
  "Validator: bin lines must not use coin flags, must open with the bag count, stage 0 = default; Coder's picker is simulated for all 128 coin subsets (+all_badges, +finale_done, +E5 counter) and the line shown must match the tile. Unreachable check now respects bin_stage.",
  "Validator: when/trigger_when keys read from Coder's lines.js whenMatches; unsupported keys need disabled_until + a fallback_for line (meta.when_key_audit). Every World text_ref in maps/*.json must resolve to an entry with lines, and match maps.<map>.<id> if both exist. Spare maps must exist and carry text.",
  "Company terminal text left as is (World adds the terminal prop tile at company_terminal in both heal maps)."],
 **meta["changelog"]}
meta["rules_applied"].update({
  "never invent or rename ids": "Aliases reuse World's own text_ref paths; the officer is filed under its old sprite-map id; kid_dusk is a line id inside an existing spot, not a map/NPC id.",
  "Players see 'coin', never 'badge'": "Bin lines key on coin count; all_badges stays a flag id only, never in text.",
  "First-match lines, unconditional default last": "kid_dusk sits after kid_school; bin stage lines are exclusive by bin_stage, default = stage 0.",
  "Don't edit Coder's or World's files": "Coder's picker is read, not changed; World's text_refs are met by aliasing on our side.",
})
doc["_proposed_names"]["interiors_v0.4.2"] = {
 "Branch Access Card": "from SOUL_PLAYBOOK 8.2d. Web-check Oct 22 2026: no game clash (only generic building access cards).",
 "The Revival Tech Bulletin": "World's draft name. Web-check Oct 22 2026: no clash; note a real repair shop is called 'Revival Tech Solutions' (the company name predates this file).",
 "The Hearth Cookbook / Knots for Anglers / Tides and Times": "in-world book titles (unplaced). Web-check Oct 22 2026: no exact titles found; 'Tide and Bite Times' almanacs exist (different name).",
}
doc["_proposed_names"]["soul_pass_v0.4.0"] = {
 "Hush Spray": "from SOUL_PLAYBOOK 7.x. Web-check Oct 22 2026: no game item clash, but a real tattoo-numbing spray is sold as 'Hush Spray' (lidocaine). Gary may want a rename.",
 "Old River Tales / Shrines of the North / Bog Lights and Other Nonsense / Field Safety for Beginners / Feeds and Feeding, Volume 2 / Employee Handbook, 9th Edition": "in-world book titles; web-check Oct 22 2026 found no game or book clash ('Old River Tales' is also a 2019 blues album, generic phrase).",
 "A Short History of Crystal Binding (Abridged, Revised, Revised Again)": "from SOUL_PLAYBOOK 2.1; web-check: only physics lecture notes use 'crystal binding'.",
 "Lantern Rest epitaph names": "Marta Ollen, Tomas Reed, Auntie Bea, Jonah West, Iris Kane, Old Hal, Nell Ashby, Desmond Price; creatures Pip, Sorrel, Dumpling, Moss, Tallow, Cinder, Bramble, Otto. Ordinary first/last names, not tied to any franchise.",
 "Pocket names": "Care, Feeds, Gear, Crystals, Key Items, Mail & Logs (generic words).",
}
soul_index = {}
for _m, _sp in maps.items():
    for _s, _e in _sp.items():
        _its = set(str(_e.get("soul_item", "")).split(",")) | {str(l.get("soul_item")) for l in _e["lines"] if l.get("soul_item")}
        for _i in sorted(x for x in _its if x and x != "None"):
            soul_index.setdefault(_i, []).append(f"maps.{_m}.{_s}")
for _k, _i in [("signs_awaiting_world_id", "signs"), ("company_inbox", "1"), ("ron_nicknames", "10"), ("ron_battle_openers", "3"), ("vane", "10"), ("catalogue", "10"),
               ("comfort", "11"), ("unplaced_npcs.lucky_crystal_seller", "3"), ("unplaced.windows", "1")]:
    soul_index.setdefault(_i, []).append(_k)
meta["soul_index"] = dict(sorted(soul_index.items()))
if PROMOTED_SIGNS: meta["promoted_signs"] = PROMOTED_SIGNS
doc.update({"company_inbox": company_inbox, "ron_nicknames": ron_nicknames, "ron_battle_openers": ron_battle_openers,
            "vane": vane, "catalogue": catalogue, "comfort": comfort, "unplaced_npcs": unplaced_npcs, "unplaced": unplaced,
            "signs_awaiting_world_id": signs_awaiting_world_id})

# ---------- v0.4.4 system text (coverage audit vs design/MECHANICS_PARITY.md) ----------
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import system_lines as SL
doc.update(SL.SYSTEM)
EXTRA_PLACEHOLDERS.update(SL.NEW_PLACEHOLDERS)
meta["version"] = "0.4.8"
meta["club_moved"] = CLUB_MOVED
meta["status"] = "draft, awaiting Gary"
meta["club_fit_log"] = [{**e, "where": e["where"].replace("unplaced_npcs.rebel_", "maps.club_int.rebel_").replace("unplaced.club_props.club_int.", "maps.club_int.")} for e in CLUB_FIT_LOG]
meta["club_spec"] = {"_note": "The Firefly (Fernwick juice bar and music hangout, STORY_RULINGS_CLUB). v0.4.8: World built maps/club_int.json with our ids; all club text is in maps.club_int.<id> (NPCs + back-room wall), geometry from the map. Only the Lanternport old_record stays unplaced.",
  "time_of_day": "Each club entry starts with when.phase 'day' and 'dawn' lines (DJ asleep, counter being wiped); everything after them is the Dusk/Night text.",
  "once": "when.once = per save, per line id.",
  "back_room": "Open from the first visit (Gary R2), no gate flag. Tier 0 flyers always; notes use active_when = beat_master_fernwick (thornwood, greystone) / beat_master_revival (frostspire) / beat_master_frostspire (mirefen); greystone moved to tier 1 by Story Bot ruling (Oct 22, 10:04 PM CT: Greystone B1 has no flag gate). Camp ticks use World's camp_restored_* flags. Post-game banner on field_team_home (Story Bot ruling, proposed flag).",
  "finished_tune": "rebel_dj and rebel_patron_3 have tune_finished on finale_done as their first Dusk/Night line, right after the day/dawn lines (which still show by day after the ending).",
  "not_written": "Vane inbox memo (on hold for Gary). No Warmth charm (Story Bot ruling)."}
meta["item_catalogue_spec"] = {"_note": "system_item_catalogue is keyed by World's item ids (items/ITEM_PLACEHOLDERS.json); {item} = name. Pocket = comfort.bag_pockets key; pocket null = money (system_items.picked_up_money, {amount}). Validator: every items[].item in maps/*.json has an entry or is in pending.",
  "pending": SL.CATALOGUE_PENDING, "world_pocket_hint_to_ours": SL.POCKET_HINT}
meta["world_adoption"] = ADOPTED
meta["sources"] += ["design/MECHANICS_PARITY.md (Game dev, Oct 22 2026 ~8:30 PM CT): master list for the coverage audit",
                    "design/ skill-structure research doc (SKR)", "text/system_lines.py (system_* sections, Text Bot)"]
meta["input_hints"] = {
 "_note": "Kilumen runs on PC (keyboard or controller, touch controls hidden) and on phones/tablets in landscape (touch: d-pad left; A, B, SEL right). Lines never name a key or a device; control placeholders resolve at runtime to a noun phrase for the CURRENT input device (last device used), so every line reads right on all three. Verbs in lines are device-neutral: 'Hold X to run', 'Use X to get on or off' (never press/click/tap). Source of current bindings: src/overworld/input.js (read-only).",
 "contract": {"returns": "noun phrase that completes 'Hold ___ to run.' / 'Use ___ to ...'", "case": "lowercase article, keep key/button names as printed on the device",
              "prompt_glyph": "when Coder's on-screen prompts land (battle/menu work), the runtime may swap the phrase for an inline glyph of the same control; ids below are the glyph ids, so text needs no change",
              "device_switch": "re-resolve when the player switches device mid-page; never cache the phrase in the save"},
 "placeholders": {
  "{run_button}":     {"glyph": "btn_b",      "keyboard": "the X key",        "controller": "the B button", "touch": "the B button", "binding": "input.js KEY_B (KeyX, Shift), pad 1, touch data-btn=b"},
  "{bike_button}":    {"glyph": "btn_select", "keyboard": "the C key",        "controller": "Select",       "touch": "the SEL button", "binding": "input.js KEY_SELECT (KeyC, Backspace), pad 8, touch data-btn=select"},
  "{confirm_button}": {"glyph": "btn_a",      "keyboard": "the Z key",        "controller": "the A button", "touch": "the A button", "binding": "input.js KEY_A (KeyZ, Space, Enter), pad 0, touch data-btn=a"},
  "{hotkey}":         {"glyph": "btn_slot_N", "keyboard": "slot N (the N key)", "controller": "slot N (L1/R1)", "touch": "slot N",
                       "binding": "NOT BUILT: no quick-slot input exists in input.js and touch has no slot button. Open question for Coder; the N key / L1-R1 / slot button wording is a proposal."}},
 "rebinding": "if keys become rebindable, the keyboard phrase is built from the bound key: 'the <KeyName> key' (Space -> 'Space', ShiftLeft -> 'Shift')",
 "page_fit": "Checked Oct 22 2026, 8:36 PM CT, headless Chromium with style.css .dlg-box/.dlg-text (font 600 clamp(17px, 2.6vh, 34px)/1.45 system-ui, text max-width 40ch): all 1145 pages expanded with the longest sample values and the longest device phrase per placeholder render in 2 lines or fewer at 1280x720, 1920x1080, 844x390, 800x360 and 1024x768, with and without a portrait. Text is DOM, so camera zoom (pickZoom) does not change it. OPEN for Coder: at 844x390, 800x360 and on a 4:3 tablet the box (bottom 4vh) sits under the touch d-pad and the A/B cluster. Fix: when touch controls show, set .dlg-box bottom to about 200px (18 + 174 + 8); box top is then 85px at 844x390 and 55px at 800x360, still on screen."}
meta["coverage_audit"] = {"_note": "Text coverage per MECHANICS_PARITY.md system id. parity_status = that doc's build status; text = covered (already in this file) | written_now (v0.4.4 system_* sections) | needs_mechanic (see mechanics_gap). Rows not listed have no player-facing text (formulas, AI, audio, etc.).",
                          "rows": [{"id": i, "system": n, "parity_status": ps, "text": t, "where": w} for i, n, ps, t, w in SL.COVERAGE]}
meta["mechanics_gap"] = {"_note": "Systems with no text yet because the mechanic is not built or not specified. World Design's built/specced/missing table was not on disk (8:30 PM CT); ids follow design/MECHANICS_PARITY.md instead.",
                         "items": SL.MECHANICS_GAP}
meta["pending_gary_calls"] = {"_note": "Lines that depend on an open design call carry pending_gary_call (and variants per option where wording differs). Text Bot picks nothing until Gary rules.", **SL.GARY_CALLS}
meta["system_text_spec"] = {"entry": "system_<area>.<key> = {pages | labels | tiers, parity (MECHANICS_PARITY id), build (built|partial|designed|different|missing), choices?, variants?, pending_gary_call?, pending_story_call?, note?}",
                            "tiers": "pick the last tier whose min <= value (Kilindex caught count, Croft Warmth)",
                            "placeholders": "every page is width-checked with the longest sample of each placeholder (system_lines.SAMPLES)"}
meta["version"] = "0.4.10"
meta["changelog"] = {"0.4.10": [
  "Story Bot rulings from design/overnight_quests/QUESTS.md (Oct 23, 12:31 AM CT): Ron's ron_unnamed nickname Biscuit -> Crumb (Biscuit now belongs to Prue Hollin's lost Tumbloam); the Brookhollow kid's parent is now his dad (default, v_flg_promoted, kid_coin, kid_tower, kid_8, kid_dusk); ron_ending 'Told you. Tomorrow.' now keys on bins_taken_out (main mq_finale s8); new ron_bin_quip on ron_in_party (sq_bin_day s3b). DRAFT.",
 ], "0.4.9": [
  "World repointed every club text_ref (maps.club_int.<id>, maps.fernwick.sign_club; old records to system_items.picked_up / system_item_catalogue.old_record): the v0.4.8 stale-path allowance and world_text_ref_handoff are gone, stale text_refs are errors again. meta.club_moved stays as history.",
  "note_greystone now gates on beat_master_fernwick (" + GREYSTONE_RULING + "). note_thornwood stays beat_master_fernwick, note_frostspire beat_master_revival, note_mirefen beat_master_frostspire; the validator pins all four.",
  "maps.greystone_b1.camp_greystone: World added the spot mid-run (key requested from Text Bot), so it gets the same camp entry (Text Bot addition beyond the brief, pending_story_call). Look line echoes the club note's cold camp stove.",
  "In-place patch (10:08 PM CT): Story Bot passed the tone of camp_thornwood and camp_greystone as written; pending_story_call removed, story_ruling '" + CAMP_TONE_RULING + "' and a hooks note (log page, fast travel, rest; SOUL_PLAYBOOK 1.9) added to both.",
  "maps.thornwood.camp_thornwood (World spot (6,17)): look line, Yes/No restore prompt (SOUL_PLAYBOOK 1.9 'clear it, light the stove'), restored-once line, default. Sets camp_restored_thornwood via the map's sets_flag. pending_story_call for Story Bot's tone check. No reward, item, log page or team name (none defined for this camp)."],
 "0.4.8": [
  "World built club_int (qa/club/README.md, our ids exactly): every unplaced_npcs.rebel_* and unplaced.club_props.club_int.* entry moved to maps.club_int.<same id> word for word (meta.club_moved); geometry from the map's interact_spots / text_pending. Removed from unplaced.",
  "maps.fernwick.sign_club: 'THE FIREFLY' / 'Juice, tunes, open late.' (Gary's wording).",
  "rebel_bartender display_role 'juice counter' (Gary). Id unchanged.",
  "old_record: World placed fernwick (27,5), thornwood (5,15), route1 (20,23) as map items id old_record; catalogue entry added (Text Bot wording). Lanternport record stays unplaced (unplaced.club_props.missing_note_records).",
  "camp_restored_thornwood/greystone/frostspire/mirefen are World flags now: moved to world_flags, pending markers and proposal notes removed.",
  "note_greystone gate unchanged (beat_master_revival) while Story Bot decides on World's beat_master_fernwick question; validator pins it."],
 "0.4.7": [
  "Story Bot club calls (9:14 PM CT): ron_gag keeps ron_in_party + once, no longer pending (pending_gary_call ron_mode removed); Coder sets the flag.",
  "Back-room banner 'FOUND. ALL FOUR.' gated on field_team_home (proposed) instead of finale_done; pending marker removed.",
  "No Warmth charm: firefly lantern stays the only Missing Note reward.",
  "Finished tune on finale_done for rebel_dj and rebel_patron_3.",
  "Text Bot judgment call (in-place patch, 9:17 PM CT): tune_finished moved below the day/dawn lines for rebel_dj and rebel_patron_3, so by day the DJ is still asleep in the booth and the tune only plays at Dusk/Night. No extra when gate needed: day/dawn lines match first."],
 "0.4.6": [
  "The Firefly (Fernwick juice bar): rebel_bouncer, rebel_bartender (juice and snack counter keeper, id unchanged), rebel_dj, rebel_patron_1-3, rebel_paint_vendor in unplaced_npcs (map club_int, text_pending). Back-room MISSING wall + location notes in unplaced.club_props. Side story 'The Missing Note' on rebel_dj. Ron gag pending (ron_in_party, ron_mode).",
  "Items: pond_berry_juice, mossberry_shake, fern_mint_tea, firefly_shake in system_item_catalogue (effects pending, Coder); items.firefly_lantern (Missing Note reward).",
  "Gary's juice-bar rule: BAN_DRINK in the validator (player text and names). Existing lines changed to pass: Small/Big/Energy Tonic -> Small Remedy / Big Remedy / Pep Remedy (ids unchanged), shop clerk 'tonics' -> 'remedies', Care pocket help, blackout copay 'on the house'.",
  "World README 17.3: TV/bookcase anchors removed from unplaced.props (World reads map geometry now). Tile check also looks in the overlay layer (World depth pass, house_2f bed)."],
 "0.4.5": [
  "World map pass (OVERWORLD_README 16-17): text checked for every new spot (TVs, bookcases, windows, lap_nap_seat at (2,4) facing up, cradle_1-3, aide at (10,6)). Geometry copied from interact_spots/text_pending.",
  "7 unplaced TV/bookcase texts moved word for word to their World spot ids (meta.world_adoption). Each keeps a geometry-only anchor in unplaced.props (no text) because World's text_spots() still builds the spots from it; drop the anchors once World hard-codes them.",
  "Cradles: after-starter lines stay pending_story_call; each has a neutral default. shop_int third shelf (goods) has no interact spot, so no line.",
  "New system_item_catalogue: names + bag text for all 12 named World item ids; TBD / TBD_backroom_reward wait on Story. system_items.picked_up_money + {amount}. coin_pouch_small shows as 'a small purse' (coin = Master token).",
  "Validator: catalogue covers every maps/*.json item id; names fit {item}; no 'coin' in item text; branch maps (heal_*, rt_branch_*) may not name a tile/room colour; 'lilac' banned file-wide (branch tiles are pink now).",
  "Tags shallow / crystal / firefly_zone / bird_perch are Animator effects with no interact; no text needed."],
 "0.4.4": [
  "Coverage audit against design/MECHANICS_PARITY.md (109 systems): new top-level sections system_items, system_heal, system_shop, system_trainers, system_wild, system_blackout, system_save, system_skills, system_evolution, system_kilindex, system_cosmic, system_party, system_croft, system_trade, system_garden, system_field, system_phone (data in text/system_lines.py).",
  "meta.coverage_audit (by parity id), meta.mechanics_gap, meta.pending_gary_calls, meta.system_text_spec.",
  "Validator: system entries need a real parity id + build status, 1-3 pages, 2x40 wrap with worst-case placeholder values, short labels/choices, variants only with pending_gary_call, gender-neutral player lines, and a scan for lifted franchise phrasings.",
  "Field skill use lines: the old 'creature used skill!' line reworded to '{creature} puts {skill} to work!' (that was the studied games' exact battle phrasing). Validator now bans it file-wide.",
  "World adoption is now data-driven: a proposal moves word for word to maps.<map>.<World id> (text_was kept) only when World's maps/*.json carries that id; the rest stay in unplaced. Moves made this build: meta.world_adoption. heal_*.lap_nap_seat (new trigger) carries e10_lap_nap, moved off the sofa inspect.",
  "lab_brookhollow res_field now needs flg_promoted + got_starter (it names {lead}); fixes the order error after World made got_starter a side flag.",
  "PC + mobile landscape: control hints are device-neutral. {run_button}/{bike_button}/{confirm_button}/{hotkey} resolve per device (keyboard, controller, touch) via meta.input_hints, with glyph ids for Coder's upcoming prompts. 'Press {bike_button}' became 'Use {bike_button}'; 'quick key' became 'quick slot'. Validator bans device words in lines.",
  "Page fit measured in Coder's real dialogue CSS at 1280x720, 1920x1080, 844x390, 800x360 and 1024x768: every page fits in 2 lines. The box overlaps the touch controls on phone and tablet (flagged for Coder).",
  "NAME_CHECK.md: web clash check of proposed names from the design doc and MECHANICS_PARITY.md."],
 **meta["changelog"]}
meta["version"] = "0.4.11"
meta["changelog"] = {"0.4.11": [
  "Overnight merge (drafts/overnight/*.md) into the 170 spots World flagged in SPOTS_from_world_design.md: all 170 now have text (block '# ==== v0.4.11 OVERNIGHT MERGE'). No existing id or key changed.",
  "Per map: route_east 7, aurelith 8, route_aurelith_saltmere 7, saltmere 6, saltmere_office_int 2, saltmere_hall_int 5, route_revival 8, revival_heights 7, revival_hall_int 6, route_revival_saltmere 5, frostspire_pass 8, frostspire 7, frostspire_hall_int 5, sunmeadow_fields 7, route_revival_sunmeadow 4, route_sunmeadow_mirefen 6, route_saltmere_mirefen 4, mirefen 8, mirefen_hall_int 5, route_coast 7, tidewater_coast 9, tidewater_hall_int 6, lanternport 5, lanternport_hall_int 5, route_fernwick_lanternport 6, route_cindervale 7, cindervale 4, cindervale_hall_int 6.",
  "Gate and clerk spots reuse existing text instead of copies: blockers (aurelith arena doorman, revival checkpoint, lanternport tidelock, frostspire bridge, saltmere causeway), rail_only airspace officer / pass clerk, items.bike for the Saltmere office clerk.",
  "Masters carry the six keys Coder wires: battle_won, coin_handover, gift, skill_learned, after_storm, horn (where the draft has them). Mirefen hall text is darkness + reed lamps.",
  "Ron 2-6: pages = the draft's intro_2; the 2-page opener is referenced via opener=ron_battle_openers.* (opener + intro would break the 3-page limit).",
  "Wording shortened to fit 2x40 or device-neutral rules (validator untouched): Saltmere master after, Revival master after, Frostspire guide, Mirefen master, Tidewater guide + h2, Lanternport master + guide, Cindervale guide + h1 ('taps' -> 'springs'), Revival guide ('Press A' -> 'Check').",
  "system_item_catalogue.gold_coin = 'Gold Token' (gear pocket; World's new saltmere_item_1).",
  "Not merged (no World spot yet, left in drafts): hall outside/puzzle signs and hint props, per-region shop_int clerk greetings, hidden-pickup hint lines, Aurelith arena Battle Masters 1-4, quests_story.md, trainer_classes.md names."],
 **meta["changelog"]}
meta["version"] = "0.4.12"
meta["changelog"] = {"0.4.12": [
  "Batch 2 merge (SPOTS_from_world_design.md, Batch 2): 97 of the 111 lines left in UNMERGED_v0.4.11.md now have text (block '# ==== v0.4.12 BATCH 2 MERGE'). 92 new spot ids; trainers.thornwood.c/d/e and trainers.greystone.c ride on their spots; ron.battle_1 = existing fernwick.ron_rival_1 (not duplicated). No existing id or key changed.",
  "Hall outside signs in the town maps; greystone_caverns_c_researcher in greystone_b1; giant_hollow in route_cindervale; mirefen_bog_lights in mirefen. Shop clerk region lines are shop_int_clerk_<region> with variant_of=clerk, region, regular (repeat visit) at the clerk cell (2,3).",
  "Pickup hint notes use player item names (Small/Big/Pep Remedy per GD pockets; fp_bridge and smf_hidden_flowers are Big Remedy).",
  "Wording shortened to fit 2x40 or control-word rules (validator untouched): hall puzzle signs sluices, prisms, gusts, boardwalk, tide clock, top floor, quench, reset lever, Lanternport outside sign; Cindervale 'spring tap' text -> 'spring spout' (ids unchanged).",
  "Still unmerged (no maps yet): Aurelith arena Battle Masters 1-4 (8 lines), Greystone B2 (6 lines). See drafts/overnight/UNMERGED_v0.4.12.md."],
 **meta["changelog"]}
meta["rules_applied"].update({
  "Kilumen runs on mobile in landscape (GAME_QUALITY_CHECKLIST, Oct 22 2026)": "Text and buttons readable at phone size: every page measured in the real dialogue box at 844x390 and 1024x768 (plus 1280x720 PC). Control hints work on touch, keyboard and controller (meta.input_hints); no line names a key.",
  "Mirror structure only, never wording": "System lines follow the flow of the studied games (pickup, heal, shop, skills) in our own words; the validator bans lifted phrasings.",
  "Only write text for mechanics Kilumen has or plans": "Unbuilt, unspecified systems go to meta.mechanics_gap, not into text.",
  "Pending Gary calls": "Lines that hang on potions/rest, paid travel, phone/PC storage, player gender or Ron's mode are neutral or carry per-option variants plus pending_gary_call.",
})
doc["_proposed_names"]["system_v0.4.4"] = {
  "Skill Memory / Field Archive / Training Reel / Transfer to Revival Tech / File today's report / Variant Ledger / supply satchel": "see text/NAME_CHECK.md (web-checked Oct 22 2026)."}

# ---------- validation ----------
errs = []; warns = []
RETIRED = ast.literal_eval(re.search(r'RETIRED\s*=\s*(\[[^\]]*\])', open(ROOT + '/tools/interiors_merge.py').read()).group(1))
INDOOR_OR_CAVE = eval(re.search(r'INDOOR_OR_CAVE\s*=\s*(lambda[^\n]*)', open(ROOT + '/tools/progression.py').read()).group(1))
for mid in RETIRED:
    if maps.get(mid): errs.append(f'maps.{mid}: retired map (tools/interiors_merge.py RETIRED) must carry no text, move it')
for f in glob.glob(OW + '/maps/*.json'):
    m = json.load(open(f)); mid = m['name']
    if mid in RETIRED: continue
    ids = {o['id'] for o in m.get('npcs', []) + m.get('signs', []) + m.get('npcs_pending_text', []) + m.get('signs_pending_text', []) + _tp(m, 'npcs') + _tp(m, 'signs')}
    have = {k for k, v in maps.get(mid, {}).items() if v.get('kind') not in ('prop', 'trigger')}
    if ids - have: errs.append(f'{mid}: missing spots {sorted(ids - have)}')
    if have - ids - set(ISPOTS.get(mid, {})): errs.append(f'{mid}: unknown spots {sorted(have - ids - set(ISPOTS.get(mid, {})))}')
    for g in m.get('story_gates', []):
        if g['id'] not in blockers: errs.append(f'{mid}: story gate {g["id"]} has no text')
        elif blockers[g['id']]['flag'] != g['flag']: errs.append(f'{g["id"]}: flag mismatch')
wl = json.load(open(OW + '/world_layout.json'))
for g in wl.get('story_gates', {}).get('planned', []) + wl.get('story_gates', {}).get('built', []):
    if g['id'] not in blockers: errs.append(f'world_layout gate {g["id"]} has no text')
    elif blockers[g['id']]['flag'] != g['flag']: errs.append(f'{g["id"]}: flag mismatch vs world_layout')
for mid in maps:
    if not os.path.exists(f'{OW}/maps/{mid}.json'): errs.append(f'unknown map {mid}')
for mid, spots in maps.items():
    for sid, e in spots.items():
        if not 1 <= len(e['pages']) <= 3: errs.append(f'{mid}.{sid}: {len(e["pages"])} pages')
BAN_I = re.compile(r'pok[eé]|\bgym|badge|pok[eé]dex|nurse joy|\bHM\b|running shoes|bicycle', re.I)
# Gary, Oct 22: "no hints at drinking or drugs or smoking at all" (player text only; ids like rebel_bartender are not text)
BAN_DRINK = re.compile(r"\b(bartenders?|tipsy|hangovers?|on the rocks|booze\w*|beers?|wines?|cocktails?|tonics?|smok\w*|haze|hazy|pills?|weeds?|on the house|div(e|es|ed|ing))\b", re.I)
BAN_C = re.compile(r'\b(Cut|Surf|Strength|Flash|Fly|Rock Smash|Waterfall|Defog|Rock Climb)\b')
# Overnight Oct 23 2026 (Text Bot brief): extra franchise/system terms and any drink, drug or smoking reference.
BAN_X = re.compile(r"\b(shiny|super[- ]effective|gotcha|nurses?|drinks?|drinking|drank|drunk\w*|alcohol\w*|liquor|drugs?|drugged|cigar\w*|vap(e|es|ing)|tobacco)\b|pok[e\u00e9]\s?balls?|pok[e\u00e9]dex|pok[e\u00e9]mon|\bbadges?\b|\btonics?\b", re.I)
BAN_PP = re.compile(r'\bPP\b')
SKIP_KEYS = {'note', 'what', 'condition', 'giver', '_note', '_rule', 'type', 'skill', 'requires_flag', 'flag', 'item_id',
             'role', 'status', 'opened_from', 'interaction', 'map', 'npc', 'proposed_npc', 'species', 'active_when', 'after_gate', 'gate', 'kind', 'sets_flag', 'source', 'name', 'id', 'flags', 'soul_item', 'needs', 'effect', 'counter', 'tile', 'face', 'opens', 'from', 'proposed_npc', 'facing', 'zone', 'party_nickname', 'phase', 'weekday', 'default_choice', 'lead_type', 'story_ruling', 'stand', 'text_ref', 'next_to', 'proposed_id', 'bin_stage', 'bin_stage_default', 'states', 'states_by_phase', 'world_prop', 'text_was', 'gives', 'gift', 'region', 'disabled_until', 'fallback_for', '_section', 'parity', 'build', 'pending_gary_call', 'pending_story_call', 'min', 'sold_by', 'stock', 'area', 'pinned_under', 'regions', 'item', 'text_pending'}
def walk(o, path):
    if isinstance(o, str):
        if (path[-1] in SKIP_KEYS) or any(p in ('flags', 'when', 'trigger_when') for p in path if isinstance(p, str)) or path[1] in ('_meta', '_proposed_names') or (len(path) > 2 and path[1] == 'rail_only' and path[2] == 'zones'):
            return
        lines = []
        for part in o.split('\n'): lines += textwrap.wrap(part, 40) or ['']
        if len(lines) > 2: errs.append(f'too long ({len(lines)}): {"/".join(map(str, path))}: {o}')
        if BAN_I.search(o) or BAN_C.search(o): errs.append(f'banned term: {"/".join(map(str, path))}: {o}')
        if BAN_DRINK.search(o): errs.append(f'juice-bar rule (no drink/drug/smoke hints): {"/".join(map(str, path))}: {o}')
        if BAN_X.search(o) or BAN_PP.search(o): errs.append(f'banned term (overnight list): {"/".join(map(str, path))}: {o}')
    elif isinstance(o, dict):
        for k, v in o.items(): walk(v, path + [k])
    elif isinstance(o, list):
        for i, v in enumerate(o): walk(v, path + [i])
walk(doc, ['root'])
# whole-file scan (incl. meta) for franchise names only
if re.search(r'pok[eé]', json.dumps(doc), re.I): errs.append('franchise name somewhere in file')
# ---------- v0.4.0 soul-pass validation ----------
WL = json.load(open(OW + '/world_layout.json'))
ORDER = [p.get('id') for p in WL['progression_flags'] if p.get('id')]
KNOWN = set(p.get('id') or p.get('visited_flag') for p in WL['progression_flags']) | {'beat_rival_ron_1', 'storm_season'}
RANK = {f: i for i, f in enumerate(ORDER)}
RANK.update({'storm_season': RANK['has_skylift'] + 0.5, 'beat_aurelith_arena': 100, 'finale_done': 200, 'bins_taken_out': 199})
FLAGS_OK = KNOWN | set(PROPOSED_FLAGS) | set(WORLD_FLAGS)
PH_OK = set(CORE_PLACEHOLDERS) | set(EXTRA_PLACEHOLDERS)
GRADES = json.load(open(OW + '/time_of_day/grades.json'))
PHASES = set(GRADES['grades']) if isinstance(GRADES.get('grades'), dict) else {'dawn', 'day', 'dusk', 'night'}

def check_lines(lines, where, need_default=True):
    ids = [l['id'] for l in lines]
    if len(ids) != len(set(ids)): errs.append(f'{where}: duplicate line ids')
    for l in lines:
        for f in l['flags']:
            if f.lstrip('!') not in FLAGS_OK: errs.append(f'{where}.{l["id"]}: unknown flag {f}')
        for k in l.get('when', {}):
            if k not in WHEN_KEYS: errs.append(f'{where}.{l["id"]}: unknown when key {k}')
        w = l.get('when', {})
        if 'phase' in w and w['phase'] not in PHASES: errs.append(f'{where}.{l["id"]}: bad phase {w["phase"]}')
        if 'hour' in w and not (isinstance(w['hour'], int) and 0 <= w['hour'] <= 23): errs.append(f'{where}.{l["id"]}: bad hour {w["hour"]}')
        if any(f in FLAG_ALIASES for f in l['flags']): errs.append(f'{where}.{l["id"]}: retired flag id, use {FLAG_ALIASES}')
        if 'pages' in l and l['pages'] is not None and not 1 <= len(l['pages']) <= 3: errs.append(f'{where}.{l["id"]}: {len(l["pages"])} pages')
        if any(f in STORY_OWNED for f in l['flags']) and not (l.get('pending_story_call') or l.get('story_ruling')):
            errs.append(f'{where}.{l["id"]}: story-owned flag without pending_story_call')
    if need_default:
        d = lines[-1]
        if d['id'] != 'default' or d['flags'] or d.get('when'): errs.append(f'{where}: last line must be an unconditional default')
        if any(l['id'] == 'default' for l in lines[:-1]): errs.append(f'{where}: default not last')
    for i, a in enumerate(lines):      # unreachable: an earlier line whose conditions are a subset of a later one
        for b in lines[i + 1:]:
            if b['id'] == 'default': continue
            aw, bw = a.get('when', {}), b.get('when', {})
            if set(a['flags']) <= set(b['flags']) and all(bw.get(k) == v for k, v in aw.items()) \
               and (a.get('bin_stage') is None or a.get('bin_stage') == b.get('bin_stage')):
                errs.append(f'{where}: {b["id"]} is unreachable behind {a["id"]}')
    prev = None                        # rank: plain single-flag lines must go latest-flag first
    for l in lines:
        if len(l['flags']) == 1 and not l.get('when') and l['flags'][0] in RANK:
            r = RANK[l['flags'][0]]
            if prev is not None and r > prev: errs.append(f'{where}: {l["id"]} out of order (later flag after earlier flag)')
            prev = r

TN = {}
for tf in ('tileset.json', 'tileset_extra.json'):
    t = json.load(open(f'{OW}/{tf}'))['tiles']
    for k, v in (t.items() if isinstance(t, dict) else enumerate(t)):
        TN[int(v.get('id', k)) if isinstance(v, dict) else int(k)] = v.get('name') if isinstance(v, dict) else v
DIRS = {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}
for f in glob.glob(OW + '/maps/*.json'):
    m = json.load(open(f)); mid = m['name']; Ly = m['layers']
    if mid in RETIRED: continue
    pend = {o['id'] for o in m.get('npcs_pending_text', []) + m.get('signs_pending_text', []) + _tp(m, 'npcs') + _tp(m, 'signs')}
    real = {o['id'] for o in m.get('npcs', []) + m.get('signs', [])}
    for sid, e in maps.get(mid, {}).items():
        where = f'maps.{mid}.{sid}'
        if 'lines' not in e: errs.append(f'{where}: no lines'); continue
        check_lines(e['lines'], where)
        if e['lines'][-1]['pages'] != e['pages']: errs.append(f'{where}: pages != default line')
        isp = ISPOTS.get(mid, {})
        if sid in isp:   # World's interact_spots entry is the source of truth: every geometry key must match it exactly
            for k in GEOM_KEYS:
                mv, tv = isp[sid].get(k), e.get(k)
                if k == 'stand' and mv is not None: mv = list(mv)
                if mv != tv: errs.append(f'{where}: {k} {tv!r} != interact_spots {mv!r}')
            if isp[sid].get('text') not in (None, where): errs.append(f'{where}: interact_spots text points at {isp[sid].get("text")}')
        elif e.get('kind') in ('prop', 'trigger') or 'x' in e:
            errs.append(f'{where}: prop has no interact_spots entry in maps/{mid}.json')
        if e.get('kind') in ('prop', 'trigger', 'sign') and 'stand' in e:
            x, y = e['x'], e['y']; sx, sy = e['stand']
            H, W = len(Ly['collision']), len(Ly['collision'][0])
            if not (0 <= x < W and 0 <= y < H and 0 <= sx < W and 0 <= sy < H): errs.append(f'{where}: out of bounds'); continue
            if Ly['collision'][sy][sx] != 0: errs.append(f'{where}: stand cell not walkable')
            dx, dy = DIRS[e['face']]
            if e['kind'] in ('prop', 'sign') and (sx + dx, sy + dy) != (x, y): errs.append(f'{where}: stand+face does not reach x,y')
            if e['kind'] == 'trigger' and (sx, sy) != (x, y): errs.append(f'{where}: trigger stand must equal x,y')
            name = TN.get(Ly['decoration'][y][x]) or ''
            if not name.startswith(e['tile'] or '\0') and 'overlay' in Ly and e['tile']:   # World depth pass: tall furniture tops sit in the overlay layer
                name = TN.get(Ly['overlay'][y][x]) or name
            if e.get('needs_world_prop'): errs.append(f'{where}: needs_world_prop is retired (World builds props now)')
            if e['kind'] == 'trigger' and e['tile'] == '':   # floor trigger (e.g. lap_nap_seat): no decoration expected
                if name: errs.append(f'{where}: floor trigger expects no decoration, found {name!r}')
            elif not name.startswith(e['tile'] or '\0'): errs.append(f'{where}: tile at {x},{y} is {name!r}, expected {e["tile"]}*')
        elif sid in pend and sid in real: errs.append(f'{where}: id both placed and pending')
    # spots in text must exist in the map (placed, pending text, or a validated prop)
    for sid, e in maps.get(mid, {}).items():
        if sid not in real | pend | set(ISPOTS.get(mid, {})) and e.get('kind') not in ('prop', 'trigger'): errs.append(f'maps.{mid}.{sid}: unknown spot id')
    for sid in pend - set(maps.get(mid, {})): errs.append(f'{mid}: pending-text spot {sid} has no text')
    for sp in ISPOTS.get(mid, {}).values():
        if sp['id'] not in maps.get(mid, {}): errs.append(f'{mid}: interact_spots {sp["id"]} has no text')
    # bin: lines line up with the map's bin_stages
    bs = m.get('bin_stages')
    if bs:
        b = maps[mid].get('bin_ron')
        if not b: errs.append(f'{mid}: bin_stages but no bin_ron text')
        else:
            # v0.4.3: stage = coin COUNT (Coder binStage(): 'empty' if empty_flag, 8 if all_badges, else number of beat_master_* flags,
            # capped at 8). Lines must key on bin_stage only, never on a single coin flag, so out-of-order coins pick the right line.
            COIN_FLAGS = sorted(f for f in FLAGS_OK if f.startswith('beat_master_'))
            WORDS = {1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight'}
            stages = {l.get('bin_stage') for l in b['lines'][:-1]} | {b.get('bin_stage_default')}
            if stages != set(bs['tiles']): errs.append(f'{mid}.bin_ron: stages {sorted(map(str, stages))} != bin_stages tiles {sorted(bs["tiles"])}')
            for l in b['lines'][:-1]:
                st = l.get('bin_stage')
                if st == 'empty':
                    if l['flags'] != [bs['empty_flag']]: errs.append(f'{mid}.bin_ron.{l["id"]}: empty line must be flags [{bs["empty_flag"]}]')
                    if b['lines'].index(l) != 0: errs.append(f'{mid}.bin_ron: empty line must come first')
                elif st is not None and str(st).isdigit() and 1 <= int(st) <= 8:
                    coinish = [f for f in l['flags'] if f.startswith('beat_master_') or f == 'all_badges']
                    if coinish: errs.append(f'{mid}.bin_ron.{l["id"]}: stage {st} keys on coin flag(s) {coinish}; stage = coin count, use bin_stage only')
                    if l['id'] != 'bin_creature' and not re.match(rf"(?i)\W*{WORDS[int(st)]}\b", l['pages'][0]):
                        errs.append(f'{mid}.bin_ron.{l["id"]}: stage {st} text must open with the bag count "{WORDS[int(st)].title()}"')
                    flies = any(re.search(r'\bflies\b', pg) for pg in l['pages'])
                    if int(st) >= bs['overlay_from_stage'] and l['id'] != 'bin_creature' and not flies: errs.append(f'{mid}.bin_ron.{l["id"]}: stage {st} shows flies, text should mention them')
                    if int(st) < bs['overlay_from_stage'] and flies: errs.append(f'{mid}.bin_ron.{l["id"]}: no flies before stage {bs["overlay_from_stage"]}')
                else: errs.append(f'{mid}.bin_ron.{l["id"]}: missing bin_stage')
            if b.get('bin_stage_default') != '0': errs.append(f'{mid}.bin_ron: default must describe stage 0')
            # simulate Coder's picker for every coin subset (any order): the line shown must describe the tile shown
            def _bin_stage(fl): return 'empty' if bs['empty_flag'] in fl else (8 if 'all_badges' in fl else min(8, sum(f.startswith('beat_master_') for f in fl)))
            def _pick(fl, st, counters):
                for l in b['lines']:
                    if l.get('pending_story_call') or not all(f in fl for f in l['flags']): continue
                    if l.get('bin_stage') is not None and str(l['bin_stage']) != str(st): continue
                    w = l.get('when', {})
                    if 'count_gte' in w and counters.get(w['count_gte']['counter'], 0) < w['count_gte']['n']: continue
                    return l
            cases = [set(c) for k in range(len(COIN_FLAGS) + 1) for c in itertools.combinations(COIN_FLAGS, k)]
            cases += [c | {'all_badges'} for c in cases[::7]] + [c | {bs['empty_flag']} for c in cases[::11]]
            for fl in cases:
                st = _bin_stage(fl)
                for counters in ({}, {'bin_inspects_after_8': 8}):
                    got = _pick(fl, st, counters)
                    want = str(st) if st else None
                    shown = got.get('bin_stage') if got and got['id'] != 'default' else None
                    if got is None or (shown != want and not (st == 0 and got['id'] == 'default')):
                        errs.append(f'{mid}.bin_ron: coins {sorted(fl)} show tile {st} but text {got and got["id"]}'); break
                else: continue
                break

for _m, _c in signs_awaiting_world_id.items():
    if _m.startswith('_'): continue
    mj = MAPJ[_m]; C = mj['layers']['collision']; H, W = len(C), len(C[0])
    taken = {o['id'] for o in mj.get('npcs', []) + mj.get('signs', []) + mj.get('signs_pending_text', []) + mj.get('npcs_pending_text', []) + mj.get('interact_spots', [])}
    for _xy, _e in _c.items():
        x, y = map(int, _xy.split(','))
        if not (0 <= x < W and 0 <= y < H): errs.append(f'signs_awaiting_world_id.{_m}.{_xy}: out of bounds'); continue
        if not any(0 <= x + dx < W and 0 <= y + dy < H and C[y + dy][x + dx] == 0 for dx, dy in DIRS.values()): errs.append(f'signs_awaiting_world_id.{_m}.{_xy}: no walkable cell to read it from')
        if _e['proposed_id'] in taken: errs.append(f'signs_awaiting_world_id.{_m}.{_xy}: proposed_id {_e["proposed_id"]} already used in the map')
check_lines(ron_nicknames['lines'], 'ron_nicknames')
for e in ron_nicknames['lines']:
    for n in e['nicks']:
        if len(n) > 16 and n != '{player}': errs.append(f'ron_nicknames: {n} too long')
check_lines(vane['lines'], 'vane')
for e in vane['lines']:
    if not e.get('pending_story_call'): errs.append(f'vane.{e["id"]}: must be pending_story_call')
for _m, _c in signs_awaiting_world_id.items():
    if not _m.startswith('_'):
        for _xy, _e in _c.items(): check_lines(_e['lines'], f'signs_awaiting_world_id.{_m}.{_xy}')
check_lines(unplaced_npcs['lucky_crystal_seller']['lines'], 'unplaced_npcs.lucky_crystal_seller')
# ---------- v0.4.2: GAME_QUALITY_CHECKLIST "Time of day, recolours and interior reuse" ----------
for _sec in ('windows', 'npcs', 'props'):
    for _k, _e in unplaced[_sec].items():
        if _k.startswith('_'): continue
        if _e.get('anchor_only'):
            _mm, _ms = _e['moved_to'].split('.')[1:]
            if 'lines' in _e or 'pages' in _e: errs.append(f'unplaced.{_sec}.{_k}: anchor must carry no text')
            if _ms not in maps.get(_mm, {}): errs.append(f'unplaced.{_sec}.{_k}: anchor moved_to {_e["moved_to"]} has no text')
            if (_e['proposed_spot']['map'], _e['proposed_spot']['proposed_id']) != (_mm, _ms): errs.append(f'unplaced.{_sec}.{_k}: anchor proposed_spot != moved_to')
            _sp_w = ISPOTS.get(_mm, {}).get(_ms)
            if _sp_w and (_sp_w['x'], _sp_w['y']) != (_e['proposed_spot']['x'], _e['proposed_spot']['y']): errs.append(f'unplaced.{_sec}.{_k}: anchor geometry differs from World spot')
            continue
        check_lines(_e['lines'], f'unplaced.{_sec}.{_k}')
        _ps = _e.get('proposed_spot')
        if _sec == 'props':
            mj = MAPJ[_ps['map']]; C = mj['layers']['collision']; D = mj['layers']['decoration']
            x, y = _ps['x'], _ps['y']; sx, sy = _ps['stand']; dx, dy = DIRS[_ps['face']]
            if C[sy][sx] != 0: errs.append(f'unplaced.props.{_k}: proposed stand not walkable')
            if (sx + dx, sy + dy) != (x, y): errs.append(f'unplaced.props.{_k}: proposed stand+face does not reach x,y')
            if not (TN.get(D[y][x]) or '').startswith(_ps['tile']): errs.append(f'unplaced.props.{_k}: tile at {x},{y} is {TN.get(D[y][x])!r}')
            if any((sp['x'], sp['y']) == (x, y) for sp in ISPOTS.get(_ps['map'], {}).values()): errs.append(f'unplaced.props.{_k}: {_ps["map"]} already has a spot at {x},{y}; move the text there')
            if _ps['proposed_id'] in ISPOTS.get(_ps['map'], {}) or _ps['proposed_id'] in maps.get(_ps['map'], {}): errs.append(f'unplaced.props.{_k}: proposed_id already used')
        elif _sec == 'npcs' and _ps and _ps['npc'] not in maps.get(_ps['map'], {}): errs.append(f'unplaced.npcs.{_k}: proposed npc not in maps')
ROLE = {mid: mj.get('interior_role', '') for mid, mj in MAPJ.items()}
def _shared(mid):
    r = ROLE.get(mid, '')
    if r.startswith('upper floor of '): return _shared(r[len('upper floor of '):].strip())
    return r.startswith('shared')
TOWNS = re.compile(r'\b(Brookhollow|Fernwick|Saltmere|Cindervale|Revival Heights|Lanternport|Aurelith|Frostspire|Mirefen|Tidewater)\b')
RECOLOURS = {e['recolour'] for mj in MAPJ.values() for e in mj.get('entered_from', []) if e.get('recolour') and e['recolour'] != 'identity'}
COLOURS = re.compile(r'\b(' + '|'.join(sorted(RECOLOURS | {'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'grey', 'gray', 'white',
                     'black', 'teal', 'beige', 'cream', 'crimson', 'navy', 'violet', 'golden', 'lilac', 'lavender', 'mauve', 'rose', 'wine', 'magenta', 'plum'})) + r')\b', re.I)
SURFACE = re.compile(r'\b(wall|walls|floor|floors|rug|rugs|carpet|curtains?|paint|paintwork|wallpaper|tiles|trim|roof|door)\b', re.I)
LIGHTWORDS = re.compile(r'\b(dark|darker|darkness|lights?|lamps?|lamplight|sunlight|moonlight|shadows?|dim|dimmer|glow|glowing|sunset|sunrise|bright|gloom)\b', re.I)
ZMAPS = {z['id']: set(z.get('maps', [])) for z in WL['zones']}
zone_todo = {}; SPARE_ZONE_LINES = {}
def _pages(l): return [pg for pg in (l.get('pages') or []) if isinstance(pg, str)]
def interior_checks(mid, where, lines, states_by_phase=False):
    for l in lines:
        w = l.get('when', {})
        for pg in _pages(l):
            if _shared(mid):
                if TOWNS.search(pg) and 'zone' not in w: errs.append(f'{where}.{l["id"]}: shared interior names a town outside a when.zone line: {pg}')
                if RECOLOURS and re.search(r'\b(' + '|'.join(RECOLOURS) + r')\b', pg, re.I): errs.append(f'{where}.{l["id"]}: shared interior names a recolour: {pg}')
                if COLOURS.search(pg) and SURFACE.search(pg): errs.append(f'{where}.{l["id"]}: shared interior names a room colour: {pg}')
            if (mid.startswith('heal_') or mid.startswith('rt_branch')) and (COLOURS.search(pg) and SURFACE.search(pg) or re.search(r'\b(lilac|pink)\b', pg, re.I)):
                errs.append(f'{where}.{l["id"]}: branch interior names a tile/room colour (branch tiles were recoloured lilac -> pink): {pg}')
            if INDOOR_OR_CAVE(mid) and 'phase' in w and not states_by_phase and LIGHTWORDS.search(pg):
                errs.append(f'{where}.{l["id"]}: indoor phase line talks about light, but interiors stay on the day grade: {pg}')
        if 'zone' in w and mid in ROLE and ROLE[mid] and mid not in ZMAPS.get(w['zone'], set()):
            if w['zone'] not in ZMAPS: errs.append(f'{where}.{l["id"]}: unknown zone {w["zone"]}')
            elif mid in SPARE_MAPS: SPARE_ZONE_LINES.setdefault(mid, set()).add(w['zone'])
            else: zone_todo.setdefault(w['zone'], set()).add(mid)
for mid, spots in maps.items():
    for sid, e in spots.items(): interior_checks(mid, f'maps.{mid}.{sid}', e['lines'], bool(e.get('states_by_phase')))
for _k, _e in unplaced['props'].items():
    if not _k.startswith('_') and not _e.get('anchor_only'): interior_checks(_e['proposed_spot']['map'], f'unplaced.props.{_k}', _e['lines'])
# shared maps must not name the town in their unconditional default (checked above); 2F of a shared home inherits the rule
if zone_todo:
    meta['zone_wiring_todo'] = {"_note": "World: add these maps to world_layout zones[<zone>].maps so the when.zone lines can fire (until then they "
                                "stay silent and the neutral default shows). 2F maps also need Coder: zone() should follow $return to the outdoor map.",
                                **{z: sorted(v) for z, v in sorted(zone_todo.items())}}
    warns.append(f'zone wiring: {meta["zone_wiring_todo"]}')
for k, v in ron_battle_openers.items():
    if not k.startswith('_'): check_lines(v, f'ron_battle_openers.{k}')
eids = [e['id'] for e in company_inbox['emails']]
if len(eids) != len(set(eids)): errs.append('company_inbox: duplicate ids')
for e in company_inbox['emails']:
    for f in e['flags']:
        if f not in FLAGS_OK: errs.append(f'company_inbox.{e["id"]}: unknown flag {f}')
    if any(f in STORY_OWNED for f in e['flags']) and not (e.get('pending_story_call') or e.get('story_ruling')):
        errs.append(f'company_inbox.{e["id"]}: story-owned flag without pending_story_call')
# placeholders: whitelist, and {rt_number} only in vane / catalogue
def ph_walk(o, path):
    if isinstance(o, str):
        for p in re.findall(r'\{\w+\}', o):
            if p not in PH_OK: errs.append(f'bad placeholder {p} at {"/".join(map(str, path))}')
            if p == '{rt_number}' and path[1] not in ('vane', 'catalogue'): errs.append(f'{{rt_number}} outside vane/catalogue at {"/".join(map(str, path))}')
    elif isinstance(o, dict):
        for k, v in o.items():
            if k not in ('_meta', '_proposed_names'): ph_walk(v, path + [k])
    elif isinstance(o, list):
        for i, v in enumerate(o): ph_walk(v, path + [i])
ph_walk(doc, ['root'])
if re.search(r'\{lead_species\}', json.dumps(doc)): errs.append('{lead_species} must not be used')

for w_ in warns: print('WARN', w_)
if errs:
    print('\n'.join(errs)); sys.exit(1)

# ---------- v0.4.3 checks ----------
# (a) every when / trigger_when key must be one Coder's picker handles (src/overworld/lines.js whenMatches, read-only).
#     A line using an unsupported key must carry disabled_until AND have a fallback line (fallback_for) in the same block.
PICKER_SRC = '/workspace/kilumen/src/overworld/lines.js'
_wm = re.search(r'export function whenMatches[\s\S]*?\n}\n', open(PICKER_SRC).read()).group(0)
PICKER_KEYS = set(re.findall(r"case '(\w+)'", _wm))
if not PICKER_KEYS >= {'phase', 'hour', 'count_gte'}: errs.append(f'could not read picker keys from {PICKER_SRC}')
WHEN_USED = {}
def _when_walk(o, path):
    if isinstance(o, dict):
        if isinstance(o.get('lines'), list):
            ids = {l.get('id') for l in o['lines'] if isinstance(l, dict)}
            for l in o['lines']:
                if not isinstance(l, dict): continue
                bad = [k for k in l.get('when', {}) if k not in PICKER_KEYS]
                for k in l.get('when', {}): WHEN_USED.setdefault(k, []).append(f'{path}#{l.get("id")}')
                if bad:
                    if not l.get('disabled_until'): errs.append(f'{path}.{l.get("id")}: when key(s) {bad} not supported by Coder\'s picker; mark disabled_until')
                    if not any(isinstance(x, dict) and x.get('fallback_for') == l.get('id') for x in o['lines']):
                        errs.append(f'{path}.{l.get("id")}: unsupported when key(s) {bad} need a fallback line (fallback_for: {l.get("id")})')
                if l.get('fallback_for') and l['fallback_for'] not in ids: errs.append(f'{path}.{l.get("id")}: fallback_for names a missing line')
                if l.get('fallback_for') and [k for k in l.get('when', {}) if k not in PICKER_KEYS]: errs.append(f'{path}.{l.get("id")}: fallback uses an unsupported key')
        for k, v in o.items():
            if k == 'trigger_when' and isinstance(v, dict):
                for kk in v:
                    WHEN_USED.setdefault(kk, []).append(f'{path} (trigger_when)')
                    if kk not in PICKER_KEYS: errs.append(f'{path}: trigger_when key {kk} not supported by Coder\'s picker')
            elif k not in ('_meta',): _when_walk(v, f'{path}.{k}' if path else k)
    elif isinstance(o, list):
        for i, v in enumerate(o): _when_walk(v, path)
_when_walk(doc, '')
meta['when_key_audit'] = {
 "_note": f"Every when / trigger_when key used in this file vs Coder's picker ({PICKER_SRC.replace('/workspace/kilumen/', '')} whenMatches, dev/overworld-v1). Unknown keys never match there.",
 "supported_by_picker": sorted(PICKER_KEYS),
 "used": {k: len(v) for k, v in sorted(WHEN_USED.items())},
 "unsupported": {k: {"used_by": v, "fallback": "kid_dusk (when.phase dusk, fallback_for kid_school); kid_school stays, disabled_until weekday ships" if k == 'weekday' else "none"}
                 for k, v in sorted(WHEN_USED.items()) if k not in PICKER_KEYS},
}
for k, v in meta['when_key_audit']['unsupported'].items():
    if v['fallback'] == 'none': errs.append(f'when key {k} unsupported with no fallback')
# (b) {rt_number}: every page must still fit with any 4-digit catalogue number (RT-0000 .. RT-9999, all 7 characters wide)
RT_VALUES = ['RT-0000', 'RT-9999', 'RT-1111', 'RT-0147']
def _rt_walk(o, path):
    if isinstance(o, str) and '{rt_number}' in o:
        for v in RT_VALUES:
            t = o.replace('{rt_number}', v)
            if sum(len(textwrap.wrap(p, 40) or ['']) for p in t.split('\n')) > 2: errs.append(f'{{rt_number}}={v} breaks the page at {path}')
    elif isinstance(o, dict):
        for k, v in o.items():
            if k not in ('_meta', '_proposed_names') and k not in SKIP_KEYS: _rt_walk(v, f'{path}/{k}')
    elif isinstance(o, list):
        for i, v in enumerate(o): _rt_walk(v, f'{path}/{i}')
_rt_walk(doc, '')
for _sec in ('vane', 'catalogue'):   # no hard-coded catalogue number stands in for {rt_number} (except the RT-0000 nickname joke)
    _txt = []
    def _tw(o, k=None):
        if isinstance(o, str) and k not in SKIP_KEYS: _txt.append(o)
        elif isinstance(o, dict): [_tw(v, kk) for kk, v in o.items()]
        elif isinstance(o, list): [_tw(v, k) for v in o]
    _tw(doc[_sec])
    for _m in re.finditer(r'RT-\d{4}', ' '.join(_txt)):
        if _m.group(0) != 'RT-0000': errs.append(f'{_sec}: hard-coded catalogue number {_m.group(0)}, use {{rt_number}}')
# (c) every World text_ref in maps/*.json must resolve to a picker-readable entry; if maps.<map>.<id> also exists, both must match
def _get(path):
    o = doc
    for p in path.split('.'):
        if not isinstance(o, dict) or p not in o: return None
        o = o[p]
    return o
for _mid, _mj in MAPJ.items():
    if _mid in RETIRED: continue
    for _d in _mj.get('npcs', []) + _mj.get('signs', []) + _mj.get('npcs_pending_text', []) + _mj.get('signs_pending_text', []) + _tp(_mj, 'npcs') + _tp(_mj, 'signs'):
        _r = re.search(r'overworld_lines\.json\s+([\w.]+)', _d.get('text_ref', ''))
        if not _r: continue
        _t = _get(_r.group(1)); _own = maps.get(_mid, {}).get(_d['id'])
        if not isinstance(_t, dict) or not isinstance(_t.get('lines'), list): errs.append(f'{_mid}.{_d["id"]}: text_ref {_r.group(1)} does not resolve to an entry with lines')
        elif _own and (_own['lines'] != _t['lines'] or _own['pages'] != _t['pages']): errs.append(f'{_mid}.{_d["id"]}: maps.{_mid}.{_d["id"]} and text_ref {_r.group(1)} differ')
# (d) spare maps: kept, valid, and flagged as spare (not broken); warn if a door now leads there (then drop it from SPARE_MAPS)
DOOR_TO = {d.get('to') for d in WL.get('interior_doors', [])} | {w.get('to') for mj in MAPJ.values() for w in mj.get('warps', [])}
for _mid in SPARE_MAPS:
    if _mid not in MAPJ: errs.append(f'spare map {_mid} has no maps/{_mid}.json')
    if _mid not in maps: errs.append(f'spare map {_mid} has no text')
    if _mid in DOOR_TO: print(f'WARN spare map {_mid} now has a door: drop it from SPARE_MAPS')
meta['spare_maps'] = {"_note": "Maps World keeps as spares until a town needs them (8:20 PM CT). Their text is parked under maps.<map> as usual "
                               "(ids match the map file) and passes every check; no door leads there, which is expected, not an error.",
                      **SPARE_MAPS}
if SPARE_ZONE_LINES: meta['spare_maps']['_zone_lines_parked'] = {k: sorted(v) for k, v in SPARE_ZONE_LINES.items()}
# (f) device-neutral control hints (checklist: Kilumen runs on mobile in landscape; PC + touch)
_DEV = re.compile(r"(?<![-\w])(?:press(es|ed|ing)?)\b|\b(click (on|the|to)|taps?|tapped|keyboard|shift key|space ?bar|enter key|esc key|ctrl|backspace|arrow keys?|wasd|quick key|key [0-9]|mouse|controller|gamepad|joystick|d-?pad)\b", re.I)
_DEV2 = re.compile(r"\b[A-Z] (key|button)\b|\b(Shift|Space|Enter|Esc|Tab|Backspace)\b")
def _dev_walk(o, path):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ('_meta', '_proposed_names') or k in SKIP_KEYS: continue
            _dev_walk(v, path + [k])
    elif isinstance(o, list):
        for i, v in enumerate(o): _dev_walk(v, path + [str(i)])
    elif isinstance(o, str) and (_DEV.search(re.sub(r'\{\w+\}', '', o)) or _DEV2.search(re.sub(r'\{\w+\}', '', o))):
        errs.append('device-specific control wording (use a control placeholder): ' + '/'.join(path) + ': ' + o)
_dev_walk(doc, [])
_ih = meta["input_hints"]["placeholders"]
for ph in ('{run_button}', '{bike_button}', '{confirm_button}', '{hotkey}'):
    if any(not _ih.get(ph, {}).get(dv) for dv in ('keyboard', 'controller', 'touch', 'glyph')): errs.append(f'input_hints: {ph} needs keyboard/controller/touch/glyph')
_used_ctrl = set(re.findall(r'\{\w+_button\}|\{hotkey\}', json.dumps({k: v for k, v in doc.items() if k != '_meta'})))
for ph in _used_ctrl - set(_ih): errs.append(f'input_hints: control placeholder {ph} used but not specced')
_FILL = {**SL.SAMPLES, '{lead}': 'Bramblehorn12', '{nick}': 'Bramblehorn12', '{rt_number}': 'RT-0147', '{coin}': 'Stonebreak', '{coins}': '8', '{nearest_station}': 'Revival Heights Central'}
def _fit_walk(o, path):   # each device phrase must keep every page that uses it inside 2x40
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ('_meta', '_proposed_names') or k in SKIP_KEYS: continue
            _fit_walk(v, path + [k])
    elif isinstance(o, list):
        for i, v in enumerate(o): _fit_walk(v, path + [str(i)])
    elif isinstance(o, str):
        used = [ph for ph in _ih if ph in o]
        if not used: return
        for dv in ('keyboard', 'controller', 'touch'):
            x = o
            for ph in used: x = x.replace(ph, _ih[ph][dv].replace('N', '1'))
            for ph in re.findall(r'\{\w+\}', x): x = x.replace(ph, _FILL.get(ph, ph))
            if not _wrap_ok(x): errs.append(f'{"/".join(path)}: too long with the {dv} control phrase: {x}')
# (e) v0.4.4 system sections
if re.search(r'used \{skill\}!', json.dumps(doc, ensure_ascii=False)): errs.append('lifted phrasing: "used {skill}!" somewhere in file')
PARITY_IDS = set(re.findall(r'^\| ([BCPFEGM]\d+) \|', open('/workspace/kilumen/design/MECHANICS_PARITY.md').read(), re.M))
BUILD_OK = {'built', 'partial', 'designed', 'different', 'missing'}
LIFTED = re.compile(r"wild \w+ appeared|got away safely|whited out|blacked out|is evolving|congratulations|wants to battle|would like to battle|1, 2,? and|\bpoof\b|obtained|put away the|we hope to see you|is out of usable|can't learn more than", re.I)
def _wrap_ok(t):
    n = 0
    for part in t.split('\n'): n += len(textwrap.wrap(part, 40) or [''])
    return n <= 2
def _msg(pages, where):
    if not isinstance(pages, list) or not 1 <= len(pages) <= 3: errs.append(f'{where}: needs 1-3 pages'); return
    for i, pg in enumerate(pages):
        x = pg
        for ph in re.findall(r'\{\w+\}', pg):
            if ph not in SL.SAMPLES: errs.append(f'{where}[{i}]: no worst-case sample for {ph}')
            else: x = x.replace(ph, SL.SAMPLES[ph])
        if not _wrap_ok(x): errs.append(f'{where}[{i}]: too long with worst-case placeholders: {x}')
        if LIFTED.search(pg): errs.append(f'{where}[{i}]: lifted franchise phrasing: {pg}')
        if '{player}' in pg and re.search(r'\b(he|she|his|her|him|hers)\b', pg, re.I): errs.append(f'{where}[{i}]: player line must be gender-neutral')
for sec in SL.SYSTEM:
    if not sec.startswith('system_'): errs.append(f'{sec}: system sections must be named system_*')
    for key, e in SL.SYSTEM[sec].items():
        if key.startswith('_'): continue
        w = f'{sec}.{key}'
        if not isinstance(e, dict): errs.append(f'{w}: entry must be a dict'); continue
        if e.get('parity') not in PARITY_IDS: errs.append(f'{w}: parity id {e.get("parity")} not in MECHANICS_PARITY.md')
        if e.get('build') not in BUILD_OK: errs.append(f'{w}: bad build status {e.get("build")}')
        bodies = [k for k in ('pages', 'labels', 'tiers') if k in e] + (['phases'] if all(p in e for p in PHASES) else [])
        if not bodies: errs.append(f'{w}: no pages/labels/tiers')
        if 'pages' in e: _msg(e['pages'], w)
        for k, v in e.get('variants', {}).items(): _msg(v, f'{w}.variants.{k}')
        for i, t in enumerate(e.get('tiers', [])):
            _msg(t['pages'], f'{w}.tiers[{i}]')
            if i and t['min'] <= e['tiers'][i - 1]['min']: errs.append(f'{w}: tiers must rise')
        if 'tiers' in e and e['tiers'][0]['min'] != 0: errs.append(f'{w}: first tier must start at 0')
        for p in PHASES:
            if p in e: _msg(e[p], f'{w}.{p}')
        for k, v in e.get('labels', {}).items():
            if len(v) > 24 or LIFTED.search(v): errs.append(f'{w}.labels.{k}: label too long or lifted')
        for c in e.get('choices', []):
            if len(c) > 18: errs.append(f'{w}: choice too long: {c}')
        if 'variants' in e and e.get('pending_gary_call') not in SL.GARY_CALLS: errs.append(f'{w}: variants need a pending_gary_call')
        if 'pending_gary_call' in e and e['pending_gary_call'] not in SL.GARY_CALLS: errs.append(f'{w}: unknown gary call')
for i, n, ps, t, wh in SL.COVERAGE:
    for part in re.findall(r'[BCPFEGM]\d+', i):
        if part not in PARITY_IDS: errs.append(f'coverage row {i}: not a MECHANICS_PARITY id')
for g in SL.MECHANICS_GAP:
    for part in re.findall(r'[BCPFEGM]\d+', g['parity']):
        if part not in PARITY_IDS: errs.append(f'mechanics_gap {g["category"]}: bad parity id {part}')
# (g) v0.4.5: World items (maps/*.json items[]) -> system_item_catalogue; no tile colour words anywhere
_CAT = SL.SYSTEM["system_item_catalogue"]; _POCKETS = set(doc["comfort"]["bag_pockets"])
_MAP_ITEMS = {}
for _mid, _mj in MAPJ.items():
    for _it in _mj.get('items', []): _MAP_ITEMS.setdefault(_it['item'], []).append(f"{_mid}.{_it['id']}")
for _iid, _where in sorted(_MAP_ITEMS.items()):
    if _iid not in _CAT and _iid not in SL.CATALOGUE_PENDING: errs.append(f'system_item_catalogue: World item id {_iid} ({", ".join(_where[:3])}) has no name/description')
for _iid, _e in _CAT.items():
    if _iid.startswith('_'): continue
    if len(_e['name']) > len(SL.SAMPLES['{item}']): errs.append(f'system_item_catalogue.{_iid}: name longer than the {{item}} sample')
    if re.search(r'\bcoins?\b', _e['name'] + ' '.join(_e['pages']), re.I): errs.append(f'system_item_catalogue.{_iid}: players only see "coin" for a Master token')
    if _e['pocket'] is not None and _e['pocket'] not in _POCKETS: errs.append(f'system_item_catalogue.{_iid}: unknown pocket {_e["pocket"]}')
def _name_walk(o, path):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ('_meta', '_proposed_names'): continue
            if k == 'name' and isinstance(v, str) and (BAN_DRINK.search(v) or BAN_I.search(v) or BAN_X.search(v) or BAN_PP.search(v)): errs.append(f'banned term in a name: {path}/{k}: {v}')
            else: _name_walk(v, f'{path}/{k}')
    elif isinstance(o, list):
        for i, v in enumerate(o): _name_walk(v, f'{path}/{i}')
_name_walk(doc, 'root')
# (h) v0.4.6/0.4.8 The Firefly: club text lives in maps.club_int (World built it); nothing club-side left in unplaced
for _k, _e in unplaced_npcs.items():
    if _k.startswith('_') or _k == 'lucky_crystal_seller': continue
    check_lines(_e['lines'], f'unplaced_npcs.{_k}')
    if _k.startswith('rebel_'): errs.append(f'unplaced_npcs.{_k}: club text must live in maps.club_int')
if [k for k in unplaced['club_props'] if k.startswith('club_int.')]: errs.append('unplaced.club_props: club_int.* entries must live in maps.club_int')
_CLUB_ISP = ISPOTS.get('club_int', {})
WORLD_HANDOFF = []
for _k, _e in maps.get('club_int', {}).items():
    if _k in _CLUB_ISP:
        if _e['lines'][0]['flags'] != [POSTGAME_FLAG]: errs.append(f'maps.club_int.{_k}: post-game banner must come first')
        if _k == 'note_greystone' and _e.get('active_when') == 'beat_master_fernwick' and _CLUB_ISP[_k].get('active_when') == 'beat_master_revival':
            WORLD_HANDOFF.append("maps/club_int.json note_greystone active_when beat_master_revival -> beat_master_fernwick (" + GREYSTONE_RULING + ")")
        elif _e.get('active_when') != _CLUB_ISP[_k].get('active_when'): errs.append(f'maps.club_int.{_k}: active_when {_e.get("active_when")} != map {_CLUB_ISP[_k].get("active_when")}')
        if _e.get('active_when') and _e['active_when'] not in FLAGS_OK: errs.append(f'maps.club_int.{_k}: unknown active_when flag')
if maps.get('club_int', {}).get('note_greystone', {}).get('active_when') != 'beat_master_fernwick': errs.append('note_greystone must gate on beat_master_fernwick (Story Bot ruling, Oct 22 10:04 PM CT)')
for _k, _g in (('note_thornwood', 'beat_master_fernwick'), ('note_frostspire', 'beat_master_revival'), ('note_mirefen', 'beat_master_frostspire')):
    if maps.get('club_int', {}).get(_k, {}).get('active_when') != _g: errs.append(f'{_k} must gate on {_g}')
if maps.get('club_int', {}).get('rebel_bartender', {}).get('display_role') != 'juice counter': errs.append('rebel_bartender display_role must be "juice counter" (Gary)')
for _cf in CAMP_FLAGS.values():
    if _cf not in WORLD_FLAGS or _cf in PROPOSED_FLAGS: errs.append(f'{_cf}: World flag, must not be marked proposed')
if 'old_record' not in _CAT: errs.append('system_item_catalogue: old_record missing')
for (_cm, _cid) in list(CAMPS) + [(m, sid) for m, sp in ISPOTS.items() for sid in sp if sid.startswith('camp_') and (m, sid) not in CAMPS]:
  _ct = maps.get(_cm, {}).get(_cid); _csp = ISPOTS.get(_cm, {}).get(_cid, {})
  if not _ct: errs.append(f'maps.{_cm}.{_cid} missing'); continue
  if True:
    if [l['id'] for l in _ct['lines']] != CAMP_LINE_IDS: errs.append(f'{_cid}: line order {[l["id"] for l in _ct["lines"]]}')
    if _ct.get('story_ruling') != CAMP_TONE_RULING or _ct.get('pending_story_call') or any(l.get('pending_story_call') for l in _ct['lines']): errs.append(f'{_cid}: tone passed by Story Bot: story_ruling CAMP_TONE_RULING, no pending_story_call')
    if _ct.get('prompt_after_line') != 'default' or _ct['lines'][-1]['flags']: errs.append(f'{_cid}: prompt must follow the unflagged default (cold camp) line only')
    for _key in ('sets_flag', 'active_when', 'x', 'y', 'stand', 'face'):
        if _ct.get(_key) != _csp.get(_key): errs.append(f'{_cid}: {_key} {_ct.get(_key)} != map {_csp.get(_key)}')
    _camp_txt = ' '.join(' '.join(x) for x in [l['pages'] for l in _ct['lines']] + [_ct['prompt'], _ct['use'], _ct['declined']] + [_ct['choices']])
    for _bad in (r'\bvane\b', r'h\.v\.', r'\bcrystals?\b', r'\b(pell|marta|teo|imke|ashby|quill|brack|sorrel)\b', r'\bwhy\b', r'\bfound\b', r'\bdrift', r'\blog\b', r'\breward'):
        if re.search(_bad, _camp_txt, re.I): errs.append(f'{_cid}: text hits story guard {_bad}')
    for _p in (_ct['prompt'], _ct['use'], _ct['declined']): check_lines([{'id': 'default', 'flags': [], 'pages': _p}], f'maps.{_cm}.{_cid}')
if WORLD_HANDOFF: meta['world_handoff'] = {"_note": "Changes our text follows that World's map files haven't picked up yet (World's files are not ours to edit).", "items": WORLD_HANDOFF}
_club_txt = json.dumps(maps.get('club_int', {})) + json.dumps(unplaced['club_props']) + json.dumps(maps.get('fernwick', {}).get('sign_club', {}))
if re.search(r'\bvane\b|H\.V\.', _club_txt, re.I): errs.append('club text mentions Vane (the Vane memo is on hold for Gary)')
if 'TBD_rebel_backroom' in json.dumps(doc) or 'flg_firefly_backroom' in json.dumps(doc): errs.append('back room has no gate flag (Gary R2)')
for _d in ('pond_berry_juice', 'mossberry_shake', 'fern_mint_tea', 'firefly_shake'):
    if _d not in _CAT: errs.append(f'system_item_catalogue: club drink {_d} missing')
_names = [e['name'].lower() for k, e in _CAT.items() if not k.startswith('_')]
if len(_names) != len(set(_names)): errs.append('system_item_catalogue: duplicate item names')
if re.search(r'\blilac\b', json.dumps({k: v for k, v in doc.items() if k != '_meta'}), re.I): errs.append('a line mentions lilac (old branch tile colour)')
_fit_walk(doc, [])
if errs:
    print('\n'.join(errs)); sys.exit(1)
json.dump(doc, open(OUT, 'w'), ensure_ascii=False, indent=1)
json.load(open(OUT))
n_spots = sum(len(v) for v in maps.values())
print('OK', OUT, 'maps', len(maps), 'spots', n_spots, 'npcs', sum(1 for v in maps.values() for k in v if not k.startswith('sign_')),
      'signs', sum(1 for v in maps.values() for k in v if k.startswith('sign_')), 'blockers', len([k for k in blockers if not k.startswith('_')]))
