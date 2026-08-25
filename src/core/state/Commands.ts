/**
 * Cardinal movement directions.
 */
export type Direction = 'north' | 'south' | 'east' | 'west';

/**
 * Discriminated union of all executable player and system simulation commands.
 */
export type Command =
  | { type: 'MOVE'; direction: Direction }
  | { type: 'REST'; hours: number }
  | { type: 'SEARCH' }
  | { type: 'NEW_GAME'; seed?: string | number };
