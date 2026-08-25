export interface Component {
  readonly type: string;
}

export interface PositionComponent extends Component {
  type: 'position';
  x: number;
  y: number;
}

export interface PlayerComponent extends Component {
  type: 'player';
}

export interface RenderableComponent extends Component {
  type: 'renderable';
  color: number;
  sprite?: string;
}

export interface StatsComponent extends Component {
  type: 'stats';
  hp: number;
  maxHp: number;
  hunger: number;
  thirst: number;
  fatigue: number;
}
