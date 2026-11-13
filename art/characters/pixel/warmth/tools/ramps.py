"""Crystal Warmth ramps. Every list is aligned to the authored crystal violet ramp V (dark -> light).
All colours are from art/world/overworld/palette.hex. Stage 0 is identity (authored cold violet)."""
V = ['3a1e60', '603096', '8a4ace', 'b076ec', 'd6acff', 'f4e2ff']
W1 = ['3a1e60', '6e222a', 'd2608c', 'daa2ba', 'f6a0ba', 'ecdec4']   # shared warm-target stage 1: "first blush" (violet -> rose)
C1 = ['3a1e60', '30488c', '4a70ba', '4692ce', '7ac2e8', 'c6ecfa']   # shared cool/green-target stage 1: "first thaw" (violet -> periwinkle)
T2 = ['18382c', '246e6c', '3e9c92', '70cab8', 'c6ecfa', 'fcf6e8']   # teal bridge used by green targets at stage 2
RAMPS = {  # family -> (signature hex, signature name, [stage1, stage2, stage3])
 'moss':    ('78ba48', 'moss green', [C1, T2, ['24522e', '367634', '52983a', '78ba48', 'a6d460', 'f8eabe']]),
 'sprout':  ('a6d460', 'sprout lime', [C1, T2, ['38683e', '52983a', '78ba48', 'a6d460', 'f8eabe', 'fcf6e8']]),
 'seafoam': ('70cab8', 'seafoam', [C1, ['1e4078', '2c64a8', '3e9c92', '7ac2e8', 'c6ecfa', 'fcf6e8'],
                                      ['246e6c', '3e9c92', '70cab8', 'c6ecfa', 'fcf6e8', 'fcf6e8']]),
 'pond':    ('7ac2e8', 'clear-pond blue', [C1, ['1e4078', '2c64a8', '4692ce', '7ac2e8', 'c6ecfa', 'fcf6e8'],
                                      ['2c64a8', '4692ce', '7ac2e8', 'c6ecfa', 'fcf6e8', 'fcf6e8']]),
 'ember':   ('d46616', 'ember orange', [W1, ['6e222a', 'a23432', 'd05440', 'f08868', 'deb478', 'f8eabe'],
                                      ['6e222a', 'd46616', 'eea23c', 'fcd668', 'f8eabe', 'fcf6e8']]),
 'molten':  ('fcd668', 'white-hot yellow', [W1, ['6e222a', 'd05440', 'f08868', 'deb478', 'e8ce92', 'f8eabe'],
                                      ['c46e2e', 'eea23c', 'fcd668', 'f8eabe', 'fcf6e8', 'fcf6e8']]),
 'coral':   ('f08868', 'sunrise coral', [W1, ['6e222a', 'a23432', 'd05440', 'f6a0ba', 'f8eabe', 'fcf6e8'],
                                      ['a23432', 'd05440', 'f08868', 'fcd668', 'f8eabe', 'fcf6e8']]),
 'candle':  ('e29d40', 'candle amber', [W1, ['6e222a', 'a23432', 'd05440', 'f08868', 'deb478', 'f8eabe'],
                                      ['6a3019', '9f4013', 'e29d40', 'fcd668', 'f8eabe', 'fcf6e8']]),
 'dawn':    ('f6a0ba', 'dawn rose', [W1, ['3a1e60', '6e222a', 'a23432', 'd2608c', 'f6a0ba', 'fcf6e8'],
                                      ['6e222a', 'a23432', 'd2608c', 'f6a0ba', 'f8eabe', 'fcf6e8']]),
 'crimson': ('a23432', 'crimson thread', [W1, ['3a1e60', '6e222a', 'a23432', 'd2608c', 'f6a0ba', 'fcf6e8'],
                                      ['2c1a12', '561c0e', '6e222a', 'a23432', 'd2608c', 'f6a0ba']]),
}
CREATURES = {  # creature -> (family, element, why)
 'tumbloam':   ('moss', 'Earth', "Earth line shares one colour so the bond carries through evolution. Moss green comes from Tumbloam's moss-speckled shell and Burrowmane's moss mane (living earth, not cold stone). Green reads clearly against the slate/tan shell."),
 'burrowmane': ('moss', 'Earth', 'Earth line (see Tumbloam). Matches its moss mane directly.'),
 'bastonox':   ('moss', 'Earth', 'Earth line (see Tumbloam). Moss on a fortress shell is the patient guardian overgrown with life. The shoulder clusters read strongly green on the grey shell.'),
 'cindrip':    ('ember', 'Fire', 'Fire line: ember orange, the colour of its lava-coal plates and sneezed sparks. Strong contrast on the charcoal body. Stage 3 runs ember-orange edge into a white-hot core so the gems read apart from the orange lava cracks.'),
 'emberlunx':  ('ember', 'Fire', 'Fire line (see Cindrip). Ember orange on the coal crest.'),
 'forgeharrow':('ember', 'Fire', 'Fire line (see Cindrip). Kiln-fire orange, the breath smiths used to fire kilns.'),
 'rillop':     ('seafoam', 'Water', 'Water line: seafoam aqua, straight from its "seafoam otter" design and the teal stripe colour of the line. Readable on the grey body.'),
 'brookhorn':  ('seafoam', 'Water', 'Water line (see Rillop).'),
 'tidemarrow': ('seafoam', 'Water', 'Water line (see Rillop). The coral-horn beads glow sea-foam pale, which reads as calm coast weather.'),
 'sailquill':  ('coral', 'Wind', 'Sunrise coral, picked up from its orange beak and feet. A cheerful messenger of Sunmeadow mornings. Its body is already sky blue, so a blue crystal would vanish; a warm coral/yellow bead pops on the dark streamers.'),
 'halovy':     ('dawn', 'Light', 'Dawn rose: it appears at dawn to the lost. Pink contrasts with its cream body, where gold would blend in.'),
 'gloamtick':  ('candle', 'Dark/Ghost', "Candle amber: its lantern is said to hold a lost soul's spark. With Warmth the spark becomes a real candle flame (it ties into Wick's lantern glow, playbook T3). Reads strongly on the dusk-grey body."),
 'runeskein':  ('crimson', 'Mystic', 'Crimson thread: a red "thread of fate" bead pin on its teal-and-cream yarn. Red complements the teal weave, so the small pin stays visible.'),
 'burlbeetle': ('sprout', 'Earth/Bug', 'Sprout lime: a sleepy tree-burl beetle whose knots bud new growth. Lime pops on its brown bark body. Kept lighter and yellower than the Earth line moss so the two stay distinct.'),
 'mirewump':   ('pond', 'Water/Swamp', 'Clear-pond blue: the clean water under the Mirefen bog. Its body is moss green, so green pebbles would vanish; blue pebbles read clearly.'),
 'slagrook':   ('molten', 'Fire/Magma', 'White-hot yellow: the furnace window heats from violet to white-hot. Its shell is already red-orange, so only a near-white yellow glow reads as "hotter" and stays visible.'),
}
THRESHOLDS = [(0, 0, 24, 'cold (company control)'), (1, 25, 49, 'first tint'), (2, 50, 74, 'second tint'), (3, 75, 100, 'full signature')]
def stages(n):
    fam = CREATURES[n][0]; sig, name, (s1, s2, s3) = RAMPS[fam]
    return [V, s1, s2, s3]
