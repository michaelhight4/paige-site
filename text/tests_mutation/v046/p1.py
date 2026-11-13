p='/workspace/kilumen/text/system_lines.py'; s=open(p).read()
def rep(a,b):
    global s
    assert s.count(a)==1,a[:50]; s=s.replace(a,b)
rep('"name": "Small Tonic", "pocket": "care", "pages": ["A small tonic. Patches','"name": "Small Remedy", "pocket": "care", "pages": ["A small remedy. Patches')
rep('"name": "Big Tonic", "pocket": "care", "pages": ["A big tonic. Patches','"name": "Big Remedy", "pocket": "care", "pages": ["A big remedy. Patches')
rep('"name": "Energy Tonic", "pocket": "care", "pages": ["A fizzy tonic. The label','"name": "Pep Remedy", "pocket": "care", "pages": ["A fizzy remedy. The label')
rep('"The rest is on the house. This once."','"We\'ll cover the rest. This once."')
# club drinks (The Firefly, Fernwick). Descriptions word for word from drafts/club_front_room_v0.2.md
rep(''' "calm_tea": {"name": "Calm Tea",''',''' "pond_plum_juice": {"name": "Pond Plum Juice", "pocket": "feeds", "pages": ["Fresh-pressed pond plums. Tart, cold and picked this morning."], "parity": "E4", "build": "partial", **{"_club": 1}},
 "mossplum_shake": {"name": "Mossplum Shake", "pocket": "feeds", "pages": ["Mossplum milkshake, extra thick. Comes with a very bendy straw."], "parity": "E4", "build": "partial", **{"_club": 1}},
 "fern_mint_tea": {"name": "Fern Mint Tea", "pocket": "feeds", "pages": ["Warm, sweet and minty. Creatures sip it slowly, then ask for more."], "parity": "E4", "build": "partial", **{"_club": 1}},
 "firefly_shake": {"name": "Firefly Shake", "pocket": "feeds", "pages": ["Amber mango milkshake. Sunny, sweet and a bit sticky."], "parity": "E4", "build": "partial", **{"_club": 1}},
 "calm_tea": {"name": "Calm Tea",''')
s=s.replace('**{"_club": 1}','"sold_by": "unplaced_npcs.rebel_bartender", "effect": "pending: feed / small heal, Coder sets", "note": "proposed item id (no World id yet); juice-bar rule: juice, tea and shakes only"')
open(p,'w').write(s)
n='/workspace/kilumen/text/NAME_CHECK.md'; t=open(n).read(); t=t.replace('| Rest Drops / Tonics / Clear Salts |','| Rest Drops / Remedies / Clear Salts |'); open(n,'w').write(t)
