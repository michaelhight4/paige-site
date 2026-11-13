/**
 * Kilumen-only battle rules (not from upstream).
 *
 * Wild-battle choices (Retreat, Crystal catch), bag items, XP and level-up.
 * Every number here is a PLACEHOLDER read from `Scripts.kilumen` in the
 * injected data (see src/battle/data/rules.js). Formulas follow the proposals
 * in design/MECHANICS_PARITY.md (B13, B16, B19, B22); Gary signs them off.
 *
 * Protocol lines added by this module (all start with "-k" so a client can
 * tell them apart from upstream lines):
 *   |-kretreat|SIDE: NAME|success|fail
 *   |-kcrystal|SIDE: NAME|CRYSTALID|SHAKES|caught|escaped
 *   |-kitem|SIDE: NAME|ITEMID
 *   |-kxp|SIDE: NAME|GAINED|TOTAL
 *   |-klevelup|SIDE: NAME|LEVEL|hp,atk,def,spa,spd,spe
 *   |kend|retreat|caught
 */
import type { Battle } from './battle';
import type { Creature } from './creature';

export interface KilumenRules {
	/** critical-hit chance denominators by stage (index = stage) */
	critStages: number[];
	critMult: number;
	affinity: number;
	affinitySub: number;
	strongMult: number;
	weakMult: number;
	overuseDamage: number;
	overuseAccuracy: number;
	overuseSelfDamage: number;
	warmthEndure: number;
	/** retreat: chance/256 = agilityRatio * retreatBase + attempts * retreatPerAttempt */
	retreatBase: number;
	retreatPerAttempt: number;
	/** status multipliers on catch odds, keyed by condition id */
	catchStatus: { [id: string]: number };
	catchShakes: number;
	/** xp gained = floor(baseXp * foeLevel / xpDivisor * (trainer ? xpTrainerMult : 1)) */
	xpDivisor: number;
	xpTrainerMult: number;
	/** total xp to reach level L = floor(xpCurveMult * L^3) */
	xpCurveMult: number;
	maxLevel: number;
	partyMax: number;
}

/** bag key of an item: Kilumen data sets kKey (game id without underscores); the dex id comes from the display name */
export function bagKey(item: any): string {
	return item.kKey || item.id;
}

export function rules(battle: Battle): KilumenRules {
	return (battle.dex.data.Scripts as any).kilumen;
}

export function xpForLevel(battle: Battle, level: number) {
	const K = rules(battle);
	return Math.floor(K.xpCurveMult * level * level * level);
}

/** Ends a wild battle without a winner (retreat / caught). */
export function endBattle(battle: Battle, reason: 'retreat' | 'caught') {
	if (battle.ended) return;
	battle.add('');
	battle.add('kend', reason);
	battle.kEndReason = reason;
	battle.winner = '';
	battle.ended = true;
	battle.requestState = '';
	for (const s of battle.sides) s.activeRequest = null;
}

export function runRetreat(battle: Battle, creature: Creature) {
	const K = rules(battle);
	const foe = creature.side.foe.active[0];
	const side = creature.side;
	side.kRetreatAttempts = (side.kRetreatAttempts || 0) + 1;
	const mine = creature.getStat('spe', false, true);
	const theirs = foe && !foe.fainted ? foe.getStat('spe', false, true) : 1;
	let chance = Math.floor(mine * K.retreatBase / Math.max(1, theirs)) + K.retreatPerAttempt * (side.kRetreatAttempts - 1);
	if (mine >= theirs) chance = 256;
	const ok = chance >= 256 || battle.random(256) < chance;
	battle.add('-kretreat', creature, ok ? 'success' : 'fail');
	if (ok) endBattle(battle, 'retreat');
}

export function runCrystal(battle: Battle, creature: Creature, crystalId: string) {
	const K = rules(battle);
	const target = creature.side.foe.active[0];
	const crystal = battle.dex.items.get(crystalId);
	const side = creature.side;
	side.kBag[bagKey(crystal)] = (side.kBag[bagKey(crystal)] || 0) - 1;
	if (!target || target.fainted) return;
	const rarity = (target.species as any).catchRate ?? 0.5;
	const grade = (crystal as any).kCrystalGrade ?? 1;
	const statusMult = K.catchStatus[target.status] ?? 1;
	// MECHANICS_PARITY B13: rarity x (1 - HP%) x status x crystal grade. PLACEHOLDER.
	let p = rarity * (1 - (target.hp / target.maxhp) * 0.85) * statusMult * grade;
	p = Math.max(0.001, Math.min(1, p));
	const shakeP = Math.pow(p, 1 / K.catchShakes);
	let shakes = 0;
	while (shakes < K.catchShakes && battle.randomChance(Math.round(shakeP * 1000), 1000)) shakes++;
	const caught = shakes >= K.catchShakes;
	battle.add('-kcrystal', target, bagKey(crystal), shakes, caught ? 'caught' : 'escaped');
	if (caught) {
		battle.kCaught = target;
		endBattle(battle, 'caught');
	}
}

export function runItem(battle: Battle, creature: Creature, itemId: string, slot: number) {
	const item = battle.dex.items.get(itemId) as any;
	const side = creature.side;
	const target = side.creature[slot] || creature;
	side.kBag[bagKey(item)] = (side.kBag[bagKey(item)] || 0) - 1;
	battle.add('-kitem', target, bagKey(item));
	if (item.kHeal && !target.fainted) {
		const d = target.heal(item.kHeal, creature);
		if (d) battle.add('-heal', target, target.getHealth, '[from] item: ' + item.name);
	}
	if (item.kCure && target.status) target.cureStatus();
	if (item.kEnergy) for (const ms of target.moveSlots) ms.pp = Math.min(ms.maxpp, ms.pp + item.kEnergy);
}

/** Award XP to the winning side's active creature when a foe faints (B22). */
export function awardXp(battle: Battle, fainted: Creature) {
	const K = rules(battle);
	const side = fainted.side.foe;
	if (!side.kGainsXp) return;
	const trainer = !battle.kWild;
	const baseXp = (fainted.species as any).baseXp ?? 50;
	const gained = Math.max(1, Math.floor(baseXp * fainted.level / K.xpDivisor * (trainer ? K.xpTrainerMult : 1)));
	for (const creature of side.active) {
		if (!creature || creature.fainted) continue;
		creature.set.xp = (creature.set.xp ?? xpForLevel(battle, creature.level)) + gained;
		battle.add('-kxp', creature, gained, creature.set.xp);
		while (creature.level < K.maxLevel && creature.set.xp >= xpForLevel(battle, creature.level + 1)) {
			levelUp(battle, creature);
		}
	}
}

function levelUp(battle: Battle, creature: Creature) {
	creature.level++;
	creature.set.level = creature.level;
	const stats: StatsTable = battle.spreadModify(creature.species.baseStats, creature.set);
	const hpGain = stats.hp - creature.maxhp;
	creature.baseMaxhp = stats.hp;
	creature.maxhp = stats.hp;
	creature.hp = Math.min(creature.maxhp, creature.hp + Math.max(0, hpGain));
	creature.baseStoredStats = stats;
	let statName: keyof typeof creature.storedStats;
	for (statName in creature.storedStats) creature.storedStats[statName] = stats[statName];
	creature.details = creature.getUpdatedDetails();
	battle.add('-klevelup', creature, creature.level,
		[stats.hp, stats.atk, stats.def, stats.spa, stats.spd, stats.spe].join(','));
}

/** Snapshot of a side's team to write back to the overworld save. */
export function teamState(side: { creature: Creature[], team: { [k: string]: any }[] }) {
	// side.creature is reordered by switches; side.team keeps the original party order
	const ordered = side.team.map(set => side.creature.find(c => c.set === set)!);
	return ordered.map(c => ({
		species: c.species.id,
		level: c.level,
		xp: c.set.xp,
		hp: c.fainted ? 0 : c.hp,
		maxhp: c.maxhp,
		status: c.status || '',
		energy: c.baseMoveSlots.map(m => {
			const live = c.moveSlots.find(s => s.id === m.id);
			return live ? live.pp : m.pp;
		}),
	}));
}
