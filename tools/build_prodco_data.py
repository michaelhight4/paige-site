# Generates data/prodco.json (production companies: label/film/tv/game). Idempotent: python3 tools/build_prodco_data.py
import json
M = {
 'music': dict(name='Record Label', word='Records', icon='🎵', unit='album', unitPlural='albums', found=150000, years=1, tiers=[40000,150000,500000,1500000],
   genres=[('pop','Pop','🎤'),('rock','Rock','🎸'),('hiphop','Hip-hop','🎧'),('country','Country','🤠'),('electronic','Electronic','🎛️'),('rnb','R&B','💜'),('latin','Latin','💃'),('indie','Indie','🌿')],
   roles=[('ar','A&R scout','🔎'),('producer','Producer','🎚️'),('marketing','Marketing lead','📣'),('engineer','Sound engineer','🎙️')], genreSource='local'),
 'film': dict(name='Film Studio', word='Pictures', icon='🎬', unit='film', unitPlural='films', found=600000, years=2, tiers=[300000,1200000,5000000,20000000],
   genres=None, roles=[('director','Director','🎥'),('writer','Screenwriter','✍️'),('producer','Line producer','📋'),('editor','Editor','✂️')], genreSource='studio'),
 'tv': dict(name='TV Studio', word='Television', icon='📺', unit='show', unitPlural='shows', found=400000, years=1, tiers=[200000,800000,3000000,10000000],
   genres=None, roles=[('showrunner','Showrunner','📺'),('writer','Writers room lead','✍️'),('producer','Producer','📋'),('editor','Post lead','✂️')], genreSource='studio'),
 'game': dict(name='Game Studio', word='Interactive', icon='🎮', unit='game', unitPlural='games', found=300000, years=2, tiers=[100000,500000,2500000,12000000],
   genres=None, roles=[('lead','Lead developer','⌨️'),('designer','Game designer','🧩'),('artist','Art lead','🎨'),('audio','Audio & QA lead','🎧')], genreSource='studio'),
}
out = {'version': 1, 'media': {}, 'tiers': [
  {'id': 'small', 'label': 'Small', 'icon': '🌱', 'scale': 0, 'risk': 0.16, 'mean': 1.9, 'bonus': 0.0, 'repNeed': 0},
  {'id': 'mid', 'label': 'Mid-budget', 'icon': '🌿', 'scale': 1, 'risk': 0.2, 'mean': 2.0, 'bonus': 0.25, 'repNeed': 10},
  {'id': 'big', 'label': 'Big budget', 'icon': '🌳', 'scale': 2, 'risk': 0.27, 'mean': 2.1, 'bonus': 0.5, 'repNeed': 30},
  {'id': 'blockbuster', 'label': 'Blockbuster', 'icon': '🏆', 'scale': 3, 'risk': 0.34, 'mean': 2.3, 'bonus': 0.8, 'repNeed': 55}],
 'labels': [[0, 'Flop'], [4.5, 'Miss'], [6, 'Solid'], [7.5, 'Hit'], [9, 'Blockbuster']],
 'scandals': ['was caught in a late-night brawl', 'posted something awful online', 'is accused of plagiarism', 'was photographed at a shady party', 'walked out mid-production', 'is in a nasty contract dispute'],
 'firsts': ['Marcus','Elena','Dre','Priya','Tomas','Aiko','Jonah','Sofia','Kofi','Lena','Rafael','Mina','Omar','Ivy','Hugo','Zara','Nico','Tess'],
 'lasts': ['Vale','Okoye','Ray','Sen','Moreau','Tanaka','Lindqvist','Reyes','Banks','Novak','Adeyemi','Kline','Rossi','Park','Hale','Duarte'],
 'artistWords': ['Neon','Velvet','Static','Paper','Echo','Rivers','Atlas','Sunday','Glass','Wolves','Honey','Orbit'],
 'studios': ['Skyline','Blue Door','Ironbridge','Lumen','Paper Moon','Northstar','Kestrel','Harbor Light','Red Kite','Foxglove'],
 'crewWage': {'base': 8000, 'perSkill': 350, 'signFrac': 0.25}, 'overhead': 20000}
for k, v in M.items():
    out['media'][k] = {'name': v['name'], 'word': v['word'], 'icon': v['icon'], 'unit': v['unit'], 'unitPlural': v['unitPlural'], 'found': v['found'], 'years': v['years'], 'tiers': v['tiers'],
        'genres': [{'id': g[0], 'name': g[1], 'icon': g[2]} for g in v['genres']] if v['genres'] else None, 'genreSource': v['genreSource'], 'roles': [{'id': r[0], 'name': r[1], 'icon': r[2]} for r in v['roles']]}
json.dump(out, open('data/prodco.json', 'w'), indent=1, ensure_ascii=False)
print('ok prodco data')
