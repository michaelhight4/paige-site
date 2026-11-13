import {
	AnyObject,
	GenderName,
	ID,
	IDEntry,
	ModdedDex,
	Nonstandard,
	StatsTable,
	TierTypes,
	EventInfo,
} from './exported-global-types';

import {Utils} from '../lib';
import {assignMissingFields, toID, BasicEffect} from './dex-data';

interface SpeciesAbility {
	0: string;
	1?: string;
	H?: string;
	S?: string;
}

type SpeciesTag = "Mythical" | "Restricted Legendary" | "Sub-Legendary" | "Ultra Beast" | "Paradox";

export interface SpeciesData extends Partial<Species> {
	name: string;
	/** National Dex number */
	num: number;

	types: string[];
	abilities: SpeciesAbility;
	baseStats: StatsTable;
	eggGroups: string[];
	weightkg: number;
}
export interface CosmeticFormeData {
	isCosmeticForme: boolean;
	name: string;
	baseSpecies: string;
	forme: string;
	color: string;
}

export type ModdedSpeciesData = SpeciesData | CosmeticFormeData |
	Partial<Omit<SpeciesData, 'name'>> & { inherit: true } |
	Partial<Omit<CosmeticFormeData, 'isCosmeticForme'>> & { inherit: true };

export interface SpeciesFormatsData {
	comboMoves?: readonly string[];
	doublesTier?: TierTypes.Doubles | TierTypes.Other;
	essentialMove?: string;
	exclusiveMoves?: readonly string[];
	gmaxUnreleased?: boolean;
	isNonstandard?: Nonstandard | null;
	natDexTier?: TierTypes.Singles | TierTypes.Other;
	randomBattleMoves?: readonly string[];
	randomBattleLevel?: number;
	randomDoubleBattleMoves?: readonly string[];
	randomDoubleBattleLevel?: number;
	randomBattleNoDynamaxMoves?: readonly string[];
	tier?: TierTypes.Singles | TierTypes.Other;
}

export type ModdedSpeciesFormatsData = SpeciesFormatsData & {inherit?: true};

export interface LearnsetData {
	learnset?: {[moveid: string]: MoveSource[]};
	eventData?: EventInfo[];
	eventOnly?: boolean;
	encounters?: EventInfo[];
	exists?: boolean;
}

export type ModdedLearnsetData = LearnsetData & {inherit?: true};


export interface SpeciesDataTable { [speciesid: IDEntry]: SpeciesData | CosmeticFormeData }
export interface ModdedSpeciesDataTable {[speciesid: IDEntry]: ModdedSpeciesData}
export interface SpeciesFormatsDataTable {[speciesid: IDEntry]: SpeciesFormatsData}
export interface ModdedSpeciesFormatsDataTable {[speciesid: IDEntry]: ModdedSpeciesFormatsData}
export interface LearnsetDataTable {[speciesid: IDEntry]: LearnsetData}
export interface ModdedLearnsetDataTable {[speciesid: IDEntry]: ModdedLearnsetData}

/**
 * Describes a possible way to get a move onto a creature.
 *
 * First character is a generation number, 1-9.
 * Second character is a source ID, one of:
 *
 * - M = TM/HM
 * - T = tutor
 * - L = start or level-up, 3rd char+ is the level
 * - R = restricted (special moves like Rotom moves)
 * - E = egg
 * - D = Dream World, only 5D is valid
 * - S = event, 3rd char+ is the index in .eventData
 * - V = Virtual Console or Let's Go transfer, only 7V/8V is valid
 * - C = NOT A REAL SOURCE, see note, only 3C/4C is valid
 *
 * C marks certain moves learned by a creature's prevo. It's used to
 * work around the chainbreeding checker's shortcuts for performance;
 * it lets the creature be a valid father for teaching the move, but
 * is otherwise ignored by the learnset checker (which will actually
 * check prevos for compatibility).
 */
export type MoveSource = `${
	1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
}${
	'M' | 'T' | 'L' | 'R' | 'E' | 'D' | 'S' | 'V' | 'C'
}${string}`;

export class Species extends BasicEffect implements Readonly<BasicEffect & SpeciesFormatsData> {
	declare readonly effectType: 'Creature';
	/**
	 * Species ID. Identical to ID. Note that this is the full ID, e.g.
	 * 'basculinbluestriped'. To get the base species ID, you need to
	 * manually read toID(species.baseSpecies).
	 */
	 declare readonly id: ID;
	/**
	 * Name. Note that this is the full name with forme,
	 * e.g. 'Basculin-Blue-Striped'. To get the name without forme, see
	 * `species.baseSpecies`.
	 */
	 declare readonly name: string;
	/**
	 * Base species. Species, but without the forme name.
	 *
	 * DO NOT ASSUME A CREATURE CAN TRANSFORM FROM `baseSpecies` TO
	 * `species`. USE `changesFrom` FOR THAT.
	 */
	readonly baseSpecies: string;
	/**
	 * Forme name. If the forme exists,
	 * `species.name === species.baseSpecies + '-' + species.forme`
	 *
	 * The games make a distinction between Forme (foorumu) (legendary creature)
	 * and Form (sugata) (non-legendary creature). PS does not use the same
	 * distinction – they're all "Forme" to PS, reflecting current community
	 * use of the term.
	 *
	 * This property only tracks non-cosmetic formes, and will be `''` for
	 * cosmetic formes.
	 */
	readonly forme: string;
	/**
	 * Base forme name.
	 */
	readonly baseForme: string;
	/**
	 * Other forms. List of names of cosmetic forms. These should have
	 * `aliases.js` aliases to this entry, but not have their own
	 * entry in `creatureDex.js`.
	 */
	readonly cosmeticFormes?: string[];
	/**
	 * Other formes. List of names of formes, appears only on the base
	 * forme. Unlike forms, these have their own entry in `creatureDex.js`.
	 */
	readonly otherFormes?: string[];
	/**
	 * List of forme speciesNames in the order they appear in the game data -
	 * the union of baseSpecies, otherFormes and cosmeticFormes. Appears only on
	 * the base species forme.
	 *
	 * A species's alternate formeindex may change from generation to generation -
	 * the forme with index N in Gen A is not guaranteed to be the same forme as the
	 * forme with index in Gen B.
	 *
	 * Gigantamaxes are not considered formes by the game (see data/FORMES.md - PS
	 * labels them as such for convenience) - Gigantamax "formes" are instead included at
	 * the end of the formeOrder list so as not to interfere with the correct index numbers.
	 */
	readonly formeOrder?: string[];
	/**
	 * Sprite ID. Basically the same as ID, but with a dash between
	 * species and forme.
	 */
	readonly spriteid: string;
	/** Abilities. */
	readonly abilities: SpeciesAbility;
	/** Types. */
	readonly types: string[];
	/** Added type (added by Trick-Or-Treat or Forest's Curse, but only listed in species by OMs). */
	readonly addedType?: string;
	/** Pre-evolution. '' if nothing evolves into this Creature. */
	readonly prevo: string;
	/** Evolutions. Array because many Creature have multiple evolutions. */
	readonly evos: string[];
	readonly evoType?: 'trade' | 'useItem' | 'levelMove' | 'levelExtra' | 'levelFriendship' | 'levelHold' | 'other';
	/** Evolution condition. falsy if doesn't evolve. */
	declare readonly evoCondition?: string;
	/** Evolution item. falsy if doesn't evolve. */
	declare readonly evoItem?: string;
	/** Evolution move. falsy if doesn't evolve. */
	readonly evoMove?: string;
	/** Region required to be in for evolution. falsy if doesn't evolve. */
	readonly evoRegion?: 'Alola' | 'Galar';
	/** Evolution level. falsy if doesn't evolve. */
	readonly evoLevel?: number;
	/** Is NFE? True if this Creature can evolve (Mega evolution doesn't count). */
	readonly nfe: boolean;
	/** Egg groups. */
	readonly eggGroups: string[];
	/** True if this species can hatch from an Egg. */
	readonly canHatch: boolean;
	/** True if this species is a purely cosmetic forme. */
	readonly isCosmeticForme: boolean;
	/**
	 * Gender. M = always male, F = always female, N = always
	 * genderless, '' = sometimes male sometimes female.
	 */
	readonly gender: GenderName;
	/** Gender ratio. Should add up to 1 unless genderless. */
	readonly genderRatio: {M: number, F: number};
	/** Base stats. */
	readonly baseStats: StatsTable;
	/** Max HP. Overrides usual HP calculations (for Shedinja). */
	readonly maxHP?: number;
	/** A Creature's Base Stat Total */
	readonly bst: number;
	/** Weight (in kg). Not valid for OMs; use weighthg / 10 instead. */
	readonly weightkg: number;
	/** Weight (in integer multiples of 0.1kg). */
	readonly weighthg: number;
	/** Height (in m). */
	readonly heightm: number;
	/** Color. */
	readonly color: string;
	/**
	 * Tags, boolean data. Currently just legendary/mythical status.
	 */
	readonly tags: SpeciesTag[];
	/** Does this Creature have an unreleased hidden ability? */
	readonly unreleasedHidden: boolean | 'Past';
	/**
	 * Is it only possible to get the hidden ability on a male creature?
	 * This is mainly relevant to Gen 5.
	 */
	readonly maleOnlyHidden: boolean;
	/** Possible mother for a male-only Creature. */
	readonly mother?: string;
	/** True if a creature is mega. */
	readonly isMega?: boolean;
	/** True if a creature is primal. */
	declare readonly isPrimal?: boolean;
	/** Name of its Gigantamax move, if a creature is capable of gigantamaxing. */
	readonly canGigantamax?: string;
	/** If this Creature can gigantamax, is its gigantamax released? */
	readonly gmaxUnreleased?: boolean;
	/** True if a Creature species is incapable of dynamaxing */
	readonly cannotDynamax?: boolean;
	/** The Tera Type this Creature is forced to use */
	readonly requiredTeraType?: string;
	/** What it transforms from, if a creature is a forme that is only accessible in battle. */
	readonly battleOnly?: string | string[];
	/** Required item. Do not use this directly; see requiredItems. */
	readonly requiredItem?: string;
	/** Required move. Move required to use this forme in-battle. */
	declare readonly requiredMove?: string;
	/** Required ability. Ability required to use this forme in-battle. */
	declare readonly requiredAbility?: string;
	/**
	 * Required items. Items required to be in this forme, e.g. a mega
	 * stone, or Griseous Orb. Array because Arceus formes can hold
	 * either a Plate or a Z-Crystal.
	 */
	readonly requiredItems?: string[];

	/**
	 * Formes that can transform into this Creature, to inherit learnsets
	 * from. (Like `prevo`, but for transformations that aren't
	 * technically evolution. Includes in-battle transformations like
	 * Zen Mode and out-of-battle transformations like Rotom.)
	 *
	 * Not filled out for megas/primals - fall back to baseSpecies
	 * for in-battle formes.
	 */
	readonly changesFrom?: string;

	/**
	 * List of sources and other availability for a Creature transferred from
	 * Creature GO.
	 */

	/**
	 * Singles Tier. The Creature's location in the Smogon tier system.
	 */
	readonly tier: TierTypes.Singles | TierTypes.Other;
	/**
	 * Doubles Tier. The Creature's location in the Smogon doubles tier system.
	 */
	readonly doublesTier: TierTypes.Doubles | TierTypes.Other;
	/**
	 * National Dex Tier. The Creature's location in the Smogon National Dex tier system.
	 */
	readonly natDexTier: TierTypes.Singles | TierTypes.Other;
	declare readonly randomBattleMoves?: readonly ID[];
	declare readonly randomBattleLevel?: number;
	declare readonly randomDoubleBattleMoves?: readonly ID[];
	declare readonly randomDoubleBattleLevel?: number;
	declare readonly randomBattleNoDynamaxMoves?: readonly ID[];
	declare readonly exclusiveMoves?: readonly ID[];
	declare readonly comboMoves?: readonly ID[];
	declare readonly essentialMove?: ID;

	constructor(data: AnyObject) {
		super(data);

		this.fullname = `creature: ${data.name}`;
		this.effectType = 'Creature';
		this.baseSpecies = data.baseSpecies || this.name;
		this.forme = data.forme || '';
		this.baseForme = data.baseForme || '';
		this.cosmeticFormes = data.cosmeticFormes || undefined;
		this.otherFormes = data.otherFormes || undefined;
		this.formeOrder = data.formeOrder || undefined;
		this.spriteid = data.spriteid ||
			(toID(this.baseSpecies) + (this.baseSpecies !== this.name ? `-${toID(this.forme)}` : ''));
		this.abilities = data.abilities || {0: ""};
		this.types = data.types || ['???'];
		this.addedType = data.addedType || undefined;
		this.prevo = data.prevo || '';
		this.tier = data.tier || '';
		this.doublesTier = data.doublesTier || '';
		this.natDexTier = data.natDexTier || '';
		this.evos = data.evos || [];
		this.evoType = data.evoType || undefined;
		this.evoMove = data.evoMove || undefined;
		this.evoLevel = data.evoLevel || undefined;
		this.nfe = data.nfe || false;
		this.eggGroups = data.eggGroups || [];
		this.canHatch = data.canHatch || false;
		this.gender = data.gender || '';
		this.genderRatio = data.genderRatio || (this.gender === 'M' ? {M: 1, F: 0} :
			this.gender === 'F' ? {M: 0, F: 1} :
			this.gender === 'N' ? {M: 0, F: 0} :
			{M: 0.5, F: 0.5});
		this.requiredItem = data.requiredItem || undefined;
		this.requiredItems = data.requiredItems || (this.requiredItem ? [this.requiredItem] : undefined);
		this.baseStats = data.baseStats || {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
		this.bst = this.baseStats.hp + this.baseStats.atk + this.baseStats.def +
			this.baseStats.spa + this.baseStats.spd + this.baseStats.spe;
		this.weightkg = data.weightkg || 0;
		this.weighthg = this.weightkg * 10;
		this.heightm = data.heightm || 0;
		this.color = data.color || '';
		this.isCosmeticForme = data.isCosmeticForme || undefined;
		this.tags = data.tags || [];
		this.unreleasedHidden = data.unreleasedHidden || false;
		this.maleOnlyHidden = !!data.maleOnlyHidden;
		this.maxHP = data.maxHP || undefined;
		this.isMega = !!(this.forme && ['Mega', 'Mega-X', 'Mega-Y'].includes(this.forme)) || undefined;
		this.isPrimal = this.forme === 'Primal' || undefined;
		this.canGigantamax = data.canGigantamax || undefined;
		this.gmaxUnreleased = !!data.gmaxUnreleased;
		this.cannotDynamax = !!data.cannotDynamax;
		this.battleOnly = data.battleOnly || (this.isMega || this.isPrimal ? this.baseSpecies : undefined);
		this.changesFrom = data.changesFrom ||
			(this.battleOnly !== this.baseSpecies ? this.battleOnly : this.baseSpecies);
		if (Array.isArray(this.changesFrom)) this.changesFrom = this.changesFrom[0];

		if (!this.gen && this.num >= 1) {
			if (this.num >= 906 || this.forme.includes('Paldea')) {
				this.gen = 9;
			} else if (this.num >= 810) {
				this.gen = 8;
			} else if (this.num >= 722 || this.forme.startsWith('Alola') || this.forme === 'Starter') {
				this.gen = 7;
			} else if (this.num >= 650 || this.isMega || this.isPrimal) {
				this.gen = 6;
			} else if (this.num >= 494) {
				this.gen = 5;
			} else if (this.num >= 387) {
				this.gen = 4;
			} else if (this.num >= 252) {
				this.gen = 3;
			} else if (this.num >= 152) {
				this.gen = 2;
			} else {
				this.gen = 1;
			}
		}
		assignMissingFields(this, data);
	}
}

const EMPTY_SPECIES = Utils.deepFreeze(new Species({
	id: '', name: '', exists: false,
	tier: 'Illegal', doublesTier: 'Illegal',
	natDexTier: 'Illegal', isNonstandard: 'Custom',
}));

export class Learnset {
	readonly effectType: 'Learnset';
	/**
	 * Keeps track of exactly how a creature might learn a move, in the
	 * form moveid:sources[].
	 */
	readonly learnset?: {[moveid: string]: MoveSource[]};
	/** True if the only way to get this Creature is from events. */
	readonly eventOnly: boolean;
	/** List of event data for each event. */
	readonly eventData?: EventInfo[];
	readonly encounters?: EventInfo[];
	readonly exists: boolean;
	readonly species: Species;

	constructor(data: AnyObject, species: Species) {
		this.exists = data.exists === false ? data.exists : true;
		this.effectType = 'Learnset';
		this.learnset = data.learnset || undefined;
		this.eventOnly = !!data.eventOnly;
		this.eventData = data.eventData || undefined;
		this.encounters = data.encounters || undefined;
		this.species = species;

		const eventData = Utils.deepClone(this.eventData);
		let update = false;
		if (eventData) {
			for (const eventInfo of eventData) {
				if (eventInfo.source === 'gen8legends') {
					eventInfo.crystal = '';
					update = true;
				}
			}
		}
		if (update) this.eventData = Utils.deepFreeze(eventData);
	}
}

export class DexSpecies {
	readonly dex: ModdedDex;
	readonly speciesCache = new Map<ID, Species>();
	allCache: readonly Species[] | null = null;

	constructor(dex: ModdedDex) {
		this.dex = dex;
	}

	get(name?: string | Species): Species {
		if (name && typeof name !== 'string') return name;

		let id = '' as ID;
		if (name) {
			name = name.trim();
			id = toID(name);
		}

		return this.getByID(id);
	}
	getByID(id: ID): Species {
		if (id === '' || id === 'constructor') return EMPTY_SPECIES;
		let species: Mutable<Species> | undefined = this.speciesCache.get(id);
		if (species) return species;

		const alias = this.dex.getAlias(id);
		if (alias) {
			if (this.dex.data.FormatsData.hasOwnProperty(id)) {
				// special event ID
				species = new Species({
					...this.dex.data.CreatureDex[alias],
					...this.dex.data.FormatsData[id],
					name: id,
				});
				species.abilities = {0: species.abilities['S']!};
			} else {
				species = this.get(alias);
				if (this.dex.data.CreatureDex?.[id]?.isCosmeticForme) {
					const cosmeticForme = this.dex.data.CreatureDex[id];
					species = new Species({
						...species,
						...cosmeticForme,
						name: species.baseSpecies + '-' + cosmeticForme.forme!, // Forme always exists on cosmetic forme entries
						baseForme: "",
						otherFormes: null,
						cosmeticFormes: null,
					});
				}
				if (species.cosmeticFormes) {
					for (const forme of species.cosmeticFormes) {
						if (toID(forme) === id) {
							species = new Species({
								...species,
								name: forme,
								forme: forme.slice(species.name.length + 1),
								baseForme: "",
								isCosmeticForme: true,
								baseSpecies: species.name,
								otherFormes: null,
								cosmeticFormes: null,
							});
							break;
						}
					}
				}
			}
			this.speciesCache.set(id, species);
			return species;
		}

		if (!this.dex.data.CreatureDex.hasOwnProperty(id)) {
			let aliasTo = '';
			const formeNames: {[k: IDEntry]: IDEntry[]} = {
				alola: ['a', 'alola', 'alolan'],
				galar: ['g', 'galar', 'galarian'],
				hisui: ['h', 'hisui', 'hisuian'],
				paldea: ['p', 'paldea', 'paldean'],
				mega: ['m', 'mega'],
				primal: ['p', 'primal'],
			};
			for (const forme in formeNames) {
				let creaName = '';
				for (const i of formeNames[forme as ID]) {
					if (id.startsWith(i)) {
						creaName = id.slice(i.length);
					} else if (id.endsWith(i)) {
						creaName = id.slice(0, -i.length);
					}
				}
				creaName = this.dex.getAlias(creaName as ID) || creaName;
				if (this.dex.data.CreatureDex[creaName + forme]) {
					aliasTo = creaName + forme;
					break;
				}
			}
			if (aliasTo) {
				species = this.get(aliasTo);
				if (species.exists) {
					this.speciesCache.set(id, species);
					return species;
				}
			}
		}
		if (id && this.dex.data.CreatureDex.hasOwnProperty(id)) {
			const creatureDexData = this.dex.data.CreatureDex[id];
			const baseSpeciesTags = creatureDexData.baseSpecies && this.dex.data.CreatureDex[toID(creatureDexData.baseSpecies)].tags;
			species = new Species({
				tags: baseSpeciesTags,
				...creatureDexData,
				...this.dex.data.FormatsData[id],
			});
			// Inherit any statuses from the base species.
			const baseSpeciesStatuses = this.dex.data.Conditions[toID(species.baseSpecies)];
			if (baseSpeciesStatuses !== undefined) {
				for (const key in baseSpeciesStatuses) {
					if (!(key in species)) {
						(species as any)[key] = (baseSpeciesStatuses as any)[key];
					}
				}
			}
			// Kilumen fork: upstream competitive tier / per-game legality bookkeeping removed.
			if (!species.tier) species.tier = 'Kilumen' as any;
			if (!species.doublesTier) species.doublesTier = species.tier as any;
			if (!species.natDexTier) species.natDexTier = species.tier;
			species.nfe = species.evos.some(evo => this.get(evo).exists);
			species.canHatch = false;
		} else {
			species = new Species({
				id, name: id,
				exists: false, tier: 'Illegal', doublesTier: 'Illegal', natDexTier: 'Illegal', isNonstandard: 'Custom',
			});
		}
		(species as any).kind = 'Species';
		if (species.exists) this.speciesCache.set(id, species);
		return species;
	}

	/**
	 * @param id the ID of the species the move pool belongs to
	 * @param isNatDex
	 * @returns a Set of IDs of the full valid movepool of the given species for the current generation/mod.
	 * Note that inter-move incompatibilities, such as those from exclusive events, are not considered and all moves are
	 * lumped together. However, Necturna and Necturine's Sketchable moves are omitted from this pool, as their fundamental
	 * incompatibility with each other is essential to the nature of those species.
	 */
	getMovePool(id: ID, isNatDex = false): Set<ID> {
		let eggMovesOnly = false;
		let maxGen = this.dex.gen;
		const movePool = new Set<ID>();
		for (const {species, learnset} of this.getFullLearnset(id)) {
			if (!eggMovesOnly) eggMovesOnly = this.eggMovesOnly(species, this.get(id));
			for (const moveid in learnset) {
				if (eggMovesOnly) {
					if (learnset[moveid].some(source => source.startsWith('9E'))) {
						movePool.add(moveid as ID);
					}
				} else if (maxGen >= 9) {
					// Creature Home now strips learnsets on withdrawal
					if (isNatDex || learnset[moveid].some(source => source.startsWith('9'))) {
						movePool.add(moveid as ID);
					}
				} else {
					if (learnset[moveid].some(source => parseInt(source.charAt(0)) <= maxGen)) {
						movePool.add(moveid as ID);
					}
				}
			}
			if (species.evoRegion) {
				// species can only evolve in this gen, so prevo can't have any moves
				// from after that gen
				if (this.dex.gen >= 9) eggMovesOnly = true;
				if (this.dex.gen === 8 && species.evoRegion === 'Alola') maxGen = 7;
			}
		}
		return movePool;
	}

	eggMovesOnly(child: Species, father: Species | null) {
		if (child.baseSpecies === father?.baseSpecies) return false;
		while (father) {
			if (father.name === child.name) return false;
			father = this.learnsetParent(father);
		}
		return true;
	}

	getFullLearnset(id: ID): (Learnset & {learnset: NonNullable<Learnset['learnset']>})[] {
		const originalSpecies = this.get(id);
		let species: Species | null = originalSpecies;
		const out: (Learnset & {learnset: NonNullable<Learnset['learnset']>})[] = [];
		const alreadyChecked: {[k: string]: boolean} = {};

		while (species?.name && !alreadyChecked[species.id]) {
			alreadyChecked[species.id] = true;
			const learnset = this.getLearnsetData(species.id);
			if (learnset.learnset) {
				out.push(learnset as any);
				species = this.learnsetParent(species, true);
				continue;
			}

			// no learnset
			if ((species.changesFrom || species.baseSpecies) !== species.name) {
				// forme without its own learnset
				species = this.get(species.changesFrom || species.baseSpecies);
				// warning: formes with their own learnset, like Wormadam, should NOT
				// inherit from their base forme unless they're freely switchable
				continue;
			}
			if (species.isNonstandard) {
				// It's normal for a nonstandard species not to have learnset data

				// Formats should replace the `Obtainable Moves` rule if they want to
				// allow creature without learnsets.
				return out;
			}
			if (species.prevo && this.getLearnsetData(toID(species.prevo)).learnset) {
				species = this.get(toID(species.prevo));
				continue;
			}

			// should never happen
			throw new Error(`Species with no learnset data: ${species.id}`);
		}

		return out;
	}

	learnsetParent(species: Species, checkingMoves = false) {
		// Kilumen fork: simple evolution-line parent.
		return species.prevo ? this.get(species.prevo) : null;
	}

	/**
	 * Gets the raw learnset data for the species.
	 *
	 * In practice, if you're trying to figure out what moves a creature learns,
	 * you probably want to `getFullLearnset` or `getMovePool` instead.
	 */
	getLearnsetData(id: ID): Learnset {
		return this.dex.learnsets.getInternal(id);
	}


	all(): readonly Species[] {
		if (this.allCache) return this.allCache;
		const species = [];
		for (const id in this.dex.data.CreatureDex) {
			species.push(this.getByID(id as ID));
		}
		this.allCache = species;
		return this.allCache;
	}
}

export class DexLearnsets {
	readonly dex: ModdedDex;
	readonly learnsetCache = new Map<ID, Learnset>();

	constructor(dex: ModdedDex) {
		this.dex = dex;
	}

	get(name: string): Promise<Learnset> {
		return this.getByID(toID(name));
	}

	getByID(id: ID): Promise<Learnset> {
		return Promise.resolve(this.getInternal(id));
	}

	getInternal(id: ID): Learnset {
		let learnsetData = this.learnsetCache.get(id);
		if (learnsetData) return learnsetData;
		if (!this.dex.data.Learnsets.hasOwnProperty(id)) {
			learnsetData = new Learnset({exists: false}, this.dex.species.get(id));
		} else {
			learnsetData = new Learnset(this.dex.data.Learnsets[id], this.dex.species.get(id));
		}
		(learnsetData as any).kind = 'Learnset';
		if (learnsetData.exists) this.learnsetCache.set(id, learnsetData);
		return learnsetData;
	}
}
