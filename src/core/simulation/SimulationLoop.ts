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

export class SimulationLoop {
  state: GameState;
  private commandHandler: CommandHandler;
  private systems: System[] = [];
  private eventBus: EventBus;
  private rng: SeededRNG;
  private mapGenerator: MapGenerator;

  constructor(seed: string | number, eventBus?: EventBus) {
    this.eventBus = eventBus ?? new EventBus();
    this.rng = new SeededRNG(seed);
    this.mapGenerator = new MapGenerator(this.rng);
    this.commandHandler = new CommandHandler(this.eventBus);

    const world = new World();
    const { map, startX, startY } = this.mapGenerator.generate();

    // Create player
    const playerId = world.createEntity();
    const pos: PositionComponent = { type: 'position', x: startX, y: startY };
    const player: PlayerComponent = { type: 'player' };
    const renderable: RenderableComponent = { type: 'renderable', color: 0xffffff };
    const stats: StatsComponent = {
      type: 'stats',
      hp: 100,
      maxHp: 100,
      hunger: 0,
      thirst: 0,
      fatigue: 0,
    };
    world.addComponent(playerId, pos);
    world.addComponent(playerId, player);
    world.addComponent(playerId, renderable);
    world.addComponent(playerId, stats);

    this.state = createInitialGameState(seed, map, world, playerId, this.rng);

    // Reveal starting area
    revealArea(this.state, startX, startY, 2);

    // Register systems
    this.systems.push(new TimeSystem(this.eventBus));

    // Initial log
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

  submitCommand(command: Command): void {
    if (command.type === 'NEW_GAME') {
      this.newGame(command.seed);
      return;
    }

    this.commandHandler.handle(command, this.state);
    this.update();
  }

  update(): void {
    for (const system of this.systems) {
      system.update(this.state);
    }
  }

  onEvent(callback: (event: GameEvent) => void): void {
    this.eventBus.subscribe('*', callback);
  }

  offEvent(callback: (event: GameEvent) => void): void {
    this.eventBus.unsubscribe('*', callback);
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  newGame(seed?: string | number): void {
    const newSeed = seed ?? Date.now().toString();
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
      hp: 100,
      maxHp: 100,
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
    revealArea(this.state, startX, startY, 2);

    this.eventBus.clear();
    // Re-register systems with new bus? Keep same bus but clear listeners - systems need re-init with same bus
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
