
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
        parts = re.split(r'(?<=[.!?])\s+', t); cur = ''
        for p in parts:
            if cur and not _fits(cur + ' ' + p): out.append(cur); cur = p
            else: cur = (cur + ' ' + p).strip()
        out.append(cur)
        CLUB_FIT_LOG.append({"where": where, "draft": t, "pages": out[-(len(out)):] if False else [x for x in out if x in t]})
    return out
def CL(where, id, texts, **kw): return L(id, club_pages(f"{where}.{id}", *texts), **kw)
def _daytime(where, texts):
    return [CL(where, "day", texts, when={"phase": "day"}), CL(where, "dawn", texts, when={"phase": "dawn"})]
CLUB = {"map": "club_int", "text_pending": True, "proposed_spot": None}
POSTGAME_FLAG = "finale_done"   # World's ending flag; story-owned, so lines are pending_story_call
CAMP_FLAGS = {"thornwood": "camp_restored_thornwood", "greystone": "camp_restored_greystone",
              "frostspire": "camp_restored_frostspire", "mirefen": "camp_restored_mirefen"}

W = "unplaced_npcs.rebel_bouncer"
unplaced_npcs["rebel_bouncer"] = {**CLUB, "npc": "rebel_bouncer", "role": "door, front room",
  "_note": "First line = back-room draft fix (Gary R2: back room open from the first visit). The front-room draft's 'Back room isn't. In you go.' is dropped.",
  "lines": _daytime(W, ["We're open. Nobody's dancing yet, though. Give it till dusk."]) + [
   CL(W, "first", ["Revival Tech lanyard. Huh. Fine.", "Dance floor's for dancing, back room's for looking. Be decent."], when={"once": True}),
   CL(W, "default", ["Mind the step. And the DJ."])]}

W = "unplaced_npcs.rebel_bartender"
unplaced_npcs["rebel_bartender"] = {**CLUB, "npc": "rebel_bartender", "role": "juice and snack counter keeper (id unchanged)",
  "_note": "Runs the place. Sells juices, teas and shakes only (system_item_catalogue: pond_plum_juice, mossplum_shake, fern_mint_tea, firefly_shake). Somebody's aunt.",
  "lines": _daytime(W, ["Wiping down the juice counter. Come back at dusk, or grab a cloth."]) + [
   CL(W, "first", ["Welcome to The Firefly, love. No violet in here. Just juice and music."], when={"once": True}),
   CL(W, "default", ["Your {lead} looks thirsty. Pond Plum Juice should sort that out."])],
  "shop_greeting": club_pages(f"{W}.shop_greeting", "Juices, teas and shakes. I'm somebody's aunt."),
  "stock": ["pond_plum_juice", "mossplum_shake", "fern_mint_tea", "firefly_shake"]}

W = "unplaced_npcs.rebel_dj"
_dj_night = []
for _st in ("dusk", "night"): pass
unplaced_npcs["rebel_dj"] = {**CLUB, "npc": "rebel_dj", "role": "DJ; owns the side story 'The Missing Note'",
  "_note": ("Side story 'The Missing Note' (STORY_RULINGS_CLUB, approved). flg_record_1..4 count records found, in any order: picking up an old record sets "
            "the lowest unset flg_record_N (Coder), so 'That's one!' always means the first one found. Records sit in Fernwick, Thornwood, Route 1 and Lanternport "
            "(World places them; unplaced.club_props.missing_note_records). Record lines show once each, then fall back to the hum line. "
            "The tune stays unresolved; the finished version after the ending is not written yet. The brief's Warmth-gain charm reward is not in the draft (open)."),
  "lines": _daytime(W, ["Zzz... da, da, dum, da...", "He's asleep in the booth, still humming."]) + [
   CL(W, "ron_gag", ["Ron: Don't look at me, {nick}. I'm protesting too.", "DJ: Little toy-piano number. This one's for your mate there."],
      flags=["ron_in_party"], when={"once": True}, pending=True, pending_gary_call="ron_mode",
      note="Optional gag: Ron dances once, badly; the DJ plays the toy-piano Ron motif. No party/Ron-present flag exists yet (ron_in_party is proposed); Ron in the party only exists in co-op mode (ron_mode call). Speaker tags added because two people talk."),
   CL(W, "note_close", ["Still missing one. It'll turn up."], flags=["flg_missing_note_started", "flg_missing_note_done"]),
   CL(W, "note_reward", ["Four. That's all of them. Let me stitch it together...", "Take this firefly lantern. Warms up a room. Warms up a camp, too."],
      flags=["flg_missing_note_started", "flg_record_4"], gives="firefly_lantern", sets_flag="flg_missing_note_done"),
   CL(W, "note_record_3", ["Three. Someone hummed this exact bit to me once. Odd."], flags=["flg_missing_note_started", "flg_record_3"], when={"once": True}),
   CL(W, "note_record_2", ["Two. Strings now. Starting to sound like a river."], flags=["flg_missing_note_started", "flg_record_2"], when={"once": True}),
   CL(W, "note_record_1", ["That's one! Hear that bassline? Always meant to be there."], flags=["flg_missing_note_started", "flg_record_1"], when={"once": True}),
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
    unplaced_npcs[_pid] = {**CLUB, "npc": _pid, "role": _role, "lines": _daytime(W, [_day]) + [
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
    ls = [L("postgame", _BANNER, flags=[POSTGAME_FLAG], pending=True, note="post-game: every flyer and note is replaced by the banner (World: one banner tile over the wall)")]
    pg = club_pages(f"{where}.default", *texts)
    if camp:
        ls.append(L("camp_found", pg[:2] + ["A hand-drawn tick, and: FOUND THE CAMP. NOT THEM."], flags=[CAMP_FLAGS[camp]], pending=True,
                    note=f"camp-restored variant; no camp-restored flag exists yet in World/Coder, {CAMP_FLAGS[camp]} is the expected id"))
    ls.append(L("default", pg))
    d = {**CLUB, "area": "back room", "lines": ls}
    if active_when: d["active_when"] = active_when
    return d
unplaced["club_props"] = {"_note": ("The Firefly back room (Gary R2: open from the first visit, no gate flag). No club_int map yet: ids here are proposals for World, no geometry. "
    "Tier 0 is always on the wall. Location notes appear with active_when (tier flag) so they never name a place too early. "
    f"Post-game uses {POSTGAME_FLAG} (World's ending flag; field_team_home would also fit). Camp-restored flags are proposed, pending World/Coder ids.")}
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
for _k, _tier, _camp, _t in [
  ("note_thornwood", "beat_master_fernwick", "thornwood", "Someone saw an empty tent off the Thornwood path. Ferns grown right over it."),
  ("note_greystone", "beat_master_revival", "greystone", "A courier swears there's a cold camp stove somewhere in the Greystone dark."),
  ("note_frostspire", "beat_master_revival", "frostspire", "Lights seen up by Frostspire, past the old rope bridge. Nobody's gone to look."),
  ("note_mirefen", "beat_master_frostspire", "mirefen", "A Mirefen fisher pulled a field notebook from the reeds. Says their camp can't be far.")]:
    _CP[f"club_int.{_k}"] = _wall(f"unplaced.club_props.club_int.{_k}", [_t], active_when=_tier, camp=_camp)
    _CP[f"club_int.{_k}"]["pinned_under"] = "club_int.missing_team_flyer"
_CP["missing_note_records"] = {"map": None, "text_pending": True, "proposed_spot": None, "lines": None,
  "regions": {"flg_record_1..4 (count)": ["fernwick", "thornwood", "route_1", "lanternport"]}, "item": "old_record (proposed id)",
  "text_ref": "system_items.picked_up",
  "_note": "Four old records for 'The Missing Note'. World places them (map items[]). Pickup uses the normal 'You found {item}!' text, so no extra lines; the DJ reacts when you next talk to him."}
