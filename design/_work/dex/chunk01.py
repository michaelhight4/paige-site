# ---- Starters (Revival Tech, Brookhollow) ----
L('brookhollow','rare',['earth'],'slate grey, moss green, sand, violet','tail tip',
 ('Tumbloam','small','Roly-poly woodlouse/wombat pup; banded slate shell with moss specks, stubby stone nose horn, rounded legs','Stubborn and loyal; curls into a ball when shy and rolls down riverbanks packing soil into burrows.',None),
 ('Burrowmane','medium','Stockier wombat-badger; shell bands now shoulder plates, thick shaggy moss mane around neck, short nose horn','Watches over smaller creatures like an older sibling.','level 16'),
 ('Bastonox','huge','Fortress-shelled tank on pillar legs; layered slate shell like a rampart, heavy brow horn, moss in the seams; violet crystal clusters on both shoulders','A patient guardian. Old stories say a herd once walled off a whole valley.','level 32'),existing=True)
L('brookhollow','rare',['fire'],'charcoal, ember orange, ash grey, violet','violet veins along the plates, crystal at tail tip',
 ('Cindrip','small','Charcoal tapir calf; short trunk-snout, lava-coal plates on back and haunches, glowing seams','Sniffs everything it meets, then sneezes sparks at it.',None),
 ('Emberlunx','medium','Lean deer-legged tapir; long legs, coal spine crest that glows when running','A restless sprinter with a crest of glowing coal down its spine.','level 16'),
 ('Forgeharrow','huge','Elk-sized tapir; ember-venting spine ridge, forge-plate shoulders, antler-like coal crest','Proud and honourable. Smiths once used its breath to fire their kilns.','level 32'),existing=True)
L('brookhollow','rare',['water'],'seafoam, teal, cream, violet','tail tip (Tidemarrow: violet beads on coral horns)',
 ('Rillop','small','Otter-cuttlefish pup; frill-fin skirt, tendril whiskers, big eyes','A playful river pup. Its tendril whiskers find every loose pebble.',None),
 ('Brookhorn','medium','Sleek otter with stubby coral horns and longer frill fins','Brave and a bit of a show-off. Its coral horns grow with every season.','level 16'),
 ('Tidemarrow','huge','Long sea-otter body; branching coral horns strung with violet beads, broad wing fins','Calm and wise. Sailors read its moods to guess the weather.','level 32',['water','sea']),existing=True)
# ---- Route 1 ----
L('route1','common',['wind','bird'],'wheat brown, cream, sky blue, violet','small gem on the forehead, grows into a crest stone',
 ('Peeplark','small','Round fluff-ball lark; stub wings, oversized feet, one curled head feather','Sings at the first light and never on key.',None),
 ('Larkspar','medium','Slim lark; long split tail, swept crest, bold blue wing bars','Spars with its own reflection in puddles.','level 14'),
 ('Galespar','large','Broad-winged hawk-lark; crest swept back like a blade, banded tail fan, wings open wide','Rides the first gust of a storm to scout ahead of the rain.','level 34'))
L('route1','common',['earth'],'fawn, cream, cocoa, violet','crystal set in the tip of one ear',
 ('Nibbin','small','Chubby field vole; huge round ears, stuffed cheeks, twitchy whiskers','Hides seeds in every hole it can find and forgets half of them.',None),
 ('Gnawford','medium','Stout beaver-vole; flat paddle tail, chisel front teeth, little stick bundle on its back','Builds tiny dams across puddles and charges a toll of one berry.','level 18'))
L('route1','common',['grass','bug'],'leaf green, dew blue, pale gold, violet','bead on the tail segment, later between the wings',
 ('Dewmite','small','Tiny green caterpillar; dewdrop bubble on its back, stubby leaf-shaped feet','Drinks only the first dew of the morning.',None),
 ('Huskling','small','Leaf-wrapped cocoon hanging from a stem; two eyes peek out','Sways with the wind and pretends to be asleep.','level 7'),
 ('Gauzewing','medium','Delicate moth; translucent gauze wings with gold veins, feathery antennae','Its wing dust leaves a faint glow on flowers it visits.','level 10',['grass','wind']))
L('route1','common',['grass'],'clover green, white, pink, violet','tiny crystal on its nose',
 ('Cloverkin','small','Little rabbit with four clover-leaf ears and a puff tail','Brings luck to anyone who shares a snack with it, or so kids say.',None))
L('route1','uncommon',['water','rain'],'puddle blue, grey, yellow belly, violet','crystal on top of its head like a raindrop',
 ('Puddlenip','small','Squat frog shaped like a raindrop; wide mouth, splayed toes','Only comes out when storm floods fill the grass.',None),note='Storm/flood slot companion to Rillop on route1_storm.')
L('route1','uncommon',['dark','bird'],'dusk violet-grey, cream, amber eyes, violet','crystal in the facial disc',
 ('Hushowl','small','Round owlet; heart-shaped face, oversized amber eyes, fluffy down','Makes no sound at all, even when it sneezes.',None),
 ('Vesperowl','large','Tall owl in a cloak of dark feathers; tufted brows, long silent wings','Guards the night roads and guides travellers who walk quietly.','level 26 at night'))
L('route1','uncommon',['mystic','spirit'],'lavender, cream, soft teal, violet','crystal floats above its head',
 ('Mumblet','small','Little floating cloud-sprite with a round mouth and stubby arms','Repeats the last word anyone said, very slowly.',None))
L('route1','common',['grass'],'thistle purple, sage green, tan, violet','crystal at the base of the tail',
 ('Thistlepup','small','Puppy with a spiky thistle-head ruff and soft round body','Gets its fur stuck to everything and is proud of it.',None),
 ('Thistlehound','large','Lean hound with a mane of thistle spikes and a burr-tufted tail','A loyal tracker; burrs on its tail mark the trail home.','level 22'))
L('route1','common',['wind'],'white, pale yellow, sky blue, violet','seed-crystal at the centre of the puff',
 ('Puffwhirl','small','Dandelion seed-puff with a tiny face and two leaf feet','Drifts wherever the wind goes and is never lost.',None))
L('route1','common',['earth','bug'],'rust red, clay, black, violet','crystal pebble carried in the jaws',
 ('Pebblant','small','Red ant carrying a pebble twice its size','Never puts its pebble down, not even to sleep.',None),
 ('Cairnant','medium','Big ant with a stacked stone cairn grown on its back','Builds marker towers that point the way to water.','level 20'))
L('route1','uncommon',['light','bug'],'warm gold, cream, soft green, violet','crystal is the glowing abdomen',
 ('Glintfly','small','Firefly with a round glowing tail and tiny wings','Blinks in patterns that other Glintfly answer from far away.',None),
 ('Beaconfly','medium','Larger firefly with a lantern-shaped tail and four broad wings','A swarm lights up the meadow on summer nights.','level 21'))
L('route1','uncommon',['fire','magma'],'soot brown, ember orange, pink nose, violet','crystal on its digging claws',
 ('Flickermole','small','Velvety mole; glowing ember snout, broad digging claws','Leaves warm little tunnels under frosty fields.',None))
L('route1','common',['wind','bird'],'blue-white, sky blue, violet','violet beads on the streamer tail',
 ('Sailquill','medium','Blue-white swift with a sail crest and streamer tail','A cheerful messenger that rides in on storm fronts.',None),existing=True,note='Notes say evolution TBD; kept single here (Gary to decide).')
L('route1','rare',['light','angelic'],'cream, soft gold, pale pink, violet','violet crystals set in the halo ring',
 ('Halovy','small','Moth-fawn with a halo ring above its head and soft wing-ears','Gentle and shy. It shows up at dawn for travellers who are lost.',None),existing=True)
L('route1','uncommon',['dark','ghost'],'dusk grey, mist white, amber glow, violet','crystal lantern carried by the tail',
 ('Gloamtick','small','Floating big-eared dormouse-bat; wispy mist lower body, carries a little lantern by its tail','A timid trickster. Carries a little crystal lantern by its tail.',None),existing=True)
L('route1','common',['earth','bug'],'bark brown, mushroom tan, moss green, violet','violet knots in the bark',
 ('Burlbeetle','medium','Tree-burl beetle with a mushroom cap on its back','Sleepy and sturdy. Hides in plain sight by pretending to be a stump.',None),existing=True)
# ---- Brookhollow river (fishing / later Tideglide) ----
L('brookhollow','common',['water','freshwater'],'silver, river green, orange fins, violet','crystal on the dorsal fin',
 ('Dartling','small','Minnow with oversized fins and a startled face','Darts in schools; one sneeze scatters them all.',None),
 ('Streambarb','medium','Barbel fish with whisker feelers and striped flanks','Reads the riverbed with its whiskers like a map.','level 20'),
 ('Torrentpike','large','Long torpedo pike; jagged jaw, fin blades along the back','Leaps waterfalls in a single bound.','level 38'))
L('brookhollow','common',['water','freshwater'],'mussel blue-black, pearl, moss, violet','a violet pearl inside the shell',
 ('Musselin','small','Mussel shell with two stubby feet and peeking eyes','Clamps onto boots and refuses to let go.',None))
L('brookhollow','uncommon',['water','swamp'],'olive, orange spots, cream, violet','crystal on the back of the head',
 ('Eftling','small','Little newt with orange spots and a frilled tail','Basks on warm stones by the riverbank all afternoon.',None),
 ('Eftwarden','medium','Larger newt with a gilled frill crown and long paddle tail','Patrols the shallows and chases off anything bigger than it.','level 24'))
# ---- Fernwick ----
L('fernwick','uncommon',['grass'],'fern green, bark brown, cream spots, violet','crystal between the antlers',
 ('Frondlet','small','Fawn with curled fern-fiddlehead ears and dappled back','Unrolls its ears to listen when someone calls its name.',None),
 ('Frondhart','medium','Young deer with fern-frond antlers','Leads lost travellers out of tall ferns.','level 18'),
 ('Fernstag','large','Tall stag with sweeping fern antlers and a moss collar','Fernwick folk say the town was planted where one rested.','level 36'))
L('fernwick','common',['grass'],'moss green, pink bloom, cream, violet','crystal is the flower centre',
 ('Shellbloom','small','Snail whose spiral shell is a blooming flower bud','Moves slowly from garden to garden and leaves them greener.',None))
L('fernwick','common',['water','swamp'],'pond green, reed tan, lily pink, violet','crystal on the lily pad hat',
 ('Pondkin','small','Duckling-like tadpole wearing a lily pad as a hat','Paddles in circles until it gets dizzy.',None),
 ('Reedmoot','medium','Heron-shaped amphibian with reed legs and a lily crown','Stands still in the pond for hours, thinking.','level 22'))
L('fernwick','common',['fire'],'cinnamon, cream, warm orange, violet','crystal on the collar tuft',
 ('Hearthkit','small','Kitten with warm-glowing paw pads and a curled tail flame','Sleeps on doorsteps to keep them warm.',None),
 ('Kilnpaw','medium','Lean cat with brick-pattern fur and ember-tipped ears','Bakers leave a bun out for one, and it keeps the oven lit.','level 24'))
L('fernwick','uncommon',['mystic','spirit'],'wicker tan, ribbon red, cream, violet','crystal sits in its woven chest',
 ('Wickerling','small','Little woven-basket figure with ribbon arms','Collects lost buttons and keeps them inside itself.',None))
L('fernwick','uncommon',['dark','ghost'],'faded linen, dusty blue, black eyes, violet','crystal pinned to the bonnet',
 ('Dustbonnet','small','Small sheet-ghost wearing a frilled bonnet','Tidies abandoned attics at night and leaves no footprints.',None))
L('fernwick','common',['wind','bird'],'slate blue, rose grey, white, violet','crystal on the chest',
 ('Ledgedove','small','Plump dove with a puffed chest and tiny feet','Coos from rooftops and warns the town of rain.',None),
 ('Belfrydove','medium','Elegant dove with bell-shaped tail fan and long wings','Rings the old belfry by landing on the rope.','level 20'))
L('fernwick','common',['grass'],'red cap, cream spots, toad green, violet','crystal on the cap tip',
 ('Capling','small','Tiny mushroom with stubby legs and a spotted cap','Pops up overnight after rain in neat little rings.',None),
 ('Toadcap','medium','Squat toad wearing a broad spotted mushroom cap','Croaks spores into the air that make the garden grow.','level 22'))
L('fernwick','rare',['light','angelic'],'candle white, warm gold, soft blue, violet','crystal is the flame on its head',
 ('Candlewren','small','Tiny wren with a candle-flame crest that never goes out','Sits in windows on long nights so no one feels alone.',None))
L('fernwick','common',['earth'],'cobble grey, moss, brown eyes, violet','crystal set as a collar stone',
 ('Cobblepup','small','Puppy whose coat is a pattern of rounded cobblestones','Fetches stones instead of sticks and stacks them by the door.',None))
L('fernwick','uncommon',['grass','bug'],'honey gold, black bands, white wings, violet','crystal in the honeycomb pattern',
 ('Hummbel','small','Fuzzy round bee with tiny wings','Hums a tune that makes flowers turn toward it.',None),
 ('Combwarden','medium','Big guard bee with a honeycomb shield-shaped thorax','Keeps the town gardens safe and sweet.','level 20'))
L('fernwick','common',['earth'],'lint grey, pink nose, patchwork colours, violet','crystal button on its belly',
 ('Lintmouse','small','Mouse made of soft lint with mismatched patch ears','Lives in laundry baskets and steals single socks.',None))
L('fernwick','uncommon',['wind','rain'],'copper green, rust, sky grey, violet','crystal at the arrow tip of its tail',
 ('Weathervex','small','Rooster-shaped wind sprite with an arrow tail that spins','Always faces where the wind will come from next.',None))
