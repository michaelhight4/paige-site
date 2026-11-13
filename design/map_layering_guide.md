# Kilumen Map Layering Guide — dense, layered overworld design
_Researched 2026-10-30. Internal doc: the word "route" is fine here; never put it in player-facing text (use area names, "path", "trail", "pass")._

## 1. What the mainline Pokemon games do (concrete references)
Sources: Bulbapedia location pages (bulbapedia.bulbagarden.net/wiki/<Place>), e.g. Mt._Mortar, Victory_Road_(Kanto), Union_Cave, Johto_Route_45, Meteor_Falls, Mt._Coronet, Route_210, Victory_Road_(Unova), Seafoam_Islands; plus general level-design analysis (one-way gates, loops, gated revisits — the "Metroidvania-lite" structure).

| Technique | Example(s) | What it buys |
|---|---|---|
| One-way ledges | Johto Route 45 (HGSS): long downhill run is fast going south, but going north forces a winding climb; Kanto Route 22/Route 3, Hoenn Route 111/112 | Same squares serve two different journeys; shortcut home after a long push |
| Ledges hiding pockets | Route 45 / Route 46 side terraces only reachable from the upper end; Hoenn Route 115 north | Item pockets visible from below, reachable only via the other approach — "look, then loop" |
| Cave exits onto upper cliffs | Dark Cave exits above Route 45 / Route 31; Union Cave B1F; Mt. Moon exits; Meteor Falls exits onto Route 114 upper ledge; Mt. Coronet exits to Route 211/207 cliffs | Cave doubles as a staircase; overlooking the lower path previews areas |
| Multi-floor caves with loops | Mt. Mortar (HGSS): 1F/B1F/upper floors, Waterfall-gated interior, back area reachable only from the other entrance, Karate King + Tyrogue reward; Victory Road (Kanto FRLG & HGSS, Unova BW2) multiple floors with ladders; Seafoam Islands (current/boulder puzzle across floors) | Huge content in small footprint; floors overlap the same X/Y space |
| Field-move gating | Cut trees (Ilex Forest, Route 2 HGSS), Rock Smash (Route 36/Cianwood, Hoenn Route 111), Strength boulders (Victory Road, Seafoam, Mt. Mortar), Surf lakes (Route 210/Lake areas), Waterfall (Mt. Mortar, Meteor Falls inner chambers, Ice Path/Whirl Islands) | Revisits: same map gains new layer later |
| Rare/strong pockets | Meteor Falls back (Bagon, deep levels, needs Waterfall); Union Cave B2F (Lapras Fridays); Mt. Mortar back (Tyrogue); Route 210 fog/Mt. Coronet Spear Pillar; BW2 hidden grottoes; Emerald Route 119 secret areas | Reward for exploring side pockets |
| Hidden items/walkways | Hidden items at dead ends & behind trees (Itemfinder/Dowsing MCHN); Platinum Route 210 north fog; Emerald secret-base nooks; trees with one walkable gap; BW2 "hidden walkway" bridges & Strange House | Every dead end pays |
| Vertical stacking | Platinum Mt. Coronet (bike ramps, multi-level), Sinnoh Route 206 Cycling Road over Wayward Cave; Hoenn Route 110 Cycling Road over the lower path; Unova Village/Driftveil bridges; BW2 Victory Road | Two paths share the same squares at different heights |

Takeaways: (a) almost no square is purely decorative — filler is used to *shape* paths and hide pockets; (b) the same physical space is reused through height (ledges, bridges, cave floors) and time (field-move revisits); (c) players are always shown a reward before they can reach it.

## 2. Kilumen constraints
- Strict square grid; every asset occupies whole squares.
- Any one-square gap between blockers is walkable (so you can't use thin gaps as "visual only"; a 1-square gap is a promise). If you need a closed seam, close it with a blocker.
- Never say "route" in player text.

Legend for diagrams: `.` walk, `#` cliff/wall, `T` tree (block), `v` ledge (hop south only), `>`/`<` ledge east/west, `C` cuttable, `R` smashable rock, `B` boulder (push), `~` water, `=` bridge (upper level), `H` cave mouth / door, `L` ladder/stairs, `*` item, `!` rare encounter tile, `P` player entry.

## 3. Reusable layout patterns (12)

### P1 Ledge Shortcut Return
```
P . . . . . T
T T T T T . T
. . . . . . T
. T T T T T T
. . . . . . .   <- long outbound
v v v v . v v
. . . . . . .   <- fast return to start
```
Outbound is a winding path; ledges let player hop back. Use near rest/heal points.

### P2 Ledge-Locked Pocket (look, then loop)
```
. . . . . . .
# # # v # # #
. * . . T . .   <- seen from below, entered from above only
# # # # # # #
. . . . . . .   <- main path
```
Item visible from the main path; reached via the upper approach later.

### P3 Cave Exit on the Cliff Top
```
# # H # # # #
. . . . * . #   <- upper shelf (from cave)
# # # # v # #
. . . . . . .   <- lower path (earlier)
```
Cave doubles as staircase; shelf drops back via one ledge.

### P4 Stacked Floors (same footprint)
```
1F:  . L . # .        B1F: . L # # .
     . . . # *             . . . L !
     # # . . .             # # . . .
```
Ladder positions offset so floors reuse the same X/Y but connect differently. Each floor ≥1 unique reward.

### P5 Gate-Revisit Spur (cut/smash/boulder)
```
. . . . . C . *
T T T T T T T T
```
One gate square + 2–6 square spur with reward. Gate visible from main path.

### P6 Boulder Bridge / Hole Drop
```
. . B . O . .    O = hole; push B into O to cross, or fall to lower floor
```
Doubles as floor connector (Seafoam/Victory Road style).

### P7 Water Inner Ring
```
T T T T T T T
T . . . . . T
T . ~ ~ ~ . T
T . ~ * ~ . T   <- islet reachable by surf
T . ~ ~ ~ . T
T . . . . . T
```
Ring path around a lake on first visit; islet on revisit.

### P8 Waterfall/Climb Back Room
```
# # # # #
# ! . * #   <- back room (rare encounters, strong item)
# # ~ # #
. . ~ . .   <- climb gate
```
Use for "Meteor Falls back" style endgame pockets.

### P9 Bridge Over Path (two layers, same squares)
```
T T . T T
= = = = =   <- upper bridge layer (walk east-west)
T T . T T   <- lower path passes north-south underneath
```
Needs per-tile layer flags + transition squares (see tools).

### P10 Tree-Line False Wall
```
T T T T T T T
T . . . . * T
T . T T T T T
. . . . . . .   <- main path; entry gap 1 square, offset from the item
```
Hidden walkway behind trees. Because 1-square gaps are always walkable, the gap *is* the secret — place it 2–4 squares away from the reward so it isn't obvious.

### P11 Switchback Climb with Overlooks
```
. . . . . . #
# # # # # . #
# . . . . . #
# . # # # # #
# . . . * . .
```
Elevation via switchbacks; each turn ends in a nook (item, trainer, or view).

### P12 Two-Door Cave (the other side)
```
[Area A] H ...cave... H [Area B]
             \-- side H -> pocket only reachable via cave
```
Cave interior has a third exit onto a pocket of an overworld map otherwise sealed by cliffs (Mt. Mortar / Dark Cave style).

## 4. Rules of thumb (targets)
- Walkable share per screen: 45–60% (incl. grass/water reachable). Below 35% feels cramped; above 70% feels empty.
- Filler (trees/cliffs/walls) must border a walkable square on ≥1 side ~80% of the time; filler blocks deeper than 3 squares with nothing behind = waste.
- Reward per screen (~20×15): ≥1 visible reward + ≥1 hidden/gated reward; every dead end ≥3 squares long ends in something (item, encounter, trainer, view, lore).
- Layers: each map ≥2 height bands or one gated layer; major dungeons ≥3 floors with offset ladders.
- Loops: every map ≥1 loop or one-way shortcut back to its entry/heal point.
- Revisit: ≥30% of maps contain a gate for a later ability; ≥1 of those gates guards a rare encounter or strong item.
- Ledges: one-way only; never make the only way forward a ledge that strands the player without a return.
- Show-then-reach: ≥50% of hidden rewards should be visible from somewhere before reachable.
- Grid hygiene: no accidental 1-square gaps (they are walkable); audit every seam.

## 5. Audit checklist (score 0–2 each, max 24)
1. Walkable 45–60%?
2. No deep dead filler (>3 squares thick with nothing behind)?
3. ≥1 loop or ledge shortcut?
4. ≥2 height bands or a gated layer?
5. Every dead end rewarded?
6. ≥1 hidden walkway/false wall?
7. ≥1 show-then-reach reward?
8. ≥1 revisit gate (cut/smash/boulder/water/climb)?
9. Side pocket with rare encounter or strong item?
10. Cave/door used as vertical connector (not just A→B)?
11. No accidental 1-square gaps / no softlocks from ledges?
12. Player text free of "route"?
Score: 20–24 dense; 14–19 tighten; <14 redesign with P1–P12.
Quick waste metric: count filler squares not adjacent (4-neighbour) to any walkable square ÷ total squares; target <10%. Scriptable on a Tiled/LDtk export.

## 6. Free permissive tools
| Tool | Licence | Use |
|---|---|---|
| Grid Engine (github.com/Annoraaq/grid-engine) | Apache-2.0 (verified) | Grid movement, collision, **character layers** + `setTransition()` for bridges/ledges/levels; Phaser or headless |
| LDtk (ldtk.io) | MIT | Level editor with IntGrid layers (ideal for walk/cliff/ledge codes) and auto-tiling |
| libtiled / Tiled TMX format & JS API (mapeditor.org) | Tiled editor GPL-2; libtiled & tmxviewer BSD-2 | Use Tiled for authoring (GPL tool output is not encumbered); custom properties `level`, `ledge_dir` per tile |
| Phaser 3 | MIT | Renderer for TMX/LDtk |
| Godot 4 (TileMapLayer, terrain sets) | MIT | Alternative engine; per-layer Z & physics |
| Kenney tilesets (kenney.nl) | CC0 | Placeholder cliffs/caves/ledges for greyboxing |
| pathfinding.js (PathFinding.js) | MIT | Reachability checks for the audit (detect unreachable pockets/softlocks) |
Not permissive / reference only: pret decomps (pokeemerald, pokeheartgold — no licence, Nintendo IP) and Porymap (GPL-3): study, don't ship.
Suggested data convention: per-square `level:int`, `ledge:N|S|E|W|none`, `gate:cut|smash|boulder|water|climb|none`, `transition:{from,to}`; the audit script reads these.

## 7. Hard rules from the Pokémon map study (Oct 30 2026; see pokemon_layering_study.md)
The checker is `python3 tools/map_audit/layering_rules.py [--map NAME] [--fails] [--json]` (in the kilumen repo; committed on gd/kilumen-maps). Every new or edited outdoor map must pass it.
- **R1 empty-area limit.** No empty walkable square larger than 6x6 (target 5x5). No solid filler square larger than 8x8 inside the playable box; walls should be 2-6 squares thick. Each square over the limit costs 1 penalty point.
- **R2 pocket count.** Route-sized outdoor maps (≥ 1500 cells) need ≥ 3 sealed pockets; smaller outdoor maps need ≥ 1. A pocket is 6-60 walkable squares (aim for 9-45).
- **R3 cave exit types.** Every cave has ≥ 2 exits, and ≥ 1 of them must land in a pocket of the destination map (off its no-skill main path). The rest can be plain ways out.
- **R4 seal and reachability.** A pocket has no plain walking link to the main path: trees, cliffs, water or a ledge seal it. It must also be enterable by a cave or warp, by a field-skill square on its edge (Surf, Cut, Rock Smash, Strength, ice), or by a ledge dropping into it. Orphan pockets fail.
- **R5 off-path content.** ≥ 30% of trainers and ≥ 50% of items sit off the main path (pocket, ledge-only shelf or hidden).
- **R6 rewards (design rule, not automated).** Every pocket has ≥ 1 reward. Each route has ≥ 1 pocket with a trainer plus a hidden strong item, visible from the main path before you can reach it. Fan-game lessons: make dense tree mass a pocket (Unbound Route 5); give each Surf islet a trainer plus an item (Unbound Route 3).
- Ledges stay one-way (south only, collision 2). Never use a ledge as the only way back to a heal point.
