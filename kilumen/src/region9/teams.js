// Wellspire (region 9 + finale) trainer teams (Coder, Oct 29 2026; story_beats.md §F). Pure data, spread into TRAINER_TEAMS.
// Post-game: L62-68 (enemy cap 68, Oct 30), final-stage, art-ready species. Ondravel (water/god) is fought in 3 phases at L66 / 67 / 68.
const T = (lv, ...sp) => sp.map((species, i) => ({ species, level: Math.min(68, lv + Math.min(i, 3)) })); // enemy cap 68 (Oct 30)
export const WELLSPIRE_TEAMS = {
  'r9_old_riverbed.r9_rb_hiker': T(62, 'cairnhorn', 'shagmount', 'peakbrute'),
  'r9_old_riverbed.r9_rb_dowser': T(62, 'torrentpike', 'moorcoil', 'cascadorn'),
  'r9_old_riverbed.r9_rb_guide': T(62, 'glassvine', 'prismwing', 'runeskein'),
  'r9_skylift_upper.r9_skylift_rider': T(62, 'highkite', 'stratodrake'),
  'r9_switchbacks.r9_sw_mountaineer_1': T(63, 'peakbrute', 'sunderhoof', 'shagmount'),
  'r9_switchbacks.r9_sw_climber_1': T(63, 'seraphawk', 'snowgrouse', 'highkite'),
  'r9_switchbacks.r9_sw_survey_1': T(63, 'geodurchin', 'ingotitan'),
  'r9_switchbacks.r9_sw_survey_2': T(63, 'mirrorkin', 'seaglint'),
  'r9_switchbacks.r9_sw_survey_3': T(63, 'runeskein', 'pearlisk', 'prismwing'),
  'r9_switchbacks.r9_sw_climber_2': T(63, 'stratodrake', 'sunderhoof', 'peakbrute'),
  'r9_old_riverbed.r9_rb_spotter': T(62, 'seraphawk', 'highkite', 'stratodrake'),
  'r9_icefall.r9_ic_climber_1': T(64, 'brineseal', 'hullwhale', 'snowgrouse'),
  'r9_icefall.r9_ic_climber_2': T(64, 'seraphawk', 'peakbrute', 'cairnhorn'),
  'r9_icefall.r9_ic_diver': T(64, 'torrentpike', 'bulwarkrab', 'brineseal'),
  'r9_icefall.r9_ic_keeper': T(64, 'delvemaw', 'obsidiax', 'geodurchin', 'ingotitan'),
  'r9_icefall.r9_ic_carver': T(64, 'mirrorkin', 'glassvine', 'prismwing'), // map fill Oct 30: ice sculptor
  'r9_icefall.r9_ic_sledder': T(64, 'snowgrouse', 'shagmount', 'highkite'), // map fill Oct 30: sled racer
  'fin_lab1_now_f1.r9_spire_keeper_1': T(64, 'prismwing', 'seaglint', 'mirrorkin'),
  'fin_lab1_now_f2.r9_spire_keeper_2': T(65, 'runeskein', 'pearlisk', 'glassvine'),
  'fin_lab1_now_f3.r9_spire_keeper_3': T(65, 'bleachghast', 'crowkin', 'velvetabby', 'prismwing'),
  // the past (rebellion night): scared staff with prototype bands
  'fin_past_station_m.fin_m_handler_1': T(64, 'moorcoil', 'torrentpike'),
  'fin_past_station_m.fin_m_handler_2': T(64, 'bulwarkrab', 'cascadorn'),
  'fin_past_station_m.fin_m_handler_3': T(65, 'hullwhale', 'moorcoil', 'torrentpike'),
  'fin_past_station_m.fin_m_greave': T(65, 'bulwarkrab', 'cascadorn', 'moorcoil', 'torrentpike', 'hullwhale'),
  'fin_past_signal_lab.fin_t_tech_1': T(65, 'mirrorkin', 'seaglint'),
  'fin_past_signal_lab.fin_t_tech_2': T(65, 'prismwing', 'runeskein'),
  'fin_past_signal_lab.fin_t_tech_3': T(65, 'pearlisk', 'mirrorkin', 'seaglint'),
  'fin_past_signal_lab.fin_t_holt': T(66, 'seaglint', 'prismwing', 'runeskein', 'pearlisk', 'mirrorkin'),
  'fin_past_lab1_f1.fin_lab1_staff_1': T(65, 'ingotitan', 'geodurchin'),
  'fin_past_lab1_f2.fin_lab1_staff_2': T(65, 'obsidiax', 'delvemaw'),
  'fin_past_lab1_f3.fin_lab1_staff_3': T(66, 'cairnhorn', 'ingotitan', 'obsidiax'),
  'fin_past_lab1_f4.fin_lab1_staff_4': T(66, 'bleachghast', 'crowkin', 'velvetabby'),
  'fin_past_lab1_f4.fin_lab1_chief': T(66, 'ingotitan', 'obsidiax', 'stratodrake', 'bleachghast', 'hullwhale', 'glassvine'),
  // Ondravel, three phases (Violet / Flood / Own colour)
  'fin_past_enclosure.fin_ondravel_p1': [{ species: 'ondravel', level: 66 }],
  'fin_past_enclosure.fin_ondravel_p2': [{ species: 'ondravel', level: 67 }],
  'fin_past_enclosure.fin_ondravel_p3': [{ species: 'ondravel', level: 68 }],
};
