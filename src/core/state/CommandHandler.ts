import type { Command, Direction } from './Commands';
import type { GameState } from './GameState';
import { advanceTime, getCurrentTile, revealArea } from './GameState';
import { EventBus } from '../../events/EventBus';
import type { GameEvent } from '../../events/GameEvent';
import { TerrainType } from '../world/TerrainType';
import type { PositionComponent, StatsComponent } from '../ecs/Component';
import {
  FATIGUE_PER_MOVE_COST,
  FATIGUE_REST_RECOVERY_PER_HOUR,
  HUNGER_REST_INCREASE_PER_HOUR,
  THIRST_REST_INCREASE_PER_HOUR,
  MIN_REST_HOURS,
  MAX_REST_HOURS,
  SEARCH_TIME_COST_HOURS,
  SEARCH_SUCCESS_PROBABILITY,
  SEARCH_REVEAL_RADIUS,
  DEFAULT_REVEAL_RADIUS,
  MIN_STAT_VALUE,
  MAX_STAT_VALUE,
} from '../SimulationConstants';

/**
 * Directional coordinate offsets.
 */
const DIRECTION_DELTAS: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
};

/**
 * Descriptive text for terrain types.
 */
const TERRAIN_DESCRIPTIONS: Record<string, string> = {
  [TerrainType.PLAINS]: 'a grassy plain',
  [TerrainType.FOREST]: 'a dense forest',
  [TerrainType.HILLS]: 'rolling hills',
  [TerrainType.MOUNTAIN]: 'a rocky mountain',
  [TerrainType.WATER]: 'a body of water',
  [TerrainType.SWAMP]: 'a murky swamp',
};

/**
 * Command handler interface.
 */
export interface ICommandHandler {
  handle(command: Command, state: GameState): GameEvent[];
}

/**
 * Handles validation, state transition, and event emission for player commands.
 */
export class CommandHandler implements ICommandHandler {
  constructor(private eventBus: EventBus) {}

  /**
   * Executes a command against the game state and returns resulting game events.
   * @param command Command to execute
   * @param state Mutable GameState
   * @returns Array of generated GameEvents
   */
  handle(command: Command, state: GameState): GameEvent[] {
    const events: GameEvent[] = [];

    switch (command.type) {
      case 'MOVE': {
        const ev = this.handleMove(command.direction, state);
        if (ev) events.push(ev);
        break;
      }
      case 'REST': {
        const ev = this.handleRest(command.hours, state);
        events.push(ev);
        break;
      }
      case 'SEARCH': {
        const ev = this.handleSearch(state);
        events.push(ev);
        break;
      }
      case 'NEW_GAME': {
        const ev: GameEvent = {
          tick: state.tick,
          type: 'system',
          message: `Starting new game${command.seed ? ` with seed ${command.seed}` : ''}...`,
          data: { seed: command.seed },
        };
        events.push(ev);
        break;
      }
    }

    for (const e of events) {
      state.log.push(e);
      this.eventBus.emit(e);
    }

    return events;
  }

  /**
   * Handles player directional movement with bounds validation, passability checks,
   * fog of war reveal, and fatigue consumption.
   */
  private handleMove(direction: Direction, state: GameState): GameEvent | null {
    const pos = state.entities.getComponent<PositionComponent>(state.playerId, 'position');
    if (!pos) {
      return {
        tick: state.tick,
        type: 'error',
        message: 'Player has no position!',
      };
    }

    const delta = DIRECTION_DELTAS[direction];
    const newX = pos.x + delta.dx;
    const newY = pos.y + delta.dy;

    // Bounds check
    if (newX < 0 || newX >= state.mapWidth || newY < 0 || newY >= state.mapHeight) {
      return {
        tick: state.tick,
        type: 'error',
        message: `You cannot move ${direction}, the world ends there.`,
      };
    }

    const targetTile = state.map[newY][newX];
    if (targetTile.movementCost === Infinity) {
      return {
        tick: state.tick,
        type: 'error',
        message: `You cannot move ${direction}, ${TERRAIN_DESCRIPTIONS[targetTile.terrain] || targetTile.terrain} blocks your path.`,
      };
    }

    // Update position
    pos.x = newX;
    pos.y = newY;

    // Reveal terrain around new position
    revealArea(state, newX, newY, DEFAULT_REVEAL_RADIUS);

    // Advance simulation time by terrain movement cost
    advanceTime(state, targetTile.movementCost);

    // Increase fatigue based on terrain difficulty
    const stats = state.entities.getComponent<StatsComponent>(state.playerId, 'stats');
    if (stats) {
      stats.fatigue = Math.min(
        MAX_STAT_VALUE,
        stats.fatigue + targetTile.movementCost * FATIGUE_PER_MOVE_COST
      );
    }

    const desc = TERRAIN_DESCRIPTIONS[targetTile.terrain] || targetTile.terrain;
    let settlementMsg = '';
    if (targetTile.settlement) settlementMsg = ' You see signs of a settlement nearby.';

    return {
      tick: state.tick,
      type: 'movement',
      message: `You move ${direction} to ${desc}.${settlementMsg}`,
      data: { direction, x: newX, y: newY, terrain: targetTile.terrain },
    };
  }

  /**
   * Handles resting for a duration, recovering fatigue while increasing hunger and thirst.
   */
  private handleRest(hours: number, state: GameState): GameEvent {
    const clamped = Math.max(MIN_REST_HOURS, Math.min(MAX_REST_HOURS, Math.floor(hours)));
    advanceTime(state, clamped);

    const stats = state.entities.getComponent<StatsComponent>(state.playerId, 'stats');
    if (stats) {
      stats.fatigue = Math.max(
        MIN_STAT_VALUE,
        stats.fatigue - clamped * FATIGUE_REST_RECOVERY_PER_HOUR
      );
      stats.hunger = Math.min(
        MAX_STAT_VALUE,
        stats.hunger + clamped * HUNGER_REST_INCREASE_PER_HOUR
      );
      stats.thirst = Math.min(
        MAX_STAT_VALUE,
        stats.thirst + clamped * THIRST_REST_INCREASE_PER_HOUR
      );
    }

    return {
      tick: state.tick,
      type: 'rest',
      message: `You rest for ${clamped} hour${clamped > 1 ? 's' : ''}.`,
      data: { hours: clamped },
    };
  }

  /**
   * Handles foraging / searching current area, expanding exploration radius.
   */
  private handleSearch(state: GameState): GameEvent {
    advanceTime(state, SEARCH_TIME_COST_HOURS);
    const tile = getCurrentTile(state);
    const terrain = tile?.terrain ?? 'unknown';

    const found = state.rng.nextFloat() < SEARCH_SUCCESS_PROBABILITY;
    let message = `You search the area (${terrain}). `;
    if (found) {
      const finds = [
        'You find some edible berries.',
        'You discover a small stream nearby.',
        'You find traces of an old campsite.',
        'You spot some interesting tracks.',
      ];
      const idx = state.rng.nextInt(0, finds.length - 1);
      message += finds[idx];
    } else {
      message += 'You find nothing of interest.';
    }

    const pos = state.entities.getComponent<PositionComponent>(state.playerId, 'position');
    if (pos) {
      revealArea(state, pos.x, pos.y, SEARCH_REVEAL_RADIUS);
    }

    return {
      tick: state.tick,
      type: 'search',
      message,
      data: { terrain, found },
    };
  }
}
