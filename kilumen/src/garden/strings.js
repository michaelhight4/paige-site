// Garden + merit shop text. ALL PLACEHOLDER (Coder, Oct 30 2026): Text Bot replaces these by id; requests in
// data/textbot_requests_merit_shop.md. Keep the ids stable; {tokens} are filled in by gt().
export const GS = Object.freeze({
  'merit.shop.title': 'Merit Counter',                                   // PLACEHOLDER
  'merit.shop.clerk': 'Merit Clerk',                                     // PLACEHOLDER
  'merit.shop.tab_today': "Today's shelf",                               // PLACEHOLDER
  'merit.shop.tab_always': 'Always in',                                  // PLACEHOLDER
  'merit.shop.points': '{points} merit',                                 // PLACEHOLDER
  'merit.shop.unit': '★',
  'merit.shop.owned': 'Owned',                                           // PLACEHOLDER
  'merit.shop.in_pack': 'In your pack: {n}',                             // PLACEHOLDER
  'merit.shop.rotates': 'This shelf changes every day.',                 // PLACEHOLDER
  'merit.shop.confirm': '{item} x{count} is {total} merit. Trade?',      // PLACEHOLDER
  'merit.shop.confirm_yes': 'Trade',                                     // PLACEHOLDER
  'merit.shop.confirm_no': 'Not yet',                                    // PLACEHOLDER
  'merit.shop.bought': 'Here you go. Earned fair and square.',           // PLACEHOLDER
  'merit.shop.short': 'You need {short} more merit for that.',           // PLACEHOLDER
  'merit.shop.bag_full': "Your pack can't hold any more of those.",      // PLACEHOLDER
  'merit.shop.already': 'You already have one of those.',                // PLACEHOLDER
  'merit.shop.bye': 'Come back after your next event.',                  // PLACEHOLDER
  'merit.shop.hint_tabs': "Today / Always",                              // PLACEHOLDER
  'merit.shop.hint_pick': 'Pick',                                        // PLACEHOLDER
  'merit.shop.hint_back': 'Done',                                        // PLACEHOLDER
  'merit.shop.desc.watering_can': 'Waters one plot a day. Watered crops grow a stage overnight.',       // PLACEHOLDER
  'merit.shop.desc.watering_can_merit': 'A prize can. A crop watered with it is ready the next day.',   // PLACEHOLDER
  'merit.shop.desc.seeds': 'Plant in a soil plot. Ready in {days} watered days.',                     // PLACEHOLDER
  'merit.earned': '+{pts} merit points! ({points} total)',                // PLACEHOLDER
  'merit.announcer.ask': 'Here for the Games, or the merit counter?',    // PLACEHOLDER
  'merit.announcer.games': 'The Games',                                  // PLACEHOLDER
  'merit.announcer.shop': 'Merit counter',                               // PLACEHOLDER
  'merit.announcer.leave': 'Just looking',                               // PLACEHOLDER
  'garden.empty': "It's a soil plot. Something could grow here.",        // PLACEHOLDER
  'garden.plant_ask': 'Plant something?',                                // PLACEHOLDER
  'garden.plant_none': 'You have no seeds to plant.',                    // PLACEHOLDER
  'garden.cancel': 'Leave it',                                           // PLACEHOLDER
  'garden.planted': 'You planted the {crop} seeds.',                     // PLACEHOLDER
  'garden.stage.seed': 'The {crop} seeds are in the soil.',              // PLACEHOLDER
  'garden.stage.sprout': 'A little {crop} sprout is up.',                // PLACEHOLDER
  'garden.stage.growing': 'The {crop} is coming along.',                 // PLACEHOLDER
  'garden.water_ask': 'Water it?',                                       // PLACEHOLDER
  'garden.water_yes': 'Water',                                           // PLACEHOLDER
  'garden.watered': 'You watered the {crop}.',                           // PLACEHOLDER
  'garden.watered_merit': 'You watered the {crop} with the merit can. It will be ready tomorrow.', // PLACEHOLDER
  'garden.watered_done': 'The soil is already damp today.',              // PLACEHOLDER
  'garden.no_can': 'The soil is dry. A watering can would help.',        // PLACEHOLDER
  'garden.ready': 'The {crop} is ready!',                                // PLACEHOLDER
  'garden.harvest_yes': 'Harvest',                                       // PLACEHOLDER
  'garden.harvested': 'You harvested {n} {crop}!',                       // PLACEHOLDER
  'garden.bag_full': "Your pack can't hold the {crop}.",                 // PLACEHOLDER
});
/** Look up a string id and fill {tokens}. Unknown id -> the id itself (easy to spot). */
export const gt = (id, vars = {}) => String(GS[id] ?? id).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
