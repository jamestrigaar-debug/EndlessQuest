import type { GameState } from '../state/GameState';
import { createInitialGameState, revealArea } from '../state/GameState';
import type { Command } from '../state/Commands';
import { CommandHandler } from '../state/CommandHandler';
import { World } from '../ecs/World';
import { SeededRNG } from '../rng/SeededRNG';
import { MapGenerator } from '../world/MapGenerator';
import type { System } from '../ecs/System';
import { TimeSystem } from './systems/TimeSystem';
import { EventBus } from '../../events/EventBus';
import type { GameEvent } from '../../events/GameEvent';
import type { PositionComponent, PlayerComponent, RenderableComponent, StatsComponent } from '../ecs/Component';
import {
  DEFAULT_MAX_HP,
  DEFAULT_INITIAL_HP,
  INITIAL_SPAWN_REVEAL_RADIUS,
} from '../SimulationConstants';

/**
 * Main simulation coordinator managing state, world generation, player entity,
 * command execution pipeline, systems update loop, and event notifications.
 */
export class SimulationLoop {
  state: GameState;
  private commandHandler: CommandHandler;
  private systems: System[] = [];
  private eventBus: EventBus;
  private rng: SeededRNG;
  private mapGenerator: MapGenerator;

  /**
   * Initializes a new simulation instance with a seed and optional event bus.
   * @param seed Seed string or number
   * @param eventBus Optional shared EventBus
   */
  constructor(seed: string | number, eventBus?: EventBus) {
    this.eventBus = eventBus ?? new EventBus();
    this.rng = new SeededRNG(seed);
    this.mapGenerator = new MapGenerator(this.rng);
    this.commandHandler = new CommandHandler(this.eventBus);

    const world = new World();
    const { map, startX, startY } = this.mapGenerator.generate();

    // Spawn player entity
    const playerId = world.createEntity();
    const pos: PositionComponent = { type: 'position', x: startX, y: startY };
    const player: PlayerComponent = { type: 'player' };
    const renderable: RenderableComponent = { type: 'renderable', color: 0xffffff };
    const stats: StatsComponent = {
      type: 'stats',
      hp: DEFAULT_INITIAL_HP,
      maxHp: DEFAULT_MAX_HP,
      hunger: 0,
      thirst: 0,
      fatigue: 0,
    };
    world.addComponent(playerId, pos);
    world.addComponent(playerId, player);
    world.addComponent(playerId, renderable);
    world.addComponent(playerId, stats);

    this.state = createInitialGameState(seed, map, world, playerId, this.rng);

    // Initial fog of war exploration around spawn
    revealArea(this.state, startX, startY, INITIAL_SPAWN_REVEAL_RADIUS);

    // Register simulation systems
    this.systems.push(new TimeSystem(this.eventBus));

    // Log game start event
    const startTile = map[startY][startX];
    const initEvent: GameEvent = {
      tick: 0,
      type: 'system',
      message: `You awaken in ${startTile.terrain}. Your journey begins. Seed: ${this.state.seedString}`,
      data: { x: startX, y: startY, terrain: startTile.terrain, seed: this.state.seedString },
    };
    this.state.log.push(initEvent);
    this.eventBus.emit(initEvent);
  }

  /**
   * Submits a command for execution. Processes command and invokes system updates.
   * @param command Simulation command
   */
  submitCommand(command: Command): void {
    if (command.type === 'NEW_GAME') {
      this.newGame(command.seed);
      return;
    }

    this.commandHandler.handle(command, this.state);
    this.update();
  }

  /**
   * Runs all registered ECS simulation systems for the current turn.
   */
  update(): void {
    for (const system of this.systems) {
      system.update(this.state);
    }
  }

  /**
   * Subscribes a global callback for all simulation events.
   * @param callback Callback receiving GameEvent
   */
  onEvent(callback: (event: GameEvent) => void): void {
    this.eventBus.subscribe('*', callback);
  }

  /**
   * Unsubscribes a global simulation event listener.
   * @param callback Callback to remove
   */
  offEvent(callback: (event: GameEvent) => void): void {
    this.eventBus.unsubscribe('*', callback);
  }

  /**
   * Returns internal EventBus instance.
   * @returns EventBus
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Resets simulation state and generates a fresh world without destroying event subscriptions.
   * @param seed Optional new seed string or number
   */
  newGame(seed?: string | number): void {
    const newSeed = seed !== undefined && seed !== '' ? seed : Date.now().toString();
    const newRng = new SeededRNG(newSeed);
    const newMapGen = new MapGenerator(newRng);
    const world = new World();
    const { map, startX, startY } = newMapGen.generate();

    const playerId = world.createEntity();
    const pos: PositionComponent = { type: 'position', x: startX, y: startY };
    const player: PlayerComponent = { type: 'player' };
    const renderable: RenderableComponent = { type: 'renderable', color: 0xffffff };
    const stats: StatsComponent = {
      type: 'stats',
      hp: DEFAULT_INITIAL_HP,
      maxHp: DEFAULT_MAX_HP,
      hunger: 0,
      thirst: 0,
      fatigue: 0,
    };
    world.addComponent(playerId, pos);
    world.addComponent(playerId, player);
    world.addComponent(playerId, renderable);
    world.addComponent(playerId, stats);

    this.rng = newRng;
    this.mapGenerator = newMapGen;
    this.state = createInitialGameState(newSeed, map, world, playerId, newRng);
    revealArea(this.state, startX, startY, INITIAL_SPAWN_REVEAL_RADIUS);

    // Re-initialize systems with existing EventBus (preserving UI subscriptions)
    this.systems = [new TimeSystem(this.eventBus)];

    const startTile = map[startY][startX];
    const initEvent: GameEvent = {
      tick: 0,
      type: 'system',
      message: `New game started in ${startTile.terrain}. Seed: ${this.state.seedString}`,
      data: { x: startX, y: startY, terrain: startTile.terrain, seed: this.state.seedString },
    };
    this.state.log.push(initEvent);
    this.eventBus.emit(initEvent);
  }
}
