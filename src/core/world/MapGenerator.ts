import { createNoise2D } from 'simplex-noise';
import { SeededRNG } from '../rng/SeededRNG';
import { TerrainType, TERRAIN_MOVEMENT_COST } from './TerrainType';
import type { Tile } from './Tile';
import { MAP_WIDTH, MAP_HEIGHT } from './Tile';

/**
 * Generates deterministic world map using simplex noise.
 * Elevation + moisture determines terrain.
 */

export interface MapGenerationResult {
  map: Tile[][];
  startX: number;
  startY: number;
}

export class MapGenerator {
  private rng: SeededRNG;

  constructor(rng: SeededRNG) {
    this.rng = rng;
  }

  generate(width: number = MAP_WIDTH, height: number = MAP_HEIGHT): MapGenerationResult {
    // Create deterministic noise functions using RNG-derived seeds
    // simplex-noise expects a random function () => number in [0,1)
    const elevationRng = this.rng.fork();
    const moistureRng = this.rng.fork();
    // Fork again to avoid overlapping sequences
    const elevationRng2 = elevationRng.fork();
    // Use closure that calls nextFloat
    const elevationNoise = createNoise2D(() => elevationRng.nextFloat());
    const moistureNoise = createNoise2D(() => moistureRng.nextFloat());
    const detailNoise = createNoise2D(() => elevationRng2.nextFloat());

    const map: Tile[][] = [];

    for (let y = 0; y < height; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < width; x++) {
        // Normalized coordinates for noise sampling, with multiple octaves
        const nx = x / width;
        const ny = y / height;

        // Elevation: combination of low-frequency and detail
        let elev = 0;
        elev += elevationNoise(nx * 2.5, ny * 2.5) * 0.6;
        elev += elevationNoise(nx * 5, ny * 5) * 0.3;
        elev += detailNoise(nx * 10, ny * 10) * 0.1;
        // Normalize from [-1,1] to [0,1]
        elev = (elev + 1) / 2;
        // Apply bias to ensure more plains
        elev = Math.pow(elev, 1.1);

        // Moisture
        let moist = 0;
        moist += moistureNoise(nx * 3, ny * 3) * 0.7;
        moist += moistureNoise(nx * 6, ny * 6) * 0.3;
        moist = (moist + 1) / 2;

        const terrain = this.determineTerrain(elev, moist);

        const tile: Tile = {
          x,
          y,
          terrain,
          elevation: elev,
          moisture: moist,
          explored: false,
          movementCost: TERRAIN_MOVEMENT_COST[terrain],
          settlement: false,
        };
        row.push(tile);
      }
      map.push(row);
    }

    // Place 2-4 settlements on passable plains/hills near center-ish
    const settlementCount = this.rng.nextInt(2, 4);
    let placed = 0;
    let attempts = 0;
    while (placed < settlementCount && attempts < 500) {
      const sx = this.rng.nextInt(10, width - 10);
      const sy = this.rng.nextInt(10, height - 10);
      const tile = map[sy][sx];
      if (tile.terrain === TerrainType.PLAINS || tile.terrain === TerrainType.HILLS) {
        if (!tile.settlement) {
          tile.settlement = true;
          placed++;
        }
      }
      attempts++;
    }

    // Find start position: valid passable tile near center with some playable area
    const startPos = this.findStartPosition(map, width, height);

    // Ensure surrounding area has some passable tiles (carve if needed)
    this.ensurePlayableArea(map, startPos.x, startPos.y);

    return { map, startX: startPos.x, startY: startPos.y };
  }

  private determineTerrain(elevation: number, moisture: number): TerrainType {
    // Very low elevation
    if (elevation < 0.2) {
      if (moisture > 0.6) return TerrainType.SWAMP;
      return TerrainType.WATER;
    }
    // Low elevation
    if (elevation < 0.4) {
      if (moisture > 0.75 && elevation > 0.25) return TerrainType.SWAMP;
      return TerrainType.PLAINS;
    }
    // Medium elevation
    if (elevation < 0.65) {
      if (moisture > 0.55) return TerrainType.FOREST;
      return TerrainType.HILLS;
    }
    // High elevation
    return TerrainType.MOUNTAIN;
  }

  private findStartPosition(map: Tile[][], width: number, height: number): { x: number; y: number } {
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    // Spiral search from center for passable tile
    const maxRadius = Math.max(width, height);
    for (let r = 0; r < maxRadius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // only perimeter
          const x = centerX + dx;
          const y = centerY + dy;
          if (x < 0 || x >= width || y < 0 || y >= height) continue;
          const tile = map[y][x];
          if (tile.movementCost !== Infinity) {
            // Check that at least 4 neighbors are passable
            const passableNeighbors = this.countPassableNeighbors(map, x, y, width, height);
            if (passableNeighbors >= 3) {
              return { x, y };
            }
          }
        }
      }
    }
    // Fallback: find any passable
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (map[y][x].movementCost !== Infinity) return { x, y };
      }
    }
    // Last resort: force center to plains
    map[centerY][centerX].terrain = TerrainType.PLAINS;
    map[centerY][centerX].movementCost = TERRAIN_MOVEMENT_COST[TerrainType.PLAINS];
    return { x: centerX, y: centerY };
  }

  private countPassableNeighbors(map: Tile[][], x: number, y: number, w: number, h: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        if (map[ny][nx].movementCost !== Infinity) count++;
      }
    }
    return count;
  }

  private ensurePlayableArea(map: Tile[][], cx: number, cy: number): void {
    const w = map[0].length;
    const h = map.length;
    // Ensure 5x5 area around start has at least 60% passable
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        // If it's water, convert to plains
        if (map[y][x].terrain === TerrainType.WATER) {
          // Only convert if random or close to center
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
            map[y][x].terrain = TerrainType.PLAINS;
            map[y][x].movementCost = TERRAIN_MOVEMENT_COST[TerrainType.PLAINS];
          }
        }
      }
    }
  }
}
