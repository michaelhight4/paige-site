# Text Bot requests: RITA voice, region 2 (2026-10-23 2:41 PM CT, coder)

Nothing here blocks the voice: every region 2 line already has text, and lines not listed below are voiced as written.
These are tag fixes so the region tags match where a player can actually see each line. Text Bot owns the lines; the coder did not edit them.

1. kilindex_milestone_50 / _2 / _3 / _4 and kilindex_milestone_100 / _2 / _3 / _4 are tagged region 2. data/company_voice.json
   counts_by_region puts 50/100 in region 3 (region 2 = [25]). Suggest: retag them as region 3. Until then the voice build skips them (data/rita_voice_scope.json regions.region_2.exclude_keys).
2. area_new_greystone_entrance / _2 / _3 / _4 and quest_done_mq_greystone_camp / _2 / _3 / _4 are tagged region 2, but Greystone sits behind
   gate_thornwood_east (beat_master_saltmere), and mq_greystone_camp is not in the quest keys_by_region 2. Suggest: retag them as region 3 *(inferred from the map gates)*. Skipped for now.
3. Note only: the "Tide-Lock Road" area name is read as "Tide Lock Road". No text change needed.

Source: data/rita_voice_scope.json, data/company_voice.json
