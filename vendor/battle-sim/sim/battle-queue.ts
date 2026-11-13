import {Effect, ID, Move, Creature} from './exported-global-types';

/**
 * Simulator Battle Action Queue
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * The action queue is the core of the battle simulation. A rough overview of
 * the core battle loop:
 *
 * - chosen moves/switches are added to the action queue
 * - the action queue is sorted in speed/priority order
 * - we go through the action queue
 * - repeat
 *
 * @license MIT
 */

import type { Battle } from './battle';

/** Actions are sorted based on order (lower first)
 * followed by priority (higher first)
 * followed by speed (higher first)
 * Ties are broken with Fischer-Yates.
 */

/** A move action */
export interface MoveAction {
	/** action type */
	choice: 'move' | 'beforeTurnMove' | 'priorityChargeMove';
	order: 3 | 5 | 200 | 201 | 199 | 106;
	/** priority of the action (higher first) */
	priority: number;
	/** fractional priority of the action (higher first) */
	fractionalPriority: number;
	/** speed of creature using move (higher first if priority tie) */
	speed: number;
	/** the creature doing the move */
	creature: Creature;
	/** location of the target, relative to creature's side */
	targetLoc: number;
	/** original target creature, for target-tracking moves */
	originalTarget: Creature;
	/** a move to use (move action only) */
	moveid: ID;
	/** a move to use (move action only) */
	move: Move;
	/** true if megaing or ultra bursting */
	mega: boolean | 'done';
	/** if zmoving, the name of the zmove */
	zmove?: string;
	/** if dynamaxed, the name of the max move */
	maxMove?: string;
	/** effect that called the move (eg Instruct) if any */
	sourceEffect?: Effect | null;
}

/** A switch action */
export interface SwitchAction {
	/** action type */
	choice: 'switch' | 'instaswitch' | 'krevive';
	order: 3 | 6 | 103;
	/** priority of the action (higher first) */
	priority: number;
	/** speed of creature switching (higher first if priority tie) */
	speed: number;
	/** the creature doing the switch */
	creature: Creature;
	/** creature to switch to */
	target: Creature;
	/** effect that called the switch (eg U */
	sourceEffect: Effect | null;
}

/** A Team Preview choice action */
export interface TeamAction {
	/** action type */
	choice: 'team';
	/** priority of the action (higher first) */
	priority: number;
	/** unused for this action type */
	speed: 1;
	/** the creature switching */
	creature: Creature;
	/** new index */
	index: number;
}

/** A generic action not done by a creature */
export interface FieldAction {
	/** action type */
	choice: 'start' | 'residual' | 'pass' | 'beforeTurn';
	/** priority of the action (higher first) */
	priority: number;
	/** unused for this action type */
	speed: 1;
	/** unused for this action type */
	creature: null;
}

/** A generic action done by a single creature */
export interface CreatureAction {
	/** action type */
	choice: 'megaEvo' | 'megaEvoX' | 'megaEvoY' | 'shift' | 'runSwitch' | 'event' | 'runDynamax' | 'terastallize' |
		'kretreat' | 'kcrystal' | 'kitem';
	/** priority of the action (higher first) */
	priority: number;
	/** speed of creature doing action (higher first if priority tie) */
	speed: number;
	/** the creature doing action */
	creature: Creature;
	/** `runSwitch` only: the creature forcing this creature to switch in */
	dragger?: Creature;
	/** `event` only: the event to run; Kilumen bag choices: the item id */
	event?: string;
	/** Kilumen `kitem`: party slot the item is used on */
	index?: number;
}

export type Action = MoveAction | SwitchAction | TeamAction | FieldAction | CreatureAction;

/**
 * An ActionChoice is like an Action and has the same structure, but it doesn't need to be fully filled out.
 *
 * Any Action or ChosenAction qualifies as an ActionChoice.
 *
 * The `[k: string]: any` part is required so TypeScript won't warn about unnecessary properties.
 */
export interface ActionChoice {
	choice: string;
	[k: string]: any;
}

/**
 * Kind of like a priority queue, although not sorted mid-turn in Gen 1-7.
 *
 * Sort order is documented in `BattleQueue.comparePriority`.
 */
export class BattleQueue {
	battle: Battle;
	list: Action[];
	constructor(battle: Battle) {
		this.battle = battle;
		this.list = [];
		const queueScripts = battle.format.queue || battle.dex.data.Scripts.queue;
		if (queueScripts) Object.assign(this, queueScripts);
	}

	shift() {
		return this.list.shift();
	}
	peek(end?: boolean): Action | undefined {
		return this.list[end ? this.list.length - 1 : 0];
	}
	push(action: Action) {
		return this.list.push(action);
	}
	unshift(action: Action) {
		return this.list.unshift(action);
	}
	[Symbol.iterator]() { return this.list[Symbol.iterator](); }
	entries() {
		return this.list.entries();
	}

	/**
	 * Takes an ActionChoice, and fills it out into a full Action object.
	 *
	 * Returns an array of Actions because some ActionChoices (like mega moves)
	 * resolve to two Actions (mega evolution + use move)
	 */
	resolveAction(action: ActionChoice, midTurn = false): Action[] {
		if (!action) throw new Error(`Action not passed to resolveAction`);
		if (action.choice === 'pass') return [];
		const actions = [action];

		if (!action.side && action.creature) action.side = action.creature.side;
		if (!action.move && action.moveid) action.move = this.battle.dex.getActiveMove(action.moveid);
		if (!action.order) {
			const orders: { [choice: string]: number } = {
				team: 1,
				start: 2,
				instaswitch: 3,
				beforeTurn: 4,
				beforeTurnMove: 5,
				krevive: 6,

				// Kilumen: retreat first, then bag actions, then switches, then skills
				kretreat: 100,
				kitem: 102,
				kcrystal: 102,
				runSwitch: 101,
				switch: 103,
				megaEvo: 104,
				megaEvoX: 104,
				megaEvoY: 104,
				runDynamax: 105,
				terastallize: 106,
				priorityChargeMove: 107,

				shift: 200,
				// default is 200 (for moves)

				residual: 300,
			};
			if (action.choice in orders) {
				action.order = orders[action.choice];
			} else {
				action.order = 200;
				if (!['move', 'event'].includes(action.choice)) {
					throw new Error(`Unexpected orderless action ${action.choice}`);
				}
			}
		}
		if (!midTurn) {
			if (action.choice === 'move') {
				if (!action.maxMove && !action.zmove && action.move.beforeTurnCallback) {
					actions.unshift(...this.resolveAction({
						choice: 'beforeTurnMove', creature: action.creature, move: action.move, targetLoc: action.targetLoc,
					}));
				}
				if (action.mega && !action.creature.isSkyDropped()) {
					actions.unshift(...this.resolveAction({
						choice: 'megaEvo',
						creature: action.creature,
					}));
				}
				if (action.megax && !action.creature.isSkyDropped()) {
					actions.unshift(...this.resolveAction({
						choice: 'megaEvoX',
						creature: action.creature,
					}));
				}
				if (action.megay && !action.creature.isSkyDropped()) {
					actions.unshift(...this.resolveAction({
						choice: 'megaEvoY',
						creature: action.creature,
					}));
				}
				if (action.terastallize && !action.creature.terastallized) {
					actions.unshift(...this.resolveAction({
						choice: 'terastallize',
						creature: action.creature,
					}));
				}
				if (action.maxMove && !action.creature.volatiles['dynamax']) {
					actions.unshift(...this.resolveAction({
						choice: 'runDynamax',
						creature: action.creature,
					}));
				}
				if (!action.maxMove && !action.zmove && action.move.priorityChargeCallback) {
					actions.unshift(...this.resolveAction({
						choice: 'priorityChargeMove',
						creature: action.creature,
						move: action.move,
					}));
				}
				action.fractionalPriority = this.battle.runEvent('FractionalPriority', action.creature, null, action.move, 0);
			} else if (['switch', 'instaswitch'].includes(action.choice)) {
				if (typeof action.creature.switchFlag === 'string') {
					action.sourceEffect = this.battle.dex.moves.get(action.creature.switchFlag as ID) as any;
				}
				action.creature.switchFlag = false;
			}
		}

		const deferPriority = this.battle.gen === 7 && action.mega && action.mega !== 'done';
		if (action.move) {
			let target = null;
			action.move = this.battle.dex.getActiveMove(action.move);

			if (!action.targetLoc) {
				target = this.battle.getRandomTarget(action.creature, action.move);
				// TODO: what actually happens here?
				if (target) action.targetLoc = action.creature.getLocOf(target);
			}
			action.originalTarget = action.creature.getAtLoc(action.targetLoc);
		}
		if (!deferPriority) this.battle.getActionSpeed(action);
		return actions as any;
	}

	/**
	 * Makes the passed action happen next (skipping speed order).
	 */
	prioritizeAction(action: MoveAction | SwitchAction, sourceEffect?: Effect) {
		for (const [i, curAction] of this.list.entries()) {
			if (curAction === action) {
				this.list.splice(i, 1);
				break;
			}
		}
		action.sourceEffect = sourceEffect;
		action.order = 3;
		this.list.unshift(action);
	}

	/**
	 * Changes a creature's action, and inserts its new action
	 * in priority order.
	 *
	 * You'd normally want the OverrideAction event (which doesn't
	 * change priority order).
	 */
	changeAction(creature: Creature, action: ActionChoice) {
		this.cancelAction(creature);
		if (!action.creature) action.creature = creature;
		this.insertChoice(action);
	}

	addChoice(choices: ActionChoice | ActionChoice[]) {
		if (!Array.isArray(choices)) choices = [choices];
		for (const choice of choices) {
			const resolvedChoices = this.resolveAction(choice);
			this.list.push(...resolvedChoices);
		}
	}

	willAct() {
		for (const action of this.list) {
			if (['move', 'switch', 'instaswitch', 'shift'].includes(action.choice)) {
				return action;
			}
		}
		return null;
	}

	willMove(creature: Creature) {
		if (creature.fainted) return null;
		for (const action of this.list) {
			if (action.choice === 'move' && action.creature === creature) {
				return action;
			}
		}
		return null;
	}

	cancelAction(creature: Creature) {
		const oldLength = this.list.length;
		for (let i = 0; i < this.list.length; i++) {
			if (this.list[i].creature === creature) {
				this.list.splice(i, 1);
				i--;
			}
		}
		return this.list.length !== oldLength;
	}

	cancelMove(creature: Creature) {
		for (const [i, action] of this.list.entries()) {
			if (action.choice === 'move' && action.creature === creature) {
				this.list.splice(i, 1);
				return true;
			}
		}
		return false;
	}

	willSwitch(creature: Creature) {
		for (const action of this.list) {
			if (['switch', 'instaswitch'].includes(action.choice) && action.creature === creature) {
				return action;
			}
		}
		return null;
	}

	/**
	 * Inserts the passed action into the action queue when it normally
	 * would have happened (sorting by priority/speed), without
	 * re-sorting the existing actions.
	 */
	insertChoice(choices: ActionChoice | ActionChoice[], midTurn = false) {
		if (Array.isArray(choices)) {
			for (const choice of choices) {
				this.insertChoice(choice);
			}
			return;
		}
		const choice = choices;

		if (choice.creature) {
			choice.creature.updateSpeed();
		}
		const actions = this.resolveAction(choice, midTurn);

		let firstIndex = null;
		let lastIndex = null;
		for (const [i, curAction] of this.list.entries()) {
			const compared = this.battle.comparePriority(actions[0], curAction);
			if (compared <= 0 && firstIndex === null) {
				firstIndex = i;
			}
			if (compared < 0) {
				lastIndex = i;
				break;
			}
		}

		if (firstIndex === null) {
			this.list.push(...actions);
		} else {
			if (lastIndex === null) lastIndex = this.list.length;
			const index = firstIndex === lastIndex ? firstIndex : this.battle.random(firstIndex, lastIndex + 1);
			this.list.splice(index, 0, ...actions);
		}
	}

	clear() {
		this.list = [];
	}

	debug(action?: any): string {
		if (action) {
			return `${action.order || ''}:${action.priority || ''}:${action.speed || ''}:${action.subOrder || ''} - ${action.choice}${action.creature ? ' ' + action.creature : ''}${action.move ? ' ' + action.move : ''}`;
		}
		return this.list.map(
			queueAction => this.debug(queueAction)
		).join('\n') + '\n';
	}

	sort() {
		// this.log.push('SORT ' + this.debugQueue());
		this.battle.speedSort(this.list);
		return this;
	}
}

export default BattleQueue;
