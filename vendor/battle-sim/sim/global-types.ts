/* eslint-disable @typescript-eslint/no-unused-vars */

type Mutable<T> = {
	-readonly [P in keyof T]: T[P];
};

type Battle = import('./battle').Battle;
type BattleQueue = import('./battle-queue').BattleQueue;
type BattleActions = import('./battle-actions').BattleActions;
type Field = import('./field').Field;
type Action = import('./battle-queue').Action;
type MoveAction = import('./battle-queue').MoveAction;
type ActionChoice = import('./battle-queue').ActionChoice;
type ModdedDex = import('./dex').ModdedDex;
type Creature = import('./creature').Creature;
type PRNGSeed = import('./prng').PRNGSeed;
type Side = import('./side').Side;
type TeamValidator = any;
type CreatureSources = any;

/** An ID must be lowercase alphanumeric. */
type ID = '' | Lowercase<string> & { __isID: true };
/** Like ID, but doesn't require you to type `as ID` to define it. For data files and object keys. */
type IDEntry = Lowercase<string>;
type CreatureSlot = '' | IDEntry & { __isSlot: true };
interface AnyObject { [k: string]: any }

type GenderName = 'M' | 'F' | 'N' | '';
type StatIDExceptHP = 'atk' | 'def' | 'spa' | 'spd' | 'spe';
type StatID = 'hp' | StatIDExceptHP;
type StatsExceptHPTable = { [stat in StatIDExceptHP]: number };
type StatsTable = { [stat in StatID]: number };
type SparseStatsTable = Partial<StatsTable>;
type BoostID = StatIDExceptHP | 'accuracy' | 'evasion';
type BoostsTable = { [boost in BoostID]: number };
type SparseBoostsTable = Partial<BoostsTable>;
type Nonstandard = 'Past' | 'Future' | 'Unobtainable' | 'CAP' | 'LGPE' | 'Custom' | 'Gigantamax';

type CreatureSet = import('./teams').CreatureSet;

declare namespace TierTypes {
	export type Singles = "AG" | "Uber" | "(AG)" | "OU" | "(OU)" | "UUBL" | "UU" | "RUBL" | "RU" | "NUBL" | "NU" |
		"PUBL" | "PU" | "ZUBL" | "ZU" | "NFE" | "LC";
	export type Doubles = "DUber" | "(DUber)" | "DOU" | "(DOU)" | "DBL" | "DUU" | "(DUU)" | "NFE" | "LC";
	export type Other = "Unreleased" | "Illegal" | "CAP" | "CAP NFE" | "CAP LC";
}

interface EventInfo {
	generation: number;
	level?: number;
	/** true: always shiny, 1: sometimes shiny, false | undefined: never shiny */
	shiny?: boolean | 1;
	gender?: GenderName;
	nature?: string;
	ivs?: SparseStatsTable;
	perfectIVs?: number;
	/** true: has hidden ability, false | undefined: never has hidden ability */
	isHidden?: boolean;
	abilities?: IDEntry[];
	maxEggMoves?: number;
	moves?: IDEntry[];
	crystal?: IDEntry;
	from?: string;
	/** Japan-only events can't be transferred to international games in Gen 1 */
	japan?: boolean;
	/** For Emerald event eggs to allow Pomeg glitched moves */
	emeraldEventEgg?: boolean;
	source?: string;
}

type Effect = Ability | Item | ActiveMove | Species | Condition | Format;

interface CommonHandlers {
	ModifierEffect: (this: Battle, relayVar: number, target: Creature, source: Creature, effect: Effect) => number | void;
	ModifierMove: (this: Battle, relayVar: number, target: Creature, source: Creature, move: ActiveMove) => number | void;
	ResultMove: boolean | (
		(this: Battle, target: Creature, source: Creature, move: ActiveMove) => boolean | null | "" | void
	);
	ExtResultMove: boolean | (
		(this: Battle, target: Creature, source: Creature, move: ActiveMove) => boolean | null | number | "" | void
	);
	VoidEffect: (this: Battle, target: Creature, source: Creature, effect: Effect) => void;
	VoidMove: (this: Battle, target: Creature, source: Creature, move: ActiveMove) => void;
	ModifierSourceEffect: (
		this: Battle, relayVar: number, source: Creature, target: Creature, effect: Effect
	) => number | void;
	ModifierSourceMove: (
		this: Battle, relayVar: number, source: Creature, target: Creature, move: ActiveMove
	) => number | void;
	ResultSourceMove: boolean | (
		(this: Battle, source: Creature, target: Creature, move: ActiveMove) => boolean | null | "" | void
	);
	ExtResultSourceMove: boolean | (
		(this: Battle, source: Creature, target: Creature, move: ActiveMove) => boolean | null | number | "" | void
	);
	VoidSourceEffect: (this: Battle, source: Creature, target: Creature, effect: Effect) => void;
	VoidSourceMove: (this: Battle, source: Creature, target: Creature, move: ActiveMove) => void;
}

interface EffectData {
	name?: string;
	desc?: string;
	duration?: number;
	durationCallback?: (this: Battle, target: Creature, source: Creature, effect: Effect | null) => number;
	effectType?: string;
	infiltrates?: boolean;
	isNonstandard?: Nonstandard | null;
	shortDesc?: string;
}

type ModdedEffectData = EffectData | Partial<EffectData> & { inherit: true };

type EffectType =
	'Condition' | 'Creature' | 'Move' | 'Item' | 'Ability' | 'Format' |
	'Nature' | 'Ruleset' | 'Weather' | 'Status' | 'Terrain' | 'Rule' | 'ValidatorRule';

interface BasicEffect extends EffectData {
	id: ID;
	effectType: EffectType;
	exists: boolean;
	fullname: string;
	gen: number;
	sourceEffect: string;
	toString: () => string;
}

type Condition = import('./dex-conditions').Condition;

type ActiveMove = import('./dex-moves').ActiveMove;
type Move = import('./dex-moves').Move;
type MoveTarget = import('./dex-moves').MoveTarget;

type Item = import('./dex-items').Item;

type Ability = import('./dex-abilities').Ability;

type Species = import('./dex-species').Species;

type Format = import('./dex-formats').Format;

type Nature = import('./dex-data').Nature;

type GameType = 'singles' | 'doubles' | 'triples' | 'rotation' | 'multi' | 'freeforall';
type SideID = 'p1' | 'p2' | 'p3' | 'p4';

type SpreadMoveTargets = (Creature | false | null)[];
type SpreadMoveDamage = (number | boolean | undefined)[];
type ZMoveOptions = ({ move: string, target: MoveTarget } | null)[];

interface BattleScriptsData {
	gen: number;
}

interface ModdedBattleActions {
	inherit?: true;
	afterMoveSecondaryEvent?: (this: BattleActions, targets: Creature[], creature: Creature, move: ActiveMove) => undefined;
	calcRecoilDamage?: (this: BattleActions, damageDealt: number, move: Move, creature: Creature) => number;
	canMegaEvo?: (this: BattleActions, creature: Creature) => string | undefined | null;
	canMegaEvoX?: (this: BattleActions, creature: Creature) => string | undefined | null;
	canMegaEvoY?: (this: BattleActions, creature: Creature) => string | undefined | null;
	canTerastallize?: (this: BattleActions, creature: Creature) => string | null;
	canUltraBurst?: (this: BattleActions, creature: Creature) => string | null;
	canZMove?: (this: BattleActions, creature: Creature) => ZMoveOptions | void;
	forceSwitch?: (
		this: BattleActions, damage: SpreadMoveDamage, targets: SpreadMoveTargets, source: Creature,
		move: ActiveMove, moveData: ActiveMove, isSecondary?: boolean, isSelf?: boolean
	) => SpreadMoveDamage;
	getActiveMaxMove?: (this: BattleActions, move: Move, creature: Creature) => ActiveMove;
	getActiveZMove?: (this: BattleActions, move: Move, creature: Creature) => ActiveMove;
	getMaxMove?: (this: BattleActions, move: Move, creature: Creature) => Move | undefined;
	getSpreadDamage?: (
		this: BattleActions, damage: SpreadMoveDamage, targets: SpreadMoveTargets, source: Creature,
		move: ActiveMove, moveData: ActiveMove, isSecondary?: boolean, isSelf?: boolean
	) => SpreadMoveDamage;
	getZMove?: (this: BattleActions, move: Move, creature: Creature, skipChecks?: boolean) => string | true | undefined;
	hitStepAccuracy?: (this: BattleActions, targets: Creature[], creature: Creature, move: ActiveMove) => boolean[];
	hitStepBreakProtect?: (this: BattleActions, targets: Creature[], creature: Creature, move: ActiveMove) => undefined;
	hitStepMoveHitLoop?: (this: BattleActions, targets: Creature[], creature: Creature, move: ActiveMove) => SpreadMoveDamage;
	hitStepTryImmunity?: (this: BattleActions, targets: Creature[], creature: Creature, move: ActiveMove) => boolean[];
	hitStepStealBoosts?: (this: BattleActions, targets: Creature[], creature: Creature, move: ActiveMove) => undefined;
	hitStepTryHitEvent?: (this: BattleActions, targets: Creature[], creature: Creature, move: ActiveMove) => (boolean | '')[];
	hitStepInvulnerabilityEvent?: (
		this: BattleActions, targets: Creature[], creature: Creature, move: ActiveMove
	) => boolean[];
	hitStepTypeImmunity?: (this: BattleActions, targets: Creature[], creature: Creature, move: ActiveMove) => boolean[];
	moveHit?: (
		this: BattleActions, target: Creature | null, creature: Creature, move: ActiveMove,
		moveData?: ActiveMove, isSecondary?: boolean, isSelf?: boolean
	) => number | undefined | false;
	runAction?: (this: BattleActions, action: Action) => void;
	runMegaEvo?: (this: BattleActions, creature: Creature) => boolean;
	runMegaEvoX?: (this: BattleActions, creature: Creature) => boolean;
	runMegaEvoY?: (this: BattleActions, creature: Creature) => boolean;
	runMove?: (
		this: BattleActions, moveOrMoveName: Move | string, creature: Creature, targetLoc: number, options?: {
			sourceEffect?: Effect | null, zMove?: string, externalMove?: boolean,
			maxMove?: string, originalTarget?: Creature,
		}
	) => void;
	runMoveEffects?: (
		this: BattleActions, damage: SpreadMoveDamage, targets: SpreadMoveTargets, source: Creature,
		move: ActiveMove, moveData: ActiveMove, isSecondary?: boolean, isSelf?: boolean
	) => SpreadMoveDamage;
	runSwitch?: (this: BattleActions, creature: Creature) => boolean;
	runZPower?: (this: BattleActions, move: ActiveMove, creature: Creature) => void;
	secondaries?: (
		this: BattleActions, targets: SpreadMoveTargets, source: Creature, move: ActiveMove,
		moveData: ActiveMove, isSelf?: boolean
	) => void;
	selfDrops?: (
		this: BattleActions, targets: SpreadMoveTargets, source: Creature,
		move: ActiveMove, moveData: ActiveMove, isSecondary?: boolean
	) => void;
	spreadMoveHit?: (
		this: BattleActions, targets: SpreadMoveTargets, creature: Creature, move: ActiveMove,
		moveData?: ActiveMove, isSecondary?: boolean, isSelf?: boolean
	) => [SpreadMoveDamage, SpreadMoveTargets];
	switchIn?: (
		this: BattleActions, creature: Creature, pos: number, sourceEffect: Effect | null, isDrag?: boolean
	) => boolean | "pursuitfaint";
	targetTypeChoices?: (this: BattleActions, targetType: string) => boolean;
	terastallize?: (this: BattleActions, creature: Creature) => void;
	tryMoveHit?: (
		this: BattleActions, target: Creature, creature: Creature, move: ActiveMove
	) => number | undefined | false | '';
	tryPrimaryHitEvent?: (
		this: BattleActions, damage: SpreadMoveDamage, targets: SpreadMoveTargets, creature: Creature,
		move: ActiveMove, moveData: ActiveMove, isSecondary?: boolean
	) => SpreadMoveDamage;
	trySpreadMoveHit?: (
		this: BattleActions, targets: Creature[], creature: Creature, move: ActiveMove, notActive?: boolean
	) => boolean;
	useMove?: (
		this: BattleActions, move: Move, creature: Creature, options?: {
			target?: Creature | null, sourceEffect?: Effect | null,
			zMove?: string, maxMove?: string,
		}
	) => boolean;
	useMoveInner?: (
		this: BattleActions, move: Move, creature: Creature, options?: {
			target?: Creature | null, sourceEffect?: Effect | null,
			zMove?: string, maxMove?: string,
		}
	) => boolean;
	getDamage?: (
		this: BattleActions, creature: Creature, target: Creature, move: string | number | ActiveMove, suppressMessages: boolean
	) => number | undefined | null | false;
	modifyDamage?: (
		this: BattleActions, baseDamage: number, creature: Creature, target: Creature, move: ActiveMove, suppressMessages?: boolean
	) => void;

	// oms
	mutateOriginalSpecies?: (this: BattleActions, species: Species, deltas: AnyObject) => Species;
	getFormeChangeDeltas?: (this: BattleActions, formeChangeSpecies: Species, creature?: Creature) => AnyObject;
	getMixedSpecies?: (this: BattleActions, originalName: string, megaName: string, creature?: Creature) => Species;
}

interface ModdedBattleSide {
	inherit?: true;
	addSideCondition?: (
		this: Side, status: string | Condition, source: Creature | 'debug' | null, sourceEffect: Effect | null
	) => boolean;
	allies?: (this: Side, all?: boolean) => Creature[];
	canDynamaxNow?: (this: Side) => boolean;
	chooseSwitch?: (this: Side, slotText?: string) => any;
	getChoice?: (this: Side) => string;
	getRequestData?: (this: Side, forAlly?: boolean) => { name: string, id: ID, creature: AnyObject[] };
}

interface ModdedBattleCreature {
	inherit?: true;
	lostItemForDelibird?: Item | null;
	boostBy?: (this: Creature, boost: SparseBoostsTable) => boolean | number;
	clearBoosts?: (this: Creature) => void;
	clearVolatile?: (this: Creature, includeSwitchFlags?: boolean) => void;
	calculateStat?: (this: Creature, statName: StatIDExceptHP, boost: number, modifier?: number) => number;
	cureStatus?: (this: Creature, silent?: boolean) => boolean;
	deductPP?: (
		this: Creature, move: string | Move, amount?: number | null, target?: Creature | null | false
	) => number;
	eatItem?: (this: Creature, force?: boolean, source?: Creature, sourceEffect?: Effect) => boolean;
	effectiveWeather?: (this: Creature, sourceEffect?: Effect, message?: string | boolean) => ID;
	formeChange?: (
		this: Creature, speciesId: string | Species, source: Effect, isPermanent?: boolean, abilitySlot?: string,
		message?: string,
	) => boolean;
	hasType?: (this: Creature, type: string | string[]) => boolean;
	getAbility?: (this: Creature) => Ability;
	getActionSpeed?: (this: Creature) => number;
	getItem?: (this: Creature) => Item;
	getMoveRequestData?: (this: Creature) => {
		moves: { move: string, id: ID, target?: string, disabled?: boolean }[],
		maybeDisabled?: boolean, trapped?: boolean, maybeTrapped?: boolean,
		canMegaEvo?: boolean, canUltraBurst?: boolean, canZMove?: ZMoveOptions,
	};
	getMoves?: (this: Creature, lockedMove?: string | null, restrictData?: boolean) => {
		move: string, id: string, disabled?: string | boolean, disabledSource?: string,
		target?: string, pp?: number, maxpp?: number,
	}[];
	getMoveTargets?: (this: Creature, move: ActiveMove, target: Creature) => {
		targets: Creature[], pressureTargets: Creature[],
	};
	getStat?: (
		this: Creature, statName: StatIDExceptHP, unboosted?: boolean, unmodified?: boolean, fastReturn?: boolean
	) => number;
	getTypes?: (this: Creature, excludeAdded?: boolean, preterastallized?: boolean) => string[];
	getWeight?: (this: Creature) => number;
	hasAbility?: (this: Creature, ability: string | string[]) => boolean;
	hasItem?: (this: Creature, item: string | string[]) => boolean;
	isGrounded?: (this: Creature, negateImmunity: boolean | undefined) => boolean | null;
	modifyStat?: (this: Creature, statName: StatIDExceptHP, modifier: number) => void;
	moveUsed?: (this: Creature, move: ActiveMove, targetLoc?: number) => void;
	recalculateStats?: (this: Creature) => void;
	runEffectiveness?: (this: Creature, move: ActiveMove) => number;
	runImmunity?: (this: Creature, source: ActiveMove | string, message?: string | boolean) => boolean;
	setAbility?: (
		this: Creature, ability: string | Ability, source?: Creature | null, sourceEffect?: Effect | null,
		isFromFormeChange?: boolean, isTransform?: boolean
	) => ID | false | null;
	setItem?: (this: Creature, item: string | Item, source?: Creature, effect?: Effect) => boolean;
	setStatus?: (
		this: Creature, status: string | Condition, source: Creature | null,
		sourceEffect: Effect | null, ignoreImmunities: boolean
	) => boolean;
	takeItem?: (this: Creature, source: Creature | undefined) => boolean | Item;
	transformInto?: (this: Creature, creature: Creature, effect: Effect | null) => boolean;
	useItem?: (this: Creature, source?: Creature, sourceEffect?: Effect) => boolean;
	ignoringAbility?: (this: Creature) => boolean;
	ignoringItem?: (this: Creature) => boolean;

	// OM
	getLinkedMoves?: (this: Creature, ignoreDisabled?: boolean) => [ActiveMove, ActiveMove] | [];
	hasLinkedMove?: (this: Creature, move: ActiveMove) => boolean;
	getIsMoveLocked?: (this: Creature) => boolean;
	getWillLockMove?: (this: Creature) => boolean;
	getCanLinkMove?: (this: Creature, move: ActiveMove) => boolean;
	queryLinkMove?: (
		this: Creature, move: ActiveMove, ignoreDisabled?: boolean
	) => { linkIndex: number, linkedMoves: [ActiveMove, ActiveMove] };
}

interface ModdedBattleQueue extends Partial<BattleQueue> {
	inherit?: true;
	resolveAction?: (this: BattleQueue, action: ActionChoice, midTurn?: boolean) => Action[];
}

interface ModdedField extends Partial<Field> {
	inherit?: true;
	suppressingWeather?: (this: Field) => boolean;
	addPseudoWeather?: (
		this: Field, status: string | Condition, source: Creature | 'debug' | null, sourceEffect: Effect | null
	) => boolean;
	setWeather?: (
		this: Field, status: string | Condition, source: Creature | 'debug' | null, sourceEffect: Effect | null
	) => boolean | null;
	setTerrain?: (
		this: Field, status: string | Effect, source: Creature | 'debug' | null, sourceEffect: Effect | null
	) => boolean;
}

interface ModdedBattleScriptsData extends Partial<BattleScriptsData> {
	inherit?: string;
	actions?: ModdedBattleActions;
	creature?: ModdedBattleCreature;
	queue?: ModdedBattleQueue;
	field?: ModdedField;
	side?: ModdedBattleSide;
	boost?: (
		this: Battle, boost: SparseBoostsTable, target: Creature, source?: Creature | null,
		effect?: Effect | null, isSecondary?: boolean, isSelf?: boolean
	) => boolean | null | 0;
	debug?: (this: Battle, activity: string) => void;
	getActionSpeed?: (this: Battle, action: AnyObject) => void;
	init?: (this: ModdedDex) => void;
	maybeTriggerEndlessBattleClause?: (
		this: Battle, trappedBySide: boolean[], stalenessBySide: ('internal' | 'external' | undefined)[]
	) => boolean | undefined;
	endTurn?: (this: Battle) => void;
	runAction?: (this: Battle, action: Action) => void;
	statModify?: (this: Battle, baseStats: StatsTable, set: CreatureSet, statName: StatID) => number;
	start?: (this: Battle) => void;
	runPickTeam?: () => void;
	suppressingWeather?: (this: Battle) => boolean;
	trunc?: (n: number) => number;
	win?: (this: Battle, side?: SideID | '' | Side | null) => boolean;
	faintMessages?: (this: Battle, lastFirst?: boolean, forceCheck?: boolean, checkWin?: boolean) => boolean | undefined;
	tiebreak?: (this: Battle) => boolean;
	calculatePP?: (this: Battle, move: Move, ppUps?: number) => number;
	checkMoveMakesContact?: (
		this: Battle, move: ActiveMove, attacker: Creature, defender: Creature, announcePads?: boolean
	) => boolean;
	checkMoveBypassesProtect?: (
		this: Battle, move: ActiveMove, attacker: Creature, defender: Creature, blockStatus?: boolean
	) => boolean;
	checkWin?: (this: Battle, faintQueue?: Battle['faintQueue'][0]) => true | undefined;
	fieldEvent?: (this: Battle, eventid: string, targets?: Creature[]) => void;
	getAllActive?: (this: Battle, includeFainted?: boolean, includeCommanding?: boolean) => Creature[];
	getTarget?: (
		this: Battle, creature: Creature, move: string | Move, targetLoc: number, originalTarget?: Creature
	) => Creature | null;

	// OM
	resolveTargetLoc?: (this: Battle, targetLoc: number, action: Action, move: ActiveMove) => number;
}

type TypeInfo = import('./dex-data').TypeInfo;

interface PlayerOptions {
	name?: string;
	avatar?: string;
	rating?: number;
	team?: CreatureSet[] | string | null;
	seed?: PRNGSeed;
	/** Kilumen: bag contents usable in battle, { itemid: count } */
	bag?: { [itemid: string]: number };
	/** Kilumen: this side's creatures earn XP (the human player's side) */
	gainsXp?: boolean;
	xpShare?: number;
}

interface BasicTextData {
	desc?: string;
	shortDesc?: string;
}
interface ConditionTextData extends BasicTextData {
	activate?: string;
	addItem?: string;
	block?: string;
	boost?: string;
	cant?: string;
	changeAbility?: string;
	damage?: string;
	end?: string;
	heal?: string;
	move?: string;
	start?: string;
	transform?: string;
}

interface MoveTextData extends ConditionTextData {
	alreadyStarted?: string;
	blockSelf?: string;
	clearBoost?: string;
	endFromItem?: string;
	fail?: string;
	failSelect?: string;
	failTooHeavy?: string;
	failWrongForme?: string;
	megaNoItem?: string;
	prepare?: string;
	removeItem?: string;
	startFromItem?: string;
	startFromZEffect?: string;
	switchOut?: string;
	takeItem?: string;
	typeChange?: string;
	upkeep?: string;
}

type TextFile<T> = T & {
	name: string,
	gen1?: T,
	gen2?: T,
	gen3?: T,
	gen4?: T,
	gen5?: T,
	gen6?: T,
	gen7?: T,
	gen8?: T,
	champions?: T,
};

type AbilityText = TextFile<ConditionTextData & {
	activateFromItem?: string,
	activateNoTarget?: string,
	copyBoost?: string,
	transformEnd?: string,
}>;
type MoveText = TextFile<MoveTextData>;
type ItemText = TextFile<ConditionTextData>;
type CreatureDexText = TextFile<BasicTextData>;
type DefaultText = AnyObject;

declare namespace RandomTeamsTypes {
	export interface TeamDetails {
		megaStone?: number;
		zMove?: number;
		snow?: number;
		hail?: number;
		rain?: number;
		sand?: number;
		sun?: number;
		stealthRock?: number;
		spikes?: number;
		toxicSpikes?: number;
		stickyWeb?: number;
		rapidSpin?: number;
		defog?: number;
		screens?: number;
		illusion?: number;
		statusCure?: number;
		teraBlast?: number;
		imprison?: number;
		dynamaxUser?: number;
	}
	export interface FactoryTeamDetails {
		megaCount?: number;
		zCount?: number;
		wantsTeraCount?: number;
		forceResult: boolean;
		weather?: string;
		terrain?: string[];
		typeCount: { [k: string]: number };
		typeComboCount: { [k: string]: number };
		baseFormes: { [k: string]: number };
		has: { [k: string]: number };
		weaknesses: { [k: string]: number };
		resistances: { [k: string]: number };
		gigantamax?: boolean;
	}
	export interface RandomSet {
		name: string;
		species: string;
		speciesId?: string;
		gender: string | boolean;
		moves: string[];
		ability: string;
		evs: SparseStatsTable;
		ivs: SparseStatsTable;
		item: string;
		level: number;
		shiny: boolean;
		nature?: string;
		happiness?: number;
		dynamaxLevel?: number;
		gigantamax?: boolean;
		teraType?: string;
		role?: Role;
	}
	export interface RandomFactorySet {
		name: string;
		species: string;
		gender: string;
		item: string;
		ability: string;
		shiny: boolean;
		level: number;
		happiness: number;
		evs: SparseStatsTable;
		ivs: SparseStatsTable;
		nature: string;
		moves: string[];
		dynamaxLevel?: number;
		gigantamax?: boolean;
		wantsTera?: boolean;
		teraType?: string;
	}
	export interface RandomDraftFactorySet {
		name: string;
		species: string;
		gender: string;
		moves: string[];
		ability: string;
		evs: SparseStatsTable;
		ivs: SparseStatsTable;
		item: string;
		level: number;
		shiny: boolean;
		nature?: string;
		happiness?: number;
		dynamaxLevel?: number;
		gigantamax?: boolean;
		teraType?: string;
		teraCaptain?: boolean;
	}
	export interface RandomSetData {
		role: Role;
		movepool: string[];
		abilities?: string[];
		teraTypes?: string[];
		preferredTypes?: string[];
	}
	export interface RandomSpeciesData {
		level?: number;
		sets: RandomSetData[];
	}
	export type Role = '' | 'Fast Attacker' | 'Setup Sweeper' | 'Wallbreaker' | 'Tera Blast user' |
		'Bulky Attacker' | 'Bulky Setup' | 'Fast Bulky Setup' | 'Bulky Support' | 'Fast Support' | 'AV Pivot' |
		'Doubles Fast Attacker' | 'Doubles Setup Sweeper' | 'Doubles Wallbreaker' | 'Doubles Bulky Attacker' |
		'Doubles Bulky Setup' | 'Offensive Protect' | 'Bulky Protect' | 'Doubles Support' | 'Choice Item user' |
		'Z-Move user' | 'Staller' | 'Spinner' | 'Generalist' | 'Berry Sweeper' | 'Thief user' | 'Imprisoner' |
		'Dynamax User';
}
