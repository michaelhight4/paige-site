# Kilumen — Soul Playbook

*Compiled Thursday 2026-10-22 (America/Chicago) for Gary. This is a research summary plus design proposals for "Kilumen: Start of a Journey".*

**Gary's rule, and how this file follows it.** We studied the 1996–2012 handheld creature-collector games (mostly Platinum, HeartGold/SoulSilver, Black/White and Emerald) plus a few talks and essays, **for inspiration only**. In each section, the "Principle" part says what those games do and links to the source. Every idea under "Kilumen ideas" is **original**: it describes the underlying feeling and uses Kilumen's own world, people and systems. No competitor names, creatures, characters, music, text or exact mechanics are meant to carry over. Where an idea is close to a genre convention (for example "a creature follows you"), the Kilumen version adds its own twist and says what it is. Text Bot and Audio: please check all final strings and melodies against this rule.

**How to read the tags**
- Effort: **S** = about a day or less for one bot · **M** = a few days, or work across 2 bots · **L** = a week or more, or a new system.
- Owner: **World** = World Design (maps/tiles) · **Sprites** = Character models (creature/NPC sprites) · **Anim** = Animator · **Text** = Text Bot · **Code** = Coder · **Story** = Story Bot · **Audio** = Audio (no bot yet). The owner listed first leads.
- Map ids and `(x,y)` tile coordinates come from `art/world/overworld/maps/*.json` as of today. I checked each coordinate against the collision layer. "Stand at" cells are walkable (0). "Interact with" cells are props.
- Flags use the names in `art/world/overworld/CRITICAL_PATH.md`. Anything marked **(new flag)** is a proposal.
- The text tone follows `overworld_lines.json` v0.3.0: grounded, dry, gently funny, 2 lines × 40 chars per page. Sample lines are drafts for Text Bot to edit.

---

## 0. The big idea in one paragraph

Kilumen has one feature the older games didn't: a **moral shadow inside the core mechanic**. Every creature carries a violet dominance crystal, and the player works for the company that put it there. The best "soul" in the studied games comes from small, warm, everyday details. Those details work because they sit on a safe, sunny base, and that safety is what lets a single sad place hit hard ([Pocket Tactics on the haunted town](https://www.pockettactics.com/pokemon-lavender-town)). So the plan is: **make Kilumen ordinary-warm almost everywhere** (bins, office gossip, fireflies, Ron), **let the bond between player and creature be visible and real**, and **let the crystal quietly become the thing the player starts to question**. Most ideas below serve that arc.

---

## 1. Attachment mechanics (why you love *your* creature)

### Principles, with sources
1. **Seeing your partner in the world creates attachment, and convenience matters less.** When HGSS put the lead creature on the map, it showed moods when you talked to it, picked up items, reacted to specific places and disliked some terrain by type ([Bulbapedia: Walking Pokémon](https://bulbapedia.bulbagarden.net/wiki/Walking_Pok%C3%A9mon); [Serebii HGSS partner page](https://www.serebii.net/heartgoldsoulsilver/partner.shtml)). The director's whole pitch was simply that "walking with any creature you liked would be fun" ([Iwata Asks HGSS](https://iwataasks.nintendo.com/interviews/ds/pokemon/0/4/)). Later, Game Freak said outright that it chooses "feels like a living creature" over convenience ([Ohmori & Masuda interview](https://www.pokemon.com/uk/pokemon-news/interview-with-game-freaks-ohmori-and-masuda-on-pokemon-sword-and-pokemon-shield)).
2. **A hidden affection number, revealed through people, turns into a story.** The friendship value goes up from walking, levelling and care, and goes down from fainting and bitter medicine. NPCs read it out loud, and it gates evolutions and small gifts ([Bulbapedia: Friendship](https://bulbapedia.bulbagarden.net/wiki/Friendship)).
3. **Real time makes a world feel like it keeps living.** HGSS had weekday-only events (a park contest on certain days, a dancing gathering on Monday nights). Black/White had monthly seasons that changed terrain, encounters and music ([Bulbapedia: Days of the week](https://bulbapedia.bulbagarden.net/wiki/Days_of_the_week); [Bulbapedia: Bug-Catching Contest](https://bulbapedia.bulbagarden.net/wiki/Bug-Catching_Contest); [Bulbapedia: Season](https://bulbapedia.bulbagarden.net/wiki/Season_(game_mechanic))).
4. **Small caretaking loops (planting and watering) bring you back.** Gen 4 plants went through five growth stages, and dry soil reduced the harvest ([Bulbapedia: Berry](https://bulbapedia.bulbagarden.net/wiki/Berry)).
5. **Rare visual variants create stories you tell others.** A colour variant shows with a sparkle and a chime. One story-placed rare variant at a lake taught a whole generation that they exist ([Bulbapedia: Shiny Pokémon](https://bulbapedia.bulbagarden.net/wiki/Shiny_Pok%C3%A9mon); [Bulbapedia: Red Gyarados](https://bulbapedia.bulbagarden.net/wiki/Red_Gyarados)).
6. **Exchange is about social connection, not competition.** The creator described the link cable as being for exchanging, rooted in childhood insect swapping ([TIME 1999 profile of Tajiri](https://time.com/archive/6951818/the-ultimate-game-freak/); [Tajiri 1997 interview](https://lavacutcontent.com/satoshi-tajiri-1997-interview/)).
7. **A space you own, and places with special rules, give the long middle of the game texture.** Examples: decorated hideouts that other players' copies could visit ([Bulbapedia: Secret Base](https://bulbapedia.bulbagarden.net/wiki/Secret_Base)), a marsh with a daily rotating species you could spot through binoculars ([Bulbapedia: Great Marsh](https://bulbapedia.bulbagarden.net/wiki/Great_Marsh)), a post-game facility row ([Bulbapedia: Battle Frontier (Gen III)](https://bulbapedia.bulbagarden.net/wiki/Battle_Frontier_(Generation_III))), and phone-arranged rematches with route trainers ([Bulbapedia: Rematch](https://bulbapedia.bulbagarden.net/wiki/Rematch)).

### Kilumen ideas
- **1.1 Crystal Warmth (Kilumen's bond system).** Each creature has a hidden **Warmth** value (0–100). Its dominance crystal slowly changes from cold violet toward that creature's *own* signature colour as Warmth rises, so you can see it on the battle sprite, the party icon and the Trail Buddy. Warmth goes up when you walk with the creature, battle with it, feed it the feeds it likes, win coin battles, and rest at camps. It goes down when the creature faints a lot or when you overuse moves past the energy meter. That last one ties straight into the existing overuse penalty. **Original twist:** the crystal is the company's tool of control, and Warmth shows that the *real* bond grows in spite of it. That pays off in the story (see 6.4). — **M** · Code, Sprites (3 crystal tint steps per creature via a palette swap), Story
- **1.2 The Trail Buddy.** The lead creature follows one tile behind on the overworld. Talk to it and you get an emote plus a one-liner that depends on place, weather, time and Warmth. The fire line (Cindrip) shakes off rain and won't step in puddles. Tumbloam sits down on any bench. Rillop wades along the Brookhollow river edge. Sailquill flies ahead and circles you on bridges. Gloamtick's lantern flares near graves. **Original twist:** the buddy notices *crystal ore* and makes a low unhappy sound next to dug crystal deposits. That echoes the Fernwick elder's line about fireflies dimming. Field skills are shown by the buddy itself (it flies you with Skylift, it carries you on Tideglide). — **M** (follow logic is S, the reaction table is M) · Code, Anim, Text
- **1.3 Catalogue number vs. real name.** Revival Tech logs every catch as `RT-0001`, `RT-0002`… The Kilindex shows both "Catalogue ID" and "Called". Nicknaming is offered right after a catch with the prompt "Log it as RT-0147, or give it a name?" Ron always uses nicknames. Director Vane only ever says the catalogue number. That is a free character tell, and a quiet thematic one. — **S** · Code, Text, Story
- **1.4 The Revival Tech work week.** An in-game clock (the phone shows Day 1, Mon) with four phases (Dawn, Day, Dusk, Night) and a 7-day week. Proposal: 1 real minute = 1 in-game hour, with a toggle for real-time. Weekday hooks: **Mon** company task board refresh. **Tue** Fernwick Feed Market (cheaper feeds, a grower NPC). **Wed** Master rematch day (each Master is "in" on their own weekday after `all_badges`). **Thu** "Weigh-In" at Saltmere (1.6). **Fri** Breakroom cake at `office_int`, a running gag where somebody is always leaving. **Sat** Lanternport night ferry and lantern festival. **Sun** the office is closed and the receptionist's seat is empty. Creatures by phase: Halovy only at Dawn in Sunmeadow, Gloamtick only at Night in Greystone and Mirefen. — **M** · Code, Text, World
- **1.5 Grow your own feeds.** Four soil plots behind the Brookhollow garden NPC (`brookhollow`, around `villager_garden` at (18,13)). Plant seeds such as the existing `tw_hidden_seed` from Thornwood (8,25), water them with a watering can (the garden NPC gives it after a small favour), and harvest feeds in 3 stages over 1–2 in-game days. Different feed types attract different creatures when scattered in grass, which gives "Large" or "Small" rolls a small bias. The garden villager comments on how your plot is doing. — **M** · Code, World, Text
- **1.6 Saltmere Weigh-In (instead of beauty contests).** The design already tracks biggest and smallest weights in the Kilindex, so make that a social stage. Every Thursday the Saltmere harbour hosts a weigh-in for one featured species. You bring your heaviest or lightest specimen, a crowd of NPCs cheers, and the record board shows the NPC holder's name until you beat it. Winning gives a ribbon that shows on the creature's Kilindex card. Large/Small variant rolls become things to brag about. — **M** · Code, World (harbour scales prop), Text
- **1.7 Cosmic variants, made legendary by rumour.** On encounter, a Cosmic creature gets a slow starfield shimmer across the sprite, its own 3-note chime and a phone vibration. **Original twist:** the odds go up a little on clear nights during a weekly **meteor night** (Sat), which the Lanternport lighthouse keeper predicts. One **scripted Cosmic** appears in the story: a Cosmic Mirewump that surfaces once in the Mirefen fog during the Tideglide storm, so every player learns Cosmic variants exist. — **S** (rate + VFX) to **M** (scripted one) · Code, Anim, Audio, Story
- **1.7a Variant rules (3 approved, rest proposal).** The design doc says creatures get a small chance of a **buff roll on entry to battle**, shown on the model so you can tell the variant by looking. Variants: **Large** (defence and HP), **Small** (agility), **Enraged** (attack; the doc calls it "aggressive"), and **Cosmic** (the rare cosmetic variant). Variants sit **on top of the 450 base creatures (evolutions included)**. They are markers on a creature, not separate Kilindex entries. **Gary approved on Oct 22, 2026: one variant per creature; a variant survives evolution; variants don't count toward the 450. The rest are still proposals, for Gary and Coder to confirm:**
  - One variant per creature. (APPROVED)
  - The roll happens when the encounter starts and is saved on catch.
  - A variant survives evolution (an Enraged Rillop evolves into an Enraged Brookhorn). (APPROVED)
  - Cosmic is cosmetic only, with no stat change.
  - Enraged is the guaranteed variant for out-of-grass encounters (that part is the design doc's rule). In grass it's a normal low-chance roll.
  - Enraged creatures don't disobey and lose no Warmth. Story Bot: a caught Enraged creature calms down in the party, while keeping its attack buff and its look.
  
  — **S** (rules) · Code, Story
- **1.7b Enraged variants: the angry counterpart to Cosmic (proposal).** Cosmic gets a shimmer; Enraged gets a warning. Touches:
  - **Overworld tell.** Out-of-grass Enraged encounters are rare and sudden. Before the battle the screen gives a 0.3 s red-violet edge pulse and the Trail Buddy flinches with the anger emote (5.1). In grass there's no overworld tell, so the battle tell carries it.
  - **Encounter sting (own sound).** A 1.5 s **Enraged sting**: a low growl-like noise burst into a falling minor third on a detuned pulse, then the Enraged-variant battle theme (4.3). It's distinct from Cosmic's 3-note rising chime, so you can tell them apart with your eyes closed.
  - **Battle tell.** The jagged shard wipe (5.2). The sprite has a **red rim-light and steam puffs** on a 2-frame loop. The name plate shows a small **jagged spark icon**. The creature's crystal **flickers hot red-violet** at each turn start. This needs a palette swap plus one overlay per pose, not new art per creature, so it scales across 450 base creatures.
  - **Kilindex marker.** Each entry gets a row of small **variant pips** (Large, Small, Enraged, Cosmic), lit once you've caught that variant. Enraged shows a **jagged red spark** and Cosmic shows a **star**. Neither counts toward the 450. A "Variant Ledger" page shows totals for bragging; a Kilindex milestone could celebrate the first Enraged and first Cosmic catch.
  - **Party and menu.** Enraged icons give an occasional 1-frame shake every 5 s, alongside the Cosmic twinkle (5.4).
  - **Colour-blind safe.** The spark and star shapes carry the meaning, not hue alone (7.5).
  
  — **S** (sting, icon, pips) to **M** (overlay and palette across the roster) · Anim, Audio, Code, Sprites
- **1.8 Lumen Line Courier (the "send it away and it comes back changed" social hook).** Some creatures only evolve after being sent by rail freight to another station and back. In a solo game, Ron is the default partner: he works the other end of the line and sends your creature back with a short note about what it did there. If link play is added later, the same post office counter handles player-to-player swaps. This keeps the "you need someone else" feeling without copying a trade mechanic. — **M** · Code, Text, Story
- **1.9 Field Camps (your space, plus a mystery).** The missing previous field team left **abandoned camps** in Thornwood, Greystone, Mirefen and Frostspire. Restore one (clear it, light the stove) and it becomes your camp: a fast-travel point, a rest spot that gives Warmth, and a place to decorate with found items. Each camp holds that team member's **field log page**, the main breadcrumb for the missing-team mystery. Ron visits your camps and leaves notes. — **L** · World, Code, Story, Text
- **1.10 The Mirefen Count (special-rules area).** A once-per-day company "census" on the Mirefen boardwalk. You get 20 survey nets, no battles, and a sighting scope. The scope uses the existing **binoculars** held item, so it now has a second life. One "spotlight species" changes each day and the company terminal tells you which. — **M** · World, Code, Text
- **1.11 Rematch calls and the post-game.** Route trainers can swap phone numbers. Later they **text** a life update ("Got a job at the mill. Still undefeated on Tuesdays.") and ask for a rematch on a given weekday. The post-game opens **The Proving Floor** in Aurelith: three rule sets that reuse existing systems (Energy Drought: half energy; No Armour: held items off; Lineage: only creatures from one zone). Its staff are former Revival Tech battle testers. — **M** (texts/rematches) / **L** (Proving Floor) · Code, Text, Story

---

## 2. World life (a road trip through other people's lives)

### Principles, with sources
1. **The journey is a road movie: you drop in on lives already in progress.** Small towns and NPCs are vignettes, not quest-givers ([The Guardian: what the games teach about storytelling](https://www.theguardian.com/games/2020/jan/27/what-pokemon-can-teach-us-about-storytelling-nintendo-games)). The older games put "vignettes at the edges of design space". Because the toolset was small, every tile and every line counted, and low fidelity left room for imagination ([Melodic Ambient: why older games felt more](https://melodicambient.substack.com/p/why-were-older-pokemon-games-more)).
2. **Environment as cause and effect.** One short route with volcanic ash falling, ash piling on the grass, a trainer complaining about it, and a glassmaker turning it into flutes reads as a "real place" because it links to the volcano next door ([TheGamer on Route 113](https://www.thegamer.com/pokemon-ruby-sapphire-route-113/)).
3. **Fans remember the small stuff.** In their own words: seasons changing scenery and produce, random phone calls, moving water and clouds, rustling grass, footprints, planting ([r/pokemon "which world feels most alive"](https://www.reddit.com/r/pokemon/comments/67vgu3/which_pok%C3%A9mon_game_world_feels_the_most_alivereal/); [r/pokemon "small detail you loved"](https://www.reddit.com/r/pokemon/comments/a3zxxd/whats_a_small_detail_in_the_games_that_you_loved/); [r/pokemon "minor things"](https://www.reddit.com/r/pokemon/comments/rvnlar/what_minor_things_in_pokemon_make_your_experience/)). (These come from search summaries. Reddit blocked direct fetching.)
4. **Creatures need a reason to look and live the way they do.** The designers ask where a creature lives, what it eats and why it evolves ([Game Informer: how Game Freak designs creatures](https://gameinformer.com/b/features/archive/2017/08/10/heres-how-game-freak-designs-pokemon-creatures)).

### Kilumen ideas
- **2.1 Every interactable object has a voice and changes with the story.** Turn every prop into a tiny scene:
  - `house_1f` **TV (7,3)**: Revival Tech adverts that change by chapter. Act 1 "Restructuring for a brighter tomorrow". Act 2 "Now hiring field researchers!". Act 3 a news anchor reporting missing hikers. Ending: a cooking show, because the world is fine again.
  - `house_2f` **PC (4,3)**: the **company inbox** (see 2.4).
  - Bookcases (`office_int` (8–9,1–2), `house_int_b` (1–2,1–2)): one in-world book excerpt each, for example creature folklore or *A Short History of Crystal Binding (Abridged, Revised, Revised Again)*.
  - Windows: show the current weather and time of day.
  - Water cooler `office_int` (12,1): "Glug." Then coworker gossip that changes every chapter.
  - Bins: see the Ron gag in 2.3.
  
  — **S each** · Text (lines), Code (flag-driven text pick)
- **2.2 NPC routines and memory.** Each named NPC gets a schedule with 2–4 positions by time phase, plus "first-meet" and "progress" lines tied to flags. Examples:
  - `brookhollow` **fisher (21,17)** moves to the bridge **(23,13)** at Dusk. After you get `has_tideglide` he says "Saw you riding that river. Show-off."
  - **kid (12,20)** isn't there on weekdays during Day ("School. Obviously."). He keeps his laid-off joke streak going and finally runs out of material in the ending.
  - **receptionist (7,4)** remembers your lead creature's nickname.
  - **elder (7,20)** in `fernwick` stands by the pond at Night counting fireflies. The count goes down after each crystal dig story beat, and goes back up in the ending.
  
  — **M** · Code (schedule system), Text, Story
- **2.3 Running gags that pay off.**
  - **Ron's bins:** a bin prop at `brookhollow` (7,8), next to your front door. One more bin bag appears after each Master coin (up to 8 bags, with flies at 6+). In the ending Ron finally takes them out, and that is the last overworld beat before credits.
  - **Dana's desk:** Dana is never seen. Her desk in `office_int` collects plants, a mug and a "Back in 5" sign over time. In the post-game, Dana is a superb trainer standing on Frostspire.
  - **The lucky-crystal seller:** shows up in every city with a new, worse product ("Lucky crystal, now with 30% more luck").
  - **The cake send-off:** there's a cake every Friday. Nobody knows who is leaving.
  
  — **S** · Text, World (props), Story
- **2.4 Company inbox and breakroom rumours.** The bedroom PC and every heal-centre `company_terminal` (heal_centre_int (11,4)) open the same inbox. 30–40 short emails arrive on flags: all-staff memos, a passive-aggressive fridge note, HR rewording "layoffs" three times, a calendar invite titled "Field team check-in (Greystone)" that gets cancelled, and a phishing email from the lucky-crystal seller. The inbox is where the dark undertone stays **implied**, never stated, exactly as the design asks. — **S/M** · Text, Story, Code
- **2.5 Ambient creatures and moving nature.**
  - Fish shadows drift in the `brookhollow` river (x22–24) and the Thornwood pond (25–27,6–7), and sometimes jump.
  - Sailquill flocks land on the Route 1 paths and **scatter when you run** (but not when you walk).
  - Fireflies come out at Night in Fernwick and Thornwood, and **dim near crystal deposits**.
  - Burlbeetle stumps in Thornwood blink once when you pass.
  - Dust motes float in the office sunbeam.
  - Cloud shadows (already planned) roll across Sunmeadow.
  - Ash falls in Cindervale and settles on tall grass. Walking through the grass knocks the ash off for a few seconds.
  
  — **M** · Anim, Code, World
- **2.6 Story-driven seasons (cheaper than a real calendar, same feeling).** Act 1 is late summer (Brookhollow and Route 1 green). Act 2 is autumn: from the Revival Heights coin onward, Thornwood, Route 1 and Fernwick switch to an amber tile palette and leaf-fall particles, and Fernwick's market sells roasted nuts. The Frostspire/Mirefen arc is the storm season (`route1_storm.json` variant already exists). The finale arrives with first snow in Aurelith. Seasons change palettes, a few NPC lines and 1–2 encounter tables per zone. — **M** · World (palette swaps), Code, Text
- **2.7 Each town has a signature.** One profession, one sound, one colour, one gag:
  - **Brookhollow:** river, beginnings. Sound: water over stones. Gag: the bins.
  - **Fernwick:** old ferns, elders, fireflies. Sound: crickets. Gag: everyone is somebody's aunt.
  - **Saltmere:** salt flats, scales, weigh-ins. Sound: gulls and rope creak. Gag: the record board.
  - **Cindervale:** forge ash. Sound: anvils on the off-beat. Gag: "it's not smoke, it's character".
  - **Revival Heights:** glass and lanyards. Sound: elevator chimes. Gag: the motivational posters.
  - **Lanternport:** lighthouse, ferry, horn. Gag: the keeper's weather forecasts are always right and nobody believes him.
  - **Aurelith:** gold arena. Sound: crowd swell. Gag: ticket touts.
  
  — **S (doc)** · Story, World, Audio

---

## 3. Easter eggs and secrets (the playground rumour engine)

### Principles, with sources
1. **Cryptic in-world scripts give players a reason to talk.** Examples: a sealed chamber whose dotted writing told you to dig, then to reorder your party ([Bulbapedia: Sealed Chamber](https://bulbapedia.bulbagarden.net/wiki/Sealed_Chamber); [Bulbapedia: Braille](https://bulbapedia.bulbagarden.net/wiki/Braille)), and ruin walls whose glyph words (ESCAPE, LIGHT, WATER) told you which action opens a hidden room ([Bulbapedia: Ruins of Alph](https://bulbapedia.bulbagarden.net/wiki/Ruins_of_Alph)).
2. **One unexplained prop can create a 20-year myth.** A one-off truck near a ship dock had nothing under it, but the rumour spread through playgrounds anyway ([Dragonfly Cave essay](https://www.dragonflycave.com/essays/the-mew-trick/); [Bulbapedia: S.S. Anne](https://bulbapedia.bulbagarden.net/wiki/S.S._Anne)).
3. **Developers can wink at players.** The original game hid the developer's own office in a city building, where the designer rewarded a completed catalogue ([Bulbapedia: Celadon Condominiums](https://bulbapedia.bulbagarden.net/wiki/Celadon_Condominiums); [Bulbapedia: Game Freak](https://bulbapedia.bulbagarden.net/wiki/Game_Freak)).
4. **Rumours of mythical creatures work best when the world itself hints at them.** Haunted-town legends grew from mood and music ([Den of Geek](https://www.denofgeek.com/games/pokemon-lavender-town-history-haunted-urban-legend-creepypasta-explained/)).

### Kilumen secrets with exact placements (14)
| # | Name | Map id | Where (tile) | Trigger | Payoff | Effort · Owner |
|---|---|---|---|---|---|---|
| E1 | **The River's First Five** | `route1` | Crystal pillars at x41, y1–5 (interact from x40, y1–5). (41,4) and (41,5) are the barrier itself | Before `has_skylift`, each pillar hums one pitch when interacted with. Playing them in the order of the 5-note **River motif** from the opening dream (see §4) | The barrier flickers and shows a one-frame glimpse of the Riverbank Stranger. You get a **Driftwood Charm** (+Warmth gain). The barrier does NOT open early | M · Code, Audio, World |
| E2 | **3 a.m. Static** | `house_1f` | TV (7,3), stand at (7,4) facing up | In-game Night, 03:00–03:59 | Static plus the sound of a river. Text: "...the static sounds like water." After the Guardian quest it shows a test card that says "THANK YOU" | S · Text, Code, Audio |
| E3 | **Dana's Drafts** | `house_2f` | PC (4,3), stand at (4,4) | Open the inbox 10 times on 10 different in-game days | An "unsent drafts" folder appears with 3 drafts from Dana. Each is a gentle, sideways hint about where the field team went (Greystone B1) | S · Text, Story |
| E4 | **Upstream** | `brookhollow` | Middle of the bridge (23,12), facing up (north, toward (23,11) water) | Stand still 10 s at Dusk with a Water lead | The buddy stares upstream and a faint melody line plays. After the ending, a driftwood staff floats past under the bridge | S · Anim, Code |
| E5 | **The Bin Monument** | `brookhollow` | Bin prop at (7,8) | Interact after all 8 coins (8 bags) | "This is no longer a bin. It is a landmark." Interact 8 more times and a creature (a Mirewump far from home) pops out and joins as a rare catch | S · Text, Code |
| E6 | **Pond That Remembers** | `thornwood` | Glow-mushroom at (24,8), next to the pond (25–27,6–7) and `dissident_hint` (23,7) | Use Glowcall at Night while standing on (24,8) | The pond shows the reflection of a Gloamtick that isn't there. Its lantern spark points toward Greystone. Kilindex note: "Seen only as a reflection." | M · Anim, Code, Text |
| E7 | **Tally Marks** | `greystone_b1` | Crystal at (3,9), near the existing hidden item `b1_hidden` (3,4) | Inspect the crystal | Scratched marks: 23 days. Initials matching a missing field researcher's camp log (Field Camps 1.9). A breadcrumb, with no spoiler | S · Text, World |
| E8 | **The Buffer Car** (the myth prop) | `station_int` | Rail buffer at (19,3), stand at (19,4) facing up | Add an out-of-place, locked maintenance handcar sprite at the buffer. Its inspect text changes slightly every chapter ("It's locked." → "Still locked." → "Someone oiled the hinges.") | **Nothing is inside, on purpose.** It exists to start rumours. In the post-game the final text reads "It was never going anywhere." | S · World, Text |
| E9 | **The Crystal Stares Back** | `office_int` | Crystal display (14,1), stand at (14,3) facing up | Inspect it 25 times across the game | The display label slowly changes from "Bonded Specimen Crystal — Property of RT" to "Please stop tapping the glass." to, after the truth reveal, "...whose was this?" | S · Text |
| E10 | **Lap Nap** | `heal_centre_int` | Sofa (1,7), stand at (1,8) facing up | Idle 30 s after healing | You sit and your buddy falls asleep in your lap. The healer: "Don't move. Those are the rules." Gives +2 Warmth, once per in-game day | S · Anim, Code, Text |
| E11 | **Wishing Pond** | `fernwick` | Pond edge (16,19), facing down onto water (16,20) | Toss 1 gold coin (the existing held item) | At random: "plop", a feed comes back, or very rarely the elder says "My late husband threw that same coin in 1971." | S · Code, Text |
| E12 | **Will-o'-Lights** | `mirefen_bog` | Dead trees (7,2), (17,1), (23,2), then the islet item `mirefen_islet_item` (12,2) | At Night in fog, small lights blink on the dead trees in a set order. Touch the trees in that order | The fog clears a straight boardwalk line to the islet early, and you get a Cosmic-rate charm for one night | M · Code, Anim, World |
| E13 | **The Fireside Book** (dev wink) | `house_int_b` | Bookcase (1,1), scholar at (3,5) | Inspect it after the Kilindex reaches 150 entries (of 450 base creatures (evolutions included), plus special variants such as Enraged and Cosmic; variants don't count as extra entries) | The scholar gives you *A Start of a Journey: Notes From the People Who Made This Place*, a one-page thank-you from Gary's team, plus a printable Cataloguer's Certificate on the trainer card | S · Text, Code |
| E14 | **Dreams Move Upstream** | `house_2f` | Bed (1,3), stand at (2,3) | Sleep after each Master coin | A 10-second replay of the opening river dream, but you are a little further up the bank each time. After coin 8 you are on the bank, and the Stranger hands you nothing and just nods | M · Story, Anim, Audio |

**Myth seeds** (rumours to plant in NPC lines, some true and some false):
- "There's a Cosmic Burlbeetle that only shows if you stand still in Thornwood for an hour." (false, it's just a stump)
- "The Lanternport giant hums back if you play the lighthouse horn at midnight." (true: 1 extra line plus a cry)
- "Dana is a legend in Frostspire." (true, post-game)
- "If you name a creature RT-0000, Director Vane notices." (true: one unique Vane line. Text Bot to write it.)

---

## 4. Music and sound (the half of the soul you don't see)

### Principles, with sources
1. **Music carries mood and place when graphics can't.** The composer wrote all the music *and* every creature cry directly for the handheld's sound chip, and used music to tell you where you were ([Masuda interview, PocketMonsters.net](https://www.pocketmonsters.net/content/Interview_A_Conversation_with_Pokemons_Musical_Maestro)).
2. **Tight limits create memorable melody.** Two pulse channels, one wave channel and one noise channel, with the noise volume shaped into a snare. He started with about 30 sketches of 15 seconds each ([Game Freak staff blog, Feb 2008](https://www.gamefreak.co.jp/blog/dir_english/2008/02/index.html)). He wrote melody first and shrank the byte size afterwards ([GoNintendo summary](https://www.gonintendo.com/archives/244057-masuda-details-his-process-for-making-pokemon-music)). Size limits forced reuse and repetition ([The Ringer](https://www.theringer.com/2018/08/27/video-games/pokemon-junichi-masuda-20-year-anniversary)).
3. **Short musical cues signal events.** When a trainer spots you, a short theme matched to the trainer class plays ([Bulbapedia: battle music list](https://bulbapedia.bulbagarden.net/wiki/List_of_battle_music_themes)). Black/White switched to a faster tense track when your HP dropped to 20% or below ([same page](https://bulbapedia.bulbagarden.net/wiki/List_of_battle_music_themes); [Bulbapedia: HP](https://bulbapedia.bulbagarden.net/wiki/HP)).
4. **Music the player can build.** On one bridge, talking to four street musicians added instrument layers (flute, guitar, beatbox, voice) to the area theme for good ([Bulbapedia: Village Bridge](https://bulbapedia.bulbagarden.net/wiki/Village_Bridge); [Serebii BW music changes](https://www.serebii.net/blackwhite/bgmusic.shtml)).
5. **Seasons and areas change the score.** Black/White seasons changed music as well as tiles ([Bulbapedia: Season](https://bulbapedia.bulbagarden.net/wiki/Season_(game_mechanic))).
6. **Silence and dread work by contrast.** The haunted town is remembered for its unsettling theme against a cheerful game ([Pocket Tactics](https://www.pockettactics.com/pokemon-lavender-town)).

### 4.1 Sound palette recommendation
Kilumen is a zero-build web game (`src/main.js`, ES modules), and there is no audio code yet. Recommended approach:
- **Style:** "warm handheld". The core voices are 2 pulse leads, 1 triangle/wave bass and noise drums (the classic 4-voice chip set), **plus one signature colour per zone** taken from a small sample set or FM. Use this sparingly: a bell, a breathy flute, a nylon guitar. This lands between 8-bit chip and the richer DS-era sequenced sound Gary likes from Platinum, without imitating any specific soundtrack.
- **Rules:** melody first. Every zone theme must be hummable after one loop. Loops of 45–90 s. Each zone gets a **Day** and a **Night** arrangement of the same tune (same tempo and key, so they can crossfade). Night version: drop the drums or swap them to brushes, take the lead down an octave, add reverb.
- **Engine (Code):** WebAudio manager with looped OGG files and loop points in a JSON sidecar. It needs: 1.5 s crossfade on zone change, day↔night stem crossfade with no restart, "stinger" ducking (music dips to 30% for jingles and then resumes from the same spot), a battle "pinch layer" that can turn on and off, and an `AudioContext` unlock on the first input.
- **Tools:**
  - **Furnace** (free, open-source multi-chip tracker: Game Boy, NES, FM/YM2612, mixed chips) — [tildearrow.org/furnace](https://tildearrow.org/furnace/), [GitHub](https://github.com/tildearrow/furnace). Best all-rounder.
  - **Dn-FamiTracker** (NES-focused fork, NSF export).
  - **hUGETracker** (Game Boy, used with GB Studio) — [GB Studio Central](https://gbstudiocentral.com/tips/vgm-sound-effects-part-3/).
  - **LSDj** (Game Boy, performance-style).
  - **DefleMask** (FM plus chips).
  - **OpenMPT** (sample tracker, good for the DS-era "small soundfont" sound).
  - **BeepBox / JummBox** (browser sketchpad, good for drafting the "30 × 15-second sketches" step).
  - Plugins for a DAW: **Magical 8bit Plug 2** (free), **Dexed** (free FM), **Plogue chipsounds** (paid).
  - SFX: **jsfxr / sfxr**, **ChipTone**, **Bfxr**.

### 4.2 Leitmotif bible (write these 5 first, before any zone track)
| Motif | Shape (original, to be composed) | Where it appears |
|---|---|---|
| **River** (Riverbank Stranger / Guardian / dream) | 5 notes, modal (D Dorian suggested), rises a 5th then falls stepwise, unresolved | Title screen (solo wave voice), opening dream, E1 pillar puzzle, Brookhollow night countermelody, Guardian battle (full), ending (resolved at last on the tonic) |
| **Ron** | Bouncy 4-note pickup in major, a little too eager | Ron's cutscenes, every Ron battle (faster each city), minor and slow in the layoffs/low point, played on a cheap toy-piano timbre for comedy beats |
| **Revival Tech** | Clean 3-chord bell arpeggio, like a corporate jingle | Office, terminals, company task-complete jingle. **Reharmonised** later (same melody over minor or diminished chords) once the dark undertone surfaces, so the player's own "task complete" jingle starts to feel wrong |
| **Home** (Brookhollow) | Warm 8-bar tune | Brookhollow; heal-centre jingle is its first 2 bars; ending credits |
| **Journey** (player / starter) | Brave 2-bar call | Starter choice, Master coin get, final Battle Master battle (reprise, combined with Home) |

### 4.3 Track list per zone and moment
BPM values are starting points. "Signature colour" is the one extra voice beyond the 4-voice chip core.

| Track | Mood | BPM | Key / feel | Signature colour and notes |
|---|---|---|---|---|
| Title | Wistful, wide | 72 | D Dorian | River motif on the wave channel, slow arpeggio, water noise |
| Opening dream | Suspended, cold | free / 60 | — | River motif, heavy reverb, no drums, water bed |
| Brookhollow (Day/Night) | Home, small-town morning | 92 | G major, 6/8 lilt | Nylon-guitar pluck; Night adds River countermelody |
| Ron's house / bedroom | Cosy | 84 | — | Music box version of Home |
| Revival Tech office | Upbeat corporate, slightly hollow | 118 | C major | Marimba-like bell; RT motif |
| Heal centre | Safe | 96 | F major | Soft bell pad; Home motif |
| Shop | Bouncy | 124 | — | Short 30 s loop, slap-bass triangle |
| Route 1 / Sunmeadow (Day/Night) | Open sky, first adventure | 132 | D major | Breathy flute; Night: crickets and half tempo feel |
| Fernwick | Old, gentle, mossy | 88 | E minor → G | Wooden flute plus pizzicato |
| Fernwick Hall (Master) | Focused | 104 | — | Low drum ostinato |
| Thornwood | Curious, a little lost | 108 | A Dorian | Muted xylophone, birdcall noise |
| Greystone Caverns | Echoey, patient | 76 | B Phrygian | Drip percussion, long reverb, sparse |
| Revival Heights | Glassy, impressive, cold | 116 | B♭ Lydian | FM electric piano; RT motif hidden in the bass |
| Saltmere | Salty, working harbour | 100 | C Mixolydian | Accordion-like square, rope-creak SFX bed |
| Weigh-In | Silly show tune | 140 | — | Brass-stab square, crowd noise |
| Mirefen (fog) | Uneasy calm | 66 | — | Detuned wave pad, frog noise; **the drums drop out entirely in fog** |
| Tidewater Coast | Breezy, bright | 124 | — | Steel-drum-ish FM |
| Lanternport (Day/Night) | Romantic harbour | 96 | E♭ major, swing | Night: lighthouse horn as a pedal note |
| Frostspire | Thin air, sacred hush | 70 | — | Glass bell, wind noise; shrine area is near-silent |
| Cindervale | Industrial heartbeat | 112 | — | Anvil hits on beats 2 and 4, low square |
| Aurelith city | Grand, festive | 128 | — | Fanfare squares |
| Aurelith arena (Battle Masters) | Peak | 160 | — | Journey motif reprise; final Master adds the Home motif |
| Lumen Line train | Rhythm of rails | 120 | — | Rail clack as percussion |
| Bike (Courier Bike) | Freedom | 150 | — | Key change up a tone from the zone track's key |
| Tideglide | Gliding | 110 | — | Wave-voice arpeggios |
| Wild battle | Urgent, fun | 168 | — | Short intro hit, loopable |
| Enraged-variant battle | Harsher | 176 | — | Same theme with distorted bass. Signals "this one is different" |
| Trainer battle | Driving | 164 | — | — |
| Ron battle | Cheeky rivalry | 164 | — | Ron motif all the way through |
| Revival Tech / opposition battle | Tense | 150 | — | RT motif reharmonised (company); River fragment (opposition) |
| Master battle | Proud | 156 | — | Town colour instrument plus the battle core |
| Guardian (legendary) battle | Awe | 140 | — | River motif in full, slow intro |
| Victory (wild / trainer / Master) | Relief | — | — | 3 different lengths |
| Haunted / memorial place (see 6.3) | Grief, not horror | 54 | — | Solo wave plus music box. Leave whole bars of silence |
| Ending / credits | Release | 84 | — | Home + River resolved + Ron, combined |

### 4.4 Eye-contact stingers (2–3 s, then the battle track starts)
- **Kid / youngster**: playful, rising.
- **Hiker / worker**: stompy.
- **Company staff**: RT motif, clipped.
- **Opposition / dissident**: River fragment, minor.
- **Ron**: his pickup motif, flat-out.
- **Master**: town colour plus drum roll.

### 4.5 Jingle list (short, non-looping; all duck the music)
Item get · key item get · **challenge coin get** (Journey motif, 6 s) · heal (Home, 3 s) · creature caught · **Cosmic shimmer** · **Enraged sting** (see 1.7b) · level up · skill learned · evolution start (rising) / evolution done · **company task complete** (RT motif. Gets reharmonised later) · employee ID level-up · Kilindex milestone (every 25 entries; the full Kilindex covers 450 base creatures (evolutions included), plus special variants such as Enraged and Cosmic, which are tracked as markers, not extra entries) · **Warmth up** (tiny two-note chime when the crystal visibly shifts tint) · save · phone ping (text) / phone ring (call) · rematch request · weigh-in record · egg hatch · rail departure whistle · Skylift launch · Tideglide entry · bike bell (interact button while riding) · run away · lose / black out (soft, not punishing).

### 4.6 SFX list
Menu move / confirm / cancel / error (4 sounds, all quiet) · text blip (pitched per speaker gender/age, mutable) · footsteps per surface (grass, path, wood, stone, sand, snow, boardwalk, shallow water) · tall-grass rustle (sync to the existing 90 ms × 3 `rustle` anim) · door open / warp whoosh / stairs · ledge hop · bump into wall (soft thud, rate-limited) · bin rattle · hit (normal / super / weak, 3 weights) · crystal "ping" when energy is overused · faint drop · crystal raise / absorb / pulse (1–4, by odds) / rune lock + bloom / break-free · **low-energy heartbeat** (see below) · Glowcall, Brushbreak, Stonebreak, boulder push, pressure plate click, crystal switch hum · rain and storm beds · river bed · crowd bed · lighthouse horn.

### 4.7 Low HP / low energy
When the active creature drops to **≤20% HP**, a pinch layer fades in: the bass doubles in tempo and a quiet **crystal heartbeat** sound pulses (a soft violet "thrum", not a beep). This differs from the studied games' approach. It also teaches the player that the crystal reacts to distress, which foreshadows the story. — **S** · Audio, Code

### 4.8 Creature cries
Each creature gets a 0.3–1.0 s cry built from 2–3 chip voices plus pitch envelopes. One sound designer can cover a family with 1 base cry plus pitch/length variants per evolution stage. **Variants:** Large creatures play the cry about 3 semitones lower, Small ones about 3 higher, Cosmic ones get a shimmer tail, and Enraged ones get a distorted attack. — **L** for all 450 base creatures (evolutions included); variant treatments are applied on top in code, **S** per family · Audio

---

## 5. Animation and juice (feedback that makes every press feel good)

### Principles, with sources
1. **Juice is functional feedback, not decoration.** Easing, particles, sound and screen effects together make simple actions feel alive ([Juice It or Lose It, Jonasson & Purho](https://gamedesign.gg/watch/juice-it-or-lose-it/)). Hit pause, shake and permanence (marks that stay) sell impact ([The Art of Screenshake, Nijman — via Kenney's list](https://kenney.nl/knowledge-base/learning/must-see-videos-for-indie-developers)).
2. **Ambient motion on the overworld is what fans remember.** Moving water, clouds, rustling grass, footprints ([Reddit summaries above](https://www.reddit.com/r/pokemon/comments/a3zxxd/whats_a_small_detail_in_the_games_that_you_loved/)), and ash trails you can draw by walking ([TheGamer](https://www.thegamer.com/pokemon-ruby-sapphire-route-113/)).
3. **Low fidelity invites the player's imagination.** Suggest a feeling; don't render it all ([Melodic Ambient](https://melodicambient.substack.com/p/why-were-older-pokemon-games-more); [Masuda on 2D "like a picture"](https://www.gamedeveloper.com/design/the-art-of-balance-pok-mon-s-masuda-on-complexity-and-simplicity)).

### Kilumen ideas
- **5.1 Spotted!** A trainer's eyes flash, a 1-frame **violet spark** appears over their head (Kilumen's own symbol, not a "!" copy), they take a short hop, then they walk up. Add the class stinger from 4.4. A company NPC's spark is a tiny RT logo. Emote set for everyone (NPCs and the buddy): heart, sweat drop, "…", music note, zZz, anger squiggle, question, sparkle. — **S** · Anim, Code
- **5.2 Battle impact pack.** On hit: a 2-frame white flash, a 60 ms hit-pause, 3 px horizontal shake for normal hits and 6 px for a strong hit, then the HP bar drains with a tick sound. Faint: the sprite drops and fades, and the crystal does a dim **flicker**. Energy overuse: the crystal flashes hot pink and cracks for a moment. Battle intro: a different transition per context (wild grass = leaf wipe, Enraged = jagged shard wipe, trainer = horizontal bars, Ron = his jacket colour, Master = coin flip, Guardian = slow white-out). — **M** · Anim, Code
- **5.3 Catch drama, Kilumen style.** No throw and no summon at the feet. The trainer **holds the dominance crystal out with one arm extended** (not both arms in the air; Gary, 11:37 PM CT); violet runes (or a beam) reach the foe, the Kilumen **dissolves into light and streams into the held crystal**, and the crystal **pulses in the trainer's hands 1 to 4 times by catch odds**. Success: the runes lock and the crystal blooms. Break-out: the light bursts back out, varying per type (Fire bursts, Water splashes, Wind gusts). New crystal shape, no middle band. Needs a one-arm-extended trainer pose (Character models). — **M** · Anim, Audio *(Updated Oct 22, 2026, Gary 11:05 PM CT: "just have the trainer hold the crystal up and it absorbs the kilumen".)*
- **Evolution (Kilumen style).** Crystal veins spread across the creature, then the new form is revealed. No white silhouette flicker, no full-screen flash, and never the line 'What? X is evolving!'. *(Updated Oct 22, 2026 per Gary-approved IP check, design/IP_CHECK_ANIMATION_2026-10-22.md: Gary approved the redo, 11:04 PM CT.)*
- **Heal centre (Kilumen style).** All of the team's crystals go into one cradle together, then a scanner sweep. No 6-slot tray and no 'nurse' (the healer is the carer). *(Updated Oct 22, 2026 per Gary-approved IP check, design/IP_CHECK_ANIMATION_2026-10-22.md: Gary approved the redo, 11:04 PM CT.)*
- **5.4 Party and menu life.** Party icons bob in 2-frame idles. The lead's icon bobs faster. Low-HP icons droop and bob slowly. Cosmic icons twinkle every 4 s. In the team screen, a creature flips to face you when the cursor lands on it. Trainer card: a holographic employee-ID tier strip that gets shinier with each employee ID level (not the one-time story promotion; see 8). — **S** · Anim, Code
- **5.5 Ground that remembers.**
  - Footprints in sand (Tidewater) and snow (Frostspire) that fade after about 4 s.
  - Wet footprints after leaving water.
  - Splash rings when walking in shallow water.
  - Ash knocked off grass in Cindervale.
  - Water reflections under the player and NPCs on bridges and the boardwalk.
  - The tall-grass `rustle` already exists. Add 1–2 leaf particles on the first step into a patch.
  - Doors: a 2-frame open animation and a short fade with a footstep at the end.
  - Warp variety: stairs slide, doors fade, rail stations use a train-window wipe, Skylift uses a cloud wipe.
  
  — **M** · Anim, World, Code
- **5.6 Text pacing.** A per-speaker text-blip pitch, punctuation pauses (comma 80 ms, full stop 200 ms, "…" 400 ms), **instant-print on button hold**, a shaky-text tag for scared lines and a small-text tag for mumbles. Ron's lines print slightly faster than everyone else's. — **S** · Code, Text
- **5.7 Idles everywhere.** NPCs: blink and look around (already planned), plus one personal idle each (the fisher casts, the elder leans on a cane, the kid kicks a stone). The player gets a 10-second idle (checks the phone). Trail Buddy idles: sniffs, yawns, sits. — **M** · Anim

---

## 6. Story and emotion (earned feelings)

### Principles, with sources
1. **A safe world makes one sad place unforgettable.** The haunted town worked because the rest of the game is sunny. It let children face death without being told about it ([Pocket Tactics](https://www.pockettactics.com/pokemon-lavender-town)). A later resting-ground tower repeated this with a mourner whose partner was killed by villains ([Bulbapedia: Lost Tower](https://bulbapedia.bulbagarden.net/wiki/Lost_Tower)).
2. **The strongest story questions the core mechanic.** Black/White's antagonist asked whether owning creatures is right, and a manipulator used that ideal as cover for domination. The game invited players to question themselves without resolving it ([Press Start journal article](https://press-start.gla.ac.uk/press-start/article/download/362/181); [TechRaptor](https://techraptor.net/gaming/features/confronting-truth-and-ideals-n); [CBR](https://www.cbr.com/pokemon-black-white-story-morality-nintendo/)).
3. **The enemy-becomes-ally arc, and creatures as living things** ([Ohmori & Masuda interview](https://www.pokemon.com/uk/pokemon-news/interview-with-game-freaks-ohmori-and-masuda-on-pokemon-sword-and-pokemon-shield)).
4. **Vignettes over exposition.** Drop in on lives; don't explain the world ([The Guardian](https://www.theguardian.com/games/2020/jan/27/what-pokemon-can-teach-us-about-storytelling-nintendo-games)).

### Kilumen ideas
- **6.1 Ron's arc: from co-worker to equal.**
  - **Fernwick:** cocky and lucky.
  - **Saltmere:** jealous of your employee ID level.
  - **Revival Heights:** he gets the layoff warning letter and wonders whether he's good at anything (the minor Ron motif plays). You battle him anyway. He loses for real and laughs it off a little too quickly.
  - **Lanternport:** he finds a field team log page before you do and **chooses to share it**. This is the turn toward trust.
  - **Final:** he stands beside you against the company, then takes the bins out.
  - Each Ron battle opens with one line about the bins.
  
  — **M** · Story, Text
- **6.2 The villain's motive: comfort, not cruelty.** Director Hollis Vane genuinely believes the crystals **prevent** creature suffering. Unbound creatures go Enraged (hence the design doc's rule that out-of-grass encounters are always the Enraged variant). His line: "Wild is not free. Wild is frightened." The opposition (the Riverbank Stranger's people) believe the crystal itself causes the fear. **Both are partly right**, which matches the "testing implied, never stated" rule. The player's Warmth data (1.1) is the evidence that a bond can exist **without** domination. — **M** · Story
- **6.3 The Lantern Rest (the tone-shift place).** A small memorial clearing at the edge of `greystone_entrance`, or a dedicated small map. Little stone markers each have a name and a creature's name. A quiet NPC keeps a Gloamtick whose lantern holds "the spark of my old friend". There are no battles and the music is nearly silent (4.3). One marker is blank. The keeper says it's for "the field team, until they come home." If they are found in the post-game, a name gets carved, or the blank marker is removed. This place makes the Gloamtick lore land emotionally. — **M** · World, Story, Text, Audio
- **6.4 The ending pays off the crystal.** In the finale the Guardian offers to **release every crystal**. Creatures with high Warmth stay with you anyway: their crystal goes clear and you see their true colour. Low-Warmth creatures walk off happily (they aren't lost forever; they wait at the Field Camps). A moving, mechanical proof of the theme. — **L** · Story, Code, Anim
- **6.5 Stop-and-look moments (one per zone).** One wide, quiet framing per zone, triggered once. The camera pans a little ahead, the music thins, and there is one line of text. Examples: first sight of Revival Heights' glass tower from the rail window; the Lanternport lighthouse sweeping the bay at Night; Frostspire's silent shrine; Sunmeadow at dawn with Halovy rising; the Fernwick elder's fireflies coming back after the ending. — **S each** · World, Code, Story
- **6.6 The missing field team as the quiet spine.** Four named researchers. Each one's camp (1.9) holds a log page that reveals a bit of their personality (one doodles, one rates lunches). This makes their absence felt, and finding them in the post-game a reunion, not a twist. The last check-in point stays Greystone. — **M** · Story, Text

---

## 7. Accessibility and comfort (cutting friction keeps the soul in view)

### Principles, with sources
1. **Repeated-use items should re-prompt.** A later game asks right away whether to use another encounter-repelling spray when the last one wears off ([Bulbapedia: Repel](https://bulbapedia.bulbagarden.net/wiki/Repel)).
2. **Organised bag pockets and a registered quick-use item.** Gen 4 had 8 pockets, and one key item could be bound to a button ([Bulbapedia: Bag](https://bulbapedia.bulbagarden.net/wiki/Bag); [Bulbapedia: Feature registration](https://bulbapedia.bulbagarden.net/wiki/Feature_registration)).
3. **A watch device full of tiny tools.** The Gen 4 wrist device had over 20 small apps, including a step counter, a friendship checker, a plant finder and a marking map ([Bulbapedia: Pokétch](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9tch)).
4. **Approachability first.** The goal is to keep a complex game simple to pick up ([Masuda, Game Developer](https://www.gamedeveloper.com/design/the-art-of-balance-pok-mon-s-masuda-on-complexity-and-simplicity)).

### Kilumen ideas
- **7.1 Run toggle.** Trail Runners are already given in Fernwick. Add a settings option for "Always run / Hold to run", and allow running indoors (already allowed). — **S** · Code
- **7.2 Hush Spray (encounter ward) with a re-prompt.** When it wears off: "The Hush Spray wore off. Use another? (3 left)" with Yes as the default. Note: out-of-grass encounters are always Enraged, so the ward should also cover those. — **S** · Code, Text
- **7.3 Phone apps as quality of life.** The smartphone already has quests, tasks, minimap, team, inventory and the stat tree. Add: **Step counter** (also shows the buddy's Warmth as a crystal colour), **Plot watch** (feed garden ready?), **Schedule** (today's weekday events), **Map pins**, **Weigh-in records**, and **Contacts** (rematches). — **M** · Code, Text
- **7.4 Bag pockets and quick keys.** Pockets: Care (tonics), Feeds, Gear (held items), Crystals/Capture, Key, Mail/Logs. Register up to **2** field items to hotkeys (bike, Glowcall). Sort by "recent". — **S** · Code
- **7.5 Friction cuts.**
  - Text speed setting plus hold-to-skip.
  - "Heal all and go" at heal centres skips the dialogue after the first visit.
  - Shops remember your last quantity.
  - The company terminal can be opened from any heal centre.
  - Skip the battle intro animation after you've seen it 3 times (setting).
  - Colour-blind safe crystal tints (Warmth uses brightness and a small shape marker, not hue alone).
  - Volume sliders per channel (music, SFX, cries, text blips).
  - A reduced-motion option for screen shake and flashes.
  
  — **S each** · Code, Text
- **7.6 Never lose progress to a mistake.** Autosave on map change, plus a "Return to last heal centre" option after a loss, with no money penalty beyond a small one that fits the setting ("company health plan copay"). — **S** · Code, Text

---

## 8. Gary's picks

*Added Thursday 2026-10-22, 7:30–7:35 PM (America/Chicago), from Gary's notes inspired by Platinum and SoulSilver. Everything here is original Kilumen material: no competitor names, creatures, text or exact mechanics. It follows Story Bot's rulings in `design/STORY_RULINGS_SOUL.md`: every creature has its own **lumen**, crystals smother it, Warmth is the lumen pushing back because the creature chooses you, the crystal never comes off before the ending, and Warmth never causes disobedience.*

**Rank rule for this whole section.** The player starts as a **junior lab tech** at Revival Tech. The tutorial (8.1) is the lab-tech section, and it ends with the existing promotion scene in `office_int`. There the manager promotes the player **and Ron** to field researchers because the old field team stopped reporting in. That scene sets `flg_promoted` (CRITICAL_PATH.md step 0, and the design doc agrees). Before `flg_promoted`, every line calls the player "lab tech". After it, the player is a field researcher for the whole adventure. Nothing else in the game depends on a later promotion. Later perks use **employee ID levels** (the design doc's Company Benefits Board) or story flags.

**Creature roster.** Kilumen plans **450 base creatures (evolutions included), plus special variants such as Enraged and Cosmic**. Every evolution stage counts toward the 450, and at least 350 of them belong to 2–3 stage evolution lines. Variants are buff rolls on top of a base creature (see 1.7 and 1.7b), so they don't add to the 450. Gary has given Coder the roster outline. It isn't in `/workspace/kilumen` yet: I checked `src/`, `tests/` and every json and md file. The 16 creatures with art so far are just the ones designed to date:
- **Earth starter line:** Tumbloam → Burrowmane → Bastonox
- **Fire starter line:** Cindrip → Emberlunx → Forgeharrow
- **Water starter line:** Rillop → Brookhorn → Tidemarrow
- **Wild:** Sailquill, Halovy, Gloamtick, Runeskein, Burlbeetle, Mirewump, Slagrook

**Species named in this section are placeholders** taken from the current art set. Swap them for the right rares from the full roster once Coder's outline is in hand.

---

### 8.1 Lab-tech onboarding = the tutorial — **M** overall · Coder (lead), Text Bot, World Design, Story Bot, Animator

**Principle.** Every game in the series opens with a short, guided first hour. Kilumen's twist is that **company onboarding is the tutorial**. Revival Tech's bright, upbeat voice teaches the controls, and on a replay it reads ironically ("Our crystals keep every creature calm and happy!").

**New people and places**
- **Lab Lead Ines Varga** (new NPC, original). Brisk, kind and a true believer in the company. She runs the lab and leads your supervised trip outside. Later she sends 3–4 inbox emails, and the last one, after the tint-drift log, is quietly worried. — Sprites (NPC sprite), Text Bot, Story Bot
- **`office_lab_int`** (new interior, about 14×10). It's reached through a new door on the `office_int` north wall at **(6,2)**, from (6,3), which is walkable. It has 3 holding pens along the top wall, a feed bench, a wall screen (the orientation video), a type-chart poster and a crystal-fitting bench. — World Design

**Step by step** (each step lists the map id, what is taught, and the job for each bot)

| # | Map / spot | Lesson | What happens | Skippable? |
|---|---|---|---|---|
| 1 | `house_2f`, dream, then wake at `player_start` (2,4) | **Move** | The river dream from the design doc (3 panels: stuck in the river, the trainer on the bank, then you on the bank). You wake up and a one-time hint shows the move keys. It fades after 4 tiles. | The dream skips with a button hold |
| 2 | `house_2f` PC (4,3) | **Talk / interact** | The interact prompt shows the first time you face the PC. Inbox: "Lab Tech Onboarding: report 9:00". | Hint only |
| 3 | `house_1f` Ron (6,4) | Talking to NPCs | The existing layoffs chat. Ron then follows you (Trail Buddy follow code, reused for a human). | — |
| 4 | `brookhollow`, walk to the office door (28,8) | Reading signs, the map edge | You can read `sign_town` (12,10) and `sign_office` (27,10). The east road is closed (`rt_guard_east` (31,11)). Ron makes one comment on the bins at (7,8). | Free walking |
| 5 | `office_int`, receptionist (7,4) | — | "Lab techs? Orientation's through the back." The new door at (6,2) opens. | — |
| 6 | `office_lab_int` wall screen | Company voice | A 20-second orientation video in the company's voice, made of 4 slides with a mascot-free logo. | Skippable (button) |
| 7 | `office_lab_int` pens | **First creature** (handling) | You feed the 3 pen units RT-0001 Tumbloam, RT-0002 Cindrip and RT-0003 Rillop. Each reacts in its own way (curls up, sneezes sparks, splashes you). Pick one: "The lab assigns you RT-000X." then "It seems to have assigned you back." Then the **nickname prompt** (1.3). Ron takes the unit whose element yours beats, so he has a reason to grumble later. | The choice can't be skipped; the text can |
| 8 | `office_lab_int` crystal bench | Crystal and lumen setup | Ines shows the violet crystal: "Keeps them calm. Keeps them ours." Your unit's crystal glints, and a tiny flash of its own colour shows for 1 frame. That plants the Warmth idea (1.1). | Text skippable |
| 9 | `route1` south grass, zone x7–11 y28–31 (from the Brookhollow north exit) | **First guided battle** | Ines walks with you. A scripted wild **Sailquill**, low level. Each prompt appears **once**, as a short card: Skills, Energy meter ("each skill costs energy; overuse strains the crystal"), HP, the switch button and the Run button. The battle can't be lost (the wild creature flees at 1 HP). | **The only fixed battle.** Prompts are skippable with a button hold |
| 10 | Same grass | **Guided catch** | A second scripted encounter, a Burlbeetle that wandered south. Ines gives you 3 starter crystals. She explains the design doc's targeting: "The weaker it is, the clearer it looks. Clear means ready." The target goes more see-through as its HP drops. The catch always succeeds on the first try. | Skippable after it's been seen once |
| 11 | `route1`, turnback trigger across y=26, x1–18 | Fence for the tutorial area | Before `flg_promoted`, stepping north shows Ines's line "That's field territory. We're lab." and you turn back. | Removed at `flg_promoted` |
| 12 | `brookhollow`, Revival Point door (6,19) → `heal_centre_int` healer (6,3) | **Healing** | Ron's unit is tired from showing off. You heal at the company branch (8.2). Staff: "Lab badge? Staff heal is free." The **company terminal** (11,4) is introduced as the Learning Portal (see below). | Text skippable |
| 13 | `heal_centre_int` | **Menu, bag, save** | Ines hands over the **company phone**. One card each: Team, Bag (pockets, see 7.4), Kilindex, Tasks. Saving is framed as **"File today's report"** and autosave is explained once. | Each card shows once; all are skippable |
| 14 | `office_int`, manager (13,5) | **Promotion** | The existing promotion scene: the field team stopped reporting in, the last check-in was Greystone, and you and Ron are now field researchers. Sets **`flg_promoted`**. Then the design doc's choice: Ron as **co-op partner** or **friendly rival**. Ines: "Field. Huh. Bring my units back in one piece." | Not skippable (it's the story), but text skips |

**Lessons taught later, at the moment they're first needed** (one card each, then stored in the Learning Portal)
- **Running.** In `fernwick`, Ron hands over the Trail Runners after rival battle 1 (`has_run_shoes`). Card: hold to run, plus the "Always run" setting (7.1).
- **Bike.** At the Saltmere office (`has_bike`). Card: mount and dismount, bike-only boardwalks (Route 1 x10–18 y10), and the Thornwood ramp.
- **Field skills.** The first time the player faces a blocker that needs one:
  - **Skylift** after the Frostspire coin, with the picker explained.
  - **Tideglide** at the first floodwater in Mirefen.
  - **Brushbreak, Stonebreak and Glowcall** the first time you face thick brush, a cracked rock or a dark cave. Each blocker shows "Looks like a job for a creature that knows {skill}." until you have it.
- **Type matchups, taught in context, never as a lecture.** The Kilindex records matchups as you *see* them ("known types", as in the design doc). The first time a hit is strong or weak, a one-line card appears ("Water soaked that Fire type. Noted."). After that, the skill menu shows a small up or down arrow next to skills whose matchup you've already seen. Ron's rival battle 1 is the first real test, because his unit was picked to have an element edge. The `office_lab_int` type-chart poster stays readable all game.
- **Held items** the first time you get one. **Hush Spray** on the first purchase.

**Keeping friction low**
- Lines are 1–2 pages each. No tutorial card is longer than 2 lines × 40 characters.
- Only the battle in step 9 is fixed. **Every prompt after the first battle can be skipped**, and a hint toggle in Options turns hint cards off entirely.
- On **New Game+ or any second save slot**, the first menu asks "Experienced hire?". Yes skips steps 5–13, but you still pick a pen unit and get the nickname prompt. You go straight to the promotion with 5 starter crystals, the phone, and all Learning Portal lessons marked as read.
- **Learning Portal.** Every company terminal (`heal_centre_int` (11,4), the `house_2f` PC) has "Training Modules". These replay any lesson card or a short practice battle against Ines's lab unit. In-world: "Mandatory refresher training. Completion is tracked."

**Lines needed (Text Bot).** Drafts follow the 40-character page rule. `/` marks the page's line break.
- `tutorial.hint.move` "Arrow keys or WASD to walk."
- `tutorial.hint.interact` "Face something and press E to check it."
- `maps.house_2f.pc_onboard` "From: Lab Admin. Subject: Day 1" / "Report 9:00. Bring: yourself. Lunch: no."
- `maps.office_int.receptionist` (pre-promotion variant) "Lab techs? Orientation's through the" / "back. Mind the wet floor. It's always wet."
- `maps.office_lab_int.screen` 4 slides, for example "Revival Tech: every creature, cared for." / "Every crystal, a promise kept."
- `maps.office_lab_int.ines_*` (about 12 pages): welcome, feeding, the pick, the crystal ("Keeps them calm. Keeps them ours."), the trip, the turnback ("That's field territory. We're lab.").
- `tutorial.pen.pick` "The lab assigns you RT-000X." / "It seems to have assigned you back."
- `tutorial.battle.*` 6 cards: skills, energy, HP, switch, run, win.
- `tutorial.catch.*` 3 cards: raise, clarity, success.
- `tutorial.heal.staff_lab` "Lab badge? Staff heal is free." / "Everything here is free. Don't tell anyone."
- `tutorial.phone.*` 5 cards: team, bag, Kilindex, tasks, "File today's report".
- `tutorial.types.first_strong` / `first_weak` with {type} slots.
- `tutorial.run`, `tutorial.bike`, `tutorial.skill.{name}`, `tutorial.held_item`, `tutorial.hush`.
- `menu.new_game.experienced_hire` "Experienced hire? Skip orientation."
- `portal.*` the menu titles.
- Totals: about **60 pages**.

**Scripted events (Coder)**
- Dream cutscene player
- One-time hint system with a persistent "seen" set saved in the file
- Ron follow (human follower)
- Lab pen pick, plus the logic that picks Ron's unit
- Scripted, unlosable battle with a prompt-card overlay
- Guaranteed-catch override
- Turnback trigger zone that is removed at `flg_promoted`
- Phone hand-off
- Save framed as a report
- Experienced-hire skip that sets every tutorial flag
- Learning Portal replay

Proposed flags:
- `tut_lab_done` (new flag)
- `tut_first_battle` (new flag)
- `tut_first_catch` (new flag)
- `tut_phone` (new flag)
- `seen_lesson_<id>` (new flag set)

`flg_promoted` stays exactly where it is.

**Map changes (World Design)**
- New `office_lab_int` and its door at `office_int` (6,2).
- No physical change to Route 1, because the turnback is a trigger.
- A type-chart poster tile.
- Make sure the Route 1 south zone x7–11 y28–31 can be reached from the Brookhollow north exit without crossing other grass.

---

### 8.2 Revival Point: the company's healing branch chain — **M** overall · Story Bot, Text Bot, World Design, Coder, Audio, Animator

**Name options (original).** Pick one:
1. **Revival Point** (recommended): short, works on a sign, and reads as both "care point" and "point of the company".
2. **RT Restore** ("Restore, a Revival Tech service").
3. **Brightwell, by Revival Tech**. Softer branding that hides the logo, which becomes its own irony.

The rest of this file uses "Revival Point". The building interior is the shared map `heal_centre_int` (it uses `$return` warps), so **every change below appears in every branch at once**, which is exactly how a chain works.

**8.2a Staff and how they see you** — **S** · Text Bot, Sprites
- **Care Associates** wear plum-and-white uniforms with violet piping, a lanyard and a name badge. This is a recolour of the existing villager sprite plus a lanyard overlay. The `healer` is at (6,3).
- **Before `flg_promoted`** they treat you as **junior lab staff**: friendly and a little patronising. "Lab badge? Staff heal is free."
- **After `flg_promoted`** they treat you as a **field researcher**, a colleague with a dangerous job: "Field team? Sit, sit. You look like weather."
- **Lines change with employee ID level** (the Benefits Board), for example: "ID level 3? They'll have you managing us soon."
- They remember your lead creature's nickname. They also always say the catalogue number first and correct themselves: "RT-0147... sorry, Pebble."

**8.2b The healing, and the crystal** — **M** · Animator, Coder, Story Bot
- The heal machine (7,1–2) does a **"Recalibrate & Polish"**. One cradle (no 6-slot tray, no nurse): all the party crystals float in, a scanner sweeps them, and they hold a steady uniform company violet (167 / 500 / 333 ms beats), so for that moment **each creature's Warmth tint disappears**. Then the tint seeps back over 8 steps of 250 ms (about 2 seconds): the lumen pushes back (Story Bot #7). No full-screen flash. *(Matches Animator's drawn heal_restore FX, Oct 22.)*
- This is cosmetic only. **Healing never lowers Warmth** (no punishment for healing). Most players will only notice the seep-back once they care.
- **After the first tint-drift log page** (`read_drift_log` (new flag), the same flag Story Bot uses for the jingle swap), the staff can say: "Your units are drifting. Want me to log a recal ticket?" Choices: **"Log it"** (nothing changes, but an inbox memo arrives later thanking you for compliance) or **"No thanks"**. A new counter option then appears: **"Heal only, skip recal"**, and the associate murmurs: "Didn't see anything."

**8.2c The heal jingle** — **S** · Audio, Story Bot
- **Possible clash with a Story Bot rule.** Story Bot's rule #4 says the heal jingle is the first 2 bars of **Home**. Gary wants a **company jingle**. Proposed resolution: the jingle is **Home (2 bars) + a 1-bar "Revival Point" sonic logo**, which is a fragment of the Revival Tech motif.
- At `read_drift_log`, **only the logo bar is reharmonised**. Its melody stays the same over minor or diminished chords. The Home bars never change. This matches Story Bot's swap flag for the task-complete jingle.
- After the ending, the logo bar is dropped and only Home plays.
- **Story Bot to confirm.**
- **The jingle must be original:** composed from scratch, never built from or resembling any Pokémon heal jingle, and checked by ear against it before it ships.

**8.2d Employee perks and the staff-only back room** — **M** · Coder, World Design, Text Bot
- **Perks by employee ID level** (Company Benefits Board):
  - L1: free heals (always).
  - L2: 10% staff discount at company shops. This is a perk, not inflation, so fixed regional prices stay fixed.
  - L3: extra creature storage boxes on the terminal.
  - L4: one free Hush Spray each in-game week.
  - L5: priority Lumen Line seating, a joke perk with one unique conductor line.
- **The back room (`heal_centre_back`, new interior, about 10×8).** It's reached through a door in the back wall at **(2,2)**, behind the counter. The counter's open west end at **(2,4)** and **(3,4)** gets a "STAFF ONLY" rope (gate tiles) until it unlocks.
  - **Unlock (not tied to the promotion):** the **Branch Access Card**, a reward for the company catch task milestone **30** and given at Revival Heights HQ. On the critical path this naturally lands around `beat_master_revival`. Flag `has_branch_card` (new flag).
  - **Contents:**
    - The staff break table, with a passive-aggressive fridge note that changes every chapter.
    - Crates of spare crystals labelled by catalogue range.
    - A **recalibration log binder**. Its per-branch "drift" counts rise across the game.
    - After `read_drift_log`, one memo on a clipboard: "Field team units: do not recal. Forward to HQ. – H.V." It is implied only, never explained (per the design doc's "testing implied, never stated").
    - The same back room in every branch, with a different fridge note per town as a nice touch. This needs a per-town text key and is optional.

**8.2e Posters, suggestion box, newsletter** — **S** · Text Bot, World Design, Coder
- **Posters** on the back wall at (2,2) and (12,2). Each one has its own text and changes by flag:
  - Before promotion: "Lab Safety: Two Hands, One Creature."
  - Act 1: "Rest Is Productivity!"
  - After `has_rail_pass`: "Ride the Lumen Line: Arrive Calm."
  - After `read_drift_log`: "Drift Happens. Report It." with a smiling crystal mascot, which now reads as unsettling.
  - Ending: replaced by a community board (see 8.2f).
- **Suggestion box** (a new prop at (13,4), interacted with from (13,5)). Once per in-game week, pick one of 3 silly or earnest suggestions, for example "More chairs.", "Let creatures pick the music." or "Why are the crystals violet?". Your pick shows up in the next newsletter's "You Said, We Did" column. The crystal question is answered with corporate fog every time until the ending.
- **Newsletter: *The Point*** (weekly, readable on terminals and in a rack by the sofa). One issue per major flag, about 16 issues in total, each with 3 short items. Rank-aware examples:
  - Pre-promotion: "Welcome, new lab techs!"
  - `flg_promoted`: "Two of our own head into the field. Wish them luck!"
  - `beat_master_revival`: "HQ thanks field staff for record catalogue numbers."
  - Ron's layoff letter: a cheerful "restructuring update".
  - `read_drift_log`: "Tint drift: what it is and why it's nothing."
  - After the ending: the final issue, "Under New Management: Us".

**8.2f After the ending** — **S/M** · Story Bot, World Design, Text Bot, Audio
- The branches stay open and every associate keeps their job. The sign becomes **"Revival Point – Community Run"** with a clear-crystal logo.
- The heal machine polishes **clear** crystals, and the recalibration is gone.
- Posters become a community board (lost and found, weigh-in results, Ron's "help wanted" for the Croft).
- The back-room binder is gone and there's a cake in the fridge. Per Story Bot's cake rule, the "WELCOME BACK" cake belongs to the office's first Friday after the field team comes home. The branch cake can say "THANK YOU, CUSTOMERS" to avoid clashing.
- The jingle loses its logo bar.

**8.2g Is the day care company-run? No: it's deliberately independent.** See 8.3. The contrast is the point. Revival Point heals bodies on a schedule. The Croft grows bonds at a creature's own pace.

---

### 8.3 Wexley's Croft: an independent creature day care — **M** (care/levelling) · **L** with eggs · Coder, World Design, Story Bot, Text Bot, Sprites

**Lore fit.** Every creature has its own lumen, crystals smother it, and Warmth is the lumen pushing back because the creature chooses someone. The Croft is the one place in the region **built around bonds instead of crystals**. It's a farmhouse where creatures are left to live a normal life (eat, nap, wander a paddock), and their lumen shows a little brighter there. It is **not** Revival Tech: no logo, no catalogue numbers, and the keepers use names only.

**Where it is.** On the **Sunmeadow Fields** main meadow (zone `sunmeadow_fields`, status partial; the main meadow map is still to come). It's reached through the Route 1 east exit once the crystal barrier dims (`beat_master_frostspire`). Proposed map ids: `sunmeadow_croft` (outdoor paddock) and `croft_int` (farmhouse). This puts it mid-to-late game, at about the same point the studied games put theirs. **Early taster:** a Croft flyer on the `route1` sign `sign_r1_ne` (40,3), next to the barrier, says "Wexley's Croft – past the shine. Rooms for creatures. No crystals fitted." That makes players curious.

**What it does**
- **Bond growth (the main reason to use it).** Leave up to **2** creatures. Each gains **Warmth** over time: +1 per 200 steps you walk anywhere, doubled if the two get on (same element, or a pair the keepers say "took to each other"). There is a weekly cap, so it isn't a grind exploit.
- **Gentle levelling.** Creatures gain modest experience while you walk. It is **capped at the level of your highest coin Master beaten**, so the Croft can't skip the difficulty curve the design doc asks for. No new skills are learned there; skills come from you.
- **Payment.** Not money. Pay in **feeds** (1 feed bag per in-game day), or do a chore once per day: fetch water, round up an escaped Tumbloam. This ties into the feed garden (1.5) and keeps "fixed prices" intact.
- **Eggs (proposal; Story Bot decides).** If the 2 creatures **both have Warmth 50+** and get on, the keepers may find a **lumen egg**: "Two lights leaned on each other all night."
  - The egg hatches after a step count, as the stage-1 form of a parent's line.
  - This is where the design doc's ~5 **breeding-only creatures** would come from once Character models designs them. Which species are breeding-only comes from Coder's roster outline; none are named here.
  - **Crystal rule (so the ending stays intact):** a hatchling has never been fitted. It rides in the party marked "Unregistered", and the phone pings "Unregistered unit: fit at any Revival Point." It **can't battle until it's fitted** at a branch. The keepers grumble every time. It starts at **Warmth 25** ("first light it saw was yours").
  - **Story Bot to confirm** whether hatchlings go unfitted until fitting, or are hatched "pre-registered".

**NPCs**
- **Nan Ottilie Wexley.** Seventies, straw hat, mud to the knees. She was on Revival Tech's very first field survey decades ago and **quit the week the first crystals were fitted**. She never says why, only: "I liked them better loud." She knew the missing field team; they stayed at the Croft the night before Greystone. That makes her a soft clue-giver for 6.6. She speaks in short, warm, blunt lines.
- **Ferris Wexley.** Her grandson, about 12, a keen scorekeeper who runs the **Warmth Board** (the in-world "rater"). He tells you how warm each creature is in kid terms: "That one would follow you into a lake." He secretly wants to be a field researcher.
- **The paddock.** Your 2 left creatures appear wandering the `sunmeadow_croft` paddock with idles: napping, playing and, at high Warmth, waiting at the fence when you arrive. Talk to them through the fence for a Warmth emote.
- **Post-game:** Ron helps at the Croft part-time (see side story 8.5-F), and lower-Warmth creatures released at the ending often gather here, a natural fit with Story Bot ruling B (they wait at Field Camps; the Croft can be one of them).

**Effort**
- Paddock and house maps: **M** (World Design).
- Care, Warmth and levelling logic: **M** (Coder).
- Eggs and the hatchling fitting rule: **L** (Coder, Story Bot).
- NPC sprites: **S** (Sprites).
- Lines: about 40 pages, **S** (Text Bot).

---

### 8.4 Hidden trade NPCs (6) — **M** overall · World Design, Text Bot, Coder, Story Bot

**Principle.** Out-of-the-way people who swap one creature for another make the world feel lived in and reward exploring. The creature you get back is someone's old companion with a history. **Kilumen twist: a traded creature carries its old bond.** It arrives with **Warmth 10**, not the usual catch value. Its crystal shows a faint **"memory tint" stripe**, the colour its lumen showed for its first trainer. The stripe fades as *your* Warmth grows, which is the lumen choosing again. If you visit its original trainer (OT) again with **Warmth 60+**, they get a closing line and a small gift. Story Bot's rule still holds: Warmth never causes disobedience, so traded creatures always obey.

All six spots are **real walkable tiles in the current maps**, checked against the collision layers. **The Wants and Gives species are placeholders from the current 16-creature art set.** Swap them for the right rares from the full roster of 450 base creatures (evolutions included), plus special variants such as Enraged and Cosmic, once Coder's outline is in hand. Each trade's design stays the same when the species change: the trader (original trainer), the nickname, the memory-tint stripe and the Warmth twist. For now the three starter lines can each be obtained here, so no one misses the starters they didn't pick. Keep that property when you swap.

| # | Trader (OT) | Exact spot | Gate / timing | Wants | Gives (nickname) | Warmth twist | Size · owners |
|---|---|---|---|---|---|---|---|
| T1 | **Odessa Reed**, retired river warden | `brookhollow` (29,2), the walled NE strip, reachable only by water along the river x22–24 | `has_tideglide` | **Mirewump** (Enraged variant) | **Rillop "Pebble"** (Small variant) | At the Brookhollow river edge Pebble wades upstream and stops at the spot of the river dream. That's a quiet echo of the dream; it is not an explanation, so the River motif stays open (Story Bot rule). | S · World, Text |
| T2 | **Hessa Quill**, Lumen Line courier on her day off | `thornwood` (17,13), the bike-ramp pocket next to `tw_bike_cache` (18,15) | `has_bike` | **Slagrook** | **Cindrip "Kettle"** | Kettle wears an **old first-generation crystal** (a duller cut). Warmth gains are ×1.25 because the old cut smothers less. Story Bot to approve. | S · World, Text, Code |
| T3 | **Ivo Stannard**, ex-company miner | `greystone_b1` (24,17), the SE pocket near `b1_item` (22,19) | Cave depth (no gate) | **Halovy** | **Gloamtick "Wick"** | Wick's lantern spark is "the light of Ivo's old canary-creature". Until Warmth 30, Wick hides behind you as a Trail Buddy. The **Lantern Rest** keeper recognises Wick and adds one line at the memorial. | S · World, Text, Anim |
| T4 | **Lune Ashby**, amateur stargazer | `route1` (40,1), the far NE corner just west of the crystal column at x41 | **Night** only | **Runeskein** | **Halovy "Matins"** | When it's your lead at **Dawn in Sunmeadow**, Matins gets a halo glow and +2 Warmth once per day. On meteor night (1.7), Lune's text says "Look up." | S · World, Text, Code |
| T5 | **"Auntie" Prue Hollin**, beekeeper (part of the town's everyone-is-an-aunt gag) | `fernwick` (26,2), the hidden strip behind the NE houses, entered from row 7 | Early, after `flg_promoted` | **Burlbeetle** | **Tumbloam "Biscuit"** | Biscuit sits on every bench (1.2) *and* naps in flower beds. Feeding it Fernwick market feeds gives double Warmth. | S · World, Text |
| T6 | **Corwen Fell**, Mirefen bog postman | `mirefen_bog` (13,3), the islet off the bike boardwalk (12,4–7), next to the islet item (12,2) | **Night**, `has_bike` | **Brookhorn** | **Runeskein "Purl"** | Purl carries one of Corwen's undelivered letters. Read it at a heal-centre terminal to start the **Lumen Chain** (8.5-A). | S · World, Text, Story |

**Chain** (placeholder species, as above). T6 gives Runeskein, which you can trade at T4 for Halovy, which you can trade at T3 for Gloamtick. That makes a one-way story path through three trades (side story 8.5-A). Every trade can also be done on its own with a creature you caught.

**Coder needs (M).**
- A trade system: offer, a check that you have the wanted species and variant, swap, write OT and nickname, set Warmth to 10, and add the memory-tint flag.
- One OT field in the creature data.
- Flags `trade_t1_done` … `trade_t6_done` (new flags) and `trade_tN_reunion` (new flags).

**Text Bot.** About 8 pages per trader (ask, refuse, swap, reunion) ≈ 50 pages.

---

### 8.5 Hidden side stories (7) — optional, multi-step

Each one uses existing zones, NPCs and flags. Proposed flags are marked **(new flag)**.

**A. The Lumen Chain** — **M** · Story, Text, World
1. Trade with Corwen (T6) to get Purl. Read the undelivered letter at any terminal: `sq_chain_letter` (new flag).
2. The letter is addressed to "L. Ashby, Route 1, the high corner". Deliver it to Lune (T4) and trade for Matins.
3. Lune's reply letter is for "I. Stannard, below the caves". Deliver it to Ivo (T3) and trade for Wick.
4. Ivo asks you to take Wick to the **Lantern Rest** (new map `lantern_rest`, off `greystone_entrance`). Wick's lantern brightens at one stone: `sq_chain_done` (new flag).
- **Reward:** a framed letter for your Field Camp and Wick's lantern colour as a Trail Buddy glow.
- **Theme:** lumen is passed on through people.

**B. Dana's Desk** — **M** · Story, Text, World
1. In `office_int`, the cleared desk (the coworker's line "They cleared out Dana's desk Friday") gives a sticky note with an odd shorthand after `flg_promoted`.
2. Unsent drafts in your inbox (secret E3) decode the shorthand: `sq_dana_note` (new flag).
3. A Greystone clue: scratched initials at a camp (1.9), `sq_dana_greystone` (new flag).
4. Post-game Frostspire: the Dana fight (Story Bot: Dana appears only here), `sq_dana_met` (new flag).
- **Reward:** Dana's own team card and the line that she quit, not vanished. **No reveal of the field team's discovery** before the finale.

**C. The Lucky-Crystal Seller** — **S/M** · Text, Story, Code
1. Buy one "lucky crystal" in four cities: `sq_lucky_1`…`_4` (new flags). Each claims a new silly benefit.
2. A compliance memo arrives in your inbox: "unauthorised crystal resale under investigation".
3. After the ending, the seller has finally gone honest (Story Bot's approved line, "Clear crystals. 100% nothing. Finally honest."): `sq_lucky_done` (new flag).
- **Reward:** the **Glass Crystal** held item. It does nothing, but the Trail Buddy loves it (it's plain glass, per Story Bot's ruling).

**D. The Fireflies of Fernwick** — **M** · Story, World, Text, Anim
1. At Night in `fernwick`, the elder asks you to count fireflies at the pond (x15–18, y20–21). Only 3 are left: `sq_fireflies_start` (new flag).
2. The elder gives you **lumen moss**. Plant it at 3 **dig scars**, old crystal-ore cuts at the `thornwood` crystal tiles (27,11), the `greystone_entrance` crystal (16,12) and one more Greystone spot (World Design to pick). Each planting is a flag: `sq_fireflies_scar_1`…`_3` (new flags). The Trail Buddy hums at each one (1.2).
3. Count again: 12 fireflies, `sq_fireflies_done` (new flag).
- **Reward:** the elder teaches **Glowcall** (field skill, unlock still TBD in FIELD_SKILLS.md), which suits optional dark areas only.
- **Theme:** ore is old lumen, so healing the ground brings light back. Full firefly return stays an ending moment (6.5).

**E. The Kid's Last Joke** — **S/M** · Text, Story
1. The `brookhollow` kid (12,20) tells a new bad joke at each coin.
2. After `beat_master_revival` the joke turns flat: "Dad stopped laughing." Their parent (`parent_c` in `house_int_c`, Fernwick warp (22,6)) is reading job ads: `sq_kid_ads` (new flag).
3. Pick up a rehire form at any Revival Point (8.2e suggestion box, "We're hiring Care Associates!").
4. Give it to the parent: `sq_kid_done` (new flag).
- **Result:** the parent appears as a Care Associate at the Fernwick branch, and the kid's final joke is actually good.
- **Theme:** the company can be good for people, which matches the design's grey morality.

**F. Ron's Other Job** — **S/M** · Story, Text
1. After `beat_master_saltmere`, Ron's CV is on the `house_1f` table: `sq_ron_cv` (new flag).
2. At several cities Ron mentions interviews (a Lumen Line conductor, a Saltmere fishmonger) and none work out. This plays as a gag.
3. At the Revival Heights layoff letter (Story Bot: Ron turns minor only here), the side story turns sincere: `sq_ron_letter` (new flag).
4. **Post-game:** Nan Wexley hires Ron part-time at the Croft (8.3): `sq_ron_croft` (new flag).
- **Reward:** Ron's Croft apron outfit and a better breed-check line from Ron.

**G. The Lighthouse Keeper's Forecasts** — **M** · Story, Text, Code, World (Lanternport is still planned)
1. The Lanternport keeper posts a weekly weather and sky forecast on a board.
2. Log 5 correct forecasts by being in the predicted zone during the predicted weather or phase: `sq_forecast_1`…`_5` (new flags).
3. The final forecast is a **meteor night**: a scripted Cosmic encounter at Lanternport (ties to 1.7), `sq_forecast_done` (new flag).
- **Reward:** a "Sky Almanac" phone app that shows the next meteor night.

---

### 8.6 Ranked online battle tower: the Concord Spire, Aurelith — **L** · World Design (floor map), Coder (systems), Text Bot (lines) · Story Bot consult

**Where and who runs it.**
- It is in **Aurelith**, the planned arena city of the 8 Battle Masters (rail-only, `to_come`).
- It is **contested ground**:
  - The building belongs to the independent **Aurelith Arena Guild**, the same guild as the post-game Proving Floor (1.11), so the two can share lobby NPCs.
  - The top-floor **"Lumen Link" relay servers** are **sponsored by Revival Tech**. The RT logo sits on every terminal, and the newsletter (8.2e) boasts about "performance data". The telemetry is implied only.
- **After the ending**, the sponsorship plaque is taken down and the Guild renames the relay **"the Concord Link"**.
- The name "Concord Spire" is original. Text Bot should run a final trademark check.

**In-world framing.** "The Link carries battles between arenas far beyond this region." Other players are presented as **visiting challengers**, trainers from distant arenas. It isn't tied to the promotion or to rank.

**Unlock**
- **Unranked "friend rooms"** open after `all_badges`, as a lobby desk in Aurelith.
- **Ranked** opens after the champion fight with the Battle Masters: `beat_battle_masters` (new flag), or whatever flag Story Bot uses for the end of the main challenge.
- A trainer must also make a **Link Registration**, a one-time account sign-in at the lobby desk.

**Floor layout** (new interiors; World Design)
- **1F Lobby `aurelith_spire_1f`:** Guild reception, Link Registration desk, season banner, cosmetic shop counter, an elevator.
- **2F Link Hall `aurelith_spire_2f`:** 6 matchmaking terminals ("Link booths"), a team-preview bench and a practice terminal against a bot.
- **3F Duel Hall `aurelith_spire_3f`:** the 1v1 arena floor, with spectator seats on two balconies.
- **4F Pair Hall `aurelith_spire_4f`:** the 2v2 arena floor (two players per side), with spectator seats.
- **5F Rank Gallery `aurelith_spire_5f`:** live rank boards per tier, season hall of fame, and the RT-sponsored relay room behind glass, a nod to the telemetry.
- Each floor is about 20×16. Every arena battle uses the existing battle scene; the arena maps are the walk-in framing.

**Ranked ladder** (original tier names on the lumen and light theme)
- **Tiers, low to high:** Spark, then Glimmer, Glow, Lantern, Beacon and Aurora. Each of these has 3 divisions. Above them sits **Zenith**, then the top 100, called **Luminaries**.
- **Seasons** last **8 weeks**. A soft reset at season end drops everyone 1.5 tiers. The first **5 placement matches** don't lose rating points.
- **Rewards are cosmetic and prestige only:**
  - trainer card frames and titles ("Beacon of Season 3")
  - a season ribbon on the creature's Kilindex card
  - lobby banner placement for the top 3
  - victory poses
  - spectator emotes
  - Link booth colour themes
- **Nothing gives power.** That means no creatures, no held items, no XP or level boosts, no stat items, no rank skips and no extra energy.

**Blue Bucks and Dollar Bucks (Gary's network currencies).** These can **only** buy or reward cosmetics. That covers card frames, emote packs, booth themes, outfit recolours, and a season cosmetic track. Earning Blue Bucks by playing ranked is fine. If Dollar Bucks are tied to real money, the rule is even stricter: no power, no random loot boxes (in some regions these need odds disclosure or are restricted), and every cosmetic is also earnable or clearly shown before purchase. **Never** use either currency for creatures, items, Warmth, experience, rank or matchmaking advantage.

**Fairness rules**
- **Level normalisation:** every creature is scaled to **level 50** for ranked using the normal stat formula. Variants (Large, Small, Enraged) keep their modifiers because anyone can catch them; Cosmic is cosmetic only.
- **Formats:**
  - 1v1: bring 6, preview the teams, pick 3.
  - 2v2: each player brings 3 and fields 1. Partner by friend code or solo queue.
- **Clauses:**
  - **no duplicate species** per team
  - no duplicate held items
  - the Guardian is banned
  - a ban list maintained per season
- **Clocks:**
  - **45-second turn timer**. A timeout auto-picks the first affordable skill. 3 timeouts is a loss.
  - Plus a **10-minute total player clock**.
- **Disconnects:**
  - **60 seconds to reconnect**, after which you **forfeit**.
  - If the server is at fault, the result is a no-contest with no rating change.
  - Repeat leavers get queue cooldowns of 5, 15 and 60 minutes.
- **Chat:** preset emotes and phrases only, no free chat. This is safer for a younger audience and less moderation.

**Anti-cheat**
- The battle is **server-authoritative**. Clients send only choices (skill, switch, target). The **server holds the RNG and resolves every turn**, then sends the result log. A modified client can't change outcomes.
- **Team validation on submit:**
  - species legal
  - level and stat ranges legal
  - skills learnable by that line
  - held item legal
  - variant flags consistent
  - no duplicate IDs
- Teams are **locked for the match** after validation.
- Rate limits and replay storage for reports.
- Ratings use a **Glicko-2** style system.
- The local save can be edited because it's a browser game, so **ranked never trusts client stats**. Stats are recomputed on the server from species, level 50 and the variant.

**Realistic Coder needs (why it's L, or really a separate project)**
1. **A shared deterministic battle engine.** Today the battle logic lives in the client (`src/`). Extract it into a pure ES module with no DOM and a seeded RNG, so the server (Node) and the client run the *same* code. This is the prerequisite and is about M by itself.
2. **Netcode:** WebSocket, turn-based. No rollback or lag compensation is needed, because the messages are small JSON turn packets. It needs a reconnect token, plus state resync on reconnect.
3. **Accounts:** a hosted auth service such as Supabase Auth (a Supabase connector is already available to this workspace), with email magic links or OAuth. It also needs a profile table for display name, cosmetics and currency balances. Plus a name filter, a privacy policy, and age and terms text before launch.
4. **Matchmaking:** a queue per format, searching within a rating band that widens every 10 seconds, plus friend-code rooms.
5. **Data:** Postgres tables for players, ratings per season, match records, replays (compressed turn logs), the ban list and cosmetics owned.
6. **Hosting:**
   - A small always-on Node service (any managed container host) next to the database.
   - It is cheap at a small scale, because turn-based traffic is tiny.
   - Monitoring and a kill switch for maintenance.
7. **Spectating:** the server broadcasts the turn log to watchers with a 1-turn delay.
8. **Phasing:**
   - (a) friend rooms (unranked)
   - (b) ranked 1v1
   - (c) 2v2, spectators and seasons
   - Ship (a) first; it's useful for the 1.8 Courier link idea too.

**Text Bot:** about 80 pages: Guild staff, the RT sponsor rep, the Link Registration flow, tier-up and season-end messages, and the after-ending plaque line.

**World Design:** 5 floor maps plus the Aurelith exterior entrance.

---

## 9. TOP 15 "DO FIRST", ranked by soul per effort

| Rank | Item | Why it's high | Effort | Owner(s) |
|---|---|---|---|---|
| 1 | **Flag-aware interactable objects** (TV, PC inbox, bookcases, windows, cooler, bins) — 2.1/2.4 | Turns every room into a scene; text-only work | S | Text, Code |
| 2 | **Spotted! sequence plus class stingers** — 5.1/4.4 | Every trainer meeting becomes an event | S | Anim, Code, Audio |
| 3 | **Ron's running gags and bins prop** — 2.3/E5 | Cheap, ongoing laughs, ending payoff | S | Text, World, Story |
| 4 | **Leitmotif bible (5 motifs) before any track** — 4.2 | Cheapest way to make the whole score feel connected | S | Audio, Story |
| 5 | **Battle impact pack** (flash, hit-pause, shake, HP tick, faint flicker, context wipes) — 5.2 | Every battle feels better | M | Anim, Code |
| 6 | **Trail Buddy with a reaction table** — 1.2 | The single biggest attachment feature | M | Code, Anim, Text |
| 7 | **Crystal Warmth bond system** (visible tint) — 1.1 | Attachment plus theme in one mechanic | M | Code, Sprites, Story |
| 8 | **NPC memory and progress lines** (flag-driven) — 2.2 | The world notices you | S/M | Text, Code |
| 9 | **Day / Dusk / Night palettes plus Day/Night music variants** — 1.4/4.3 | Doubles the mood of every zone | M | World, Code, Audio |
| 10 | **Catalogue ID vs. nickname** — 1.3 | Tiny feature, deep character and theme tell | S | Code, Text |
| 11 | **Comfort pack** (run toggle, Hush re-prompt, text speed / instant print, bag pockets, 2 hotkeys) — 7.x/5.6 | Removes friction that hides the soul | S | Code, Text |
| 12 | **Ambient life layer** (river fish shadows, birds that scatter when you run, fireflies dimming near crystals, footprints) — 2.5/5.5 | The "alive" feeling fans remember | M | Anim, World, Code |
| 13 | **Low-HP crystal heartbeat pinch layer** — 4.7 | Tension plus foreshadowing | S | Audio, Code |
| 14 | **Lantern Rest memorial** (tone shift) — 6.3 | The one sad place that makes the rest feel warm | M | World, Story, Text, Audio |
| 15 | **First 6 easter eggs** (E2 3 a.m. Static, E4 Upstream, E8 Buffer Car, E9 Crystal Stares Back, E10 Lap Nap, E14 Dreams Move Upstream) | Rumour engine; mostly text and flags | S–M | Text, Code, Anim |

**Gary's picks (extra lines; not part of the ranked 1–15, from section 8):**

| Pick | Item | Why it's strong | Effort | Owner(s) |
|---|---|---|---|---|
| G1 | **Lab-tech onboarding tutorial** ending in the `office_int` promotion (`flg_promoted`) — 8.1 | First hour teaches everything in the company's voice; ironic on replay; skippable for repeat players | M | Code, Text, World, Story |
| G2 | **Revival Point branch chain** (staff, recalibrate-and-polish heal, jingle tag, newsletter, back room) — 8.2 | The heal centre becomes a story place that changes with every act | M | Story, Text, World, Code, Audio, Anim |
| G3 | **Six hidden trades with memory tint** (species are placeholders until the full roster lands) — 8.4 | Rewards exploring; every traded creature has a past; all starter lines obtainable | M | World, Text, Code |
| G4 | **Wexley's Croft** independent day care (Warmth growth; eggs pending Story Bot) — 8.3 | The one place built around bonds, not crystals | M (L with eggs) | Code, World, Story, Text, Sprites |
| G5 | **Fireflies of Fernwick** and **Lumen Chain** side stories — 8.5-D/A | Short, optional, and carry the lumen theme | M | Story, World, Text |
| G6 | **Concord Spire ranked online tower**, Aurelith (cosmetic-only rewards) — 8.6 | Long-tail play; build in phases starting with friend rooms | L | World, Code, Text |

**Next tier (after the top 15):** weekday schedule (1.4), Field Camps (1.9), Weigh-In (1.6), Cosmic meteor night plus scripted Cosmic (1.7), story seasons (2.6), the River's First Five puzzle (E1), Lumen Line Courier (1.8), crystal-release ending (6.4), Proving Floor (1.11).

---

## 10. Sources
Accessed 2026-10-22 (America/Chicago). Where a fetch failed, the facts come from the search-result summary; those are marked †.

**Developer interviews and history**
- Masuda interview — https://www.pocketmonsters.net/content/Interview_A_Conversation_with_Pokemons_Musical_Maestro
- Game Freak staff blog (Masuda, Feb 2008) — https://www.gamefreak.co.jp/blog/dir_english/2008/02/index.html
- GoNintendo, Masuda's process — https://www.gonintendo.com/archives/244057-masuda-details-his-process-for-making-pokemon-music
- The Ringer, Masuda 20th anniversary — https://www.theringer.com/2018/08/27/video-games/pokemon-junichi-masuda-20-year-anniversary
- Game Developer, Masuda on complexity and simplicity — https://www.gamedeveloper.com/design/the-art-of-balance-pok-mon-s-masuda-on-complexity-and-simplicity
- Game Informer, creature design — https://gameinformer.com/b/features/archive/2017/08/10/heres-how-game-freak-designs-pokemon-creatures
- Ohmori & Masuda interview — https://www.pokemon.com/uk/pokemon-news/interview-with-game-freaks-ohmori-and-masuda-on-pokemon-sword-and-pokemon-shield
- Iwata Asks, HGSS — https://iwataasks.nintendo.com/interviews/ds/pokemon/0/4/
- TIME, Tajiri profile — https://time.com/archive/6951818/the-ultimate-game-freak/
- Tajiri 1997 interview — https://lavacutcontent.com/satoshi-tajiri-1997-interview/

**Essays and articles**
- Melodic Ambient — https://melodicambient.substack.com/p/why-were-older-pokemon-games-more
- The Guardian — https://www.theguardian.com/games/2020/jan/27/what-pokemon-can-teach-us-about-storytelling-nintendo-games
- Pocket Tactics, haunted town — https://www.pockettactics.com/pokemon-lavender-town
- Den of Geek, haunted town legend — https://www.denofgeek.com/games/pokemon-lavender-town-history-haunted-urban-legend-creepypasta-explained/
- TheGamer, Route 113 — https://www.thegamer.com/pokemon-ruby-sapphire-route-113/
- Dragonfly Cave, truck myth — https://www.dragonflycave.com/essays/the-mew-trick/
- Press Start journal, Black/White — https://press-start.gla.ac.uk/press-start/article/download/362/181 †
- TechRaptor, N — https://techraptor.net/gaming/features/confronting-truth-and-ideals-n †
- CBR, Black/White story — https://www.cbr.com/pokemon-black-white-story-morality-nintendo/ †

**Talks (game feel)**
- Juice It or Lose It — https://gamedesign.gg/watch/juice-it-or-lose-it/ †
- The Art of Screenshake (via Kenney's list) — https://kenney.nl/knowledge-base/learning/must-see-videos-for-indie-developers †

**Fan discussions**
- r/pokemon, which world feels alive — https://www.reddit.com/r/pokemon/comments/67vgu3/ †
- r/pokemon, small detail you loved — https://www.reddit.com/r/pokemon/comments/a3zxxd/ †
- r/pokemon, minor things — https://www.reddit.com/r/pokemon/comments/rvnlar/ †

**Mechanics references (Bulbapedia / Serebii)**
- Walking Pokémon — https://bulbapedia.bulbagarden.net/wiki/Walking_Pok%C3%A9mon
- Serebii HGSS partner — https://www.serebii.net/heartgoldsoulsilver/partner.shtml
- Friendship — https://bulbapedia.bulbagarden.net/wiki/Friendship
- Days of the week — https://bulbapedia.bulbagarden.net/wiki/Days_of_the_week †
- Bug-Catching Contest — https://bulbapedia.bulbagarden.net/wiki/Bug-Catching_Contest †
- Season — https://bulbapedia.bulbagarden.net/wiki/Season_(game_mechanic) †
- Berry — https://bulbapedia.bulbagarden.net/wiki/Berry †
- Shiny Pokémon — https://bulbapedia.bulbagarden.net/wiki/Shiny_Pok%C3%A9mon †
- Red Gyarados — https://bulbapedia.bulbagarden.net/wiki/Red_Gyarados †
- Secret Base — https://bulbapedia.bulbagarden.net/wiki/Secret_Base †
- Great Marsh — https://bulbapedia.bulbagarden.net/wiki/Great_Marsh †
- Battle Frontier (Gen III) — https://bulbapedia.bulbagarden.net/wiki/Battle_Frontier_(Generation_III) †
- Rematch — https://bulbapedia.bulbagarden.net/wiki/Rematch †
- Sealed Chamber — https://bulbapedia.bulbagarden.net/wiki/Sealed_Chamber †
- Braille — https://bulbapedia.bulbagarden.net/wiki/Braille †
- Ruins of Alph — https://bulbapedia.bulbagarden.net/wiki/Ruins_of_Alph †
- S.S. Anne — https://bulbapedia.bulbagarden.net/wiki/S.S._Anne † (fetch timed out)
- Celadon Condominiums — https://bulbapedia.bulbagarden.net/wiki/Celadon_Condominiums †
- Game Freak — https://bulbapedia.bulbagarden.net/wiki/Game_Freak †
- Battle music list — https://bulbapedia.bulbagarden.net/wiki/List_of_battle_music_themes
- HP — https://bulbapedia.bulbagarden.net/wiki/HP †
- Village Bridge — https://bulbapedia.bulbagarden.net/wiki/Village_Bridge †
- Serebii BW music changes — https://www.serebii.net/blackwhite/bgmusic.shtml †
- Lost Tower — https://bulbapedia.bulbagarden.net/wiki/Lost_Tower
- Repel — https://bulbapedia.bulbagarden.net/wiki/Repel
- Bag — https://bulbapedia.bulbagarden.net/wiki/Bag †
- Feature registration — https://bulbapedia.bulbagarden.net/wiki/Feature_registration †
- Pokétch — https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9tch †

**Audio tools**
- Furnace — https://tildearrow.org/furnace/ · https://github.com/tildearrow/furnace
- GB Studio Central, hUGETracker/VGM SFX — https://gbstudiocentral.com/tips/vgm-sound-effects-part-3/ †
- Also named, not fetched: Dn-FamiTracker, LSDj, DefleMask, OpenMPT, BeepBox/JummBox, Magical 8bit Plug 2, Dexed, Plogue chipsounds, jsfxr, ChipTone, Bfxr.

**Kilumen project files read**
- Kilumen_design_doc.pdf
- art/world/overworld/CRITICAL_PATH.md, FIELD_SKILLS.md, MOVEMENT.md
- text/overworld_lines.json v0.3.0
- art/characters/NOTES.md, art/characters/battle/, art/characters/pixel/creatures/ (current art set: 16 creatures; full roster: 450 base creatures (evolutions included), plus special variants such as Enraged and Cosmic; outline held by Coder)
- design/STORY_RULINGS_SOUL.md (Story Bot rulings used in section 8)
- art/world/overworld/world_layout.json (zones, progression flags)
- art/world/overworld/maps/*.json and tileset.json (collision checks)
