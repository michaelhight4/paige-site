import * as Utils from '../lib/utils';
import {Condition, DexConditions} from './dex-conditions';
import {DataMove, DexMoves} from './dex-moves';
import {Item, DexItems} from './dex-items';
import {Ability, DexAbilities} from './dex-abilities';
import {Species, DexSpecies, DexLearnsets, ModdedLearnsetData} from './dex-species';
import {Format, FormatList, DexFormats, RuleTable} from './dex-formats';
import {Registry} from './registry';
import * as Data from './dex-data';

const BASE_MOD = 'gen9' as ID;

const dexes: {[mod: string]: ModdedDex} = Object.create(null);

type DataType =
	'Abilities' | 'Rulesets' | 'FormatsData' | 'Items' | 'Learnsets' | 'Moves' |
	'Natures' | 'CreatureDex' | 'Scripts' | 'Conditions' | 'TypeChart';
const DATA_TYPES: DataType[] = [
	'Abilities', 'Rulesets', 'FormatsData', 'Items', 'Learnsets', 'Moves',
	'Natures', 'CreatureDex', 'Scripts', 'Conditions', 'TypeChart',
];

/** Unfortunately we do for..in too much to want to deal with the casts */
export interface DexTable<T> {[id: string]: T}
export interface AliasesTable {[id: IDEntry]: string}

interface DexTableData {
	Abilities: DexTable<import('./dex-abilities').AbilityData>;
	Rulesets: DexTable<import('./dex-formats').FormatData>;
	Items: DexTable<import('./dex-items').ItemData>;
	Learnsets: DexTable<import('./dex-species').LearnsetData>;
	Moves: DexTable<import('./dex-moves').MoveData>;
	Natures: DexTable<import('./dex-data').NatureData>;
	CreatureDex: DexTable<import('./dex-species').SpeciesData>;
	FormatsData: DexTable<import('./dex-species').SpeciesFormatsData>;
	Conditions: DexTable<import('./dex-conditions').ConditionData>;
	TypeChart: DexTable<import('./dex-data').TypeData>;

	Scripts: ModdedBattleScriptsData; // NB: Not a DexTable, but PS is dumb AF

	Species: DexTable<import('./dex-species').SpeciesData>;
	Types: DexTable<import('./dex-data').TypeData>;
}

type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends Array<infer U>
		? Array<DeepPartial<U>>
		: T[P] extends ReadonlyArray<infer V>
			? ReadonlyArray<DeepPartial<V>>
			: DeepPartial<T[P]>
};

export type ModData = DeepPartial<ModdedDex['data']>;

export const toID = Data.toID;

export class ModdedDex {
	readonly Data = Data;
	readonly Condition = Condition;
	readonly Ability = Ability;
	readonly Item = Item;
	readonly Move = DataMove;
	readonly Species = Species;
	readonly Format = Format;
	readonly ModdedDex = ModdedDex;

	readonly name = "[ModdedDex]";
	readonly isBase: boolean;
	readonly currentMod: string;

	readonly toID = Data.toID;

	readonly formats: DexFormats;
	readonly abilities: DexAbilities;
	readonly items: DexItems;
	readonly moves: DexMoves;
	readonly species: DexSpecies;
	readonly learnsets: DexLearnsets;
	readonly conditions: DexConditions;
	readonly natures: Data.DexNatures;
	readonly types: Data.DexTypes;
	readonly stats: Data.DexStats;
	readonly aliases: Map<ID, ID> | null = null;

	gen = 0;
	parentMod = '';
	modsLoaded = false;

	dataCache: DexTableData | null;

	deepClone = Utils.deepClone;
	deepFreeze = Utils.deepFreeze;
	Multiset = Utils.Multiset;

	constructor(mod = 'base') {
		this.isBase = (mod === 'base');
		this.currentMod = mod;

		this.dataCache = null;

		this.formats = new DexFormats(this);
		this.abilities = new DexAbilities(this);
		this.items = new DexItems(this);
		this.moves = new DexMoves(this);
		this.species = new DexSpecies(this);
		this.learnsets = new DexLearnsets(this);
		this.conditions = new DexConditions(this);
		this.natures = new Data.DexNatures(this);
		this.types = new Data.DexTypes(this);
		this.stats = new Data.DexStats(this);
	}

	get modid() {
		return this.currentMod as ID;
	}

	get data(): DexTableData {
		return this.loadData();
	}

	get dexes(): {[mod: string]: ModdedDex} {
		return dexes;
	}

	mod(mod: string | undefined, modData?: DeepPartial<ModdedDex['data']> & {Formats?: FormatList}): ModdedDex {
		if (!mod) return dexes['base'];
		const modid = toID(mod);
		if (modData?.Types && !modData.TypeChart) modData.TypeChart = modData.Types;
		if (modData?.Species && !modData.CreatureDex) modData.CreatureDex = modData.Species;
		const dex = (modid in dexes) && !modData ? dexes[modid] : new ModdedDex(modid);
		dex.loadData(modData);
		if (!(modid in dexes)) dexes[modid] = dex;
		if (modData?.Formats) dex.formats.extend(modData?.Formats);
		return dex;
	}

	forGen(gen: number) {
		return this.mod('base');
	}

	forFormat(format: Format | string): ModdedDex {
		const mod = this.formats.get(format).mod;
		return dexes[mod || BASE_MOD].includeData();
	}

	modData(dataType: DataType, id: string) {
		if (dataType === 'Scripts') throw new Error(`'${dataType}' cannot be indexed by '${id}'`);
		if (this.isBase) return this.data[dataType][id];
		if (this.data[dataType][id] !== dexes[this.parentMod].data[dataType][id]) return this.data[dataType][id];
		return (this.data[dataType][id] = Utils.deepClone(this.data[dataType][id]));
	}

	effectToString() {
		return this.name;
	}

	/**
	 * Sanitizes a username or Creature nickname
	 *
	 * Returns the passed name, sanitized for safe use as a name in the PS
	 * protocol.
	 *
	 * Such a string must uphold these guarantees:
	 * - must not contain any ASCII whitespace character other than a space
	 * - must not start or end with a space character
	 * - must not contain any of: | , [ ]
	 * - must not be the empty string
	 * - must not contain Unicode RTL control characters
	 *
	 * If no such string can be found, returns the empty string. Calling
	 * functions are expected to check for that condition and deal with it
	 * accordingly.
	 *
	 * getName also enforces that there are not multiple consecutive space
	 * characters in the name, although this is not strictly necessary for
	 * safety.
	 */
	getName(name: any): string {
		if (typeof name !== 'string' && typeof name !== 'number') return '';
		name = ('' + name).replace(/[|\s[\],\u202e]+/g, ' ').trim();
		if (name.length > 18) name = name.substr(0, 18).trim();

		// remove zalgo
		name = name.replace(
			/[\u0300-\u036f\u0483-\u0489\u0610-\u0615\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06ED\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]{3,}/g,
			''
		);
		name = name.replace(/[\u239b-\u23b9]/g, '');

		return name;
	}

	/**
	 * Returns false if the target is immune; true otherwise.
	 * Also checks immunity to some statuses.
	 */
	getImmunity(
		source: {type: string} | string,
		target: {getTypes: () => string[]} | {types: string[]} | string[] | string
	): boolean {
		const sourceType: string = typeof source !== 'string' ? source.type : source;
		// @ts-ignore
		const targetTyping: string[] | string = target.getTypes?.() || target.types || target;
		if (Array.isArray(targetTyping)) {
			for (const type of targetTyping) {
				if (!this.getImmunity(sourceType, type)) return false;
			}
			return true;
		}
		const typeData = this.types.get(targetTyping);
		if (typeData && typeData.damageTaken[sourceType] === 3) return false;
		return true;
	}

	getEffectiveness(
		source: {type: string} | string,
		target: {getTypes: () => string[]} | {types: string[]} | string[] | string
	): number {
		const sourceType: string = typeof source !== 'string' ? source.type : source;
		// @ts-ignore
		const targetTyping: string[] | string = target.getTypes?.() || target.types || target;
		let totalTypeMod = 0;
		if (Array.isArray(targetTyping)) {
			for (const type of targetTyping) {
				totalTypeMod += this.getEffectiveness(sourceType, type);
			}
			return totalTypeMod;
		}
		const typeData = this.types.get(targetTyping);
		if (!typeData) return 0;
		switch (typeData.damageTaken[sourceType]) {
		case 1: return 1; // super-effective
		case 2: return -1; // resist
		// in case of weird situations like Gravity, immunity is handled elsewhere
		default: return 0;
		}
	}

	getDescs(table: string, id: ID, dataEntry: AnyObject) {
		if (dataEntry.shortDesc || dataEntry.desc) {
			return {desc: dataEntry.desc || dataEntry.shortDesc, shortDesc: dataEntry.shortDesc || dataEntry.desc};
		}
		return null;
	}

	/**
	 * Ensure we're working on a copy of a move (and make a copy if we aren't)
	 *
	 * Remember: "ensure" - by default, it won't make a copy of a copy:
	 *     moveCopy === Dex.getActiveMove(moveCopy)
	 *
	 * If you really want to, use:
	 *     moveCopyCopy = Dex.getActiveMove(moveCopy.id)
	 */
	getActiveMove(move: Move | string): ActiveMove {
		if (move && typeof (move as ActiveMove).hit === 'number') return move as ActiveMove;
		move = this.moves.get(move);
		const moveCopy: ActiveMove = Utils.deepClone(move);
		moveCopy.hit = 0;
		return moveCopy;
	}

	/**
	 * Truncate a number into an unsigned 32-bit integer, for
	 * compatibility with the cartridge games' math systems.
	 */
	trunc(num: number, bits = 0) {
		if (bits) return (num >>> 0) % (2 ** bits);
		return num >>> 0;
	}

	loadDataFile(
		mod: string,
		dataType: DataType,
		modData?: DeepPartial<ModdedDex['data']>
	): AnyObject | void {
		if (modData) return modData[dataType];
		if (!Registry.data) throw new Error('battle engine: call installData() before use');
		return Registry.data[dataType];
	}

	getAlias(id: ID): ID | undefined {
		return this.loadAliases().get(id);
	}

	loadAliases(): NonNullable<ModdedDex['aliases']> {
		if (!this.isBase) return Dex.loadAliases();
		if (this.aliases) return this.aliases;
		const aliases = new Map<ID, ID>();
		for (const [alias, target] of Object.entries(Registry.data?.Aliases || {})) {
			aliases.set(alias as ID, toID(target));
		}
		(this as any).aliases = aliases satisfies this['aliases'];
		return this.aliases!;
	}

	includeMods(): this {
		return this;
	}

	includeModData(): this {
		for (const mod in this.dexes) {
			dexes[mod].includeData();
		}
		return this;
	}

	includeData(): this {
		this.loadData();
		return this;
	}

	loadData(modData?: DeepPartial<ModdedDex['data']>): DexTableData {
		if (this.dataCache) return this.dataCache;
		const dataCache: {[k in keyof DexTableData]?: any} = {};

		const Scripts = this.loadDataFile(this.currentMod, 'Scripts', modData) || {};
		// We want to inherit most of Scripts but not this.
		const init = Scripts.init;

		this.parentMod = this.isBase ? '' : (Scripts.inherit || 'base');

		let parentDex;
		if (this.parentMod) {
			parentDex = dexes[this.parentMod];
			if (!parentDex || parentDex === this) {
				throw new Error(
					`Unable to load ${this.currentMod}. 'inherit' should specify a parent mod from which to inherit data, or must be not specified.`
				);
			}
		}

		if (!parentDex) {
			// Formats are inherited by mods and used by Rulesets
			this.includeFormats();
		}
		for (const dataType of DATA_TYPES) {
			dataCache[dataType] = this.loadDataFile(this.currentMod, dataType, modData);
			if (dataType === 'Rulesets' && !parentDex) {
				for (const format of this.formats.all()) {
					dataCache.Rulesets[format.id] = {...format, ruleTable: null};
				}
			}
		}
		if (parentDex) {
			for (const dataType of DATA_TYPES) {
				const parentTypedData: any = parentDex.data[dataType];
				if (!dataCache[dataType] && !init) {
					dataCache[dataType] = parentTypedData;
					continue;
				}
				const childTypedData = dataCache[dataType] || (dataCache[dataType] = {});
				for (const entryId in parentTypedData) {
					if (childTypedData[entryId] === null) {
						// null means don't inherit
						delete childTypedData[entryId];
					} else if (!(entryId in childTypedData)) {
						// If it doesn't exist it's inherited from the parent data
						childTypedData[entryId] = parentTypedData[entryId];
					} else if (childTypedData[entryId]?.inherit) {
						// {inherit: true} can be used to modify only parts of the parent data,
						// instead of overwriting entirely
						delete childTypedData[entryId].inherit;

						// {inherit: true} can also be used to inherit parts of conditions
						if (childTypedData[entryId].condition?.inherit) {
							delete childTypedData[entryId].condition.inherit;
							childTypedData[entryId].condition = {
								...parentTypedData[entryId].condition,
								...childTypedData[entryId].condition,
							};
						}

						// Merge parent into children entry, preserving existing childs' properties.
						childTypedData[entryId] = {...parentTypedData[entryId], ...childTypedData[entryId]};
					}
				}
			}
		}

		// Flag the generation. Required for team validator.
		this.gen = dataCache.Scripts.gen;
		if (!this.gen) throw new Error(`Mod ${this.currentMod} needs a generation number in scripts.js`);

		dataCache.Types = dataCache.TypeChart;
		dataCache.Species = dataCache.CreatureDex;

		this.dataCache = dataCache as DexTableData;

		// Execute initialization script.
		if (init) init.call(this);

		return this.dataCache;
	}

	includeFormats(): this {
		this.formats.load();
		return this;
	}
}

dexes['base'] = new ModdedDex();
dexes[BASE_MOD] = dexes['base'];

/** Kilumen fork: install the game's data tables (replaces upstream static data). */
export function installData(data: AnyObject) {
	Registry.data = data;
	Registry.formats = data.Formats || [];
	for (const id in dexes) {
		dexes[id].dataCache = null;
		dexes[id].formats.formatsListCache = null;
		dexes[id].formats.rulesetCache.clear();
		const d: AnyObject = dexes[id];
		for (const table of ['abilities', 'conditions', 'natures', 'types', 'items', 'moves', 'species', 'learnsets']) {
			const t = d[table];
			if (!t) continue;
			for (const key of Object.keys(t)) {
				if (t[key] instanceof Map) t[key].clear();
				else if (key.endsWith('Cache') || key === 'allCache') t[key] = null;
			}
		}
	}
	dexes['base'].includeData();
}

export const Dex = dexes['base'];
export namespace Dex {
	export type Species = import('./dex-species').Species;
	export type Item = import('./dex-items').Item;
	export type Move = import('./dex-moves').Move;
	export type Ability = import('./dex-abilities').Ability;

	export type HitEffect = import('./dex-moves').HitEffect;
	export type SecondaryEffect = import('./dex-moves').SecondaryEffect;
	export type RuleTable = import('./dex-formats').RuleTable;
}
export {RuleTable};
