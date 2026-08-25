/**
 * Central simulation constants for EndlessQuest.
 * Contains calendar parameters, terrain thresholds, noise generation settings,
 * and entity stat change rates.
 */

// Calendar and Time
export const HOURS_PER_DAY = 24;
export const DAYS_PER_SEASON = 90;
export const SEASONS_PER_YEAR = 4;
export const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASONS_PER_YEAR; // 360 days
export const HOURS_PER_YEAR = DAYS_PER_YEAR * HOURS_PER_DAY; // 8640 hours
export const INITIAL_HOUR = 6;
export const INITIAL_DAY = 1;
export const INITIAL_YEAR = 1;

// World & Map Dimensions
export const DEFAULT_MAP_WIDTH = 100;
export const DEFAULT_MAP_HEIGHT = 100;
export const DEFAULT_TILE_SIZE = 32;
export const DEFAULT_VIEWPORT_WIDTH = 20;
export const DEFAULT_VIEWPORT_HEIGHT = 15;

// Fog of War / Exploration
export const DEFAULT_REVEAL_RADIUS = 1;
export const SEARCH_REVEAL_RADIUS = 2;
export const INITIAL_SPAWN_REVEAL_RADIUS = 2;

// Map Generation - Noise parameters
export const ELEVATION_OCTAVE_1_FREQ = 2.5;
export const ELEVATION_OCTAVE_1_WEIGHT = 0.6;
export const ELEVATION_OCTAVE_2_FREQ = 5.0;
export const ELEVATION_OCTAVE_2_WEIGHT = 0.3;
export const ELEVATION_OCTAVE_3_FREQ = 10.0;
export const ELEVATION_OCTAVE_3_WEIGHT = 0.1;
export const ELEVATION_EXPONENT = 1.1;

export const MOISTURE_OCTAVE_1_FREQ = 3.0;
export const MOISTURE_OCTAVE_1_WEIGHT = 0.7;
export const MOISTURE_OCTAVE_2_FREQ = 6.0;
export const MOISTURE_OCTAVE_2_WEIGHT = 0.3;

// Map Generation - Terrain thresholds
export const WATER_ELEVATION_THRESHOLD = 0.2;
export const SWAMP_MOISTURE_THRESHOLD_LOW = 0.6;
export const SWAMP_MOISTURE_THRESHOLD_MID = 0.75;
export const PLAINS_ELEVATION_THRESHOLD = 0.4;
export const FOREST_HILLS_ELEVATION_THRESHOLD = 0.65;
export const FOREST_MOISTURE_THRESHOLD = 0.55;

// Settlement Placement
export const MIN_SETTLEMENT_COUNT = 2;
export const MAX_SETTLEMENT_COUNT = 4;
export const SETTLEMENT_MARGIN = 10;
export const MAX_SETTLEMENT_ATTEMPTS = 500;

// Player & Stat Dynamics
export const DEFAULT_MAX_HP = 100;
export const DEFAULT_INITIAL_HP = 100;
export const MIN_STAT_VALUE = 0;
export const MAX_STAT_VALUE = 100;

export const FATIGUE_PER_MOVE_COST = 0.5;
export const FATIGUE_REST_RECOVERY_PER_HOUR = 5.0;
export const HUNGER_REST_INCREASE_PER_HOUR = 0.8;
export const THIRST_REST_INCREASE_PER_HOUR = 1.2;

// Actions
export const SEARCH_TIME_COST_HOURS = 1;
export const SEARCH_SUCCESS_PROBABILITY = 0.15;
export const MIN_REST_HOURS = 1;
export const MAX_REST_HOURS = 24;
