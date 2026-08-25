export type Direction = 'north' | 'south' | 'east' | 'west';

export type Command =
  | { type: 'MOVE'; direction: Direction }
  | { type: 'REST'; hours: number }
  | { type: 'SEARCH' }
  | { type: 'NEW_GAME'; seed?: string | number };
