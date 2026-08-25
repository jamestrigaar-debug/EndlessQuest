import { TerrainType } from './TerrainType';

export interface Tile {
  x: number;
  y: number;
  terrain: TerrainType;
  elevation: number;
  moisture: number;
  explored: boolean;
  movementCost: number;
  settlement?: boolean;
}

export const MAP_WIDTH = 100;
export const MAP_HEIGHT = 100;
export const TILE_SIZE = 32;
export const VIEWPORT_WIDTH = 20;
export const VIEWPORT_HEIGHT = 15;
