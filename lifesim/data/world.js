// Static world data: sectors, careers, assets, business types, stocks, events.
export const sectors = [
  { id: 'food', name: 'Food & Grocery' }, { id: 'retail', name: 'Retail' },
  { id: 'tech', name: 'Technology' }, { id: 'media', name: 'Sports & Media' },
  { id: 'realestate', name: 'Real Estate' }, { id: 'transport', name: 'Transport' },
];

export const macroEvents = [
  { name: 'Economic Boom', all: 6, turns: 3, text: 'Consumers are spending freely.' },
  { name: 'Recession', all: -7, turns: 4, text: 'A recession hits every sector.' },
  { name: 'Tech Bubble', sector: 'tech', delta: 12, turns: 3, text: 'Tech valuations soar.' },
  { name: 'Tech Crash', sector: 'tech', delta: -14, turns: 3, text: 'Tech stocks tumble.' },
  { name: 'Housing Crash', sector: 'realestate', delta: -15, turns: 4, text: 'Property prices slide.' },
  { name: 'Housing Boom', sector: 'realestate', delta: 10, turns: 3, text: 'Property is hot.' },
  { name: 'Fuel Price Spike', sector: 'transport', delta: -10, turns: 3, text: 'Fuel costs hammer transport.' },
  { name: 'Food Safety Scandal', sector: 'food', delta: -18, turns: 2, text: 'A food safety scare scares shoppers.' },
  { name: 'Retail Boom', sector: 'retail', delta: 10, turns: 3, text: 'Holiday-style spending spree.' },
  { name: 'Streaming Wars', sector: 'media', delta: 10, turns: 3, text: 'Studios and sports rights are in demand.' },
  { name: 'Sports Betting Scandal', sector: 'media', delta: -15, turns: 2, text: 'Scandal rocks sports and media.' },
];

// edu: 0 none, 1 high school, 2 college
export const careers = [
  { id: 'fastfood', name: 'Fast Food', sector: 'food', edu: 0, smarts: 0, minAge: 16, levels: [['Crew Member', 24000], ['Shift Lead', 31000], ['Store Manager', 46000], ['Area Director', 80000]] },
  { id: 'retail', name: 'Retail', sector: 'retail', edu: 0, smarts: 0, minAge: 16, levels: [['Clerk', 26000], ['Supervisor', 36000], ['Store Manager', 55000], ['Regional VP', 110000]] },
  { id: 'driver', name: 'Trucking & Logistics', sector: 'transport', edu: 0, smarts: 20, minAge: 18, levels: [['Driver', 38000], ['Senior Driver', 50000], ['Dispatcher', 65000], ['Fleet Manager', 95000]] },
  { id: 'agent', name: 'Real Estate', sector: 'realestate', edu: 1, smarts: 40, minAge: 18, levels: [['Assistant', 35000], ['Agent', 60000], ['Broker', 110000], ['Managing Broker', 200000]] },
  { id: 'media', name: 'Media & Entertainment', sector: 'media', edu: 0, smarts: 0, looks: 55, minAge: 18, levels: [['Extra', 20000], ['Presenter', 55000], ['Host', 140000], ['Star', 500000]] },
  { id: 'swe', name: 'Software Engineering', sector: 'tech', edu: 2, smarts: 60, minAge: 21, levels: [['Junior Dev', 85000], ['Developer', 115000], ['Senior Dev', 160000], ['Staff Engineer', 230000], ['Director', 330000]] },
  { id: 'finance', name: 'Finance', sector: 'tech', edu: 2, smarts: 65, minAge: 21, levels: [['Analyst', 80000], ['Associate', 120000], ['VP', 200000], ['Partner', 500000]] },
  { id: 'medicine', name: 'Medicine', sector: null, edu: 2, smarts: 75, minAge: 24, levels: [['Resident', 60000], ['Physician', 180000], ['Specialist', 320000], ['Chief of Medicine', 450000]] },
];

export const assetCatalog = [
  { id: 'hatch', kind: 'car', name: 'Used Hatchback', price: 6000, upkeep: 1500, dep: 0.15, joy: 1 },
  { id: 'sedan', kind: 'car', name: 'Family Sedan', price: 30000, upkeep: 2500, dep: 0.13, joy: 2 },
  { id: 'sports', kind: 'car', name: 'Sports Car', price: 95000, upkeep: 5000, dep: 0.12, joy: 4 },
  { id: 'super', kind: 'car', name: 'Supercar', price: 350000, upkeep: 12000, dep: 0.08, joy: 8 },
  { id: 'apt', kind: 'house', name: 'Studio Apartment', price: 150000, upkeep: 4000, dep: -0.03, joy: 1 },
  { id: 'suburb', kind: 'house', name: 'Suburban House', price: 400000, upkeep: 9000, dep: -0.03, joy: 3 },
  { id: 'penthouse', kind: 'house', name: 'Penthouse', price: 1500000, upkeep: 30000, dep: -0.03, joy: 6 },
  { id: 'mansion', kind: 'house', name: 'Mansion', price: 6000000, upkeep: 90000, dep: -0.03, joy: 10 },
  { id: 'dinghy', kind: 'boat', name: 'Fishing Dinghy', price: 12000, upkeep: 1200, dep: 0.08, joy: 2 },
  { id: 'speedboat', kind: 'boat', name: 'Speedboat', price: 90000, upkeep: 8000, dep: 0.1, joy: 5 },
  { id: 'yacht', kind: 'boat', name: 'Yacht', price: 1200000, upkeep: 120000, dep: 0.07, joy: 9 },
  { id: 'prop', kind: 'plane', name: 'Used Prop Plane', price: 220000, upkeep: 25000, dep: 0.05, joy: 5 },
  { id: 'jet', kind: 'plane', name: 'Private Jet', price: 8000000, upkeep: 600000, dep: 0.06, joy: 12 },
];

// kind: shop | studio | sports.  cap = annual units; seats = staff supported (studios).
export const bizTypes = {
  coffee: { kind: 'shop', name: 'Coffee Shop', sector: 'food', fee: 3000, ticket: 5.5, cogs: 0.28, rent: 26000, baseDemand: 70000, unit: 'customers',
    equip: [{ id: 'espresso', name: 'Espresso Machine', cost: 9000, cap: 30000, starter: 1 }, { id: 'seating', name: 'Counter & Seating', cost: 6000, cap: 25000, starter: 1 }, { id: 'roaster', name: 'Roaster', cost: 22000, cap: 40000 }],
    roles: [{ id: 'barista', name: 'Barista', base: 28000, cap: 24000, starter: 2 }, { id: 'manager', name: 'Manager', base: 48000, cap: 8000, starter: 0 }] },
  tech: { kind: 'shop', name: 'Tech Store', sector: 'tech', fee: 5000, ticket: 320, cogs: 0.68, rent: 40000, baseDemand: 4500, unit: 'sales',
    equip: [{ id: 'shelving', name: 'Display Shelving', cost: 12000, cap: 1800, starter: 1 }, { id: 'pos', name: 'POS & Repair Bench', cost: 4000, cap: 1500, starter: 1 }, { id: 'stock', name: 'Stockroom', cost: 30000, cap: 2500 }],
    roles: [{ id: 'sales', name: 'Sales Associate', base: 38000, cap: 800, starter: 2 }, { id: 'techsup', name: 'Tech Support', base: 52000, cap: 600, starter: 0 }] },
  grocery: { kind: 'shop', name: 'Grocery Store', sector: 'food', fee: 8000, ticket: 52, cogs: 0.8, rent: 80000, baseDemand: 50000, unit: 'baskets',
    equip: [{ id: 'shelves', name: 'Aisle Shelving', cost: 25000, cap: 30000, starter: 1 }, { id: 'coolers', name: 'Coolers', cost: 40000, cap: 25000, starter: 1 }, { id: 'registers', name: 'Registers', cost: 8000, cap: 30000, starter: 1 }],
    roles: [{ id: 'cashier', name: 'Cashier', base: 28000, cap: 12000, starter: 2 }, { id: 'stocker', name: 'Stocker', base: 27000, cap: 9000, starter: 1 }] },
  game: { kind: 'studio', medium: 'game', name: 'Game Studio', sector: 'tech', fee: 10000, rent: 60000, contractPerStaff: 52000,
    equip: [{ id: 'ws', name: 'Dev Workstation', cost: 3000, seats: 1, starter: 5 }], starters: { designer: 1, artist: 1, composer: 1, writer: 1, programmer: 1 } },
  film: { kind: 'studio', medium: 'film', name: 'Film Studio', sector: 'media', fee: 25000, rent: 80000, contractPerStaff: 55000,
    equip: [{ id: 'suite', name: 'Production Suite (2 seats)', cost: 40000, seats: 2, starter: 3 }], starters: { writer: 1, actor: 1, vfx_artist: 1, composer: 1, producer: 1 } },
  tv: { kind: 'studio', medium: 'tv', name: 'TV Studio', sector: 'media', fee: 20000, rent: 70000, contractPerStaff: 50000,
    equip: [{ id: 'suite', name: 'Production Suite (2 seats)', cost: 40000, seats: 2, starter: 3 }], starters: { writer: 1, actor: 1, vfx_artist: 1, composer: 1, producer: 1 } },
  sports: { kind: 'sports', name: 'Major Sports Team', sector: 'media' },
};

// Listed companies. base = fair price at sector health 50. NPC studios jump on game/film releases.
export const companies = [
  { tkr: 'FRSH', name: 'Freshly Foods', sector: 'food', base: 40, vol: 0.05 },
  { tkr: 'BEAN', name: 'Bean Giant', sector: 'food', base: 22, vol: 0.07 },
  { tkr: 'MEGA', name: 'MegaMart', sector: 'retail', base: 85, vol: 0.05 },
  { tkr: 'SHOP', name: 'ShopWise', sector: 'retail', base: 30, vol: 0.08 },
  { tkr: 'BYTE', name: 'ByteCorp', sector: 'tech', base: 120, vol: 0.09 },
  { tkr: 'CHIP', name: 'ChipForge', sector: 'tech', base: 60, vol: 0.12 },
  { tkr: 'FLIX', name: 'Flixon', sector: 'media', base: 55, vol: 0.09 },
  { tkr: 'SPRT', name: 'SportsNet', sector: 'media', base: 35, vol: 0.07 },
  { tkr: 'HOME', name: 'HomeREIT', sector: 'realestate', base: 50, vol: 0.06 },
  { tkr: 'TWR', name: 'TowerCap', sector: 'realestate', base: 90, vol: 0.08 },
  { tkr: 'JETX', name: 'JetAir', sector: 'transport', base: 28, vol: 0.1 },
  { tkr: 'FRGT', name: 'FreightCo', sector: 'transport', base: 45, vol: 0.06 },
  { tkr: 'PXLF', name: 'Pixelforge Games', sector: 'tech', base: 25, vol: 0.1, npcMedium: 'game' },
  { tkr: 'RLHS', name: 'Reelhouse Pictures', sector: 'media', base: 32, vol: 0.1, npcMedium: 'film' },
];

export const firstNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Riley', 'Casey', 'Morgan', 'Jamie', 'Drew', 'Avery', 'Quinn', 'Rowan', 'Skyler', 'Devon', 'Parker', 'Reese', 'Blake', 'Harper', 'Emery', 'Kai'];
export const lastNames = ['Reed', 'Park', 'Nguyen', 'Garcia', 'Okafor', 'Silva', 'Kim', 'Novak', 'Rossi', 'Khan', 'Bauer', 'Lopez', 'Jones', 'Ito', 'Moreau', 'Haas', 'Cole', 'Diaz', 'Brandt', 'Wells'];
export const bizNames = { coffee: ['Daily Grind', 'Bean There', 'Steam & Co'], tech: ['Gadget Hub', 'Circuit Barn', 'ByteBay'], grocery: ['Fresh Basket', 'Corner Market', 'GreenCart'], game: ['Pixel Pirates', 'Nova Works', 'Lo-Fi Labs'], film: ['Lantern Pictures', 'Reel Dreams', 'Offcut Films'], tv: ['Channel Fox Works', 'Primetime Labs', 'Serial Minds'] };
export const teamNames = ['Harbor Hawks', 'Iron City Forge', 'Summit Wolves', 'Bayside Comets', 'Prairie Stallions', 'Neon Tigers', 'Desert Vipers', 'Lakeshore Kings'];

// Events. fx keys: health happiness smarts looks money bizrep ; choice p/fail = chance of success.
const E = (id, title, text, ages, w, choices, cond) => ({ id, title, text, ages, w, choices, cond });
export const events = [
  E('scuffle', 'Playground Scuffle', 'A kid grabs your lunch money.', [5, 12], 1, [
    { label: 'Fight back', fx: { happiness: 3, health: -3 }, p: 0.5, fail: { fx: { health: -8, happiness: -4 }, txt: 'You lost the fight.' }, txt: 'You stood your ground.' },
    { label: 'Tell a teacher', fx: { smarts: 1 }, txt: 'The teacher handled it.' }]),
  E('talent', 'School Talent Show', 'Your class is holding a talent show.', [6, 14], 1, [
    { label: 'Perform', fx: { happiness: 6, looks: 1 }, p: 0.6, fail: { fx: { happiness: -5 }, txt: 'You froze on stage.' }, txt: 'The crowd cheered!' },
    { label: 'Watch', fx: { happiness: 1 }, txt: 'You enjoyed the show.' }]),
  E('spelling', 'Spelling Bee', 'Teacher suggests you enter the bee.', [7, 13], 1, [
    { label: 'Study hard', fx: { smarts: 5, happiness: -1 }, p: 0.6, fail: { fx: { smarts: 2 }, txt: 'You misspelled "necessary".' }, txt: 'You won a ribbon!' },
    { label: 'Skip it', fx: { happiness: 2 }, txt: 'You played outside instead.' }]),
  E('sickday', 'Nasty Flu', 'You feel awful.', [3, 80], 0.8, [
    { label: 'Rest at home', fx: { health: -2 }, txt: 'You recovered in a week.' },
    { label: 'See a doctor ($300)', fx: { money: -300, health: 2 }, txt: 'Quick recovery.' }]),
  E('cheat', 'Cheating Temptation', 'A classmate offers answers to the big exam.', [13, 18], 1, [
    { label: 'Cheat', fx: { smarts: 1 }, p: 0.55, fail: { fx: { smarts: -3, happiness: -6 }, txt: 'Caught! Detention.' }, txt: 'You aced it.' },
    { label: 'Do it honestly', fx: { smarts: 3 }, txt: 'You earned your grade.' }]),
  E('party', 'Party Invite', 'Everyone is going to a house party.', [14, 24], 1, [
    { label: 'Go', fx: { happiness: 6, health: -2 }, p: 0.8, fail: { fx: { happiness: -4, health: -6 }, txt: 'Rough night.' }, txt: 'Great night!' },
    { label: 'Stay in and study', fx: { smarts: 3 }, txt: 'You hit the books.' }]),
  E('acne', 'Breakout', 'Your skin is acting up.', [12, 19], 0.8, [
    { label: 'Dermatologist ($600)', fx: { money: -600, looks: 3 }, txt: 'Cleared up.' },
    { label: 'Ignore it', fx: { looks: -3, happiness: -2 }, txt: 'You just endured it.' }]),
  E('found', 'Found Cash', 'You spot a wallet with cash inside.', [6, 90], 0.7, [
    { label: 'Return it', fx: { happiness: 4 }, txt: 'The owner was grateful.' },
    { label: 'Keep the cash', fx: { money: 400, happiness: -1 }, txt: 'You pocketed $400.' }]),
  E('lottery', 'Lottery Ticket', 'You can buy a $20 ticket.', [18, 90], 0.6, [
    { label: 'Buy', fx: { money: -20 }, p: 0.03, fail: { fx: {}, txt: 'Not a winner.' }, txt: 'Winner!', win: { money: 50000 } },
    { label: 'Pass', fx: {}, txt: 'Money saved.' }]),
  E('startup', "Friend's Startup", 'A friend pitches you on their startup. $5,000 buy-in.', [20, 70], 0.9, [
    { label: 'Invest $5,000', fx: { money: -5000 }, p: 0.2, win: { money: 40000 }, fail: { fx: { happiness: -2 }, txt: 'It folded.' }, txt: 'It took off! Big payout.', req: 5000 },
    { label: 'Decline', fx: {}, txt: 'You passed.' }]),
  E('scare', 'Medical Scare', 'A checkup finds something worrying.', [30, 90], 0.8, [
    { label: 'Full treatment ($4,000)', fx: { money: -4000, health: 4 }, txt: 'Caught early.', req: 4000 },
    { label: 'Wait and see', fx: { health: -8 }, txt: 'It got worse.' }]),
  E('crash', 'Fender Bender', 'Someone hits your car.', [18, 90], 1, [
    { label: 'Claim insurance', fx: { money: -500 }, txt: 'Paid the deductible.' },
    { label: 'Pay out of pocket', fx: { money: -2500 }, txt: 'Repaired.' }], (s) => s.assets.some((a) => a.kind === 'car')),
  E('inherit', 'Inheritance', 'A distant relative left you something.', [25, 90], 0.4, [
    { label: 'Accept', fx: { money: 25000, happiness: 2 }, txt: 'You inherit $25,000.' }]),
  E('vacation', 'Vacation Time', 'You could take a trip.', [18, 90], 0.9, [
    { label: 'Go abroad ($4,000)', fx: { money: -4000, happiness: 9, health: 2 }, txt: 'Unforgettable.', req: 4000 },
    { label: 'Stay home', fx: { happiness: -1 }, txt: 'Just another week.' }]),
  E('scam', 'Scam Call', 'A voice says your account is compromised.', [20, 90], 0.8, [
    { label: 'Hang up', fx: { smarts: 1 }, txt: 'Smart.' },
    { label: 'Give details', fx: { money: -2000, happiness: -5 }, txt: 'You lost $2,000.' }]),
  E('crypto', 'Hot Crypto Tip', 'A coworker swears by a coin. Put in $3,000?', [20, 70], 0.7, [
    { label: 'Ape in', fx: { money: -3000 }, p: 0.4, win: { money: 9000 }, fail: { fx: { happiness: -3 }, txt: 'It rug-pulled.' }, txt: 'Tripled!', req: 3000 },
    { label: 'Pass', fx: {}, txt: 'You kept your money.' }]),
  E('repair', 'Home Repair', 'The roof is leaking.', [20, 90], 1, [
    { label: 'Fix it ($6,000)', fx: { money: -6000 }, txt: 'Fixed.' },
    { label: 'Patch it cheaply ($800)', fx: { money: -800, happiness: -2 }, txt: 'It will hold... for now.' }], (s) => s.assets.some((a) => a.kind === 'house')),
  E('marathon', 'Marathon', 'Friends invite you to run a marathon.', [18, 55], 0.7, [
    { label: 'Train & run', fx: { health: 6, happiness: 4 }, p: 0.8, fail: { fx: { health: -6 }, txt: 'You pulled a hamstring.' }, txt: 'You finished!' },
    { label: 'Cheer from the sidelines', fx: { happiness: 1 }, txt: 'Fun day.' }]),
  E('viral', 'Viral Post', 'A post of yours is taking off.', [14, 60], 0.6, [
    { label: 'Lean in', fx: { happiness: 6, looks: 1 }, p: 0.6, fail: { fx: { happiness: -6 }, txt: 'The comments turned nasty.' }, txt: 'Brief fame!' },
    { label: 'Log off', fx: { happiness: 1 }, txt: 'Peace and quiet.' }]),
  E('layoffrumor', 'Layoff Rumors', 'Your employer may cut jobs.', [20, 64], 0.8, [
    { label: 'Work extra hard', fx: { happiness: -3 }, perf: 6, txt: 'Management noticed.' },
    { label: 'Update your resume', fx: { smarts: 1 }, txt: 'Just in case.' }], (s) => !!s.job),
  E('retire', 'Retirement Party', 'Colleagues throw you a party.', [60, 90], 0.8, [
    { label: 'Enjoy it', fx: { happiness: 6 }, txt: 'Heartwarming.' }]),
  E('grandkids', 'Visit From Family', 'Family drops by.', [55, 100], 1, [
    { label: 'Host a dinner ($300)', fx: { money: -300, happiness: 7 }, txt: 'Lovely evening.' },
    { label: 'Quiet chat', fx: { happiness: 3 }, txt: 'Nice.' }]),
  E('hip', 'Joint Trouble', 'Your hip hurts.', [60, 100], 1, [
    { label: 'Surgery ($12,000)', fx: { money: -12000, health: 6 }, txt: 'Good as new.', req: 12000 },
    { label: 'Pain meds', fx: { health: -4, happiness: -2 }, txt: 'You grit your teeth.' }]),
  // business events (need an owned business)
  E('poach', 'Rival Poaching Staff', 'A competitor is courting your best people.', [18, 90], 1, [
    { label: 'Counter with raises ($5,000)', fx: { money: -5000, bizrep: 1 }, txt: 'They stayed.', req: 5000 },
    { label: 'Let them go', fx: { bizrep: -4 }, txt: 'Morale dipped.' }], (s) => s.biz.length > 0),
  E('review', 'Viral Customer Review', 'A popular reviewer visits your business.', [18, 90], 1, [
    { label: 'Roll out the red carpet', fx: { bizrep: 6 }, p: 0.7, fail: { fx: { bizrep: -5 }, txt: 'It went badly.' }, txt: 'Glowing review!' },
    { label: 'Business as usual', fx: { bizrep: 1 }, txt: 'Fine.' }], (s) => s.biz.length > 0),
  E('lawsuit', 'Lawsuit', 'A nuisance lawsuit lands on your desk.', [18, 90], 0.8, [
    { label: 'Settle ($15,000)', fx: { money: -15000 }, txt: 'Done.', req: 15000 },
    { label: 'Fight it', fx: { money: -2000, happiness: -3 }, p: 0.5, fail: { fx: { money: -40000, bizrep: -5 }, txt: 'You lost in court.' }, txt: 'Case dismissed.' }], (s) => s.biz.length > 0),
];

// Finals play calls (content). base/to/pts/div: make% = base + (avg(stats) - oppDefense)/div. stats: rating keys averaged (max:true => best player).
// routes use starter slots (0..4 by OVR) and normalized coords for a team attacking RIGHT; mirrored automatically.
export const plays = {
  iso: { name: 'Star Isolation', desc: 'High variance, 2 pts', base: 0.42, to: 0.08, pts: 2, div: 200, stats: ['sh'], max: true, shooter: 'sh',
    routes: [{ slot: 0, kind: 'run', pts: [[0.7, 0.5], [0.8, 0.44], [0.88, 0.5]] }], arrows: [] },
  pnr: { name: 'Pick & Roll', desc: 'Safe, uses passing + IQ', base: 0.5, to: 0.1, pts: 2, div: 300, stats: ['pa', 'iq'], shooter: null,
    routes: [{ slot: 4, kind: 'screen', pts: [[0.8, 0.62], [0.74, 0.5]] }, { slot: 0, kind: 'run', pts: [[0.64, 0.5], [0.74, 0.42], [0.86, 0.48]] }, { slot: 0, kind: 'pass', pts: [[0.86, 0.48], [0.9, 0.6]] }], arrows: [] },
  three: { name: 'Spot-up Three', desc: 'Lower odds, 3 pts', base: 0.34, to: 0.05, pts: 3, div: 220, stats: ['sh'], shooter: 'sh',
    routes: [{ slot: 1, kind: 'run', pts: [[0.7, 0.2], [0.7, 0.14]] }, { slot: 0, kind: 'pass', pts: [[0.62, 0.5], [0.7, 0.16]] }], arrows: [] },
  fast: { name: 'Push the Pace', desc: 'Easy buckets, turnover risk', base: 0.6, to: 0.2, pts: 2, div: 300, stats: ['at'], shooter: null,
    routes: [{ slot: 0, kind: 'run', pts: [[0.4, 0.5], [0.66, 0.5], [0.88, 0.5]] }, { slot: 2, kind: 'run', pts: [[0.4, 0.8], [0.7, 0.72], [0.88, 0.58]] }], arrows: [{ from: [0.3, 0.5], to: [0.55, 0.5] }] },
  post: { name: 'Post Up the Big', desc: 'Steady inside scoring', base: 0.52, to: 0.07, pts: 2, div: 250, stats: ['re', 'at'], shooter: 're',
    routes: [{ slot: 4, kind: 'run', pts: [[0.78, 0.62], [0.86, 0.54]] }, { slot: 0, kind: 'pass', pts: [[0.64, 0.5], [0.86, 0.54]] }], arrows: [] },
};
export const teamColors = [['#e63946', '#ffffff'], ['#1d6fe0', '#ffffff'], ['#f4a261', '#222222'], ['#2a9d8f', '#ffffff'], ['#8338ec', '#ffffff'], ['#ffbe0b', '#222222'], ['#06d6a0', '#222222'], ['#ef476f', '#ffffff']];
