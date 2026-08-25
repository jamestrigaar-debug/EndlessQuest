import { World } from '../ecs/World';
import { SeededRNG } from '../rng/SeededRNG';
import type { Tile } from '../world/Tile';
import { MAP_WIDTH, MAP_HEIGHT } from '../world/Tile';
import type { EntityId } from '../ecs/Entity';
import type { GameEvent } from '../../events/GameEvent';
import type { PositionComponent } from '../ecs/Component';
import {
  HOURS_PER_DAY,
  DAYS_PER_YEAR,
  INITIAL_HOUR,
  INITIAL_DAY,
  INITIAL_YEAR,
  DEFAULT_REVEAL_RADIUS,
} from '../SimulationConstants';

/**
 * Root state interface for EndlessQuest world simulation.
 */
export interface GameState {
  /** Numeric seed used for PRNG initialization */
  seed: number;
  /** String seed identifier */
  seedString: string;
  /** Total elapsed simulation ticks (1 tick = 1 hour) */
  tick: number;
  /** Current world simulation year (1-based) */
  year: number;
  /** Current day of the year (1 to 360) */
  day: number;
  /** Current hour of the day (0 to 23) */
  hour: number;
  /** ECS entity world container */
  entities: World;
  /** 2D grid of world map tiles */
  map: Tile[][];
  /** Map width in tiles */
  mapWidth: number;
  /** Map height in tiles */
  mapHeight: number;
  /** Seeded pseudorandom number generator */
  rng: SeededRNG;
  /** Chronological history of emitted game events */
  log: GameEvent[];
  /** Primary player EntityId */
  playerId: EntityId;
}

/**
 * Factory creating initial GameState from seed and initialized world objects.
 */
export function createInitialGameState(
  seed: string | number,
  map: Tile[][],
  world: World,
  playerId: EntityId,
  rng: SeededRNG
): GameState {
  const seedString = typeof seed === 'string' ? seed : seed.toString();
  const numericSeed = typeof seed === 'number' ? seed : hashString(seed);

  return {
    seed: numericSeed,
    seedString,
    tick: 0,
    year: INITIAL_YEAR,
    day: INITIAL_DAY,
    hour: INITIAL_HOUR,
    entities: world,
    map,
    mapWidth: MAP_WIDTH,
    mapHeight: MAP_HEIGHT,
    rng,
    log: [],
    playerId,
  };
}

/**
 * Advances simulation time by a specified number of hours, updating tick, hour, day, and year.
 * @param state GameState to advance
 * @param hours Number of hours elapsed
 */
export function advanceTime(state: GameState, hours: number): void {
  state.tick += hours;
  state.hour += hours;

  while (state.hour >= HOURS_PER_DAY) {
    state.hour -= HOURS_PER_DAY;
    state.day += 1;
  }

  while (state.day > DAYS_PER_YEAR) {
    state.day -= DAYS_PER_YEAR;
    state.year += 1;
  }
}

/**
 * Deterministically hashes a string into a 32-bit signed integer.
 */
function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/**
 * Returns the tile occupied by the player character.
 * @param state Current GameState
 * @returns Tile or undefined if player has no position or position is out of bounds
 */
export function getCurrentTile(state: GameState): Tile | undefined {
  const pos = state.entities.getComponent<PositionComponent>(state.playerId, 'position');
  if (!pos) return undefined;
  if (pos.y < 0 || pos.y >= state.mapHeight || pos.x < 0 || pos.x >= state.mapWidth) return undefined;
  return state.map[pos.y][pos.x];
}

/**
 * Marks tiles within a given Chebyshev radius around (cx, cy) as explored.
 * @param state GameState
 * @param cx Center X
 * @param cy Center Y
 * @param radius Chebyshev radius (defaults to DEFAULT_REVEAL_RADIUS = 1)
 */
export function revealArea(
  state: GameState,
  cx: number,
  cy: number,
  radius: number = DEFAULT_REVEAL_RADIUS
): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || x >= state.mapWidth || y < 0 || y >= state.mapHeight) continue;
      state.map[y][x].explored = true;
    }
  }
}

/**
 * Formats a game tick into a standard timestamp string: "Y<year> D<day> <hour>:00".
 * @param tick Simulation tick in hours
 * @returns Formatted time string
 */
export function formatGameTime(tick: number): string {
  const totalHours = tick + INITIAL_HOUR;
  const totalDays = Math.floor(totalHours / HOURS_PER_DAY);
  const hour = totalHours % HOURS_PER_DAY;
  const year = Math.floor(totalDays / DAYS_PER_YEAR) + INITIAL_YEAR;
  const dayOfYear = (totalDays % DAYS_PER_YEAR) + INITIAL_DAY;
  return `Y${year} D${dayOfYear} ${String(hour).padStart(2, '0')}:00`;
}
