"""r9_switchbacks pass 2 pockets (Coder, Oct 30 2026)."""
from pass2_spec import P as _P, T, E
M = 'r9_switchbacks'
def P(*a, **k): return _P(*a, main_start=[24, 1], floor_tile_at=[22, 28], **k)
POCKETS = [
 P(M,'sw_pocket_west','r9_switchbacks_cave_w','Switchback Crevice',[[11,13,15,24]],[12,14,25],[[x,26] for x in range(12,17)],[19,24],[13,13],
   T('r9_swp_hermit',11,16,'Hermit','Odda',['lancebeetle','fernstag','tundrarch'],'Nobody finds this ledge by walking. You came through the crack, huh?','Fine, fine. The rock keeps my secrets better than I do.','Drop off the ledge to the south. It only goes one way.'),
   E('r9_swp_egg_cairn',15,17,'a tiny cairn of 3 pebbles','A tiny cairn. Someone stacked 3 pebbles and carved a smiling face on the top one.'),
   dict(id='r9_swp_seed',x=12,y=24,item='vigor_seed'),'A hermit who left the climb years ago and guards a hidden Vigor Seed.'),
 P(M,'sw_pocket_northeast','r9_switchbacks_cave_ne','Frost Seam',[[31,12,37,17]],[37,37,18],[[37,19],[37,20]],[31,20],[34,12],
   T('r9_swp_icecutter',31,14,'Ice Cutter','Bran',['gauzewing','galespar','stratodrake'],'This seam is mine. I cut ice blocks for the camp.','You hit harder than the frost does.','There is a slide down by the far wall. Mind the drop.'),
   E('r9_swp_egg_snowman',36,14,'a snow figure wearing a climbing helmet','A snow figure in a climbing helmet. Its sign says: STILL WAITING FOR A ROPE.'),
   dict(id='r9_swp_crystal',x=32,y=17,item='dominance_crystal_plus'),'An ice cutter who works a hidden seam above the shelf; a Prime Crystal sits under the snow.'),
 P(M,'sw_pocket_east','r9_switchbacks_cave_e','Echo Hollow',[[31,32,37,35]],[31,33,36],[],[27,39],[35,32],
   T('r9_swp_echo',33,33,'Mountaineer','Sefa',['calderock','foundrax','novarch'],'Shout in here and the mountain shouts back. Want to hear it?','Even the echo went quiet.','The ledge west drops you by the lower trail.'),
   E('r9_swp_egg_names',37,32,'names scratched in the rock','Old names cut in the rock, a whole rope team. The newest one only says: WAS HERE FIRST.'),
   dict(id='r9_swp_seed_e',x=36,y=35,item='vigor_seed'),'A climber who listens to the mountain echo; lore wall of the first rope team.'),
 P(M,'sw_pocket_southwest','r9_switchbacks_cave_sw','Low Draught',[[12,46,25,47]],[14,24,48],[[x,49] for x in range(14,30)],[23,39],[13,45],
   T('r9_swp_warden',20,46,'Trail Warden','Ilse',['stratodrake','cragmont','tundrarch'],'You found the warden hut. Most climbers walk right past it.','You climb like you fight. Fast.','The ledge drops you onto the south trail.'),
   E('r9_swp_egg_log',25,46,'a frozen trail log book','The trail log. Last entry: Day 40. The view is still great. Snacks are not.'),
   dict(id='r9_swp_crystal_sw',x=14,y=47,item='dominance_crystal_plus'),'A trail warden with a hidden hut below the switchbacks; story spot for the old trail log.',
   map_items=[{'id': 'r9_swp_seed_visible', 'x': 18, 'y': 47, 'item': 'vigor_seed', 'hidden': False}]),  # R6: seen from the trail above
]
