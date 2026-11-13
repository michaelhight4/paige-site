P = '/workspace/kilumen/text/build_overworld_lines.py'
s = open(P).read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (s.count(old), old[:80])
    s = s.replace(old, new)
rep("    if _mid in DOOR_TO: warns.append(f'spare map {_mid} now has a door: drop it from SPARE_MAPS')",
    "    if _mid in DOOR_TO: print(f'WARN spare map {_mid} now has a door: drop it from SPARE_MAPS')")
rep(''' "weekday": "'mon-fri' etc. NEEDS 1.4 weekday clock (next tier, not approved). Engine may ignore until then.",''',
    ''' "weekday": "'mon-fri' etc. NOT SUPPORTED by Coder's picker (never matches) until the 1.4 weekday clock ships. Lines using it carry disabled_until and a fallback_for line on supported keys (meta.when_key_audit).",''')
rep(''' "hour": "in-game hour 0-23 (E2 uses 3 = 03:00-03:59)",''', ''' "hour": "in-game hour 0-23, exact match (E2 uses 3 = 03:00-03:59)",''')

anchor = 'doc["_proposed_names"]["interiors_v0.4.2"] = {'
add = r'''meta["version"] = "0.4.3"
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
'''
rep(anchor, add + anchor)
open(P, 'w').write(s); print('ok5')
