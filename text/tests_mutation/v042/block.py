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
                L("kid_lanternport", ["When the fog comes in I pretend the house is a ship.", "Captain's orders: no bedtime."], when={"zone": "lanternport"})]),
}
maps["home_saltmere_a"] = {   # SHARED design H4 (seaside); no doors yet
 "home_saltmere_a_hobbyist": npc(["Ship in a bottle. Forty-third attempt.", "The first forty-two are in the shed. Don't open the shed."],
   _soul_lines=[L("hobby_saltmere", ["Saltmere salt gets into everything. Even the glue.", "Especially the glue."], when={"zone": "saltmere"})]),
}
maps["lab_brookhollow"] = {   # UNIQUE: starter choice (got_starter) + 8.1 onboarding; the choice scene itself is Story/Coder's
 "lab_brookhollow_researcher": npc(["Morning. The three cradles are ready when you are.", "Take your time. You'll be together a long while."],
   _soul_lines=[L("res_field", ["Field researcher now? Bring {lead} by sometimes.", "The lab's too quiet without the noise."], flags=["flg_promoted"]),
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
            "windows": {"_note": "The new interiors have no window tiles, so the 7 window spots on the retired house_int_a/b/c have no home. "
                                 "Kept word for word. If World adds wall windows to the unique homes, house_int_b -> home_brookhollow_b and "
                                 "house_int_c -> home_fernwick_a fit as they are; house_int_a follows the cook."},
            "npcs": {}, "props": {}}
for (_m, _w), (_lines, _default) in RETIRED_WINDOWS.items():
    unplaced["windows"][f"{_m}.{_w}"] = {"text_was": f"maps.{_m}.{_w}", "soul_item": "1", "proposed_spot": None, "lines": _with_default(_lines, _default)}
unplaced["npcs"]["house_int_a.cook"] = {
 "text_was": "maps.house_int_a.cook", "gives": "Mossplum Snack", "gift": "once",
 "_note": "Gives a Mossplum Snack once. Proposed home: home_brookhollow_b_parent, who stands at that kitchen (unique house, so a one-time gift "
          "is unambiguous), as a first once-only line. Second choice: home_brookhollow_a_owner by the hearth (shared H1).",
 "proposed_spot": {"map": "home_brookhollow_b", "npc": "home_brookhollow_b_parent"},
 "lines": [L("default", ["I made way too much. Here, take a Mossplum Snack before it goes to waste."])],
 "after": ["That was the last one. I'm not made of mossplums."]}
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
