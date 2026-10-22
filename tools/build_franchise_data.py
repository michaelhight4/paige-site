# Generates data/franchise.json: owned-team data (per-sport fictional team sets, per-sport stat sets, team types, stadium sizes/tiers, staff roles).
import json
cities = {
 'soccer': ['Harbor', 'Riverside', 'Northgate', 'Lakeshore', 'Bayview', 'Foxhall', 'Granite', 'Cedar', 'Stonebridge', 'Westmere', 'Alder', 'Kingsport'],
 'basketball': ['Summit', 'Redwood', 'Copper', 'Silver', 'Ironwood', 'Skyline', 'Eastgate', 'Maple', 'Crescent', 'Driftwood', 'Highland', 'Vale'],
 'football': ['Bedrock', 'Thunder Ridge', 'Fort Hale', 'Prairie', 'Clayton', 'Ashford', 'Mesa', 'Dunmore', 'Black Hollow', 'Rockport', 'Gravel Bay', 'Oakfield'],
 'baseball': ['Orchard', 'Sandlot', 'Millbrook', 'Dockside', 'Pinecrest', 'Hartwell', 'Brookline', 'Cobalt', 'Tidewater', 'Amber', 'Larkspur', 'Ridgeway'],
 'hockey': ['Frostholm', 'Polar', 'Glacier', 'Northwind', 'Icebridge', 'Whitepine', 'Snowline', 'Arctic Bay', 'Stonefrost', 'Cold Harbor', 'Tundra', 'Winterfell'],
}
mascots = {
 'soccer': ['United', 'Athletic', 'Rovers', 'Wanderers', 'City', 'Albion', 'Town', 'Dynamo', 'Sporting', 'Real', 'Olympic', 'Victoria'],
 'basketball': ['Hoopsters', 'Dunkers', 'Aces', 'Flyers', 'Rim Riders', 'Swish', 'Skyhawks', 'Alley Cats', 'Jumpers', 'Bounce', 'Buzzers', 'Pivots'],
 'football': ['Gridiron Kings', 'Bulldozers', 'Stampede', 'Linebackers', 'Raiders', 'Ironmen', 'Blitz', 'Mustangs', 'Warhogs', 'Rams', 'Outlaws', 'Chargers'],
 'baseball': ['Sluggers', 'Pitchers', 'Diamonds', 'Hurlers', 'Bats', 'Catchers', 'Home Runs', 'Aces', 'Bleachers', 'Switch Hitters', 'Fielders', 'Pinstripes'],
 'hockey': ['Blades', 'Pucks', 'Zambonis', 'Icebreakers', 'Slapshots', 'Wolves', 'Frost', 'Goalies', 'Skaters', 'Penalty Box', 'Snowcats', 'Polar Bears'],
}
S = lambda i, n, ic, d: dict(id=i, name=n, icon=ic, desc=d)
stats = {
 'soccer': [S('attack', 'Attack', '🎯', 'Finishing and chances created'), S('defense', 'Defense', '🛡️', 'Marking and clean sheets'), S('passing', 'Passing', '🔁', 'Build-up and control'), S('stamina', 'Stamina', '🫁', 'Late goals and fewer injuries'), S('pace', 'Pace', '⚡', 'Counters and wide play'), S('keeper', 'Goalkeeping', '🧤', 'Saves and command')],
 'basketball': [S('shooting', 'Shooting', '🏀', 'Scoring from range'), S('passing', 'Passing', '🔁', 'Ball movement'), S('defense', 'Defense', '🛡️', 'Stops and steals'), S('rebound', 'Rebounding', '📦', 'Second chances'), S('athletic', 'Athleticism', '⚡', 'Pace and finishing'), S('iq', 'Basketball IQ', '🧠', 'Decisions')],
 'football': [S('passing', 'Passing', '🎯', 'Quarterback and receivers'), S('rushing', 'Rushing', '🏃', 'Ground game'), S('blocking', 'Blocking', '🧱', 'Protection and holes'), S('tackling', 'Tackling', '🛡️', 'Run defense'), S('coverage', 'Coverage', '🕸️', 'Pass defense'), S('special', 'Special teams', '🦵', 'Kicking and returns')],
 'baseball': [S('hitting', 'Hitting', '🏏', 'Contact and average'), S('power', 'Power', '💥', 'Home runs'), S('pitching', 'Pitching', '⚾', 'Starters and relievers'), S('fielding', 'Fielding', '🧤', 'Errors saved'), S('speed', 'Baserunning', '⚡', 'Steals and extra bases'), S('iq', 'Game IQ', '🧠', 'Situational play')],
 'hockey': [S('shooting', 'Shooting', '🏒', 'Goals'), S('skating', 'Skating', '⛸️', 'Speed and transition'), S('passing', 'Passing', '🔁', 'Playmaking'), S('defense', 'Defense', '🛡️', 'Blue line and checks'), S('goalie', 'Goaltending', '🧤', 'Saves'), S('grit', 'Grit', '💪', 'Physical play')],
}
presets = [dict(id='balanced', name='Balanced', w=None), dict(id='offense', name='Offence first', w='first3'), dict(id='defense', name='Defence first', w='last3')]
out = dict(version=1, sports={}, types=[
  dict(id='semi', name='Semi-pro club', icon='🥉', cost=28e6, strength=44, payroll=2.1, ticket=40, fans=6000, inc=28, staff=6, share=0.07, league='regional'),
  dict(id='pro', name='Professional club', icon='🥈', cost=280e6, strength=58, payroll=11.5, ticket=110, fans=22000, inc=230, staff=30, share=0.10, league='national'),
  dict(id='elite', name='Elite franchise', icon='🥇', cost=1500e6, strength=72, payroll=21, ticket=220, fans=48000, inc=800, staff=110, share=0.09, league='premier')],
 sizes=[dict(id='small', name='Small', cap=4000, cost=12e6), dict(id='medium', name='Medium', cap=14000, cost=80e6), dict(id='large', name='Large', cap=38000, cost=400e6), dict(id='mega', name='Mega', cap=75000, cost=1400e6)],
 tiers=[dict(id='basic', name='Basic', gate=1.0, upkeep=0.02, cost=0), dict(id='standard', name='Standard', gate=1.25, upkeep=0.03, cost=0.3), dict(id='premium', name='Premium', gate=1.6, upkeep=0.045, cost=0.7), dict(id='elite', name='Elite', gate=2.1, upkeep=0.06, cost=1.4)],
 roles=[
  dict(id='head_coach', name='Head coach', icon='📋', required=True, salary=150000, effect='performance', desc='Sets tactics: team performance'),
  dict(id='assistant', name='Assistant coach', icon='🧑‍🏫', required=False, salary=70000, effect='development', desc='Player development'),
  dict(id='scout', name='Scout / recruiter', icon='🔭', required=True, salary=80000, effect='recruiting', desc='Finds and signs better players, fills the roster'),
  dict(id='medic', name='Medical staff', icon='🩺', required=True, salary=90000, effect='injuries', desc='Fewer and shorter injuries'),
  dict(id='ops', name='Operations / front office', icon='🗂️', required=True, salary=100000, effect='finance', desc='Keeps costs down and contracts tidy'),
  dict(id='marketing', name='Marketing manager', icon='📣', required=False, salary=75000, effect='attendance', desc='Attendance, sponsors and merch')],
 presets=presets, weights=dict(min=0, max=10, total=30))
for sp in stats:
    out['sports'][sp] = dict(stats=stats[sp], teams=[dict(id=f'{sp}_{i}', name=f'{c} {m}', city=c) for i, (c, m) in enumerate(zip(cities[sp], mascots[sp]))])
json.dump(out, open('data/franchise.json', 'w'), indent=1, ensure_ascii=False); print('ok')
