import {
	ActiveMove,
	AnyObject,
	Battle,
	CommonHandlers,
	Effect,
	Field,
	ID,
	IDEntry,
	Item,
	ModdedDex,
	Creature,
	Side,
	SparseBoostsTable,
} from './exported-global-types';

import { Utils } from '../lib/utils';
import { assignMissingFields, BasicEffect, toID } from './dex-data';
import type { SecondaryEffect, MoveEventMethods } from './dex-moves';

/**
 * Event method prefixes:
 * Ally: triggers for each ally (including the effect holder itself) that is a target of the event, i.e. Pastel Veil
 * Foe: triggers for each foe that is a target of the event, i.e. Unnerve
 * Source: triggers for the source of the event; events must have a source parameter to trigger these handlers
 * Any: triggers for each target of the event regardless of the holder's relation to it
 */

export interface EventMethods {
	onDamagingHit?: (this: Battle, damage: number, target: Creature, source: Creature, move: ActiveMove) => void;
	onLowHpExit?: (this: Battle, creature: Creature) => void;
	onAfterEachBoost?: (this: Battle, boost: SparseBoostsTable, target: Creature, source: Creature, effect: Effect) => void;
	onAfterHit?: MoveEventMethods['onAfterHit'];
	onAfterMega?: (this: Battle, creature: Creature) => void;
	onAfterSetStatus?: (this: Battle, status: Condition, target: Creature, source: Creature, effect: Effect) => void;
	onAfterSubDamage?: MoveEventMethods['onAfterSubDamage'];
	onAfterSwitchInSelf?: (this: Battle, creature: Creature) => void;
	onAfterTerastallization?: (this: Battle, creature: Creature) => void;
	onAfterUseItem?: (this: Battle, item: Item, creature: Creature) => void;
	onAfterTakeItem?: (this: Battle, item: Item, creature: Creature) => void;
	onAfterBoost?: (this: Battle, boost: SparseBoostsTable, target: Creature, source: Creature, effect: Effect) => void;
	onAfterFaint?: (this: Battle, length: number, target: Creature, source: Creature, effect: Effect) => void;
	onAfterMoveSecondarySelf?: MoveEventMethods['onAfterMoveSecondarySelf'];
	onAfterMoveSecondary?: MoveEventMethods['onAfterMoveSecondary'];
	onAfterMove?: MoveEventMethods['onAfterMove'];
	onAfterMoveSelf?: CommonHandlers['VoidSourceMove'];
	onAttract?: (this: Battle, target: Creature, source: Creature) => void;
	onAccuracy?: (
		this: Battle, accuracy: number, target: Creature, source: Creature, move: ActiveMove
	) => number | boolean | null | void;
	onBasePower?: CommonHandlers['ModifierSourceMove'];
	onBeforeFaint?: (this: Battle, creature: Creature, effect: Effect) => void;
	onBeforeMove?: CommonHandlers['VoidSourceMove'];
	onBeforeSwitchIn?: (this: Battle, creature: Creature) => void;
	onBeforeSwitchOut?: (this: Battle, creature: Creature) => void;
	onBeforeTurn?: (this: Battle, creature: Creature) => void;
	onChangeBoost?: (this: Battle, boost: SparseBoostsTable, target: Creature, source: Creature, effect: Effect) => void;
	onTryBoost?: (this: Battle, boost: SparseBoostsTable, target: Creature, source: Creature, effect: Effect) => void;
	onChargeMove?: CommonHandlers['VoidSourceMove'];
	onCriticalHit?: ((this: Battle, creature: Creature, source: null, move: ActiveMove) => boolean | void) | boolean;
	onDamage?: (
		this: Battle, damage: number, target: Creature, source: Creature, effect: Effect
	) => number | boolean | null | void;
	onDeductPP?: (this: Battle, target: Creature, source: Creature) => number | void;
	onDisableMove?: (this: Battle, creature: Creature) => void;
	onDragOut?: (this: Battle, creature: Creature, source?: Creature, move?: ActiveMove) => void;
	onEatItem?: (this: Battle, item: Item, creature: Creature, source?: Creature, effect?: Effect) => void;
	onEffectiveness?: MoveEventMethods['onEffectiveness'];
	onEntryHazard?: (this: Battle, creature: Creature) => void;
	onFaint?: CommonHandlers['VoidEffect'];
	onFlinch?: ((this: Battle, creature: Creature) => boolean | void) | boolean;
	onFractionalPriority?: CommonHandlers['ModifierSourceMove'] | -0.1 | -0.2;
	onHit?: MoveEventMethods['onHit'];
	onImmunity?: (this: Battle, type: string, creature: Creature) => void;
	onLockMove?: string | ((this: Battle, creature: Creature) => void | string);
	onSemiLockMove?: string | ((this: Battle, creature: Creature) => void | string);
	onMaybeTrapCreature?: (this: Battle, creature: Creature) => void;
	onModifyAccuracy?: CommonHandlers['ModifierMove'];
	onModifyAtk?: CommonHandlers['ModifierSourceMove'];
	onModifyBoost?: (this: Battle, boosts: SparseBoostsTable, creature: Creature) => SparseBoostsTable | void;
	onModifyCritRatio?: CommonHandlers['ModifierSourceMove'];
	onModifyDamage?: CommonHandlers['ModifierSourceMove'];
	onModifyDef?: CommonHandlers['ModifierMove'];
	onModifyMove?: MoveEventMethods['onModifyMove'];
	onModifyPriority?: CommonHandlers['ModifierSourceMove'];
	onModifySecondaries?: (
		this: Battle, secondaries: SecondaryEffect[], target: Creature, source: Creature, move: ActiveMove
	) => void;
	onModifyType?: MoveEventMethods['onModifyType'];
	onModifyTarget?: MoveEventMethods['onModifyTarget'];
	onModifySpA?: CommonHandlers['ModifierSourceMove'];
	onModifySpD?: CommonHandlers['ModifierMove'];
	onModifySpe?: (this: Battle, spe: number, creature: Creature) => number | void;
	onModifySTAB?: CommonHandlers['ModifierSourceMove'];
	onModifyWeight?: (this: Battle, weighthg: number, creature: Creature) => number | void;
	onMoveAborted?: CommonHandlers['VoidMove'];
	onNegateImmunity?: ((this: Battle, creature: Creature, type: string) => boolean | void) | boolean;
	onOverrideAction?: (this: Battle, creature: Creature, target: Creature, move: ActiveMove) => string | void;
	onPrepareHit?: CommonHandlers['ResultSourceMove'];
	onPseudoWeatherChange?: (this: Battle, target: Creature, source: Creature, pseudoWeather: Condition) => void;
	onRedirectTarget?: (
		this: Battle, target: Creature, source: Creature, source2: Effect, move: ActiveMove
	) => Creature | void;
	onResidual?: (this: Battle, target: Creature, source: Creature, effect: Effect) => void;
	onSetAbility?: (
		(this: Battle, ability: string, target: Creature, source: Creature, effect: Effect) => null | void
	) | boolean;
	onSetStatus?: (
		this: Battle, status: Condition, target: Creature, source: Creature, effect: Effect
	) => boolean | null | void;
	onSetWeather?: (this: Battle, target: Creature, source: Creature, weather: Condition) => boolean | void;
	onSideConditionStart?: (this: Battle, target: Side, source: Creature, sideCondition: Condition) => void;
	onStallMove?: (this: Battle, creature: Creature) => boolean | void;
	onSwitchIn?: (this: Battle, creature: Creature) => void;
	onSwitchOut?: (this: Battle, creature: Creature) => void;
	onSwap?: (this: Battle, target: Creature, source: Creature) => void;
	onTakeItem?: (
		(this: Battle, item: Item, creature: Creature, source: Creature, move?: ActiveMove) => boolean | void
	) | boolean;
	onWeatherChange?: (this: Battle, target: Creature, source: Creature, sourceEffect: Effect) => void;
	onTerrainChange?: (this: Battle, target: Creature, source: Creature, sourceEffect: Effect) => void;
	onTrapCreature?: (this: Battle, creature: Creature) => void;
	onTryAddVolatile?: (
		this: Battle, status: Condition, target: Creature, source: Creature, sourceEffect: Effect
	) => boolean | null | void;
	onHitProtect?: MoveEventMethods['onTryHit'];
	onTryEatItem?: boolean | ((this: Battle, item: Item, creature: Creature) => boolean | void);
	onTryHeal?: (
		((this: Battle, relayVar: number, target: Creature, source: Creature, effect: Effect) => number | boolean | null | void)
	);
	onTryHit?: MoveEventMethods['onTryHit'];
	onTryHitField?: MoveEventMethods['onTryHitField'];
	onTryHitSide?: CommonHandlers['ResultMove'];
	onInvulnerability?: CommonHandlers['ExtResultMove'];
	onTryMove?: MoveEventMethods['onTryMove'];
	onTryPrimaryHit?: (this: Battle, target: Creature, source: Creature, move: ActiveMove) => boolean | null | number | void;
	onType?: (this: Battle, types: string[], creature: Creature) => string[] | void;
	onUseItem?: (this: Battle, item: Item, creature: Creature) => void;
	onUpdate?: (this: Battle, creature: Creature) => void;
	onWeather?: (this: Battle, target: Creature, source: null, effect: Condition) => void;
	onWeatherModifyDamage?: CommonHandlers['ModifierSourceMove'];
	onModifyDamagePhase1?: CommonHandlers['ModifierSourceMove'];
	onModifyDamagePhase2?: CommonHandlers['ModifierSourceMove'];
	onFoeDamagingHit?: (this: Battle, damage: number, target: Creature, source: Creature, move: ActiveMove) => void;
	onFoeAfterEachBoost?: (this: Battle, boost: SparseBoostsTable, target: Creature, source: Creature) => void;
	onFoeAfterHit?: MoveEventMethods['onAfterHit'];
	onFoeAfterSetStatus?: (this: Battle, status: Condition, target: Creature, source: Creature, effect: Effect) => void;
	onFoeAfterSubDamage?: MoveEventMethods['onAfterSubDamage'];
	onFoeAfterSwitchInSelf?: (this: Battle, creature: Creature) => void;
	onFoeAfterUseItem?: (this: Battle, item: Item, creature: Creature) => void;
	onFoeAfterBoost?: (this: Battle, boost: SparseBoostsTable, target: Creature, source: Creature, effect: Effect) => void;
	onFoeAfterFaint?: (this: Battle, length: number, target: Creature, source: Creature, effect: Effect) => void;
	onFoeAfterMoveSecondarySelf?: MoveEventMethods['onAfterMoveSecondarySelf'];
	onFoeAfterMoveSecondary?: MoveEventMethods['onAfterMoveSecondary'];
	onFoeAfterMove?: MoveEventMethods['onAfterMove'];
	onFoeAfterMoveSelf?: CommonHandlers['VoidSourceMove'];
	onFoeAttract?: (this: Battle, target: Creature, source: Creature) => void;
	onFoeAccuracy?: (
		this: Battle, accuracy: number, target: Creature, source: Creature, move: ActiveMove
	) => number | boolean | null | void;
	onFoeBasePower?: CommonHandlers['ModifierSourceMove'];
	onFoeBeforeFaint?: (this: Battle, creature: Creature, effect: Effect) => void;
	onFoeBeforeMove?: CommonHandlers['VoidSourceMove'];
	onFoeBeforeSwitchIn?: (this: Battle, creature: Creature) => void;
	onFoeBeforeSwitchOut?: (this: Battle, creature: Creature) => void;
	onFoeTryBoost?: (this: Battle, boost: SparseBoostsTable, target: Creature, source: Creature, effect: Effect) => void;
	onFoeChargeMove?: CommonHandlers['VoidSourceMove'];
	onFoeCriticalHit?: ((this: Battle, creature: Creature, source: null, move: ActiveMove) => boolean | void) | boolean;
	onFoeDamage?: (
		this: Battle, damage: number, target: Creature, source: Creature, effect: Effect
	) => number | boolean | null | void;
	onFoeDeductPP?: (this: Battle, target: Creature, source: Creature) => number | void;
	onFoeDisableMove?: (this: Battle, creature: Creature) => void;
	onFoeDragOut?: (this: Battle, creature: Creature, source?: Creature, move?: ActiveMove) => void;
	onFoeEatItem?: (this: Battle, item: Item, creature: Creature) => void;
	onFoeEffectiveness?: MoveEventMethods['onEffectiveness'];
	onFoeFaint?: CommonHandlers['VoidEffect'];
	onFoeFlinch?: ((this: Battle, creature: Creature) => boolean | void) | boolean;
	onFoeHit?: MoveEventMethods['onHit'];
	onFoeImmunity?: (this: Battle, type: string, creature: Creature) => void;
	onFoeLockMove?: string | ((this: Battle, creature: Creature) => void | string);
	onFoeMaybeTrapCreature?: (this: Battle, creature: Creature, source?: Creature) => void;
	onFoeModifyAccuracy?: CommonHandlers['ModifierMove'];
	onFoeModifyAtk?: CommonHandlers['ModifierSourceMove'];
	onFoeModifyBoost?: (this: Battle, boosts: SparseBoostsTable, creature: Creature) => SparseBoostsTable | void;
	onFoeModifyCritRatio?: CommonHandlers['ModifierSourceMove'];
	onFoeModifyDamage?: CommonHandlers['ModifierSourceMove'];
	onFoeModifyDef?: CommonHandlers['ModifierMove'];
	onFoeModifyMove?: MoveEventMethods['onModifyMove'];
	onFoeModifyPriority?: CommonHandlers['ModifierSourceMove'];
	onFoeModifySecondaries?: (
		this: Battle, secondaries: SecondaryEffect[], target: Creature, source: Creature, move: ActiveMove
	) => void;
	onFoeModifySpA?: CommonHandlers['ModifierSourceMove'];
	onFoeModifySpD?: CommonHandlers['ModifierMove'];
	onFoeModifySpe?: (this: Battle, spe: number, creature: Creature) => number | void;
	onFoeModifySTAB?: CommonHandlers['ModifierSourceMove'];
	onFoeModifyType?: MoveEventMethods['onModifyType'];
	onFoeModifyTarget?: MoveEventMethods['onModifyTarget'];
	onFoeModifyWeight?: (this: Battle, weighthg: number, creature: Creature) => number | void;
	onFoeMoveAborted?: CommonHandlers['VoidMove'];
	onFoeNegateImmunity?: ((this: Battle, creature: Creature, type: string) => boolean | void) | boolean;
	onFoeOverrideAction?: (this: Battle, creature: Creature, target: Creature, move: ActiveMove) => string | void;
	onFoePrepareHit?: CommonHandlers['ResultSourceMove'];
	onFoeRedirectTarget?: (
		this: Battle, target: Creature, source: Creature, source2: Effect, move: ActiveMove
	) => Creature | void;
	onFoeResidual?: (this: Battle, target: Creature & Side, source: Creature, effect: Effect) => void;
	onFoeSetAbility?: (this: Battle, ability: string, target: Creature, source: Creature, effect: Effect) => boolean | void;
	onFoeSetStatus?: (
		this: Battle, status: Condition, target: Creature, source: Creature, effect: Effect
	) => boolean | null | void;
	onFoeSetWeather?: (this: Battle, target: Creature, source: Creature, weather: Condition) => boolean | void;
	onFoeStallMove?: (this: Battle, creature: Creature) => boolean | void;
	onFoeSwitchOut?: (this: Battle, creature: Creature) => void;
	onFoeTakeItem?: (
		(this: Battle, item: Item, creature: Creature, source: Creature, move?: ActiveMove) => boolean | void
	) | boolean;
	onFoeTerrain?: (this: Battle, creature: Creature) => void;
	onFoeTrapCreature?: (this: Battle, creature: Creature) => void;
	onFoeTryAddVolatile?: (
		this: Battle, status: Condition, target: Creature, source: Creature, sourceEffect: Effect
	) => boolean | null | void;
	onFoeTryEatItem?: boolean | ((this: Battle, item: Item, creature: Creature) => boolean | void);
	/* FIXME: onFoeTryHeal() is run with two different sets of arguments */
	onFoeTryHeal?: (
		((this: Battle, relayVar: number, target: Creature, source: Creature, effect: Effect) => number | boolean | void) |
		((this: Battle, creature: Creature) => boolean | void) | boolean
	);
	onFoeTryHit?: MoveEventMethods['onTryHit'];
	onFoeTryHitField?: MoveEventMethods['onTryHitField'];
	onFoeTryHitSide?: CommonHandlers['ResultMove'];
	onFoeInvulnerability?: CommonHandlers['ExtResultMove'];
	onFoeTryMove?: MoveEventMethods['onTryMove'];
	onFoeTryPrimaryHit?: (
		this: Battle, target: Creature, source: Creature, move: ActiveMove
	) => boolean | null | number | void;
	onFoeType?: (this: Battle, types: string[], creature: Creature) => string[] | void;
	onFoeWeatherModifyDamage?: CommonHandlers['ModifierSourceMove'];
	onFoeModifyDamagePhase1?: CommonHandlers['ModifierSourceMove'];
	onFoeModifyDamagePhase2?: CommonHandlers['ModifierSourceMove'];
	onSourceDamagingHit?: (this: Battle, damage: number, target: Creature, source: Creature, move: ActiveMove) => void;
	onSourceAfterEachBoost?: (this: Battle, boost: SparseBoostsTable, target: Creature, source: Creature) => void;
	onSourceAfterHit?: MoveEventMethods['onAfterHit'];
	onSourceAfterSetStatus?: (this: Battle, status: Condition, target: Creature, source: Creature, effect: Effect) => void;
	onSourceAfterSubDamage?: MoveEventMethods['onAfterSubDamage'];
	onSourceAfterSwitchInSelf?: (this: Battle, creature: Creature) => void;
	onSourceAfterUseItem?: (this: Battle, item: Item, creature: Creature) => void;
	onSourceAfterBoost?: (this: Battle, boost: SparseBoostsTable, target: Creature, source: Creature, effect: Effect) => void;
	onSourceAfterFaint?: (this: Battle, length: number, target: Creature, source: Creature, effect: Effect) => void;
	onSourceAfterMoveSecondarySelf?: MoveEventMethods['onAfterMoveSecondarySelf'];
	onSourceAfterMoveSecondary?: MoveEventMethods['onAfterMoveSecondary'];
	onSourceAfterMove?: MoveEventMethods['onAfterMove'];
	onSourceAfterMoveSelf?: CommonHandlers['VoidSourceMove'];
	onSourceAttract?: (this: Battle, target: Creature, source: Creature) => void;
	onSourceAccuracy?: (
		this: Battle, accuracy: number, target: Creature, source: Creature, move: ActiveMove
	) => number | boolean | null | void;
	onSourceBasePower?: CommonHandlers['ModifierSourceMove'];
	onSourceBeforeFaint?: (this: Battle, creature: Creature, effect: Effect) => void;
	onSourceBeforeMove?: CommonHandlers['VoidSourceMove'];
	onSourceBeforeSwitchIn?: (this: Battle, creature: Creature) => void;
	onSourceBeforeSwitchOut?: (this: Battle, creature: Creature) => void;
	onSourceTryBoost?: (this: Battle, boost: SparseBoostsTable, target: Creature, source: Creature, effect: Effect) => void;
	onSourceChargeMove?: CommonHandlers['VoidSourceMove'];
	onSourceCriticalHit?: ((this: Battle, creature: Creature, source: null, move: ActiveMove) => boolean | void) | boolean;
	onSourceDamage?: (
		this: Battle, damage: number, target: Creature, source: Creature, effect: Effect
	) => number | boolean | null | void;
	onSourceDeductPP?: (this: Battle, target: Creature, source: Creature) => number | void;
	onSourceDisableMove?: (this: Battle, creature: Creature) => void;
	onSourceDragOut?: (this: Battle, creature: Creature, source?: Creature, move?: ActiveMove) => void;
	onSourceEatItem?: (this: Battle, item: Item, creature: Creature) => void;
	onSourceEffectiveness?: MoveEventMethods['onEffectiveness'];
	onSourceFaint?: CommonHandlers['VoidEffect'];
	onSourceFlinch?: ((this: Battle, creature: Creature) => boolean | void) | boolean;
	onSourceHit?: MoveEventMethods['onHit'];
	onSourceImmunity?: (this: Battle, type: string, creature: Creature) => void;
	onSourceLockMove?: string | ((this: Battle, creature: Creature) => void | string);
	onSourceMaybeTrapCreature?: (this: Battle, creature: Creature) => void;
	onSourceModifyAccuracy?: CommonHandlers['ModifierMove'];
	onSourceModifyAtk?: CommonHandlers['ModifierSourceMove'];
	onSourceModifyBoost?: (this: Battle, boosts: SparseBoostsTable, creature: Creature) => SparseBoostsTable | void;
	onSourceModifyCritRatio?: CommonHandlers['ModifierSourceMove'];
	onSourceModifyDamage?: CommonHandlers['ModifierSourceMove'];
	onSourceModifyDef?: CommonHandlers['ModifierMove'];
	onSourceModifyMove?: MoveEventMethods['onModifyMove'];
	onSourceModifyPriority?: CommonHandlers['ModifierSourceMove'];
	onSourceModifySecondaries?: (
		this: Battle, secondaries: SecondaryEffect[], target: Creature, source: Creature, move: ActiveMove
	) => void;
	onSourceModifySpA?: CommonHandlers['ModifierSourceMove'];
	onSourceModifySpD?: CommonHandlers['ModifierMove'];
	onSourceModifySpe?: (this: Battle, spe: number, creature: Creature) => number | void;
	onSourceModifySTAB?: CommonHandlers['ModifierSourceMove'];
	onSourceModifyType?: MoveEventMethods['onModifyType'];
	onSourceModifyTarget?: MoveEventMethods['onModifyTarget'];
	onSourceModifyWeight?: (this: Battle, weighthg: number, creature: Creature) => number | void;
	onSourceMoveAborted?: CommonHandlers['VoidMove'];
	onSourceNegateImmunity?: ((this: Battle, creature: Creature, type: string) => boolean | void) | boolean;
	onSourceOverrideAction?: (this: Battle, creature: Creature, target: Creature, move: ActiveMove) => string | void;
	onSourcePrepareHit?: CommonHandlers['ResultSourceMove'];
	onSourceRedirectTarget?: (
		this: Battle, target: Creature, source: Creature, source2: Effect, move: ActiveMove
	) => Creature | void;
	onSourceResidual?: (this: Battle, target: Creature & Side, source: Creature, effect: Effect) => void;
	onSourceSetAbility?: (
		this: Battle, ability: string, target: Creature, source: Creature, effect: Effect
	) => boolean | void;
	onSourceSetStatus?: (
		this: Battle, status: Condition, target: Creature, source: Creature, effect: Effect
	) => boolean | null | void;
	onSourceSetWeather?: (this: Battle, target: Creature, source: Creature, weather: Condition) => boolean | void;
	onSourceStallMove?: (this: Battle, creature: Creature) => boolean | void;
	onSourceSwitchOut?: (this: Battle, creature: Creature) => void;
	onSourceTakeItem?: (
		(this: Battle, item: Item, creature: Creature, source: Creature, move?: ActiveMove) => boolean | void
	) | boolean;
	onSourceTerrain?: (this: Battle, creature: Creature) => void;
	onSourceTrapCreature?: (this: Battle, creature: Creature) => void;
	onSourceTryAddVolatile?: (
		this: Battle, status: Condition, target: Creature, source: Creature, sourceEffect: Effect
	) => boolean | null | void;
	onSourceTryEatItem?: boolean | ((this: Battle, item: Item, creature: Creature) => boolean | void);
	/* FIXME: onSourceTryHeal() is run with two different sets of arguments */
	onSourceTryHeal?: (
		((this: Battle, relayVar: number, target: Creature, source: Creature, effect: Effect) => number | boolean | void) |
		((this: Battle, creature: Creature) => boolean | void) | boolean
	);
	onSourceTryHit?: MoveEventMethods['onTryHit'];
	onSourceTryHitField?: MoveEventMethods['onTryHitField'];
	onSourceTryHitSide?: CommonHandlers['ResultMove'];
	onSourceInvulnerability?: CommonHandlers['ExtResultMove'];
	onSourceTryMove?: MoveEventMethods['onTryMove'];
	onSourceTryPrimaryHit?: (
		this: Battle, target: Creature, source: Creature, move: ActiveMove
	) => boolean | null | number | void;
	onSourceType?: (this: Battle, types: string[], creature: Creature) => string[] | void;
	onSourceWeatherModifyDamage?: CommonHandlers['ModifierSourceMove'];
	onSourceModifyDamagePhase1?: CommonHandlers['ModifierSourceMove'];
	onSourceModifyDamagePhase2?: CommonHandlers['ModifierSourceMove'];
	onAnyDamagingHit?: (this: Battle, damage: number, target: Creature, source: Creature, move: ActiveMove) => void;
	onAnyAfterEachBoost?: (this: Battle, boost: SparseBoostsTable, target: Creature, source: Creature) => void;
	onAnyAfterHit?: MoveEventMethods['onAfterHit'];
	onAnyAfterSetStatus?: (this: Battle, status: Condition, target: Creature, source: Creature, effect: Effect) => void;
	onAnyAfterSubDamage?: MoveEventMethods['onAfterSubDamage'];
	onAnyAfterSwitchInSelf?: (this: Battle, creature: Creature) => void;
	onAnyAfterUseItem?: (this: Battle, item: Item, creature: Creature) => void;
	onAnyAfterBoost?: (this: Battle, boost: SparseBoostsTable, target: Creature, source: Creature, effect: Effect) => void;
	onAnyAfterFaint?: (this: Battle, length: number, target: Creature, source: Creature, effect: Effect) => void;
	onAnyAfterMega?: (this: Battle, creature: Creature) => void;
	onAnyAfterMoveSecondarySelf?: MoveEventMethods['onAfterMoveSecondarySelf'];
	onAnyAfterMoveSecondary?: MoveEventMethods['onAfterMoveSecondary'];
	onAnyAfterMove?: MoveEventMethods['onAfterMove'];
	onAnyAfterMoveSelf?: CommonHandlers['VoidSourceMove'];
	onAnyAfterTerastallization?: (this: Battle, creature: Creature) => void;
	onAnyAttract?: (this: Battle, target: Creature, source: Creature) => void;
	onAnyAccuracy?: (
		this: Battle, accuracy: number, target: Creature, source: Creature, move: ActiveMove
	) => number | boolean | null | void;
	onAnyBasePower?: CommonHandlers['ModifierSourceMove'];
	onAnyBeforeFaint?: (this: Battle, creature: Creature, effect: Effect) => void;
	onAnyBeforeMove?: CommonHandlers['VoidSourceMove'];
	onAnyBeforeSwitchIn?: (this: Battle, creature: Creature) => void;
	onAnyBeforeSwitchOut?: (this: Battle, creature: Creature) => void;
	onAnyTryBoost?: (this: Battle, boost: SparseBoostsTable, target: Creature, source: Creature, effect: Effect) => void;
	onAnyChargeMove?: CommonHandlers['VoidSourceMove'];
	onAnyCriticalHit?: ((this: Battle, creature: Creature, source: null, move: ActiveMove) => boolean | void) | boolean;
	onAnyDamage?: (
		this: Battle, damage: number, target: Creature, source: Creature, effect: Effect
	) => number | boolean | null | void;
	onAnyDeductPP?: (this: Battle, target: Creature, source: Creature) => number | void;
	onAnyDisableMove?: (this: Battle, creature: Creature) => void;
	onAnyDragOut?: (this: Battle, creature: Creature, source?: Creature, move?: ActiveMove) => void;
	onAnyEatItem?: (this: Battle, item: Item, creature: Creature) => void;
	onAnyEffectiveness?: MoveEventMethods['onEffectiveness'];
	onAnyFaint?: CommonHandlers['VoidEffect'];
	onAnyFlinch?: ((this: Battle, creature: Creature) => boolean | void) | boolean;
	onAnyHit?: MoveEventMethods['onHit'];
	onAnyImmunity?: (this: Battle, type: string, creature: Creature) => void;
	onAnyLockMove?: string | ((this: Battle, creature: Creature) => void | string);
	onAnyMaybeTrapCreature?: (this: Battle, creature: Creature, source?: Creature) => void;
	onAnyModifyAccuracy?: CommonHandlers['ModifierMove'];
	onAnyModifyAtk?: CommonHandlers['ModifierSourceMove'];
	onAnyModifyBoost?: (this: Battle, boosts: SparseBoostsTable, creature: Creature) => SparseBoostsTable | void;
	onAnyModifyCritRatio?: CommonHandlers['ModifierSourceMove'];
	onAnyModifyDamage?: CommonHandlers['ModifierSourceMove'];
	onAnyModifyDef?: CommonHandlers['ModifierMove'];
	onAnyModifyMove?: MoveEventMethods['onModifyMove'];
	onAnyModifyPriority?: CommonHandlers['ModifierSourceMove'];
	onAnyModifySecondaries?: (
		this: Battle, secondaries: SecondaryEffect[], target: Creature, source: Creature, move: ActiveMove
	) => void;
	onAnyModifySpA?: CommonHandlers['ModifierSourceMove'];
	onAnyModifySpD?: CommonHandlers['ModifierMove'];
	onAnyModifySpe?: (this: Battle, spe: number, creature: Creature) => number | void;
	onAnyModifySTAB?: CommonHandlers['ModifierSourceMove'];
	onAnyModifyType?: MoveEventMethods['onModifyType'];
	onAnyModifyTarget?: MoveEventMethods['onModifyTarget'];
	onAnyModifyWeight?: (this: Battle, weighthg: number, creature: Creature) => number | void;
	onAnyMoveAborted?: CommonHandlers['VoidMove'];
	onAnyNegateImmunity?: ((this: Battle, creature: Creature, type: string) => boolean | void) | boolean;
	onAnyOverrideAction?: (this: Battle, creature: Creature, target: Creature, move: ActiveMove) => string | void;
	onAnyPrepareHit?: CommonHandlers['ResultSourceMove'];
	onAnyPseudoWeatherChange?: (this: Battle, target: Creature, source: Creature, pseudoWeather: Condition) => void;
	onAnyRedirectTarget?: (
		this: Battle, target: Creature, source: Creature, source2: Effect, move: ActiveMove
	) => Creature | void;
	onAnyResidual?: (this: Battle, target: Creature & Side, source: Creature, effect: Effect) => void;
	onAnySetAbility?: (this: Battle, ability: string, target: Creature, source: Creature, effect: Effect) => boolean | void;
	onAnySetStatus?: (
		this: Battle, status: Condition, target: Creature, source: Creature, effect: Effect
	) => boolean | null | void;
	onAnySetWeather?: (this: Battle, target: Creature, source: Creature, weather: Condition) => boolean | void;
	onAnyStallMove?: (this: Battle, creature: Creature) => boolean | void;
	onAnySwitchIn?: (this: Battle, creature: Creature) => void;
	onAnySwitchOut?: (this: Battle, creature: Creature) => void;
	onAnyTakeItem?: (
		(this: Battle, item: Item, creature: Creature, source: Creature, move?: ActiveMove) => boolean | void
	) | boolean;
	onAnyTerrain?: (this: Battle, creature: Creature) => void;
	onAnyTrapCreature?: (this: Battle, creature: Creature) => void;
	onAnyTryAddVolatile?: (
		this: Battle, status: Condition, target: Creature, source: Creature, sourceEffect: Effect
	) => boolean | null | void;
	onAnyTryEatItem?: boolean | ((this: Battle, item: Item, creature: Creature) => boolean | void);
	/* FIXME: onAnyTryHeal() is run with two different sets of arguments */
	onAnyTryHeal?: (
		((this: Battle, relayVar: number, target: Creature, source: Creature, effect: Effect) => number | boolean | void) |
		((this: Battle, creature: Creature) => boolean | void) | boolean
	);
	onAnyTryHit?: MoveEventMethods['onTryHit'];
	onAnyTryHitField?: MoveEventMethods['onTryHitField'];
	onAnyTryHitSide?: CommonHandlers['ResultMove'];
	onAnyInvulnerability?: CommonHandlers['ExtResultMove'];
	onAnyTryMove?: MoveEventMethods['onTryMove'];
	onAnyTryPrimaryHit?: (
		this: Battle, target: Creature, source: Creature, move: ActiveMove
	) => boolean | null | number | void;
	onAnyType?: (this: Battle, types: string[], creature: Creature) => string[] | void;
	onAnyWeatherModifyDamage?: CommonHandlers['ModifierSourceMove'];
	onAnyModifyDamagePhase1?: CommonHandlers['ModifierSourceMove'];
	onAnyModifyDamagePhase2?: CommonHandlers['ModifierSourceMove'];

	// Priorities (incomplete list)
	onAccuracyPriority?: number;
	onDamagingHitOrder?: number;
	onAfterMoveSecondaryPriority?: number;
	onAfterMoveSecondarySelfPriority?: number;
	onAfterMoveSelfPriority?: number;
	onAfterSetStatusPriority?: number;
	onAnyBasePowerPriority?: number;
	onAnyInvulnerabilityPriority?: number;
	onAnyModifyAccuracyPriority?: number;
	onAnyFaintPriority?: number;
	onAnyPrepareHitPriority?: number;
	onAnySwitchInPriority?: number;
	onAnySwitchInSubOrder?: number;
	onAllyBasePowerPriority?: number;
	onAllyModifyAtkPriority?: number;
	onAllyModifySpAPriority?: number;
	onAllyModifySpDPriority?: number;
	onAttractPriority?: number;
	onBasePowerPriority?: number;
	onBeforeMovePriority?: number;
	onBeforeSwitchOutPriority?: number;
	onChangeBoostPriority?: number;
	onDamagePriority?: number;
	onDragOutPriority?: number;
	onDisableMovePriority?: number;
	onEffectivenessPriority?: number;
	onFoeBasePowerPriority?: number;
	onFoeBeforeMovePriority?: number;
	onFoeModifyDefPriority?: number;
	onFoeModifySpDPriority?: number;
	onFoeRedirectTargetPriority?: number;
	onFoeTrapCreaturePriority?: number;
	onFractionalPriorityPriority?: number;
	onHitPriority?: number;
	onInvulnerabilityPriority?: number;
	onMaybeTrapCreaturePriority?: number;
	onModifyAccuracyPriority?: number;
	onModifyAtkPriority?: number;
	onModifyCritRatioPriority?: number;
	onModifyDefPriority?: number;
	onModifyMovePriority?: number;
	onModifyPriorityPriority?: number;
	onModifySpAPriority?: number;
	onModifySpDPriority?: number;
	onModifySpePriority?: number;
	onModifySTABPriority?: number;
	onModifyTypePriority?: number;
	onModifyWeightPriority?: number;
	onRedirectTargetPriority?: number;
	onResidualOrder?: number;
	onResidualPriority?: number;
	onResidualSubOrder?: number;
	onSourceBasePowerPriority?: number;
	onSourceInvulnerabilityPriority?: number;
	onSourceModifyAccuracyPriority?: number;
	onSourceModifyAtkPriority?: number;
	onSourceModifyDamagePriority?: number;
	onSourceModifySpAPriority?: number;
	onSwitchInPriority?: number;
	onSwitchInSubOrder?: number;
	onTrapCreaturePriority?: number;
	onTryBoostPriority?: number;
	onTryEatItemPriority?: number;
	onTryHealPriority?: number;
	onTryHitPriority?: number;
	onTryMovePriority?: number;
	onTryPrimaryHitPriority?: number;
	onTypePriority?: number;
	onWeatherModifyDamagePriority?: number;
}

export interface CreatureEventMethods extends EventMethods {
	onAllyDamagingHit?: (this: Battle, damage: number, target: Creature, source: Creature, move: ActiveMove) => void;
	onAllyAfterEachBoost?: (this: Battle, boost: SparseBoostsTable, target: Creature, source: Creature) => void;
	onAllyAfterHit?: MoveEventMethods['onAfterHit'];
	onAllyAfterSetStatus?: (this: Battle, status: Condition, target: Creature, source: Creature, effect: Effect) => void;
	onAllyAfterSubDamage?: MoveEventMethods['onAfterSubDamage'];
	onAllyAfterSwitchInSelf?: (this: Battle, creature: Creature) => void;
	onAllyAfterUseItem?: (this: Battle, item: Item, creature: Creature) => void;
	onAllyAfterBoost?: (this: Battle, boost: SparseBoostsTable, target: Creature, source: Creature, effect: Effect) => void;
	onAllyAfterFaint?: (this: Battle, length: number, target: Creature, source: Creature, effect: Effect) => void;
	onAllyAfterMoveSecondarySelf?: MoveEventMethods['onAfterMoveSecondarySelf'];
	onAllyAfterMoveSecondary?: MoveEventMethods['onAfterMoveSecondary'];
	onAllyAfterMove?: MoveEventMethods['onAfterMove'];
	onAllyAfterMoveSelf?: CommonHandlers['VoidSourceMove'];
	onAllyAttract?: (this: Battle, target: Creature, source: Creature) => void;
	onAllyAccuracy?: (
		this: Battle, accuracy: number, target: Creature, source: Creature, move: ActiveMove
	) => number | boolean | null | void;
	onAllyBasePower?: CommonHandlers['ModifierSourceMove'];
	onAllyBeforeFaint?: (this: Battle, creature: Creature, effect: Effect) => void;
	onAllyBeforeMove?: CommonHandlers['VoidSourceMove'];
	onAllyBeforeSwitchIn?: (this: Battle, creature: Creature) => void;
	onAllyBeforeSwitchOut?: (this: Battle, creature: Creature) => void;
	onAllyTryBoost?: (this: Battle, boost: SparseBoostsTable, target: Creature, source: Creature, effect: Effect) => void;
	onAllyChargeMove?: CommonHandlers['VoidSourceMove'];
	onAllyCriticalHit?: ((this: Battle, creature: Creature, source: null, move: ActiveMove) => boolean | void) | boolean;
	onAllyDamage?: (
		this: Battle, damage: number, target: Creature, source: Creature, effect: Effect
	) => number | boolean | null | void;
	onAllyDeductPP?: (this: Battle, target: Creature, source: Creature) => number | void;
	onAllyDisableMove?: (this: Battle, creature: Creature) => void;
	onAllyDragOut?: (this: Battle, creature: Creature, source?: Creature, move?: ActiveMove) => void;
	onAllyEatItem?: (this: Battle, item: Item, creature: Creature) => void;
	onAllyEffectiveness?: MoveEventMethods['onEffectiveness'];
	onAllyFaint?: CommonHandlers['VoidEffect'];
	onAllyFlinch?: ((this: Battle, creature: Creature) => boolean | void) | boolean;
	onAllyHit?: MoveEventMethods['onHit'];
	onAllyImmunity?: (this: Battle, type: string, creature: Creature) => void;
	onAllyLockMove?: string | ((this: Battle, creature: Creature) => void | string);
	onAllyMaybeTrapCreature?: (this: Battle, creature: Creature) => void;
	onAllyModifyAccuracy?: CommonHandlers['ModifierMove'];
	onAllyModifyAtk?: CommonHandlers['ModifierSourceMove'];
	onAllyModifyBoost?: (this: Battle, boosts: SparseBoostsTable, creature: Creature) => SparseBoostsTable | void;
	onAllyModifyCritRatio?: CommonHandlers['ModifierSourceMove'];
	onAllyModifyDamage?: CommonHandlers['ModifierSourceMove'];
	onAllyModifyDef?: CommonHandlers['ModifierMove'];
	onAllyModifyMove?: MoveEventMethods['onModifyMove'];
	onAllyModifyPriority?: CommonHandlers['ModifierSourceMove'];
	onAllyModifySecondaries?: (
		this: Battle, secondaries: SecondaryEffect[], target: Creature, source: Creature, move: ActiveMove
	) => void;
	onAllyModifySpA?: CommonHandlers['ModifierSourceMove'];
	onAllyModifySpD?: CommonHandlers['ModifierMove'];
	onAllyModifySpe?: (this: Battle, spe: number, creature: Creature) => number | void;
	onAllyModifySTAB?: CommonHandlers['ModifierSourceMove'];
	onAllyModifyType?: MoveEventMethods['onModifyType'];
	onAllyModifyTarget?: MoveEventMethods['onModifyTarget'];
	onAllyModifyWeight?: (this: Battle, weighthg: number, creature: Creature) => number | void;
	onAllyMoveAborted?: CommonHandlers['VoidMove'];
	onAllyNegateImmunity?: ((this: Battle, creature: Creature, type: string) => boolean | void) | boolean;
	onAllyOverrideAction?: (this: Battle, creature: Creature, target: Creature, move: ActiveMove) => string | void;
	onAllyPrepareHit?: CommonHandlers['ResultSourceMove'];
	onAllyRedirectTarget?: (
		this: Battle, target: Creature, source: Creature, source2: Effect, move: ActiveMove
	) => Creature | void;
	onAllyResidual?: (this: Battle, target: Creature & Side, source: Creature, effect: Effect) => void;
	onAllySetAbility?: (this: Battle, ability: string, target: Creature, source: Creature, effect: Effect) => boolean | void;
	onAllySetStatus?: (
		this: Battle, status: Condition, target: Creature, source: Creature, effect: Effect
	) => boolean | null | void;
	onAllySetWeather?: (this: Battle, target: Creature, source: Creature, weather: Condition) => boolean | void;
	onAllyStallMove?: (this: Battle, creature: Creature) => boolean | void;
	onAllySwitchOut?: (this: Battle, creature: Creature) => void;
	onAllyTakeItem?: (
		(this: Battle, item: Item, creature: Creature, source: Creature, move?: ActiveMove) => boolean | void
	) | boolean;
	onAllyTerrain?: (this: Battle, creature: Creature) => void;
	onAllyTrapCreature?: (this: Battle, creature: Creature) => void;
	onAllyTryAddVolatile?: (
		this: Battle, status: Condition, target: Creature, source: Creature, sourceEffect: Effect
	) => boolean | null | void;
	onAllyTryEatItem?: boolean | ((this: Battle, item: Item, creature: Creature) => boolean | void);
	/* FIXME: onAllyTryHeal() is run with two different sets of arguments */
	onAllyTryHeal?: (
		((this: Battle, relayVar: number, target: Creature, source: Creature, effect: Effect) => number | boolean | void) |
		((this: Battle, creature: Creature) => boolean | void) | boolean
	);
	onAllyTryHit?: MoveEventMethods['onTryHit'];
	onAllyTryHitField?: MoveEventMethods['onTryHitField'];
	onAllyTryHitSide?: CommonHandlers['ResultMove'];
	onAllyInvulnerability?: CommonHandlers['ExtResultMove'];
	onAllyTryMove?: MoveEventMethods['onTryMove'];
	onAllyTryPrimaryHit?: (
		this: Battle, target: Creature, source: Creature, move: ActiveMove
	) => boolean | null | number | void;
	onAllyType?: (this: Battle, types: string[], creature: Creature) => string[] | void;
	onAllyWeatherModifyDamage?: CommonHandlers['ModifierSourceMove'];
	onAllyModifyDamagePhase1?: CommonHandlers['ModifierSourceMove'];
	onAllyModifyDamagePhase2?: CommonHandlers['ModifierSourceMove'];
}
export interface SideEventMethods extends EventMethods {
	onSideStart?: (this: Battle, target: Side, source: Creature, sourceEffect: Effect) => void;
	onSideRestart?: (this: Battle, target: Side, source: Creature, sourceEffect: Effect) => void;
	onSideResidual?: (this: Battle, target: Side, source: Creature, effect: Effect) => void;
	onSideEnd?: (this: Battle, target: Side) => void;
	onSideResidualOrder?: number;
	onSideResidualPriority?: number;
	onSideResidualSubOrder?: number;
}
export interface FieldEventMethods extends EventMethods {
	onFieldStart?: (this: Battle, target: Field, source: Creature, sourceEffect: Effect) => void;
	onFieldRestart?: (this: Battle, target: Field, source: Creature, sourceEffect: Effect) => void;
	onFieldResidual?: (this: Battle, target: Field, source: Creature, effect: Effect) => void;
	onFieldEnd?: (this: Battle, target: Field) => void;
	onFieldResidualOrder?: number;
	onFieldResidualPriority?: number;
	onFieldResidualSubOrder?: number;
}
export interface CreatureConditionData extends Partial<Condition>, CreatureEventMethods {}
export interface SideConditionData extends
	Partial<Omit<Condition, 'onStart' | 'onRestart' | 'onEnd'>>, SideEventMethods {}
export interface FieldConditionData extends
	Partial<Omit<Condition, 'onStart' | 'onRestart' | 'onEnd'>>, FieldEventMethods {}

export type ConditionData = CreatureConditionData | SideConditionData | FieldConditionData;

export type ModdedConditionData = ConditionData & { inherit?: true };
export interface ConditionDataTable { [id: IDEntry]: ConditionData }
export interface ModdedConditionDataTable { [id: IDEntry]: ModdedConditionData }

export class Condition extends BasicEffect implements
	Readonly<BasicEffect & SideConditionData & FieldConditionData & CreatureConditionData> {
	declare readonly effectType: 'Condition' | 'Weather' | 'Status' | 'Terrain';
	declare readonly counterMax?: number;
	declare effectOrder?: number;

	declare readonly durationCallback?: (this: Battle, target: Creature, source: Creature, effect: Effect | null) => number;
	declare readonly onCopy?: (this: Battle, creature: Creature) => void;
	declare readonly onEnd?: (this: Battle, target: Creature) => void;
	declare readonly onRestart?: (
		this: Battle, target: Creature, source: Creature, sourceEffect: Effect
	) => boolean | null | void;
	declare readonly onStart?: (
		this: Battle, target: Creature, source: Creature, sourceEffect: Effect
	) => boolean | null | void;
	declare readonly onBattleStart?: (this: Battle, creature: Creature) => void;

	constructor(data: AnyObject) {
		super(data);
		this.effectType = (['Weather', 'Status', 'Terrain'].includes(data.effectType) ? data.effectType : 'Condition');
		assignMissingFields(this, data);
	}
}

const EMPTY_CONDITION: Condition = Utils.deepFreeze(new Condition({ name: '', exists: false }));

export class DexConditions {
	readonly dex: ModdedDex;
	readonly conditionCache = new Map<ID, Condition>();

	constructor(dex: ModdedDex) {
		this.dex = dex;
	}

	get(name?: string | Effect | null): Condition {
		if (!name) return EMPTY_CONDITION;
		if (typeof name !== 'string') return name as Condition;

		const special = name.startsWith('item:') ? `item:${toID(name.slice(5))}` as ID :
			name.startsWith('ability:') ? `ability:${toID(name.slice(8))}` as ID :
			name.startsWith('move:') ? `move:${toID(name.slice(5))}` as ID : undefined;
		return this.getByID(special || toID(name));
	}

	getByID(id: ID): Condition {
		if (id === '' || id === 'constructor') return EMPTY_CONDITION;

		let condition = this.conditionCache.get(id);
		if (condition) return condition;

		let found;
		if (id.startsWith('item:')) {
			const item = this.dex.items.getByID(id.slice(5) as ID);
			condition = { ...item, id: 'item:' + item.id as ID } as any as Condition;
		} else if (id.startsWith('ability:')) {
			const ability = this.dex.abilities.getByID(id.slice(8) as ID);
			condition = { ...ability, id: 'ability:' + ability.id as ID } as any as Condition;
		} else if (id.startsWith('move:')) {
			const move = this.dex.moves.getByID(id.slice(5) as ID);
			condition = move as any as Condition;
		} else if (this.dex.data.Rulesets.hasOwnProperty(id)) {
			condition = this.dex.formats.get(id) as any as Condition;
			// formats can't be frozen if they don't have a ruleTable
			this.conditionCache.set(id, condition);
			return condition;
		} else if (this.dex.data.Conditions.hasOwnProperty(id)) {
			condition = new Condition({ name: id, ...this.dex.data.Conditions[id] });
		} else if (
			(this.dex.data.Moves.hasOwnProperty(id) && (found = this.dex.data.Moves[id]).condition) ||
			(this.dex.data.Abilities.hasOwnProperty(id) && (found = this.dex.data.Abilities[id]).condition) ||
			(this.dex.data.Items.hasOwnProperty(id) && (found = this.dex.data.Items[id]).condition)
		) {
			condition = new Condition({ name: found.name || id, ...found.condition });
		} else if (id === 'recoil') {
			condition = new Condition({ name: 'Recoil', effectType: 'Recoil' });
		} else if (id === 'drain') {
			condition = new Condition({ name: 'Drain', effectType: 'Drain' });
		} else {
			condition = new Condition({ name: id, exists: false });
		}

		this.conditionCache.set(id, condition);
		return condition;
	}
}
