# Generates data/hardware.json: fictional console makers (4 major + 2 minor at any time), each with one home console and one handheld, plus a pool of
# replacement makers that enter after a bankruptcy. Idempotent: python3 tools/build_hardware_data.py
import json
P = {}  # product id -> def
def prod(id, name, maker, kind, icon, color, blurb): P[id] = dict(id=id, name=name, maker=maker, kind=kind, icon=icon, color=color, blurb=blurb)
# existing four (kept in studio_data.json as c_nova, c_aegis, c_lumen, c_pixie)
prod('c_nova', 'Novabox 4', 'Orbital Works', 'home', '🟦', '#4aa3ff', 'Incumbent powerhouse.')
prod('c_aegis', 'Aegis Core', 'Shieldline', 'home', '🟥', '#ff6b6b', 'Steady and loyal fanbase.')
prod('c_lumen', 'Lumen Go', 'Brightfold', 'handheld', '🟨', '#ffd24a', 'Handheld, rising fast.')
prod('c_pixie', 'Pixie One', 'Tinyforge', 'home', '🟪', '#b784ff', 'Indie darling, cheap.')
prod('c_novago', 'Novabox Go', 'Orbital Works', 'handheld', '🟦', '#4aa3ff', 'The big handheld sibling.')
prod('c_aegismini', 'Aegis Mini', 'Shieldline', 'handheld', '🟥', '#ff6b6b', 'Pocket-sized and rugged.')
prod('c_lumenhome', 'Lumen Home', 'Brightfold', 'home', '🟨', '#ffd24a', 'A living-room console at last.')
prod('c_pixiepocket', 'Pixie Pocket', 'Tinyforge', 'handheld', '🟪', '#b784ff', 'Cheap, cheerful and tiny.')
prod('c_kodama', 'Kodama Station', 'Kodama Systems', 'home', '🟩', '#4cc38a', 'Minor player with a cult following.')
prod('c_kodamatap', 'Kodama Tap', 'Kodama Systems', 'handheld', '🟩', '#4cc38a', 'Touch-first handheld.')
prod('c_nwarc', 'Northwind Arc', 'Northwind Interactive', 'home', '⬜', '#9fb8d6', 'Quiet and experimental.')
prod('c_nwspark', 'Northwind Spark', 'Northwind Interactive', 'handheld', '⬜', '#9fb8d6', 'Tiny screen, big ideas.')
makers = [
 dict(id='m_orbital', name='Orbital Works', color='#4aa3ff', icon='🟦', home='c_nova', hand='c_novago', health=72),
 dict(id='m_shield', name='Shieldline', color='#ff6b6b', icon='🟥', home='c_aegis', hand='c_aegismini', health=68),
 dict(id='m_bright', name='Brightfold', color='#ffd24a', icon='🟨', home='c_lumenhome', hand='c_lumen', health=62),
 dict(id='m_tiny', name='Tinyforge', color='#b784ff', icon='🟪', home='c_pixie', hand='c_pixiepocket', health=58),
 dict(id='m_kodama', name='Kodama Systems', color='#4cc38a', icon='🟩', home='c_kodama', hand='c_kodamatap', health=45),
 dict(id='m_northwind', name='Northwind Interactive', color='#9fb8d6', icon='⬜', home='c_nwarc', hand='c_nwspark', health=42)]
start = {'c_novago': (10, 0.01, 2), 'c_aegismini': (8, 0.0, 2), 'c_lumenhome': (9, 0.02, 1), 'c_pixiepocket': (6, 0.04, 0), 'c_kodama': (5, 0.03, 1), 'c_kodamatap': (3, 0.04, 1), 'c_nwarc': (4.5, 0.02, 1), 'c_nwspark': (2.5, 0.03, 0)}
pool = [('Vektor Labs', '🔷', '#5ad1e6', 'Vektor One', 'Vektor Lite'), ('Mochi Games', '🍡', '#ff9ccf', 'Mochi Box', 'Mochi Pop'), ('Ironclad Digital', '⬛', '#8a8f9c', 'Ironclad X', 'Ironclad Edge'),
        ('Sunrise Works', '🟧', '#ff9a3c', 'Sunrise Dock', 'Sunrise Dot'), ('Halcyon Entertainment', '🟫', '#c9a37a', 'Halcyon Prime', 'Halcyon Flip'), ('Quanta Play', '🔶', '#f5c542', 'Quanta Q', 'Quanta Mini'),
        ('Basalt Interactive', '🔳', '#6b7280', 'Basalt Hub', 'Basalt Slate'), ('Fennec Systems', '🦊', '#e8743b', 'Fennec Den', 'Fennec Cub')]
poolOut = []
for i, (mk, ic, col, h, hd) in enumerate(pool):
    hid, did = f'c_r{i}_home', f'c_r{i}_hand'
    prod(hid, h, mk, 'home', ic, col, 'A new challenger.'); prod(did, hd, mk, 'handheld', ic, col, 'A new challenger handheld.')
    poolOut.append(dict(id=f'm_r{i}', name=mk, color=col, icon=ic, home=hid, hand=did))
out = dict(version=1, products=P, makers=makers, start={k: dict(mind=v[0], drift=v[1], age=v[2]) for k, v in start.items()}, pool=poolOut,
  balance=dict(majors=4, minors=2, fairShare=100 / 6, bankruptHealth=0, healthPerShare=0.4, noise=4, replaceMin=1, replaceMax=2, newHome=7, newHand=4, minorNewHome=5, minorNewHand=3, bankruptCooldown=2))
json.dump(out, open('data/hardware.json', 'w'), indent=1, ensure_ascii=False)
print('ok hardware data', len(P), 'products')
