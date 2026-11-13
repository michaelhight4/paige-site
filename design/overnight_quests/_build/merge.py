import json, copy
src = json.load(open('../side_quests_draft.json'))
Q = {q['id']: copy.deepcopy(q) for q in src['quests']}
ORDER = {'sq_past_the_shine':91,'sq_ask_nicely':101,'sq_lumen_chain':102,'sq_count_day':103,
         'sq_sea_glass':111,'sq_forecast':121,'sq_warm_stones':131,'sq_ticket_stub':161}
def note(q, s): Q[q]['notes'].append('MERGE (Gary ruling / main overlap): ' + s)

# Ruling 8: re-key orders to the main order
for k, v in ORDER.items():
    note(k, f"order re-keyed {Q[k]['order']} -> {v} to match main orders (ruling 8)."); Q[k]['order'] = v

# Ruling 1 + main overlap: sq_bin_day
q = Q['sq_bin_day']
for s in q['steps']:
    if s['id'] == 'sq_bin_day_s4':
        s.update(desc="After the credits: the bin is empty. Inspect it (Text Bot bin_empty). Ron's payoff itself is main (mq_finale s8).",
                 sets_flag="sq_bin_day_done", condition="bins_taken_out")
q['steps'].insert(3, {"id":"sq_bin_day_s3b","desc":"While Ron is travelling with you (all_badges to the finale), inspect the bin: Ron has one quip.",
                      "map":"brookhollow","at":{"x":7,"y":8},"sets_flag":"sq_bin_ron_quip","condition":"ron_in_party && !finale_done"})
q['lines'] = [l for l in q['lines'] if not (l['npc']=='ron' and l['context']=='turn_in')]
q['lines'].append({"npc":"ron","context":"step","step":"sq_bin_day_s3b","text":["Don't look at it, {nick}. It can tell when you look at it."]})
q['new_ids'].append('sq_bin_ron_quip')
note('sq_bin_day', "Ruling 1: kept the coin-count version and added one Ron quip while ron_in_party is set (s3b). 'Told you. Tomorrow.' moved to main mq_finale s8 (main owns it); s4 is now the after-credits empty bin.")

# Ruling 2: Biscuit
note('sq_biscuit', "Ruling 2: the lost-flyer Tumbloam and the T5 trade Tumbloam are the SAME creature (Prue Hollin). Ron's nickname for the player's unnamed lead (house_1f.ron ron_unnamed) changes to 'Crumb', so the two Biscuits don't collide. Text Bot's house_1f.ron ron_unnamed line ('I'm calling it Biscuit') must be aligned (see QUESTS.md).")

# Ruling 3: kid's dad
q = Q['sq_kid_joke']
for s in q['steps']:
    if s['map'] == 'home_fernwick_a': s['map'] = 'brookhollow_kid_home'
for l in q['lines']:
    if l['npc'] == 'home_fernwick_a_parent': l['npc'] = 'brookhollow_kid_dad'
q['steps'][1]['desc'] = "Visit the kid's dad at home in Brookhollow. He's reading job ads."
q['steps'][3]['desc'] = "Give the form to the kid's dad."
q['notes'] = [n for n in q['notes'] if not n.startswith('OPEN for Gary: 8.5-E') and not n.startswith('SOUL_PLAYBOOK 8.5-E. Its parent id')]
q['notes'].insert(0, "SOUL_PLAYBOOK 8.5-E, adjusted by ruling 3.")
q['new_ids'] += ['brookhollow_kid_dad (npc)', 'brookhollow_kid_home (map, pending: a Brookhollow home for the kid and dad)']
q['map_status'] = 'map pending'
note('sq_kid_joke', "Ruling 3: parent moved to a Brookhollow home, npc brookhollow_kid_dad; the kid says 'Dad'. Existing kid lines say 'My mom says': listed for Text Bot to align. The later Care Associate swap (8.5-E) now applies to brookhollow_kid_dad at the Brookhollow heal centre.")

# Ruling 4: cut Dana's Greystone initials
q = Q['sq_dana']
q['steps'] = [s for s in q['steps'] if s['id'] != 'sq_dana_s3']
q['lines'] = [l for l in q['lines'] if l.get('step') != 'sq_dana_s3']
q['notes'] = [n for n in q['notes'] if not n.startswith('OPEN for Gary/Story Bot: 8.5-B puts')]
note('sq_dana', "Ruling 4: step s3 (initials near the Greystone camp), its line and its note are cut. Dana has no link to the field team's camps.")

# Ruling 5: Lune Hartley
def deep_replace(o):
    if isinstance(o, dict): return {k: deep_replace(v) for k, v in o.items()}
    if isinstance(o, list): return [deep_replace(x) for x in o]
    if isinstance(o, str): return o.replace('lune_ashby','lune_hartley').replace('Lune Ashby','Lune Hartley').replace('L. Ashby','L. Hartley')
    return o
Q['sq_lumen_chain'] = deep_replace(Q['sq_lumen_chain'])
Q['sq_lumen_chain']['notes'] = [n for n in Q['sq_lumen_chain']['notes'] if 'shares a surname with field-team member' not in n]
note('sq_lumen_chain', "Ruling 5: trader renamed Lune Ashby -> Lune Hartley (lune_ashby -> lune_hartley). No family link to Pell Ashby.")

# Ruling 6: placeholders
for k in ('sq_sea_glass','sq_warm_stones','sq_cold_hands'):
    Q[k]['status'] = 'DRAFT'; Q[k]['placeholder'] = True
    if not Q[k]['title'].startswith('[PLACEHOLDER]'): Q[k]['title'] = '[PLACEHOLDER] ' + Q[k]['title']
    note(k, "Ruling 6: kept as a PLACEHOLDER for a thin zone. Replace when the zone has canon.")

# Main overlaps
q = Q['sq_ask_nicely']
q['title'] = 'Ask Nicely'; q['prerequisites'] = ['camp_restored_mirefen']
q['steps'] = [
  {"id":"sq_ask_nicely_s1","desc":"After the Mirefen camp is restored, the angler is back on the boardwalk. Sit with them at dusk without talking.","map":"mirefen_bog","at":None,"sets_flag":"sq_nicely_sat","condition":"phase == Dusk"},
  {"id":"sq_ask_nicely_s2","desc":"Talk to them afterwards.","map":"mirefen_bog","at":None,"sets_flag":"sq_nicely_done","condition":"sq_nicely_sat"}]
q['reward'] = {"items":[{"id":"calm_tea","qty":2}],"money":0,"flags":["sq_nicely_done"]}
q['lines'] = [
  {"npc":"mirefen_angler","context":"start","step":None,"text":["Found the camp, then. Good. Sit a while, if you like. Quietly."]},
  {"npc":"system","context":"step","step":"sq_ask_nicely_s1","text":["You sit. The bog bubbles. Nobody says anything for ages.","It's nice, actually."]},
  {"npc":"mirefen_angler","context":"turn_in","step":None,"text":["You can sit still. Rare, that.","Here. Tea's better than talking. Most days."]},
  {"npc":"mirefen_angler","context":"after","step":None,"text":["I just like the quiet."]}]
q['new_ids'] = ['sq_nicely_sat','sq_nicely_done']
q['notes'] = [n for n in q['notes'] if not n.startswith('OVERLAP RISK') and not n.startswith('Follows the club note_mirefen')]
note('sq_ask_nicely', "Main owns the field notebook (mq_mirefen s1: the angler hands it over). Rewritten as a follow-up: prerequisite camp_restored_mirefen, the dusk sit stays, reward is calm_tea instead of the notebook. The 'after' line is still the angler's existing default.")

q = Q['sq_ron_job']
for s in q['steps']:
    if s['id'] == 'sq_ron_job_s4':
        s['condition'] = 'ron_layoff_letter'; s['map'] = 'revival_hq_int'
        s['desc'] = "Right after the layoff letter (main mq_revival_heights s4), if you talk to Ron again before the Master, he says one quiet line."
q['lines'] = [l for l in q['lines'] if l.get('step') != 'sq_ron_job_s4']
q['lines'].insert(3, {"npc":"ron","context":"step","step":"sq_ron_job_s4","text":["Thanks for not saying anything. That helps, {nick}."]})
note('sq_ron_job', "Main owns the letter scene (mq_revival_heights s4, which already has 'It's fine. It's just a letter.'). s4 is now a follow-up keyed to ron_layoff_letter, and only the second sentence stays so the line isn't said twice.")

note('sq_tell_the_counter', "Checked against main: it only reacts to camp_restored_* and field_team_home, which main now sets (mq_thornwood_camp, mq_greystone_camp, mq_frostspire, mq_mirefen, mq_welcome_back). No change.")
note('sq_past_the_shine', "Main mq_sunmeadow_crossing is just the walk-through. This quest stays the Croft intro (follow-up).")
note('sq_ticket_stub', "Aurelith side quest moved after the arena main quest (161), because the arena is post-game in main.")

out = [Q[q['id']] for q in src['quests']]
json.dump(out, open('side_merged.json','w'), indent=2, ensure_ascii=False)
print(len(out))
