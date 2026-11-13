/**
 * Kilumen fork: upstream used @pkmn/sets to pack/unpack the upstream team
 * text format. Kilumen teams are plain JSON objects, so pack/unpack is JSON.
 */
import type {StatsTable} from './exported-global-types';

/** A creature as handed to the engine by the game (Kilumen fork). */
export interface CreatureSet {
	name: string;
	species: string;
	item: string;
	ability: string;
	moves: string[];
	nature: string;
	gender: string;
	evs: StatsTable;
	ivs: StatsTable;
	level: number;
	shiny?: boolean;
	happiness?: number;
	crystal?: string;
	hpType?: string;
	dynamaxLevel?: number;
	gigantamax?: boolean;
	teraType?: string;
	/** Kilumen: 'large' | 'small' | 'enraged' | 'cosmic' | '' (PLACEHOLDER multipliers in data) */
	variant?: string;
	/** Kilumen: lineage bonus per stat, replaces upstream IV/EV/nature roll */
	lineage?: Partial<StatsTable>;
	/** Kilumen: current HP carried in from the overworld (undefined = full) */
	hp?: number;
	/** Kilumen: current energy per skill slot carried in from the overworld (undefined = full) */
	energy?: number[];
	/** Kilumen: carried-in status condition id (data-defined, e.g. 'scorched') */
	status?: string;
	statusTurns?: number;
	/** Kilumen: experience points (total) */
	xp?: number;
	/** Kilumen: Warmth (bond) 0..255 */
	warmth?: number;
	[k: string]: any;
}

export const Teams = new class Teams {
	pack(team: CreatureSet[] | null): string {
		return JSON.stringify(team || []);
	}
	unpack(buf: string): CreatureSet[] | null {
		try { return JSON.parse(buf); } catch { return null; }
	}
	getGenerator(format: any, seed: any = null): any {
		throw new Error('Kilumen fork: random team generators are not included');
	}
};
