import type { GameState } from '../state/GameState';

/**
 * System interface for processing simulation stages over entities and game state.
 */
export interface System {
  /** Descriptive name of the system */
  readonly name: string;

  /**
   * Updates state during the simulation turn.
   * @param state Current game state
   */
  update(state: GameState): void;
}
