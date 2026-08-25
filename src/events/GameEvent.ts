export interface GameEvent {
  tick: number;
  type: string;
  message: string;
  data?: any;
}
