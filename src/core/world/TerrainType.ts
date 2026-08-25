export enum TerrainType {
  PLAINS = 'plains',
  FOREST = 'forest',
  HILLS = 'hills',
  MOUNTAIN = 'mountain',
  WATER = 'water',
  SWAMP = 'swamp',
}

export const TERRAIN_MOVEMENT_COST: Record<TerrainType, number> = {
  [TerrainType.PLAINS]: 1,
  [TerrainType.FOREST]: 2,
  [TerrainType.HILLS]: 3,
  [TerrainType.MOUNTAIN]: 4,
  [TerrainType.SWAMP]: 3,
  [TerrainType.WATER]: Infinity,
};

export const TERRAIN_COLOR: Record<TerrainType, number> = {
  [TerrainType.PLAINS]: 0x90B77D,
  [TerrainType.FOREST]: 0x2D5016,
  [TerrainType.HILLS]: 0x8B7D6B,
  [TerrainType.MOUNTAIN]: 0x808080,
  [TerrainType.WATER]: 0x4A90E2,
  [TerrainType.SWAMP]: 0x5D4E37,
};

export const TERRAIN_PASSABLE: Record<TerrainType, boolean> = {
  [TerrainType.PLAINS]: true,
  [TerrainType.FOREST]: true,
  [TerrainType.HILLS]: true,
  [TerrainType.MOUNTAIN]: true,
  [TerrainType.SWAMP]: true,
  [TerrainType.WATER]: false,
};

export const ALL_TERRAIN_TYPES = Object.values(TerrainType) as TerrainType[];
