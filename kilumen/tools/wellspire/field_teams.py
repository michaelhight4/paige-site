"""Wellspire v2 (Gary 10:14 + 10:17 PM CT): every present-day Wellspire trainer is from another RT field research team,
sent to look into the disturbance. id -> (name, trainer_class, sprite, team). Text keys: r9.ft.<id>.intro / .after."""
FIELD = {
 # Old riverbed: Team Cobalt (hydrology)
 'r9_rb_hiker':  ('Wren',   'RT Hydrologist',     'tr_hiker_f',     'Cobalt'),
 'r9_rb_dowser': ('Ansel',  'RT Field Researcher', 'tr_scientist_m', 'Cobalt'),
 'r9_rb_guide':  ('Petra',  'RT Field Lead',      'tr_scientist_f', 'Cobalt'),
 'r9_skylift_rider': ('Joss', 'RT Survey Pilot',  'tr_ranger_m',    'Harrow'),
 # Switchbacks: Team Harrow (survey) + Team Gannet (geology)
 'r9_sw_mountaineer_1': ('Bram', 'RT Path Surveyor', 'tr_hiker_m',  'Harrow'),
 'r9_sw_climber_1': ('Ilse',  'RT Field Researcher', 'tr_camper_f',  'Harrow'),
 'r9_sw_survey_1':  ('Odo',   'RT Geologist',      'tr_scientist_m', 'Gannet'),
 'r9_sw_survey_2':  ('Maren', 'RT Geologist',      'tr_scientist_f', 'Gannet'),
 'r9_sw_survey_3':  ('Tobin', 'RT Field Lead',     'tr_ranger_m',    'Gannet'),
 'r9_sw_climber_2': ('Sela',  'RT Field Researcher', 'tr_hiker_f',   'Harrow'),
 # Icefall: Team Sedge (ice cores)
 'r9_ic_climber_1': ('Nils',  'RT Glaciologist',   'tr_hiker_m',     'Sedge'),
 'r9_ic_climber_2': ('Hedda', 'RT Glaciologist',   'tr_camper_f',    'Sedge'),
 'r9_ic_diver':     ('Cass',  'RT Cave Diver',     'tr_swimmer_f',   'Sedge'),
 'r9_ic_keeper':    ('Rook',  'RT Field Lead',     'tr_scientist_m', 'Sedge'),
 # Cloudway: Team Lark (weather)
 'r9_cw_field_1': ('Fenna', 'RT Weather Watcher', 'tr_scientist_f', 'Lark'),
 'r9_cw_field_2': ('Dov',   'RT Field Researcher', 'tr_hiker_m',   'Lark'),
 'r9_cw_field_3': ('Linnea', 'RT Field Lead',     'tr_ranger_m',    'Lark'),
 # Echo Cave: Team Quill (sound + records)
 'r9_ec_field_1': ('Ezra',  'RT Sound Recordist', 'tr_scientist_m', 'Quill'),
 'r9_ec_field_2': ('Nadia', 'RT Archivist',       'tr_scientist_f', 'Quill'),
 # Cloudline: Team Moraine (mapping)
 'r9_cl_field_1': ('Gus',   'RT Cartographer',    'tr_hiker_m',     'Moraine'),
 'r9_cl_field_2': ('Yara',  'RT Cartographer',    'tr_camper_f',    'Moraine'),
 'r9_cl_field_3': ('Hal',   'RT Field Lead',      'tr_ranger_m',    'Moraine'),
 # Heart cave: Team Vesper (the senior team; they have been here "before")
 'r9_hc_field_1': ('Ione',  'RT Senior Researcher', 'tr_scientist_f', 'Vesper'),
 'r9_hc_field_2': ('Corwin', 'RT Senior Researcher', 'tr_scientist_m', 'Vesper'),
 'r9_hc_field_3': ('Agathe', 'RT Field Director',  'tr_scientist_f', 'Vesper'),
}
