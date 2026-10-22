#!/usr/bin/env python3
"""Regenerates data/events.json, diseases.json, crimes.json, ribbons.json, life.json from tools/ev/*.py and the research CSV/JSON.
The JSON files are the source of truth afterwards (edit them directly if you prefer); a fantasy-isekai reskin swaps these files."""
import json, sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from ev import a_childhood, b_school, c_social, d_adult, e_misc, f_extra
ROOT = os.path.join(os.path.dirname(__file__), '..'); R = '/workspace/lifesim_research/data/'
def w(name, obj): json.dump(obj, open(os.path.join(ROOT, 'data', name), 'w'), indent=1, ensure_ascii=False); print(name, len(obj) if hasattr(obj, '__len__') else '')

# ---------------- events ----------------
DROP = {'cond_hint', 'winflag'}
evs = []
for m in (a_childhood, b_school, c_social, d_adult, e_misc, f_extra): evs += m.EVENTS
ids = set()
for e in evs:
    assert e['id'] not in ids, e['id']; ids.add(e['id'])
    for c in e['choices']:
        for k in list(c):
            if k in DROP: del c[k]
            elif k.startswith('rel_') or k in ('stress',): c.setdefault('fx', {})[k] = c.pop(k)
        if 'winmoney' in c: c['win'] = {'money': c.pop('winmoney')}
        if 'raise_' in c: c['raise'] = c.pop('raise_')
        if isinstance(c['journal'], str): c['journal'] = [c['journal']]
        if 'fail' in c and isinstance(c['fail'].get('journal'), str): c['fail']['journal'] = [c['fail']['journal']]
        c.pop('minage', None)
for e in evs:  # chain targets must exist
    for c in e['choices']:
        if 'chain' in c: assert c['chain'][0] in ids, c['chain']; c['chain'] = {'id': c['chain'][0], 'in': [c['chain'][1], c['chain'][2]]}
w('events.json', evs)

# ---------------- diseases ----------------
rd = json.load(open(R + 'diseases.json'))
SEV = {  # w=weight, onset=health delta at onset, yearly=health/yr untreated, death=death/yr untreated, tdeath=death/yr treated, cure=cure chance per treatment, rem=self-remission/yr, cost=treatment
 'minor': dict(w=3.0, onset=-4, yearly=0, death=0, tdeath=0, cure=1.0, rem=0.8, cost=150),
 'serious': dict(w=0.5, onset=-8, yearly=-4, death=0.03, tdeath=0.005, cure=0.8, rem=0.3, cost=1800),
 'can_kill_if_untreated': dict(w=0.25, onset=-8, yearly=-6, death=0.08, tdeath=0.01, cure=0.9, rem=0.3, cost=900),
 'chronic': dict(w=0.7, onset=-4, yearly=-1.5, death=0.0, tdeath=0, cure=0.05, rem=0.0, cost=900, managed=-0.5),
 'chronic_harmless': dict(w=0.4, onset=0, yearly=0, death=0, tdeath=0, cure=0, rem=0, cost=0),
 'chronic_stress_linked': dict(w=0.6, onset=-4, yearly=-4, death=0.01, tdeath=0.003, cure=0.1, rem=0, cost=700, managed=-1, stress=1),
 'deadly': dict(w=0.10, onset=-16, yearly=-8, death=0.22, tdeath=0.07, cure=0.35, rem=0.02, cost=25000),
 'instant_death': dict(w=0.05, onset=0, yearly=0, death=0, tdeath=0, cure=0, rem=0, cost=0, instant=1),
}
AGES = {'childhood': (0, 14), 'aging': (55, 130), 'std': (15, 90), 'emotional': (10, 130), 'odd': (14, 120)}
SYMPTOM = {'viral': 'came down with', 'physical': 'developed', 'deadly': 'was diagnosed with', 'emotional': 'was struggling with', 'aging': 'began suffering from', 'std': 'tested positive for', 'odd': 'was somehow afflicted with', 'childhood': 'came down with'}
ds = []
for d in rd:
    sev = d['severity_class']
    if sev in ('no_cure_path', 'military_or_haunted_only', 'diet_only'): continue
    p = dict(SEV[sev]); lo, hi = AGES.get(d['category'], (0, 130))
    if d['id'] == 'menopause': lo, hi, p['w'] = 45, 60, 1.0
    if d['id'] in ('massive_heart_attack', 'heart_disease', 'alzheimers_disease', 'parkinsons_disease', 'cancer', 'dementia', 'hearing_loss', 'hair_loss'): lo = max(lo, 45)
    if d['id'] in ('erectile_dysfunction', 'vaginal_dryness', 'gynecomastia'): lo = 30
    if d['id'] in ('smallpox', 'bubonic_plague', 'ebola', 'mad_cow_disease', 'rabies', 'walking_corpse_syndrome', 'werewolf_syndrome', 'alien_hand_syndrome', 'sexsomnia', 'foreign_accent_syndrome', 'genital_retraction_syndrome', 'yellow_fever', 'typhoid_fever'): p['w'] = 0.02
    if d['category'] == 'std': p['w'] *= 0.25; p['std'] = 1
    if d['category'] == 'odd': p['w'] *= 0.2
    if d['id'] in ('cancer', 'heart_disease'): p['w'] = 0.6; p['death'] = 0.2
    ds.append({'id': d['id'], 'name': d['name'], 'cat': d['category'], 'sev': sev, 'ages': [lo, hi], 'verb': SYMPTOM.get(d['category'], 'developed'), **p})
w('diseases.json', ds)

# ---------------- crimes ----------------
T = [  # id, name, minAge, severity, catch, sentence(min,max yrs), loot, karma, journal ok, journal caught, menu, src (research row), cond
 ('shoplift', 'Shoplift', 8, 1, .25, (0.25, 1), (10, 200), -8, 'I shoplifted a few things and walked out like I owned the place.', 'I was caught shoplifting by a mall guard with a very small flashlight.', 1, 'pickpocket/shoplift/porch pirate/delinquent', None),
 ('burglary', 'Burglary', 10, 2, .35, (1, 4), (500, 6000), -16, 'I burgled a house and left with a television and a sense of purpose.', 'I was caught burgling a house while eating its cereal.', 1, 'burglary', None),
 ('gta', 'Grand Theft Auto', 14, 3, .40, (1, 5), (3000, 25000), -16, 'I stole a car and sold it to a man named Dave.', 'I was caught in a stolen car with a very loud radio.', 1, 'grand theft auto', None),
 ('resist', 'Resisting arrest', 8, 1, .9, (0.25, 1), (0, 0), -8, 'I resisted arrest and then un-resisted.', 'I resisted arrest and lost.', 0, 'delinquency (reckless endangerment/disorderly/mischief/piracy)', None),
 ('assault', 'Assault', 12, 2, .45, (0.5, 3), (0, 0), -16, 'I assaulted a man and he deserved it, mostly.', 'I was arrested for assault after a very public punch.', 0, 'delinquency (reckless endangerment/disorderly/mischief/piracy)', None),
 ('dui', 'Drunk driving', 18, 2, .35, (0.25, 2), (0, 0), -16, 'I drove drunk and made it home.', 'I was arrested for driving while very festive.', 0, 'DUI', None),
 ('drugs', 'Drug dealing', 14, 3, .30, (1, 8), (1000, 15000), -16, 'I sold drugs for a few weeks and made some money.', 'I was arrested for selling drugs to a man in a trench coat, who was a cop.', 1, 'drug trafficking/possession', None),
 ('embezzle', 'Embezzle from work', 18, 3, .30, (2, 8), (5000, 80000), -16, 'I embezzled from my employer and bought a boat I could not afford to tell anyone about.', 'I was caught embezzling by an accountant with a long memory.', 1, 'embezzle', {'job': 1}),
 ('bank', 'Rob a bank', 18, 4, .55, (5, 20), (20000, 250000), -30, 'I robbed a bank in a rubber mask and escaped on a rented scooter.', 'I robbed a bank and was caught in the parking lot trying to start a scooter.', 1, 'bank robbery', None),
 ('murder', 'Murder', 14, 5, .60, (20, 99), (0, 0), -30, 'I killed a man and told nobody.', 'I was arrested for murder and the evidence was a footprint and a note.', 1, 'murder', None),
 ('hitman', 'Hire a hitman', 18, 5, .50, (15, 99), (0, 0), -30, 'I paid a man to take care of a problem. He did.', 'I hired a hitman who turned out to be an undercover cop.', 0, 'hire hitman', None),
 ('extortion', 'Extortion', 18, 4, .45, (5, 10), (10000, 100000), -30, 'I extorted a local business owner and he paid on the first visit.', 'I was arrested for extortion after a very clear voicemail.', 0, 'extortion (mafia)', None),
 ('corruption', 'Corruption', 18, 4, .35, (10, 30), (50000, 500000), -30, 'I took a bribe from a developer and got a new dock.', 'I was arrested for corruption after a reporter checked my dock.', 0, 'corruption (politician)', {'minFame': 40}),
 ('securities', 'Securities fraud', 21, 4, .35, (4, 12), (100000, 2000000), -30, 'I cooked the books and made the quarter.', 'I was arrested for securities fraud, which was in the books.', 0, 'securities fraud (CEO cook the books)', {'biz': 1}),
 ('matchfix', 'Match fixing', 18, 3, .40, (2, 8), (20000, 200000), -16, 'I fixed a match and bought a slightly better yacht.', 'I was arrested for match fixing.', 0, 'match fixing', {'sportsOwner': 1}),
 ('casino', 'Defraud a casino', 18, 3, .45, (1, 5), (5000, 80000), -16, 'I cheated a casino and left in a very good mood.', 'I was arrested for defrauding a casino, and was banned for life.', 1, 'defraud casino', None),
]
cr = [{'id': t[0], 'name': t[1], 'minAge': t[2], 'severity': t[3], 'catch': t[4], 'sentence': list(t[5]), 'loot': list(t[6]), 'karma': t[7], 'ok': t[8], 'caught': t[9], 'menu': bool(t[10]), 'src': t[11], **({'if': t[12]} if t[12] else {})} for t in T]
tiers = [
 {'id': 'juvie', 'name': 'Juvenile Detention', 'maxYears': 4, 'escape': 0.30, 'healthLoss': 1, 'stress': 4, 'minAge': 0, 'maxAge': 17},
 {'id': 'minimum', 'name': 'Minimum security', 'maxSentence': 3, 'escape': 0.30, 'healthLoss': 1, 'stress': 4},
 {'id': 'medium', 'name': 'Medium security', 'maxSentence': 10, 'escape': 0.15, 'healthLoss': 2, 'stress': 8},
 {'id': 'maximum', 'name': 'Maximum security', 'maxSentence': 9999, 'escape': 0.05, 'healthLoss': 4, 'stress': 12}]
w('crimes.json', {'crimes': cr, 'tiers': tiers, 'rules': {'repeatMultiplier': 2, 'repeatCap': 4, 'paroleFraction': 0.34, 'juvieMaxYears': 4, 'escapeAddYears': 2, 'escapeMinTier': 'medium', 'appealCost': [2000, 10000, 40000], 'appealChance': [0.15, 0.3, 0.5], 'catchSmartsMod': 0.003, 'lifeSentence': 99}})

# ---------------- ribbons ----------------
RB = [  # id, name, icon, condition text (from research), rule (all/any of [var,op,val]) or None, locked reason
 ('wasteful', 'Wasteful', '🗑️', 'Surrender, execution <60, or negative net worth with avg(smarts,looks)>50', {'any': [['surrendered', '==', 1], ['all', [['nw', '<', 0], ['avgSL', '>', 50]]]]}, None),
 ('unlucky', 'Unlucky', '⚡', 'Die <30 from disease/terror; lightning at any age', {'any': [['cause', '==', 'lightning'], ['all', [['age', '<', 30], ['causeKind', 'in', ['disease', 'accident', 'war']]]]]}, None),
 ('geriatric', 'Geriatric', '🧓', 'Live to >=120', {'all': [['age', '>=', 120]]}, None),
 ('deadly', 'Deadly', '🗡️', 'Kill >=5 people', {'all': [['kills', '>=', 5]]}, None),
 ('houdini', 'Houdini', '🪄', 'Escape prison/juvie >=10 times', {'all': [['escapes', '>=', 10]]}, None),
 ('scandalous', 'Scandalous', '📰', 'Serve >=5 years in prison', {'all': [['prisonYears', '>=', 5]]}, None),
 ('jailbird', 'Jailbird', '🐦', 'Serve >=2 sentences', {'all': [['sentences', '>=', 2]]}, None),
 ('thief', 'Thief', '🥷', 'Theft score >=10', {'all': [['theft', '>=', 10]]}, None),
 ('wicked', 'Wicked', '😈', '5+ STD spreads / abandon child or pet', {'all': [['karma', '<=', 8], ['wickedActs', '>=', 3]]}, None),
 ('stupid', 'Stupid', '🥴', 'Smarts <10% lifelong, or die of drug overdose', {'any': [['maxSmarts', '<', 10], ['cause', '==', 'overdose']]}, None),
 ('addict', 'Addict', '💊', 'Die with >=2 addictions; lifetime gambling winnings <$1M', {'all': [['addictions', '>=', 2], ['gamblingWon', '<', 1e6]]}, None),
 ('highroller', 'Highroller', '🎰', 'Lifetime gambling winnings >= $1M', {'all': [['gamblingWon', '>=', 1e6]]}, 'needs casino/gambling feature'),
 ('loaded', 'Loaded', '💰', 'Net worth > $20M at death', {'all': [['nw', '>', 2e7]]}, None),
 ('rich', 'Rich', '💵', 'Net worth $2.5M-$20M', {'all': [['nw', '>=', 2.5e6], ['nw', '<=', 2e7]]}, None),
 ('fertile', 'Fertile', '👶', '2*children + grandchildren > 15', {'all': [['fertility', '>', 15]]}, None),
 ('lustful', 'Lustful', '💋', 'At least 20 sexual partners', {'all': [['partners', '>=', 20]]}, None),
 ('famous', 'Famous', '⭐', 'Fame-related career', {'all': [['maxFame', '>=', 70]]}, None),
 ('hero', 'Hero', '🦸', 'Intervene in SOS/save life or die nobly', {'all': [['heroActs', '>=', 1]]}, None),
 ('generous', 'Generous', '🎁', 'Gift >=30 items; avoid arguments', {'all': [['giftCount', '>=', 30]]}, None),
 ('lazy', 'Lazy', '🛋️', 'Reach 50+ never having a job; smarts >10', {'all': [['age', '>=', 50], ['jobYears', '==', 0], ['smarts', '>', 10]]}, None),
 ('academic', 'Academic', '🎓', 'Complete a postgraduate education', {'all': [['edu', '>=', 3]]}, 'needs postgraduate (Game dev education menu)'),
 ('familyguy', 'Family Guy', '👨‍👧', 'One spouse + >=2 kids; no prison; <8 kids; no Rich/Loaded', {'all': [['kids', '>=', 2], ['kids', '<', 8], ['spouses', '==', 1], ['sentences', '==', 0], ['nw', '<', 2.5e6]]}, None),
 ('successful', 'Successful', '🏆', 'Net worth >=250k, no prison, live >=65, no addictions, good karma', {'all': [['nw', '>=', 250000], ['sentences', '==', 0], ['age', '>=', 65], ['addictions', '==', 0], ['karma', '>', 50]]}, None),
 ('bigboss', 'Big Boss', '👔', 'Corporate ladder to CEO, net worth >$20M', {'all': [['nw', '>', 2e7], ['bizCount', '>=', 3]]}, None),
 ('mediocre', 'Mediocre', '😐', 'Ordinary life (fallback)', {'all': []}, None),
 ('barbie', 'Barbie Girl', '💅', 'Female; get nearly all plastic surgeries', None, 'needs plastic surgery menu'),
 ('catlady', 'Cat Lady', '🐈', 'Female; own >=30 cats', None, 'needs pets menu'),
 ('cunning', 'Cunning', '🕵️', 'Escape jail + gender reassignment, or undiscovered murders', None, 'needs special feature'),
 ('globetrotter', 'Globetrotter', '🌍', 'Visit/emigrate in >=20 countries', None, 'needs travel/emigration feature'),
 ('golddigger', 'Gold Digger', '💎', 'Never have a job; marry rich; >$1.5M from divorce/widowing', None, 'needs rich-spouse inheritance feature'),
 ('influencer', 'Influencer', '📱', 'Verified on all social platforms with ~1M followers', None, 'needs social media'),
 ('monopoly', 'Monopoly', '🏠', 'Sell >=10 houses for profit', None, 'needs property flipping'),
 ('mooch', 'Mooch', '🧲', 'Ask relationships for money >=10 times; never give', {'all': [['moochCount', '>=', 10], ['giftCount', '==', 0]]}, None),
 ('moviebuff', 'Movie Buff', '🎬', 'Watch >=20 movies at theater', None, 'needs cinema activity'),
 ('rowdy', 'Rowdy', '🍻', 'Club >=10 times, accept drugs/alcohol, party house', None, 'needs clubbing activity'),
 ('tarzan', 'Tarzan', '🦍', 'Male; own >=20 exotic pets', None, 'needs zoo/exotic pets'),
 ('veteran', 'Veteran', '🎖️', 'Military career to top rank', None, 'needs military career'),
 ('modelbitizen', 'Model Citizen (secret)', '😇', 'Perfect-karma life', {'all': [['karma', '>=', 90], ['giftCount', '>=', 10], ['nw', '>=', 50000]]}, None),
 ('teammate', 'Teammate (secret)', '🤝', 'Developer easter egg', None, 'secret'),
 ('bandit', 'Bandit (secret)', '🚂', 'Train robbery at the exact real-world time', None, 'needs real-time minigame'),
]
rb = [{'id': r[0], 'name': r[1], 'icon': r[2], 'desc': r[3], 'rule': r[4], 'locked': r[5], 'prio': i} for i, r in enumerate(RB)]
w('ribbons.json', rb)

# ---------------- life.json ----------------
def names(s): return s.split()
C0 = lambda id, name, hc, wealth, war, m, f, l, cities: {'id': id, 'name': name, 'health': hc, 'wealth': wealth, 'war': war, 'first': {'m': names(m), 'f': names(f)}, 'last': names(l), 'cities': cities}
countries = [
 C0('us', 'United States', 1.0, 1.0, 0.0, 'James Michael Robert Liam Ethan Noah Mason Logan Caleb Owen', 'Mary Emma Olivia Ava Sophia Chloe Grace Hannah Lily Zoe', 'Smith Johnson Williams Brown Miller Davis Wilson Moore Taylor Clark', ['Springfield', 'Austin', 'Denver', 'Portland']),
 C0('uk', 'United Kingdom', 1.05, 0.9, 0.0, 'Oliver George Harry Jack Alfie Oscar Archie Henry Arthur Freddie', 'Amelia Isla Poppy Ivy Florence Daisy Evie Rosie Ruby Millie', 'Taylor Evans Thomas Roberts Walker Wright Hughes Edwards Green Hall', ['Leeds', 'Bristol', 'Cardiff', 'Glasgow']),
 C0('jp', 'Japan', 1.2, 0.9, 0.0, 'Haruto Yuto Sota Ren Takumi Daiki Kenji Hiro Shun Ryo', 'Yui Hina Sakura Aoi Mio Rin Akari Mei Yuna Hana', 'Sato Suzuki Takahashi Tanaka Ito Watanabe Yamamoto Nakamura Kobayashi Kato', ['Osaka', 'Kyoto', 'Sapporo', 'Nagoya']),
 C0('de', 'Germany', 1.1, 0.9, 0.0, 'Lukas Felix Jonas Leon Paul Max Finn Elias Moritz Tobias', 'Mia Hannah Lena Lea Anna Clara Lotte Greta Emilia Johanna', 'Muller Schmidt Schneider Fischer Weber Meyer Wagner Becker Hoffmann Koch', ['Hamburg', 'Munich', 'Cologne', 'Leipzig']),
 C0('br', 'Brazil', 0.9, 0.5, 0.0, 'Miguel Arthur Heitor Davi Lucas Gabriel Rafael Pedro Caio Bruno', 'Helena Alice Laura Manuela Sofia Valentina Julia Livia Bia Camila', 'Silva Santos Oliveira Souza Costa Pereira Lima Almeida Ribeiro Carvalho', ['Recife', 'Salvador', 'Curitiba', 'Fortaleza']),
 C0('ng', 'Nigeria', 0.8, 0.3, 0.2, 'Chinedu Emeka Tunde Femi Ikenna Kunle Obinna Segun Ade Kelechi', 'Ngozi Amara Folake Adaeze Chioma Tolu Yetunde Bisi Funmi Ife', 'Okafor Adeyemi Balogun Eze Okonkwo Ibrahim Abubakar Nwosu Afolabi Bello', ['Lagos', 'Abuja', 'Enugu', 'Kano']),
 C0('in', 'India', 0.85, 0.35, 0.05, 'Arjun Aarav Vihaan Rohan Kabir Aditya Ishaan Rahul Karan Dev', 'Aanya Diya Ananya Priya Meera Kavya Isha Riya Sneha Tara', 'Sharma Patel Singh Kumar Gupta Reddy Iyer Nair Joshi Mehta', ['Pune', 'Jaipur', 'Chennai', 'Kolkata']),
 C0('mx', 'Mexico', 0.9, 0.5, 0.05, 'Santiago Mateo Diego Emiliano Leonardo Sebastian Joaquin Angel Luis Carlos', 'Sofia Valentina Ximena Camila Regina Renata Maria Fernanda Daniela Paola', 'Hernandez Garcia Martinez Lopez Gonzalez Perez Sanchez Ramirez Torres Flores', ['Puebla', 'Guadalajara', 'Merida', 'Oaxaca']),
 C0('fr', 'France', 1.1, 0.9, 0.0, 'Gabriel Louis Raphael Jules Adam Hugo Arthur Nathan Theo Leo', 'Louise Emma Jade Alice Chloe Lina Rose Anna Mia Camille', 'Martin Bernard Dubois Thomas Robert Richard Petit Durand Leroy Moreau', ['Lyon', 'Lille', 'Nantes', 'Marseille']),
 C0('ua', 'Ukraine', 0.85, 0.35, 0.6, 'Oleksandr Andriy Taras Bohdan Mykola Yuriy Dmytro Ivan Maksym Vasyl', 'Olena Natalia Oksana Iryna Kateryna Sofia Yulia Mariya Anna Tetiana', 'Shevchenko Kovalenko Bondarenko Tkachenko Kravchenko Melnyk Boyko Marchenko Lysenko Savchenko', ['Lviv', 'Odesa', 'Kharkiv', 'Dnipro']),
]
OCC = ['Teacher', 'Nurse', 'Plumber', 'Accountant', 'Electrician', 'Retail clerk', 'Lawyer', 'Software developer', 'Chef', 'Mechanic', 'Farmer', 'Postal worker', 'Dentist', 'Bartender', 'Carpenter', 'Librarian', 'Police officer', 'Pilot', 'Artist', 'Salesperson']
EDU = ['None', 'High school', 'College']
I = lambda id, label, minAge=0, **kw: {'id': id, 'label': label, 'minAge': minAge, **kw}
TALK = I('talk', 'Conversation', 3, bar=[2, 6], ok=['I had a conversation with {name} about {topic}.', 'I chatted with {name} about {topic} and nothing exploded.'])
SPEND = I('spend', 'Spend time', 3, bar=[4, 10], ok=['I spent an afternoon with {name} and we did not argue once.', 'I hung out with {name} and ate something unwise.'], happy=4)
GIFT = I('gift', 'Give a gift ($50)', 6, cost=50, bar=[6, 14], ok=['I gave {name} a gift and they pretended it was what they wanted.'], gift=1, karma=4)
COMP = I('compliment', 'Compliment', 5, bar=[2, 5], ok=['I complimented {name}, who was visibly suspicious.'], karma=4)
INSULT = I('insult', 'Insult', 5, bar=[-14, -6], ok=['I insulted {name}. It was effective and regrettable.'], karma=-8)
ARGUE = I('argue', 'Start an argument', 8, bar=[-12, -4], ok=['I started an argument with {name} about nothing in particular.'], karma=-4, stress=4)
MONEY = I('askmoney', 'Ask for money', 12, chance='rich', ok=['I asked {name} for money and received {amount}.'], fail=['I asked {name} for money and received a lecture.'], mooch=1, bar=[-4, -2])
interactions = {
 'mother': [TALK, SPEND, GIFT, COMP, INSULT, ARGUE, MONEY, I('hug', 'Hug', 0, bar=[2, 6], ok=['I hugged my mother. She held on a little too long.'])],
 'father': [TALK, SPEND, GIFT, COMP, INSULT, ARGUE, MONEY, I('hug', 'Hug', 0, bar=[2, 6], ok=['I hugged my father, who patted my back twice.'])],
 'sibling': [TALK, SPEND, GIFT, COMP, INSULT, ARGUE, I('prank', 'Prank', 4, bar=[-4, 8], ok=['I pranked {name} with a bucket and a lot of patience.'], karma=-4)],
 'friend': [TALK, SPEND, GIFT, COMP, INSULT, ARGUE, MONEY, I('party', 'Go out together ($40)', 14, cost=40, bar=[4, 10], happy=8, ok=['I went out with {name} and we stayed out too late.'])],
 'partner': [TALK, SPEND, GIFT, COMP, INSULT, ARGUE, I('romance', 'Romantic night ($100)', 16, cost=100, bar=[6, 14], happy=8, ok=['I had a romantic night with {name}. It was candlelit and mostly fine.']),
             I('propose', 'Propose', 18, special='propose', ok=['I proposed to {name} and they said yes.'], fail=['I proposed to {name}. They said they needed time.']),
             I('moveIn', 'Move in together', 18, special='moveIn', ok=['I moved in with {name} and learned about their socks.']),
             I('breakup', 'Break up', 12, special='breakup', ok=['I broke up with {name}. We shared a cry.'])],
 'spouse': [TALK, SPEND, GIFT, COMP, INSULT, ARGUE, I('romance', 'Romantic night ($100)', 18, cost=100, bar=[6, 14], happy=8, ok=['I had a romantic evening with {name}. It was nice.']),
            I('baby', 'Try for a baby', 18, special='baby', ok=['I tried for a baby with {name}.']),
            I('divorce', 'Divorce', 18, special='divorce', ok=['I divorced {name}. A lawyer got rich.']),
            I('affair', 'Cheat', 18, special='cheat', ok=['I cheated on {name}. I felt guilty for several minutes.'])],
 'ex': [TALK, I('reconcile', 'Get back together', 16, special='reconcile', chance='bar', ok=['I got back together with {name}. We both knew better.'], fail=['I asked {name} to get back together. They did not.']), INSULT],
 'child': [TALK, SPEND, GIFT, COMP, I('scold', 'Scold', 3, bar=[-12, -3], ok=['I scolded {name} about {topic}.'], karma=-4),
           I('allowance', 'Give an allowance ($100)', 5, cost=100, bar=[4, 10], ok=['I gave {name} an allowance and received a tiny salute.'], gift=1),
           I('tuck', 'Read a story', 0, bar=[2, 8], ok=['I read {name} a story about a very patient bear.'], karma=4)],
 'coworker': [TALK, SPEND, GIFT, COMP, INSULT, I('suckup', 'Suck up', 18, perf=4, bar=[-2, 6], ok=['I sucked up to {name} and it worked, which was gross.']), I('sabotage', 'Sabotage', 18, perf=-8, bar=[-12, -4], karma=-16, ok=['I sabotaged {name}. I hid their stapler.']),
              I('flirt', 'Flirt', 18, special='flirt', chance='bar', ok=['I flirted with {name} at the printer.'], fail=['I flirted with {name} and was reported to HR.'])],
}
topics = ['the weather', 'a very good sandwich', 'politics, regrettably', 'a documentary about ants', 'their feelings', 'the neighbors', 'a dream they had', 'taxes', 'a band nobody knows']
life = {
 'title': 'LifeSim',
 'labels': {'happiness': 'Happiness', 'health': 'Health', 'smarts': 'Smarts', 'looks': 'Looks', 'fame': 'Fame', 'karma': 'Karma', 'crazy': 'Craziness', 'stress': 'Stress',
            'job': 'Job', 'assets': 'Assets', 'relationships': 'Relationships', 'activities': 'Activities', 'age': 'Age', 'year': 'Year', 'journal': 'Journal',
            'surrender': 'Surrender', 'ribbon': 'Ribbon', 'doctor': 'Doctor', 'prison': 'Prison', 'cemetery': 'Cemetery', 'legacy': 'Family Legacy', 'will': 'Will'},
 'bars': {'main': ['happiness', 'health', 'smarts', 'looks'], 'extra': ['fame'], 'hidden': ['karma', 'crazy', 'stress'], 'inverted': ['stress', 'crazy'], 'bands': {'green': 31, 'orange': 13}},
 'startYear': 2026, 'startAge': {'normal': 0, 'sandbox': 25}, 'eventScale': 0.6, 'stepSizes': [4, 8, 16, 30],
 'countries': countries, 'genders': ['m', 'f'], 'occupations': OCC, 'educations': EDU, 'topics': topics, 'places': ['the park', 'the mall', 'school', 'the bus stop', 'a diner', 'the library', 'the gym'],
 'relTypes': {'mother': 'Mother', 'father': 'Father', 'sibling': 'Sibling', 'friend': 'Friend', 'partner': 'Partner', 'spouse': 'Spouse', 'ex': 'Ex', 'child': 'Child', 'coworker': 'Coworker'},
 'interactions': interactions,
 'dating': {'minAge': 14, 'marryMinAge': 18, 'candidates': 3, 'bar': 50, 'barDecayPerYear': {'friend': 4, 'sibling': 1, 'coworker': 3, 'partner': 2, 'spouse': 2, 'mother': 1, 'father': 1, 'ex': 3, 'child': 0}, 'breakupBar': 15, 'divorceCostFrac': 0.25, 'babyChance': 0.35, 'randomBirth': 0.1},
 'people': {'friendsPerYear': 0.35, 'friendMax': 8, 'coworkers': 3, 'siblingsMax': 3, 'parentAgeAtBirth': [19, 38], 'cashByWealth': [3000, 400000]},
 'health': {'baseHazard': 0.00006, 'ageRate': 0.095, 'healthFloor': 0.3, 'infantExtra': 0.004, 'accidentBase': 0.0009, 'accidentYoungBoost': 2.0, 'stressHazard': 0.004, 'diseaseBase': 0.18, 'fitDecay': 0.5,
           'lifestyle': {'smoker': 0.5, 'drinker': 0.25, 'drugs': 0.9}, 'lightning': 4e-7, 'murder': 0.00008, 'warScale': 0.012, 'decay': {'start': 38, 'perYear': 0.5, 'accel': 0.035},
           'doctor': {'cost': 250, 'fx': 8, 'minAge': 4, 'treatMult': {'minor': 1, 'serious': 1, 'can_kill_if_untreated': 1, 'chronic': 1, 'deadly': 1}}},
 'death': {
   'accidents': [{'id': 'car', 'w': 4, 'text': 'a car accident', 'min': 16}, {'id': 'fall', 'w': 3, 'text': 'a fall down the stairs', 'min': 0}, {'id': 'drowning', 'w': 2, 'text': 'drowning', 'min': 3}, {'id': 'fire', 'w': 1.5, 'text': 'a house fire', 'min': 0},
                 {'id': 'choking', 'w': 1.5, 'text': 'choking on a grape', 'min': 0}, {'id': 'hike', 'w': 1, 'text': 'a hiking accident', 'min': 10}, {'id': 'work', 'w': 1.5, 'text': 'a workplace accident', 'min': 16, 'needsJob': 1}, {'id': 'piano', 'w': 0.2, 'text': 'a falling piano', 'min': 0}],
   'kinds': {'old': 'old age', 'disease': 'illness', 'accident': 'accident', 'murder': 'murder', 'war': 'war', 'overdose': 'overdose', 'prison': 'prison', 'surrender': 'surrender', 'lightning': 'lightning'},
   'epitaphs': ['Gone, but only from here.', 'Told you I was sick.', 'Rest in peace. Finally.', 'He was nice to a dog once.', 'Her last words were "hold my drink".', 'Bulldoze at your own risk.', 'Brief but eventful.', 'At least the taxes are over.', 'Born. Lived. Left a mess.', 'I did it my way, mostly.'],
   'obit': {'old': '{name} died peacefully at the age of {age}, surrounded by {surround}. {job} {kids}', 'disease': '{name} died at the age of {age} after a long battle with {cause}. {job} {kids}', 'accident': '{name} died at the age of {age} in {cause}. {job} {kids}',
            'murder': '{name} was murdered at the age of {age}. Police have a suspect and a vague sense of hope. {job} {kids}', 'war': '{name} died at the age of {age} amid the conflict in {country}. {job} {kids}', 'overdose': '{name} died of an overdose at the age of {age}. {job} {kids}',
            'prison': '{name} died in prison at the age of {age}. {job} {kids}', 'surrender': '{name} gave up on life at the age of {age}. {job} {kids}', 'lightning': '{name} was struck by lightning at the age of {age}. The sky was not available for comment. {job} {kids}'},
   'surround': ['family', 'loved ones', 'a confused cat', 'nurses who had never met them', 'reruns']},
 'estate': {'exempt': 2000000, 'rate': 0.4, 'auctionRate': 0.85, 'minOwnerAge': 18, 'bizSaleRate': 0.9, 'auctionKinds': ['car', 'house', 'boat', 'plane'], 'lawyerFee': 0.0, 'willModes': ['even', 'one']},
 'legacy': {'continueStartHappyHit': 8, 'maxGenerationsShown': 50},
 'journal': {
   'ageHeader': 'Age {age}: {year}', 'born': ['I was born in {city}, {country}. My name is {name}. I weigh seven pounds and have strong opinions.'], 'sandboxStart': ['I started the story at age 25 with a bank account and a plan.'],
   'yearJob': ['I worked as a {job} and earned {pay}.', 'I spent the year as a {job}, which paid {pay}.'], 'yearNoJob': ['I did not have a job this year.', 'I spent the year between jobs and most of it on the couch.'],
   'yearBiz': ['My {biz} made {profit} and {mood}.', '{biz} {mood}, ending the year at {profit}.'], 'bizGood': ['I did not have to check the books twice'], 'bizBad': ['I checked the books twice and wished I had not'],
   'yearProp': ['My {asset} was worth {value} by the end of the year.', 'I owned {asset}, which was worth {value}.'], 'yearHealth': {'low': ['My health was a concern.', 'I coughed more than I would like to admit.'], 'high': ['I felt strong this year.']},
   'yearSchool': ['I went to {school}.'], 'yearSport': ['I played {sport}: {line}'], 'yearPrison': ['I spent the year in {tier}.'],
   'yearBirthday': ['I turned {age}.'], 'death': ['I died at age {age} of {cause}.']},
 'school': {'stages': {'primary': 'Elementary', 'high': 'High school', 'college': 'College'}, 'sportAges': {'elementary': [6, 11], 'high': [12, 17], 'college': [18, 21]}},
 'sports': {'list': [
   {'id': 'basketball', 'name': 'Basketball', 'icon': '🏀', 'stats': ['ppg', 'rpg', 'apg'], 'pro': True, 'base': {'ppg': 8, 'rpg': 4, 'apg': 3}},
   {'id': 'soccer', 'name': 'Soccer', 'icon': '⚽', 'stats': ['goals', 'assists', 'saves'], 'pro': False, 'base': {'goals': 4, 'assists': 3, 'saves': 1}},
   {'id': 'football', 'name': 'Football', 'icon': '🏈', 'stats': ['yards', 'tds', 'tackles'], 'pro': False, 'base': {'yards': 400, 'tds': 4, 'tackles': 20}},
   {'id': 'baseball', 'name': 'Baseball', 'icon': '⚾', 'stats': ['avg', 'hr', 'rbi'], 'pro': False, 'base': {'avg': .250, 'hr': 4, 'rbi': 20}},
   {'id': 'track', 'name': 'Track & Field', 'icon': '🏃', 'stats': ['best100', 'medals'], 'pro': False, 'base': {'best100': 14.0, 'medals': 0}},
   {'id': 'swimming', 'name': 'Swimming', 'icon': '🏊', 'stats': ['best100', 'medals'], 'pro': False, 'base': {'best100': 70.0, 'medals': 0}}],
   'skillGrowth': 4.0, 'healthWeight': 0.25, 'draft': {'minSkill': 55, 'round1': 78, 'round2': 64, 'ovrBase': 36, 'ovrScale': 0.42, 'rookieAge': 21, 'scholarshipSkill': 62, 'proMinSkill': 50},
   'teamNamesSchool': ['Eagles', 'Wolves', 'Bears', 'Falcons', 'Knights', 'Titans']},
 'activities': [
   {'id': 'gym', 'name': 'Gym', 'min': 12, 'cost': 300, 'fx': {'health': 8, 'looks': 4}, 'fit': 1}, {'id': 'meditate', 'name': 'Meditate', 'min': 8, 'cost': 0, 'fx': {'happy': 4, 'stress': -8}},
   {'id': 'library', 'name': 'Library', 'min': 6, 'cost': 0, 'fx': {'smarts': 4}}, {'id': 'vacation', 'name': 'Vacation ($2,000)', 'min': 8, 'cost': 2000, 'fx': {'happy': 8, 'stress': -16}},
   {'id': 'doctor', 'name': 'Doctor', 'min': 4, 'special': 'doctor'}, {'id': 'cosmetic', 'name': 'Cosmetic care ($5,000)', 'min': 16, 'cost': 5000, 'fx': {'looks': 8}},
   {'id': 'social', 'name': 'Socialize ($100)', 'min': 5, 'cost': 100, 'fx': {'happy': 4}}, {'id': 'study', 'name': 'Study', 'min': 5, 'cost': 0, 'fx': {'smarts': 4, 'happy': -4}},
   {'id': 'work', 'name': 'Work extra hard', 'min': 16, 'cost': 0, 'fx': {'happy': -4, 'perf': 8}, 'needsJob': 1},
   {'id': 'volunteer', 'name': 'Volunteer', 'min': 10, 'cost': 0, 'fx': {'karma': 8, 'happy': 4}}],
 'meta': {'cemeteryMax': 200}
}
w('life.json', life)
