import {
	ActiveMove,
	AnyObject,
	Battle,
	Condition,
	Effect,
	ID,
	Move,
	MoveTarget,
	CreatureSet,
	SideID,
	StatsExceptHPTable,
} from './exported-global-types';

/**
 * Simulator Side
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * There's a lot of ambiguity between the terms "player", "side", "team",
 * and "half-field", which I'll try to explain here:
 *
 * These terms usually all mean the same thing. The exceptions are:
 *
 * - Multi-battle: there are 2 half-fields, 2 teams, 4 sides
 *
 * - Free-for-all: there are 2 half-fields, 4 teams, 4 sides
 *
 * "Half-field" is usually abbreviated to "half".
 *
 * Function naming will be very careful about which term to use. Pay attention
 * if it's relevant to your code.
 *
 * @license MIT
 */

import { Utils } from '../lib/utils';
import type { RequestState } from './battle';
import { Creature, type EffectState } from './creature';
import { State } from './state';
import { toID } from './dex';
import { bagKey } from './kilumen';

/** A single action that can be chosen. Choices will have one Action for each creature. */
export interface ChosenAction {
	choice: 'move' | 'switch' | 'instaswitch' | 'krevive' | 'team' | 'shift' | 'pass';// action type
	creature?: Creature; // the creature doing the action
	targetLoc?: number; // relative location of the target to creature (move action only)
	moveid?: string; // a move to use (move action only)
	move?: ActiveMove; // the active move corresponding to moveid (move action only)
	moveSlot?: number; // the move's index in the creature's moveset (undefined if submitted through the "Fight" button)
	target?: Creature; // the target of the action
	index?: number; // the chosen index in Team Preview
	side?: Side; // the action's side
	mega?: boolean | null; // true if megaing or ultra bursting
	megax?: boolean | null; // true if megaing x
	megay?: boolean | null; // true if megaing y
	zmove?: string; // if zmoving, the name of the zmove
	maxMove?: string; // if dynamaxed, the name of the max move
	terastallize?: string; // if terastallizing, tera type
	priority?: number; // priority of the action
}

/** One single turn's choice for one single player. */
export interface Choice {
	cantUndo: boolean; // true if the choice can't be cancelled because of the maybeTrapped issue
	error: string; // contains error text in the case of a choice error
	actions: ChosenAction[]; // array of chosen actions
	forcedSwitchesLeft: number; // number of switches left that need to be performed
	forcedPassesLeft: number; // number of passes left that need to be performed
	switchIns: Set<number>; // indexes of creature chosen to switch in
	zMove: boolean; // true if a Z-move has already been selected
	mega: boolean; // true if a mega evolution has already been selected
	ultra: boolean; // true if an ultra burst has already been selected
	dynamax: boolean; // true if a dynamax has already been selected
	terastallize: boolean; // true if a terastallization has already been inputted
}

export interface CreatureSwitchRequestData {
	/**
	 * `` `${sideid}: ${name}` ``
	 * @see {Creature#fullname}
	 */
	ident: string;
	/**
	 * Details string.
	 * @see {Creature#details}
	 */
	details: string;
	condition: string;
	active: boolean;
	stats: StatsExceptHPTable;
	/**
	 * Move IDs for choosable moves. Also includes Hidden Power Type, Frustration/Return power.
	 */
	moves: ID[];
	/** Permanent ability (the one applied on switch-in). */
	baseAbility: ID;
	item: ID;
	crystal: ID;
	/** Current ability. Only sent in Gen 7+. */
	ability?: ID;
	/** @see https://dex.pokemonshowdown.com/abilities/commander */
	commanding?: boolean;
	/** @see https://dex.pokemonshowdown.com/moves/krevive */
	reviving?: boolean;
	teraType?: string;
	terastallized?: string;
}
export interface MoveRequestData {
	move: string;
	id: ID;
	pp?: number;
	maxpp?: number;
	target?: string;
	disabled?: string | boolean;
	disabledSource?: string;
};

export interface CreatureMoveRequestData {
	moves: MoveRequestData[];
	maybeDisabled?: boolean;
	maybeLocked?: boolean;
	trapped?: boolean;
	maybeTrapped?: boolean;
	canMegaEvo?: boolean;
	canMegaEvoX?: boolean;
	canMegaEvoY?: boolean;
	canUltraBurst?: boolean;
	canZMove?: AnyObject | null;
	canDynamax?: boolean;
	maxMoves?: DynamaxOptions;
	canTerastallize?: string;
}
export interface DynamaxOptions {
	maxMoves: ({ move: string, target: MoveTarget, disabled?: boolean })[];
	gigantamax?: string;
}
export interface SideRequestData {
	name: string;
	/** Side ID (`p1`, `p2`, `p3`, or `p4`), not the ID of the side's name. */
	id: SideID;
	creature: CreatureSwitchRequestData[];
	noCancel?: boolean;
}
export interface SwitchRequest {
	wait?: undefined;
	teamPreview?: undefined;
	forceSwitch: boolean[];
	side: SideRequestData;
	noCancel?: boolean;
	update?: boolean;
}
export interface TeamPreviewRequest {
	wait?: undefined;
	teamPreview: true;
	forceSwitch?: undefined;
	maxChosenTeamSize?: number;
	side: SideRequestData;
	noCancel?: boolean;
}
export interface MoveRequest {
	wait?: undefined;
	teamPreview?: undefined;
	forceSwitch?: undefined;
	active: CreatureMoveRequestData[];
	side: SideRequestData;
	ally?: SideRequestData;
	noCancel?: boolean;
	update?: boolean;
}
export interface WaitRequest {
	wait: true;
	teamPreview?: undefined;
	forceSwitch?: undefined;
	side: SideRequestData;
	noCancel?: boolean;
}
export type ChoiceRequest = SwitchRequest | TeamPreviewRequest | MoveRequest | WaitRequest;

export class Side {
	readonly battle: Battle;
	readonly id: SideID;
	/** Index in `battle.sides`: `battle.sides[side.n] === side` */
	readonly n: number;

	name: string;
	avatar: string;
	foe: Side = null!; // set in battle.start()
	/** Only exists in multi battle, for the allied side */
	allySide: Side | null = null; // set in battle.start()
	team: CreatureSet[];
	creature: Creature[];
	active: Creature[];

	creatureLeft: number;
	/** Kilumen: bag contents usable in battle */
	kBag: { [itemid: string]: number } = {};
	/** Kilumen: this side's creatures earn XP */
	kGainsXp = false;
	/** QoL B4: benched share of XP (0 = off) */
	kXpShare = 0;
	/** Kilumen: retreat attempts this battle (raises the odds) */
	kRetreatAttempts = 0;
	zMoveUsed: boolean;
	/**
	 * This will be true in any gen before 8 or if the player (or their battle partner) has dynamaxed once already
	 *
	 * Use Side.canDynamaxNow() to check if a side can dynamax instead of this property because only one
	 * player per team can dynamax on any given turn of a gen 8 Multi Battle.
	 */
	dynamaxUsed: boolean;

	faintedLastTurn: Creature | null;
	faintedThisTurn: Creature | null;
	totalFainted: number;

	/** these point to the same object as the ally's, in multi battles */
	sideConditions: { [id: string]: EffectState };
	slotConditions: { [id: string]: EffectState }[];

	activeRequest: ChoiceRequest | null;
	choice: Choice;

	/**
	 * In gen 1, all lastMove stuff is tracked on Side rather than Creature
	 * (this is for Counter and Mirror Move)
	 * This is also used for checking Self-KO clause in Creature Stadium 2.
	 */
	lastMove: Move | null;
	/**
	 * The move and the slot are chosen during move selection
	 * lastSelectedMove never resets
	 * lastSelectedMoveSlot resets on every switch
	 */
	lastSelectedMove: ID = '00' as ID;
	lastSelectedMoveSlot = 0;

	constructor(name: string, battle: Battle, sideNum: number, team: CreatureSet[]) {
		const sideScripts = battle.dex.data.Scripts.side;
		if (sideScripts) Object.assign(this, sideScripts);

		this.battle = battle;
		if (this.battle.format.side) Object.assign(this, this.battle.format.side);
		this.id = ['p1', 'p2', 'p3', 'p4'][sideNum] as SideID;
		this.n = sideNum;

		this.name = name;
		this.avatar = '';

		this.team = team;
		this.creature = [];
		for (const set of this.team) {
			// console.log("NEW CREATURE: " + (this.team[i] ? this.team[i].name : '[unidentified]'));
			this.addCreature(set);
		}

		switch (this.battle.gameType) {
		case 'doubles':
			this.active = [null!, null!];
			break;
		case 'triples': case 'rotation':
			this.active = [null!, null!, null!];
			break;
		default:
			this.active = [null!];
		}

		this.creatureLeft = this.creature.length;
		this.faintedLastTurn = null;
		this.faintedThisTurn = null;
		this.totalFainted = 0;
		this.zMoveUsed = false;
		this.dynamaxUsed = this.battle.gen !== 8;

		this.sideConditions = {};
		this.slotConditions = [];
		// Array#fill doesn't work for this
		for (let i = 0; i < this.active.length; i++) this.slotConditions[i] = {};

		this.activeRequest = null;
		this.choice = {
			cantUndo: false,
			error: ``,
			actions: [],
			forcedSwitchesLeft: 0,
			forcedPassesLeft: 0,
			switchIns: new Set(),
			zMove: false,
			mega: false,
			ultra: false,
			dynamax: false,
			terastallize: false,
		};

		// old-gens
		this.lastMove = null;
	}

	toJSON(): AnyObject {
		return State.serializeSide(this);
	}

	get requestState(): RequestState {
		if (!this.activeRequest || this.activeRequest.wait) return '';
		if (this.activeRequest.teamPreview) return 'teampreview';
		if (this.activeRequest.forceSwitch) return 'switch';
		return 'move';
	}

	addCreature(set: CreatureSet) {
		if (this.creature.length >= 24) return null;
		const newCreature = new Creature(set, this);
		newCreature.position = this.creature.length;
		this.creature.push(newCreature);
		this.creatureLeft++;
		return newCreature;
	}

	canDynamaxNow(): boolean {
		if (this.battle.gen !== 8) return false;
		// In multi battles, players on a team are alternatingly given the option to dynamax each turn
		// On turn 1, the players on their team's respective left have the first chance (p1 and p2)
		if (this.battle.gameType === 'multi' && this.battle.turn % 2 !== [1, 1, 0, 0][this.n]) return false;
		// if (this.battle.gameType === 'multitriples' && this.battle.turn % 3 !== [1, 1, 2, 2, 0, 0][this.side.n]) {
		//		return false;
		// }
		return !this.dynamaxUsed;
	}

	/** convert a Choice into a choice string */
	getChoice() {
		if (this.choice.actions.length > 1 && this.choice.actions.every(action => action.choice === 'team')) {
			return `team ` + this.choice.actions.map(action => action.creature!.position + 1).join(', ');
		}
		return this.choice.actions.map(action => {
			switch (action.choice) {
			case 'move':
				let details = ``;
				if (action.targetLoc && this.active.length > 1) details += ` ${action.targetLoc > 0 ? '+' : ''}${action.targetLoc}`;
				if (action.mega) details += ` mega`;
				if (action.megax) details += ` megax`;
				if (action.megay) details += ` megay`;
				if (action.zmove) details += ` zmove`;
				if (action.maxMove) details += ` dynamax`;
				if (action.terastallize) details += ` terastallize`;
				return `move ${action.moveid}${details}`;
			case 'switch':
			case 'instaswitch':
			case 'krevive':
				return `switch ${action.target!.position + 1}`;
			case 'team':
				return `team ${action.creature!.position + 1}`;
			default:
				return action.choice;
			}
		}).join(', ');
	}

	toString() {
		return `${this.id}: ${this.name}`;
	}

	getRequestData(forAlly?: boolean): SideRequestData {
		const data: SideRequestData = {
			name: this.name,
			id: this.id,
			creature: [] as CreatureSwitchRequestData[],
		};
		for (const creature of this.creature) {
			data.creature.push(creature.getSwitchRequestData(forAlly));
		}
		return data;
	}

	randomFoe() {
		const actives = this.foes();
		if (!actives.length) return null;
		return this.battle.sample(actives);
	}

	/** Intended as a way to iterate through all foe side conditions - do not use for anything else. */
	foeSidesWithConditions() {
		if (this.battle.gameType === 'freeforall') return this.battle.sides.filter(side => side !== this);

		return [this.foe];
	}
	foeCreatureLeft() {
		if (this.battle.gameType === 'freeforall') {
			return this.battle.sides.filter(side => side !== this).map(side => side.creatureLeft).reduce((a, b) => a + b);
		}

		if (this.foe.allySide) return this.foe.creatureLeft + this.foe.allySide.creatureLeft;

		return this.foe.creatureLeft;
	}
	allies(all?: boolean) {
		// called during the first switch-in, so `active` can still contain nulls at this point
		let allies = this.activeTeam().filter(ally => ally);
		if (!all) allies = allies.filter(ally => !!ally.hp);

		return allies;
	}
	foes(all?: boolean) {
		if (this.battle.gameType === 'freeforall') {
			return this.battle.sides.map(side => side.active[0])
				.filter(creature => creature && creature.side !== this && (all || !!creature.hp));
		}
		return this.foe.allies(all);
	}
	activeTeam() {
		if (this.battle.gameType !== 'multi') return this.active;

		return this.battle.sides[this.n % 2].active.concat(this.battle.sides[this.n % 2 + 2].active);
	}
	hasAlly(creature: Creature) {
		return creature.side === this || creature.side === this.allySide;
	}

	addSideCondition(
		status: string | Condition, source: Creature | 'debug' | null = null, sourceEffect: Effect | null = null
	): boolean {
		if (!source && this.battle.event?.target) source = this.battle.event.target;
		if (source === 'debug') source = this.active[0];
		if (!source) throw new Error(`setting sidecond without a source`);
		if (!source.getSlot) source = (source as any as Side).active[0];

		status = this.battle.dex.conditions.get(status);
		if (this.sideConditions[status.id]) {
			if (!(status as any).onSideRestart) return false;
			return this.battle.singleEvent('SideRestart', status, this.sideConditions[status.id], this, source, sourceEffect);
		}
		this.sideConditions[status.id] = this.battle.initEffectState({
			id: status.id,
			target: this,
			source,
			sourceSlot: source.getSlot(),
			duration: status.duration,
		});
		if (status.durationCallback) {
			this.sideConditions[status.id].duration =
				status.durationCallback.call(this.battle, this.active[0], source, sourceEffect);
		}
		if (!this.battle.singleEvent('SideStart', status, this.sideConditions[status.id], this, source, sourceEffect)) {
			delete this.sideConditions[status.id];
			return false;
		}
		this.battle.runEvent('SideConditionStart', this, source, status);
		return true;
	}

	getSideCondition(status: string | Effect): Effect | null {
		status = this.battle.dex.conditions.get(status) as Effect;
		if (!this.sideConditions[status.id]) return null;
		return status;
	}

	getSideConditionData(status: string | Effect): AnyObject {
		status = this.battle.dex.conditions.get(status) as Effect;
		return this.sideConditions[status.id] || null;
	}

	removeSideCondition(status: string | Effect): boolean {
		status = this.battle.dex.conditions.get(status) as Effect;
		if (!this.sideConditions[status.id]) return false;
		this.battle.singleEvent('SideEnd', status, this.sideConditions[status.id], this);
		delete this.sideConditions[status.id];
		return true;
	}

	addSlotCondition(
		target: Creature | number, status: string | Condition, source: Creature | 'debug' | null = null,
		sourceEffect: Effect | null = null
	) {
		source ??= this.battle.event?.target || null;
		if (source === 'debug') source = this.active[0];
		if (target instanceof Creature) target = target.position;
		if (!source) throw new Error(`setting sidecond without a source`);

		status = this.battle.dex.conditions.get(status);
		if (this.slotConditions[target][status.id]) {
			if (!status.onRestart) return false;
			return this.battle.singleEvent('Restart', status, this.slotConditions[target][status.id], this, source, sourceEffect);
		}
		const conditionState = this.slotConditions[target][status.id] = this.battle.initEffectState({
			id: status.id,
			target: this,
			source,
			sourceSlot: source.getSlot(),
			isSlotCondition: true,
			duration: status.duration,
		});
		if (status.durationCallback) {
			conditionState.duration =
				status.durationCallback.call(this.battle, this.active[0], source, sourceEffect);
		}
		if (!this.battle.singleEvent('Start', status, conditionState, this.active[target], source, sourceEffect)) {
			delete this.slotConditions[target][status.id];
			return false;
		}
		return true;
	}

	getSlotCondition(target: Creature | number, status: string | Effect) {
		if (target instanceof Creature) target = target.position;
		status = this.battle.dex.conditions.get(status) as Effect;
		if (!this.slotConditions[target][status.id]) return null;
		return status;
	}

	removeSlotCondition(target: Creature | number, status: string | Effect) {
		if (target instanceof Creature) target = target.position;
		status = this.battle.dex.conditions.get(status) as Effect;
		if (!this.slotConditions[target][status.id]) return false;
		this.battle.singleEvent('End', status, this.slotConditions[target][status.id], this.active[target]);
		delete this.slotConditions[target][status.id];
		return true;
	}

	send(...parts: (string | number | Function | AnyObject)[]) {
		const sideUpdate = '|' + parts.map(part => {
			if (typeof part !== 'function') return part;
			return part(this);
		}).join('|');
		this.battle.send('sideupdate', `${this.id}\n${sideUpdate}`);
	}

	emitRequest(update: ChoiceRequest = this.activeRequest!, updatedRequest = false) {
		if (updatedRequest) (this.activeRequest as MoveRequest | SwitchRequest).update = true;
		this.battle.send('sideupdate', `${this.id}\n|request|${JSON.stringify(update)}`);
		this.activeRequest = update;
	}

	emitChoiceError(
		message: string, update?: { creature: Creature, update: (req: CreatureMoveRequestData) => boolean | void }
	) {
		this.choice.error = message;
		const updated = update ? this.updateRequestForCreature(update.creature, update.update) : null;
		const type = `[${updated ? 'Unavailable' : 'Invalid'} choice]`;
		this.battle.send('sideupdate', `${this.id}\n|error|${type} ${message}`);
		if (updated) this.emitRequest(this.activeRequest!, true);
		if (this.battle.strictChoices) throw new Error(`${type} ${message}`);
		return false;
	}

	isChoiceDone() {
		if (!this.requestState) return true;
		if (this.choice.forcedSwitchesLeft) return false;

		if (this.requestState === 'teampreview') {
			return this.choice.actions.length >= this.pickedTeamSize();
		}

		// current request is move/switch
		this.getChoiceIndex(); // auto-pass
		return this.choice.actions.length >= this.active.length;
	}

	chooseMove(
		moveText?: string | number,
		targetLoc = 0,
		event: 'mega' | 'megax' | 'megay' | 'zmove' | 'ultra' | 'dynamax' | 'terastallize' | '' = ''
	) {
		if (this.requestState !== 'move') {
			return this.emitChoiceError(`Can't move: You need a ${this.requestState} response`);
		}
		const index = this.getChoiceIndex();
		if (index >= this.active.length) {
			return this.emitChoiceError(`Can't move: You sent more choices than unfainted creature.`);
		}
		const autoChoose = !moveText;
		const creature: Creature = this.active[index];

		// Parse moveText (name or index)
		// If the move is not found, the action is invalid without requiring further inspection.

		const request = creature.getMoveRequestData();
		let moveSlot: number | undefined = undefined;
		let moveid = '';
		let targetType = '';
		if (autoChoose) moveText = 1;
		if (typeof moveText === 'number' || (moveText && /^[0-9]+$/.test(moveText))) {
			// Parse a one-based move index.
			const moveIndex = Number(moveText) - 1;
			if (moveIndex < 0 || moveIndex >= request.moves.length || !request.moves[moveIndex]) {
				return this.emitChoiceError(`Can't move: Your ${creature.name} doesn't have a move ${moveIndex + 1}`);
			}
			moveSlot = moveIndex;
			moveid = request.moves[moveIndex].id;
			targetType = request.moves[moveIndex].target!;
		} else {
			// Parse a move ID.
			// Move names are also allowed, but may cause ambiguity (see client issue #167).
			moveid = toID(moveText);
			if (moveid.startsWith('kvariablepower')) {
				moveid = 'kvariablepower';
			}
			for (const [i, move] of request.moves.entries()) {
				if (move.id !== moveid) continue;
				moveSlot = i;
				targetType = move.target || 'normal';
				break;
			}
			if (!targetType && ['', 'dynamax'].includes(event) && request.maxMoves) {
				for (const [i, moveRequest] of request.maxMoves.maxMoves.entries()) {
					if (moveid === moveRequest.move) {
						moveid = request.moves[i].id;
						moveSlot = i;
						targetType = moveRequest.target;
						event = 'dynamax';
						break;
					}
				}
			}
			if (!targetType && ['', 'zmove'].includes(event) && request.canZMove) {
				for (const [i, moveRequest] of request.canZMove.entries()) {
					if (!moveRequest) continue;
					if (moveid === toID(moveRequest.move)) {
						moveid = request.moves[i].id;
						moveSlot = i;
						targetType = moveRequest.target;
						event = 'zmove';
						break;
					}
				}
			}
			if (!targetType) {
				if (moveid !== 'testfight') {
					return this.emitChoiceError(`Can't move: Your ${creature.name} doesn't have a move matching ${moveid}`);
				}
			}
		}

		const moves = creature.getMoves();
		if (autoChoose) {
			for (const [i, move] of request.moves.entries()) {
				if (move.disabled) continue;
				if (i < moves.length && move.id === moves[i].id && moves[i].disabled) continue;
				moveid = move.id;
				moveSlot = i;
				targetType = move.target!;
				break;
			}
		}
		const move = this.battle.dex.moves.get(moveid);

		// Z-move
		const zMove = event === 'zmove' ? this.battle.actions.getZMove(move, creature) : undefined;
		if (event === 'zmove' && !zMove) {
			return this.emitChoiceError(`Can't move: ${creature.name} can't use ${move.name} as a Z-move`);
		}
		if (zMove && this.choice.zMove) {
			return this.emitChoiceError(`Can't move: You can't Z-move more than once per battle`);
		}
		if (zMove) targetType = this.battle.dex.moves.get(zMove).target;

		// Dynamax
		// Is dynamaxed or will dynamax this turn.
		const maxMove = (event === 'dynamax' || creature.volatiles['dynamax']) ?
			this.battle.actions.getMaxMove(move, creature) : undefined;
		if (event === 'dynamax' && !maxMove) {
			return this.emitChoiceError(`Can't move: ${creature.name} can't use ${move.name} as a Max Move`);
		}
		if (maxMove) targetType = this.battle.dex.moves.get(maxMove).target;

		// Validate targeting
		if (autoChoose || moveid === 'testfight') {
			targetLoc = 0;
		} else if (this.battle.actions.targetTypeChoices(targetType)) {
			if (!targetLoc && this.active.length >= 2) {
				return this.emitChoiceError(`Can't move: ${move.name} needs a target`);
			}
			if (!this.battle.validTargetLoc(targetLoc, creature, targetType)) {
				return this.emitChoiceError(`Can't move: Invalid target for ${move.name}`);
			}
		} else {
			if (targetLoc) {
				return this.emitChoiceError(`Can't move: You can't choose a target for ${move.name}`);
			}
		}

		const lockedMove = creature.getLockedMove() || creature.getSemiLockedMove();
		if (lockedMove) {
			let lockedMoveTargetLoc = creature.lastMoveTargetLoc || 0;
			const lockedMoveID = toID(lockedMove);
			if (creature.volatiles[lockedMoveID]?.targetLoc) {
				lockedMoveTargetLoc = creature.volatiles[lockedMoveID].targetLoc;
			}
			if (creature.maybeLocked) this.choice.cantUndo = true;
			this.choice.actions.push({
				choice: 'move',
				creature,
				targetLoc: lockedMoveTargetLoc,
				moveid: lockedMoveID,
			});
			return true;
		} else if (this.battle.gen === 1 &&
			(['frz', 'slp'].includes(creature.status) || creature.volatiles['partiallytrapped'])) {
			if (creature.maybeLocked) this.choice.cantUndo = true;
			this.choice.actions.push({
				choice: 'move',
				creature,
				moveid: 'fight',
			});
			return true;
		} else if (!moves.length) {
			// Override action and use Struggle if there are no enabled moves with PP
			// Gen 4 and earlier announce a Creature has no moves left before the turn begins, and only to that player's side.
			if (this.battle.gen <= 4) this.send('-activate', creature, 'move: Struggle');
			if (creature.maybeLocked) this.choice.cantUndo = true;
			this.choice.actions.push({
				choice: 'move',
				creature,
				moveid: 'struggle',
			});
			return true;
		} else if (moveid === 'testfight') {
			// test fight button
			if (!creature.maybeLocked) {
				return this.emitChoiceError(`Can't move: ${creature.name}'s Fight button is known to be safe`);
			}
			this.updateRequestForCreature(creature, req => this.updateDisabledRequest(creature, req));
			this.emitRequest(this.activeRequest!, true);
			this.choice.error = 'Hack to avoid sending error messages to the client :D';
			return false;
		} else if (maxMove) {
			// Dynamaxed; only Taunt and Assault Vest disable Max Guard, but the base move must have PP remaining
			if (creature.maxMoveDisabled(move)) {
				return this.emitChoiceError(`Can't move: ${creature.name}'s ${maxMove.name} is disabled`);
			}
		} else if (this.battle.gen === 1) {
			// In Gen 1, disabled moves are tracked by slot rather than by move ID
			if (moves[moveSlot!].disabled) {
				return this.emitChoiceError(`Can't move: ${creature.name}'s ${move.name} is disabled`);
			}
		} else if (!zMove) {
			// Check for disabled moves
			let isEnabled = false;
			let disabledSource = '';
			for (const m of moves) {
				if (m.id !== moveid) continue;
				if (!m.disabled) {
					isEnabled = true;
					break;
				} else if (m.disabledSource) {
					disabledSource = m.disabledSource;
				}
			}
			if (!isEnabled) {
				// Request a different choice
				if (autoChoose) throw new Error(`autoChoose chose a disabled move`);
				return this.emitChoiceError(`Can't move: ${creature.name}'s ${move.name} is disabled`, { creature, update: req => {
					let updated = this.updateDisabledRequest(creature, req);
					for (const m of req.moves) {
						if (m.id === moveid) {
							if (!m.disabled) {
								m.disabled = true;
								updated = true;
							}
							if (m.disabledSource !== disabledSource) {
								m.disabledSource = disabledSource;
								updated = true;
							}
							break;
						}
					}
					return updated;
				} });
			}
			// The chosen move is valid yay
		}

		// Mega evolution
		const mixandmega = this.battle.format.mod === 'mixandmega';
		const mega = (event === 'mega');
		const megax = (event === 'megax');
		const megay = (event === 'megay');
		if (mega && !creature.canMegaEvo) {
			return this.emitChoiceError(`Can't move: ${creature.name} can't mega evolve`);
		}
		if (megax && !creature.canMegaEvoX) {
			return this.emitChoiceError(`Can't move: ${creature.name} can't mega evolve X`);
		}
		if (megay && !creature.canMegaEvoY) {
			return this.emitChoiceError(`Can't move: ${creature.name} can't mega evolve Y`);
		}
		if ((mega || megax || megay) && this.choice.mega && !mixandmega) {
			return this.emitChoiceError(`Can't move: You can only mega-evolve once per battle`);
		}
		const ultra = (event === 'ultra');
		if (ultra && !creature.canUltraBurst) {
			return this.emitChoiceError(`Can't move: ${creature.name} can't ultra burst`);
		}
		if (ultra && this.choice.ultra && !mixandmega) {
			return this.emitChoiceError(`Can't move: You can only ultra burst once per battle`);
		}
		let dynamax = (event === 'dynamax');
		const canDynamax = (this.activeRequest as MoveRequest)?.active[this.active.indexOf(creature)].canDynamax;
		if (dynamax && (this.choice.dynamax || !canDynamax)) {
			if (creature.volatiles['dynamax']) {
				dynamax = false;
			} else {
				if (this.battle.gen !== 8) {
					return this.emitChoiceError(`Can't move: Dynamaxing doesn't outside of Gen 8.`);
				} else if (creature.side.canDynamaxNow()) {
					return this.emitChoiceError(`Can't move: ${creature.name} can't Dynamax now.`);
				} else if (creature.side.allySide?.canDynamaxNow()) {
					return this.emitChoiceError(`Can't move: It's your partner's turn to Dynamax.`);
				}
				return this.emitChoiceError(`Can't move: You can only Dynamax once per battle.`);
			}
		}
		const terastallize = (event === 'terastallize');
		if (terastallize && !creature.canTerastallize) {
			// Make this work properly
			return this.emitChoiceError(`Can't move: ${creature.name} can't Terastallize.`);
		}
		if (terastallize && this.choice.terastallize) {
			return this.emitChoiceError(`Can't move: You can only Terastallize once per battle.`);
		}
		if (terastallize && this.battle.gen !== 9) {
			// Make this work properly
			return this.emitChoiceError(`Can't move: You can only Terastallize in Gen 9.`);
		}
		if (moveSlot === undefined) {
			throw new Error(`moveSlot should have been set by this point`);
		}

		this.choice.actions.push({
			choice: 'move',
			creature,
			targetLoc,
			moveid,
			moveSlot,
			mega: mega || ultra,
			megax,
			megay,
			zmove: zMove,
			maxMove: maxMove ? maxMove.id : undefined,
			terastallize: terastallize ? creature.teraType : undefined,
		});

		if (creature.maybeDisabled && (this.battle.gameType === 'singles' || (
			this.battle.gen <= 3 && !this.battle.actions.targetTypeChoices(targetType)
		))) {
			this.choice.cantUndo = true;
		}

		if (mega || megax || megay) this.choice.mega = true;
		if (ultra) this.choice.ultra = true;
		if (zMove) this.choice.zMove = true;
		if (dynamax) this.choice.dynamax = true;
		if (terastallize) this.choice.terastallize = true;

		return true;
	}

	updateDisabledRequest(creature: Creature, req: CreatureMoveRequestData) {
		let updated = false;
		if (creature.maybeLocked) {
			creature.maybeLocked = false;
			delete req.maybeLocked;
			updated = true;
		}
		if (creature.maybeDisabled && this.battle.gameType !== 'singles') {
			if (this.battle.gen >= 4) {
				creature.maybeDisabled = false;
				delete req.maybeDisabled;
				updated = true;
			}
			for (const m of req.moves) {
				const disabled = creature.getMoveData(m.id)?.disabled;
				if (disabled && (this.battle.gen >= 4 || this.battle.actions.targetTypeChoices(m.target!))) {
					m.disabled = true;
					updated = true;
				}
			}
		}
		if (req.moves.every(m => m.disabled || m.id === 'struggle')) {
			if (req.canMegaEvo) {
				req.canMegaEvo = false;
				updated = true;
			}
			if (req.canMegaEvoX) {
				req.canMegaEvoX = false;
				updated = true;
			}
			if (req.canMegaEvoY) {
				req.canMegaEvoY = false;
				updated = true;
			}
			if (req.canUltraBurst) {
				req.canUltraBurst = false;
				updated = true;
			}
			if (req.canZMove) {
				req.canZMove = undefined;
				updated = true;
			}
			if (req.canDynamax) {
				req.canDynamax = false;
				delete req.maxMoves;
				updated = true;
			}
			if (req.canTerastallize) {
				req.canTerastallize = undefined;
				updated = true;
			}
		}
		return updated;
	}

	updateRequestForCreature(creature: Creature, update: (req: CreatureMoveRequestData) => boolean | void) {
		if (!(this.activeRequest as MoveRequest)?.active) {
			throw new Error(`Can't update a request without active Creature`);
		}
		const req = (this.activeRequest as MoveRequest).active[creature.position];
		if (!req) throw new Error(`Creature not found in request's active field`);
		return update(req) ?? true;
	}

	chooseSwitch(slotText?: string) {
		if (this.requestState !== 'move' && this.requestState !== 'switch') {
			return this.emitChoiceError(`Can't switch: You need a ${this.requestState} response`);
		}
		const index = this.getChoiceIndex();
		if (index >= this.active.length) {
			if (this.requestState === 'switch') {
				return this.emitChoiceError(`Can't switch: You sent more switches than creature that need to switch`);
			}
			return this.emitChoiceError(`Can't switch: You sent more choices than unfainted creature`);
		}
		const creature = this.active[index];
		let slot;
		if (!slotText) {
			if (this.requestState !== 'switch') {
				return this.emitChoiceError(`Can't switch: You need to select a creature to switch in`);
			}
			if (this.slotConditions[creature.position]['krevive']) {
				slot = 0;
				while (!this.creature[slot].fainted) slot++;
			} else {
				if (!this.choice.forcedSwitchesLeft) return this.choosePass();
				slot = this.active.length;
				while (this.choice.switchIns.has(slot) || this.creature[slot].fainted) slot++;
			}
		} else {
			slot = parseInt(slotText) - 1;
		}
		if (isNaN(slot) || slot < 0) {
			// maybe it's a name/species id!
			slot = -1;
			for (const [i, mon] of this.creature.entries()) {
				if (slotText!.toLowerCase() === mon.name.toLowerCase() || toID(slotText) === mon.species.id) {
					slot = i;
					break;
				}
			}
			if (slot < 0) {
				return this.emitChoiceError(`Can't switch: You do not have a creature named "${slotText}" to switch to`);
			}
		}
		if (slot >= this.creature.length) {
			return this.emitChoiceError(`Can't switch: You do not have a creature in slot ${slot + 1} to switch to`);
		} else if (slot < this.active.length && !this.slotConditions[creature.position]['krevive']) {
			return this.emitChoiceError(`Can't switch: You can't switch to an active creature`);
		} else if (this.choice.switchIns.has(slot)) {
			return this.emitChoiceError(`Can't switch: The creature in slot ${slot + 1} can only switch in once`);
		}
		const targetCreature = this.creature[slot];

		if (this.slotConditions[creature.position]['krevive']) {
			if (!targetCreature.fainted) {
				return this.emitChoiceError(`Can't switch: You have to pass to a fainted creature`);
			}
			// Should always subtract, but stop at 0 to prevent errors.
			this.choice.forcedSwitchesLeft = this.battle.clampIntRange(this.choice.forcedSwitchesLeft - 1, 0);
			creature.switchFlag = false;
			this.choice.actions.push({
				choice: 'krevive',
				creature,
				target: targetCreature,
			});
			return true;
		}

		if (targetCreature.fainted) {
			return this.emitChoiceError(`Can't switch: You can't switch to a fainted creature`);
		}

		if (this.requestState === 'move') {
			if (creature.trapped) {
				return this.emitChoiceError(`Can't switch: The active creature is trapped`, { creature, update: req => {
					let updated = false;
					if (req.maybeTrapped) {
						delete req.maybeTrapped;
						updated = true;
					}
					if (!req.trapped) {
						req.trapped = true;
						updated = true;
					}
					return updated;
				} });
			} else if (creature.maybeTrapped) {
				this.choice.cantUndo = true;
			}
		} else if (this.requestState === 'switch') {
			if (!this.choice.forcedSwitchesLeft) {
				throw new Error(`Player somehow switched too many Creature`);
			}
			this.choice.forcedSwitchesLeft--;
		}

		this.choice.switchIns.add(slot);

		this.choice.actions.push({
			choice: (this.requestState === 'switch' ? 'instaswitch' : 'switch'),
			creature,
			target: targetCreature,
		});

		return true;
	}

	/**
	 * The number of creature you must choose in Team Preview.
	 *
	 * Note that PS doesn't support choosing fewer than this number of creature.
	 * In the games, it is sometimes possible to bring fewer than this, but
	 * since that's nearly always a mistake, we haven't gotten around to
	 * supporting it.
	 */
	pickedTeamSize() {
		return Math.min(this.creature.length, this.battle.ruleTable.pickedTeamSize || Infinity);
	}

	chooseTeam(data?: string) {
		if (this.requestState !== 'teampreview') {
			return this.emitChoiceError(`Can't choose for Team Preview: You're not in a Team Preview phase`);
		}

		const ruleTable = this.battle.ruleTable;
		let positions = data ? data.split(data.includes(',') ? ',' : '').map(datum => parseInt(datum) - 1) :
			[...this.creature.keys()]; // autoChoose
		const pickedTeamSize = this.pickedTeamSize();

		// make sure positions is exactly of length pickedTeamSize
		// - If too big: the client automatically sends a full list, so we just trim it down to size
		positions.splice(pickedTeamSize);
		// - If too small: we intentionally support only sending leads and having the sim fill in the rest
		if (positions.length < pickedTeamSize) {
			for (let i = 0; i < pickedTeamSize; i++) {
				if (!positions.includes(i)) positions.push(i);
				// duplicate in input, let the rest of the code handle the error message
				if (positions.length >= pickedTeamSize) break;
			}
		}

		for (const [index, pos] of positions.entries()) {
			if (isNaN(pos) || pos < 0 || pos >= this.creature.length) {
				return this.emitChoiceError(`Can't choose for Team Preview: You do not have a creature in slot ${pos + 1}`);
			}
			if (positions.indexOf(pos) !== index) {
				return this.emitChoiceError(`Can't choose for Team Preview: The creature in slot ${pos + 1} can only switch in once`);
			}
		}

		const result = ruleTable.onChooseTeam?.[0].call(this.battle, positions, this.creature, !data);
		if (result) {
			if (typeof result === 'string') {
				return this.emitChoiceError(`Can't choose for Team Preview: ${result}`);
			}
			if (result.length < pickedTeamSize) {
				throw new Error(`onChooseTeam from ${ruleTable.onChooseTeam![1]} returned a team of size ${result.length}, which is less than the required size of ${pickedTeamSize}`);
			}
			positions = result.slice(0, pickedTeamSize);
		}

		for (const [index, pos] of positions.entries()) {
			this.choice.switchIns.add(pos);
			this.choice.actions.push({
				choice: 'team',
				index,
				creature: this.creature[pos],
				priority: -index,
			});
		}

		return true;
	}

	/**
	 * Kilumen fork: wild/bag choices. "retreat", "crystal ID", "item ID [slot]".
	 * Retreat and Crystal are refused in trainer battles; items need bag stock.
	 */
	chooseKilumen(choice: 'kretreat' | 'kcrystal' | 'kitem', id: string, slot: number) {
		const index = this.getChoiceIndex();
		if (index >= this.active.length) return this.emitChoiceError(`Can't act: no creature in slot ${index + 1}`);
		if (this.requestState !== 'move') return this.emitChoiceError(`Can't act: only during a move phase`);
		const creature: Creature = this.active[index];
		if ((choice === 'kretreat' || choice === 'kcrystal') && !this.battle.kWild) {
			return this.emitChoiceError(`Can't ${choice === 'kretreat' ? 'retreat' : 'use a crystal'}: not a wild battle`);
		}
		if (choice !== 'kretreat') {
			const item = this.battle.dex.items.get(id) as any;
			if (!item.exists) return this.emitChoiceError(`Can't use item: unknown item ${id}`);
			if (!(this.kBag[bagKey(item)] > 0)) return this.emitChoiceError(`Can't use item: none of ${bagKey(item)} left`);
			if (choice === 'kcrystal' && !item.kCrystalGrade) return this.emitChoiceError(`Can't use ${bagKey(item)}: not a crystal`);
			if (choice === 'kitem' && item.kCrystalGrade) return this.emitChoiceError(`Use "crystal ${bagKey(item)}" for crystals`);
			if (slot < 0) slot = this.creature.indexOf(creature);
			if (choice === 'kitem' && !this.creature[slot]) return this.emitChoiceError(`Can't use item: no creature in slot ${slot + 1}`);
		}
		this.choice.actions.push({ choice, creature, event: id, index: slot } as any);
		return true;
	}

	chooseShift() {
		const index = this.getChoiceIndex();
		if (index >= this.active.length) {
			return this.emitChoiceError(`Can't shift: You do not have a creature in slot ${index + 1}`);
		} else if (this.requestState !== 'move') {
			return this.emitChoiceError(`Can't shift: You can only shift during a move phase`);
		} else if (this.battle.gameType !== 'triples') {
			return this.emitChoiceError(`Can't shift: You can only shift to the center in triples`);
		} else if (index === 1) {
			return this.emitChoiceError(`Can't shift: You can only shift from the edge to the center`);
		}
		const creature: Creature = this.active[index];

		this.choice.actions.push({
			choice: 'shift',
			creature,
		});

		return true;
	}

	clearChoice() {
		let forcedSwitches = 0;
		let forcedPasses = 0;
		if (this.battle.requestState === 'switch') {
			const canSwitchOut = this.active.filter(creature => creature?.switchFlag).length;
			const canSwitchIn = this.creature.slice(this.active.length).filter(creature => creature && !creature.fainted).length;
			forcedSwitches = Math.min(canSwitchOut, canSwitchIn);
			forcedPasses = canSwitchOut - forcedSwitches;
		}
		this.choice = {
			cantUndo: false,
			error: ``,
			actions: [],
			forcedSwitchesLeft: forcedSwitches,
			forcedPassesLeft: forcedPasses,
			switchIns: new Set(),
			zMove: false,
			mega: false,
			ultra: false,
			dynamax: false,
			terastallize: false,
		};
	}

	commitChoices() {
		if (this.battle.gen === 1) {
			for (const choice of this.choice.actions) {
				if (choice.choice !== 'move' || !choice.creature) continue;
				const move = choice.moveid;
				if (move === 'fight') {
					const creature = choice.creature;
					if (['frz', 'slp'].includes(creature.status)) {
						// do nothing
					} else if (creature.volatiles['partiallytrapped']) {
						// 'cannotmove' is what is set in the cartridge
						this.lastSelectedMove = 'cannotmove' as ID;
					}
				} else if (move === 'struggle') {
					// saves Struggle
					this.lastSelectedMove = move as ID;
				} else if (typeof choice.moveSlot === 'number') {
					// not locked
					this.lastSelectedMove = move as ID;
					this.lastSelectedMoveSlot = choice.moveSlot;
				}
				/**
				 * choice.moveid should be synced with lastSelectedMove
				 * if a creature is frozen or asleep, this ensures it tries to use the last move used
				 * if a creature is recharging, this ensures it tries to use Hyper Beam again
				 */
				choice.moveid = this.lastSelectedMove;
			}
		}
		this.battle.queue.addChoice(this.choice.actions);
	}

	choose(input: string) {
		if (!this.requestState) {
			return this.emitChoiceError(
				this.battle.ended ? `Can't do anything: The game is over` : `Can't do anything: It's not your turn`
			);
		}

		if (this.choice.cantUndo) {
			return this.emitChoiceError(`Can't undo: A trapping/disabling effect would cause undo to leak information`);
		}

		this.clearChoice();

		const choiceStrings = (input.startsWith('team ') ? [input] : input.split(','));

		if (choiceStrings.length > this.active.length) {
			return this.emitChoiceError(
				`Can't make choices: You sent choices for ${choiceStrings.length} creature, but this is a ${this.battle.gameType} game!`
			);
		}

		for (const choiceString of choiceStrings) {
			let [choiceType, data] = Utils.splitFirst(choiceString.trim(), ' ');
			data = data.trim();
			if (choiceType === 'testfight') {
				choiceType = 'move';
				data = 'testfight';
			}

			switch (choiceType) {
			case 'move':
				const original = data;
				const error = () => this.emitChoiceError(`Conflicting arguments for "move": ${original}`);
				let targetLoc: number | undefined;
				let event: 'mega' | 'megax' | 'megay' | 'zmove' | 'ultra' | 'dynamax' | 'terastallize' | '' = '';
				while (true) {
					// If data ends with a number, treat it as a target location.
					// We need to special case 'Conversion 2' so it doesn't get
					// confused with 'Conversion' erroneously sent with the target
					// '2' (since Conversion targets 'self', targetLoc can't be 2).
					if (/\s(?:-|\+)?[1-3]$/.test(data) ) {
						if (targetLoc !== undefined) return error();
						targetLoc = parseInt(data.slice(-2));
						data = data.slice(0, -2).trim();
					} else if (data.endsWith(' mega')) {
						if (event) return error();
						event = 'mega';
						data = data.slice(0, -5);
					} else if (data.endsWith(' megax')) {
						if (event) return error();
						event = 'megax';
						data = data.slice(0, -6);
					} else if (data.endsWith(' megay')) {
						if (event) return error();
						event = 'megay';
						data = data.slice(0, -6);
					} else if (data.endsWith(' zmove')) {
						if (event) return error();
						event = 'zmove';
						data = data.slice(0, -6);
					} else if (data.endsWith(' ultra')) {
						if (event) return error();
						event = 'ultra';
						data = data.slice(0, -6);
					} else if (data.endsWith(' dynamax')) {
						if (event) return error();
						event = 'dynamax';
						data = data.slice(0, -8);
					} else if (data.endsWith(' gigantamax')) {
						if (event) return error();
						event = 'dynamax';
						data = data.slice(0, -11);
					} else if (data.endsWith(' max')) {
						if (event) return error();
						event = 'dynamax';
						data = data.slice(0, -4);
					} else if (data.endsWith(' terastal')) {
						if (event) return error();
						event = 'terastallize';
						data = data.slice(0, -9);
					} else if (data.endsWith(' terastallize')) {
						if (event) return error();
						event = 'terastallize';
						data = data.slice(0, -13);
					} else {
						break;
					}
				}
				if (!this.chooseMove(data, targetLoc, event)) return false;
				break;
			case 'switch':
				if (!this.chooseSwitch(data)) return false;
				break;
			case 'shift':
				if (data) return this.emitChoiceError(`Unrecognized data after "shift": ${data}`);
				if (!this.chooseShift()) return false;
				break;
			case 'team':
				if (!this.chooseTeam(data)) return false;
				break;
			case 'retreat':
				if (!this.chooseKilumen('kretreat', '', 0)) return false;
				break;
			case 'crystal':
				if (!this.chooseKilumen('kcrystal', toID(data), 0)) return false;
				break;
			case 'item': {
				const [itemid, slot] = data.split(/\s+/);
				if (!this.chooseKilumen('kitem', toID(itemid), slot ? parseInt(slot) - 1 : -1)) return false;
				break;
			}
			case 'pass':
			case 'skip':
				if (data) return this.emitChoiceError(`Unrecognized data after "pass": ${data}`);
				if (!this.choosePass()) return false;
				break;
			case 'auto':
			case 'default':
				if (!this.autoChoose()) return false;
				break;
			default:
				this.emitChoiceError(`Unrecognized choice: ${choiceString}`);
				break;
			}
		}

		return !this.choice.error;
	}

	getChoiceIndex(isPass?: boolean) {
		let index = this.choice.actions.length;

		if (!isPass) {
			switch (this.requestState) {
			case 'move':
				// auto-pass
				while (
					index < this.active.length &&
					(this.active[index].fainted || this.active[index].volatiles['commanding'])
				) {
					this.choosePass();
					index++;
				}
				break;
			case 'switch':
				while (index < this.active.length && !this.active[index].switchFlag) {
					this.choosePass();
					index++;
				}
				break;
			}
		}

		return index;
	}

	choosePass(): boolean | Side {
		const index = this.getChoiceIndex(true);
		if (index >= this.active.length) return false;
		const creature: Creature = this.active[index];

		switch (this.requestState) {
		case 'switch':
			if (creature.switchFlag) { // This condition will always happen if called by Battle#choose()
				if (!this.choice.forcedPassesLeft) {
					return this.emitChoiceError(`Can't pass: You need to switch in a creature to replace ${creature.name}`);
				}
				this.choice.forcedPassesLeft--;
			}
			break;
		case 'move':
			if (!creature.fainted && !creature.volatiles['commanding']) {
				return this.emitChoiceError(`Can't pass: Your ${creature.name} must make a move (or switch)`);
			}
			break;
		default:
			return this.emitChoiceError(`Can't pass: Not a move or switch request`);
		}

		this.choice.actions.push({
			choice: 'pass',
		});
		return true;
	}

	/** Automatically finish a choice if not currently complete. */
	autoChoose() {
		if (this.requestState === 'teampreview') {
			if (!this.isChoiceDone()) this.chooseTeam();
		} else if (this.requestState === 'switch') {
			let i = 0;
			while (!this.isChoiceDone()) {
				if (!this.chooseSwitch()) throw new Error(`autoChoose switch crashed: ${this.choice.error}`);
				i++;
				if (i > 10) throw new Error(`autoChoose failed: infinite looping`);
			}
		} else if (this.requestState === 'move') {
			let i = 0;
			while (!this.isChoiceDone()) {
				if (!this.chooseMove()) throw new Error(`autoChoose crashed: ${this.choice.error}`);
				i++;
				if (i > 10) throw new Error(`autoChoose failed: infinite looping`);
			}
		}
		return true;
	}

	destroy() {
		// deallocate ourself

		// deallocate children and get rid of references to them
		for (const creature of this.creature) {
			if (creature) creature.destroy();
		}

		for (const action of this.choice.actions) {
			delete action.side;
			delete action.creature;
			delete action.target;
		}
		this.choice.actions = [];

		// get rid of some possibly-circular references
		this.creature = [];
		this.active = [];
		this.foe = null!;
		(this as any).battle = null!;
	}
}
