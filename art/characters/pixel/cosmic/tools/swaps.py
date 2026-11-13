"""Cosmic variant palette swaps (DRAFT, not approved by Gary, not wired in).
Each creature: concept name, one-line idea, and {src: dst} over the colours its sprites use OUTSIDE the crystal mask.
Colours not listed stay as they are (outlines, eyes, crystals, non-crystal violet fins/smoke, small accents).
"""
EARTH = {  # Moondust: tan/brown hide -> moon-silver, slate shell -> midnight blue (kept dark so the
           # Warmth stage-1/2 blue-teal crystals still pop against it)
 '342842':'1a1226','3e3a48':'342842','54444e':'1e4078','5e5866':'30488c','827a84':'2c64a8','a8a0a4':'4a70ba',
 '462c22':'3e3a48','6a442e':'54444e','87604d':'5e5866','92623e':'827a84','ba8856':'a8a0a4',
 'ccaa6e':'ccc6c2','deb478':'fcf6e8','e8ce92':'ecdec4',
}
FIRE = {  # Frostfire: charcoal hide -> deep navy, lava cracks -> ice-cyan, tan muzzle/belly -> silver
 '3e3a48':'1e4078','54444e':'30488c','5e5866':'2c64a8',
 '561c0e':'1e4078','6a3019':'30488c','9f4013':'2c64a8','c46e2e':'4a70ba','d46616':'4692ce',
 'e29d40':'7ac2e8','eea23c':'c6ecfa','fcd668':'f8eabe',
 '462c22':'3e3a48','6a442e':'54444e','87604d':'5e5866','92623e':'827a84','ba8856':'a8a0a4',
 'ccaa6e':'ccc6c2','deb478':'fcf6e8','e8ce92':'ecdec4',
}
WATER = {  # Sunken Gold: grey hide -> old gold, cream belly -> pearl silver, teal stripes -> deep sea blue
 '3e3a48':'462c22','54444e':'6a442e','5e5866':'92623e','827a84':'ba8856','a8a0a4':'ccaa6e','ccc6c2':'deb478',
 '462c22':'3e3a48','6a442e':'54444e','87604d':'5e5866','92623e':'827a84','ba8856':'a8a0a4',
 'ccaa6e':'ccc6c2','deb478':'fcf6e8','e8ce92':'ecdec4',
 '246e6c':'1e4078','3e9c92':'2c64a8','70cab8':'4692ce',
}
SWAPS = {
 'tumbloam':   ('Moondust', 'Moon-silver hide under a midnight blue shell, as if it rolled through starlight.', EARTH),
 'burrowmane': ('Moondust', 'Earth line Moondust: silver mane and paws, midnight blue shell plates.', EARTH),
 'bastonox':   ('Moondust', 'Earth line Moondust: a silver giant carrying a midnight blue fortress shell.', EARTH),
 'cindrip':    ('Frostfire', 'Cold flame: deep navy coal body with ice-cyan "lava" cracks and a silver belly.', FIRE),
 'emberlunx':  ('Frostfire', 'Fire line Frostfire: navy coat, ice-cyan crest cracks and paws.', FIRE),
 'forgeharrow':('Frostfire', 'Fire line Frostfire: a navy kiln-beast whose forge glows ice-blue.', FIRE),
 'rillop':     ('Sunken Gold', 'Old-gold otter with a pearl belly and deep-blue stripes, like treasure from the seabed.', WATER),
 'brookhorn':  ('Sunken Gold', 'Water line Sunken Gold: gold hide, pearl belly, deep-blue stripes; fins stay as authored.', WATER),
 'tidemarrow': ('Sunken Gold', 'Water line Sunken Gold: gold hide, pearl belly, blue stripes under its blue wing-fins.', WATER),
 'sailquill':  ('Rosefinch', 'Sunrise-pink plumage instead of sky blue; white chest, beak and dark streamers unchanged.', {
     '2c64a8':'a23432','4a70ba':'d2608c','4692ce':'daa2ba','7ac2e8':'f6a0ba','c6ecfa':'fcf6e8'}),
 'halovy':     ('Moonmoth', 'Dawn-cream fur turns pale moonlight blue: the dawn spirit seen at midnight.', {
     '462c22':'342842','6a442e':'1e4078','87604d':'30488c','92623e':'2c64a8','ba8856':'4a70ba',
     'ccaa6e':'4692ce','deb478':'7ac2e8','e8ce92':'c6ecfa','ecdec4':'c6ecfa','f8eabe':'fcf6e8'}),
 'gloamtick':  ('Sea-glass', 'Dusk-grey ghost turns sea-glass teal; its lantern stays candle-gold.', {
     '342842':'18382c','3e3a48':'244e34','54444e':'38683e','5e5866':'246e6c','827a84':'3e9c92',
     'a8a0a4':'70cab8','ccc6c2':'c6ecfa'}),
 'mirewump':   ('Autumn Bog', 'Moss coat turns autumn rust and amber; the mud underside goes stone grey.', {
     '18382c':'561c0e','244e34':'6a3019','24522e':'6a3019','38683e':'9f4013','367634':'9f4013','54864e':'c46e2e',
     '462c22':'3e3a48','6a442e':'54444e','87604d':'5e5866','92623e':'827a84','ba8856':'a8a0a4','ccaa6e':'ccc6c2'}),
 'runeskein':  ('Rosewool', 'The teal weave is re-dyed rose and crimson; cream yarn body unchanged.', {
     '18382c':'6e222a','244e34':'6e222a','1e4078':'561c0e','246e6c':'a23432','38683e':'a23432',
     '3e9c92':'d2608c','54864e':'d2608c','70cab8':'f6a0ba'}),
 'burlbeetle': ('Birchbark', 'Brown burl bark becomes pale birch silver with dark knots; the orange bud cap stays.', {
     '462c22':'3e3a48','6a3019':'3e3a48','6a442e':'54444e','87604d':'5e5866','92623e':'827a84',
     'ba8856':'a8a0a4','ccaa6e':'ccc6c2','deb478':'fcf6e8'}),
 'slagrook':   ('Verdigris', 'Red-hot slag shell weathered to blue-green copper patina (teal, so it still separates from grass); molten orange drips stay hot.', {
     '561c0e':'18382c','6a3019':'246e6c','9f4013':'3e9c92','a23432':'3e9c92','d05440':'70cab8',
     'c46e2e':'70cab8','f08868':'c6ecfa'}),
}
