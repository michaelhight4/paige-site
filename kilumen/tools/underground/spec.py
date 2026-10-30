"""Kilumen Underground + Guardian side stories: quest/beat spec (Coder, Oct 30 2026).
Source: Story Bot / Coder outline design/UNDERGROUND_GUARDIAN_SIDESTORIES.md (commit 1e7792c), section 6.
Every page here is a DRAFT for Text Bot (final text lives in text/overworld_lines.json, keys listed per beat).
Rules kept: no exposition, both sides partly right, the Guardian is never seen, Warmth is the evidence,
no drinking/smoking/drugs, banned player words avoided."""

# NPCs to place. near = preferred cell; the builder takes the nearest free cell that keeps every warp reachable.
NEW_NPCS = [
    # map, id, near, facing, kind, sprite, role
    ('saltmere', 'saltmere_dockhand', (0, 0), 'down', 'villager', None, 'dock'),
    ('saltmere', 'lucky_crystal_seller', (0, 0), 'down', 'villager', 'vil_fan_m', 'market'),
    ('lantern_rest', 'ivo_miner', (0, 0), 'down', 'villager_scholar', None, 'any'),
    ('revival_heights', 'rh_intern', (0, 0), 'down', 'villager', 'vil_commuter_f', 'annex'),
    ('revival_rt_annex', 'rh_annex_guard', (0, 0), 'down', 'guard', 'vil_stationguard_m', 'fixed'),
    ('revival_rt_annex', 'rh_cleaner', (0, 0), 'left', 'villager', None, 'fixed'),
    ('sunmeadow_fields', 'sunmeadow_nan', (0, 0), 'down', 'villager', None, 'any'),
    ('mirefen_bog', 'mirefen_census_clerk', (0, 0), 'down', 'clerk', 'vil_clerk_f', 'any'),
    ('tidewater_coast', 'tidewater_beachcomber', (0, 0), 'down', 'villager', 'vil_tourist_f', 'any'),
    ('cindervale', 'cindervale_baker', (0, 0), 'down', 'villager', None, 'any'),
]

# Quests. Each step: (sfx, desc, map, target, beat) ; target = ('npc'|'spot', id) where the v2 line sets the step flag.
# beat: dict(time=[phases], warmth=n, needs=[extra flags], pages=[...]).  The last step is always the giver turn-in.
Q = []
def quest(id, title, zone, region, giver, prereq, steps, reward, start, in_progress, turn_in, outline, kind):
    Q.append(dict(id=id, title=title, zone=zone, region=region, giver=giver, prereq=prereq, steps=steps, reward=reward,
                  start=start, in_progress=in_progress, turn_in=turn_in, outline=outline, kind=kind))

# ---------------- Region 1: The Firefly (club_int) ----------------
quest('sq_ug_greenhouse', 'Two Pots', 'fernwick', 1, ('club_int', 'rebel_patron_2'), ['beat_master_fernwick'], [
    ('d1', 'Check the two pots by the booth (day 1).', 'club_int', ('spot', 'ug_two_pots'),
     dict(state={'counter': 'ug_pots_days', 'gte': 1}, pages=['Two pots. Same seedling. One sits by a violet shard, one by a firefly jar.', 'They look the same. For now.'])),
    ('d2', 'Check the pots again on another day (day 2).', 'club_int', ('spot', 'ug_two_pots'),
     dict(state={'counter': 'ug_pots_days', 'gte': 2}, pages=['The shard pot leans a little. The jar pot has a new leaf.'])),
    ('d3', 'Check the pots one last day (day 3).', 'club_int', ('spot', 'ug_two_pots'),
     dict(state={'counter': 'ug_pots_days', 'gte': 3}, pages=['The jar pot is thriving. A bead of water sits on one leaf.', 'Lean close. It hums. Two notes, low, like a river far away.'])),
    ('back', 'Tell the greenhouse guy what you saw.', 'club_int', None, None),
], dict(items=[('mossplum_shake', 1)], money=0, flags=['ug_cutting_for_room']),
    ['I\'m growing the same seedling twice. One by a crystal shard, one by a firefly jar.', 'Look at them once a day for three days? Tell me what you see. Not what you think.'],
    ['Once a day. Plants don\'t care how keen you are.'],
    ['The jar one thrived. Huh.', 'One pot\'s not science, mind. I won\'t say more than that.', 'Take the healthy cutting. Put it by your window.'],
    '6 R1.1', 'U')

quest('sq_ug_poster_names', 'Names, Not Numbers', 'fernwick', 1, ('club_int', 'rebel_patron_1'), ['beat_master_fernwick'], [
    ('named', 'Give the poster artist your creatures\' names at the poster wall.', 'club_int', ('spot', 'poster_names'),
     dict(pages=['She paints over the catalogue numbers cut from company flyers.', 'Your team\'s names go up, one by one. {lead} watches its own name dry.'],
          alt=dict(warmth=50, extra='ug_poster_true_colour', pages=['She paints over the catalogue numbers cut from company flyers.', 'Behind {lead}\'s name she adds a faint colour. Not violet. Its own.']))),
    ('back', 'Talk to the poster artist.', 'club_int', None, None),
], dict(items=[], money=0, flags=['ug_poster_names_up']),
    ['Company flyers give every creature a number. I give them back their names.', 'Will you lend me yours for the wall? The poster by the door.'],
    [],
    ['There. Names, not numbers.', 'I left the last space blank. For the big one from the river, whatever its name is.'],
    '6 R1.2', 'U')

quest('sq_gd_dj_phrase', 'The Fifth Note', 'fernwick', 1, ('club_int', 'rebel_dj'), ['flg_missing_note_done'], [
    ('played', 'Listen at the DJ desk at Night while he plays the phrase.', 'club_int', ('spot', 'ug_dj_desk'),
     dict(time=['night', 'dusk'], pages=['Four notes. Then nothing.', '{lead} turns toward the river every time the tune stops on the fourth note.'])),
    ('back', 'Talk to the DJ.', 'club_int', None, None),
], dict(items=[('old_record', 1)], money=0, flags=[]),
    ['Got my records back. Still can\'t finish the phrase. Five notes, and I only ever get four.', 'Come by the desk tonight. Tell me what your partner does.'],
    [],
    ['It turned to the river? Every time?', 'I heard it once under the water. Like something calling for help.', 'I reckon the company signal jams the last note. Embarrassing, but I dream about a river.'],
    '6 R1.3', 'G')

# ---------------- Region 2: Saltmere + Greystone + Lantern Rest ----------------
quest('sq_ug_dock_shards', 'Off the Books', 'saltmere', 2, ('saltmere', 'saltmere_dockhand'), ['beat_master_fernwick'], [
    ('counted', 'Count the Greystone crates on the dock.', 'saltmere', ('spot', 'ug_dock_crates'),
     dict(pages=['You count the crates. Then again.', 'There are more here than the shipping log says.'])),
    ('silt', 'Check the crate set apart from the rest.', 'saltmere', ('spot', 'ug_wet_crate'),
     dict(needs=['sq_ug_dock_shards_counted'], pages=['This one is wet. River silt in the corners.', 'Greystone is dry rock all the way down.'])),
    ('back', 'Tell the dockhand your count.', 'saltmere', None, None),
], dict(items=[('trail_mix', 2)], money=200, flags=[]),
    ['Can you count crates? Quietly?', 'The Greystone ones. The log never matches. I just need someone who isn\'t me to count.'],
    [],
    ['More than they declare. I knew it.', 'Don\'t say I asked. I like my job.', 'Salt-toffee. The only thing on this dock nobody counts.'],
    '6 R2.1', 'U')

quest('sq_gd_miner_lamp', 'What Ivo Heard', 'greystone_caverns', 2, ('lantern_rest', 'ivo_miner'), ['beat_master_fernwick'], [
    ('crack', 'Find the breathing seam below Greystone B1 and look at the crack at Night.', 'greystone_seam', ('spot', 'ug_seam_crack'),
     dict(time=['night'], pages=['A crack in the rock. Behind it, violet crystal.', 'And behind the crystal, water. Moving. Your lantern light dims, then holds.'])),
    ('stone', 'Lay a stone at Lantern Rest for the creature that warned Ivo.', 'lantern_rest', ('spot', 'ug_ivo_stone'),
     dict(needs=['sq_gd_miner_lamp_crack'], pages=['You set a small stone with the others.', 'For the one that warned him anyway.'])),
    ('back', 'Tell Ivo.', 'lantern_rest', None, None),
], dict(items=[('lantern_moth', 3)], money=0, flags=['ug_ivo_stone_laid']),
    ['I quit Greystone. The deepest seam breathed. You could hear it.', 'There\'s a way down from B1, past the bottom pool. Go at night. Look at the crack.'],
    ['Night. The seam only breathes at night.'],
    ['Water. Behind the crystal. So I wasn\'t mad.', 'The creatures digging beside me were fitted. They couldn\'t flinch when the rock moved.', 'One did anyway. Thank you for the stone.'],
    '6 R2.2', 'G')

quest('sq_ug_honest_glass', 'Glass Is Honest', 'saltmere', 2, ('saltmere', 'lucky_crystal_seller'), ['beat_master_fernwick'], [
    ('watched', 'Watch who buys the glass crystals at the stall.', 'saltmere', ('spot', 'ug_glass_stall'),
     dict(pages=['A woman buys a glass crystal and clips it on her creature\'s collar.', 'It looks fitted. It isn\'t. She pays and walks off fast, smiling.'])),
    ('back', 'Talk to the seller.', 'saltmere', None, None),
], dict(items=[('glass_crystal', 1)], money=0, flags=[]),
    ['Want to know a secret? My glass crystals sell best to people who hate the real ones.', 'Watch the stall for a bit. You\'ll see.'],
    [],
    ['See? It looks fitted for the inspectors. That\'s all.', 'Don\'t tell anyone I\'m brave. I\'m not. I just sell glass.'],
    '6 R2.3', 'U')

# ---------------- Region 3: Revival Heights (new annex: revival_rt_annex) ----------------
quest('sq_ug_intern_memo', 'Recalibration Queue', 'revival_heights', 3, ('revival_heights', 'rh_intern'), ['beat_master_saltmere'], [
    ('delivered', 'Take the box of "drift units" to the recalibration door in the RT annex.', 'revival_rt_annex', ('spot', 'ug_recal_door'),
     dict(pages=['The box is carry-cases. Each tag reads: TINT DRIFT. RECALIBRATE.', 'You set them by the door. A hand takes them in. The door shuts.'])),
    ('window', 'Look out of the annex window.', 'revival_rt_annex', ('spot', 'ug_river_window'),
     dict(needs=['sq_ug_intern_memo_delivered'], pages=['The window looks down on the river.', 'There is a dark line on the bank, high above the water.'])),
    ('back', 'Tell the intern it\'s done.', 'revival_heights', None, None),
], dict(items=[('tonic_large', 1)], money=300, flags=[]),
    ['Could you take this box to the annex? Recalibration door. They\'re drift units.', 'I\'m not sure what drift is, exactly. I\'m new.'],
    [],
    ['Thanks. Did they say what recalibration is?', 'No? Okay.', 'You can see the river from up there, right? It used to be higher. My gran says.'],
    '6 R3.1', 'U')

quest('sq_gd_lobby_art', 'The Founder\'s Picture', 'revival_heights', 3, ('revival_rt_annex', 'rh_annex_guard'), ['beat_master_saltmere'], [
    ('cleaner', 'Talk to the old cleaner in the annex.', 'revival_rt_annex', ('npc', 'rh_cleaner'),
     dict(pages=['That picture? The Unbound would give their eyeteeth for the bit under the banner.', 'Not that I\'d know. I just dust it.'])),
    ('lifted', 'Lift the banner corner on the founder\'s picture at Night.', 'revival_rt_annex', ('spot', 'ug_founder_picture'),
     dict(time=['night'], needs=['sq_gd_lobby_art_cleaner'], pages=['You lift the corner. A huge river creature, the founder kneeling by it.', 'Its forehead crystal is cracked. Its eyes are shut. Not asleep. In pain.'])),
    ('back', 'Let the guard know you looked.', 'revival_rt_annex', None, None),
], dict(items=[], money=0, flags=['ug_saw_founder_picture']),
    ['Report anyone staring at the founder\'s picture too long. Company rule.', 'You can look. For one second. I\'m bored, not cruel.'],
    [],
    ['One second, I said. Fine. It\'s a good picture.', 'The plaque says "Where it all began". Nobody asks where that is.'],
    '6 R3.2', 'G')

# ---------------- Region 4: Frostspire + Sunmeadow ----------------
quest('sq_ug_frozen_camp', 'Notes in the Snow', 'frostspire', 4, ('frostspire', 'frostspire_climber'), ['beat_master_revival'], [
    ('pinned', 'Take the frozen field page to the evidence board at The Firefly.', 'club_int', ('spot', 'ug_evidence_board'),
     dict(pages=['The bouncer pins the page up. A drift chart.', 'Bonded creatures marked warm. Unbonded marked cold. On the back, in pencil: "signal strongest downstream?"', 'Someone rated the snow at the bottom. Four out of ten. Crunchy.'])),
    ('back', 'Tell the climber it\'s up.', 'frostspire', None, None),
], dict(items=[('calm_tea', 2)], money=0, flags=['ug_board_drift_chart']),
    ['Found this frozen by the pass. A page from that field team, I think.', 'The Firefly lot keep a board for these. Would you take it?'],
    [],
    ['Pinned up? Good. Somebody should read it who isn\'t a glacier.'],
    '6 R4.1', 'U')

quest('sq_gd_shine', 'What the Shine Is', 'sunmeadow_fields', 4, ('sunmeadow_fields', 'sunmeadow_nan'), ['beat_master_revival'], [
    ('dawn', 'Watch the barrier shine with Nan\'s field at Dawn.', 'sunmeadow_fields', ('spot', 'ug_nan_fence'),
     dict(time=['dawn'], pages=['The shine on the barrier glows over the grass.', 'A Halovy lands on the fence post. It turns its back to the shine and faces the river.'])),
    ('back', 'Talk to Nan.', 'sunmeadow_fields', None, None),
], dict(items=[('sunroot_seeds', 3)], money=0, flags=[]),
    ['The shine on that barrier gets brighter every season. Brighter as more creatures get fitted.', 'River gets lower too. I count seasons, that\'s all. Come and look at dawn.'],
    [],
    ['My Tumbloams slipped out once. One got hurt by a wild Enraged one.', 'Wild is hard. That doesn\'t make the shine kind.'],
    '6 R4.2', 'G')

# ---------------- Region 5: Mirefen ----------------
quest('sq_ug_count_numbers', 'Count Day, Again', 'mirefen', 5, ('mirefen_bog', 'mirefen_census_clerk'), ['beat_master_frostspire'], [
    ('reeds', 'Look over the reeds where the count keeps dropping.', 'mirefen_bog', ('spot', 'ug_count_reeds'),
     dict(pages=['Crate tracks in the mud. Company boot prints.', 'The bog water here is lower than anywhere else.'])),
    ('back', 'Tell the census clerk.', 'mirefen_bog', None, None),
], dict(items=[('field_reading_sheet', 1)], money=0, flags=['ug_census_names']),
    ['The count goes down every week. Same reeds. Same week day.', 'Would you look at those reeds for me? I follow rules. I want to know which rule this is.'],
    [],
    ['Taken for "catalogue". Of course.', 'This week my report lists names, not numbers. One rule broken. Once.', 'I\'m rather proud of it.'],
    '6 R5.1', 'U')

quest('sq_gd_riverglint', 'Where It Rested', 'mirefen', 5, ('mirefen_bog', 'mirefen_angler'), ['beat_master_frostspire'], [
    ('sat', 'Sit by the dark islet at Dusk and wait for a Riverglint.', 'mirefen_bog', ('spot', 'ug_dark_islet'),
     dict(time=['dusk'], pages=['You sit. Nobody talks. The water goes gold for a breath.', 'A Riverglint flashes once, pointing upstream, then it\'s gone.'])),
    ('back', 'Sit with the angler again.', 'mirefen_bog', None, None),
], dict(items=[('old_river_drawing', 1)], money=0, flags=[]),
    ['There\'s a fish that only shows where the river beast once rested.', 'By the dark islet. At dusk. Sit still and you might see.'],
    [],
    ['Upstream. It always points upstream.', 'The old people called the river beast "the one who keeps the light".', 'Here. My gran\'s drawing. Don\'t say anything. Just nod.'],
    '6 R5.2', 'G')

# ---------------- Region 6: Tidewater Coast ----------------
quest('sq_gd_sea_glass', 'Violet Glass', 'tidewater_coast', 6, ('tidewater_coast', 'tidewater_beachcomber'), ['beat_master_mirefen'], [
    ('chime', 'Listen to the beachcomber\'s wind chime.', 'tidewater_coast', ('spot', 'ug_wind_chime'),
     dict(pages=['Violet glass, tied on string. The breeze knocks it about.', 'For a second it plays four notes you know. Then just noise again.'])),
    ('bag', 'Take the bag of violet sea glass to the evidence board at The Firefly.', 'club_int', ('spot', 'ug_evidence_board'),
     dict(needs=['sq_gd_sea_glass_chime'], pages=['The bouncer weighs the bag in one hand and pins the label up.', '"Tidewater. River mouth. More every month."'])),
    ('back', 'Tell the beachcomber.', 'tidewater_coast', None, None),
], dict(items=[('tidebell_charm', 1)], money=0, flags=['ug_board_sea_glass']),
    ['My best sea glass is violet now. More every month.', 'It\'s washing out of the river mouth. The river\'s bleeding.', 'The Firefly lot asked for some. For evidence.'],
    [],
    ['Thank you. The river\'s been trying to tell someone.'],
    '6 R6.1 (rewrite of placeholder sq_sea_glass)', 'G')

quest('sq_ug_lifeguard', 'Unbound in the Water', 'tidewater_coast', 6, ('tidewater_coast', 'tidewater_coast_lifeguard'), ['beat_master_mirefen'], [
    ('trusted', 'Earn the lifeguard\'s trust (a lead with high Warmth) at his tower.', 'tidewater_coast', ('spot', 'ug_lifeguard_buoy'),
     dict(warmth=50, pages=['A swimming creature surfaces by the buoy. No crystal at all.', 'It panics at a big wave, ducks under, then comes back to the lifeguard on its own.'])),
    ('back', 'Talk to the lifeguard.', 'tidewater_coast', None, None),
], dict(items=[('droplet_charm', 1)], money=0, flags=[]),
    ['Watching the water. Nothing to see.', 'Come back to the buoy with a partner who trusts you. Then maybe.'],
    [],
    ['No crystal. Not ever. It came back on its own.', 'You didn\'t see that. Go on.'],
    '6 R6.2', 'U')

# ---------------- Region 7: Lanternport ----------------
quest('sq_ug_keeper_logbook', 'The Keeper\'s Other Log', 'lanternport', 7, ('lanternport', 'lanternport_lighthouse_keeper'), ['beat_master_tidewater'], [
    ('page', 'Take the keeper\'s log page to the evidence board at The Firefly.', 'club_int', ('spot', 'ug_evidence_board'),
     dict(pages=['The bouncer pins up the page. Rows of times and violet lights at sea.', 'Every light, the same note: "sailed upstream at the river mouth".'])),
    ('back', 'Tell the keeper.', 'lanternport', None, None),
], dict(items=[('lure_lantern', 1)], money=0, flags=['ug_board_keeper_page']),
    ['I keep two logs. Weather, and violet lights at sea.', 'Company boats with crates, I\'d guess. Take a page to The Firefly?'],
    [],
    ['I can forecast a storm three days out. People, never.'],
    '6 R7.1', 'U')

quest('sq_gd_ron_dream', 'Same Dream', 'lanternport', 7, ('house_1f', 'ron'), ['ron_page_shared'], [
    ('heard', 'Hear Ron out at the kitchen table.', 'house_1f', ('npc', 'ron'),
     dict(pages=['In my version its crystal is cracking. And it\'s angry. Not sad.', 'It didn\'t want help. It wanted out.'])),
    ('back', 'Talk to Ron again.', 'house_1f', None, None),
], dict(items=[], money=0, flags=['ug_ron_same_dream']),
    ['Don\'t laugh. I\'ve been having the river dream too.'],
    [],
    ['Right. That\'s enough feelings for one bin day.'],
    '6 R7.2', 'G')

# ---------------- Region 8: Cindervale ----------------
quest('sq_gd_caldrith', 'Why the Forges Stay Warm', 'cindervale', 8, ('cindervale', 'cindervale_smith'), ['beat_master_lanternport'], [
    ('baker', 'Ask the baker about her warm stones.', 'cindervale', ('npc', 'cindervale_baker'),
     dict(pages=['My baking stones used to stay warm till lunch. Now they\'re cold by nine.', 'Since that kiln opened. I\'m not saying anything. I\'m saying nine.'])),
    ('forge', 'Feel the old forge at Night.', 'cindervale', ('spot', 'ug_forge_vent'),
     dict(time=['night'], needs=['sq_gd_caldrith_baker'], pages=['Heat breathes up from deep under the town, slow, like sleep.', 'In it, faint, the same four river notes. Even down here.'])),
    ('back', 'Tell the smith.', 'cindervale', None, None),
], dict(items=[('ember_charm', 1)], money=0, flags=[]),
    ['The forges are cooling since Revival Tech opened a crystal kiln next door.', 'I don\'t fit crystals to my forge creatures. Never have. Go feel the old forge at night.'],
    [],
    ['The old one under the mountain dreams. My grandad said so.', 'If it\'s dreaming of that river creature\'s pain, the signal reaches everywhere.', 'Tell the Firefly lot they\'ve a friend at the anvil.'],
    '6 R8.1', 'G')

quest('sq_ug_last_flyer', 'Everyone Signs', 'cindervale', 8, ('club_int', 'rebel_bouncer'), ['beat_master_lanternport'], [
    ('signed', 'Collect signatures from the people you helped, then check the petition overnight.', 'club_int', ('spot', 'ug_evidence_board'),
     dict(needs=['q_sq_ug_greenhouse_done', 'q_sq_ug_dock_shards_done', 'q_sq_ug_intern_memo_done', 'q_sq_gd_shine_done',
                 'q_sq_ug_count_numbers_done', 'q_sq_gd_sea_glass_done', 'q_sq_ug_keeper_logbook_done', 'q_sq_gd_caldrith_done'],
          pages=['The petition is full. Greenhouse, dock, annex, field, bog, beach, lighthouse, forge.', 'At the bottom, a print you didn\'t see anyone leave. Round, smooth. Like a river stone.'])),
    ('back', 'Hand the petition to the bouncer.', 'club_int', None, None),
], dict(items=[('clear_bell', 1)], money=0, flags=['ug_poster_we_go']),
    ['Last thing. A petition. Everyone you\'ve helped, in every town.', 'It\'s not one rebel. It\'s ordinary people. Show them that.'],
    ['Every town. The people you helped. Then bring it here.'],
    ['Everyone signed. Even... whoever left that print.', 'New poster for the wall. WE ASKED. NOW WE GO.'],
    '6 R8.2', 'U')
