import {
	ActiveMove,
	Battle,
	Effect,
	ModdedDex,
	Move,
	Creature,
	Side,
	SpreadMoveDamage,
	SpreadMoveTargets,
	ZMoveOptions,
} from './exported-global-types';

import { Dex, toID } from './dex';

const CHOOSABLE_TARGETS = new Set(['normal', 'any', 'adjacentAlly', 'adjacentAllyOrSelf', 'adjacentFoe']);

export class BattleActions {
	battle: Battle;
	dex: ModdedDex;

	readonly MAX_MOVES: { readonly [k: string]: string } = {};

	readonly Z_MOVES: { readonly [k: string]: string } = {};

	constructor(battle: Battle) {
		this.battle = battle;
		this.dex = battle.dex;
		if (this.dex.data.Scripts.actions) Object.assign(this, this.dex.data.Scripts.actions);
		if (battle.format.actions) Object.assign(this, battle.format.actions);
	}

	// #region SWITCH
	// ==================================================================

	switchIn(creature: Creature, pos: number, sourceEffect: Effect | null = null, isDrag?: boolean) {
		if (!creature || creature.isActive) {
			this.battle.hint("A switch failed because the creature trying to switch in is already in.");
			return false;
		}

		const side = creature.side;
		if (pos >= side.active.length) {
			throw new Error(`Invalid switch position ${pos} / ${side.active.length}`);
		}
		const oldActive = side.active[pos];
		const unfaintedActive = oldActive?.hp ? oldActive : null;
		if (unfaintedActive) {
			oldActive.beingCalledBack = true;
			let switchCopyFlag: 'copyvolatile' | 'shedtail' | boolean = false;
			if (sourceEffect && typeof (sourceEffect as Move).selfSwitch === 'string') {
				switchCopyFlag = (sourceEffect as Move).selfSwitch!;
			}
			if (!oldActive.skipBeforeSwitchOutEventFlag && !isDrag) {
				this.battle.runEvent('BeforeSwitchOut', oldActive);
				if (this.battle.gen >= 5) {
					this.battle.eachEvent('Update');
				}
			}
			oldActive.skipBeforeSwitchOutEventFlag = false;
			if (!this.battle.runEvent('SwitchOut', oldActive)) {
				// Warning: DO NOT interrupt a switch-out if you just want to trap a creature.
				// To trap a creature and prevent it from switching out, (e.g. Mean Look, Magnet Pull)
				// use the 'trapped' flag instead.

				// Note: Nothing in the real games can interrupt a switch-out (except Pursuit KOing,
				// which is handled elsewhere); this is just for custom formats.
				return false;
			}
			if (!oldActive.hp) {
				// a creature fainted from Pursuit before it could switch
				return 'pursuitfaint';
			}

			// will definitely switch out at this point

			this.battle.singleEvent('End', oldActive.getAbility(), oldActive.abilityState, oldActive);
			this.battle.singleEvent('End', oldActive.getItem(), oldActive.itemState, oldActive);

			// if a creature is forced out by Whirlwind/etc or Eject Button/Pack, it can't use its chosen move
			this.battle.queue.cancelAction(oldActive);

			let newMove = null;
			if (this.battle.gen === 4 && sourceEffect) {
				newMove = oldActive.lastMove;
			}
			if (switchCopyFlag) {
				creature.copyVolatileFrom(oldActive, switchCopyFlag);
			}
			if (newMove) creature.lastMove = newMove;
			oldActive.clearVolatile();
		}
		if (oldActive) {
			oldActive.isActive = false;
			oldActive.isStarted = false;
			oldActive.usedItemThisTurn = false;
			oldActive.statsRaisedThisTurn = false;
			oldActive.statsLoweredThisTurn = false;
			oldActive.position = creature.position;
			if (oldActive.fainted) oldActive.status = '';
			if (this.battle.gen <= 4) {
				creature.lastItem = oldActive.lastItem;
				oldActive.lastItem = '';
			}
			creature.position = pos;
			side.creature[creature.position] = creature;
			side.creature[oldActive.position] = oldActive;
		}
		creature.isActive = true;
		side.active[pos] = creature;
		creature.activeTurns = 0;
		creature.activeMoveActions = 0;
		for (const moveSlot of creature.moveSlots) {
			moveSlot.used = false;
		}
		creature.abilityState = this.battle.initEffectState({ id: creature.ability, target: creature });
		creature.itemState = this.battle.initEffectState({ id: creature.item, target: creature });
		this.battle.runEvent('BeforeSwitchIn', creature);
		if (sourceEffect) {
			this.battle.add(isDrag ? 'drag' : 'switch', creature, creature.getFullDetails, `[from] ${sourceEffect}`);
		} else {
			this.battle.add(isDrag ? 'drag' : 'switch', creature, creature.getFullDetails);
		}
		if (isDrag && this.battle.gen === 2) creature.draggedIn = this.battle.turn;
		creature.previouslySwitchedIn++;

		if (isDrag && this.battle.gen >= 5) {
			// runSwitch happens immediately so that Mold Breaker can make hazards bypass Clear Body and Levitate
			this.runSwitch(creature);
		} else {
			this.battle.queue.insertChoice({ choice: 'runSwitch', creature });
		}

		return true;
	}
	dragIn(side: Side, pos: number) {
		const creature = this.battle.getRandomSwitchable(side);
		if (!creature || creature.isActive) return false;
		const oldActive = side.active[pos];
		if (!oldActive) throw new Error(`nothing to drag out`);
		if (!oldActive.hp) return false;

		if (!this.battle.runEvent('DragOut', oldActive)) {
			return false;
		}
		if (!this.switchIn(creature, pos, null, true)) return false;
		return true;
	}
	runSwitch(creature: Creature) {
		const switchersIn = [creature];
		while (this.battle.queue.peek()?.choice === 'runSwitch') {
			const nextSwitch = this.battle.queue.shift();
			switchersIn.push(nextSwitch!.creature!);
		}
		const allActive = this.battle.getAllActive(true);
		this.battle.speedSort(allActive);
		this.battle.speedOrder = allActive.map(a => a.getFieldPositionValue());
		this.battle.fieldEvent('SwitchIn', switchersIn);

		for (const crea of switchersIn) {
			if (!crea.hp) continue;
			crea.isStarted = true;
			crea.draggedIn = null;
		}
		return true;
	}

	// #endregion

	// #region MOVES
	// ==================================================================

	/**
	 * runMove is the "outside" move caller. It handles deducting PP,
	 * flinching, full paralysis, etc. All the stuff up to and including
	 * the "CREATURE used MOVE" message.
	 *
	 * For details of the difference between runMove and useMove, see
	 * useMove's info.
	 *
	 * externalMove skips LockMove and PP deduction, mostly for use by
	 * Dancer.
	 */
	runMove(
		moveOrMoveName: Move | string, creature: Creature, targetLoc: number,
		options?: {
			sourceEffect?: Effect | null, zMove?: string, externalMove?: boolean,
			maxMove?: string, originalTarget?: Creature,
		}
	) {
		creature.activeMoveActions++;
		const zMove = options?.zMove;
		const maxMove = options?.maxMove;
		const externalMove = options?.externalMove;
		const originalTarget = options?.originalTarget;
		let sourceEffect = options?.sourceEffect;
		let target = this.battle.getTarget(creature, maxMove || zMove || moveOrMoveName, targetLoc, originalTarget);
		let baseMove = this.dex.getActiveMove(moveOrMoveName);
		const priority = baseMove.priority;
		const pranksterBoosted = baseMove.pranksterBoosted;
		if (baseMove.id !== 'struggle' && !zMove && !maxMove && !externalMove) {
			const changedMove = this.battle.runEvent('OverrideAction', creature, target, baseMove);
			if (changedMove && changedMove !== true) {
				baseMove = this.dex.getActiveMove(changedMove);
				baseMove.priority = priority;
				if (pranksterBoosted) baseMove.pranksterBoosted = pranksterBoosted;
				target = this.battle.getRandomTarget(creature, baseMove);
			}
		}
		let move = baseMove;
		if (zMove) {
			move = this.getActiveZMove(baseMove, creature);
		} else if (maxMove) {
			move = this.getActiveMaxMove(baseMove, creature);
		}

		move.isExternal = externalMove;

		this.battle.setActiveMove(move, creature, target);

		/* if (creature.moveThisTurn) {
			// THIS IS PURELY A SANITY CHECK
			// DO NOT TAKE ADVANTAGE OF THIS TO PREVENT A CREATURE FROM MOVING;
			// USE this.queue.cancelMove INSTEAD
			this.battle.debug(`${creature.id} INCONSISTENT STATE, ALREADY MOVED: ${creature.moveThisTurn}`);
			this.battle.clearActiveMove(true);
			return;
		} */
		const willTryMove = this.battle.runEvent('BeforeMove', creature, target, move);
		if (!willTryMove) {
			this.battle.runEvent('MoveAborted', creature, target, move);
			this.battle.clearActiveMove(true);
			// The event 'BeforeMove' could have returned false or null
			// false indicates that this counts as a move failing for the purpose of calculating Stomping Tantrum's base power
			// null indicates the opposite, as the Creature didn't have an option to choose anything
			creature.moveThisTurnResult = willTryMove;
			return;
		}

		// Used exclusively for a hint later
		if (move.flags['cantusetwice'] && creature.lastMove?.id === move.id) {
			creature.addVolatile(move.id);
		}

		if (move.beforeMoveCallback) {
			if (move.beforeMoveCallback.call(this.battle, creature, target, move)) {
				this.battle.clearActiveMove(true);
				creature.moveThisTurnResult = false;
				return;
			}
		}
		creature.lastDamage = 0;
		if (!externalMove) {
			const lockedMove = creature.getLockedMove();
			if (!lockedMove) {
				// Kilumen fork: Energy. A skill with no energy left can still be used
				// ("overuse"): less accurate, weaker, and it hurts the user.
				const moveData = creature.getMoveData(baseMove);
				if (moveData && !moveData.pp && move.id !== 'struggle') {
					creature.kOverusing = true;
					this.battle.add('-overuse', creature, move.name);
				} else {
					creature.deductPP(baseMove, null, target);
				}
			} else {
				sourceEffect = this.dex.conditions.get('lockedmove');
			}
			creature.moveUsed(move, targetLoc);
		}

		// Dancer Petal Dance hack
		// TODO: implement properly
		const noLock = externalMove && !creature.volatiles['lockedmove'];

		const oldActiveMove = move;

		const moveDidSomething = this.useMove(baseMove, creature, { target, sourceEffect, zMove, maxMove });
		this.battle.lastSuccessfulMoveThisTurn = moveDidSomething ? this.battle.activeMove && this.battle.activeMove.id : null;
		if (this.battle.activeMove) move = this.battle.activeMove;
		this.battle.singleEvent('AfterMove', move, null, creature, target, move);
		this.battle.runEvent('AfterMove', creature, target, move);
		if (move.flags['cantusetwice'] && creature.removeVolatile(move.id)) {
			this.battle.add('-hint', `Some effects can force a Creature to use ${move.name} again in a row.`);
		}

		if (creature.kOverusing) {
			creature.kOverusing = false;
			const K = (this.dex.data.Scripts as any).kilumen || {};
			if (creature.hp > 0) {
				const selfDamage = Math.max(1, Math.floor(creature.maxhp * (K.overuseSelfDamage || 0.125)));
				this.battle.directDamage(selfDamage, creature, creature, {id: 'overuse'} as Condition);
			}
		}
		if (noLock && creature.volatiles['lockedmove']) delete creature.volatiles['lockedmove'];
		this.battle.faintMessages();
		this.battle.checkWin();

		if (this.battle.gen <= 4) {
			// In gen 4, the outermost move is considered the last move for Copycat
			this.battle.activeMove = oldActiveMove;
		}
	}
	/**
	 * useMove is the "inside" move caller. It handles effects of the
	 * move itself, but not the idea of using the move.
	 *
	 * Most caller effects, like Sleep Talk, Nature Power, Magic Bounce,
	 * etc use useMove.
	 *
	 * The only ones that use runMove are Instruct, Pursuit, and
	 * Dancer.
	 */
	useMove(
		move: Move | string, creature: Creature, options?: {
			target?: Creature | null, sourceEffect?: Effect | null,
			zMove?: string, maxMove?: string,
		}
	) {
		creature.moveThisTurnResult = undefined;
		const oldMoveResult: boolean | null | undefined = creature.moveThisTurnResult;
		const moveResult = this.useMoveInner(move, creature, options);
		if (oldMoveResult === creature.moveThisTurnResult) creature.moveThisTurnResult = moveResult;
		return moveResult;
	}
	useMoveInner(
		moveOrMoveName: Move | string, creature: Creature, options?: {
			target?: Creature | null, sourceEffect?: Effect | null,
			zMove?: string, maxMove?: string,
		},
	) {
		let target = options?.target;
		let sourceEffect = options?.sourceEffect;
		const zMove = options?.zMove;
		const maxMove = options?.maxMove;
		if (!sourceEffect && this.battle.effect.id) sourceEffect = this.battle.effect;

		let move = this.dex.getActiveMove(moveOrMoveName);
		creature.lastMoveUsed = move;
		if (false as boolean) {
			// Z-Weather Ball only changes types if it's used directly,
			// not if it's called by Z-Sleep Talk or something.
			this.battle.singleEvent('ModifyType', move, null, creature, target, move, move);
			if (move.type !== 'Normal') sourceEffect = move;
		}
		if (zMove || (move.category !== 'Status' && sourceEffect && (sourceEffect as ActiveMove).isZ)) {
			move = this.getActiveZMove(move, creature);
		}
		if (maxMove && move.category !== 'Status') {
			// Max move outcome is dependent on the move type after type modifications from ability and the move itself
			this.battle.singleEvent('ModifyType', move, null, creature, target, move, move);
			this.battle.runEvent('ModifyType', creature, target, move, move);
		}
		if (maxMove || (move.category !== 'Status' && sourceEffect && (sourceEffect as ActiveMove).isMax)) {
			move = this.getActiveMaxMove(move, creature);
		}

		if (this.battle.activeMove) {
			move.priority = this.battle.activeMove.priority;
			if (!move.hasBounced) move.pranksterBoosted = this.battle.activeMove.pranksterBoosted;
		}
		const baseTarget = move.target;
		let targetRelayVar = { target };
		targetRelayVar = this.battle.runEvent('ModifyTarget', creature, target, move, targetRelayVar, true);
		if (targetRelayVar.target !== undefined) target = targetRelayVar.target;
		if (target === undefined) target = this.battle.getRandomTarget(creature, move);
		if (move.target === 'self' || move.target === 'allies') {
			target = creature;
		}
		if (sourceEffect) {
			move.sourceEffect = sourceEffect.id;
			move.ignoreAbility = (sourceEffect as ActiveMove).ignoreAbility;
		}
		let moveResult = false;

		this.battle.setActiveMove(move, creature, target);

		this.battle.singleEvent('ModifyType', move, null, creature, target, move, move);
		this.battle.singleEvent('ModifyMove', move, null, creature, target, move, move);
		if (baseTarget !== move.target) {
			// Target changed in ModifyMove, so we must adjust it here
			// Adjust before the next event so the correct target is passed to the
			// event
			target = this.battle.getRandomTarget(creature, move);
		}
		move = this.battle.runEvent('ModifyType', creature, target, move, move);
		move = this.battle.runEvent('ModifyMove', creature, target, move, move);
		if (baseTarget !== move.target) {
			// Adjust again
			target = this.battle.getRandomTarget(creature, move);
		}
		if (!move || creature.fainted) {
			return false;
		}

		let attrs = '';

		let movename = move.name;
		if (move.id === 'kvariablepower') movename = 'Variable Power';
		if (sourceEffect) attrs += `|[from] ${sourceEffect.fullname}`;
		if (zMove && move.isZ === true) {
			attrs = `|[anim]${movename}${attrs}`;
			movename = `Z-${movename}`;
		}
		this.battle.addMove('move', creature, movename, `${target}${attrs}`);

		if (zMove) this.runZPower(move, creature);

		if (!target) {
			this.battle.attrLastMove('[notarget]');
			this.battle.add(this.battle.gen >= 5 ? '-fail' : '-notarget', creature);
			return false;
		}

		const { targets, pressureTargets } = creature.getMoveTargets(move, target);
		if (targets.length) {
			target = targets[targets.length - 1]; // in case of redirection
		}

		const callerMoveForPressure = sourceEffect && (sourceEffect as ActiveMove).pp ? sourceEffect as ActiveMove : null;
		if (!sourceEffect || callerMoveForPressure || sourceEffect.id === 'pursuit') {
			let extraPP = 0;
			for (const source of pressureTargets) {
				const ppDrop = this.battle.runEvent('DeductPP', source, creature, move);
				if (ppDrop !== true) {
					extraPP += ppDrop || 0;
				}
			}
			if (extraPP > 0) {
				creature.deductPP(callerMoveForPressure || moveOrMoveName, extraPP);
			}
		}

		let tryMoveResult = this.battle.singleEvent('TryMove', move, null, creature, target, move);
		if (tryMoveResult) {
			tryMoveResult = this.battle.runEvent('TryMove', creature, target, move);
		}
		if (!tryMoveResult) {
			move.mindBlownRecoil = false;
			return tryMoveResult;
		}

		this.battle.singleEvent('UseMoveMessage', move, null, creature, target, move);

		if (move.ignoreImmunity === undefined) {
			move.ignoreImmunity = (move.category === 'Status');
		}

		if (this.battle.gen !== 4 && move.selfFaint === 'always') {
			this.battle.faint(creature, creature, move);
		}

		let damage: number | false | undefined | '' = false;
		if (move.target === 'all' || move.target === 'foeSide' || move.target === 'allySide' || move.target === 'allyTeam') {
			damage = this.tryMoveHit(targets, creature, move);
			if (damage === this.battle.NOT_FAIL) creature.moveThisTurnResult = null;
			if (damage || damage === 0 || damage === undefined) moveResult = true;
		} else {
			if (!targets.length) {
				this.battle.attrLastMove('[notarget]');
				this.battle.add(this.battle.gen >= 5 ? '-fail' : '-notarget', creature);
				return false;
			}
			if (this.battle.gen === 4 && move.selfFaint === 'always') {
				this.battle.faint(creature, creature, move);
			}
			moveResult = this.trySpreadMoveHit(targets, creature, move);
		}
		if (move.selfBoost && moveResult) this.moveHit(creature, creature, move, move.selfBoost, false, true);
		if (!creature.hp) {
			this.battle.faint(creature, creature, move);
		}

		if (!moveResult) {
			this.battle.singleEvent('MoveFail', move, null, target, creature, move);
			return false;
		}

		if (!(move.hasSheerForce && creature.hasAbility('ksheer')) && !move.flags['futuremove']) {
			const originalHp = creature.hp;
			this.battle.singleEvent('AfterMoveSecondarySelf', move, null, creature, target, move);
			this.battle.runEvent('AfterMoveSecondarySelf', creature, target, move);
			if (creature && creature !== target && move.category !== 'Status') {
				if (creature.hp <= creature.maxhp / 2 && originalHp > creature.maxhp / 2) {
					this.battle.runEvent('LowHpExit', creature, creature);
				}
			}
		}

		return true;
	}
	/** NOTE: includes single-target moves */
	trySpreadMoveHit(targets: Creature[], creature: Creature, move: ActiveMove, notActive?: boolean) {
		if (targets.length > 1 && !move.smartTarget) move.spreadHit = true;

		const moveSteps: ((targets: Creature[], creature: Creature, move: ActiveMove) =>
		(number | boolean | "" | undefined)[] | undefined)[] = [
			// 0. check for semi invulnerability
			this.hitStepInvulnerabilityEvent,

			// 1. run the 'TryHit' event (Protect, Magic Bounce, Volt Absorb, etc.) (this is step 2 in gens 5 & 6, and step 4 in gen 4)
			this.hitStepTryHitEvent,

			// 2. check for type immunity (this is step 1 in gens 4-6)
			this.hitStepTypeImmunity,

			// 3. check for various move-specific immunities
			this.hitStepTryImmunity,

			// 4. check accuracy
			this.hitStepAccuracy,

			// 5. break protection effects
			this.hitStepBreakProtect,

			// 6. steal positive boosts (Spectral Thief)
			this.hitStepStealBoosts,

			// 7. loop that processes each hit of the move (has its own steps per iteration)
			this.hitStepMoveHitLoop,
		];
		if (this.battle.gen <= 6) {
			// Swap step 1 with step 2
			[moveSteps[1], moveSteps[2]] = [moveSteps[2], moveSteps[1]];
		}
		if (this.battle.gen === 4) {
			// Swap step 4 with new step 2 (old step 1)
			[moveSteps[2], moveSteps[4]] = [moveSteps[4], moveSteps[2]];
		}

		if (notActive) this.battle.setActiveMove(move, creature, targets[0]);

		const hitResult = this.battle.singleEvent('Try', move, null, creature, targets[0], move) &&
			this.battle.singleEvent('PrepareHit', move, {}, targets[0], creature, move) &&
			this.battle.runEvent('PrepareHit', creature, targets[0], move);
		if (!hitResult) {
			if (hitResult === false) {
				this.battle.add('-fail', creature);
				this.battle.attrLastMove('[still]');
			}
			return hitResult === this.battle.NOT_FAIL;
		}

		let atLeastOneFailure = false;
		for (const step of moveSteps) {
			const hitResults: (number | boolean | "" | undefined)[] | undefined = step.call(this, targets, creature, move);
			if (!hitResults) continue;
			targets = targets.filter((val, i) => hitResults[i] || hitResults[i] === 0);
			atLeastOneFailure = atLeastOneFailure || hitResults.some(val => val === false);
			if (move.smartTarget && atLeastOneFailure) move.smartTarget = false;
			if (!targets.length) {
				// console.log(step.name);
				break;
			}
		}

		move.hitTargets = targets;
		const moveResult = !!targets.length;
		if (!moveResult && !atLeastOneFailure) creature.moveThisTurnResult = null;
		const hitSlot = targets.map(p => p.getSlot());
		if (move.spreadHit) this.battle.attrLastMove('[spread] ' + hitSlot.join(','));
		return moveResult;
	}
	hitStepInvulnerabilityEvent(targets: Creature[], creature: Creature, move: ActiveMove) {
		if (move.id === 'khelp') return new Array(targets.length).fill(true);
		const hitResults: boolean[] = [];
		for (const [i, target] of targets.entries()) {
			if (target.volatiles['commanding']) {
				hitResults[i] = false;
			} else if (this.battle.gen >= 8 && move.id === 'toxic' && creature.hasType('Poison')) {
				hitResults[i] = true;
			} else {
				hitResults[i] = this.battle.runEvent('Invulnerability', target, creature, move);
			}
			if (hitResults[i] === false) {
				if (move.smartTarget) {
					move.smartTarget = false;
				} else {
					if (!move.spreadHit) this.battle.attrLastMove('[miss]');
					this.battle.add('-miss', creature, target);
				}
			}
		}
		return hitResults;
	}
	hitStepTryHitEvent(targets: Creature[], creature: Creature, move: ActiveMove) {
		const hitResults = this.battle.runEvent('TryHit', targets, creature, move);
		if (!hitResults.includes(true) && hitResults.includes(false)) {
			this.battle.add('-fail', creature);
			this.battle.attrLastMove('[still]');
		}
		for (const i of targets.keys()) {
			if (hitResults[i] !== this.battle.NOT_FAIL) hitResults[i] = hitResults[i] || false;
		}
		return hitResults;
	}
	hitStepTypeImmunity(targets: Creature[], creature: Creature, move: ActiveMove) {
		if (move.ignoreImmunity === undefined) {
			move.ignoreImmunity = (move.category === 'Status');
		}

		const hitResults = [];
		for (const i of targets.keys()) {
			hitResults[i] = targets[i].runImmunity(move, !move.smartTarget);
		}

		return hitResults;
	}
	hitStepTryImmunity(targets: Creature[], creature: Creature, move: ActiveMove) {
		const hitResults = [];
		for (const [i, target] of targets.entries()) {
			if (this.battle.gen >= 6 && move.flags['powder'] && target !== creature && !this.dex.getImmunity('powder', target)) {
				this.battle.debug('natural powder immunity');
				this.battle.add('-immune', target);
				hitResults[i] = false;
			} else if (!this.battle.singleEvent('TryImmunity', move, {}, target, creature, move)) {
				this.battle.add('-immune', target);
				hitResults[i] = false;
			} else {
				hitResults[i] = true;
			}
		}
		return hitResults;
	}
	hitStepAccuracy(targets: Creature[], creature: Creature, move: ActiveMove) {
		const hitResults = [];
		for (const [i, target] of targets.entries()) {
			this.battle.activeTarget = target;
			// calculate true accuracy
			let accuracy = move.accuracy;
			if (move.ohko) { // bypasses accuracy modifiers
				if (!target.isSemiInvulnerable()) {
					accuracy = 30;
					if (move.ohko === 'Ice' && this.battle.gen >= 7 && !creature.hasType('Ice')) {
						accuracy = 20;
					}
					if (!target.volatiles['dynamax'] && creature.level >= target.level &&
						(move.ohko === true || !target.hasType(move.ohko))) {
						accuracy += (creature.level - target.level);
					} else {
						this.battle.add('-immune', target, '[ohko]');
						hitResults[i] = false;
						continue;
					}
				}
			} else {
				accuracy = this.battle.runEvent('ModifyAccuracy', target, creature, move, accuracy);
				if (accuracy !== true) {
					let boost = 0;
					if (!move.ignoreAccuracy) {
						const boosts = this.battle.runEvent('ModifyBoost', creature, null, null, { ...creature.boosts });
						boost = this.battle.clampIntRange(boosts['accuracy'], -6, 6);
					}
					if (!move.ignoreEvasion) {
						const boosts = this.battle.runEvent('ModifyBoost', target, null, null, { ...target.boosts });
						boost = this.battle.clampIntRange(boost - boosts['evasion'], -6, 6);
					}
					if (boost > 0) {
						accuracy = this.battle.trunc(accuracy * (3 + boost) / 3);
					} else if (boost < 0) {
						accuracy = this.battle.trunc(accuracy * 3 / (3 - boost));
					}
				}
			}
			if (
				move.alwaysHit || (move.id === 'toxic' && this.battle.gen >= 8 && creature.hasType('Poison')) ||
				(move.target === 'self' && move.category === 'Status' && !target.isSemiInvulnerable())
			) {
				accuracy = true; // bypasses ohko accuracy modifiers
			} else {
				accuracy = this.battle.runEvent('Accuracy', target, creature, move, accuracy);
			}
			if (accuracy !== true && creature.kOverusing) {
				const K = (this.dex.data.Scripts as any).kilumen || {};
				accuracy = this.battle.trunc(accuracy * (K.overuseAccuracy || 0.7));
			}
			if (accuracy !== true && !this.battle.randomChance(accuracy, 100)) {
				if (move.smartTarget) {
					move.smartTarget = false;
				} else {
					if (!move.spreadHit) this.battle.attrLastMove('[miss]');
					this.battle.add('-miss', creature, target);
				}
				if (false as boolean) {
					this.battle.boost({ spe: 2 }, creature);
				}
				hitResults[i] = false;
				continue;
			}
			hitResults[i] = true;
		}
		return hitResults;
	}
	hitStepBreakProtect(targets: Creature[], creature: Creature, move: ActiveMove) {
		if (move.breaksProtect) {
			for (const target of targets) {
				let broke = false;
				for (const effectid of ['protect']) {
					if (target.removeVolatile(effectid)) broke = true;
				}
				if (this.battle.gen >= 6 || !target.isAlly(creature)) {
					for (const effectid of ['kpriorityguard', 'kspreadguard']) {
						if (target.side.removeSideCondition(effectid)) broke = true;
					}
				}
				if (broke) {
					if (move.id === 'feint') {
						this.battle.add('-activate', target, 'move: Feint');
					} else {
						this.battle.add('-activate', target, `move: ${move.name}`, '[broken]');
					}
					if (this.battle.gen >= 6) delete target.volatiles['stall'];
				}
			}
		}
		return undefined;
	}
	hitStepStealBoosts(targets: Creature[], creature: Creature, move: ActiveMove) {
		const target = targets[0]; // hardcoded
		if (move.stealsBoosts) {
			const boosts: SparseBoostsTable = {};
			let stolen = false;
			let statName: BoostID;
			for (statName in target.boosts) {
				const stage = target.boosts[statName];
				if (stage > 0) {
					boosts[statName] = stage;
					stolen = true;
				}
			}
			if (stolen) {
				this.battle.attrLastMove('[still]');
				this.battle.add('-clearpositiveboost', target, creature, 'move: ' + move.name);
				this.battle.boost(boosts, creature, creature);

				let statName2: BoostID;
				for (statName2 in boosts) {
					boosts[statName2] = 0;
				}
				target.setBoost(boosts);
			}
		}
		return undefined;
	}
	afterMoveSecondaryEvent(targets: Creature[], creature: Creature, move: ActiveMove) {
		// console.log(`${targets}, ${creature}, ${move}`)
		if (!(move.hasSheerForce && creature.hasAbility('ksheer'))) {
			this.battle.singleEvent('AfterMoveSecondary', move, null, targets[0], creature, move);
			this.battle.runEvent('AfterMoveSecondary', targets, creature, move);
		}
		return undefined;
	}
	/** NOTE: used only for moves that target sides/fields rather than creature */
	tryMoveHit(targetOrTargets: Creature | Creature[], creature: Creature, move: ActiveMove): number | undefined | false | '' {
		const target = Array.isArray(targetOrTargets) ? targetOrTargets[0] : targetOrTargets;
		const targets = Array.isArray(targetOrTargets) ? targetOrTargets : [target];

		this.battle.setActiveMove(move, creature, targets[0]);

		let hitResult = this.battle.singleEvent('Try', move, null, creature, target, move) &&
			this.battle.singleEvent('PrepareHit', move, {}, target, creature, move) &&
			this.battle.runEvent('PrepareHit', creature, target, move);
		if (!hitResult) {
			if (hitResult === false) {
				this.battle.add('-fail', creature);
				this.battle.attrLastMove('[still]');
			}
			return false;
		}

		const isFFAHazard = move.target === 'foeSide' && this.battle.gameType === 'freeforall';
		if (move.target === 'all') {
			hitResult = this.battle.runEvent('TryHitField', target, creature, move);
		} else if (isFFAHazard) {
			const hitResults: any[] = this.battle.runEvent('TryHitSide', targets, creature, move);
			// if some side blocked the move, prevent the move from executing against any other sides
			if (hitResults.some(result => !result)) return false;
			hitResult = true;
		} else {
			hitResult = this.battle.runEvent('TryHitSide', target, creature, move);
		}
		if (!hitResult) {
			if (hitResult === false) {
				this.battle.add('-fail', creature);
				this.battle.attrLastMove('[still]');
			}
			return false;
		}
		return this.moveHit(isFFAHazard ? targets : target, creature, move);
	}
	hitStepMoveHitLoop(targets: Creature[], creature: Creature, move: ActiveMove) { // Temporary name
		let damage: (number | boolean | undefined)[] = [];
		for (const i of targets.keys()) {
			damage[i] = 0;
		}
		move.totalDamage = 0;
		creature.lastDamage = 0;
		let targetHits = move.multihit || 1;
		if (Array.isArray(targetHits)) {
			// yes, it's hardcoded... meh
			if (targetHits[0] === 2 && targetHits[1] === 5) {
				if (this.battle.gen >= 5) {
					// 35-35-15-15 out of 100 for 2-3-4-5 hits
					targetHits = this.battle.sample([2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5]);
				} else {
					targetHits = this.battle.sample([2, 2, 2, 3, 3, 3, 4, 5]);
				}
			} else {
				targetHits = this.battle.random(targetHits[0], targetHits[1] + 1);
			}
		}
		targetHits = Math.floor(targetHits);
		let nullDamage = true;
		let moveDamage: (number | boolean | undefined)[] = [];
		// There is no need to recursively check the ´sleepUsable´ flag as Sleep Talk can only be used while asleep.
		const isSleepUsable = move.sleepUsable || this.dex.moves.get(move.sourceEffect).sleepUsable;

		let targetsCopy: (Creature | false | null)[] = targets.slice(0);
		let hit: number;
		for (hit = 1; hit <= targetHits; hit++) {
			if (damage.includes(false)) break;
			if (hit > 1 && creature.status === 'slp' && (!isSleepUsable || this.battle.gen === 4)) break;
			if (targets.every(target => !target?.hp)) break;
			move.hit = hit;
			move.lastHit = move.hit === targetHits;
			if (move.smartTarget && targets.length > 1) {
				targetsCopy = [targets[hit - 1]];
				damage = [damage[hit - 1]];
			} else {
				targetsCopy = targets.slice(0);
			}
			const target = targetsCopy[0]; // some relevant-to-single-target-moves-only things are hardcoded
			if (target && typeof move.smartTarget === 'boolean') {
				if (hit > 1) {
					this.battle.addMove('-anim', creature, move.name, target);
				} else {
					this.battle.retargetLastMove(target);
				}
			}

			// like this (Triple Kick)
			if (target && move.multiaccuracy && hit > 1) {
				let accuracy = move.accuracy;
				const boostTable = [1, 4 / 3, 5 / 3, 2, 7 / 3, 8 / 3, 3];
				if (accuracy !== true) {
					if (!move.ignoreAccuracy) {
						const boosts = this.battle.runEvent('ModifyBoost', creature, null, null, { ...creature.boosts });
						const boost = this.battle.clampIntRange(boosts['accuracy'], -6, 6);
						if (boost > 0) {
							accuracy *= boostTable[boost];
						} else {
							accuracy /= boostTable[-boost];
						}
					}
					if (!move.ignoreEvasion) {
						const boosts = this.battle.runEvent('ModifyBoost', target, null, null, { ...target.boosts });
						const boost = this.battle.clampIntRange(boosts['evasion'], -6, 6);
						if (boost > 0) {
							accuracy /= boostTable[boost];
						} else if (boost < 0) {
							accuracy *= boostTable[-boost];
						}
					}
				}
				accuracy = this.battle.runEvent('ModifyAccuracy', target, creature, move, accuracy);
				if (!move.alwaysHit) {
					accuracy = this.battle.runEvent('Accuracy', target, creature, move, accuracy);
					if (accuracy !== true && !this.battle.randomChance(accuracy, 100)) break;
				}
			}

			const moveData = move;
			if (!moveData.flags) moveData.flags = {};

			let moveDamageThisHit;
			// Modifies targetsCopy (which is why it's a copy)
			[moveDamageThisHit, targetsCopy] = this.spreadMoveHit(targetsCopy, creature, move, moveData);
			// When Dragon Darts targets two different creature, targetsCopy is a length 1 array each hit
			// so spreadMoveHit returns a length 1 damage array
			if (move.smartTarget) {
				moveDamage.push(...moveDamageThisHit);
			} else {
				moveDamage = moveDamageThisHit;
			}

			if (!moveDamage.some(val => val !== false)) break;
			nullDamage = false;

			for (const [i, md] of moveDamage.entries()) {
				if (move.smartTarget && i !== hit - 1) continue;
				// Damage from each hit is individually counted for the
				// purposes of Counter, Metal Burst, and Mirror Coat.
				damage[i] = md === true || !md ? 0 : md;
				// Total damage dealt is accumulated for the purposes of recoil (Parental Bond).
				move.totalDamage += damage[i];
			}
			if (move.mindBlownRecoil) {
				const hpBeforeRecoil = creature.hp;
				this.battle.damage(Math.round(creature.maxhp / 2), creature, creature, this.dex.conditions.get(move.id), true);
				move.mindBlownRecoil = false;
				if (creature.hp <= creature.maxhp / 2 && hpBeforeRecoil > creature.maxhp / 2) {
					this.battle.runEvent('LowHpExit', creature, creature);
				}
			}
			this.battle.eachEvent('Update');
			if (!creature.hp && targets.length === 1) {
				hit++; // report the correct number of hits for multihit moves
				break;
			}
		}
		// hit is 1 higher than the actual hit count
		if (hit === 1) return damage.fill(false);
		if (nullDamage) damage.fill(false);
		this.battle.faintMessages(false, false, !creature.hp);
		if (move.multihit && typeof move.smartTarget !== 'boolean') {
			this.battle.add('-hitcount', targets[0], hit - 1);
		}

		if (move.recoil && move.totalDamage) {
			const hpBeforeRecoil = creature.hp;
			this.battle.damage(this.calcRecoilDamage(move.totalDamage, move, creature), creature, creature, 'recoil');
			if (creature.hp <= creature.maxhp / 2 && hpBeforeRecoil > creature.maxhp / 2) {
				this.battle.runEvent('LowHpExit', creature, creature);
			}
		}

		if (move.struggleRecoil) {
			const hpBeforeRecoil = creature.hp;
			let recoilDamage;
			if (this.dex.gen >= 5) {
				recoilDamage = this.battle.clampIntRange(Math.round(creature.baseMaxhp / 4), 1);
			} else {
				recoilDamage = this.battle.clampIntRange(this.battle.trunc(creature.maxhp / 4), 1);
			}
			this.battle.directDamage(recoilDamage, creature, creature, { id: 'strugglerecoil' } as Condition);
			if (creature.hp <= creature.maxhp / 2 && hpBeforeRecoil > creature.maxhp / 2) {
				this.battle.runEvent('LowHpExit', creature, creature);
			}
		}

		// smartTarget messes up targetsCopy, but smartTarget should in theory ensure that targets will never fail, anyway
		if (move.smartTarget) {
			targetsCopy = targets.slice(0);
		}

		for (const [i, target] of targetsCopy.entries()) {
			if (target && creature !== target) {
				target.gotAttacked(move, moveDamage[i] as number | false | undefined, creature);
				if (typeof moveDamage[i] === 'number') {
					target.timesAttacked += move.smartTarget ? 1 : hit - 1;
				}
			}
		}

		if (move.ohko && !targets[0].hp) this.battle.add('-ohko');

		if (!damage.some(val => !!val || val === 0)) return damage;

		this.battle.eachEvent('Update');

		this.afterMoveSecondaryEvent(targetsCopy.filter(val => !!val), creature, move);

		if (!(move.hasSheerForce && creature.hasAbility('ksheer'))) {
			for (const [i, d] of damage.entries()) {
				// There are no multihit spread moves, so it's safe to use move.totalDamage for multihit moves
				// The previous check was for `move.multihit`, but that fails for Dragon Darts
				const curDamage = targets.length === 1 ? move.totalDamage : d;
				if (typeof curDamage === 'number' && targets[i].hp) {
					const targetHPBeforeDamage = (targets[i].hurtThisTurn || 0) + curDamage;
					if (targets[i].hp <= targets[i].maxhp / 2 && targetHPBeforeDamage > targets[i].maxhp / 2) {
						this.battle.runEvent('LowHpExit', targets[i], creature);
					}
				}
			}
		}

		return damage;
	}
	spreadMoveHit(
		targets: SpreadMoveTargets, creature: Creature, moveOrMoveName: ActiveMove,
		hitEffect?: Dex.HitEffect, isSecondary?: boolean, isSelf?: boolean
	): [SpreadMoveDamage, SpreadMoveTargets] {
		// Hardcoded for single-target purposes
		// (no spread moves have any kind of onTryHit handler)
		const target = targets[0];
		let damage: (number | boolean | undefined)[] = [];
		for (const i of targets.keys()) {
			damage[i] = true;
		}
		const move = this.dex.getActiveMove(moveOrMoveName);
		let hitResult: boolean | number | null = true;
		let moveData = hitEffect as ActiveMove;
		if (!moveData) moveData = move;
		if (!moveData.flags) moveData.flags = {};
		if (move.target === 'all' && !isSelf) {
			hitResult = this.battle.singleEvent('TryHitField', moveData, {}, target || null, creature, move);
		} else if ((move.target === 'foeSide' || move.target === 'allySide' || move.target === 'allyTeam') && !isSelf) {
			hitResult = this.battle.singleEvent('TryHitSide', moveData, {}, target || null, creature, move);
		} else if (target) {
			hitResult = this.battle.singleEvent('TryHit', moveData, {}, target, creature, move);
		}
		if (!hitResult) {
			if (hitResult === false) {
				this.battle.add('-fail', creature);
				this.battle.attrLastMove('[still]');
			}
			return [[false], targets]; // single-target only
		}

		// 0. check for substitute
		if (!isSecondary && !isSelf) {
			if (move.target !== 'all' && move.target !== 'allyTeam' && move.target !== 'allySide' && move.target !== 'foeSide') {
				damage = this.tryPrimaryHitEvent(damage, targets, creature, move, moveData, isSecondary);
			}
		}

		for (const i of targets.keys()) {
			if (damage[i] === this.battle.HIT_SUBSTITUTE) {
				damage[i] = true;
				targets[i] = null;
			}
			if (targets[i] && isSecondary && !moveData.self) {
				damage[i] = true;
			}
			if (!damage[i]) targets[i] = false;
		}
		// 1. call to this.battle.getDamage
		damage = this.getSpreadDamage(damage, targets, creature, move, moveData, isSecondary, isSelf);

		for (const i of targets.keys()) {
			if (damage[i] === false) targets[i] = false;
		}

		// 2. call to this.battle.spreadDamage
		damage = this.battle.spreadDamage(damage, targets, creature, move);

		for (const i of targets.keys()) {
			if (damage[i] === false) targets[i] = false;
		}

		// 3. onHit event happens here
		damage = this.runMoveEffects(damage, targets, creature, move, moveData, isSecondary, isSelf);

		for (const i of targets.keys()) {
			if (!damage[i] && damage[i] !== 0) targets[i] = false;
		}

		// steps 4 and 5 can mess with this.battle.activeTarget, which needs to be preserved for Dancer
		const activeTarget = this.battle.activeTarget;

		// 4. self drops (start checking for targets[i] === false here)
		if (moveData.self && !move.selfDropped) this.selfDrops(targets, creature, move, moveData, isSecondary);

		// 5. secondary effects
		if (moveData.secondaries) this.secondaries(targets, creature, move, moveData, isSelf);

		this.battle.activeTarget = activeTarget;

		// 6. force switch
		if (moveData.forceSwitch) damage = this.forceSwitch(damage, targets, creature, move);

		for (const i of targets.keys()) {
			if (!damage[i] && damage[i] !== 0) targets[i] = false;
		}

		const damagedTargets: Creature[] = [];
		const damagedDamage = [];
		for (const [i, t] of targets.entries()) {
			if (typeof damage[i] === 'number' && t) {
				damagedTargets.push(t);
				damagedDamage.push(damage[i]);
			}
		}
		const creatureOriginalHP = creature.hp;
		if (damagedDamage.length && !isSecondary && !isSelf) {
			if (this.battle.gen >= 5) {
				this.battle.runEvent('DamagingHit', damagedTargets, creature, move, damagedDamage);
			}
			if (moveData.onAfterHit && creature.hp) {
				for (const t of damagedTargets) {
					this.battle.singleEvent('AfterHit', moveData, {}, t, creature, move);
				}
			}
			if (this.battle.gen < 5) {
				this.battle.runEvent('DamagingHit', damagedTargets, creature, move, damagedDamage);
			}
			if (creature.hp && creature.hp <= creature.maxhp / 2 && creatureOriginalHP > creature.maxhp / 2) {
				this.battle.runEvent('LowHpExit', creature);
			}
		}

		return [damage, targets];
	}
	tryPrimaryHitEvent(
		damage: SpreadMoveDamage, targets: SpreadMoveTargets, creature: Creature,
		move: ActiveMove, moveData: ActiveMove, isSecondary?: boolean
	): SpreadMoveDamage {
		for (const [i, target] of targets.entries()) {
			if (!target) continue;
			damage[i] = this.battle.runEvent('TryPrimaryHit', target, creature, moveData);
		}
		return damage;
	}
	getSpreadDamage(
		damage: SpreadMoveDamage, targets: SpreadMoveTargets, source: Creature,
		move: ActiveMove, moveData: ActiveMove, isSecondary?: boolean, isSelf?: boolean
	): SpreadMoveDamage {
		for (const [i, target] of targets.entries()) {
			if (!target) continue;
			this.battle.activeTarget = target;
			damage[i] = undefined;
			const curDamage = this.getDamage(source, target, moveData);
			// getDamage has several possible return values:
			//
			//   a number:
			//     means that much damage is dealt (0 damage still counts as dealing
			//     damage for the purposes of things like Static)
			//   false:
			//     gives error message: "But it failed!" and move ends
			//   null:
			//     the move ends, with no message (usually, a custom fail message
			//     was already output by an event handler)
			//   undefined:
			//     means no damage is dealt and the move continues
			//
			// basically, these values have the same meanings as they do for event
			// handlers.

			if (curDamage === false || curDamage === null) {
				if (damage[i] === false && !isSecondary && !isSelf) {
					this.battle.add('-fail', source);
					this.battle.attrLastMove('[still]');
				}
				this.battle.debug('damage calculation interrupted');
				damage[i] = false;
				continue;
			}
			damage[i] = curDamage;
		}
		return damage;
	}
	runMoveEffects(
		damage: SpreadMoveDamage, targets: SpreadMoveTargets, source: Creature,
		move: ActiveMove, moveData: ActiveMove, isSecondary?: boolean, isSelf?: boolean
	) {
		let didAnything: number | boolean | null | undefined = damage.reduce(this.combineResults);
		for (const [i, target] of targets.entries()) {
			if (target === false) continue;
			let hitResult;
			let didSomething: number | boolean | null | undefined = undefined;

			if (target) {
				if (moveData.boosts && !target.fainted) {
					hitResult = this.battle.boost(moveData.boosts, target, source, move, isSecondary, isSelf);
					didSomething = this.combineResults(didSomething, hitResult);
				}
				if (moveData.heal && !target.fainted) {
					if (target.hp >= target.maxhp) {
						this.battle.add('-fail', target, 'heal');
						this.battle.attrLastMove('[still]');
						damage[i] = this.combineResults(damage[i], false);
						didAnything = this.combineResults(didAnything, null);
						continue;
					}
					const amount = target.baseMaxhp * moveData.heal[0] / moveData.heal[1];
					const d = this.battle.heal((this.battle.gen < 5 ? Math.floor : Math.round)(amount), target, source, move);
					if (!d && d !== 0) {
						if (d !== null) {
							this.battle.add('-fail', source);
							this.battle.attrLastMove('[still]');
						}
						this.battle.debug('heal interrupted');
						damage[i] = this.combineResults(damage[i], false);
						didAnything = this.combineResults(didAnything, null);
						continue;
					}
					didSomething = true;
				}
				if (moveData.status) {
					hitResult = target.trySetStatus(moveData.status, source, moveData.ability ? moveData.ability : move);
					if (!hitResult && move.status) {
						damage[i] = this.combineResults(damage[i], false);
						didAnything = this.combineResults(didAnything, null);
						continue;
					}
					didSomething = this.combineResults(didSomething, hitResult);
				}
				if (moveData.forceStatus) {
					hitResult = target.setStatus(moveData.forceStatus, source, move);
					didSomething = this.combineResults(didSomething, hitResult);
				}
				if (moveData.volatileStatus) {
					hitResult = target.addVolatile(moveData.volatileStatus, source, move);
					didSomething = this.combineResults(didSomething, hitResult);
				}
				if (moveData.sideCondition) {
					hitResult = target.side.addSideCondition(moveData.sideCondition, source, move);
					didSomething = this.combineResults(didSomething, hitResult);
				}
				if (moveData.slotCondition) {
					hitResult = target.side.addSlotCondition(target, moveData.slotCondition, source, move);
					didSomething = this.combineResults(didSomething, hitResult);
				}
				if (moveData.weather) {
					hitResult = this.battle.field.setWeather(moveData.weather, source, move);
					didSomething = this.combineResults(didSomething, hitResult);
				}
				if (moveData.terrain) {
					hitResult = this.battle.field.setTerrain(moveData.terrain, source, move);
					didSomething = this.combineResults(didSomething, hitResult);
				}
				if (moveData.pseudoWeather) {
					hitResult = this.battle.field.addPseudoWeather(moveData.pseudoWeather, source, move);
					didSomething = this.combineResults(didSomething, hitResult);
				}
				if (moveData.forceSwitch) {
					hitResult = !!this.battle.canSwitch(target.side);
					didSomething = this.combineResults(didSomething, hitResult);
				}
				// Hit events
				//   These are like the TryHit events, except we don't need a FieldHit event.
				//   Scroll up for the TryHit event documentation, and just ignore the "Try" part. ;)
				if (move.target === 'all' && !isSelf) {
					if (moveData.onHitField) {
						hitResult = this.battle.singleEvent('HitField', moveData, {}, target, source, move);
						didSomething = this.combineResults(didSomething, hitResult);
					}
				} else if ((move.target === 'foeSide' || move.target === 'allySide') && !isSelf) {
					if (moveData.onHitSide) {
						hitResult = this.battle.singleEvent('HitSide', moveData, {}, target.side, source, move);
						didSomething = this.combineResults(didSomething, hitResult);
					}
				} else {
					if (moveData.onHit) {
						hitResult = this.battle.singleEvent('Hit', moveData, {}, target, source, move);
						didSomething = this.combineResults(didSomething, hitResult);
					}
					if (!isSelf && !isSecondary) {
						this.battle.runEvent('Hit', target, source, move);
					}
				}
			}
			if (moveData.selfFaint === 'ifHit' && damage[i] !== false) {
				this.battle.faint(source, source, move);
			}
			if (moveData.selfSwitch) {
				if (this.battle.canSwitch(source.side) && !source.volatiles['commanded']) {
					didSomething = true;
				} else {
					didSomething = this.combineResults(didSomething, false);
				}
			}
			// Move didn't fail because it didn't try to do anything
			if (didSomething === undefined) didSomething = true;
			damage[i] = this.combineResults(damage[i], didSomething === null ? false : didSomething);
			didAnything = this.combineResults(didAnything, didSomething);
		}

		if (!didAnything && didAnything !== 0 && !moveData.self && !moveData.selfFaint) {
			if (!isSelf && !isSecondary) {
				if (didAnything === false) {
					this.battle.add('-fail', source);
					this.battle.attrLastMove('[still]');
				}
			}
			this.battle.debug('move failed because it did nothing');
		} else if (move.selfSwitch && source.hp && !source.volatiles['commanded']) {
			source.switchFlag = move.id;
		}

		return damage;
	}
	selfDrops(
		targets: SpreadMoveTargets, source: Creature,
		move: ActiveMove, moveData: ActiveMove, isSecondary?: boolean
	) {
		for (const target of targets) {
			if (target === false) continue;
			if (moveData.self && !move.selfDropped) {
				if (!isSecondary && moveData.self.boosts) {
					const secondaryRoll = this.battle.random(100);
					if (typeof moveData.self.chance === 'undefined' || secondaryRoll < moveData.self.chance) {
						this.moveHit(source, source, move, moveData.self, isSecondary, true);
					}
					if (!move.multihit) move.selfDropped = true;
				} else {
					this.moveHit(source, source, move, moveData.self, isSecondary, true);
				}
			}
		}
	}
	secondaries(targets: SpreadMoveTargets, source: Creature, move: ActiveMove, moveData: ActiveMove, isSelf?: boolean) {
		if (!moveData.secondaries) return;
		for (const target of targets) {
			if (target === false) continue;
			const secondaries: Dex.SecondaryEffect[] =
				this.battle.runEvent('ModifySecondaries', target, source, moveData, moveData.secondaries.slice());
			for (const secondary of secondaries) {
				const secondaryRoll = this.battle.random(100);
				// User stat boosts or target stat drops can possibly overflow if it goes beyond 256 in Gen 8 or prior
				const secondaryOverflow = (secondary.boosts || secondary.self) && this.battle.gen <= 8;
				if (typeof secondary.chance === 'undefined' ||
					secondaryRoll < (secondaryOverflow ? secondary.chance % 256 : secondary.chance)) {
					this.moveHit(target, source, move, secondary, true, isSelf);
				}
			}
		}
	}
	forceSwitch(
		damage: SpreadMoveDamage, targets: SpreadMoveTargets, source: Creature, move: ActiveMove
	) {
		for (const [i, target] of targets.entries()) {
			if (target && target.hp > 0 && source.hp > 0 && this.battle.canSwitch(target.side)) {
				const hitResult = this.battle.runEvent('DragOut', target, source, move);
				if (hitResult) {
					target.forceSwitchFlag = true;
				} else if (hitResult === false && move.category === 'Status') {
					this.battle.add('-fail', source);
					this.battle.attrLastMove('[still]');
					damage[i] = false;
				}
			}
		}
		return damage;
	}
	moveHit(
		targets: Creature | null | (Creature | null)[], creature: Creature, moveOrMoveName: ActiveMove,
		moveData?: Dex.HitEffect, isSecondary?: boolean, isSelf?: boolean
	): number | undefined | false {
		if (!Array.isArray(targets)) targets = [targets];
		const retVal = this.spreadMoveHit(targets, creature, moveOrMoveName, moveData, isSecondary, isSelf)[0][0];
		return retVal === true ? undefined : retVal;
	}

	calcRecoilDamage(damageDealt: number, move: Move, creature: Creature): number {
		return this.battle.clampIntRange(Math.round(damageDealt * move.recoil![0] / move.recoil![1]), 1);
	}

	getZMove(move: Move, creature: Creature, skipChecks?: boolean): string | undefined {
		// Kilumen fork: upstream gimmick mechanic removed.
		return undefined;
	}

	getActiveZMove(move: Move, creature: Creature): ActiveMove {
		// Kilumen fork: upstream gimmick mechanic removed.
		throw new Error("removed");
	}

	canZMove(creature: Creature): ZMoveOptions | undefined {
		// Kilumen fork: upstream gimmick mechanic removed.
		return undefined;
	}

	getMaxMove(move: Move, creature: Creature): Move | undefined {
		// Kilumen fork: upstream gimmick mechanic removed.
		return undefined;
	}

	getActiveMaxMove(move: Move, creature: Creature): ActiveMove {
		// Kilumen fork: upstream gimmick mechanic removed.
		throw new Error("removed");
	}

	runZPower(move: ActiveMove, creature: Creature) {
		// Kilumen fork: upstream gimmick mechanic removed.
		return;
	}

	targetTypeChoices(targetType: string) {
		return CHOOSABLE_TARGETS.has(targetType);
	}

	combineResults<T extends number | boolean | null | '' | undefined,
		U extends number | boolean | null | '' | undefined>(
		left: T, right: U
	): T | U {
		const NOT_FAILURE = 'string';
		const NULL = 'object';
		const resultsPriorities = ['undefined', NOT_FAILURE, NULL, 'boolean', 'number'];
		if (resultsPriorities.indexOf(typeof left) > resultsPriorities.indexOf(typeof right)) {
			return left;
		} else if (left && !right && right !== 0) {
			return left;
		} else if (typeof left === 'number' && typeof right === 'number') {
			return (left + right) as T;
		} else {
			return right;
		}
	}

	/**
	 * 0 is a success dealing 0 damage, such as from False Swipe at 1 HP.
	 *
	 * Normal PS return value rules apply:
	 * undefined = success, null = silent failure, false = loud failure
	 */
	getDamage(
		source: Creature, target: Creature, move: string | number | ActiveMove,
		suppressMessages = false
	): number | undefined | null | false {
		if (typeof move === 'string') move = this.dex.getActiveMove(move);

		if (typeof move === 'number') {
			const basePower = move;
			move = new Dex.Move({
				basePower,
				type: '???',
				category: 'Physical',
				willCrit: false,
			}) as ActiveMove;
			move.hit = 0;
		}

		if (!target.runImmunity(move, !suppressMessages)) {
			return false;
		}

		if (move.ohko) return this.battle.gen === 3 ? target.hp : target.maxhp;
		if (move.damageCallback) return move.damageCallback.call(this.battle, source, target);
		if (move.damage === 'level') {
			return source.level;
		} else if (move.damage) {
			return move.damage;
		}

		const category = this.battle.getCategory(move);

		let basePower: number | false | null = move.basePower;
		if (move.basePowerCallback) {
			basePower = move.basePowerCallback.call(this.battle, source, target, move);
		}
		if (!basePower) return basePower === 0 ? undefined : basePower;
		basePower = this.battle.clampIntRange(basePower, 1);

		// Kilumen fork: "Clean Strike" odds. Stage 1 = 1 in K.critChance (PLACEHOLDER 20).
		const K = (this.dex.data.Scripts as any).kilumen || {};
		let critRatio = this.battle.runEvent('ModifyCritRatio', source, target, move, move.critRatio || 0);
		critRatio = this.battle.clampIntRange(critRatio, 0, 4);
		const critMult = K.critStages || [0, 20, 8, 2, 1];

		const moveHit = target.getMoveHitData(move);
		moveHit.crit = move.willCrit || false;
		if (move.willCrit === undefined) {
			if (critRatio) {
				moveHit.crit = this.battle.randomChance(1, critMult[critRatio]);
			}
		}

		if (moveHit.crit) {
			moveHit.crit = this.battle.runEvent('CriticalHit', target, null, move);
		}

		// happens after crit calculation
		basePower = this.battle.runEvent('BasePower', source, target, move, basePower, true);

		if (!basePower) return 0;
		basePower = this.battle.clampIntRange(basePower, 1);

		const level = source.level;

		const attacker = move.overrideOffensiveCreature === 'target' ? target : source;
		const defender = move.overrideDefensiveCreature === 'source' ? source : target;

		const isPhysical = move.category === 'Physical';
		let attackStat: StatIDExceptHP = move.overrideOffensiveStat || (isPhysical ? 'atk' : 'spa');
		const defenseStat: StatIDExceptHP = move.overrideDefensiveStat || (isPhysical ? 'def' : 'spd');

		const statTable = { atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

		let atkBoosts = attacker.boosts[attackStat];
		let defBoosts = defender.boosts[defenseStat];

		let ignoreNegativeOffensive = !!move.ignoreNegativeOffensive;
		let ignorePositiveDefensive = !!move.ignorePositiveDefensive;

		if (moveHit.crit) {
			ignoreNegativeOffensive = true;
			ignorePositiveDefensive = true;
		}
		const ignoreOffensive = !!(move.ignoreOffensive || (ignoreNegativeOffensive && atkBoosts < 0));
		const ignoreDefensive = !!(move.ignoreDefensive || (ignorePositiveDefensive && defBoosts > 0));

		if (ignoreOffensive) {
			this.battle.debug('Negating (sp)atk boost/penalty.');
			atkBoosts = 0;
		}
		if (ignoreDefensive) {
			this.battle.debug('Negating (sp)def boost/penalty.');
			defBoosts = 0;
		}

		let attack = attacker.calculateStat(attackStat, atkBoosts, 1, source);
		let defense = defender.calculateStat(defenseStat, defBoosts, 1, target);

		attackStat = (category === 'Physical' ? 'atk' : 'spa');

		// Apply Stat Modifiers
		attack = this.battle.runEvent('Modify' + statTable[attackStat], source, target, move, attack);
		defense = this.battle.runEvent('Modify' + statTable[defenseStat], target, source, move, defense);


		const tr = this.battle.trunc;

		// int(int(int(2 * L / 5 + 2) * A * P / D) / 50);
		const baseDamage = tr(tr(tr(tr(2 * level / 5 + 2) * basePower * attack) / defense) / 50);

		// Calculate damage modifiers separately (order differs between generations)
		return this.modifyDamage(baseDamage, source, target, move, suppressMessages);
	}

	modifyDamage(
		baseDamage: number, creature: Creature, target: Creature, move: ActiveMove, suppressMessages = false
	) {
		// Kilumen fork: Kilumen damage modifiers. All constants come from
		// data Scripts.kilumen and are PLACEHOLDERS until Gary signs off.
		const K = (this.dex.data.Scripts as any).kilumen || {};
		const tr = this.battle.trunc;
		if (!move.type) move.type = '???';
		const type = move.type;

		baseDamage += 2;

		if (move.spreadHit) {
			// multi-target modifier (2v2 only)
			baseDamage = this.battle.modify(baseDamage, 0.75);
		}

		// field condition modifier (event hook kept for future Rain/Ashfall/Fog/Snow)
		baseDamage = this.battle.priorityEvent('WeatherModifyDamage', creature, target, move, baseDamage);

		// Clean Strike
		const isCrit = target.getMoveHitData(move).crit;
		if (isCrit) baseDamage = tr(baseDamage * (move.critModifier || K.critMult || 1.4));

		// random roll 85%-100%
		baseDamage = this.battle.randomizer(baseDamage);

		// Affinity (same-element bonus)
		if (type !== '???') {
			let affinity: number | [number, number] = 1;
			const types = creature.getTypes();
			if (move.forceSTAB || types[0] === type) {
				affinity = K.affinity || 1.3;
			} else if (types.includes(type)) {
				affinity = K.affinitySub || K.affinity || 1.3;
			}
			affinity = this.battle.runEvent('ModifySTAB', creature, target, move, affinity);
			baseDamage = this.battle.modify(baseDamage, affinity);
		}

		// element matchup
		let typeMod = target.runEffectiveness(move);
		typeMod = this.battle.clampIntRange(typeMod, -6, 6);
		target.getMoveHitData(move).typeMod = typeMod;
		if (typeMod > 0) {
			if (!suppressMessages) this.battle.add('-supereffective', target);
			baseDamage = tr(baseDamage * Math.pow(K.strongMult || 1.5, typeMod));
		}
		if (typeMod < 0) {
			if (!suppressMessages) this.battle.add('-resisted', target);
			baseDamage = tr(baseDamage * Math.pow(K.weakMult || 0.6, -typeMod));
		}

		if (isCrit && !suppressMessages) this.battle.add('-crit', target);

		// Energy overuse: the skill was used with no energy left
		if (creature.kOverusing) baseDamage = this.battle.modify(baseDamage, K.overuseDamage || 0.6);

		baseDamage = this.battle.runEvent('ModifyDamage', creature, target, move, baseDamage);

		if (!baseDamage) return 1;
		return tr(baseDamage, 16);
	}

	/**
	 * Confusion damage is unique - most typical modifiers that get run when calculating
	 * damage (e.g. Huge Power, Life Orb, critical hits) don't apply. It also uses a 16-bit
	 * context for its damage, unlike the regular damage formula (though this only comes up
	 * for base damage).
	 */
	getConfusionDamage(creature: Creature, basePower: number) {
		const tr = this.battle.trunc;

		const attack = creature.calculateStat('atk', creature.boosts['atk']);
		const defense = creature.calculateStat('def', creature.boosts['def']);
		const level = creature.level;
		const baseDamage = tr(tr(tr(tr(2 * level / 5 + 2) * basePower * attack) / defense) / 50) + 2;

		// Damage is 16-bit context in self-hit confusion damage
		let damage = tr(baseDamage, 16);
		damage = this.battle.randomizer(damage);
		return Math.max(1, damage);
	}

	// #endregion

	// #region MEGA EVOLUTION
	// ==================================================================

	canMegaEvo(creature: Creature): string | null | undefined {
		// Kilumen fork: upstream gimmick mechanic removed.
		return null;
	}

	canUltraBurst(creature: Creature): string | null {
		// Kilumen fork: upstream gimmick mechanic removed.
		return null;
	}

	runMegaEvo(creature: Creature) {
		// Kilumen fork: upstream gimmick mechanic removed.
		return false;
	}

	// Let's Go
	canMegaEvoX?: (this: BattleActions, creature: Creature) => string | null;
	canMegaEvoY?: (this: BattleActions, creature: Creature) => string | null;
	runMegaEvoX?: (this: BattleActions, creature: Creature) => boolean;
	runMegaEvoY?: (this: BattleActions, creature: Creature) => boolean;

	canTerastallize(creature: Creature): string | null {
		// Kilumen fork: upstream gimmick mechanic removed.
		return null;
	}

	terastallize(creature: Creature) {
		// Kilumen fork: upstream gimmick mechanic removed.
		return;
	}

	// #endregion
}
