import type { GameState } from '../state/GameState';

export interface System {
  readonly name: string;
  update(state: GameState): void;
}
