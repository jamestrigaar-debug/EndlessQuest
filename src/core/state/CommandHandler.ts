import type { Command, Direction } from './Commands';
import type { GameState } from './GameState';
import { advanceTime, getCurrentTile, revealArea } from './GameState';
import { EventBus } from '../../events/EventBus';
import type { GameEvent } from '../../events/GameEvent';
import { TerrainType } from '../world/TerrainType';
import type { PositionComponent } from '../ecs/Component';

const DIRECTION_DELTAS: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
};

const TERRAIN_DESCRIPTIONS: Record<string, string> = {
  [TerrainType.PLAINS]: 'a grassy plain',
  [TerrainType.FOREST]: 'a dense forest',
  [TerrainType.HILLS]: 'rolling hills',
  [TerrainType.MOUNTAIN]: 'a rocky mountain',
  [TerrainType.WATER]: 'a body of water',
  [TerrainType.SWAMP]: 'a murky swamp',
};

export class CommandHandler {
  constructor(private eventBus: EventBus) {}

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
        // Handled at higher level; emit event
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

    // Emit all events via bus and also push to log
    for (const e of events) {
      state.log.push(e);
      this.eventBus.emit(e);
    }

    return events;
  }

  private handleMove(direction: Direction, state: GameState): GameEvent | null {
    const pos = state.entities.getComponent<PositionComponent>(state.playerId, 'position');
    if (!pos) {
      const ev: GameEvent = {
        tick: state.tick,
        type: 'error',
        message: 'Player has no position!',
      };
      return ev;
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
        message: `You cannot move ${direction}, ${TERRAIN_DESCRIPTIONS[targetTile.terrain]} blocks your path.`,
      };
    }

    // Update position
    pos.x = newX;
    pos.y = newY;

    // Reveal
    revealArea(state, newX, newY, 1);

    // Advance time by movement cost
    advanceTime(state, targetTile.movementCost);

    // Maybe increase fatigue
    const stats = state.entities.getComponent(state.playerId, 'stats') as any;
    if (stats) {
      stats.fatigue = Math.min(100, stats.fatigue + targetTile.movementCost * 0.5);
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

  private handleRest(hours: number, state: GameState): GameEvent {
    const clamped = Math.max(1, Math.min(24, Math.floor(hours)));
    advanceTime(state, clamped);

    // Recover fatigue, increase hunger/thirst slightly
    const stats = state.entities.getComponent(state.playerId, 'stats') as any;
    if (stats) {
      stats.fatigue = Math.max(0, stats.fatigue - clamped * 5);
      stats.hunger = Math.min(100, stats.hunger + clamped * 0.8);
      stats.thirst = Math.min(100, stats.thirst + clamped * 1.2);
    }

    return {
      tick: state.tick,
      type: 'rest',
      message: `You rest for ${clamped} hour${clamped > 1 ? 's' : ''}.`,
      data: { hours: clamped },
    };
  }

  private handleSearch(state: GameState): GameEvent {
    advanceTime(state, 1);
    const tile = getCurrentTile(state);
    const terrain = tile?.terrain ?? 'unknown';

    // Simple random find chance
    const found = state.rng.nextFloat() < 0.15;
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

    // Reveal larger area
    const pos = state.entities.getComponent<PositionComponent>(state.playerId, 'position');
    if (pos) revealArea(state, pos.x, pos.y, 2);

    return {
      tick: state.tick,
      type: 'search',
      message,
      data: { terrain, found },
    };
  }
}
