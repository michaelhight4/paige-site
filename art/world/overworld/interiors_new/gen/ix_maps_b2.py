"""Batch 2: Master halls (puzzles), Brookhollow lab, Revival Tech HQ lobby, Lumen Line stations."""
from ix_hallkit import build_hall
from ix_mapkit import Room

def hall_saltmere(H):
    rows = [
        "................",  # 3  dais x6-9 rows 3-4
        "................",  # 4
        ".......M........",  # 5
        "................",  # 6  goal (7,6)
        "...T........T...",  # 7
        "##v###KGG####v##",  # 8  ledges = one-way shortcut back, seal crystal at (6,8)
        "...##cccccc##...",  # 9
        "...##cLc=c###...",  # 10
        "...##c#ccLc##...",  # 11
        "...##cLc=cc##...",  # 12
        "................",  # 13
        "......R.........",  # 14
        "................",  # 15
        "................",  # 16
        ".......mm.......",  # 17
    ]
    props = {
        'L1': {'reset_with_crust': True}, 'L2': {'reset_with_crust': True}, 'L3': {'reset_with_crust': True},
        'G1': {'channel': 'Z'}, 'G2': {'channel': 'Z'},
        'R1': {'resets': ['crust', 'crystals'], 'note': 'reset crystal: restores the crust and clears unlit plates'},
    }
    deco = [('i_dais_salt', 6, 3), ('i_pillar_salt', 2, 3), ('i_pillar_salt', 13, 3), ('i_banner_salt', 4, 1), ('i_banner_salt', 11, 1),
            ('i_salt_jars', 0, 14), ('i_anchor', 15, 14), ('i_net', 8, 1), ]
    rm = build_hall('hall_saltmere', 'Saltmere Master\'s Hall (salt crust court)', 'saltmere', 'salt', 'saltflag', rows, props, deco,
                    npcs={'t1': 'right', 't2': 'left'}, pair={'map': 'saltmere', 'door': 'hall', 'status': 'planned exterior door'}, windows=[1, 14],
                    rules='Cracked salt crust holds you once: when you step off a cracked tile it collapses into a brine pit for as long as you stay on the map. '
                          'Three salt plates (L1-L3) glow while you stand on or have crossed them, but they go dark again if the crust is reset. '
                          'When all three glow at once the seal crystal (s1) lights for good and the twin gates G1/G2 open. '
                          'Stepping into a brine pit washes you back to the entrance and restores the crust (plates go dark). The reset crystal R1 does the same. '
                          'One-way ledges at both sides of the gate wall are the shortcut back to the entrance.',
                    solution='Walk the crust in one unbroken line that touches L1, L3 (bottom-left) and L2 (right) and ends under the gate; '
                             'intact crust tiles (=) can be crossed twice. See verified.shortest_solution.',
                    extra={'pit_rule': 'wash_back'})
    rm.c[8][2] = 2; rm.c[8][13] = 2
    rm.npc('hall_saltmere_guide', 11, 14, 'left', 'guide', 'hall guide: one hint line', 'maps.hall_saltmere.guide')
    for q in rm.extra['puzzle']['switches']:
        if q['id'] == 's1': q['channel'] = 'Z'
    return rm

def hall_revival_heights(H):
    rows = [
        "................",  # 3  dais x6-9
        "................",  # 4
        ".......M........",  # 5
        "................",  # 6  goal (7,6)
        "..T.........T...",  # 7
        "#######XX#######",  # 8  X1/X2: main laser gate (channel A = g1 + g2 + relay c1)
        "#*#..|....|..#gR",  # 9  relay crystal c1 in a sealed alcove; rail gap g1 at the top of a 1-wide shaft
        "#X#..|....|..#.R",  # 10 X3 opens when g2 is powered (channel B)
        "..g..|....|...X.",  # 11 g2 gap; X4 guards the g1 shaft, powered by the *unfilled* g2 (channel C, inverted)
        ".....|.Q..Q.....",  # 12 two power cubes
        "....---------...",  # 13
        "#######..#######",  # 14
        "....R...........",  # 15 reset crystal R3
        ".......mm.......",  # 16
    ]
    props = {
        'g2': {'channel': ['A', 'B', 'C'], 'invert_in': ['C'], 'note': 'west rail gap'},
        'g1': {'note': 'north-east rail gap at the top of the shaft'},
        'c1': {'note': 'relay crystal: must be on for channel A'},
        'X3': {'channel': 'B'}, 'X4': {'channel': 'C', 'note': 'sabotaged relay: open only while g1 is still empty'},
        'R1': {'resets': ['boulders', 'crystals'], 'note': 'shaft reset crystal (top)'},
        'R2': {'resets': ['boulders', 'crystals'], 'note': 'shaft reset crystal (bottom) - nobody gets trapped in the shaft'},
        'R3': {'resets': ['boulders', 'crystals'], 'note': 'reset crystal: returns both cubes to their docks and the relay to off'},
    }
    deco = [('i_dais_revival', 6, 3), ('i_pillar_steel', 2, 3), ('i_pillar_steel', 13, 3), ('i_banner_revival', 4, 1), ('i_banner_revival', 11, 1),
            ('i_server_rack', 0, 15), ('i_terminal', 15, 15)]
    rm = build_hall('hall_revival_heights', 'Revival Heights Master\'s Hall (keycard circuit floor)', 'revival_heights', 'revival', 'metal', rows, props, deco,
                    npcs={'t1': 'right', 't2': 'left'}, pair={'map': 'revival_heights', 'door': 'hall', 'status': 'planned exterior door'}, windows=[1, 14],
                    rules='Power cubes complete a floor rail when parked on a rail gap (hold). The main laser pair X1/X2 needs both gaps (g1, g2) powered '
                          'AND the relay crystal c1 switched on. c1 sits behind laser X3, which only opens once the west gap g2 is powered. The saboteurs re-wired X4 '
                          '(guarding the shaft up to g1) to the EMPTY state of g2, so powering g2 first locks you out of g1: power the shaft gap g1 first, then g2, then the relay. '
                          'Reset crystals (R1/R2 beside the shaft, R3 by the entrance) return both cubes and switch the relay off.',
                    solution='Push the east cube up the shaft onto g1 while X4 is still open, push the west cube onto g2 (X3 opens, X4 closes), '
                             'touch c1 from the X3 tile, walk through X1/X2. See verified.shortest_solution.')
    rm.npc('hall_revival_heights_guide', 12, 15, 'left', 'guide', 'hall guide (Revival Tech security tech): one hint line', 'maps.hall_revival_heights.guide')
    return rm

def hall_lanternport(H):
    rows = [
        "................",  # 3  dais x6-9
        "................",  # 4
        ".......M........",  # 5
        "................",  # 6  goal (7,6)
        "..T.........T...",  # 7
        "#######GG#######",  # 8  harbour lock gates G1/G2: beam plate P1 AND receiver O1 lit at once
        r"#E.../.......O.#",  # 9  lighthouse lamp E1 (fires east), mirror m1, receiver O1
        r"#.........\..\.#",  # 10 mirrors m2, m3 (both start \)
        "#....P....B....#",  # 11 beam plate P1; crate b1 blocks the column
        "#..............#",  # 12
        r"#..../....\....#",  # 13 mirrors m4 (start /), m5 (start \)
        "#######..#######",  # 14
        "...............R",  # 15 reset crystal
        ".......mm.......",  # 16
    ]
    props = {
        'E1': {'dir': 'R', 'note': 'lighthouse lamp (night state). Fires east along row 9'},
        'R1': {'resets': ['boulders', 'mirrors'], 'note': 'reset crystal: mirrors back to their start angle, crate back to its berth'},
        'O1': {'note': 'lock receiver'}, 'P1': {'note': 'dock beam plate: lit beams count as hold'},
    }
    deco = [('i_dais_lantern', 6, 3), ('i_pillar_brass', 2, 3), ('i_pillar_brass', 13, 3), ('i_banner_lantern', 4, 1), ('i_banner_lantern', 11, 1),
            ('i_lantern_stand', 0, 14) if False else ('i_barrel', 0, 15), ('i_telescope', 14, 15)]
    rm = build_hall('hall_lanternport', 'Lanternport Master\'s Hall (harbour lock beams)', 'lanternport', 'lantern', 'parquet', rows, props, deco,
                    npcs={'t1': 'right', 't2': 'left'}, pair={'map': 'lanternport', 'door': 'hall', 'status': 'planned exterior door'}, windows=[1, 14],
                    rules='The lighthouse lamp E1 fires a violet beam east. Mirror stands turn 90 degrees when you interact (/ <-> \\). The lock gates G1/G2 open while '
                          'the beam lights the dock plate P1 AND ends on the lock receiver O1 at the same time, so one beam has to visit both. '
                          'Beams pass over floor, plates and open gates; walls, receivers and the cargo crate stop them. The reset crystal R1 restores mirrors and crate. Crates cannot be pushed over the lock sill or the basin sill (no_push).',
                    solution='Turn mir1 so the beam drops south over P1, turn mir4 east and mir5 north, push the crate b1 out of column 10, then turn mir2 east and mir3 north into O1. '
                             'See verified.shortest_solution.')
    rm.extra['puzzle']['no_push'] = [[7, 8], [8, 8], [7, 14], [8, 14]]  # lock sill + basin sill: the crate stays in the basin
    rm.npc('hall_lanternport_guide', 12, 15, 'left', 'guide', 'hall guide (lighthouse keeper): one hint line', 'maps.hall_lanternport.guide')
    return rm

def hall_cindervale(H):
    rows = [
        "................",  # 3  dais x6-9
        "................",  # 4
        ".......M........",  # 5
        "................",  # 6  goal (7,6)
        "..T.........T...",  # 7
        "#######GG#######",  # 8  forge gates G1/G2: all three heat latches on
        "#..............#",  # 9  landing under the gates
        "#Slllllllllllll#",  # 10 forge mouth S, trunk x2-14 runs east into the crevice drain in the east wall
        "#..l......l..l.#",  # 11 side branches (junctions x3, x10, x13)
        "#..l..C...l..uC#",  # 12 two cooling stones, short branch x13 ends in basin u3
        "#..u......u....W",  # 13 basins; bellows W1 set in the east wall (reachable from the east pocket)
        "#######..#######",  # 14
        "...............W",  # 15 bellows W2 by the door
        ".......mm.......",  # 16
    ]
    props = {
        'W1': {'resets': ['boulders'], 'note': 'bellows (east pocket): both cooling stones return to their racks. Latches keep their heat.'},
        'W2': {'resets': ['boulders'], 'note': 'bellows (by the door): same as W1'},
    }
    deco = [('i_dais_cinder', 6, 3), ('i_pillar_basalt', 2, 3), ('i_pillar_basalt', 13, 3), ('i_banner_cinder', 4, 1), ('i_banner_cinder', 11, 1),
            ('i_anvil', 0, 15), ('i_ore_cart', 14, 16)]
    rm = build_hall('hall_cindervale', 'Cindervale Master\'s Hall (forge temple)', 'cindervale', 'cinder', 'basalt', rows, props, deco,
                    npcs={'t1': 'right', 't2': 'left'}, pair={'map': 'cindervale', 'door': 'hall', 'status': 'planned exterior door'}, windows=[1, 14],
                    rules='Lava pours from the forge mouth S along the trunk channel and drains into the crevice in the east wall. Hot cells block you. '
                          'Push a cooling stone into the trunk to dam it: every trunk cell below the dam cools (walkable) and the lava backs up into the side '
                          'branches whose junction is above the dam, filling their heat basins. A filled basin latches its forge latch (u1-u3) for good. '
                          'Stones in the trunk can only be pushed upstream, and a dam cannot be lifted out (you would be standing in the flow), so the first dam '
                          'decides which basins fill. The bellows W1/W2 return both stones to their racks (latches stay lit); W1 sits in the east pocket so a bad dam never traps you. All three latches open the forge gates G1/G2; '
                          'you still need a dam west of the gates to cross the trunk to the landing. Stones cannot be pushed onto the cinder grate in front of W1.',
                    solution='Push the east rack stone up into the trunk at x14 (below every junction, so all three basins fill and latch), work the bellows W1, then push the west stone up into the trunk at x6: the trunk east of it cools and you walk up through the gates. '
                             'See verified.shortest_solution.')
    P = rm.extra['puzzle']
    P['lava']['trunk'] = [[x, 10] for x in range(2, 15)]
    P['lava']['spill'] = [[[3, 10], [3, 11]], [[10, 10], [10, 11]], [[13, 10], [13, 11]]]
    P['no_push'] = [[11, 13], [12, 13], [13, 13], [14, 13]]  # cinder grate in front of the east bellows: stones cannot be shoved onto it
    P['lava']['model'] = 'spill: trunk flows to the drain; branches fill only while the trunk is dammed below their junction (backs up). Simplified, no step timing.'
    rm.npc('hall_cindervale_guide', 12, 15, 'left', 'guide', 'hall guide (forge keeper): one hint line', 'maps.hall_cindervale.guide')
    return rm

def hall_aurelith(H):
    rows = [
        "....................",  # 3  dais x9-10
        "....................",  # 4
        "..........M.........",  # 5
        "....................",  # 6  goal (10,6)
        "...T..........T.....",  # 7
        "######K##GG##K######",  # 8  seal crystals s1 (west wing) / s2 (east wing); grand gates G1/G2
        "#E...X..H.....#....#",  # 9  west wing: lamp E1 fires south; X1 = west wing cargo gate; H1 central hold plate
        "#...............B..#",  # 10 east wing boulder b1; wing doorways (5,10) and (14,10): people only (sills)
        "#/.B.O........#....#",  # 11 mirror mir1, crate b2 blocks the beam, wing receiver O1
        "#....#.....H..X..H.#",  # 12 H2 central hold plate; X2 = east wing cargo gate; wing plate H3
        "######........######",  # 13
        "#########..#########",  # 14
        "...................R",  # 15
        ".........mm.........",  # 16
    ]
    props = {
        'E1': {'dir': 'D', 'note': 'west wing lamp (Lanternport verb: beams)'},
        'O1': {'channel': 'W', 'note': 'west wing receiver'},
        'H3': {'channel': 'E', 'note': 'east wing hold plate (Fernwick/Revival verb: boulders on hold plates)'},
        's1': {'channel': ['F', 'S1'], 'source': 'W', 'note': 'west wing seal: latches when the beam reaches O1'},
        's2': {'channel': ['F', 'S2'], 'source': 'E', 'note': 'east wing seal: latches when a boulder holds H3'},
        'H1': {'channel': 'F'}, 'H2': {'channel': 'F'},
        'G1': {'channel': 'F'}, 'G2': {'channel': 'F'},
        'X1': {'channel': 'S1', 'note': 'west wing cargo gate: opens once the wing is sealed'},
        'X2': {'channel': 'S2', 'note': 'east wing cargo gate: opens once the wing is sealed'},
        'R1': {'resets': ['boulders', 'mirrors'], 'keep': ['s1', 's2'], 'note': 'arena reset crystal: boulders and mirrors back to start, seals stay lit'},
    }
    deco = [('i_dais_aurelith', 9, 3), ('i_pillar_marble', 2, 3), ('i_pillar_marble', 17, 3), ('i_banner_aurelith', 5, 1), ('i_banner_aurelith', 14, 1),
            ('i_trophy_case', 9, 1), ('i_statue', 0, 15)]
    rm = build_hall('hall_aurelith', 'Aurelith Grand Arena (gauntlet hall)', 'aurelith', 'aurelith', 'marble', rows, props, deco,
                    npcs={'t1': 'right', 't2': 'left'}, pair={'map': 'aurelith', 'door': 'arena', 'status': 'planned exterior door'}, windows=[1, 18],
                    rules='Two wings each reuse an earlier verb. West wing: turn the mirror so the lamp beam reaches receiver O1 (the crate b2 is in the way). '
                          'East wing: hold plate H3 with boulder b1. Solving a wing lights its seal crystal for good (s1/s2) and opens its cargo gate (X1/X2). '
                          'Leaving a wing before it is sealed resets that wing. The grand gates G1/G2 open while both seals are lit AND both central hold '
                          'plates H1/H2 are held - and the only boulders that can reach them are the wing pieces, so each must be routed out of its wing after sealing. '
                          'Wing doorways are sills (people only); boulders leave through the cargo gates. The reset crystal R1 restores boulders and mirrors but not seals.',
                    solution='West: push crate b2 north off the beam row, turn mir1, seal s1; push b2 out through X1 and east onto H1. '
                             'East: push b1 east and down onto H3, seal s2; push it west through X2 onto H2. Walk up through the grand gates. See verified.shortest_solution.',
                    extra={'zones': [{'id': 'west_wing', 'rect': [1, 9, 4, 12], 'seal': 's1'}, {'id': 'east_wing', 'rect': [15, 9, 18, 12], 'seal': 's2'}],
                           'no_push': [[5, 10], [14, 10], [9, 8], [10, 8], [9, 14], [10, 14]],
                           'scope_note': 'Partial gauntlet: 2 of 8 wings (beams, boulder hold plates) plus the inter-wing routing. Fog, tide, ice, lava, crust and '
                                         'crystal-set wings and the champion remix room are listed as gaps in INTERIORS.md.'})
    for q in rm.extra['puzzle']['switches']:
        if q['id'] in props and 'channel' in props[q['id']]: q['channel'] = props[q['id']]['channel']
    rm.npc('hall_aurelith_guide', 17, 15, 'left', 'guide', 'arena steward: one hint line', 'maps.hall_aurelith.guide')
    return rm

# ---------------- Brookhollow lab ----------------
def lab_brookhollow(H):
    W, Hh = 14, 11
    rm = Room('lab_brookhollow', 'Brookhollow Lumen Lab', W, Hh, 'lab', 'lab', windows=[7, 8], region='brookhollow', kind='lab')
    rm.put('i_lab_machine', 1, 1); rm.put('i_lab_machine', 2, 1); rm.put('i_specimen_tank', 4, 1); rm.put('i_specimen_tank', 5, 1)
    rm.put('i_server_rack', 10, 1); rm.put('i_server_rack', 11, 1); rm.put('i_crystal_display', 12, 1)
    rm.put('i_shelf_brook', 0, 3); rm.put('i_shelf_brook', 13, 3)
    # starter cradles: three crystals on plinths in front of the researcher
    for x in (5, 7, 9): rm.put('i_crystal_display', x, 5)
    rm.put('i_lab_desk', 1, 6); rm.put('i_terminal', 3, 6); rm.put('i_lab_desk', 11, 6); rm.put('i_pc', 13, 6)
    rm.put('i_globe', 12, 8); rm.put('i_plant_fern', 0, 9); rm.put('i_plant_flower', 13, 9); rm.put('i_plant_palm', 1, 8)
    rm.rug('teal', 5, 8, 4, 2)
    rm.mat = 'i_mat_lab'
    w = rm.exit_mat(7, 'lab', pair_with={'map': 'brookhollow', 'door': 'lab', 'status': 'NEW door needed: brookhollow.json has no lab door yet (planned)'},
                    note='exit to the Brookhollow lab door (planned)')
    H.PAIRS.append(dict(interior='lab_brookhollow', warp=[7, Hh - 1], map='brookhollow', door='lab', door_xy=None, arrival=[7, Hh - 2],
                        status='planned (new door on the existing brookhollow exterior)'))
    rm.npc('lab_brookhollow_researcher', 7, 4, 'down', 'researcher', 'lead researcher; starter-crystal scene: the three cradles at (5,5),(7,5),(9,5) are read from y=7', 'maps.lab_brookhollow.researcher')
    rm.npc('lab_brookhollow_aide', 10, 8, 'left', 'aide', 'lab aide: dex / journal tips', 'maps.lab_brookhollow.aide')
    for k, x in enumerate((5, 7, 9)):
        rm.sign(x, 6, 'starter cradle %d (story-gated choice)' % (k + 1), 'maps.lab_brookhollow.cradle_%d' % (k + 1))
    rm.sign(3, 6, 'research terminal', 'maps.lab_brookhollow.terminal')
    rm.extra['story'] = {'starter_choice': {'cradles': [[5, 5], [7, 5], [9, 5]], 'read_from_y': 7, 'flag': 'got_starter'}}
    return rm

# ---------------- Revival Tech HQ lobby ----------------
def rt_hq_lobby(H):
    W, Hh = 18, 12
    rm = Room('rt_hq_lobby', 'Revival Tech HQ - main lobby', W, Hh, 'rtbranch', 'rtbranch', windows=[], region='revival_heights', kind='hq')
    rm.floor_rect(5, 3, 13, Hh, 'carpet_violet')
    rm.put('i_lift', 1, 1); rm.put('i_lift', 3, 1); rm.put('i_lift', 14, 1); rm.put('i_lift', 16, 1)
    rm.put('i_crystal_display', 5, 1); rm.put('i_rt_logo_panel', 8, 1); rm.put('i_crystal_display', 12, 1)
    rm.put('i_rt_poster_care', 6, 1); rm.put('i_rt_poster_join', 7, 1); rm.put('i_rt_poster_safety', 10, 1); rm.put('i_rt_poster_care', 11, 1)
    for k, part in enumerate('lmmmr'): rm.put('i_counter_rt_' + part, 6 + k, 5)
    for x in (1, 2, 3, 4): rm.put('i_turnstile', x, 4)
    for x in (13, 14, 15, 16): rm.put('i_turnstile', x, 4)
    rm.put('i_sofa_revival', 1, 8); rm.put('i_sofa_revival', 15, 8); rm.put('i_table_small_revival', 2, 9) if False else None
    rm.put('i_suggestion_box', 4, 7); rm.put('i_newsletter_rack', 13, 7)
    rm.put('i_plant_palm', 0, 5); rm.put('i_plant_palm', 17, 5); rm.put('i_plant_succulent', 0, 10); rm.put('i_plant_succulent', 17, 10)
    rm.put('i_server_rack', 0, 1) if False else None
    rm.mat = 'i_mat_rtbranch'
    for x in (8, 9):
        rm.exit_mat(x, 'revival', pair_with={'map': 'revival_heights', 'door': 'rt_hq', 'status': 'planned exterior door (exterior map not built yet)'},
                    note='exit to Revival Heights, HQ main doors (planned)')
    H.PAIRS.append(dict(interior='rt_hq_lobby', warp=[8, Hh - 1], map='revival_heights', door='rt_hq', door_xy=None, arrival=[8, Hh - 2], status='planned (2 mats: 8,9)'))
    rm.npc('rt_hq_receptionist', 8, 4, 'down', 'rt_staff', 'HQ receptionist in company uniform; talk across the counter from (8,6)', 'maps.rt_hq_lobby.receptionist')
    rm.npc('rt_hq_security_w', 2, 5, 'down', 'rt_security', 'security at the west lift turnstiles: lifts locked until a story flag (upper floors not built)', 'maps.rt_hq_lobby.security_w')
    rm.npc('rt_hq_security_e', 15, 5, 'down', 'rt_security', 'security at the east lift turnstiles', 'maps.rt_hq_lobby.security_e')
    rm.npc('rt_hq_visitor', 11, 8, 'up', 'TBD', 'visitor waiting for an interview (job-hunt flavour)', 'maps.rt_hq_lobby.visitor')
    rm.sign(4, 7, 'suggestion box', 'rt_branch.suggestion_box'); rm.sign(13, 7, 'Revival Tech newsletter rack', 'rt_branch.newsletter')
    rm.sign(8, 2, 'Revival Tech crystal-mark panel', 'maps.rt_hq_lobby.logo')
    rm.extra['locked_lifts'] = [{'x': x, 'y': 2, 'approach': [x, 3], 'to': 'rt_hq_floor_TBD', 'locked': True, 'unlock_flag': 'rt_hq_lifts_open',
                                 'note': 'behind the turnstiles; upper floors are not built'} for x in (1, 3, 14, 16)]
    return rm

# ---------------- Lumen Line stations ----------------
STATIONS = {'saltmere': ('Saltmere', 'i_anchor', 'i_plant_coral'), 'lanternport': ('Lanternport', 'i_lantern_stand', 'i_plant_palm'),
            'revival_heights': ('Revival Heights Central', 'i_crystal_display', 'i_plant_succulent'), 'aurelith': ('Aurelith', 'i_statue', 'i_plant_flower')}
def station(H, town):
    nice, prop, plant = STATIONS[town]; W, Hh = 16, 10
    mid = 'station_' + town
    rm = Room(mid, 'Lumen Line - %s station' % nice, W, Hh, 'station', 'concrete', windows=[5, 10], region=town, kind='station')
    rm.put('i_timetable', 1, 1); rm.put('i_poster_route', 7, 1); rm.put('i_poster_route', 8, 1); rm.put('i_timetable', 13, 1)
    rm.put('i_rail_buffer', 15, 3); rm.put('i_luggage', 0, 3)
    rm.put('i_bench', 2, 4); rm.put('i_bench', 11, 4)
    for x in (4, 5, 10, 11): rm.put('i_turnstile', x, 6)
    for k, part in enumerate('lmr'): rm.put('i_counter_station_' + part, 12 + k, 6)
    rm.put('i_sign_board', 2, 7); rm.put(prop, 0, 6); rm.put(plant, 15, 8); rm.put('i_bench', 9, 8) if False else None
    rm.mat = 'i_mat_station'
    for x in (7, 8):
        rm.exit_mat(x, 'station', pair_with={'map': town, 'door': 'station', 'status': 'planned exterior door (exterior map not built yet)'},
                    note='exit to the %s station door (planned)' % nice)
    H.PAIRS.append(dict(interior=mid, warp=[7, Hh - 1], map=town, door='station', door_xy=None, arrival=[7, Hh - 2], status='planned (2 mats: 7,8)'))
    rm.npc(mid + '_attendant', 13, 5, 'down', 'station_attendant', 'Lumen Line attendant: pick a visited stop (talk across the counter from (13,7))', 'rail_only.npcs.station_attendant')
    rm.npc(mid + '_traveller', 6, 3, 'up', 'TBD', 'waiting passenger', 'rail_only.npcs.commuter')
    if town == 'revival_heights':
        rm.npc('rail_pass_clerk', 4, 8, 'right', 'pass_clerk', 'Lumen Line Pass clerk: gives has_rail_pass at step 6 (CRITICAL_PATH.md)', 'rail_only.npcs.pass_clerk')
    if town in ('revival_heights', 'aurelith'):
        rm.npc(mid + '_airspace_officer', 9, 5, 'down', 'airspace_officer', 'restricted-airspace officer: arrivals by rail only', 'rail_only.npcs.airspace_officer')
    rm.sign(2, 7, 'station info board', 'rail_only.signs.sign_platform'); rm.sign(1, 2, 'departures board', 'rail_only.signs.timetable')
    rm.extra['platform_arrival'] = {'x': 7, 'y': 3, 'facing': 'down', 'note': 'Lumen Line arrival cell (FIELD_SKILLS.md step 4)'}
    rm.extra['rail_stop'] = town
    return rm

def build(H):
    rooms = [hall_saltmere(H), hall_revival_heights(H), hall_lanternport(H), hall_cindervale(H), hall_aurelith(H), lab_brookhollow(H), rt_hq_lobby(H)] + [station(H, t) for t in STATIONS]
    return rooms
