import { World } from '../ecs/World';
import { SeededRNG } from '../rng/SeededRNG';
import type { Tile } from '../world/Tile';
import { MAP_WIDTH, MAP_HEIGHT } from '../world/Tile';
import type { EntityId } from '../ecs/Entity';
import type { GameEvent } from '../../events/GameEvent';

export interface GameState {
  seed: number;
  seedString: string;
  tick: number;
  year: number;
  day: number;
  hour: number;
  entities: World;
  map: Tile[][];
  mapWidth: number;
  mapHeight: number;
  rng: SeededRNG;
  log: GameEvent[];
  playerId: EntityId;
}

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
    year: 1,
    day: 1,
    hour: 6,
    entities: world,
    map,
    mapWidth: MAP_WIDTH,
    mapHeight: MAP_HEIGHT,
    rng,
    log: [],
    playerId,
  };
}

export function advanceTime(state: GameState, hours: number): void {
  state.tick += hours;
  state.hour += hours;

  while (state.hour >= 24) {
    state.hour -= 24;
    state.day += 1;
  }
  // 30 days per month? Simplified: 365 days per year
  while (state.day > 365) {
    state.day -= 365;
    state.year += 1;
  }
}

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

export function getCurrentTile(state: GameState): Tile | undefined {
  const pos = state.entities.getComponent(state.playerId, 'position') as
    | { x: number; y: number }
    | undefined;
  if (!pos) return undefined;
  if (pos.y < 0 || pos.y >= state.mapHeight || pos.x < 0 || pos.x >= state.mapWidth) return undefined;
  return state.map[pos.y][pos.x];
}

export function revealArea(state: GameState, cx: number, cy: number, radius: number = 1): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || x >= state.mapWidth || y < 0 || y >= state.mapHeight) continue;
      state.map[y][x].explored = true;
    }
  }
}
