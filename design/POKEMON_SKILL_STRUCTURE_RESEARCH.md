# Pokémon Move/Skill Structure — Research for Kilumen

*Compiled 2026-10-22 (America/Chicago). Reference research only. Every Pokémon fact below links to the page it came from. Anything that is my own count, estimate or inference is labelled. The "Takeaways for Kilumen" section is **suggestions only** and uses no Pokémon names or text.*

**Sources actually used:** Bulbapedia (main source), PokemonDB (learnset and move-table counts, scraped with curl and parsed on 2026-10-22), Serebii (one page), a Smogon forum guide (one page), Project Pokémon raw game-text dumps (for the exact prompt wording), and Polygon/Game8 (two secondary SV notes, marked as such).

---

## 0. Key numbers at a glance

| Metric | Value | Source |
|---|---|---|
| Total core-series moves | **934** | [Bulbapedia – Move](https://bulbapedia.bulbagarden.net/wiki/Move); PokemonDB's [all-moves table](https://pokemondb.net/move/all) also has 934 rows |
| Moves a Pokémon can know at once | **4** (1–4) | [Bulbapedia – Move](https://bulbapedia.bulbagarden.net/wiki/Move) |
| STAB multiplier | **×1.5** (×2 with Adaptability; ×1.25 in Legends: Arceus) | [Bulbapedia – STAB](https://bulbapedia.bulbagarden.net/wiki/Same-type_attack_bonus) |
| Category split of the 934 (PokemonDB) | 354 physical / 240 special / 270 status / 70 uncategorised (Max/G-Max) | [PokemonDB all moves](https://pokemondb.net/move/all) (my count) |
| New moves per generation | I 165, II 86, III 103, IV 113, V 92, VI 62, VII 107 (incl. 35 Z), VIII 80 (incl. 18 Max + 26 G-Max), IX 69 | [Bulbapedia – Move](https://bulbapedia.bulbagarden.net/wiki/Move) |
| Typical learnset (Charmander, SV) | 12 level-up + 8 egg + 46 TM ≈ **66** | [PokemonDB](https://pokemondb.net/pokedex/charmander/moves/9) (my count) |
| Fully evolved (Charizard, SV) | 14 level-up + 1 evolution + 8 egg + 61 TM ≈ **84** | [PokemonDB](https://pokemondb.net/pokedex/charizard/moves/9) (my count) |
| Extremes | Ditto and Unown learn 1 move; Mew can learn 250 (Gen VII); Smeargle can Sketch almost anything | [Bulbapedia – Move](https://bulbapedia.bulbagarden.net/wiki/Move) |
| Signature moves (all gens) | No official definition. Bulbapedia's table has roughly 150–170 Gen IX rows (**my estimate**, not an exact count) | [Bulbapedia – Signature move](https://bulbapedia.bulbagarden.net/wiki/Signature_move) |

---

## 1. How moves relate to groups

### 1.1 Move type vs. creature type (STAB)
- A move has its own type, which is separate from the user's type. If a damaging move's type matches one of the user's types, damage is ×1.5. With Adaptability it is ×2. What counts is the type at the moment of use, so type-changing effects matter. Terastallization can push STAB to ×2. — [Bulbapedia – STAB](https://bulbapedia.bulbagarden.net/wiki/Same-type_attack_bonus)
- STAB doesn't apply to status moves or to damage that bypasses the damage formula (fixed damage, Struggle, poison ticks). — same source
- In other games: Legends: Arceus ×1.25; Pokémon GO +20%; Mystery Dungeon +50% (+20% in GtI/Super). — same source
- A Smogon guide uses the example that a 100-power Ground move used by a Ground type behaves like 150 power. It also says to pick STAB moves that fit the user's stronger stat (physical vs. special). — [Smogon – Introduction to Competitive Pokémon](https://www.smogon.com/forums/threads/introduction-to-competitive-pokemon.50605/page-3)
- Every species has a predetermined movelist "tied to its type and concept", so most learnsets lean towards the species' own types plus thematic coverage. — [Bulbapedia – Move](https://bulbapedia.bulbagarden.net/wiki/Move)

### 1.2 Evolution families
- Evolved forms generally have **larger** movelists but learn level-up moves **more slowly**, or stop entirely. This gives players a reason to delay evolution. — [Bulbapedia – Move](https://bulbapedia.bulbagarden.net/wiki/Move)
- Example of the same move arriving at later levels in later stages (SV, PokemonDB, my reading): Flare Blitz at Lv40 for Charmander, Lv54 for Charmeleon and Lv62 for Charizard; Flamethrower at Lv24, Lv30 and Lv30. Charizard also gets an extra "evolution move" (Air Slash) and keeps the line's level-1 moves plus two new Lv1 moves. — [Charmander](https://pokemondb.net/pokedex/charmander/moves/9), [Charmeleon](https://pokemondb.net/pokedex/charmeleon/moves/9), [Charizard](https://pokemondb.net/pokedex/charizard/moves/9)
- The TM list grows with each stage (Charmander 46, Charmeleon 45, Charizard 61 in SV; my count from PokemonDB). The final stage gains coverage, mostly because it gains the Flying type.
- Some moves are exclusive to a pre-evolution and can never be relearned after evolving. Bulbapedia's example is that Breloom can't get Spore. — [Bulbapedia – Move Reminder](https://bulbapedia.bulbagarden.net/wiki/Move_Reminder)
- Legendary groups (duos, trios and so on) tend to have similar movesets. — [Bulbapedia – Move](https://bulbapedia.bulbagarden.net/wiki/Move)

### 1.3 Egg groups and Egg Moves
- Egg Moves are moves a newborn can't normally learn, inherited from a parent. Since Gen VI either parent can pass them; before that, only the father. — [Bulbapedia – Egg Move](https://bulbapedia.bulbagarden.net/wiki/Egg_Move)
- Chain breeding passes a move across several species in shared egg groups. Smeargle can feed any Sketched egg move into the Field group. — same source
- Newer games relax this. Egg moves can be moved between two Pokémon of the same species via the Nursery (SwSh/BDSP) or a picnic with a Mirror Herb (SV), regardless of egg group. — same source
- Bulbapedia's example: a Snorlax with Belly Drum and a Charizard with Dragon Rush produce a Charmander that knows both moves. — same source

### 1.4 TM / HM / TR / Tutor compatibility
- Each species has its own TM compatibility list.
- TMs were single-use in Gens I–IV, reusable from Gen V through SwSh and in Legends: Z-A, and single-use again but craftable in SV. — [Bulbapedia – Technical Machine](https://bulbapedia.bulbagarden.net/wiki/Technical_Machine)
- SwSh had 100 TMs plus 100 single-use TRs. — same source
- HM moves can't be forgotten normally; you need the Move Deleter. — [Bulbapedia – Move Deleter](https://bulbapedia.bulbagarden.net/wiki/Move_Deleter), [Move](https://bulbapedia.bulbagarden.net/wiki/Move)
- Move Tutors (from Gen II) teach moves that are otherwise unavailable, and sometimes have conditions. In FRLG a tutor teaches Blast Burn, Frenzy Plant or Hydro Cannon once, only to a fully evolved Kanto starter with max friendship. In DPPt Draco Meteor needs a Dragon type with max friendship. — [Bulbapedia – Move Tutor](https://bulbapedia.bulbagarden.net/wiki/Move_Tutor)
- SV moved several former tutor-only moves (including the starter "elemental Hyper Beams") onto TMs. — [Bulbapedia – Technical Machine](https://bulbapedia.bulbagarden.net/wiki/Technical_Machine)

### 1.5 How widely common moves are spread (PokemonDB, Gen 9 data, my count)
Entry counts include regional and other forms; the unique-name counts are in brackets.

| Move | Category | Level-up learners | TM learners | Notes |
|---|---|---|---|---|
| [Tackle](https://pokemondb.net/move/tackle) | Physical, Normal | 272 (248 unique) | — | The basic starting attack |
| [Protect](https://pokemondb.net/move/protect) | Status, +4 priority, 10 PP | 52 (49) | **800 (722)** | Plus 3 evolution-move learners. Close to universal through a TM |
| [Hyper Beam](https://pokemondb.net/move/hyper-beam) | Special, Normal | 30 (29) | 460 (411) | Generic "big finisher" gated by TM, mostly on evolved forms |
| [Blast Burn](https://pokemondb.net/move/blast-burn) | Special, Fire | — | 11 (10) | Only fully evolved Fire starters, plus Mew |
| [Spacial Rend](https://pokemondb.net/move/spacial-rend) | Special, Dragon | Palkia only (2 forms) | — | Signature |
| [Sacred Fire](https://pokemondb.net/move/sacred-fire) | Physical, Fire | Ho-Oh only in Gen 9 | — | Signature (Entei shared it in some earlier games) |

The pattern is a **three-tier spread**:
1. Basic level-up moves are spread very widely.
2. Utility and finisher moves are spread widely through TMs.
3. Signature moves are restricted to a single line or Legendary group.

---

## 2. Signature and exclusive moves

- **Definition:** a move normally learnable only by one Pokémon, one evolutionary line, or one Legendary/Mythical group within a generation. There's no consistent official definition. — [Bulbapedia – Signature move](https://bulbapedia.bulbagarden.net/wiki/Signature_move)
- **Count:** 934 moves exist in total. Bulbapedia's signature-move table has roughly **150–170 Gen IX rows**. This is **my estimate from reading the table, not an exact count**, so it is about 15–18% of all moves. It includes ~17 species-specific Z-Moves and 33 G-Max entries, i.e. 32 distinct G-Max moves (Urshifu has two). Those two groups are unavailable in SV, so they don't add to SV's usable signature list.
- Most signature moves are learned by level-up. Smeargle can Sketch most of them, which is why "signature" is a soft label. — same source
- **Recurring patterns** (same source):
  - **Legendaries and Mythicals:** Spacial Rend (Palkia), Roar of Time (Dialga), Sacred Fire (Ho-Oh; shared with Entei in Gens II–V era data), Judgment (Arceus). Group signatures include Mystical Power for the lake trio, Nature's Madness for the Tapus and Ruination for the Ruinous quartet.
  - **Starter-line exclusives, usually on the final stage:** Blaze Kick, Leaf Blade, Muddy Water (Gen III); Spirit Shackle, Darkest Lariat, Sparkling Aria (Gen VII); Drum Beating, Pyro Ball, Snipe Shot and Court Change (Gen VIII); Flower Trick, Torch Song, Aqua Step (Gen IX).
  - **Starter element tier:** Frenzy Plant, Blast Burn and Hydro Cannon go to fully evolved Grass, Fire and Water starters only. The Pledge moves were starter-only before Gen VII.
  - **Mascot or line signatures:** Volt Tackle (Pichu line), Heat Crash (Tepig line, originally).
  - **Gimmick tiers:** species-specific Z-Moves (Gen VII, e.g. Catastropika) and G-Max moves (Gen VIII, one per G-Max form).
  - **"Teachable exclusive" moves:** exclusive by level-up but available to others through TMs.
  - **Event exceptions:** a gift Dratini with Extreme Speed, and event Darkrai, Arceus or Victini carrying Legendary moves.

---

## 3. Progression

### 3.1 Level-up learnset shape
Charmander, SV ([PokemonDB](https://pokemondb.net/pokedex/charmander/moves/9)):

Lv1 Growl, Lv1 Scratch, 4 Ember (40), 8 Smokescreen, 12 Dragon Breath (60), 17 Fire Fang (65), 20 Slash (70), 24 Flamethrower (90), 28 Scary Face, 32 Fire Spin (35), 36 Inferno (100, 50% acc), 40 Flare Blitz (120).

- That is about one move every 4 levels, roughly alternating damage and status. Power rises from 40 to 120.
- STAB moves come first and coverage (Dragon) is added early.
- Fully evolved forms stretch the same list out to Lv62 and add Lv1 and evolution moves.

### 3.2 Four-move limit, forgetting and remembering
- A Pokémon knows 1–4 moves. Learning a fifth means forgetting one. — [Bulbapedia – Move](https://bulbapedia.bulbagarden.net/wiki/Move)
- The Move Deleter forgets a move without learning a new one, and is the only way to remove HM moves. — [Bulbapedia – Move Deleter](https://bulbapedia.bulbagarden.net/wiki/Move_Deleter)
- Move Reminder: see section 4.

### 3.3 Power / accuracy / PP tiers
My counts over PokemonDB's 934-row [all-moves table](https://pokemondb.net/move/all). These include Z, Max and G-Max entries, which skews the top end.

- **Power** (554 moves have a number; median **80**):
  - ≤40: 85
  - 41–60: 84
  - 61–80: 149
  - 81–100: 124
  - 101–120: 50
  - >120: 62
- **Accuracy:** 100% on 446 moves; "—" (never misses, or self/field targeting) on 249; ∞ on 55; 90% on 72; 95% on 37; 85% on 35. Below 80% is rare.
- **PP:** 10 on 297 moves; 5 on 169; 15 on 164; 20 on 156; 30 on 37; 1 on 37 (Z-Moves); 40 on 23; 25 on 20; 35 on 10.
- The broad pattern is that power and PP trade off: big moves have 5 PP and weak moves 30–40 PP. Very strong moves usually carry drawbacks (recoil, low accuracy, a recharge turn).
- Moves have four core properties: power, PP, accuracy and range. — [Bulbapedia – Move](https://bulbapedia.bulbagarden.net/wiki/Move)

### 3.4 Status vs. physical vs. special
- Physical moves use Attack against Defense. Special moves use Sp. Atk against Sp. Def. Status moves deal no direct damage. — [Bulbapedia – Damage category](https://bulbapedia.bulbagarden.net/wiki/Damage_category)
- Before Gen IV the category was fixed by the move's type. The per-move split came in Gen IV, after first appearing in XD for Shadow moves. — same source; [Smogon guide](https://www.smogon.com/forums/threads/introduction-to-competitive-pokemon.50605/page-3)
- Totals: 354 physical, 240 special, 270 status, so status moves are about 29% (my count, [PokemonDB](https://pokemondb.net/move/all)).

### 3.5 How many moves a species can learn
- Typical modern starter: about 65–85 moves across all methods in SV. Charmander has about 66 and Charizard about 84 (my counts, PokemonDB).
- Level-up alone is about 11–14 moves.
- Extremes: 1 move (Ditto, Unown), 250 (Mew, Gen VII), almost all (Smeargle). — [Bulbapedia – Move](https://bulbapedia.bulbagarden.net/wiki/Move)

---

## 4. How a Pokémon gets the chance to learn a move (level-up and evolution)

### 4.1 The "already knows four moves" prompt, and declining
From the in-game text, as dumped on Project Pokémon ([Black](https://projectpokemon.org/rawdb/black/msg2/425.php), [HeartGold](https://projectpokemon.org/rawdb/heartgold/msg/197.php), [Black 2](https://projectpokemon.org/rawdb/black2/msg2/615.php)):
1. "[Pokémon] is trying to learn [Move]! But [Pokémon] can't learn more than four moves. Delete a move to make room for [Move]?"
2. If the player declines or backs out, the game confirms: "Give up on learning the move [Move]?"
3. Then: "[Pokémon] did not learn [Move]!"
- With **fewer than 4 moves** the move is learned automatically. With **4 moves** the player either picks one to overwrite or gives up.
- A declined move isn't lost forever. It can be recovered through the Move Reminder (4.3).
- Overwriting can't remove HM moves. — [Bulbapedia – Move Reminder](https://bulbapedia.bulbagarden.net/wiki/Move_Reminder)
- **Legends: Arceus removes the prompt.** A Pokémon that reaches a learn level with four moves "gets the idea" for the move instead. Outside battle the player can swap freely between known moves and the ones it has gotten the idea for, and forgotten moves can be re-picked the same way. — [Bulbapedia – Legends: Arceus](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Legends:_Arceus)
- In SV, level-ups gained from auto-battles **don't prompt**. The player has to use the summary-screen Remember menu. This comes from a secondary source, [Polygon](https://www.polygon.com/pokemon-scarlet-violet-guide/23462972/how-to-relearn-old-moves-move-tutor/).

### 4.2 Evolution moves (Gen VII+) and cancelling evolution
- Evolution moves were introduced in Gen VII. **Immediately after evolving**, the Pokémon tries to learn every evolution move (stored internally as "level 0"). Then it tries to learn any normal level-up moves for its current level. — [Bulbapedia – Evolution move](https://bulbapedia.bulbagarden.net/wiki/Evolution_move)
- There was a bug in Sun/Moon 1.0: learning an evolution move skipped the Lv1 moves. It was fixed in 1.1. — same source
- Evolution moves change between games. Charizard's went Wing Attack (SM/USUM), then Air Slash (SwSh–SV), then Fire Blast (Z-A). — same table
- Before Gen VII, a fully evolved form often got its new move at a fixed level instead.
- **Cancelling:** a level-up evolution can be stopped with the B button or an Everstone. Evolution by item or trade can't be cancelled. — [Bulbapedia – Evolution](https://bulbapedia.bulbagarden.net/wiki/Evolution)
- In Legends: Arceus, evolution is player-triggered (so it can be deferred) and can't be cancelled once started. — [Bulbapedia – Legends: Arceus](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Legends:_Arceus)
- **What cancelling means for moves (my inference from the mechanics above):**
  - The evolution move is tied to the act of evolving, so a cancelled evolution simply delays it. The Pokémon is offered it whenever it does evolve, at any level.
  - Meanwhile the unevolved form keeps learning its own list, which is often faster (see 1.2). That is the classic reason to delay.
  - If evolution moves are declined at the prompt, they can be retrieved later through the Gen VII+ Move Reminder, which teaches any level-up move ([Move Reminder](https://bulbapedia.bulbagarden.net/wiki/Move_Reminder)).

### 4.3 Missed moves and the Move Reminder / Relearner
Source for this section unless noted: [Bulbapedia – Move Reminder](https://bulbapedia.bulbagarden.net/wiki/Move_Reminder).

- Introduced in Gen III. It teaches moves from the species' level-up list and usually charges a **Heart Scale**. Jack does it free in SwSh.
- **Scope over time:**
  - Gens III–VI and SwSh/BDSP: only moves at or below the current level.
  - Gen VII: **any** level-up move, including future ones.
  - SV: up to the current level (also confirmed by [Polygon](https://www.polygon.com/pokemon-scarlet-violet-guide/23462972/how-to-relearn-old-moves-move-tutor/) and [Game8](https://game8.co/games/Pokemon-Scarlet-Violet/archives/397583)).
- **Free, menu-based relearning:** from Legends: Arceus onward there is no NPC; moves are changed at any time from the summary screen. [Serebii](https://serebii.net/scarletviolet/usefulcharacters.shtml) also notes that SV moved the Move Reminder into the summary options.
- **Other relearnable moves:**
  - Since Gen VI, any move a Pokémon knew when it hatched (including egg moves) can be relearned.
  - SwSh lets you relearn moves previously learned from TRs. SV does the same for TMs, per Bulbapedia; Game8 says otherwise, so the two sources disagree.
- **Not relearnable:**
  - Moves exclusive to a pre-evolution
  - Sketched moves
  - Egg moves gained through transfer (SwSh onward)
  - Tera Raid special moves
  - Event-exclusive moves in Gen IX
  - Moves the species only learns as a pre-evolution can **never** come back. — also [Bulbapedia – Move](https://bulbapedia.bulbagarden.net/wiki/Move)
- **Reminder-only moves:** some species have moves that only the Reminder teaches. In SV, Ceruledge has 4.
- **Level-skipping:** in Gen I a move is missed if its level is skipped (e.g. multiple levels gained at once). Since Gen III every intermediate level is processed, so nothing is skipped. — [Bulbapedia – Move](https://bulbapedia.bulbagarden.net/wiki/Move)

### 4.4 Several moves at the same level
- Learnsets often stack moves on one level, e.g. Charizard's six **Lv1** moves in SV ([PokemonDB](https://pokemondb.net/pokedex/charizard/moves/9)).
- On level-up, the game works through each move due at that level (and, since Gen III, each skipped level) in turn. Each one gets its own learn-or-forget prompt. This is my description of standard behaviour, consistent with Bulbapedia's note that intermediate levels are processed and with the per-move prompt text above.
- Lv1 moves the Pokémon is already past effectively become Reminder-only. They're still technically Lv1 moves, so a Pokémon evolved at level 1 would learn them. — [Move Reminder](https://bulbapedia.bulbagarden.net/wiki/Move_Reminder)

### 4.5 Chance-based or conditional learning
- **Sketch:** permanently learns the target's last-used move, replacing Sketch. It is Smeargle's route to almost any move. It can't be used in battle in SwSh or SV 1.0–2.0.2 (usable again from SV 3.0.0), and some moves can't be copied. Sketched moves can't be relearned. — [Bulbapedia – Sketch](https://bulbapedia.bulbagarden.net/wiki/Sketch_(move)), [Move Reminder](https://bulbapedia.bulbagarden.net/wiki/Move_Reminder)
- **Mimic:** temporarily copies a move from the target into Mimic's slot until the user switches out, faints or the battle ends. The summary still shows the original moves. — [Bulbapedia – Mimic](https://bulbapedia.bulbagarden.net/wiki/Mimic_(move))
- **Legends: Arceus mastery:**
  - A Pokémon masters moves by levelling up.
  - A mastered move can be used in a **strong style** (more power, accuracy or effect, but lowers action speed) or an **agile style** (less power, raises action speed).
  - Either style costs 2 PP.
  - Mastered moves can be bought at the Move Shop.
  - Source: [Bulbapedia – Legends: Arceus](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Legends:_Arceus)
- **Friendship and type conditions:** tutor moves that require max friendship or a fully evolved starter (Blast Burn, Draco Meteor). — [Bulbapedia – Move Tutor](https://bulbapedia.bulbagarden.net/wiki/Move_Tutor)
- **Breeding conditions:** egg moves depend on parents and egg groups, or in newer games on a same-species transfer. — [Bulbapedia – Egg Move](https://bulbapedia.bulbagarden.net/wiki/Egg_Move)
- **Spin-off contrasts:**
  - Pokémon GO: fast and charged attacks
  - UNITE: cooldowns plus one Unite Move per Pokémon
  - Conquest: one move per Pokémon
  - Source: [Bulbapedia – Move](https://bulbapedia.bulbagarden.net/wiki/Move)

---

## 5. Takeaways for Kilumen *(SUGGESTIONS ONLY — original design ideas, not Pokémon content)*

Kilumen context: 21 creatures (3 starter lines × 3 stages for Earth, Fire and Water, plus 7 wild), 23 elements, and effects that live on skills rather than creatures.

1. **Scale the skill pool to the roster.** Pokémon averages about 1 move per species, with any one species touching ~65–85. With 21 creatures, a pool of roughly **60–90 skills** would let each creature reach 15–25 skills, with meaningful overlap. Spread the 23 elements so each has at least 2–3 skills; the minor elements could live mostly in the shared pool.
2. **Three-tier distribution** (mirrors the observed spread pattern without copying content):
   - **Common** skills that ~70%+ of creatures can get: a basic strike, a guard, a big finisher.
   - **Elemental/family** skills tied to element affinity.
   - **Signature** skills: one per starter line, unlocked on the final stage, plus one or two per notable wild creature. That works out to about 10–15% signatures, close to Pokémon's estimated ~15–18%.
3. **Element affinity bonus.** A damage bonus when the skill's element matches the creature's element, in the ×1.25–×1.5 range. Because effects live on skills, the bonus can scale the effect too, e.g. longer duration.
4. **Stage-based learn pacing.** Earlier stages learn shared skills sooner and later stages learn them later but gain more coverage. That gives a real "delay evolution?" trade-off. Give each stage-up an **evolution skill** offered immediately on evolving.
5. **Slot limit + friendly relearning.** Use a small active loadout (4 is the proven number). Store every skill a creature has ever been offered in a "skill memory" so declining is never punishing. Let players swap from that memory outside battle for free, which is the modern direction. Avoid moves that can be permanently lost.
6. **Clear learn flow.** When one or more skills unlock, queue them and present each in turn. Show the new skill next to the current loadout and offer "replace / keep current". Anything declined goes to skill memory. Evolution skills come first, then level skills.
7. **Effects on skills, tiers by numbers.** Use 4–6 power bands (weak, standard, strong, finisher) with a cost trade-off: higher power gets fewer uses or a drawback. Keep accuracy mostly at 100%, with a few deliberate 85–90% gambles. Aim for roughly 30% status/utility skills.
8. **An optional mastery layer.** Repeated use or levels could unlock two variants of a skill, one "heavier but slower" and one "lighter but faster". This adds depth without adding more skills. Give it Kilumen's own names and numbers.
9. **Conditional unlocks** for variety: bond level, an element-specific trainer, or a once-per-run "echo" skill that temporarily copies an opponent's skill. Build these from Kilumen's own lore.
10. **Originality guardrail.** Don't reuse any Pokémon move names, descriptions or the exact 1.5/4-slot wording in Kilumen-facing text. Pick distinct numbers where it doesn't hurt the design (e.g. ×1.3 affinity, 4–5 slots) and invent Kilumen's own terminology.
