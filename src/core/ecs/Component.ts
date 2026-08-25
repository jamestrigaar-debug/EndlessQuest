/**
 * Base Component interface. All ECS components must have a distinct readonly type identifier.
 */
export interface Component {
  readonly type: string;
}

/**
 * Spatial position component representing world grid coordinates.
 */
export interface PositionComponent extends Component {
  type: 'position';
  x: number;
  y: number;
}

/**
 * Marker component indicating the entity is the primary player character.
 */
export interface PlayerComponent extends Component {
  type: 'player';
}

/**
 * Visual rendering component defining entity color and optional sprite name.
 */
export interface RenderableComponent extends Component {
  type: 'renderable';
  color: number;
  sprite?: string;
}

/**
 * Core vital attributes and survival needs for an entity.
 */
export interface StatsComponent extends Component {
  type: 'stats';
  hp: number;
  maxHp: number;
  hunger: number;
  thirst: number;
  fatigue: number;
}

/**
 * Type map facilitating type-safe component retrieval.
 */
export interface ComponentMap {
  position: PositionComponent;
  player: PlayerComponent;
  renderable: RenderableComponent;
  stats: StatsComponent;
  [key: string]: Component;
}
