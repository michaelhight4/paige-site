p='/workspace/kilumen/text/system_lines.py'; s=open(p).read()
s=s.replace('"{trainer_class}": "Courier", "{fare}": "250 gold", "{spray_left}": "99",\n}',
 '"{trainer_class}": "Courier", "{fare}": "250 gold", "{spray_left}": "99", "{amount}": "99,999 gold",\n}',1)
s=s.replace(' "{fare}": "rail/ferry fare incl. currency word (only if Gary picks paid travel)",\n}',
 ' "{fare}": "rail/ferry fare incl. currency word (only if Gary picks paid travel)",\n "{amount}": "money found in a purse, incl. currency word",\n}',1)
s=s.replace('''"note": "hidden items: map items with hidden:true (route1 r1_feed, r1_hidden_tonic)"},''',
 '''"note": "every map item with hidden:true (World v16.5: found by facing + A, walkable)"},
 "picked_up_money": {"pages": ["You found {item}!", "{amount} goes in your wallet."], "parity": "F18", "build": "partial",
                     "note": "money items (system_item_catalogue entries with pocket null, e.g. coin_pouch_small): no pocket, straight to the wallet"},''',1)
cat='''
# Display names + bag text for World's placeholder item ids (items/ITEM_PLACEHOLDERS.json, maps/*.json items[].item).
# Keys are World's ids, never renamed. Names <= 17 chars (the {item} sample). Players never see "coin" for money (coin = Master's token).
# pocket = comfort.bag_pockets key (World's pocket hint in item_pocket_hint). TBD ids wait on Story (CATALOGUE_PENDING).
S["system_item_catalogue"] = {
 "_section": "Item names and bag descriptions by World item id (parity E4). Pickup text = system_items.picked_up / hidden_found / picked_up_money with {item} = name.",
 "tonic_small": {"name": "Small Tonic", "pocket": "care", "pages": ["A small tonic. Patches up a little lost health."], "parity": "E4", "build": "partial"},
 "tonic_large": {"name": "Big Tonic", "pocket": "care", "pages": ["A big tonic. Patches up a lot of lost health."], "parity": "E4", "build": "partial"},
 "energy_tonic": {"name": "Energy Tonic", "pocket": "care", "pages": ["A fizzy tonic. The label just says 'PEP!'"], "parity": "E4", "build": "partial",
                  "pending_gary_call": "potions_vs_rest", "note": "World's role says it restores energy; the description stays neutral until Gary rules on potions vs resting"},
 "calm_tea": {"name": "Calm Tea", "pocket": "care", "pages": ["A cooled herbal tea. Settles a creature that's out of sorts."], "parity": "E4", "build": "partial"},
 "trail_mix": {"name": "Trail Mix", "pocket": "feeds", "pages": ["Nuts, seeds and dried mossplums.", "Trail Buddies go wild for it."], "parity": "E4", "build": "partial"},
 "feed_bag_small": {"name": "Small Feed Bag", "pocket": "feeds", "pages": ["A small bag of feed. Enough for one good meal."], "parity": "E4", "build": "partial"},
 "feed_bag": {"name": "Feed Bag", "pocket": "feeds", "pages": ["A full bag of feed. Your team eats well tonight."], "parity": "E4", "build": "partial"},
 "vigor_seed": {"name": "Vigor Seed", "pocket": "feeds", "pages": ["A hard little seed. Whoever eats it gets a bit sturdier."], "parity": "E4", "build": "partial",
                "note": "World's hint is a 'growth' pocket; we have no such pocket, so it sits with Feeds (it's eaten). Coder may split it out"},
 "crystal_dust": {"name": "Crystal Dust", "pocket": "crystals", "pages": ["Fine crystal grit. Shops pay a little for it."], "parity": "E4", "build": "partial"},
 "dominance_crystal": {"name": "Dominance Crystal", "pocket": "crystals", "pages": ["An empty dominance crystal.", "Throw it to bring a wild creature onto your team."], "parity": "E4", "build": "partial"},
 "dominance_crystal_plus": {"name": "Prime Crystal", "pocket": "crystals", "pages": ["A denser dominance crystal.", "It holds tough creatures better."], "parity": "E4", "build": "partial"},
 "coin_pouch_small": {"name": "a small purse", "pocket": None, "pages": ["A little purse someone dropped. There's gold inside."], "parity": "E4", "build": "partial",
                      "note": "money: use system_items.picked_up_money. Named 'purse', not 'coin pouch': players only see 'coin' for a Master's token"},
}
CATALOGUE_PENDING = {
 "TBD": "interiors worker placeholder (home_*_2f item_1, mirefen_islet_item): Story/Gary picks the item, then it gets a catalogue entry. Pickup uses the generic lines meanwhile.",
 "TBD_backroom_reward": "rt_branch_backroom item_1: back-room story reward (pending_story_call). Name and line wait on Story.",
}
POCKET_HINT = {"medicine": "care", "snacks": "feeds", "growth": "feeds", "crystals": "crystals", "money": None}
'''
s=s.replace('\nS["system_heal"] = {', cat+'\nS["system_heal"] = {',1)
open(p,'w').write(s)
